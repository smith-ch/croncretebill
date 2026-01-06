-- ============================================================================
-- Script 86: Asignar rol subscription_manager al usuario
-- ============================================================================

-- Actualizar el role_id en user_profiles
UPDATE user_profiles
SET role_id = 'd5cb3c9a-23c2-456e-a16e-9de93a61bde7'
WHERE email = 'smithrodriguez345@gmail.com';

-- Verificar el cambio
SELECT 
  up.user_id,
  up.email,
  up.role_id,
  ur.name as role_name,
  ur.display_name
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'smithrodriguez345@gmail.com';
