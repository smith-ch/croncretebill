-- ============================================================================
-- Script 125: Desactivar RLS temporalmente para diagnosticar
-- SOLO PARA TESTING - Reactivar después
-- ============================================================================

BEGIN;

-- Desactivar RLS en tablas que podrían estar causando recursión
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verificar
SELECT 
  '=== RLS STATUS ===' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'company_settings', 'invoices', 'user_subscriptions')
ORDER BY tablename;

-- Mensaje
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'RLS DESACTIVADO TEMPORALMENTE';
  RAISE NOTICE 'INTENTA LOGIN AHORA CON test1@gmail.com / 123456';
  RAISE NOTICE '';
  RAISE NOTICE 'Si funciona, el problema es una política RLS';
  RAISE NOTICE 'Si sigue fallando, el problema es otra cosa (funciones, hooks)';
  RAISE NOTICE '';
END $$;
