-- Crear tabla para precios múltiples de servicios
-- Este script crea la infraestructura para manejar precios múltiples por servicio

-- Crear tabla service_prices
CREATE TABLE IF NOT EXISTS service_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price_name TEXT,
    price DECIMAL(10,2) NOT NULL,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    description TEXT,
    valid_from DATE,
    valid_until DATE,
    customer_type TEXT,
    customer_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT service_prices_price_positive CHECK (price >= 0),
    CONSTRAINT service_prices_quantity_valid CHECK (
        min_quantity IS NULL OR min_quantity >= 1
    ),
    CONSTRAINT service_prices_quantity_range CHECK (
        max_quantity IS NULL OR min_quantity IS NULL OR max_quantity >= min_quantity
    ),
    CONSTRAINT service_prices_date_range CHECK (
        valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from
    )
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_service_prices_service_id ON service_prices(service_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_is_default ON service_prices(service_id, is_default);
CREATE INDEX IF NOT EXISTS idx_service_prices_validity ON service_prices(service_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_service_prices_customer ON service_prices(service_id, customer_type, customer_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_service_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_prices_updated_at
    BEFORE UPDATE ON service_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_service_prices_updated_at();

-- Función para asegurar que solo haya un precio por defecto por servicio
CREATE OR REPLACE FUNCTION ensure_single_default_service_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está marcando como default
    IF NEW.is_default = TRUE THEN
        -- Desmarcar otros precios como default para este servicio
        UPDATE service_prices 
        SET is_default = FALSE 
        WHERE service_id = NEW.service_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_service_price
    BEFORE INSERT OR UPDATE ON service_prices
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION ensure_single_default_service_price();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios precios de servicios
CREATE POLICY service_prices_user_policy ON service_prices
    FOR ALL USING (
        service_id IN (
            SELECT id FROM services WHERE user_id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE service_prices IS 'Precios múltiples para servicios con validez por fechas, cantidades y tipos de cliente';
COMMENT ON COLUMN service_prices.service_id IS 'Referencia al servicio al que pertenece este precio';
COMMENT ON COLUMN service_prices.price_name IS 'Nombre descriptivo del precio (ej: "Precio por horas", "Precio VIP")';
COMMENT ON COLUMN service_prices.price IS 'Valor del precio';
COMMENT ON COLUMN service_prices.min_quantity IS 'Cantidad mínima para aplicar este precio';
COMMENT ON COLUMN service_prices.max_quantity IS 'Cantidad máxima para aplicar este precio (NULL = ilimitado)';
COMMENT ON COLUMN service_prices.valid_from IS 'Fecha desde la cual el precio es válido';
COMMENT ON COLUMN service_prices.valid_until IS 'Fecha hasta la cual el precio es válido';
COMMENT ON COLUMN service_prices.customer_type IS 'Tipo de cliente al que se aplica (ej: "VIP", "Mayorista")';
COMMENT ON COLUMN service_prices.customer_id IS 'Cliente específico al que se aplica (opcional)';
COMMENT ON COLUMN service_prices.is_default IS 'Indica si este es el precio por defecto del servicio';