"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Users,
  Package,
  Calculator,
  Settings,
  TrendingUp,
  Mail,
  MessageCircle,
  BookOpen,
  Lightbulb,
  Shield,
  Zap,
  Star,
  Clock,
  CheckCircle,
} from "lucide-react"

const systemFAQs = [
  {
    id: "1",
    category: "Facturas",
    question: "¿Cómo crear una nueva factura?",
    answer:
      "Para crear una nueva factura:\n1. Ve a la sección 'Facturas' en el menú lateral\n2. Haz clic en 'Nueva Factura'\n3. Completa la información del cliente, fechas y productos/servicios\n4. Revisa los totales y guarda la factura\n5. Puedes descargar el PDF o marcarla como pagada cuando corresponda",
  },
  {
    id: "2",
    category: "Facturas",
    question: "¿Cómo marcar una factura como pagada?",
    answer:
      "Para marcar una factura como pagada:\n1. Ve a la lista de facturas\n2. Busca la factura que deseas marcar como pagada\n3. Haz clic en el botón de confirmación de pago (ícono de check verde)\n4. Confirma la acción en el diálogo que aparece\n5. La factura cambiará su estado a 'Pagada' y se contabilizará como ingreso real",
  },
  {
    id: "3",
    category: "Facturas",
    question: "¿Cómo editar una factura existente?",
    answer:
      "Para editar una factura:\n1. Ve a la lista de facturas\n2. Haz clic en el botón de editar (ícono de lápiz) junto a la factura\n3. Modifica los campos necesarios\n4. Los productos y servicios pueden cambiarse usando los dropdowns\n5. Guarda los cambios para actualizar la factura",
  },
  {
    id: "4",
    category: "Facturas",
    question: "¿Qué significa ITBIS y cuándo debo incluirlo?",
    answer:
      "ITBIS es el Impuesto sobre la Transferencia de Bienes Industrializados y Servicios (18% en República Dominicana).\n\nDebes incluirlo cuando:\n- Tu empresa está registrada para facturar con ITBIS\n- El cliente requiere factura fiscal\n- Es obligatorio proporcionar un NCF (Número de Comprobante Fiscal) cuando incluyes ITBIS",
  },
  {
    id: "4a",
    category: "Facturas",
    question: "¿Cómo personalizar la apariencia de mis facturas?",
    answer:
      "Para personalizar tus facturas ve a Configuración → Empresa → Personalización de Facturas. Puedes ajustar:\n\n🎨 Colores:\n- Color Principal: Para títulos, encabezados y bordes principales\n- Color Secundario: Para fondos y secciones destacadas\n\n📄 Formato:\n- Estándar: Diseño clásico profesional\n- Moderno: Estilo contemporáneo con degradados y sombras\n- Compacto: Tamaño reducido para ahorrar espacio\n- Detallado: Texto grande y espacios amplios\n\n💬 Mensaje Personalizado:\n- Agrega un mensaje al pie de página\n- Ideal para información de contacto o agradecimientos\n\n🖼️ Logo:\n- Activa/desactiva la visualización del logo en facturas\n\nTodos los cambios se aplican inmediatamente al descargar facturas.",
  },
  {
    id: "4b",
    category: "Facturas",
    question: "¿Cuáles son las diferencias entre los formatos de factura?",
    answer:
      "Los 4 formatos disponibles tienen características únicas:\n\n📄 ESTÁNDAR:\n- Diseño clásico y profesional\n- Bordes tradicionales\n- Tamaño de fuente regular (12px)\n- Espaciado normal\n- Ideal para uso general\n\n✨ MODERNO:\n- Fondo con degradado elegante\n- Tarjetas con sombras\n- Bordes redondeados\n- Texto con mayúsculas y espaciado\n- Estilo contemporáneo premium\n\n📋 COMPACTO:\n- Tamaño de fuente reducido (10-11px)\n- Espaciado optimizado\n- Bordes delgados\n- Ideal para ahorrar papel\n- Información condensada pero legible\n\n📖 DETALLADO:\n- Texto grande (12-14px)\n- Espacios amplios\n- Bordes gruesos\n- Mejor legibilidad\n- Headers con degradados\n\nSelecciona el formato según tus necesidades en Configuración → Empresa.",
  },
  {
    id: "4c",
    category: "Facturas",
    question: "¿Dónde aparecen los colores personalizados en las facturas?",
    answer:
      "Los colores personalizados se aplican en múltiples elementos:\n\n🎨 Color Principal se usa en:\n- Borde del encabezado de la empresa\n- Título de la factura (\"FACTURA\" o \"Factura de Impuestos\")\n- Encabezados de las tablas (FECHA, DESCRIPCIÓN, etc.)\n- Fondo de la sección NCF\n- Títulos de secciones (FACTURAR A, PROYECTO, etc.)\n- Encabezados de tabla de impuestos\n- Borde de la sección de notas\n- Borde del pie de página\n\n🖌️ Color Secundario se usa en:\n- Fondo de la sección NCF\n- Fondo de la sección de notas\n- Fondos de secciones destacadas\n\nPuedes previsualizar los cambios descargando una factura de prueba después de guardar la configuración.",
  },
  {
    id: "5",
    category: "Clientes",
    question: "¿Cómo agregar un nuevo cliente?",
    answer:
      "Para agregar un cliente:\n1. Ve a la sección 'Clientes' en el menú\n2. Haz clic en 'Nuevo Cliente'\n3. Completa la información: nombre, email, teléfono, dirección\n4. Agrega el RNC si es una empresa\n5. Guarda la información\n6. El cliente estará disponible para usar en facturas y presupuestos",
  },
  {
    id: "6",
    category: "Clientes",
    question: "¿Qué es el RNC y por qué es importante?",
    answer:
      "RNC significa Registro Nacional del Contribuyente. Es el número de identificación fiscal de empresas en República Dominicana.\n\nEs importante porque:\n- Se requiere para facturas fiscales\n- Aparece en los PDFs de facturas y presupuestos\n- Es necesario para el cumplimiento tributario\n- Facilita la identificación correcta del cliente",
  },
  {
    id: "7",
    category: "Productos",
    question: "¿Cómo gestionar mi catálogo de productos?",
    answer:
      "Para gestionar productos:\n1. Ve a 'Productos' en el menú lateral\n2. Usa 'Nuevo Producto' para agregar items\n3. Completa: nombre, descripción, precio unitario, unidad de medida\n4. Agrega información técnica como tipo de mezcla o resistencia si aplica\n5. Los productos aparecerán automáticamente en facturas y presupuestos",
  },
  {
    id: "8",
    category: "Productos",
    question: "¿Cuál es la diferencia entre productos y servicios?",
    answer:
      "Productos vs Servicios:\n\nProductos:\n- Bienes físicos (materiales, equipos, etc.)\n- Se miden en unidades específicas (m³, kg, unidades)\n- Tienen características técnicas\n\nServicios:\n- Trabajo o labor realizada\n- Se miden en horas, días, o servicios completos\n- Describen el tipo de trabajo a realizar\n\nAmbos pueden incluirse en facturas y presupuestos",
  },
  {
    id: "9",
    category: "Presupuestos",
    question: "¿Cómo crear y gestionar presupuestos?",
    answer:
      "Para trabajar con presupuestos:\n1. Ve a 'Productos' → 'Presupuestos'\n2. Crea un nuevo presupuesto seleccionando cliente y proyecto\n3. Agrega productos/servicios con cantidades y precios\n4. El sistema calcula automáticamente subtotales e ITBIS\n5. Genera PDF para enviar al cliente\n6. Convierte a factura cuando sea aprobado",
  },
  {
    id: "10",
    category: "Presupuestos",
    question: "¿Cómo convertir un presupuesto en factura?",
    answer:
      "Actualmente, para convertir un presupuesto en factura:\n1. Abre el presupuesto aprobado\n2. Copia la información del cliente y productos\n3. Ve a 'Nueva Factura'\n4. Ingresa la misma información del presupuesto\n5. Ajusta fechas y términos según corresponda\n6. Guarda como factura oficial",
  },
  {
    id: "11",
    category: "Dashboard",
    question: "¿Cómo usar el nuevo dashboard mejorado?",
    answer:
      "El dashboard renovado incluye:\n\n✨ Diseño Premium: Cards con gradientes y animaciones modernas\n📊 Métricas Avanzadas: Indicadores de tendencias y crecimiento\n🎯 Meta Inteligente: Progreso visual con alertas y proyecciones\n⚡ Alertas Dinámicas: Notificaciones importantes destacadas\n📈 Analytics Mejorados: Comparativas de clientes y gastos\n🔄 Actualización Automática: Datos en tiempo real cada 5 minutos\n\nCada card muestra tendencias, porcentajes de cambio y métricas específicas para mejor análisis.",
  },
  {
    id: "12",
    category: "Dashboard",
    question: "¿Qué significan los indicadores de tendencia en las cards?",
    answer:
      "Los indicadores de tendencia muestran:\n\n🔺 Flecha Verde Arriba: Crecimiento positivo comparado con el promedio\n🔻 Flecha Roja Abajo: Disminución comparada con el promedio\n📊 Porcentaje: Muestra el cambio exacto en números\n🏷️ Badges: Estado actual (Positivo, Negativo, Excelente, etc.)\n\nEstos indicadores te ayudan a:\n- Identificar tendencias rápidamente\n- Tomar decisiones informadas\n- Monitorear el rendimiento del negocio\n- Detectar áreas de mejora",
  },
  {
    id: "13",
    category: "Dashboard",
    question: "¿Cómo funciona la meta mensual mejorada?",
    answer:
      "La nueva meta mensual incluye:\n\n🎯 Progreso Visual: Barra de progreso con colores dinámicos\n📈 Métricas Detalladas: Monto actual vs meta, cantidad faltante\n⚙️ Configuración Fácil: Edita tu meta directamente desde el dashboard\n📋 Ingresos Pendientes: Muestra facturas emitidas pero no cobradas\n🏆 Indicadores de Logro: Badges que cambian según tu progreso\n\nColores del progreso:\n- Verde (75-100%): Excelente progreso\n- Amarillo (50-74%): Buen progreso\n- Rojo (0-49%): Necesita atención",
  },
  {
    id: "14",
    category: "Reportes IA",
    question: "¿Cómo funcionan los reportes con inteligencia artificial?",
    answer:
      "Los reportes con IA incluyen:\n\n🤖 Análisis Automático: El sistema analiza tus datos financieros\n📊 KPIs Inteligentes: 12+ métricas calculadas automáticamente\n🔮 Predicciones: Proyecciones de ingresos usando algoritmos avanzados\n📈 Tendencias: Identificación automática de patrones de crecimiento\n⚠️ Alertas Inteligentes: Recomendaciones basadas en tu rendimiento\n💡 Insights: Sugerencias para mejorar tu negocio\n\nFuncionalidades IA:\n- Predicción del próximo mes\n- Análisis de consistencia\n- Cálculo de ROI automático\n- Identificación de mejores/peores períodos",
  },
  {
    id: "15",
    category: "Reportes IA",
    question: "¿Qué métricas incluye el desglose mensual detallado?",
    answer:
      "El desglose mensual muestra por cada mes:\n\n💰 Ingresos vs Gastos: Comparativa completa con márgenes\n📊 ROI Calculado: Retorno de inversión automático\n📈 Tendencias de Crecimiento: Comparación mes a mes\n🎯 Eficiencia: Métricas de productividad\n💳 Promedios: Ticket promedio y gasto promedio\n📋 Volumen: Cantidad de facturas y gastos\n\nVisualización:\n- Cards individuales por mes\n- Gráficos de barras de progreso\n- Indicadores de crecimiento\n- Comparativas automáticas",
  },
  {
    id: "16",
    category: "Reportes IA",
    question: "¿Cómo interpretar las predicciones de IA?",
    answer:
      "Las predicciones de IA se basan en:\n\n📊 Datos Históricos: Análisis de patrones pasados\n📈 Tendencias Actuales: Comportamiento reciente del negocio\n🔄 Estacionalidad: Variaciones según épocas del año\n📉 Volatilidad: Consistencia en el rendimiento\n\nTipos de predicciones:\n- Ingresos del próximo mes\n- Proyección de gastos\n- Estimación de crecimiento\n- Recomendaciones de metas\n\nFactores considerados:\n- Promedio de ingresos mensuales\n- Tendencia de crecimiento\n- Variabilidad histórica\n- Época del año",
  },
  {
    id: "17",
    category: "Gastos",
    question: "¿Cómo registrar y categorizar gastos?",
    answer:
      "Para gestionar gastos:\n1. Ve a la sección 'Gastos'\n2. Haz clic en 'Nuevo Gasto'\n3. Completa: descripción, monto, fecha, categoría\n4. Las categorías te ayudan a organizar y analizar gastos\n5. Puedes editar o eliminar gastos existentes\n6. Los gastos se reflejan automáticamente en reportes y dashboard",
  },
  {
    id: "18",
    category: "Gastos Fijos",
    question: "¿Cómo gestionar gastos fijos recurrentes?",
    answer:
      "Los gastos fijos son gastos que se repiten mensualmente:\n\n💡 Ejemplos: Alquiler, servicios, seguros, sueldos\n📅 Configuración: Define monto, fecha de vencimiento y frecuencia\n🔔 Recordatorios: Alertas automáticas antes del vencimiento\n📊 Seguimiento: Aparecen en tu agenda y reportes\n⚡ Automatización: Opción de registro automático cada mes\n\nPara configurar:\n1. Ve a 'Gastos' → 'Gastos Fijos'\n2. Agrega nombre, monto y fecha de vencimiento\n3. Configura la frecuencia (mensual, trimestral, etc.)\n4. Activa recordatorios automáticos",
  },
  {
    id: "19",
    category: "Agenda",
    question: "¿Cómo usar la nueva agenda de negocio?",
    answer:
      "La agenda centraliza todas tus fechas importantes:\n\n📅 Calendario Visual: Vista mensual con todos los eventos\n🔔 Recordatorios: Alertas de facturas por vencer, gastos fijos\n💳 Cuentas por Pagar: Seguimiento de proveedores y pagos\n📊 Cierre de Mes: Tareas automáticas para fin de mes\n📈 Metas y Objetivos: Recordatorios de seguimiento\n\nAcceso rápido:\n- Desde el dashboard: widget de próximas fechas\n- Menú principal: sección 'Agenda'\n- Alertas en tiempo real en toda la aplicación",
  },
  {
    id: "20",
    category: "Agenda",
    question: "¿Qué incluye el widget de recordatorios de fin de mes?",
    answer:
      "El recordatorio de fin de mes incluye:\n\n📋 Tareas Pendientes:\n- Facturas por cobrar\n- Gastos fijos por pagar\n- Cuentas por pagar a proveedores\n- Seguimiento de metas mensuales\n\n📊 Métricas de Cierre:\n- Resumen de ingresos del mes\n- Total de gastos registrados\n- Balance mensual\n- Comparación con metas\n\n🔔 Alertas Automáticas:\n- 5 días antes del fin de mes\n- Facturas con vencimiento próximo\n- Recordatorios de gastos fijos\n- Tareas de administración pendientes",
  },
  {
    id: "21",
    category: "Cuentas por Pagar",
    question: "¿Cómo gestionar cuentas por pagar a proveedores?",
    answer:
      "Las cuentas por pagar te ayudan a gestionar deudas:\n\n👥 Proveedores: Registra información de contacto y términos\n💰 Montos: Controla cuánto debes y fechas límite\n📅 Vencimientos: Alertas automáticas antes del vencimiento\n📊 Historial: Seguimiento de pagos realizados\n🔔 Recordatorios: Notificaciones en dashboard y agenda\n\nPara agregar:\n1. Ve a 'Agenda' → 'Cuentas por Pagar'\n2. Agrega proveedor, monto y fecha de vencimiento\n3. Incluye referencia (número de factura, concepto)\n4. Marca como pagada cuando realices el pago",
  },
  {
    id: "22",
    category: "General",
    question: "¿Cómo personalizar las notificaciones y alertas?",
    answer:
      "Puedes configurar alertas para:\n\n🔔 Facturas: Vencimientos, pagos recibidos, recordatorios de cobro\n💰 Gastos Fijos: Recordatorios antes del vencimiento\n🎯 Metas: Progreso mensual, alertas de rendimiento\n📅 Agenda: Eventos próximos, tareas pendientes\n📊 Reportes: Nuevos insights de IA, cambios importantes\n\nConfiguraciones:\n- Días de anticipación para alertas\n- Tipos de notificaciones activas\n- Frecuencia de recordatorios\n- Canales de notificación (email, dashboard)\n\nAcceso: Configuración → Notificaciones",
  },
  {
    id: "23",
    category: "General",
    question: "¿Cómo hacer backup de mi información?",
    answer:
      "Tu información se guarda automáticamente en la nube. Para mayor seguridad:\n\n1. Exporta reportes regularmente en PDF\n2. Descarga facturas importantes\n3. Mantén una copia de tu lista de clientes\n4. Los datos se sincronizan automáticamente entre dispositivos\n5. El sistema mantiene historial de cambios para recuperación",
  },
  {
    id: "24",
    category: "General",
    question: "¿El sistema funciona en dispositivos móviles?",
    answer:
      "Sí, el sistema es completamente responsivo:\n\n✓ Funciona en teléfonos y tablets\n✓ Interfaz adaptada para pantallas pequeñas\n✓ Todas las funciones disponibles en móvil\n✓ Sincronización automática entre dispositivos\n✓ Puedes crear facturas, ver reportes y gestionar clientes desde cualquier lugar",
  },
  {
    id: "25",
    category: "General",
    question: "¿Cómo obtener soporte técnico?",
    answer:
      "Para obtener ayuda:\n\n1. Revisa estas preguntas frecuentes primero\n2. Usa la función de búsqueda para encontrar respuestas específicas\n3. Para soporte directo, contacta a través de:\n   - Email de soporte del sistema\n   - Chat en vivo (si está disponible)\n   - Documentación en línea\n4. Incluye detalles específicos del problema para mejor asistencia",
  },
  {
    id: "26",
    category: "Empleados y Roles",
    question: "¿Qué son los roles de empleado y propietario?",
    answer:
      "El sistema tiene dos roles principales:\n\n👑 **Propietario (Owner):**\n- Acceso completo a toda la información\n- Puede ver todos los clientes, facturas y reportes\n- Acceso a configuraciones sensibles\n- Puede cambiar entre roles\n\n👨‍💼 **Empleado (Employee):**\n- Acceso limitado para proteger información confidencial\n- Puede crear facturas y gestionar productos\n- No puede ver información financiera sensible\n- No puede acceder a configuraciones críticas\n\n🔄 **Cambio de Roles:**\nEl sistema detecta automáticamente empleados por email y permite cambiar roles con verificación de contraseña.",
  },
  {
    id: "27",
    category: "Empleados y Roles",
    question: "¿Cómo se detectan automáticamente los empleados?",
    answer:
      "La detección de empleados es automática y basada en email:\n\n📧 **Sistema de Detección:**\n- El sistema verifica si tu email está en la lista de empleados\n- Si coincide, automáticamente inicia en modo empleado\n- Si no coincide, inicia en modo propietario\n\n⚙️ **Configuración:**\n- Los emails se configuran en el archivo `lib/employee-config.ts`\n- Solo el propietario puede modificar esta lista\n- Se verifica en cada inicio de sesión\n\n🔄 **Funcionamiento:**\n1. Usuario hace login con su email\n2. Sistema verifica si está en lista de empleados\n3. Asigna rol correspondiente automáticamente\n4. Usuario puede cambiar rol si tiene permisos",
  },
  {
    id: "28",
    category: "Empleados y Roles",
    question: "¿Cómo cambiar entre roles de empleado y propietario?",
    answer:
      "Para cambiar de rol usa el selector en el sidebar:\n\n🔄 **Proceso de Cambio:**\n1. Busca el indicador de rol en la barra lateral\n2. Haz clic en el botón que muestra tu rol actual\n3. Verifica tu identidad con la contraseña\n4. Selecciona el nuevo rol (Empleado/Propietario)\n5. El cambio es inmediato y se guarda en tu sesión\n\n🛡️ **Seguridad:**\n- Requiere verificación de contraseña\n- Solo usuarios autorizados pueden cambiar roles\n- El rol se mantiene durante toda la sesión\n- Opción de 'Reset de Emergencia' disponible\n\n💾 **Persistencia:**\n- El rol seleccionado se guarda automáticamente\n- Se mantiene entre sesiones del navegador\n- Se sincroniza con las preferencias del usuario",
  },
  {
    id: "29",
    category: "Empleados y Roles",
    question: "¿Qué funciones están limitadas para empleados?",
    answer:
      "Los empleados tienen acceso limitado para proteger información sensible:\n\n❌ **Funciones Restringidas:**\n- Ver información financiera detallada\n- Acceder a reportes de ingresos y ganancias\n- Modificar configuraciones del sistema\n- Ver datos de otros empleados\n- Acceder a configuraciones de facturación\n\n✅ **Funciones Permitidas:**\n- Crear y editar facturas\n- Gestionar productos y servicios\n- Ver lista de clientes (información básica)\n- Crear notas de entrega\n- Acceder a la agenda de tareas\n- Usar funciones básicas del dashboard\n\n🔍 **Verificación:**\n- El sistema verifica permisos en cada acción\n- Mensajes claros cuando algo está restringido\n- Interfaz adaptada según el rol activo",
  },
  {
    id: "30",
    category: "Empleados y Roles",
    question: "¿Cómo agregar o quitar empleados del sistema?",
    answer:
      "Para gestionar la lista de empleados:\n\n📝 **Agregar Empleado:**\n1. Accede al archivo `lib/employee-config.ts`\n2. Agrega el email a la lista `EMPLOYEE_EMAILS`\n3. Guarda los cambios\n4. El empleado será detectado automáticamente en su próximo login\n\n❌ **Quitar Empleado:**\n1. Remueve el email de la lista `EMPLOYEE_EMAILS`\n2. Guarda los cambios\n3. El usuario pasará automáticamente a modo propietario\n\n⚠️ **Consideraciones:**\n- Solo el propietario debe modificar este archivo\n- Los cambios son inmediatos\n- Asegúrate de usar emails exactos (case-sensitive)\n- Mantén la sintaxis correcta del array\n\n🔧 **Ejemplo de Configuración:**\n```typescript\nexport const EMPLOYEE_EMAILS = [\n  'empleado1@empresa.com',\n  'empleado2@empresa.com'\n]\n```",
  },
  {
    id: "31",
    category: "Empleados y Roles",
    question: "¿Qué hacer si no puedo cambiar de rol?",
    answer:
      "Si tienes problemas para cambiar roles:\n\n🔧 **Soluciones Comunes:**\n\n1. **Verificar Contraseña:**\n   - Asegúrate de usar tu contraseña correcta\n   - La verificación es sensible a mayúsculas/minúsculas\n\n2. **Reset de Emergencia:**\n   - Usa el botón 'Reset de Emergencia' en el diálogo\n   - Esto restaura el rol basado en tu email\n   - Solo disponible si estás autorizado\n\n3. **Limpiar Datos Locales:**\n   - Cierra sesión y vuelve a iniciar\n   - Esto fuerza una nueva detección de rol\n\n4. **Verificar Configuración:**\n   - Confirma que tu email esté correctamente configurado\n   - Verifica que tengas permisos para el rol deseado\n\n🆘 **Si Persiste el Problema:**\n- Contacta al administrador del sistema\n- Verifica tu conexión a internet\n- Intenta desde otro navegador",
  },
  {
    id: "32",
    category: "Empleados y Roles",
    question: "¿Cómo identificar mi rol actual en el sistema?",
    answer:
      "Hay varias formas de identificar tu rol activo:\n\n🎯 **Indicadores Visuales:**\n\n1. **Sidebar (Barra Lateral):**\n   - Badge azul: 👑 PROPIETARIO\n   - Badge verde: 👨‍💼 EMPLEADO\n   - Ubicado en la parte superior del menú\n\n2. **Selector de Rol:**\n   - Botón que muestra el rol actual\n   - Color distintivo según el rol\n   - Disponible para cambio rápido\n\n3. **Funciones Disponibles:**\n   - Menús y opciones cambian según el rol\n   - Restricciones visibles para empleados\n   - Acceso completo para propietarios\n\n🔍 **Verificación Rápida:**\n- Mira la barra lateral izquierda\n- El badge de rol siempre está visible\n- Los colores son consistentes en toda la aplicación",
  },
  {
    id: "33",
    category: "Empleados y Roles",
    question: "¿Los cambios de rol se guardan entre sesiones?",
    answer:
      "Sí, el sistema mantiene tu preferencia de rol:\n\n💾 **Persistencia de Datos:**\n- El rol seleccionado se guarda en localStorage\n- Se mantiene al cerrar y abrir el navegador\n- Persiste entre diferentes pestañas\n- Se sincroniza con tus preferencias de usuario\n\n🔄 **Comportamiento del Sistema:**\n\n1. **Primera Vez:**\n   - Detección automática basada en email\n   - Asigna rol inicial según configuración\n\n2. **Sesiones Posteriores:**\n   - Carga el último rol seleccionado\n   - Verifica que aún tengas permisos\n   - Restaura automáticamente tu preferencia\n\n3. **Cambios Manuales:**\n   - Se guardan inmediatamente\n   - Prevalecen sobre la detección automática\n   - Requieren nueva verificación si cambia la configuración\n\n⚠️ **Nota:** Si tu email se remueve de la lista de empleados, volverás automáticamente a modo propietario.",
  },
  {
    id: "34",
    category: "Soporte Técnico",
    question: "¿Cómo obtener soporte técnico directo?",
    answer:
      "Para obtener asistencia técnica personalizada:\n\n📧 **Contacto Directo con el Desarrollador:**\n**Email:** smithrodriguez345@gmail.com\n\n👨‍💻 **Smith Rodríguez - Desarrollador Principal**\n- Creador y desarrollador completo del sistema\n- Soporte técnico especializado\n- Personalizaciones y mejoras\n- Resolución de problemas complejos\n- Implementación de nuevas funcionalidades\n\n⚡ **Qué incluir en tu consulta:**\n- Descripción detallada del problema\n- Capturas de pantalla si es necesario\n- Pasos que realizaste antes del error\n- Navegador y dispositivo que usas\n- Tu rol en el sistema (propietario/empleado)\n\n🕐 **Tiempo de respuesta:**\n- Consultas urgentes: 24-48 horas\n- Consultas generales: 2-3 días hábiles\n- Implementaciones: según complejidad",
  },
  {
    id: "35",
    category: "Soporte Técnico",
    question: "¿Qué tipos de soporte están disponibles?",
    answer:
      "El sistema ofrece múltiples niveles de soporte:\n\n🆘 **Soporte de Emergencia:**\n- Problemas críticos que impiden trabajar\n- Pérdida de acceso al sistema\n- Errores que afectan facturación\n- Respuesta prioritaria\n\n🔧 **Soporte Técnico Regular:**\n- Dudas sobre funcionalidades\n- Problemas de configuración\n- Errores menores o inconsistencias\n- Optimización del rendimiento\n\n💡 **Consultoría y Mejoras:**\n- Personalización de funcionalidades\n- Nuevas características específicas\n- Integración con otros sistemas\n- Capacitación avanzada\n\n📚 **Recursos Disponibles:**\n- Esta sección de Preguntas Frecuentes\n- Documentación en línea\n- Videos tutoriales (próximamente)\n- Soporte vía email con el desarrollador\n\n📞 **Canales de Contacto:**\n- Email principal: smithrodriguez345@gmail.com\n- Respuesta garantizada en 48 horas\n- Soporte en español\n- Horario: Lunes a Viernes, 9AM-6PM (GMT-4)",
  },
  {
    id: "36",
    category: "Actualizaciones del Sistema",
    question: "¿Cómo se actualizan las funcionalidades del sistema?",
    answer:
      "El sistema se actualiza continuamente para mejorar tu experiencia:\n\n🚀 **Tipos de Actualizaciones:**\n\n**Automáticas:**\n- Correcciones de errores menores\n- Mejoras de rendimiento\n- Actualizaciones de seguridad\n- Se aplican automáticamente sin interrupción\n\n**Programadas:**\n- Nuevas funcionalidades importantes\n- Cambios en la interfaz\n- Mejoras en reportes y análisis\n- Se notifican con anticipación\n\n📅 **Cronograma Típico:**\n- Actualizaciones menores: semanalmente\n- Funcionalidades nuevas: mensualmente\n- Mejoras mayores: trimestralmente\n\n🔔 **Notificaciones:**\n- Cambios importantes se comunican por email\n- Notas de actualización en el dashboard\n- Documentación actualizada automáticamente\n\n💬 **Solicitar Funcionalidades:**\n- Envía sugerencias a smithrodriguez345@gmail.com\n- Las ideas más solicitadas se priorizan\n- Feedback constante para mejorar el sistema",
  },
  {
    id: "37",
    category: "Actualizaciones del Sistema",
    question: "¿Qué novedades recientes se han implementado?",
    answer:
      "Últimas mejoras implementadas en el sistema:\n\n✨ **Dashboard Renovado (Octubre 2024):**\n- Diseño premium con gradientes y animaciones\n- Métricas avanzadas con indicadores de tendencia\n- Meta inteligente con progreso visual\n- Alertas dinámicas y analytics mejorados\n- Actualización automática cada 5 minutos\n\n🤖 **Reportes con IA (Septiembre 2024):**\n- 12+ KPIs calculados automáticamente\n- Predicciones de ingresos inteligentes\n- Análisis de tendencias automatizado\n- Recomendaciones basadas en datos\n- Desglose mensual detallado\n\n👥 **Sistema de Roles Avanzado (Agosto 2024):**\n- Detección automática de empleados\n- Cambio dinámico entre roles\n- Seguridad mejorada con verificación\n- Interfaz adaptativa según permisos\n\n📅 **Agenda de Negocio (Julio 2024):**\n- Calendario centralizado de eventos\n- Recordatorios automáticos de facturas\n- Gestión de gastos fijos recurrentes\n- Alertas de fin de mes\n\n💳 **Cuentas por Pagar (Junio 2024):**\n- Seguimiento de proveedores\n- Alertas de vencimientos\n- Historial de pagos\n- Integración con agenda",
  },
  {
    id: "38",
    category: "Seguridad y Privacidad",
    question: "¿Qué medidas de seguridad protegen mi información?",
    answer:
      "Tu información está protegida con múltiples capas de seguridad:\n\n🔒 **Seguridad de Datos:**\n- Encriptación end-to-end de toda la información\n- Conexiones HTTPS/SSL certificadas\n- Base de datos en la nube con respaldo automático\n- Acceso restringido solo a usuarios autorizados\n\n🛡️ **Control de Acceso:**\n- Autenticación segura por email\n- Sistema de roles con permisos específicos\n- Verificación de contraseña para cambios sensibles\n- Detección automática de usuarios no autorizados\n\n💾 **Respaldos y Recuperación:**\n- Backup automático diario de todos los datos\n- Historial de cambios para recuperación\n- Redundancia en múltiples servidores\n- Recuperación rápida en caso de problemas\n\n🔍 **Auditoría y Monitoreo:**\n- Registro de todas las acciones importantes\n- Monitoreo de actividad sospechosa\n- Alertas automáticas de seguridad\n- Cumplimiento con estándares de privacidad\n\n📱 **Seguridad Multi-dispositivo:**\n- Sincronización segura entre dispositivos\n- Sesiones individuales por dispositivo\n- Logout automático por inactividad\n- Verificación adicional en dispositivos nuevos",
  },
  {
    id: "39",
    category: "Seguridad y Privacidad",
    question: "¿Mis datos están seguros en la nube?",
    answer:
      "Sí, utilizamos la infraestructura más segura disponible:\n\n☁️ **Infraestructura de Clase Mundial:**\n- Supabase: Backend-as-a-Service de grado empresarial\n- Servidores distribuidos globalmente\n- Certificaciones SOC 2 Type II y ISO 27001\n- Uptime garantizado del 99.9%\n\n🔐 **Protección de Datos:**\n- Cifrado AES-256 en reposo\n- Cifrado TLS 1.3 en tránsito\n- Acceso con autenticación de dos factores\n- Políticas estrictas de acceso a datos\n\n🌍 **Cumplimiento Internacional:**\n- Cumple con GDPR (Europa)\n- Estándares CCPA (California)\n- Políticas de privacidad transparentes\n- Derecho a portabilidad de datos\n\n🚨 **Monitoreo 24/7:**\n- Detección automática de amenazas\n- Respuesta inmediata a incidentes\n- Actualizaciones de seguridad automáticas\n- Notificación proactiva de cualquier issue\n\n📋 **Tu Control:**\n- Puedes exportar tus datos en cualquier momento\n- Control granular sobre quién accede a qué\n- Eliminación completa de datos si lo solicitas\n- Transparencia total sobre el uso de información",
  },
  {
    id: "40",
    category: "Mejores Prácticas",
    question: "¿Cuáles son las mejores prácticas para usar el sistema?",
    answer:
      "Sigue estas recomendaciones para aprovechar al máximo el sistema:\n\n📊 **Organización de Datos:**\n- Mantén información de clientes actualizada\n- Usa categorías consistentes para productos/servicios\n- Registra gastos regularmente (semanalmente)\n- Configura gastos fijos desde el inicio\n\n💰 **Gestión Financiera:**\n- Establece metas mensuales realistas\n- Revisa el dashboard diariamente\n- Marca facturas como pagadas inmediatamente\n- Usa los reportes de IA para tomar decisiones\n\n📅 **Flujo de Trabajo Eficiente:**\n- Revisa la agenda cada lunes\n- Procesa facturas el mismo día que se crean\n- Actualiza precios de productos trimestralmente\n- Haz seguimiento a cuentas por cobrar semanalmente\n\n🔧 **Mantenimiento Regular:**\n- Limpia clientes duplicados mensualmente\n- Archiva facturas muy antiguas anualmente\n- Revisa y ajusta categorías de gastos\n- Valida la precisión de reportes mensualmente\n\n👥 **Gestión de Equipo:**\n- Capacita empleados en funciones específicas\n- Revisa permisos de acceso regularmente\n- Documenta procesos internos\n- Usa roles apropiados para cada usuario",
  },
  {
    id: "41",
    category: "Mejores Prácticas",
    question: "¿Cómo optimizar el rendimiento del sistema?",
    answer:
      "Para obtener la mejor experiencia y rendimiento:\n\n🚀 **Rendimiento del Navegador:**\n- Usa navegadores modernos (Chrome, Firefox, Safari actualizados)\n- Mantén máximo 5-10 pestañas abiertas\n- Limpia caché del navegador mensualmente\n- Cierra sesión si no usarás el sistema por horas\n\n💾 **Gestión de Datos:**\n- No acumules más de 1000 facturas sin archivar\n- Elimina registros de prueba regularmente\n- Usa filtros en listas largas\n- Exporta y archiva datos históricos anuales\n\n📱 **Uso Eficiente:**\n- Guarda cambios frecuentemente\n- No hagas múltiples operaciones simultáneas\n- Usa la función de búsqueda en lugar de scroll largo\n- Actualiza la página si parece lenta\n\n🔔 **Configuración Óptima:**\n- Desactiva notificaciones innecesarias\n- Ajusta la frecuencia de actualización automática\n- Usa vista compacta en pantallas pequeñas\n- Configura alertas solo para eventos importantes\n\n🛠️ **Solución de Problemas:**\n- Refresca la página si algo no responde\n- Verifica tu conexión a internet\n- Reporta problemas persistentes inmediatamente\n- Mantén contacto actualizado para notificaciones",
  },
]

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const filteredFaqs = systemFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const categories = [...new Set(systemFAQs.map((faq) => faq.category).filter(Boolean))]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Facturas":
        return <FileText className="h-5 w-5" />
      case "Clientes":
        return <Users className="h-5 w-5" />
      case "Productos":
        return <Package className="h-5 w-5" />
      case "Presupuestos":
        return <Calculator className="h-5 w-5" />
      case "Dashboard":
        return <TrendingUp className="h-5 w-5" />
      case "Gastos":
        return <Settings className="h-5 w-5" />
      case "Empleados y Roles":
        return <Users className="h-5 w-5" />
      case "Soporte Técnico":
        return <MessageCircle className="h-5 w-5" />
      case "Actualizaciones del Sistema":
        return <Zap className="h-5 w-5" />
      case "Seguridad y Privacidad":
        return <Shield className="h-5 w-5" />
      case "Mejores Prácticas":
        return <Lightbulb className="h-5 w-5" />
      default:
        return <HelpCircle className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Facturas":
        return "from-blue-500 to-blue-600"
      case "Clientes":
        return "from-emerald-500 to-emerald-600"
      case "Productos":
        return "from-purple-500 to-purple-600"
      case "Presupuestos":
        return "from-amber-500 to-amber-600"
      case "Dashboard":
        return "from-green-500 to-green-600"
      case "Gastos":
        return "from-red-500 to-red-600"
      case "Empleados y Roles":
        return "from-indigo-500 to-indigo-600"
      case "Soporte Técnico":
        return "from-cyan-500 to-cyan-600"
      case "Actualizaciones del Sistema":
        return "from-orange-500 to-orange-600"
      case "Seguridad y Privacidad":
        return "from-rose-500 to-rose-600"
      case "Mejores Prácticas":
        return "from-violet-500 to-violet-600"
      default:
        return "from-slate-500 to-slate-600"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header mejorado */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <HelpCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
            Centro de Ayuda
          </h1>
          <p className="text-slate-400 text-xl max-w-3xl mx-auto leading-relaxed">
            Encuentra respuestas a las preguntas más comunes y obtén soporte técnico especializado para aprovechar al máximo tu sistema de facturación
          </p>
        </motion.div>

        {/* Sección de contacto destacada */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-purple-600/50 opacity-50"></div>
            <CardContent className="relative p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Mail className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-bold">¿Necesitas Soporte Personalizado?</h2>
                  </div>
                  <p className="text-blue-100 text-lg leading-relaxed">
                    Contacta directamente con el desarrollador del sistema para asistencia técnica especializada, 
                    personalización de funcionalidades o resolución de problemas complejos.
                  </p>
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-semibold">smithrodriguez345@gmail.com</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                      <Clock className="h-4 w-4" />
                      <span>Respuesta en 24-48h</span>
                    </div>
                  </div>
                </div>
                <div className="lg:w-64 space-y-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold">Smith Rodríguez</span>
                    </div>
                    <p className="text-blue-100 text-sm">Desarrollador Principal & Creador del Sistema</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <Zap className="h-5 w-5 mx-auto mb-1" />
                      <span>Soporte Técnico</span>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <Star className="h-5 w-5 mx-auto mb-1" />
                      <span>Personalizaciones</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Búsqueda mejorada */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-50">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar en el Centro de Ayuda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Buscar preguntas, categorías o palabras clave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-3 text-lg border-slate-800 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>
            {searchTerm && (
              <div className="mt-4 text-center">
                <p className="text-slate-400">
                  {filteredFaqs.length} resultado{filteredFaqs.length !== 1 ? 's' : ''} encontrado{filteredFaqs.length !== 1 ? 's' : ''} para &ldquo;<span className="font-semibold text-blue-600">{searchTerm}</span>&rdquo;
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estadísticas del Centro de Ayuda */}
        {!searchTerm && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-blue-500 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{systemFAQs.length}</p>
                  <p className="text-blue-600 font-medium">Preguntas Frecuentes</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-emerald-500 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <HelpCircle className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{categories.length}</p>
                  <p className="text-emerald-600 font-medium">Categorías de Ayuda</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-amber-500 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400">24-48h</p>
                  <p className="text-amber-600 font-medium">Tiempo de Respuesta</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-purple-500 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-purple-400">24/7</p>
                  <p className="text-purple-600 font-medium">Disponibilidad</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Acceso rápido a temas populares */}
        {!searchTerm && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-slate-900">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Temas Más Consultados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 rounded-xl border border-slate-700 hover:shadow-md transition-all cursor-pointer"
                       onClick={() => setSearchTerm("crear factura")}>
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-300">Crear Facturas</span>
                    </div>
                    <p className="text-blue-600 text-sm">Proceso completo de facturación</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 rounded-xl border border-emerald-800 hover:shadow-md transition-all cursor-pointer"
                       onClick={() => setSearchTerm("dashboard")}>
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-300">Dashboard</span>
                    </div>
                    <p className="text-emerald-600 text-sm">Métricas e indicadores</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 rounded-xl border border-purple-800 hover:shadow-md transition-all cursor-pointer"
                       onClick={() => setSearchTerm("roles empleado")}>
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-purple-300">Roles y Permisos</span>
                    </div>
                    <p className="text-purple-600 text-sm">Gestión de empleados</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 rounded-xl border border-amber-800 hover:shadow-md transition-all cursor-pointer"
                       onClick={() => setSearchTerm("reportes IA")}>
                    <div className="flex items-center gap-3 mb-2">
                      <Star className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-300">Reportes con IA</span>
                    </div>
                    <p className="text-amber-600 text-sm">Análisis inteligente</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl border border-rose-200 hover:shadow-md transition-all cursor-pointer"
                       onClick={() => setSearchTerm("seguridad")}>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-5 w-5 text-rose-600" />
                      <span className="font-semibold text-rose-800">Seguridad</span>
                    </div>
                    <p className="text-rose-600 text-sm">Protección de datos</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 rounded-xl border border-cyan-200 hover:shadow-md transition-all cursor-pointer"
                       onClick={() => setSearchTerm("soporte técnico")}>
                    <div className="flex items-center gap-3 mb-2">
                      <MessageCircle className="h-5 w-5 text-cyan-600" />
                      <span className="font-semibold text-cyan-800">Soporte Técnico</span>
                    </div>
                    <p className="text-cyan-600 text-sm">Asistencia especializada</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {filteredFaqs.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <HelpCircle className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No se encontraron preguntas</h3>
              <p className="text-slate-400">Intenta con otros términos de búsqueda o usa los accesos rápidos de arriba</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryFaqs = filteredFaqs.filter((faq) => faq.category === category)
              if (categoryFaqs.length === 0) {
                return null
              }

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className={`bg-gradient-to-r ${getCategoryColor(category)} rounded-lg p-4 shadow-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">{getCategoryIcon(category)}</div>
                      <h2 className="text-2xl font-bold text-white">{category}</h2>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {categoryFaqs.length} preguntas
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {categoryFaqs.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Collapsible open={openItems.includes(faq.id)} onOpenChange={() => toggleItem(faq.id)}>
                          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-slate-900">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 transition-all duration-300 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-left text-slate-900 hover:text-blue-900 transition-colors">
                                    {faq.question}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {openItems.includes(faq.id) ? (
                                      <ChevronDown className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5 text-slate-400" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="pt-0 pb-6 px-6">
                                <div className="border-t border-slate-100 pt-4">
                                  <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
