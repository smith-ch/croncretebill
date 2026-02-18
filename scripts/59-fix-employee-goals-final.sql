-- =====================================================
-- Script 59: Fix Employee Goals (Final)
-- =====================================================
-- Description: Ensures employee_id tracking is enabled and the metrics function is correct.
-- This combines fixes from script 56 and ensures 49 didn't overwrite them.
-- =====================================================

BEGIN;

-- 1. Ensure columns exist (Idempotent)
DO $$ 
BEGIN
  -- Invoices
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'employee_id') THEN
    ALTER TABLE invoices ADD COLUMN employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Thermal Receipts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'thermal_receipts' AND column_name = 'employee_id') THEN
    ALTER TABLE thermal_receipts ADD COLUMN employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'employee_id') THEN
    ALTER TABLE clients ADD COLUMN employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Create/Update Triggers to auto-set employee_id
-- Invoices
CREATE OR REPLACE FUNCTION set_invoice_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_invoice_employee_id ON invoices;
CREATE TRIGGER trigger_set_invoice_employee_id
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_employee_id();

-- Thermal Receipts
CREATE OR REPLACE FUNCTION set_thermal_receipt_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_thermal_receipt_employee_id ON thermal_receipts;
CREATE TRIGGER trigger_set_thermal_receipt_employee_id
  BEFORE INSERT ON thermal_receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_thermal_receipt_employee_id();

-- Clients
CREATE OR REPLACE FUNCTION set_client_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_client_employee_id ON clients;
CREATE TRIGGER trigger_set_client_employee_id
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_employee_id();

-- 3. Update get_employee_metrics function to CORRECTLY filter by employee_id
CREATE OR REPLACE FUNCTION get_employee_metrics(
  p_employee_id UUID,
  p_owner_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_ventas_invoices NUMERIC;
  v_ventas_thermal NUMERIC;
  v_facturas_count INTEGER;
  v_thermal_count INTEGER;
  v_clientes_nuevos INTEGER;
BEGIN
  -- Calcular ventas de invoices creadas por el empleado
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_ventas_invoices, v_facturas_count
  FROM invoices
  WHERE user_id = p_owner_id
  AND (employee_id = p_employee_id OR (employee_id IS NULL AND user_id = p_employee_id)) -- Fallback logic
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day'
  AND status IN ('paid', 'pending', 'overdue');
  
  -- Calcular ventas de thermal_receipts creados por el empleado
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO v_ventas_thermal, v_thermal_count
  FROM thermal_receipts
  WHERE user_id = p_owner_id
  AND (employee_id = p_employee_id OR (employee_id IS NULL AND user_id = p_employee_id))
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day';
  
  -- Contar clientes nuevos creados por el empleado en el periodo
  SELECT COUNT(*)
  INTO v_clientes_nuevos
  FROM clients
  WHERE user_id = p_owner_id
  AND (employee_id = p_employee_id OR (employee_id IS NULL AND user_id = p_employee_id))
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day';
  
  -- Construir el resultado JSON
  SELECT json_build_object(
    'ventas_total', v_ventas_invoices + v_ventas_thermal,
    'facturas_cantidad', v_facturas_count + v_thermal_count,
    'clientes_nuevos', v_clientes_nuevos
  )
  INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill specific records (Optional/Safe)
-- Only set employee_id = user_id where employee_id is null AND user_id != owner_id (meaning user_id IS the employee)
-- This covers cases where employees created records with their own ID before this system.
-- However, if user_id = owner_id, we can't guess.

-- Update complete message
SELECT 'Script 59: Employee Goals Fix Applied Successfully' as status;

COMMIT;
