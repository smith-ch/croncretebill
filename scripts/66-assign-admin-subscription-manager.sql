-- ============================================================================
-- Script 66: Grant Subscription Manager Role to Admin
-- Propósito: Asignar rol de subscription_manager a smithrodriguez345@gmail.com
-- Fecha: 2026-01-05
-- ============================================================================

BEGIN;

-- 1. Verificar que el rol subscription_manager existe
DO $$
DECLARE
  manager_role_id UUID;
  admin_user_id UUID;
  admin_email VARCHAR := 'smithrodriguez345@gmail.com';
BEGIN
  -- Buscar el rol de subscription_manager
  SELECT id INTO manager_role_id
  FROM user_roles
  WHERE name = 'subscription_manager';

  IF manager_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol subscription_manager no encontrado';
  END IF;

  RAISE NOTICE 'Rol subscription_manager encontrado: %', manager_role_id;

  -- Buscar el usuario por email
  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % no encontrado', admin_email;
  END IF;

  RAISE NOTICE 'Usuario % encontrado: %', admin_email, admin_user_id;

  -- Verificar si ya tiene el rol
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = admin_user_id
    AND role_id = manager_role_id
  ) THEN
    RAISE NOTICE 'Usuario % YA tiene el rol de subscription_manager', admin_email;
  ELSE
    -- Asignar el rol
    UPDATE user_profiles
    SET role_id = manager_role_id,
        updated_at = NOW()
    WHERE user_id = admin_user_id;

    RAISE NOTICE '✅ Rol subscription_manager asignado exitosamente a %', admin_email;
  END IF;
END $$;

-- 2. Verificar el resultado
SELECT 
  '=== VERIFICACIÓN FINAL ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  ur.name as role_name,
  ur.description as role_description,
  up.is_active
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'smithrodriguez345@gmail.com';

-- 3. Mostrar todos los usuarios con rol subscription_manager
SELECT 
  '=== TODOS LOS SUBSCRIPTION MANAGERS ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  up.is_active
FROM user_profiles up
JOIN user_roles ur ON up.role_id = ur.id
WHERE ur.name = 'subscription_manager'
ORDER BY up.email;

COMMIT;

-- 4. Información sobre los permisos
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'PERMISOS DE SUBSCRIPTION_MANAGER:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Acceso total sin verificar suscripción';
  RAISE NOTICE '✅ Ver y gestionar TODAS las suscripciones';
  RAISE NOTICE '✅ Crear, editar y eliminar suscripciones';
  RAISE NOTICE '✅ Ver estadísticas globales';
  RAISE NOTICE '✅ Gestionar notificaciones de pago';
  RAISE NOTICE '✅ Acceso a todas las funciones RPC';
  RAISE NOTICE '✅ Ver y editar cualquier usuario';
  RAISE NOTICE '==========================================';
END $$;
