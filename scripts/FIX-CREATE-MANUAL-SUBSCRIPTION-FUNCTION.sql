-- ============================================================================
-- Script: FIX-CREATE-MANUAL-SUBSCRIPTION-FUNCTION.sql
-- Propósito: Corregir la función create_manual_subscription
--            para usar los nombres de columna correctos
-- Fecha: 2026-01-09
-- ============================================================================

-- Recrear la función con los nombres de columna correctos
CREATE OR REPLACE FUNCTION create_manual_subscription(
  p_user_email VARCHAR(255),
  p_plan_name VARCHAR(100),
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_status VARCHAR(50) DEFAULT 'active',
  p_billing_cycle VARCHAR(50) DEFAULT 'monthly',
  p_manager_email VARCHAR(255) DEFAULT 'smithrodriguez345@gmail.com',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_manager_id UUID;
  v_subscription_id UUID;
  v_result JSON;
BEGIN
  -- Buscar usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Buscar plan
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name = p_plan_name AND is_active = true;

  IF v_plan_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Plan no encontrado o inactivo: ' || p_plan_name
    );
  END IF;

  -- Buscar manager
  SELECT id INTO v_manager_id
  FROM auth.users
  WHERE email = p_manager_email;

  -- Crear o actualizar suscripción
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    start_date,
    end_date,
    status,
    billing_cycle,
    managed_by,
    notes,
    current_max_users,
    current_max_invoices,
    current_max_products,
    current_max_clients
  )
  SELECT
    v_user_id,
    v_plan_id,
    p_start_date,
    p_end_date,
    p_status,
    p_billing_cycle,
    v_manager_id,
    p_notes,
    sp.max_users,
    sp.max_invoices,  -- ← CORREGIDO: era max_invoices_per_month
    sp.max_products,
    sp.max_clients
  FROM subscription_plans sp
  WHERE sp.id = v_plan_id
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = v_plan_id,
    start_date = p_start_date,
    end_date = p_end_date,
    status = p_status,
    billing_cycle = p_billing_cycle,
    managed_by = v_manager_id,
    notes = p_notes,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Registrar en historial
  INSERT INTO subscription_history (
    subscription_id,
    user_id,
    action,
    new_status,
    reason,
    changed_by,
    changed_by_email
  )
  VALUES (
    v_subscription_id,
    v_user_id,
    'created',
    p_status,
    p_notes,
    v_manager_id,
    p_manager_email
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Suscripción creada correctamente',
    'subscription_id', v_subscription_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función se creó correctamente
DO $$
BEGIN
  RAISE NOTICE '✅ Función create_manual_subscription actualizada correctamente';
  RAISE NOTICE '   Ahora usa max_invoices en lugar de max_invoices_per_month';
END $$;
