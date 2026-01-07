-- Script 98: Agregar tasa de cambio USD/DOP a company_settings
-- Para permitir conversión de precios en facturas, presupuestos y recibos

-- Agregar columna para tasa de cambio
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS usd_exchange_rate DECIMAL(10,2) DEFAULT 58.50;

-- Comentario explicativo
COMMENT ON COLUMN company_settings.usd_exchange_rate IS 'Tasa de cambio DOP a USD (ej: 58.50 significa 1 USD = 58.50 DOP)';

-- Actualizar registros existentes con tasa de cambio actual (aproximada)
UPDATE company_settings 
SET usd_exchange_rate = 58.50 
WHERE usd_exchange_rate IS NULL;

-- Verificar
SELECT 
  user_id,
  company_name,
  currency_code,
  currency_symbol,
  usd_exchange_rate
FROM company_settings
LIMIT 5;
