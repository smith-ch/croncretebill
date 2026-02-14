-- ============================================================================
-- Script 118: Deshabilitar COMPLETAMENTE todos los triggers de autenticación
-- El trigger handle_new_user está causando error 500 durante login
-- ============================================================================

BEGIN;

-- ========================================
-- 1. Eliminar TODOS los triggers en auth.users
-- ========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- ========================================
-- 2. Eliminar la función problemática
-- ========================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ========================================
-- 3. Verificar que no quedan triggers
-- ========================================

SELECT 
  '=== TRIGGERS RESTANTES EN auth.users ===' as info,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

-- Si no hay resultados, significa que todos los triggers fueron eliminados

COMMIT;

-- ========================================
-- 4. Mensaje de confirmación
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TRIGGERS ELIMINADOS EXITOSAMENTE';
  RAISE NOTICE '';
  RAISE NOTICE 'Los nuevos usuarios ahora deben crearse manualmente con:';
  RAISE NOTICE '   - create_employee_direct() para empleados';
  RAISE NOTICE '   - Signup normal + script manual para owners';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Intenta login de test1@gmail.com AHORA';
  RAISE NOTICE '';
END $$;
