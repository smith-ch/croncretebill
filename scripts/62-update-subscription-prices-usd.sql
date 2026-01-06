-- =====================================================
-- Script 62: Update Subscription Plan Prices to USD
-- =====================================================
-- Description: Updates subscription plan prices to new USD pricing
-- Date: 2026-01-05
-- New Pricing:
--   - Starter: $19.99/month, $199.90/year
--   - Professional: $39.99/month, $399.90/year
--   - Business: $59.99/month, $599.90/year
--   - Enterprise: $89.99/month, $899.90/year
-- =====================================================

BEGIN;

-- Update Starter Plan
UPDATE subscription_plans
SET 
  price_monthly = 19.99,
  price_yearly = 199.90,
  updated_at = NOW()
WHERE name = 'starter';

-- Update Professional Plan
UPDATE subscription_plans
SET 
  price_monthly = 39.99,
  price_yearly = 399.90,
  updated_at = NOW()
WHERE name = 'professional';

-- Update Business Plan
UPDATE subscription_plans
SET 
  price_monthly = 59.99,
  price_yearly = 599.90,
  updated_at = NOW()
WHERE name = 'business';

-- Update Enterprise Plan
UPDATE subscription_plans
SET 
  price_monthly = 89.99,
  price_yearly = 899.90,
  updated_at = NOW()
WHERE name = 'enterprise';

COMMIT;

-- Show updated prices
SELECT 
  name,
  display_name,
  price_monthly,
  price_yearly,
  max_users,
  max_invoices,
  updated_at
FROM subscription_plans
WHERE name IN ('starter', 'professional', 'business', 'enterprise')
ORDER BY price_monthly;
