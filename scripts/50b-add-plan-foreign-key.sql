-- =====================================================
-- Script 50b: Add Foreign Key Constraint for plan_id
-- =====================================================
-- Description: Adds foreign key constraint to link user_subscriptions.plan_id to subscription_plans.id
-- Date: 2026-01-02
-- =====================================================

BEGIN;

-- First, ensure plan_id column exists and is the correct type
-- If it doesn't exist, add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' 
    AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN plan_id UUID;
  END IF;
END $$;

-- Drop existing foreign key constraint if it exists
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;

-- Drop NOT NULL constraint on plan_id to allow temporary NULL values
ALTER TABLE user_subscriptions 
ALTER COLUMN plan_id DROP NOT NULL;

-- Clear all existing plan_id values that might reference old/deleted plans
UPDATE user_subscriptions SET plan_id = NULL WHERE plan_id IS NOT NULL;

-- Add the foreign key constraint
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_id_fkey
FOREIGN KEY (plan_id) 
REFERENCES subscription_plans(id)
ON DELETE SET NULL;  -- If a plan is deleted, set plan_id to NULL

-- Now re-link subscriptions to the correct plans based on their limits
-- Professional plan: 3 users, 500 invoices
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'professional')
WHERE plan_id IS NULL
  AND current_max_users = 3
  AND current_max_invoices = 500;

-- Starter plan: 1 user, 50 invoices
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'starter')
WHERE plan_id IS NULL
  AND current_max_users = 1
  AND current_max_invoices = 50;

-- Business plan: 10 users, 2000 invoices
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'business')
WHERE plan_id IS NULL
  AND current_max_users = 10
  AND current_max_invoices = 2000;

-- Enterprise plan: 50 users, 10000 invoices
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'enterprise')
WHERE plan_id IS NULL
  AND current_max_users = 50
  AND current_max_invoices = 10000;

-- Create an index on plan_id for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id 
ON user_subscriptions(plan_id);

COMMIT;

-- Verify the constraint was added
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
