-- Agregar campo código de servicio y mejorar la gestión de servicios
-- Este script agrega campos necesarios para manejar servicios por código

-- Agregar campo de código de servicio solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'service_code') THEN
    ALTER TABLE services ADD COLUMN service_code TEXT;
  END IF;
END $$;

-- Agregar campo para descripción corta si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'short_description') THEN
    ALTER TABLE services ADD COLUMN short_description TEXT;
  END IF;
END $$;

-- Crear índice para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_services_code ON services(service_code);
CREATE INDEX IF NOT EXISTS idx_services_code_user ON services(service_code, user_id);

-- Comentarios para documentar los campos
COMMENT ON COLUMN services.service_code IS 'Código único del servicio asignado por el usuario';
COMMENT ON COLUMN services.short_description IS 'Descripción corta del servicio para búsquedas';

-- Función para generar código automático de servicios si el usuario no especifica uno
CREATE OR REPLACE FUNCTION generate_service_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    new_code TEXT;
BEGIN
    -- Obtener el siguiente número secuencial para este usuario
    SELECT COALESCE(MAX(CAST(SUBSTRING(service_code FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO next_number
    FROM services 
    WHERE user_id = user_id_param 
    AND service_code ~ '^SERV[0-9]+$';
    
    -- Generar código con formato SERV0001, SERV0002, etc.
    new_code := 'SERV' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar código automático si no se proporciona
CREATE OR REPLACE FUNCTION assign_service_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.service_code IS NULL OR NEW.service_code = '' THEN
        NEW.service_code := generate_service_code(NEW.user_id);
    END IF;
    
    -- Asegurar que el código es único para este usuario (solo para INSERT o cuando el ID cambia)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.id != OLD.id) THEN
        IF EXISTS (SELECT 1 FROM services WHERE user_id = NEW.user_id AND service_code = NEW.service_code AND id != NEW.id) THEN
            RAISE EXCEPTION 'El código de servicio % ya existe', NEW.service_code;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.service_code != OLD.service_code THEN
        IF EXISTS (SELECT 1 FROM services WHERE user_id = NEW.user_id AND service_code = NEW.service_code AND id != NEW.id) THEN
            RAISE EXCEPTION 'El código de servicio % ya existe', NEW.service_code;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_assign_service_code ON services;
CREATE TRIGGER trigger_assign_service_code
    BEFORE INSERT OR UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION assign_service_code();

-- Actualizar servicios existentes que no tengan código
UPDATE services 
SET service_code = generate_service_code(user_id)
WHERE service_code IS NULL OR service_code = '';

-- Agregar constraint para asegurar que el código no sea nulo
ALTER TABLE services 
ADD CONSTRAINT services_code_not_null 
CHECK (service_code IS NOT NULL AND service_code != '');