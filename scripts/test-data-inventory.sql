-- Script para insertar datos de prueba para el sistema de inventario
-- Ejecutar después de aplicar todos los scripts del inventario

-- Primero verificar que tenemos usuarios (profiles)
DO $$
DECLARE 
    user_count INTEGER;
    test_user_id UUID;
BEGIN
    -- Contar usuarios existentes
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    IF user_count = 0 THEN
        -- Crear un usuario de prueba si no existe ninguno
        INSERT INTO profiles (id, full_name, email, company_name) 
        VALUES (
            gen_random_uuid(),
            'Usuario Prueba',
            'test@croncretebill.com',
            'Empresa Prueba'
        ) RETURNING id INTO test_user_id;
        
        RAISE NOTICE 'Usuario de prueba creado con ID: %', test_user_id;
    ELSE
        -- Usar el primer usuario existente
        SELECT id INTO test_user_id FROM profiles LIMIT 1;
        RAISE NOTICE 'Usando usuario existente: %', test_user_id;
    END IF;

    -- Crear almacenes de prueba si no existen
    INSERT INTO warehouses (user_id, name, address, description) 
    VALUES 
        (test_user_id, 'Almacén Principal', 'Calle Principal 123', 'Almacén principal de la empresa'),
        (test_user_id, 'Almacén Secundario', 'Av. Comercial 456', 'Almacén para productos de alta rotación')
    ON CONFLICT DO NOTHING;

    -- Crear categorías de productos si no existen
    INSERT INTO product_categories (user_id, name, description)
    VALUES 
        (test_user_id, 'Materiales de Construcción', 'Cemento, arena, grava, etc.'),
        (test_user_id, 'Herramientas', 'Herramientas manuales y eléctricas'),
        (test_user_id, 'Equipos', 'Equipos pesados y maquinaria')
    ON CONFLICT DO NOTHING;

    -- Crear productos de prueba
    INSERT INTO products (user_id, category_id, name, sku, description, unit, unit_price, cost_price, minimum_stock, current_stock, status)
    SELECT 
        test_user_id,
        cat.id,
        product_data.name,
        product_data.sku,
        product_data.description,
        product_data.unit,
        product_data.unit_price,
        product_data.cost_price,
        product_data.minimum_stock,
        product_data.current_stock,
        'active'
    FROM (
        VALUES 
            ('Cemento Portland', 'CEM-001', 'Cemento Portland tipo I, saco de 50kg', 'saco', 25.00, 18.00, 10, 100),
            ('Arena Fina', 'ARE-001', 'Arena fina para construcción, metro cúbico', 'm³', 35.00, 25.00, 5, 50),
            ('Grava', 'GRA-001', 'Grava triturada 3/4", metro cúbico', 'm³', 40.00, 30.00, 5, 30),
            ('Martillo Carpintero', 'HER-001', 'Martillo de carpintero 16oz', 'unidad', 15.00, 10.00, 3, 20),
            ('Taladro Eléctrico', 'HER-002', 'Taladro eléctrico 1/2" variable', 'unidad', 85.00, 65.00, 2, 8),
            ('Mezcladora Concreto', 'EQU-001', 'Mezcladora de concreto 1 saco', 'unidad', 850.00, 650.00, 1, 3)
    ) AS product_data(name, sku, description, unit, unit_price, cost_price, minimum_stock, current_stock)
    CROSS JOIN (
        SELECT id FROM product_categories WHERE user_id = test_user_id LIMIT 1
    ) cat
    ON CONFLICT (user_id, sku) DO NOTHING;

    -- Crear stock inicial para cada producto en cada almacén
    INSERT INTO product_warehouse_stock (user_id, product_id, warehouse_id, current_stock, minimum_stock, maximum_stock)
    SELECT 
        test_user_id,
        p.id,
        w.id,
        CASE 
            WHEN p.name LIKE '%Cemento%' THEN 60
            WHEN p.name LIKE '%Arena%' THEN 30
            WHEN p.name LIKE '%Grava%' THEN 20
            WHEN p.name LIKE '%Martillo%' THEN 15
            WHEN p.name LIKE '%Taladro%' THEN 5
            WHEN p.name LIKE '%Mezcladora%' THEN 2
            ELSE 10
        END as current_stock,
        p.minimum_stock,
        p.current_stock * 2 as maximum_stock
    FROM products p
    CROSS JOIN warehouses w
    WHERE p.user_id = test_user_id AND w.user_id = test_user_id
    ON CONFLICT (user_id, product_id, warehouse_id) DO NOTHING;

    RAISE NOTICE 'Datos de prueba insertados correctamente';
END $$;