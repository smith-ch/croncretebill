-- ============================================================================
-- Script: FIX-MISSING-EMAIL-IN-USER-PROFILES.sql
-- Propósito: Corregir el trigger para que incluya el email al crear perfiles
--            Y actualizar perfiles existentes que no tienen email
-- Fecha: 2026-01-09
-- ============================================================================

-- PASO 1: Actualizar el trigger para que incluya el email al crear nuevos perfiles
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    owner_role_id UUID;
BEGIN
    -- Obtener ID del rol de propietario
    SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner';
    
    -- Crear perfil de propietario para nuevo usuario CON EMAIL
    INSERT INTO public.user_profiles (
        user_id,
        role_id,
        email,  -- ← ESTE ES EL CAMPO QUE FALTABA
        display_name,
        can_create_invoices,
        can_view_finances,
        can_manage_inventory,
        can_manage_clients,
        can_manage_users,
        can_view_reports,
        allowed_modules
    ) VALUES (
        NEW.id,
        owner_role_id,
        NEW.email,  -- ← GUARDAR EL EMAIL DEL AUTH.USERS
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        true,
        true,
        true,
        true,
        true,
        true,
        '["all"]'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 2: Actualizar perfiles existentes que no tienen email
-- ============================================================================
UPDATE user_profiles up
SET 
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '' OR up.email = 'unknown');

-- PASO 3: Crear perfiles faltantes para usuarios que existen en auth.users
-- ============================================================================
INSERT INTO user_profiles (
  user_id, 
  role_id,
  email, 
  display_name,
  can_create_invoices,
  can_view_finances,
  can_manage_inventory,
  can_manage_clients,
  can_manage_users,
  can_view_reports,
  allowed_modules,
  parent_user_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  (SELECT id FROM public.user_roles WHERE name = 'owner'),
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  true,
  true,
  true,
  true,
  true,
  true,
  '["all"]'::jsonb,
  NULL,
  true,
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = au.id
)
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- PASO 4: Verificar el resultado
-- ============================================================================
SELECT 
  '=== VERIFICACIÓN DE PERFILES ===' as info,
  COUNT(*) as total_profiles,
  SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) as sin_email,
  SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as con_email,
  SUM(CASE WHEN parent_user_id IS NULL THEN 1 ELSE 0 END) as owners,
  SUM(CASE WHEN parent_user_id IS NOT NULL THEN 1 ELSE 0 END) as empleados
FROM user_profiles;

-- Ver algunos perfiles de ejemplo
SELECT 
  '=== EJEMPLOS DE PERFILES ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  CASE WHEN up.parent_user_id IS NULL THEN 'Owner' ELSE 'Empleado' END as tipo,
  up.is_active,
  up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 10;

-- Ver usuarios sin perfil (no deberían existir después de este script)
SELECT 
  '=== USUARIOS SIN PERFIL (DEBEN SER 0) ===' as info,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;
