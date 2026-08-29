import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { SidebarContent } from "./SidebarContent";
import type { SidebarProfile } from "./UserMenu";

// 256px, sticky, fondo blanco sobre beige, borde derecho carbón al 10%.
// Sin efecto vidrio ni backdrop-blur: la app es clara (DESIGN_SYSTEM.md §1).
export function Sidebar({ profile }: { profile: SidebarProfile }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-surface lg:flex">
      <div className="relative flex items-center justify-center px-4 py-4">
        <Logo height={42} />
        <div className="absolute right-4">
          <NotificationsBell />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <SidebarContent profile={profile} />
      </div>
    </aside>
  );
}
