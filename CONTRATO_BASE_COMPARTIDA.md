# CONTRATO_BASE_COMPARTIDA.md — la base de datos entre dos repos

Este documento gobierna cómo se comparte la base de Supabase de Prisma entre
`prisma-dashboard` y `prisma-comercial`. Vive en `prisma-dashboard` porque es
donde vive el esquema (ver sección 5), pero aplica a los dos repos por igual.
El `CLAUDE.md` de cada uno apunta aquí desde su primera sección — si hay una
contradicción entre lo que dice este archivo y lo que parece conveniente en
el momento, este archivo gana, y la corrección se hace aquí, no a un lado.

Última revisión de exposición contra la base real: 8 de septiembre de 2026
(ver sección 3 para el resultado).

---

## 1. Quién consume la base, y con qué confianza

Una sola base de Supabase (`iueosbkvgxtfethhntcq`), dos repos, dos modelos de
amenaza distintos:

- **`prisma-dashboard`** (`adnprisma.com`) — interno. Todo mundo que lo toca
  tiene sesión (`auth.uid()` real), con rol `seller` o `admin`. El público
  general nunca llega aquí; no hay registro abierto.
- **`prisma-comercial`** (`iaprisma.com`) — público. Sitio estático (GitHub
  Pages), sin sesión, sin login. Cualquier visitante del sitio pega contra la
  base con el rol `anon` — el mismo que tendría cualquiera que abriera la
  consola del navegador y copiara la anon key del bundle (ver sección 6: eso
  no es un ataque, es leer código público).

**Esa última frase es la que explica todas las reglas de abajo.** Para
`prisma-dashboard`, RLS filtrando por `owner_id = auth.uid()` es una defensa
razonable — el atacante hipotético ya necesitó una sesión válida para llegar
ahí. Para `prisma-comercial`, "confiar en RLS" significa confiar en que
**cada tabla, presente y futura**, tenga una política que excluya a `anon`
correctamente — un solo error de esa matriz, en cualquiera de las ~20 tablas
del esquema, es una fuga real, sin que el atacante necesite credenciales de
ningún tipo. Son dos superficies de ataque de tamaño completamente distinto
sobre la misma base, y el diseño de acceso público tiene que asumir el peor
caso, no el promedio.

---

## 2. La regla principal

**El sitio público (`prisma-comercial`) nunca lee tablas directamente. Solo
llama funciones `security definer`, específicas, con `search_path` fijo, que
devuelven exactamente lo mínimo que la pantalla necesita.**

Razón: si el sitio público lee tablas, la seguridad de todo el negocio
depende de que la matriz de RLS sea correcta para `anon` en cada tabla,
presente y futura — 20 tablas hoy, más las que se agreguen. Un error en
cualquiera de ellas (una política mal escrita, un `to public` donde debía
decir `to authenticated`, una tabla nueva sin política) es una fuga
inmediata, y nada en el flujo normal de trabajo obliga a revisarlo antes de
cada deploy.

Con funciones, la superficie de ataque es una **lista corta y auditable**
(sección 3) en vez de "todo el esquema, siempre". Agregar una tabla nueva al
dashboard deja de ser, por sí solo, un riesgo para el sitio público — el
sitio público no la ve hasta que alguien decide explícitamente exponer algo
de ella a través de una función nueva (sección 7).

---

## 3. Lista explícita de lo que el sitio público puede llamar

Agregar algo a esta lista es una decisión consciente, con su razón anotada
— nunca "se agregó porque hacía falta" sin más contexto.

| Función | Devuelve | Por qué existe |
|---|---|---|
| `verify_onboarding_access(p_access_code text)` | `client_id, client_name` | Onboarding de clientes nuevos por código — el formulario de arranque necesita confirmar el código y mostrar el nombre del cliente, nada más. Efecto secundario: actualiza `onboarding_last_accessed_at` en la fila que coincide (audit trail mínimo, no expone nada). |

### Resultado de la revisión de exposición (8 de septiembre de 2026)

No tenía registro de una revisión previa en esta sesión — se hizo desde
cero, contra el repo y la base reales, no de memoria. Cubrió: todo el código
de `prisma-comercial` (búsqueda de `.from(`, `.rpc(`, cualquier uso de
`supabase.*`) y `pg_policies`/GRANTs de las ~20 tablas del esquema público.

**Confirmado limpio:**
- El sitio público solo toca Supabase en **un** lugar:
  `onboarding/index.html`, con **una** llamada:
  `client.rpc('verify_onboarding_access', {p_access_code: code})`. Cero
  `.from()` en todo el repo — el resto del sitio (landing, formulario de
  diagnóstico, calculadora de planes) es 100% cliente, sin tocar la base.
  El botón "Enviar respuestas" del formulario de arranque abre WhatsApp con
  el texto armado en el navegador — tampoco toca la base.
- `verify_onboarding_access()` está bien construida: `security definer`,
  `search_path = public` fijo, columnas mínimas de retorno, filtra por
  `onboarding_enabled` + `status <> 'cancelled'` + código exacto.

**Encontrado, sin corregir todavía (pendiente de decisión — ver el mensaje
de esta sesión, no se tocó nada sin autorización):**
- `catalog_items`: política `catalog_items_select` con `roles = {public}` y
  `qual = true` — **sin restricción real**. Combinado con que `anon` tiene
  privilegios GRANT completos en la tabla (ver más abajo), esto significa
  que hoy cualquiera con la anon key pública puede leer el catálogo completo
  de precios directo, sin pasar por ninguna función. El sitio público nunca
  llama esto (confirmado arriba, el pricing del sitio está hardcodeado en su
  propio `app.js`) — es una puerta abierta que nadie usa, pero sigue
  abierta.
- `quote_line_items`, `quotes`, `seller_price_changes`, `seller_prices`:
  las cuatro tienen política `SELECT` con `roles = {public}` en vez de
  `{authenticated}` — hoy no filtran nada a `anon` en la práctica porque el
  `qual` de cada una depende de `auth.uid() = ...`, y `auth.uid()` es
  siempre `null` para `anon`, así que la condición nunca es verdadera. Pero
  el candado real ahí es un efecto secundario de cómo está escrita la
  condición, no una restricción de rol explícita — si alguna de esas
  cuatro condiciones se reescribe algún día sin que quien la toque piense
  en `anon`, la puerta se abre sola, sin que nada lo marque.
- A nivel de GRANT de Postgres (no RLS), `anon` tiene **privilegios
  completos** (`SELECT`/`INSERT`/`UPDATE`/`DELETE`/etc.) en todas las tablas
  revisadas, incluidas `contacts`, `commissions`, `profiles`. Es el patrón
  default de Supabase (RLS existe precisamamente para ser la barrera real
  encima de esto) y hoy RLS sí cierra todo correctamente en esas tablas —
  pero confirma que **RLS es la única línea de defensa, sin respaldo del
  lado de permisos**, en las ~20 tablas del esquema. Si algún día una
  migración desactiva RLS en una tabla por error, ese error no tiene una
  segunda barrera que lo detenga.

**Recomendación (no ejecutada, pendiente de tu decisión):** cambiar los 5
`roles = {public}` de arriba a `{authenticated}` explícito — no cambia el
comportamiento de nadie que ya usa el sistema con sesión, y cierra la puerta
de `catalog_items` que sí está abierta hoy.

---

## 4. Lo que nunca se expone a `anon`, por nombre

Ninguna de estas tablas se lee jamás directo desde `prisma-comercial` — todo
acceso público, si algún día hace falta algo de aquí, pasa por una función
nueva en la lista de la sección 3, nunca por RLS abierto a `anon`.

| Tabla | Por qué nunca |
|---|---|
| `contacts` | Datos de prospectos y clientes reales de las vendedoras — nombre, teléfono, dirección. |
| `opportunities` | Pipeline de ventas y su valor — información comercial interna. |
| `quotes` | Cotizaciones reales mandadas a clientes, con montos. |
| `quote_line_items` | Detalle de producto/precio de cada cotización real. |
| `commissions` | Comisiones de cada vendedora — dato de nómina. |
| `points_ledger` | Puntos/gamificación interna del equipo de ventas. |
| `prospect_analysis` | Análisis de prospección con datos de negocios reales, algunos sin relación comercial todavía. |
| `profiles` | Identidad y rol de cada persona del equipo. |
| `contact_assignments` | Historial de quién tuvo cada contacto — reconstruye el trabajo interno de reasignación. |
| `app_settings` | Links de pago de Stripe y datos bancarios — el error más caro posible si se expone. |
| `clients` | Datos de contrato de cada cliente — lo único que se toca de aquí es a través de `verify_onboarding_access()`, nunca directo. |
| `catalog_items` | Precios internos por concepto — hoy expuesta por error (ver sección 3), no por diseño. |
| `seller_prices`, `seller_price_changes` | Precio que cotiza cada vendedora y su historial — dato de negociación interna. |

---

## 5. Dónde viven las migraciones

**Solo en `prisma-dashboard/supabase/migrations/`, venga el cambio del repo
que venga.** Si `verify_onboarding_access()` necesita un cambio, o
`prisma-comercial` necesita una función o columna nueva, la migración se
escribe y se aplica desde `prisma-dashboard` — nunca un script SQL suelto
guardado en `prisma-comercial`.

- Un cambio hecho a mano en el editor SQL de Supabase (como
  `supabase-onboarding-access.sql`, que hoy vive suelto en
  `prisma-comercial`) se captura como migración numerada en
  `prisma-dashboard/supabase/migrations/` **el mismo día** — no "cuando dé
  tiempo". Un cambio de esquema sin migración correspondiente es exactamente
  el tipo de deriva que ya causó incidentes reales en este proyecto (ver
  `prisma-dashboard/CLAUDE.md`, sección de `import_contacts()`).
- Los tipos TypeScript (`src/types/database.ts`) se regeneran desde
  `prisma-dashboard` aunque la pantalla que los use viva en
  `prisma-comercial` — `prisma-comercial` no tiene build step ni tipos
  generados (es HTML/JS estático), así que esto aplica sobre todo si algún
  día ese repo deja de ser estático.

---

## 6. Llaves

- **La anon key es pública por diseño.** Está en el bundle de los dos sitios
  (`prisma-dashboard` y `prisma-comercial`), visible para cualquiera que
  abra las herramientas de desarrollador del navegador. No es un secreto y
  no protege nada por sí sola — la key de `prisma-comercial` hoy es
  `sb_publishable_t_SGLnX_...` (formato nuevo de Supabase), y da exactamente
  los mismos permisos a cualquiera que la copie que a un visitante normal
  del sitio. Toda la seguridad real vive en RLS y en las funciones de la
  sección 3, nunca en que la key esté "escondida".
- **La `service_role` no vive en ningún repo, ni en Vercel, ni en ningún
  script, ni en GitHub Actions.** Esta regla ya existía para
  `prisma-dashboard` (ver `parse-prospect-analysis.mjs`: "este script NO
  tiene acceso a la base de datos, solo hay anon key en este entorno") —
  queda escrita aquí también porque ahora hay dos repos donde alguien podría
  meterla por error, y `prisma-comercial` en particular se despliega a
  GitHub Pages, un hosting 100% estático donde un secret en el repo queda
  público en el bundle servido, no solo en el código fuente.

---

## 7. Cómo se agrega una pantalla pública nueva

En orden. Ninguno de estos pasos se salta, y el paso 2 es obligatorio
**antes** de escribir código, no una revisión posterior:

1. **Define qué necesita ver o hacer la pantalla, en una frase.** No "acceso
   a `clients`" — algo como "confirmar un código y mostrar el nombre del
   cliente", del tamaño de lo que ya hace `verify_onboarding_access()`.
2. **Revisión de seguridad antes de escribir la función**: ¿qué es lo
   MÍNIMO que la pantalla necesita leer o escribir? ¿Ese mínimo incluye algo
   de la lista de la sección 4? Si la respuesta obliga a tocar una de esas
   tablas, la función se diseña para devolver solo columnas específicas
   (nunca `select *`), nunca para exponer la tabla completa aunque sea
   filtrada.
3. **Escribe la función** en una migración nueva de
   `prisma-dashboard/supabase/migrations/` (sección 5): `security definer`,
   `search_path = public` fijo, parámetros explícitos (nunca un objeto JSON
   genérico si se puede evitar), columnas de retorno mínimas.
4. **`grant execute` explícito a `anon`** (y `authenticated` si también
   aplica a sesiones internas) — nunca depender de un grant heredado o
   default.
5. **Agrega la función a la tabla de la sección 3**, con su razón — el mismo
   día que se escribe, no después.
6. **Prueba la llamada desde el sitio con la anon key real**, no solo desde
   el editor SQL con una sesión de admin — el editor SQL no reproduce el rol
   `anon` a menos que se pruebe explícitamente contra él.
7. **Regenera los tipos** si `prisma-dashboard` también consume la función
   (sección 5).

---

## 8. Qué revisar cada vez que se agrega una tabla

Cada tabla nueva en el esquema, sin excepción, necesita **al menos una
política explícita que excluya a `anon`** — nunca depender de que "no hay
política, entonces no hay acceso" (falso: sin RLS activo, o con RLS activo
pero un GRANT amplio y un `qual = true` en cualquier política, el acceso
existe). El checklist, a mano, hasta que exista la prueba automática de
abajo:

- `alter table <tabla> enable row level security;` está en la misma
  migración que crea la tabla, nunca en una migración aparte "para después".
- Cada política tiene `to authenticated` (o un rol más estrecho) explícito
  — nunca `to public` a menos que sea intencional y documentado (como
  `catalog_items` no debería haber sido, según la sección 3).
- Si alguna política SÍ necesita aplicar a `anon` (el caso raro), el `qual`
  no depende únicamente de que `auth.uid()` sea `null` para bloquear — eso
  es un accidente que funciona, no una restricción real.

### Propuesta de prueba automática (no construida — esto es el costo, para que decidas)

Mismo espíritu que `check-quote-math.ts`/`check-catalog-sync.ts`: un script
que falle el build si algo no cuadra. La versión honesta de esto tiene una
tensión real con la sección 6, y hay que resolverla antes de construirlo,
no en el camino:

- **Lo que revisaría:** para cada tabla en `information_schema.tables` del
  esquema `public` que no esté en un archivo de excepciones explícito,
  verificar en `pg_policies` que ninguna política tenga `anon` o `public`
  en `roles` sin que esa tabla esté también en la lista de la sección 3
  como intencional.
- **El costo real:** leer `pg_policies` (catálogo de sistema) requiere una
  conexión con privilegios de esquema — el anon key normal, vía PostgREST,
  no lo expone. Eso significa que este chequeo automático necesitaría un
  credential con más alcance que el anon key corriendo en CI (GitHub
  Actions) o en el build de Vercel — exactamente lo que la sección 6
  prohíbe guardar en cualquier repo.
- **Dos caminos, ninguno gratis:** (a) mantenerlo como consulta manual
  periódica (como esta revisión), documentada aquí con fecha cada vez que
  se corre — cero costo de construcción, pero depende de que alguien se
  acuerde; (b) crear un `service_role` de alcance reducido (si Supabase lo
  permite en este plan) dedicado solo a lectura de `pg_catalog`, y decidir
  explícitamente romper la regla de "cero service_role en CI" para ESTE
  caso, con el riesgo anotado como se anotó el del `VERCEL_TOKEN`. No es una
  decisión que se deba tomar por default — necesita tu autorización
  explícita, igual que esa.
