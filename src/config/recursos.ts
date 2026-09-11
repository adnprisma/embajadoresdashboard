import { BookOpen, GraduationCap, LayoutGrid, type LucideIcon } from "lucide-react";

// Catálogo de recursos internos servidos por app/api/recursos/[slug] desde
// content/recursos/ (fuera de public/ a propósito — ver el comentario de
// seguridad en esa ruta). `archivo` es la única fuente de verdad para el
// nombre real en disco: la ruta de servicio SOLO acepta valores que
// aparezcan aquí, nunca el slug de la URL concatenado directo al filesystem.
export type Recurso = {
  slug: string;
  titulo: string;
  descripcion: string;
  archivo: string;
  icono: LucideIcon;
  tipo: string;
  // Tratamiento visual destacado (RecursosPage): fondo carbón, contorno
  // coral, distintivo "Nuevo" — y a propósito SIN el badge de `tipo`. Dos
  // badges en la misma tarjeta compiten entre sí, y el fondo oscuro + el
  // contorno ya comunican jerarquía por sí solos, sin necesitar un tercer
  // elemento. No es un descuido: no se construyó una variante de Badge para
  // fondo oscuro porque hoy es un caso único (una sola tarjeta) — si
  // aparece una segunda tarjeta destacada, esa variante se construye
  // entonces, no antes.
  destacado?: boolean;
};

export const RECURSOS: Recurso[] = [
  {
    slug: "central",
    titulo: "Central Prisma",
    // Descripción basada en los encabezados reales del archivo (Fórmate y
    // crece / La marca / Qué vendemos / Cómo se vende / Herramientas /
    // Práctica), no inventada de cero — aprobada.
    descripcion: "Tu marca, qué vendemos, cómo se vende, herramientas y práctica — todo en un solo lugar.",
    archivo: "central.html",
    icono: LayoutGrid,
    tipo: "Guía",
    destacado: true,
  },
  {
    slug: "prisma-academy",
    titulo: "Prisma Academy",
    descripcion: "Formación en el playbook de ventas: proceso, guiones y manejo de objeciones.",
    archivo: "academia.html",
    icono: GraduationCap,
    tipo: "Curso",
  },
  {
    slug: "manual-de-ventas",
    titulo: "Manual de Ventas",
    descripcion: "Guía paso a paso para llevar un prospecto de cero al cierre.",
    archivo: "manualventas.html",
    icono: BookOpen,
    tipo: "Manual",
  },
];

export function getRecursoBySlug(slug: string): Recurso | undefined {
  return RECURSOS.find((recurso) => recurso.slug === slug);
}
