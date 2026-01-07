-- Script 99: Tabla para registro de tasas de cambio históricas
-- Almacena el historial de tasas para análisis

CREATE TABLE IF NOT EXISTS exchange_rates_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from VARCHAR(3) NOT NULL DEFAULT 'USD',
  currency_to VARCHAR(3) NOT NULL DEFAULT 'DOP',
  rate DECIMAL(10,4) NOT NULL,
  buy_rate DECIMAL(10,4),
  sell_rate DECIMAL(10,4),
  source VARCHAR(100) DEFAULT 'manual',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates_history(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates_history(currency_from, currency_to);

-- Comentarios
COMMENT ON TABLE exchange_rates_history IS 'Historial de tasas de cambio para análisis y auditoría';
COMMENT ON COLUMN exchange_rates_history.buy_rate IS 'Tasa de compra';
COMMENT ON COLUMN exchange_rates_history.sell_rate IS 'Tasa de venta';
COMMENT ON COLUMN exchange_rates_history.source IS 'Fuente de la tasa (api, manual, banco_central)';

-- Insertar tasa actual como primera entrada
INSERT INTO exchange_rates_history (currency_from, currency_to, rate, buy_rate, sell_rate, source)
VALUES ('USD', 'DOP', 63.18, 62.42, 63.93, 'manual')
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE exchange_rates_history ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer el historial
CREATE POLICY "Anyone can read exchange rates history" 
ON exchange_rates_history
FOR SELECT
TO authenticated
USING (true);

-- Verificar
SELECT * FROM exchange_rates_history ORDER BY fetched_at DESC LIMIT 5;
