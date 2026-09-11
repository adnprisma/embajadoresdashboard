-- ---------------------------------------------------------------
-- Relaja generate_quote() para un caso real, angosto — no reabre la regla
-- general. Encontrado al preparar la landing de Vital Titanium
-- (0036_onboarding_landing.sql): la oportunidad se ganó y el cliente se
-- creó ANTES de que existiera ninguna cotización — el flujo nuevo
-- (won -> cliente -> landing) no estaba contemplado cuando se escribió el
-- bloqueo original (0023_quotes.sql), que asume que cotizar siempre
-- precede a ganar.
--
-- La regla que existía se conserva completa: una oportunidad ganada CON
-- una cotización ya registrada sigue rechazando cualquier intento de
-- generar otra — eso protege el historial de una venta cerrada, y no es
-- lo que se está relajando. Lo único nuevo es el caso "ganada, cero
-- cotizaciones registradas nunca" — se permite generar esa PRIMERA
-- cotización, una sola vez; en cuanto exista una, vuelve a aplicar el
-- rechazo de siempre.
--
-- Condición exacta: is_won = true AND no existe ninguna fila en quotes
-- con ese opportunity_id. No se toca en absoluto el bloqueo de is_lost.
--
-- Se descartó la alternativa de insertar la cotización por SQL directo
-- (saltando generate_quote()): eso saltaría el cálculo de precios de
-- vendedora/catálogo y de totales que hace el servidor — exactamente la
-- regla ("el cliente/nadie calcula dinero a mano fuera de la función")
-- que sostiene todo este sistema. Pasar por generate_quote(), aunque haya
-- que relajar una condición, mantiene ese cálculo en un solo lugar.
--
-- ---------- alcance real, verificado antes de escribir esto ----------
-- Hoy hay 2 oportunidades ganadas sin ninguna cotización — no es un caso
-- aislado de Vital Titanium:
--   - Vital Titanium (ca41dd90-0b46-4b90-a67e-8dcd69a5ee31) — SÍ tiene
--     cliente ya creado (52d24635-8e80-47ae-994f-29aa52bd26af), es el caso
--     que motivó este cambio.
--   - "barberia" (11f09766-a887-49b4-9cf6-57a27d68b9d2) — NO tiene cliente
--     creado, es un caso más viejo y distinto: una venta ganada que nunca
--     se cotizó, sin relación con el flujo de conversión a cliente. Esta
--     migración también la desbloquea (misma condición exacta), pero es
--     una decisión aparte, no algo que haya que confundir con "el flujo
--     de conversión está mal en dos lugares".
--
-- ---------- efecto secundario ya existente, sin cambiar aquí ----------
-- generate_quote() sigue escribiendo opportunities.estimated_value/mrr al
-- final, sin importar la etapa — eso ya pasaba antes de esta migración,
-- no es nuevo. Para una oportunidad ganada esto es inofensivo del lado de
-- reportes (my_pipeline_metrics().volume_month ya lee closed_value para
-- lo ganado, nunca estimated_value — ver 0016) y del lado de la UI
-- (OpportunityDetailView ya muestra closed_value, no estimated_value,
-- para una oportunidad ganada). Lo que SÍ puede quedar desincronizado:
-- opportunities.mrr se actualiza solo, pero clients.mrr no tiene ningún
-- trigger que lo siga — si la cotización de Vital Titanium trae gestión
-- (mrr > 0), hay que revisar a mano si clients.mrr necesita actualizarse
-- para que coincida.
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

  -- No se cotiza sobre una etapa terminal — con una excepción angosta.
  -- Ganada CON una cotización ya registrada: se sigue rechazando igual
  -- que siempre, la venta cerrada no se re-cotiza. Ganada SIN ninguna
  -- cotización todavía: se permite generar esa primera — es el caso real
  -- de una oportunidad que se convirtió a cliente antes de cotizar (ver
  -- comentario de cabecera de esta migración). Perdida: sin cambios,
  -- sigue bloqueada siempre.
  select ps.is_won, ps.is_lost into v_stage from pipeline_stages ps where ps.id = v_opportunity.stage_id;
  if v_stage.is_won and exists (select 1 from quotes q where q.opportunity_id = p_opportunity_id) then
    raise exception 'Esta oportunidad ya está ganada y ya tiene una cotización registrada — no se puede generar otra sobre una venta cerrada. Si hace falta cotizar de nuevo a este cliente (una ampliación, un segundo proyecto), créale una oportunidad nueva.';
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

    if v_line_type <> 'gestion' then
      v_subtotal := v_subtotal + v_line_quoted;
    end if;
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
  -- campos. Sobre una oportunidad ganada esto no afecta lo que ve la UI
  -- (que ya usa closed_value, no estimated_value, para lo ganado) — ver
  -- el comentario de cabecera sobre clients.mrr, que sí puede necesitar
  -- revisión a mano después de esto. ----------
  update opportunities set estimated_value = v_total, mrr = v_mrr where id = p_opportunity_id;

  return v_quote_id;
end;
$$;

-- ---------------------------------------------------------------
-- ---------- verificación post-migración ----------
-- Tres casos, sobre oportunidades de prueba desechables (nunca sobre
-- ca41dd90 ni ninguna otra fila real): (1) ganada + cero cotizaciones ->
-- debe permitir la primera; (2) esa misma, ahora con una cotización ->
-- debe volver a rechazar, la regla original se conserva; (3) perdida ->
-- sigue rechazando siempre, sin cambios.
-- ---------------------------------------------------------------
do $$
declare
  v_test_owner constant uuid := 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'; -- admin (Prisma), mismo owner que 0035
  v_won_id uuid;
  v_lost_id uuid;
  v_quote_id uuid;
begin
  -- Prueba 1: ganada, cero cotizaciones -> debe permitir la primera.
  insert into opportunities (owner_id, contact_id, business_name, stage_id, mrr, position, closed_value, closed_at)
  values (v_test_owner, null, '_generate_quote_test_won_sin_cotizacion', 'won', 0, 0, 12345, now())
  returning id into v_won_id;

  begin
    v_quote_id := generate_quote(
      p_opportunity_id := v_won_id,
      p_mode := 'custom',
      p_meses_diferimiento := 1,
      p_whatsapp_incluido := false,
      p_platform_plan_id := 'plataforma-growth',
      p_platform_consumo_id := 'consumo-ligero',
      p_created_by := v_test_owner
    );
  exception
    when others then
      delete from opportunities where id = v_won_id;
      raise exception 'FALLO DE PRUEBA 1: generate_quote() rechazó una oportunidad ganada SIN cotizaciones previas — debía permitirlo. Error original: %', sqlerrm;
  end;

  if not exists (select 1 from quotes where id = v_quote_id and opportunity_id = v_won_id) then
    delete from opportunities where id = v_won_id;
    raise exception 'FALLO DE PRUEBA 1: generate_quote() no dejó rastro de la cotización esperada.';
  end if;

  -- Prueba 2: la MISMA oportunidad, ahora ya con una cotización -> debe
  -- volver a rechazar, igual que antes de esta migración.
  begin
    perform generate_quote(
      p_opportunity_id := v_won_id,
      p_mode := 'custom',
      p_meses_diferimiento := 1,
      p_whatsapp_incluido := false,
      p_platform_plan_id := 'plataforma-growth',
      p_platform_consumo_id := 'consumo-ligero',
      p_created_by := v_test_owner
    );
    delete from quotes where opportunity_id = v_won_id;
    delete from opportunities where id = v_won_id;
    raise exception 'FALLO DE PRUEBA 2: generate_quote() dejó generar una SEGUNDA cotización sobre una oportunidad ya ganada con historial — la regla original se rompió.';
  exception
    when others then
      if sqlerrm not like 'Esta oportunidad ya está ganada y ya tiene una cotización registrada%' then
        delete from quotes where opportunity_id = v_won_id;
        delete from opportunities where id = v_won_id;
        raise;
      end if;
  end;

  -- Limpieza de las pruebas 1 y 2.
  delete from quotes where opportunity_id = v_won_id;
  delete from opportunities where id = v_won_id;

  -- Prueba 3: perdida -> sigue rechazando siempre, sin cambios.
  insert into opportunities (owner_id, contact_id, business_name, stage_id, mrr, position)
  values (v_test_owner, null, '_generate_quote_test_perdida', 'churn', 0, 0)
  returning id into v_lost_id;

  begin
    perform generate_quote(
      p_opportunity_id := v_lost_id,
      p_mode := 'custom',
      p_meses_diferimiento := 1,
      p_whatsapp_incluido := false,
      p_platform_plan_id := 'plataforma-growth',
      p_platform_consumo_id := 'consumo-ligero',
      p_created_by := v_test_owner
    );
    delete from opportunities where id = v_lost_id;
    raise exception 'FALLO DE PRUEBA 3: generate_quote() dejó cotizar una oportunidad perdida.';
  exception
    when others then
      if sqlerrm not like 'Esta oportunidad está perdida%' then
        delete from opportunities where id = v_lost_id;
        raise;
      end if;
  end;

  delete from opportunities where id = v_lost_id;
end $$;
