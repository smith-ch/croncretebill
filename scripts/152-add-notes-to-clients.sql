-- Agregar columna notas al formulario de clientes (creación/edición).
-- Ejecutar en Supabase SQL Editor si la columna no existe.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.clients.notes IS 'Notas internas sobre el cliente (opcional).';
