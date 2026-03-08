-- =====================================================
-- FIX: Allow COGS insertion for employees via Security Definer
-- =====================================================

-- 1. Modificar función de COGS para facturas para que ejecute con privilegios de dueño (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION calculate_cogs_on_invoice()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    product_cost DECIMAL(10,2);
    user_id_val UUID;
    invoice_id_val UUID;
    sale_date_val TIMESTAMP;
BEGIN
    -- Solo procesar si hay un product_id (no servicios)
    IF NEW.product_id IS NOT NULL THEN
        -- Obtener el costo del producto y user_id
        SELECT cost_price, user_id 
        INTO product_cost, user_id_val
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Obtener información de la factura
        SELECT id, invoice_date, user_id
        INTO invoice_id_val, sale_date_val, user_id_val
        FROM invoices
        WHERE id = NEW.invoice_id;
        
        -- Si encontramos el producto y tiene costo, registrar el COGS
        IF FOUND AND product_cost IS NOT NULL AND product_cost > 0 THEN
            INSERT INTO cost_of_goods_sold (
                user_id,
                invoice_id,
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
                user_id_val,
                invoice_id_val,
                NEW.product_id,
                NEW.quantity,
                NEW.unit_price,
                NEW.total,
                product_cost,
                product_cost * NEW.quantity,
                NEW.total - (product_cost * NEW.quantity),
                CASE 
                    WHEN NEW.total > 0 THEN 
                        ((NEW.total - (product_cost * NEW.quantity)) / NEW.total) * 100
                    ELSE 0 
                END,
                sale_date_val
            );
            
            RAISE NOTICE '💰 COGS: Venta $% - Costo $% = Utilidad $%', 
                NEW.total, 
                product_cost * NEW.quantity,
                NEW.total - (product_cost * NEW.quantity);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Modificar función de COGS para recibos térmicos para que ejecute con privilegios de dueño (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION calculate_cogs_on_thermal_receipt()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
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

-- Notificar éxito
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '✅ Funciones COGS actualizadas a SECURITY DEFINER';
    RAISE NOTICE '   Esto permite a los empleados insertar registros de COGS en';
    RAISE NOTICE '   la cuenta del administrador sin problemas de permisos (RLS).';
    RAISE NOTICE '====================================================================';
END $$;
