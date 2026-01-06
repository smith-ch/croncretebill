-- ============================================================================
-- Script 65: Restore Subscriptions Based on Current Limits
-- Propósito: Asignar el plan correcto basado en los límites actuales del usuario
-- Fecha: 2026-01-05
-- ============================================================================

BEGIN;

-- 1. Mostrar suscripciones actuales con sus límites
SELECT 
  '=== SUSCRIPCIONES ANTES DE RESTAURAR ===' as info,
  us.id,
  up.email,
  sp.name as current_plan_name,
  us.current_max_users,
  us.current_max_invoices,
  us.current_max_products,
  us.current_max_clients,
  us.billing_cycle,
  us.status
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY us.created_at;

-- 2. Actualizar plan basado en límites actuales
DO $$
DECLARE
  r RECORD;
  correct_plan_id UUID;
  free_plan_id UUID;
  starter_plan_id UUID;
  professional_plan_id UUID;
  business_plan_id UUID;
  enterprise_plan_id UUID;
  updated_count INTEGER := 0;
BEGIN
  -- Obtener IDs de planes
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'free';
  SELECT id INTO starter_plan_id FROM subscription_plans WHERE name = 'starter';
  SELECT id INTO professional_plan_id FROM subscription_plans WHERE name = 'professional';
  SELECT id INTO business_plan_id FROM subscription_plans WHERE name = 'business';
  SELECT id INTO enterprise_plan_id FROM subscription_plans WHERE name = 'enterprise';
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Plan IDs:';
  RAISE NOTICE 'Free: %', free_plan_id;
  RAISE NOTICE 'Starter: %', starter_plan_id;
  RAISE NOTICE 'Professional: %', professional_plan_id;
  RAISE NOTICE 'Business: %', business_plan_id;
  RAISE NOTICE 'Enterprise: %', enterprise_plan_id;
  RAISE NOTICE '==========================================';
  
  -- Recorrer cada suscripción y asignar el plan correcto
  FOR r IN (
    SELECT us.*, up.email
    FROM user_subscriptions us
    LEFT JOIN user_profiles up ON us.user_id = up.user_id
    WHERE up.parent_user_id IS NULL
  ) LOOP
    correct_plan_id := NULL;
    
    -- Determinar el plan correcto basado en límites actuales
    -- Si tiene límites personalizados (current_max_*), usar esos para decidir
    -- Si no tiene límites personalizados (NULL), usar el plan Free
    
    IF r.current_max_users IS NULL THEN
      -- Sin límites personalizados = Free plan
      correct_plan_id := free_plan_id;
      RAISE NOTICE 'User %: No custom limits → Free', r.email;
      
    ELSIF r.current_max_users >= 50 OR r.current_max_invoices >= 10000 THEN
      -- Enterprise: 50+ usuarios o 10000+ facturas
      correct_plan_id := enterprise_plan_id;
      RAISE NOTICE 'User %: % users, % invoices → Enterprise', r.email, r.current_max_users, r.current_max_invoices;
      
    ELSIF r.current_max_users >= 20 OR r.current_max_invoices >= 5000 THEN
      -- Business: 20+ usuarios o 5000+ facturas
      correct_plan_id := business_plan_id;
      RAISE NOTICE 'User %: % users, % invoices → Business', r.email, r.current_max_users, r.current_max_invoices;
      
    ELSIF r.current_max_users >= 10 OR r.current_max_invoices >= 1000 THEN
      -- Professional: 10+ usuarios o 1000+ facturas
      correct_plan_id := professional_plan_id;
      RAISE NOTICE 'User %: % users, % invoices → Professional', r.email, r.current_max_users, r.current_max_invoices;
      
    ELSIF r.current_max_users >= 3 OR r.current_max_invoices >= 500 THEN
      -- Starter: 3+ usuarios o 500+ facturas
      correct_plan_id := starter_plan_id;
      RAISE NOTICE 'User %: % users, % invoices → Starter', r.email, r.current_max_users, r.current_max_invoices;
      
    ELSE
      -- Por defecto Free
      correct_plan_id := free_plan_id;
      RAISE NOTICE 'User %: Low limits → Free', r.email;
    END IF;
    
    -- Actualizar la suscripción si el plan cambió
    IF correct_plan_id IS NOT NULL AND correct_plan_id != r.plan_id THEN
      UPDATE user_subscriptions
      SET plan_id = correct_plan_id,
          updated_at = NOW()
      WHERE id = r.id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Updated % subscriptions', updated_count;
  RAISE NOTICE '==========================================';
END $$;

-- 3. Mostrar resultado final
SELECT 
  '=== SUSCRIPCIONES DESPUÉS DE RESTAURAR ===' as info,
  us.id,
  up.email,
  sp.name as new_plan_name,
  sp.display_name,
  us.current_max_users,
  us.current_max_invoices,
  us.current_max_products,
  us.current_max_clients,
  us.billing_cycle,
  us.status
FROM user_subscriptions us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY sp.price_monthly DESC, us.created_at;

COMMIT;
