# Dashboard interno Prisma

Dashboard web interno de seguimiento comercial para Prisma. Autenticación
obligatoria y persistencia real en Supabase — no es un sitio público ni tiene
registro abierto (las altas se hacen por invitación).

Instrucciones permanentes de trabajo: [`CLAUDE.md`](./CLAUDE.md).
Identidad visual: [`context/DESIGN_SYSTEM.md`](./context/DESIGN_SYSTEM.md).
Roadmap original (bloques 1–15): [`context/ROADMAP.md`](./context/ROADMAP.md).
Marcadores de marca pendientes: [`BRANDING.md`](./BRANDING.md).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto.
- Supabase (Postgres + Auth + Storage), RLS en todas las tablas, RPC
  `security definer` para todo cálculo de dinero/puntos/permisos.
- TanStack Query v5 para la capa de datos del cliente.
- Tailwind v4, tokens propios en `src/styles/tokens.css` (`context/DESIGN_SYSTEM.md`
  es la fuente de autoridad — nunca un hexadecimal a mano en un componente).
- Radix UI (dialog, alert-dialog, dropdown-menu, tabs, popover, checkbox,
  collapsible) para todo lo que necesita foco/teclado/overlay correctos.
- `@dnd-kit` para el Kanban de `/pipeline`.
- `react-hook-form` + `zod` en todos los formularios.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # llenar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Las migraciones viven en `supabase/migrations/` (numeradas, corridas en
orden en el SQL Editor del proyecto de Supabase). `supabase/test-data/`
tiene scripts de seed/limpieza para probar cada pantalla con datos falsos.

`npm run build` corre el build de producción + type-check + lint.
`npm run lint` corre solo ESLint (`@typescript-eslint/no-unused-vars` activo
como warning — es el chequeo de código muerto de primera línea; ver la nota
de bloque 15 más abajo para lo que ESLint no puede atrapar).

## Estado por bloque del roadmap

| Bloque | Qué es | Estado |
|---|---|---|
| 1–2 | Setup, tokens, esquema SQL, RLS, funciones RPC, seed | Hecho |
| 3 | Auth: `/login`, `/recuperar`, `/restablecer`, middleware | Hecho |
| 4 | AppShell: sidebar, drawer móvil, footer, loading screen | Hecho |
| 5 | Componentes base de `common/` | Hecho — la página de demo que los mostraba (`/demo`) se borró en el bloque 15, era temporal por diseño |
| 6 | `/dashboard` + capa de datos + realtime | Hecho |
| 7 | `/dinero` | Hecho parcial — el panel de Monedero (puntos, `points_ledger`) se quitó de la UI; ver "Pausado" abajo |
| 8 | `/contactos` (tabla, filtros, import/export) + ficha | Hecho |
| 9 | `/pipeline` (Kanban, dnd-kit, métricas, diálogo de oportunidad) | Hecho |
| 10 | `/calendario` + `/tareas` | Hecho |
| 11 | `/clientes` | Hecho — `/ranking` y `/mi-link` (del mismo bloque) están pausados |
| 12 | `/perfil` | Hecho — `/integraciones` (del mismo bloque) está pausado |
| 13 | `/recursos` | Hecho — catálogo con 2 de 3 recursos (ver "Falta" abajo) |
| 14 | `(fullscreen)/cotizador` y `(fullscreen)/calculadora` | No construido todavía |
| 15 | Pasada final: limpieza, accesibilidad, responsive, performance, docs | En curso — este documento es parte del bloque 15 |

### Pausado (código quitado, nada borrado en la base de datos)

`/ranking`, `/mi-link` y `/integraciones` están en pausa mientras se evalúa
si el modelo de referidos aplica a la operación. Se quitaron las páginas, sus
entradas de navegación y los hooks de UI que ya no se usan (`useWalletSummary`,
`useWalletHistory`, `config/ranks.ts`) — pero **nada se borró en Supabase**:
`points_ledger`, `ranks` y las funciones RPC que los usan (`my_rank`,
`leaderboard`, `my_wallet_summary`, `my_wallet_history`) siguen intactas y con
RLS activo, listas para retomarse sin perder nada. El código sigue disponible
en el historial de git si se retoma la decisión.

`my_dashboard_summary()` sigue calculando y devolviendo la posición de
ranking del usuario — solo se dejó de mostrar en la UI (la StatCard de
Ranking del dashboard enlazaba a `/ranking`, que ya no existe).

### Falta

- **Tipografía de títulos (`--font-display`)**: es un marcador temporal
  (apunta a IBM Plex Sans, igual que el texto de cuerpo). El kit de marca no
  define tipografía y no hay licencia confirmada para una familia propia —
  ver `context/DESIGN_SYSTEM.md` §4 y `BRANDING.md`.
- **Tercer recurso de `/recursos`**: el catálogo en `config/recursos.ts`
  tiene 2 entradas (Prisma Academy, Manual de Ventas); falta el tercero.
- **Ilustraciones sin cablear**: los PNG aprobados están en
  `public/illustrations/` pero ningún componente los usa todavía — no existe
  `<Illustration />` y `EmptyState` cae siempre al ícono neutro. Ver
  `BRANDING.md`.
- **Bloque 14** (cotizador y calculadora) no se ha empezado.
- **Hallazgos de accesibilidad/responsive/performance del bloque 15**: la
  pasada final encontró pendientes reales (contraste de bordes de control,
  algunos badges de estado, skip link ausente, sin lista de tarjetas para
  contactos en móvil, componentes pesados sin carga diferida). Se reportaron
  por prioridad en la conversación del bloque 15 en vez de corregirse de una
  vez — pídele a quien mantenga el proyecto que revise ese reporte antes de
  asumir que la pasada de accesibilidad está cerrada.
