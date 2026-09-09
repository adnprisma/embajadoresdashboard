-- ---------------------------------------------------------------
-- onboarding_access_code deja de escribirse a mano. Hasta hoy era texto
-- libre (supabase-onboarding-access.sql, aplicado a mano en
-- prisma-comercial antes de que existiera este repo de migraciones — ver
-- CONTRATO_BASE_COMPARTIDA.md) sin default ni generador: cada código valía
-- lo que la persona que lo escribió ese día decidiera. El único código real
-- en producción hoy, 'ADN-PRISMA-DEMO', sigue el patrón NOMBRE-PRISMA-NNN
-- de la migración original — adivinable si alguien conoce (o supone) el
-- nombre del cliente, porque lo único random ahí sería un sufijo de 3
-- dígitos.
--
-- generate_onboarding_code() reemplaza eso con un código aleatorio de
-- verdad, y se usa en dos momentos:
--   1. Default de la columna — cualquier alta nueva de cliente lo trae
--      bien sin que nadie tenga que acordarse de generarlo.
--   2. Rotación explícita — si un código se filtra, se llama otra vez a
--      mano: `update clients set onboarding_access_code =
--      generate_onboarding_code() where id = ...`. Es la misma función en
--      los dos casos: nunca hay dos implementaciones del alfabeto/longitud
--      que puedan desincronizarse entre sí.
--
-- ---------- ESPECIFICACIÓN ----------
-- Alfabeto: 31 caracteres, mayúsculas A-Z sin I/L/O y dígitos 2-9 sin 0/1
-- — todos los que se prestan a confundirse al leer o dictar el código
-- ('ABCDEFGHJKMNPQRSTUVWXYZ23456789'). Quitar esos 5 caracteres cuesta casi
-- nada de entropía (32 símbolos "completos" -> 31) a cambio de que un
-- cliente que transcribe el código a mano no se trabe en si esa letra era
-- una I o una L.
--
-- Longitud: 10 caracteres, formateados en dos grupos de 5 (XXXXX-XXXXX)
-- para lectura. 31^10 ≈ 8.2×10^14 combinaciones — a 1,000 solicitudes por
-- segundo (una tasa ya agresiva para un formulario público) tomaría del
-- orden de 26,000 años recorrerlas todas. Deliberadamente muy por encima de
-- lo mínimo necesario: hoy no hay límite de intentos (ver
-- CONTRATO_BASE_COMPARTIDA.md / revisión de seguridad del 8 de septiembre
-- de 2026), así que toda la defensa contra fuerza bruta descansa en este
-- número — no queremos que dependa de que nadie note un patrón después.
--
-- Aleatoriedad: gen_random_uuid(), NO pgcrypto. Desde Postgres 13 vive en
-- el core (no requiere la extensión, no vive en el esquema `extensions`) y
-- usa el generador criptográfico del sistema operativo — evita repetir el
-- problema de 0032_catalog_items_fingerprint.sql (digest() de pgcrypto no
-- visible con search_path=public). Cada UUID da 16 bytes; se consumen uno
-- por uno, con muestreo por rechazo (se descarta cualquier byte >= 248 —
-- 248 = floor(256/31)*31, el múltiplo de 31 más grande que cabe en un
-- byte) para que los 31 símbolos queden con probabilidad exactamente
-- pareja, sin el sesgo de un `% 31` ingenuo sobre 256 valores. Si un buffer
-- de 16 bytes no alcanza para completar los 10 caracteres (pasa si se
-- rechazan varios), se pide otro gen_random_uuid() — un solo UUID ya trae
-- de sobra en el caso normal.
--
-- No es security definer: no lee ni escribe ninguna tabla, así que no hay
-- nada que bypassear. search_path fijo igual, por higiene — no depende de
-- resolver ningún objeto fuera de lo calificado aquí.
-- ---------------------------------------------------------------

create or replace function generate_onboarding_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_alphabet_len constant int := 31;
  v_reject_above constant int := 248;
  v_code_len constant int := 10;
  v_buffer bytea;
  v_buffer_pos int;
  v_byte int;
  v_chars text := '';
begin
  while length(v_chars) < v_code_len loop
    v_buffer := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_buffer_pos := 0;
    while v_buffer_pos < 16 and length(v_chars) < v_code_len loop
      v_byte := get_byte(v_buffer, v_buffer_pos);
      v_buffer_pos := v_buffer_pos + 1;
      if v_byte < v_reject_above then
        v_chars := v_chars || substr(v_alphabet, (v_byte % v_alphabet_len) + 1, 1);
      end if;
    end loop;
  end loop;

  return substr(v_chars, 1, 5) || '-' || substr(v_chars, 6, 5);
end;
$$;

revoke all on function generate_onboarding_code() from public;
grant execute on function generate_onboarding_code() to authenticated;

alter table clients alter column onboarding_access_code set default generate_onboarding_code();

-- El único código real hoy sigue el patrón viejo (adivinable) — se
-- regenera aquí mismo. No es una llamada de ventas en vivo la que lo dicta
-- (confirmado), así que no hay excepción que documentar: se rota igual que
-- cualquier otro.
update clients
set onboarding_access_code = generate_onboarding_code()
where id = '88456d98-d7ec-43cd-b9b4-70472e16fe5e';

-- ---------- verificación post-migración ----------
do $$
declare
  v_code_1 text;
  v_code_2 text;
  v_demo_code text;
begin
  select generate_onboarding_code() into v_code_1;
  select generate_onboarding_code() into v_code_2;

  if v_code_1 !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$' then
    raise exception 'generate_onboarding_code() devolvió un formato inesperado: %', v_code_1;
  end if;

  if v_code_1 = v_code_2 then
    raise exception 'Dos llamadas seguidas a generate_onboarding_code() devolvieron el mismo código (%): la aleatoriedad no está funcionando.', v_code_1;
  end if;

  select onboarding_access_code into v_demo_code
  from clients where id = '88456d98-d7ec-43cd-b9b4-70472e16fe5e';

  if v_demo_code = 'ADN-PRISMA-DEMO' then
    raise exception 'El código de ADN Prisma no se regeneró — sigue en el patrón viejo.';
  end if;

  if v_demo_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$' then
    raise exception 'El código regenerado de ADN Prisma no tiene el formato esperado: %', v_demo_code;
  end if;
end $$;
