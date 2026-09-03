-- ---------------------------------------------------------------
-- Cotizaciones — bloque 3 del cotizador (context/ROADMAP.md §10.14).
--
-- catalog_items es el espejo en Postgres de src/config/pricing.ts — la
-- única razón de que exista es que generate_quote() no puede leer un
-- archivo de TypeScript. Sembrado por scripts/generate-catalog-seed.ts
-- (nunca transcrito a mano — ver CLAUDE.md). Lectura pública a propósito:
-- no es dato sensible, ya viaja igual en el bundle de la app vía
-- pricing.ts.
--
-- Lleva los 42 conceptos, no solo los 33 editables por vendedora: el RPC
-- también tiene que resolver gestión y plataforma contra la base, nunca
-- confiar en un precio que mande el cliente — ni siquiera para los
-- conceptos que ninguna vendedora puede tocar.
-- ---------------------------------------------------------------

create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (
    item_type in ('paquete', 'adn', 'producto', 'gestion', 'plataforma_plan', 'plataforma_consumo', 'plataforma_whatsapp')
  ),
  item_id text not null unique,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null check (currency in ('MXN', 'USD')),
  -- Solo aplica a plataforma_plan (Owner+): cuando es true, el puente de
  -- WhatsApp ya viene incluido y generate_quote() no lo cobra aparte. Es
  -- regla de negocio, no solo un precio — por eso vive aquí y no se
  -- resuelve a ojo dentro del RPC.
  includes_whatsapp boolean not null default false
);

alter table catalog_items enable row level security;
create policy catalog_items_select on catalog_items for select using (true);

-- Generado por scripts/generate-catalog-seed.ts a partir de src/config/pricing.ts — 42 filas. No editar a mano.
insert into catalog_items (item_type, item_id, name, price, currency, includes_whatsapp) values
  ('paquete', 'paquete-inicia', 'Inicia', 15000, 'MXN', false),
  ('paquete', 'paquete-esencial', 'Esencial', 27000, 'MXN', false),
  ('paquete', 'paquete-completo', 'Completo', 45000, 'MXN', false),
  ('adn', 'adn-voz-tono', 'Voz y tono express', 2500, 'MXN', false),
  ('adn', 'adn-inicial', 'ADN inicial', 6000, 'MXN', false),
  ('adn', 'adn-completo', 'ADN completo', 12000, 'MXN', false),
  ('producto', 'producto-bienvenida', 'Flujo de bienvenida a nuevos clientes', 1800, 'MXN', false),
  ('producto', 'producto-reactivacion-inactivos', 'Reactivación de clientes inactivos', 2000, 'MXN', false),
  ('producto', 'producto-missed-call', 'Missed Call Text Back', 1200, 'MXN', false),
  ('producto', 'producto-seguimiento-post-servicio', 'Seguimiento post-servicio', 2000, 'MXN', false),
  ('producto', 'producto-reactivacion-temporada', 'Reactivación por temporada', 1800, 'MXN', false),
  ('producto', 'producto-referidos', 'Programa de referidos', 2500, 'MXN', false),
  ('producto', 'producto-reservas-basico', 'Reservas online básico', 2000, 'MXN', false),
  ('producto', 'producto-reservas-avanzado', 'Reservas avanzado (multi-servicio)', 4000, 'MXN', false),
  ('producto', 'producto-anti-noshows', 'Flujo anti no-shows', 2000, 'MXN', false),
  ('producto', 'producto-bandeja-unificada', 'Bandeja unificada', 1800, 'MXN', false),
  ('producto', 'producto-email-marketing', 'Email Marketing', 2000, 'MXN', false),
  ('producto', 'producto-sms-marketing', 'SMS Marketing', 1500, 'MXN', false),
  ('producto', 'producto-ia-conversacional-basico', 'Agente de IA conversacional básico', 3000, 'MXN', false),
  ('producto', 'producto-ia-conversacional-avanzado', 'Agente de IA conversacional avanzado', 5000, 'MXN', false),
  ('producto', 'producto-ia-voz-basico', 'Agente de IA por voz básico', 4000, 'MXN', false),
  ('producto', 'producto-ia-voz-avanzado', 'Agente de IA por voz avanzado', 6500, 'MXN', false),
  ('producto', 'producto-crm-pipeline', 'CRM / pipeline personalizado', 2500, 'MXN', false),
  ('producto', 'producto-importacion-base', 'Importación y limpieza de base', 1500, 'MXN', false),
  ('producto', 'producto-formularios-captura', 'Formularios de captura', 1800, 'MXN', false),
  ('producto', 'producto-cotizaciones-invoices', 'Cotizaciones e invoices', 2500, 'MXN', false),
  ('producto', 'producto-sitio-web-basico', 'Sitio web básico', 5000, 'MXN', false),
  ('producto', 'producto-landing-page', 'Landing page de captura', 3000, 'MXN', false),
  ('producto', 'producto-resenas-google', 'Reseñas de Google automáticas', 2000, 'MXN', false),
  ('producto', 'producto-social-media-planner', 'Social Media Planner', 2500, 'MXN', false),
  ('producto', 'producto-funnel-leads', 'Funnel de captación de leads', 6000, 'MXN', false),
  ('producto', 'producto-plataforma-cursos', 'Plataforma de cursos', 5000, 'MXN', false),
  ('producto', 'producto-membresia-contenido', 'Membresía de contenido recurrente', 6000, 'MXN', false),
  ('gestion', 'gestion-plan-contenido', 'Plan Contenido', 4500, 'MXN', false),
  ('gestion', 'gestion-plan-crecimiento', 'Plan Crecimiento', 9000, 'MXN', false),
  ('plataforma_plan', 'plataforma-growth', 'Growth', 47, 'USD', false),
  ('plataforma_plan', 'plataforma-pro', 'Pro', 97, 'USD', false),
  ('plataforma_plan', 'plataforma-owner-plus', 'Owner+', 197, 'USD', true),
  ('plataforma_consumo', 'consumo-ligero', 'Ligero', 10, 'USD', false),
  ('plataforma_consumo', 'consumo-medio', 'Medio', 25, 'USD', false),
  ('plataforma_consumo', 'consumo-intensivo', 'Intensivo', 50, 'USD', false),
  ('plataforma_whatsapp', 'plataforma-whatsapp-puente', 'WhatsApp (el Puente)', 29, 'USD', false);

-- ---------------------------------------------------------------
-- quotes: una fila por cotización generada. Nunca se edita — "otra
-- cotización" es una fila nueva, no un update. Por línea (productos, ADN,
-- gestión) y para el paquete cuando aplica, se guardan los TRES precios:
-- lo cobrado, el propio de la vendedora en ese momento, y el de catálogo
-- en ese momento — los tres congelados, nunca recalculados después. Sin
-- ellos, "Gladys cobra caro en general" y "le hizo un descuento a este
-- cliente" son indistinguibles.
-- ---------------------------------------------------------------

create table quotes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('pkg', 'custom')),

  -- Solo mode = 'pkg'. package_seller_price nunca es null cuando hay
  -- paquete: paquete/adn/producto siempre resuelven a un precio propio
  -- (el suyo si lo cambió, si no el de catálogo) — a diferencia de
  -- gestión, que de verdad no tiene ese concepto.
  package_id text references catalog_items(item_id),
  package_quoted_price numeric(12,2),
  package_seller_price numeric(12,2),
  package_catalog_price numeric(12,2),
  -- El ADN que vino incluido con el paquete (informativo — el paquete no
  -- lo cobra aparte, así que no lleva sus propios tres precios).
  package_adn_tier_id text references catalog_items(item_id),

  meses_diferimiento int not null check (meses_diferimiento > 0),
  whatsapp_incluido boolean not null,

  platform_plan_id text not null references catalog_items(item_id),
  platform_plan_price numeric(12,2) not null,
  platform_consumo_id text not null references catalog_items(item_id),
  platform_consumo_price numeric(12,2) not null,
  -- Null cuando Owner+ ya lo incluye, o cuando el toggle de WhatsApp
  -- está apagado — no cuando el precio es cero: cero sería una
  -- afirmación ("cuesta cero"), esto es ausencia.
  platform_whatsapp_price numeric(12,2),

  precio_especial numeric(12,2),
  subtotal numeric(12,2) not null,
  total numeric(12,2) not null,
  pago_inicial numeric(12,2) not null,
  pago_diferido_mensual numeric(12,2) not null,

  -- Suma de los planes de gestión de ESTA cotización — lo mismo que se
  -- copia a opportunities.mrr. Se guarda aquí también para no tener que
  -- volver a sumar quote_line_items cada vez que se muestra el historial.
  mrr numeric(12,2) not null default 0,

  -- Consistencia mode/paquete a nivel de esquema, no solo de RPC: un
  -- 'custom' con datos de paquete colgando (o viceversa) sería un dato
  -- imposible de leer sin ambigüedad.
  check (mode <> 'pkg' or (package_id is not null and package_quoted_price is not null and package_seller_price is not null and package_catalog_price is not null)),
  check (mode <> 'custom' or (package_id is null and package_quoted_price is null and package_seller_price is null and package_catalog_price is null and package_adn_tier_id is null))
);

create index quotes_opportunity_idx on quotes(opportunity_id, created_at desc);

create table quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  item_type text not null check (item_type in ('producto', 'adn', 'gestion')),
  item_id text not null references catalog_items(item_id),
  -- Congelado aparte de catalog_items.name: si el catálogo renombra el
  -- ítem después, esta cotización se sigue leyendo con el nombre que
  -- tenía cuando se generó.
  item_name text not null,
  quoted_price numeric(12,2) not null,
  -- Null únicamente para item_type = 'gestion': ese concepto no tiene
  -- precio propio de vendedora, y un null aquí lo dice honestamente en
  -- vez de fingir con un cero o repetir catalog_price.
  seller_price numeric(12,2),
  catalog_price numeric(12,2) not null,

  check ((item_type = 'gestion') = (seller_price is null))
);

create index quote_line_items_quote_idx on quote_line_items(quote_id);

alter table quotes enable row level security;
alter table quote_line_items enable row level security;

-- Mismo alcance que /pipeline: la dueña de la oportunidad ve sus propias
-- cotizaciones, admin las ve todas (supervisión de equipo, no "mi
-- dinero"). Sin políticas de insert/update/delete — todo write pasa por
-- generate_quote().
create policy quotes_select on quotes
  for select using (
    exists (
      select 1 from opportunities o
      where o.id = quotes.opportunity_id and (o.owner_id = auth.uid() or is_admin())
    )
  );

create policy quote_line_items_select on quote_line_items
  for select using (
    exists (
      select 1 from quotes q
      join opportunities o on o.id = q.opportunity_id
      where q.id = quote_line_items.quote_id and (o.owner_id = auth.uid() or is_admin())
    )
  );

-- ---------------------------------------------------------------
-- generate_quote(): recibe la SELECCIÓN (paquete/productos/ADN/gestión
-- con el precio que la vendedora tecleó por línea, más los ids de plan de
-- plataforma/consumo elegidos) — nunca un total ya sumado. Resuelve los
-- otros dos precios de cada línea contra catalog_items/seller_prices,
-- calcula subtotal/total/pagos/mrr él mismo, y en la misma transacción
-- actualiza opportunities.estimated_value y opportunities.mrr.
--
-- Regla dura: si algún id de p_lines/p_package_id/p_platform_plan_id/
-- p_platform_consumo_id/p_package_adn_tier_id no existe en catalog_items,
-- la función FALLA con una excepción que nombra el id — nunca salta la
-- línea en silencio ni inserta con precio cero. Es el respaldo real
-- contra el catálogo desincronizado: el script de verificación depende de
-- que alguien se acuerde de correrlo, esto no depende de nadie.
--
-- La plataforma (plan/consumo/WhatsApp) es referencia de un tercero — se
-- resuelve y se congela en la cotización igual que todo lo demás, pero
-- JAMÁS toca opportunities.mrr. Quien "arregle" esto para incluir
-- plataforma en el MRR va a estar inflando ingresos de Prisma con dinero
-- que se le paga a GoHighLevel, no a Prisma.
-- ---------------------------------------------------------------

create function generate_quote(
  p_opportunity_id uuid,
  p_mode text,
  p_meses_diferimiento int,
  p_whatsapp_incluido boolean,
  p_platform_plan_id text,
  p_platform_consumo_id text,
  p_lines jsonb default '[]'::jsonb,
  p_package_id text default null,
  p_package_quoted_price numeric default null,
  p_package_adn_tier_id text default null,
  p_precio_especial numeric default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid := coalesce(auth.uid(), p_created_by);
  v_opportunity record;
  v_stage record;
  v_seller_id uuid;
  v_quote_id uuid;

  v_package_catalog record;
  v_package_catalog_price numeric;
  v_package_seller_price numeric;

  v_plan record;
  v_consumo record;
  v_platform_whatsapp_price numeric;

  v_line jsonb;
  v_line_type text;
  v_line_id text;
  v_line_catalog record;
  v_line_quoted numeric;
  v_line_seller numeric;

  v_subtotal numeric := 0;
  v_total numeric;
  v_pago_inicial numeric;
  v_mrr numeric := 0;
begin
  if v_created_by is null then
    raise exception 'No hay sesión activa y no se pasó p_created_by: no se puede determinar quién genera esta cotización.';
  end if;

  select * into v_opportunity from opportunities where id = p_opportunity_id;
  if not found then
    raise exception 'La oportunidad % no existe.', p_opportunity_id;
  end if;

  if auth.uid() is not null and v_opportunity.owner_id <> auth.uid() and not is_admin() then
    raise exception 'Solo la dueña de la oportunidad o un admin puede generar una cotización.';
  end if;

  -- No se cotiza sobre una etapa terminal. Ganada: la venta ya está
  -- cerrada, cotizar pisaría el estimado de algo que ya tiene un valor
  -- cerrado real. Perdida: si se va a revivir, el orden es moverla a una
  -- etapa abierta primero y cotizar después — nunca que cotizar la
  -- reviva sola. Mensaje distinto para cada caso: alguien lo va a leer
  -- en pantalla en el bloque 5, un genérico no le dice qué hacer.
  select ps.is_won, ps.is_lost into v_stage from pipeline_stages ps where ps.id = v_opportunity.stage_id;
  if v_stage.is_won then
    raise exception 'Esta oportunidad ya está ganada — no se puede generar otra cotización sobre una venta cerrada. Si hace falta cotizar de nuevo a este cliente (una ampliación, un segundo proyecto), créale una oportunidad nueva.';
  end if;
  if v_stage.is_lost then
    raise exception 'Esta oportunidad está perdida — muévela a una etapa abierta antes de generar una cotización.';
  end if;

  v_seller_id := v_opportunity.owner_id;

  if p_mode not in ('pkg', 'custom') then
    raise exception 'mode inválido: %', p_mode;
  end if;

  -- ---------- paquete (solo mode = 'pkg') ----------
  if p_mode = 'pkg' then
    if p_package_id is null or p_package_quoted_price is null then
      raise exception 'Modo paquete requiere package_id y package_quoted_price.';
    end if;
    if p_package_quoted_price < 0 then
      raise exception 'El precio del paquete no puede ser negativo.';
    end if;

    select * into v_package_catalog from catalog_items where item_type = 'paquete' and item_id = p_package_id;
    if not found then
      raise exception 'El paquete % no existe en el catálogo.', p_package_id;
    end if;
    v_package_catalog_price := v_package_catalog.price;

    if p_package_adn_tier_id is not null then
      if not exists (select 1 from catalog_items where item_type = 'adn' and item_id = p_package_adn_tier_id) then
        raise exception 'El ADN % no existe en el catálogo.', p_package_adn_tier_id;
      end if;
    end if;

    select coalesce(
      (select price from seller_prices where seller_id = v_seller_id and item_type = 'paquete' and item_id = p_package_id),
      v_package_catalog_price
    ) into v_package_seller_price;

    v_subtotal := v_subtotal + p_package_quoted_price;
  end if;

  -- ---------- plataforma ----------
  select * into v_plan from catalog_items where item_type = 'plataforma_plan' and item_id = p_platform_plan_id;
  if not found then
    raise exception 'El plan de plataforma % no existe en el catálogo.', p_platform_plan_id;
  end if;

  select * into v_consumo from catalog_items where item_type = 'plataforma_consumo' and item_id = p_platform_consumo_id;
  if not found then
    raise exception 'El nivel de consumo % no existe en el catálogo.', p_platform_consumo_id;
  end if;

  if v_plan.includes_whatsapp then
    v_platform_whatsapp_price := null;
  elsif p_whatsapp_incluido then
    select price into v_platform_whatsapp_price from catalog_items
      where item_type = 'plataforma_whatsapp' and item_id = 'plataforma-whatsapp-puente';
  else
    v_platform_whatsapp_price := null;
  end if;

  -- ---------- precio especial ----------
  if p_precio_especial is not null and p_precio_especial < 0 then
    raise exception 'El precio especial no puede ser negativo.';
  end if;

  -- ---------- insertar cabecera (stub: subtotal/total/pagos/mrr se
  -- completan después de resolver las líneas) ----------
  insert into quotes (
    opportunity_id, created_by, mode,
    package_id, package_quoted_price, package_seller_price, package_catalog_price, package_adn_tier_id,
    meses_diferimiento, whatsapp_incluido,
    platform_plan_id, platform_plan_price, platform_consumo_id, platform_consumo_price, platform_whatsapp_price,
    precio_especial, subtotal, total, pago_inicial, pago_diferido_mensual, mrr
  ) values (
    p_opportunity_id, v_created_by, p_mode,
    p_package_id, p_package_quoted_price, v_package_seller_price,
    v_package_catalog_price,
    p_package_adn_tier_id,
    p_meses_diferimiento, p_whatsapp_incluido,
    p_platform_plan_id, v_plan.price, p_platform_consumo_id, v_consumo.price, v_platform_whatsapp_price,
    p_precio_especial, 0, 0, 0, 0, 0
  )
  returning id into v_quote_id;

  -- ---------- líneas: productos, ADN, gestión ----------
  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_type := v_line->>'item_type';
    v_line_id := v_line->>'item_id';

    if v_line_type not in ('producto', 'adn', 'gestion') then
      raise exception 'item_type inválido en una línea: %', v_line_type;
    end if;

    select * into v_line_catalog from catalog_items where item_type = v_line_type and item_id = v_line_id;
    if not found then
      raise exception 'El ítem %:% no existe en el catálogo.', v_line_type, v_line_id;
    end if;

    if v_line_type = 'gestion' then
      -- Fijo de Prisma: se ignora cualquier precio que mande el cliente
      -- para esta línea, nunca se confía en él.
      v_line_quoted := v_line_catalog.price;
      v_line_seller := null;
      v_mrr := v_mrr + v_line_catalog.price;
    else
      v_line_quoted := (v_line->>'quoted_price')::numeric;
      if v_line_quoted is null or v_line_quoted < 0 then
        raise exception 'Precio inválido para %:%.', v_line_type, v_line_id;
      end if;
      select coalesce(
        (select price from seller_prices where seller_id = v_seller_id and item_type = v_line_type and item_id = v_line_id),
        v_line_catalog.price
      ) into v_line_seller;
    end if;

    insert into quote_line_items (quote_id, item_type, item_id, item_name, quoted_price, seller_price, catalog_price)
    values (v_quote_id, v_line_type, v_line_id, v_line_catalog.name, v_line_quoted, v_line_seller, v_line_catalog.price);

    v_subtotal := v_subtotal + v_line_quoted;
  end loop;

  -- ---------- totales ----------
  v_total := coalesce(p_precio_especial, v_subtotal);
  v_pago_inicial := least(5000, v_total);

  update quotes set
    subtotal = v_subtotal,
    total = v_total,
    pago_inicial = v_pago_inicial,
    pago_diferido_mensual = (v_total - v_pago_inicial) / p_meses_diferimiento,
    mrr = v_mrr
  where id = v_quote_id;

  -- ---------- opportunities: cada cotización nueva REEMPLAZA el valor
  -- estimado y el mrr — no los suma. La cotización vigente es siempre la
  -- última; las anteriores quedan en el historial, no en estos dos
  -- campos. ----------
  update opportunities set estimated_value = v_total, mrr = v_mrr where id = p_opportunity_id;

  return v_quote_id;
end;
$$;
