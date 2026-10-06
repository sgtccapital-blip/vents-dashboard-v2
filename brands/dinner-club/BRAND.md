# DINNER CLUB — Línea gráfica

> Dinner · Drinks · Party · @dinnerclub_pa · 450 seguidores
> **Reserva para cenar. Quédate para la fiesta.**

Fuente de verdad: `brands/dinner-club/brand.json`. Tokens para web: `brands/dinner-club/tokens.css`.
Brandbook visual: `/brands/dinner-club/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**La noche completa en un solo lugar: empieza en la mesa, termina en la pista.**

El plan de viernes y sábado para grupos y celebraciones en Ciudad de Panamá: cena cuidada, cócteles y fiesta de reggaetón, latin y electrónica sin cambiar de lugar.

**Personalidad:** Sofisticada · Cálida · Pícara · Anfitriona · Relajada

**Valores:**
- Hospitalidad
- Buena mesa
- Celebrar con los tuyos
- Transición perfecta

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/dinner-club/logo/primary.svg`, `brands/dinner-club/logo/inverse.svg`, `brands/dinner-club/logo/on-accent.svg`, `brands/dinner-club/logo/symbol.svg`, `brands/dinner-club/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** Wordmark DINNER con CLUB pequeño espaciado debajo, dentro de un círculo (como el avatar actual). Monograma secundario 'DC' para servilletas, platos y sellos.
- **Construcción:** Círculo blanco; DINNER en Source Sans 3 Bold mayúsculas centrado; CLUB en Source Sans 3 Regular al 35% del alto con tracking +45%, centrado debajo. Todo en Ink.
- **Área de respeto:** Altura de la 'D' alrededor.
- **Tamaño mínimo:** 64 px de ancho.

**Versiones:**
- Ink sobre blanco en círculo (principal)
- Blanco sobre Ink
- Ink sobre Linen
- Monograma DC (sello)

**Usos incorrectos:**
- No usar colores saturados o neón
- No agregar copas o cubiertos al logo
- No poner el logo sobre fotos de fiesta sin caja
- No condensar el wordmark

## Instagram

- **Bio:** Dinner Club Panama / Reggaeton • Latin • Electronic / BEST PARTIES IN TOWN 🌃 / 📍 Panama City / 📩 Reservations & Guest List DM
- **Highlights:** Menú, Noches, Reservas, Cumples
- **Grilla:** Lanzamiento con grilla de 9: alternar Linen (mesa) y Ink (fiesta) en damero.

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-ink` | Ink | `#0B0B0B` | Primario | Logo, texto, fondos de noche. |
| `--brand-white` | White | `#FFFFFF` | Primario | Fondos, logo invertido. |
| `--brand-linen` | Linen | `#F4EFE6` | Secundario | Fondos web, menús, tarjetas. |
| `--brand-walnut` | Walnut | `#8C6A43` | Acento | Detalles cálidos: líneas, precios, hover. |
| `--brand-candle` | Candle | `#E9B872` | Acento | Luz de vela en piezas de noche, CTA sobre negro. |
| `--brand-olive` | Olive | `#4B4F3A` | Neutro | Secciones de menú, toques de restaurante. |

**Roles de interfaz:** fondo `#F4EFE6` · superficie `#FFFFFF` · texto `#0B0B0B` · secundario `#4B4F3A` · acento `#8C6A43` (texto sobre acento `#FFFFFF`).

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Source Sans 3 | 600, 700, 800 | MAYÚSCULAS · tracking 0.01em | Logo (DINNER en 700), titulares, navegación. |
| secondary | Playfair Display (itálica) | 400, 500 | normal · tracking 0 | Frases de hospitalidad, nombres de platos y cócteles. |
| body | Source Sans 3 | 300, 400 | normal · tracking 0.01em | Texto web, menús, captions. |

Cargar: `https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 999px
- **Botones:** Píldora Ink con texto blanco Outfit 700 mayúsculas tracking 0.14em; secundario contorno Ink. Hover: Walnut.
- **Grid:** 12 columnas, 1180 px, mucho aire tipo menú impreso.
- **Espaciado base:** 8 px
- **Profundidad:** Muy suave: 0 10px 30px rgba(11,11,11,0.08) en tarjetas sobre Linen.
- **Iconografía:** Línea fina 1.25 px, redondeada. Phosphor Light.

### Estructura de la web

Web de restaurante-club: menú, noches temáticas y reservas para grupos y celebraciones.

**Mapa del sitio:** Inicio → Menú (cena y cócteles) → Noches (calendario) → Celebraciones / grupos → Reservas → Galería → Contacto

**Hero:** Split vertical: mitad mesa con vela (Linen), mitad pista (Ink); al centro el logo en círculo y 'Reserva para cenar. Quédate para la fiesta.'

**Secciones clave:**
- Menú destacado
- Calendario de noches
- Paquetes de cumpleaños
- Reservas
- Galería

**Funcionalidades:**
- Reservas con número de personas y ocasión
- Menú web
- Paquetes de celebración

## Fotografía e imagen

- **Qué fotografiar:** Mesa servida desde arriba, cócteles a contraluz de vela, manos brindando, grupo riendo en la mesa, luego pista en penumbra.
- **Tratamiento:** Cálido y suave en la cena (madera, vela); más contraste en la fiesta. Grano fino, negros cálidos.
- **Evitar:** Flash sobre comida, colores fríos, fotos de multitud masiva.

**Elementos gráficos:**
- Círculo del logo como marco
- Líneas finas tipo menú con precios en Walnut
- Itálicas Playfair para nombres
- Split vertical cena | fiesta

## Motion

- **Principios:** Primera mitad pausada, segunda al beat · Transición cena → fiesta en el drop · Fundidos cálidos
- **Easing:** `cubic-bezier(0.45, 0, 0.2, 1)`
- **Duraciones:** 300 ms UI · 700 ms transiciones
- **Animación firma:** Una vela se apaga y se prende la luz de la pista.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| De cena a fiesta | Reel 9:16 | Mitad lenta en mesa (lounge) → corte en el drop a la pista (reggaetón). Logo en círculo al cierre. |
| Plato / cóctel | 4:5 | Foto cenital, nombre en Playfair itálica, descripción breve Outfit. |
| Flyer de fecha | 4:5 | Linen, logo en círculo, 'VIERNES' Outfit 800, línea Walnut, 'Reservations & guest list DM'. |
| Reserva | Story 9:16 | Encuesta '¿Cuántos son?' + botón DM. |

## Voz

Anfitrión elegante con picardía. Invita, no grita.

**Titulares de referencia:**
- "Reserva para cenar. Quédate para la fiesta."
- "La mesa que todos quieren esta noche."
- "Cuando la cena tranquila termina así…"
- "Celebra aquí."

**Palabras que sí:** mesa, reserva, celebrar, esta noche, guest list
**Palabras que no:** perreo, full, barra libre, mega fiesta

## Reglas

**Siempre:**
- Siempre la dualidad cena + fiesta
- Paleta B/N + cálidos
- Itálica Playfair en nombres
- Reservas por DM visibles

**Nunca:**
- Neón y saturados
- Estética de fiesta masiva
- Comida con flash
- Más de un acento cálido por pieza
