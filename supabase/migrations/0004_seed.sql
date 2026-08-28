-- ---------------------------------------------------------------
-- Prisma dashboard — seed de tablas de referencia
-- Ver context/ROADMAP.md §4.4.
--
-- `accent` (pipeline_stages) — CONFIRMADO en el bloque 9. Codifica el
-- DESENLACE de la etapa, no su identidad: la mayoría de las etapas van sin
-- color ('neutral' — ausencia de acento, igual que en Badge/StatCard). Un
-- acento de estado (pending/positive/negative) solo aparece donde hay algo
-- que señalar: dinero ganado, pérdida terminal, o una etapa que requiere
-- acción. Ver context/DESIGN_SYSTEM.md §2. `icon` usa nombres de lucide-react.
-- `is_lost` es mi interpretación: solo 'churn' y 'discarded' se tratan como
-- pérdida terminal; 'no_show' se deja fuera porque normalmente se reagenda.
--
-- `tone` (ranks, abajo) sigue siendo PROPUESTA sin confirmar — usa el
-- vocabulario anterior (incluye 'progress'), no lo toques como parte de
-- esta corrección.
-- ---------------------------------------------------------------

insert into pipeline_stages (id, name, icon, accent, position, is_won, is_lost) values
  ('new',       'Nuevas oportunidades', 'sparkles',       'neutral',  1, false, false),
  ('analysis',  'Análisis',             'search',         'neutral',  2, false, false),
  ('scheduled', 'Cita agendada',        'calendar',       'neutral',  3, false, false),
  ('show',      'Asistió',              'check-circle',   'neutral',  4, false, false),
  ('no_show',   'No asistió',           'x-circle',       'pending',  5, false, false),
  ('won',       'Cerrado',              'trophy',         'positive', 6, true,  false),
  ('churn',     'Baja',                 'trending-down',  'negative', 7, false, true),
  ('nurturing', 'En seguimiento',       'clock',          'pending',  8, false, false),
  ('discarded', 'Descartado',           'archive',        'negative', 9, false, true);

-- TODO: nombres y umbrales de puntos reales pendientes de que el humano los
-- defina (ver BRANDING.md — es tono de voz / regla de negocio, no de marca).
-- Los min_points son un placeholder ilustrativo, no una decisión de negocio.
insert into ranks (id, name, min_points, tone, position) values
  ('rango_1', 'Rango 1', 0,    'neutral',  1),
  ('rango_2', 'Rango 2', 500,  'progress', 2),
  ('rango_3', 'Rango 3', 1500, 'pending',  3),
  ('rango_4', 'Rango 4', 3000, 'positive', 4);

-- Contenido de ejemplo para poder construir /recursos (bloque 13). Los
-- `href` quedan vacíos a propósito: no hay enlaces reales todavía y no
-- corresponde inventarlos.
insert into resources (category_id, category_name, category_icon, position, title, subtitle, icon, badge_label, badge_tone, items, required_plan) values
  ('ventas', 'Ventas', 'trending-up', 1,
    'Guion de llamada de descubrimiento', 'Guía paso a paso para la primera llamada',
    'phone', 'Nuevo', 'info',
    '[{"title": "Guion en PDF", "href": "", "kind": "pdf", "locked": false}]'::jsonb,
    null),
  ('ventas', 'Ventas', 'trending-up', 2,
    'Catálogo de servicios', 'Ficha técnica para presentar a prospectos',
    'file-text', null, null,
    '[{"title": "Catálogo vigente", "href": "", "kind": "pdf", "locked": false}]'::jsonb,
    null),
  ('ventas', 'Ventas', 'trending-up', 3,
    'Plantillas de propuesta', 'Documentos editables para cotizar',
    'file-edit', 'Plan avanzado', 'warning',
    '[{"title": "Plantilla editable", "href": "", "kind": "doc", "locked": true}]'::jsonb,
    'advanced'),

  ('marketing', 'Marketing', 'megaphone', 1,
    'Kit de redes sociales', 'Piezas listas para publicar',
    'image', null, null,
    '[{"title": "Kit de plantillas", "href": "", "kind": "link", "locked": false}]'::jsonb,
    null),
  ('marketing', 'Marketing', 'megaphone', 2,
    'Banco de imágenes', 'Fotografía autorizada para campañas',
    'images', null, null,
    '[{"title": "Carpeta compartida", "href": "", "kind": "link", "locked": false}]'::jsonb,
    null),

  ('legal', 'Legal y facturación', 'shield', 1,
    'Términos y condiciones', 'Versión vigente para compartir con clientes',
    'file-text', null, null,
    '[{"title": "PDF vigente", "href": "", "kind": "pdf", "locked": false}]'::jsonb,
    null),
  ('legal', 'Legal y facturación', 'shield', 2,
    'Guía de facturación', 'Cómo emitir tu factura mensual',
    'receipt', null, null,
    '[{"title": "Guía paso a paso", "href": "", "kind": "pdf", "locked": false}]'::jsonb,
    null);
