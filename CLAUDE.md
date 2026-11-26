# Command Center OS — ARRIVE Agency

## Creación de contenido, diseño y webs

Cada cuenta de redes tiene dos fuentes que se complementan:

- **ADN de contenido** (qué publica y cómo habla): se edita en el dashboard (Redes Sociales → Cuentas & ADN) y `server.js` lo exporta a `content-dna/<cuenta>/DNA.md`.
- **Línea gráfica** (cómo se ve) y **línea de contenido** (cómo se graba y edita cada video, textos en pantalla, subtítulos, historias): `brands/<marca>/brand.json` y `brands/<marca>/content.json` son la fuente de verdad. `npm run brands` genera `brands/<marca>/BRAND.md`, `brands/<marca>/tokens.css` y el brandbook visual en `public/brands/<marca>/` (servido en `/brands/<marca>/`).

Reglas:
- Antes de crear cualquier pieza para una cuenta (diseño, motion, edición, guion, caption, prompt para otro modelo, web), lee su `DNA.md` y su `BRAND.md`.
- En webs y piezas HTML usa `tokens.css` de la marca (`var(--brand-accent)`, `var(--font-display)`…); no copies hex ni fuentes a mano.
- Para cambiar una línea gráfica edita `brand.json` y corre `npm run brands`. No edites a mano `BRAND.md`, `tokens.css`, `public/brands/` ni los `DNA.md`.
- No inventes paleta, tipografía ni tono si no están definidos: pregunta.
- Los logos son redibujos vectoriales (`scripts/brand-logos.mjs`). Las versiones finales del diseñador van en `brands/<marca>/logo-source/` y reemplazan al redibujo. Guía completa en `brands/README.md`.

## Estudio de contenido (material raw → piezas)

El material de cada noche llega de Google Drive al dashboard (Redes Sociales → Material raw); la IA propone ideas, las desarrolla en un guion de edición (EDL) y genera un brief de producción en `content-dna/<cuenta>/briefs/`. Guía completa en `docs/ESTUDIO_CONTENIDO.md`; código en `src/services/contentStudio/`.

Cuando te pidan ejecutar un brief: léelo completo, respeta el EDL, el estilo de texto/subtítulos/cierre de la cuenta (`BRAND.md` → Línea de contenido) y deja el render donde indica el brief.

## Máquina de contenido (`studio/`)

Para editar, montar, renderizar video, motion graphics o gráficos de historias usa el skill `content-machine` (pipeline Remotion + ffmpeg + Whisper en `studio/`) y `video-recipes` para ediciones rápidas con ffmpeg. Corre `cd studio && npm run doctor` antes de producir y revisa la hoja de contacto de cada render antes de entregarlo.
