# Inventario de Modulos, Tablas y Campos (estado actual)

Fecha de generacion: 2026-03-13

Fuente: introspeccion OpenAPI de Supabase (`public`) + uso real de tablas en `app/*` (`.from(...)`).

## Resumen

- Modulos con acceso a BD detectados: 19
- Tablas unicas detectadas en esos modulos: 37

## Flujo Revisado del Sistema

1. Seguridad y acceso: `profiles`, `user_profiles`, `user_roles`.
2. Catalogo base: `clients`, `products`, `services`, `categories`, `warehouses`.
3. Operacion comercial: `invoices`, `invoice_items`, `thermal_receipts`, `thermal_receipt_items`.
4. Inventario y costos: `product_warehouse_stock`, `stock_movements`, `purchase_history`, `cost_of_goods_sold`.
5. Caja y cobranzas: `cash_register_shifts`, `cash_register_withdrawals`, `accounts_receivable`, `ar_payments`, `ar_payment_applications`.
6. Logistica y rutas: `routes`, `daily_dispatches`, `dispatch_items`, `dispatch_inventory_loads`, `dispatch_liquidations`, `employee_penalties`.
7. Suscripciones y control de acceso por plan: `subscription_plans`, `user_subscriptions`, `subscription_requests`, `subscription_history`, `payment_notifications`.

Este flujo resume el orden recomendado para revisar y refactorizar durante la migracion.

## Modulo: actions

Tabla: dispatch_items
Campos:

- id (uuid, requerido)
- dispatch_id (uuid, requerido)
- client_id (uuid, requerido)
- visit_order (integer)
- is_visited (boolean)
- visited_at (timestamp with time zone)
- notes (text)
- created_at (timestamp with time zone)

Relaciones (FK):

- dispatch_items.dispatch_id -> daily_dispatches.id
- dispatch_items.client_id -> clients.id

Tabla: invoices
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- project_id (uuid)
- driver_id (uuid)
- vehicle_id (uuid)
- invoice_number (text, requerido)
- invoice_date (date, requerido)
- issue_date (date, requerido)
- due_date (date)
- subtotal (numeric)
- tax_rate (numeric)
- tax_amount (numeric)
- total (numeric)
- status (text)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- include_itbis (boolean)
- ncf (character varying)
- discount_type (text)
- discount_value (numeric, requerido)
- payment_method (character varying)
- monto_bienes (numeric)
- monto_servicios (numeric)
- monto_exento (numeric)
- tipo_comprobante (character varying)
- indicador_anulacion (integer)
- owner_id (uuid)
- employee_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- invoices.client_id -> clients.id
- invoices.project_id -> projects.id
- invoices.vehicle_id -> vehicles.id
- invoices.cash_shift_id -> cash_register_shifts.id

Tabla: returned_items
Campos:

- id (uuid, requerido)
- receipt_id (uuid)
- product_id (uuid)
- quantity (numeric, requerido)
- condition (text)
- notes (text)
- created_at (timestamp with time zone)

Relaciones (FK):

- returned_items.receipt_id -> thermal_receipts.id
- returned_items.product_id -> products.id

Tabla: thermal_receipt_items
Campos:

- id (uuid, requerido)
- thermal_receipt_id (uuid)
- product_id (uuid)
- service_id (uuid)
- item_name (character varying, requerido)
- quantity (numeric, requerido)
- unit_price (numeric, requerido)
- line_total (numeric, requerido)
- created_at (timestamp with time zone)

Relaciones (FK):

- thermal_receipt_items.thermal_receipt_id -> thermal_receipts.id
- thermal_receipt_items.product_id -> products.id
- thermal_receipt_items.service_id -> services.id

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

Tabla: user_profiles
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- parent_user_id (uuid)
- role_id (uuid)
- display_name (character varying, requerido)
- department (character varying)
- job_position (character varying)
- phone (character varying)
- is_active (boolean)
- can_create_invoices (boolean)
- can_view_finances (boolean)
- can_manage_inventory (boolean)
- can_manage_clients (boolean)
- can_manage_users (boolean)
- can_view_reports (boolean)
- hourly_rate (numeric)
- max_invoice_amount (numeric)
- allowed_modules (jsonb, requerido)
- restrictions (jsonb, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- root_owner_id (uuid)
- email (text)

Relaciones (FK):

- user_profiles.role_id -> user_roles.id

## Modulo: api

Tabla: accounts_receivable
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid)
- thermal_receipt_id (uuid)
- invoice_id (uuid)
- document_number (character varying)
- description (text)
- total_amount (numeric, requerido)
- paid_amount (numeric, requerido)
- balance (numeric)
- issue_date (date, requerido)
- due_date (date, requerido)
- payment_terms (integer)
- status (character varying)
- overdue_notified (boolean)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- accounts_receivable.user_id -> profiles.id
- accounts_receivable.client_id -> clients.id
- accounts_receivable.thermal_receipt_id -> thermal_receipts.id
- accounts_receivable.invoice_id -> invoices.id

Tabla: product_warehouse_stock
Campos:

- id (uuid, requerido)
- product_id (uuid, requerido)
- warehouse_id (uuid, requerido)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- location (character varying)
- last_movement_date (timestamp with time zone)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- product_warehouse_stock.product_id -> products.id
- product_warehouse_stock.warehouse_id -> warehouses.id

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

Tabla: stock_movements
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- product_id (uuid, requerido)
- warehouse_id (uuid, requerido)
- movement_type (character varying, requerido)
- quantity_before (numeric, requerido)
- quantity_change (numeric, requerido)
- quantity_after (numeric, requerido)
- unit_cost (numeric)
- total_cost (numeric)
- reference_type (character varying)
- reference_id (uuid)
- notes (text)
- movement_date (timestamp with time zone)
- created_at (timestamp with time zone)

Relaciones (FK):

- stock_movements.user_id -> profiles.id
- stock_movements.product_id -> products.id
- stock_movements.warehouse_id -> warehouses.id

Tabla: user_profiles
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- parent_user_id (uuid)
- role_id (uuid)
- display_name (character varying, requerido)
- department (character varying)
- job_position (character varying)
- phone (character varying)
- is_active (boolean)
- can_create_invoices (boolean)
- can_view_finances (boolean)
- can_manage_inventory (boolean)
- can_manage_clients (boolean)
- can_manage_users (boolean)
- can_view_reports (boolean)
- hourly_rate (numeric)
- max_invoice_amount (numeric)
- allowed_modules (jsonb, requerido)
- restrictions (jsonb, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- root_owner_id (uuid)
- email (text)

Relaciones (FK):

- user_profiles.role_id -> user_roles.id

Tabla: user_roles
Campos:

- id (uuid, requerido)
- name (character varying, requerido)
- display_name (character varying, requerido)
- description (text)
- permissions (jsonb, requerido)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- (No definidas en OpenAPI para esta tabla)

Tabla: user_subscriptions
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- plan_id (uuid)
- start_date (timestamp with time zone)
- end_date (timestamp with time zone)
- trial_end_date (timestamp with time zone)
- status (character varying)
- billing_cycle (character varying)
- payment_method (character varying)
- last_payment_date (timestamp with time zone)
- next_billing_date (timestamp with time zone)
- amount_paid (numeric)
- currency (character varying)
- managed_by (uuid)
- notes (text)
- current_max_users (integer)
- current_max_invoices (integer)
- current_max_products (integer)
- current_max_clients (integer)
- current_users_count (integer)
- current_invoices_count (integer)
- current_products_count (integer)
- current_clients_count (integer)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- cancelled_at (timestamp with time zone)

Relaciones (FK):

- user_subscriptions.plan_id -> subscription_plans.id

Tabla: warehouses
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- name (character varying, requerido)
- description (text)
- address (text)
- manager_name (character varying)
- phone (character varying)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- warehouses.user_id -> profiles.id

## Modulo: cash-register

Tabla: ar_payments
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid)
- ar_id (uuid)
- payment_number (character varying, requerido)
- amount (numeric, requerido)
- payment_method (character varying)
- reference_number (character varying)
- bank_name (character varying)
- payment_date (timestamp with time zone)
- registered_by (uuid)
- notes (text)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- cash_shift_id (uuid)

Relaciones (FK):

- ar_payments.user_id -> profiles.id
- ar_payments.client_id -> clients.id
- ar_payments.ar_id -> accounts_receivable.id
- ar_payments.registered_by -> profiles.id
- ar_payments.cash_shift_id -> cash_register_shifts.id

Tabla: cash_register_shifts
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- opened_by (uuid, requerido)
- closed_by (uuid)
- opened_at (timestamp with time zone)
- closed_at (timestamp with time zone)
- opening_amount (numeric, requerido)
- reported_cash (numeric)
- expected_cash (numeric)
- variance (numeric)
- total_cash_sales (numeric)
- total_card_sales (numeric)
- total_transfer_sales (numeric)
- total_credit_sales (numeric)
- total_cash_payments (numeric)
- total_cash_withdrawals (numeric)
- status (character varying, requerido)
- opening_notes (text)
- closing_notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- cash_register_shifts.user_id -> profiles.id
- cash_register_shifts.opened_by -> profiles.id
- cash_register_shifts.closed_by -> profiles.id

Tabla: cash_register_withdrawals
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- shift_id (uuid, requerido)
- amount (numeric, requerido)
- reason (text, requerido)
- category (character varying)
- authorized_by (uuid)
- created_at (timestamp with time zone)

Relaciones (FK):

- cash_register_withdrawals.user_id -> profiles.id
- cash_register_withdrawals.shift_id -> cash_register_shifts.id
- cash_register_withdrawals.authorized_by -> profiles.id

Tabla: invoices
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- project_id (uuid)
- driver_id (uuid)
- vehicle_id (uuid)
- invoice_number (text, requerido)
- invoice_date (date, requerido)
- issue_date (date, requerido)
- due_date (date)
- subtotal (numeric)
- tax_rate (numeric)
- tax_amount (numeric)
- total (numeric)
- status (text)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- include_itbis (boolean)
- ncf (character varying)
- discount_type (text)
- discount_value (numeric, requerido)
- payment_method (character varying)
- monto_bienes (numeric)
- monto_servicios (numeric)
- monto_exento (numeric)
- tipo_comprobante (character varying)
- indicador_anulacion (integer)
- owner_id (uuid)
- employee_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- invoices.client_id -> clients.id
- invoices.project_id -> projects.id
- invoices.vehicle_id -> vehicles.id
- invoices.cash_shift_id -> cash_register_shifts.id

Tabla: profiles
Campos:

- id (uuid, requerido)
- email (text, requerido)
- full_name (text)
- role (public.user_role)
- company_name (text)
- company_logo (text)
- company_address (text)
- company_phone (text)
- company_rnc (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- company_email (text)
- company_logo_url (text)
- company_website (text)

Relaciones (FK):

- (No definidas en OpenAPI para esta tabla)

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

## Modulo: clients

Tabla: client_returnables_balances
Campos:

- user_id (uuid)
- client_id (uuid)
- client_name (text)
- product_id (uuid)
- product_name (text)
- product_sku (character varying)
- balance (bigint)
- total_entregas (bigint)
- total_devoluciones (bigint)
- saldo_inicial (bigint)
- ajustes_netos (bigint)
- ultimo_movimiento (timestamp with time zone)

Relaciones (FK):

- client_returnables_balances.client_id -> clients.id
- client_returnables_balances.product_id -> products.id

Tabla: client_returnables_ledger
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid, requerido)
- product_id (uuid, requerido)
- transaction_type (character varying, requerido)
- quantity (integer, requerido)
- reference_type (character varying)
- reference_id (uuid)
- notes (text)
- created_by (uuid)
- created_at (timestamp with time zone)

Relaciones (FK):

- client_returnables_ledger.client_id -> clients.id
- client_returnables_ledger.product_id -> products.id
- client_returnables_ledger.created_by -> profiles.id

Tabla: clients
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- rnc (text)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- tipo_id (integer)
- is_provider (boolean)
- id_number (character varying)
- cedula (character varying)
- owner_id (uuid)
- employee_id (uuid)

Relaciones (FK):

- clients.user_id -> profiles.id

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

Tabla: stock_movements
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- product_id (uuid, requerido)
- warehouse_id (uuid, requerido)
- movement_type (character varying, requerido)
- quantity_before (numeric, requerido)
- quantity_change (numeric, requerido)
- quantity_after (numeric, requerido)
- unit_cost (numeric)
- total_cost (numeric)
- reference_type (character varying)
- reference_id (uuid)
- notes (text)
- movement_date (timestamp with time zone)
- created_at (timestamp with time zone)

Relaciones (FK):

- stock_movements.user_id -> profiles.id
- stock_movements.product_id -> products.id
- stock_movements.warehouse_id -> warehouses.id

Tabla: warehouses
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- name (character varying, requerido)
- description (text)
- address (text)
- manager_name (character varying)
- phone (character varying)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- warehouses.user_id -> profiles.id

## Modulo: dgii-reports

Tabla: clients
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- rnc (text)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- tipo_id (integer)
- is_provider (boolean)
- id_number (character varying)
- cedula (character varying)
- owner_id (uuid)
- employee_id (uuid)

Relaciones (FK):

- clients.user_id -> profiles.id

Tabla: expenses
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- category_id (uuid)
- description (text, requerido)
- amount (numeric, requerido)
- expense_date (date, requerido)
- notes (text)
- receipt_url (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- category (text)
- receipt_number (character varying)
- client_id (uuid)
- ncf (character varying)
- itbis_amount (numeric)
- provider_name (character varying)
- provider_rnc (character varying)

Relaciones (FK):

- expenses.category_id -> expense_categories.id
- expenses.client_id -> clients.id

Tabla: invoice_items
Campos:

- id (uuid, requerido)
- invoice_id (uuid)
- product_id (uuid)
- description (text, requerido)
- quantity (numeric, requerido)
- unit_price (numeric, requerido)
- total (numeric, requerido)
- unit (text)
- created_at (timestamp with time zone)
- itbis_rate (numeric)
- itbis_amount (numeric)
- service_id (uuid)

Relaciones (FK):

- invoice_items.invoice_id -> invoices.id
- invoice_items.product_id -> products.id
- invoice_items.service_id -> services.id

Tabla: invoices
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- project_id (uuid)
- driver_id (uuid)
- vehicle_id (uuid)
- invoice_number (text, requerido)
- invoice_date (date, requerido)
- issue_date (date, requerido)
- due_date (date)
- subtotal (numeric)
- tax_rate (numeric)
- tax_amount (numeric)
- total (numeric)
- status (text)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- include_itbis (boolean)
- ncf (character varying)
- discount_type (text)
- discount_value (numeric, requerido)
- payment_method (character varying)
- monto_bienes (numeric)
- monto_servicios (numeric)
- monto_exento (numeric)
- tipo_comprobante (character varying)
- indicador_anulacion (integer)
- owner_id (uuid)
- employee_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- invoices.client_id -> clients.id
- invoices.project_id -> projects.id
- invoices.vehicle_id -> vehicles.id
- invoices.cash_shift_id -> cash_register_shifts.id

## Modulo: employee

Tabla: clients
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- rnc (text)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- tipo_id (integer)
- is_provider (boolean)
- id_number (character varying)
- cedula (character varying)
- owner_id (uuid)
- employee_id (uuid)

Relaciones (FK):

- clients.user_id -> profiles.id

Tabla: daily_dispatches
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- route_id (uuid, requerido)
- dispatch_date (date, requerido)
- status (text, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- driver_id (uuid)
- vehicle_id (uuid)
- petty_cash_amount (numeric)
- dispatch_status (text)
- departure_time (timestamp with time zone)
- total_cash_expected (numeric)
- total_cash_received (numeric)
- liquidation_notes (text)
- closed_at (timestamp with time zone)

Relaciones (FK):

- daily_dispatches.route_id -> routes.id
- daily_dispatches.driver_id -> drivers.id
- daily_dispatches.vehicle_id -> fleet_vehicles.id

Tabla: dispatch_items
Campos:

- id (uuid, requerido)
- dispatch_id (uuid, requerido)
- client_id (uuid, requerido)
- visit_order (integer)
- is_visited (boolean)
- visited_at (timestamp with time zone)
- notes (text)
- created_at (timestamp with time zone)

Relaciones (FK):

- dispatch_items.dispatch_id -> daily_dispatches.id
- dispatch_items.client_id -> clients.id

Tabla: drivers
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- full_name (text, requerido)
- cedula (text)
- phone (text)
- license_number (text)
- license_expiry (date)
- is_active (boolean)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- employee_id (uuid)

Relaciones (FK):

- (No definidas en OpenAPI para esta tabla)

## Modulo: inventory

Tabla: product_warehouse_stock
Campos:

- id (uuid, requerido)
- product_id (uuid, requerido)
- warehouse_id (uuid, requerido)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- location (character varying)
- last_movement_date (timestamp with time zone)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- product_warehouse_stock.product_id -> products.id
- product_warehouse_stock.warehouse_id -> warehouses.id

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

Tabla: stock_movements
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- product_id (uuid, requerido)
- warehouse_id (uuid, requerido)
- movement_type (character varying, requerido)
- quantity_before (numeric, requerido)
- quantity_change (numeric, requerido)
- quantity_after (numeric, requerido)
- unit_cost (numeric)
- total_cost (numeric)
- reference_type (character varying)
- reference_id (uuid)
- notes (text)
- movement_date (timestamp with time zone)
- created_at (timestamp with time zone)

Relaciones (FK):

- stock_movements.user_id -> profiles.id
- stock_movements.product_id -> products.id
- stock_movements.warehouse_id -> warehouses.id

Tabla: user_profiles
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- parent_user_id (uuid)
- role_id (uuid)
- display_name (character varying, requerido)
- department (character varying)
- job_position (character varying)
- phone (character varying)
- is_active (boolean)
- can_create_invoices (boolean)
- can_view_finances (boolean)
- can_manage_inventory (boolean)
- can_manage_clients (boolean)
- can_manage_users (boolean)
- can_view_reports (boolean)
- hourly_rate (numeric)
- max_invoice_amount (numeric)
- allowed_modules (jsonb, requerido)
- restrictions (jsonb, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- root_owner_id (uuid)
- email (text)

Relaciones (FK):

- user_profiles.role_id -> user_roles.id

Tabla: warehouses
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- name (character varying, requerido)
- description (text)
- address (text)
- manager_name (character varying)
- phone (character varying)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- warehouses.user_id -> profiles.id

## Modulo: invoices

Tabla: cash_register_shifts
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- opened_by (uuid, requerido)
- closed_by (uuid)
- opened_at (timestamp with time zone)
- closed_at (timestamp with time zone)
- opening_amount (numeric, requerido)
- reported_cash (numeric)
- expected_cash (numeric)
- variance (numeric)
- total_cash_sales (numeric)
- total_card_sales (numeric)
- total_transfer_sales (numeric)
- total_credit_sales (numeric)
- total_cash_payments (numeric)
- total_cash_withdrawals (numeric)
- status (character varying, requerido)
- opening_notes (text)
- closing_notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- cash_register_shifts.user_id -> profiles.id
- cash_register_shifts.opened_by -> profiles.id
- cash_register_shifts.closed_by -> profiles.id

## Modulo: products

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

## Modulo: purchases

Tabla: purchase_history
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- product_id (uuid)
- purchase_type (character varying, requerido)
- description (text, requerido)
- amount (numeric, requerido)
- quantity (numeric)
- unit_cost (numeric)
- expense_category (character varying)
- supplier (character varying)
- receipt_number (character varying)
- purchase_date (date, requerido)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- purchase_history.product_id -> products.id

## Modulo: receivables

Tabla: accounts_receivable
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid)
- thermal_receipt_id (uuid)
- invoice_id (uuid)
- document_number (character varying)
- description (text)
- total_amount (numeric, requerido)
- paid_amount (numeric, requerido)
- balance (numeric)
- issue_date (date, requerido)
- due_date (date, requerido)
- payment_terms (integer)
- status (character varying)
- overdue_notified (boolean)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- accounts_receivable.user_id -> profiles.id
- accounts_receivable.client_id -> clients.id
- accounts_receivable.thermal_receipt_id -> thermal_receipts.id
- accounts_receivable.invoice_id -> invoices.id

Tabla: ar_payment_applications
Campos:

- id (uuid, requerido)
- payment_id (uuid, requerido)
- ar_id (uuid, requerido)
- amount_applied (numeric, requerido)
- created_at (timestamp with time zone)

Relaciones (FK):

- ar_payment_applications.payment_id -> ar_payments.id
- ar_payment_applications.ar_id -> accounts_receivable.id

Tabla: ar_payments
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid)
- ar_id (uuid)
- payment_number (character varying, requerido)
- amount (numeric, requerido)
- payment_method (character varying)
- reference_number (character varying)
- bank_name (character varying)
- payment_date (timestamp with time zone)
- registered_by (uuid)
- notes (text)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- cash_shift_id (uuid)

Relaciones (FK):

- ar_payments.user_id -> profiles.id
- ar_payments.client_id -> clients.id
- ar_payments.ar_id -> accounts_receivable.id
- ar_payments.registered_by -> profiles.id
- ar_payments.cash_shift_id -> cash_register_shifts.id

Tabla: cash_register_shifts
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- opened_by (uuid, requerido)
- closed_by (uuid)
- opened_at (timestamp with time zone)
- closed_at (timestamp with time zone)
- opening_amount (numeric, requerido)
- reported_cash (numeric)
- expected_cash (numeric)
- variance (numeric)
- total_cash_sales (numeric)
- total_card_sales (numeric)
- total_transfer_sales (numeric)
- total_credit_sales (numeric)
- total_cash_payments (numeric)
- total_cash_withdrawals (numeric)
- status (character varying, requerido)
- opening_notes (text)
- closing_notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- cash_register_shifts.user_id -> profiles.id
- cash_register_shifts.opened_by -> profiles.id
- cash_register_shifts.closed_by -> profiles.id

Tabla: clients
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- rnc (text)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- tipo_id (integer)
- is_provider (boolean)
- id_number (character varying)
- cedula (character varying)
- owner_id (uuid)
- employee_id (uuid)

Relaciones (FK):

- clients.user_id -> profiles.id

Tabla: invoices
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- project_id (uuid)
- driver_id (uuid)
- vehicle_id (uuid)
- invoice_number (text, requerido)
- invoice_date (date, requerido)
- issue_date (date, requerido)
- due_date (date)
- subtotal (numeric)
- tax_rate (numeric)
- tax_amount (numeric)
- total (numeric)
- status (text)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- include_itbis (boolean)
- ncf (character varying)
- discount_type (text)
- discount_value (numeric, requerido)
- payment_method (character varying)
- monto_bienes (numeric)
- monto_servicios (numeric)
- monto_exento (numeric)
- tipo_comprobante (character varying)
- indicador_anulacion (integer)
- owner_id (uuid)
- employee_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- invoices.client_id -> clients.id
- invoices.project_id -> projects.id
- invoices.vehicle_id -> vehicles.id
- invoices.cash_shift_id -> cash_register_shifts.id

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

## Modulo: reports

Tabla: invoice_items
Campos:

- id (uuid, requerido)
- invoice_id (uuid)
- product_id (uuid)
- description (text, requerido)
- quantity (numeric, requerido)
- unit_price (numeric, requerido)
- total (numeric, requerido)
- unit (text)
- created_at (timestamp with time zone)
- itbis_rate (numeric)
- itbis_amount (numeric)
- service_id (uuid)

Relaciones (FK):

- invoice_items.invoice_id -> invoices.id
- invoice_items.product_id -> products.id
- invoice_items.service_id -> services.id

Tabla: invoices
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- project_id (uuid)
- driver_id (uuid)
- vehicle_id (uuid)
- invoice_number (text, requerido)
- invoice_date (date, requerido)
- issue_date (date, requerido)
- due_date (date)
- subtotal (numeric)
- tax_rate (numeric)
- tax_amount (numeric)
- total (numeric)
- status (text)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- include_itbis (boolean)
- ncf (character varying)
- discount_type (text)
- discount_value (numeric, requerido)
- payment_method (character varying)
- monto_bienes (numeric)
- monto_servicios (numeric)
- monto_exento (numeric)
- tipo_comprobante (character varying)
- indicador_anulacion (integer)
- owner_id (uuid)
- employee_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- invoices.client_id -> clients.id
- invoices.project_id -> projects.id
- invoices.vehicle_id -> vehicles.id
- invoices.cash_shift_id -> cash_register_shifts.id

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

Tabla: services
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- name (character varying, requerido)
- description (text)
- price (numeric)
- unit (character varying)
- category (character varying)
- duration (character varying)
- requirements (text)
- includes (text)
- warranty_months (integer)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- category_id (uuid)
- service_code (text)
- short_description (text)
- production_cost (numeric)
- owner_id (uuid)

Relaciones (FK):

- services.category_id -> categories.id

Tabla: thermal_receipt_items
Campos:

- id (uuid, requerido)
- thermal_receipt_id (uuid)
- product_id (uuid)
- service_id (uuid)
- item_name (character varying, requerido)
- quantity (numeric, requerido)
- unit_price (numeric, requerido)
- line_total (numeric, requerido)
- created_at (timestamp with time zone)

Relaciones (FK):

- thermal_receipt_items.thermal_receipt_id -> thermal_receipts.id
- thermal_receipt_items.product_id -> products.id
- thermal_receipt_items.service_id -> services.id

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

## Modulo: returnables

Tabla: client_returnables_balances
Campos:

- user_id (uuid)
- client_id (uuid)
- client_name (text)
- product_id (uuid)
- product_name (text)
- product_sku (character varying)
- balance (bigint)
- total_entregas (bigint)
- total_devoluciones (bigint)
- saldo_inicial (bigint)
- ajustes_netos (bigint)
- ultimo_movimiento (timestamp with time zone)

Relaciones (FK):

- client_returnables_balances.client_id -> clients.id
- client_returnables_balances.product_id -> products.id

Tabla: client_returnables_summary
Campos:

- user_id (uuid)
- client_id (uuid)
- client_name (text)
- tipos_de_envases (bigint)
- total_unidades_prestadas (numeric)
- items_con_balance_negativo (bigint)
- ultimo_movimiento (timestamp with time zone)

Relaciones (FK):

- client_returnables_summary.client_id -> clients.id

## Modulo: route-liquidation

Tabla: daily_dispatches
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- route_id (uuid, requerido)
- dispatch_date (date, requerido)
- status (text, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- driver_id (uuid)
- vehicle_id (uuid)
- petty_cash_amount (numeric)
- dispatch_status (text)
- departure_time (timestamp with time zone)
- total_cash_expected (numeric)
- total_cash_received (numeric)
- liquidation_notes (text)
- closed_at (timestamp with time zone)

Relaciones (FK):

- daily_dispatches.route_id -> routes.id
- daily_dispatches.driver_id -> drivers.id
- daily_dispatches.vehicle_id -> fleet_vehicles.id

Tabla: dispatch_inventory_loads
Campos:

- id (uuid, requerido)
- dispatch_id (uuid, requerido)
- product_id (uuid)
- product_name (text, requerido)
- quantity_loaded (numeric, requerido)
- unit (text)
- created_at (timestamp with time zone)

Relaciones (FK):

- dispatch_inventory_loads.dispatch_id -> daily_dispatches.id
- dispatch_inventory_loads.product_id -> products.id

Tabla: dispatch_liquidations
Campos:

- id (uuid, requerido)
- dispatch_id (uuid, requerido)
- product_id (uuid)
- quantity_full_returned (numeric, requerido)
- quantity_empty_returned (numeric, requerido)
- created_at (timestamp with time zone)

Relaciones (FK):

- dispatch_liquidations.dispatch_id -> daily_dispatches.id
- dispatch_liquidations.product_id -> products.id

Tabla: employee_penalties
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- driver_id (uuid, requerido)
- dispatch_id (uuid)
- amount (numeric, requerido)
- reason (text, requerido)
- status (text, requerido)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- employee_penalties.driver_id -> drivers.id
- employee_penalties.dispatch_id -> daily_dispatches.id

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

## Modulo: services

Tabla: services
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- name (character varying, requerido)
- description (text)
- price (numeric)
- unit (character varying)
- category (character varying)
- duration (character varying)
- requirements (text)
- includes (text)
- warranty_months (integer)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- category_id (uuid)
- service_code (text)
- short_description (text)
- production_cost (numeric)
- owner_id (uuid)

Relaciones (FK):

- services.category_id -> categories.id

## Modulo: settings

Tabla: employee_goals
Campos:

- id (uuid, requerido)
- employee_id (uuid, requerido)
- owner_id (uuid, requerido)
- periodo_mes (integer, requerido)
- periodo_anio (integer, requerido)
- fecha_inicio (date, requerido)
- fecha_fin (date, requerido)
- meta_ventas_total (numeric)
- meta_facturas_cantidad (integer)
- meta_clientes_nuevos (integer)
- notas (text)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- (No definidas en OpenAPI para esta tabla)

Tabla: user_profiles
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- parent_user_id (uuid)
- role_id (uuid)
- display_name (character varying, requerido)
- department (character varying)
- job_position (character varying)
- phone (character varying)
- is_active (boolean)
- can_create_invoices (boolean)
- can_view_finances (boolean)
- can_manage_inventory (boolean)
- can_manage_clients (boolean)
- can_manage_users (boolean)
- can_view_reports (boolean)
- hourly_rate (numeric)
- max_invoice_amount (numeric)
- allowed_modules (jsonb, requerido)
- restrictions (jsonb, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- root_owner_id (uuid)
- email (text)

Relaciones (FK):

- user_profiles.role_id -> user_roles.id

## Modulo: subscriptions

Tabla: payment_notifications
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- user_email (character varying, requerido)
- subscription_id (uuid)
- payment_note (text, requerido)
- payment_amount (numeric)
- payment_method (character varying)
- payment_reference (character varying)
- status (character varying)
- admin_notes (text)
- reviewed_by (uuid)
- reviewed_at (timestamp with time zone)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- payment_notifications.subscription_id -> user_subscriptions.id

Tabla: subscription_history
Campos:

- id (uuid, requerido)
- subscription_id (uuid, requerido)
- user_id (uuid, requerido)
- action (character varying, requerido)
- old_plan_id (uuid)
- new_plan_id (uuid)
- old_status (character varying)
- new_status (character varying)
- reason (text)
- notes (text)
- changed_by (uuid)
- changed_by_email (character varying)
- change_data (jsonb)
- created_at (timestamp with time zone)

Relaciones (FK):

- subscription_history.subscription_id -> user_subscriptions.id

Tabla: subscription_plans
Campos:

- id (uuid, requerido)
- name (character varying, requerido)
- display_name (character varying, requerido)
- description (text)
- price_monthly (numeric, requerido)
- price_yearly (numeric, requerido)
- max_users (integer, requerido)
- max_invoices (integer, requerido)
- max_products (integer, requerido)
- max_clients (integer, requerido)
- features (jsonb)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- (No definidas en OpenAPI para esta tabla)

Tabla: subscription_requests
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- plan_id (uuid, requerido)
- message (text)
- status (character varying)
- reviewed_by (uuid)
- reviewed_at (timestamp with time zone)
- admin_notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- (No definidas en OpenAPI para esta tabla)

Tabla: user_profiles
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- parent_user_id (uuid)
- role_id (uuid)
- display_name (character varying, requerido)
- department (character varying)
- job_position (character varying)
- phone (character varying)
- is_active (boolean)
- can_create_invoices (boolean)
- can_view_finances (boolean)
- can_manage_inventory (boolean)
- can_manage_clients (boolean)
- can_manage_users (boolean)
- can_view_reports (boolean)
- hourly_rate (numeric)
- max_invoice_amount (numeric)
- allowed_modules (jsonb, requerido)
- restrictions (jsonb, requerido)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- root_owner_id (uuid)
- email (text)

Relaciones (FK):

- user_profiles.role_id -> user_roles.id

Tabla: user_subscriptions
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- plan_id (uuid)
- start_date (timestamp with time zone)
- end_date (timestamp with time zone)
- trial_end_date (timestamp with time zone)
- status (character varying)
- billing_cycle (character varying)
- payment_method (character varying)
- last_payment_date (timestamp with time zone)
- next_billing_date (timestamp with time zone)
- amount_paid (numeric)
- currency (character varying)
- managed_by (uuid)
- notes (text)
- current_max_users (integer)
- current_max_invoices (integer)
- current_max_products (integer)
- current_max_clients (integer)
- current_users_count (integer)
- current_invoices_count (integer)
- current_products_count (integer)
- current_clients_count (integer)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- cancelled_at (timestamp with time zone)

Relaciones (FK):

- user_subscriptions.plan_id -> subscription_plans.id

## Modulo: system-info

Tabla: cost_of_goods_sold
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- invoice_id (uuid)
- product_id (uuid, requerido)
- quantity_sold (numeric, requerido)
- sale_price (numeric, requerido)
- total_sale (numeric, requerido)
- unit_cost (numeric, requerido)
- total_cost (numeric, requerido)
- gross_profit (numeric, requerido)
- profit_margin (numeric)
- sale_date (timestamp without time zone, requerido)
- created_at (timestamp without time zone)
- thermal_receipt_id (uuid)

Relaciones (FK):

- cost_of_goods_sold.invoice_id -> invoices.id
- cost_of_goods_sold.product_id -> products.id
- cost_of_goods_sold.thermal_receipt_id -> thermal_receipts.id

Tabla: invoice_items
Campos:

- id (uuid, requerido)
- invoice_id (uuid)
- product_id (uuid)
- description (text, requerido)
- quantity (numeric, requerido)
- unit_price (numeric, requerido)
- total (numeric, requerido)
- unit (text)
- created_at (timestamp with time zone)
- itbis_rate (numeric)
- itbis_amount (numeric)
- service_id (uuid)

Relaciones (FK):

- invoice_items.invoice_id -> invoices.id
- invoice_items.product_id -> products.id
- invoice_items.service_id -> services.id

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

Tabla: thermal_receipt_items
Campos:

- id (uuid, requerido)
- thermal_receipt_id (uuid)
- product_id (uuid)
- service_id (uuid)
- item_name (character varying, requerido)
- quantity (numeric, requerido)
- unit_price (numeric, requerido)
- line_total (numeric, requerido)
- created_at (timestamp with time zone)

Relaciones (FK):

- thermal_receipt_items.thermal_receipt_id -> thermal_receipts.id
- thermal_receipt_items.product_id -> products.id
- thermal_receipt_items.service_id -> services.id

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

## Modulo: thermal-receipts

Tabla: accounts_receivable
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid)
- thermal_receipt_id (uuid)
- invoice_id (uuid)
- document_number (character varying)
- description (text)
- total_amount (numeric, requerido)
- paid_amount (numeric, requerido)
- balance (numeric)
- issue_date (date, requerido)
- due_date (date, requerido)
- payment_terms (integer)
- status (character varying)
- overdue_notified (boolean)
- notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- accounts_receivable.user_id -> profiles.id
- accounts_receivable.client_id -> clients.id
- accounts_receivable.thermal_receipt_id -> thermal_receipts.id
- accounts_receivable.invoice_id -> invoices.id

Tabla: cash_register_shifts
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- opened_by (uuid, requerido)
- closed_by (uuid)
- opened_at (timestamp with time zone)
- closed_at (timestamp with time zone)
- opening_amount (numeric, requerido)
- reported_cash (numeric)
- expected_cash (numeric)
- variance (numeric)
- total_cash_sales (numeric)
- total_card_sales (numeric)
- total_transfer_sales (numeric)
- total_credit_sales (numeric)
- total_cash_payments (numeric)
- total_cash_withdrawals (numeric)
- status (character varying, requerido)
- opening_notes (text)
- closing_notes (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- cash_register_shifts.user_id -> profiles.id
- cash_register_shifts.opened_by -> profiles.id
- cash_register_shifts.closed_by -> profiles.id

Tabla: client_returnables_balances
Campos:

- user_id (uuid)
- client_id (uuid)
- client_name (text)
- product_id (uuid)
- product_name (text)
- product_sku (character varying)
- balance (bigint)
- total_entregas (bigint)
- total_devoluciones (bigint)
- saldo_inicial (bigint)
- ajustes_netos (bigint)
- ultimo_movimiento (timestamp with time zone)

Relaciones (FK):

- client_returnables_balances.client_id -> clients.id
- client_returnables_balances.product_id -> products.id

Tabla: client_returnables_ledger
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- client_id (uuid, requerido)
- product_id (uuid, requerido)
- transaction_type (character varying, requerido)
- quantity (integer, requerido)
- reference_type (character varying)
- reference_id (uuid)
- notes (text)
- created_by (uuid)
- created_at (timestamp with time zone)

Relaciones (FK):

- client_returnables_ledger.client_id -> clients.id
- client_returnables_ledger.product_id -> products.id
- client_returnables_ledger.created_by -> profiles.id

Tabla: dispatch_items
Campos:

- id (uuid, requerido)
- dispatch_id (uuid, requerido)
- client_id (uuid, requerido)
- visit_order (integer)
- is_visited (boolean)
- visited_at (timestamp with time zone)
- notes (text)
- created_at (timestamp with time zone)

Relaciones (FK):

- dispatch_items.dispatch_id -> daily_dispatches.id
- dispatch_items.client_id -> clients.id

Tabla: products
Campos:

- id (uuid, requerido)
- user_id (uuid)
- name (text, requerido)
- description (text)
- unit_price (numeric, requerido)
- unit (text)
- mix_type (text)
- resistance (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- price (numeric)
- category (character varying)
- brand (character varying)
- model (character varying)
- sku (character varying)
- stock_quantity (integer)
- min_stock (integer)
- weight (numeric)
- dimensions (character varying)
- color (character varying)
- material (character varying)
- warranty_months (integer)
- current_stock (numeric)
- reserved_stock (numeric)
- available_stock (numeric)
- reorder_point (numeric)
- max_stock (numeric)
- cost_price (numeric)
- location (character varying)
- barcode (character varying)
- supplier_id (uuid)
- is_trackable (boolean)
- category_id (uuid)
- product_code (text)
- short_description (text)
- owner_id (uuid)
- is_returnable (boolean)
- returnable_deposit (numeric)

Relaciones (FK):

- products.user_id -> profiles.id
- products.supplier_id -> suppliers.id
- products.category_id -> categories.id

Tabla: stock_movements
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- product_id (uuid, requerido)
- warehouse_id (uuid, requerido)
- movement_type (character varying, requerido)
- quantity_before (numeric, requerido)
- quantity_change (numeric, requerido)
- quantity_after (numeric, requerido)
- unit_cost (numeric)
- total_cost (numeric)
- reference_type (character varying)
- reference_id (uuid)
- notes (text)
- movement_date (timestamp with time zone)
- created_at (timestamp with time zone)

Relaciones (FK):

- stock_movements.user_id -> profiles.id
- stock_movements.product_id -> products.id
- stock_movements.warehouse_id -> warehouses.id

Tabla: thermal_receipts
Campos:

- id (uuid, requerido)
- user_id (uuid)
- client_id (uuid)
- receipt_number (character varying, requerido)
- client_name (character varying)
- subtotal (numeric, requerido)
- tax_amount (numeric, requerido)
- total_amount (numeric, requerido)
- payment_method (character varying)
- amount_received (numeric)
- change_amount (numeric)
- qr_code (text)
- verification_code (character varying)
- digital_receipt_url (text)
- notes (text)
- printed_at (timestamp with time zone)
- status (character varying)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- qr_code_data (jsonb)
- include_itbis (boolean)
- ncf (text)
- owner_id (uuid)
- employee_id (uuid)
- dispatch_id (uuid)
- cash_shift_id (uuid)

Relaciones (FK):

- thermal_receipts.user_id -> profiles.id
- thermal_receipts.client_id -> clients.id
- thermal_receipts.dispatch_id -> daily_dispatches.id
- thermal_receipts.cash_shift_id -> cash_register_shifts.id

Tabla: warehouses
Campos:

- id (uuid, requerido)
- user_id (uuid, requerido)
- name (character varying, requerido)
- description (text)
- address (text)
- manager_name (character varying)
- phone (character varying)
- is_active (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

Relaciones (FK):

- warehouses.user_id -> profiles.id

