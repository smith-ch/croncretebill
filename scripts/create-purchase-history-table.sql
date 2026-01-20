-- =====================================================
-- SISTEMA DE CLASIFICACIÓN DE COMPRAS
-- Script para crear tabla purchase_history
-- =====================================================

-- 1. Crear tabla de historial de compras
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Tipo de compra: 'inventory' o 'expense'
    purchase_type VARCHAR(20) NOT NULL CHECK (purchase_type IN ('inventory', 'expense')),
    
    -- Información general
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    
    -- Datos de inventario
    quantity DECIMAL(10, 3),
    unit_cost DECIMAL(12, 2),
    
    -- Datos de gasto
    expense_category VARCHAR(50),
    
    -- Información adicional
    supplier VARCHAR(255),
    receipt_number VARCHAR(100),
    purchase_date DATE NOT NULL,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_type ON purchase_history(purchase_type);
CREATE INDEX IF NOT EXISTS idx_purchase_history_date ON purchase_history(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_product_id ON purchase_history(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_supplier ON purchase_history(supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_history_category ON purchase_history(expense_category);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_type_date 
    ON purchase_history(user_id, purchase_type, purchase_date DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad RLS
-- Política SELECT: Los usuarios solo pueden ver su propio historial
DROP POLICY IF EXISTS "Users can view own purchase history" ON purchase_history;
CREATE POLICY "Users can view own purchase history"
    ON purchase_history FOR SELECT
    USING (auth.uid() = user_id);

-- Política INSERT: Los usuarios solo pueden insertar su propio historial
DROP POLICY IF EXISTS "Users can insert own purchase history" ON purchase_history;
CREATE POLICY "Users can insert own purchase history"
    ON purchase_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: Los usuarios solo pueden actualizar su propio historial
DROP POLICY IF EXISTS "Users can update own purchase history" ON purchase_history;
CREATE POLICY "Users can update own purchase history"
    ON purchase_history FOR UPDATE
    USING (auth.uid() = user_id);

-- Política DELETE: Los usuarios solo pueden eliminar su propio historial
DROP POLICY IF EXISTS "Users can delete own purchase history" ON purchase_history;
CREATE POLICY "Users can delete own purchase history"
    ON purchase_history FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_purchase_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_purchase_history_updated_at ON purchase_history;
CREATE TRIGGER trigger_purchase_history_updated_at
    BEFORE UPDATE ON purchase_history
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_history_updated_at();

-- 7. Comentarios en la tabla y columnas
COMMENT ON TABLE purchase_history IS 'Historial completo de compras clasificadas como inventario o gasto';
COMMENT ON COLUMN purchase_history.purchase_type IS 'Tipo: inventory (productos para venta) o expense (uso interno)';
COMMENT ON COLUMN purchase_history.product_id IS 'Referencia al producto creado/actualizado (solo para purchase_type=inventory)';
COMMENT ON COLUMN purchase_history.expense_category IS 'Categoría del gasto (solo para purchase_type=expense)';
COMMENT ON COLUMN purchase_history.quantity IS 'Cantidad comprada (relevante para inventario)';
COMMENT ON COLUMN purchase_history.unit_cost IS 'Costo unitario = amount / quantity';

-- =====================================================
-- CONSULTAS DE EJEMPLO
-- =====================================================

-- Ver historial de compras del mes actual
-- SELECT 
--     purchase_date,
--     description,
--     purchase_type,
--     amount,
--     CASE 
--         WHEN purchase_type = 'inventory' THEN 'Inventario'
--         WHEN purchase_type = 'expense' THEN expense_category
--     END as category,
--     supplier
-- FROM purchase_history
-- WHERE user_id = auth.uid()
--     AND purchase_date >= date_trunc('month', CURRENT_DATE)
-- ORDER BY purchase_date DESC;

-- Resumen por tipo de compra
-- SELECT 
--     purchase_type,
--     COUNT(*) as total_purchases,
--     SUM(amount) as total_amount,
--     AVG(amount) as avg_amount,
--     MIN(purchase_date) as first_purchase,
--     MAX(purchase_date) as last_purchase
-- FROM purchase_history
-- WHERE user_id = auth.uid()
-- GROUP BY purchase_type;

-- Gastos por categoría (último mes)
-- SELECT 
--     expense_category,
--     COUNT(*) as count,
--     SUM(amount) as total,
--     AVG(amount) as average
-- FROM purchase_history
-- WHERE user_id = auth.uid()
--     AND purchase_type = 'expense'
--     AND purchase_date >= date_trunc('month', CURRENT_DATE)
-- GROUP BY expense_category
-- ORDER BY total DESC;

-- Compras por proveedor
-- SELECT 
--     supplier,
--     COUNT(*) as purchases,
--     SUM(amount) as total_spent,
--     MAX(purchase_date) as last_purchase
-- FROM purchase_history
-- WHERE user_id = auth.uid()
--     AND supplier IS NOT NULL
-- GROUP BY supplier
-- ORDER BY total_spent DESC
-- LIMIT 10;

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================
