-- ---------------------------------------------------------------
-- Prisma dashboard — esquema base
-- Ver context/ROADMAP.md §4.1
-- ---------------------------------------------------------------

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
  id text primary key,
  name text not null,
  min_points int not null,
  tone text not null,
  position int not null
);

create table app_config (
  key text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on contacts
  for each row execute function set_updated_at();

create trigger set_updated_at
  before update on opportunities
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------
-- Trigger: alta de profile al crear un auth.users, con ref_code único
-- (3 letras + 4 dígitos, con reintento si colisiona).
-- ---------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_letters text := upper(left(
    regexp_replace(coalesce(nullif(v_full_name, ''), new.email), '[^A-Za-z]', '', 'g') || 'XXX',
    3
  ));
  v_code text;
  v_attempts int := 0;
begin
  loop
    v_code := v_letters || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.profiles (id, full_name, email, ref_code)
      values (new.id, v_full_name, new.email, v_code);
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 20 then
        raise exception 'No se pudo generar un ref_code único para el usuario %', new.id;
      end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Funciones de trigger: nadie debería invocarlas directamente como RPC.
revoke execute on function set_updated_at() from public;
revoke execute on function handle_new_user() from public;
