-- Insert default FAQs for the application
INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo crear una nueva factura?',
  'Para crear una nueva factura, ve a la sección "Facturas" en el menú lateral y haz clic en "Nueva Factura". Completa los datos del cliente, selecciona los productos, especifica las cantidades y precios. El sistema calculará automáticamente los impuestos y el total.',
  'Facturas',
  1
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo crear una nueva factura?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo generar un conduce de entrega?',
  'Los conduces se crean en la sección "Conduces". Selecciona el cliente, proyecto (opcional), conductor y vehículo, luego agrega los productos a entregar con sus cantidades. Puedes incluir información adicional como hora de salida, dirección de entrega y detalles de bomba.',
  'Conduces',
  2
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo generar un conduce de entrega?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo agregar un nuevo cliente?',
  'Ve a la sección "Clientes" y haz clic en "Nuevo Cliente". Completa la información requerida como nombre de la empresa, RNC, persona de contacto, email, teléfono y dirección. Esta información se utilizará automáticamente en facturas y conduces.',
  'Clientes',
  3
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo agregar un nuevo cliente?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo gestionar mi catálogo de productos?',
  'En la sección "Productos" puedes agregar, editar y eliminar productos. Para cada producto especifica el nombre, descripción, precio por unidad, unidad de medida, tipo de mezcla y resistencia. Estos productos aparecerán disponibles al crear facturas y conduces.',
  'Productos',
  4
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo gestionar mi catálogo de productos?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Qué información puedo configurar en mi perfil?',
  'En "Configuración" puedes actualizar tu información personal y de empresa, incluyendo nombre completo, nombre de la empresa, RNC, teléfono, dirección y logo. Esta información aparecerá en tus facturas y conduces.',
  'Configuración',
  5
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Qué información puedo configurar en mi perfil?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo organizar mis proyectos?',
  'En la sección "Proyectos" puedes crear proyectos asociados a clientes específicos. Incluye nombre del proyecto, descripción, dirección, fechas de inicio y fin, y estado. Los proyectos te ayudan a organizar facturas y conduces por obra.',
  'Proyectos',
  6
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo organizar mis proyectos?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo gestionar conductores y vehículos?',
  'En las secciones "Conductores" y "Vehículos" puedes registrar tu equipo y flota. Para conductores incluye nombre, cédula, teléfono y número de licencia. Para vehículos especifica modelo, tipo, placa y capacidad. Esta información se usa en los conduces.',
  'Logística',
  7
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo gestionar conductores y vehículos?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo se calculan los impuestos en las facturas?',
  'El sistema calcula automáticamente el ITBIS (18%) sobre el subtotal de la factura. El subtotal se obtiene sumando el precio unitario por la cantidad de cada producto. El total final incluye el subtotal más el ITBIS.',
  'Facturas',
  8
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo se calculan los impuestos en las facturas?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Puedo editar o eliminar registros creados?',
  'Sí, puedes editar o eliminar clientes, productos, proyectos, conductores, vehículos, facturas y conduces usando los botones de acción en cada listado. Ten cuidado al eliminar registros que puedan estar siendo utilizados en otros documentos.',
  'General',
  9
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Puedo editar o eliminar registros creados?'
);

INSERT INTO public.faqs (user_id, question, answer, category, order_index) 
SELECT 
  p.id,
  '¿Cómo buscar información en el sistema?',
  'Cada sección tiene una barra de búsqueda que te permite filtrar registros por nombre, número de documento, cliente, etc. Simplemente escribe en el campo de búsqueda y los resultados se filtrarán automáticamente.',
  'General',
  10
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f 
  WHERE f.user_id = p.id AND f.question = '¿Cómo buscar información en el sistema?'
);
