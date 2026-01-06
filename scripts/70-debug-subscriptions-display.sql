-- ============================================================================
-- Script 70: Debug - Ver qué está pasando con las suscripciones
-- Propósito: Diagnosticar por qué solo aparece un usuario en el gestor
-- Fecha: 2026-01-06
-- ============================================================================

-- 1. Ver TODOS los owners (usuarios principales)
SELECT 
  '=== TODOS LOS OWNERS ===' as info,
  user_id,
  email,
  display_name,
  parent_user_id,
  created_at
FROM user_profiles
WHERE parent_user_id IS NULL
ORDER BY email;

-- 2. Ver TODAS las suscripciones (sin filtros)
SELECT 
  '=== TODAS LAS SUSCRIPCIONES ===' as info,
  us.id as subscription_id,
  us.user_id,
  us.plan_id,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date,
  us.created_at
FROM user_subscriptions us
ORDER BY us.created_at DESC;

-- 3. Ver suscripciones CON información de usuario
SELECT 
  '=== SUSCRIPCIONES + USUARIOS ===' as info,
  up.email,
  up.display_name,
  up.parent_user_id,
  us.status as subscription_status,
  us.billing_cycle,
  sp.display_name as plan_name,
  us.start_date,
  us.end_date
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY up.email;

-- 4. Ver suscripciones SOLO de OWNERS (como lo hace el frontend)
SELECT 
  '=== SUSCRIPCIONES DE OWNERS ===' as info,
  up.email,
  up.display_name,
  sp.display_name as plan_name,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date,
  us.id as subscription_id,
  us.user_id,
  us.plan_id
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY up.email;

-- 5. Verificar si hay owners SIN suscripción
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
ORDER BY up.email;

-- 6. Resumen de conteo
SELECT 
  '=== RESUMEN ===' as info,
  (SELECT COUNT(*) FROM user_profiles WHERE parent_user_id IS NULL) as total_owners,
  (SELECT COUNT(*) FROM user_subscriptions) as total_subscriptions,
  (SELECT COUNT(DISTINCT us.user_id) 
   FROM user_subscriptions us 
   JOIN user_profiles up ON us.user_id = up.user_id 
   WHERE up.parent_user_id IS NULL) as owners_with_subscription,
  (SELECT COUNT(*) 
   FROM user_profiles up 
   WHERE up.parent_user_id IS NULL 
   AND NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = up.user_id)) as owners_without_subscription;

-- 7. Ver si hay suscripciones con plan_id inválido
SELECT 
  '=== SUSCRIPCIONES CON PLAN INVÁLIDO ===' as info,
  us.id as subscription_id,
  us.user_id,
  up.email,
  us.plan_id as invalid_plan_id,
  us.status
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans sp WHERE sp.id = us.plan_id
)
ORDER BY up.email;

-- 8. Ver los planes disponibles
SELECT 
  '=== PLANES DISPONIBLES ===' as info,
  id,
  name,
  display_name,
  price_monthly,
  price_yearly,
  is_active
FROM subscription_plans
ORDER BY 
  CASE name
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'professional' THEN 3
    WHEN 'business' THEN 4
    WHEN 'enterprise' THEN 5
    ELSE 6
  END;
