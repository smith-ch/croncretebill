-- =====================================================
-- MÓDULO F: CONTROL DE MATERIALES RETORNABLES (KARDEX)
-- =====================================================
-- Script para implementar el sistema de control de envases
-- y materiales retornables por cliente
-- =====================================================

-- 1. Agregar campo is_returnable a la tabla products
-- =====================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT false;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS returnable_deposit DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN products.is_returnable IS 'Indica si el producto incluye un envase/material retornable';
COMMENT ON COLUMN products.returnable_deposit IS 'Valor del depósito del material retornable (si aplica)';

-- 2. Crear tabla del Kardex de Retornables
-- =====================================================
CREATE TABLE IF NOT EXISTS client_returnables_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Tipo de transacción
    transaction_type VARCHAR(30) NOT NULL CHECK (
        transaction_type IN ('entrega', 'devolucion', 'ajuste_perdida', 'ajuste_ganancia', 'saldo_inicial')
    ),
    
    -- Cantidad (siempre positivo, el tipo determina si suma o resta)
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Referencia al documento origen
    reference_type VARCHAR(30) CHECK (
        reference_type IN ('recibo_termico', 'factura', 'liquidacion_ruta', 'manual', 'migracion')
    ),
    reference_id UUID, -- FK al documento que originó el movimiento
    
    -- Metadata
    notes TEXT, -- Justificación para ajustes manuales
    created_by UUID REFERENCES profiles(id), -- Usuario que registró el movimiento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index para consultas rápidas
    CONSTRAINT unique_ledger_entry UNIQUE (id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_returnables_client ON client_returnables_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_returnables_product ON client_returnables_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_returnables_user ON client_returnables_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_returnables_created ON client_returnables_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returnables_reference ON client_returnables_ledger(reference_type, reference_id);

-- 3. Crear Vista para Balances de Retornables por Cliente
-- =====================================================
CREATE OR REPLACE VIEW client_returnables_balances AS
SELECT 
    crl.user_id,
    crl.client_id,
    c.name as client_name,
    crl.product_id,
    p.name as product_name,
    p.sku as product_sku,
    SUM(
        CASE 
            WHEN crl.transaction_type IN ('entrega', 'saldo_inicial', 'ajuste_ganancia') THEN crl.quantity
            WHEN crl.transaction_type IN ('devolucion', 'ajuste_perdida') THEN -crl.quantity
            ELSE 0
        END
    ) as balance,
    SUM(CASE WHEN crl.transaction_type = 'entrega' THEN crl.quantity ELSE 0 END) as total_entregas,
    SUM(CASE WHEN crl.transaction_type = 'devolucion' THEN crl.quantity ELSE 0 END) as total_devoluciones,
    SUM(CASE WHEN crl.transaction_type = 'saldo_inicial' THEN crl.quantity ELSE 0 END) as saldo_inicial,
    SUM(CASE WHEN crl.transaction_type IN ('ajuste_perdida', 'ajuste_ganancia') THEN 
        CASE WHEN crl.transaction_type = 'ajuste_ganancia' THEN crl.quantity ELSE -crl.quantity END
    ELSE 0 END) as ajustes_netos,
    MAX(crl.created_at) as ultimo_movimiento
FROM client_returnables_ledger crl
JOIN clients c ON c.id = crl.client_id
JOIN products p ON p.id = crl.product_id
GROUP BY crl.user_id, crl.client_id, c.name, crl.product_id, p.name, p.sku;

-- 4. Vista resumida por cliente (todos los productos)
-- =====================================================
CREATE OR REPLACE VIEW client_returnables_summary AS
SELECT 
    user_id,
    client_id,
    client_name,
    COUNT(DISTINCT product_id) as tipos_de_envases,
    SUM(balance) as total_unidades_prestadas,
    SUM(CASE WHEN balance < 0 THEN 1 ELSE 0 END) as items_con_balance_negativo,
    MAX(ultimo_movimiento) as ultimo_movimiento
FROM client_returnables_balances
GROUP BY user_id, client_id, client_name;

-- 5. Función para obtener balance de un cliente específico
-- =====================================================
CREATE OR REPLACE FUNCTION get_client_returnable_balance(
    p_client_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    balance BIGINT,
    total_entregas BIGINT,
    total_devoluciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        crb.product_id,
        crb.product_name::VARCHAR,
        crb.balance::BIGINT,
        crb.total_entregas::BIGINT,
        crb.total_devoluciones::BIGINT
    FROM client_returnables_balances crb
    WHERE crb.client_id = p_client_id
    AND (p_product_id IS NULL OR crb.product_id = p_product_id);
END;
$$ LANGUAGE plpgsql;

-- 6. Función para registrar movimiento de retornable
-- =====================================================
CREATE OR REPLACE FUNCTION register_returnable_movement(
    p_user_id UUID,
    p_client_id UUID,
    p_product_id UUID,
    p_transaction_type VARCHAR,
    p_quantity INTEGER,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_ledger_id UUID;
BEGIN
    INSERT INTO client_returnables_ledger (
        user_id,
        client_id,
        product_id,
        transaction_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
    ) VALUES (
        p_user_id,
        p_client_id,
        p_product_id,
        p_transaction_type,
        p_quantity,
        p_reference_type,
        p_reference_id,
        p_notes,
        p_created_by
    ) RETURNING id INTO v_ledger_id;
    
    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- 7. RLS Policies
-- =====================================================
ALTER TABLE client_returnables_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own returnables ledger" ON client_returnables_ledger;
DROP POLICY IF EXISTS "Users can insert their own returnables entries" ON client_returnables_ledger;

-- Policy para SELECT
CREATE POLICY "Users can view their own returnables ledger"
ON client_returnables_ledger FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = client_returnables_ledger.user_id
));

-- Policy para INSERT
CREATE POLICY "Users can insert their own returnables entries"
ON client_returnables_ledger FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE parent_user_id = client_returnables_ledger.user_id
));

-- NOTA: No hay UPDATE ni DELETE policies - el ledger es append-only

-- 8. Grants para las vistas
-- =====================================================
GRANT SELECT ON client_returnables_balances TO authenticated;
GRANT SELECT ON client_returnables_summary TO authenticated;

-- 9. Comentarios de documentación
-- =====================================================
COMMENT ON TABLE client_returnables_ledger IS 'Kardex de materiales retornables - Registro inmutable de movimientos de envases';
COMMENT ON VIEW client_returnables_balances IS 'Balance actual de retornables por cliente y producto';
COMMENT ON VIEW client_returnables_summary IS 'Resumen de retornables por cliente';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Instrucciones de uso:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Marcar productos con envases como is_returnable = true
-- 3. Cargar saldos iniciales de clientes existentes
-- =====================================================
