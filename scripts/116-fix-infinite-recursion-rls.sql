-- ============================================================================
-- Script 116: Fix infinite recursion in user_profiles RLS policies
-- Error: "infinite recursion detected in policy for relation user_profiles"
-- Root cause: Policy checking root_owner_id creates circular reference
-- ============================================================================

BEGIN;

-- ========================================
-- PASO 1: Eliminar políticas problemáticas
-- ========================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can view employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can read employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can update employee profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can create employee profiles" ON user_profiles;

-- ========================================
-- PASO 2: Crear políticas seguras sin recursión
-- ========================================

-- Política para ver propio perfil (sin recursión)
CREATE POLICY "user_profiles_select_own"
ON user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Política para ver perfiles de empleados (sin usar root_owner_id para evitar recursión)
CREATE POLICY "user_profiles_select_employees"
ON user_profiles
FOR SELECT
USING (auth.uid() = parent_user_id);

-- Política para actualizar perfiles de empleados
CREATE POLICY "user_profiles_update_employees"
ON user_profiles
FOR UPDATE
USING (auth.uid() = parent_user_id);

-- Política para crear perfiles de empleados
CREATE POLICY "user_profiles_insert_employees"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = parent_user_id);

-- ========================================
-- PASO 3: Asegurar RLS está habilitado
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ========================================
-- VERIFICACIÓN
-- ========================================

SELECT 
  '=== POLÍTICAS DE USER_PROFILES ===' as info,
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

SELECT 
  '=== PRUEBA: Consultando user_profiles ===' as info;

-- Test query (debe funcionar sin error de recursión)
SELECT 
  user_id,
  email,
  display_name,
  parent_user_id,
  is_active
FROM user_profiles
LIMIT 5;
