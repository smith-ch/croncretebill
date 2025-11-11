-- Agregar campo precio de producción a la tabla services
-- Este script agrega el campo production_cost para gestionar los costos de producción de servicios

-- Agregar campo de precio de producción solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'production_cost') THEN
    ALTER TABLE services ADD COLUMN production_cost DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Agregar constraint para asegurar que el costo de producción no sea negativo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'services_production_cost_positive') THEN
    ALTER TABLE services 
    ADD CONSTRAINT services_production_cost_positive 
    CHECK (production_cost >= 0);
  END IF;
END $$;

-- Crear índice para búsquedas por costo de producción
CREATE INDEX IF NOT EXISTS idx_services_production_cost ON services(production_cost);

-- Comentarios para documentar el campo
COMMENT ON COLUMN services.production_cost IS 'Costo de producción del servicio (materiales, mano de obra directa, etc.)';

-- Actualizar servicios existentes con costo de producción por defecto
UPDATE services 
SET production_cost = 0 
WHERE production_cost IS NULL;