// Navegación del AppShell (bloque 4). Cuatro grupos, sin etiquetas de grupo.
// Ver context/ROADMAP.md §9.
import {
  BookOpen,
  Calendar,
  Contact,
  Kanban,
  LayoutDashboard,
  Link2,
  ListTodo,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { copy } from "./copy";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type ExternalNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  external: true;
};

export type NavGroup = (NavItem | ExternalNavItem)[];

export const NAV_GROUPS: NavGroup[] = [
  [
    { label: copy.shell.nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { label: copy.shell.nav.money, href: "/dinero", icon: Wallet },
    { label: copy.shell.nav.clients, href: "/clientes", icon: Users },
  ],
  [
    { label: copy.shell.nav.pipeline, href: "/pipeline", icon: Kanban },
    { label: copy.shell.nav.contacts, href: "/contactos", icon: Contact },
    { label: copy.shell.nav.calendar, href: "/calendario", icon: Calendar },
    { label: copy.shell.nav.tasks, href: "/tareas", icon: ListTodo },
  ],
  [
    { label: copy.shell.nav.resources, href: "/recursos", icon: BookOpen },
    // Enlaces externos: PENDIENTE. Se agregan cuando se definan las URLs reales.
  ],
  [
    { label: copy.shell.nav.myLink, href: "/mi-link", icon: Link2 },
    { label: copy.shell.nav.ranking, href: "/ranking", icon: Trophy },
  ],
];
