# Documentación de Arquitectura y Plan de Migración (Frontend Vercel + Backend/DB VPS)

Este documento está dirigido al desarrollador experto ('Lead Developer' / 'Arquitecto') encargado de coordinar y ejecutar la migración del sistema "Concrete Billing System".

## 1. Visión General del Escenario Actual

Actualmente, el proyecto está fuertemente acoplado bajo una arquitectura típica de Frontend pesado (BaaS - Backend as a Service):
- **Framework:** Next.js 14.2.16 (App Router).
- **Backend/Base de Datos:** Supabase (manejando autenticación, PostgreSQL, Row Level Security, y almacenamiento).
- **Lógica de Negocio:** Gran parte de la lógica reside en el lado del cliente (componentes y hooks que interactúan directamente con la base de datos a través del `supabase-js` client) y parcialmente en API Routes de Next.js (`app/api/`).
- **PWA y Soporte Offline:** Se cuenta con una solución robusta PWA (Next-PWA) y gestión de modo offline (`lib/offline-cache.ts`, `lib/sync-queue.ts`).
- **UI:** Tailwind CSS, Radix UI, Framer Motion.

## 2. Visión del Entorno Destino (Arquitectura Desacoplada)

El objetivo de la migración es crear una separación estricta de responsabilidades (Separation of Concerns):
- **Frontend (Vercel):** Proyecto Next.js que se concentrará única y exclusivamente en la capa de presentación, UI, enrutamiento, lógica de vistas y gestión del estado offline (PWA). No habrá acceso directo a la base de datos.
- **Backend y Base de Datos (VPS):** Un servidor privado virtual que alojará:
  1. El motor de base de datos (PostgreSQL).
  2. Una API backend propia (ej. Node.js/NestJS, Express, Python FastAPI, o Self-Hosted Supabase) donde residirá el **100% de la lógica de negocio**.

### Diagrama Conceptual Propuesto

```text
[ VERCEL ]                                [ VPS ]
+-------------------+                     +--------------------+
| Frontend Next.js  |     Peticiones      | Backend API (REST/ |
| UI/UX             | <-----------------> | GraphQL)           |
| PWA/Offline Sync  |    (HTTPS/REST)     | (Lógica de negocio)|
| Auth Callbacks    |                     | Capa de Seguridad  |
+-------------------+                     +---------+----------+
                                                    |
                                                    v
                                          +--------------------+
                                          | Base de Datos      |
                                          | (PostgreSQL)       |
                                          +--------------------+
```

## 3. Estructura General del Proyecto (Estado Actual vs Transformación)

A continuación, se detalla la estructura principal del código fuente actual y los cambios requeridos en cada área para lograr la migración:

### Directorio `/app` (Rutas y Páginas Reac)
**Actualmente:** Contiene tanto componentes UI como acceso directo a datos (Server Components haciendo `supabase.from(...)` o Client Components usando hooks de Supabase). Las rutas API (`app/api`) exponen endpoints para tareas complejas o integraciones de terceros.
**En Migración:** 
- Limpiar el acceso directo a Supabase de los componentes y páginas.
- Los componentes cliente/servidor de Next.js realizarán llamadas HTTP (ej. `fetch`, axios, SWR, o React Query) hacia la nueva **API alojada en el VPS**.
- El parcheo de rutas `app/api` puede eliminarse si se trasladan esos endpoints directamente al backend del VPS, aligerando el peso del proyecto en Vercel.

### Directorio `/hooks` e interfaces
**Actualmente:** Tienes docenas de hooks acoplados a Supabase (ej. fetching de inventario, facturas, RLS handling).
**En Migración:** Deberán refactorizarse para que consuman el nuevo backend. Se volverán abstracciones sobre `fetch` o `axios` hacia el VPS. (Es muy recomendado introducir **TanStack Query (React Query)** para manejar esta transición, ya que facilitará la gestión del caché que Next.js PWA requiere).

### Directorio `/lib` (Lógica central del Front)
**Actualmente:** Tiene ficheros críticos como `supabase.ts`, `supabase-offline.ts`, `sync-queue.ts`. Posee la lógica offline.
**En Migración:** 
- La lógica PWA y de colas offline (`sync-queue.ts`) se preservará en el frontend.
- Sin embargo, en lugar de encolar "operaciones de Supabase", el `sync-queue` encolará "Peticiones HTTP (POST/PUT/DELETE)" que se enviarán al VPS tan pronto retorne la conexión.
- `user-permissions.ts`, `utils.ts`, `invoice-pdf-generator.ts` permanecen en el Frontend para generación de UI y PDFs del lado del cliente.

### Directorio `/scripts` (Operacional)
Contiene scripts de base de datos (ej. `grant-access.sql`) y verificaciones (`verify-pwa.js`).
**En Migración:** Los scripts de base de datos y migraciones (SQL) deberán moverse al repositorio del nuevo Backend del VPS, bajo un orquestador de migraciones como Prisma, TypeORM, Knex, o Flyway.

### Directorio `/components`
Completamente agnóstico. Solo recibe *props*. La migración casi no le afectará si la arquitectura de los page.tsx y hooks se aísla correctamente.

## 4. Plan de Acción y Fases de Migración Recomendadas

Recomendamos al equipo de Backend/Arquitectura dividir esta transición masiva en **4 fases iterativas** (metodología Estrangulador/Strangler Fig Pattern):

### Fase 1: Auditoría y Diseño de API (Mapeo de Datos)
1. Extraer los esquemas SQL de Supabase y volcarlos al nuevo servidor PostgreSQL en el VPS.
2. Mapear todas las queries que el frontend de Next.js hace actualmente hacia Supabase.
3. Diseñar de forma paralela los Endpoints (RESTful) en la nueva API del VPS para suplir exactamente lo que necesitan las vistas de Next.js (Contracts First).

### Fase 2: Construcción de la Lógica de Negocio en VPS (El "Nuevo" Backend)
1. Desarrollar el core del backend en el VPS. (Manejar JWT/Auth, Permisos, Roles).
2. Centralizar validaciones, inserciones complejas que antes estaban en los triggers de BD de Supabase.
3. El frontend de Vercel aún está intocable, apuntando al antiguo Supabase pre-VPS, mientras la API del VPS se consolida.

### Fase 3: Integración del Frontend Next.js vs VPS API
1. Introducir un API Client (Axios/Fetch/TRPC) genérico en el Frontend para conectarse al endpoint base del VPS (`https://api.midominio.com`).
2. Módulo por módulo, migrar los hooks: En lugar de `supabase.from('invoices').select()`, hacer un `fetch('/api/v1/invoices')`.
3. Ajustar la Cola de Sincronización Offline (`sync-queue.ts`) para que, ante falta de red local, persista en IndexedDB la petición HTTP de creación de factura dirigida al VPS, en lugar del comando de cliente de Supabase.

### Fase 4: Despliegue, Switch y Vercel
1. Compilar el Next.js limpio. Subirlo y enlazar Vercel con la rama master.
2. Definir variables de entorno en Vercel apuntando al backend origin: `NEXT_PUBLIC_API_URL=https://tu-vps-dominio.com/api`
3. Desplegar los servicios Docker (PostgreSQL + API Node) en el VPS, exponenciando con un reverse proxy seguro (NGINX/Traefik).

---

## Retos y Consideraciones Importantes para el Desarrollador

* **Autenticación (Auth):** Supabase Auth maneja cookies y sesiones fácilmente. Al mover esto al VPS, será necesario implementar una emisión de JWT robusta (Ejemplo: Next Auth / Auth.js en Vercel, o emitir Cookies HttpOnly directo desde el VPS API).
* **Supabase Offline:** Observo una amplia implementación en `lib/supabase-offline.ts`. En el nuevo esquema, este comportamiento deberá ser reemplazado por almacenamiento temporal local (IndexedDB a través de herramientas localFirst como RxDB, WatermelonDB, o simplemente lógica robusta en React Query/Zustand persist) que posteriormente sincronice con la **nueva API REST de VPS**, no con Supabase.
* **Seguridad (CORS):** Recuerda habilitar políticas de CORS en la API del VPS para aceptar únicamente peticiones provenientes del dominio productivo hosteado en `*.vercel.app`.

*(Fin del documento)*


## 5. Auditor�a de Seguridad y Permisos Actual

Se ha identificado que los principales agujeros de seguridad en la arquitectura de Vercel/Supabase que deben ser parchados en el VPS son:

1. **Falta de Validaci�n Centralizada de Autenticaci�n (Middleware):** Poca o nula verificaci�n de sesi�n en rutas API. Gran parte conf�a ciegamente en lo que env�a el cliente.

2. **Confianza en el Cliente (Client-Side Trust):** Hay Client Components enviando mutaciones a Supabase sin que haya una capa intermedia que dictamine si *'User A'* tiene permiso para realizar *'Acci�n B'* (Delegaci�n insegura).

3. **Ambig�edad de Roles:** Tablas como \profiles\ tienen un campo de rol (ej. 'vendedor', 'admin'), pero si ese campo solo se chequea en la UI (para mostrar u ocultar botones) y no en el servidor (a nivel de endpoint / RLS estricto), un usuario avanzado podr�a inyectar llamadas a la BD salteando la interfaz.

4. **Supabase RLS incompleto o mal configurado:** Como indica la enorme cantidad de errores Typescript devolviendo tipo \
ever\, es altamente probable que el Row Level Security (RLS) en tablas clave (facturas, inventario) no est� debidamente sellado con las pol�ticas necesarias.

