-- =====================================================
-- Script 110: Fix Authentication Trigger
-- =====================================================
-- Problema: El trigger on_auth_user_created está intentando 
-- insertar en la tabla 'profiles' que ya no existe, causando
-- error 500 durante el login.
--
-- Solución: Actualizar el trigger para que trabaje con 
-- user_profiles y solo se ejecute para usuarios regulares,
-- no para empleados (que se crean con create_employee_direct).
-- =====================================================

-- Primero, eliminar el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recrear la función handle_new_user para trabajar con user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Solo crear perfil si no existe ya (evitar duplicados con empleados)
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id) THEN
    
    -- Obtener el role_id para 'owner' por defecto
    SELECT id INTO default_role_id 
    FROM public.user_roles 
    WHERE name = 'owner' 
    LIMIT 1;
    
    -- Si no hay role_id, usar NULL (el campo permite NULL)
    IF default_role_id IS NULL THEN
      default_role_id := NULL;
    END IF;
    
    -- Insertar en user_profiles para usuarios normales (no empleados)
    INSERT INTO public.user_profiles (
      user_id,
      email,
      display_name,
      role_id,
      parent_user_id,
      root_owner_id,
      is_active
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      default_role_id,
      NULL, -- Los usuarios normales no tienen parent
      NEW.id, -- El root_owner es el mismo usuario
      true
    );
    
    -- Crear configuración de empresa por defecto
    INSERT INTO public.company_settings (
      user_id,
      company_name,
      currency_code,
      currency_symbol
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mi Empresa'),
      'DOP',
      'RD$'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no fallar el proceso de autenticación
    RAISE WARNING 'Error en handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Script 110 completado exitosamente';
  RAISE NOTICE '   - Trigger on_auth_user_created actualizado';
  RAISE NOTICE '   - Función handle_new_user migrada a user_profiles';
  RAISE NOTICE '   - Manejo de errores mejorado para evitar 500 en login';
END $$;
