import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

// Mismo criterio que recursos/assets/[...path]/route.ts: fuera de public/
// para que nada se sirva sin sesión. Un solo archivo fijo (no catch-all)
// porque hoy es la única imagen protegida de pagos — si hace falta más de
// una, ahí se generaliza al patrón de slugs de recursos, no antes.
const FILE_PATH = path.join(process.cwd(), "content", "datos-pago", "datosbancarios.png");

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  try {
    const file = await readFile(FILE_PATH);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
