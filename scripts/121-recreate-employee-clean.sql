-- ============================================================================
-- Script 121: Eliminar y recrear empleado test1@gmail.com limpiamente
-- ============================================================================

BEGIN;

-- 1. Eliminar perfil de user_profiles
DELETE FROM user_profiles 
WHERE email = 'test1@gmail.com';

-- 2. Eliminar de auth.users
DELETE FROM auth.users 
WHERE email = 'test1@gmail.com';

-- 3. Recrear empleado limpio con create_employee_direct
SELECT create_employee_direct(
  'test1@gmail.com',              -- email
  '123456',                        -- password
  'Test Employee',                 -- display_name
  '7b0de0a2-9c08-4697-8f71-2cf6c2ea19d7', -- parent_user_id (tu owner ID)
  true,                            -- can_create_invoices
  false,                           -- can_view_finances
  true,                            -- can_manage_inventory
  true                             -- can_manage_clients
);

COMMIT;

-- Verificar que se creó correctamente
SELECT 
  '=== NUEVO EMPLEADO ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  up.parent_user_id,
  up.is_active,
  au.encrypted_password IS NOT NULL as has_password,
  au.email_confirmed_at IS NOT NULL as email_confirmed
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.email = 'test1@gmail.com';

-- Mensaje
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Empleado test1@gmail.com recreado limpiamente';
  RAISE NOTICE 'Email: test1@gmail.com';
  RAISE NOTICE 'Password: 123456';
  RAISE NOTICE 'INTENTA LOGIN AHORA';
  RAISE NOTICE '';
END $$;
