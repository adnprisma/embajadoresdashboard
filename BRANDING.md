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
| `[TIPOGRAFÍA SECUNDARIA]` | `src/styles/tokens.css` (`--font-body`) | **Resuelto.** IBM Plex Sans, vía `next/font/google` en `src/app/layout.tsx` (pesos 400/500/600, subset `latin`, `display: swap`). |
| `[TIPOGRAFÍA PRINCIPAL]` | `src/styles/tokens.css` (`--font-display`) | **Marcador temporal**, no decisión final — hoy apunta a IBM Plex Sans igual que `--font-body`, en espera de que se confirme la licencia de una tipografía propia de marca (DESIGN_SYSTEM.md §4). Cuando se confirme: sustituye **solo** el valor de la línea `--font-display` en `tokens.css` (está comentada exactamente ahí) — no toques `--font-body`, son decisiones independientes. |
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
