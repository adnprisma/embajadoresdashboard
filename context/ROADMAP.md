# PROYECTO: Dashboard interno de gestión comercial

Eres un arquitecto frontend senior. Vas a construir, desde cero, una aplicación web
completa de dashboard interno con autenticación y persistencia real en Supabase.

Trabaja en español (México) para toda la UI. Código, nombres de variables y comentarios
en inglés. Todo el contenido visible al usuario en español.

---

## 0. IDENTIDAD VISUAL — MARCADORES DE POSICIÓN

NO inventes identidad de marca. Usa estos marcadores literalmente en el código y
centralízalos para que yo los sustituya en UN solo lugar:

- `[NOMBRE DE MARCA]` → constante `BRAND.name` en `src/config/brand.ts`
- `[LOGO]` → componente `<Logo />` que hoy renderiza un placeholder SVG neutro
- `[PALETA DE COLORES]` → tokens CSS en `src/styles/tokens.css` (ver §8)
- `[TIPOGRAFÍA PRINCIPAL]` → variable `--font-display`
- `[TIPOGRAFÍA SECUNDARIA]` → variable `--font-body`
- `[TONO DE VOZ]` → todos los textos de UI viven en `src/config/copy.ts`, NUNCA
  hardcodeados en los componentes
- `[IMÁGENES/ILUSTRACIONES]` → componente `<Illustration name="..." />` con
  placeholders geométricos neutros

Crea `BRANDING.md` en la raíz explicando exactamente qué archivo tocar para cada
marcador.

---

## 1. STACK TÉCNICO (obligatorio)

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS v4 + tokens CSS propios |
| Componentes base | shadcn/ui (Radix UI) |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Auth SSR | `@supabase/ssr` + middleware de Next |
| Estado servidor | TanStack Query v5 |
| Formularios | React Hook Form + Zod + `@hookform/resolvers` |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Fechas | `date-fns` con locale `es` |
| Iconos | `lucide-react` |
| Gráficos | `recharts` |
| CSV | `papaparse` |
| Notificaciones | `sonner` |
| Animación | CSS `@keyframes` + `tailwindcss-animate`. NO uses Framer Motion ni GSAP |

Justificación de las elecciones no obvias:
- `@dnd-kit` en lugar de HTML5 drag&drop nativo: soporte táctil y de teclado.
- Recharts en lugar de gráfico a mano: menos superficie de bugs, accesible.
- TanStack Query: la app tiene ~12 pantallas que consultan las mismas entidades;
  necesitas caché compartida e invalidación.

---

## 2. SETUP DEL PROYECTO

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint
npx shadcn@latest init
npx shadcn@latest add button card input select tabs accordion dialog sheet \
  dropdown-menu table badge avatar skeleton switch checkbox label \
  tooltip separator popover calendar sonner
npm i @supabase/supabase-js @supabase/ssr @tanstack/react-query \
  react-hook-form zod @hookform/resolvers @dnd-kit/core @dnd-kit/sortable \
  @dnd-kit/utilities date-fns recharts papaparse lucide-react
npm i -D @types/papaparse
```

`.env.local` (y `.env.example` versionado):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 3. ESTRUCTURA DE CARPETAS

```
src/
  app/
    (auth)/
      login/page.tsx
      recuperar/page.tsx
      restablecer/page.tsx
      layout.tsx                 # layout centrado, sin sidebar
    (app)/
      layout.tsx                 # AppShell: sidebar + topbar + fondo
      dashboard/page.tsx
      dinero/page.tsx
      clientes/page.tsx
      pipeline/page.tsx
      contactos/page.tsx
      contactos/[id]/page.tsx
      calendario/page.tsx
      tareas/page.tsx
      recursos/page.tsx
      perfil/page.tsx
      integraciones/page.tsx
      ranking/page.tsx
      mi-link/page.tsx
    (fullscreen)/
      layout.tsx                 # sin sidebar, topbar propia con "← Volver"
      cotizador/page.tsx
      calculadora/page.tsx
    api/                         # solo si algo necesita secreto de servidor
    layout.tsx
    not-found.tsx
    error.tsx
  components/
    layout/    AppShell.tsx Sidebar.tsx MobileTopbar.tsx MobileDrawer.tsx
               UserMenu.tsx NotificationsBell.tsx Starfield.tsx AppFooter.tsx
    ui/        (shadcn)
    common/    StatCard.tsx Panel.tsx EmptyState.tsx SegmentedControl.tsx
               DataTable.tsx CopyField.tsx Stepper.tsx PageHeader.tsx
               AlertBanner.tsx LoadingScreen.tsx MoneyValue.tsx
    pipeline/  KanbanBoard.tsx KanbanColumn.tsx KanbanCard.tsx OpportunityDialog.tsx
    contactos/ ContactsTable.tsx ContactsFilters.tsx ImportDialog.tsx
    calendario/ MonthGrid.tsx WeekView.tsx AgendaView.tsx EventDialog.tsx
    dinero/    WalletPanel.tsx WalletFilters.tsx CommissionsChart.tsx
  lib/
    supabase/  client.ts server.ts middleware.ts
    queries/   dashboard.ts contacts.ts pipeline.ts tasks.ts wallet.ts
               calendar.ts clients.ts ranking.ts profile.ts
    utils/     format.ts date.ts csv.ts cn.ts
  hooks/       useSession.ts useMediaQuery.ts useCopyToClipboard.ts
               useRealtimeInvalidate.ts useReducedMotion.ts
  config/      brand.ts copy.ts nav.ts stages.ts ranks.ts pricing.ts
  types/       database.ts domain.ts
  styles/      tokens.css animations.css
supabase/
  migrations/  0001_schema.sql 0002_rls.sql 0003_functions.sql 0004_seed.sql
```

---

## 4. BASE DE DATOS SUPABASE

Genera migraciones SQL completas en `supabase/migrations/`.

### 4.1 Esquema (`0001_schema.sql`)

```sql
create extension if not exists "pgcrypto";

-- Perfil, 1:1 con auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  ref_code text unique not null,
  plan text not null default 'standard',
  status text not null default 'active',      -- active | paused | inactive
  billing_complete boolean not null default false,
  bank_data jsonb default '{}'::jsonb,
  tax_data jsonb default '{}'::jsonb,
  own_prices jsonb default '{}'::jsonb,
  tour_seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  industry text,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on contacts (owner_id);
create index contacts_search_idx on contacts
  using gin (to_tsvector('spanish',
    coalesce(business_name,'')||' '||coalesce(contact_name,'')||' '||coalesce(phone,'')));

create table pipeline_stages (
  id text primary key,                       -- 'new', 'analysis', ...
  name text not null,
  icon text not null,
  accent text not null,                      -- 'violet' | 'blue' | ...
  position int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  business_name text not null,
  stage_id text not null references pipeline_stages(id),
  value numeric(12,2) not null default 0,
  mrr numeric(12,2) not null default 0,
  position int not null default 0,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on opportunities (owner_id, stage_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  kind text not null,                        -- call | message | meeting | note
  body text,
  occurred_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled',  -- scheduled | done | cancelled
  visibility text not null default 'private',-- private | team
  url text
);
create index on appointments (owner_id, starts_at);

create table clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  name text not null,
  plan text,
  mrr numeric(12,2) not null default 0,
  status text not null default 'active',     -- active | at_risk | cancelled
  started_at date not null default current_date,
  next_renewal date
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  concept text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'validating', -- validating | trial | payable | paid
  is_estimate boolean not null default true,
  folio text,
  period date not null,                      -- primer día del mes
  paid_at date
);
create index on commissions (owner_id, period);

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  concept text not null,
  kind text not null,                        -- earned | released | redeemed | adjustment
  status text not null default 'available',  -- available | locked
  amount int not null,
  source_name text,
  folio text,
  unlocks_at date,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  category_id text not null,
  category_name text not null,
  category_icon text not null,
  position int not null,
  title text not null,
  subtitle text,
  icon text,
  badge_label text,
  badge_tone text,                            -- success | info | neutral | warning
  items jsonb not null default '[]'::jsonb,   -- [{title, href, kind, locked}]
  required_plan text
);

create table ranks (
  id text primary key, name text not null, min_points int not null,
  tone text not null, position int not null
);

create table app_config (
  key text primary key, value jsonb not null
);
```

Añade un trigger `set_updated_at()` en `contacts` y `opportunities`, y un trigger
`on_auth_user_created` que inserte la fila en `profiles` generando `ref_code`
(3 letras del nombre + 4 dígitos aleatorios, con reintento si colisiona).

### 4.2 RLS (`0002_rls.sql`)

Activa RLS en **todas** las tablas de datos.

- `profiles`: `select`/`update` solo `auth.uid() = id`. Nada de `delete`.
- Todas las tablas con `owner_id`: política única
  `using (owner_id = auth.uid()) with check (owner_id = auth.uid())` para
  select/insert/update/delete.
- `appointments`: además, `select` permitido si `visibility = 'team'`
  (solo lectura — el update/delete sigue restringido al dueño).
- `pipeline_stages`, `ranks`, `resources`, `app_config`: `select` para
  `authenticated`, sin escritura desde el cliente.

**REGLA CRÍTICA:** el cliente NUNCA calcula ni escribe dinero, puntos ni rangos.
`commissions` y `points_ledger` son de **solo lectura** para el cliente
(no crees políticas de insert/update/delete). Se escriben desde funciones
`security definer` o desde el backoffice.

### 4.3 Funciones RPC (`0003_functions.sql`)

Todas `language plpgsql security definer set search_path = public`, y todas
filtrando internamente por `auth.uid()`:

- `my_wallet_summary()` → `{available, locked, total}`
- `my_wallet_history(p_from date, p_to date)` → filas de `points_ledger`
- `my_rank()` → `{position, total_users, points, rank_id, streak}`
- `leaderboard(p_period text)` → top 50 con alias, puntos, rango y bandera `is_me`
  (**nunca devuelvas correos**)
- `my_dashboard_summary()` → un solo JSON con KPIs, estados de comisión,
  métricas de ventas y serie de 6 meses (una llamada, no seis)
- `my_pipeline_metrics()` → `{new_month, analyses, show_rate, close_rate, volume_month, closes_month}`
- `mark_tour_seen()`

### 4.4 Seed (`0004_seed.sql`)

- 9 etapas de pipeline: `new` Nuevas oportunidades, `analysis` Análisis,
  `scheduled` Cita agendada, `show` Asistió, `no_show` No asistió, `won` Cerrado,
  `churn` Baja, `nurturing` En seguimiento, `discarded` Descartado.
- 4 rangos con umbrales crecientes (nómbralos con `[TONO DE VOZ]` — déjalos como
  `Rango 1..4` y anota un `TODO` para que yo los nombre).
- 3 categorías de recursos con 2–3 ítems cada una.

Genera los tipos con `supabase gen types typescript` en `src/types/database.ts`.

---

## 5. AUTENTICACIÓN

- `src/lib/supabase/client.ts` → `createBrowserClient`
- `src/lib/supabase/server.ts` → `createServerClient` con cookies de Next
- `src/middleware.ts` → refresca la sesión y protege el grupo `(app)` y
  `(fullscreen)`. Si no hay sesión: redirect a `/login?next=<pathname>`.
  Si hay sesión y visita `(auth)`: redirect a `/dashboard`.
- `/login`: email + contraseña con `signInWithPassword`. RHF + Zod
  (`email().min(1)`, `password.min(8)`). Errores por campo bajo el input;
  error de credenciales como banner sobre el formulario. Botón con estado
  `loading` (spinner + `disabled` + `aria-busy`). Al éxito, redirige a `next`
  o `/dashboard`.
- `/recuperar` → `resetPasswordForEmail`; siempre muestra el mismo mensaje de
  éxito exista o no la cuenta (no filtres qué correos están registrados).
- `/restablecer` → `updateUser({password})` con confirmación y medidor de fuerza.
- Sin registro público: es una app interna. Las altas se hacen por invitación
  desde el panel de Supabase.

---

## 6. CAPA DE DATOS

Un archivo por dominio en `src/lib/queries/`. Cada uno exporta:
- `xxxKeys` — factory de query keys (`['contacts', 'list', filters]`)
- hooks `useXxx()` con TanStack Query
- mutaciones con **actualización optimista** + rollback + `toast.error` al fallar

`QueryClient` con `staleTime: 30_000` y `refetchOnWindowFocus: true`.

Hook `useRealtimeInvalidate(table, queryKey)`: se suscribe a
`postgres_changes` filtrando `owner_id=eq.<uid>` e invalida la key.
Úsalo en dashboard, pipeline, tareas y notificaciones.

Los componentes **nunca** llaman a `supabase` directamente. Solo a los hooks.

---

## 7. TOKENS Y SISTEMA VISUAL

`src/styles/tokens.css` — define TODO como variables. Ese archivo es el único
que yo voy a tocar para aplicar `[PALETA DE COLORES]`:

```css
:root {
  --font-display: /* [TIPOGRAFÍA PRINCIPAL] */ system-ui, sans-serif;
  --font-body:    /* [TIPOGRAFÍA SECUNDARIA] */ system-ui, sans-serif;

  --bg-base:      #0a0a0f;   /* [PALETA DE COLORES] */
  --bg-surface:   rgb(255 255 255 / 0.04);
  --border-subtle:rgb(255 255 255 / 0.08);
  --text-primary: #f5f5f7;
  --text-muted:   #9b9ba8;

  --accent-primary: #6b3df5;  /* acción */
  --accent-success: #22c55e;  /* positivo / dinero real */
  --accent-warning: #f59e0b;  /* pendiente */
  --accent-info:    #3b82f6;  /* en proceso */
  --accent-danger:  #ef4444;  /* negativo */

  --radius-card: 16px;
  --shadow-glow: 0 0 24px rgb(107 61 245 / 0.25);
}
```

Extiende Tailwind para consumir estas variables. **Ningún componente debe llevar
un color hexadecimal escrito a mano.**

Superficie estándar de tarjeta ("glass"):
`bg-[var(--bg-surface)] backdrop-blur-sm border border-[var(--border-subtle)] rounded-[var(--radius-card)]`

Tema oscuro único. No implementes conmutador claro/oscuro.

`src/styles/animations.css` con: `fade-in` (300 ms), `glow` (2 s infinito),
`float` (5 s infinito), `twinkle`, `spin` (800 ms lineal), `confetti-fall` (2.5 s).
Envuelve TODAS en `@media (prefers-reduced-motion: no-preference)`.

---

## 8. COMPONENTES BASE (props exactas)

```ts
<StatCard
  label: string
  value: string | number
  format?: 'currency' | 'percent' | 'number' | 'raw'   // default 'raw'
  icon: LucideIcon
  accent?: 'primary'|'success'|'warning'|'info'|'danger'|'neutral'
  hint?: string
  href?: string          // si existe, toda la tarjeta es un <Link> con chevron
  loading?: boolean      // renderiza Skeleton
/>

<Panel title icon action?: ReactNode subtitle?: string> {children} </Panel>

<EmptyState icon title description cta?: {label, href|onClick} />

<SegmentedControl<T>
  options: {value: T, label: string}[]
  value: T
  onChange: (v: T) => void
/>   // role="tablist", flechas ←/→, aria-selected, roving tabindex

<DataTable<T>
  columns: {key, header, render?, className?, sortable?}[]
  rows: T[]
  onRowClick?: (row: T) => void
  loading?: boolean
  empty: ReactNode
  virtualized?: boolean   // usa @tanstack/react-virtual si rows.length > 100
/>   // <thead> sticky top-0

<CopyField label value secondaryActions?: {label,onClick}[] />
// navigator.clipboard.writeText; estado `copied` 2000 ms; aria-live="polite";
// fallback a Web Share API en móvil si navigator.share existe

<Stepper steps={string[]} current={number} onStepClick={(i)=>void} />
// solo permite volver a pasos ya completados

<AlertBanner tone="warning|info" title description icon href? />
<MoneyValue amount currency="MXN" signed?  />
// Intl.NumberFormat('es-MX'); signed añade + / − además del color
```

Regla de accesibilidad para todos: el color **nunca** es el único portador de
información. Signo, ícono o texto siempre lo acompañan.

---

## 9. APP SHELL

`src/app/(app)/layout.tsx`:

```
<div class="relative min-h-screen">
  <Starfield />                 {/* canvas fixed inset-0 pointer-events-none */}
  <div class="nebula-bg" />     {/* degradados radiales fijos */}
  <div class="relative z-10 flex min-h-screen">
    <Sidebar />                 {/* hidden lg:block w-64 sticky top-0 h-screen */}
    <div class="flex-1 min-w-0">
      <MobileTopbar />          {/* lg:hidden sticky top-0 */}
      <main class="mx-auto w-full max-w-[1100px] px-4 py-6 lg:px-8">{children}</main>
      <AppFooter />
    </div>
  </div>
</div>
```

**Starfield:** array de ~120 partículas `{x,y,r,alpha,speed,phase}`; bucle
`requestAnimationFrame`; alpha oscilante para el titileo; `resize` con debounce
de 150 ms; **si `useReducedMotion()` es true, pinta un frame estático y no
arranca el bucle**; cancela el rAF en `useEffect` cleanup.

**Sidebar (arriba → abajo):** `<Logo />` + campana de notificaciones · separador ·
pill de puntos clicable · `<nav>` con `overflow-y-auto` · bloque de usuario fijo
al pie (avatar con inicial, nombre, correo, chevron → menú Perfil / Cerrar sesión).

**Navegación** (`src/config/nav.ts`), en 4 grupos separados por espacio, sin
etiquetas de grupo:
1. Dashboard · Mi dinero · Mis clientes
2. Pipeline · Contactos · Calendario · Mis tareas
3. Recursos · [enlaces externos con `ExternalLink` y `target="_blank" rel="noopener noreferrer"`]
4. Mi link · Ranking

Ítem activo: fondo `--accent-primary` al 12 %, borde sutil, texto blanco.
Inactivo: `--text-muted` → blanco en hover, `transition-colors 150ms`.
Determina el activo con `usePathname()` + `startsWith`.

**Mobile:** topbar fija (hamburguesa · logo · pill de puntos · pill de código ·
campana). El drawer es un `<Sheet side="left">` de shadcn, ancho 256px, con
overlay. **Se cierra automáticamente al cambiar de ruta** (`useEffect` sobre
`pathname`).

**LoadingScreen:** ilustración con `animate-glow` + texto de `copy.ts`, centrado,
mientras se resuelve la sesión.

**Scroll:** resetea a `0` en cada cambio de ruta.

---

## 10. PANTALLAS — LÓGICA POR SECCIÓN

### 10.1 `/dashboard`
Orden vertical:
1. `PageHeader` con saludo personalizado + fila de chips (plan · estado · código)
   + línea "actualizado hace N s" (`setInterval` de 1 s reseteado en cada refetch).
2. `AlertBanner` condicional si `profile.billing_complete === false`, con `href="/perfil"`.
3. Grid de 4 `StatCard`: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
   Ganado del mes (currency) · Clientes activos (number) · MRR (currency) ·
   Ranking (raw `#N`, hint `de N`).
4. Fila de 4 mini-tarjetas de estado de comisión, cada una con `href` a
   `/dinero?estado=<status>` y acento propio. Las dos primeras llevan la nota
   de "estimado" bajo el número.
5. `Panel` "Mis ventas" con sub-grid de 3 métricas.
6. `Panel` con `<CommissionsChart />`: `BarChart` de Recharts, 6 meses,
   eje X con meses abreviados en español, eje Y `notation:'compact'`,
   `Tooltip` con mes + monto, `isAnimationActive` según `useReducedMotion`.
7. `Panel` "Últimas comisiones" (lista o `EmptyState`).
8. `Panel` "Renovaciones próximas" (lista o `EmptyState`).

Todo desde `my_dashboard_summary()` en **una** query. Cada panel con su
`Skeleton` mientras carga. `useRealtimeInvalidate('commissions', ...)`.

### 10.2 `/dinero`
- Grid de 4 tarjetas de estado con acentos: validating→warning, trial→info,
  payable→primary, paid→success.
- Nota legal fina bajo el grupo (de `copy.ts`).
- `Panel` "Historial de comisiones" → `DataTable` o `EmptyState`.
- `Panel` de monedero:
  - Sub-grid de 3: Disponible / Bloqueado (ícono candado) / Total.
  - **Filtros combinados, 100 % en cliente:**
```ts
    const [filters, setFilters] = useState({
      status: 'all',        // SegmentedControl: all | available | locked
      kind: 'all',          // Select: all | earned | released | redeemed | adjustment
      period: 'all'         // Select: all | 'YYYY-MM'
    })
    const rows = useMemo(() =>
      entries.filter(e =>
        (filters.status === 'all' || e.status === filters.status) &&
        (filters.kind   === 'all' || e.kind   === filters.kind) &&
        (filters.period === 'all' || e.created_at.slice(0,7) === filters.period)
      ), [entries, filters])
```
  - Opciones de periodo **derivadas**:
    `[...new Set(entries.map(e => e.created_at.slice(0,7)))].sort().reverse()`,
    formateadas con `format(parseISO(m+'-01'), 'MMM yyyy', {locale: es})`.
  - Línea de resumen recalculada con `useMemo` sobre `rows`:
    "N movimientos · +X ganados · −Y en ajustes".
  - Cada fila: concepto + meta (fecha · origen · folio · fecha de liberación si
    `unlocks_at`) a la izquierda; `<MoneyValue signed>` a la derecha.
- Cambiar filtro NO dispara red ni spinner. Instantáneo.

### 10.3 `/clientes`
4 `StatCard` calculados con `useMemo` sobre el array (no 4 queries):
```ts
activos    = clients.filter(c => c.status === 'active').length
mrr        = sum(activos.map(c => c.mrr))
enRiesgo   = clients.filter(c => c.status === 'active' &&
               c.next_renewal && differenceInDays(parseISO(c.next_renewal), new Date()) <= 7).length
cancelados = clients.filter(c => c.status === 'cancelled').length
```
Debajo, `DataTable` de clientes o `EmptyState`.

### 10.4 `/pipeline` — la pantalla más compleja
- `PageHeader` con botón primario "Nueva oportunidad" (abre `OpportunityDialog`).
- Fila de 6 métricas compactas desde `my_pipeline_metrics()`.
- `KanbanBoard`:
  - Columnas generadas con `.map()` sobre `pipeline_stages` (nunca hardcodeadas).
  - Agrupación: `useMemo(() => groupBy(opportunities, 'stage_id'), [opportunities])`.
  - Contenedor `overflow-x-auto` + `scroll-snap-type: x proximity`;
    cada columna `w-[280px] shrink-0 scroll-snap-align: start`.
  - Cabecera de columna: ícono + nombre + `<Badge>` con el conteo.
    Borde superior de 2px con el acento de la etapa.
  - Cuerpo con `min-h-[200px]`; vacío → texto atenuado centrado.
- **Drag & drop con `@dnd-kit`:**
```
  <DndContext
    sensors={[PointerSensor(activationConstraint:{distance:8}), KeyboardSensor]}
    collisionDetection={closestCorners}
    onDragStart={setActiveId}
    onDragEnd={handleDragEnd}
  >
```
  `handleDragEnd`: si cambió de columna → `setQueryData` optimista →
  `updateOpportunityStage.mutate()` → en error, rollback + `toast.error`.
  `<DragOverlay>` con la tarjeta a `opacity-90` y `rotate-2`.
  La columna sobre la que se arrastra resalta borde y fondo.
- **Alternativa por teclado obligatoria:** cada `KanbanCard` lleva un
  `DropdownMenu` "Mover a…" con las 9 etapas. Sin esto la pantalla es inaccesible.
- La tarjeta enlaza a `/contactos/[contact_id]`.

### 10.5 `/contactos`
- `PageHeader` con 3 botones: Importar (secundario) · Exportar (secundario) ·
  Nuevo contacto (primario).
- Filtros: input de búsqueda con ícono + `Select` de giro + `Select` de etiqueta.
- Búsqueda con **debounce de 300 ms** (`useDeferredValue` o `useDebounce`),
  multicampo: `business_name`, `contact_name`, `phone`, `email`, `notes`,
  normalizando acentos y mayúsculas.
- Opciones de giro **derivadas de los datos**, ordenadas con
  `localeCompare('es')`. Nunca una lista fija.
- `DataTable` con columnas: Negocio · Contacto · Teléfono · Giro · Etiquetas ·
  Oport. · Próxima tarea. Celdas vacías con `—`. `virtualized` activado.
  Fila → `/contactos/[id]`.
- **Importar:** `<ImportDialog>` con 3 pasos —
  (1) soltar/elegir archivo, parseo con `Papa.parse(file, {header:true, worker:true})`;
  (2) mapeo de columnas (`Select` por campo destino, autodetección por nombre);
  (3) validación fila a fila con Zod, `insert` por lotes de 500,
  resumen "N importados · M con error" con descarga del CSV de errores.
  Permite import parcial.
- **Exportar:** `Papa.unparse(filasFiltradas)` → `Blob` → `URL.createObjectURL`
  → `<a download>` → `revokeObjectURL`. Exporta lo filtrado, no todo.
- Sin resultados → `EmptyState` con botón "Limpiar filtros".

### 10.6 `/contactos/[id]`
Cabecera con datos del contacto y acciones (editar, crear oportunidad, crear
tarea) · pestañas: Datos · Línea de tiempo (`interactions` ordenadas desc) ·
Tareas · Oportunidades.

### 10.7 `/calendario`
- `PageHeader` + botón "Nueva cita".
- Fila de leyenda con chips de color: Equipo (solo lectura) · Próxima · Pasada ·
  Cancelada.
- Barra de control: botón "Hoy" · `‹` `›` · etiqueta de mes/año ·
  `SegmentedControl` Mes / Semana / Agenda.
- `MonthGrid`: cabecera `lun…dom`, **semana inicia en lunes**:
```ts
  const start = startOfWeek(startOfMonth(cursor), {weekStartsOn: 1})
  const days  = eachDayOfInterval({start, end: addDays(start, 41)})  // 7×6
```
  Días fuera del mes atenuados; hoy con anillo de acento.
- Eventos posicionados en su celda, máximo 3 visibles + "+N más".
- Los eventos `visibility='team'` se renderizan en gris y **no son editables**
  (sin `onClick` de edición).
- **En `<768px` la vista por defecto es Agenda**, no la rejilla
  (`useMediaQuery('(min-width: 768px)')`).
- Click en día vacío → `EventDialog` con la fecha precargada.

### 10.8 `/tareas`
Lista con checkbox, título, contacto y vencimiento (vencidas en `--accent-danger`).
Al marcar: mutación optimista → tachado + `fade-out` de 300 ms → baja a la
sección "Completadas" (colapsable). `EmptyState` con la instrucción de dónde se
crean las tareas.

### 10.9 `/recursos`
Grupos por categoría (encabezado con ícono, nombre y contador derivado).
Dentro, `<Accordion type="multiple">` de shadcn — **múltiples paneles abiertos a
la vez**. Cada fila: ícono en cuadro, título numerado, subtítulo, `Badge` a la
derecha, chevron que rota 180°. Panel expandido = lista de `items` del JSONB.
Ítems con `locked: true` → ícono de candado + `Tooltip` explicativo,
**visibles pero no clicables** (no los ocultes).
Transición de altura 250 ms ease-in-out vía `--radix-accordion-content-height`.

### 10.10 `/mi-link`
`Panel` destacado con glow: label pequeño · código en `text-5xl font-[--font-display]` ·
`<CopyField>` con la URL en monoespaciada · dos acciones secundarias en texto
pequeño. Debajo, grid de 2 `StatCard` (clics del mes · clientes nuevos únicos).

### 10.11 `/ranking`
`SegmentedControl` Este mes / Este año / Histórico → **cambia la query key**
(`['leaderboard', period]`), así cada pestaña se cachea por separado y muestra
su propio spinner.
Tabla de posiciones con la fila propia destacada; si el usuario no está en el
top visible, ancla su fila con `sticky bottom-0`.
Barra de rangos: chips conectados por `→` desde `config/ranks.ts`, con el rango
actual destacado. Enlace "¿Cómo funciona?" → `Dialog` explicativo.
**Nunca muestres correos en el leaderboard**, solo nombre o alias.

### 10.12 `/perfil`
`Tabs`: Datos personales · Datos de cobro · Mis precios · Documentos.
Cada pestaña con su propio formulario RHF + Zod y guardado independiente
(`toast.success` al guardar). Subida de avatar al bucket `avatars` de Supabase
Storage con recorte cuadrado y límite de 2 MB.
Al completar los datos de cobro → `billing_complete = true`, lo que hace
desaparecer el banner del dashboard.

### 10.13 `/integraciones`
Grid de tarjetas de conector con estado conectado/desconectado y botón de acción.
Deja la lógica de conexión como `TODO` con la interfaz ya tipada.

### 10.14 `(fullscreen)/cotizador`
Layout SIN sidebar. Topbar propia con botón "← Volver" (`router.back()`),
logo centrado y badge de contexto.
1. `AlertBanner` informativo (texto de `copy.ts`).
2. Sección "Datos generales": grid de 2 columnas con inputs y select.
3. Sección "Implementaciones": fila horizontal de categorías-acordeón, cada una
   con ícono, nombre a dos líneas, contador `seleccionados/total` y chevron.
```ts
const [selection, setSelection] = useState<Record<string, number>>({})
const total = useMemo(() =>
  Object.entries(selection).reduce((s,[id,qty]) => s + priceOf(id)*qty, 0), [selection])
```
   Contadores por categoría derivados de `selection`.
4. Barra inferior fija con el total y botón "Generar propuesta".
5. **Persiste el borrador en `localStorage`** con debounce de 1 s, y ofrece
   restaurarlo al volver.

### 10.15 `(fullscreen)/calculadora`
Wizard de 4 pasos, ancho máximo 900px, centrado, sin sidebar.
`<Stepper steps={['Plan base','Complementos','Consumo','Resumen']} current={step} />`
Estado único:
```ts
const [state, setState] = useState({
  cycle: 'monthly' as 'monthly'|'annual',
  planId: null as string|null,
  addons: {} as Record<string, number>,
  usage: { units: 0 }
})
```
- Paso 1: `Switch` Mensual/Anual + grid de 3 tarjetas de plan como
  `role="radiogroup"` (flechas ←/→ para navegar), con badge "Recomendado"
  flotando sobre la tarjeta destacada. Cambiar el ciclo recalcula todos los
  precios al instante.
- Paso 4: desglose y total, con botón de exportar/imprimir.
- **Refleja el paso en la URL** (`?paso=2`) para que el botón atrás del navegador
  funcione. Validar antes de avanzar; el `Stepper` solo permite retroceder.

---

## 11. RESPONSIVE

| Breakpoint | Comportamiento |
|---|---|
| `<640px` | KPIs 1 col · tabla de contactos **se convierte en lista de tarjetas**, NO en scroll horizontal · calendario abre en vista Agenda · stepper → "Paso 2 de 4" |
| `640–1023px` | KPIs 2 cols · sidebar aún oculta · Kanban con scroll-snap |
| `≥1024px` | Sidebar visible y sticky · KPIs 4 cols · Kanban con 3–4 columnas visibles |

En móvil el drag&drop del Kanban queda disponible por táctil, pero el menú
"Mover a…" es la vía principal. Áreas táctiles mínimo 44×44 px.

---

## 12. ACCESIBILIDAD (no negociable)

- HTML semántico: `<nav>`, `<main>`, `<aside>`, `<table>` real para tablas,
  jerarquía de encabezados sin saltos.
- Contraste mínimo **4.5:1** para texto y **3:1** para bordes de control.
  Verifica cada par de tokens de `--text-muted` sobre `--bg-surface` — sobre
  fondo oscuro translúcido es el punto donde más suele fallar.
- Navegación completa por teclado. Foco visible siempre
  (`focus-visible:ring-2 ring-[--accent-primary] ring-offset-2`). Nunca `outline: none` sin sustituto.
- Skip link "Saltar al contenido" como primer elemento enfocable.
- Diálogos y drawer: focus trap, `Escape` cierra, foco devuelto al disparador
  (Radix ya lo hace — no lo reimplementes).
- `aria-live="polite"` para: copiado al portapapeles, resultado de import,
  guardado de formulario.
- Toda imagen con `alt` descriptivo; las decorativas con `alt=""`.
- Recharts: acompaña cada gráfico con una tabla oculta visualmente
  (`sr-only`) con los mismos datos.
- Respeta `prefers-reduced-motion` en todas las animaciones y en el canvas.
- Los inputs siempre con `<Label htmlFor>`; los errores con
  `aria-describedby` + `aria-invalid`.

---

## 13. PERFORMANCE

- `next/image` para todo lo rasterizado, con `sizes` correcto y `priority` solo
  en el logo del shell.
- `next/font` con `display: swap` y `subsets: ['latin']` para
  `[TIPOGRAFÍA PRINCIPAL]` y `[TIPOGRAFÍA SECUNDARIA]`. Sin `<link>` a fuentes externas.
- Code splitting: `dynamic()` para `ImportDialog`, `CommissionsChart`,
  `MonthGrid`, `KanbanBoard`, cotizador y calculadora — todos con `ssr: false`
  y un `Skeleton` como `loading`.
- Virtualización en la tabla de contactos por encima de 100 filas.
- `select` explícito en cada query de Supabase. **Nunca `select('*')`** en listas.
- Paginación por rango (`.range(from, to)`) en contactos, con carga incremental.
- Índices SQL ya incluidos en §4.1 — no los omitas.
- Objetivo: LCP < 2.5 s y bundle inicial de ruta < 200 KB gzip.

---

## 14. ORDEN DE EJECUCIÓN

Ve en este orden y **detente a mostrarme el resultado tras cada bloque**:

1. Setup, tokens, `config/` con todos los marcadores, `BRANDING.md`
2. Migraciones SQL completas (esquema + RLS + funciones + seed) y tipos generados
3. Cliente de Supabase, middleware, `/login`, `/recuperar`, `/restablecer`
4. AppShell completo (sidebar, drawer móvil, starfield, footer, LoadingScreen)
5. Componentes de `common/` con un archivo de demo que los muestre todos
6. Dashboard + capa de datos + realtime
7. Mi dinero (filtros compuestos + monedero)
8. Contactos (tabla, filtros, import, export) + ficha de contacto
9. Pipeline (Kanban + dnd-kit + métricas + diálogo de oportunidad)
10. Calendario + tareas
11. Clientes + ranking + mi link
12. Perfil + integraciones
13. Recursos
14. Cotizador y calculadora
15. Pasada final: accesibilidad, responsive, performance, estados vacíos y de error

## 15. REGLAS TRANSVERSALES

- TypeScript estricto. **Cero `any`.**
- **Cuatro estados en cada bloque de datos**: cargando (Skeleton), vacío
  (`EmptyState` con instrucción de siguiente paso), con datos, error (con reintento).
  Una tarjeta en blanco es un bug.
- Todo texto visible en `src/config/copy.ts`. Cero strings en JSX.
- Todo color desde tokens. Cero hexadecimales en componentes.
- Formatos con `Intl` y locale `es-MX`: moneda MXN, fechas con `date-fns` locale `es`.
- Cada mutación termina en `toast.success` o `toast.error`. Sin acciones silenciosas.
- **El cliente nunca calcula dinero, puntos ni permisos.** Eso vive en RPC y RLS.
- No copies ningún nombre, copy, color ni marca de ninguna app existente.
  Todo el contenido es genérico y placeholder hasta que yo lo sustituya.