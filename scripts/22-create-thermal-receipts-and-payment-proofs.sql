-- Script para crear tablas de facturas térmicas y comprobantes de pago
-- Fecha: 2025-09-13

-- Tabla para facturas térmicas/recibos rápidos
CREATE TABLE IF NOT EXISTS public.thermal_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    receipt_number VARCHAR(50) NOT NULL,
    client_name VARCHAR(255), -- Para clientes ocasionales sin registro
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash', -- cash, card, transfer
    amount_received DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    qr_code TEXT, -- Código QR para verificación
    verification_code VARCHAR(20), -- Código corto para verificación
    digital_receipt_url TEXT, -- URL del recibo digital
    notes TEXT,
    printed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para items de facturas térmicas
CREATE TABLE IF NOT EXISTS public.thermal_receipt_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thermal_receipt_id UUID REFERENCES public.thermal_receipts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL, -- Nombre del producto/servicio
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para comprobantes de pago
CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method VARCHAR(50) DEFAULT 'cash', -- cash, card, transfer, check
    amount_paid DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) DEFAULT 0,
    bank_reference VARCHAR(100), -- Para transferencias
    notes TEXT,
    receipt_type VARCHAR(20) DEFAULT 'formal', -- formal, simple
    issued_by VARCHAR(255), -- Quien emitió el comprobante
    client_signature BOOLEAN DEFAULT FALSE,
    pdf_url TEXT, -- URL del PDF generado
    emailed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_user_id ON public.thermal_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_receipt_number ON public.thermal_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_created_at ON public.thermal_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_verification_code ON public.thermal_receipts(verification_code);

CREATE INDEX IF NOT EXISTS idx_thermal_receipt_items_receipt_id ON public.thermal_receipt_items(thermal_receipt_id);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON public.payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice_id ON public.payment_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON public.payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_date ON public.payment_receipts(payment_date);

-- Políticas de Row Level Security
ALTER TABLE public.thermal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thermal_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Políticas para thermal_receipts
CREATE POLICY "Users can view their own thermal receipts" ON public.thermal_receipts 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thermal receipts" ON public.thermal_receipts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thermal receipts" ON public.thermal_receipts 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thermal receipts" ON public.thermal_receipts 
FOR DELETE USING (auth.uid() = user_id);

-- Políticas para thermal_receipt_items
CREATE POLICY "Users can view their thermal receipt items" ON public.thermal_receipt_items 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = thermal_receipt_items.thermal_receipt_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert thermal receipt items" ON public.thermal_receipt_items 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = thermal_receipt_items.thermal_receipt_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update thermal receipt items" ON public.thermal_receipt_items 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = thermal_receipt_items.thermal_receipt_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete thermal receipt items" ON public.thermal_receipt_items 
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = thermal_receipt_items.thermal_receipt_id 
        AND user_id = auth.uid()
    )
);

-- Políticas para payment_receipts
CREATE POLICY "Users can view their own payment receipts" ON public.payment_receipts 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment receipts" ON public.payment_receipts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment receipts" ON public.payment_receipts 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment receipts" ON public.payment_receipts 
FOR DELETE USING (auth.uid() = user_id);

-- Función para generar números de recibo térmico
CREATE OR REPLACE FUNCTION generate_thermal_receipt_number(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    receipt_count INTEGER;
    receipt_number TEXT;
BEGIN
    -- Contar recibos existentes para este usuario
    SELECT COUNT(*) + 1 INTO receipt_count
    FROM thermal_receipts 
    WHERE user_id = user_uuid;
    
    -- Generar número con formato: TR-YYYYMMDD-NNNN
    receipt_number := 'TR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(receipt_count::TEXT, 4, '0');
    
    RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Función para generar números de comprobante de pago
CREATE OR REPLACE FUNCTION generate_payment_receipt_number(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    receipt_count INTEGER;
    receipt_number TEXT;
BEGIN
    -- Contar comprobantes existentes para este usuario
    SELECT COUNT(*) + 1 INTO receipt_count
    FROM payment_receipts 
    WHERE user_id = user_uuid;
    
    -- Generar número con formato: CP-YYYYMMDD-NNNN
    receipt_number := 'CP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(receipt_count::TEXT, 4, '0');
    
    RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de verificación
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar comprobantes automáticamente cuando una factura es pagada
CREATE OR REPLACE FUNCTION auto_generate_payment_receipt()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo generar si el status cambió a 'paid' y no existía antes
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO payment_receipts (
            user_id,
            invoice_id,
            receipt_number,
            payment_date,
            amount_paid,
            receipt_type,
            notes
        ) VALUES (
            NEW.user_id,
            NEW.id,
            generate_payment_receipt_number(NEW.user_id),
            NOW(),
            NEW.total_amount,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM clients 
                    WHERE id = NEW.client_id 
                    AND (rnc IS NOT NULL AND rnc != '')
                ) THEN 'formal'
                ELSE 'simple'
            END,
            'Comprobante generado automáticamente'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_auto_payment_receipt
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_payment_receipt();

-- Comentarios en las tablas
COMMENT ON TABLE public.thermal_receipts IS 'Facturas térmicas para impresión rápida en recibos de 80mm';
COMMENT ON TABLE public.thermal_receipt_items IS 'Items/productos de las facturas térmicas';
COMMENT ON TABLE public.payment_receipts IS 'Comprobantes de pago generados automáticamente';

COMMENT ON COLUMN public.thermal_receipts.qr_code IS 'Código QR para verificación digital del recibo';
COMMENT ON COLUMN public.thermal_receipts.verification_code IS 'Código corto para verificación manual';
COMMENT ON COLUMN public.thermal_receipts.digital_receipt_url IS 'URL del recibo digital verificable';
COMMENT ON COLUMN public.payment_receipts.receipt_type IS 'Tipo de comprobante: formal (con RNC) o simple (cliente ocasional)';
