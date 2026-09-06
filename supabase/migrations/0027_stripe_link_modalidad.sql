-- ---------------------------------------------------------------
-- Amplía los links de pago de Stripe de 3 a 9: cada paquete pasa de tener
-- un solo link (pago de contado) a tener tres modalidades — contado,
-- plan a 3 meses, plan a 6 meses. Esquema de clave con la modalidad como
-- segmento propio: stripe_link.<modalidad>.<packageId>.
--
-- No se reedita 0026 — esa migración ya se aplicó en producción y su
-- contenido es el registro real de lo que corrió. Esto es una migración
-- nueva sobre datos que hoy están en null: no hay valor real que migrar,
-- solo texto de clave que renombrar.
--
-- El trigger de 0026 (valida por 'stripe_link.%') no cambia — ni aquí ni
-- en el código: agregar una modalidad nunca debe requerir tocar el
-- trigger, y este migration lo confirma en la práctica, no solo en teoría.
--
-- ---------- por qué NO hay verificación automática contra la API de Stripe ----------
-- Se evaluó y se descartó. La API de Stripe (GET /v1/payment_links) sí
-- expone si un link es de cobro único o recurrente (line_items[].price.type),
-- pero con tres modalidades el error más probable ya no es "suscripción
-- donde iba pago único" — es pegar el link de 6 meses en la ranura de 3
-- meses. Para Stripe, plan-3 y plan-6 son "recurring" idénticos: un script
-- que solo revisara el tipo de precio diría "correcto" en los dos casos,
-- dando confianza falsa justo donde está el riesgo real. Abrir el link sí
-- lo detecta, porque la pantalla de pago muestra monto y periodicidad.
-- No hay atajo automático que sirva aquí — la defensa es el procedimiento
-- de abajo, no una validación en la base.
--
-- ---------- procedimiento oficial antes de guardar cualquiera de los 9 ----------
-- Abrir el link en el navegador y confirmar TRES cosas antes de pegarlo en
-- Supabase:
--   1. El paquete (Inicia / Esencial / Completo) es el correcto.
--   2. El monto es el correcto.
--   3. Es cobro único, o mensual — y si es mensual, con cuántos cobros
--      (3 o 6). La pantalla de pago de Stripe muestra esto explícito.
-- Sin este paso, un link de plan a 6 meses pegado en la ranura de 3 meses
-- pasa el trigger sin problema (mismo dominio, mismo formato) y el cliente
-- termina con cobros mensuales de más — o de menos — sin que nadie lo note
-- hasta que reclama.
-- ---------------------------------------------------------------

-- ---------- renombre: los 3 links de contado ya existían sin el segmento de modalidad ----------
-- Generado a partir de PACKAGES (src/config/pricing.ts) vía stripeLinkKey(),
-- no transcrito a mano — ver scripts/generate-app-settings-seed.ts.
update app_settings set key = 'stripe_link.contado.paquete-inicia' where key = 'stripe_link.paquete-inicia';
update app_settings set key = 'stripe_link.contado.paquete-esencial' where key = 'stripe_link.paquete-esencial';
update app_settings set key = 'stripe_link.contado.paquete-completo' where key = 'stripe_link.paquete-completo';

-- ---------- 6 links nuevos: plan a 3 meses y plan a 6 meses, en null ----------
insert into app_settings (key, value) values
  ('stripe_link.plan-3.paquete-inicia', null),
  ('stripe_link.plan-3.paquete-esencial', null),
  ('stripe_link.plan-3.paquete-completo', null),
  ('stripe_link.plan-6.paquete-inicia', null),
  ('stripe_link.plan-6.paquete-esencial', null),
  ('stripe_link.plan-6.paquete-completo', null);

-- ---------- verificación post-seed: revienta si algo no cuadra ----------
-- Mismo criterio que 0026: 12 filas totales (3 de banco + 9 de Stripe), y
-- ninguna quedó con el esquema viejo de un solo segmento (sin modalidad).
do $$
declare
  v_total int;
  v_stripe int;
  v_bank int;
  v_legacy int;
begin
  select count(*) into v_total from app_settings;
  select count(*) into v_stripe from app_settings where key like 'stripe_link.%';
  select count(*) into v_bank from app_settings where key in ('bank_titular', 'bank_nombre', 'bank_clabe');
  select count(*) into v_legacy from app_settings where key like 'stripe_link.paquete-%';

  if v_total != 12 then
    raise exception 'Verificación post-seed falló: se esperaban 12 filas en app_settings, hay %.', v_total;
  end if;

  if v_stripe != 9 then
    raise exception 'Verificación post-seed falló: se esperaban 9 claves con prefijo stripe_link., hay %.', v_stripe;
  end if;

  if v_bank != 3 then
    raise exception 'Verificación post-seed falló: faltan datos bancarios (bank_titular/bank_nombre/bank_clabe) — hay % de 3.', v_bank;
  end if;

  if v_legacy != 0 then
    raise exception 'Verificación post-seed falló: quedaron % clave(s) con el esquema viejo sin modalidad (stripe_link.paquete-*) — el renombre no se completó.', v_legacy;
  end if;
end $$;
