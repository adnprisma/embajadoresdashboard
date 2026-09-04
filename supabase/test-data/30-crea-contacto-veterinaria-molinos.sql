-- ---------------------------------------------------------------
-- Alta de "Veterinaria Molinos" (Magdalena Contreras) — omisión aislada
-- del lote-sep-2026: el negocio existe en los 16 HTML de análisis (342
-- fichas) pero NUNCA existió en el CSV que alimentó el import original
-- (23-importa-veterinarias-cdmx-2sep.sql, 341 filas) — confirmado por el
-- usuario cruzando los 16 HTML contra el CSV completo, único caso en las
-- 10 alcaldías. No es un nombre distinto (ya se descartó: no es el mismo
-- negocio que "Consultorio Veterinario Molinos", que es de Valeria pero
-- de Álvaro Obregón, otro contacto real).
--
-- Vía import_contacts() (misma RPC del import original), no un INSERT
-- directo — mismo camino que siguió el resto del lote. p_in_reserve=false
-- explícito: va directo a Valeria, no a la reserva de admin (Magdalena
-- Contreras es su bloque, Fase C).
-- ---------------------------------------------------------------

select import_contacts(
  '[{
    "business_name": "Veterinaria Molinos",
    "phone": "+52 55 5660 0747",
    "industry": "Veterinaria",
    "tags": ["magdalenacontreras", "lote-sep-2026"]
  }]'::jsonb,
  '1ee0df7c-188d-426e-9f25-25352abf8c34',
  'Alta manual: omisión detectada en carga lote-sep-2026 (ver 27/29-load-prospect-analysis-*.sql)',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f',
  false
);

-- Verificación — debe regresar exactamente 1 fila, con la dirección
-- pendiente de completar vía prospect_analysis (ver 31-*.sql).
select id, business_name, phone, industry, array_to_string(tags,',') as tags,
  owner_id, in_reserve, status
from contacts
where business_name = 'Veterinaria Molinos';
