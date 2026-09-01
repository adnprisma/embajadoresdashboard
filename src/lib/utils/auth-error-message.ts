import type { AuthError } from "@supabase/supabase-js";
import { copy } from "@/config/copy";

// Qué tan específico puede ser un mensaje de error depende de la pantalla:
// login y recuperar NUNCA pueden decir "esa cuenta no existe" — permitiría
// averiguar qué correos tienen cuenta aquí (enumeración). restablecer ya
// pasó ese punto: hay una sesión de recuperación activa, no hay nada que
// enumerar ahí, así que sí se muestra el motivo real cuando Supabase lo da.
// Cada código que se distingue abajo es una decisión explícita — antes de
// agregar uno nuevo, pregúntate si revela quién tiene cuenta.

export function getLoginErrorMessage(error: AuthError | null): string {
  if (error?.code === "over_request_rate_limit") {
    return copy.auth.login.rateLimitErrorBanner;
  }
  // Todo lo demás — incluida cualquier variante de "credenciales
  // inválidas" — se queda genérico a propósito. No distingue correo
  // inexistente de contraseña incorrecta.
  return copy.auth.login.credentialsErrorBanner;
}

export function getRecuperarErrorMessage(error: AuthError | null): string {
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return copy.auth.recuperar.rateLimitErrorBanner;
  }
  // Supabase ya no revela si el correo existe en esta llamada — el
  // genérico cubre cualquier otro caso sin abrir esa puerta.
  return copy.auth.recuperar.genericErrorBanner;
}

export function getRestablecerErrorMessage(error: AuthError | null): string {
  switch (error?.code) {
    case "same_password":
      return copy.auth.restablecer.errors.samePassword;
    case "weak_password":
      return copy.auth.restablecer.errors.weakPassword;
    case "session_expired":
    case "session_not_found":
    case "user_not_found":
      return copy.auth.restablecer.errors.sessionExpired;
    case "over_request_rate_limit":
      return copy.auth.restablecer.errors.rateLimit;
    default:
      return copy.auth.restablecer.genericErrorBanner;
  }
}
