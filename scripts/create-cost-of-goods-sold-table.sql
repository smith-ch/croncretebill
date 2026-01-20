-- =====================================================
-- COGS (Cost of Goods Sold) - Costo de Ventas
-- =====================================================
-- Este sistema implementa el principio contable correcto:
-- 
-- COMPRA DE INVENTARIO → NO ES GASTO (es un activo)
-- VENTA DEL PRODUCTO → SE RECONOCE EL COSTO (se convierte en gasto)
--
-- Ejemplo:
-- 1. Compras $1,000 de productos → Inventario = $1,000 (ACTIVO)
-- 2. Vendes 50% de los productos por $800 → COGS = $500 (GASTO), Utilidad = $300
-- 3. Te quedan $500 en inventario (ACTIVO)
-- =====================================================

-- Tabla para registrar el Costo de Ventas de cada factura o recibo térmico
CREATE TABLE IF NOT EXISTS cost_of_goods_sold (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    thermal_receipt_id UUID REFERENCES thermal_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Información de la venta
    quantity_sold DECIMAL(10,3) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,        -- Precio al que se vendió
    total_sale DECIMAL(10,2) NOT NULL,        -- quantity * sale_price
    
    -- Costo del producto (lo que costó comprarlo)
    unit_cost DECIMAL(10,2) NOT NULL,         -- Costo unitario del producto
    total_cost DECIMAL(10,2) NOT NULL,        -- quantity * unit_cost
    
    -- Utilidad bruta de esta venta
    gross_profit DECIMAL(10,2) NOT NULL,      -- total_sale - total_cost
    profit_margin DECIMAL(5,2),               -- (gross_profit / total_sale) * 100
    
    -- Metadata
    sale_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_positive_quantity CHECK (quantity_sold > 0),
    CONSTRAINT chk_positive_prices CHECK (sale_price >= 0 AND unit_cost >= 0),
    CONSTRAINT chk_reference_required CHECK (
        (invoice_id IS NOT NULL AND thermal_receipt_id IS NULL) OR 
        (invoice_id IS NULL AND thermal_receipt_id IS NOT NULL)
    )
);

-- Si la tabla ya existe, agregar la columna thermal_receipt_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cost_of_goods_sold' 
        AND column_name = 'thermal_receipt_id'
    ) THEN
        ALTER TABLE cost_of_goods_sold
        ADD COLUMN thermal_receipt_id UUID REFERENCES thermal_receipts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_cogs_user_id ON cost_of_goods_sold(user_id);
CREATE INDEX IF NOT EXISTS idx_cogs_invoice_id ON cost_of_goods_sold(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cogs_thermal_receipt_id ON cost_of_goods_sold(thermal_receipt_id);
CREATE INDEX IF NOT EXISTS idx_cogs_product_id ON cost_of_goods_sold(product_id);
CREATE INDEX IF NOT EXISTS idx_cogs_sale_date ON cost_of_goods_sold(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_cogs_user_date ON cost_of_goods_sold(user_id, sale_date DESC);

-- RLS Policies
ALTER TABLE cost_of_goods_sold ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver sus propios registros
DROP POLICY IF EXISTS "Users can view own COGS" ON cost_of_goods_sold;
CREATE POLICY "Users can view own COGS" ON cost_of_goods_sold
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar sus propios registros
DROP POLICY IF EXISTS "Users can insert own COGS" ON cost_of_goods_sold;
CREATE POLICY "Users can insert own COGS" ON cost_of_goods_sold
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Trigger para calcular COGS automáticamente al crear factura
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_cogs_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    product_cost DECIMAL(10,2);
    product_user_id UUID;
    invoice_id_val UUID;
    sale_date_val TIMESTAMP;
    invoice_user_id UUID;
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF NEW.product_id IS NOT NULL THEN
        -- Obtener el costo del producto y su user_id
        SELECT cost_price, user_id 
        INTO product_cost, product_user_id
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Obtener información de la factura
        SELECT id, invoice_date, user_id
        INTO invoice_id_val, sale_date_val, invoice_user_id
        FROM invoices
        WHERE id = NEW.invoice_id;
        
        -- Si encontramos el producto, registrar el COGS
        IF FOUND AND product_cost IS NOT NULL THEN
            INSERT INTO cost_of_goods_sold (
                user_id,
                invoice_id,
                thermal_receipt_id,
                product_id,
                quantity_sold,
                sale_price,
                total_sale,
                unit_cost,
                total_cost,
                gross_profit,
                profit_margin,
                sale_date
            ) VALUES (
                invoice_user_id,                                -- user_id de la factura
                invoice_id_val,
                NULL,                                           -- no es recibo térmico
                NEW.product_id,
                NEW.quantity,
                NEW.unit_price,
                NEW.total,                                      -- total sale
                product_cost,                                   -- unit cost
                product_cost * NEW.quantity,                    -- total cost
                NEW.total - (product_cost * NEW.quantity),      -- gross profit
                CASE 
                    WHEN NEW.total > 0 THEN 
                        ((NEW.total - (product_cost * NEW.quantity)) / NEW.total) * 100
                    ELSE 0 
                END,                                             -- profit margin %
                sale_date_val
            );
            
            RAISE NOTICE 'COGS registrado: Venta $% - Costo $% = Utilidad $%', 
                NEW.total, 
                product_cost * NEW.quantity,
                NEW.total - (product_cost * NEW.quantity);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para calcular COGS automáticamente en facturas
DROP TRIGGER IF EXISTS trigger_calculate_cogs ON invoice_items;
CREATE TRIGGER trigger_calculate_cogs
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_cogs_on_invoice();

-- =====================================================
-- Trigger para calcular COGS automáticamente en RECIBOS TÉRMICOS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_cogs_on_thermal_receipt()
RETURNS TRIGGER AS $$
DECLARE
    product_cost DECIMAL(10,2);
    product_user_id UUID;
    thermal_receipt_user_id UUID;
    thermal_receipt_id_val UUID;
    sale_date_val TIMESTAMP;
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF NEW.product_id IS NOT NULL THEN
        -- Obtener el costo del producto y su user_id
        SELECT cost_price, user_id
        INTO product_cost, product_user_id
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Obtener información del recibo térmico
        SELECT id, created_at, user_id
        INTO thermal_receipt_id_val, sale_date_val, thermal_receipt_user_id
        FROM thermal_receipts
        WHERE id = NEW.thermal_receipt_id;
        
        -- Si encontramos el producto, registrar el COGS
        IF FOUND AND product_cost IS NOT NULL THEN
            INSERT INTO cost_of_goods_sold (
                user_id,
                invoice_id,
                thermal_receipt_id,
                product_id,
                quantity_sold,
                sale_price,
                total_sale,
                unit_cost,
                total_cost,
                gross_profit,
                profit_margin,
                sale_date
            ) VALUES (
                thermal_receipt_user_id,                        -- user_id del recibo térmico
                NULL,                                           -- no es factura
                thermal_receipt_id_val,                         -- es recibo térmico
                NEW.product_id,
                NEW.quantity,
                NEW.unit_price,
                NEW.line_total,                                 -- total sale
                product_cost,                                   -- unit cost
                product_cost * NEW.quantity,                    -- total cost
                NEW.line_total - (product_cost * NEW.quantity), -- gross profit
                CASE 
                    WHEN NEW.line_total > 0 THEN 
                        ((NEW.line_total - (product_cost * NEW.quantity)) / NEW.line_total) * 100
                    ELSE 0 
                END,                                            -- profit margin %
                sale_date_val
            );
            
            RAISE NOTICE 'COGS registrado (Recibo Térmico): Venta $% - Costo $% = Utilidad $%', 
                NEW.line_total, 
                product_cost * NEW.quantity,
                NEW.line_total - (product_cost * NEW.quantity);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para calcular COGS en recibos térmicos
DROP TRIGGER IF EXISTS trigger_calculate_cogs_thermal ON thermal_receipt_items;
CREATE TRIGGER trigger_calculate_cogs_thermal
    AFTER INSERT ON thermal_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_cogs_on_thermal_receipt();

-- =====================================================
-- ELIMINAR VISTAS ANTIGUAS antes de recrear
-- =====================================================

DROP VIEW IF EXISTS v_product_profitability;
DROP VIEW IF EXISTS v_monthly_profit_summary;

-- =====================================================
-- Vista para análisis de rentabilidad
-- =====================================================

CREATE VIEW v_product_profitability AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.product_code,
    COUNT(DISTINCT COALESCE(c.invoice_id, c.thermal_receipt_id)) as total_sales,
    SUM(c.quantity_sold) as total_quantity_sold,
    SUM(c.total_sale) as total_revenue,
    SUM(c.total_cost) as total_cogs,
    SUM(c.gross_profit) as total_profit,
    CASE 
        WHEN SUM(c.total_sale) > 0 THEN 
            (SUM(c.gross_profit) / SUM(c.total_sale)) * 100
        ELSE 0 
    END as avg_profit_margin,
    c.user_id
FROM products p
LEFT JOIN cost_of_goods_sold c ON p.id = c.product_id
WHERE p.current_stock >= 0
GROUP BY p.id, p.name, p.product_code, c.user_id;

-- =====================================================
-- Vista para resumen mensual de utilidades
-- =====================================================

CREATE VIEW v_monthly_profit_summary AS
SELECT 
    user_id,
    DATE_TRUNC('month', sale_date) as month,
    COUNT(DISTINCT COALESCE(invoice_id, thermal_receipt_id)) as total_sales,
    SUM(quantity_sold) as total_units_sold,
    SUM(total_sale) as total_revenue,
    SUM(total_cost) as total_cogs,
    SUM(gross_profit) as gross_profit,
    CASE 
        WHEN SUM(total_sale) > 0 THEN 
            (SUM(gross_profit) / SUM(total_sale)) * 100
        ELSE 0 
    END as profit_margin
FROM cost_of_goods_sold
GROUP BY user_id, DATE_TRUNC('month', sale_date)
ORDER BY month DESC;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '✅ Tabla COGS creada exitosamente';
    RAISE NOTICE '✅ Trigger de cálculo automático para FACTURAS creado';
    RAISE NOTICE '✅ Trigger de cálculo automático para RECIBOS TÉRMICOS creado';
    RAISE NOTICE '✅ Vistas de rentabilidad recreadas';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Correcciones aplicadas:';
    RAISE NOTICE '   - user_id ahora se obtiene correctamente del recibo térmico';
    RAISE NOTICE '   - Vistas eliminadas y recreadas para evitar conflictos';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Ahora el sistema reconoce el gasto SOLO cuando vendes:';
    RAISE NOTICE '   1. Compra → Inventario (ACTIVO)';
    RAISE NOTICE '   2. Venta (Factura o Recibo Térmico) → COGS (GASTO) + Utilidad';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Rentabilidad se calcula para:';
    RAISE NOTICE '   ✅ Facturas normales (invoice_items)';
    RAISE NOTICE '   ✅ Recibos térmicos (thermal_receipt_items)';
    RAISE NOTICE '====================================================================';
END $$;