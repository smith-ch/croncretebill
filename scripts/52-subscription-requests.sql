-- =====================================================
-- Script 52: Subscription Requests Table
-- =====================================================
-- Description: Creates table for users to request subscriptions
-- Date: 2026-01-05
-- =====================================================

BEGIN;

-- Create subscription_requests table
CREATE TABLE IF NOT EXISTS subscription_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id and status
CREATE INDEX IF NOT EXISTS idx_subscription_requests_user_id ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_created_at ON subscription_requests(created_at DESC);

-- Enable RLS
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own subscription requests"
  ON subscription_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create subscription requests"
  ON subscription_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
  ON subscription_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Subscription managers can view all requests
CREATE POLICY "Managers can view all subscription requests"
  ON subscription_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND email = 'smithrodriguez345@gmail.com'
    )
  );

-- Subscription managers can update any request
CREATE POLICY "Managers can update subscription requests"
  ON subscription_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND email = 'smithrodriguez345@gmail.com'
    )
  );

COMMIT;

-- Verify
SELECT 'subscription_requests table created successfully' as message;
SELECT * FROM subscription_requests LIMIT 5;
