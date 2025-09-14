-- Script para agregar las relaciones y campos necesarios para DGII

-- 1. Agregar campos faltantes a la tabla expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS ncf VARCHAR(20),
ADD COLUMN IF NOT EXISTS itbis_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_rnc VARCHAR(20);

-- 2. Agregar campos faltantes a la tabla invoices  
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'credito',
ADD COLUMN IF NOT EXISTS monto_bienes DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_servicios DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_exento DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(10) DEFAULT 'B01',
ADD COLUMN IF NOT EXISTS indicador_anulacion INTEGER DEFAULT 0;

-- 3. Agregar campos adicionales a la tabla clients para DGII
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS tipo_id INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_provider BOOLEAN DEFAULT false;

-- 4. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_rnc ON clients(rnc);

-- 5. Actualizar datos existentes
-- Calcular ITBIS para gastos existentes que no lo tengan
UPDATE expenses 
SET itbis_amount = amount * 0.18 
WHERE itbis_amount IS NULL OR itbis_amount = 0;

-- Calcular monto_servicios para facturas existentes
UPDATE invoices 
SET monto_servicios = subtotal,
    monto_bienes = 0
WHERE monto_servicios IS NULL OR monto_servicios = 0;

-- 6. Crear función para validar RNC/Cédula
CREATE OR REPLACE FUNCTION validate_rnc(rnc_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Si es NULL o vacío, es válido
    IF rnc_value IS NULL OR TRIM(rnc_value) = '' THEN
        RETURN TRUE;
    END IF;
    
    -- Eliminar guiones y espacios
    rnc_value := REGEXP_REPLACE(rnc_value, '[^0-9]', '', 'g');
    
    -- Validar longitud (9 para RNC, 11 para cédula)
    RETURN LENGTH(rnc_value) IN (9, 11) AND rnc_value ~ '^[0-9]+$';
END;
$$ LANGUAGE plpgsql;

-- 7. Crear función para validar NCF
CREATE OR REPLACE FUNCTION validate_ncf(ncf_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Si es NULL o vacío, es válido
    IF ncf_value IS NULL OR TRIM(ncf_value) = '' THEN
        RETURN TRUE;
    END IF;
    
    -- NCF debe tener 11 caracteres y empezar con B o E
    RETURN LENGTH(ncf_value) = 11 AND 
           UPPER(ncf_value) ~ '^[BE][0-9]{2}[0-9]{8}$';
END;
$$ LANGUAGE plpgsql;

-- 8. Limpiar datos inválidos antes de agregar restricciones
-- Limpiar RNC inválidos en clients
UPDATE clients 
SET rnc = NULL 
WHERE rnc IS NOT NULL 
  AND NOT validate_rnc(rnc);

-- Limpiar NCF inválidos en expenses
UPDATE expenses 
SET ncf = NULL 
WHERE ncf IS NOT NULL 
  AND NOT validate_ncf(ncf);

-- Limpiar NCF inválidos en invoices
UPDATE invoices 
SET ncf = NULL 
WHERE ncf IS NOT NULL 
  AND NOT validate_ncf(ncf);

-- 9. Agregar restricciones de validación (ahora que los datos están limpios)
DO $$ 
BEGIN
    -- Agregar constraint para RNC en clients si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'clients' AND constraint_name = 'check_rnc_valid') THEN
        ALTER TABLE clients 
        ADD CONSTRAINT check_rnc_valid 
        CHECK (validate_rnc(rnc));
    END IF;

    -- Agregar constraint para NCF en expenses si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'expenses' AND constraint_name = 'check_ncf_valid') THEN
        ALTER TABLE expenses 
        ADD CONSTRAINT check_ncf_valid 
        CHECK (validate_ncf(ncf));
    END IF;

    -- Agregar constraint para NCF en invoices si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'invoices' AND constraint_name = 'check_invoice_ncf_valid') THEN
        ALTER TABLE invoices 
        ADD CONSTRAINT check_invoice_ncf_valid 
        CHECK (validate_ncf(ncf));
    END IF;
END $$;

-- 10. Comentarios para documentación
COMMENT ON COLUMN expenses.client_id IS 'Referencia al cliente/proveedor del gasto';
COMMENT ON COLUMN expenses.ncf IS 'Número de Comprobante Fiscal del gasto';
COMMENT ON COLUMN expenses.itbis_amount IS 'Monto del ITBIS del gasto';
COMMENT ON COLUMN expenses.provider_name IS 'Nombre del proveedor si no está en clients';
COMMENT ON COLUMN expenses.provider_rnc IS 'RNC del proveedor si no está en clients';

COMMENT ON COLUMN invoices.payment_method IS 'Método de pago: efectivo, credito, tarjeta, etc.';
COMMENT ON COLUMN invoices.monto_bienes IS 'Monto correspondiente a bienes físicos';
COMMENT ON COLUMN invoices.monto_servicios IS 'Monto correspondiente a servicios';
COMMENT ON COLUMN invoices.monto_exento IS 'Monto exento de ITBIS';
COMMENT ON COLUMN invoices.tipo_comprobante IS 'Tipo de comprobante fiscal según DGII';
COMMENT ON COLUMN invoices.indicador_anulacion IS '0=Válida, 1=Anulada';

COMMENT ON COLUMN clients.tipo_id IS '1=RNC, 2=Cédula, 3=Pasaporte';
COMMENT ON COLUMN clients.is_provider IS 'true si es proveedor, false si es cliente';