# UDP — Línea gráfica

> Urban Development Project · PTY · @UDP.PA · 203 seguidores
> **Organizamos hoy, transformamos ciudad.**

Fuente de verdad: `brands/udp/brand.json`. Tokens para web: `brands/udp/tokens.css`.
Brandbook visual: `/brands/udp/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**Construimos experiencias urbanas: la ciudad como escenario.**

Unidad integral que planifica, produce y opera eventos y actividades urbanas en Panamá — producción, logística y suministros desde un solo punto. Proyecto insignia: Casco Peatonal.

**Personalidad:** Institucional · Visionaria · Resolutiva · Cívica · Confiable

**Valores:**
- Un solo equipo, un solo sistema
- Ciudad para la gente
- Cumplimiento
- Cultura y patrimonio

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/udp/logo/primary.svg`, `brands/udp/logo/inverse.svg`, `brands/udp/logo/on-accent.svg`, `brands/udp/logo/symbol.svg`, `brands/udp/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** UDP en sans geométrica negra muy pesada con la barra 'URBAN DEVELOPMENT / PROJECT | PTY' + bandera de Panamá. El wordmark solo funciona como avatar.
- **Construcción:** UDP en Poppins Black gigante. Debajo dos barras negras del mismo ancho: "URBAN DEVELOPMENT" (URBAN en bold, DEVELOPMENT en light) y "PROJECT | PTY" + bandera de Panamá. Versión completa en círculo con la fila de servicios y "Organizamos hoy, transformamos ciudad."
- **Área de respeto:** Altura de la barra inferior alrededor.
- **Tamaño mínimo:** UDP solo 32 px · lockup completo 140 px.

**Versiones:**
- Negro sobre blanco (principal)
- Blanco sobre negro
- UDP gigante en Concrete como marca de agua
- Sub-marca Casco Peatonal (ver notas)

**Usos incorrectos:**
- No usar colores de nightlife
- No quitar la bandera del lockup completo
- No poner el logo sobre fotos sin caja o degradado
- No usar el dorado como fondo grande

## Instagram

- **Bio:** Urban Development Project 🎭 / Gestión integral de eventos y ciudad 🌇 / Producción | Logística | Suministros / 📍 Panamá
- **Highlights:** Casco Peatonal, Servicios, Proyectos, Aliados
- **Grilla:** Carruseles institucionales blancos alternando con fotos de ciudad B/N. Casco Peatonal con su sub-identidad colorida dentro del marco UDP.

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-ink` | Ink | `#0A0A0A` | Primario | Logo, titulares, etiquetas. |
| `--brand-white` | White | `#FFFFFF` | Primario | Fondo principal. |
| `--brand-ochre` | Ochre Gold | `#C89B3C` | Acento | Palabras clave ('CAMBIANDO.'), líneas, iconos activos. |
| `--brand-concrete` | Concrete | `#EDEDED` | Secundario | UDP gigante de fondo, secciones alternas. |
| `--brand-graphite` | Graphite | `#4A4A4A` | Neutro | Texto secundario. |
| `--brand-canal` | Canal Blue | `#005293` | Acento | Solo bandera y señalética cívica. |
| `--brand-flag-red` | Flag Red | `#D21034` | Acento | Solo bandera. |

**Roles de interfaz:** fondo `#FFFFFF` · superficie `#EDEDED` · texto `#0A0A0A` · secundario `#4A4A4A` · acento `#C89B3C` (texto sobre acento `#0A0A0A`).

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Poppins | 700, 800, 900 | MAYÚSCULAS · tracking -0.01em | Titulares, claims, UDP. |
| secondary | Poppins | 500, 600 | MAYÚSCULAS · tracking 0.3em | Etiquetas, categorías ('ARTE · CULTURA · CIUDAD'). |
| body | Inter | 400, 500, 600 | normal · tracking 0 | Texto web, propuestas, captions. |

Cargar: `https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800;900&family=Inter:wght@400;500;600&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 4px
- **Botones:** Rectangular Ink con texto blanco Poppins 600 mayúsculas tracking 0.2em; secundario contorno Ink. Hover: Ochre.
- **Grid:** 12 columnas, 1200 px, grilla visible con divisores verticales.
- **Espaciado base:** 8 px
- **Profundidad:** Sin sombras; bloques planos y divisores.
- **Iconografía:** Línea 1.5 px, geométricos, cuadrados. Lucide.

### Estructura de la web

Web corporativa B2G/B2B: servicios, proyectos, Casco Peatonal y contacto para alianzas.

**Mapa del sitio:** Inicio → Qué hacemos (servicios) → Proyectos → Casco Peatonal (agenda) → Aliados → Nosotros → Contacto / Alianzas

**Hero:** Foto de skyline B/N, 'LA CIUDAD ESTÁ CAMBIANDO.' con 'CAMBIANDO.' en Ochre, y CTA 'Trabajemos juntos'.

**Secciones clave:**
- Servicios en grid de iconos
- Proyectos con cifras
- Agenda Casco Peatonal
- Aliados (logos)
- Formulario de alianzas

**Funcionalidades:**
- Agenda de actividades
- Portafolio de proyectos
- Formulario de propuestas

## Fotografía e imagen

- **Qué fotografiar:** Ciudad de Panamá: skyline, Casco Antiguo, calles peatonales, montajes, gente disfrutando el espacio público. Arquitectura y patrimonio.
- **Tratamiento:** Desaturado o B/N con toque cálido; atardeceres dorados para piezas emocionales.
- **Evitar:** Fotos de fiesta nocturna, stock genérico, filtros saturados.

**Elementos gráficos:**
- UDP gigante en Concrete detrás del contenido
- Etiqueta negra con texto blanco ('TODO RESUELTO.')
- Iconos de línea en fila con divisores verticales
- Línea Ochre corta bajo titulares
- Bandera de Panamá pequeña

## Motion

- **Principios:** Ordenado y preciso · Textos que entran por bloques · Timelapses de montaje
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`
- **Duraciones:** 250 ms UI · 500 ms bloques
- **Animación firma:** La palabra clave se tiñe de Ochre de izquierda a derecha.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| Claim | 4:5 | Foto de ciudad oscura, titular Poppins 900 blanco con palabra clave Ochre, categorías abajo. |
| Servicios | Carrusel 4:5 | Blanco, '¿QUÉ HACEMOS EN UDP?', grid de iconos con etiquetas, UDP gigante Concrete de fondo. |
| Agenda Casco Peatonal | 4:5 | Fecha y horario grandes, actividades con iconos, logo UDP al pie. |
| Montaje | Reel 9:16 | Timelapse de calle vacía a evento lleno con texto en bloques. |

## Voz

Institucional, claro y visionario. Frases contundentes y cortas.

**Titulares de referencia:**
- "La ciudad está cambiando."
- "No organizamos eventos… construimos experiencias urbanas."
- "Un solo equipo. Un solo sistema."
- "El Casco cambia. Y tú lo vas a vivir."

**Palabras que sí:** ciudad, experiencia urbana, gestión integral, patrimonio, alianza
**Palabras que no:** fiesta, rumba, VIP, jerga de nightlife

## Reglas

**Siempre:**
- Claims de marca
- UDP gigante de fondo
- Ochre solo en la palabra clave
- Logo y bandera en cada pieza

**Nunca:**
- Colores de nightlife
- Textos largos sin jerarquía
- Stock genérico
- Más de un acento por pieza
