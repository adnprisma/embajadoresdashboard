-- ---------------------------------------------------------------
-- compute_quote_totals(): la aritmética PURA de generate_quote() extraída
-- a su propia función — parámetros de entrada, números de salida, sin leer
-- ni escribir ninguna tabla. generate_quote() la llama internamente
-- (después de validar cada línea contra catalog_items e insertarla en
-- quote_line_items, igual que antes) para que del lado servidor haya una
-- sola aritmética, no dos copias a mano.
--
-- Por qué existe: src/lib/quoteMath.ts (la réplica en cliente que usa el
-- wizard para el preview instantáneo) y generate_quote() tenían la misma
-- fórmula escrita dos veces, con el riesgo real de desincronizarse (ya
-- pasó una vez: gestión sumándose al total de implementación). Se evaluó
-- reemplazar quoteMath.ts por una llamada de red a esta misma función en
-- cada tecla del wizard — se descartó (ver CLAUDE.md): las vendedoras
-- cotizan en sitio con datos móviles, el preview instantáneo es lo que
-- sostiene la conversación con el cliente. El wizard SIGUE con su copia en
-- TypeScript; esta función es exclusivamente para que
-- scripts/check-quote-math.ts pueda comparar esa copia contra la
-- aritmética real sin tener que llamar a generate_quote() (que inserta) y
-- sin necesitar una llave que se salte RLS.
--
-- security invoker (default, NO definer) a propósito: no toca ninguna
-- tabla, así que no hay nada que elevar. EXECUTE se da a anon/authenticated
-- explícitamente más abajo — es seguro dárselo a un caller sin sesión
-- porque no hay ninguna tabla de por medio, todo lo que devuelve ya lo
-- determina por completo lo que el caller mandó.
--
-- set search_path = public de todos modos, aunque hoy no toque tablas:
-- la función corre con el search_path de quien la llama, y en security
-- invoker eso importa MÁS, no menos — no hay un rol elevado protegiendo
-- nada, así que si algún día esta función crece y sí referencia algo sin
-- calificar de esquema, un search_path controlado por el caller ya podría
-- redirigirlo. Regla del proyecto, no una excepción para "porque hoy es
-- inofensiva".
--
-- p_lines: mismo formato que generate_quote() — jsonb array de
-- {"item_type": "producto"|"adn"|"gestion", "quoted_price": numeric}.
-- Limitado a 100 elementos (una cotización real nunca pasa de ~40
-- conceptos) para que un caller anónimo no pueda mandar un arreglo enorme
-- solo para hacerle procesar de más.
-- ---------------------------------------------------------------

create function compute_quote_totals(
  p_mode text,
  p_package_price numeric,
  p_lines jsonb,
  p_precio_especial numeric,
  p_meses_diferimiento int
)
returns table (
  subtotal numeric,
  total numeric,
  pago_inicial numeric,
  pago_diferido_mensual numeric,
  mrr numeric
)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_total numeric;
  v_pago_inicial numeric;
  v_mrr numeric := 0;
  v_line jsonb;
  v_line_type text;
  v_line_quoted numeric;
begin
  if p_meses_diferimiento is null or p_meses_diferimiento <= 0 then
    raise exception 'p_meses_diferimiento debe ser mayor a cero (llegó %).', p_meses_diferimiento;
  end if;

  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) > 100 then
    raise exception 'p_lines trae más de 100 elementos — una cotización real nunca llega ahí.';
  end if;

  if p_mode = 'pkg' then
    v_subtotal := coalesce(p_package_price, 0);
  end if;

  -- Mismo criterio que generate_quote(): gestión (recurrente, MXN) nunca
  -- entra a subtotal/total, solo a mrr — sumarla al total de
  -- implementación es el error de categoría que ya se coló una vez.
  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_type := v_line->>'item_type';
    v_line_quoted := (v_line->>'quoted_price')::numeric;

    if v_line_type = 'gestion' then
      v_mrr := v_mrr + coalesce(v_line_quoted, 0);
    else
      v_subtotal := v_subtotal + coalesce(v_line_quoted, 0);
    end if;
  end loop;

  v_total := coalesce(p_precio_especial, v_subtotal);
  v_pago_inicial := least(5000, v_total);

  return query select
    v_subtotal,
    v_total,
    v_pago_inicial,
    (v_total - v_pago_inicial) / p_meses_diferimiento,
    v_mrr;
end;
$$;

grant execute on function compute_quote_totals(text, numeric, jsonb, numeric, int) to anon, authenticated;

-- ---------------------------------------------------------------
-- BACKUP para revertir — texto EXACTO de generate_quote() tal como vive en
-- producción antes de este create or replace (aplicada en 0023_quotes.sql,
-- verbatim, incluido el "create function" original). Es una función que
-- calcula dinero: si compute_quote_totals() resulta tener un problema,
-- revertir es quitar los "-- " del margen del bloque de abajo Y cambiar
-- su primera línea de "create function" a "create or replace function"
-- (la de abajo ya existe en la base, "create function" a secas fallaría
-- con "ya existe") — y correrlo. No reconstruirla de memoria.
-- ---------------------------------------------------------------

-- create function generate_quote(
--   p_opportunity_id uuid,
--   p_mode text,
--   p_meses_diferimiento int,
--   p_whatsapp_incluido boolean,
--   p_platform_plan_id text,
--   p_platform_consumo_id text,
--   p_lines jsonb default '[]'::jsonb,
--   p_package_id text default null,
--   p_package_quoted_price numeric default null,
--   p_package_adn_tier_id text default null,
--   p_precio_especial numeric default null,
--   p_created_by uuid default null
-- )
-- returns uuid
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   v_created_by uuid := coalesce(auth.uid(), p_created_by);
--   v_opportunity record;
--   v_stage record;
--   v_seller_id uuid;
--   v_quote_id uuid;
--
--   v_package_catalog record;
--   v_package_catalog_price numeric;
--   v_package_seller_price numeric;
--
--   v_plan record;
--   v_consumo record;
--   v_platform_whatsapp_price numeric;
--
--   v_line jsonb;
--   v_line_type text;
--   v_line_id text;
--   v_line_catalog record;
--   v_line_quoted numeric;
--   v_line_seller numeric;
--
--   v_subtotal numeric := 0;
--   v_total numeric;
--   v_pago_inicial numeric;
--   v_mrr numeric := 0;
-- begin
--   if v_created_by is null then
--     raise exception 'No hay sesión activa y no se pasó p_created_by: no se puede determinar quién genera esta cotización.';
--   end if;
--
--   select * into v_opportunity from opportunities where id = p_opportunity_id;
--   if not found then
--     raise exception 'La oportunidad % no existe.', p_opportunity_id;
--   end if;
--
--   if auth.uid() is not null and v_opportunity.owner_id <> auth.uid() and not is_admin() then
--     raise exception 'Solo la dueña de la oportunidad o un admin puede generar una cotización.';
--   end if;
--
--   -- No se cotiza sobre una etapa terminal. Ganada: la venta ya está
--   -- cerrada, cotizar pisaría el estimado de algo que ya tiene un valor
--   -- cerrado real. Perdida: si se va a revivir, el orden es moverla a una
--   -- etapa abierta primero y cotizar después — nunca que cotizar la
--   -- reviva sola. Mensaje distinto para cada caso: alguien lo va a leer
--   -- en pantalla en el bloque 5, un genérico no le dice qué hacer.
--   select ps.is_won, ps.is_lost into v_stage from pipeline_stages ps where ps.id = v_opportunity.stage_id;
--   if v_stage.is_won then
--     raise exception 'Esta oportunidad ya está ganada — no se puede generar otra cotización sobre una venta cerrada. Si hace falta cotizar de nuevo a este cliente (una ampliación, un segundo proyecto), créale una oportunidad nueva.';
--   end if;
--   if v_stage.is_lost then
--     raise exception 'Esta oportunidad está perdida — muévela a una etapa abierta antes de generar una cotización.';
--   end if;
--
--   v_seller_id := v_opportunity.owner_id;
--
--   if p_mode not in ('pkg', 'custom') then
--     raise exception 'mode inválido: %', p_mode;
--   end if;
--
--   -- ---------- paquete (solo mode = 'pkg') ----------
--   if p_mode = 'pkg' then
--     if p_package_id is null or p_package_quoted_price is null then
--       raise exception 'Modo paquete requiere package_id y package_quoted_price.';
--     end if;
--     if p_package_quoted_price < 0 then
--       raise exception 'El precio del paquete no puede ser negativo.';
--     end if;
--
--     select * into v_package_catalog from catalog_items where item_type = 'paquete' and item_id = p_package_id;
--     if not found then
--       raise exception 'El paquete % no existe en el catálogo.', p_package_id;
--     end if;
--     v_package_catalog_price := v_package_catalog.price;
--
--     if p_package_adn_tier_id is not null then
--       if not exists (select 1 from catalog_items where item_type = 'adn' and item_id = p_package_adn_tier_id) then
--         raise exception 'El ADN % no existe en el catálogo.', p_package_adn_tier_id;
--       end if;
--     end if;
--
--     select coalesce(
--       (select price from seller_prices where seller_id = v_seller_id and item_type = 'paquete' and item_id = p_package_id),
--       v_package_catalog_price
--     ) into v_package_seller_price;
--
--     v_subtotal := v_subtotal + p_package_quoted_price;
--   end if;
--
--   -- ---------- plataforma ----------
--   select * into v_plan from catalog_items where item_type = 'plataforma_plan' and item_id = p_platform_plan_id;
--   if not found then
--     raise exception 'El plan de plataforma % no existe en el catálogo.', p_platform_plan_id;
--   end if;
--
--   select * into v_consumo from catalog_items where item_type = 'plataforma_consumo' and item_id = p_platform_consumo_id;
--   if not found then
--     raise exception 'El nivel de consumo % no existe en el catálogo.', p_platform_consumo_id;
--   end if;
--
--   if v_plan.includes_whatsapp then
--     v_platform_whatsapp_price := null;
--   elsif p_whatsapp_incluido then
--     select price into v_platform_whatsapp_price from catalog_items
--       where item_type = 'plataforma_whatsapp' and item_id = 'plataforma-whatsapp-puente';
--   else
--     v_platform_whatsapp_price := null;
--   end if;
--
--   -- ---------- precio especial ----------
--   if p_precio_especial is not null and p_precio_especial < 0 then
--     raise exception 'El precio especial no puede ser negativo.';
--   end if;
--
--   -- ---------- insertar cabecera (stub: subtotal/total/pagos/mrr se
--   -- completan después de resolver las líneas) ----------
--   insert into quotes (
--     opportunity_id, created_by, mode,
--     package_id, package_quoted_price, package_seller_price, package_catalog_price, package_adn_tier_id,
--     meses_diferimiento, whatsapp_incluido,
--     platform_plan_id, platform_plan_price, platform_consumo_id, platform_consumo_price, platform_whatsapp_price,
--     precio_especial, subtotal, total, pago_inicial, pago_diferido_mensual, mrr
--   ) values (
--     p_opportunity_id, v_created_by, p_mode,
--     p_package_id, p_package_quoted_price, v_package_seller_price,
--     v_package_catalog_price,
--     p_package_adn_tier_id,
--     p_meses_diferimiento, p_whatsapp_incluido,
--     p_platform_plan_id, v_plan.price, p_platform_consumo_id, v_consumo.price, v_platform_whatsapp_price,
--     p_precio_especial, 0, 0, 0, 0, 0
--   )
--   returning id into v_quote_id;
--
--   -- ---------- líneas: productos, ADN, gestión ----------
--   for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
--   loop
--     v_line_type := v_line->>'item_type';
--     v_line_id := v_line->>'item_id';
--
--     if v_line_type not in ('producto', 'adn', 'gestion') then
--       raise exception 'item_type inválido en una línea: %', v_line_type;
--     end if;
--
--     select * into v_line_catalog from catalog_items where item_type = v_line_type and item_id = v_line_id;
--     if not found then
--       raise exception 'El ítem %:% no existe en el catálogo.', v_line_type, v_line_id;
--     end if;
--
--     if v_line_type = 'gestion' then
--       -- Fijo de Prisma: se ignora cualquier precio que mande el cliente
--       -- para esta línea, nunca se confía en él.
--       v_line_quoted := v_line_catalog.price;
--       v_line_seller := null;
--       v_mrr := v_mrr + v_line_catalog.price;
--     else
--       v_line_quoted := (v_line->>'quoted_price')::numeric;
--       if v_line_quoted is null or v_line_quoted < 0 then
--         raise exception 'Precio inválido para %:%.', v_line_type, v_line_id;
--       end if;
--       select coalesce(
--         (select price from seller_prices where seller_id = v_seller_id and item_type = v_line_type and item_id = v_line_id),
--         v_line_catalog.price
--       ) into v_line_seller;
--     end if;
--
--     insert into quote_line_items (quote_id, item_type, item_id, item_name, quoted_price, seller_price, catalog_price)
--     values (v_quote_id, v_line_type, v_line_id, v_line_catalog.name, v_line_quoted, v_line_seller, v_line_catalog.price);
--
--     -- Gestión NO entra a v_subtotal: es un error de categoría sumar una
--     -- mensualidad recurrente a un total de pago único, y contamina
--     -- estimated_value — la cifra contra la que se compara closed_value más
--     -- adelante. Simétrico al caso de plataforma/mrr de arriba: son tres
--     -- cosas que nunca se suman entre sí (implementación de pago único,
--     -- gestión recurrente en MXN vía mrr, plataforma recurrente en USD que
--     -- ni siquiera es ingreso de Prisma). Gestión ya quedó registrada en
--     -- quote_line_items (para reconstruir la cotización) y en v_mrr (unas
--     -- líneas abajo) — sumarla aquí también sería la tercera vez, y la
--     -- única que rompe el total.
--     if v_line_type <> 'gestion' then
--       v_subtotal := v_subtotal + v_line_quoted;
--     end if;
--   end loop;
--
--   -- ---------- totales ----------
--   v_total := coalesce(p_precio_especial, v_subtotal);
--   v_pago_inicial := least(5000, v_total);
--
--   update quotes set
--     subtotal = v_subtotal,
--     total = v_total,
--     pago_inicial = v_pago_inicial,
--     pago_diferido_mensual = (v_total - v_pago_inicial) / p_meses_diferimiento,
--     mrr = v_mrr
--   where id = v_quote_id;
--
--   -- ---------- opportunities: cada cotización nueva REEMPLAZA el valor
--   -- estimado y el mrr — no los suma. La cotización vigente es siempre la
--   -- última; las anteriores quedan en el historial, no en estos dos
--   -- campos. ----------
--   update opportunities set estimated_value = v_total, mrr = v_mrr where id = p_opportunity_id;
--
--   return v_quote_id;
-- end;
-- $$;

-- ---------------------------------------------------------------
-- generate_quote() reemplazada para llamar a compute_quote_totals() en vez
-- de cargar subtotal/total/pago_inicial/pago_diferido_mensual/mrr a mano.
-- Idéntica en todo lo demás: misma validación de etapa terminal, mismo
-- candado de paquete/plataforma/precio especial, mismo insert de
-- quote_line_items línea por línea con su seller_price/catalog_price
-- resuelto. Solo cambia CÓMO se llega a los cinco números finales — antes
-- se acumulaban inline en este mismo bloque, ahora los calcula la función
-- de arriba, la misma que usa scripts/check-quote-math.ts para comparar
-- contra src/lib/quoteMath.ts.
-- ---------------------------------------------------------------

create or replace function generate_quote(
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
  -- Acumula {item_type, quoted_price} de cada línea ya validada, en el
  -- mismo formato que espera compute_quote_totals() — se arma en el mismo
  -- loop que valida contra catalog_items e inserta en quote_line_items,
  -- para no recorrer p_lines dos veces.
  v_lines_for_calc jsonb := '[]'::jsonb;

  v_subtotal numeric;
  v_total numeric;
  v_pago_inicial numeric;
  v_pago_diferido_mensual numeric;
  v_mrr numeric;
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

    v_lines_for_calc := v_lines_for_calc || jsonb_build_object('item_type', v_line_type, 'quoted_price', v_line_quoted);
  end loop;

  -- ---------- totales: una sola aritmética, compartida con
  -- scripts/check-quote-math.ts (ver compute_quote_totals arriba en esta
  -- misma migración) ----------
  select ct.subtotal, ct.total, ct.pago_inicial, ct.pago_diferido_mensual, ct.mrr
    into v_subtotal, v_total, v_pago_inicial, v_pago_diferido_mensual, v_mrr
  from compute_quote_totals(p_mode, p_package_quoted_price, v_lines_for_calc, p_precio_especial, p_meses_diferimiento) ct;

  update quotes set
    subtotal = v_subtotal,
    total = v_total,
    pago_inicial = v_pago_inicial,
    pago_diferido_mensual = v_pago_diferido_mensual,
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
