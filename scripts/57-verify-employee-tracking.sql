-- =====================================================
-- Script 57: Verify Employee Tracking
-- =====================================================
-- Description: Verifica que el tracking de empleados esté funcionando
-- Date: 2026-01-05
-- =====================================================

-- 1. Verificar que las columnas existen
SELECT 
  'invoices' as tabla,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'employee_id'
  ) as tiene_employee_id
UNION ALL
SELECT 
  'thermal_receipts' as tabla,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thermal_receipts' AND column_name = 'employee_id'
  ) as tiene_employee_id
UNION ALL
SELECT 
  'clients' as tabla,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'employee_id'
  ) as tiene_employee_id;

-- 2. Ver distribución de registros por empleado
SELECT 'INVOICES POR EMPLEADO:' as info;
SELECT 
  COALESCE(up.display_name, 'Sin asignar') as empleado,
  up.email,
  COUNT(*) as total_facturas,
  SUM(i.total) as total_ventas
FROM invoices i
LEFT JOIN user_profiles up ON up.user_id = i.employee_id
GROUP BY up.display_name, up.email
ORDER BY total_facturas DESC;

SELECT 'THERMAL RECEIPTS POR EMPLEADO:' as info;
SELECT 
  COALESCE(up.display_name, 'Sin asignar') as empleado,
  up.email,
  COUNT(*) as total_recibos,
  SUM(tr.total_amount) as total_ventas
FROM thermal_receipts tr
LEFT JOIN user_profiles up ON up.user_id = tr.employee_id
GROUP BY up.display_name, up.email
ORDER BY total_recibos DESC;

SELECT 'CLIENTS POR EMPLEADO:' as info;
SELECT 
  COALESCE(up.display_name, 'Sin asignar') as empleado,
  up.email,
  COUNT(*) as total_clientes
FROM clients c
LEFT JOIN user_profiles up ON up.user_id = c.employee_id
GROUP BY up.display_name, up.email
ORDER BY total_clientes DESC;

-- 3. Verificar triggers
SELECT 
  trigger_name,
  event_object_table as tabla,
  action_timing,
  event_manipulation as evento
FROM information_schema.triggers
WHERE trigger_name LIKE '%employee_id%'
ORDER BY event_object_table;

-- 4. Test de la función get_employee_metrics
DO $$
DECLARE
  v_employee_id UUID;
  v_owner_id UUID;
  v_metrics JSON;
BEGIN
  -- Obtener un empleado de ejemplo
  SELECT user_id, parent_user_id 
  INTO v_employee_id, v_owner_id
  FROM user_profiles 
  WHERE parent_user_id IS NOT NULL 
  LIMIT 1;
  
  IF v_employee_id IS NOT NULL THEN
    -- Obtener métricas del mes actual
    SELECT get_employee_metrics(
      v_employee_id,
      v_owner_id,
      DATE_TRUNC('month', CURRENT_DATE)::DATE,
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
    ) INTO v_metrics;
    
    RAISE NOTICE 'Test de get_employee_metrics:';
    RAISE NOTICE 'Employee ID: %', v_employee_id;
    RAISE NOTICE 'Owner ID: %', v_owner_id;
    RAISE NOTICE 'Métricas: %', v_metrics;
  ELSE
    RAISE NOTICE 'No se encontró ningún empleado para hacer el test';
  END IF;
END $$;

SELECT 'Verificación completada' as status;
