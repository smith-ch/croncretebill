-- ============================================================================
-- Script 138: Verificar triggers UPDATE/DELETE en auth.users
-- ============================================================================
-- El login hace UPDATE en auth.users. Un trigger UPDATE puede causar 500.
-- ============================================================================

-- Ver TODOS los triggers con su evento (INSERT, UPDATE, DELETE)
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
    ELSE 'MIXED'
  END AS event_type,
  CASE WHEN t.tgisinternal THEN 'INTERNO' ELSE 'PERSONALIZADO ⚠️' END AS tipo
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users' AND n.nspname = 'auth'
ORDER BY t.tgisinternal, t.tgname;
