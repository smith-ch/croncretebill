-- Migración: Corregir tipo de datos para customer_id en product_prices
-- Cambiar de UUID a VARCHAR para permitir identificadores de cliente más flexibles

-- Eliminar la constraint de clave foránea existente
ALTER TABLE product_prices DROP CONSTRAINT IF EXISTS product_prices_customer_id_fkey;

-- Cambiar el tipo de datos de customer_id
ALTER TABLE product_prices ALTER COLUMN customer_id TYPE VARCHAR(255);

-- Recrear los índices únicos
DROP INDEX IF EXISTS unique_product_price_per_customer;
DROP INDEX IF EXISTS unique_product_price_general;

-- Índice único para precios con customer_type y/o customer_id
CREATE UNIQUE INDEX unique_product_price_per_customer 
    ON product_prices(product_id, price_name, COALESCE(customer_type, ''), COALESCE(customer_id, ''));

-- Actualizar la función get_product_price_for_customer
CREATE OR REPLACE FUNCTION get_product_price_for_customer(
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_date DATE DEFAULT CURRENT_DATE,
    p_customer_type VARCHAR(50) DEFAULT NULL,
    p_customer_id VARCHAR(255) DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    price_name VARCHAR(255),
    price DECIMAL(10,2),
    min_quantity INTEGER,
    max_quantity INTEGER,
    is_default BOOLEAN,
    customer_type VARCHAR(50),
    customer_id VARCHAR(255)
) AS $$
BEGIN
    -- Buscar precios aplicables en orden de prioridad:
    -- 1. Precio específico para el cliente
    -- 2. Precio para el tipo de cliente
    -- 3. Precio general (sin customer_type ni customer_id)
    RETURN QUERY
    SELECT 
        pp.id,
        pp.price_name,
        pp.price,
        pp.min_quantity,
        pp.max_quantity,
        pp.is_default,
        pp.customer_type,
        pp.customer_id
    FROM product_prices pp
    WHERE pp.product_id = p_product_id
        AND pp.is_active = true
        AND (pp.valid_from IS NULL OR pp.valid_from <= p_date)
        AND (pp.valid_until IS NULL OR pp.valid_until >= p_date)
        AND p_quantity >= pp.min_quantity
        AND (pp.max_quantity IS NULL OR p_quantity <= pp.max_quantity)
        AND (
            -- Precio específico para el cliente
            (pp.customer_id IS NOT NULL AND pp.customer_id = p_customer_id)
            OR 
            -- Precio para el tipo de cliente (sin customer_id específico)
            (pp.customer_id IS NULL AND pp.customer_type IS NOT NULL AND pp.customer_type = p_customer_type)
            OR
            -- Precio general (sin customer_type ni customer_id)
            (pp.customer_type IS NULL AND pp.customer_id IS NULL)
        )
    ORDER BY 
        CASE 
            WHEN pp.customer_id IS NOT NULL THEN 1  -- Prioridad más alta: cliente específico
            WHEN pp.customer_type IS NOT NULL THEN 2  -- Prioridad media: tipo de cliente
            ELSE 3  -- Prioridad más baja: precio general
        END,
        pp.is_default DESC,
        pp.min_quantity DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Crear comentario explicativo
COMMENT ON COLUMN product_prices.customer_id IS 'Identificador del cliente específico (texto libre, no necesariamente UUID)';
COMMENT ON COLUMN product_prices.customer_type IS 'Tipo de cliente: general, vip, wholesale, retail, etc.';