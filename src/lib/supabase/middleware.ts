import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Crea un cliente de Supabase ligado a la request/response del middleware y
// refresca la sesión. Devuelve la response (con las cookies ya actualizadas)
// y el usuario resuelto, para que src/middleware.ts decida a dónde redirigir.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No usar getSession() aquí: getUser() revalida el token contra Supabase
  // en cada request en vez de confiar en la cookie tal cual.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
