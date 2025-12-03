-- ========================================================================
-- DIAGNÓSTICO Y CORRECCIÓN: ALMACENES Y PRODUCTOS FANTASMA
-- ========================================================================
-- Problema: El usuario tiene UN almacén pero aparecen productos en múltiples
-- Solución: Identificar y consolidar en el almacén correcto del usuario
-- ========================================================================

-- ========================================================================
-- PASO 0: IDENTIFICAR ALMACENES DEL USUARIO
-- ========================================================================
-- Ver todos los almacenes y cuántos productos tiene cada uno
SELECT 
    w.id,
    w.name as almacen,
    w.user_id,
    w.is_active,
    w.created_at,
    COUNT(DISTINCT pws.product_id) as productos_en_almacen,
    SUM(pws.current_stock) as stock_total
FROM warehouses w
LEFT JOIN product_warehouse_stock pws ON pws.warehouse_id = w.id
GROUP BY w.id, w.name, w.user_id, w.is_active, w.created_at
ORDER BY w.created_at;

-- ========================================================================
-- PASO 1: IDENTIFICAR PRODUCTOS DUPLICADOS EN MÚLTIPLES ALMACENES
-- ========================================================================
-- Ver qué productos están en más de un almacén (ESTO ES EL PROBLEMA)
WITH product_warehouses AS (
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.user_id,
        COUNT(DISTINCT pws.warehouse_id) as cantidad_almacenes,
        STRING_AGG(DISTINCT w.name, ', ') as almacenes,
        STRING_AGG(DISTINCT w.id::text, ', ') as warehouse_ids,
        SUM(pws.current_stock) as stock_total_duplicado
    FROM products p
    INNER JOIN product_warehouse_stock pws ON pws.product_id = p.id
    INNER JOIN warehouses w ON w.id = pws.warehouse_id
    GROUP BY p.id, p.name, p.user_id
)
SELECT 
    product_name,
    cantidad_almacenes,
    almacenes,
    stock_total_duplicado
FROM product_warehouses
WHERE cantidad_almacenes > 1
ORDER BY cantidad_almacenes DESC, product_name;

-- ========================================================================
-- PASO 2: VER DETALLE DE CADA PRODUCTO DUPLICADO
-- ========================================================================
DO $$
DECLARE
    product_record RECORD;
    warehouse_record RECORD;
    total_warehouses INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRODUCTOS EN MÚLTIPLES ALMACENES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    FOR product_record IN 
        SELECT 
            p.id, 
            p.name,
            p.current_stock,
            COUNT(DISTINCT pws.warehouse_id) as warehouse_count
        FROM products p
        INNER JOIN product_warehouse_stock pws ON pws.product_id = p.id
        GROUP BY p.id, p.name, p.current_stock
        HAVING COUNT(DISTINCT pws.warehouse_id) > 1
        ORDER BY p.name
    LOOP
        RAISE NOTICE '📦 Producto: %', product_record.name;
        RAISE NOTICE '   Stock en products: %', COALESCE(product_record.current_stock, 0);
        RAISE NOTICE '   Está en % almacenes diferentes:', product_record.warehouse_count;
        
        FOR warehouse_record IN
            SELECT 
                w.name as warehouse_name,
                w.id as warehouse_id,
                w.is_active,
                w.user_id,
                pws.current_stock,
                pws.id as stock_id
            FROM product_warehouse_stock pws
            INNER JOIN warehouses w ON w.id = pws.warehouse_id
            WHERE pws.product_id = product_record.id
            ORDER BY pws.created_at DESC
        LOOP
            RAISE NOTICE '      → Almacén: % (ID: %)', 
                warehouse_record.warehouse_name,
                warehouse_record.warehouse_id;
            RAISE NOTICE '         User: % | Activo: % | Stock: %', 
                warehouse_record.user_id,
                warehouse_record.is_active,
                warehouse_record.current_stock;
        END LOOP;
        
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ========================================================================
-- PASO 3: CONSOLIDAR STOCK EN EL ALMACÉN PRINCIPAL DEL USUARIO
-- ========================================================================
-- ⚠️ Este paso consolidará todos los stocks en el almacén principal
-- ⚠️ y eliminará los registros fantasma de otros almacenes

-- ✅ CORRECCIÓN ACTIVADA - ESTE CÓDIGO SE EJECUTARÁ
DO $$
DECLARE
    user_record RECORD;
    main_warehouse_id UUID;
    product_record RECORD;
    total_stock INTEGER;
    registros_eliminados INTEGER := 0;
    productos_consolidados INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONSOLIDACIÓN DE STOCK';
    RAISE NOTICE '========================================';
    
    -- Para cada usuario
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM products 
        WHERE user_id IS NOT NULL
    LOOP
        -- Obtener el almacén principal del usuario (el primero creado y activo)
        SELECT id INTO main_warehouse_id
        FROM warehouses
        WHERE user_id = user_record.user_id
        AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF main_warehouse_id IS NULL THEN
            RAISE NOTICE '⚠️  Usuario % no tiene almacén activo', user_record.user_id;
            CONTINUE;
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '👤 Procesando usuario: %', user_record.user_id;
        RAISE NOTICE '📦 Almacén principal: %', main_warehouse_id;
        RAISE NOTICE '';
        
        -- Para cada producto del usuario que está en múltiples almacenes
        FOR product_record IN
            SELECT 
                p.id,
                p.name,
                COUNT(DISTINCT pws.warehouse_id) as warehouse_count
            FROM products p
            INNER JOIN product_warehouse_stock pws ON pws.product_id = p.id
            WHERE p.user_id = user_record.user_id
            GROUP BY p.id, p.name
            HAVING COUNT(DISTINCT pws.warehouse_id) > 1
        LOOP
            -- Calcular stock total de TODOS los almacenes
            SELECT COALESCE(SUM(current_stock), 0)
            INTO total_stock
            FROM product_warehouse_stock
            WHERE product_id = product_record.id;
            
            RAISE NOTICE '   📦 %: Consolidando % unidades (de % almacenes)', 
                product_record.name,
                total_stock,
                product_record.warehouse_count;
            
            -- Eliminar TODOS los registros de este producto en todos los almacenes
            DELETE FROM product_warehouse_stock
            WHERE product_id = product_record.id;
            
            registros_eliminados := registros_eliminados + product_record.warehouse_count;
            
            -- Crear UN SOLO registro en el almacén principal con el stock total
            INSERT INTO product_warehouse_stock (
                product_id,
                warehouse_id,
                current_stock,
                available_stock,
                reserved_stock,
                created_at,
                updated_at
            ) VALUES (
                product_record.id,
                main_warehouse_id,
                total_stock,
                total_stock,
                0,
                NOW(),
                NOW()
            );
            
            -- Actualizar stock en tabla products
            UPDATE products
            SET 
                current_stock = total_stock,
                available_stock = total_stock,
                updated_at = NOW()
            WHERE id = product_record.id;
            
            productos_consolidados := productos_consolidados + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONSOLIDACIÓN COMPLETADA';
    RAISE NOTICE '📊 Registros eliminados: %', registros_eliminados;
    RAISE NOTICE '📦 Productos consolidados: %', productos_consolidados;
    RAISE NOTICE '========================================';
END $$;

-- ========================================================================
-- PASO 4: ELIMINAR ALMACENES FANTASMA (OPCIONAL)
-- ========================================================================
-- Si hay almacenes que no tienen productos y no los creó el usuario
-- ⚠️ SOLO ejecutar esto después del PASO 3

-- DESCOMENTAR PARA EJECUTAR:
/*
-- Ver almacenes vacíos primero
SELECT 
    w.id,
    w.name,
    w.user_id,
    w.is_active,
    w.created_at,
    COUNT(pws.id) as productos
FROM warehouses w
LEFT JOIN product_warehouse_stock pws ON pws.warehouse_id = w.id
GROUP BY w.id, w.name, w.user_id, w.is_active, w.created_at
HAVING COUNT(pws.id) = 0;

-- Eliminar almacenes vacíos (excepto el principal de cada usuario)
DELETE FROM warehouses
WHERE id IN (
    SELECT w.id
    FROM warehouses w
    LEFT JOIN product_warehouse_stock pws ON pws.warehouse_id = w.id
    WHERE w.id NOT IN (
        -- Mantener el almacén principal (más antiguo) de cada usuario
        SELECT DISTINCT ON (user_id) id
        FROM warehouses
        WHERE is_active = true
        ORDER BY user_id, created_at ASC
    )
    GROUP BY w.id
    HAVING COUNT(pws.id) = 0
);
*/

-- ========================================================================
-- PASO 5: VERIFICACIÓN FINAL
-- ========================================================================
-- Verificar que ahora cada producto está en UN SOLO almacén
SELECT 
    '✅ Total de productos' as descripcion,
    COUNT(*) as cantidad
FROM products
UNION ALL
SELECT 
    '📦 Productos con stock' as descripcion,
    COUNT(*) as cantidad
FROM products
WHERE current_stock > 0
UNION ALL
SELECT 
    '⚠️  Productos aún en múltiples almacenes' as descripcion,
    COUNT(*) as cantidad
FROM (
    SELECT p.id
    FROM products p
    INNER JOIN product_warehouse_stock pws ON pws.product_id = p.id
    GROUP BY p.id
    HAVING COUNT(DISTINCT pws.warehouse_id) > 1
) duplicates
UNION ALL
SELECT 
    '🏪 Total de almacenes' as descripcion,
    COUNT(*) as cantidad
FROM warehouses
UNION ALL
SELECT 
    '🏪 Almacenes activos' as descripcion,
    COUNT(*) as cantidad
FROM warehouses
WHERE is_active = true;

-- ========================================================================
-- NOTAS IMPORTANTES:
-- ========================================================================
-- 1. Ejecuta primero TODO el script SIN descomentar nada
-- 2. Revisa los PASOS 0, 1 y 2 para ver los almacenes fantasma
-- 3. Si confirmas que hay duplicados, descomenta el PASO 3 y ejecuta
-- 4. El PASO 3 consolidará todo en el almacén principal del usuario
-- 5. Opcionalmente, ejecuta PASO 4 para limpiar almacenes vacíos
-- 6. Verifica con PASO 5 que todo quedó correcto
-- ========================================================================
