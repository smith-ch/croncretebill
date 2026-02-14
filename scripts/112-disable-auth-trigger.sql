-- =====================================================
-- Script 112: Disable Auth Trigger Temporarily
-- =====================================================
-- Problema: El trigger on_auth_user_created sigue causando
-- error 500 durante el login
--
-- Solución TEMPORAL: Deshabilitar el trigger para permitir
-- que los usuarios existentes puedan hacer login
-- =====================================================

-- Deshabilitar el trigger temporalmente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Script 112 completado';
  RAISE NOTICE '   - Trigger on_auth_user_created DESHABILITADO temporalmente';
  RAISE NOTICE '   - Los usuarios existentes ahora pueden hacer login';
  RAISE NOTICE '   ⚠️ NOTA: Nuevos registros NO crearán perfil automáticamente';
END $$;
