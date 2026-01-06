-- ============================================================================
-- Script 83: Agregar subscription_manager a user_profiles
-- ============================================================================

-- Ver el registro actual
SELECT 
  user_id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'role' as role_from_metadata
FROM user_profiles
WHERE email = 'smithrodriguez345@gmail.com';

-- Agregar/actualizar el rol en raw_user_meta_data
UPDATE user_profiles
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "subscription_manager"}'::jsonb
WHERE email = 'smithrodriguez345@gmail.com';

-- Verificar el resultado
SELECT 
  user_id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'role' as role_from_metadata
FROM user_profiles
WHERE email = 'smithrodriguez345@gmail.com';
