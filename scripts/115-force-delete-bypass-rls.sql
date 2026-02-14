-- =====================================================
-- Script 115: Force Delete Employee - Bypass RLS
-- =====================================================
-- Problema: No se puede eliminar el usuario desde Dashboard
-- por las RLS policies
--
-- Solución: Deshabilitar RLS temporalmente y eliminar
-- =====================================================

-- Deshabilitar RLS temporalmente en user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar TODOS los registros del empleado
DELETE FROM user_profiles
WHERE email = 'test1@gmail.com';

-- Eliminar de auth.users usando la API de administración
-- Primero obtener el user_id
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Obtener el user_id
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'test1@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Eliminar el usuario de auth
    DELETE FROM auth.users WHERE id = target_user_id;
    RAISE NOTICE 'Usuario eliminado: %', target_user_id;
  ELSE
    RAISE NOTICE 'Usuario no encontrado';
  END IF;
END $$;

-- Reactivar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Verificar eliminación
SELECT 
  (SELECT COUNT(*) FROM user_profiles WHERE email = 'test1@gmail.com') as profiles_count,
  (SELECT COUNT(*) FROM auth.users WHERE email = 'test1@gmail.com') as auth_count;

DO $$
BEGIN
  RAISE NOTICE '✅ Script 115 completado';
  RAISE NOTICE '   - Usuario test1@gmail.com eliminado completamente';
  RAISE NOTICE '   - Ahora puedes recrear el empleado desde la aplicación';
END $$;
