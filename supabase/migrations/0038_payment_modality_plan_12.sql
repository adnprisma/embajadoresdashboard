-- ---------------------------------------------------------------
-- Agrega la cuarta modalidad de pago (plan-12) a payment_modality y a los
-- links de Stripe — de 9 a 12 llaves en app_settings. Reporte previo
-- completo en la conversación del 13 de septiembre de 2026: confirmó que
-- STRIPE_LINK_KEYS (src/config/appSettings.ts) se calcula solo al agregar
-- "plan-12" al array PAYMENT_MODALITIES, que validate_app_settings() no
-- necesita tocarse para esto (valida por prefijo 'stripe_link.%', no por
-- lista de modalidades), y que get_onboarding_landing() resuelve el link
-- por concatenación genérica de string — ninguna de las dos funciones
-- necesita cambiar para soportar la modalidad nueva en sí.
--
-- meses_diferimiento (quotes) NO es lo mismo que payment_modality y no se
-- toca aquí — son ejes independientes que comparten números por
-- coincidencia (3, 6), no por relación. Ver el comentario en
-- src/config/appSettings.ts y en src/lib/quoteMath.ts.
--
-- ---------- constraint de clients.payment_modality: nombre confirmado en vivo, no por convención ----------
-- El constraint se creó sin nombre explícito en 0036_onboarding_landing.sql
-- ("check (payment_modality in (...))" dentro de un ALTER COLUMN ADD),
-- así que Postgres le puso el nombre que le tocara — probablemente
-- clients_payment_modality_check por la convención de nombres por
-- default, pero esta migración no confía en esa convención: lo busca por
-- contenido real (pg_get_constraintdef) antes de tocar nada, y truena con
-- un mensaje claro si no lo encuentra, en vez de fallar con un error
-- opaco de Postgres sobre un nombre que no existe. De aquí en adelante
-- queda con nombre explícito (clients_payment_modality_check) para que
-- esta ambigüedad no se repita la próxima vez que se agregue una
-- modalidad.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'clients'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%payment_modality%';

  if v_conname is null then
    raise exception 'No se encontró ningún check constraint sobre payment_modality en clients — revisar a mano antes de continuar, esta migración no debe adivinar.';
  end if;

  execute format('alter table clients drop constraint %I', v_conname);
end $$;

alter table clients add constraint clients_payment_modality_check
  check (payment_modality in ('contado', 'plan-3', 'plan-6', 'plan-12'));

-- ---------- 3 links nuevos, en null hasta que se verifiquen a mano ----------
-- Mismo procedimiento obligatorio que los 9 anteriores (0027): abrir el
-- link real de Stripe y confirmar paquete/monto/periodicidad ANTES de
-- guardarlo — no hay atajo automático contra la API de Stripe, por las
-- mismas razones que ya documenta 0027.
insert into app_settings (key, value) values
  ('stripe_link.plan-12.paquete-inicia', null),
  ('stripe_link.plan-12.paquete-esencial', null),
  ('stripe_link.plan-12.paquete-completo', null);

-- ---------- cierra el hueco de platform_link sin validar ----------
-- Encontrado al cargar el primer link real de plataforma (13 de
-- septiembre de 2026): validate_app_settings() no tenía ninguna rama para
-- 'platform_link' — el valor se guardaba tal cual, sin verificar que
-- fuera siquiera una URL. En una llave que decide a quién se le acredita
-- una comisión de referido (ver ESTADO_ACTUAL.md), eso es demasiado
-- suelto. Regla mínima a propósito, nada más: debe empezar con https:// y
-- no estar vacío — no se valida el dominio ni la forma del query string
-- porque todavía no se sabe qué forma tendrá el link del segundo dueño de
-- referido (David).
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
  elsif new.key = 'platform_link' then
    if new.value is not null and (new.value = '' or new.value !~ '^https://') then
      raise exception 'platform_link debe empezar con https:// y no estar vacío.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------- verificación post-migración ----------
do $$
declare
  v_stripe_total int;
  v_plan12 int;
  v_conname text;
begin
  select count(*) into v_stripe_total from app_settings where key like 'stripe_link.%';
  select count(*) into v_plan12 from app_settings where key like 'stripe_link.plan-12.%';

  if v_stripe_total != 12 then
    raise exception 'Verificación post-migración falló: se esperaban 12 llaves stripe_link.%%, hay %.', v_stripe_total;
  end if;

  if v_plan12 != 3 then
    raise exception 'Verificación post-migración falló: se esperaban 3 llaves stripe_link.plan-12.%%, hay %.', v_plan12;
  end if;

  select conname into v_conname
  from pg_constraint
  where conrelid = 'clients'::regclass and contype = 'c' and conname = 'clients_payment_modality_check';

  if v_conname is null then
    raise exception 'Verificación post-migración falló: clients_payment_modality_check no quedó con ese nombre.';
  end if;
end $$;
