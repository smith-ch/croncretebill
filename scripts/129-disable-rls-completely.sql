-- ============================================================================
-- Script 129: Deshabilitar RLS COMPLETAMENTE para diagnosticar error 500
-- ============================================================================
-- SOLO PARA TESTING - Este script desactiva Row Level Security
-- Si el login funciona sin RLS, sabemos que el problema son las políticas
-- ============================================================================

BEGIN;

-- ========================================
-- 1. Deshabilitar RLS en user_profiles
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. Eliminar todas las políticas de user_profiles
-- ========================================

DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_employees" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_employees" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_employees" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can view employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can read employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can update employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can create employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "simple_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "simple_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "simple_insert_profile" ON user_profiles;

COMMIT;

-- ========================================
-- 3. Verificación
-- ========================================

DO $$
DECLARE
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  -- Verificar estado de RLS
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

  -- Contar políticas restantes
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';

  RAISE NOTICE '';
  RAISE NOTICE '=== RLS COMPLETAMENTE DESHABILITADO ===';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RLS Activo: %', CASE WHEN v_rls_enabled THEN 'SÍ (ERROR!)' ELSE 'NO ✓' END;
  RAISE NOTICE '⚠️  Políticas restantes: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🧪 INTENTA LOGIN AHORA CON:';
  RAISE NOTICE '   Email: test0@gmail.com';
  RAISE NOTICE '   Password: 123456';
  RAISE NOTICE '';
  RAISE NOTICE '📋 DIAGNÓSTICO:';
  RAISE NOTICE '   ✅ Si funciona = problema son políticas RLS';
  RAISE NOTICE '   ❌ Si falla = problema es trigger/hook/función';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Reactivar RLS después de la prueba';
  RAISE NOTICE '';
END $$;

-- Mostrar estado de RLS en todas las tablas
SELECT 
  '=== ESTADO RLS TABLAS ===' as info,
  tablename,
  CASE WHEN rowsecurity THEN '🔒 Activado' ELSE '🔓 Desactivado' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
