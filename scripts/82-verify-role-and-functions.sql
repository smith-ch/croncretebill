-- Verificar si el rol se guardó correctamente
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'role' as role_value,
  raw_app_meta_data
FROM auth.users
WHERE email = 'smithrodriguez345@gmail.com';

-- Verificar cómo están implementadas las funciones helper
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'is_subscription_manager';

SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'is_super_admin';
