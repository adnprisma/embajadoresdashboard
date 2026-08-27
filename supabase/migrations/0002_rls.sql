-- ---------------------------------------------------------------
-- Prisma dashboard — Row Level Security
-- Ver context/ROADMAP.md §4.2. RLS activado en TODAS las tablas,
-- sin excepción — incluidas las de solo lectura.
-- ---------------------------------------------------------------

-- ---------- profiles ----------
-- select/update solo la propia fila. Sin insert (lo hace el trigger
-- on_auth_user_created, que es security definer y no pasa por RLS).
-- Sin delete.
alter table profiles enable row level security;

create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- tablas con owner_id: CRUD completo del dueño ----------
-- Una sola política `for all` por tabla, igual para select/insert/update/delete.

alter table contacts enable row level security;
create policy "contacts_owner_all"
  on contacts for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table opportunities enable row level security;
create policy "opportunities_owner_all"
  on opportunities for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table tasks enable row level security;
create policy "tasks_owner_all"
  on tasks for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table interactions enable row level security;
create policy "interactions_owner_all"
  on interactions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table clients enable row level security;
create policy "clients_owner_all"
  on clients for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table notifications enable row level security;
create policy "notifications_owner_all"
  on notifications for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------- appointments ----------
-- CRUD completo del dueño, MÁS select adicional si visibility = 'team'.
-- Al ser políticas permisivas, se combinan con OR: un no-dueño solo gana
-- acceso de lectura vía la segunda política. Update/delete quedan
-- restringidos exclusivamente a "appointments_owner_all".
alter table appointments enable row level security;

create policy "appointments_owner_all"
  on appointments for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "appointments_team_select"
  on appointments for select
  to authenticated
  using (visibility = 'team');

-- ---------- commissions y points_ledger: SOLO LECTURA para el cliente ----------
-- REGLA CRÍTICA: el cliente nunca calcula ni escribe dinero ni puntos.
-- No se crean políticas de insert/update/delete: sin ellas, RLS bloquea
-- esas operaciones para cualquier rol que no sea el dueño de la conexión
-- (las funciones RPC security definer y el backoffice con service role
-- son quienes escriben, y ambos evaden RLS).

alter table commissions enable row level security;
create policy "commissions_select_own"
  on commissions for select
  to authenticated
  using (owner_id = auth.uid());

alter table points_ledger enable row level security;
create policy "points_ledger_select_own"
  on points_ledger for select
  to authenticated
  using (owner_id = auth.uid());

-- ---------- tablas de referencia: solo lectura para authenticated ----------
-- pipeline_stages, ranks, resources, app_config: sin escritura desde el
-- cliente. Se administran por migración/seed o backoffice.

alter table pipeline_stages enable row level security;
create policy "pipeline_stages_select"
  on pipeline_stages for select
  to authenticated
  using (true);

alter table ranks enable row level security;
create policy "ranks_select"
  on ranks for select
  to authenticated
  using (true);

alter table resources enable row level security;
create policy "resources_select"
  on resources for select
  to authenticated
  using (true);

alter table app_config enable row level security;
create policy "app_config_select"
  on app_config for select
  to authenticated
  using (true);
