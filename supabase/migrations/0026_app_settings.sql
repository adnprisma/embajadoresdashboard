-- ---------------------------------------------------------------
-- app_settings: configuración clave-valor editable sin deploy — datos
-- bancarios (transferencia) y links de pago de Stripe para la nueva
-- pantalla /datos-de-pago. Genérica a propósito (no exclusiva de Stripe):
-- la próxima clave que necesite vivir aquí no debería requerir una tabla
-- nueva.
--
-- Lectura: cualquier sesión autenticada. Escritura: solo admin, vía RLS —
-- el cliente (la app desplegada) nunca podría escribir aquí aunque
-- quisiera, con o sin pantalla de admin. Edición real: directo en Supabase
-- (decisión explícita, no hay pantalla de admin para esto por ahora).
-- ---------------------------------------------------------------

create table app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table app_settings enable row level security;

create policy "app_settings_select_authenticated"
  on app_settings for select
  to authenticated
  using (true);

create policy "app_settings_write_admin"
  on app_settings for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------- validación de CLABE: dígito verificador real, no solo conteo ----------
-- Algoritmo: pesos 3,7,1 cíclicos sobre los primeros 17 dígitos, módulo 10
-- de cada producto, se suman, y el verificador es (10 - suma mod 10) mod 10
-- — debe coincidir con el dígito 18. Contar 18 dígitos no atrapa una CLABE
-- mal tecleada; esto sí, en la mayoría de los casos de un solo dígito
-- cambiado (que es justo el error humano más probable al copiar a mano) —
-- el costo de fallar esto es que un cliente transfiera a una cuenta ajena.
create function is_valid_clabe(p_clabe text)
returns boolean
language plpgsql
immutable
as $$
declare
  weights int[] := array[3, 7, 1];
  digits int[];
  i int;
  suma int := 0;
  verificador int;
begin
  if p_clabe is null or p_clabe !~ '^\d{18}$' then
    return false;
  end if;

  digits := array(select substring(p_clabe from n for 1)::int from generate_series(1, 18) as n);

  for i in 1..17 loop
    suma := suma + (digits[i] * weights[((i - 1) % 3) + 1]) % 10;
  end loop;

  verificador := (10 - (suma % 10)) % 10;

  return verificador = digits[18];
end;
$$;

-- ---------- validación por clave — trigger, no CHECK fijo ----------
-- La tabla es genérica: cada clave puede necesitar su propia regla, así
-- que la validación vive aquí, no en un CHECK de columna que aplicaría a
-- cualquier clave futura sin sentido.
create function validate_app_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Prefijo, no una lista de las 3 claves actuales: la clave real es
  -- 'stripe_link.' + el id de PACKAGES (src/config/appSettings.ts,
  -- calculada, nunca transcrita) — el trigger no necesita conocer los ids
  -- de paquete uno por uno, y no hay que tocarlo si algún día hay un
  -- cuarto paquete.
  if new.key like 'stripe_link.%' then
    if new.value is not null then
      -- Un Payment Link de modo PRUEBA (buy.stripe.com/test_...) pasa
      -- cualquier validación de dominio y abre una pantalla de pago que se
      -- ve real, pero el dinero nunca llega — el cliente cree que pagó.
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
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_validate_app_settings
  before insert or update on app_settings
  for each row
  execute function validate_app_settings();

-- ---------- seed: datos bancarios reales desde hoy, Stripe pendiente ----------
-- Las 3 filas stripe_link.* de abajo salen literal de
-- scripts/generate-app-settings-seed.ts (a partir de PACKAGES en
-- pricing.ts) — no se transcribieron a mano. Las bank_* sí, porque no
-- salen de ningún catálogo.
insert into app_settings (key, value) values
  ('bank_titular', 'Néstor Espinosa López'),
  ('bank_nombre', 'BBVA'),
  ('bank_clabe', '012180015807276354'),
  ('stripe_link.paquete-inicia', null),
  ('stripe_link.paquete-esencial', null),
  ('stripe_link.paquete-completo', null);

-- ---------- verificación post-seed: revienta si algo no cuadra ----------
-- Mismo criterio que el guardián de conteo de parse-prospect-analysis.mjs:
-- si el estado final no es el esperado, que truene con un mensaje claro, no
-- un "Success" que no dice nada. No transcribe las 3 claves de Stripe otra
-- vez — usa el mismo prefijo 'stripe_link.%' que ya valida el trigger de
-- arriba, así que no hay un cuarto lugar donde puedan desincronizarse.
do $$
declare
  v_total int;
  v_stripe int;
  v_bank int;
begin
  select count(*) into v_total from app_settings;
  select count(*) into v_stripe from app_settings where key like 'stripe_link.%';
  select count(*) into v_bank from app_settings where key in ('bank_titular', 'bank_nombre', 'bank_clabe');

  if v_total != 6 then
    raise exception 'Verificación post-seed falló: se esperaban 6 filas en app_settings, hay %.', v_total;
  end if;

  if v_stripe != 3 then
    raise exception 'Verificación post-seed falló: se esperaban 3 claves con prefijo stripe_link., hay %.', v_stripe;
  end if;

  if v_bank != 3 then
    raise exception 'Verificación post-seed falló: faltan datos bancarios (bank_titular/bank_nombre/bank_clabe) — hay % de 3.', v_bank;
  end if;
end $$;
