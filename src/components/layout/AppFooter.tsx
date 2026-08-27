import { copy } from "@/config/copy";

export function AppFooter() {
  return (
    <footer className="border-t border-border-subtle px-4 py-4 text-center text-xs text-text-muted lg:px-8">
      {copy.shell.footer.copyright}
    </footer>
  );
}
