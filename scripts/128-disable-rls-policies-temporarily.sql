-- ============================================================================
-- Script 128: Deshabilitar políticas RLS temporalmente para diagnosticar
-- ============================================================================
-- El error 500 ocurre en /auth/v1/token durante el login
-- Esto sugiere que las políticas RLS están causando problemas
-- ============================================================================

BEGIN;

-- ========================================
-- 1. Ver políticas actuales en user_profiles
-- ========================================

SELECT 
  '=== POLÍTICAS RLS EN user_profiles ===' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ========================================
-- 2. Deshabilitar TODAS las políticas de user_profiles
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

-- ========================================
-- 3. Crear políticas SIMPLES sin recursión
-- ========================================

-- Permitir a usuarios autenticados leer su propio perfil
CREATE POLICY "simple_read_own_profile"
ON user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Permitir a usuarios autenticados actualizar su propio perfil
CREATE POLICY "simple_update_own_profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Permitir insertar perfiles (para creación de empleados)
CREATE POLICY "simple_insert_profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

COMMIT;

-- ========================================
-- 4. Verificación
-- ========================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';

  RAISE NOTICE '';
  RAISE NOTICE '=== POLÍTICAS RLS SIMPLIFICADAS ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas complejas eliminadas';
  RAISE NOTICE '✅ Políticas simples creadas: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🧪 INTENTA LOGIN AHORA:';
  RAISE NOTICE '   - Email: test0@gmail.com';
  RAISE NOTICE '   - Password: 123456';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Si funciona, el problema son las políticas RLS complejas';
  RAISE NOTICE '⚠️  Si sigue fallando, el problema es otra cosa';
  RAISE NOTICE '';
END $$;

-- ========================================
-- 5. Verificar políticas creadas
-- ========================================

SELECT 
  '=== NUEVAS POLÍTICAS ===' as info,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Permite leer'
    WHEN cmd = 'UPDATE' THEN 'Permite actualizar'
    WHEN cmd = 'INSERT' THEN 'Permite insertar'
    WHEN cmd = 'DELETE' THEN 'Permite eliminar'
  END as description
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
