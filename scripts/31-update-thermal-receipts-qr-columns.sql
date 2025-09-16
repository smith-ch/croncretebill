-- Script para actualizar la tabla thermal_receipts con mejoras de QR y numeración
-- Fecha: 2025-09-16

-- Agregar nueva columna para almacenar los datos del QR por separado
ALTER TABLE public.thermal_receipts 
ADD COLUMN IF NOT EXISTS qr_code_data JSONB;

-- Actualizar comentarios para clarificar el uso de las columnas
COMMENT ON COLUMN public.thermal_receipts.qr_code IS 'Imagen del código QR en formato base64/data URL (TEXT)';
COMMENT ON COLUMN public.thermal_receipts.qr_code_data IS 'Datos JSON del código QR para verificación (JSONB)';

-- Crear índice para búsquedas eficientes por datos del QR
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_qr_code_data ON public.thermal_receipts USING GIN (qr_code_data jsonb_path_ops);

-- Actualizar la tabla para mejorar la numeración secuencial
-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS generate_thermal_receipt_number(UUID);

-- Crear función para generar números secuenciales de recibos térmicos
CREATE OR REPLACE FUNCTION generate_thermal_receipt_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    receipt_number TEXT;
BEGIN
    -- Obtener el próximo número secuencial para el usuario
    SELECT COALESCE(MAX(CAST(receipt_number AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.thermal_receipts 
    WHERE user_id = p_user_id 
    AND receipt_number ~ '^[0-9]+$'; -- Solo números

    -- Formatear con padding de ceros
    receipt_number := LPAD(next_number::TEXT, 2, '0');
    
    RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_thermal_receipt_number(UUID) TO authenticated;

-- Actualizar recibos existentes que no tienen numeración secuencial
WITH numbered_receipts AS (
    SELECT id, 
           LPAD(ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)::TEXT, 2, '0') as new_receipt_number
    FROM public.thermal_receipts 
    WHERE receipt_number ~ '^(TR-|TRM-)' -- Solo actualizar los que tienen formato antiguo
)
UPDATE public.thermal_receipts 
SET receipt_number = numbered_receipts.new_receipt_number
FROM numbered_receipts
WHERE public.thermal_receipts.id = numbered_receipts.id;

-- Eliminar función trigger existente si existe
DROP FUNCTION IF EXISTS auto_assign_thermal_receipt_number();

-- Crear función trigger para auto-asignar números secuenciales
CREATE OR REPLACE FUNCTION auto_assign_thermal_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Si no se proporciona número de recibo, generar uno automáticamente
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := generate_thermal_receipt_number(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para auto-asignación
DROP TRIGGER IF EXISTS trigger_auto_assign_thermal_receipt_number ON public.thermal_receipts;
CREATE TRIGGER trigger_auto_assign_thermal_receipt_number
    BEFORE INSERT ON public.thermal_receipts
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_thermal_receipt_number();

-- Grant permissions para las nuevas funciones
GRANT EXECUTE ON FUNCTION auto_assign_thermal_receipt_number() TO authenticated;