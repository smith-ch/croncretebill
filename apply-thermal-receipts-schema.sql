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
    emailed_at TIMESTAMP WITH TIME ZONE, -- Cuando se envió por email
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_user_id ON public.thermal_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_client_id ON public.thermal_receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_date ON public.thermal_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_number ON public.thermal_receipts(receipt_number);

CREATE INDEX IF NOT EXISTS idx_thermal_receipt_items_receipt_id ON public.thermal_receipt_items(thermal_receipt_id);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON public.payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice_id ON public.payment_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_date ON public.payment_receipts(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_number ON public.payment_receipts(receipt_number);

-- Políticas de Row Level Security (RLS)
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
CREATE POLICY "Users can view items of their thermal receipts" ON public.thermal_receipt_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.thermal_receipts tr 
            WHERE tr.id = thermal_receipt_items.thermal_receipt_id 
            AND tr.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert items to their thermal receipts" ON public.thermal_receipt_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.thermal_receipts tr 
            WHERE tr.id = thermal_receipt_items.thermal_receipt_id 
            AND tr.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items of their thermal receipts" ON public.thermal_receipt_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.thermal_receipts tr 
            WHERE tr.id = thermal_receipt_items.thermal_receipt_id 
            AND tr.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items of their thermal receipts" ON public.thermal_receipt_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.thermal_receipts tr 
            WHERE tr.id = thermal_receipt_items.thermal_receipt_id 
            AND tr.user_id = auth.uid()
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

-- Función para generar números automáticos de recibos térmicos
CREATE OR REPLACE FUNCTION generate_thermal_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := 'TRM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD(EXTRACT(epoch FROM NOW())::TEXT, 10, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar números automáticos de comprobantes de pago
CREATE OR REPLACE FUNCTION generate_payment_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := 'CPG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD(EXTRACT(epoch FROM NOW())::TEXT, 10, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auto-numerar
DROP TRIGGER IF EXISTS thermal_receipt_number_trigger ON public.thermal_receipts;
CREATE TRIGGER thermal_receipt_number_trigger
    BEFORE INSERT ON public.thermal_receipts
    FOR EACH ROW
    EXECUTE FUNCTION generate_thermal_receipt_number();

DROP TRIGGER IF EXISTS payment_receipt_number_trigger ON public.payment_receipts;
CREATE TRIGGER payment_receipt_number_trigger
    BEFORE INSERT ON public.payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_receipt_number();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS thermal_receipts_updated_at ON public.thermal_receipts;
CREATE TRIGGER thermal_receipts_updated_at
    BEFORE UPDATE ON public.thermal_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS payment_receipts_updated_at ON public.payment_receipts;
CREATE TRIGGER payment_receipts_updated_at
    BEFORE UPDATE ON public.payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear comprobante de pago automáticamente cuando se marca una factura como pagada
CREATE OR REPLACE FUNCTION auto_create_payment_receipt()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si la factura cambió de no pagada a pagada
    IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
        INSERT INTO public.payment_receipts (
            user_id,
            invoice_id,
            payment_method,
            amount_paid,
            receipt_type,
            issued_by,
            notes
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'cash', -- Por defecto efectivo, se puede cambiar después
            NEW.total_amount,
            'formal',
            'Sistema automático',
            'Comprobante generado automáticamente al marcar factura como pagada'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_payment_receipt_trigger ON public.invoices;
CREATE TRIGGER auto_payment_receipt_trigger
    AFTER UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_payment_receipt();
