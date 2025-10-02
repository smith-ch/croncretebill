-- Migration: Create categories table for products and services
-- This script creates a categories table to organize products and services

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for visual distinction
    icon VARCHAR(50) DEFAULT 'folder', -- Icon name for UI
    type VARCHAR(20) CHECK (type IN ('product', 'service', 'both')) DEFAULT 'both',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name) -- Prevent duplicate category names per user
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Enable RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Insert default categories for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Insert default categories for all existing users
    FOR user_record IN SELECT id FROM auth.users LOOP
        INSERT INTO public.categories (user_id, name, description, color, icon, type) VALUES
        (user_record.id, 'General', 'Categoría general para productos y servicios', '#6B7280', 'folder', 'both'),
        (user_record.id, 'Materiales', 'Materiales de construcción y suministros', '#EF4444', 'package', 'product'),
        (user_record.id, 'Herramientas', 'Herramientas y equipos', '#F59E0B', 'wrench', 'product'),
        (user_record.id, 'Servicios Técnicos', 'Servicios técnicos especializados', '#10B981', 'settings', 'service'),
        (user_record.id, 'Consultoría', 'Servicios de consultoría y asesoría', '#3B82F6', 'user-check', 'service'),
        (user_record.id, 'Mantenimiento', 'Servicios de mantenimiento', '#8B5CF6', 'tool', 'service')
        ON CONFLICT (user_id, name) DO NOTHING;
    END LOOP;
END $$;

-- Add foreign key constraints to existing tables (optional - maintains backward compatibility)
-- Products table - update to reference categories
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Services table - update to reference categories  
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

-- Update existing products and services to use default category
DO $$
DECLARE
    user_record RECORD;
    general_category_id UUID;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM products UNION SELECT DISTINCT user_id FROM services LOOP
        -- Get the 'General' category for this user
        SELECT id INTO general_category_id 
        FROM categories 
        WHERE user_id = user_record.user_id AND name = 'General' 
        LIMIT 1;
        
        IF general_category_id IS NOT NULL THEN
            -- Update products without category_id
            UPDATE products 
            SET category_id = general_category_id 
            WHERE user_id = user_record.user_id AND category_id IS NULL;
            
            -- Update services without category_id
            UPDATE services 
            SET category_id = general_category_id 
            WHERE user_id = user_record.user_id AND category_id IS NULL;
        END IF;
    END LOOP;
END $$;

COMMENT ON TABLE categories IS 'Categories for organizing products and services';
COMMENT ON COLUMN categories.type IS 'Specifies if category is for products, services, or both';
COMMENT ON COLUMN categories.color IS 'Hex color code for visual distinction in UI';
COMMENT ON COLUMN categories.icon IS 'Icon name for UI representation';