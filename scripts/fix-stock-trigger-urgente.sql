-- =====================================================
-- FIX URGENTE: Trigger de stock está multiplicando
-- =====================================================

-- 1. Ver todos los triggers activos en invoice_items
SELECT 
    tgname as trigger_name,
    tgtype,
    tgenabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'invoice_items'::regclass
ORDER BY tgname;

-- 2. Eliminar triggers conflictivos (solo los que creamos nosotros)
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_invoice ON invoice_items;
DROP TRIGGER IF EXISTS trigger_calculate_cogs ON invoice_items;
DROP TRIGGER IF EXISTS update_stock_on_invoice_item_insert ON invoice_items;
DROP TRIGGER IF EXISTS reduce_stock_on_invoice ON invoice_items;
DROP TRIGGER IF EXISTS handle_invoice_stock ON invoice_items;

-- 3. Crear función CORRECTA para reducir stock (RESTAR, no SUMAR)
CREATE OR REPLACE FUNCTION handle_invoice_item_stock_reduction()
RETURNS TRIGGER AS $$
DECLARE
    current_stock_value DECIMAL(10,3);
    current_available_value DECIMAL(10,3);
    new_stock DECIMAL(10,3);
    new_available DECIMAL(10,3);
    product_name_value VARCHAR(255);
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF NEW.product_id IS NOT NULL THEN
        -- Obtener stock actual del producto
        SELECT current_stock, available_stock, name 
        INTO current_stock_value, current_available_value, product_name_value
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Si encontramos el producto, reducir el stock
        IF FOUND THEN
            -- CALCULAR NUEVOS VALORES (RESTAR, NO SUMAR)
            new_stock := GREATEST(0, COALESCE(current_stock_value, 0) - NEW.quantity);
            new_available := GREATEST(0, COALESCE(current_available_value, 0) - NEW.quantity);
            
            -- Actualizar stock
            UPDATE products 
            SET 
                current_stock = new_stock,
                available_stock = new_available,
                updated_at = NOW()
            WHERE id = NEW.product_id;
            
            -- Log detallado para debug
            RAISE NOTICE '🔴 REDUCCIÓN DE STOCK:';
            RAISE NOTICE '   Producto: %', product_name_value;
            RAISE NOTICE '   Cantidad vendida: %', NEW.quantity;
            RAISE NOTICE '   Stock ANTES: current=%, available=%', current_stock_value, current_available_value;
            RAISE NOTICE '   Stock DESPUÉS: current=%, available=%', new_stock, new_available;
            RAISE NOTICE '   Operación: % - % = %', current_stock_value, NEW.quantity, new_stock;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger ÚNICO para reducción de stock
CREATE TRIGGER trigger_reduce_stock_on_invoice
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_invoice_item_stock_reduction();

-- 5. Crear función CORRECTA para COGS
CREATE OR REPLACE FUNCTION calculate_cogs_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    product_cost DECIMAL(10,2);
    user_id_val UUID;
    invoice_id_val UUID;
    sale_date_val TIMESTAMP;
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF NEW.product_id IS NOT NULL THEN
        -- Obtener el costo del producto y user_id
        SELECT cost_price, user_id 
        INTO product_cost, user_id_val
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Obtener información de la factura
        SELECT id, invoice_date, user_id
        INTO invoice_id_val, sale_date_val, user_id_val
        FROM invoices
        WHERE id = NEW.invoice_id;
        
        -- Si encontramos el producto y tiene costo, registrar el COGS
        IF FOUND AND product_cost IS NOT NULL AND product_cost > 0 THEN
            INSERT INTO cost_of_goods_sold (
                user_id,
                invoice_id,
                product_id,
                quantity_sold,
                sale_price,
                total_sale,
                unit_cost,
                total_cost,
                gross_profit,
                profit_margin,
                sale_date
            ) VALUES (
                user_id_val,
                invoice_id_val,
                NEW.product_id,
                NEW.quantity,
                NEW.unit_price,
                NEW.total,
                product_cost,
                product_cost * NEW.quantity,
                NEW.total - (product_cost * NEW.quantity),
                CASE 
                    WHEN NEW.total > 0 THEN 
                        ((NEW.total - (product_cost * NEW.quantity)) / NEW.total) * 100
                    ELSE 0 
                END,
                sale_date_val
            );
            
            RAISE NOTICE '💰 COGS: Venta $% - Costo $% = Utilidad $%', 
                NEW.total, 
                product_cost * NEW.quantity,
                NEW.total - (product_cost * NEW.quantity);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger para COGS
CREATE TRIGGER trigger_calculate_cogs
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_cogs_on_invoice();

-- 7. Verificar triggers activos
SELECT 
    'invoice_items' as table_name,
    tgname as trigger_name,
    CASE tgtype 
        WHEN 1 THEN 'BEFORE'
        WHEN 2 THEN 'AFTER'
        ELSE 'UNKNOWN'
    END as trigger_type,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'OTHER'
    END as trigger_event,
    CASE tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END as status
FROM pg_trigger
WHERE tgrelid = 'invoice_items'::regclass
    AND tgname NOT LIKE 'RI_%'  -- Excluir triggers de integridad referencial
ORDER BY tgname;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Triggers corregidos y reactivados';
    RAISE NOTICE '✅ Ahora el stock se REDUCE correctamente';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRUEBA:';
    RAISE NOTICE '   Stock inicial: 960';
    RAISE NOTICE '   Venta: 25 unidades';
    RAISE NOTICE '   Resultado esperado: 935';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verifica los triggers activos arriba';
END $$;
