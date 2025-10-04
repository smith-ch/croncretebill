-- Script para automatizar la reducción de stock en facturas
-- Este script crea triggers y funciones para actualizar automáticamente el stock
-- cuando se crean, modifican o eliminan facturas

-- Función para actualizar stock cuando se insertan/actualizan/eliminan items de factura
CREATE OR REPLACE FUNCTION handle_invoice_stock_changes()
RETURNS TRIGGER AS $$
DECLARE
    default_warehouse_id UUID;
    invoice_user_id UUID;
    warehouse_stock_rec RECORD;
BEGIN
    -- Obtener el user_id de la factura
    SELECT user_id INTO invoice_user_id 
    FROM public.invoices 
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    IF invoice_user_id IS NULL THEN
        RAISE WARNING 'No se pudo obtener user_id de la factura %', COALESCE(NEW.invoice_id, OLD.invoice_id);
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Obtener el warehouse por defecto del usuario
    SELECT id INTO default_warehouse_id 
    FROM public.warehouses 
    WHERE user_id = invoice_user_id
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Si no hay warehouse, crear uno por defecto
    IF default_warehouse_id IS NULL THEN
        INSERT INTO public.warehouses (
            user_id, 
            name, 
            description, 
            address, 
            is_active
        ) VALUES (
            invoice_user_id,
            'Almacén Principal',
            'Almacén principal creado automáticamente',
            'Dirección del almacén principal',
            true
        ) RETURNING id INTO default_warehouse_id;
        
        RAISE NOTICE 'Creado warehouse % para usuario %', default_warehouse_id, invoice_user_id;
    END IF;

    -- Manejar INSERT (nueva factura)
    IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
        -- Insertar o actualizar stock en product_warehouse_stock
        INSERT INTO public.product_warehouse_stock (
            product_id, 
            warehouse_id, 
            current_stock, 
            reserved_stock, 
            available_stock
        )
        VALUES (
            NEW.product_id,
            default_warehouse_id,
            GREATEST((
                SELECT COALESCE(current_stock, stock_quantity, 0) 
                FROM public.products 
                WHERE id = NEW.product_id
            ) - NEW.quantity, 0),
            0,
            GREATEST((
                SELECT COALESCE(current_stock, stock_quantity, 0) 
                FROM public.products 
                WHERE id = NEW.product_id
            ) - NEW.quantity, 0)
        )
        ON CONFLICT (product_id, warehouse_id) 
        DO UPDATE SET 
            current_stock = GREATEST(product_warehouse_stock.current_stock - NEW.quantity, 0),
            available_stock = GREATEST(product_warehouse_stock.current_stock - NEW.quantity, 0),
            updated_at = NOW();

        -- Registrar movimiento de stock
        INSERT INTO public.stock_movements (
            user_id,
            product_id,
            warehouse_id,
            movement_type,
            quantity_before,
            quantity_change,
            quantity_after,
            unit_cost,
            total_cost,
            reference_type,
            reference_id,
            notes
        )
        SELECT 
            invoice_user_id,
            NEW.product_id,
            default_warehouse_id,
            'venta',
            COALESCE(pws.current_stock, p.current_stock, p.stock_quantity, 0) + NEW.quantity,
            -NEW.quantity,
            COALESCE(pws.current_stock, p.current_stock, p.stock_quantity, 0),
            NEW.unit_price,
            NEW.total,
            'invoice',
            NEW.invoice_id,
            'Venta - Factura #' || i.invoice_number
        FROM public.invoices i
        LEFT JOIN public.product_warehouse_stock pws ON pws.product_id = NEW.product_id AND pws.warehouse_id = default_warehouse_id
        LEFT JOIN public.products p ON p.id = NEW.product_id
        WHERE i.id = NEW.invoice_id;

        -- Actualizar stock en tabla products
        UPDATE public.products 
        SET 
            current_stock = GREATEST(COALESCE(current_stock, stock_quantity, 0) - NEW.quantity, 0),
            available_stock = GREATEST(COALESCE(current_stock, stock_quantity, 0) - NEW.quantity, 0),
            updated_at = NOW()
        WHERE id = NEW.product_id;

    -- Manejar UPDATE (modificación de factura)
    ELSIF TG_OP = 'UPDATE' AND NEW.product_id IS NOT NULL THEN
        -- Revertir el cambio anterior
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.product_warehouse_stock 
            SET 
                current_stock = current_stock + OLD.quantity,
                available_stock = current_stock + OLD.quantity,
                updated_at = NOW()
            WHERE product_id = OLD.product_id AND warehouse_id = default_warehouse_id;

            UPDATE public.products 
            SET 
                current_stock = COALESCE(current_stock, 0) + OLD.quantity,
                available_stock = COALESCE(current_stock, 0) + OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.product_id;
        END IF;

        -- Aplicar el nuevo cambio
        INSERT INTO public.product_warehouse_stock (
            product_id, 
            warehouse_id, 
            current_stock, 
            reserved_stock, 
            available_stock
        )
        VALUES (
            NEW.product_id,
            default_warehouse_id,
            GREATEST((
                SELECT COALESCE(current_stock, stock_quantity, 0) 
                FROM public.products 
                WHERE id = NEW.product_id
            ) - NEW.quantity, 0),
            0,
            GREATEST((
                SELECT COALESCE(current_stock, stock_quantity, 0) 
                FROM public.products 
                WHERE id = NEW.product_id
            ) - NEW.quantity, 0)
        )
        ON CONFLICT (product_id, warehouse_id) 
        DO UPDATE SET 
            current_stock = GREATEST(product_warehouse_stock.current_stock - NEW.quantity, 0),
            available_stock = GREATEST(product_warehouse_stock.current_stock - NEW.quantity, 0),
            updated_at = NOW();

        UPDATE public.products 
        SET 
            current_stock = GREATEST(COALESCE(current_stock, stock_quantity, 0) - NEW.quantity, 0),
            available_stock = GREATEST(COALESCE(current_stock, stock_quantity, 0) - NEW.quantity, 0),
            updated_at = NOW()
        WHERE id = NEW.product_id;

    -- Manejar DELETE (eliminación de factura)
    ELSIF TG_OP = 'DELETE' AND OLD.product_id IS NOT NULL THEN
        -- Devolver stock
        UPDATE public.product_warehouse_stock 
        SET 
            current_stock = current_stock + OLD.quantity,
            available_stock = current_stock + OLD.quantity,
            updated_at = NOW()
        WHERE product_id = OLD.product_id AND warehouse_id = default_warehouse_id;

        UPDATE public.products 
        SET 
            current_stock = COALESCE(current_stock, 0) + OLD.quantity,
            available_stock = COALESCE(current_stock, 0) + OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.product_id;

        -- Registrar movimiento de devolución
        INSERT INTO public.stock_movements (
            user_id,
            product_id,
            warehouse_id,
            movement_type,
            quantity_before,
            quantity_change,
            quantity_after,
            unit_cost,
            total_cost,
            reference_type,
            reference_id,
            notes
        )
        SELECT 
            invoice_user_id,
            OLD.product_id,
            default_warehouse_id,
            'devolucion',
            COALESCE(pws.current_stock, p.current_stock, p.stock_quantity, 0) - OLD.quantity,
            OLD.quantity,
            COALESCE(pws.current_stock, p.current_stock, p.stock_quantity, 0),
            OLD.unit_price,
            OLD.total,
            'invoice_deleted',
            OLD.invoice_id,
            'Devolución - Eliminación Factura #' || i.invoice_number
        FROM public.invoices i
        LEFT JOIN public.product_warehouse_stock pws ON pws.product_id = OLD.product_id AND pws.warehouse_id = default_warehouse_id
        LEFT JOIN public.products p ON p.id = OLD.product_id
        WHERE i.id = OLD.invoice_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_invoice_stock_update ON public.invoice_items;

-- Crear trigger para manejar cambios en invoice_items
CREATE TRIGGER trigger_invoice_stock_update
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_invoice_stock_changes();

-- Función para sincronizar stock existente con el sistema de inventario
CREATE OR REPLACE FUNCTION sync_existing_stock()
RETURNS void AS $$
DECLARE
    product_rec RECORD;
    default_warehouse_id UUID;
    user_rec RECORD;
BEGIN
    -- Para cada usuario, asegurar que tiene al menos un warehouse
    FOR user_rec IN SELECT DISTINCT user_id FROM public.products LOOP
        SELECT id INTO default_warehouse_id 
        FROM public.warehouses 
        WHERE user_id = user_rec.user_id
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Si no hay warehouse, crear uno por defecto
        IF default_warehouse_id IS NULL THEN
            INSERT INTO public.warehouses (
                user_id, 
                name, 
                description, 
                address, 
                is_active
            ) VALUES (
                user_rec.user_id,
                'Almacén Principal',
                'Almacén principal creado automáticamente',
                'Dirección del almacén principal',
                true
            ) RETURNING id INTO default_warehouse_id;
        END IF;

        -- Sincronizar stock de productos existentes
        FOR product_rec IN 
            SELECT id, user_id, COALESCE(stock_quantity, 0) as stock, COALESCE(current_stock, stock_quantity, 0) as current
            FROM public.products 
            WHERE user_id = user_rec.user_id
        LOOP
            -- Actualizar o insertar en product_warehouse_stock
            INSERT INTO public.product_warehouse_stock (
                product_id, 
                warehouse_id, 
                current_stock, 
                reserved_stock, 
                available_stock
            )
            VALUES (
                product_rec.id,
                default_warehouse_id,
                product_rec.current,
                0,
                product_rec.current
            )
            ON CONFLICT (product_id, warehouse_id) 
            DO UPDATE SET 
                current_stock = EXCLUDED.current_stock,
                available_stock = EXCLUDED.current_stock,
                updated_at = NOW();

            -- Actualizar campos de stock en products
            UPDATE public.products 
            SET 
                current_stock = product_rec.current,
                available_stock = product_rec.current,
                updated_at = NOW()
            WHERE id = product_rec.id;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para recalcular stock basado en facturas existentes
CREATE OR REPLACE FUNCTION recalculate_stock_from_invoices()
RETURNS void AS $$
DECLARE
    product_rec RECORD;
    invoice_total DECIMAL(10,3);
    default_warehouse_id UUID;
BEGIN
    -- Para cada producto, recalcular su stock basado en facturas
    FOR product_rec IN 
        SELECT DISTINCT p.id, p.user_id, COALESCE(p.stock_quantity, 0) as initial_stock
        FROM public.products p
    LOOP
        -- Obtener warehouse por defecto
        SELECT id INTO default_warehouse_id 
        FROM public.warehouses 
        WHERE user_id = product_rec.user_id
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Calcular total vendido en facturas
        SELECT COALESCE(SUM(ii.quantity), 0) INTO invoice_total
        FROM public.invoice_items ii
        JOIN public.invoices i ON i.id = ii.invoice_id
        WHERE ii.product_id = product_rec.id
        AND i.user_id = product_rec.user_id;

        -- Actualizar stock actual
        UPDATE public.products 
        SET 
            current_stock = GREATEST(product_rec.initial_stock - invoice_total, 0),
            available_stock = GREATEST(product_rec.initial_stock - invoice_total, 0),
            updated_at = NOW()
        WHERE id = product_rec.id;

        -- Actualizar warehouse stock
        IF default_warehouse_id IS NOT NULL THEN
            INSERT INTO public.product_warehouse_stock (
                product_id, 
                warehouse_id, 
                current_stock, 
                reserved_stock, 
                available_stock
            )
            VALUES (
                product_rec.id,
                default_warehouse_id,
                GREATEST(product_rec.initial_stock - invoice_total, 0),
                0,
                GREATEST(product_rec.initial_stock - invoice_total, 0)
            )
            ON CONFLICT (product_id, warehouse_id) 
            DO UPDATE SET 
                current_stock = GREATEST(product_rec.initial_stock - invoice_total, 0),
                available_stock = GREATEST(product_rec.initial_stock - invoice_total, 0),
                updated_at = NOW();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar sincronización inicial
SELECT sync_existing_stock();
SELECT recalculate_stock_from_invoices();

-- Crear función para obtener stock actual de un producto
CREATE OR REPLACE FUNCTION get_product_current_stock(product_uuid UUID)
RETURNS DECIMAL(10,3) AS $$
DECLARE
    current_stock_val DECIMAL(10,3);
BEGIN
    SELECT COALESCE(current_stock, stock_quantity, 0) 
    INTO current_stock_val
    FROM public.products 
    WHERE id = product_uuid;
    
    RETURN COALESCE(current_stock_val, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si hay stock suficiente (disponible para RPC desde la API)
CREATE OR REPLACE FUNCTION check_stock_availability(product_uuid UUID, required_quantity DECIMAL(10,3))
RETURNS BOOLEAN AS $$
DECLARE
    available_stock_val DECIMAL(10,3);
BEGIN
    SELECT COALESCE(available_stock, current_stock, stock_quantity, 0) 
    INTO available_stock_val
    FROM public.products 
    WHERE id = product_uuid;
    
    RETURN COALESCE(available_stock_val, 0) >= required_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener información detallada del stock
CREATE OR REPLACE FUNCTION get_product_stock_info(product_uuid UUID)
RETURNS TABLE(
    product_id UUID,
    current_stock DECIMAL(10,3),
    available_stock DECIMAL(10,3),
    reserved_stock DECIMAL(10,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.current_stock, p.stock_quantity, 0) as current_stock,
        COALESCE(p.available_stock, p.current_stock, p.stock_quantity, 0) as available_stock,
        COALESCE(p.reserved_stock, 0) as reserved_stock
    FROM public.products p
    WHERE p.id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;