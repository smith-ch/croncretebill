-- Script 153: RLS en product_prices para empleados (mismo patrón que productos en script 46)
-- Sin esto, aunque el front use dataUserId del owner, Supabase filtra por auth.uid() y los empleados no ven precios múltiples.

DROP POLICY IF EXISTS "Employees can view owner product prices" ON public.product_prices;
CREATE POLICY "Employees can view owner product prices" ON public.product_prices
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

DROP POLICY IF EXISTS "Employees can insert owner product prices" ON public.product_prices;
CREATE POLICY "Employees can insert owner product prices" ON public.product_prices
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

DROP POLICY IF EXISTS "Employees can update owner product prices" ON public.product_prices;
CREATE POLICY "Employees can update owner product prices" ON public.product_prices
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
  )
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

DROP POLICY IF EXISTS "Employees can delete owner product prices" ON public.product_prices;
CREATE POLICY "Employees can delete owner product prices" ON public.product_prices
  FOR DELETE
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

COMMENT ON POLICY "Employees can view owner product prices" ON public.product_prices IS
  'Permite a empleados activos leer precios múltiples del owner (facturas, recibos).';
