-- =====================================================
-- Script 54: Fix Subscription Plans Relationship
-- =====================================================
-- Description: Fixes the relationship between user_subscriptions and subscription_plans
-- Date: 2026-01-05
-- =====================================================

BEGIN;

-- 1. Ensure subscription_plans table exists with correct structure
CREATE TABLE IF NOT EXISTS subscription_plans (
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

-- 2. Ensure plan_id column exists in user_subscriptions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'user_subscriptions' 
    AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN plan_id UUID;
  END IF;
END $$;

-- 3. Drop existing foreign key if exists
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;

-- 4. Drop existing index if exists
DROP INDEX IF EXISTS idx_user_subscriptions_plan_id;

-- 5. Clean up invalid plan_id references (IDs that don't exist in subscription_plans)
UPDATE user_subscriptions
SET plan_id = NULL
WHERE plan_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM subscription_plans WHERE id = user_subscriptions.plan_id
  );

-- 6. Add the foreign key constraint with proper configuration
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_id_fkey
FOREIGN KEY (plan_id) 
REFERENCES subscription_plans(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 7. Create index for better performance
CREATE INDEX idx_user_subscriptions_plan_id 
ON user_subscriptions(plan_id);

-- 8. Update existing subscriptions to link with correct plans based on their limits
-- Free plan: 1 user, 5 invoices, 10 products, 5 clients
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'free' LIMIT 1)
WHERE plan_id IS NULL
  AND current_max_users = 1
  AND current_max_invoices = 5
  AND current_max_products = 10
  AND current_max_clients = 5;

-- Starter plan: 5 users, 500 invoices, 500 products, 100 clients
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1)
WHERE plan_id IS NULL
  AND current_max_users = 5
  AND current_max_invoices = 250
  AND current_max_products = 300
  AND current_max_clients = 100;

-- Legacy Starter configurations (old limits before update)
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1)
WHERE plan_id IS NULL
  AND current_max_users IN (1, 3, 5)
  AND current_max_invoices IN (50, 100, 250, 500)
  AND current_max_products IN (50, 100, 300, 500)
  AND current_max_clients IN (50, 100);

-- Professional plan: 5 users, 1000 invoices, 1000 products, 500 clients
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'professional' LIMIT 1)
WHERE plan_id IS NULL
  AND current_max_users = 5
  AND current_max_invoices = 1000
  AND current_max_products = 1000
  AND current_max_clients = 500;

-- Business plan: 15 users, 5000 invoices, 5000 products, 2500 clients
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'business' LIMIT 1)
WHERE plan_id IS NULL
  AND current_max_users = 15
  AND current_max_invoices = 5000
  AND current_max_products = 5000
  AND current_max_clients = 2500;

-- Enterprise plan: 100 users, 20000 invoices, 20000 products, 10000 clients
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'enterprise' LIMIT 1)
WHERE plan_id IS NULL
  AND current_max_users = 100
  AND current_max_invoices = 20000
  AND current_max_products = 20000
  AND current_max_clients = 10000;

-- 9. For any remaining subscriptions without plan_id, assign free plan
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'free' LIMIT 1)
WHERE plan_id IS NULL;

-- 10. Assign plan based on closest match for any remaining NULL plan_ids
-- This handles subscriptions with custom limits that don't match exactly
UPDATE user_subscriptions us
SET plan_id = (
  SELECT sp.id
  FROM subscription_plans sp
  WHERE sp.is_active = true
  ORDER BY 
    -- Calculate "distance" from current limits to plan limits
    ABS(sp.max_users - us.current_max_users) +
    ABS(sp.max_invoices - us.current_max_invoices) +
    ABS(sp.max_products - us.current_max_products) +
    ABS(sp.max_clients - us.current_max_clients)
  LIMIT 1
)
WHERE plan_id IS NULL;

-- 11. Update current_max_* columns to match the assigned plan limits
-- This ensures existing subscriptions get the new improved limits
UPDATE user_subscriptions us
SET 
  current_max_users = sp.max_users,
  current_max_invoices = sp.max_invoices,
  current_max_products = sp.max_products,
  current_max_clients = sp.max_clients,
  updated_at = NOW()
FROM subscription_plans sp
WHERE us.plan_id = sp.id
  AND us.status = 'active'
  AND (
    us.current_max_users != sp.max_users OR
    us.current_max_invoices != sp.max_invoices OR
    us.current_max_products != sp.max_products OR
    us.current_max_clients != sp.max_clients
  );

-- 12. Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification queries
SELECT 'Subscription plans:' as message;
SELECT id, name, display_name, max_users, max_invoices, max_products, max_clients 
FROM subscription_plans 
ORDER BY price_monthly;

SELECT 'User subscriptions with plans:' as message;
SELECT 
  us.id,
  us.user_id,
  sp.name as plan_name,
  sp.display_name,
  us.status,
  us.current_max_users,
  us.current_max_invoices,
  us.current_max_products,
  us.current_max_clients
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LIMIT 10;

SELECT 'Foreign key constraints:' as message;
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_subscriptions'
  AND kcu.column_name = 'plan_id';
