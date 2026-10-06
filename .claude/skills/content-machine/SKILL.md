---
name: content-machine
description: Produce content for ARRIVE's social accounts with the local content machine — render a reel from a production brief, generate brand story graphics, posts and logo stings, transcribe voice into word-by-word subtitles, download raw footage from Drive, or build a custom motion-graphics piece in Remotion with a brand's identity. Use whenever the user asks to edit/montar/renderizar a video, ejecutar un brief, hacer gráficos de historias, un flyer animado, motion graphics, subtítulos, or any visual/video deliverable for one of the accounts (The Room, Ignite, Hang Out, Dinner Club, Urban Nights, UDP, Elemento, 5AM Club, ARRIVE).
---

# Máquina de contenido

Todo vive en `studio/` (Remotion 4 + ffmpeg + Whisper). Las marcas salen de `brands/<marca>/` (identidad en `brand.json`, línea de contenido en `content.json`); nunca copies colores, fuentes ni logos a mano.

## Antes de producir

1. `cd studio && npm run doctor` — si algo falla, arréglalo o avísale al usuario antes de seguir.
2. Lee la línea de la cuenta: `brands/<marca>/BRAND.md` (sección **Línea de contenido**) y `content-dna/<cuenta>/DNA.md`.
3. Si la pieza viene del dashboard, lee su brief en `content-dna/<cuenta>/briefs/`.

## Comandos (desde `studio/`)

| Tarea | Comando | Salida |
|---|---|---|
| Renderizar una pieza desarrollada (EDL) | `npm run render-brief -- <taskId> [--captions] [--music pista.mp3]` | `content-dna/<cuenta>/renders/<fecha>-<titulo>.mp4` + `.cover.jpg` + `.sheet.jpg` + historias `.story-N-<tipo>.png` |
| Bajar el material raw de una pieza | `npm run fetch-raw -- <taskId>` | `content-dna/<cuenta>/raw/<noche>/` |
| Historia de marca | `npm run graphic -- --brand <slug> --type story-announce\|story-countdown\|story-poll\|story-repost\|story-link [--text] [--sub] [--link] [--q "¿…?" --a "A\|B"]` | `content-dna/<cuenta>/graphics/*.png` |
| Post / flyer 4:5 | `npm run graphic -- --brand <slug> --type post [--kicker] [--headline] [--sub] [--meta]` | PNG 1080×1350 |
| Animación de logo (3 s) | `npm run graphic -- --brand <slug> --type sting` | MP4 1080×1920 |
| Subtítulos palabra por palabra | `npm run transcribe -- <video> [--lang es]` | `<video>.captions.json` (formato Caption de Remotion) |
| Previsualizar composiciones | `npm run studio` | Remotion Studio en el navegador |

Slugs: `arrive`, `elemento`, `5amclub`, `the-room`, `ignite`, `hangout`, `dinner-club`, `urban-nights`, `udp`.

`render-brief` hace todo el pipeline: descarga el raw que falte, normaliza cada plano (9:16, 30 fps, recorte in→out con ffmpeg), transcribe si pides `--captions`, monta en Remotion (textos, transiciones, color y cierre de la marca), masteriza el audio a −14 LUFS (dos pasadas), genera portada, hoja de contacto e historias del brief, y actualiza la pieza en el dashboard. Desde el dashboard es el botón **Renderizar video** en Producción.

## Revisar antes de entregar

- Mira la hoja de contacto (`.sheet.jpg`) y la portada con la herramienta de lectura de imágenes. Si un plano se ve mal (texto tapando caras, contraste pobre, toma equivocada), corrige el EDL o el código y vuelve a renderizar.
- Zonas seguras de Instagram: nada importante en el 14% superior ni en el 20% inferior.
- Audio: `ffmpeg -i out.mp4 -af ebur128 -f null -` → integrado ≈ −14 LUFS.
- La marca correcta: logo, paleta y tipografías de la cuenta; el estilo de texto/subtítulos que dice su `content.json`.

## Piezas a medida (motion graphics)

Para algo que no cubren las composiciones existentes, crea una composición nueva en `studio/src/` y regístrala en `studio/src/Root.jsx`:

- Carga la marca con `useBrandData(slug)` (`src/data.js`) y su tema con `brandTheme(brand)` + `typo(b, role)` (`src/brand.js`).
- Reutiliza `Logo`, `OverlayText`, `Captions`, `EndCard`, `Grain`, `TransitionIn` de `src/components.jsx`.
- Animación con `useCurrentFrame`, `interpolate`, `spring`; transiciones con `@remotion/transitions`.
- Medios en `studio/public/` y `staticFile()`; nunca rutas absolutas.
- Respeta la animación firma, el easing y las duraciones de `brand.motion`.
- Renderiza con `npx remotion render src/index.js <Id> <salida> --props=props.json` (o `remotion still` para PNG).

Si están instalados los plugins de Remotion, usa sus skills (`remotion-best-practices`, `remotion-captions`, `remotion-render`) como referencia de API.

## Edición directa con ffmpeg

Para cortes rápidos, reencuadres, limpieza de audio, velocidad, GIFs o extracción de frames, usa el skill `video-recipes`.
