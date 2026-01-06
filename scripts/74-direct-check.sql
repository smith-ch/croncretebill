-- ============================================================================
-- Script 74: Verificación directa de suscripciones
-- ============================================================================

-- Ver TODAS las suscripciones con su información de usuario
SELECT 
  '=== TODAS LAS SUSCRIPCIONES + INFO ===' as info,
  us.user_id,
  au.email as auth_email,
  up.email as profile_email,
  up.parent_user_id,
  us.status as sub_status,
  sp.display_name as plan_name,
  CASE 
    WHEN up.user_id IS NULL THEN 'SIN PERFIL'
    WHEN up.parent_user_id IS NOT NULL THEN 'ES EMPLEADO'
    ELSE 'ES OWNER'
  END as user_type
FROM user_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY 
  CASE 
    WHEN up.user_id IS NULL THEN 1
    WHEN up.parent_user_id IS NOT NULL THEN 2
    ELSE 3
  END,
  au.email;

-- Resumen
SELECT 
  '=== RESUMEN ===' as info,
  COUNT(*) as total_suscripciones,
  SUM(CASE WHEN up.user_id IS NULL THEN 1 ELSE 0 END) as sin_perfil,
  SUM(CASE WHEN up.parent_user_id IS NOT NULL THEN 1 ELSE 0 END) as empleados,
  SUM(CASE WHEN up.parent_user_id IS NULL AND up.user_id IS NOT NULL THEN 1 ELSE 0 END) as owners
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id;
