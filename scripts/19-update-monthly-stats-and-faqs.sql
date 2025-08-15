-- Update monthly_stats table to include expense tracking
ALTER TABLE monthly_stats 
ADD COLUMN IF NOT EXISTS expense_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_expenses DECIMAL(10,2) DEFAULT 0;

-- Remove delivery_notes columns if they exist
ALTER TABLE monthly_stats 
DROP COLUMN IF EXISTS total_delivery_notes;

-- Update existing records to set expense data to 0 if null
UPDATE monthly_stats 
SET expense_count = 0, total_expenses = 0 
WHERE expense_count IS NULL OR total_expenses IS NULL;

-- Clear existing FAQs to replace with new default ones
DELETE FROM faqs;

-- Insert comprehensive default FAQs
INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo crear una nueva factura?',
  'Para crear una nueva factura, ve a la sección "Facturas" en el menú lateral y haz clic en "Nueva Factura". Completa los datos del cliente, selecciona los productos o servicios, especifica las cantidades y precios. El sistema calculará automáticamente los impuestos y el total.',
  'Facturas',
  1
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo agregar un nuevo cliente?',
  'Ve a la sección "Clientes" y haz clic en "Nuevo Cliente". Completa la información requerida como nombre de la empresa, RNC, persona de contacto, email, teléfono y dirección. Esta información se utilizará automáticamente en facturas.',
  'Clientes',
  2
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo gestionar mi catálogo de productos?',
  'En la sección "Productos" puedes agregar, editar y eliminar productos. Para cada producto especifica el nombre, descripción, precio por unidad, unidad de medida, categoría y marca. Estos productos aparecerán disponibles al crear facturas.',
  'Productos',
  3
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo crear y gestionar servicios?',
  'En la sección "Servicios" puedes crear servicios que ofreces como instalación, mantenimiento, consultoría, etc. Define el nombre, descripción, precio y tipo de servicio. Los servicios también pueden agregarse a las facturas junto con los productos.',
  'Servicios',
  4
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo registrar y controlar gastos?',
  'En la sección "Gastos" puedes registrar todos los gastos de tu empresa. Incluye descripción, monto, categoría, fecha y número de recibo. Esto te ayudará a controlar tus costos y calcular la rentabilidad real de tu negocio.',
  'Gastos',
  5
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo crear presupuestos o cotizaciones?',
  'Ve a "Productos" > "Presupuestos" para crear cotizaciones. Selecciona el cliente, agrega productos y servicios con sus cantidades, y el sistema generará un presupuesto profesional que puedes enviar a tus clientes antes de confirmar el trabajo.',
  'Presupuestos',
  6
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Qué información puedo configurar en mi perfil?',
  'En "Configuración" puedes actualizar tu información personal y de empresa, incluyendo nombre completo, nombre de la empresa, RNC, teléfono, dirección y logo. Esta información aparecerá en tus facturas y documentos.',
  'Configuración',
  7
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo organizar mis proyectos?',
  'En la sección "Proyectos" puedes crear proyectos asociados a clientes específicos. Incluye nombre del proyecto, descripción, dirección, fechas de inicio y fin, y estado. Los proyectos te ayudan a organizar facturas por obra o trabajo específico.',
  'Proyectos',
  8
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo se calculan los impuestos en las facturas?',
  'El sistema puede calcular automáticamente el ITBIS (18%) si lo activas al crear la factura. Cuando incluyes ITBIS, debes proporcionar un NCF (Comprobante Fiscal). El subtotal se obtiene sumando el precio unitario por la cantidad de cada producto/servicio.',
  'Facturas',
  9
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo ver mis reportes y estadísticas?',
  'En la sección "Reportes" puedes ver análisis detallados de tus ingresos, gastos y rentabilidad por mes. Los gráficos te muestran tendencias, comparaciones y te ayudan a tomar decisiones informadas sobre tu negocio.',
  'Reportes',
  10
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Puedo editar o eliminar registros creados?',
  'Sí, puedes editar o eliminar clientes, productos, servicios, proyectos, facturas y gastos usando los botones de acción en cada listado. Ten cuidado al eliminar registros que puedan estar siendo utilizados en otros documentos.',
  'General',
  11
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo buscar información en el sistema?',
  'Cada sección tiene una barra de búsqueda que te permite filtrar registros por nombre, número de documento, cliente, etc. Simplemente escribe en el campo de búsqueda y los resultados se filtrarán automáticamente.',
  'General',
  12
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo agregar servicios a una factura?',
  'Al crear una factura, puedes agregar tanto productos como servicios. En la sección de productos/servicios de la factura, selecciona de tu catálogo de servicios creados previamente. Cada servicio tendrá su precio y descripción configurados.',
  'Facturas',
  13
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Qué es la diferencia entre productos y servicios?',
  'Los productos son artículos físicos que vendes (materiales, herramientas, etc.) mientras que los servicios son trabajos que realizas (instalación, mantenimiento, consultoría). Ambos pueden incluirse en facturas y tienen gestión de precios independiente.',
  'General',
  14
FROM public.profiles p;

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo controlar la rentabilidad de mi negocio?',
  'Utiliza la sección de "Gastos" para registrar todos tus costos y la sección "Reportes" para ver tu ganancia neta (ingresos - gastos). Los gráficos te mostrarán tendencias mensuales y te ayudarán a identificar oportunidades de mejora.',
  'Reportes',
  15
FROM public.profiles p;
