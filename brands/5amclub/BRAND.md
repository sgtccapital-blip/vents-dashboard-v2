# 5AM CLUB — Línea gráfica

> Finances & Markets · @__5amclub · 3.8K seguidores
> **Before the market opens.**

Fuente de verdad: `brands/5amclub/brand.json`. Tokens para web: `brands/5amclub/tokens.css`.
Brandbook visual: `/brands/5amclub/` en el dashboard. Este archivo se genera con `npm run brands`; no lo edites a mano.

## Esencia

**Lo que pasa en los mercados, explicado antes de que empiece tu día.**

Medio financiero en español para LATAM con la urgencia de un noticiero de mercados y la claridad de un buen profesor. Conecta con 5amclubagency.com.

**Personalidad:** Urgente · Clara · Confiable · Disciplinada · Global

**Valores:**
- Dato con fuente
- Explicar sin humo
- Disciplina (levantarse a las 5am)
- Independencia: no vendemos señales

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): `brands/5amclub/logo/primary.svg`, `brands/5amclub/logo/inverse.svg`, `brands/5amclub/logo/on-accent.svg`, `brands/5amclub/logo/symbol.svg`, `brands/5amclub/logo/avatar.svg`.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** Globo terráqueo de malla en violeta dentro de una corona de 16 cruces blancas (símbolo actual). Mercados globales + la hora en que empieza el día.
- **Construcción:** Símbolo arriba; debajo "5AM CLUB ©" en Krona One (sans ancha y pesada), blanco. El ancho del wordmark ≈ ancho de la corona. Versión horizontal: símbolo a la izquierda.
- **Área de respeto:** Altura de una estrella alrededor del lockup ×2.
- **Tamaño mínimo:** Símbolo 28 px · lockup 96 px.

**Versiones:**
- Blanco sobre Black (principal)
- Black sobre blanco
- Símbolo solo en violeta (sello de esquina)
- Horizontal para lower-thirds

**Usos incorrectos:**
- No usar el verde o rojo de mercado en el logo
- No girar el globo
- No poner el logo sobre gráficos con mucho ruido sin caja
- No quitar el ©

## Instagram

- **Bio:** 5am Club / Finances & more 🏦 / 📍 Panama / 5amclubagency.com
- **Highlights:** Mercados, Cripto, Macro, Agencia
- **Grilla:** Alternar breaking (negro + violeta) con explicador (navy). Cada post lleva fecha visible.

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
| `--brand-black` | Terminal Black | `#0A0A0A` | Primario | Fondo de noticias, pantallas, cajas de titular. |
| `--brand-white` | White | `#FFFFFF` | Primario | Titulares y texto. |
| `--brand-violet` | Globe Violet | `#6F52FF` | Acento de marca | Color del globo del logo: palabra clave del titular, sello, CTA, enlaces. No es señal de mercado. |
| `--brand-navy` | Wire Navy | `#0B3D91` | Secundario | Lower-thirds, banners institucionales, portadas macro. |
| `--brand-bull` | Bull Green | `#00C853` | Señal | Solo subidas (+%). |
| `--brand-bear` | Bear Red | `#E53935` | Señal | Solo bajadas (−%) y alertas. |
| `--brand-slate` | Slate | `#1C2230` | Neutro | Superficies y tarjetas en web. |

**Roles de interfaz:** fondo `#0A0A0A` · superficie `#1C2230` · texto `#FFFFFF` · secundario `#9AA3B2` · acento `#6F52FF` (texto sobre acento `#FFFFFF`).

## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
| display | Anton | 400 | MAYÚSCULAS · tracking 0.01em | Titulares breaking news, cifras gigantes. |
| logo | Krona One | 400 | MAYÚSCULAS · tracking 0.02em | Solo wordmark 5AM CLUB y sellos. |
| secondary | Inter | 600, 800 | MAYÚSCULAS · tracking 0.08em | Kickers ('BREAKING', 'MACRO'), lower-thirds, etiquetas. |
| body | Inter | 400, 500, 600 | normal · tracking 0 | Explicaciones, artículos web, captions. |
| mono | Roboto Mono | 400, 500, 700 | MAYÚSCULAS · tracking 0 | Tickers, precios, porcentajes, fechas y horas. |

Cargar: `https://fonts.googleapis.com/css2?family=Anton:wght@400&family=Krona+One:wght@400&family=Inter:wght@400;500;600;800&family=Roboto+Mono:wght@400;500;700&display=swap`

**Escala web (px):** Display XL 96 · Display L 64 · H1 48 · H2 32 · H3 / editorial 24 · Body L 18 · Body 16 · Label 12

## Interfaz y web

- **Radio:** 4px
- **Botones:** Sólido violeta con texto blanco Inter 800 mayúsculas; secundario borde blanco. Etiquetas de % en píldoras verde/rojo.
- **Grid:** 12 columnas, 1200 px, densidad de periódico digital.
- **Espaciado base:** 4 px
- **Profundidad:** Sutil: 0 2px 8px rgba(0,0,0,0.4) en tarjetas.
- **Iconografía:** Iconos sólidos simples (flechas, alertas, globo, banco). Phosphor Bold.

### Estructura de la web

Medio digital financiero + agencia: noticias, explicadores, newsletter de las 5am y servicios en 5amclubagency.com.

**Mapa del sitio:** Inicio (último minuto) → Mercados → Macro → Cripto → Explicadores → Newsletter 5AM → Agencia / Servicios → Sobre nosotros → Contacto

**Hero:** Ticker en vivo arriba, titular principal en Anton con imagen, y suscripción 'Recíbelo a las 5am' en violeta.

**Secciones clave:**
- Breaking en grid
- Explicadores destacados
- Calendario económico de la semana
- Newsletter
- Disclaimer financiero visible

**Funcionalidades:**
- Ticker de mercados
- Newsletter diaria
- Calendario económico
- Aviso legal: no es asesoría financiera

## Fotografía e imagen

- **Qué fotografiar:** Wall Street, pantallas de trading, gráficos de velas, bancos centrales, commodities (oro, petróleo). Escenas, no personas inventadas.
- **Tratamiento:** Alto contraste, fondos oscuros, verde/rojo saturados solo en gráficos. Imágenes IA permitidas para escenas y conceptos; nunca rostros reales fabricados.
- **Evitar:** Lujo de influencer (autos, fajos de billetes), memes sin dato, fotos falsas de figuras reales.

**Elementos gráficos:**
- Ticker inferior en mono que corre
- Caja de titular negra con palabra clave en violeta
- Píldoras +2.4% / −1.8% en verde/rojo
- Lower-third azul estilo TV
- Sello del símbolo en esquina superior

## Motion

- **Principios:** Golpe inicial de 'BREAKING' · Números que cuentan hasta la cifra · Ticker continuo
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)`
- **Duraciones:** 150 ms UI · 400 ms entradas de titular
- **Animación firma:** El globo violeta gira un cuarto de vuelta y las cruces de la corona aparecen una a una, como un reloj marcando las 5.

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
| Breaking | 4:5 · 1080×1350 | Imagen de escena arriba, caja negra abajo con kicker BREAKING en Bear Red, titular Anton 96 px con palabra clave en violeta, cifra en mono y fecha. |
| Explicador | Carrusel 4:5 | Portada titular; slides: qué pasó / por qué importa / qué vigilar / fuente. |
| Portada macro | 4:5 | Estilo periódico: cabecera 'ECONOMÍA GLOBAL', titular serif-free Anton, columna de análisis. |
| Market open | Story 9:16 | Cada mañana: 5 tickers con píldoras verde/rojo, hora en mono, sello 5AM. |

## Voz

Urgente y claro. Primero el dato, luego la explicación simple. Sin promesas de ganancias.

**Titulares de referencia:**
- "MERCADOS EN ALERTA"
- "S&P 500: HISTÓRICO 7,000 PUNTOS"
- "¿Corrección o mercado bajista?"
- "Qué significa la Fed para tu dinero"

**Palabras que sí:** dato, fuente, qué vigilar, contexto, riesgo
**Palabras que no:** hazte rico, señal segura, compra ya, garantizado

## Reglas

**Siempre:**
- Fecha y fuente en cada pieza
- Verde = sube, rojo = baja, siempre
- Violeta (color del globo) como color de marca
- Disclaimer en explicadores

**Nunca:**
- Recomendaciones personalizadas
- Rostros reales generados con IA
- Titular sin cifra
- Usar verde/rojo como decoración
