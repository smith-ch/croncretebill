-- ============================================================================
-- Script 63: Fix Foreign Key Relationship for user_subscriptions -> subscription_plans
-- Propósito: Asegurar que la FK existe y está configurada correctamente
-- Fecha: 2026-01-05
-- ============================================================================

BEGIN;

-- 1. Mostrar suscripciones con plan_ids inválidos ANTES de arreglar
DO $$
DECLARE
  orphaned_count INTEGER;
  free_plan_id UUID;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE sp.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Found % subscriptions with invalid plan_ids', orphaned_count;
    RAISE NOTICE '==========================================';
    
    -- Mostrar las suscripciones huérfanas
    FOR r IN (
      SELECT us.id, us.user_id, us.plan_id, us.status
      FROM user_subscriptions us
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE sp.id IS NULL
    ) LOOP
      RAISE NOTICE 'Subscription: %, User: %, Invalid Plan ID: %, Status: %', 
        r.id, r.user_id, r.plan_id, r.status;
    END LOOP;
    
    -- Obtener el ID del plan Free
    SELECT id INTO free_plan_id
    FROM subscription_plans
    WHERE name = 'free'
    LIMIT 1;
    
    IF free_plan_id IS NOT NULL THEN
      RAISE NOTICE '==========================================';
      RAISE NOTICE 'Updating orphaned subscriptions to Free plan: %', free_plan_id;
      RAISE NOTICE '==========================================';
      
      -- Actualizar suscripciones huérfanas al plan Free
      UPDATE user_subscriptions
      SET plan_id = free_plan_id,
          updated_at = NOW()
      WHERE id IN (
        SELECT us.id
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE sp.id IS NULL
      );
      
      RAISE NOTICE 'Updated % subscriptions to Free plan', orphaned_count;
    ELSE
      RAISE EXCEPTION 'Free plan not found! Cannot fix orphaned subscriptions.';
    END IF;
  ELSE
    RAISE NOTICE 'All subscriptions have valid plan_ids';
  END IF;
END $$;

-- 2. Verificar si la FK existe y eliminarla
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_subscriptions_plan_id_fkey'
    AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_plan_id_fkey;
    RAISE NOTICE 'FK constraint dropped for recreation';
  END IF;
END $$;

-- 3. Recrear la FK constraint
DO $$
BEGIN
  ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_id_fkey
  FOREIGN KEY (plan_id) 
  REFERENCES subscription_plans(id) 
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
  
  RAISE NOTICE 'FK constraint created successfully';
END $$;

-- 4. Verificar que todas las suscripciones tienen plan_ids válidos
DO $$
DECLARE
  orphaned_count INTEGER;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE sp.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % subscriptions with invalid plan_id', orphaned_count;
    
    -- Mostrar las suscripciones huérfanas
    RAISE NOTICE 'Orphaned subscriptions:';
    FOR r IN (
      SELECT us.id, us.user_id, us.plan_id, us.status
      FROM user_subscriptions us
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE sp.id IS NULL
    ) LOOP
      RAISE NOTICE 'Subscription ID: %, User ID: %, Invalid Plan ID: %, Status: %', 
        r.id, r.user_id, r.plan_id, r.status;
    END LOOP;
  ELSE
    RAISE NOTICE 'All subscriptions have valid plan_ids';
  END IF;
END $$;

-- 4. Refrescar el schema cache de PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';

COMMIT;

-- 5. Verificación final
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_subscriptions'
  AND kcu.column_name = 'plan_id';
