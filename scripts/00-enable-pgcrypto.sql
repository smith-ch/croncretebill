-- Enable pgcrypto extension for password encryption
-- This extension is required for the employee creation system
-- Run this script first before any other scripts that use password encryption

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify the extension is enabled
SELECT extname, extversion FROM pg_extension WHERE extname = 'pgcrypto';
