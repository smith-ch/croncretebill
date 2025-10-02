-- Migración: Agregar columnas de cliente a product_prices
-- Este script agrega soporte para precios específicos por cliente

-- Agregar columnas para precios por cliente
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50); -- 'general', 'vip', 'wholesale', etc.
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES clients(id); -- Para clientes específicos

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_product_prices_customer_type ON product_prices(customer_type) WHERE customer_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_prices_customer_id ON product_prices(customer_id) WHERE customer_id IS NOT NULL;

-- Actualizar la constraint de unicidad para incluir customer_type y customer_id
-- Primero eliminar la constraint existente
ALTER TABLE product_prices DROP CONSTRAINT IF EXISTS product_prices_product_id_price_name_key;

-- Crear índice único parcial para manejar la unicidad con NULLs
-- Un producto puede tener múltiples precios con el mismo nombre si son para diferentes tipos de cliente o clientes específicos
CREATE UNIQUE INDEX IF NOT EXISTS unique_product_price_per_customer 
    ON product_prices(product_id, price_name, customer_type, customer_id) 
    WHERE customer_type IS NOT NULL OR customer_id IS NOT NULL;

-- Índice único para precios generales (sin customer_type ni customer_id)
CREATE UNIQUE INDEX IF NOT EXISTS unique_product_price_general 
    ON product_prices(product_id, price_name) 
    WHERE customer_type IS NULL AND customer_id IS NULL;

-- Función para obtener el precio aplicable considerando cliente
CREATE OR REPLACE FUNCTION get_product_price_for_customer(
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_date DATE DEFAULT CURRENT_DATE,
    p_customer_type VARCHAR(50) DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    price_name VARCHAR(255),
    price DECIMAL(10,2),
    min_quantity INTEGER,
    max_quantity INTEGER,
    is_default BOOLEAN,
    customer_type VARCHAR(50),
    customer_id UUID
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
        AND pp.min_quantity <= p_quantity
        AND (pp.max_quantity IS NULL OR pp.max_quantity >= p_quantity)
        AND (pp.valid_from IS NULL OR pp.valid_from <= p_date)
        AND (pp.valid_until IS NULL OR pp.valid_until >= p_date)
        AND (
            -- Precio específico para el cliente
            (p_customer_id IS NOT NULL AND pp.customer_id = p_customer_id)
            OR 
            -- Precio para el tipo de cliente
            (p_customer_id IS NULL AND p_customer_type IS NOT NULL AND pp.customer_type = p_customer_type AND pp.customer_id IS NULL)
            OR 
            -- Precio general
            (pp.customer_type IS NULL AND pp.customer_id IS NULL)
        )
    ORDER BY 
        -- Prioridad: cliente específico > tipo de cliente > general
        CASE 
            WHEN pp.customer_id = p_customer_id THEN 1
            WHEN pp.customer_type = p_customer_type AND pp.customer_id IS NULL THEN 2
            WHEN pp.customer_type IS NULL AND pp.customer_id IS NULL THEN 3
            ELSE 4
        END,
        -- Dentro de cada prioridad: default > mayor cantidad mínima > menor precio
        pp.is_default DESC,
        pp.min_quantity DESC,
        pp.price ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN product_prices.customer_type IS 'Tipo de cliente para el que aplica este precio (general, vip, wholesale, etc.)';
COMMENT ON COLUMN product_prices.customer_id IS 'ID específico del cliente para precios personalizados';