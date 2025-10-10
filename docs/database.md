# 📊 Database Schema - ConcreteBill

## Arquitectura General

ConcreteBill utiliza PostgreSQL con Supabase como base de datos principal, implementando Row Level Security (RLS) para aislamiento de datos por empresa.

## 🏢 Tablas Principales

### 👥 Usuarios y Autenticación

```sql
-- Tabla de perfiles (extiende auth.users de Supabase)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    company_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'employee',
    permissions JSONB,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🏢 Empresas

```sql
-- Configuración de empresas
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    currency VARCHAR(3) DEFAULT 'DOP',
    timezone VARCHAR(50) DEFAULT 'America/Santo_Domingo',
    fiscal_year_start INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 👥 Clientes

```sql
-- Gestión de clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    client_type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'business'
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Dominican Republic',
    postal_code VARCHAR(20),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- días
    discount_rate DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🛍️ Productos y Servicios

```sql
-- Catálogo de productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    category_id UUID REFERENCES product_categories(id),
    type VARCHAR(20) DEFAULT 'product', -- 'product', 'service'
    unit_of_measure VARCHAR(20) DEFAULT 'unit',
    cost_price DECIMAL(12,2) DEFAULT 0,
    sale_price DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00, -- ITBIS
    track_inventory BOOLEAN DEFAULT true,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 💰 Facturación

```sql
-- Facturas principales
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    invoice_number VARCHAR(50) NOT NULL,
    ncf VARCHAR(19), -- Número de Comprobante Fiscal (RD)
    invoice_type VARCHAR(20) DEFAULT 'invoice', -- 'invoice', 'quote', 'credit_note'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'DOP',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items de facturas
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    line_total DECIMAL(12,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 📦 Inventario

```sql
-- Control de stock
CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity_on_hand DECIMAL(10,3) DEFAULT 0,
    quantity_reserved DECIMAL(10,3) DEFAULT 0,
    quantity_available DECIMAL(10,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    last_cost DECIMAL(12,2),
    average_cost DECIMAL(12,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- Movimientos de inventario
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
    reference_type VARCHAR(20), -- 'invoice', 'purchase', 'adjustment', 'transfer'
    reference_id UUID,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Almacenes
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    address TEXT,
    manager_id UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 💸 Contabilidad

```sql
-- Gastos
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    category_id UUID REFERENCES expense_categories(id),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(20), -- 'cash', 'bank_transfer', 'credit_card', 'check'
    receipt_number VARCHAR(50),
    vendor VARCHAR(255),
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías de gastos
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    budget_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🚚 Logística

```sql
-- Guías de despacho
CREATE TABLE delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    invoice_id UUID REFERENCES invoices(id),
    delivery_number VARCHAR(50) NOT NULL,
    delivery_date DATE NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_transit', 'delivered', 'cancelled'
    delivery_address TEXT,
    notes TEXT,
    signature_url TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conductores
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(50),
    license_expiry DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehículos
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    plate_number VARCHAR(20) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    capacity_weight DECIMAL(8,2),
    capacity_volume DECIMAL(8,2),
    fuel_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 📅 Agenda y Eventos

```sql
-- Eventos de calendario
CREATE TABLE agenda_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_settings(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    event_type VARCHAR(20) DEFAULT 'meeting', -- 'meeting', 'appointment', 'reminder', 'task'
    client_id UUID REFERENCES clients(id),
    location VARCHAR(255),
    attendees TEXT[], -- Array de emails
    reminder_minutes INTEGER DEFAULT 15,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔐 Row Level Security (RLS)

Todas las tablas implementan RLS para aislamiento por empresa:

```sql
-- Ejemplo de política RLS
CREATE POLICY "Company isolation" ON invoices
    FOR ALL 
    USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- Habilitar RLS en todas las tablas
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... etc para todas las tablas
```

## 🔄 Triggers y Funciones

### Actualización Automática de Stock

```sql
-- Trigger para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION update_stock_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Reducir stock cuando se confirma una factura
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        INSERT INTO inventory_movements (
            company_id, product_id, movement_type, 
            reference_type, reference_id, quantity
        )
        SELECT 
            NEW.company_id, ii.product_id, 'out',
            'invoice', NEW.id, -ii.quantity
        FROM invoice_items ii 
        WHERE ii.invoice_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_stock_trigger
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_invoice();
```

### Cálculos Automáticos

```sql
-- Función para calcular totales de factura
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    subtotal DECIMAL(12,2);
    tax_amount DECIMAL(12,2);
    total DECIMAL(12,2);
BEGIN
    SELECT 
        SUM(line_total),
        SUM(line_total * tax_rate / 100),
        SUM(line_total * (1 + tax_rate / 100))
    INTO subtotal, tax_amount, total
    FROM invoice_items 
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    UPDATE invoices 
    SET 
        subtotal = COALESCE(subtotal, 0),
        tax_amount = COALESCE(tax_amount, 0),
        total_amount = COALESCE(total, 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## 📊 Vistas y Consultas Comunes

### Dashboard Metrics

```sql
-- Vista para métricas del dashboard
CREATE VIEW dashboard_metrics AS
SELECT 
    company_id,
    -- Ventas del mes actual
    (SELECT COALESCE(SUM(total_amount), 0)
     FROM invoices 
     WHERE company_id = cs.id 
       AND status = 'paid'
       AND EXTRACT(MONTH FROM issue_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM issue_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    ) as monthly_sales,
    
    -- Facturas pendientes
    (SELECT COALESCE(SUM(total_amount - paid_amount), 0)
     FROM invoices 
     WHERE company_id = cs.id 
       AND status IN ('sent', 'overdue')
    ) as outstanding_invoices,
    
    -- Productos con stock bajo
    (SELECT COUNT(*)
     FROM products p
     JOIN inventory_stock ist ON p.id = ist.product_id
     WHERE p.company_id = cs.id
       AND ist.quantity_on_hand <= p.min_stock_level
    ) as low_stock_items
    
FROM company_settings cs;
```

### Reportes de Inventario

```sql
-- Vista para reporte de inventario valorizado
CREATE VIEW inventory_valuation AS
SELECT 
    p.company_id,
    p.id as product_id,
    p.name as product_name,
    p.sku,
    ist.quantity_on_hand,
    ist.average_cost,
    (ist.quantity_on_hand * ist.average_cost) as stock_value,
    w.name as warehouse_name
FROM products p
JOIN inventory_stock ist ON p.id = ist.product_id
LEFT JOIN warehouses w ON ist.warehouse_id = w.id
WHERE ist.quantity_on_hand > 0;
```

## 🔍 Índices de Performance

```sql
-- Índices para optimización de consultas
CREATE INDEX idx_invoices_company_date ON invoices(company_id, issue_date);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_inventory_stock_product ON inventory_stock(product_id);
CREATE INDEX idx_expenses_company_date ON expenses(company_id, expense_date);
```

## 📦 Migraciones

Los scripts de migración están en `/scripts/` y deben ejecutarse en orden:

1. `01-create-tables.sql` - Tablas básicas
2. `02-seed-data.sql` - Datos iniciales
3. `03-fix-profiles.sql` - Corrección de perfiles
4. ... (continuar en orden numérico)
5. `34-fix-customer-pricing-datatype.sql` - Último script

## 🔄 Backup y Restauración

```sql
-- Backup completo
pg_dump --verbose --clean --no-acl --no-owner \
  --host=db.supabase.co --port=5432 \
  --username=postgres --dbname=postgres > backup.sql

-- Restauración
psql --host=db.supabase.co --port=5432 \
  --username=postgres --dbname=postgres < backup.sql
```

---

**📋 Este esquema evoluciona constantemente. Consultar scripts de migración para cambios recientes.**