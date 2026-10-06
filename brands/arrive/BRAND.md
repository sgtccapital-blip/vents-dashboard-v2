# ARRIVE — Línea gráfica

> Talent & Experiences Agency · @Arrive.models
> **We make it happen.**

Fuente de verdad: `brands/arrive/brand.json`. Tokens para web: `brands/arrive/tokens.css`.
Brandbook visual: `/brands/arrive/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**El talento correcto, en el lugar correcto, con la producción correcta.**

La agencia de talento y experiencias más profesional de Panamá: representa modelos e influencers emergentes y los convierte en resultados para marcas, venues y eventos.

**Personalidad:** Profesional · Aspiracional · Exigente · Cálida · Discreta

**Valores:**
- Estándar alto en cada entrega
- Cuidar al talento
- Resultados medibles para las marcas
- Elegancia sin exceso

## Logo

- **Wordmark:** ARRIVE — descriptor "TALENT & EXPERIENCES"
- **Símbolo:** Wordmark tipográfico. Monograma secundario: la 'A' de ARRIVE dentro de un círculo fino para avatares y favicons.
- **Construcción:** ARRIVE en Montserrat SemiBold, mayúsculas, tracking +12%. Descriptor en Montserrat Medium al 22% del alto de la palabra, tracking +40%, centrado debajo con una línea fina de separación.
- **Área de respeto:** Altura de la letra 'A' en los cuatro lados.
- **Tamaño mínimo:** Digital 80 px de ancho · impreso 25 mm.

**Versiones:**
- Negro sobre blanco/marfil (principal)
- Blanco sobre negro
- Champagne sobre negro (solo piezas premium)
- Monograma A en círculo (avatar, favicon, marca de agua)

**Usos incorrectos:**
- No usar 'MODEL MANAGEMENT' como descriptor si la cuenta pasa a agencia completa
- No aplicar degradados, sombras ni contornos
- No usar el champagne sobre blanco (pierde contraste)
- No deformar ni cambiar el tracking del wordmark

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-ink` | Ink | `#0A0A0A` | Primario | Texto, logo, fondos de piezas nocturnas. |
| `--brand-paper` | Paper | `#FFFFFF` | Primario | Fondos web, logo invertido. |
| `--brand-ivory` | Ivory | `#F5F1EA` | Secundario | Fondos editoriales, tarjetas de talento, secciones alternas. |
| `--brand-champagne` | Champagne | `#C8A96A` | Acento | Detalles premium: líneas, números, hover, CTA sobre negro. Máximo 10% de la pieza. |
| `--brand-stone` | Stone | `#8A857C` | Neutro | Texto secundario, metadatos, bordes. |
| `--brand-smoke` | Smoke | `#E7E2D9` | Neutro | Bordes y divisores sobre marfil. |

**Roles de interfaz:** fondo `#FFFFFF` · superficie `#F5F1EA` · texto `#0A0A0A` · secundario `#8A857C` · acento `#C8A96A` (texto sobre acento `#0A0A0A`).

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Montserrat | 500, 600, 700 | MAYÚSCULAS · tracking 0.12em | Wordmark, títulos de sección, botones, etiquetas. |
| secondary | Cormorant Garamond (itálica) | 400, 500 | normal · tracking 0 | Titulares editoriales, nombres de talento, citas. Siempre en itálica. |
| body | Inter | 400, 500, 600 | normal · tracking 0 | Texto corrido web, captions largos, formularios. |

Cargar: `https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 2px
- **Botones:** Rectangular, Montserrat 600 mayúsculas tracking 0.16em. Primario negro con texto blanco; secundario contorno 1px negro. Hover: fondo champagne.
- **Grid:** 12 columnas, máx. 1240 px, márgenes generosos (80 px desktop / 20 px móvil).
- **Espaciado base:** 8 px
- **Profundidad:** Sin sombras: profundidad con color (marfil vs blanco) y líneas finas.
- **Iconografía:** Iconos de línea fina (1.5 px), esquinas rectas, monocromos. Set recomendado: Lucide o Phosphor Light.

### Estructura de la web

Web de agencia de talento: portafolio filtrable de talento + casos de marca + formulario de booking.

**Mapa del sitio:** Inicio → Talento (roster filtrable) → Perfil de talento → Experiencias & activaciones → Casos → Agencia → Casting → Contacto / Booking

**Hero:** Video vertical de talento en loop a la derecha; a la izquierda 'We make it happen.' en Cormorant itálica gigante y CTA 'Book talent'.

**Secciones clave:**
- Roster destacado en grid 4:5
- Marcas con las que trabajamos (logos en gris)
- Casos con cifra grande en champagne
- Casting abierto
- Footer negro con monograma

**Funcionalidades:**
- Filtro de talento por tipo/altura/ciudad
- Comp card descargable en PDF
- Formulario de booking con fechas

## Fotografía e imagen

- **Qué fotografiar:** Retrato editorial de moda: luz natural suave de día o luz cálida de venue de noche. Piel cuidada, poses seguras, encuadres limpios con aire alrededor.
- **Tratamiento:** Color cálido y neutro, contraste medio, negros profundos sin aplastar. Opción B/N para comp cards.
- **Evitar:** Fotos de celular con flash, encuadres apretados, filtros de color fuertes, poses vulgares.

**Elementos gráficos:**
- Líneas finas de 1 px en champagne o negro como divisores
- Numeración editorial (01, 02, 03) en Montserrat
- Nombre del talento en Cormorant itálica + ciudad/medidas en Montserrat pequeño
- Marcos con mucho margen blanco/marfil

## Motion

- **Principios:** Lento y seguro: nada rebota · Fundidos y deslizamientos cortos (16–24 px) · Reveal del nombre del talento letra a letra
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`
- **Duraciones:** 240 ms UI · 600–900 ms reveals
- **Animación firma:** El wordmark aparece con tracking que se cierra de 0.4em a 0.12em.

## Redes sociales

**Grilla:** Alternar foto de talento (marfil/cálida) con pieza tipográfica negra cada 3 posts. Portadas de reels con nombre en Cormorant.

| Plantilla | Formato | Especificación |
|---|---|---|
| Talent card | 4:5 · 1080×1350 | Foto a sangre, banda inferior marfil con nombre en Cormorant itálica 64 px y datos en Montserrat 18 px. |
| Case study | Carrusel 4:5 | Portada negra con titular Montserrat + cifra en champagne; slides con resultado, proceso, fotos. |
| Event recap | Reel 9:16 | Cortes de 1–2 s, cierre con monograma A y @handle. |
| Casting call | Story 9:16 | Fondo marfil, 'NOW CASTING' en Montserrat, requisitos en Inter, sticker de link. |

## Voz

Seguro, cálido y profesional. Habla de resultados y de personas. Frases cortas, sin exclamaciones.

**Titulares de referencia:**
- "We make it happen."
- "Talento que se nota."
- "Conoce a la nueva cara de ARRIVE."
- "Una noche, 12 piezas de contenido, un local lleno."

**Palabras que sí:** talento, booking, activación, producción, resultados
**Palabras que no:** perreo, chicas lindas, la mejor rumba, emojis en titulares

## Reglas

**Siempre:**
- Mucho aire y márgenes
- Etiquetar al talento y a la marca
- Champagne solo como acento
- Nombre del talento en Cormorant itálica

**Nunca:**
- Saturar de color
- Texto encima de caras
- Tono de fiesta
- Más de dos tipografías por pieza
