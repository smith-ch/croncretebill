-- ============================================================================
-- Script 145: Verificar Sistema de Creación de Empleados
-- ============================================================================
-- Diagnostica si la función create_employee_direct existe y funciona
-- ============================================================================

-- 1. Verificar que existe la función
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'DIAGNÓSTICO: Sistema de Creación de Empleados';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  
  -- Verificar función
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_employee_direct'
  ) THEN
    RAISE NOTICE 'Función create_employee_direct: EXISTE';
  ELSE
    RAISE NOTICE 'Función create_employee_direct: NO EXISTE - PROBLEMA CRÍTICO';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 2. Listar empleados existentes y su estado
SELECT 
  up.email,
  up.display_name,
  up.is_active,
  CASE 
    WHEN au.id IS NOT NULL THEN 'SI (OK)'
    ELSE 'NO (ERROR 500)'
  END as existe_en_auth_users,
  au.email_confirmed_at IS NOT NULL as email_confirmado,
  up.created_at as fecha_creacion
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.parent_user_id IS NOT NULL
ORDER BY up.created_at DESC;
