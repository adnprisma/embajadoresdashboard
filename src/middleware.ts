import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Rutas del grupo (auth). No requieren sesión para verse.
const AUTH_PATHS = ["/login", "/recuperar", "/restablecer"];

// De AUTH_PATHS, cuáles expulsan a /dashboard si YA hay sesión.
// /restablecer queda fuera a propósito: el enlace de recuperación de
// Supabase crea una sesión de recuperación antes de llegar aquí, así que
// "hay sesión" es justo el estado normal para poder cambiar la contraseña.
const REDIRECT_IF_LOGGED_IN = ["/login", "/recuperar"];

function matches(paths: string[], pathname: string) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    const target = user ? "/dashboard" : `/login?next=${encodeURIComponent("/dashboard")}`;
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!user && !matches(AUTH_PATHS, pathname)) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  if (user && matches(REDIRECT_IF_LOGGED_IN, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  // brand/: el logo del layout de (auth) tiene que cargar precisamente
  // donde nunca hay sesión (login, recuperar, restablecer) — sin esta
  // exclusión, el middleware redirigía la imagen misma a /login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|illustrations/|brand/).*)"],
};
