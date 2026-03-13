# Propuesta de Nueva Arquitectura y Estructura del Proyecto

Esta es la estructura propuesta para migrar de una arquitectura acoplada en Vercel/Supabase a un entorno profesional desacoplado compuesto por:
1. **Frontend (Vercel):** Next.js (Client-centric)
2. **Backend (VPS):** NestJS API + Manejo de colas/workers
3. **Database (VPS):** PostgreSQL Dockerizado

---

## 1. Backend (VPS): NestJS + Docker
El backend tomará responsabilidad ABSOLUTA sobre validaciones, autenticación (JWT), permisos RLS (ahora manejados en código) e interacciones con la base de datos (usando un ORM como Prisma o TypeORM).

```text
/backend-api (Repositorio Separado o Monorepo)
├── src/
│   ├── auth/                 # Lógica JWT, Guards, Estrategias Passport
│   ├── common/               # Filtros globales, interceptores, decoradores (Paginación, Errores HTTP)
│   ├── config/               # .env loaders, configuración de base de datos
│   ├── database/             # Conexiones, Seeders
│   └── modules/              # Lógica de Negocio (Domain-Driven Design)
│       ├── users/            # ABM y Roles de Usuarios
│       ├── clients/          # Clientes
│       ├── products/         # Catálogo e Inventario
│       ├── invoices/         # Facturación (Creación, PDF gen, Lógica DGII)
│       ├── expenses/         # Módulo de gastos
│       └── agenda/           # Control horario
├── prisma/                   # (Si usas Prisma ORM) Esquemas, migraciones (.sql) y cliente
│   ├── schema.prisma         # Modelaje único de la BD PostgreSQL
│   └── migrations/           # Historial de cambios a la BD
├── Dockerfile                # Construcción optimizada de la App NestJS
├── docker-compose.yml        # Orquestación de Node.js + PostgreSQL + Redis (opcional)
└── package.json
```

**Beneficios de esta estructura NestJS:**
- Inyección de dependencias (DI) integrada, lo cual facilita hacer Test Unitarios.
- El módulo de Autenticación Centralizada asegura que el Frontend nunca pueda hacer una mutación prohibida.
- La carpeta de migraciones (`prisma/migrations`) reemplazará el caos actual de la carpeta `scripts/` llena de SQL dispersos.

---

## 2. Base de Datos (VPS): PostgreSQL Dockerizado
Ya no dependeremos del panel mágico de Supabase. Todo será infraestructura como código.

Usando el `docker-compose.yml` en la raíz de tu VPS, levantarás tu servidor:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: billing_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      # Script inicial de carga de Roles, Permisos y Tablas base (Extrayendo tus scripts actuales)
      - ./init-db:/docker-entrypoint-initdb.d/ 

  nestjs-api:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://root:${DB_PASSWORD}@postgres:5432/billing_db

volumes:
  pgdata:
```

---

## 3. Frontend (Vercel): Next.js Reestructurado
El Frontend ya no tendrá ninguna conexión a base de datos. Se usará como React SPA híbrido.

```text
/frontend (Repositorio actual refactorizado)
├── app/                      # Solo Rutas, Páginas y Layouts (Next.js App Router)
├── components/               # UI Pura (Radix UI / Tailwind)
│   ├── ui/                   # Botones, Modales genéricos
│   └── domain/               # Componentes ligados a tu negocio (InvoiceTable, ProductForm)
├── hooks/                    
│   ├── api/                  # Reemplaza los hooks de Supabase. Usar React Query/SWR haciendo fetch a la API del VPS
│   └── ui/                   # Hooks visuales (useMenu, useTheme)
├── lib/
│   ├── apiClient.ts          # Configuración global de Axios/Fetch apuntando al VPS e inyectando JWT.
│   ├── offlineStorage.ts     # IndexedDB o RxDB (Aquí se guarda info para uso offline sin Supabase)
│   └── offlineSyncQueue.ts   # Cola que guarda llamadas POST/PUT y las envía al API del VPS al recuperar internet
├── types/                    # Interfaces Typecript generadas en base a los modelos de NestJS (o OpenAPI/Swagger)
└── package.json
```

**Cambios vitales:**
1. Eliminamos todos los imports de `@supabase/supabase-js`.
2. Se reemplaza el `app/api/*` pesado, por un simple `lib/apiClient.ts` que negocia los tokens contra el backend alojado en el VPS.
3. Adiós a la preocupación de seguridad en el front, es solo UI y gestión Offline.
