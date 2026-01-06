-- Script 46: Agregar políticas RLS para que empleados accedan a datos del owner
-- Los empleados necesitan ver clientes, productos y servicios del owner para crear facturas

-- ============================================================================
-- CLIENTES: Empleados pueden ver y gestionar clientes del owner
-- ============================================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Employees can view owner clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can create owner clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can update owner clients" ON public.clients;

-- Empleados pueden VER clientes del owner
CREATE POLICY "Employees can view owner clients" ON public.clients
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- Empleados con permiso pueden CREAR clientes para el owner
CREATE POLICY "Employees can create owner clients" ON public.clients
  FOR INSERT 
  WITH CHECK (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_clients = true
      AND is_active = true
    )
  );

-- Empleados con permiso pueden ACTUALIZAR clientes del owner
CREATE POLICY "Employees can update owner clients" ON public.clients
  FOR UPDATE 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_clients = true
      AND is_active = true
    )
  );

-- ============================================================================
-- PRODUCTOS: Empleados pueden ver y gestionar productos del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner products" ON public.products;
DROP POLICY IF EXISTS "Employees can create owner products" ON public.products;
DROP POLICY IF EXISTS "Employees can update owner products" ON public.products;

-- Empleados pueden VER productos del owner
CREATE POLICY "Employees can view owner products" ON public.products
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- Empleados con permiso pueden CREAR productos para el owner
CREATE POLICY "Employees can create owner products" ON public.products
  FOR INSERT 
  WITH CHECK (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_inventory = true
      AND is_active = true
    )
  );

-- Empleados con permiso pueden ACTUALIZAR productos del owner
CREATE POLICY "Employees can update owner products" ON public.products
  FOR UPDATE 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_inventory = true
      AND is_active = true
    )
  );

-- ============================================================================
-- SERVICIOS: Empleados pueden ver y gestionar servicios del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner services" ON public.services;
DROP POLICY IF EXISTS "Employees can create owner services" ON public.services;
DROP POLICY IF EXISTS "Employees can update owner services" ON public.services;

-- Empleados pueden VER servicios del owner
CREATE POLICY "Employees can view owner services" ON public.services
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- Empleados con permiso pueden CREAR servicios para el owner
CREATE POLICY "Employees can create owner services" ON public.services
  FOR INSERT 
  WITH CHECK (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_inventory = true
      AND is_active = true
    )
  );

-- Empleados con permiso pueden ACTUALIZAR servicios del owner
CREATE POLICY "Employees can update owner services" ON public.services
  FOR UPDATE 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_inventory = true
      AND is_active = true
    )
  );

-- ============================================================================
-- FACTURAS: Empleados pueden crear facturas a nombre del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner invoices" ON public.invoices;
DROP POLICY IF EXISTS "Employees can create owner invoices" ON public.invoices;

-- Empleados pueden VER facturas del owner
CREATE POLICY "Employees can view owner invoices" ON public.invoices
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- Empleados con permiso pueden CREAR facturas para el owner
CREATE POLICY "Employees can create owner invoices" ON public.invoices
  FOR INSERT 
  WITH CHECK (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_create_invoices = true
      AND is_active = true
    )
  );

-- ============================================================================
-- ITEMS DE FACTURAS: Empleados pueden agregar items a facturas del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Employees can create owner invoice items" ON public.invoice_items;

-- Empleados pueden VER items de facturas del owner
CREATE POLICY "Employees can view owner invoice items" ON public.invoice_items
  FOR SELECT 
  USING (
    invoice_id IN (
      SELECT i.id 
      FROM public.invoices i
      INNER JOIN public.user_profiles up ON i.user_id = up.parent_user_id
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id IS NOT NULL
      AND up.is_active = true
    )
  );

-- Empleados pueden CREAR items para facturas del owner
CREATE POLICY "Employees can create owner invoice items" ON public.invoice_items
  FOR INSERT 
  WITH CHECK (
    invoice_id IN (
      SELECT i.id 
      FROM public.invoices i
      INNER JOIN public.user_profiles up ON i.user_id = up.parent_user_id
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id IS NOT NULL
      AND up.can_create_invoices = true
      AND up.is_active = true
    )
  );

-- ============================================================================
-- COMPANY SETTINGS: Empleados pueden ver configuración de la empresa del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner company settings" ON public.company_settings;

-- Empleados pueden VER configuración de la empresa del owner
CREATE POLICY "Employees can view owner company settings" ON public.company_settings
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- ============================================================================
-- PROYECTOS: Empleados pueden ver proyectos del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner projects" ON public.projects;

-- Empleados pueden VER proyectos del owner
CREATE POLICY "Employees can view owner projects" ON public.projects
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- ============================================================================
-- VEHÍCULOS: Empleados pueden ver vehículos del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner vehicles" ON public.vehicles;

-- Empleados pueden VER vehículos del owner
CREATE POLICY "Employees can view owner vehicles" ON public.vehicles
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- ============================================================================
-- CHOFERES: Empleados pueden ver choferes del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner drivers" ON public.drivers;

-- Empleados pueden VER choferes del owner
CREATE POLICY "Employees can view owner drivers" ON public.drivers
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- ============================================================================
-- CATEGORÍAS: Empleados pueden ver categorías del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner categories" ON public.categories;

-- Empleados pueden VER categorías del owner
CREATE POLICY "Employees can view owner categories" ON public.categories
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- ============================================================================
-- NOTAS DE ENTREGA: Empleados pueden ver notas de entrega del owner
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view owner delivery notes" ON public.delivery_notes;

-- Empleados pueden VER notas de entrega del owner
CREATE POLICY "Employees can view owner delivery notes" ON public.delivery_notes
  FOR SELECT 
  USING (
    user_id IN (
      SELECT parent_user_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND is_active = true
    )
  );

-- ============================================================================
-- COMENTARIOS Y LOGS
-- ============================================================================

COMMENT ON POLICY "Employees can view owner clients" ON public.clients IS 
  'Permite a los empleados ver clientes de su owner para crear facturas';

COMMENT ON POLICY "Employees can view owner products" ON public.products IS 
  'Permite a los empleados ver productos de su owner para crear facturas';

COMMENT ON POLICY "Employees can view owner services" ON public.services IS 
  'Permite a los empleados ver servicios de su owner para crear facturas';

COMMENT ON POLICY "Employees can view owner invoices" ON public.invoices IS 
  'Permite a los empleados ver facturas de su owner';

COMMENT ON POLICY "Employees can create owner invoices" ON public.invoices IS 
  'Permite a los empleados con permiso can_create_invoices crear facturas a nombre del owner';

-- Log de ejecución
DO $$
BEGIN
  RAISE NOTICE 'Script 46 ejecutado exitosamente: Políticas RLS para empleados creadas';
END $$;
