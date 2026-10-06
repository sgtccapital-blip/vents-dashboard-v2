# Command Center OS — ARRIVE Agency

## Creación de contenido, diseño y webs

Cada cuenta de redes tiene dos fuentes que se complementan:

- **ADN de contenido** (qué publica y cómo habla): se edita en el dashboard (Redes Sociales → Cuentas & ADN) y `server.js` lo exporta a `content-dna/<cuenta>/DNA.md`.
- **Línea gráfica** (cómo se ve): `brands/<marca>/brand.json` es la fuente de verdad. `npm run brands` genera `brands/<marca>/BRAND.md`, `brands/<marca>/tokens.css` y el brandbook visual en `public/brands/<marca>/` (servido en `/brands/<marca>/`).

Reglas:
- Antes de crear cualquier pieza para una cuenta (diseño, motion, edición, guion, caption, prompt para otro modelo, web), lee su `DNA.md` y su `BRAND.md`.
- En webs y piezas HTML usa `tokens.css` de la marca (`var(--brand-accent)`, `var(--font-display)`…); no copies hex ni fuentes a mano.
- Para cambiar una línea gráfica edita `brand.json` y corre `npm run brands`. No edites a mano `BRAND.md`, `tokens.css`, `public/brands/` ni los `DNA.md`.
- No inventes paleta, tipografía ni tono si no están definidos: pregunta.
- Los logos del brandbook son recreaciones tipográficas; los archivos originales van en `brands/<marca>/logo/`.
