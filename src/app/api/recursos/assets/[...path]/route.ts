import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

// Sirve las imágenes que antes vivían embebidas en base64 dentro de los
// HTML de content/recursos/ (ver manualventas.html: 14 figuras, 1.9MB de
// base64 que hacían el archivo imposible de diffear). Mismo criterio de
// seguridad que ../[slug]/route.ts: fuera de public/ para que nada se
// sirva sin sesión, y el nombre de archivo nunca sale directo del
// parámetro de la URL sin verificar — aquí sí acepta subcarpetas
// (catch-all, no lista blanca de un solo archivo), así que la defensa real
// es que el path resuelto se quede DENTRO de ASSETS_DIR después de
// resolver cualquier "..".
const ASSETS_DIR = path.join(process.cwd(), "content", "recursos", "assets");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { path: segments } = await params;
  const requestedPath = path.join(ASSETS_DIR, ...segments);

  // path.join ya normaliza cualquier ".." en segments — esta comprobación
  // es la que de verdad importa: que el resultado normalizado se quede
  // DENTRO de ASSETS_DIR, no en un ancestro o hermano.
  if (!requestedPath.startsWith(ASSETS_DIR + path.sep)) {
    return new Response("No encontrado", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(requestedPath).toLowerCase()];
  if (!contentType) {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const file = await readFile(requestedPath);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
