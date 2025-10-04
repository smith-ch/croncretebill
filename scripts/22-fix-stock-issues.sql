-- Script de corrección para automatización de stock en facturas
-- Este script corrige los problemas de user_id y actualización de stock

-- Función corregida para sincronizar stock existente
CREATE OR REPLACE FUNCTION sync_existing_stock()
RETURNS void AS $$
DECLARE
    product_rec RECORD;
    default_warehouse_id UUID;
    user_rec RECORD;
BEGIN
    -- Para cada usuario que tiene productos, asegurar que tiene al menos un warehouse
    FOR user_rec IN 
        SELECT DISTINCT user_id 
        FROM public.products 
        WHERE user_id IS NOT NULL 
    LOOP
        -- Buscar si ya existe un warehouse para este usuario
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
            
            RAISE NOTICE 'Creado warehouse % para usuario %', default_warehouse_id, user_rec.user_id;
        END IF;

        -- Sincronizar stock de productos existentes para este usuario
        FOR product_rec IN 
            SELECT 
                id, 
                user_id, 
                name,
                COALESCE(stock_quantity, 0) as stock, 
                COALESCE(current_stock, stock_quantity, 0) as current,
                COALESCE(unit_price, 0) as price
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
            
            RAISE NOTICE 'Sincronizado stock para producto % (%): %', product_rec.name, product_rec.id, product_rec.current;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Sincronización de stock completada';
END;
$$ LANGUAGE plpgsql;

-- Función mejorada para recalcular stock basado en facturas existentes
CREATE OR REPLACE FUNCTION recalculate_stock_from_invoices()
RETURNS void AS $$
DECLARE
    product_rec RECORD;
    invoice_total DECIMAL(10,3);
    default_warehouse_id UUID;
    user_rec RECORD;
BEGIN
    -- Para cada usuario, recalcular stock de sus productos
    FOR user_rec IN 
        SELECT DISTINCT user_id 
        FROM public.products 
        WHERE user_id IS NOT NULL 
    LOOP
        -- Obtener warehouse por defecto para este usuario
        SELECT id INTO default_warehouse_id 
        FROM public.warehouses 
        WHERE user_id = user_rec.user_id
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Si no hay warehouse, saltar este usuario (debería haberse creado en sync_existing_stock)
        IF default_warehouse_id IS NULL THEN
            RAISE NOTICE 'No se encontró warehouse para usuario %, saltando...', user_rec.user_id;
            CONTINUE;
        END IF;
        
        -- Para cada producto de este usuario
        FOR product_rec IN 
            SELECT 
                id, 
                user_id, 
                name,
                COALESCE(stock_quantity, 0) as initial_stock
            FROM public.products
            WHERE user_id = user_rec.user_id
        LOOP
            -- Calcular total vendido en facturas para este producto
            SELECT COALESCE(SUM(ii.quantity), 0) INTO invoice_total
            FROM public.invoice_items ii
            JOIN public.invoices i ON i.id = ii.invoice_id
            WHERE ii.product_id = product_rec.id
            AND i.user_id = product_rec.user_id;

            -- Calcular stock actual (inicial - vendido)
            DECLARE
                calculated_stock DECIMAL(10,3);
            BEGIN
                calculated_stock := GREATEST(product_rec.initial_stock - invoice_total, 0);
                
                -- Actualizar stock en products
                UPDATE public.products 
                SET 
                    current_stock = calculated_stock,
                    available_stock = calculated_stock,
                    updated_at = NOW()
                WHERE id = product_rec.id;

                -- Actualizar warehouse stock
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
                    calculated_stock,
                    0,
                    calculated_stock
                )
                ON CONFLICT (product_id, warehouse_id) 
                DO UPDATE SET 
                    current_stock = calculated_stock,
                    available_stock = calculated_stock,
                    updated_at = NOW();
                
                RAISE NOTICE 'Producto %: Stock inicial %, Vendido %, Stock actual %', 
                    product_rec.name, product_rec.initial_stock, invoice_total, calculated_stock;
            END;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Recálculo de stock completado';
END;
$$ LANGUAGE plpgsql;

-- Función para verificar y arreglar datos de stock
CREATE OR REPLACE FUNCTION fix_stock_data()
RETURNS void AS $$
DECLARE
    product_rec RECORD;
BEGIN
    -- Actualizar productos que tienen stock_quantity pero no current_stock
    UPDATE public.products 
    SET 
        current_stock = COALESCE(stock_quantity, 0),
        available_stock = COALESCE(stock_quantity, 0)
    WHERE current_stock IS NULL OR current_stock = 0;
    
    -- Asegurar que los valores no sean negativos
    UPDATE public.products 
    SET 
        current_stock = 0,
        available_stock = 0
    WHERE current_stock < 0 OR available_stock < 0;
    
    -- Actualizar cost_price para productos sin precio de costo
    UPDATE public.products 
    SET cost_price = COALESCE(unit_price, 0)
    WHERE cost_price IS NULL OR cost_price = 0;
    
    RAISE NOTICE 'Datos de stock corregidos';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar las correcciones
SELECT fix_stock_data();
SELECT sync_existing_stock();
SELECT recalculate_stock_from_invoices();

-- Verificar que todos los productos tienen warehouse asignado
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    -- Contar productos sin warehouse
    SELECT COUNT(*) INTO orphan_count
    FROM public.products p
    LEFT JOIN public.product_warehouse_stock pws ON pws.product_id = p.id
    WHERE pws.id IS NULL AND p.user_id IS NOT NULL;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Advertencia: % productos sin warehouse asignado', orphan_count;
    ELSE
        RAISE NOTICE 'Todos los productos tienen warehouse asignado correctamente';
    END IF;
END $$;

-- Mostrar resumen de stock por usuario
SELECT 
    p.user_id,
    COUNT(*) as total_productos,
    SUM(COALESCE(p.current_stock, 0)) as stock_total,
    SUM(COALESCE(p.current_stock, 0) * COALESCE(p.unit_price, 0)) as valor_total
FROM public.products p
WHERE p.user_id IS NOT NULL
GROUP BY p.user_id
ORDER BY p.user_id;