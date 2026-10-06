# URBAN NIGHTS — Línea gráfica

> Live Urban Shows · Panamá · @Urbannights.pa · 178 seguidores
> **Los mejores artistas urbanos. En vivo.**

Fuente de verdad: `brands/urban-nights/brand.json`. Tokens para web: `brands/urban-nights/tokens.css`.
Brandbook visual: `/brands/urban-nights/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**El escenario de la música urbana panameña: artistas en vivo, noche de calle premium.**

La serie de shows urbanos en vivo de Panamá: un artista invitado por noche, DJs de reggaetón y dembow, y producción de concierto en club.

**Personalidad:** Poderosa · Callejera premium · Directa · Orgullosa · Ruidosa

**Valores:**
- El artista en el centro
- Orgullo panameño
- Show de verdad
- Calle con estándar

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/urban-nights/logo/primary.svg`, `brands/urban-nights/logo/inverse.svg`, `brands/urban-nights/logo/on-accent.svg`, `brands/urban-nights/logo/symbol.svg`, `brands/urban-nights/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** Wordmark de bloque cortado por una franja horizontal a media altura (efecto stencil). URBAN va dentro de un rectángulo de contorno; NIGHTS debajo, sin caja.
- **Construcción:** URBAN / NIGHTS en Russo One con una franja del color de fondo que corta cada línea a media altura (≈8% del alto). Caja de contorno solo alrededor de URBAN, grosor igual a la franja.
- **Área de respeto:** Grosor del borde ×2 alrededor.
- **Tamaño mínimo:** 56 px de ancho.

**Versiones:**
- Negro en caja sobre blanco (avatar)
- Blanco en caja sobre negro
- Siren Red cromado (flyers)
- Monocromo para patrocinios

**Usos incorrectos:**
- No usar el búho ni la paleta de The Room
- No usar serifas
- No quitar la caja en el avatar
- No usar más de un efecto (cromo o sólido, no ambos más sombra)

## Instagram

- **Bio:** Urban Nights ® / 🇵🇦 LOS MEJORES ARTISTAS URBANOS / COMING SOON 🔜
- **Highlights:** Artistas, Shows, Tickets, VIP
- **Grilla:** Flyer de artista (rojo/negro) → video del artista invitando → recap. Siempre un artista en primer plano.

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-black` | Black | `#000000` | Primario | Fondo. |
| `--brand-white` | White | `#FFFFFF` | Primario | Logo, datos. |
| `--brand-siren` | Siren Red | `#E10600` | Primario | Titulares, nombre del artista, CTA. |
| `--brand-chrome` | Chrome | `#8A8A8A` | Secundario | Efecto metálico, bordes, texto secundario. |
| `--brand-asphalt` | Asphalt | `#1A1A1A` | Neutro | Superficies, tarjetas. |
| `--brand-flag-blue` | Canal Blue | `#0A3A8C` | Acento | Guiños patrios (bandera) en fechas especiales. |

**Roles de interfaz:** fondo `#000000` · superficie `#1A1A1A` · texto `#FFFFFF` · secundario `#8A8A8A` · acento `#E10600` (texto sobre acento `#FFFFFF`).

**Degradados:**
- Chrome red: `linear-gradient(180deg, #FF4A3D 0%, #E10600 45%, #7A0300 55%, #FF6B5E 100%)`
- Skyline night: `linear-gradient(180deg, #000000 0%, #1A1A1A 60%, #3A0300 100%)`

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Big Shoulders Display | 800, 900 | MAYÚSCULAS · tracking 0 | Logo, nombre del artista, fecha. |
| logo | Russo One | 400 | MAYÚSCULAS · tracking 0 | Solo wordmark URBAN NIGHTS. |
| secondary | Barlow | 600, 700 | MAYÚSCULAS · tracking 0.18em | Datos: venue, hora, tickets, géneros. |
| body | Barlow | 400, 500 | normal · tracking 0 | Texto web y captions. |

Cargar: `https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Russo+One:wght@400&family=Barlow:wght@400;500;600;700&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 0px
- **Botones:** Rectangular Siren Red, Barlow 700 mayúsculas tracking 0.18em; secundario borde blanco 2 px.
- **Grid:** 12 columnas, 1280 px, artista recortado al centro.
- **Espaciado base:** 8 px
- **Profundidad:** Sombra dura: 6px 6px 0 #000 en tarjetas sobre fondos claros.
- **Iconografía:** Sólidos y gruesos. Phosphor Bold.

### Estructura de la web

Web de serie de conciertos urbanos: próximo artista, tickets, historial de shows.

**Mapa del sitio:** Inicio → Próximo show → Tickets & VIP → Artistas que han pasado → Galería / videos → Patrocinios → Contacto

**Hero:** Artista recortado sobre skyline nocturno, nombre gigante rojo cromado, fecha y 'Get tickets'.

**Secciones clave:**
- Próximo show
- Historial de artistas en grid
- Videos
- Patrocinadores
- Booking

**Funcionalidades:**
- Tickets (mieventos.com)
- Mesas VIP
- Formulario de patrocinio

## Fotografía e imagen

- **Qué fotografiar:** Artista recortado (PNG) con cadenas, gafas, actitud; skyline nocturno de Panamá; público con brazos arriba; humo rojo.
- **Tratamiento:** Contraste alto, rojos profundos, negros puros, nitidez fuerte, toque de cromo.
- **Evitar:** Fondos claros, poses suaves, estética de lujo minimalista.

**Elementos gráficos:**
- Nombre del artista gigante en rojo cromado
- Skyline de Ciudad de Panamá en silueta
- Barras de datos con separadores
- Logos de patrocinadores en blanco al pie

## Motion

- **Principios:** Letras que golpean · Shake en el drop · Flashes rojos
- **Easing:** `cubic-bezier(0.2, 0.9, 0.1, 1)`
- **Duraciones:** 150 ms golpes · 500 ms entradas
- **Animación firma:** El nombre del artista cae desde arriba y el cromo brilla al impactar.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| Artist drop | 4:5 | Skyline night, artista recortado, LIVE PERFORMANCE BY, nombre Big Shoulders 900 rojo cromado, URBAN NIGHTS, datos Barlow, tickets. |
| Artist invite | Reel 9:16 | Artista a cámara invitando, subtítulos grandes blanco con borde negro, logo al cierre. |
| Recap | Reel 9:16 | Momentos del show con shake y flashes, 15 s. |
| Tickets | Story 9:16 | Fecha gigante, 'TICKETS & VIP', link mieventos.com. |

## Voz

Fuerte, directo, orgulloso. Anuncio de concierto.

**Titulares de referencia:**
- "Los mejores artistas urbanos. En vivo."
- "Este sábado: DANNY YASH"
- "Panamá suena así."
- "Tickets & VIP ya."

**Palabras que sí:** en vivo, show, artista, tickets, Panamá
**Palabras que no:** exclusivo, elegante, chill, sunset

## Reglas

**Siempre:**
- Artista grande y legible
- Rojo + negro + cromo
- Datos ordenados en barra
- Tickets visibles

**Nunca:**
- Paleta de The Room
- Serifas
- Flyers sin jerarquía
- Fondos claros
