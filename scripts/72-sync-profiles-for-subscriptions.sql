-- ============================================================================
-- Script 72: Sincronizar user_profiles con auth.users para suscripciones
-- Propósito: Crear/actualizar perfiles faltantes para usuarios con suscripción
-- Fecha: 2026-01-06
-- ============================================================================

-- Crear perfiles para usuarios en suscripciones que no tienen perfil
INSERT INTO user_profiles (user_id, email, display_name, parent_user_id, created_at)
SELECT 
  us.user_id,
  COALESCE(au.email, 'unknown_' || us.user_id::text || '@temp.com'),
  COALESCE(au.email, 'Usuario ' || SUBSTRING(us.user_id::text, 1, 8)),
  NULL, -- No es empleado
  NOW()
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = us.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Actualizar emails faltantes en perfiles existentes
UPDATE user_profiles up
SET 
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '');

-- Verificar resultado
SELECT 
  '=== PERFILES SINCRONIZADOS ===' as info,
  COUNT(*) as total_profiles,
  SUM(CASE WHEN parent_user_id IS NULL THEN 1 ELSE 0 END) as owners,
  SUM(CASE WHEN parent_user_id IS NOT NULL THEN 1 ELSE 0 END) as employees,
  SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) as sin_email
FROM user_profiles;

-- Ver owners con suscripción ahora
SELECT 
  '=== OWNERS CON SUSCRIPCIÓN DESPUÉS DE SYNC ===' as info,
  up.email,
  up.display_name,
  sp.display_name as plan_name,
  us.status,
  us.billing_cycle
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY up.email;
