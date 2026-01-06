-- =====================================================
-- Script 53: Add Free Plan with Limited Features
-- =====================================================
-- Description: Adds a free plan with very limited features as the default plan for new users
-- Date: 2026-01-05
-- =====================================================

BEGIN;

-- Insert Free Plan
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_users, max_invoices, max_products, max_clients, features, is_active)
VALUES
  (
    'free',
    'Plan Gratuito',
    'Plan gratuito con funcionalidades muy limitadas para probar el sistema',
    0.00,
    0.00,
    1,
    5,
    10,
    5,
    '["Funcionalidades básicas limitadas", "1 Usuario", "5 Facturas/mes (incluye recibos térmicos)", "10 Productos/Servicios", "5 Clientes", "Sin acceso a reportes DGII", "Sin acceso a reportes mensuales", "Sin acceso a proyectos, gastos, vehículos, conductores", "Marca de agua en reportes", "Soporte básico por email"]'::jsonb,
    true
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_users = EXCLUDED.max_users,
  max_invoices = EXCLUDED.max_invoices,
  max_products = EXCLUDED.max_products,
  max_clients = EXCLUDED.max_clients,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Note: Services use the same limit as products (max_products field)
-- This simplifies the structure and makes sense since both are catalog items

-- Create function to assign free plan to new users automatically
CREATE OR REPLACE FUNCTION assign_free_plan_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;

  -- Only create subscription if user doesn't already have one
  IF NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = NEW.id) THEN
    -- Create a free subscription for the new user
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      start_date,
      end_date,
      current_max_users,
      current_max_invoices,
      current_max_products,
      current_max_clients
    )
    VALUES (
      NEW.id,
      free_plan_id,
      'active',
      'monthly',
      NOW(),
      NOW() + INTERVAL '10 years', -- Free plan never expires
      1,
      5,
      10,
      5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_user_created_assign_free_plan ON profiles;

CREATE TRIGGER on_user_created_assign_free_plan
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_free_plan_to_new_user();

COMMIT;

-- Verify the setup
SELECT 'Free plan created:' as message;
SELECT id, name, display_name, price_monthly, max_users, max_invoices, max_products, max_clients 
FROM subscription_plans 
WHERE name = 'free';

SELECT 'Trigger created successfully' as message;
