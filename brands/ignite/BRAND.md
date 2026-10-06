# IGNITE CLUB — Línea gráfica

> Latin · Reggaeton · Electronic · @theigniteclubb · 608 seguidores
> **Light it up.**

Fuente de verdad: `brands/ignite/brand.json`. Tokens para web: `brands/ignite/tokens.css`.
Brandbook visual: `/brands/ignite/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**La chispa que prende la noche: energía de club, producción de luces y mezcla de géneros.**

La fiesta de mayor energía de Panamá: producción LED y láser, latin, reggaetón y electrónica para una generación que sale a sudar.

**Personalidad:** Intensa · Eléctrica · Atrevida · Joven · Explosiva

**Valores:**
- Energía de principio a fin
- Producción que se siente
- Mezclar sin miedo
- Comunidad que vuelve

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/ignite/logo/primary.svg`, `brands/ignite/logo/inverse.svg`, `brands/ignite/logo/on-accent.svg`, `brands/ignite/logo/symbol.svg`, `brands/ignite/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** El wordmark apilado es el logo. Símbolo secundario: chispa/chile estilizado de 4 puntas para avatar y stickers.
- **Construcción:** IGNITE sobre CLUB en Archivo Black expandido (125%), mayúsculas, interlineado 0.9. CLUB alineado a la derecha bajo IGNITE. Rojo #E3262B sobre negro.
- **Área de respeto:** Altura de la 'C' alrededor.
- **Tamaño mínimo:** 60 px de ancho.

**Versiones:**
- Ignite Red sobre Night (principal)
- Blanco sobre Ignite Red
- Rojo con glow (pantallas LED)
- Chispa sola (avatar, sticker)

**Usos incorrectos:**
- No usar tipografías finas con el logo
- No poner el logo en amarillo (es de Hang Out)
- No separar IGNITE y CLUB en líneas desalineadas
- No usar el glow en impresos

## Instagram

- **Bio:** Ignite Club 🌶️ / BEST PARTIES IN TOWN 🌌 / 🎧 LATIN · REGGAETON · ELECTRONIC
- **Highlights:** Next, Lineup, Recaps, Mesas
- **Grilla:** Bloques de rojo intenso alternando con fotos de escenario azul. Siempre un elemento rojo por post.

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-night` | Night | `#0A0A0F` | Primario | Fondo de todo. |
| `--brand-red` | Ignite Red | `#E3262B` | Primario | Logo, titulares, CTA. El fuego. |
| `--brand-volt` | Volt Blue | `#1F3BFF` | Secundario | Luz de escenario, degradados, hover. El frío que hace brillar al rojo. |
| `--brand-ember` | Ember | `#FF6B1A` | Acento | Chispas, detalles de calor, stickers. |
| `--brand-white` | White | `#FFFFFF` | Primario | Datos, texto. |
| `--brand-magenta` | Laser Magenta | `#D62DFF` | Acento | Solo en láseres/visuales de video, nunca en tipografía. |

**Roles de interfaz:** fondo `#0A0A0F` · superficie `#16161F` · texto `#FFFFFF` · secundario `#9A9AB0` · acento `#E3262B` (texto sobre acento `#FFFFFF`).

**Degradados:**
- Stage: `linear-gradient(135deg, #1F3BFF 0%, #0A0A0F 50%, #E3262B 100%)`
- Heat: `radial-gradient(circle at 50% 100%, #FF6B1A 0%, #E3262B 30%, #0A0A0F 70%)`

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Archivo (ancho 125%) | 800, 900 | MAYÚSCULAS · tracking -0.01em | Logo, titulares, nombres de DJ, fechas grandes (Archivo expandido al 125%). |
| secondary | Archivo Narrow | 500, 700 | MAYÚSCULAS · tracking 0.12em | Datos: venue, hora, géneros. |
| body | Archivo | 400, 600 | normal · tracking 0 | Texto web y captions. |

Cargar: `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,400;100,600;125,800;125,900&family=Archivo+Narrow:wght@500;700&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 999px
- **Botones:** Píldora sólida Ignite Red, Archivo Black mayúsculas; hover con glow rojo y desplazamiento de 2 px.
- **Grid:** 12 columnas, 1280 px, composiciones diagonales y bloques grandes.
- **Espaciado base:** 8 px
- **Profundidad:** Glow rojo: 0 0 32px rgba(227,38,43,0.55) en CTA activos.
- **Iconografía:** Iconos sólidos gruesos. Phosphor Fill.

### Estructura de la web

Landing de eventos de alta energía con venta de entradas y galería de video.

**Mapa del sitio:** Inicio → Próxima Ignite (tickets) → Lineup → Galería / Videos → Mesas → Contacto

**Hero:** Video del escenario con el logo LED parpadeando, fecha gigante y CTA 'Get tickets' con glow.

**Secciones clave:**
- Cuenta regresiva
- Lineup en tarjetas
- Videos de ediciones pasadas
- FAQ (edad, dress code)

**Funcionalidades:**
- Tickets
- Cuenta regresiva
- Galería de video

## Fotografía e imagen

- **Qué fotografiar:** Escenario con pantallas LED, láseres, brazos arriba, DJ en el drop, público a contraluz rojo/azul.
- **Tratamiento:** Contraste alto, rojo y azul saturados, motion blur intencional, grano.
- **Evitar:** Fotos estáticas de pose, luz plana, estética elegante o minimalista.

**Elementos gráficos:**
- Chispas/destellos Ember
- Texto que se sale del encuadre (crop agresivo)
- Diagonales de luz azul
- Stickers redondos con 🌶️

## Motion

- **Principios:** Golpe en el drop (zoom-punch) · Flashes rojos · Glitch LED de 2–3 frames
- **Easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Duraciones:** 120–200 ms golpes · 600 ms entradas
- **Animación firma:** IGNITE se enciende como un tubo LED parpadeando antes de quedar fijo.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| Peak moment | Reel 9:16 | 8–12 s en loop, frase serif blanca arriba opcional, logo LED al final. |
| Flyer de edición | 4:5 | Fondo Stage, fecha gigante Archivo Black que se sale del borde, logo, DJs, datos en Narrow. |
| Teaser | Reel 9:16 | Logo encendiéndose + fecha + 🌶️. 5 s. |
| Recap | Carrusel 4:5 | Portada roja 'ASÍ SE PRENDIÓ', fotos de escenario. |

## Voz

Intenso, directo, de MC. Frases cortas que prenden.

**Titulares de referencia:**
- "Light it up."
- "Esta noche se prende 🌶️"
- "Así se prendió la última Ignite."
- "Ignite or go home."

**Palabras que sí:** prender, energía, drop, esta noche, 🌶️
**Palabras que no:** exclusivo, elegante, relax, tranqui

## Reglas

**Siempre:**
- Rojo siempre presente
- Tipografía gruesa y grande
- Azul solo como luz
- Loops cortos

**Nunca:**
- Amarillo/dorado (Hang Out)
- Serif de lujo (The Room)
- Fotos estáticas
- Espacios vacíos sin energía
