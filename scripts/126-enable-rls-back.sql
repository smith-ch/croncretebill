-- ============================================================================
-- Script 126: Reactivar RLS en tablas principales
-- ============================================================================

BEGIN;

-- Reactivar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verificar
SELECT 
  '=== RLS REACTIVADO ===' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'company_settings', 'invoices', 'user_subscriptions')
ORDER BY tablename;
