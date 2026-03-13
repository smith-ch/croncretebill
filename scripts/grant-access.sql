-- ============================================================================
-- Script para dar permisos y acceso (Suscripción y Rol) al usuario
-- Email: aguacostassuprema@gmail.com
-- ============================================================================

DO $$
DECLARE
  v_user_email VARCHAR := 'aguacostassuprema@gmail.com';
  v_user_id UUID;
  v_owner_role_id UUID;
  v_enterprise_plan_id UUID;
  v_subscription_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- 1. Buscar el usuario en auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Usuario con email % no encontrado en auth.users. Asegúrate de que el usuario haya creado una cuenta.', v_user_email;
  END IF;

  RAISE NOTICE '✅ Usuario Auth encontrado: %', v_user_id;

  -- 2. Obtener el ID del rol "owner" (propietario)
  SELECT id INTO v_owner_role_id
  FROM user_roles
  WHERE name = 'owner'
  LIMIT 1;

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION '❌ No se encontró el rol "owner" en la base de datos.';
  END IF;

  -- 3. Crear o actualizar el perfil en user_profiles
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = v_user_id) INTO v_profile_exists;

  IF v_profile_exists THEN
    UPDATE user_profiles
    SET role_id = v_owner_role_id,
        is_active = true,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    RAISE NOTICE '✅ Perfil existente actualizado con rol de Propietario (owner).';
  ELSE
    INSERT INTO user_profiles (user_id, email, display_name, role_id, is_active)
    VALUES (v_user_id, v_user_email, 'Agua Costa Suprema', v_owner_role_id, true);
    RAISE NOTICE '✅ Perfil creado exitosamente con rol de Propietario (owner).';
  END IF;

  -- 4. Obtener el plan Enterprise (o Business, Starter, etc. Usaremos Enterprise para acceso total)
  SELECT id INTO v_enterprise_plan_id
  FROM subscription_plans
  WHERE name = 'enterprise'
  LIMIT 1;

  IF v_enterprise_plan_id IS NULL THEN
    RAISE EXCEPTION '❌ No se encontró el plan "enterprise".';
  END IF;

  -- 5. Crear o actualizar la suscripción
  SELECT id INTO v_subscription_id
  FROM user_subscriptions
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    UPDATE user_subscriptions
    SET 
      plan_id = v_enterprise_plan_id,
      status = 'active',
      billing_cycle = 'lifetime',
      start_date = NOW(),
      end_date = NULL,
      current_max_users = 100,
      current_max_invoices = 20000,
      current_max_products = 20000,
      current_max_clients = 10000,
      notes = 'Acceso concedido mediante script de soporte.',
      updated_at = NOW()
    WHERE user_id = v_user_id;
    RAISE NOTICE '✅ Suscripción existente actualizada a Enterprise permanente.';
  ELSE
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      start_date,
      end_date,
      payment_method,
      managed_by,
      notes,
      current_max_users,
      current_max_invoices,
      current_max_products,
      current_max_clients,
      current_users_count,
      current_invoices_count,
      current_products_count,
      current_clients_count,
      amount_paid,
      currency
    ) VALUES (
      v_user_id,
      v_enterprise_plan_id,
      'active',
      'lifetime',
      NOW(),
      NULL,
      'Manual/Admin',
      v_user_id,
      'Acceso concedido mediante script de soporte.',
      100, 20000, 20000, 10000,
      0, 0, 0, 0,
      0.00,
      'USD'
    );
    RAISE NOTICE '✅ Nueva suscripción Enterprise creada exitosamente.';
  END IF;

  RAISE NOTICE '🎉 TODO LISTO: El usuario % ya tiene permisos completos para acceder y operar.', v_user_email;

END $$;
