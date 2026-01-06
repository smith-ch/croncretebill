-- ============================================================================
-- Script 78: Arreglar políticas RLS para user_subscriptions
-- Propósito: Permitir que subscription_manager y super_admin puedan actualizar
--            todas las columnas de user_subscriptions incluyendo end_date
-- Fecha: 2026-01-06
-- ============================================================================

BEGIN;

-- Eliminar TODAS las políticas existentes de user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Subscription managers can view all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Subscription managers can manage all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "users_can_view_own_subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "managers_can_view_all_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "managers_can_insert_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "managers_can_update_all_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "managers_can_delete_subscriptions" ON user_subscriptions;

-- ============================================================================
-- POLÍTICAS PARA SELECT
-- ============================================================================

-- Usuarios pueden ver su propia suscripción
CREATE POLICY "users_can_view_own_subscription"
ON user_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Managers y super admins pueden ver todas las suscripciones
CREATE POLICY "managers_can_view_all_subscriptions"
ON user_subscriptions
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

-- ============================================================================
-- POLÍTICAS PARA INSERT
-- ============================================================================

-- Solo managers y super admins pueden crear suscripciones
CREATE POLICY "managers_can_insert_subscriptions"
ON user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

-- ============================================================================
-- POLÍTICAS PARA UPDATE
-- ============================================================================

-- Solo managers y super admins pueden actualizar suscripciones
CREATE POLICY "managers_can_update_all_subscriptions"
ON user_subscriptions
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

-- ============================================================================
-- POLÍTICAS PARA DELETE
-- ============================================================================

-- Solo managers y super admins pueden eliminar suscripciones
CREATE POLICY "managers_can_delete_subscriptions"
ON user_subscriptions
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

-- Asegurar que RLS está habilitado
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Mostrar políticas actuales
SELECT 
  '=== POLÍTICAS USER_SUBSCRIPTIONS ===' as info,
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY cmd, policyname;

-- Test rápido
DO $$
DECLARE
  v_user_id UUID;
  v_is_manager BOOLEAN;
BEGIN
  -- Obtener el usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay usuario autenticado para probar';
  ELSE
    -- Verificar si es manager
    SELECT is_subscription_manager(v_user_id) INTO v_is_manager;
    
    RAISE NOTICE '=== VERIFICACIÓN DE PERMISOS ===';
    RAISE NOTICE 'Usuario ID: %', v_user_id;
    RAISE NOTICE 'Es Subscription Manager: %', v_is_manager;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Políticas RLS actualizadas exitosamente';
    RAISE NOTICE '📝 Los subscription managers ahora pueden:';
    RAISE NOTICE '   - Ver todas las suscripciones';
    RAISE NOTICE '   - Crear nuevas suscripciones';
    RAISE NOTICE '   - Actualizar cualquier campo (incluyendo end_date)';
    RAISE NOTICE '   - Eliminar suscripciones';
  END IF;
END $$;
