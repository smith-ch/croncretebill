-- Agregar campo código de producto y mejorar la gestión de productos
-- Este script agrega campos necesarios para manejar productos por código

-- Agregar campo de código de producto solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_code') THEN
    ALTER TABLE products ADD COLUMN product_code TEXT;
  END IF;
END $$;

-- Agregar campo para descripción corta si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'short_description') THEN
    ALTER TABLE products ADD COLUMN short_description TEXT;
  END IF;
END $$;

-- Crear índice para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_code_user ON products(product_code, user_id);

-- Comentarios para documentar los campos
COMMENT ON COLUMN products.product_code IS 'Código único del producto asignado por el usuario';
COMMENT ON COLUMN products.short_description IS 'Descripción corta del producto para búsquedas';

-- Función para generar código automático si el usuario no especifica uno
CREATE OR REPLACE FUNCTION generate_product_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    new_code TEXT;
BEGIN
    -- Obtener el siguiente número secuencial para este usuario
    SELECT COALESCE(MAX(CAST(SUBSTRING(product_code FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO next_number
    FROM products 
    WHERE user_id = user_id_param 
    AND product_code ~ '^PROD[0-9]+$';
    
    -- Generar código con formato PROD0001, PROD0002, etc.
    new_code := 'PROD' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar código automático si no se proporciona
CREATE OR REPLACE FUNCTION assign_product_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_code IS NULL OR NEW.product_code = '' THEN
        NEW.product_code := generate_product_code(NEW.user_id);
    END IF;
    
    -- Asegurar que el código es único para este usuario (solo para INSERT o cuando el ID cambia)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.id != OLD.id) THEN
        IF EXISTS (SELECT 1 FROM products WHERE user_id = NEW.user_id AND product_code = NEW.product_code AND id != NEW.id) THEN
            RAISE EXCEPTION 'El código de producto % ya existe', NEW.product_code;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.product_code != OLD.product_code THEN
        IF EXISTS (SELECT 1 FROM products WHERE user_id = NEW.user_id AND product_code = NEW.product_code AND id != NEW.id) THEN
            RAISE EXCEPTION 'El código de producto % ya existe', NEW.product_code;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_assign_product_code ON products;
CREATE TRIGGER trigger_assign_product_code
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION assign_product_code();

-- Actualizar productos existentes que no tengan código
UPDATE products 
SET product_code = generate_product_code(user_id)
WHERE product_code IS NULL OR product_code = '';

-- Agregar constraint para asegurar que el código no sea nulo
ALTER TABLE products 
ADD CONSTRAINT products_code_not_null 
CHECK (product_code IS NOT NULL AND product_code != '');