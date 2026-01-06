-- Test rápido de permisos
-- Ejecuta esto y comparte TODO el resultado

-- 1. Tu usuario actual
SELECT auth.uid() as my_id, auth.email() as my_email;

-- 2. Verificar metadata del usuario
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'smithrodriguez345@gmail.com';

-- 3. Verificar si las funciones existen
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin'
) as has_is_super_admin,
EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'is_subscription_manager'  
) as has_is_subscription_manager;

-- 4. Contar políticas
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'user_subscriptions';

-- 5. Intentar actualizar directamente (para ver el error exacto)
UPDATE user_subscriptions
SET end_date = '2026-02-17'
WHERE id = 'e8b48bca-e2f5-457e-bfaf-1e7d96d1073a'
RETURNING id, end_date;
