# BRANDING.md — dónde sustituir cada marcador

Este proyecto se construyó con marcadores de posición neutros para que la
identidad de marca se apruebe y se aplique en un solo lugar por marcador.
No hay identidad de marca improvisada en componentes: si algo no está listado
aquí o en `context/DESIGN_SYSTEM.md`, es una propuesta pendiente de aprobación
(ver CLAUDE.md §2).

| Marcador | Archivo | Qué hacer |
|---|---|---|
| `[NOMBRE DE MARCA]` | `src/config/brand.ts` | Sustituir `BRAND.name` por el nombre aprobado. Se propaga solo — `<Logo />`, el `<title>` del sitio y el footer del shell lo leen de aquí. |
| `[LOGO]` | `src/components/layout/Logo.tsx` | Reemplazar el placeholder geométrico por el logotipo aprobado. **No tocar hasta que el logotipo salga de revisión** (CLAUDE.md §2). No generes ni reconstruyas una forma de logo mientras tanto. |
| `[PALETA DE COLORES]` | `src/styles/tokens.css` | Ya está resuelta con los 4 colores aprobados del Kit Prisma (carbón, coral, beige, blanco) más los estados funcionales marcados como PROPUESTA. Es el único archivo con hexadecimales — no dupliques valores en otro lugar. Cambios de paleta se hacen aquí y se propagan a Tailwind vía `src/app/globals.css`. |
| `[TIPOGRAFÍA PRINCIPAL]` / `[TIPOGRAFÍA SECUNDARIA]` | `src/styles/tokens.css` (`--font-display`, `--font-body`) + `src/app/layout.tsx` | **Pendiente de decisión de marca** — el Kit Prisma no define familias tipográficas (DESIGN_SYSTEM.md §4). Al elegirlas: cargarlas con `next/font` en `layout.tsx` y apuntar las dos variables de `tokens.css` a esas fuentes. Prioriza una familia con numerales tabulares — el dashboard es mayoritariamente cifras en columna. |
| `[TONO DE VOZ]` | `src/config/copy.ts` | Todo el texto visible vive aquí, nunca en JSX. Por ahora solo tiene los textos del shell y del dashboard; el resto se agrega conforme avanza `context/ROADMAP.md`. |
| `[IMÁGENES/ILUSTRACIONES]` | `public/illustrations/` | Ya resuelto con los PNG aprobados del Kit Prisma (personajes P01–P04, escenas, símbolos, patrones — todos con transparencia real). No generes ilustraciones nuevas; el componente `<Illustration />` que las sirve se agrega cuando una pantalla lo necesite (a partir del bloque 4). |

## Notas

- Los colores de estado (`--state-positive`, `--state-pending`, `--state-progress`,
  `--state-negative`) y `--accent-text` están marcados como PROPUESTA en
  `tokens.css` y en `DESIGN_SYSTEM.md` §2–3. Requieren aprobación explícita antes
  de tratarse como definitivos.
- No existe modo oscuro aprobado. No agregues un bloque `prefers-color-scheme`
  a `tokens.css` sin decisión de marca (DESIGN_SYSTEM.md §1).
- `src/config/nav.ts`, `stages.ts`, `ranks.ts` y `pricing.ts` tienen su
  estructura de tipos lista pero sus datos se llenan en los bloques del
  roadmap que los usan (9, 11 y 14 respectivamente) — no son marcadores de
  marca, son datos de negocio pendientes.
