-- =====================================================
-- MÓDULO E: CUENTAS POR COBRAR (CXC) Y ABONOS
-- Script de creación de tablas, triggers y vistas
-- Fecha: 2026-03-08
-- =====================================================

-- =====================================================
-- 1. TABLA PRINCIPAL: CUENTAS POR COBRAR
-- =====================================================
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Referencia a la venta original (puede ser recibo, factura, o ambos)
    thermal_receipt_id UUID REFERENCES public.thermal_receipts(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    
    -- Información de la deuda
    document_number VARCHAR(50), -- Número del documento original
    description TEXT, -- Descripción de la venta/concepto
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Monto original
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Suma de abonos
    balance DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED, -- Saldo pendiente
    
    -- Fechas y términos
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Fecha de emisión
    due_date DATE NOT NULL, -- Fecha de vencimiento (issue_date + payment_terms)
    payment_terms INTEGER DEFAULT 7, -- Días de crédito
    
    -- Estado y control
    status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'parcial', 'pagado', 'vencido', 'cancelado')),
    overdue_notified BOOLEAN DEFAULT FALSE, -- Si ya se envió notificación de vencimiento
    
    -- Metadatos
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE PAGOS/ABONOS (RECIBOS DE INGRESO)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ar_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Referencia a cuenta por cobrar específica (NULL si es pago general al cliente)
    ar_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL,
    
    -- Información del pago
    payment_number VARCHAR(50) NOT NULL, -- Número de recibo de ingreso
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'check', 'card', 'other')),
    reference_number VARCHAR(100), -- Número de transferencia/cheque
    bank_name VARCHAR(100), -- Para transferencias/cheques
    
    -- Fechas
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Control
    registered_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DETALLE DE APLICACIÓN DE PAGOS
-- (Para pagos que se aplican a múltiples facturas - FIFO)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ar_payment_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.ar_payments(id) ON DELETE CASCADE,
    ar_id UUID NOT NULL REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
    amount_applied DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ar_user_id ON public.accounts_receivable(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_client_id ON public.accounts_receivable(client_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON public.accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_ar_due_date ON public.accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_balance ON public.accounts_receivable(balance) WHERE balance > 0;
CREATE INDEX IF NOT EXISTS idx_ar_issue_date ON public.accounts_receivable(issue_date);

CREATE INDEX IF NOT EXISTS idx_ar_payments_user_id ON public.ar_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_client_id ON public.ar_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_ar_id ON public.ar_payments(ar_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_date ON public.ar_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_ar_payment_apps_payment_id ON public.ar_payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_ar_payment_apps_ar_id ON public.ar_payment_applications(ar_id);

-- =====================================================
-- 5. FUNCIÓN: Generar número de recibo de pago
-- =====================================================
CREATE OR REPLACE FUNCTION generate_payment_number(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_count INTEGER;
    v_year VARCHAR;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.ar_payments
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    RETURN 'REC-' || v_year || '-' || LPAD(v_count::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCIÓN: Actualizar estado de cuenta por cobrar
-- =====================================================
CREATE OR REPLACE FUNCTION update_ar_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_amount DECIMAL(12,2);
    v_paid_amount DECIMAL(12,2);
    v_due_date DATE;
    v_new_status VARCHAR(20);
BEGIN
    -- Obtener valores actuales
    SELECT total_amount, paid_amount, due_date
    INTO v_total_amount, v_paid_amount, v_due_date
    FROM public.accounts_receivable
    WHERE id = COALESCE(NEW.ar_id, OLD.ar_id);
    
    -- Determinar nuevo estado
    IF v_paid_amount >= v_total_amount THEN
        v_new_status := 'pagado';
    ELSIF v_paid_amount > 0 THEN
        v_new_status := 'parcial';
    ELSIF CURRENT_DATE > v_due_date THEN
        v_new_status := 'vencido';
    ELSE
        v_new_status := 'pendiente';
    END IF;
    
    -- Actualizar estado
    UPDATE public.accounts_receivable
    SET status = v_new_status,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.ar_id, OLD.ar_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCIÓN: Aplicar pago FIFO a múltiples facturas
-- =====================================================
CREATE OR REPLACE FUNCTION apply_payment_fifo(
    p_user_id UUID,
    p_client_id UUID,
    p_payment_id UUID,
    p_total_amount DECIMAL(12,2)
)
RETURNS TABLE(ar_id UUID, amount_applied DECIMAL(12,2)) AS $$
DECLARE
    v_remaining DECIMAL(12,2) := p_total_amount;
    v_ar RECORD;
    v_apply_amount DECIMAL(12,2);
BEGIN
    -- Iterar sobre facturas pendientes ordenadas por fecha (FIFO)
    FOR v_ar IN 
        SELECT id, balance
        FROM public.accounts_receivable
        WHERE user_id = p_user_id
        AND client_id = p_client_id
        AND status IN ('pendiente', 'parcial', 'vencido')
        AND balance > 0
        ORDER BY issue_date ASC, created_at ASC
    LOOP
        EXIT WHEN v_remaining <= 0;
        
        -- Calcular monto a aplicar
        v_apply_amount := LEAST(v_remaining, v_ar.balance);
        
        -- Registrar aplicación
        INSERT INTO public.ar_payment_applications (payment_id, ar_id, amount_applied)
        VALUES (p_payment_id, v_ar.id, v_apply_amount);
        
        -- Actualizar cuenta por cobrar
        UPDATE public.accounts_receivable
        SET paid_amount = paid_amount + v_apply_amount,
            updated_at = NOW()
        WHERE id = v_ar.id;
        
        -- Retornar el registro aplicado
        ar_id := v_ar.id;
        amount_applied := v_apply_amount;
        RETURN NEXT;
        
        v_remaining := v_remaining - v_apply_amount;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNCIÓN: Aplicar pago a factura específica
-- =====================================================
CREATE OR REPLACE FUNCTION apply_payment_to_ar(
    p_ar_id UUID,
    p_payment_id UUID,
    p_amount DECIMAL(12,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance DECIMAL(12,2);
    v_apply_amount DECIMAL(12,2);
BEGIN
    -- Obtener balance actual
    SELECT balance INTO v_balance
    FROM public.accounts_receivable
    WHERE id = p_ar_id;
    
    IF v_balance IS NULL OR v_balance <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Aplicar hasta el balance disponible
    v_apply_amount := LEAST(p_amount, v_balance);
    
    -- Registrar aplicación
    INSERT INTO public.ar_payment_applications (payment_id, ar_id, amount_applied)
    VALUES (p_payment_id, p_ar_id, v_apply_amount);
    
    -- Actualizar cuenta por cobrar
    UPDATE public.accounts_receivable
    SET paid_amount = paid_amount + v_apply_amount,
        updated_at = NOW()
    WHERE id = p_ar_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. VISTA: Reporte de Antigüedad (Aging Report)
-- =====================================================
CREATE OR REPLACE VIEW public.ar_aging_report AS
SELECT 
    ar.user_id,
    ar.client_id,
    c.name AS client_name,
    c.phone AS client_phone,
    c.email AS client_email,
    
    -- Totales del cliente
    COUNT(*) AS total_documents,
    SUM(ar.total_amount) AS total_invoiced,
    SUM(ar.paid_amount) AS total_paid,
    SUM(ar.balance) AS total_balance,
    
    -- Desglose por antigüedad
    SUM(CASE 
        WHEN ar.balance > 0 AND CURRENT_DATE <= ar.due_date 
        THEN ar.balance ELSE 0 
    END) AS current_balance, -- Al día
    
    SUM(CASE 
        WHEN ar.balance > 0 AND CURRENT_DATE > ar.due_date 
        AND CURRENT_DATE <= ar.due_date + 7 
        THEN ar.balance ELSE 0 
    END) AS overdue_1_7, -- 1-7 días vencido
    
    SUM(CASE 
        WHEN ar.balance > 0 AND CURRENT_DATE > ar.due_date + 7 
        AND CURRENT_DATE <= ar.due_date + 15 
        THEN ar.balance ELSE 0 
    END) AS overdue_8_15, -- 8-15 días vencido
    
    SUM(CASE 
        WHEN ar.balance > 0 AND CURRENT_DATE > ar.due_date + 15 
        AND CURRENT_DATE <= ar.due_date + 30 
        THEN ar.balance ELSE 0 
    END) AS overdue_16_30, -- 16-30 días vencido
    
    SUM(CASE 
        WHEN ar.balance > 0 AND CURRENT_DATE > ar.due_date + 30 
        THEN ar.balance ELSE 0 
    END) AS overdue_over_30, -- Más de 30 días vencido
    
    -- Estadísticas adicionales
    MAX(ar.due_date) AS latest_due_date,
    MIN(ar.issue_date) AS oldest_invoice_date,
    MAX(CASE WHEN ar.balance > 0 THEN CURRENT_DATE - ar.due_date ELSE 0 END) AS max_days_overdue

FROM public.accounts_receivable ar
LEFT JOIN public.clients c ON ar.client_id = c.id
WHERE ar.status != 'cancelado'
GROUP BY ar.user_id, ar.client_id, c.name, c.phone, c.email;

-- =====================================================
-- 10. VISTA: Estado de cuenta detallado por cliente
-- =====================================================
CREATE OR REPLACE VIEW public.ar_client_statement AS
SELECT 
    ar.id,
    ar.user_id,
    ar.client_id,
    ar.document_number,
    ar.description,
    ar.total_amount,
    ar.paid_amount,
    ar.balance,
    ar.issue_date,
    ar.due_date,
    ar.payment_terms,
    ar.status,
    ar.thermal_receipt_id,
    ar.invoice_id,
    ar.created_at,
    
    -- Días de vencimiento
    CASE 
        WHEN ar.balance > 0 AND CURRENT_DATE > ar.due_date 
        THEN CURRENT_DATE - ar.due_date 
        ELSE 0 
    END AS days_overdue,
    
    -- Categoría de antigüedad
    CASE 
        WHEN ar.balance <= 0 THEN 'pagado'
        WHEN CURRENT_DATE <= ar.due_date THEN 'al_dia'
        WHEN CURRENT_DATE <= ar.due_date + 7 THEN 'vencido_1_7'
        WHEN CURRENT_DATE <= ar.due_date + 15 THEN 'vencido_8_15'
        WHEN CURRENT_DATE <= ar.due_date + 30 THEN 'vencido_16_30'
        ELSE 'vencido_30_mas'
    END AS aging_category

FROM public.accounts_receivable ar
WHERE ar.status != 'cancelado';

-- =====================================================
-- 11. FUNCIÓN: Obtener resumen de CXC para un cliente
-- (Para usar en el Módulo C - Rutas)
-- =====================================================
CREATE OR REPLACE FUNCTION get_client_ar_summary(p_user_id UUID, p_client_id UUID)
RETURNS TABLE(
    total_balance DECIMAL(12,2),
    overdue_balance DECIMAL(12,2),
    max_days_overdue INTEGER,
    pending_invoices INTEGER,
    can_sell_credit BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(ar.balance), 0) AS total_balance,
        COALESCE(SUM(CASE WHEN CURRENT_DATE > ar.due_date THEN ar.balance ELSE 0 END), 0) AS overdue_balance,
        COALESCE(MAX(CASE WHEN ar.balance > 0 AND CURRENT_DATE > ar.due_date 
            THEN (CURRENT_DATE - ar.due_date)::INTEGER ELSE 0 END), 0) AS max_days_overdue,
        COUNT(*)::INTEGER AS pending_invoices,
        -- Regla: No puede comprar a crédito si tiene facturas vencidas por más de 15 días
        NOT EXISTS (
            SELECT 1 FROM public.accounts_receivable ar2
            WHERE ar2.user_id = p_user_id
            AND ar2.client_id = p_client_id
            AND ar2.balance > 0
            AND CURRENT_DATE > ar2.due_date + 15
        ) AS can_sell_credit
    FROM public.accounts_receivable ar
    WHERE ar.user_id = p_user_id
    AND ar.client_id = p_client_id
    AND ar.status IN ('pendiente', 'parcial', 'vencido')
    AND ar.balance > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. TRIGGER: Crear CXC automáticamente para ventas a crédito
-- =====================================================
CREATE OR REPLACE FUNCTION create_ar_from_credit_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_terms INTEGER := 7; -- Días de crédito por defecto
BEGIN
    -- Solo crear CXC para ventas a crédito
    IF NEW.payment_method = 'credit' AND NEW.client_id IS NOT NULL THEN
        -- Obtener términos de pago del cliente si existen
        SELECT COALESCE(payment_terms, 7) INTO v_payment_terms
        FROM public.clients
        WHERE id = NEW.client_id;
        
        INSERT INTO public.accounts_receivable (
            user_id,
            client_id,
            thermal_receipt_id,
            document_number,
            description,
            total_amount,
            issue_date,
            due_date,
            payment_terms,
            status
        ) VALUES (
            NEW.user_id,
            NEW.client_id,
            NEW.id,
            NEW.receipt_number,
            'Venta a crédito - ' || COALESCE(NEW.client_name, 'Cliente'),
            NEW.total_amount,
            CURRENT_DATE,
            CURRENT_DATE + v_payment_terms,
            v_payment_terms,
            'pendiente'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger solo si no existe
DROP TRIGGER IF EXISTS tr_create_ar_from_credit_sale ON public.thermal_receipts;
CREATE TRIGGER tr_create_ar_from_credit_sale
    AFTER INSERT ON public.thermal_receipts
    FOR EACH ROW
    EXECUTE FUNCTION create_ar_from_credit_sale();

-- =====================================================
-- 13. TRIGGER: Actualizar estados de CXC vencidas (para cron job o llamada manual)
-- =====================================================
CREATE OR REPLACE FUNCTION update_overdue_ar_status()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.accounts_receivable
    SET status = 'vencido',
        updated_at = NOW()
    WHERE status IN ('pendiente', 'parcial')
    AND balance > 0
    AND CURRENT_DATE > due_date;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_payment_applications ENABLE ROW LEVEL SECURITY;

-- Políticas para accounts_receivable
DROP POLICY IF EXISTS "ar_select_policy" ON public.accounts_receivable;
CREATE POLICY "ar_select_policy" ON public.accounts_receivable 
FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.parent_user_id = accounts_receivable.user_id
    )
);

DROP POLICY IF EXISTS "ar_insert_policy" ON public.accounts_receivable;
CREATE POLICY "ar_insert_policy" ON public.accounts_receivable 
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.parent_user_id = accounts_receivable.user_id
    )
);

DROP POLICY IF EXISTS "ar_update_policy" ON public.accounts_receivable;
CREATE POLICY "ar_update_policy" ON public.accounts_receivable 
FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.parent_user_id = accounts_receivable.user_id
    )
);

DROP POLICY IF EXISTS "ar_delete_policy" ON public.accounts_receivable;
CREATE POLICY "ar_delete_policy" ON public.accounts_receivable 
FOR DELETE USING (auth.uid() = user_id);

-- Políticas para ar_payments
DROP POLICY IF EXISTS "payments_select_policy" ON public.ar_payments;
CREATE POLICY "payments_select_policy" ON public.ar_payments 
FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.parent_user_id = ar_payments.user_id
    )
);

DROP POLICY IF EXISTS "payments_insert_policy" ON public.ar_payments;
CREATE POLICY "payments_insert_policy" ON public.ar_payments 
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.parent_user_id = ar_payments.user_id
    )
);

DROP POLICY IF EXISTS "payments_update_policy" ON public.ar_payments;
CREATE POLICY "payments_update_policy" ON public.ar_payments 
FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.parent_user_id = ar_payments.user_id
    )
);

-- Políticas para ar_payment_applications (heredan de payments)
DROP POLICY IF EXISTS "payment_apps_select_policy" ON public.ar_payment_applications;
CREATE POLICY "payment_apps_select_policy" ON public.ar_payment_applications 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.ar_payments p
        WHERE p.id = ar_payment_applications.payment_id
        AND (
            p.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.user_id = auth.uid()
                AND up.parent_user_id = p.user_id
            )
        )
    )
);

DROP POLICY IF EXISTS "payment_apps_insert_policy" ON public.ar_payment_applications;
CREATE POLICY "payment_apps_insert_policy" ON public.ar_payment_applications 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ar_payments p
        WHERE p.id = ar_payment_applications.payment_id
        AND (
            p.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.user_id = auth.uid()
                AND up.parent_user_id = p.user_id
            )
        )
    )
);

-- =====================================================
-- 15. COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.accounts_receivable IS 'Cuentas por cobrar - Registro de ventas a crédito pendientes de pago';
COMMENT ON TABLE public.ar_payments IS 'Recibos de ingreso - Pagos/abonos recibidos de clientes';
COMMENT ON TABLE public.ar_payment_applications IS 'Detalle de aplicación de pagos a facturas específicas (soporte FIFO)';
COMMENT ON VIEW public.ar_aging_report IS 'Reporte de antigüedad de saldos agrupado por cliente';
COMMENT ON VIEW public.ar_client_statement IS 'Estado de cuenta detallado con categorías de antigüedad';
COMMENT ON FUNCTION apply_payment_fifo IS 'Aplica un pago a múltiples facturas usando método FIFO (primero en entrar, primero en salir)';
COMMENT ON FUNCTION get_client_ar_summary IS 'Obtiene resumen de CXC de un cliente para usar en rutas/ventas';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
