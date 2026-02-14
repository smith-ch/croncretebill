-- ============================================================================
-- Script 122: Verificar integridad del schema y políticas RLS
-- ============================================================================

-- Verificar si hay políticas que referencian tablas/columnas inexistentes
SELECT 
  '=== VERIFICAR POLÍTICAS RLS ===' as info,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename IN ('user_profiles', 'company_settings', 'invoices', 'clients')
ORDER BY tablename, policyname;

-- Verificar columnas de user_profiles
SELECT 
  '=== COLUMNAS DE USER_PROFILES ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Verificar funciones rotas
SELECT 
  '=== FUNCIONES CON ERRORES ===' as info,
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname IN ('get_user_permissions_simple', 'is_subscription_manager', 'is_super_admin')
ORDER BY proname;

-- Test simple de RLS
SET ROLE authenticated;
SET request.jwt.claim.sub = '7b0de0a2-9c08-4697-8f71-2cf6c2ea19d7';

SELECT 
  '=== TEST RLS USER_PROFILES ===' as info,
  COUNT(*) as visible_profiles
FROM user_profiles;

RESET ROLE;
