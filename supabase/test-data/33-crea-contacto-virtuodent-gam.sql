-- ---------------------------------------------------------------
-- Alta de "Virtuodent Boutique Dental" (Gustavo A. Madero) — mismo patrón
-- que "Veterinaria Molinos" (30-crea-contacto-veterinaria-molinos.sql):
-- el negocio existe en los 16 HTML de análisis del lote de dentistas del 7
-- de septiembre de 2026 pero NUNCA existió en ninguno de los dos CSV que
-- alimentaron 32-importa-dentistas-cdmx-7sep.sql.
--
-- "Virtuodent Boutique Dental" aparece DOS veces en los HTML — una en
-- Cuauhtémoc (Av. Insurgentes Sur 179, Roma Norte, ya cargada) y otra en
-- Gustavo A. Madero (Av. Montevideo 368, Lindavista, la que falta). Mismo
-- nombre de marca, dos sucursales reales con direcciones distintas — no es
-- un duplicado de la que ya existe.
--
-- Sin teléfono en el HTML ("Teléfono: " vacío) — sigue la convención del
-- grupo "sin nada" del lote (tag alcaldía + visitar, en reserva del
-- admin), no la de Molinos (que sí tenía teléfono y fue directo a una
-- vendedora).
-- ---------------------------------------------------------------

select import_contacts(
  '[{
    "business_name": "Virtuodent Boutique Dental",
    "industry": "Dentista",
    "tags": ["gustavoamadero", "visitar"]
  }]'::jsonb,
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f',
  'Alta manual: omisión detectada en carga de dentistas 7 sep 2026 (ver 34-load-prospect-analysis-dentistas-sep2026.sql)',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f',
  null
);

-- Verificación — debe regresar exactamente 1 fila, en reserva, sin teléfono.
select id, business_name, phone, tags, in_reserve, owner_id
from contacts
where business_name = 'Virtuodent Boutique Dental'
  and 'gustavoamadero' = any(tags);
