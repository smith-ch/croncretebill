-- Script para agregar columnas de personalización de facturas
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas de personalización de facturas a company_settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS invoice_primary_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS invoice_secondary_color TEXT DEFAULT '#64748b',
ADD COLUMN IF NOT EXISTS invoice_format TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS invoice_footer_message TEXT,
ADD COLUMN IF NOT EXISTS invoice_show_logo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_auto_number BOOLEAN DEFAULT true;

-- Comentarios descriptivos
COMMENT ON COLUMN company_settings.invoice_primary_color IS 'Color principal para facturas (hex)';
COMMENT ON COLUMN company_settings.invoice_secondary_color IS 'Color secundario para facturas (hex)';
COMMENT ON COLUMN company_settings.invoice_format IS 'Formato de factura: standard, modern, compact, detailed';
COMMENT ON COLUMN company_settings.invoice_footer_message IS 'Mensaje personalizado en el pie de factura';
COMMENT ON COLUMN company_settings.invoice_show_logo IS 'Mostrar logo en facturas';
COMMENT ON COLUMN company_settings.invoice_auto_number IS 'Numeración automática de facturas';

-- Actualizar configuraciones existentes con valores por defecto
UPDATE company_settings 
SET 
  invoice_primary_color = COALESCE(invoice_primary_color, '#3b82f6'),
  invoice_secondary_color = COALESCE(invoice_secondary_color, '#64748b'),
  invoice_format = COALESCE(invoice_format, 'standard'),
  invoice_show_logo = COALESCE(invoice_show_logo, true),
  invoice_auto_number = COALESCE(invoice_auto_number, true)
WHERE invoice_primary_color IS NULL 
   OR invoice_secondary_color IS NULL 
   OR invoice_format IS NULL
   OR invoice_show_logo IS NULL
   OR invoice_auto_number IS NULL;
