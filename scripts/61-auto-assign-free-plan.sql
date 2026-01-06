-- ============================================================================
-- Script 61: Auto-Assign Free Plan to Users Without Active Subscription
-- ============================================================================
-- Propósito: Asignar automáticamente plan gratuito a todos los usuarios sin suscripción activa
-- Autor: Sistema
-- Fecha: 2026-01-05
-- Compatible con Supabase SQL Editor
-- ============================================================================

-- Asignar plan gratuito automáticamente a usuarios sin suscripción activa
DO $$
DECLARE
  v_plan_id UUID;
  v_user_record RECORD;
  v_assigned_count INT := 0;
BEGIN
  -- 1. Obtener el plan gratuito
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name IN ('free', 'gratuito')
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan gratuito no encontrado. Ejecuta el script 59 primero.';
  END IF;

  RAISE NOTICE '✅ Plan gratuito encontrado: %', v_plan_id;

  -- 2. Iterar sobre todos los usuarios que NO tienen suscripción activa
  FOR v_user_record IN (
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id AND us.status = 'active'
    WHERE us.id IS NULL
      AND au.email IS NOT NULL
  )
  LOOP
    -- Verificar si ya tiene alguna suscripción (incluso inactiva)
    IF NOT EXISTS (
      SELECT 1 FROM user_subscriptions 
      WHERE user_id = v_user_record.id
    ) THEN
      -- No tiene ninguna suscripción, crear una nueva con plan gratuito
      INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        current_max_users,
        current_max_invoices,
        current_max_products,
        current_max_clients
      ) VALUES (
        v_user_record.id,
        v_plan_id,
        'active',
        NOW(),
        1,   -- max_users para plan gratuito
        5,   -- max_invoices para plan gratuito
        10,  -- max_products para plan gratuito
        5    -- max_clients para plan gratuito
      );
      
      v_assigned_count := v_assigned_count + 1;
      RAISE NOTICE '✅ Suscripción gratuita asignada a: % (ID: %)', v_user_record.email, v_user_record.id;
    ELSE
      -- Ya tiene suscripción pero está inactiva, actualizarla a activa con plan gratuito
      UPDATE user_subscriptions
      SET 
        plan_id = v_plan_id,
        status = 'active',
        start_date = NOW(),
        end_date = NULL,
        current_max_users = 1,
        current_max_invoices = 5,
        current_max_products = 10,
        current_max_clients = 5
      WHERE user_id = v_user_record.id
        AND status != 'active';
      
      IF FOUND THEN
        v_assigned_count := v_assigned_count + 1;
        RAISE NOTICE '✅ Suscripción actualizada a gratuita para: % (ID: %)', v_user_record.email, v_user_record.id;
      END IF;
    END IF;
  END LOOP;

  -- 3. Mostrar resumen
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '  RESUMEN DE ASIGNACIÓN';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ Total de usuarios con plan gratuito asignado: %', v_assigned_count;
  RAISE NOTICE '';
END $$;

-- Verificar resultados: Mostrar todos los usuarios con sus suscripciones
SELECT 
  '=== USUARIOS CON SUSCRIPCIONES ===' AS seccion,
  au.email,
  au.id AS user_id,
  us.status AS subscription_status,
  sp.display_name AS plan_name,
  us.start_date,
  us.current_max_invoices,
  us.current_max_users
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE au.email IS NOT NULL
ORDER BY us.status DESC NULLS LAST, au.email;
