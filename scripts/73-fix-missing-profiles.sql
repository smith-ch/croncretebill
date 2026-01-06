-- ============================================================================
-- Script 73: Arreglar perfiles faltantes para suscripciones
-- Propósito: Crear perfiles para todos los user_id en suscripciones que no tienen perfil
-- Fecha: 2026-01-06
-- ============================================================================

-- 1. Ver qué user_id en suscripciones NO tienen perfil
SELECT 
  '=== USER_ID SIN PERFIL ===' as info,
  us.user_id,
  us.status,
  sp.display_name as plan_name,
  au.email as auth_email
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN auth.users au ON us.user_id = au.id
WHERE up.user_id IS NULL
ORDER BY us.created_at;

-- 2. Crear perfiles para TODOS los user_id en suscripciones que no tienen perfil
INSERT INTO user_profiles (
  user_id, 
  email, 
  display_name, 
  parent_user_id,
  is_active,
  created_at,
  updated_at
)
SELECT DISTINCT
  us.user_id,
  COALESCE(au.email, au.raw_user_meta_data->>'email', 'user_' || LEFT(us.user_id::text, 8) || '@nomail.com'),
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email,
    'Usuario ' || LEFT(us.user_id::text, 8)
  ),
  NULL::UUID, -- parent_user_id NULL = es un owner, no empleado
  true,
  COALESCE(us.created_at, NOW()),
  NOW()
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN auth.users au ON us.user_id = au.id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE
SET 
  email = COALESCE(EXCLUDED.email, user_profiles.email),
  display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
  parent_user_id = NULL::UUID, -- Asegurar que sean owners
  is_active = true,
  updated_at = NOW();

-- 3. Actualizar perfiles existentes que tienen parent_user_id pero tienen suscripción
-- (Un usuario con suscripción debe ser owner, no empleado)
UPDATE user_profiles up
SET 
  parent_user_id = NULL::UUID,
  updated_at = NOW()
FROM user_subscriptions us
WHERE up.user_id = us.user_id
AND up.parent_user_id IS NOT NULL;

-- 4. Actualizar emails faltantes en perfiles existentes
UPDATE user_profiles up
SET 
  email = COALESCE(
    au.email,
    au.raw_user_meta_data->>'email',
    'user_' || LEFT(up.user_id::text, 8) || '@nomail.com'
  ),
  display_name = COALESCE(
    up.display_name,
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email,
    'Usuario ' || LEFT(up.user_id::text, 8)
  ),
  updated_at = NOW()
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '' OR up.email LIKE 'user_%@nomail.com');

-- 5. Verificar resultado
SELECT 
  '=== RESUMEN DESPUÉS DE SINCRONIZACIÓN ===' as info,
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT us.user_id) as unique_users_with_subs,
  SUM(CASE WHEN up.user_id IS NOT NULL THEN 1 ELSE 0 END) as subs_with_profile,
  SUM(CASE WHEN up.user_id IS NULL THEN 1 ELSE 0 END) as subs_without_profile,
  SUM(CASE WHEN up.parent_user_id IS NULL THEN 1 ELSE 0 END) as subs_of_owners,
  SUM(CASE WHEN up.parent_user_id IS NOT NULL THEN 1 ELSE 0 END) as subs_of_employees
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id;

-- 6. Ver todas las suscripciones de owners ahora
SELECT 
  '=== TODAS LAS SUSCRIPCIONES DE OWNERS ===' as info,
  up.email,
  up.display_name,
  sp.display_name as plan_name,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY up.email;

-- 7. Contar owners con suscripción
SELECT 
  '=== CONTEO FINAL ===' as info,
  COUNT(*) as total_owners_with_subscription
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
WHERE up.parent_user_id IS NULL;
