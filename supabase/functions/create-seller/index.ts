// FUENTE DE VERDAD: este archivo en el repo. Si alguna vez se edita desde
// el editor del panel de Supabase, el repo queda desincronizado y nadie
// se entera — misma deriva base-adelantada-al-repo que las migraciones.
// Cualquier cambio se hace aquí y se vuelve a pegar en el panel, nunca al
// revés.
//
// Edge Function: create-seller
//
// Único lugar del proyecto con privilegio de service_role para crear una
// cuenta de auth — ver la restricción no negociable en CLAUDE.md ("la
// service_role no vive en ningún repo, ni en Vercel, ni en .env.local").
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase al runtime
// de la función en el momento de correr; nadie los declara ni los guarda
// aquí.
//
// Contraseña TEMPORAL, a propósito — decisión del 11 de septiembre de 2026
// (ver CLAUDE.md, sección 3): se descartó inviteUserByEmail() por ahora
// porque no hay SMTP propio confirmado en este proyecto y el envío por
// defecto de Supabase no es confiable para producción. El admin fija la
// contraseña en el formulario de alta y se la da a la vendedora por fuera
// (verbal, WhatsApp, lo que sea) — no por correo. El día que haya SMTP
// confirmado, este flujo migra a inviteUserByEmail() y este comentario (y
// el parámetro `password` de abajo) se borra junto con el código que lo
// reemplaza. Mientras tanto, forzar el cambio en el primer ingreso queda
// evaluado (tamaño chico, ver reporte) pero SIN construir en esta pasada
// — no hay campo `must_change_password` todavía, así que hoy nada impide
// que la vendedora se quede con la contraseña que el admin escribió.
//
// Un solo paso: createUser() ya deja todo lo que hace falta (auth.users +
// profiles vía handle_new_user(), con role='seller' y daily_lead_target=10
// por default — ver 0009_roles.sql y 0025_daily_lead_target.sql). No hay
// ningún UPDATE de seguimiento a propósito: agregar uno abriría una
// ventana de fallo a medias que hoy no existe (handle_new_user() corre en
// la misma transacción que el insert de auth.users — si falla, revierte
// todo, no deja cuenta huérfana).

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  // Instrumentación temporal — diagnóstico del cuelgue de 150s (546
  // WORKER_RESOURCE_LIMIT) del 11 de septiembre de 2026. Cada log dice en
  // qué paso va y cuánto tiempo pasó desde que entró el handler; nunca
  // imprime `body` ni `password`, ni el valor de ninguna variable de
  // entorno — solo si está definida o no. Se quita en cuanto encontremos
  // el paso exacto donde se cuelga.
  const startedAt = Date.now();
  const log = (step: string) => console.log(`[create-seller] ${step} (+${Date.now() - startedAt}ms)`);

  log("handler entrado");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "No autenticado." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Documentado como inyectada por default junto a las nuevas
  // SUPABASE_PUBLISHABLE_KEYS/SUPABASE_SECRET_KEYS (supabase.com/docs/guides/functions/secrets,
  // verificado el 11 de septiembre de 2026) — este log confirma en vivo,
  // para ESTE proyecto, si eso es cierto aquí y no solo en la doc.
  log(
    `variables de entorno: SUPABASE_URL=${supabaseUrl ? "definida" : "FALTA"}, ` +
      `SUPABASE_ANON_KEY=${anonKey ? "definida" : "FALTA"}, ` +
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey ? "definida" : "FALTA"}`,
  );

  // Antes esto usaba `!` (aserción de no-nulo) y seguía adelante con
  // `undefined` si faltaba una variable — createClient(undefined, ...) no
  // truena de inmediato, arma un cliente con URL base inválida, y la
  // llamada de red que sigue puede quedarse intentando resolver un host
  // mal formado en vez de fallar rápido. Mecanismo real y plausible para
  // un cuelgue de 150s — cortamos aquí, explícito, en vez de dejar que el
  // `!` lo esconda.
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("create-seller: falta una variable de entorno esperada");
    return jsonResponse({ error: "Configuración incompleta del servidor." }, 500);
  }

  // Cliente "del que llama": usa la ANON key + el JWT del caller, nunca la
  // service_role. is_admin() lee auth.uid() del lado de Postgres a partir
  // de ese JWT — exactamente la misma función que ya gatea los triggers de
  // profiles (0009_roles.sql), no una verificación nueva e independiente.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  log("callerClient creado");

  log("llamando is_admin()");
  const { data: isAdmin, error: adminCheckError } = await callerClient.rpc("is_admin");
  log(`is_admin() resolvió: isAdmin=${isAdmin}, error=${adminCheckError ? adminCheckError.message : "ninguno"}`);

  if (adminCheckError || !isAdmin) {
    return jsonResponse({ error: "No autorizado." }, 403);
  }

  let body: { full_name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la petición inválido." }, 400);
  }

  const fullName = body.full_name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  // Validación de defensa en profundidad — el formulario del dashboard ya
  // valida esto mismo antes de llamar aquí; esta función no debe confiar
  // en que ningún caller lo haya hecho.
  if (!fullName) {
    return jsonResponse({ error: "Falta el nombre." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: "Correo inválido." }, 400);
  }
  if (password.length < 8) {
    return jsonResponse({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  log("llamando createUser()");
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  log(`createUser() resolvió: ${error ? "error" : "éxito"}`);

  // Nunca loguear `body` ni `password` completos — ni aquí ni en ningún
  // catch de abajo. Lo único que se loguea es el mensaje de error de
  // Supabase (no contiene la contraseña) y el correo, para poder rastrear
  // un alta fallida sin exponer el secreto.
  if (error) {
    console.error("create-seller: fallo al crear usuario", { email, message: error.message });

    const message = error.message.toLowerCase().includes("already")
      ? "Ya existe una cuenta con ese correo."
      : "No se pudo crear la cuenta. Intenta de nuevo.";

    return jsonResponse({ error: message }, 400);
  }

  return jsonResponse({ id: data.user.id, email: data.user.email }, 200);
});
