-- =====================================================
-- Script 59: Asegurar que existe el Plan Gratuito
-- =====================================================
-- Propósito: Verificar y crear el plan gratuito si no existe
-- Fecha: 2026-01-05
-- =====================================================

-- 1. Verificar si existe el plan gratuito
DO $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- Buscar plan gratuito
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'free';

  -- Si no existe, crearlo
  IF v_free_plan_id IS NULL THEN
    INSERT INTO subscription_plans (
      name,
      display_name,
      description,
      price_monthly,
      price_yearly,
      max_users,
      max_invoices,
      max_products,
      max_clients,
      features,
      is_active
    ) VALUES (
      'free',
      'Plan Gratuito',
      'Plan básico gratuito con funcionalidades limitadas - Perfecto para comenzar',
      0.00,
      0.00,
      1,        -- Solo el owner (sin empleados)
      5,        -- 5 facturas/recibos por mes
      10,       -- 10 productos
      5,        -- 5 clientes
      '["Hasta 1 usuario (sin empleados)", "Máximo 5 facturas/recibos por mes", "Hasta 10 productos", "Hasta 5 clientes", "Reportes básicos", "Soporte por email"]'::jsonb,
      true
    );
    
    RAISE NOTICE '✅ Plan Gratuito creado exitosamente';
  ELSE
    RAISE NOTICE 'ℹ️ Plan Gratuito ya existe con ID: %', v_free_plan_id;
  END IF;
END $$;

-- 2. Mostrar información del plan gratuito
SELECT 
  id,
  name,
  display_name,
  price_monthly,
  price_yearly,
  max_users,
  max_invoices,
  max_products,
  max_clients,
  is_active
FROM subscription_plans
WHERE name = 'free';

-- 3. Verificar usuarios que registraron pero no tienen suscripción activa
-- (Esto ayuda a identificar usuarios bloqueados)
SELECT 
  up.user_id,
  au.email,
  up.display_name,
  up.created_at as registro,
  CASE 
    WHEN us.status IS NULL THEN '❌ SIN SUSCRIPCIÓN'
    WHEN us.status = 'pending' THEN '⏳ PENDIENTE'
    WHEN us.status = 'active' THEN '✅ ACTIVA'
    ELSE '⚠️ ' || us.status
  END as estado_suscripcion,
  sp.display_name as plan_actual
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL -- Solo owners, no empleados
  AND up.created_at > NOW() - INTERVAL '7 days' -- Registros de última semana
ORDER BY up.created_at DESC
LIMIT 20;

-- 4. Script de corrección para usuarios bloqueados (ejecutar manualmente si hay usuarios sin acceso)
-- DESCOMENTA las siguientes líneas si necesitas asignar plan gratuito a usuarios existentes:

/*
-- Asignar plan gratuito a todos los usuarios sin suscripción activa
DO $$
DECLARE
  v_free_plan_id UUID;
  v_affected_users INT;
BEGIN
  -- Obtener ID del plan gratuito
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el plan gratuito';
  END IF;

  -- Insertar suscripciones gratuitas para usuarios sin suscripción
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    start_date,
    end_date,
    current_max_users,
    current_max_invoices,
    current_max_products,
    current_max_clients
  )
  SELECT 
    up.user_id,
    v_free_plan_id,
    'active',
    NOW(),
    NULL, -- Sin fecha de expiración para plan gratuito
    1,    -- max_users
    5,    -- max_invoices
    10,   -- max_products
    5     -- max_clients
  FROM user_profiles up
  WHERE up.parent_user_id IS NULL -- Solo owners
    AND NOT EXISTS (
      SELECT 1 FROM user_subscriptions us2 
      WHERE us2.user_id = up.user_id 
        AND us2.status = 'active'
    );

  GET DIAGNOSTICS v_affected_users = ROW_COUNT;
  
  RAISE NOTICE '✅ Se asignó plan gratuito a % usuarios', v_affected_users;
END $$;

-- Verificar usuarios después de la corrección
SELECT 
  au.email,
  up.display_name,
  us.status,
  sp.display_name as plan
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
JOIN user_subscriptions us ON up.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
  AND us.status = 'active'
ORDER BY up.created_at DESC;
*/
