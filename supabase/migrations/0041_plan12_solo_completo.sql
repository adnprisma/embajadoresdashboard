-- ---------------------------------------------------------------
-- Corrección de regla de negocio (14 de septiembre de 2026): plan-12
-- SOLO aplica al paquete Completo. Inicia y Esencial nunca tuvieron un
-- plan a 12 meses real — 0038 las agregó igual, por generar las 4
-- modalidades × 3 paquetes sin esta excepción. Quedan 10 links reales,
-- no 12.
--
-- Se BORRAN las dos filas, no se dejan en null. null en esta tabla
-- significa una sola cosa: "pendiente de cargar, va a tener valor algún
-- día". Estas dos combinaciones nunca van a tener valor — dejarlas en
-- null las mezclaría para siempre con los links que sí están
-- genuinamente pendientes. La ausencia de la fila es la señal correcta:
-- "esta combinación no existe", distinto de "existe y falta".
--
-- get_onboarding_landing() no necesita ningún cambio: ya resuelve
-- stripe_link.<modalidad>.<packageId> con un SELECT que regresa null si
-- la llave no existe — el mismo comportamiento que ya tiene hoy para
-- cualquier link pendiente. Si alguna vez payment_modality = 'plan-12'
-- terminara en un cliente sin paquete Completo (la UI ya no lo permite,
-- ver isModalityAvailableForPackage() en src/config/appSettings.ts), la
-- landing muestra "por confirmarse" — falla cerrado, sin cobrar de más
-- ni de menos. Evaluado y descartado un trigger de más para este caso:
-- el candado pesado de los 10 links de Stripe existe porque ahí el error
-- sí cobra mal; aquí no.
--
-- Guarda antes de borrar: hoy sabemos que las dos filas están en null
-- (cargadas así por 0038, nunca llenadas), pero esta migración no debe
-- darlo por hecho — si alguien les puso un valor real entre 0038 y hoy,
-- se detiene con un mensaje claro en vez de borrar un link que alguien
-- cargó.
do $$
declare
  v_con_valor text;
begin
  select string_agg(key, ', ') into v_con_valor
  from app_settings
  where key in ('stripe_link.plan-12.paquete-inicia', 'stripe_link.plan-12.paquete-esencial')
    and value is not null;

  if v_con_valor is not null then
    raise exception 'No se puede borrar: % tiene un valor cargado, no está en null como se esperaba. Revisar a mano antes de continuar.', v_con_valor;
  end if;
end $$;

delete from app_settings
where key in ('stripe_link.plan-12.paquete-inicia', 'stripe_link.plan-12.paquete-esencial');

-- ---------- verificación post-migración ----------
do $$
declare
  v_restantes int;
  v_stripe_total int;
begin
  select count(*) into v_restantes
  from app_settings
  where key in ('stripe_link.plan-12.paquete-inicia', 'stripe_link.plan-12.paquete-esencial');

  if v_restantes != 0 then
    raise exception 'Verificación post-migración falló: todavía quedan % de las 2 filas que debían borrarse.', v_restantes;
  end if;

  select count(*) into v_stripe_total from app_settings where key like 'stripe_link.%';
  if v_stripe_total != 10 then
    raise exception 'Verificación post-migración falló: se esperaban 10 llaves stripe_link.%%, hay %.', v_stripe_total;
  end if;
end $$;
