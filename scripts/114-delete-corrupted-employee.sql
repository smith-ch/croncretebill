-- =====================================================
-- Script 114: Delete and Reset Employee User
-- =====================================================
-- Solución directa: Eliminar completamente el usuario
-- corrupto test1@gmail.com para poder recrearlo limpiamente
-- =====================================================

-- Ver el usuario actual
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'test1@gmail.com';

-- Eliminar TODOS los perfiles de este user_id
DELETE FROM user_profiles
WHERE email = 'test1@gmail.com';

-- Nota: Para eliminar de auth.users necesitas usar Supabase Dashboard
-- Ve a Authentication > Users > Busca test1@gmail.com > Delete User

-- O usa esta query si tienes acceso directo:
-- DELETE FROM auth.users WHERE email = 'test1@gmail.com';

-- Verificar que fue eliminado
SELECT COUNT(*) as remaining_profiles
FROM user_profiles
WHERE email = 'test1@gmail.com';

SELECT COUNT(*) as remaining_auth_users
FROM auth.users
WHERE email = 'test1@gmail.com';

DO $$
BEGIN
  RAISE NOTICE '✅ Script 114 completado';
  RAISE NOTICE '   - Perfiles eliminados de user_profiles';
  RAISE NOTICE '   - Ahora elimina el usuario de auth.users en Dashboard';
  RAISE NOTICE '   - Después podrás recrear el empleado limpiamente';
END $$;
