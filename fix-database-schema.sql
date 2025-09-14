-- ===================================
-- SCRIPT PARA CREAR SISTEMA DE FACTURAS TÉRMICAS Y COMPROBANTES DE PAGO
-- ===================================

-- Primero, crear las tablas principales
CREATE TABLE IF NOT EXISTS public.thermal_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    client_id UUID,
    receipt_number VARCHAR(50) NOT NULL,
    client_name VARCHAR(255),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    amount_received DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    qr_code TEXT,
    verification_code VARCHAR(20),
    digital_receipt_url TEXT,
    notes TEXT,
    printed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thermal_receipt_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thermal_receipt_id UUID NOT NULL,
    product_id UUID,
    service_id UUID,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    invoice_id UUID,
    receipt_number VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method VARCHAR(50) DEFAULT 'cash',
    amount_paid DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) DEFAULT 0,
    bank_reference VARCHAR(100),
    notes TEXT,
    receipt_type VARCHAR(20) DEFAULT 'formal',
    issued_by VARCHAR(255),
    client_signature BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    emailed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_user_id ON public.thermal_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_thermal_receipts_date ON public.thermal_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_thermal_receipt_items_receipt_id ON public.thermal_receipt_items(thermal_receipt_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON public.payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice_id ON public.payment_receipts(invoice_id);

-- Habilitar Row Level Security
ALTER TABLE public.thermal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thermal_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas para thermal_receipts
DROP POLICY IF EXISTS "Users can manage their own thermal receipts" ON public.thermal_receipts;
CREATE POLICY "Users can manage their own thermal receipts" ON public.thermal_receipts
    FOR ALL USING (auth.uid() = user_id);

-- Crear políticas básicas para thermal_receipt_items
DROP POLICY IF EXISTS "Users can manage items of their thermal receipts" ON public.thermal_receipt_items;
CREATE POLICY "Users can manage items of their thermal receipts" ON public.thermal_receipt_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.thermal_receipts tr 
            WHERE tr.id = thermal_receipt_items.thermal_receipt_id 
            AND tr.user_id = auth.uid()
        )
    );

-- Crear políticas básicas para payment_receipts
DROP POLICY IF EXISTS "Users can manage their own payment receipts" ON public.payment_receipts;
CREATE POLICY "Users can manage their own payment receipts" ON public.payment_receipts
    FOR ALL USING (auth.uid() = user_id);

-- Función para generar números de recibo térmico
CREATE OR REPLACE FUNCTION generate_thermal_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := 'TRM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD((EXTRACT(epoch FROM NOW()) * 1000)::bigint::text, 13, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar números de comprobante de pago
CREATE OR REPLACE FUNCTION generate_payment_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := 'CPG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD((EXTRACT(epoch FROM NOW()) * 1000)::bigint::text, 13, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
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

-- Función para crear comprobante automáticamente cuando se paga una factura
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
            'cash',
            NEW.total_amount,
            'formal',
            'Sistema automático',
            'Comprobante generado automáticamente al marcar factura como pagada'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-crear comprobantes de pago (solo si existe la tabla invoices)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        DROP TRIGGER IF EXISTS auto_payment_receipt_trigger ON public.invoices;
        CREATE TRIGGER auto_payment_receipt_trigger
            AFTER UPDATE ON public.invoices
            FOR EACH ROW
            EXECUTE FUNCTION auto_create_payment_receipt();
    END IF;
END $$;

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Tablas de facturas térmicas y comprobantes de pago creadas exitosamente';
END $$;
