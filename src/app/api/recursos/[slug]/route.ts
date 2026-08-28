import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRecursoBySlug } from "@/config/recursos";
import { createClient } from "@/lib/supabase/server";

// Sirve los HTML autónomos de content/recursos/ (fuera de public/: ahí Next
// los serviría sin sesión a cualquiera con la URL). Dos capas de defensa
// contra path traversal, aunque con la lista blanca de abajo la segunda es
// en realidad redundante: (1) el nombre de archivo NUNCA sale del parámetro
// de la URL, solo del catálogo estático en config/recursos.ts — el slug
// solo se usa para buscar en esa lista, nunca para construir una ruta; (2)
// el path final se resuelve y se verifica que siga dentro de
// content/recursos/ antes de leerlo.
const RECURSOS_DIR = path.join(process.cwd(), "content", "recursos");

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { slug } = await params;
  const recurso = getRecursoBySlug(slug);

  if (!recurso) {
    return new Response("Recurso no encontrado", { status: 404 });
  }

  const filePath = path.join(RECURSOS_DIR, recurso.archivo);

  if (path.dirname(filePath) !== RECURSOS_DIR) {
    return new Response("Recurso no encontrado", { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Recurso no encontrado", { status: 404 });
  }
}
