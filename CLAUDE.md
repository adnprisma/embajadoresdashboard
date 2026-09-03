# CLAUDE.md — Dashboard interno Prisma

Instrucciones permanentes para cualquier agente que trabaje en este repositorio.
Léelas completas antes de escribir código. Aplican a TODAS las sesiones.

---

## 1. Qué es este proyecto

Dashboard web interno de seguimiento comercial para Prisma. Autenticación
obligatoria y persistencia real en Supabase. No es un sitio público ni una
landing page. No tiene registro abierto: las altas se hacen por invitación.

Idioma de la interfaz: **español (México)**.
Idioma del código, nombres de variables y comentarios: **inglés**.

---

## 2. Fuente de autoridad visual

La identidad visual de Prisma está definida en `context/DESIGN_SYSTEM.md`.
Ese archivo manda sobre cualquier decisión estética que se te ocurra.

Reglas que no se negocian:

- **No inventes reglas de marca.** Si algo no está en `DESIGN_SYSTEM.md`,
  proponlo explícitamente como propuesta y espera aprobación. No lo des por hecho.
- **No copies la identidad de ninguna app existente.** La arquitectura y la
  funcionalidad de este dashboard se inspiran en una referencia auditada, pero
  el color, la tipografía, el copy y las ilustraciones son exclusivamente Prisma.
- **Logotipo: decisión de marca tomada, con excepción explícita.** Los 6
  archivos en `public/brand/` (isotipo/logotipo × carbón/coral/beige) están
  generados por IA — confirmable con
  `grep -l trainedAlgorithmicMedia public/brand/*.png`. El dueño de marca
  los aprobó a sabiendas para usarse **solo dentro de la interfaz de este
  dashboard**, vía `<Logo />` (ver `DESIGN_SYSTEM.md` §9 para la matriz
  completa de archivo/superficie/tamaño). **Nunca salen de aquí:** no van en
  material comercial, documentos impresos, propuestas a clientes ni registro
  de marca — eso exige el vector original, que todavía no existe. Cuando
  llegue, estos 6 PNG se reemplazan uno a uno sin tocar la API de `<Logo />`.
  No generes un séptimo archivo de logo por tu cuenta: si hace falta una
  variante nueva, se pide, no se improvisa.
- **No generes ilustraciones nuevas.** Usa exclusivamente los PNG aprobados de
  `public/illustrations/`. Los personajes P01–P04 son identidades congeladas.
- **Transparencia real** en los recursos aislados. Nunca simules transparencia
  con blanco ni con cuadrícula.

---

## 3. Reglas de código

- TypeScript estricto. **Cero `any`.**
- Todo color sale de tokens CSS (`src/styles/tokens.css`).
  **Cero hexadecimales escritos a mano en componentes.**
- **El beige (`--bg-base`) es el fondo de la página, no el de los bloques de
  contenido.** Toda tabla, lista, formulario o panel de detalle va sobre
  `--bg-surface`. Un bloque puesto directo sobre `--bg-base` es un bug de
  jerarquía visual, aunque el contraste de texto pase — carbón sobre beige da
  ~15:1, así que ningún grep de contraste lo detecta. Esto se ve a ojo o no se
  detecta: revísalo tú, no un linter.
- Todo texto visible al usuario vive en `src/config/copy.ts`.
  **Cero strings en JSX.**
- Los componentes nunca llaman a `supabase` directamente. Solo a los hooks de
  `src/lib/queries/`.
- **El cliente nunca calcula ni escribe dinero, puntos ni permisos.** Eso vive
  en funciones RPC `security definer` y en políticas RLS.
- **`src/config/pricing.ts` es la única fuente de precios que se edita a mano.**
  La tabla `catalog_items` es su espejo en Postgres — la necesitan las
  funciones RPC (`generate_quote()`), que no pueden leer un archivo de
  TypeScript. Nunca edites `catalog_items` con un `UPDATE`/`INSERT` directo:
  si tocas `pricing.ts`, regenera la migración de seed con el script
  generador y corre el script de verificación (ambos documentados en el
  header de `pricing.ts`) antes de hacer push. El script de verificación
  detecta un precio desincronizado, pero solo si alguien se acuerda de
  correrlo — por eso `generate_quote()` además **falla con una excepción
  clara si un id de la selección no existe en `catalog_items`** (nunca
  salta la línea en silencio ni inserta con precio en cero): así, un
  producto nuevo en `pricing.ts` sin su migración de seed se nota la
  primera vez que alguien intente cotizarlo, no seis meses después
  revisando números raros.
- **Toda función RPC `security definer` que dependa de `auth.uid()` necesita un
  parámetro de respaldo** para poder correrse desde el editor SQL de Supabase,
  donde no hay sesión y `auth.uid()` es `null`. Ya pasó dos veces (el trigger
  de cambio de rol en `profiles` y `reassign_contacts()`): sin el respaldo, la
  función simplemente no se puede ejecutar a mano cuando hace falta.
- **Alcance de datos para admin, por tipo de pantalla — RLS por sí sola no lo
  resuelve.** Desde `0010_rls_admin.sql` casi todas las políticas le dan a
  admin `owner_id = auth.uid() or is_admin()`, así que cualquier query sin
  filtro explícito de `owner_id` le muestra a admin la fila de cualquiera.
  La regla:
  - `/contactos`, `/pipeline` y vistas de seguimiento → el admin ve TODO el
    equipo, con columna de vendedora. Correcto hoy vía el bypass de RLS, sin
    filtro adicional — así deben quedarse.
  - Mi dinero, Mis tareas, plan semanal → solo del usuario en sesión, **sin
    excepción de admin**. Filtro explícito por `owner_id`, nunca confiado a
    RLS. Ya resuelto así en `useOwnOpenTaskContactIds()` y `useMyTasks()`
    (`src/lib/queries/tasks.ts`), `useOwnOpportunityContactIds()`
    (`src/lib/queries/pipeline.ts`) y `useCommissionsHistory()`
    (`src/lib/queries/wallet.ts`). `my_dashboard_summary()` y
    `my_pipeline_metrics()` (`0003_functions.sql`) ya son correctos sin
    tocarlos: usan `auth.uid()` internamente, sin bypass de admin.
  - Si agregas una pantalla o un hook nuevo que lea `owner_id`, decide
    primero en cuál de las dos categorías cae — no asumas que RLS ya te
    cubre.
- Cada bloque de datos implementa los cuatro estados: cargando (Skeleton),
  vacío (`EmptyState` con instrucción de siguiente paso), con datos, y error
  con reintento. Una tarjeta en blanco es un bug.
- Cada mutación termina en `toast.success` o `toast.error`. Sin acciones silenciosas.
- Formatos con `Intl` y locale `es-MX`. Fechas con `date-fns` locale `es`.
- Semana que inicia en **lunes**.

---

## 4. Accesibilidad — obligatoria, no opcional

- Contraste mínimo 4.5:1 en texto, 3:1 en bordes de control.
  **Ver la tabla de pares válidos en `DESIGN_SYSTEM.md` §3.** El coral tiene
  restricciones reales: no sirve para texto pequeño sobre beige.
- El color nunca es el único portador de información. Signo, ícono o texto
  siempre lo acompañan.
- Navegación completa por teclado. Foco visible siempre. Nunca `outline: none`
  sin sustituto.
- Toda funcionalidad de arrastrar y soltar necesita una alternativa por teclado
  (menú "Mover a…").
- Respeta `prefers-reduced-motion` en todas las animaciones.

---

## 5. Flujo de trabajo

- Antes de un bloque grande, presenta el plan y espera confirmación.
- Trabaja en el orden del roadmap (`context/ROADMAP.md`). No adelantes bloques.
- Al terminar un bloque: resume qué se creó, qué quedó pendiente y qué decisión
  necesita el humano.
- Si detectas una contradicción entre estas instrucciones y lo que te pido en
  el chat, **dímelo antes de avanzar**. No la resuelvas por tu cuenta.
- **NUNCA corras `npm run build` mientras `npm run dev` esté activo:** comparten
  el directorio `.next/` y el build de producción corrompe el servidor de
  desarrollo. Los chunks empiezan a responder 503 y la interfaz queda con
  handlers muertos sin error visible en consola — parece un bug de la app y no
  lo es. Si necesitas verificar el build con el dev corriendo: detén dev
  primero, o corre el build con un `distDir` distinto. Esto ya causó un falso
  reporte de bug en el botón de "Nueva oportunidad" y dos sesiones de
  desarrollo corrompidas.
- **Si el código nuevo depende de una migración, corre la migración antes de
  hacer push, no después.** Push primero deja una ventana en la que main ya
  está desplegado y la base todavía no cambió — en esa ventana la app está
  rota en producción, no en local. Si correr la migración antes no es
  posible, avísalo en la PRIMERA línea del reporte del push, no al final
  entre otras confirmaciones: de eso depende que alguien corra a arreglarlo.
  Ya pasó: un `SELECT` pidió una columna que la migración todavía no había
  creado y tumbó `/contactos` para las dos vendedoras.
- **Verificar en vivo sobre un contacto real dentro de una función que mide
  FLUJO histórico (no solo estado actual) ensucia el reporte, no solo la
  pantalla.** Revertir el estado visible a como estaba antes NO limpia el
  rastro si algo más queda guardado con marca de tiempo (`interactions`,
  bitácoras, lo que sea) — ese rastro sigue ahí para cualquier reporte que
  cuente "llegó a X en la semana" en vez de "está en X ahora". Borrar ese
  rastro es parte de la verificación, no un paso opcional al final. Ya pasó:
  la prueba en vivo del bloque 1 dejó `interactions` de status_change en 3
  contactos reales de Valeria, y eso infló "Foto del universo" del bloque 3
  con un "interesado" que no era real.
