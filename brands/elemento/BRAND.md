# ELEMENTO — Línea gráfica

> Techno · House · Electronic · @Elemento.techno · 14.8K seguidores
> **Where movement becomes sound.**

Fuente de verdad: `brands/elemento/brand.json`. Tokens para web: `brands/elemento/tokens.css`.
Brandbook visual: `/brands/elemento/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**El movimiento convertido en sonido: la electrónica como experiencia física y visual.**

Plataforma de música electrónica desde Panamá: curaduría de momentos y artistas internacionales, música propia y eventos con estándar de festival.

**Personalidad:** Inmersiva · Minimalista · Futurista · Precisa · Nocturna

**Valores:**
- La música primero
- Respeto por el artista
- Producción de nivel festival
- Comunidad sin pose

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/elemento/logo/primary.svg`, `brands/elemento/logo/inverse.svg`, `brands/elemento/logo/on-accent.svg`, `brands/elemento/logo/symbol.svg`, `brands/elemento/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** La 'E' cromada en itálica con destello azul (símbolo actual). Funciona sola como avatar, sello de video y favicon.
- **Construcción:** E itálica (≈24°) de tres barras con la esquina superior izquierda redondeada y terminaciones en ángulo; acabado cromado (degradado plata con quiebre oscuro al centro) y destello azul en la punta de la barra superior. Lockup: E + ELEMENTO en Unbounded SemiBold.
- **Área de respeto:** Medio ancho de la 'E' alrededor.
- **Tamaño mínimo:** Símbolo 24 px · lockup 120 px.

**Versiones:**
- Símbolo cromado sobre Void (principal)
- Símbolo plano blanco (sellos en video)
- Lockup horizontal blanco
- Símbolo Pulse Blue para UI

**Usos incorrectos:**
- No poner el símbolo cromado sobre fondos claros
- No cambiar la inclinación de la E
- No combinar con colores cálidos
- No usar el glow azul en texto corrido

## Instagram

- **Bio:** Elemento Techno / D.A.N.C.E. / Where movement becomes sound / Electronic · Techno · House 🎧
- **Highlights:** Spotify, SoundCloud, YouTube, Demos
- **Grilla:** Feed oscuro uniforme: todas las portadas en Void con un punto de luz azul. Lineups como carruseles con portada tipográfica.

## Línea de contenido

Fuente: `brands/elemento/content.json`.

**Lo que ya publica la cuenta:** Reels de momentos de festival y club (escenario, multitud, DJ en cabina) con overlay de artista, venue y fecha centrado arriba ('NICO MORENO @ Complex Maastricht 29-12-2022') y palabras gigantes como 'Coachella'. Casi todo es video vertical con el audio real del set y sin subtítulos.

**Mezcla:** Reels de momentos 55% (organic) · Spotlight de artistas 20% (organic) · Lineups y anuncios 10% (graphic) · Stories: track ID, música, repost 15% (stories)

### Video (la mayoría del contenido)

- **Duración:** Momentos 7–12 s en loop · spotlights 20–35 s · recaps 30–45 s
- **Gancho:** Arranca en el drop: el primer frame ya es el pico (luces, brazos arriba, escenario). Nada de intros ni logos al inicio.
- **Estructura:** 0–1 s Drop (Pico de energía + overlay del artista) → 1–8 s Inmersión (Tomas largas de escenario y luz) → 8–11 s Detalle (Cabina, manos, multitud) → Final Loop (El último frame empata con el primero)
- **Cámara:** Tomas largas y estables desde la multitud o desde atrás de la cabina. Gran angular para escenarios monumentales; zoom para luces y siluetas.
- **Color:** Viraje frío: negros azulados, altas luces azules, pieles poco saturadas, grano fino.
- **Transiciones:** Cortes secos al beat. Como mucho un flash azul de 2 frames en el drop.
- **Texto sobre video:** Artista en Unbounded mayúsculas + '@ VENUE · FECHA' en Space Grotesk, blanco, centrado en el tercio superior. Ejemplo: "LIVE AT / NICO MORENO / COMPLEX · MAASTRICHT · 29.12"
- **Subtítulos:** Sin subtítulos: el audio es la música. En entrevistas, subtítulo por frase en Space Grotesk blanco, minúsculas, pequeño, abajo.
- **Portada:** Frame oscuro del escenario con un solo punto de luz azul + nombre del artista en Unbounded. Todas las portadas oscuras para que la grilla sea uniforme.
- **Cierre:** Sin pantalla final: la E cromada pequeña en la esquina del último segundo y el crédito del track en el caption.
- **Música:** Audio real del set siempre. Nunca música de librería encima de un set.

### Orgánico

- Grabar el momento, no la pose: el escenario y la gente son la historia
- Todo en 9:16 nativo
- Grabar 3–5 s antes y después del drop para poder hacer loop
- Acreditar siempre al artista y al promotor

**Lista de tomas:** Escenario completo con láseres · Drop con brazos arriba · DJ desde atrás de la cabina · Manos en el mixer · Silueta a contraluz · Luces y humo en detalle · Entrada del venue · Público desde arriba

### Historias

- Fondo Void con un solo acento azul
- Track ID y links a Spotify/SoundCloud como sticker
- Repost de quienes etiquetan, con marco oscuro

Set de gráficos: anuncio ("SÁBADO 14 · LIVE SET"), cuenta regresiva ("PRÓXIMO SET"), encuesta ("¿Cuál fue el track de la noche?" → El drop 🔊 / El cierre), repost con marco de marca y link ("ESCUCHAR SET").

### Semana tipo

- **Lun:** Reel momento del fin de semana
- **Mié:** Spotlight de artista
- **Vie:** Reel momento + story track ID
- **Sáb:** Stories en vivo del evento
- **Dom:** Recap de 30 s

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-void` | Void | `#05070F` | Primario | Fondo principal de todo: web, posts, video. |
| `--brand-abyss` | Abyss | `#0B1A3A` | Secundario | Superficies, tarjetas, degradados de profundidad. |
| `--brand-pulse` | Pulse Blue | `#2F6BFF` | Acento | Glow, enlaces, CTA, ecualizadores, detalles de luz. |
| `--brand-chrome` | Chrome | `#C9D3E0` | Secundario | Texto secundario, metálicos, bordes. |
| `--brand-white` | White | `#FFFFFF` | Primario | Titulares y texto principal. |
| `--brand-ice` | Ice | `#8FB3FF` | Acento | Hover y brillos secundarios. |

**Roles de interfaz:** fondo `#05070F` · superficie `#0B1A3A` · texto `#FFFFFF` · secundario `#C9D3E0` · acento `#2F6BFF` (texto sobre acento `#FFFFFF`).

**Degradados:**
- Deep field: `radial-gradient(ellipse at 50% 0%, #0B1A3A 0%, #05070F 70%)`
- Chrome: `linear-gradient(180deg, #FFFFFF 0%, #C9D3E0 45%, #6B7A90 55%, #E6ECF5 100%)`

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Unbounded | 500, 600, 800 | MAYÚSCULAS · tracking 0.06em | Titulares, nombres de artistas, lineups. |
| secondary | Space Grotesk | 400, 500, 700 | MAYÚSCULAS · tracking 0.2em | Metadatos: venue, fecha, ciudad, etiquetas. |
| body | Space Grotesk | 400, 500 | normal · tracking 0 | Texto corrido y captions. |
| mono | JetBrains Mono | 400, 500 | MAYÚSCULAS · tracking 0.08em | Track IDs, BPM, tiempos, coordenadas. |

Cargar: `https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;800&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 0px
- **Botones:** Rectangular sin radio, borde 1px Pulse Blue, texto Space Grotesk mayúsculas tracking 0.2em; hover con glow azul.
- **Grid:** 12 columnas a pantalla completa, 1440 px máx., mucho espacio negativo.
- **Espaciado base:** 8 px
- **Profundidad:** Glow: 0 0 40px rgba(47,107,255,0.35) solo en elementos activos.
- **Iconografía:** Iconos geométricos de línea 1 px, terminaciones rectas. Phosphor Thin.

### Estructura de la web

Web inmersiva de sello/plataforma: eventos, artistas, música y archivo de momentos.

**Mapa del sitio:** Inicio → Eventos → Evento (lineup + tickets) → Artistas → Música (Spotify/SoundCloud embebido) → Archivo / Moments → Demos (envío de música) → Contacto

**Hero:** Video de escenario a pantalla completa con la E cromada al centro y 'Where movement becomes sound.' en Unbounded; reproductor flotante minimal.

**Secciones clave:**
- Próximo evento con cuenta regresiva en mono
- Grid de moments en video
- Playlists embebidas
- Formulario de demos

**Funcionalidades:**
- Reproductor persistente
- Cuenta regresiva
- Envío de demos con link

## Fotografía e imagen

- **Qué fotografiar:** Escenarios monumentales, láseres, humo, siluetas del público a contraluz, DJ en cabina desde atrás. Arquitectura de luz.
- **Tratamiento:** Negros azulados profundos, viraje frío, altas luces azules. Grano fino. Nunca colores cálidos dominantes.
- **Evitar:** Fotos de mesa/botellas, flashes directos, colores neón rosados o verdes, selfies.

**Elementos gráficos:**
- Línea de horizonte de luz (barra horizontal Pulse Blue con glow)
- Retícula técnica y coordenadas en mono
- Forma de onda/ecualizador minimal
- Símbolo E como marca de agua en esquina

## Motion

- **Principios:** Sincronizado al beat · Loops perfectos · Luz que barre de izquierda a derecha
- **Easing:** `cubic-bezier(0.7, 0, 0.3, 1)`
- **Duraciones:** Ritmo de 120–128 BPM: 470 ms por pulso
- **Animación firma:** La E aparece con un destello de luz azul que cruza el cromado.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| Moment | Reel 9:16 | Sin intro, abre en el drop. Overlay inferior: ARTISTA (Unbounded 56 px) / @ VENUE · FECHA (Space Grotesk 22 px). |
| Lineup | 4:5 · 1080×1350 | Fondo Deep field, nombres apilados en Unbounded, fecha en mono, línea de horizonte azul. |
| Artist spotlight | Carrusel 4:5 | Portada foto + nombre; slides: por qué importa, 3 tracks (mono), dónde verlo. |
| Track ID | Story 9:16 | Ecualizador animado, track en mono, sticker de link a Spotify. |

## Voz

Minimalista, inmersivo, con autoridad musical. Manifiesto corto. Nada de exclamaciones.

**Titulares de referencia:**
- "Where movement becomes sound."
- "D.A.N.C.E."
- "El momento exacto."
- "Sound first."

**Palabras que sí:** set, movimiento, sonido, escenario, track ID
**Palabras que no:** perreo, rumba, botellas, la mejor fiesta

## Reglas

**Siempre:**
- Siempre oscuro
- Acreditar artista, venue y track
- Un solo punto de luz azul por pieza
- Abrir en el momento de mayor energía

**Nunca:**
- Fondos claros
- Colores cálidos
- Plantillas con muchos elementos
- Música de librería sobre sets
