-- =============================================================================
-- TRIGGER PARA REDUCIR STOCK AUTOMÁTICAMENTE EN RECIBOS TÉRMICOS
-- =============================================================================
-- Este script crea un trigger que reduce el stock de productos cuando se
-- vende en un recibo térmico, igual que sucede con las facturas.
-- =============================================================================

-- 1. Crear función para manejar la reducción de stock en recibos térmicos
CREATE OR REPLACE FUNCTION handle_thermal_receipt_item_stock_reduction()
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
                RAISE NOTICE 'Stock reducido en recibo térmico para producto "%": % unidades (antes: %, después: %)', 
                    product_name_value, NEW.quantity, current_stock_value, new_current_stock;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_thermal_receipt ON thermal_receipt_items;

-- 3. Crear nuevo trigger
CREATE TRIGGER trigger_reduce_stock_on_thermal_receipt
    AFTER INSERT ON thermal_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_thermal_receipt_item_stock_reduction();

-- 4. Función para restaurar stock cuando se elimina un recibo térmico
CREATE OR REPLACE FUNCTION handle_thermal_receipt_item_stock_restoration()
RETURNS TRIGGER AS $$
DECLARE
    product_name_value VARCHAR(255);
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF OLD.product_id IS NOT NULL THEN
        -- Obtener nombre del producto
        SELECT name 
        INTO product_name_value
        FROM products 
        WHERE id = OLD.product_id;
        
        -- Si encontramos el producto, restaurar el stock
        IF FOUND THEN
            -- Restaurar stock
            UPDATE products 
            SET 
                current_stock = COALESCE(current_stock, 0) + OLD.quantity,
                available_stock = COALESCE(available_stock, 0) + OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.product_id;
            
            -- Log para debug
            RAISE NOTICE 'Stock restaurado por eliminación de recibo térmico para producto "%": + % unidades', 
                product_name_value, OLD.quantity;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para restauración de stock al eliminar
DROP TRIGGER IF EXISTS trigger_restore_stock_on_thermal_receipt_delete ON thermal_receipt_items;

CREATE TRIGGER trigger_restore_stock_on_thermal_receipt_delete
    AFTER DELETE ON thermal_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_thermal_receipt_item_stock_restoration();

-- 6. Asegurar que la tabla products tenga las columnas necesarias
DO $$
BEGIN
    -- Agregar current_stock si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'current_stock'
    ) THEN
        ALTER TABLE products ADD COLUMN current_stock DECIMAL(10,3) DEFAULT 0;
        RAISE NOTICE 'Columna current_stock agregada a products';
    END IF;

    -- Agregar available_stock si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'available_stock'
    ) THEN
        ALTER TABLE products ADD COLUMN available_stock DECIMAL(10,3) DEFAULT 0;
        RAISE NOTICE 'Columna available_stock agregada a products';
    END IF;

    -- Inicializar stock si está NULL
    UPDATE products 
    SET current_stock = COALESCE(stock_quantity, 0)
    WHERE current_stock IS NULL;

    UPDATE products 
    SET available_stock = COALESCE(current_stock, stock_quantity, 0)
    WHERE available_stock IS NULL;
END $$;

-- 7. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'TRIGGERS DE STOCK PARA RECIBOS TÉRMICOS CREADOS EXITOSAMENTE';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '✅ Función handle_thermal_receipt_item_stock_reduction creada';
    RAISE NOTICE '✅ Trigger trigger_reduce_stock_on_thermal_receipt creado';
    RAISE NOTICE '✅ Función handle_thermal_receipt_item_stock_restoration creada';
    RAISE NOTICE '✅ Trigger trigger_restore_stock_on_thermal_receipt_delete creado';
    RAISE NOTICE '✅ Columnas current_stock y available_stock verificadas';
    RAISE NOTICE '';
    RAISE NOTICE 'AHORA LOS PRODUCTOS SE RESTARÁN AUTOMÁTICAMENTE AL:';
    RAISE NOTICE '  - Crear recibos térmicos (thermal_receipt_items)';
    RAISE NOTICE '  - Crear facturas (invoice_items - ya existía)';
    RAISE NOTICE '';
    RAISE NOTICE 'Y SE RESTAURARÁN AUTOMÁTICAMENTE AL:';
    RAISE NOTICE '  - Eliminar recibos térmicos';
    RAISE NOTICE '====================================================================';
END $$;
