-- Add email column to user_profiles table
-- This allows storing email directly in user_profiles without needing Admin API access

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Add comment
COMMENT ON COLUMN user_profiles.email IS 'User email address, stored here for easy access without Admin API';
