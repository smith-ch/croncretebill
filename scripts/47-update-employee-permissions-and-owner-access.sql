-- Script 47: Actualizar permisos del empleado y habilitar acceso bidireccional owner-employee
-- Este script:
-- 1. Quita acceso a inventario del empleado
-- 2. Crea políticas para que el owner vea lo que crea el empleado

-- 1. Actualizar permisos del empleado (quitar acceso a inventario)
UPDATE user_profiles
SET can_manage_inventory = false
WHERE email = 'empleado@test.com';

-- 2. Políticas RLS bidireccionales: Owner puede ver lo que crea el empleado

-- CLIENTS: Owner puede ver clientes creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee clients" ON clients;
CREATE POLICY "Owners can view employee clients"
  ON clients FOR SELECT
  USING (
    -- El owner puede ver clientes donde user_id = owner_id
    -- Y también puede ver clientes creados por sus empleados
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- PRODUCTS: Owner puede ver productos creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee products" ON products;
CREATE POLICY "Owners can view employee products"
  ON products FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- SERVICES: Owner puede ver servicios creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee services" ON services;
CREATE POLICY "Owners can view employee services"
  ON services FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- INVOICES: Owner puede ver facturas creadas por sus empleados
DROP POLICY IF EXISTS "Owners can view employee invoices" ON invoices;
CREATE POLICY "Owners can view employee invoices"
  ON invoices FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- INVOICE_ITEMS: Owner puede ver items de facturas creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee invoice items" ON invoice_items;
CREATE POLICY "Owners can view employee invoice items"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND (
        invoices.user_id = auth.uid()
        OR
        invoices.user_id IN (
          SELECT user_id FROM user_profiles 
          WHERE parent_user_id = auth.uid()
        )
      )
    )
  );

-- THERMAL_RECEIPTS: Owner puede ver recibos térmicos creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee thermal receipts" ON thermal_receipts;
CREATE POLICY "Owners can view employee thermal receipts"
  ON thermal_receipts FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- PAYMENT_RECEIPTS: Owner puede ver comprobantes creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee payment receipts" ON payment_receipts;
CREATE POLICY "Owners can view employee payment receipts"
  ON payment_receipts FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- EXPENSES: Owner puede ver gastos creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee expenses" ON expenses;
CREATE POLICY "Owners can view employee expenses"
  ON expenses FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- PROJECTS: Owner puede ver proyectos creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee projects" ON projects;
CREATE POLICY "Owners can view employee projects"
  ON projects FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- DELIVERY_NOTES: Owner puede ver notas de entrega creadas por sus empleados
DROP POLICY IF EXISTS "Owners can view employee delivery notes" ON delivery_notes;
CREATE POLICY "Owners can view employee delivery notes"
  ON delivery_notes FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- VEHICLES: Owner puede ver vehículos creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee vehicles" ON vehicles;
CREATE POLICY "Owners can view employee vehicles"
  ON vehicles FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- DRIVERS: Owner puede ver conductores creados por sus empleados
DROP POLICY IF EXISTS "Owners can view employee drivers" ON drivers;
CREATE POLICY "Owners can view employee drivers"
  ON drivers FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT user_id FROM user_profiles 
      WHERE parent_user_id = auth.uid()
    )
  );

-- Verificación
SELECT 
  email,
  can_create_invoices,
  can_manage_clients,
  can_manage_inventory
FROM user_profiles
WHERE email = 'empleado@test.com';
