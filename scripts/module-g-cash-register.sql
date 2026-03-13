-- =====================================================
-- MÓDULO G: CIERRE DE TURNO DE CAJA (MOSTRADOR)
-- =====================================================
-- Sistema de control de caja con cierre ciego para
-- garantizar la integridad del flujo de efectivo
-- =====================================================

-- 1. Tabla principal de turnos de caja
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_register_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Cajero que abrió/cerró
    opened_by UUID NOT NULL REFERENCES profiles(id),
    closed_by UUID REFERENCES profiles(id),
    
    -- Timestamps
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Montos
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 500.00, -- Fondo inicial
    reported_cash DECIMAL(12,2), -- Lo que el cajero cuenta físicamente
    expected_cash DECIMAL(12,2), -- Calculado por el sistema
    variance DECIMAL(12,2), -- reported_cash - expected_cash (negativo = faltante)
    
    -- Totales desglosados (para Reporte Z)
    total_cash_sales DECIMAL(12,2) DEFAULT 0, -- Ventas en efectivo
    total_card_sales DECIMAL(12,2) DEFAULT 0, -- Ventas con tarjeta
    total_transfer_sales DECIMAL(12,2) DEFAULT 0, -- Ventas por transferencia
    total_credit_sales DECIMAL(12,2) DEFAULT 0, -- Ventas a crédito
    total_cash_payments DECIMAL(12,2) DEFAULT 0, -- Abonos CXC en efectivo
    total_cash_withdrawals DECIMAL(12,2) DEFAULT 0, -- Salidas/gastos de caja
    
    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada', 'forzada')),
    
    -- Notas
    opening_notes TEXT,
    closing_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_cash_shifts_user ON cash_register_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_status ON cash_register_shifts(status);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_opened_at ON cash_register_shifts(opened_at DESC);

-- Restricción: Solo un turno abierto por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_shift_per_user 
ON cash_register_shifts(user_id) 
WHERE status = 'abierta';

-- 2. Tabla de salidas/gastos de caja
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_register_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES cash_register_shifts(id) ON DELETE CASCADE,
    
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'gasto_menor', -- 'gasto_menor', 'devolucion', 'cambio', 'otro'
    
    -- Autorización
    authorized_by UUID REFERENCES profiles(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_shift ON cash_register_withdrawals(shift_id);

-- 3. Agregar columna cash_shift_id a thermal_receipts
-- =====================================================
ALTER TABLE thermal_receipts 
ADD COLUMN IF NOT EXISTS cash_shift_id UUID REFERENCES cash_register_shifts(id);

CREATE INDEX IF NOT EXISTS idx_receipts_shift ON thermal_receipts(cash_shift_id);

-- 3b. Agregar columna cash_shift_id a invoices (facturas)
-- =====================================================
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS cash_shift_id UUID REFERENCES cash_register_shifts(id);

CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(cash_shift_id);

-- 4. Agregar columna cash_shift_id a ar_payments (abonos CXC)
-- =====================================================
ALTER TABLE ar_payments 
ADD COLUMN IF NOT EXISTS cash_shift_id UUID REFERENCES cash_register_shifts(id);

CREATE INDEX IF NOT EXISTS idx_ar_payments_shift ON ar_payments(cash_shift_id);

-- 5. Vista para el Reporte Z de un turno
-- =====================================================
-- Incluye tanto recibos térmicos como facturas
CREATE OR REPLACE VIEW cash_shift_report AS
SELECT 
    cs.id as shift_id,
    cs.user_id,
    cs.opened_by,
    cs.closed_by,
    cs.opened_at,
    cs.closed_at,
    cs.opening_amount,
    cs.status,
    
    -- Ventas en efectivo del turno (recibos + facturas) - SOLO PAGADOS
    COALESCE((
        SELECT SUM(total_amount) FROM thermal_receipts 
        WHERE cash_shift_id = cs.id AND payment_method = 'cash' AND status != 'pendiente'
    ), 0) + COALESCE((
        SELECT SUM(total) FROM invoices 
        WHERE cash_shift_id = cs.id AND payment_method = 'cash'
    ), 0) as cash_sales,
    
    -- Ventas con tarjeta (recibos + facturas) - SOLO PAGADOS
    COALESCE((
        SELECT SUM(total_amount) FROM thermal_receipts 
        WHERE cash_shift_id = cs.id AND payment_method = 'card' AND status != 'pendiente'
    ), 0) + COALESCE((
        SELECT SUM(total) FROM invoices 
        WHERE cash_shift_id = cs.id AND payment_method = 'card'
    ), 0) as card_sales,
    
    -- Ventas por transferencia (recibos + facturas) - SOLO PAGADOS
    COALESCE((
        SELECT SUM(total_amount) FROM thermal_receipts 
        WHERE cash_shift_id = cs.id AND payment_method = 'transfer' AND status != 'pendiente'
    ), 0) + COALESCE((
        SELECT SUM(total) FROM invoices 
        WHERE cash_shift_id = cs.id AND payment_method = 'transfer'
    ), 0) as transfer_sales,
    
    -- Ventas a crédito (recibos pendientes + recibos credit + paid_credit + facturas credito)
    COALESCE((
        SELECT SUM(total_amount) FROM thermal_receipts 
        WHERE cash_shift_id = cs.id AND (payment_method IN ('credit', 'paid_credit') OR status = 'pendiente')
    ), 0) + COALESCE((
        SELECT SUM(total) FROM invoices 
        WHERE cash_shift_id = cs.id AND payment_method = 'credito'
    ), 0) as credit_sales,
    
    -- Total de todas las ventas (recibos + facturas)
    COALESCE((SELECT SUM(total_amount) FROM thermal_receipts WHERE cash_shift_id = cs.id), 0) + 
    COALESCE((SELECT SUM(total) FROM invoices WHERE cash_shift_id = cs.id), 0) as total_sales,
    
    -- Cantidad de transacciones (recibos + facturas)
    (SELECT COUNT(*) FROM thermal_receipts WHERE cash_shift_id = cs.id) +
    (SELECT COUNT(*) FROM invoices WHERE cash_shift_id = cs.id) as transaction_count

FROM cash_register_shifts cs;

-- 6. Vista para abonos CXC por turno
-- =====================================================
CREATE OR REPLACE VIEW cash_shift_payments AS
SELECT 
    cash_shift_id as shift_id,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_payments,
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END), 0) as transfer_payments,
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) as card_payments,
    COALESCE(SUM(amount), 0) as total_payments,
    COUNT(*) as payment_count
FROM ar_payments
WHERE cash_shift_id IS NOT NULL
GROUP BY cash_shift_id;

-- 7. Vista para salidas de caja por turno
-- =====================================================
CREATE OR REPLACE VIEW cash_shift_withdrawals AS
SELECT 
    shift_id,
    COALESCE(SUM(amount), 0) as total_withdrawals,
    COUNT(*) as withdrawal_count
FROM cash_register_withdrawals
GROUP BY shift_id;

-- 8. Función para calcular el efectivo esperado
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_expected_cash(p_shift_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_opening DECIMAL(12,2);
    v_cash_sales_receipts DECIMAL(12,2);
    v_cash_sales_invoices DECIMAL(12,2);
    v_cash_payments DECIMAL(12,2);
    v_withdrawals DECIMAL(12,2);
    v_expected DECIMAL(12,2);
BEGIN
    -- Obtener fondo inicial
    SELECT opening_amount INTO v_opening
    FROM cash_register_shifts WHERE id = p_shift_id;
    
    -- Obtener ventas en efectivo (recibos térmicos) - SOLO PAGADOS, NO PENDIENTES
    SELECT COALESCE(SUM(total_amount), 0) INTO v_cash_sales_receipts
    FROM thermal_receipts 
    WHERE cash_shift_id = p_shift_id 
    AND payment_method = 'cash'
    AND status != 'pendiente';
    
    -- Obtener ventas en efectivo (facturas)
    SELECT COALESCE(SUM(total), 0) INTO v_cash_sales_invoices
    FROM invoices 
    WHERE cash_shift_id = p_shift_id 
    AND payment_method = 'cash';
    
    -- Obtener abonos CXC en efectivo
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_payments
    FROM ar_payments 
    WHERE cash_shift_id = p_shift_id 
    AND payment_method = 'cash';
    
    -- Obtener salidas de caja
    SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals
    FROM cash_register_withdrawals 
    WHERE shift_id = p_shift_id;
    
    -- Calcular esperado
    v_expected := v_opening + v_cash_sales_receipts + v_cash_sales_invoices + v_cash_payments - v_withdrawals;
    
    RETURN v_expected;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para cerrar turno (transaccional)
-- =====================================================
CREATE OR REPLACE FUNCTION close_cash_shift(
    p_shift_id UUID,
    p_reported_cash DECIMAL(12,2),
    p_closed_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    expected_cash DECIMAL(12,2),
    variance DECIMAL(12,2),
    message TEXT
) AS $$
DECLARE
    v_expected DECIMAL(12,2);
    v_variance DECIMAL(12,2);
    v_cash_sales DECIMAL(12,2);
    v_card_sales DECIMAL(12,2);
    v_transfer_sales DECIMAL(12,2);
    v_credit_sales DECIMAL(12,2);
    v_cash_payments DECIMAL(12,2);
    v_withdrawals DECIMAL(12,2);
    v_inv_cash DECIMAL(12,2);
    v_inv_card DECIMAL(12,2);
    v_inv_transfer DECIMAL(12,2);
    v_inv_credit DECIMAL(12,2);
BEGIN
    -- Verificar que el turno existe y está abierto
    IF NOT EXISTS (SELECT 1 FROM cash_register_shifts WHERE id = p_shift_id AND status = 'abierta') THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL, 'Turno no encontrado o ya cerrado'::TEXT;
        RETURN;
    END IF;
    
    -- Calcular totales de recibos térmicos - SOLO PAGADOS (status != 'pendiente')
    SELECT COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status != 'pendiente' THEN total_amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN payment_method = 'card' AND status != 'pendiente' THEN total_amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN payment_method = 'transfer' AND status != 'pendiente' THEN total_amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN payment_method IN ('credit', 'paid_credit') OR status = 'pendiente' THEN total_amount ELSE 0 END), 0)
    INTO v_cash_sales, v_card_sales, v_transfer_sales, v_credit_sales
    FROM thermal_receipts WHERE cash_shift_id = p_shift_id;
    
    -- Calcular totales de facturas
    SELECT COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN payment_method = 'credito' THEN total ELSE 0 END), 0)
    INTO v_inv_cash, v_inv_card, v_inv_transfer, v_inv_credit
    FROM invoices WHERE cash_shift_id = p_shift_id;
    
    -- Sumar recibos + facturas
    v_cash_sales := v_cash_sales + v_inv_cash;
    v_card_sales := v_card_sales + v_inv_card;
    v_transfer_sales := v_transfer_sales + v_inv_transfer;
    v_credit_sales := v_credit_sales + v_inv_credit;
    
    SELECT COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0)
    INTO v_cash_payments
    FROM ar_payments WHERE cash_shift_id = p_shift_id;
    
    SELECT COALESCE(SUM(amount), 0)
    INTO v_withdrawals
    FROM cash_register_withdrawals WHERE shift_id = p_shift_id;
    
    -- Calcular esperado
    v_expected := calculate_expected_cash(p_shift_id);
    v_variance := p_reported_cash - v_expected;
    
    -- Actualizar el turno
    UPDATE cash_register_shifts SET
        closed_at = NOW(),
        closed_by = p_closed_by,
        reported_cash = p_reported_cash,
        expected_cash = v_expected,
        variance = v_variance,
        total_cash_sales = v_cash_sales,
        total_card_sales = v_card_sales,
        total_transfer_sales = v_transfer_sales,
        total_credit_sales = v_credit_sales,
        total_cash_payments = v_cash_payments,
        total_cash_withdrawals = v_withdrawals,
        status = 'cerrada',
        closing_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_shift_id;
    
    RETURN QUERY SELECT true, v_expected, v_variance, 'Turno cerrado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 10. RLS Policies
-- =====================================================
ALTER TABLE cash_register_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies para cash_register_shifts
DROP POLICY IF EXISTS "Users can view own shifts" ON cash_register_shifts;
CREATE POLICY "Users can view own shifts"
ON cash_register_shifts FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = opened_by OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = cash_register_shifts.user_id
));

DROP POLICY IF EXISTS "Users can insert own shifts" ON cash_register_shifts;
CREATE POLICY "Users can insert own shifts"
ON cash_register_shifts FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = cash_register_shifts.user_id
));

DROP POLICY IF EXISTS "Users can update own shifts" ON cash_register_shifts;
CREATE POLICY "Users can update own shifts"
ON cash_register_shifts FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = opened_by OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = cash_register_shifts.user_id
));

-- Policies para cash_register_withdrawals
DROP POLICY IF EXISTS "Users can view own withdrawals" ON cash_register_withdrawals;
CREATE POLICY "Users can view own withdrawals"
ON cash_register_withdrawals FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = cash_register_withdrawals.user_id
));

DROP POLICY IF EXISTS "Users can insert own withdrawals" ON cash_register_withdrawals;
CREATE POLICY "Users can insert own withdrawals"
ON cash_register_withdrawals FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = cash_register_withdrawals.user_id
));

-- 11. Grants
-- =====================================================
GRANT SELECT ON cash_shift_report TO authenticated;
GRANT SELECT ON cash_shift_payments TO authenticated;
GRANT SELECT ON cash_shift_withdrawals TO authenticated;

-- 12. Comentarios de documentación
-- =====================================================
COMMENT ON TABLE cash_register_shifts IS 'Turnos de caja para control de efectivo en mostrador';
COMMENT ON TABLE cash_register_withdrawals IS 'Salidas y gastos menores de caja durante un turno';
COMMENT ON FUNCTION calculate_expected_cash IS 'Calcula el efectivo esperado en caja basado en fondo inicial + ventas + abonos - salidas';
COMMENT ON FUNCTION close_cash_shift IS 'Cierra un turno de caja de forma transaccional y calcula la diferencia';

-- =====================================================
-- FIN DEL SCRIPT - MÓDULO G
-- =====================================================
