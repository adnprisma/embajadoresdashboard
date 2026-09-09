-- ---------------------------------------------------------------
-- Alta de Vital Titanium como cliente, enlazado a la oportunidad que quedó
-- ganada por el kanban (ca41dd90-0b46-4b90-a67e-8dcd69a5ee31, $27,000,
-- closed_at fijado por update_opportunity_stage()) después de resolver el
-- duplicado e1d43809 (ver conversación — se sacó de "Cerrado", se borró, y
-- ca41dd90 se ganó de nuevo por la ruta real).
--
-- Es el primer cliente real que se da de alta desde que existe
-- generate_onboarding_code() (0033_onboarding_code_generator.sql) — el
-- código sale del default, nadie lo escribe a mano.
--
-- Paquete: $27,000 se confirmó contra catalog_items (no se asumió por el
-- monto) — coincide exactamente con item_id='paquete-esencial',
-- item_type='paquete'. Es el único paquete a ese precio (inicia=15000,
-- completo=45000), así que no hay ambigüedad.
--
-- Columnas que se dejan a su default, a propósito:
--   - onboarding_access_code: se omite del insert para que dispare
--     generate_onboarding_code() — pasarle NULL explícito lo habría dejado
--     en NULL en vez de generarlo.
--   - onboarding_enabled: se deja en su default (false). Activar el acceso
--     es un paso aparte y consciente — mismo criterio que ya se decidió
--     para la caducidad del código (ver CLAUDE.md): no se prende hasta que
--     el código ya se le mandó al cliente.
--   - started_at: se deja en CURRENT_DATE (hoy, que es cuando se ganó de
--     verdad).
--   - next_renewal: NULL explícito — venta de una sola exhibición, sin
--     plan de gestión mensual, no hay fecha de renovación que fijar.
-- ---------------------------------------------------------------

insert into clients (
  owner_id,           -- Gladys Strevel — dueña de la oportunidad ganada.
  opportunity_id,
  name,
  plan,               -- Nombre visible del paquete, no el item_id crudo —
                       -- mismo formato que el único precedente que existe
                       -- (ADN Prisma / "Demo"). Confirmado contra
                       -- catalog_items: 'paquete-esencial' = $27,000.00.
  mrr,                -- $0 explícito: sin plan de gestión mensual.
  status,             -- 'active' es el default, pero se deja explícito
                       -- aquí para que quede a la vista en el insert.
  next_renewal
)
values (
  '5ddc5080-240a-48ae-b0e6-71cbe1931c72',
  'ca41dd90-0b46-4b90-a67e-8dcd69a5ee31',
  'Vital Titanium',
  'Esencial',
  0,
  'active',
  null
);

-- ---------- verificación ----------
select
  id,
  name,
  plan,
  mrr,
  status,
  started_at,
  next_renewal,
  onboarding_access_code,
  onboarding_enabled,
  opportunity_id
from clients
where opportunity_id = 'ca41dd90-0b46-4b90-a67e-8dcd69a5ee31';
