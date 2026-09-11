# BAJA_VENDEDORAS.md — mapa de lo que implica dar de baja a una vendedora

**Esto es un mapa, no una solución.** Nace de la pregunta 6 del reporte de
alta de vendedoras (10 de septiembre de 2026): la sección de admin para
crear cuentas ("dar de alta") queda aprobada y en construcción, pero una
pantalla que solo crea fabrica, sin querer, el problema de cómo se da de
baja — y hoy nadie lo ha resuelto. Nada de lo que sigue está construido.
El propósito es que quien llegue a construirlo tenga el mapa completo de
las tablas reales antes de improvisar sobre ellas, no que este documento
le diga cómo hacerlo.

Vive en la raíz del repo, al lado de `CONTRATO_BASE_COMPARTIDA.md` y
`BRANDING.md` — incidente/decisión documentado aparte porque cruza varias
migraciones y no es una regla de una sola línea que quepa en `CLAUDE.md`
sin perder el detalle que lo hace útil. Si algún día se construye la baja,
este documento es el punto de partida, no un archivo que se pueda ignorar
porque "ya se sabe cómo funciona `profiles`".

---

## 1. `profiles.status` no revoca nada — es una falsa sensación de seguridad

La columna existe desde `0001_schema.sql` (`status text not null default
'active' -- active | paused | inactive`) y parece, a primera vista, el
interruptor obvio para dar de baja a alguien sin borrar nada. **No lo es.**
Verificado con grep sobre las políticas RLS (`0010_rls_admin.sql`) y sobre
todo `src/`: ninguna política, ningún middleware, ningún hook lee
`profiles.status`. Marcar a una vendedora como `paused` o `inactive` hoy
**no le quita acceso a nada** — sigue pudiendo iniciar sesión, ver su
pipeline, generar cotizaciones y todo lo demás exactamente igual que si
siguiera en `active`.

Si alguien llega a este archivo pensando "pongo `status = 'inactive'` y ya
quedó fuera", está equivocado, y el error no se nota hasta que esa persona
vuelve a entrar. Cualquier mecanismo de baja que dependa de este campo
tal cual está hoy no da de baja a nadie — solo cambia una etiqueta.

---

## 2. Borrar el perfil borra el historial de pagos — el `delete` en cascada

`profiles.id references auth.users(id) on delete cascade` — borrar la
cuenta de `auth.users` (o el perfil directamente) dispara cascada. Diez
tablas tienen `owner_id` (o equivalente) apuntando a `profiles(id)` con
`on delete cascade` explícito:

| Tabla | Columna | Migración |
|---|---|---|
| `contacts` | `owner_id` | `0001_schema.sql` |
| `opportunities` | `owner_id` | `0001_schema.sql` |
| `tasks` | `owner_id` | `0001_schema.sql` |
| `interactions` | `owner_id` | `0001_schema.sql` |
| `appointments` | `owner_id` | `0001_schema.sql` |
| `clients` | `owner_id` | `0001_schema.sql` |
| `commissions` | `owner_id` | `0001_schema.sql` |
| `points_ledger` | `owner_id` | `0001_schema.sql` |
| `notifications` | `owner_id` | `0001_schema.sql` |
| `prospect_analysis` | `owner_id` | `0008_prospect_analysis.sql` |

**`commissions` y `points_ledger` están en esa lista.** Un borrado duro no
solo le quita el acceso a la vendedora — borra su historial de comisiones
pagadas y su libro de puntos, permanentemente, junto con sus contactos y
oportunidades. No hay forma de deshacerlo desde la app.

Y aparte, otras cuatro referencias a `profiles(id)` **no** tienen cascada
(el comportamiento por default de Postgres ahí es bloquear el borrado, no
ignorarlo):

| Tabla | Columna(s) | Migración |
|---|---|---|
| `quotes` | `created_by` | `0023_quotes.sql` |
| `seller_prices` (historial) | `changed_by` | `0022_seller_prices.sql` |
| `contact_assignments` | `from_owner`, `to_owner`, `assigned_by` | `0011_contact_assignments.sql` |
| `app_settings` | `updated_by` | `0026_app_settings.sql` |

Si la vendedora que se intenta borrar alguna vez generó una cotización,
cambió un precio propio, apareció en una reasignación de contactos (como
origen, destino, o quien la ejecutó), o editó una configuración global, el
`delete` falla con violación de llave foránea — a medias, después de
haber empezado a cascadear por las diez tablas de arriba dentro de la
misma transacción (Postgres revierte todo el `delete` si cualquier
restricción falla, así que en la práctica el resultado es "no pasa nada"
o "pasa todo", nunca un borrado parcial real — pero solo se sabe cuál de
las dos hasta intentarlo).

---

## 3. Lo que `reassign_contacts()` ya cubre — y lo que no

`reassign_contacts()` (`0011_contact_assignments.sql`, revisado en
`0018_interactions_attribution_fix.sql`, `0021_contact_reserve_and_tags.sql`
y `0030_reassign_to_reserve.sql`) es el precedente más cercano a una baja
parcial que existe hoy en el esquema — pero nació para reasignar cartera
entre vendedoras activas, no para dar de baja a nadie.

**Cubre:** mover `contacts` de un `owner_id` a otro (o a la reserva), y lo
que cuelga directamente de esos contactos vía atribución (`interactions`,
según el fix de `0018`).

**No cubre:** `clients`, `commissions`, `opportunities`, `points_ledger`,
`tasks`, `appointments`, `notifications`, `prospect_analysis`, `quotes`.
Ninguna de esas tablas se mueve cuando se reasignan contactos. Una
vendedora que se va con clientes activos, comisiones pendientes de pago,
o cotizaciones generadas, deja todo eso exactamente donde está —
apuntando a un `owner_id` que, si se sigue el patrón de arriba, no debería
borrarse sin decidir primero qué pasa con esas filas.

---

## 4. Preguntas de negocio abiertas — sin proponer respuesta

- ¿Una vendedora que se da de baja debe perder acceso de inmediato, o
  basta con que deje de aparecer en flujos activos (asignación de leads
  nuevos, metas, plan semanal) mientras conserva acceso de solo lectura a
  su propio historial?
- Los `clients` con `owner_id` de la vendedora saliente — ¿se reasignan a
  otra vendedora, a una cuenta de "casa"/reserva, o se quedan apuntando a
  la cuenta dada de baja mientras esa cuenta siga existiendo (solo sin
  acceso)?
- Las `commissions` ya calculadas y pagadas (o pendientes de pago) —
  ¿siguen atribuidas a ella para efectos de reporte histórico aunque ya no
  tenga cuenta activa, o se reasignan también?
- Las `opportunities` abiertas (no ganadas ni perdidas) de la vendedora
  saliente — ¿pasan a otra persona automáticamente, o quedan en una cola
  para que un admin las reparta a mano?
- Si la respuesta a las anteriores es "se reasigna", ¿quién decide el
  nuevo dueño — un admin a mano, caso por caso, o una regla automática
  (la misma vendedora con menos carga, por ejemplo)?
- ¿Existe un estado intermedio real entre "activa" y "borrada" — alguien
  que ya no vende pero cuyo historial se sigue necesitando para reportes,
  comisiones en disputa, o una auditoría — y si existe, qué le impide
  entrar a operar mientras tanto (ver punto 1: hoy nada se lo impide)?
- ¿Hay una ventana de arrepentimiento esperada (alguien que se da de baja
  por error, o que vuelve semanas después), o la baja se asume siempre
  definitiva desde el momento en que se ejecuta?
