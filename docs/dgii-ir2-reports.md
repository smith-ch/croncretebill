# Reportes DGII para IR-2 - ConcreteBill

## Descripción
Esta implementación proporciona los reportes resumidos de la Dirección General de Impuestos Internos (DGII) de República Dominicana necesarios para completar la declaración del Impuesto sobre la Renta (IR-2).

## Reportes Implementados

### 1. Reporte 607 - Compras y Servicios
- **Propósito**: Reportar todos los gastos y compras realizados por la empresa
- **Datos incluidos**: 
  - RNC/Cédula del proveedor
  - Tipo de bienes/servicios comprados (según catálogo DGII)
  - NCF del comprobante
  - Fecha del comprobante
  - Monto facturado e ITBIS
  - Forma de pago
  - Indicadores de anulación

### 2. Reporte 608 - Ventas
- **Propósito**: Reportar todos los ingresos por ventas de la empresa  
- **Datos incluidos**:
  - RNC/Cédula del cliente
  - NCF emitido
  - Tipo de ingreso
  - Fecha del comprobante
  - Monto facturado e ITBIS
  - Desglose por forma de pago (efectivo, tarjeta, crédito, etc.)
  - Indicadores de anulación

## Funcionalidades Principales

### Clasificación Automática
- **Gastos**: Se clasifican automáticamente según palabras clave en la descripción
- **Ingresos**: Se determinan según el tipo de NCF utilizado
- **Formas de pago**: Se mapean a los códigos oficiales de la DGII

### Validaciones
- Validación de formato de RNC (9 dígitos con dígito verificador)
- Validación de formato de Cédula (11 dígitos con dígito verificador)
- Validación de formato de NCF (11 caracteres: letra + tipo + secuencia)
- Validación de montos y fechas

### Exportación
- **Excel**: Para análisis y revisión local
- **XML**: Formato oficial para presentación a la DGII

## Estructura de Archivos

```
/app/dgii-reports/ir2/page.tsx          # Página principal de reportes IR-2
/types/dgii-reports.ts                  # Interfaces y tipos TypeScript
/lib/dgii-utils.ts                      # Utilidades y validaciones
```

## Uso

1. **Acceder a la página**: Navegue a `/dgii-reports/ir2`
2. **Seleccionar período**: Elija el año y mes a reportar
3. **Generar reportes**: Haga clic en "Generar Reportes"
4. **Revisar datos**: Examine los resúmenes y tablas de datos
5. **Exportar**: Descargue en formato Excel o XML según necesite

## Tipos de Comprobantes (Clasificación Automática)

### Gastos (Reporte 607)
- **01**: Gastos de Personal (salario, sueldo, nómina)
- **02**: Gastos por Trabajo, Suministro y Servicios (servicios, mantenimiento)
- **03**: Arrendamientos (alquiler, renta)
- **04**: Gastos de Activos Fijos (vehículos, equipos)
- **05**: Gastos de Representación (clientes, eventos)
- **07**: Gastos Financieros (intereses, comisiones)
- **09**: Compras y Gastos del Costo de Venta (combustible, materiales)
- **11**: Gastos de Seguros (pólizas, seguros)

### Ingresos (Reporte 608)
- **01**: Crédito Fiscal (NCF B01)
- **02**: Consumidor Final (NCF B02)
- **03**: Nota de Débito (NCF B03)  
- **04**: Nota de Crédito (NCF B04)

## Formas de Pago (Códigos DGII)
- **01**: Efectivo
- **02**: Cheques / Transferencias / Depósitos
- **03**: Tarjeta Débito/Crédito
- **04**: Compra a Crédito
- **05**: Permuta
- **06**: Nota de Crédito
- **07**: Mixto

## Configuración Requerida

### Base de Datos
Asegúrese de que las siguientes tablas tengan los campos necesarios:

#### Tabla `invoices`
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS indicador_anulacion INTEGER DEFAULT 0;
```

#### Tabla `expenses`  
```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ncf VARCHAR(20);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS itbis_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS provider_rnc VARCHAR(20);
```

#### Tabla `clients`
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipo_id VARCHAR(1) DEFAULT '2';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cedula VARCHAR(11);
```

### Permisos
Los usuarios deben tener el módulo "reports" habilitado para acceder a esta funcionalidad.

## Consideraciones Técnicas

### Performance
- Los reportes consultan datos por mes para optimizar rendimiento
- Se usa paginación en la visualización de datos (primeros 10 registros)
- Las exportaciones manejan todos los datos del período

### Validaciones
- Los RNC y Cédulas se validan usando los algoritmos oficiales dominicanos
- Los NCF se validan según el formato B/E + 2 dígitos + 8 dígitos
- Los montos se redondean a 2 decimales

### Compatibilidad
- Compatible con los formatos oficiales de la DGII
- Genera XML según especificaciones técnicas vigentes
- Exporta Excel en formato estándar para revisión

## Soporte y Mantenimiento

Esta implementación está diseñada para ser mantenible y extensible:
- Código modular y bien documentado
- Interfaces TypeScript para type safety
- Funciones utilitarias reutilizables
- Validaciones centralizadas

Para actualizaciones de catálogos o cambios en regulaciones DGII, modifique los archivos:
- `/types/dgii-reports.ts` - Para nuevos tipos de comprobantes
- `/lib/dgii-utils.ts` - Para nuevas clasificaciones o validaciones