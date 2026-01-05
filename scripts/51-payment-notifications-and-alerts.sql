-- Script 51: Sistema de Notificaciones de Pago y Alertas Automáticas
-- Permite a los usuarios notificar pagos y envía alertas cuando se acerca la fecha de expiración

-- ============================================================================
-- 1. TABLA PARA NOTIFICACIONES DE PAGO DE USUARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  
  -- Detalles del pago
  payment_note TEXT NOT NULL,
  payment_amount DECIMAL(10,2),
  payment_method VARCHAR(100),
  payment_reference VARCHAR(255),
  
  -- Estado de la notificación
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'processed', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user_id ON payment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_status ON payment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_created_at ON payment_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_subscription_id ON payment_notifications(subscription_id);

-- RLS
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "Users can view own payment notifications" ON payment_notifications;
CREATE POLICY "Users can view own payment notifications"
  ON payment_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Los usuarios pueden insertar sus propias notificaciones
DROP POLICY IF EXISTS "Users can insert own payment notifications" ON payment_notifications;
CREATE POLICY "Users can insert own payment notifications"
  ON payment_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Los subscription managers pueden ver todas las notificaciones
DROP POLICY IF EXISTS "Subscription managers can view all payment notifications" ON payment_notifications;
CREATE POLICY "Subscription managers can view all payment notifications"
  ON payment_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

-- Los subscription managers pueden actualizar notificaciones
DROP POLICY IF EXISTS "Subscription managers can update payment notifications" ON payment_notifications;
CREATE POLICY "Subscription managers can update payment notifications"
  ON payment_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

-- ============================================================================
-- 2. TABLA PARA ALERTAS DE EXPIRACIÓN (LOG DE NOTIFICACIONES ENVIADAS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_expiry_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  
  -- Información de la alerta
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('15_days', '7_days', '3_days', '1_day', 'expired')),
  days_until_expiry INTEGER NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Mensaje enviado
  message TEXT,
  notification_method VARCHAR(50) DEFAULT 'in_app', -- 'in_app', 'email', 'both'
  
  -- Estado
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_user_id ON subscription_expiry_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_subscription_id ON subscription_expiry_alerts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_type ON subscription_expiry_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_sent ON subscription_expiry_alerts(sent);

-- RLS
ALTER TABLE subscription_expiry_alerts ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias alertas
DROP POLICY IF EXISTS "Users can view own expiry alerts" ON subscription_expiry_alerts;
CREATE POLICY "Users can view own expiry alerts"
  ON subscription_expiry_alerts FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. FUNCIÓN PARA PROCESAR NOTIFICACIÓN DE PAGO
-- ============================================================================
CREATE OR REPLACE FUNCTION process_payment_notification(
  p_notification_id UUID,
  p_action VARCHAR(50), -- 'approve', 'reject'
  p_admin_notes TEXT DEFAULT NULL,
  p_extend_months INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_notification RECORD;
  v_subscription_id UUID;
  v_new_end_date TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- Verificar que el usuario actual es subscription_manager
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = auth.uid()
    AND ur.name = 'subscription_manager'
    AND up.is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No tienes permisos para procesar notificaciones de pago'
    );
  END IF;

  -- Obtener la notificación
  SELECT * INTO v_notification
  FROM payment_notifications
  WHERE id = p_notification_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Notificación no encontrada'
    );
  END IF;

  IF p_action = 'approve' THEN
    -- Extender la suscripción
    IF v_notification.subscription_id IS NOT NULL THEN
      -- Calcular nueva fecha de expiración
      SELECT 
        CASE 
          WHEN end_date IS NULL OR end_date < NOW() THEN NOW() + (p_extend_months || ' months')::INTERVAL
          ELSE end_date + (p_extend_months || ' months')::INTERVAL
        END
      INTO v_new_end_date
      FROM user_subscriptions
      WHERE id = v_notification.subscription_id;

      -- Actualizar suscripción
      UPDATE user_subscriptions
      SET 
        end_date = v_new_end_date,
        status = 'active',
        notes = COALESCE(notes || E'\n\n', '') || 
                '[' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI') || '] Extendida por ' || p_extend_months || ' mes(es) - Pago procesado',
        updated_at = NOW()
      WHERE id = v_notification.subscription_id;

      v_subscription_id := v_notification.subscription_id;
    END IF;

    -- Actualizar notificación
    UPDATE payment_notifications
    SET 
      status = 'processed',
      admin_notes = p_admin_notes,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_notification_id;

    v_result := json_build_object(
      'success', true,
      'message', 'Pago procesado y suscripción extendida por ' || p_extend_months || ' mes(es)',
      'subscription_id', v_subscription_id,
      'new_end_date', v_new_end_date
    );

  ELSIF p_action = 'reject' THEN
    -- Rechazar la notificación
    UPDATE payment_notifications
    SET 
      status = 'rejected',
      admin_notes = p_admin_notes,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_notification_id;

    v_result := json_build_object(
      'success', true,
      'message', 'Notificación rechazada'
    );

  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Acción no válida: ' || p_action
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_payment_notification(UUID, VARCHAR, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- 4. FUNCIÓN PARA GENERAR ALERTAS DE EXPIRACIÓN
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_expiry_alerts()
RETURNS JSON AS $$
DECLARE
  v_subscription RECORD;
  v_days_until_expiry INTEGER;
  v_alert_type VARCHAR(50);
  v_message TEXT;
  v_alerts_created INTEGER := 0;
BEGIN
  -- Iterar sobre todas las suscripciones activas con fecha de expiración
  FOR v_subscription IN 
    SELECT 
      id,
      user_id,
      end_date,
      status
    FROM user_subscriptions
    WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date > NOW()
  LOOP
    -- Calcular días hasta expiración
    v_days_until_expiry := EXTRACT(DAY FROM (v_subscription.end_date - NOW()))::INTEGER;

    -- Determinar tipo de alerta
    v_alert_type := NULL;
    IF v_days_until_expiry <= 1 THEN
      v_alert_type := '1_day';
      v_message := '⚠️ ¡URGENTE! Tu suscripción expira mañana. Renueva ahora para evitar interrupciones.';
    ELSIF v_days_until_expiry <= 3 THEN
      v_alert_type := '3_days';
      v_message := '⚠️ Tu suscripción expira en ' || v_days_until_expiry || ' días. Considera renovar pronto.';
    ELSIF v_days_until_expiry <= 7 THEN
      v_alert_type := '7_days';
      v_message := 'Tu suscripción expira en ' || v_days_until_expiry || ' días. Planifica tu renovación.';
    ELSIF v_days_until_expiry <= 15 THEN
      v_alert_type := '15_days';
      v_message := 'Tu suscripción expira en ' || v_days_until_expiry || ' días.';
    END IF;

    -- Si hay alerta y no se ha enviado antes para este tipo
    IF v_alert_type IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM subscription_expiry_alerts
        WHERE user_id = v_subscription.user_id
        AND subscription_id = v_subscription.id
        AND alert_type = v_alert_type
        AND sent = true
        AND created_at > NOW() - INTERVAL '30 days' -- No enviar duplicados en el mismo mes
      ) THEN
        -- Crear alerta
        INSERT INTO subscription_expiry_alerts (
          user_id,
          subscription_id,
          alert_type,
          days_until_expiry,
          end_date,
          message,
          notification_method,
          sent,
          sent_at
        ) VALUES (
          v_subscription.user_id,
          v_subscription.id,
          v_alert_type,
          v_days_until_expiry,
          v_subscription.end_date,
          v_message,
          'in_app',
          true,
          NOW()
        );

        v_alerts_created := v_alerts_created + 1;
      END IF;
    END IF;
  END LOOP;

  -- Generar alertas para suscripciones ya expiradas
  FOR v_subscription IN 
    SELECT 
      id,
      user_id,
      end_date
    FROM user_subscriptions
    WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date <= NOW()
  LOOP
    -- Marcar como expirada
    UPDATE user_subscriptions
    SET status = 'expired'
    WHERE id = v_subscription.id;

    -- Crear alerta de expiración
    IF NOT EXISTS (
      SELECT 1 FROM subscription_expiry_alerts
      WHERE user_id = v_subscription.user_id
      AND subscription_id = v_subscription.id
      AND alert_type = 'expired'
      AND created_at > v_subscription.end_date
    ) THEN
      INSERT INTO subscription_expiry_alerts (
        user_id,
        subscription_id,
        alert_type,
        days_until_expiry,
        end_date,
        message,
        notification_method,
        sent,
        sent_at
      ) VALUES (
        v_subscription.user_id,
        v_subscription.id,
        'expired',
        0,
        v_subscription.end_date,
        '❌ Tu suscripción ha expirado. Renueva para continuar usando el servicio.',
        'in_app',
        true,
        NOW()
      );

      v_alerts_created := v_alerts_created + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'alerts_created', v_alerts_created,
    'message', 'Se generaron ' || v_alerts_created || ' nuevas alertas'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_expiry_alerts() TO authenticated;

-- ============================================================================
-- 5. TRIGGER PARA AUTO-ACTUALIZAR TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION update_payment_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_notifications_timestamp ON payment_notifications;
CREATE TRIGGER update_payment_notifications_timestamp
  BEFORE UPDATE ON payment_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_notification_updated_at();

-- ============================================================================
-- 6. FUNCIÓN PARA OBTENER ALERTAS NO LEÍDAS DEL USUARIO
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_unread_alerts(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_alerts JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'alert_type', alert_type,
      'days_until_expiry', days_until_expiry,
      'end_date', end_date,
      'message', message,
      'created_at', created_at
    )
    ORDER BY created_at DESC
  ) INTO v_alerts
  FROM subscription_expiry_alerts
  WHERE user_id = p_user_id
  AND sent = true
  AND created_at > NOW() - INTERVAL '30 days'
  ORDER BY created_at DESC;

  RETURN COALESCE(v_alerts, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_unread_alerts(UUID) TO authenticated;

-- ============================================================================
-- 7. COMENTARIOS
-- ============================================================================
COMMENT ON TABLE payment_notifications IS 'Notificaciones de pago enviadas por usuarios al administrador';
COMMENT ON TABLE subscription_expiry_alerts IS 'Log de alertas de expiración enviadas a usuarios';
COMMENT ON FUNCTION process_payment_notification IS 'Procesa (aprueba/rechaza) notificación de pago y extiende suscripción';
COMMENT ON FUNCTION generate_expiry_alerts IS 'Genera alertas automáticas para suscripciones próximas a expirar';
COMMENT ON FUNCTION get_user_unread_alerts IS 'Obtiene alertas no leídas de un usuario';

-- ============================================================================
-- 8. EJECUTAR GENERACIÓN INICIAL DE ALERTAS
-- ============================================================================
SELECT generate_expiry_alerts();

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de notificaciones de pago y alertas creado exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Funciones disponibles:';
  RAISE NOTICE '   - process_payment_notification(notification_id, action, admin_notes, extend_months)';
  RAISE NOTICE '   - generate_expiry_alerts() -- Ejecutar diariamente con cron';
  RAISE NOTICE '   - get_user_unread_alerts(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Tablas creadas:';
  RAISE NOTICE '   - payment_notifications (notificaciones de usuarios)';
  RAISE NOTICE '   - subscription_expiry_alerts (alertas de expiración)';
END $$;
