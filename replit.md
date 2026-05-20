# PerformanceIQ

Plataforma SaaS de rendimiento deportivo y preparación física para fútbol. Permite gestionar jugadores, visualizar perfiles neuromusculares (Load/Explode/Drive), analizar métricas de rendimiento e importar datos desde Chronojump CSV.

## Run & Operate

- `pnpm --filter @workspace/performance-app run dev` — frontend (puerto asignado por Replit)
- `pnpm --filter @workspace/api-server run dev` — API server (Express 5)
- `pnpm run typecheck` — typecheck completo en todos los paquetes
- `pnpm run build` — typecheck + build de todos los paquetes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks y esquemas Zod desde OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar cambios de schema DB (solo dev)
- Variables de entorno requeridas: `DATABASE_URL` — PostgreSQL connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + Wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validación: Zod (zod/v4), drizzle-zod
- Codegen API: Orval (desde OpenAPI spec)
- Charts: Recharts (radar neuromuscular)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Contrato API (fuente de verdad)
- `lib/api-client-react/src/generated/` — Hooks de React Query generados por Orval
- `lib/api-zod/src/generated/` — Esquemas Zod generados por Orval
- `lib/db/src/schema/` — Schema de base de datos (players.ts, neuromuscular.ts, sessions.ts)
- `artifacts/api-server/src/routes/` — Rutas API (players.ts, neuromuscular.ts, sessions.ts, dashboard.ts)
- `artifacts/performance-app/src/pages/` — Páginas React (Dashboard, Players, PlayerProfile, Sessions, SessionDetail)
- `artifacts/performance-app/src/components/Layout.tsx` — Layout con sidebar de navegación

## Architecture decisions

- Diseño oscuro por defecto (dark mode always-on), sin toggle de tema — orientado a entornos profesionales de rendimiento deportivo
- OpenAPI-first: toda la interfaz API está definida en openapi.yaml y los tipos/hooks se generan automáticamente
- Perfiles neuromusculares calculados automáticamente en el servidor (Load/Explode/Drive → profileType + interpretation)
- Importación CSV de Chronojump soporta columnas en español e inglés (nombre/name, posicion/position, etc.)
- La radar chart usa recharts con dos polígonos: el del jugador (cyan) y la media del equipo (muted, dashed)

## Product

- **Dashboard**: KPIs del plantel (total, disponibles, lesionados, alto riesgo), perfil neuromuscular medio, alertas de rendimiento, actividad reciente
- **Jugadores**: Lista con búsqueda, badges de estado/riesgo, añadir jugador manual o importar CSV de Chronojump
- **Perfil de Jugador**: Datos del jugador, radar neuromuscular Load/Explode/Drive, métricas (CMJ, SJ, fuerza isométrica, asimetría, RSI), interpretación automática del perfil, historial de sesiones
- **Sesiones**: Lista de sesiones de entrenamiento (fuerza, velocidad, resistencia, técnico, recuperación, partido), creación de nuevas sesiones con formulario
- **Detalle de Sesión**: Información completa de la sesión y ejercicios registrados

## User preferences

- Interfaz completamente en español
- Diseño premium oscuro estilo Catapult/VALD/Kitman Labs
- Sin pagos ni IA compleja en el MVP — enfocado en funcionalidad usable

## Gotchas

- Siempre ejecutar codegen (`pnpm --filter @workspace/api-spec run codegen`) después de cambiar el OpenAPI spec
- Los campos numéricos de Drizzle/PostgreSQL (numeric) se devuelven como strings, deben convertirse a Number() en las rutas
- La clase `dark` se aplica en `index.html` directamente — el app siempre está en modo oscuro

## Pointers

- Ver skill `pnpm-workspace` para estructura del workspace, TypeScript y configuración de paquetes
