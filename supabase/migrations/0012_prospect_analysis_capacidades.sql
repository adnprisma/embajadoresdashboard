-- ---------------------------------------------------------------
-- Amplía prospect_analysis con las 7 capacidades booleanas de la tabla
-- comparativa de prospección (has_web..has_redes) + email + web_note.
--
-- Los booleanos son NULLABLE a propósito: además de presente (true) /
-- ausente (false), la fuente distingue un tercer estado real —
-- "presencia parcial" (ej. sitio en subdominio gratuito de Wix, sin
-- dominio propio) — que no es ni una cosa ni la otra. null lo representa
-- sin forzar una lectura falsa en ningún sentido.
--
-- opportunities text[] (de 0008) se elimina: nunca se llenó, y la decisión
-- de producto fue no guardar "lo que Digital Owner System le da" por
-- prospecto — es la misma plantilla en los 104 registros, no dato del
-- prospecto. La propuesta de Prisma vive en src/config/oferta.ts,
-- mapeada por carencia, y la ficha arma las oportunidades cruzando ese
-- mapa con `gaps` en vez de leer una columna.
-- ---------------------------------------------------------------

alter table prospect_analysis
  add column has_web boolean,
  add column has_whatsapp boolean,
  add column has_reservas boolean,
  add column has_crm boolean,
  add column has_chat boolean,
  add column has_blog boolean,
  add column has_redes boolean,
  add column email text,
  add column web_note text;

alter table prospect_analysis drop column opportunities;
