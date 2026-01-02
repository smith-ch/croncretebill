-- Script 49: Sistema de Metas y Métricas para Empleados
-- Permite al owner establecer metas mensuales y trackear el desempeño de empleados

-- 1. Crear tabla de metas de empleados
CREATE TABLE IF NOT EXISTS employee_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Periodo de la meta
  periodo_mes INTEGER NOT NULL CHECK (periodo_mes >= 1 AND periodo_mes <= 12),
  periodo_anio INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Metas establecidas
  meta_ventas_total DECIMAL(12,2) DEFAULT 0,  -- Meta de ingresos en moneda local
  meta_facturas_cantidad INTEGER DEFAULT 0,    -- Meta de número de facturas
  meta_clientes_nuevos INTEGER DEFAULT 0,      -- Meta de clientes nuevos gestionados
  
  -- Notas y configuración
  notas TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Una meta activa por empleado por periodo
  UNIQUE(employee_id, periodo_mes, periodo_anio)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_employee_goals_employee_id ON employee_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_owner_id ON employee_goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_periodo ON employee_goals(periodo_mes, periodo_anio);
CREATE INDEX IF NOT EXISTS idx_employee_goals_active ON employee_goals(is_active) WHERE is_active = true;

-- 2. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_employee_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employee_goals_timestamp ON employee_goals;
CREATE TRIGGER update_employee_goals_timestamp
  BEFORE UPDATE ON employee_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_goals_updated_at();

-- 3. RLS Policies para employee_goals
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;

-- Owner puede ver todas las metas de sus empleados
DROP POLICY IF EXISTS "owners_can_view_employee_goals" ON employee_goals;
CREATE POLICY "owners_can_view_employee_goals"
  ON employee_goals
  FOR SELECT
  USING (
    owner_id = auth.uid()
  );

-- Owner puede crear metas para sus empleados
DROP POLICY IF EXISTS "owners_can_create_employee_goals" ON employee_goals;
CREATE POLICY "owners_can_create_employee_goals"
  ON employee_goals
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND
    -- Verificar que el employee_id es realmente un empleado del owner
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = employee_goals.employee_id
      AND parent_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Owner puede actualizar metas de sus empleados
DROP POLICY IF EXISTS "owners_can_update_employee_goals" ON employee_goals;
CREATE POLICY "owners_can_update_employee_goals"
  ON employee_goals
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owner puede eliminar metas de sus empleados
DROP POLICY IF EXISTS "owners_can_delete_employee_goals" ON employee_goals;
CREATE POLICY "owners_can_delete_employee_goals"
  ON employee_goals
  FOR DELETE
  USING (owner_id = auth.uid());

-- Empleados pueden ver sus propias metas
DROP POLICY IF EXISTS "employees_can_view_own_goals" ON employee_goals;
CREATE POLICY "employees_can_view_own_goals"
  ON employee_goals
  FOR SELECT
  USING (
    employee_id = auth.uid()
    AND is_active = true
  );

-- 4. Función auxiliar para obtener métricas actuales de un empleado
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
  -- Calcular ventas de invoices
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_ventas_invoices, v_facturas_count
  FROM invoices
  WHERE user_id = p_owner_id
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day'
  AND status IN ('paid', 'pending', 'overdue');
  
  -- Calcular ventas de thermal_receipts
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO v_ventas_thermal, v_thermal_count
  FROM thermal_receipts
  WHERE user_id = p_owner_id
  AND created_at >= p_fecha_inicio
  AND created_at <= p_fecha_fin + INTERVAL '1 day';
  
  -- Contar clientes nuevos creados en el periodo
  SELECT COUNT(*)
  INTO v_clientes_nuevos
  FROM clients
  WHERE user_id = p_owner_id
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

-- 5. Vista para facilitar consultas de metas con progreso
CREATE OR REPLACE VIEW employee_goals_with_progress AS
SELECT 
  eg.*,
  up.display_name AS employee_name,
  up.email AS employee_email,
  get_employee_metrics(eg.employee_id, eg.owner_id, eg.fecha_inicio, eg.fecha_fin) AS current_metrics
FROM employee_goals eg
JOIN user_profiles up ON up.user_id = eg.employee_id
WHERE eg.is_active = true;

-- Grant permissions en la vista
GRANT SELECT ON employee_goals_with_progress TO authenticated;

-- 6. Comentarios de documentación
COMMENT ON TABLE employee_goals IS 'Metas mensuales establecidas por el owner para trackear desempeño de empleados';
COMMENT ON COLUMN employee_goals.meta_ventas_total IS 'Meta de ingresos totales en el periodo (en moneda local)';
COMMENT ON COLUMN employee_goals.meta_facturas_cantidad IS 'Meta de número de facturas creadas en el periodo';
COMMENT ON COLUMN employee_goals.meta_clientes_nuevos IS 'Meta de nuevos clientes gestionados en el periodo';
COMMENT ON FUNCTION get_employee_metrics IS 'Calcula las métricas actuales de un empleado para un periodo específico';
COMMENT ON VIEW employee_goals_with_progress IS 'Vista que combina metas con métricas actuales de progreso';

-- 7. Datos de ejemplo (comentado - descomentar si quieres datos de prueba)
-- INSERT INTO employee_goals (employee_id, owner_id, periodo_mes, periodo_anio, fecha_inicio, fecha_fin, meta_ventas_total, meta_facturas_cantidad, meta_clientes_nuevos, notas)
-- SELECT 
--   up.user_id,
--   up.parent_user_id,
--   1, -- Enero
--   2026,
--   '2026-01-01'::DATE,
--   '2026-01-31'::DATE,
--   50000.00,
--   20,
--   5,
--   'Meta inicial para enero 2026'
-- FROM user_profiles up
-- WHERE up.parent_user_id IS NOT NULL
-- AND up.is_active = true
-- LIMIT 1;

-- Script completado
SELECT 'Script 49: Employee Goals and Metrics - Completado exitosamente' AS status;
