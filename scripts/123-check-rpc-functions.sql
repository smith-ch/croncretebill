-- ============================================================================
-- Script 123: Desactivar funciones RPC problemáticas temporalmente
-- ============================================================================

-- Ver qué funciones RPC existen
SELECT 
  '=== FUNCIONES RPC ===' as info,
  proname as function_name,
  pronargs as num_args,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN (
  'get_user_permissions_simple',
  'is_subscription_manager',
  'is_super_admin',
  'get_effective_subscription',
  'get_subscription_usage'
)
ORDER BY proname;

-- Si alguna de estas funciones está causando problemas,
-- podemos deshabilitarlas temporalmente
-- (NO ejecutar esto aún, solo para referencia)

/*
DROP FUNCTION IF EXISTS get_user_permissions_simple(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_subscription_manager(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
*/
