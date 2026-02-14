-- ============================================================================
-- Script 119: Eliminar trigger handle_new_user_simple_trigger
-- Este trigger está causando el error 500 en el login
-- ============================================================================

BEGIN;

-- Eliminar el trigger específico que quedó
DROP TRIGGER IF EXISTS handle_new_user_simple_trigger ON auth.users;

-- Eliminar también la función asociada
DROP FUNCTION IF EXISTS public.handle_new_user_simple() CASCADE;

-- Verificar que ya no hay triggers
SELECT 
  '=== TRIGGERS RESTANTES ===' as info,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

COMMIT;

-- Mensaje
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger handle_new_user_simple_trigger ELIMINADO';
  RAISE NOTICE 'Intenta login de test1@gmail.com AHORA';
  RAISE NOTICE '';
END $$;
