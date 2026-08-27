"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppFooter } from "./AppFooter";
import { MobileDrawer } from "./MobileDrawer";
import { MobileTopbar } from "./MobileTopbar";
import { Sidebar } from "./Sidebar";
import type { SidebarProfile } from "./UserMenu";

export function AppShell({
  profile,
  children,
}: {
  profile: SidebarProfile;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // El drawer se cierra solo al cambiar de ruta.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Scroll a 0 en cada cambio de ruta.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[var(--content-max-width)] flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
        <AppFooter />
      </div>
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} profile={profile} />
    </div>
  );
}
