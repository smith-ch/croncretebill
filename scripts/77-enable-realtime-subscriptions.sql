-- ============================================================================
-- Script 77: Enable Realtime for User Subscriptions
-- Propósito: Habilitar actualizaciones en tiempo real para la tabla user_subscriptions
--            para que los clientes vean cambios instantáneos cuando el admin actualiza
-- Fecha: 2026-01-06
-- ============================================================================

BEGIN;

-- 1. Remover la tabla si ya existe en la publicación (para idempotencia)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS user_subscriptions;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Habilitar Realtime en la tabla user_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;

-- 3. Verificar que Realtime está habilitado
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime habilitado para la tabla user_subscriptions';
  RAISE NOTICE '📡 Los clientes recibirán actualizaciones instantáneas cuando:';
  RAISE NOTICE '   - Se actualice el estado de su suscripción';
  RAISE NOTICE '   - Se cambie la fecha de vencimiento';
  RAISE NOTICE '   - Se modifiquen los límites de su plan';
  RAISE NOTICE '   - Se actualice cualquier campo de su suscripción';
END $$;

COMMIT;

-- Notas de implementación:
-- ======================
-- 1. Este script habilita las actualizaciones en tiempo real usando Supabase Realtime
-- 2. Los hooks del frontend (use-subscription-limits, use-plan-access) ya están 
--    configurados para escuchar estos cambios
-- 3. La página my-subscription también se actualizará automáticamente
-- 4. No se requiere recargar la página para ver los cambios
-- 5. Los cambios se propagarán instantáneamente a todos los clientes conectados
