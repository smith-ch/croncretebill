-- =====================================================
-- Script 58: Debug Employee Metrics Issue
-- =====================================================
-- Description: Diagnóstico completo del problema de métricas en 0
-- Date: 2026-01-05
-- =====================================================

-- 1. Ver todas las metas activas con sus employee_ids
SELECT 
  '=== METAS ACTIVAS ===' as seccion,
  eg.id,
  eg.employee_id,
  up.display_name as empleado,
  up.email,
  eg.periodo_mes,
  eg.periodo_anio,
  eg.meta_ventas_total,
  eg.meta_facturas_cantidad,
  eg.meta_clientes_nuevos,
  eg.owner_id
FROM employee_goals eg
LEFT JOIN user_profiles up ON up.user_id = eg.employee_id
WHERE eg.is_active = true
  AND eg.periodo_mes = EXTRACT(MONTH FROM CURRENT_DATE)
  AND eg.periodo_anio = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY up.display_name;

-- 2. Ver facturas con employee_id
SELECT 
  '=== FACTURAS CON EMPLOYEE_ID ===' as seccion,
  i.id,
  i.invoice_number,
  i.user_id as owner_id,
  i.employee_id,
  up_owner.display_name as owner_name,
  up_employee.display_name as employee_name,
  i.total,
  i.status,
  i.created_at
FROM invoices i
LEFT JOIN user_profiles up_owner ON up_owner.user_id = i.user_id
LEFT JOIN user_profiles up_employee ON up_employee.user_id = i.employee_id
WHERE i.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND i.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY i.created_at DESC
LIMIT 20;

-- 3. Ver thermal receipts con employee_id
SELECT 
  '=== THERMAL RECEIPTS CON EMPLOYEE_ID ===' as seccion,
  tr.id,
  tr.receipt_number,
  tr.user_id as owner_id,
  tr.employee_id,
  up_owner.display_name as owner_name,
  up_employee.display_name as employee_name,
  tr.total_amount,
  tr.created_at
FROM thermal_receipts tr
LEFT JOIN user_profiles up_owner ON up_owner.user_id = tr.user_id
LEFT JOIN user_profiles up_employee ON up_employee.user_id = tr.employee_id
WHERE tr.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND tr.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY tr.created_at DESC
LIMIT 20;

-- 4. Ver clientes con employee_id
SELECT 
  '=== CLIENTES CON EMPLOYEE_ID ===' as seccion,
  c.id,
  c.name as client_name,
  c.user_id as owner_id,
  c.employee_id,
  up_owner.display_name as owner_name,
  up_employee.display_name as employee_name,
  c.created_at
FROM clients c
LEFT JOIN user_profiles up_owner ON up_owner.user_id = c.user_id
LEFT JOIN user_profiles up_employee ON up_employee.user_id = c.employee_id
WHERE c.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND c.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY c.created_at DESC
LIMIT 20;

-- 5. Test de get_employee_metrics para cada empleado con meta activa
DO $$
DECLARE
  v_goal RECORD;
  v_metrics JSON;
BEGIN
  RAISE NOTICE '=== TEST DE get_employee_metrics ===';
  
  FOR v_goal IN 
    SELECT 
      eg.id,
      eg.employee_id,
      eg.owner_id,
      eg.fecha_inicio,
      eg.fecha_fin,
      up.display_name,
      up.email
    FROM employee_goals eg
    LEFT JOIN user_profiles up ON up.user_id = eg.employee_id
    WHERE eg.is_active = true
      AND eg.periodo_mes = EXTRACT(MONTH FROM CURRENT_DATE)
      AND eg.periodo_anio = EXTRACT(YEAR FROM CURRENT_DATE)
  LOOP
    v_metrics := get_employee_metrics(
      v_goal.employee_id,
      v_goal.owner_id,
      v_goal.fecha_inicio,
      v_goal.fecha_fin
    );
    
    RAISE NOTICE '';
    RAISE NOTICE 'Empleado: % (%)', v_goal.display_name, v_goal.email;
    RAISE NOTICE 'Employee ID: %', v_goal.employee_id;
    RAISE NOTICE 'Owner ID: %', v_goal.owner_id;
    RAISE NOTICE 'Periodo: % a %', v_goal.fecha_inicio, v_goal.fecha_fin;
    RAISE NOTICE 'Métricas: %', v_metrics;
  END LOOP;
END $$;

-- 6. Contar registros por empleado en el periodo actual
SELECT 
  '=== RESUMEN POR EMPLEADO (MES ACTUAL) ===' as seccion,
  up.display_name as empleado,
  up.email,
  COALESCE(inv_count.total, 0) as facturas,
  COALESCE(inv_count.total_ventas, 0) as ventas_facturas,
  COALESCE(thermal_count.total, 0) as recibos_termicos,
  COALESCE(thermal_count.total_ventas, 0) as ventas_termicos,
  COALESCE(client_count.total, 0) as clientes_nuevos
FROM user_profiles up
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total, SUM(total) as total_ventas
  FROM invoices i
  WHERE i.employee_id = up.user_id
    AND i.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND i.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND i.status IN ('paid', 'pending', 'overdue')
) inv_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total, SUM(total_amount) as total_ventas
  FROM thermal_receipts tr
  WHERE tr.employee_id = up.user_id
    AND tr.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND tr.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
) thermal_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total
  FROM clients c
  WHERE c.employee_id = up.user_id
    AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND c.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
) client_count ON true
WHERE up.parent_user_id IS NOT NULL
ORDER BY up.display_name;

-- 7. Verificar que los triggers existen y están activos
SELECT 
  '=== TRIGGERS ACTIVOS ===' as seccion,
  trigger_name,
  event_object_table as tabla,
  action_timing || ' ' || event_manipulation as accion,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_set_invoice_employee_id',
  'trigger_set_thermal_receipt_employee_id',
  'trigger_set_client_employee_id'
)
ORDER BY event_object_table;

SELECT 'Diagnóstico completado - Revisa los resultados arriba' as status;
