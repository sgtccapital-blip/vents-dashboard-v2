# Marcas — cómo descargar y editar

Cada carpeta (`arrive/`, `the-room/`, `ignite/`…) es una marca. `brand.json` (identidad visual) y `content.json` (línea de contenido y video) son la **fuente de verdad**; todo lo demás se genera con:

```bash
npm run brands
```

## Descargar

- **Brandbook:** `/brands/<marca>/` en el dashboard (índice en `/brands/`).
- **Kit completo:** botón **↓ Kit** del brandbook → `<marca>-kit.zip` con logos SVG, `LEEME.txt` (tipografías con links, colores HEX/RGB/CMYK, cómo entregar cambios), `BRAND.md`, `tokens.css` y `brand.json`.
- **Logos sueltos:** sección Logo → Descargar, o directamente `brands/<marca>/logo/*.svg`.

## Editar

| Qué | Dónde | Quién |
|---|---|---|
| Logos finales (diseñador) | Dejar SVG en `brands/<marca>/logo-source/` con los nombres `primary.svg`, `inverse.svg`, `on-accent.svg`, `symbol.svg`, `symbol-inverse.svg` o `avatar.svg`. Solo los que existan reemplazan al redibujo. | Diseñador |
| Colores, tipografías, textos, reglas, plantillas, estructura web | `brands/<marca>/brand.json` | Tú, el diseñador o Claude Code |
| Línea de contenido: mezcla, estilo de video, textos sobre video, subtítulos, portadas, cierre, guía orgánica, historias, semana tipo | `brands/<marca>/content.json` | Tú, el editor de video o Claude Code |
| Composición de plantillas y brandbook | `scripts/build-brands.mjs` | Claude Code |
| Redibujos vectoriales de los logos | `scripts/brand-logos.mjs` | Claude Code |

Después de cualquier cambio: `npm run brands` (el build de producción también lo corre).

**No editar a mano** (se sobrescriben): `brands/<marca>/logo/`, `BRAND.md`, `tokens.css` y todo `public/brands/`.

### Entrega de logos del diseñador

- SVG con textos convertidos a contornos (Illustrator: *Exportar como SVG → Estilo: Atributos de presentación*; Figma: *Outline text*).
- Un archivo por versión, con los nombres de arriba.
- Al correr `npm run brands`, el brandbook marca qué versiones son finales de diseño y el kit las incluye tal cual.
