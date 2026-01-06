-- ============================================================================
-- Script 68: Verificar y mostrar todas las suscripciones
-- Propósito: Ver el estado actual de todas las suscripciones
-- Fecha: 2026-01-06
-- ============================================================================

-- 1. Mostrar todos los owners (usuarios sin parent_user_id)
SELECT 
  '=== TODOS LOS OWNERS (USUARIOS PROPIETARIOS) ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  up.parent_user_id,
  up.is_active,
  CASE 
    WHEN us.id IS NULL THEN '❌ SIN SUSCRIPCIÓN'
    ELSE '✅ CON SUSCRIPCIÓN'
  END as subscription_status
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id
WHERE up.parent_user_id IS NULL
ORDER BY up.email;

-- 2. Mostrar todas las suscripciones con detalles del plan
SELECT 
  '=== TODAS LAS SUSCRIPCIONES ===' as info,
  us.id as subscription_id,
  up.email as user_email,
  us.plan_id,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date,
  CASE 
    WHEN sp.id IS NULL THEN '❌ PLAN NO EXISTE'
    ELSE '✅ PLAN VÁLIDO'
  END as plan_validity
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL OR up.parent_user_id IS NULL
ORDER BY up.email;

-- 3. Contar owners sin suscripción
SELECT 
  '=== RESUMEN ===' as info,
  (SELECT COUNT(*) FROM user_profiles WHERE parent_user_id IS NULL) as total_owners,
  (SELECT COUNT(*) FROM user_subscriptions us 
   JOIN user_profiles up ON us.user_id = up.user_id 
   WHERE up.parent_user_id IS NULL) as owners_with_subscription,
  (SELECT COUNT(*) FROM user_profiles up 
   WHERE up.parent_user_id IS NULL 
   AND NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = up.user_id)) as owners_without_subscription;

-- 4. Listar owners que NO tienen suscripción
SELECT 
  '=== OWNERS SIN SUSCRIPCIÓN ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  up.created_at
FROM user_profiles up
WHERE up.parent_user_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = up.user_id
)
ORDER BY up.created_at;
