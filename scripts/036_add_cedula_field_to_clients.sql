-- Script para agregar el campo cedula a la tabla de clientes
-- Fecha: 2025-12-03
-- Descripción: Agrega el campo cedula (cédula de identidad) a la tabla clients

-- Agregar columna cedula si no existe
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS cedula VARCHAR(15);

-- Agregar comentario a la columna
COMMENT ON COLUMN public.clients.cedula IS 'Cédula de identidad del cliente (formato: 001-1234567-8)';

-- Crear índice para búsquedas rápidas por cédula
CREATE INDEX IF NOT EXISTS idx_clients_cedula ON public.clients(cedula);

-- Agregar constraint para validar formato de cédula (11 dígitos con o sin guiones)
ALTER TABLE public.clients 
ADD CONSTRAINT check_cedula_format 
CHECK (
  cedula IS NULL OR 
  LENGTH(REPLACE(REPLACE(cedula, '-', ''), ' ', '')) = 11
);

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Campo cedula agregado exitosamente a la tabla clients';
END $$;
