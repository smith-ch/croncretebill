-- =====================================================
-- Script 56: Add Employee Tracking to Main Tables
-- =====================================================
-- Description: Adds employee_id column to track which employee created each record
-- Date: 2026-01-05
-- =====================================================

BEGIN;

-- 1. Add employee_id column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN invoices.employee_id IS 'Employee who created this invoice (for goal tracking)';

-- 2. Add employee_id column to thermal_receipts table
ALTER TABLE thermal_receipts 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN thermal_receipts.employee_id IS 'Employee who created this thermal receipt (for goal tracking)';

-- 3. Add employee_id column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN clients.employee_id IS 'Employee who created/manages this client (for goal tracking)';

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_employee_id ON invoices(employee_id);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_employee_id ON thermal_receipts(employee_id);
CREATE INDEX IF NOT EXISTS idx_clients_employee_id ON clients(employee_id);

-- 5. Set employee_id to user_id for existing records (owner-created records)
-- This assumes that records without employee_id were created by the owner
UPDATE invoices 
SET employee_id = user_id 
WHERE employee_id IS NULL;

UPDATE thermal_receipts 
SET employee_id = user_id 
WHERE employee_id IS NULL;

UPDATE clients 
SET employee_id = user_id 
WHERE employee_id IS NULL;

-- 6. Update get_employee_metrics function to filter by employee
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
  AND employee_id = p_employee_id  -- FILTRO POR EMPLEADO
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day'
  AND status IN ('paid', 'pending', 'overdue');
  
  -- Calcular ventas de thermal_receipts creados por el empleado
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO v_ventas_thermal, v_thermal_count
  FROM thermal_receipts
  WHERE user_id = p_owner_id
  AND employee_id = p_employee_id  -- FILTRO POR EMPLEADO
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day';
  
  -- Contar clientes nuevos creados por el empleado en el periodo
  SELECT COUNT(*)
  INTO v_clientes_nuevos
  FROM clients
  WHERE user_id = p_owner_id
  AND employee_id = p_employee_id  -- FILTRO POR EMPLEADO
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

COMMENT ON FUNCTION get_employee_metrics IS 'Calcula las métricas actuales de un empleado específico para un periodo (ahora filtra por employee_id)';

-- 7. Create trigger to automatically set employee_id on new records
-- For invoices
CREATE OR REPLACE FUNCTION set_invoice_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si no se especifica employee_id, usar auth.uid() (quien está autenticado)
  -- Esto captura tanto al owner como a los empleados correctamente
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

-- For thermal_receipts
CREATE OR REPLACE FUNCTION set_thermal_receipt_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si no se especifica employee_id, usar auth.uid() (quien está autenticado)
  -- Esto captura tanto al owner como a los empleados correctamente
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

-- For clients
CREATE OR REPLACE FUNCTION set_client_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si no se especifica employee_id, usar auth.uid() (quien está autenticado)
  -- Esto captura tanto al owner como a los empleados correctamente
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

-- 8. Mostrar resumen
DO $$
DECLARE
  v_invoices_count INTEGER;
  v_thermal_count INTEGER;
  v_clients_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invoices_count FROM invoices WHERE employee_id IS NOT NULL;
  SELECT COUNT(*) INTO v_thermal_count FROM thermal_receipts WHERE employee_id IS NOT NULL;
  SELECT COUNT(*) INTO v_clients_count FROM clients WHERE employee_id IS NOT NULL;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Employee Tracking Enabled:';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Invoices with employee_id: %', v_invoices_count;
  RAISE NOTICE 'Thermal receipts with employee_id: %', v_thermal_count;
  RAISE NOTICE 'Clients with employee_id: %', v_clients_count;
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Triggers created to auto-set employee_id on new records';
  RAISE NOTICE 'Function get_employee_metrics updated to filter by employee';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
