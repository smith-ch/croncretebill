-- ============================================================================
-- Script 135: Permitir que subscription_manager vea TODOS los user_profiles
-- ============================================================================
-- Problema: El gestor de suscripciones (smithrodriguez345@gmail.com) solo ve
--           su propio perfil y el de sus empleados, no todos los owners.
-- Solución: Agregar política RLS que permita a subscription_manager y
--           super_admin ver TODOS los perfiles de usuario.
-- ============================================================================

-- Eliminar política si ya existe (para poder re-ejecutar el script)
DROP POLICY IF EXISTS "subscription_managers_can_view_all_profiles" ON user_profiles;

-- Crear política: subscription_manager y super_admin pueden ver TODOS los perfiles
CREATE POLICY "subscription_managers_can_view_all_profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  is_subscription_manager(auth.uid())
  OR
  is_super_admin(auth.uid())
);

-- ============================================================================
-- Verificación
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Política creada: subscription_managers_can_view_all_profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'El gestor de suscripciones ahora puede ver:';
  RAISE NOTICE '  - Todos los owners (usuarios con parent_user_id NULL)';
  RAISE NOTICE '  - Todos los empleados (usuarios con parent_user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Recarga la página de Gestión de Suscripciones para ver el cambio.';
END $$;
