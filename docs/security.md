# 🔐 Security Guide - ConcreteBill

## Arquitectura de Seguridad

ConcreteBill implementa múltiples capas de seguridad para proteger los datos empresariales críticos.

## 🛡️ Autenticación

### Supabase Auth
- **Email/Password**: Autenticación básica con hash seguro
- **OTP (One-Time Password)**: Códigos de verificación por email
- **Magic Links**: Enlaces de acceso sin contraseña
- **JWT Tokens**: Tokens seguros con expiración automática

### Políticas de Contraseña
```typescript
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // días
  preventReuse: 5 // últimas contraseñas
}
```

## 🔒 Autorización (RLS)

### Row Level Security
Cada tabla implementa RLS (Row Level Security) para aislar datos por empresa:

```sql
-- Política de ejemplo para facturas
CREATE POLICY "Users can only see their own company invoices" 
ON invoices FOR ALL 
USING (company_id = auth.jwt() ->> 'company_id');
```

### Roles y Permisos
```typescript
interface UserPermissions {
  role: 'admin' | 'manager' | 'employee' | 'viewer'
  modules: {
    invoices: 'full' | 'read' | 'create' | 'none'
    clients: 'full' | 'read' | 'none'
    inventory: 'full' | 'read' | 'none'
    reports: 'full' | 'read' | 'none'
    settings: 'full' | 'none'
  }
  restrictions?: {
    maxInvoiceAmount?: number
    canDeleteInvoices?: boolean
    canAccessAllClients?: boolean
  }
}
```

## 🌐 Seguridad de Red

### HTTPS Obligatorio
- **TLS 1.3**: Encriptación de extremo a extremo
- **HSTS**: HTTP Strict Transport Security
- **Certificate Pinning**: Validación de certificados

### Headers de Seguridad
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Seguridad headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return response
}
```

## 🔐 Gestión de Sesiones

### JWT Tokens
```typescript
interface JWTPayload {
  sub: string        // User ID
  email: string      // User email
  company_id: string // Company isolation
  role: string       // User role
  exp: number        // Expiration
  iat: number        // Issued at
}
```

### Auto-logout
- **Inactividad**: 30 minutos sin actividad
- **Tokens expirados**: Renovación automática
- **Múltiples sesiones**: Detecta y cierra sesiones duplicadas

```typescript
// hooks/use-auto-logout.ts
export function useAutoLogout() {
  const timeout = 30 * 60 * 1000 // 30 minutos
  
  useEffect(() => {
    let timer: NodeJS.Timeout
    
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        logout()
      }, timeout)
    }
    
    // Reset timer en cada actividad
    document.addEventListener('mousedown', resetTimer)
    document.addEventListener('keydown', resetTimer)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', resetTimer)
      document.removeEventListener('keydown', resetTimer)
    }
  }, [])
}
```

## 🛡️ Protección de Datos

### Encriptación
- **En tránsito**: TLS 1.3 para todas las comunicaciones
- **En reposo**: Encriptación AES-256 en base de datos
- **Backup**: Backups encriptados con claves rotativas

### Sanitización de Datos
```typescript
// Sanitizar inputs del usuario
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}
```

### Validación de Esquemas
```typescript
import { z } from 'zod'

const InvoiceSchema = z.object({
  client_id: z.string().uuid(),
  amount: z.number().positive().max(1000000),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive(),
    price: z.number().positive()
  }))
})
```

## 🔍 Auditoría y Logging

### Activity Logs
```typescript
interface ActivityLog {
  id: string
  user_id: string
  company_id: string
  action: 'create' | 'update' | 'delete' | 'view'
  resource: 'invoice' | 'client' | 'product' | 'user'
  resource_id: string
  details?: Record<string, any>
  ip_address: string
  user_agent: string
  timestamp: Date
}
```

### Sensitive Operations
- **Eliminaciones**: Log completo de datos eliminados
- **Cambios de precios**: Historial de modificaciones
- **Accesos**: Log de accesos a datos sensibles
- **Exportaciones**: Registro de exportación de datos

## 🚨 Detección de Amenazas

### Rate Limiting
```typescript
// Rate limiting por endpoint
const limits = {
  '/api/auth/login': '5 per 15m',
  '/api/invoices': '100 per 1h',
  '/api/reports': '10 per 5m'
}
```

### Detección de Anomalías
- **Múltiples logins fallidos**: Bloqueo temporal
- **Acceso desde nuevas ubicaciones**: Verificación adicional
- **Patrones inusuales**: Alertas automáticas
- **Cambios masivos**: Confirmación requerida

## 🔒 Compliance y Privacidad

### GDPR/CCPA
- **Right to Access**: Exportación de todos los datos del usuario
- **Right to Deletion**: Eliminación completa de datos
- **Data Portability**: Formato estándar de exportación
- **Consent Management**: Tracking de consentimientos

### Retención de Datos
```typescript
const retentionPolicies = {
  activity_logs: '2 years',
  invoices: '7 years', // Requerimiento fiscal
  client_data: 'Until deletion request',
  session_logs: '90 days',
  error_logs: '1 year'
}
```

## 🛠️ Configuración de Seguridad

### Variables de Entorno Seguras
```env
# Nunca commitear estas variables
SUPABASE_SERVICE_ROLE_KEY=xxx    # Solo en servidor
JWT_SECRET=xxx                   # Para firmado local
ENCRYPTION_KEY=xxx               # Para datos sensibles
```

### Configuración de Supabase
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo
CREATE POLICY "Company isolation" ON invoices
  FOR ALL USING (company_id = auth.jwt() ->> 'company_id');
```

## 🔧 Herramientas de Desarrollo

### Security Testing
```bash
# Audit de dependencias
pnpm audit

# Análisis estático de código
pnpm lint:security

# Testing de penetración
pnpm test:security
```

### Monitoring
- **Sentry**: Error tracking y alertas
- **LogRocket**: Session replay para debugging
- **Uptime monitors**: Disponibilidad del servicio

## 🚨 Incident Response

### Plan de Respuesta
1. **Detección**: Automated alerts y monitoring
2. **Containment**: Aislamiento inmediato de la amenaza
3. **Eradication**: Eliminación de la vulnerabilidad
4. **Recovery**: Restauración de servicios
5. **Lessons Learned**: Análisis post-incidente

### Contactos de Emergencia
- **Security Lead**: smithrodriguez345@gmail.com
- **Response Time**: < 2 horas para vulnerabilidades críticas
- **Escalation**: Notificación inmediata a clientes afectados

## 📚 Recursos Adicionales

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)

### Training
- Security awareness para desarrolladores
- Incident response procedures
- Secure coding guidelines

---

**🔒 La seguridad es responsabilidad de todos. Reportar vulnerabilidades a: smithrodriguez345@gmail.com**