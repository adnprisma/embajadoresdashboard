import { BookOpen, GraduationCap, type LucideIcon } from "lucide-react";

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
};

export const RECURSOS: Recurso[] = [
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
  // TERCERO: pendiente, se agrega cuando esté listo el archivo.
];

export function getRecursoBySlug(slug: string): Recurso | undefined {
  return RECURSOS.find((recurso) => recurso.slug === slug);
}
