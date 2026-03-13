-- Script 70: Fix user permissions and owner_id issues
-- Fecha: 2026-03-09
-- Descripción: Corrige problemas de permisos para usuarios que no pueden crear registros

BEGIN;

-- 1. Crear trigger para auto-setear owner_id en INSERT si no se proporciona
CREATE OR REPLACE FUNCTION set_owner_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Si owner_id no está seteado, usar current_root_owner_id()
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := public.current_root_owner_id();
  END IF;
  
  -- Si aún es NULL (usuario sin root_owner_id), usar user_id
  IF NEW.owner_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.owner_id := NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a todas las tablas que usan owner_id
DROP TRIGGER IF EXISTS trigger_set_owner_id_clients ON clients;
CREATE TRIGGER trigger_set_owner_id_clients
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_owner_id_products ON products;
CREATE TRIGGER trigger_set_owner_id_products
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_owner_id_projects ON projects;
CREATE TRIGGER trigger_set_owner_id_projects
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_owner_id_invoices ON invoices;
CREATE TRIGGER trigger_set_owner_id_invoices
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_owner_id_drivers ON drivers;
CREATE TRIGGER trigger_set_owner_id_drivers
  BEFORE INSERT ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_owner_id_vehicles ON vehicles;
CREATE TRIGGER trigger_set_owner_id_vehicles
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_owner_id_delivery_notes ON delivery_notes;
CREATE TRIGGER trigger_set_owner_id_delivery_notes
  BEFORE INSERT ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_id_on_insert();

-- 2. Asegurar que TODOS los usuarios tengan root_owner_id seteado en user_profiles
UPDATE public.user_profiles
SET root_owner_id = CASE
  WHEN parent_user_id IS NULL THEN user_id  -- Es owner, root_owner_id = su propio ID
  ELSE parent_user_id  -- Es empleado, root_owner_id = ID del owner
END
WHERE root_owner_id IS NULL;

-- 3. Asegurar que TODOS los usuarios tengan un registro en user_profiles
-- Usar NOT EXISTS en lugar de ON CONFLICT para evitar problemas con constraints
INSERT INTO public.user_profiles (user_id, root_owner_id, display_name, is_active)
SELECT id, id, COALESCE(raw_user_meta_data->>'full_name', email, 'Usuario'), true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
);

-- 4. Actualizar registros existentes donde owner_id es NULL
UPDATE public.clients c
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = c.user_id),
  c.user_id
)
WHERE owner_id IS NULL;

UPDATE public.products p
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = p.user_id),
  p.user_id
)
WHERE owner_id IS NULL;

UPDATE public.projects pr
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = pr.user_id),
  pr.user_id
)
WHERE owner_id IS NULL;

UPDATE public.invoices i
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = i.user_id),
  i.user_id
)
WHERE owner_id IS NULL;

-- 5. Fix specific user: aguacostassuprema@gmail.com (49a634f7-7f99-4a15-8468-32d1225aee31)
DO $$
DECLARE
  v_user_id UUID := '49a634f7-7f99-4a15-8468-32d1225aee31';
  v_email TEXT := 'aguacostassuprema@gmail.com';
BEGIN
  -- Check if profile exists
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = v_user_id) THEN
    -- Update existing profile
    UPDATE public.user_profiles 
    SET root_owner_id = COALESCE(root_owner_id, v_user_id),
        is_active = true
    WHERE user_id = v_user_id;
  ELSE
    -- Insert new profile with required display_name
    INSERT INTO public.user_profiles (user_id, root_owner_id, display_name, is_active)
    VALUES (v_user_id, v_user_id, v_email, true);
  END IF;
  
  RAISE NOTICE 'Fixed user profile for %', v_email;
END $$;

-- 6. Create company_settings row if missing for the user
INSERT INTO public.company_settings (user_id, company_name)
SELECT '49a634f7-7f99-4a15-8468-32d1225aee31', 'Mi Empresa'
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings 
  WHERE user_id = '49a634f7-7f99-4a15-8468-32d1225aee31'
);

-- Status message
SELECT 'Script 70: User permissions fixed successfully' as status;

COMMIT;
