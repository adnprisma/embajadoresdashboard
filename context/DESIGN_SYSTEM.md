# Sistema de diseño Prisma — aplicado a interfaz de dashboard

Traducción del sistema visual aprobado de Prisma (originalmente editorial e
ilustrativo) al lenguaje de una aplicación de datos densa.

Fuente de autoridad: `03_REGLAS_VISUALES_APROBADAS.md` y
`01_DOCUMENTO_RECTOR_PRISMA.md` del Kit Maestro Prisma.
Este documento **no crea reglas nuevas**: adapta las existentes a UI y marca
como PROPUESTA todo lo que el kit no cubre.

---

## 1. Decisión de superficie: interfaz clara

El sistema Prisma es **claro**: fondo beige, contorno carbón, coral como único
foco. La app se construye en claro, no en oscuro.

Esto tiene una consecuencia práctica: el "efecto vidrio" (fondos translúcidos
con desenfoque sobre un fondo oscuro) **no aplica aquí**. Sustitúyelo por el
equivalente editorial de Prisma:

| En vez de | Usa |
|---|---|
| Superficie translúcida + `backdrop-blur` | Blanco sólido sobre beige |
| Borde blanco al 8 % | Borde carbón al 10 % |
| Resplandor / glow violeta | Nada. Elevación por sombra suave o por contraste de fondo |
| Fondo animado de partículas | Fondo beige plano, o un patrón aprobado del kit al 3–5 % de opacidad |
| Acento por saturación | Acento por escasez: **un solo coral por pantalla** |

El espacio negativo generoso del sistema Prisma es la herramienta principal de
jerarquía. No lo sacrifiques para meter más datos en el viewport.

> **PROPUESTA (requiere aprobación):** no existe un modo oscuro aprobado para
> Prisma. Si más adelante se necesita, debe definirse como decisión de marca,
> no improvisarse invirtiendo los tokens.

---

## 2. Paleta

| Token | Valor | Función |
|---|---|---|
| Carbón | `#1A1A1A` | Texto, contorno, autoridad, masas principales |
| Coral | `#FF5A36` | Acento, acción, hallazgo, dirección |
| Beige cálido | `#F5EEE7` | Fondo, respiración, cercanía |
| Blanco | `#FFFFFF` | Superficies de tarjeta, contraste funcional |

Los cuatro son los únicos colores de marca. Las escalas de gris se derivan del
carbón por opacidad, no por hexadecimales nuevos.

### Colores funcionales de estado — PROPUESTA

Un dashboard necesita distinguir positivo / pendiente / negativo, y el kit
Prisma solo aprueba cuatro colores. Estos son **propuestas**, deliberadamente
desaturados para no competir con el coral:

| Estado | Valor propuesto | Uso |
|---|---|---|
| Positivo | `#2F7A55` | Dinero real, confirmado, completado |
| Pendiente | `#8C5C18` | En validación, requiere acción |
| En proceso | `#3A6B8F` | En prueba, en curso |
| Negativo | `#B3382A` | Error, cancelado, vencido |

**Regla dura:** el coral NO es un color de estado. El coral es acción y foco.
Si usas coral para "éxito", pierdes el único acento fuerte que tiene la marca.

**Pendiente, corregido:** el valor original (`#B8791F`) medía 3.15:1 sobre
beige y 3.63:1 sobre blanco, ambos abajo del 4.5:1 mínimo de texto. `#8C5C18`
da 4.99:1 y 5.74:1 respectivamente — misma familia de color (ámbar), solo
más oscuro.

### Acento de etapa en el pipeline — CONFIRMADO

El pipeline (`/pipeline`) tiene 9 etapas, pero eso no es una paleta de 9
colores: usa los mismos tokens de estado de arriba, más "neutral" (que no es
un color nuevo — es la ausencia de acento: `--text-muted` sobre
`--bg-sunken`, igual que en `Badge` y `StatCard`).

El acento codifica el **desenlace** de la etapa, no su identidad. La mayoría
de las columnas van sin color — el color aparece solo donde hay algo que
señalar:

| Etapa | Acento | Por qué |
|---|---|---|
| Nuevas oportunidades, Análisis, Cita agendada, Asistió | Neutral | Flujo normal, nada que señalar |
| No asistió, En seguimiento | Pendiente | Requiere acción |
| Cerrado (ganado) | Positivo | Dinero real |
| Baja, Descartado | Negativo | Pérdida terminal |

**Regla dura:** cuando se agregue una etapa nueva al pipeline, su acento por
defecto es neutral. Solo se asigna un color de estado si la etapa representa
una ganancia, una pérdida terminal, o algo que requiere acción del usuario —
nunca solo para diferenciarla visualmente de las demás.

---

## 3. Contraste — pares válidos e inválidos

Verificado con la fórmula WCAG 2.1. Esto no es teórico: en un dashboard con
muchas etiquetas pequeñas, el coral es donde vas a fallar.

| Combinación | Ratio | Veredicto |
|---|---|---|
| Carbón sobre beige | ~15:1 | Válido para todo |
| Carbón sobre blanco | ~17:1 | Válido para todo |
| **Coral sobre beige** | **~2.7:1** | **INVÁLIDO** para texto y para bordes de control |
| **Coral sobre blanco** | **~3.1:1** | Solo texto grande (≥24px) y bordes. **Nunca texto de cuerpo** |
| Carbón sobre coral | ~5.6:1 | Válido para texto normal |
| Blanco sobre coral | ~3.1:1 | Solo texto grande. **Nunca etiquetas pequeñas** |

### Cómo usar coral entonces

- Como **relleno** de botones y badges, con **texto carbón encima**.
- Como **elemento gráfico**: barras de gráfico, subrayados, puntos, iconografía
  grande, indicador de elemento activo.
- Como **borde de acento** en tarjetas y pestañas, siempre acompañado de otra
  señal (peso tipográfico, fondo, ícono).
- **Nunca** como color de texto pequeño, ni como único indicador de estado.

**Propuesta descartada:** se evaluó un coral oscurecido para texto de énfasis
(`#C93B1C`). El número original (~5.2:1 sobre beige) estaba mal calculado —
el valor real es **4.39:1**, por debajo del mínimo de 4.5:1. Oscurecerlo lo
suficiente para pasar 4.5:1 significa que deja de leerse como coral, así que
no tiene caso forzarlo: se descarta, no se corrige el número y ya.

**El énfasis en texto se hace con carbón + peso tipográfico (`font-medium` /
`font-semibold`), nunca con color.** Ningún token de color sirve para texto
pequeño con énfasis — ese es exactamente el hueco que el coral no puede
llenar en este sistema.

---

## 4. Tipografía

**El kit Prisma NO define familias tipográficas.** El manual original es raster
y la Fase 1 lo señala explícitamente como limitación. Esto es un hueco real,
no algo que un agente deba rellenar por su cuenta.

Hasta que se apruebe una decisión tipográfica:

- `--font-display` y `--font-body` quedan como **marcadores**, apuntando a la
  pila del sistema.
- Escoge las familias definitivas fuera del código y sustitúyelas en un solo
  lugar (`src/styles/tokens.css` + `next/font` en `src/app/layout.tsx`).

Criterio para elegir, coherente con el carácter aprobado ("editorial, humano,
preciso, accesible"): una familia de texto con buena legibilidad en tamaños
pequeños y numerales tabulares — un dashboard es mayoritariamente cifras
alineadas en columna. Sin numerales tabulares, las tablas de dinero bailan.

Escala tipográfica: 12 / 14 / 16 / 20 / 24 / 32 / 48.
Etiquetas de KPI en mayúsculas, `letter-spacing: 0.06em`, 12px, carbón al 60 %.

---

## 5. Ilustración en la interfaz

Activos disponibles y aprobados: 27 poses de P01–P04, 15 escenas, 30 símbolos,
12 marcas de agua, 4 patrones. Todos en PNG con transparencia real.

Dónde sí usarlos:

- **Estados vacíos.** Es el mejor lugar: una escena por pantalla, con la acción
  que corresponde a esa pantalla. Máximo 200px de alto.
- **Pantalla de carga inicial** y pantalla de error.
- **Login**, como acompañamiento lateral.
- **Encabezado del dashboard**, una pose pequeña junto al saludo.

Dónde NO:

- Dentro de tablas, tarjetas de KPI, o cualquier zona de trabajo repetitivo.
  Una ilustración que ves 40 veces al día deja de comunicar y empieza a estorbar.
- Como fondo detrás de texto.
- Escaladas por debajo de 80px (se pierde la línea).

Reglas heredadas del kit: una acción principal por ilustración; no incrustar
fondos; no halos ni bordes sucios; el destello significa revelación o hallazgo,
nunca decoración.

Para iconografía de interfaz (menú, acciones, tablas) usa `lucide-react`
en carbón con grosor 1.5. Los símbolos ilustrados de Prisma **no** son iconos
de UI: no los uses en la navegación ni en botones.

---

## 6. Movimiento

El kit declara: **no existe movimiento aprobado** para las ilustraciones, y las
pruebas de animación están rechazadas. Eso significa:

- **Nunca animes las ilustraciones de personajes.** Ni flotar, ni parpadear,
  ni entrar deslizando. Aparecen y ya.
- La animación permitida es la de **interfaz**, que es otra categoría: cambios
  de estado, transiciones de layout y feedback de acción.

| Movimiento de UI | Duración | Curva |
|---|---|---|
| Hover / cambio de color | 150 ms | `ease-out` |
| Aparición de tarjeta (`fade-in` + 4px) | 300 ms | `ease-out` |
| Acordeón (altura) | 250 ms | `ease-in-out` |
| Drawer móvil | 280 ms | `ease-out` |
| Barras de gráfico al entrar en viewport | 600 ms | `cubic-bezier(.4,0,.2,1)` |
| Spinner | 800 ms | lineal |

Todo dentro de `@media (prefers-reduced-motion: no-preference)`.
Sin parallax, sin cursor personalizado, sin contadores animados, sin carruseles
con reproducción automática.

---

## 7. Forma y espacio

- Radio de tarjeta: 12px. Radio de botón: 8px. Radio de badge: 999px.
- Borde: 1px carbón al 10 %. En elemento activo: 1px coral.
- Sombra: una sola, muy suave — `0 1px 3px rgb(26 26 26 / 0.06)`.
  No construyas una escala de elevación de cinco niveles.
- Rejilla de espaciado de 4px. Padding de tarjeta: 20px. Separación entre
  tarjetas: 16px. Entre secciones: 32px.
- Ancho máximo de contenido: 1100px.

---

## 8. Tono de voz

Registro del kit: editorial, humano, preciso y accesible. Aplicado a UI:

- Tuteo, español de México, sin regionalismos fuertes.
- Encabezados de pantalla: sustantivo corto en posesivo ("Mis clientes").
- Botones: verbo en infinitivo, 1–2 palabras.
- Estados vacíos: constatación neutral + qué hacer para llenarlo.
  Nunca sarcasmo, nunca humor forzado, nunca signos de admiración.
- Cifras que puedan malinterpretarse llevan una nota fina que aclara si son
  estimadas o confirmadas. Es una obligación, no un adorno.
- Sin lenguaje de venta: esta app es de uso interno, no convierte a nadie.

Todo el texto vive en `src/config/copy.ts`.

---

## 9. Logotipo

Decisión de marca: la interfaz usa la **firma** (isotipo + la palabra
"PRISMA" dibujada junta) como forma por defecto — no el isotipo solo. El
nombre de marca **no se repite como texto** al lado de la firma: ya lo trae
dibujado. El isotipo solo (sin la palabra) queda como forma secundaria, para
los pocos contextos donde sí hace falta texto aparte (ver más abajo).

### Excepción de procedencia — léela antes de tocar `public/brand/`

Los 6 archivos de `public/brand/` están **generados por IA**, no son un
vector de diseño original. Confirmable en cualquier momento:

```
grep -l trainedAlgorithmicMedia public/brand/*.png
```

El dueño de marca los aprobó a sabiendas, con una condición explícita:
**se usan solo dentro de esta interfaz.** Nunca en material comercial,
documentos impresos, propuestas a clientes ni registro de marca — eso exige
el vector original, que todavía no existe. **No se les quitó el metadato
C2PA** que declara el origen (no se debe quitar nunca): esconder la
procedencia sería peor que asumirla. Cuando aparezca el archivo fuente real,
estos 6 PNG se reemplazan uno a uno, sin tocar la API de `<Logo />` ni esta
tabla salvo para actualizar esta nota.

### Archivos

6 archivos en `public/brand/`, transparencia real. Isotipo 1254×1254, firma
2172×724 (proporción ~3:1).

| `variant` | `form` | Archivo real |
|---|---|---|
| `carbon` | `firma` (default) | `logotipo_carbon.png` |
| `carbon` | `isotipo` | `isotipo_carbon.png` |
| `coral` | `firma` | `logotipo_rojo.png` |
| `coral` | `isotipo` | `isotipo_rojo.png` |
| `beige` | `firma` | `logotipo_beige.png` |
| `beige` | `isotipo` | `isotipo_beige.png` |

El prop `variant="coral"` usa el nombre del token de marca aunque el archivo
en disco se llame "rojo" — el mapeo vive solo en `Logo.tsx`, en ningún otro
lugar se debe usar el nombre de archivo directo.

`<Logo variant form height showName />` (`src/components/layout/Logo.tsx`,
`height` en px, calcula el ancho de la proporción real) es la única forma
aprobada de mostrarlos — usa `next/image`, nunca un `<img>` suelto ni un
`background-image` en CSS.

`beige` y `coral` quedan disponibles en el componente aunque hoy ninguna
pantalla los use como forma principal — son para superficies oscuras
futuras (coral) o para overlays sobre fondos con textura (beige). `coral`
sí se usa hoy, pero solo para el favicon (ver abajo), no como logo en pantalla.

### Tamaño y superficie por contexto

| Contexto | Superficie | Archivo | Alto |
|---|---|---|---|
| Sidebar de escritorio | Blanca (`bg-surface`) | `logotipo_carbon.png` | 30px |
| Topbar móvil | Blanca (`bg-surface`) | `logotipo_carbon.png` | 26px |
| Layout de `(auth)` (login, recuperar, restablecer) | Beige (`bg-base`) | `logotipo_carbon.png` | 34px |
| `LoadingScreen` | Beige (`bg-base`) | `isotipo_carbon.png` (+ texto aparte, es el único lugar que lo necesita) | 32px |
| Favicon / ícono de app | N/A — pestaña del navegador, clara u oscura | `isotipo_rojo.png` | 32, 180, 512px |

Favicon en coral y no en carbón: el carbón desaparece en pestañas con tema
oscuro del navegador; el coral tiene contraste en ambos. Generados con
`scripts/generate-brand-icons.mjs` (usa `sharp`) hacia `src/app/icon.png` y
`src/app/apple-icon.png` — nunca a mano, nunca con otra herramienta.

No hay un tamaño aprobado por debajo de 24px de alto.

### `alt` según el contexto

- **Firma sola, sin texto aparte** (sidebar, topbar, layout de auth — los
  tres casos por defecto: `showName` en `false`): `alt` con el nombre de
  marca completo. La firma es lo único que comunica el nombre ahí, así que
  el `alt` tiene que cargar esa información.
- **Isotipo con texto aparte** (`LoadingScreen`, `showName` en `true`):
  `alt=""` + `aria-hidden` en la imagen — el texto visible ya lo dice, y
  duplicarlo en el `alt` es ruido para el lector de pantalla.

### Prohibido

- **Nunca** los 6 archivos fuera de esta interfaz — ver la excepción de
  procedencia arriba. Si alguien pide el logo para un documento, una
  propuesta o material impreso, la respuesta es "todavía no hay vector
  original", no exportar estos PNG.
- **Nunca** quitarles el metadato C2PA de origen.
- **Nunca** reconstruir, recortar o "mejorar" el logo con CSS o código — si
  hace falta un tamaño, color o forma que no está entre los 6 archivos, se
  pide, no se improvisa.
- **Nunca** generar un séptimo archivo de logo por tu cuenta.
- **Nunca** repetir el nombre de marca en texto al lado de la firma —
  duplicación literal, se lee mal.
- **Nunca** animar el logo (hover de color aparte, ver DESIGN_SYSTEM.md §6)
  ni usarlo como fondo repetido o marca de agua fuera de los patrones ya
  aprobados del kit.
