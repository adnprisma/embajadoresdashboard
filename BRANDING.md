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
| `[IMÁGENES/ILUSTRACIONES]` | `public/illustrations/` | **Resuelto.** `<Illustration name size />` (`src/components/common/Illustration.tsx`) sirve las 3 escenas hoy disponibles (`encontrar`, `crear`, `planear` — ver el comentario en el propio archivo para el mapeo a los PNG reales) vía `next/image`, sin animación. Conectado a los 14 `EmptyState` de la app, `LoadingScreen`, `error.tsx`, `not-found.tsx` y al layout de `(auth)`. Cuando lleguen más escenas/símbolos aprobados, agrégalos al objeto `ILLUSTRATIONS` del componente — nunca generes uno nuevo. |

## Notas

- Los colores de estado (`--state-positive`, `--state-pending`, `--state-progress`,
  `--state-negative`) están marcados como PROPUESTA en `tokens.css` y en
  `DESIGN_SYSTEM.md` §2. Requieren aprobación explícita antes de tratarse
  como definitivos.
- Un coral oscurecido para texto (`--accent-text`) se evaluó y se descartó:
  el contraste real es 4.39:1 sobre beige (no 4.5:1). No existe ningún color
  aprobado para énfasis de texto — se hace con carbón + peso tipográfico
  (`font-medium`/`font-semibold`). Ver `DESIGN_SYSTEM.md` §3.
- No existe modo oscuro aprobado. No agregues un bloque `prefers-color-scheme`
  a `tokens.css` sin decisión de marca (DESIGN_SYSTEM.md §1).
- `src/config/pricing.ts` tiene su estructura de tipos lista (planes,
  complementos) pero los datos se llenan en el bloque 14 (cotizador y
  calculadora), que todavía no se construye — no es un marcador de marca,
  es dato de negocio pendiente.
- `stages.ts` y `ranks.ts` (los stubs equivalentes para pipeline y ranking)
  ya no existen: `stages.ts` se eliminó en el bloque 15 por quedar
  totalmente muerto una vez que el bloque 9 (Pipeline) empezó a traer las
  etapas reales desde Supabase; `ranks.ts` se eliminó junto con el resto
  del código de `/ranking` cuando esa pantalla se pausó (ver README.md).
