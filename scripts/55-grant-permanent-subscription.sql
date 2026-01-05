-- =====================================================
-- Script 55: Grant Permanent Subscription to Admin User
-- =====================================================
-- Description: Grants lifetime Enterprise subscription to smith_18r@hotmail.com
-- Date: 2026-01-05
-- =====================================================

BEGIN;

-- Find the user ID for smith_18r@hotmail.com
DO $$
DECLARE
  v_user_id UUID;
  v_enterprise_plan_id UUID;
  v_existing_subscription_id UUID;
BEGIN
  -- Get user ID from profiles or auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'smith_18r@hotmail.com'
  LIMIT 1;

  -- If not found in auth.users, try profiles
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM profiles
    WHERE email = 'smith_18r@hotmail.com'
    LIMIT 1;
  END IF;

  -- Get Enterprise plan ID
  SELECT id INTO v_enterprise_plan_id
  FROM subscription_plans
  WHERE name = 'enterprise'
  LIMIT 1;

  -- Raise error if user or plan not found
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email smith_18r@hotmail.com not found';
  END IF;

  IF v_enterprise_plan_id IS NULL THEN
    RAISE EXCEPTION 'Enterprise plan not found';
  END IF;

  -- Check if user already has a subscription
  SELECT id INTO v_existing_subscription_id
  FROM user_subscriptions
  WHERE user_id = v_user_id
  LIMIT 1;

  -- If subscription exists, update it to Enterprise lifetime
  IF v_existing_subscription_id IS NOT NULL THEN
    RAISE NOTICE 'Updating existing subscription for user %', v_user_id;
    
    UPDATE user_subscriptions
    SET 
      plan_id = v_enterprise_plan_id,
      status = 'active',
      billing_cycle = 'lifetime',
      start_date = NOW(),
      end_date = NULL, -- No expiration date
      trial_end_date = NULL,
      payment_method = 'Manual/Admin',
      last_payment_date = NOW(),
      next_billing_date = NULL, -- No next billing for lifetime
      amount_paid = 0.00,
      currency = 'DOP',
      managed_by = v_user_id, -- Self-managed
      notes = 'Suscripción permanente Enterprise otorgada por administrador - ' || NOW()::TEXT,
      -- Set max limits from Enterprise plan
      current_max_users = 100,
      current_max_invoices = 20000,
      current_max_products = 20000,
      current_max_clients = 10000,
      updated_at = NOW()
    WHERE id = v_existing_subscription_id;

    RAISE NOTICE 'Subscription updated successfully for user %', v_user_id;
  ELSE
    -- Create new subscription
    RAISE NOTICE 'Creating new subscription for user %', v_user_id;
    
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      start_date,
      end_date,
      trial_end_date,
      payment_method,
      last_payment_date,
      next_billing_date,
      amount_paid,
      currency,
      managed_by,
      notes,
      current_max_users,
      current_max_invoices,
      current_max_products,
      current_max_clients,
      current_users_count,
      current_invoices_count,
      current_products_count,
      current_clients_count
    ) VALUES (
      v_user_id,
      v_enterprise_plan_id,
      'active',
      'lifetime',
      NOW(),
      NULL, -- No expiration
      NULL,
      'Manual/Admin',
      NOW(),
      NULL, -- No next billing
      0.00,
      'DOP',
      v_user_id,
      'Suscripción permanente Enterprise otorgada por administrador - ' || NOW()::TEXT,
      100, -- max_users
      20000, -- max_invoices
      20000, -- max_products
      10000, -- max_clients
      0, -- current counts start at 0
      0,
      0,
      0
    );

    RAISE NOTICE 'Subscription created successfully for user %', v_user_id;
  END IF;

  -- Display final subscription info
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Subscription Details:';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'User Email: smith_18r@hotmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Plan: Enterprise (Lifetime)';
  RAISE NOTICE 'Max Users: 100';
  RAISE NOTICE 'Max Invoices/month: 20,000';
  RAISE NOTICE 'Max Products: 20,000';
  RAISE NOTICE 'Max Clients: 10,000';
  RAISE NOTICE 'Status: Active (Permanent)';
  RAISE NOTICE '====================================================';

END $$;

COMMIT;
