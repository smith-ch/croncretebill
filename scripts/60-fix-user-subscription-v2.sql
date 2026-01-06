-- ============================================================================
-- Script 60: Fix User Subscription for smith_20r@hotmail.com
-- ============================================================================
-- Propósito: Verificar y arreglar la suscripción del usuario smith_20r@hotmail.com
-- Autor: Sistema
-- Fecha: 2026-01-05
-- Compatible con Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: VERIFICAR USUARIO Y SU SUSCRIPCIÓN ACTUAL
-- ============================================================================

-- Buscar usuario por email
SELECT 
  '=== USUARIO ===' AS seccion,
  au.id AS user_id,
  au.email,
  au.created_at AS user_created_at,
  up.display_name,
  up.parent_user_id,
  up.is_active AS profile_active
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'smith_20r@hotmail.com';

-- Ver suscripciones actuales del usuario
SELECT 
  '=== SUSCRIPCIONES ===' AS seccion,
  us.id AS subscription_id,
  us.user_id,
  us.plan_id,
  sp.name AS plan_name,
  sp.display_name AS plan_display_name,
  us.status,
  us.start_date,
  us.end_date,
  us.created_at
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = (
  SELECT id FROM auth.users WHERE email = 'smith_20r@hotmail.com'
);

-- Ver solicitudes de suscripción
SELECT 
  '=== SOLICITUDES ===' AS seccion,
  sr.id AS request_id,
  sr.user_id,
  sr.plan_id,
  sp.name AS plan_name,
  sp.display_name AS plan_display_name,
  sr.status,
  sr.created_at
FROM subscription_requests sr
LEFT JOIN subscription_plans sp ON sr.plan_id = sp.id
WHERE sr.user_id = (
  SELECT id FROM auth.users WHERE email = 'smith_20r@hotmail.com'
);

-- ============================================================================
-- SECCIÓN 2: VERIFICAR PLAN GRATUITO DISPONIBLE
-- ============================================================================

SELECT 
  '=== PLAN GRATUITO ===' AS seccion,
  id,
  name,
  display_name,
  price_monthly,
  price_yearly,
  max_invoices,
  max_users,
  is_active
FROM subscription_plans
WHERE name = 'free' OR name = 'gratuito'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- SECCIÓN 3: CREAR SUSCRIPCIÓN GRATUITA SI NO EXISTE (COMENTADO)
-- ============================================================================
-- Para crear la suscripción gratuita, descomenta el bloque DO siguiente:

/*
DO $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_existing_subscription UUID;
BEGIN
  -- Obtener user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'smith_20r@hotmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: smith_20r@hotmail.com';
  END IF;

  -- Obtener plan_id del plan gratuito
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name IN ('free', 'gratuito')
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan gratuito no encontrado. Ejecuta el script 59 primero.';
  END IF;

  -- Verificar si ya tiene suscripción activa
  SELECT id INTO v_existing_subscription
  FROM user_subscriptions
  WHERE user_id = v_user_id
    AND status = 'active';

  IF v_existing_subscription IS NOT NULL THEN
    RAISE NOTICE '✅ El usuario ya tiene una suscripción activa: %', v_existing_subscription;
  ELSE
    -- Crear suscripción gratuita activa
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      start_date,
      current_max_users,
      current_max_invoices,
      current_max_products,
      current_max_clients,
      current_max_employees
    ) VALUES (
      v_user_id,
      v_plan_id,
      'active',
      NOW(),
      1,  -- max_users para plan gratuito
      5,  -- max_invoices para plan gratuito
      10, -- max_products para plan gratuito
      5,  -- max_clients para plan gratuito
      0   -- max_employees para plan gratuito (0 = sin empleados)
    );

    RAISE NOTICE '✅ Suscripción gratuita creada exitosamente para: smith_20r@hotmail.com';
  END IF;
END $$;
*/

-- ============================================================================
-- SECCIÓN 4: VERIFICAR RESULTADO FINAL (DESCOMENTAR DESPUÉS DE SECCIÓN 3)
-- ============================================================================

/*
SELECT 
  '=== RESULTADO FINAL ===' AS seccion,
  au.email,
  us.status AS subscription_status,
  sp.display_name AS plan_name,
  us.start_date,
  us.end_date,
  us.current_max_invoices,
  us.current_max_users
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE au.email = 'smith_20r@hotmail.com'
  AND us.status = 'active';
*/

-- ============================================================================
-- SIGUIENTE PASO:
-- 1. Ejecuta este script para ver el estado actual del usuario
-- 2. Si no tiene suscripción activa, descomenta la SECCIÓN 3
-- 3. Vuelve a ejecutar el script para crear la suscripción
-- 4. Descomenta la SECCIÓN 4 y ejecuta de nuevo para verificar
-- ============================================================================
