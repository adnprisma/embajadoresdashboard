import { Logo } from "@/components/layout/Logo";

// Placeholder temporal del bloque 1, solo para verificar que el setup
// compila con los tokens y Tailwind conectados. Se reemplaza en el
// bloque 3 por la redirección real a /login o /dashboard.
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base">
      <Logo />
    </main>
  );
}
