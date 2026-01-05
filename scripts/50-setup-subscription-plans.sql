-- =====================================================
-- Script 50: Setup Subscription Plans
-- =====================================================
-- Description: Creates subscription_plans table and populates with default plans
-- Date: 2026-01-02
-- =====================================================

BEGIN;

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Create subscription_plans table with correct structure
CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_invoices INTEGER NOT NULL DEFAULT 100,
  max_products INTEGER NOT NULL DEFAULT 100,
  max_clients INTEGER NOT NULL DEFAULT 50,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Only service role can modify plans
CREATE POLICY "Only service role can modify subscription plans"
  ON subscription_plans
  FOR ALL
  USING (auth.role() = 'service_role');

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_users, max_invoices, max_products, max_clients, features)
VALUES
  (
    'starter',
    'Plan Starter',
    'Plan básico para pequeños negocios que están comenzando',
    499.00,
    4990.00,
    5,
    250,
    300,
    100,
    '["Facturación completa", "Hasta 5 Usuarios", "250 Facturas/mes (incluye recibos térmicos)", "300 Productos/Servicios", "100 Clientes", "Gestión de empleados y metas", "Acceso a reportes básicos", "Soporte por email"]'::jsonb
  ),
  (
    'professional',
    'Plan Professional',
    'Plan ideal para negocios en crecimiento',
    999.00,
    9990.00,
    5,
    1000,
    1000,
    500,
    '["Facturación avanzada", "Hasta 5 Usuarios", "1,000 Facturas/mes (incluye recibos térmicos)", "1,000 Productos/Servicios", "500 Clientes", "Reportes DGII completos", "Reportes mensuales", "Acceso a todos los módulos", "Soporte prioritario"]'::jsonb
  ),
  (
    'business',
    'Plan Business',
    'Plan completo para empresas establecidas',
    1999.00,
    19990.00,
    15,
    5000,
    5000,
    2500,
    '["Facturación completa", "Hasta 15 Usuarios", "5,000 Facturas/mes (incluye recibos térmicos)", "5,000 Productos/Servicios", "2,500 Clientes", "Reportes DGII avanzados", "Reportes personalizados", "Gestión de proyectos", "Control de gastos", "API Access", "Soporte prioritario 24/7"]'::jsonb
  ),
  (
    'enterprise',
    'Plan Enterprise',
    'Plan empresarial con límites expandidos para grandes corporaciones',
    3999.00,
    39990.00,
    100,
    20000,
    20000,
    10000,
    '["Límites empresariales", "Hasta 100 Usuarios", "20,000 Facturas/mes (incluye recibos térmicos)", "20,000 Productos/Servicios", "10,000 Clientes", "Reportes DGII ilimitados", "Multi-sucursales", "Gestión completa de proyectos", "Control total de gastos y vehículos", "Integración API completa", "Cuenta dedicada", "Soporte premium 24/7", "Capacitación personalizada"]'::jsonb
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
  updated_at = NOW();

-- Now update existing user_subscriptions to link to the professional plan
-- since the current subscription has limits matching the professional plan (3 users, 500 invoices, etc.)
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'professional')
WHERE plan_id IS NULL
  AND current_max_users = 3
  AND current_max_invoices = 500;

COMMIT;

-- Verify the setup
SELECT 'Subscription plans created:' as message;
SELECT id, name, display_name, price_monthly, max_users, max_invoices, max_products, max_clients 
FROM subscription_plans 
ORDER BY price_monthly;

SELECT 'Updated user subscriptions:' as message;
SELECT us.id, us.user_id, us.status, sp.display_name as plan_name
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LIMIT 10;
