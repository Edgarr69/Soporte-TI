# Soporte TI — Sistema unificado de soporte y mantenimiento

Plataforma web interna para gestionar dos tipos de solicitudes:

1. **Tickets de sistemas (TI)** — problemas de software, hardware y redes, con prioridad calculada automáticamente.
2. **Solicitudes de mantenimiento** — trabajos de mantenimiento general (`MTTO-*`) o de maquinaria (`MAQ-*`), con asignación de técnicos y generación de PDF.

Ambos módulos comparten autenticación, notificaciones y estructura de roles, pero tienen flujos de estados, catálogos y reportes independientes.

## Stack

- [Next.js 16](https://nextjs.org) App Router · TypeScript · Tailwind CSS v4
- [shadcn/ui](https://ui.shadcn.com) v4 (basado en `@base-ui/react`)
- [Supabase](https://supabase.com) — auth por cookies (`@supabase/ssr`), Postgres con RLS, Storage
- `@react-pdf/renderer` — generación de PDF en Server Actions
- Recharts — gráficas de dashboards y reportes
- `date-fns` (locale español) · `next-themes` (dark mode)

## Roles

| Rol | Home | Permisos |
|-----|------|----------|
| `usuario` | `/dashboard` | Crear tickets y solicitudes, ver los propios |
| `admin_sistemas` | `/admin/sistemas` | Gestionar tickets de sistemas, crear usuarios (rol `usuario`) |
| `admin_mantenimiento` | `/admin/mantenimiento` | Gestionar solicitudes, técnicos y catálogos |
| `super_admin` | `/admin` | Todo lo anterior + gestión completa de roles |
| `tecnico_mantenimiento` | `/tecnico` | Ver trabajos asignados (solo lectura) |

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo server-side (Admin API)
NEXT_PUBLIC_APP_URL=         # URL base, usada para servir el logo del PDF
```

La aplicación corre en [http://localhost:3000](http://localhost:3000).

## Base de datos

- El schema base vive en el proyecto de Supabase; las migraciones incrementales están en `supabase/migrations/` y se aplican manualmente en el SQL Editor.
- Buckets de Storage: `maintenance-docs` (PDFs y evidencias de mantenimiento).

## Estructura

```
src/
  actions/      Server Actions (tickets, maintenance, catalogs, users)
  app/          Rutas App Router (usuario, admin, técnico)
  components/   UI por módulo + shared + ui (shadcn)
  lib/          Tipos, helpers, clientes Supabase, caches
  proxy.ts      Refresh de sesión por request (reemplaza middleware.ts)
docs/context/   Documentación de contexto por módulo
supabase/       Migraciones SQL
```

## Verificación antes de desplegar

```bash
npx tsc --noEmit
npm run build
```
