-- URGENTE: Que los usuarios vuelvan a ver sus facturas (invoices).
-- Causa: RLS exige owner_id = current_root_owner_id(); si owner_id es NULL nadie ve filas.
-- Ejecutar en Supabase SQL Editor.

-- 1. Asegurar columna owner_id en invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Rellenar owner_id desde user_id en todas las facturas existentes
UPDATE public.invoices i
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = i.user_id LIMIT 1),
  i.user_id
)
WHERE owner_id IS NULL;

-- 3. Índice para RLS
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);

-- 4. Políticas RLS: permitir ver por user_id O por owner_id (compatibilidad con datos antiguos)
DROP POLICY IF EXISTS "Users can view company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Employees can view owner invoices" ON public.invoices;
DROP POLICY IF EXISTS "Owners can view employee invoices" ON public.invoices;

CREATE POLICY "invoices_select_visible"
  ON public.invoices FOR SELECT
  USING (
    (owner_id IS NOT NULL AND owner_id = public.current_root_owner_id())
    OR
    (owner_id IS NULL AND user_id = public.current_root_owner_id())
  );

-- 5. INSERT: permitir por user_id o owner_id
DROP POLICY IF EXISTS "Users can insert company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices insert policy" ON public.invoices;
DROP POLICY IF EXISTS "Employees can create owner invoices" ON public.invoices;

CREATE POLICY "invoices_insert_visible"
  ON public.invoices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1) = user_id
    OR owner_id = public.current_root_owner_id()
    OR (owner_id IS NULL AND user_id = public.current_root_owner_id())
  );

-- 6. UPDATE y DELETE: mismo criterio que SELECT
DROP POLICY IF EXISTS "Users can update company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.invoices;

CREATE POLICY "invoices_update_visible"
  ON public.invoices FOR UPDATE
  USING (
    (owner_id IS NOT NULL AND owner_id = public.current_root_owner_id())
    OR (owner_id IS NULL AND user_id = public.current_root_owner_id())
  );

DROP POLICY IF EXISTS "Users can delete company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.invoices;

CREATE POLICY "invoices_delete_visible"
  ON public.invoices FOR DELETE
  USING (
    (owner_id IS NOT NULL AND owner_id = public.current_root_owner_id())
    OR (owner_id IS NULL AND user_id = public.current_root_owner_id())
  );

-- 7. Asegurar que RLS sigue activo
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
