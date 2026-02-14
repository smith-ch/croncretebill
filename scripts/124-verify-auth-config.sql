-- ============================================================================
-- Script 124: Verificar configuración de Supabase Auth
-- ============================================================================

-- Ver si hay webhooks o configuración que pueda estar fallando
SELECT 
  '=== VERIFICAR auth.users ===' as info,
  count(*) as total_users,
  count(*) FILTER (WHERE encrypted_password IS NOT NULL) as with_password,
  count(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed,
  count(*) FILTER (WHERE banned_until IS NOT NULL) as banned
FROM auth.users;

-- Ver usuarios específicos
SELECT 
  '=== USUARIOS DE PRUEBA ===' as info,
  email,
  encrypted_password IS NOT NULL as has_pass,
  email_confirmed_at IS NOT NULL as confirmed,
  banned_until,
  deleted_at,
  created_at
FROM auth.users
WHERE email IN ('test1@gmail.com', 'smithrodriguez345@gmail.com')
ORDER BY email;

-- INTENTO: Confirmar email de test1 si no está confirmado
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'test1@gmail.com'
  AND email_confirmed_at IS NULL;

SELECT 
  '=== AFTER UPDATE ===' as info,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'test1@gmail.com';
