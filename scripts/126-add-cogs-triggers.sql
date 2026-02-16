-- Create function to update COGS from Thermal Receipt Items
CREATE OR REPLACE FUNCTION public.update_cogs_from_thermal_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_receipt_date TIMESTAMP WITH TIME ZONE;
    v_cost DECIMAL(10,2);
    v_profit DECIMAL(10,2);
    v_margin DECIMAL(10,2);
BEGIN
    -- Only process if it has a product_id (ignoring services for now to match current COGS pattern)
    IF NEW.product_id IS NOT NULL THEN
        -- Get receipt details
        SELECT user_id, created_at INTO v_user_id, v_receipt_date
        FROM public.thermal_receipts
        WHERE id = NEW.thermal_receipt_id;

        -- Get product cost
        SELECT cost_price INTO v_cost
        FROM public.products
        WHERE id = NEW.product_id;

        -- Default cost to 0 if null
        v_cost := COALESCE(v_cost, 0);

        -- Calculate profit
        v_profit := NEW.line_total - (NEW.quantity * v_cost);
        
        -- Calculate margin
        IF NEW.line_total > 0 THEN
            v_margin := (v_profit / NEW.line_total) * 100;
        ELSE
            v_margin := 0;
        END IF;

        -- Insert into cost_of_goods_sold
        INSERT INTO public.cost_of_goods_sold (
            user_id,
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
            v_user_id,
            NEW.thermal_receipt_id,
            NEW.product_id,
            NEW.quantity,
            NEW.unit_price,
            NEW.line_total,
            v_cost,
            (NEW.quantity * v_cost),
            v_profit,
            v_margin,
            v_receipt_date
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger for Thermal Receipts
DROP TRIGGER IF EXISTS trigger_update_cogs_thermal ON public.thermal_receipt_items;
CREATE TRIGGER trigger_update_cogs_thermal
    AFTER INSERT ON public.thermal_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cogs_from_thermal_receipt();


-- Create function to update COGS from Invoice Items
CREATE OR REPLACE FUNCTION public.update_cogs_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_invoice_date DATE;
    v_cost DECIMAL(10,2);
    v_profit DECIMAL(10,2);
    v_margin DECIMAL(10,2);
BEGIN
    -- Only process if it has a product_id
    IF NEW.product_id IS NOT NULL THEN
        -- Get invoice details
        SELECT user_id, invoice_date INTO v_user_id, v_invoice_date
        FROM public.invoices
        WHERE id = NEW.invoice_id;

        -- Get product cost
        SELECT cost_price INTO v_cost
        FROM public.products
        WHERE id = NEW.product_id;

        -- Default cost to 0 if null
        v_cost := COALESCE(v_cost, 0);

        -- Calculate profit
        v_profit := NEW.total - (NEW.quantity * v_cost);
        
        -- Calculate margin
        IF NEW.total > 0 THEN
            v_margin := (v_profit / NEW.total) * 100;
        ELSE
            v_margin := 0;
        END IF;

        -- Insert into cost_of_goods_sold
        INSERT INTO public.cost_of_goods_sold (
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
            v_user_id,
            NEW.invoice_id,
            NEW.product_id,
            NEW.quantity,
            NEW.unit_price,
            NEW.total,
            v_cost,
            (NEW.quantity * v_cost),
            v_profit,
            v_margin,
            v_invoice_date
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger for Invoices
DROP TRIGGER IF EXISTS trigger_update_cogs_invoice ON public.invoice_items;
CREATE TRIGGER trigger_update_cogs_invoice
    AFTER INSERT ON public.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cogs_from_invoice();
