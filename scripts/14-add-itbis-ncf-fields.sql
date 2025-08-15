-- Add ITBIS and NCF fields to invoices table
ALTER TABLE invoices 
ADD COLUMN include_itbis BOOLEAN DEFAULT false,
ADD COLUMN ncf VARCHAR(50);

-- Add ITBIS fields to invoice_items table
ALTER TABLE invoice_items 
ADD COLUMN itbis_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN itbis_amount DECIMAL(10,2) DEFAULT 0;
