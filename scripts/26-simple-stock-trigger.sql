-- Trigger simple para reducir stock automáticamente cuando se crea una factura
-- Este script crea un trigger básico que funciona

-- 1. Crear función para manejar la reducción de stock
CREATE OR REPLACE FUNCTION handle_invoice_item_stock_reduction()
RETURNS TRIGGER AS $$
DECLARE
    current_stock_value DECIMAL(10,3);
    product_name_value VARCHAR(255);
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF NEW.product_id IS NOT NULL THEN
        -- Obtener stock actual del producto
        SELECT current_stock, name 
        INTO current_stock_value, product_name_value
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Si encontramos el producto, reducir el stock
        IF FOUND THEN
            -- Calcular nuevos valores de stock
            DECLARE
                new_current_stock DECIMAL(10,3);
                new_available_stock DECIMAL(10,3);
            BEGIN
                -- Calcular el nuevo stock actual
                new_current_stock := GREATEST(0, COALESCE(current_stock_value, 0) - NEW.quantity);
                new_available_stock := new_current_stock;
                
                -- Reducir stock (no permitir negativo)
                UPDATE products 
                SET 
                    current_stock = new_current_stock,
                    available_stock = new_available_stock,
                    updated_at = NOW()
                WHERE id = NEW.product_id;
                
                -- Log para debug
                RAISE NOTICE 'Stock reducido para producto "%": % unidades (antes: %, después: %)', 
                    product_name_value, NEW.quantity, current_stock_value, new_current_stock;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_invoice ON invoice_items;

-- 3. Crear nuevo trigger
CREATE TRIGGER trigger_reduce_stock_on_invoice
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_invoice_item_stock_reduction();

-- 4. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Trigger de reducción de stock creado exitosamente';
END $$;