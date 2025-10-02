-- Migration: Add multiple pricing system for products
-- This script creates a product_prices table to support multiple price levels per product

-- Create product_prices table
CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    price_name VARCHAR(100) NOT NULL, -- e.g., "Precio Mayorista", "Precio VIP", "Precio Especial"
    price DECIMAL(10,2) NOT NULL,
    min_quantity INTEGER DEFAULT 1, -- Cantidad mínima para aplicar este precio
    max_quantity INTEGER, -- Cantidad máxima (NULL = sin límite)
    is_default BOOLEAN DEFAULT false, -- Si es el precio por defecto
    is_active BOOLEAN DEFAULT true,
    valid_from DATE, -- Fecha desde cuando es válido (NULL = siempre)
    valid_until DATE, -- Fecha hasta cuando es válido (NULL = sin límite)
    description TEXT, -- Descripción del precio (ej: "Para pedidos de 100 unidades o más")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_quantity_range CHECK (min_quantity <= COALESCE(max_quantity, min_quantity)),
    CONSTRAINT check_valid_dates CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until),
    UNIQUE(product_id, price_name) -- Un producto no puede tener dos precios con el mismo nombre
);

-- Create indexes for product_prices
CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_user_id ON product_prices(user_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_default ON product_prices(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_product_prices_active ON product_prices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_prices_quantity ON product_prices(min_quantity, max_quantity);

-- Enable RLS for product_prices
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_prices
CREATE POLICY "Users can view their own product prices" ON product_prices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product prices" ON product_prices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product prices" ON product_prices
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product prices" ON product_prices
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_prices_updated_at
    BEFORE UPDATE ON product_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_product_prices_updated_at();

-- Create function to get applicable price for a product based on quantity
CREATE OR REPLACE FUNCTION get_product_price(
    p_product_id UUID,
    p_user_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    price_id UUID,
    price_name VARCHAR(100),
    price DECIMAL(10,2),
    min_quantity INTEGER,
    max_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.id,
        pp.price_name,
        pp.price,
        pp.min_quantity,
        pp.max_quantity
    FROM product_prices pp
    WHERE pp.product_id = p_product_id
        AND pp.user_id = p_user_id
        AND pp.is_active = true
        AND pp.min_quantity <= p_quantity
        AND (pp.max_quantity IS NULL OR pp.max_quantity >= p_quantity)
        AND (pp.valid_from IS NULL OR pp.valid_from <= p_date)
        AND (pp.valid_until IS NULL OR pp.valid_until >= p_date)
    ORDER BY 
        pp.is_default DESC,  -- Precio por defecto primero
        pp.min_quantity DESC, -- Precios de mayor cantidad primero
        pp.price ASC         -- Precio más bajo primero
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing product prices to the new system
DO $$
DECLARE
    product_record RECORD;
BEGIN
    -- For each existing product, create a default price entry
    FOR product_record IN 
        SELECT id, user_id, unit_price, name 
        FROM products 
        WHERE unit_price IS NOT NULL AND unit_price > 0
    LOOP
        INSERT INTO product_prices (
            product_id,
            user_id,
            price_name,
            price,
            min_quantity,
            is_default,
            description
        ) VALUES (
            product_record.id,
            product_record.user_id,
            'Precio Estándar',
            product_record.unit_price,
            1,
            true,
            'Precio estándar del producto'
        )
        ON CONFLICT (product_id, price_name) DO NOTHING;
    END LOOP;
END $$;

COMMENT ON TABLE product_prices IS 'Multiple pricing levels for products based on quantity, dates, and customer types';
COMMENT ON COLUMN product_prices.price_name IS 'Name of the price level (e.g., Wholesale, VIP, Special)';
COMMENT ON COLUMN product_prices.min_quantity IS 'Minimum quantity required for this price';
COMMENT ON COLUMN product_prices.max_quantity IS 'Maximum quantity for this price (NULL = no limit)';
COMMENT ON COLUMN product_prices.is_default IS 'Whether this is the default price for the product';
COMMENT ON COLUMN product_prices.valid_from IS 'Date from which this price is valid (NULL = always)';
COMMENT ON COLUMN product_prices.valid_until IS 'Date until which this price is valid (NULL = no expiry)';