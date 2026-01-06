-- ============================================================================
-- Script 71: Verificar desajuste entre suscripciones y perfiles
-- Propósito: Encontrar suscripciones sin perfil o con perfil de empleado
-- Fecha: 2026-01-06
-- ============================================================================

-- 1. Suscripciones sin perfil correspondiente
SELECT 
  '=== SUSCRIPCIONES SIN PERFIL ===' as info,
  us.id as subscription_id,
  us.user_id,
  us.status,
  us.billing_cycle,
  sp.display_name as plan_name
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = us.user_id
);

-- 2. Suscripciones de empleados (tienen parent_user_id)
SELECT 
  '=== SUSCRIPCIONES DE EMPLEADOS ===' as info,
  up.email,
  up.display_name,
  up.parent_user_id,
  us.status as subscription_status,
  sp.display_name as plan_name
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NOT NULL;

-- 3. User IDs en suscripciones vs auth.users
SELECT 
  '=== VERIFICAR AUTH.USERS ===' as info,
  us.user_id,
  au.email as auth_email,
  up.email as profile_email,
  us.status,
  sp.display_name as plan_name
FROM user_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY au.email NULLS FIRST;

-- 4. Contar discrepancias
SELECT 
  '=== RESUMEN DE DISCREPANCIAS ===' as info,
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT us.user_id) as unique_users,
  SUM(CASE WHEN up.user_id IS NULL THEN 1 ELSE 0 END) as sin_perfil,
  SUM(CASE WHEN up.parent_user_id IS NOT NULL THEN 1 ELSE 0 END) as empleados,
  SUM(CASE WHEN up.parent_user_id IS NULL THEN 1 ELSE 0 END) as owners
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id;
