import { Illustration } from "@/components/common/Illustration";
import { copy } from "@/config/copy";
import { Logo } from "./Logo";

// Sin animar la ilustración — DESIGN_SYSTEM.md §6 lo prohíbe para los
// personajes (ni float, ni fade-in): aparece con el resto de la pantalla.
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-4 text-center">
      <Logo />
      <Illustration name="encontrar" size="md" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">{copy.shell.loadingScreen.title}</p>
        <p className="text-sm text-text-muted">{copy.shell.loadingScreen.description}</p>
      </div>
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent motion-reduce:animate-none"
      />
    </div>
  );
}
