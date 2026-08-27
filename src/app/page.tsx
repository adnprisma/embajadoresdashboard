import { redirect } from "next/navigation";

// La raíz siempre se resuelve en el middleware (session -> /dashboard,
// sin sesión -> /login). Este redirect es solo respaldo por si algún día
// el matcher de src/middleware.ts deja pasar "/" sin procesarla.
export default function Home() {
  redirect("/dashboard");
}
