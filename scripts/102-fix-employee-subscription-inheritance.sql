-- Script para verificar y corregir la herencia de suscripción de empleados
-- Los empleados deben heredar la suscripción de su owner

-- ========================================
-- PASO 1: Verificar estado actual
-- ========================================

-- Ver todos los usuarios y sus relaciones
SELECT 
  up.user_id,
  up.display_name,
  up.parent_user_id,
  CASE 
    WHEN up.parent_user_id IS NULL THEN '👑 OWNER'
    ELSE '👨‍💼 EMPLEADO'
  END as tipo,
  up.is_active,
  -- Verificar suscripción del usuario
  us.plan_id as user_subscription_plan,
  us.status as user_subscription_status
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id AND us.status = 'active'
ORDER BY up.parent_user_id NULLS FIRST, up.created_at;

-- ========================================
-- PASO 2: Verificar suscripciones de owners
-- ========================================

-- Ver qué owners tienen suscripción activa
SELECT 
  up.user_id as owner_id,
  up.display_name as owner_name,
  us.plan_id,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  us.current_max_users,
  us.current_max_invoices,
  us.current_max_products,
  us.current_max_clients,
  us.status,
  us.start_date,
  us.end_date
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY up.display_name;

-- ========================================
-- PASO 3: Verificar empleados y sus owners
-- ========================================

-- Ver empleados y si su owner tiene suscripción
SELECT 
  emp.user_id as employee_id,
  emp.display_name as employee_name,
  emp.parent_user_id as owner_id,
  owner.display_name as owner_name,
  -- Suscripción del owner
  us.plan_id as owner_plan_id,
  sp.name as owner_plan_name,
  sp.display_name as owner_plan_display_name,
  us.current_max_users as owner_max_users,
  us.current_max_invoices as owner_max_invoices,
  us.current_max_products as owner_max_products,
  us.current_max_clients as owner_max_clients,
  us.status as owner_subscription_status,
  -- Validación
  CASE 
    WHEN emp.parent_user_id IS NULL THEN '❌ ERROR: Empleado sin parent_user_id'
    WHEN owner.user_id IS NULL THEN '❌ ERROR: Owner no existe'
    WHEN us.user_id IS NULL THEN '⚠️ ADVERTENCIA: Owner sin suscripción activa'
    ELSE '✅ OK: Empleado puede heredar suscripción'
  END as status
FROM user_profiles emp
LEFT JOIN user_profiles owner ON emp.parent_user_id = owner.user_id
LEFT JOIN user_subscriptions us ON owner.user_id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE emp.parent_user_id IS NOT NULL
ORDER BY emp.display_name;

-- ========================================
-- PASO 4: Diagnóstico de problemas
-- ========================================

-- Empleados sin parent_user_id (PROBLEMA)
SELECT 
  'Empleados sin parent_user_id' as issue,
  COUNT(*) as count
FROM user_profiles
WHERE parent_user_id IS NOT NULL;

-- Empleados cuyo owner no tiene suscripción activa
SELECT 
  'Empleados con owner sin suscripción' as issue,
  emp.display_name as employee_name,
  owner.display_name as owner_name,
  owner.user_id as owner_id
FROM user_profiles emp
LEFT JOIN user_profiles owner ON emp.parent_user_id = owner.user_id
LEFT JOIN user_subscriptions us ON owner.user_id = us.user_id AND us.status = 'active'
WHERE emp.parent_user_id IS NOT NULL
AND us.user_id IS NULL;

-- ========================================
-- PASO 5: Función de prueba para verificar herencia
-- ========================================

-- Crear función temporal para probar herencia
CREATE OR REPLACE FUNCTION test_subscription_inheritance(employee_user_id UUID)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  owner_id UUID,
  owner_name TEXT,
  inherited_plan_name TEXT,
  inherited_max_invoices INT,
  inherited_max_products INT,
  inherited_max_clients INT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    emp.user_id,
    emp.display_name::TEXT,
    COALESCE(emp.parent_user_id, emp.user_id),
    COALESCE(owner.display_name, emp.display_name)::TEXT,
    COALESCE(sp.display_name, 'Plan Gratuito')::TEXT,
    COALESCE(us.current_max_invoices, 5),
    COALESCE(us.current_max_products, 10),
    COALESCE(us.current_max_clients, 5),
    CASE 
      WHEN emp.parent_user_id IS NULL THEN 'Es owner, usa su propia suscripción'
      WHEN us.user_id IS NOT NULL THEN 'Es empleado, hereda suscripción del owner'
      ELSE 'Es empleado pero owner no tiene suscripción activa'
    END::TEXT
  FROM user_profiles emp
  LEFT JOIN user_profiles owner ON emp.parent_user_id = owner.user_id
  LEFT JOIN user_subscriptions us ON COALESCE(emp.parent_user_id, emp.user_id) = us.user_id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE emp.user_id = employee_user_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PASO 6: Prueba con cada usuario
-- ========================================

DO $$
DECLARE
  user_rec RECORD;
  test_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRUEBA DE HERENCIA DE SUSCRIPCIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR user_rec IN 
    SELECT user_id, display_name, parent_user_id 
    FROM user_profiles 
    ORDER BY parent_user_id NULLS FIRST
  LOOP
    SELECT * INTO test_result FROM test_subscription_inheritance(user_rec.user_id);
    
    RAISE NOTICE 'Usuario: % (ID: %)', user_rec.display_name, user_rec.user_id;
    RAISE NOTICE '  Tipo: %', CASE WHEN user_rec.parent_user_id IS NULL THEN 'OWNER' ELSE 'EMPLEADO' END;
    IF user_rec.parent_user_id IS NOT NULL THEN
      RAISE NOTICE '  Owner ID: %', user_rec.parent_user_id;
    END IF;
    RAISE NOTICE '  Plan heredado: %', test_result.inherited_plan_name;
    RAISE NOTICE '  Límites: % facturas, % productos, % clientes', 
      test_result.inherited_max_invoices,
      test_result.inherited_max_products,
      test_result.inherited_max_clients;
    RAISE NOTICE '  Estado: %', test_result.status;
    RAISE NOTICE '';
  END LOOP;
END $$;

-- ========================================
-- PASO 7: Mensaje final
-- ========================================

SELECT 
  '✅ Diagnóstico completado' as status,
  'Revisa los mensajes arriba para verificar:' as instrucciones,
  '1. Empleados tienen parent_user_id correcto' as check_1,
  '2. Owners tienen suscripción activa' as check_2,
  '3. Empleados heredan correctamente los límites' as check_3;
