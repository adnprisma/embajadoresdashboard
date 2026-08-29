-- ---------------------------------------------------------------
-- prospect_analysis — análisis de prospección para leads reales
-- (vetenerinarias, 4 alcaldías). Se llena desde el script de carga
-- (scripts/, ver bloque de datos reales), nunca desde el cliente.
--
-- business_name se guarda aparte de contact_id (aunque el match haya
-- funcionado) para poder reconciliar a mano si algún día el contacto se
-- borra o el match inicial estuvo mal — sin esto, perder el contact_id
-- deja el análisis sin ninguna pista de a quién pertenecía.
-- ---------------------------------------------------------------

create table prospect_analysis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  business_name text not null,
  score int,
  is_urgent boolean default false,
  colonia text,
  alcaldia text,
  address text,
  phone text,
  social text,
  gaps text[],
  opportunities text[],
  note text,
  source_file text,
  created_at timestamptz default now()
);

-- ---------- RLS ----------
-- Mismo patrón que el resto: solo lectura para el cliente. La carga real
-- pasa por el script de scripts/ con la service role (o el SQL Editor),
-- que evade RLS — igual que commissions/points_ledger, sin política de
-- insert/update/delete a propósito.
alter table prospect_analysis enable row level security;

create policy "prospect_analysis_select_own"
  on prospect_analysis for select
  to authenticated
  using (owner_id = auth.uid());
