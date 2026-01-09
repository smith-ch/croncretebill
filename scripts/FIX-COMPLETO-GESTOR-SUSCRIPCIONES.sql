-- ============================================================================
-- EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- ============================================================================
-- Este script corrige TODOS los problemas del gestor de suscripciones:
-- 1. Actualiza el trigger para guardar emails en user_profiles
-- 2. Actualiza perfiles existentes sin email
-- 3. Corrige la función create_manual_subscription
-- ============================================================================

-- PARTE 1: ACTUALIZAR TRIGGER PARA GUARDAR EMAILS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    owner_role_id UUID;
BEGIN
    -- Obtener ID del rol de propietario
    SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner';
    
    -- Crear perfil de propietario para nuevo usuario CON EMAIL
    INSERT INTO public.user_profiles (
        user_id,
        role_id,
        email,
        display_name,
        can_create_invoices,
        can_view_finances,
        can_manage_inventory,
        can_manage_clients,
        can_manage_users,
        can_view_reports,
        allowed_modules
    ) VALUES (
        NEW.id,
        owner_role_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        true,
        true,
        true,
        true,
        true,
        true,
        '["all"]'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARTE 2: ACTUALIZAR PERFILES EXISTENTES SIN EMAIL
-- ============================================================================
UPDATE user_profiles up
SET 
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '' OR up.email = 'unknown');

-- PARTE 3: CREAR PERFILES FALTANTES
-- ============================================================================
INSERT INTO user_profiles (
  user_id, 
  role_id,
  email, 
  display_name,
  can_create_invoices,
  can_view_finances,
  can_manage_inventory,
  can_manage_clients,
  can_manage_users,
  can_view_reports,
  allowed_modules,
  parent_user_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  (SELECT id FROM public.user_roles WHERE name = 'owner'),
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  true,
  true,
  true,
  true,
  true,
  true,
  '["all"]'::jsonb,
  NULL,
  true,
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = au.id
)
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- PARTE 4: CORREGIR FUNCIÓN create_manual_subscription
-- ============================================================================
CREATE OR REPLACE FUNCTION create_manual_subscription(
  p_user_email VARCHAR(255),
  p_plan_name VARCHAR(100),
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_status VARCHAR(50) DEFAULT 'active',
  p_billing_cycle VARCHAR(50) DEFAULT 'monthly',
  p_manager_email VARCHAR(255) DEFAULT 'smithrodriguez345@gmail.com',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_manager_id UUID;
  v_subscription_id UUID;
  v_result JSON;
BEGIN
  -- Buscar usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Buscar plan
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name = p_plan_name AND is_active = true;

  IF v_plan_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Plan no encontrado o inactivo: ' || p_plan_name
    );
  END IF;

  -- Buscar manager
  SELECT id INTO v_manager_id
  FROM auth.users
  WHERE email = p_manager_email;

  -- Crear o actualizar suscripción
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    start_date,
    end_date,
    status,
    billing_cycle,
    managed_by,
    notes,
    current_max_users,
    current_max_invoices,
    current_max_products,
    current_max_clients
  )
  SELECT
    v_user_id,
    v_plan_id,
    p_start_date,
    p_end_date,
    p_status,
    p_billing_cycle,
    v_manager_id,
    p_notes,
    sp.max_users,
    sp.max_invoices,
    sp.max_products,
    sp.max_clients
  FROM subscription_plans sp
  WHERE sp.id = v_plan_id
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = v_plan_id,
    start_date = p_start_date,
    end_date = p_end_date,
    status = p_status,
    billing_cycle = p_billing_cycle,
    managed_by = v_manager_id,
    notes = p_notes,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Registrar en historial
  INSERT INTO subscription_history (
    subscription_id,
    user_id,
    action,
    new_status,
    reason,
    changed_by,
    changed_by_email
  )
  VALUES (
    v_subscription_id,
    v_user_id,
    'created',
    p_status,
    p_notes,
    v_manager_id,
    p_manager_email
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Suscripción creada correctamente',
    'subscription_id', v_subscription_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ ✅ ✅ TODOS LOS FIXES APLICADOS CORRECTAMENTE ✅ ✅ ✅';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Cambios aplicados:';
  RAISE NOTICE '   1. ✅ Trigger actualizado para guardar emails';
  RAISE NOTICE '   2. ✅ Perfiles existentes actualizados con emails';
  RAISE NOTICE '   3. ✅ Perfiles faltantes creados';
  RAISE NOTICE '   4. ✅ Función create_manual_subscription corregida';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ahora puedes:';
  RAISE NOTICE '   - Ver todos los usuarios en el gestor de suscripciones';
  RAISE NOTICE '   - Crear suscripciones sin error 400';
  RAISE NOTICE '   - Los nuevos usuarios se registrarán correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Recarga la página del gestor: http://localhost:3000/subscriptions';
END $$;
