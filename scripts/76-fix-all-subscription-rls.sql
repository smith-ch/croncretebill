-- ============================================================================
-- Script 76: Arreglar políticas RLS para todas las tablas de suscripciones
-- ============================================================================

-- PAYMENT NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_select_policy" ON payment_notifications;

CREATE POLICY "managers_can_view_all_payment_notifications"
ON payment_notifications
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
  OR
  user_id = auth.uid()
);

CREATE POLICY "managers_can_update_payment_notifications"
ON payment_notifications
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

CREATE POLICY "managers_can_insert_payment_notifications"
ON payment_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
  OR
  user_id = auth.uid()
);

ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION HISTORY
DROP POLICY IF EXISTS "subscription_history_select_policy" ON subscription_history;

CREATE POLICY "managers_can_view_all_subscription_history"
ON subscription_history
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

CREATE POLICY "managers_can_insert_subscription_history"
ON subscription_history
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION REQUESTS
DROP POLICY IF EXISTS "Users can view own requests" ON subscription_requests;
DROP POLICY IF EXISTS "subscription_requests_select_policy" ON subscription_requests;

CREATE POLICY "managers_can_view_all_subscription_requests"
ON subscription_requests
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
  OR
  user_id = auth.uid()
);

CREATE POLICY "managers_can_update_subscription_requests"
ON subscription_requests
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

CREATE POLICY "users_can_insert_subscription_requests"
ON subscription_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  is_super_admin(auth.uid())
  OR
  is_subscription_manager(auth.uid())
);

ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION PLANS (debe ser visible para todos)
DROP POLICY IF EXISTS "subscription_plans_select_policy" ON subscription_plans;

CREATE POLICY "everyone_can_view_subscription_plans"
ON subscription_plans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "managers_can_manage_subscription_plans"
ON subscription_plans
FOR ALL
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

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Verificación
SELECT 
  '=== POLÍTICAS PAYMENT NOTIFICATIONS ===' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'payment_notifications'
ORDER BY cmd;

SELECT 
  '=== POLÍTICAS SUBSCRIPTION HISTORY ===' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'subscription_history'
ORDER BY cmd;

SELECT 
  '=== POLÍTICAS SUBSCRIPTION REQUESTS ===' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'subscription_requests'
ORDER BY cmd;

-- Test de visibilidad
SELECT 
  '=== TEST VISIBILIDAD ===' as info,
  (SELECT COUNT(*) FROM payment_notifications) as total_payment_notifications,
  (SELECT COUNT(*) FROM subscription_history) as total_history,
  (SELECT COUNT(*) FROM subscription_requests) as total_requests,
  (SELECT COUNT(*) FROM user_subscriptions) as total_subscriptions;
