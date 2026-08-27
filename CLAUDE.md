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
- **No uses ningún logotipo.** El logotipo de Prisma está en revisión
  independiente y NO está aprobado. Usa el componente `<Logo />` con su
  placeholder neutro. No generes, reconstruyas ni "mejores" un logotipo,
  ni siquiera como marcador temporal con forma de logo.
- **No generes ilustraciones nuevas.** Usa exclusivamente los PNG aprobados de
  `public/illustrations/`. Los personajes P01–P04 son identidades congeladas.
- **Transparencia real** en los recursos aislados. Nunca simules transparencia
  con blanco ni con cuadrícula.

---

## 3. Reglas de código

- TypeScript estricto. **Cero `any`.**
- Todo color sale de tokens CSS (`src/styles/tokens.css`).
  **Cero hexadecimales escritos a mano en componentes.**
- Todo texto visible al usuario vive en `src/config/copy.ts`.
  **Cero strings en JSX.**
- Los componentes nunca llaman a `supabase` directamente. Solo a los hooks de
  `src/lib/queries/`.
- **El cliente nunca calcula ni escribe dinero, puntos ni permisos.** Eso vive
  en funciones RPC `security definer` y en políticas RLS.
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
