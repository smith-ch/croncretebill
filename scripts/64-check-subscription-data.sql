-- ============================================================================
-- Script 64: Check Subscription Data
-- Propósito: Verificar el estado actual de suscripciones y planes
-- Fecha: 2026-01-05
-- ============================================================================

-- 1. Mostrar todos los planes disponibles
SELECT 
  '=== PLANES DISPONIBLES ===' as info,
  id as plan_id,
  name,
  display_name,
  price_monthly,
  price_yearly
FROM subscription_plans
ORDER BY price_monthly;

-- 2. Mostrar todas las suscripciones con sus plan_ids
SELECT 
  '=== SUSCRIPCIONES ACTUALES ===' as info,
  us.id as subscription_id,
  us.user_id,
  up.email as user_email,
  us.plan_id,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date,
  CASE 
    WHEN sp.id IS NULL THEN '❌ PLAN NO EXISTE'
    ELSE sp.display_name
  END as plan_status
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL -- Solo owners
ORDER BY us.created_at DESC;

-- 3. Contar suscripciones por estado de plan
SELECT 
  '=== RESUMEN ===' as info,
  COUNT(*) as total_subscriptions,
  COUNT(sp.id) as valid_plan_ids,
  COUNT(*) - COUNT(sp.id) as invalid_plan_ids
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN user_profiles up ON us.user_id = up.user_id
WHERE up.parent_user_id IS NULL;

-- 4. Mostrar plan_ids únicos que están siendo usados pero no existen
SELECT DISTINCT
  '=== PLAN IDS HUÉRFANOS (no existen en subscription_plans) ===' as info,
  us.plan_id as invalid_plan_id,
  COUNT(*) as num_subscriptions_affected
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN user_profiles up ON us.user_id = up.user_id
WHERE sp.id IS NULL
  AND up.parent_user_id IS NULL
GROUP BY us.plan_id;
