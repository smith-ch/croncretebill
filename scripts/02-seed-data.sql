-- Insert sample data (this will be inserted after user authentication)
-- Sample products for concrete companies
INSERT INTO public.products (user_id, name, description, unit_price, unit, mix_type, resistance) VALUES
(auth.uid(), 'Concreto Premezclado 3000 PSI', 'Concreto premezclado resistencia 3000 PSI', 85.00, 'm³', 'Premezclado', '3000 PSI'),
(auth.uid(), 'Concreto Premezclado 4000 PSI', 'Concreto premezclado resistencia 4000 PSI', 95.00, 'm³', 'Premezclado', '4000 PSI'),
(auth.uid(), 'Concreto Premezclado 5000 PSI', 'Concreto premezclado resistencia 5000 PSI', 105.00, 'm³', 'Premezclado', '5000 PSI'),
(auth.uid(), 'Agregado Fino', 'Arena lavada para construcción', 25.00, 'm³', 'Agregado', 'N/A'),
(auth.uid(), 'Agregado Grueso', 'Grava triturada calibrada', 30.00, 'm³', 'Agregado', 'N/A');

-- Sample FAQ entries
INSERT INTO public.faqs (user_id, question, answer, category, order_index) VALUES
(auth.uid(), '¿Cómo crear una nueva factura?', 'Para crear una nueva factura, ve a la sección "Facturas" y haz clic en "Nueva Factura". Completa los datos del cliente, selecciona los productos y guarda.', 'Facturas', 1),
(auth.uid(), '¿Cómo generar un conduce?', 'Los conduces se crean en la sección "Conduces". Selecciona el cliente, proyecto, conductor y vehículo, luego agrega los productos a entregar.', 'Conduces', 2),
(auth.uid(), '¿Puedo exportar las facturas a PDF?', 'Sí, todas las facturas pueden exportarse a PDF desde la vista de detalle de cada factura.', 'Facturas', 3),
(auth.uid(), '¿Cómo agregar un nuevo cliente?', 'Ve a la sección "Clientes" y haz clic en "Nuevo Cliente". Completa la información requerida y guarda.', 'Clientes', 4);
