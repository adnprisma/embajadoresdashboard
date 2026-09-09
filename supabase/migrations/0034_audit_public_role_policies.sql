-- ---------------------------------------------------------------
-- Candado que catalog_items no tenía: confirma que ninguna tabla de
-- `public` quedó abierta a anon, en vez de descubrirlo por accidente (curl
-- directo) como pasó el 8 de septiembre de 2026 — ver
-- CONTRATO_BASE_COMPARTIDA.md, sección 3.
--
-- Cubre DOS formas de exposición, no una:
--   1. Una política PERMISSIVE con rol `public` en su lista de roles — el
--      caso real de catalog_items.
--   2. Una tabla de `public` con RLS sin activar (`relrowsecurity = false`)
--      — más grave, y CIEGO para cualquier chequeo que solo mire
--      pg_policies: una tabla sin ninguna política no aparece ahí, así que
--      un chequeo que solo enumere políticas nunca la vería.
--
-- ---------- LA LISTA BLANCA VERIFICA LA PROPIEDAD, NO EL NOMBRE ----------
-- Existe una política legítima con rol `public` hoy:
-- `opportunities_no_delete_won` (0017_opportunity_delete_guard.sql,
-- RESTRICTIVE). Una política RESTRICTIVE en `public` es correcta a
-- propósito — restringe a CUALQUIER rol, incluido anon, que es justo lo
-- que se quiere de un candado (si `anon` alguna vez tuviera DELETE por
-- accidente, esta política lo alcanza igual; si estuviera en
-- `{authenticated}`, no lo alcanzaría).
--
-- La condición de exención NO es "el nombre está en la lista" — es "el
-- nombre está en la lista Y sigue siendo RESTRICTIVE ahora mismo". Si
-- alguien cambia `opportunities_no_delete_won` de RESTRICTIVE a
-- PERMISSIVE, el nombre no cambia, pero la condición deja de cumplirse y
-- la política cae como violación de todos modos — el chequeo re-verifica
-- la propiedad que la hace segura en cada corrida, no confía en que el
-- nombre siga significando lo mismo.
--
-- ---------- SOLO DEVUELVE UN CONTEO — A PROPÓSITO, NO A MEDIAS ----------
-- Primera versión de esta función daba detalle (tabla/política/motivo) a
-- un caller 'authenticated' vía auth.role(), y solo el conteo a cualquier
-- otro caso. Se quitó esa rama: era alcanzable solo en teoría. El SQL
-- Editor de Supabase no lleva JWT (BYPASSRLS, sin contexto de request),
-- así que ahí auth.role() también da null — ve el mismo conteo que anon.
-- El script que llama a esto (scripts/check-no-public-exposure.ts) corre
-- siempre sin sesión. Y no existe ninguna pantalla del dashboard que llame
-- esta RPC, ni la va a haber. Ningún caller real llega jamás por el camino
-- 'authenticated' — era una rama que solo concedía información por una
-- puerta que nadie usa, y una decisión de permisos (¿cualquier
-- authenticated, o solo admin?) que no hacía falta tomar.
--
-- El detalle real — cuál tabla, cuál política — se obtiene con las DOS
-- consultas directas contra pg_policies/pg_class que trae el mensaje de
-- [POLITICA] en check-no-public-exposure.ts, corridas a mano en el SQL
-- Editor (que ya tiene BYPASSRLS: no necesita esta función para nada).
-- Los nombres de tabla no son secretos, pero CUÁL está abierta AHORA
-- SÍ es explotable — por eso el conteo es lo único que sale de aquí, para
-- CUALQUIER caller, sin excepción. No le agregues de vuelta una rama que
-- dé detalle según el caller: ya se evaluó y el único camino por el que
-- alguien la vería de verdad es uno que un atacante también puede tomar.
--
-- ---------- LÍMITES DOCUMENTADOS, A PROPÓSITO ----------
-- - No revisa si el `qual` de una política `{authenticated}` es demasiado
--   permisivo (p. ej. "cualquier autenticado ve todo sin filtro de
--   owner_id") — eso es corrección semántica del filtro, no alcance de
--   rol, y es un problema distinto.
-- - No cubre vistas. Hoy no existe ninguna en `public` (verificado antes
--   de escribir esto) — si se agrega una sin `security_invoker`, este
--   candado no la ve.
-- - Asume que el único schema expuesto a PostgREST es `public` (el default
--   de Supabase) — no reescanea la configuración real del proyecto.
-- ---------------------------------------------------------------

create or replace function audit_public_role_policies()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and 'public' = any(p.roles)
      and not (p.permissive = 'RESTRICTIVE' and p.policyname = any(array['opportunities_no_delete_won']))
    union all
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ) violations;
$$;

revoke all on function audit_public_role_policies() from public;
grant execute on function audit_public_role_policies() to anon, authenticated;

-- ---------- verificación post-migración: dos pruebas positivas de que SÍ
-- detecta, una de que NO marca en falso lo que está bien ----------
do $$
declare
  v_baseline bigint;
  v_after_permissive bigint;
  v_after_no_rls bigint;
  v_final bigint;
begin
  select audit_public_role_policies() into v_baseline;

  if v_baseline <> 0 then
    raise exception 'Estado base inesperado: % violación(es) antes de cualquier prueba — no se puede validar el candado sobre un esquema que ya no está limpio.', v_baseline;
  end if;

  -- Prueba 1: tabla con política PERMISSIVE a public — el caso real de
  -- catalog_items.
  execute 'create table _audit_test_permissive (id int primary key)';
  execute 'alter table _audit_test_permissive enable row level security';
  execute 'create policy _audit_test_permissive_select on _audit_test_permissive for select to public using (true)';

  select audit_public_role_policies() into v_after_permissive;
  if v_after_permissive <> v_baseline + 1 then
    execute 'drop table _audit_test_permissive';
    raise exception 'El candado NO detectó una política PERMISSIVE con rol public: esperaba % violación(es), encontró %.', v_baseline + 1, v_after_permissive;
  end if;
  execute 'drop table _audit_test_permissive';

  -- Prueba 2: tabla sin RLS activado en absoluto — el caso ciego para
  -- cualquier chequeo que solo mire pg_policies, así que es el que más
  -- importa comprobar.
  execute 'create table _audit_test_no_rls (id int primary key)';

  select audit_public_role_policies() into v_after_no_rls;
  if v_after_no_rls <> v_baseline + 1 then
    execute 'drop table _audit_test_no_rls';
    raise exception 'El candado NO detectó una tabla sin RLS activado: esperaba % violación(es), encontró %.', v_baseline + 1, v_after_no_rls;
  end if;
  execute 'drop table _audit_test_no_rls';

  -- Prueba 3: con las dos tablas de prueba ya fuera, opportunities_no_delete_won
  -- sigue existiendo en su estado real (RESTRICTIVE) — el conteo debe
  -- volver exactamente al baseline. Si no vuelve, esa política se está
  -- marcando como violación estando bien.
  select audit_public_role_policies() into v_final;
  if v_final <> v_baseline then
    raise exception 'Después de limpiar las pruebas, el candado reporta % violación(es) en vez de volver a % — revisa si opportunities_no_delete_won se está marcando como violación.', v_final, v_baseline;
  end if;
end $$;
