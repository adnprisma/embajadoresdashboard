-- ---------------------------------------------------------------
-- Landing personalizada por cliente en iaprisma.com/onboarding — sustituye
-- al formulario de arranque como lo que aparece justo después del código
-- (el formulario se muda a su propia página, ver prisma-comercial). Tres
-- secciones: cotización (qué compró), pago de implementación (según
-- modalidad), pago de plataforma. Diseño acordado en la conversación; este
-- archivo es la consecuencia de esa decisión, no una nueva.
--
-- ---------- clients.payment_modality ----------
-- Único campo nuevo en clients. Se evaluó derivarlo de
-- quotes.meses_diferimiento y se descartó: ese campo es un <input
-- type="number" min="1"> libre en el wizard (GestionPlatformStep.tsx), no
-- restringido a {1,3,6} — una vendedora puede cotizar a 4 u 8 meses para
-- el desglose interno de pago sin que eso tenga relación con cuál de los 9
-- links reales de Stripe le corresponde al cliente. Nulable, sin default:
-- es una decisión de negocio por cliente, editada directo en Supabase
-- (mismo criterio que los otros datos de pago — un solo cliente hoy, no
-- amerita pantalla de admin).
--
-- El link de plataforma NO lleva campo de asignación en clients — se
-- evaluó (Néstor/David) y se descartó: el cobro de plataforma es UNO
-- solo, administrado por Prisma, no repartido por vendedora. Una sola
-- clave en app_settings alcanza.
-- ---------------------------------------------------------------

alter table clients add column payment_modality text
  check (payment_modality in ('contado', 'plan-3', 'plan-6'));

-- ---------- app_settings: platform_link ----------
-- Nombre sin segmentos (a diferencia de stripe_link.<modalidad>.<paquete>)
-- porque es una sola clave, no una familia — mismo criterio que bank_titular/
-- bank_nombre/bank_clabe, que tampoco llevan prefijo por ser únicas.
insert into app_settings (key, value) values ('platform_link', null);

-- El trigger de 0026 ya distingue por prefijo/nombre de clave — se agrega
-- un elsif propio para platform_link en vez de reusar el branch de
-- 'stripe_link.%': son dos decisiones independientes (la clave de
-- plataforma bien podría dejar de ser un Payment Link de Stripe algún día
-- sin que eso tenga que ver con los 9 de implementación), y un elsif
-- aparte dejarlo así de explícito. La validación en sí es la misma regla
-- (dominio de Stripe, rechaza modo prueba) porque hoy también es Stripe.
create or replace function validate_app_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.key like 'stripe_link.%' then
    if new.value is not null then
      if new.value ~ '^https://buy\.stripe\.com/test_' then
        raise exception 'Es un link de PRUEBA de Stripe, no cobra dinero real.';
      end if;
      if new.value !~ '^https://buy\.stripe\.com/' then
        raise exception 'El valor de % debe ser un Payment Link de Stripe (buy.stripe.com).', new.key;
      end if;
    end if;
  elsif new.key = 'platform_link' then
    if new.value is not null then
      if new.value ~ '^https://buy\.stripe\.com/test_' then
        raise exception 'Es un link de PRUEBA de Stripe, no cobra dinero real.';
      end if;
      if new.value !~ '^https://buy\.stripe\.com/' then
        raise exception 'El valor de platform_link debe ser un Payment Link de Stripe (buy.stripe.com).';
      end if;
    end if;
  elsif new.key = 'bank_clabe' then
    if new.value is not null and not is_valid_clabe(new.value) then
      raise exception 'bank_clabe no es una CLABE válida (18 dígitos con dígito verificador correcto).';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- get_onboarding_landing(p_access_code text): RPC nueva y separada de
-- verify_onboarding_access() — no una ampliación de ella. Costo aceptado:
-- ~10 líneas de validación de código repetidas. A cambio, el gate de
-- acceso (verify_onboarding_access) se queda angosto para siempre, y esta
-- función crece sola cuando la landing necesite un campo más, sin volver
-- a tocar la que hace el chequeo de identidad.
--
-- El código es la ÚNICA credencial, otra vez, en cada llamada — recibe
-- p_access_code, NUNCA p_client_id. Si aceptara un id ya resuelto,
-- cualquiera que llegara a ver el client_id de OTRO cliente (inspeccionando
-- su propia sesión de red, por ejemplo) podría pedir su cotización sin el
-- código de nadie.
--
-- NO toca onboarding_last_accessed_at — esa escritura se queda como
-- responsabilidad única de verify_onboarding_access(), un solo lugar
-- llevando esa cuenta.
--
-- ---------- qué NO devuelve, a propósito ----------
-- - package_seller_price, package_catalog_price (quotes) y seller_price,
--   catalog_price (quote_line_items): con ellos el cliente calcula el
--   descuento que se le hizo y de ahí el margen. Solo sale quoted_price/
--   package_quoted_price — lo cotizado, nunca lo demás de la fila.
-- - meses_diferimiento y pago_diferido_mensual: meses_diferimiento es un
--   número libre que la vendedora usa para el desglose INTERNO del
--   wizard, no está restringido a las modalidades reales de Stripe
--   (1/3/6) — mostrarlo junto a payment_modality podía decirle al cliente
--   "6 pagos de $X" cuando su modalidad real es a 3, dos planes de pago
--   contradictorios en la misma pantalla. La sección de pago se arma solo
--   con payment_modality (y el link de Stripe que resuelve), nunca con
--   estos dos.
--
-- ---------- degradación explícita, no error ----------
-- - Sin cotización (has_quote = false): pasa hoy mismo con Vital Titanium
--   (0 cotizaciones, confirmado en vivo antes de escribir esto) — la
--   sección 1 debe mostrar un estado vacío, nunca romperse.
-- - mode = 'custom' (sin package_id) o payment_modality null: no hay
--   stripe_link.<modalidad>.<packageId> que resolver — stripe_payment_link
--   sale null, la sección 2 cae a "modalidad pendiente de definir" +
--   transferencia como única vía por ahora. Gap heredado del esquema
--   actual de app_settings (solo cubre paquetes, no cotizaciones a la
--   carta) — no se resuelve aquí, se documenta.
-- ---------------------------------------------------------------

create or replace function get_onboarding_landing(p_access_code text)
returns table (
  client_name text,
  payment_modality text,
  has_quote boolean,
  quote_created_at timestamptz,
  mode text,
  package_name text,
  package_quoted_price numeric,
  adn_tier_name text,
  line_items jsonb,
  subtotal numeric,
  total numeric,
  platform_plan_name text,
  platform_plan_price numeric,
  platform_consumo_name text,
  platform_consumo_price numeric,
  platform_whatsapp_price numeric,
  platform_total_monthly_usd numeric,
  stripe_payment_link text,
  platform_payment_link text,
  bank_titular text,
  bank_nombre text,
  bank_clabe text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_access_code, '')));
  v_client record;
  v_quote record;
  v_has_quote boolean;
begin
  if v_code = '' then
    return;
  end if;

  select c.id, c.name, c.opportunity_id, c.payment_modality
  into v_client
  from clients c
  where c.onboarding_enabled is true
    and c.status <> 'cancelled'
    and upper(c.onboarding_access_code) = v_code;

  if not found then
    return;
  end if;

  select q.* into v_quote
  from quotes q
  where q.opportunity_id = v_client.opportunity_id
  order by q.created_at desc
  limit 1;

  v_has_quote := found;

  return query
  select
    v_client.name,
    v_client.payment_modality,
    v_has_quote,
    case when v_has_quote then v_quote.created_at else null end,
    case when v_has_quote then v_quote.mode else null end,
    case when v_has_quote then (select ci.name from catalog_items ci where ci.item_id = v_quote.package_id) else null end,
    case when v_has_quote then v_quote.package_quoted_price else null end,
    case when v_has_quote then (select ci.name from catalog_items ci where ci.item_id = v_quote.package_adn_tier_id) else null end,
    case when v_has_quote then (
      select coalesce(jsonb_agg(jsonb_build_object(
               'item_type', qli.item_type,
               'item_name', qli.item_name,
               'quoted_price', qli.quoted_price
             ) order by qli.item_type, qli.item_name), '[]'::jsonb)
      from quote_line_items qli
      where qli.quote_id = v_quote.id
    ) else '[]'::jsonb end,
    case when v_has_quote then v_quote.subtotal else null end,
    case when v_has_quote then v_quote.total else null end,
    case when v_has_quote then (select ci.name from catalog_items ci where ci.item_id = v_quote.platform_plan_id) else null end,
    case when v_has_quote then v_quote.platform_plan_price else null end,
    case when v_has_quote then (select ci.name from catalog_items ci where ci.item_id = v_quote.platform_consumo_id) else null end,
    case when v_has_quote then v_quote.platform_consumo_price else null end,
    case when v_has_quote then v_quote.platform_whatsapp_price else null end,
    case when v_has_quote then
      v_quote.platform_plan_price + v_quote.platform_consumo_price + coalesce(v_quote.platform_whatsapp_price, 0)
    else null end,
    case when v_has_quote and v_quote.mode = 'pkg' and v_client.payment_modality is not null then
      (select a.value from app_settings a where a.key = 'stripe_link.' || v_client.payment_modality || '.' || v_quote.package_id)
    else null end,
    (select a.value from app_settings a where a.key = 'platform_link'),
    (select a.value from app_settings a where a.key = 'bank_titular'),
    (select a.value from app_settings a where a.key = 'bank_nombre'),
    (select a.value from app_settings a where a.key = 'bank_clabe');
end;
$$;

revoke all on function get_onboarding_landing(text) from public;
grant execute on function get_onboarding_landing(text) to anon, authenticated;

-- ---------------------------------------------------------------
-- ---------- verificación post-migración ----------
-- ---------------------------------------------------------------
do $$
declare
  v_vital_code text;
  v_row record;
  v_junk record;
begin
  -- ---------- trigger: platform_link rechaza lo que no es un Payment Link real ----------
  begin
    update app_settings set value = 'https://ejemplo-que-no-es-stripe.com/x' where key = 'platform_link';
    raise exception 'FALLO DE PRUEBA: el trigger dejó guardar un platform_link que no es un dominio de Stripe.';
  exception
    when others then
      if sqlerrm not like 'El valor de platform_link debe ser un Payment Link de Stripe%' then
        raise;
      end if;
  end;

  begin
    update app_settings set value = 'https://buy.stripe.com/test_abc123' where key = 'platform_link';
    raise exception 'FALLO DE PRUEBA: el trigger dejó guardar un platform_link de modo PRUEBA.';
  exception
    when others then
      if sqlerrm not like 'Es un link de PRUEBA de Stripe%' then
        raise;
      end if;
  end;

  -- Confirma que sigue en null después de los dos intentos rechazados.
  if (select value from app_settings where key = 'platform_link') is not null then
    raise exception 'FALLO DE PRUEBA: platform_link no debería tener valor todavía — algún intento rechazado sí escribió.';
  end if;

  -- ---------- get_onboarding_landing(): código inválido -> cero filas ----------
  select * into v_junk from get_onboarding_landing('CODIGO-QUE-NO-EXISTE-1234') limit 1;
  if found then
    raise exception 'FALLO DE PRUEBA: get_onboarding_landing() devolvió una fila para un código que no existe.';
  end if;

  -- ---------- get_onboarding_landing(): código real de Vital Titanium ----------
  -- Vital Titanium hoy: onboarding_enabled = true, 0 cotizaciones
  -- (confirmado en vivo antes de escribir esto) — es el caso real que
  -- prueba la degradación de has_quote = false sin inventar datos.
  select onboarding_access_code into v_vital_code from clients where name = 'Vital Titanium';

  if v_vital_code is null then
    raise exception 'No se encontró onboarding_access_code para Vital Titanium — no se puede correr la prueba con datos reales.';
  end if;

  select * into v_row from get_onboarding_landing(v_vital_code) limit 1;

  if not found then
    raise exception 'FALLO DE PRUEBA: get_onboarding_landing() no devolvió nada para el código real de Vital Titanium.';
  end if;

  if v_row.client_name <> 'Vital Titanium' then
    raise exception 'FALLO DE PRUEBA: client_name esperado "Vital Titanium", llegó %.', v_row.client_name;
  end if;

  if v_row.has_quote <> false then
    raise exception 'FALLO DE PRUEBA: Vital Titanium no tiene cotizaciones hoy, has_quote debería ser false, llegó %.', v_row.has_quote;
  end if;

  if v_row.line_items <> '[]'::jsonb then
    raise exception 'FALLO DE PRUEBA: sin cotización, line_items debería ser un arreglo vacío, llegó %.', v_row.line_items;
  end if;

  if v_row.bank_titular is null or v_row.bank_clabe is null then
    raise exception 'FALLO DE PRUEBA: los datos bancarios deberían salir aunque no haya cotización.';
  end if;

  if v_row.stripe_payment_link is not null then
    raise exception 'FALLO DE PRUEBA: sin cotización no debería resolverse ningún link de Stripe por modalidad, llegó %.', v_row.stripe_payment_link;
  end if;
end $$;
