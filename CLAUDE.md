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

**Dominio de producción real: `https://www.adnprisma.com`** — el que se le
da al equipo y el que va en cualquier documento (el apex `adnprisma.com`
rebota ahí con 308; los dos con certificado válido). `embajadoresdashboard.vercel.app`
es el dominio interno de Vercel — sigue funcionando y sigue siendo el mismo
deploy, pero no es el que se comparte. Ninguno de los dos estaba anotado en
el repo — hizo falta más de una vez en una misma sesión (pensar opciones de
alerta de build roto, verificar si una URL vieja seguía respondiendo en
vivo) antes de que alguien lo escribiera aquí.

**El `VERCEL_TOKEN` del vigilante de deploy (`.github/workflows/vercel-deploy-watch.yml`)
no tiene fecha de expiración — decisión consciente del 6 de septiembre de
2026, no un descuido.** Se evaluó rotarlo cada 90 días y se optó por no
hacerlo, a cambio de no tener que rotar credenciales periódicamente.
**Riesgo aceptado:** es acceso permanente a la cuenta de Vercel (no hay
scope de solo lectura en este plan) guardado como secret de GitHub — si ese
secret se filtra, o se agrega un colaborador al repo, el acceso no caduca
solo. Si algún día el repo deja de ser de una sola persona, esta decisión
se revisa. Dos formas en que este vigilante puede morir sin que nadie lo
note, ninguna resuelta por el propio workflow:
- **Un token inválido (revocado a mano, cuenta de Vercel deshabilitada,
  etc.) cae en `[RED]`, no en silencio** — el workflow sí falla y sí manda
  el correo de siempre.
- **GitHub apaga solo los workflows programados (`schedule`) en un repo sin
  commits en 60 días.** Si este repo se queda quieto ese tiempo, el
  vigilante se apaga sin avisar — esta sí es silenciosa de verdad: si pasa,
  hay que entrar a Settings → Actions y reactivarlo a mano.

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
  los aprobó a sabiendas para usarse **dentro de la interfaz de este
  dashboard**, vía `<Logo />` (ver `DESIGN_SYSTEM.md` §9 para la matriz
  completa de archivo/superficie/tamaño), **y, desde el 3 de septiembre de
  2026, en la propuesta de cotización que se manda a un cliente**
  (`/pipeline/[id]/cotizaciones/[quoteId]/imprimir`, variante beige sobre el
  encabezado carbón) — decisión consciente, tomada sabiendo que el archivo
  sigue siendo generado por IA y que el chunk C2PA sigue intacto (ver la fila
  `[LOGO]` de `BRANDING.md` para el detalle completo). **Sigue sin ir en
  registro de marca** — eso exige el vector original, que todavía no existe.
  Cuando llegue, estos 6 PNG se reemplazan uno a uno sin tocar la API de
  `<Logo />`. No generes un séptimo archivo de logo por tu cuenta: si hace
  falta una variante nueva, se pide, no se improvisa. Tampoco "corrijas" el
  uso en la propuesta creyendo que viola la regla original — la excepción de
  arriba es la regla vigente, no un error pendiente de revertir.
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
- **`src/lib/quoteMath.ts` duplica a propósito la aritmética de
  `generate_quote()`** (subtotal/total/pago inicial/mrr — ver
  `0023_quotes.sql`): es la réplica en cliente que usa el wizard de
  cotización (`/pipeline/[id]/cotizaciones/nueva`) para mostrar el total
  ANTES de enviar, sin llamar al servidor en cada tecla. Se evaluó
  reemplazarla por una sola función de Postgres que ambos lados llamaran
  (RPC desde el wizard en vez de cálculo local) — es la salida correcta el
  día que la aritmética crezca (descuentos, comparación de precios del
  bloque 6, cualquier regla nueva de negocio que dificulte mantener las dos
  copias iguales a mano). **Se descartó por ahora, no "para siempre":** las
  vendedoras cotizan en sitio con datos móviles, y el preview instantáneo es
  lo que sostiene la conversación con el cliente — cambiarlo por una
  llamada de red degradaría la herramienta en el peor momento, para
  resolver un riesgo de desincronización que hoy es teórico. Los candados
  que sí existen mientras tanto: `scripts/check-quote-math.ts` (corre las
  dos implementaciones contra los mismos casos y compara los números, no
  strings formateados) y el aviso en vivo del wizard si el total que
  regresa `generate_quote()` no coincide con el preview mostrado — esa es
  la última red, no la primera; no la quites pensando que el script ya
  cubre lo mismo. `scripts/check-catalog-sync.ts` (pricing.ts↔catalog_items,
  ver arriba) tiene el mismo problema — los dos scripts existían pero
  dependían de que alguien se acordara de correrlos a mano antes del push,
  y eso ya había fallado. **Candado real, decidido:** `.husky/pre-push`
  corre los dos (feedback rápido en la laptop, saltable con `--no-verify`)
  y `npm run build` también los corre antes de `next build` — Vercel usa
  ese mismo comando para desplegar, así que un desface real bloquea el
  deploy, no solo avisa. Se evaluó GitHub Actions y se descartó — hoy se
  empuja directo a `main` sin PRs, así que un CI en rojo sin branch
  protection es una alerta que alguien puede ignorar, no un candado; el
  paso en el build de Vercel ya da el candado duro sin depender de que
  cambie el flujo de trabajo.
- **Toda función RPC `security definer` que dependa de `auth.uid()` necesita un
  parámetro de respaldo** para poder correrse desde el editor SQL de Supabase,
  donde no hay sesión y `auth.uid()` es `null`. Ya pasó dos veces (el trigger
  de cambio de rol en `profiles` y `reassign_contacts()`): sin el respaldo, la
  función simplemente no se puede ejecutar a mano cuando hace falta.
- **`import_contacts()` tiene dos versiones (overload) por un `create or
  replace` que no reemplazó nada — bug real, sin arreglar.**
  `0013_import_contacts.sql` la creó con 4 parámetros;
  `0021_contact_reserve_and_tags.sql` le agregó `p_in_reserve` con "create or
  replace function import_contacts(... 5 parámetros ...)" — pero
  `create or replace` solo reemplaza si la firma (cantidad de parámetros)
  es idéntica. Al diferir, Postgres creó una SEGUNDA función en vez de
  reemplazar la primera. Cualquier llamada con exactamente 4 argumentos
  posicionales es ambigua (`ERROR 42725: function import_contacts(...) is
  not unique`) — pasó al cargar el lote de dentistas del 7 de septiembre de
  2026, con la misma forma de llamada que ya había funcionado en
  `23-importa-veterinarias-cdmx-2sep.sql` (esa corrió antes de que
  existiera el overload de 5). **Workaround usado, sin tocar el esquema:**
  pasar el 5º argumento (`p_in_reserve`) explícito como `null` — solo calza
  con la versión de 5 parámetros, desambigua sin migración. Arreglo de
  raíz pendiente (no hecho porque no era parte de esa carga): `drop
  function` del overload de 4 parámetros, en su propia migración.
- **Pegar un archivo `.sql` con comentarios de cabecera como una sola línea
  (`tr '\n' ' '`) rompe la carga EN SILENCIO si el comentario queda pegado
  al código real.** Un comentario de línea (`--`) en SQL comenta todo lo que
  sigue en esa misma línea — no tiene fin de bloque. Si el header de varias
  líneas con `--` se une con el `select ...` real en una sola línea, el
  primer `--` comenta el resto completo: el editor de Supabase regresa
  "Success. No rows returned" (no un error) y no insertó nada. Pasó con la
  carga de dentistas del 7 de septiembre: dos intentos silenciosos antes de
  notar que el conteo seguía en 0 — se detectó corriendo un `select
  count(*)` directo contra `contacts` en una pestaña nueva del editor, NO
  por el mensaje de la UI de la corrida original. Es la tercera vez en la
  misma sesión que un "éxito" de Supabase no significaba nada (antes: el
  exit code 22 opaco del workflow de Vercel, y "Success. No rows returned"
  de una migración que en realidad no había corrido) — la disciplina real
  no es leer el mensaje, es verificar el dato con una consulta aparte
  después de cada corrida que escribe algo. **Antes de convertir un `.sql` a una sola
  línea para pegarlo, quita el comentario `--` completo, no solo las líneas
  que EMPIEZAN con `--`.** `grep -v '^[[:space:]]*--'` (la primera versión
  de esta regla) solo quita líneas que son comentario puro — un comentario
  al FINAL de una línea de código (`continue; -- ya es suyo, no hay
  movimiento que registrar`) sobrevive, y al unir todo en una sola línea
  ese `--` se come el resto del archivo igual que un comentario de cabecera
  completo — mismo bug, variante que la primera regla no cubría. Pasó
  escribiendo `0030_reassign_to_reserve.sql`: "syntax error at end of
  input" en vez de la falla silenciosa de la vez pasada, pero la causa es
  la misma línea `--` mal cortada. La forma que sí cubre los dos casos:
  `sed 's/--.*$//'` (borra desde el primer `--` de cada línea hasta el
  final, sin importar si hay código antes) y **después** unir con
  `tr`/`sed` — nunca al revés. Esto es aparte del bug de auto-duplicado de
  paréntesis al pegar saltos de línea literales (la razón original de
  convertir a una sola línea) — son dos problemas distintos del mismo
  flujo.
- **Un arreglo de cruce (JOIN, matching por texto, lo que sea) se prueba
  PRIMERO contra los datos que ya están cargados, antes de usarlo con datos
  nuevos — nunca al revés.** El caso nuevo es exactamente el que menos
  sabes si es representativo. Pasó al arreglar
  `parse-prospect-analysis.mjs` para cruzar por nombre+alcaldía (lote de
  dentistas, 2026-09-07): la primera versión normalizaba la alcaldía por
  igualdad exacta contra `contacts.tags`, y antes de usarla en las 690
  fichas nuevas se corrió contra las 539 de veterinaria YA CARGADAS — 62
  de esas 539 fallaban (los HTML de veterinarias traen el nombre oficial
  completo de la alcaldía, "Cuajimalpa de Morelos", "La Magdalena
  Contreras"; los de dentistas traen la forma corta, que coincide con la
  etiqueta). Ninguna guarda existente lo habría notado: el lote nuevo no
  tiene con qué compararse hasta que ya está mal. Si el arreglo se hubiera
  probado solo contra el lote nuevo, esas 62 fichas de veterinaria habrían
  quedado con el cruce viejo (roto) el día que alguien tocara ese código
  de nuevo, sin que nada lo hubiera detectado — el arreglo se habría dado
  por bueno con evidencia que nunca lo puso a prueba de verdad.
- **Los 9 links de pago de Stripe (`app_settings`, `stripe_link.<modalidad>.<packageId>`,
  `0027_stripe_link_modalidad.sql`) se verifican a mano, nunca contra la API
  de Stripe — decisión tomada, no pendiente.** Se evaluó: `GET
  /v1/payment_links` sí expone si un link es de cobro único o recurrente
  (`line_items[].price.type`). Se descartó porque con tres modalidades
  (contado, plan a 3 meses, plan a 6 meses) el error más probable no es
  "suscripción donde iba pago único" — es pegar el link de 6 meses en la
  ranura de 3 meses. Para Stripe, plan-3 y plan-6 son `recurring`
  idénticos: un script que solo revisara el tipo de precio diría
  "correcto" en los dos casos, dando confianza falsa justo donde está el
  riesgo. Abrir el link sí lo detecta (la pantalla de pago muestra monto y
  periodicidad). **Procedimiento obligatorio antes de guardar cualquiera
  de los 9:** abrir el link y confirmar paquete, monto, y si es cobro
  único o mensual con cuántos cobros. Ni el trigger de `app_settings`
  (valida dominio y descarta links de modo prueba, nada más) ni ninguna
  pantalla lo hacen por ti — es el único punto donde un error le cuesta
  dinero real a un cliente, y no tiene atajo automático.
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
- **El lote de veterinarias CDMX del 2 de septiembre de 2026 (351 contactos,
  `supabase/test-data/23-importa-veterinarias-cdmx-2sep.sql`) no trae
  nombre de persona de contacto — pero SÍ trae domicilio.** Corrección sobre
  una nota anterior de este mismo archivo, que decía lo contrario: el CSV
  original (columnas negocio, contacto, teléfono, email, giro, etiquetas,
  notas — `contacto` y `notas` vacías en los 351) en efecto no tenía
  domicilio, pero los 16 HTML de análisis de prospección que generaron ese
  CSV sí lo tienen, ficha por ficha. Se carga vía
  `scripts/parse-prospect-analysis.mjs` (mismo parser del lote original de
  104, ver `supabase/test-data/07-load-prospect-analysis.sql` y
  `11-load-prospect-analysis-gladys.sql`) hacia `prospect_analysis.address`
  — no hay CSV involucrado en esta carga, el parser lee el HTML directo.
  La etiqueta `visitar` (grupo de 151 sin teléfono ni correo, ver
  `src/config/contactTags.ts`) por sí sola no implica dirección: lo que la
  da es tener ficha de análisis cargada, con o sin `visitar`.
- **La dirección vive en `prospect_analysis.address`, no en
  `contacts`.** Decisión tomada así porque hoy todo contacto con ficha de
  análisis ya la tiene ahí, en vivo, servida a dos pantallas
  (`ContactosView.tsx`, `ContactDetailView.tsx`) — moverla exigiría
  migración + backfill + reescribir esas dos pantallas, un rediseño
  aparte, no un paso de carga de datos. **Condición de revisión, para que
  esta decisión no quede como accidente:** hoy todo contacto llega con
  ficha de análisis (asunción implícita de guardar la dirección ahí). Un
  contacto capturado a mano, o de un lote sin HTML de prospección, se
  queda sin domicilio — y la etiqueta `visitar` vuelve a no tener a dónde
  apuntar. Si eso empieza a pasar con regularidad, la dirección se mueve a
  `contacts`.
- **Archivos de trabajo interno (HTML de prospección, imágenes de datos
  bancarios, recursos de venta) viven en `content/`, NUNCA en `public/`.**
  `public/` es estático y se sirve sin sesión — cualquier archivo ahí es
  descargable por cualquiera que adivine la URL, sin login. `content/` no
  se sirve directo: cada subcarpeta se consume o por una ruta de API que
  valida sesión primero (`content/recursos/` vía
  `src/app/api/recursos/assets/[...path]/route.ts`, `content/datos-pago/`
  vía `src/app/api/datos-pago/header/route.ts`), o por un script que corre
  en la laptop, nunca en el navegador del cliente (`content/prospeccion/`,
  vía `scripts/report-prospection-lot.mjs` + `scripts/load-prospection-lot.mjs`
  — ver el bullet de "carga de un lote nuevo" más abajo). `content/prospeccion/` se
  organiza por giro y fecha (`content/prospeccion/dentistas/2026-09/`,
  `content/prospeccion/veterinarias/2026-09/`, etc.) — el usuario deja ahí
  los HTML de cada lote y solo indica la carpeta; los scripts ya aceptan una
  carpeta como argumento y expanden los `.html` que encuentren dentro, sin
  necesitar cambio de código para esto. No es una regla de sesión como las
  otras dos — es para no llenar el repo de HTML pegados por chat y para
  que ese contenido nunca termine en `public/` por accidente.
- **Carga de un lote de prospección nuevo: contacto y análisis salen de la
  MISMA pasada sobre el HTML, nunca de un CSV intermedio.** Decisión
  tomada tras dos omisiones reales (Veterinaria Molinos, Virtuodent
  Boutique Dental — ambas existían en los HTML, ninguna llegó al CSV que
  alimentaba la carga vieja): un CSV a medio camino es una derivación con
  pérdidas de la misma fuente. Flujo, en dos scripts:
  1. `node scripts/report-prospection-lot.mjs <carpeta-html> --out decisiones.json`
     — Fase A automática (`scripts/lib/lot-analysis.mjs`): teléfonos
     compartidos, nombres/doctores repetidos, teléfonos mal formados,
     candidatos de marca por primer token. No escribe nada en la base.
     Genera un reporte legible y una plantilla de decisiones con cada
     cluster/teléfono en `"decision": null`.
  2. Un humano llena esa plantilla — es el juicio de negocio que no es
     derivable del HTML (¿cadena real o nombre genérico coincidente?
     ¿se carga el teléfono raro con etiqueta o se descarta?). Los
     "candidatos de marca" del reporte son solo sugerencias — una cadena
     real cuyo nombre va pegado a la ubicación sin paréntesis, o con
     variante de ortografía, no se agrupa sola (pasó con Dentalia, La
     Clínica Dental y Dentis+a en el lote de dentistas: el cruce
     automático por paréntesis/guion encontró 6, 7 y 4 sucursales de 10,
     10 y 6 reales) — toca revisarlos a mano y agregarlos al archivo si
     corresponde.
  3. `node scripts/load-prospection-lot.mjs --decisions decisiones.json <carpeta-html>`
     — genera el SQL real. **Aborta sin generar una sola línea si algún
     `"decision"` sigue en `null`, si falta `loteTagConTelefono`, o si el
     HTML de hoy tiene un cluster/teléfono que el archivo de decisiones no
     cubre** (decisiones desactualizado respecto al HTML actual) — el
     juicio de Fase A nunca es un paso opcional ni algo que se pueda
     saltar "por ahora".
  - **Giro y alcaldía: mapas explícitos, nunca se adivinan** —
    `GIRO_PLURAL_A_SINGULAR` y `ALCALDIA_TAGS` en
    `scripts/lib/prospection-html.mjs`. Un H1 con un giro plural que no
    está en el mapa (o una alcaldía cuyo texto no contiene ninguna de las
    16 etiquetas conocidas) hace que el script ABORTE de inmediato, sin
    parsear una sola ficha — mismo criterio que `OFERTA_POR_GIRO`
    (`src/config/oferta.ts`): nunca cae a un default ni intenta
    singularizar/adivinar solo.
  - **Idempotente de verdad, no solo del lado del análisis.** El paso 1
    (creación de contactos, vía `import_contacts()`) solo incluye en el
    lote a los negocios que NO tengan ya un match por nombre+alcaldía —
    correr el mismo HTML dos veces no duplica contactos ni análisis.
    Verificado en vivo contra los 690 dentistas y las 539 fichas de
    veterinaria ya cargados: `import_contacts` devolvió 0 (nada nuevo que
    crear) y los conteos de ambos lados quedaron exactamente iguales.
  - `scripts/parse-prospect-analysis.mjs` (el parser viejo) se queda —
    sigue sirviendo para re-analizar un contacto que ya existe sin crear
    nada nuevo — pero no se usa para cargar un lote completo nuevo.

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
- **Lista fija de verificaciones antes de cargar un lote de prospección
  nuevo — de solo lectura, en este orden.** Existe porque el cruce
  nombre-contra-nombre-DENTRO-del-propio-lote (el punto 5) se saltó dos
  veces antes de escribirse aquí (lote de dentistas, 2026-09-07: 19
  clusters reales — Consultorios Dentales del Sector Privado, MC Dent,
  Pro-Dental/Dra. Brenda Ruz López, Kids & Teens and More, ShinnyTooth,
  Dr. Javier Enrique Sánchez Ordaz, entre otros — que ni el cruce contra
  `contacts` ni el cruce por teléfono compartido detectan, porque son
  sucursales con teléfonos distintos o sin teléfono):
  1. Conteos por archivo/categoría del lote — confirmar contra lo que dice
     quien entrega el lote, nunca forzar un número que no cuadra.
  2. Teléfonos compartidos DENTRO del lote (mismo número normalizado, dos
     negocios) — no se borran, se etiquetan (`linea-compartida`).
  3. Teléfonos mal formados (prefijos viejos, ladas fuera de CDMX, líneas
     nacionales en vez de líneas de sucursal).
  4. Duplicados contra TODO `contacts` (no solo el lote nuevo) — por
     teléfono normalizado Y por nombre exacto normalizado.
  5. **Duplicados por nombre DENTRO del propio lote nuevo** — mismo negocio
     con dos fichas por tener sucursales distintas (nombre base antes del
     primer paréntesis/guion, y también nombre de doctor/a si aparece
     "Dr./Dra. Nombre" en el texto, porque el mismo doctor puede aparecer
     como nombre base en una fila y como calificador entre paréntesis en
     otra). Un nombre puramente genérico y descriptivo (ej. "Consultorio
     Dental" a secas) que se repite NO cuenta como duplicado por sí solo —
     es coincidencia de nombre común, no evidencia de mismo negocio.
  6. Desglose geográfico (alcaldía, colonia, lo que aplique) de ambos
     grupos.
  Párate ahí — etiquetas y asignación son un paso aparte, después de que el
  humano vea los números.
