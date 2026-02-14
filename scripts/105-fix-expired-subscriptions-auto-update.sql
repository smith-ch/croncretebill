-- =====================================================
-- Script 105: Auto-update Expired Subscriptions
-- =====================================================
-- Description: 
--   1. Actualiza automáticamente suscripciones con end_date pasada a status 'expired'
--   2. Mejora la verificación para considerar la fecha independientemente del status
--   3. Crea función para ejecutar manualmente o con cron
-- Date: 2026-02-02
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 1: FUNCIÓN PARA ACTUALIZAR SUSCRIPCIONES EXPIRADAS
-- =====================================================

CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_subscription RECORD;
  v_free_plan_id UUID;
  v_old_plan_name TEXT;
BEGIN
  -- Obtener el ID del plan gratuito
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;
  
  IF v_free_plan_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Plan gratuito no encontrado. Debe existir un plan con name = ''free'''
    );
  END IF;

  -- Buscar todas las suscripciones con end_date pasada pero status aún en 'active' o 'trial'
  FOR v_subscription IN
    SELECT 
      us.id,
      us.user_id,
      us.status,
      us.end_date,
      us.plan_id,
      sp.display_name as plan_name
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status IN ('active', 'trial')
    AND us.end_date IS NOT NULL
    AND us.end_date < NOW()
  LOOP
    v_old_plan_name := v_subscription.plan_name;
    
    -- Cambiar automáticamente al plan gratuito (no bloquear)
    UPDATE user_subscriptions
    SET 
      plan_id = v_free_plan_id,
      status = 'active', -- Mantener activo pero con plan gratuito
      end_date = NULL, -- Sin límite de tiempo para plan gratuito
      updated_at = NOW(),
      notes = COALESCE(notes || E'\n\n', '') || 
              '[' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI') || '] Plan anterior (' || 
              COALESCE(v_old_plan_name, 'Desconocido') || ') expiró. ' ||
              'Automáticamente cambiado a Plan Gratuito con acceso limitado. ' ||
              'Renueva tu suscripción para obtener más recursos.',
      -- Actualizar límites al plan gratuito
      current_max_users = (SELECT max_users FROM subscription_plans WHERE id = v_free_plan_id),
      current_max_invoices = (SELECT max_invoices FROM subscription_plans WHERE id = v_free_plan_id),
      current_max_products = (SELECT max_products FROM subscription_plans WHERE id = v_free_plan_id),
      current_max_clients = (SELECT max_clients FROM subscription_plans WHERE id = v_free_plan_id)
    WHERE id = v_subscription.id;
    
    v_updated_count := v_updated_count + 1;
    
    RAISE NOTICE 'Suscripción % cambiada de % a Plan Gratuito (vencía: %)', 
      v_subscription.id, v_old_plan_name, v_subscription.end_date;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', 'Se cambiaron ' || v_updated_count || ' suscripciones expiradas a Plan Gratuito'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_expired_subscriptions TO authenticated;

COMMENT ON FUNCTION update_expired_subscriptions IS 
  'Cambia automáticamente suscripciones expiradas al Plan Gratuito con acceso limitado. ' ||
  'Los usuarios pueden seguir usando el sistema pero con recursos limitados. ' ||
  'Ejecutar manualmente o configurar con cron job.';

-- =====================================================
-- PARTE 2: MEJORAR FUNCIÓN DE VERIFICACIÓN DE ACCESO
-- =====================================================

-- Reemplazar la función check_user_subscription_access para que SIEMPRE 
-- considere la fecha independientemente del status almacenado

CREATE OR REPLACE FUNCTION check_user_subscription_access(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  has_access BOOLEAN,
  subscription_status VARCHAR,
  plan_name VARCHAR,
  message VARCHAR,
  is_employee BOOLEAN,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_employee BOOLEAN;
  v_owner_id UUID;
  v_actual_status VARCHAR;
BEGIN
  -- Verificar si el usuario es super admin
  IF EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = p_user_id 
    AND is_super_admin = true
  ) THEN
    RETURN QUERY SELECT 
      true, 
      'super_admin'::VARCHAR, 
      'Super Admin'::VARCHAR, 
      'Acceso total como Super Admin'::VARCHAR,
      false,
      NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si es subscription manager
  IF EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = p_user_id 
    AND ur.name = 'subscription_manager'
    AND up.is_active = true
  ) THEN
    RETURN QUERY SELECT 
      true, 
      'subscription_manager'::VARCHAR, 
      'Subscription Manager'::VARCHAR, 
      'Acceso total como Gestor de Suscripciones'::VARCHAR,
      false,
      NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si es empleado
  SELECT is_employee(p_user_id) INTO v_is_employee;
  
  IF v_is_employee THEN
    -- Es empleado, obtener el owner
    SELECT get_employee_owner(p_user_id) INTO v_owner_id;
    
    -- Verificar la suscripción del OWNER, no la del empleado
    RETURN QUERY
    SELECT 
      CASE 
        -- VERIFICAR FECHA REAL, no solo status
        WHEN us.status IN ('active', 'trial') AND (us.end_date IS NULL OR us.end_date > NOW()) THEN true
        WHEN us.status = 'active' AND us.end_date IS NOT NULL AND us.end_date <= NOW() THEN false -- EXPIRADA REALMENTE
        ELSE false
      END as has_access,
      CASE
        -- Determinar el status REAL basado en la fecha
        WHEN us.status IN ('active', 'trial') AND us.end_date IS NOT NULL AND us.end_date <= NOW() THEN 'expired'
        ELSE COALESCE(us.status, 'inherited')
      END as subscription_status,
      COALESCE(sp.display_name, 'Plan del propietario') as plan_name,
      CASE
        WHEN us.status = 'active' AND (us.end_date IS NULL OR us.end_date > NOW()) THEN 'Acceso mediante suscripción del propietario (Activa)'
        WHEN us.status = 'trial' AND (us.end_date IS NULL OR us.end_date > NOW()) THEN 'Acceso mediante suscripción del propietario (Prueba)'
        WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN 'La suscripción del propietario ha expirado'
        WHEN us.status = 'cancelled' THEN 'La suscripción del propietario ha sido cancelada'
        ELSE 'El propietario no tiene suscripción activa'
      END as message,
      true as is_employee,
      v_owner_id
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = v_owner_id
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- Si el owner no tiene suscripción, el empleado tiene acceso con restricciones
    IF NOT FOUND THEN
      RETURN QUERY SELECT 
        true, -- Dar acceso de todos modos
        'no_owner_subscription'::VARCHAR,
        'Acceso Limitado'::VARCHAR,
        'Tu propietario no tiene una suscripción activa. Funcionalidad limitada.'::VARCHAR,
        true,
        v_owner_id;
    END IF;
    
    RETURN;
  END IF;

  -- NO es empleado, verificar suscripción propia (es owner)
  -- AQUÍ ES CRÍTICO: verificar la fecha REAL, no solo el status
  RETURN QUERY
  SELECT 
    CASE 
      -- Si la fecha ya pasó, NO tiene acceso, sin importar el status almacenado
      WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN false
      -- Si no hay fecha de vencimiento o aún no llega, verificar status
      WHEN us.status IN ('active', 'trial') AND (us.end_date IS NULL OR us.end_date > NOW()) THEN true
      ELSE false
    END as has_access,
    CASE
      -- Determinar el status REAL basado en la fecha
      WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN 'expired'
      ELSE COALESCE(us.status, 'none')
    END as subscription_status,
    COALESCE(sp.display_name, 'Sin plan') as plan_name,
    CASE
      WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN 
        'Suscripción expirada el ' || TO_CHAR(us.end_date, 'DD/MM/YYYY') || '. Por favor renueva tu plan.'
      WHEN us.status = 'active' AND (us.end_date IS NULL OR us.end_date > NOW()) THEN 'Suscripción activa'
      WHEN us.status = 'trial' AND (us.end_date IS NULL OR us.end_date > NOW()) THEN 'Período de prueba'
      WHEN us.status = 'cancelled' THEN 'Suscripción cancelada. Contacta soporte.'
      WHEN us.status = 'suspended' THEN 'Suscripción suspendida. Contacta soporte.'
      ELSE 'No tienes una suscripción activa. Contacta al administrador.'
    END as message,
    false as is_employee,
    NULL::UUID as owner_id
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Si no hay registro de suscripción para el owner
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'none'::VARCHAR,
      'Sin plan'::VARCHAR,
      'No tienes una suscripción activa. Contacta al administrador.'::VARCHAR,
      false,
      NULL::UUID;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_subscription_access TO authenticated;

-- =====================================================
-- PARTE 3: EJECUTAR ACTUALIZACIÓN INMEDIATA
-- =====================================================

-- Ejecutar la función para actualizar suscripciones expiradas AHORA
DO $$
DECLARE
  v_result JSON;
BEGIN
  SELECT update_expired_subscriptions() INTO v_result;
  RAISE NOTICE '🔄 Resultado de actualización inmediata: %', v_result;
END $$;

-- =====================================================
-- PARTE 4: MOSTRAR SUSCRIPCIONES AFECTADAS
-- =====================================================

SELECT 
  '=== SUSCRIPCIONES CON FECHAS PASADAS ===' as info,
  us.id,
  au.email,
  us.status as status_actual,
  us.end_date as fecha_vencimiento,
  CASE 
    WHEN us.end_date < NOW() THEN 'EXPIRADA ❌'
    ELSE 'VIGENTE ✅'
  END as estado_real,
  sp.display_name as plan
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.end_date IS NOT NULL
ORDER BY us.end_date ASC;

-- =====================================================
-- RESUMEN
-- =====================================================

SELECT 
  '=== RESUMEN DE CORRECCIONES ===' as info
UNION ALL
SELECT '✅ Función update_expired_subscriptions() creada'
UNION ALLCambia automáticamente a Plan Gratuito cuando end_date pasa'
UNION ALL
SELECT '   - NO bloquea completamente, permite acceso limitado'
UNION ALL
SELECT '   - Usuario puede seguir usando con funcionalidad básica'
UNION ALL
SELECT '   - Debe renovar para obtener más recursos'
UNION ALL
SELECT '   - Puede ejecutarse manualmente: SELECT update_expired_subscriptions();'
UNION ALL
SELECT '   - Registra en notas el cambio automático'
UNION ALL
SELECT ''
UNION ALL
SELECT '✅ Función check_user_subscription_access() mejorada'
UNION ALL
SELECT '   - SIEMPRE verifica la fecha real, no solo el status almacenado'
UNION ALL
SELECT '   - Permite acceso con plan gratuito después de expiración'
UNION ALL
SELECT '   - Empleados: NO bloqueados (heredan del owner)'
UNION ALL
SELECT ''
UNION ALL
SELECT '💰 COMPORTAMIENTO AL EXPIRAR:'
UNION ALL
SELECT '   - Plan Premium expira → Cambia a Plan Gratuito automáticamente'
UNION ALL
SELECT '   - Usuario mantiene acceso con límites básicos (1 usuario, límites reducidos)'
UNION ALL
SELECT '   - Se muestra mensaje para renovar y obtener más funcionalidad
SELECT '   - Empleados: NO bloqueados (heredan del owner)'
UNION ALL
SELECT ''
UNION ALL
SELECT '📋 PARA AUTOMATIZAR (ejecutar estos pasos):'
UNION ALL
SELECT '   1. Configurar cron job en Vercel/hosting para ejecutar:'
UNION ALL
SELECT '      POST /api/cron/update-expired-subscriptions'
UNION ALL
SELECT '   2. O ejecutar manualmente cada día:'
UNION ALL
SELECT '      SELECT update_expired_subscriptions();'
UNION ALL
SELECT ''
UNION ALL
SELECT '🔍 VERIFICAR AHORA:'
UNION ALL
SELECT '   Ver tabla arriba con suscripciones y su estado real';

COMMIT;
