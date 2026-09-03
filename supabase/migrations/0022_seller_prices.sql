-- ---------------------------------------------------------------
-- Precios propios de cada vendedora, con historial — bloque 2 del
-- cotizador (context/ROADMAP.md §10.14).
--
-- Mismo patrón que contacts.status + interactions: seller_prices es el
-- valor ACTUAL (consultable, indexado), seller_price_changes es el log
-- append-only de cada cambio (qué precio, cuál era antes, cuándo, quién).
-- Reemplaza profiles.own_prices (jsonb de conceptos libres) — confirmado
-- por SELECT antes de escribir esto que ningún perfil tiene datos ahí
-- (0 filas con entries no vacíos), así que no hay nada que migrar. La
-- columna own_prices se queda sin usar por ahora (no se borra en este
-- bloque — eso es una decisión aparte).
--
-- Solo 33 de los 42 conceptos del catálogo llevan fila aquí: los 3
-- paquetes, los 3 niveles de ADN y los 27 productos. Los 2 planes de
-- gestión son precio fijo de Prisma (decisión explícita, no descuido) y
-- viven solo en config/pricing.ts — nunca en esta tabla. item_type lo
-- refleja con un check que ni siquiera admite 'gestion' como valor.
-- ---------------------------------------------------------------

create table seller_prices (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  item_type text not null check (item_type in ('paquete', 'adn', 'producto')),
  item_id text not null,
  price numeric(12,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  unique (seller_id, item_type, item_id)
);

create table seller_price_changes (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  item_type text not null check (item_type in ('paquete', 'adn', 'producto')),
  item_id text not null,
  old_price numeric(12,2),
  new_price numeric(12,2) not null,
  changed_by uuid not null references profiles(id),
  changed_at timestamptz not null default now()
);

create index seller_price_changes_seller_idx on seller_price_changes(seller_id, item_type, item_id, changed_at desc);

alter table seller_prices enable row level security;
alter table seller_price_changes enable row level security;

-- Solo lectura por RLS directa — todo write pasa por update_seller_price(),
-- nunca un update/insert directo del cliente (mismo criterio que el estado
-- de un contacto). Admin puede leer todo: es supervisión de equipo ("cuánto
-- se aparta cada vendedora del catálogo"), no dinero personal — decisión ya
-- tomada, aunque la pantalla que lo use todavía no existe (bloque 6).
create policy seller_prices_select on seller_prices
  for select using (seller_id = auth.uid() or is_admin());

create policy seller_price_changes_select on seller_price_changes
  for select using (seller_id = auth.uid() or is_admin());

-- ---------- update_seller_price: upsert + log en una sola función ----------
create function update_seller_price(
  p_item_type text,
  p_item_id text,
  p_new_price numeric,
  p_seller_id uuid default null,
  p_changed_by uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid := coalesce(auth.uid(), p_seller_id);
  v_changed_by uuid := coalesce(auth.uid(), p_changed_by, v_seller_id);
  v_old_price numeric;
begin
  if v_seller_id is null then
    raise exception 'No hay sesión activa y no se pasó p_seller_id: no se puede determinar de quién son estos precios.';
  end if;

  if p_item_type not in ('paquete', 'adn', 'producto') then
    raise exception 'item_type inválido: % (gestión es precio fijo, nunca lleva fila aquí).', p_item_type;
  end if;

  if p_new_price is null or p_new_price < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  select price into v_old_price from seller_prices
    where seller_id = v_seller_id and item_type = p_item_type and item_id = p_item_id;

  insert into seller_prices (seller_id, item_type, item_id, price, updated_at)
  values (v_seller_id, p_item_type, p_item_id, p_new_price, now())
  on conflict (seller_id, item_type, item_id)
  do update set price = excluded.price, updated_at = now();

  insert into seller_price_changes (seller_id, item_type, item_id, old_price, new_price, changed_by)
  values (v_seller_id, p_item_type, p_item_id, v_old_price, p_new_price, v_changed_by);

  return p_new_price;
end;
$$;
