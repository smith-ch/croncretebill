-- ============================================================================
-- Script 81: Agregar rol subscription_manager al usuario
-- ============================================================================

-- Actualizar el metadata del usuario smithrodriguez345@gmail.com
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "subscription_manager"}'::jsonb
WHERE email = 'smithrodriguez345@gmail.com';

-- Verificar el cambio
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'smithrodriguez345@gmail.com';
