-- ---------------------------------------------------------------
-- Cierra 5 políticas RLS que se crearon sin "to <rol>" explícito — Postgres
-- las dejó "to public" (cualquier rol conectado, incluido anon), no
-- restringidas a authenticated como debían estar. Encontrado en la
-- revisión de exposición del 8 de septiembre de 2026 (ver
-- CONTRATO_BASE_COMPARTIDA.md, sección 3).
--
-- catalog_items_select es el caso real: qual = true, sin ningún filtro de
-- auth.uid() — confirmado en vivo antes de esta migración (curl directo
-- contra /rest/v1/catalog_items con la anon key, sin sesión, devolvió el
-- catálogo completo de 42 conceptos). Nadie del sitio público la usa
-- (prisma-comercial tiene el pricing hardcodeado en su propio JS, ver la
-- revisión de exposición) — cerrarla no le quita nada a nadie que hoy la
-- necesite.
--
-- Las otras 4 (quotes, quote_line_items, seller_prices,
-- seller_price_changes) funcionan hoy "por accidente, no por diseño": su
-- qual ya exige owner_id/seller_id = auth.uid() (o is_admin()), y
-- auth.uid() es siempre null para anon, así que la condición nunca es
-- verdadera en la práctica — pero el rol de la política nunca fue la
-- barrera real. El día que alguien reescriba esa condición sin pensar en
-- anon, la puerta se abre sola. Restringir el ROL es la barrera que no
-- depende de que nadie se acuerde de nada.
--
-- ALTER POLICY, no drop+create: conserva el nombre y el qual existentes,
-- solo cambia a quién aplica — ver postgres docs, ALTER POLICY soporta
-- cambiar la lista de roles sin tocar la condición.
-- ---------------------------------------------------------------

alter policy catalog_items_select on catalog_items to authenticated;
alter policy quotes_select on quotes to authenticated;
alter policy quote_line_items_select on quote_line_items to authenticated;
alter policy seller_prices_select on seller_prices to authenticated;
alter policy seller_price_changes_select on seller_price_changes to authenticated;

-- ---------- verificación post-migración ----------
-- Confirma que las 5 quedaron en {authenticated} exactamente, ni más
-- restringido ni más abierto de lo esperado.
do $$
declare
  v_bad text;
begin
  select string_agg(tablename || '.' || policyname || ' -> ' || roles::text, ', ')
  into v_bad
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'catalog_items_select', 'quotes_select', 'quote_line_items_select',
      'seller_prices_select', 'seller_price_changes_select'
    )
    and roles <> array['authenticated']::name[];

  if v_bad is not null then
    raise exception 'Verificación post-migración falló: % no quedó en {authenticated}.', v_bad;
  end if;
end $$;
