# THE ROOM — Línea gráfica

> Social Club · @theroom.social · 454 seguidores
> **Members of the night.**

Fuente de verdad: `brands/the-room/brand.json`. Tokens para web: `brands/the-room/tokens.css`.
Brandbook visual: `/brands/the-room/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**Un club privado que aparece por una noche: exclusivo, oscuro y elegante.**

La fiesta más exclusiva de Panamá: club social itinerante de reggaetón, hits y crossover con estética de lujo nocturno y acceso controlado.

**Personalidad:** Exclusiva · Misteriosa · Sensual · Elegante · Selectiva

**Valores:**
- Acceso, no masa
- Detalle en todo
- Hospitalidad de club privado
- Discreción

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/the-room/logo/primary.svg`, `brands/the-room/logo/inverse.svg`, `brands/the-room/logo/on-accent.svg`, `brands/the-room/logo/symbol.svg`, `brands/the-room/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** Búho de línea fina con sombrero de copa y monóculo con cadena. Va de pie entre THE y ROOM, con las patas sobre la línea base y el sombrero por encima de la altura de mayúsculas. Solo, funciona como sello.
- **Construcción:** THE y ROOM en didona condensada de alto contraste (Bodoni Moda comprimida al ~78%), mayúsculas. El búho ocupa el espacio entre ambas palabras. "Social Club" en sans geométrica regular, centrado debajo a ~25% del alto de las mayúsculas.
- **Área de respeto:** Altura del sombrero del búho alrededor.
- **Tamaño mínimo:** Lockup 140 px · búho solo 24 px.

**Versiones:**
- Crema sobre Noir (principal)
- Crema sobre Bordeaux
- Búho solo (sello, favicon, pulsera)
- Noir sobre Cream (impresos de día)

**Usos incorrectos:**
- No separar el búho del wordmark en el lockup principal
- No usar el búho en colores fuera de paleta
- No poner el logo sobre fotos sin oscurecer
- No usar sans pesadas junto al logo

## Instagram

- **Bio:** The Room Social Club ® / Most exclusive party 🍸 / Reggaeton & Hits / ⬇️ TICKETS ⬇️
- **Highlights:** Ediciones, Tickets, VIP, Partners
- **Grilla:** Feed rojo/negro uniforme con el búho siempre centrado. Ciclo por edición: anuncio → lineup → recordatorio → noche → recap.

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-noir` | Noir | `#0B0505` | Primario | Fondo principal. |
| `--brand-bordeaux` | Bordeaux | `#7A0E0E` | Primario | Fondos de flyer, degradados, terciopelo. |
| `--brand-ember` | Ember Red | `#C1121F` | Acento | Destellos de luz, líneas, hover. Poco y preciso. |
| `--brand-cream` | Cream | `#E8DCCB` | Primario | Logo, titulares y textos sobre oscuro. |
| `--brand-rose` | Rosé Marble | `#B76E6E` | Secundario | Texturas de mármol, ediciones en venues claros (Terraplén). |
| `--brand-gold` | Antique Gold | `#B08D57` | Acento | Detalles de invitación VIP, pulseras, foil. |

**Roles de interfaz:** fondo `#0B0505` · superficie `#1C0A0A` · texto `#E8DCCB` · secundario `#B76E6E` · acento `#C1121F` (texto sobre acento `#FFFFFF`).

**Degradados:**
- Velvet: `radial-gradient(ellipse at 50% 35%, #7A0E0E 0%, #3A0707 45%, #0B0505 80%)`
- Ember flare: `linear-gradient(90deg, transparent 0%, #C1121F 50%, transparent 100%)`

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Bodoni Moda | 400, 500, 700 | MAYÚSCULAS · tracking 0.04em | Wordmark y titulares grandes. |
| secondary | Josefin Sans | 300, 400, 600 | MAYÚSCULAS · tracking 0.32em | Datos: fecha, venue, lineup, 'till late', géneros. |
| body | Josefin Sans | 300, 400 | normal · tracking 0.02em | Texto web, condiciones, captions. |

Cargar: `https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;700&family=Josefin+Sans:wght@300;400;600&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 0px
- **Botones:** Contorno 1px crema, Josefin Sans mayúsculas tracking 0.32em. Hover: fondo crema con texto Noir.
- **Grid:** Composición centrada y simétrica; 8 columnas, 1120 px.
- **Espaciado base:** 8 px
- **Profundidad:** Sin sombras; profundidad con viñeta y luz roja.
- **Iconografía:** Casi sin iconos; cuando haga falta, línea fina 1 px en crema.

### Estructura de la web

Web de club privado: próxima edición, venta de tickets/mesas y archivo de noches.

**Mapa del sitio:** Inicio (próxima edición) → Tickets & VIP → Mesas (mapa y paquetes) → Ediciones pasadas (galería) → Guest list → Partners → Contacto

**Hero:** Fondo Velvet con el búho animado al centro, fecha de la próxima edición y botón 'Request access'.

**Secciones clave:**
- Próxima edición con lineup
- Paquetes de mesa
- Galería de recaps
- Partners
- Dress code y política

**Funcionalidades:**
- Compra de tickets (Passline)
- Reserva de mesa con paquetes
- Guest list con aprobación

## Fotografía e imagen

- **Qué fotografiar:** Detalles de lujo: tacones, copas, botellas con bengala, manos con anillos, siluetas en luz roja. Gente bien vestida, de espaldas o en penumbra.
- **Tratamiento:** Viraje rojo/vino, sombras profundas, viñeta, grano de película. Piel cálida.
- **Evitar:** Flash directo, fotos de multitud desordenada, colores fríos, barra libre.

**Elementos gráficos:**
- Línea de luz Ember horizontal (flare)
- Textura de mármol rosado o terciopelo
- Separadores '|' finos entre datos
- Patrocinadores en crema pequeño al pie
- Marco fino tipo invitación

## Motion

- **Principios:** Lento y sensual · Reveals desde la oscuridad · Luz roja que barre
- **Easing:** `cubic-bezier(0.65, 0, 0.35, 1)`
- **Duraciones:** 800–1200 ms reveals · 300 ms UI
- **Animación firma:** El búho parpadea (monóculo brilla) y el wordmark aparece desde negro.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| Flyer de edición | 4:5 · 1080×1350 | Velvet de fondo, fecha arriba (Josefin), lockup al centro, géneros en Josefin tracking 0.32em, lineup, venue y patrocinadores al pie. |
| Flyer animado | Reel 9:16 | Reveal del búho → wordmark → datos línea a línea → flare rojo. 8–10 s. |
| Recap | Reel 9:16 | Detalles de lujo en slow motion, cierre con búho. |
| Countdown | Story 9:16 | '3 NIGHTS LEFT' en Bodoni, sticker de tickets. |

## Voz

Pocas palabras, mucha actitud. Habla como club privado: invitados, acceso, esta noche.

**Titulares de referencia:**
- "Members of the night."
- "Esta noche, solo invitados."
- "La última edición se agotó."
- "Till late."

**Palabras que sí:** acceso, invitados, edición, mesa, till late
**Palabras que no:** 2x1, barra libre, promo, la más loca

## Reglas

**Siempre:**
- Búho y wordmark centrados
- Datos en Josefin con mucho tracking
- Paleta roja/negra/crema siempre
- Link de tickets visible

**Nunca:**
- Sans pesadas
- Colores fríos o neón
- Flyers saturados
- Tono de promoción barata
