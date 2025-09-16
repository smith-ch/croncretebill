-- Script para agregar stock inicial a productos existentes
-- Este script agrega stock realista a los productos que actualmente tienen 0

DO $$
DECLARE 
    prod_record RECORD;
    warehouse_record RECORD;
    initial_stock DECIMAL(10,3);
BEGIN
    -- Iterar sobre todos los productos que tienen stock 0 o NULL
    FOR prod_record IN 
        SELECT id, name, sku, unit_price, cost_price 
        FROM products 
        WHERE COALESCE(current_stock, 0) = 0
    LOOP
        -- Determinar stock inicial basado en el tipo de producto y precio
        IF prod_record.unit_price >= 10000 THEN
            -- Productos caros (equipos): stock bajo
            initial_stock := FLOOR(RANDOM() * 5) + 1; -- 1-5 unidades
        ELSIF prod_record.unit_price >= 1000 THEN
            -- Productos medianos: stock moderado  
            initial_stock := FLOOR(RANDOM() * 15) + 5; -- 5-20 unidades
        ELSE
            -- Productos baratos: stock alto
            initial_stock := FLOOR(RANDOM() * 95) + 10; -- 10-105 unidades
        END IF;

        -- Actualizar stock en la tabla products
        UPDATE products 
        SET 
            current_stock = initial_stock,
            available_stock = initial_stock
        WHERE id = prod_record.id;

        RAISE NOTICE 'Updated product %: % units', prod_record.name, initial_stock;

        -- Crear registros en product_warehouse_stock para cada almacén
        FOR warehouse_record IN 
            SELECT id, name FROM warehouses
        LOOP
            -- Distribuir el stock entre almacenes existentes
            INSERT INTO product_warehouse_stock (
                user_id, 
                product_id, 
                warehouse_id, 
                current_stock
            ) 
            SELECT 
                w.user_id,
                prod_record.id,
                warehouse_record.id,
                CASE 
                    WHEN warehouse_record.name LIKE '%Principal%' THEN initial_stock * 0.7
                    ELSE initial_stock * 0.3
                END
            FROM warehouses w 
            WHERE w.id = warehouse_record.id
            ON CONFLICT (user_id, product_id, warehouse_id) 
            DO UPDATE SET current_stock = EXCLUDED.current_stock;

            RAISE NOTICE 'Added warehouse stock for % at %', prod_record.name, warehouse_record.name;
        END LOOP;

        -- Crear movimiento de stock inicial
        INSERT INTO stock_movements (
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
            notes
        )
        SELECT 
            w.user_id,
            prod_record.id,
            w.id,
            'entrada',
            0,
            initial_stock,
            initial_stock,
            COALESCE(prod_record.cost_price, 0),
            COALESCE(prod_record.cost_price, 0) * initial_stock,
            'ajuste',
            'Stock inicial agregado automáticamente'
        FROM warehouses w
        LIMIT 1; -- Solo crear un movimiento para el primer almacén

    END LOOP;

    RAISE NOTICE 'Stock inicial agregado a todos los productos';
END $$;