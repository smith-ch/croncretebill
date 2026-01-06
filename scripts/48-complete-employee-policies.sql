-- Script 48: Completar políticas RLS para empleados
-- Este script:
-- 1. Actualiza permisos del empleado (quitar inventario)
-- 2. Agrega políticas faltantes para thermal_receipts, payment_receipts, expenses
-- 3. Asegura que empleados puedan crear registros que pertenezcan al owner

-- 1. Actualizar permisos del empleado (quitar acceso a inventario)
UPDATE user_profiles
SET can_manage_inventory = false
WHERE email = 'empleado@test.com';

-- 2. THERMAL_RECEIPTS - Empleados pueden ver y crear recibos del owner

-- Política SELECT para empleados
DROP POLICY IF EXISTS "Employees can view owner thermal receipts" ON thermal_receipts;
CREATE POLICY "Employees can view owner thermal receipts"
  ON thermal_receipts FOR SELECT
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

-- Política INSERT para empleados (pueden crear recibos)
DROP POLICY IF EXISTS "Employees can create owner thermal receipts" ON thermal_receipts;
CREATE POLICY "Employees can create owner thermal receipts"
  ON thermal_receipts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_create_invoices = true
    )
  );

-- Política UPDATE para empleados
DROP POLICY IF EXISTS "Employees can update owner thermal receipts" ON thermal_receipts;
CREATE POLICY "Employees can update owner thermal receipts"
  ON thermal_receipts FOR UPDATE
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_create_invoices = true
    )
  );

-- 3. THERMAL_RECEIPT_ITEMS - Empleados pueden ver y crear items

DROP POLICY IF EXISTS "Employees can view owner thermal receipt items" ON thermal_receipt_items;
CREATE POLICY "Employees can view owner thermal receipt items"
  ON thermal_receipt_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM thermal_receipts 
      WHERE thermal_receipts.id = thermal_receipt_items.thermal_receipt_id 
      AND thermal_receipts.user_id IN (
        SELECT parent_user_id FROM user_profiles 
        WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Employees can create owner thermal receipt items" ON thermal_receipt_items;
CREATE POLICY "Employees can create owner thermal receipt items"
  ON thermal_receipt_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_create_invoices = true
    )
  );

-- 4. PAYMENT_RECEIPTS - Empleados pueden ver y crear comprobantes

DROP POLICY IF EXISTS "Employees can view owner payment receipts" ON payment_receipts;
CREATE POLICY "Employees can view owner payment receipts"
  ON payment_receipts FOR SELECT
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Employees can create owner payment receipts" ON payment_receipts;
CREATE POLICY "Employees can create owner payment receipts"
  ON payment_receipts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_create_invoices = true
    )
  );

DROP POLICY IF EXISTS "Employees can update owner payment receipts" ON payment_receipts;
CREATE POLICY "Employees can update owner payment receipts"
  ON payment_receipts FOR UPDATE
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_create_invoices = true
    )
  );

-- 5. EXPENSES - Empleados pueden ver y crear gastos

DROP POLICY IF EXISTS "Employees can view owner expenses" ON expenses;
CREATE POLICY "Employees can view owner expenses"
  ON expenses FOR SELECT
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Employees can create owner expenses" ON expenses;
CREATE POLICY "Employees can create owner expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Employees can update owner expenses" ON expenses;
CREATE POLICY "Employees can update owner expenses"
  ON expenses FOR UPDATE
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

-- 6. EXPENSE_CATEGORIES - Empleados pueden ver y crear categorías

DROP POLICY IF EXISTS "Employees can view owner expense categories" ON expense_categories;
CREATE POLICY "Employees can view owner expense categories"
  ON expense_categories FOR SELECT
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Employees can create owner expense categories" ON expense_categories;
CREATE POLICY "Employees can create owner expense categories"
  ON expense_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
    )
  );

-- 6. CLIENTS - Empleados pueden ver y gestionar clientes del owner

-- Política SELECT para empleados
DROP POLICY IF EXISTS "Employees can view owner clients" ON clients;
CREATE POLICY "Employees can view owner clients"
  ON clients FOR SELECT
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

-- Política INSERT para empleados (pueden crear clientes)
DROP POLICY IF EXISTS "Employees can create owner clients" ON clients;
CREATE POLICY "Employees can create owner clients"
  ON clients FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_clients = true
    )
  );

-- Política UPDATE para empleados
DROP POLICY IF EXISTS "Employees can update owner clients" ON clients;
CREATE POLICY "Employees can update owner clients"
  ON clients FOR UPDATE
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() AND parent_user_id IS NOT NULL
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_clients = true
    )
  );

-- Política DELETE para empleados
DROP POLICY IF EXISTS "Employees can delete owner clients" ON clients;
CREATE POLICY "Employees can delete owner clients"
  ON clients FOR DELETE
  USING (
    user_id IN (
      SELECT parent_user_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND parent_user_id IS NOT NULL
      AND can_manage_clients = true
    )
  );

-- Verificación
SELECT 
  email,
  can_create_invoices,
  can_manage_clients,
  can_manage_inventory,
  parent_user_id
FROM user_profiles
WHERE email = 'empleado@test.com';

-- Listar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE policyname LIKE '%Employee%'
ORDER BY tablename, policyname;
