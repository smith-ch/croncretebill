-- ============================================================================
-- Script 75: Arreglar políticas RLS para subscription managers
-- ============================================================================

-- 1. Ver políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions';

-- 2. Eliminar políticas restrictivas y crear nuevas
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "subscription_select_policy" ON user_subscriptions;

-- 3. Crear política que permita a subscription managers ver TODAS las suscripciones
CREATE POLICY "subscription_managers_can_view_all"
ON user_subscriptions
FOR SELECT
TO authenticated
USING (
  -- Super admins pueden ver todo
  is_super_admin(auth.uid())
  OR
  -- Subscription managers pueden ver todo
  is_subscription_manager(auth.uid())
  OR
  -- Usuarios pueden ver sus propias suscripciones
  user_id = auth.uid()
);

-- 4. Crear política para INSERT (solo managers y admins)
CREATE POLICY "managers_can_insert_subscriptions"
ON user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

-- 5. Crear política para UPDATE (solo managers y admins)
CREATE POLICY "managers_can_update_subscriptions"
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

-- 6. Crear política para DELETE (solo super admins)
CREATE POLICY "admins_can_delete_subscriptions"
ON user_subscriptions
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
);

-- 7. Verificar que RLS esté habilitado
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 8. Verificar políticas finales
SELECT 
  '=== POLÍTICAS ACTUALIZADAS ===' as info,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Con restricciones'
    ELSE 'Sin restricciones'
  END as has_restrictions
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY cmd, policyname;

-- 9. Test: verificar cuántas suscripciones puede ver el usuario actual
SELECT 
  '=== TEST DE VISIBILIDAD ===' as info,
  COUNT(*) as suscripciones_visibles
FROM user_subscriptions;
