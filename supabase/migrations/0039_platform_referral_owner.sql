-- ---------------------------------------------------------------
-- El link de plataforma es de referido: la comisión de esa contratación
-- se acredita a quien sea dueño del link que el cliente use para darse de
-- alta (ver ESTADO_ACTUAL.md, decisión del 13 de septiembre de 2026).
-- Hasta hoy solo existía un link real (el del dueño del negocio, guardado
-- en app_settings.platform_link) — ahora existe el segundo (David), así
-- que la elección deja de ser implícita ("el único que hay") y pasa a ser
-- explícita, por cliente, decidida por un admin.
--
-- ---------- clients.platform_referral_owner ----------
-- Mismo patrón que payment_modality: nullable, sin default, la fija un
-- admin a mano. Null = "sin elegir todavía" = la landing muestra
-- "por confirmarse", NUNCA cae a ninguno de los dos links por default —
-- eso decidiría a quién se le acredita una comisión sin que nadie lo haya
-- decidido de verdad.
--
-- DECISIÓN CONSCIENTE, con la consecuencia nombrada: el check de abajo usa
-- 'nestor'/'david' — nombres de personas reales dentro de una restricción
-- de esquema. Se acepta así por ahora porque hoy son exactamente dos
-- socios con link propio, y una lista corta y explícita dice más que un
-- texto libre sin validar. La consecuencia: el día que exista un tercer
-- dueño de referido, agregarlo EXIGE una migración (ampliar este check),
-- no es un dato que se pueda cargar solo. Si el número de dueños empieza a
-- moverse con frecuencia, esto se reconsidera — hoy no se espera que pase.
alter table clients add column platform_referral_owner text
  check (platform_referral_owner in ('nestor', 'david'));

-- Cliente existente, explícito — mismo criterio que 0033 regenerando el
-- código del cliente demo en la misma migración que cambiaba la regla.
-- Vital Titanium ya usaba el link de Nestor (era el único que existía);
-- esto lo hace explícito, no lo cambia.
update clients set platform_referral_owner = 'nestor'
  where id = '52d24635-8e80-47ae-994f-29aa52bd26af';

-- ---------- app_settings: platform_link -> platform_link.<owner> ----------
-- Mismo movimiento que 0027 hizo con stripe_link.<packageId> ->
-- stripe_link.<modalidad>.<packageId>: renombrar la llave existente
-- (conserva el valor de Nestor, ya cargado y verificado en vivo), nunca
-- dejar la llave vieja viva junto a las nuevas.
update app_settings set key = 'platform_link.nestor' where key = 'platform_link';

insert into app_settings (key, value) values
  ('platform_link.david', null);

-- ---------- validate_app_settings(): igualdad exacta -> prefijo ----------
-- La rama que 0038 agregó validaba 'platform_link' por IGUALDAD exacta —
-- en cuanto la llave se divide en platform_link.nestor/platform_link.david,
-- esa condición deja de activarse para cualquiera de las dos y la
-- validación se apaga en silencio. Se cambia a prefijo, mismo criterio que
-- ya usa 'stripe_link.%': un tercer dueño de referido en el futuro tampoco
-- exigiría tocar este trigger.
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
  elsif new.key = 'bank_clabe' then
    if new.value is not null and not is_valid_clabe(new.value) then
      raise exception 'bank_clabe no es una CLABE válida (18 dígitos con dígito verificador correcto).';
    end if;
  elsif new.key like 'platform_link.%' then
    if new.value is not null and (new.value = '' or new.value !~ '^https://') then
      raise exception '% debe empezar con https:// y no estar vacío.', new.key;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------- get_onboarding_landing(): resuelve platform_payment_link por dueño ----------
-- Antes: (select value from app_settings where key = 'platform_link'),
-- incondicional. Ahora, mismo patrón que stripe_payment_link (condicionado
-- a payment_modality): solo resuelve si platform_referral_owner no es
-- null. Firma y forma de retorno sin cambios — create or replace basta.
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

  select c.id, c.name, c.opportunity_id, c.payment_modality, c.platform_referral_owner
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
    case when v_client.platform_referral_owner is not null then
      (select a.value from app_settings a where a.key = 'platform_link.' || v_client.platform_referral_owner)
    else null end,
    (select a.value from app_settings a where a.key = 'bank_titular'),
    (select a.value from app_settings a where a.key = 'bank_nombre'),
    (select a.value from app_settings a where a.key = 'bank_clabe');
end;
$$;

revoke all on function get_onboarding_landing(text) from public;
grant execute on function get_onboarding_landing(text) to anon, authenticated;

-- ---------- verificación post-migración ----------
do $$
declare
  v_owner text;
  v_old_key_count int;
  v_new_keys_count int;
begin
  select platform_referral_owner into v_owner
  from clients where id = '52d24635-8e80-47ae-994f-29aa52bd26af';

  if v_owner is distinct from 'nestor' then
    raise exception 'Verificación post-migración falló: Vital Titanium no quedó con platform_referral_owner = nestor (tiene %).', v_owner;
  end if;

  select count(*) into v_old_key_count from app_settings where key = 'platform_link';
  if v_old_key_count != 0 then
    raise exception 'Verificación post-migración falló: la llave vieja platform_link sigue existiendo.';
  end if;

  select count(*) into v_new_keys_count from app_settings where key like 'platform_link.%';
  if v_new_keys_count != 2 then
    raise exception 'Verificación post-migración falló: se esperaban 2 llaves platform_link.%%, hay %.', v_new_keys_count;
  end if;
end $$;
