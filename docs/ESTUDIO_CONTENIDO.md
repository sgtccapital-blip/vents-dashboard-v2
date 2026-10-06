# Estudio de contenido: del material raw a la publicación

Flujo en el dashboard (Redes Sociales):

1. **Material raw** (pestaña 📥): el material de cada noche llega desde una carpeta de Google Drive. Se sincroniza solo a las 7:00 y 15:00 (hora de Panamá) o con "Sincronizar Drive". Cada archivo se asigna a la cuenta detectada en el nombre de la carpeta (alias en `brands/<marca>/brand.json → driveAliases`); se puede reasignar a mano.
2. **Abrir cuenta → Material raw → Ideas**: selecciona tomas (o deja que use las más recientes sin usar), da una dirección opcional y genera ideas. La IA usa el ADN, la línea gráfica y la línea de contenido de la cuenta, y con Claude además ve miniaturas de las tomas.
3. **Aprobar idea** → la pieza entra al pipeline en "Idea", ligada a su material raw.
4. **Producción → Desarrollar con IA**: guion de edición plano a plano (EDL) con in/out, textos en pantalla y subtítulos con el estilo de la cuenta, música, portada, cierre, historias, caption y checklist.
5. **Generar paquete de producción**: escribe el brief en `content-dna/<cuenta>/briefs/` con links a cada archivo de Drive, marca el material como usado y pasa la pieza a "En edición". El brief se le pasa al editor o a Claude Code ("ejecuta el brief content-dna/…").

## Organización de la carpeta de Drive

```
Raw (carpeta compartida)
├── 2026-10-04 The Room @ Terraplén/
│   ├── Cam A/ …
│   └── Celular/ …
├── 2026-10-05 Ignite/
└── 2026-10-05 Casco Peatonal/
```

Una carpeta por noche o evento, con la fecha y el nombre de la marca en el nombre. Las subcarpetas (cámaras, personas) se leen igual.

## Configuración (`.env`)

| Variable | Para qué |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Ruta al JSON de una cuenta de servicio de Google Cloud con la Drive API activada. Comparte la carpeta con su email (lector). **Recomendado.** |
| `GOOGLE_API_KEY` | Alternativa: API key con Drive API; la carpeta debe estar compartida como "cualquiera con el enlace". |
| `GOOGLE_DRIVE_FOLDER_ID` | Opcional: carpeta por defecto. También se puede pegar el link desde el dashboard. |
| `ANTHROPIC_API_KEY` | Claude como motor principal de ideas y desarrollo (modelo `CLAUDE_MODEL`, por defecto `claude-opus-5-5`). |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Respaldo si Claude no está configurado o falla. |

## Máquina de contenido (`studio/`)

Producción local en tu Mac: **Remotion 4** (motion graphics y montaje con React), **ffmpeg 9** (edición, H.264 por hardware), **Whisper** (subtítulos palabra por palabra, modelo `studio/models/ggml-small.bin`), **ImageMagick**, **rclone** y **exiftool**.

- **Desde el dashboard:** Abrir cuenta → Producción → **Renderizar video** (opción Subtítulos). Al terminar aparece el video con portada, descarga y las historias de apoyo.
- **Desde la terminal** (`cd studio`): `npm run doctor`, `npm run render-brief -- <taskId>`, `npm run graphic -- --brand the-room --type story-announce`, `npm run transcribe -- video.mp4`, `npm run studio` (vista previa de composiciones).
- **Con Claude Code:** skills del proyecto `content-machine` y `video-recipes` (en `.claude/skills/`).

Salidas en `content-dna/<cuenta>/renders/` (video, portada, hoja de contacto, historias) y `content-dna/<cuenta>/graphics/`. Audio masterizado a −14 LUFS.

Instalación en otra máquina: `brew install ffmpeg imagemagick whisper-cpp rclone exiftool`, `cd studio && npm install`, descargar `ggml-small.bin` de huggingface.co/ggerganov/whisper.cpp a `studio/models/` y correr `npm run doctor`.

## Generación con IA (Abrir cuenta → Generar con IA)

Todo lo generado se guarda en `content-dna/<cuenta>/ai/<fecha>/` y entra a la biblioteca de la cuenta como material IA: se puede usar en ideas, guiones y renders como cualquier toma. Con "Aplicar la línea de la marca" el prompt lleva el look, la paleta y la cámara de la cuenta y pide **sin texto ni logos** (esos los pone Remotion con los archivos reales).

| Servicio | Qué hace | Cómo se conecta | Costo |
|---|---|---|---|
| **Nano Banana** (Gemini 3.1 Flash Image, 3 Pro Image, Lite) | Imágenes y edición con referencias (fondos de historias, posts, frames iniciales) | `GEMINI_API_KEY` de un proyecto **con facturación** | US$0,03–0,24 por imagen |
| **Veo 3.1** (Standard, Fast, Lite) | Video 9:16 de 4/6/8 s, 720p–4K, con audio; desde texto, primer frame o hasta 3 referencias | La misma `GEMINI_API_KEY` | US$0,05–0,60 por segundo |
| **Google Flow** | Edición y escenas con Veo en el navegador (incluido en tu plan Pro/Ultra) | No tiene API: pestaña "Prompts para Flow / Higgsfield" + exportar a Drive (carpeta con "Flow" o "IA") | Créditos del plan |
| **Higgsfield MCP** | Claude Code genera imagen y video (Soul, Nano Banana Pro, Veo 3.1, Kling, Seedance) con tus créditos | Ya configurado en `.mcp.json`: al abrir Claude Code en el proyecto, aprobar "higgsfield" e iniciar sesión (OAuth) | Créditos de Higgsfield |
| **Higgsfield API** | Lo mismo desde el dashboard | `HF_API_KEY_ID` y `HF_API_KEY_SECRET` (console.higgsfield.ai, saldo en US$); modelos extra en `HIGGSFIELD_MODELS` (JSON) | Pago por uso |

### Google: usar los créditos de tu plan Pro/Ultra en la API

La API de Gemini no tiene uso gratis para imagen ni video. Tu plan incluye créditos mensuales de Google Cloud (Google Developer Program premium; US$10 con Pro, hasta US$100 con Ultra):

1. Entra a developers.google.com/program con la cuenta del plan y activa los beneficios premium.
2. En Google Cloud, crea o elige un proyecto y vincúlale la cuenta de facturación donde aparecen los créditos.
3. En aistudio.google.com → API keys, crea una key **en ese proyecto** y ponla en `GEMINI_API_KEY` del `.env`.
4. Reinicia el servidor. El costo estimado aparece antes de cada generación y pide confirmación desde US$1.

## Referencias y tutoriales (Redes Sociales → 🎓 Referencias & Tutoriales)

Para enseñarle a la máquina formatos virales y técnicas de edición:

1. **Agregar:** pega el link (Instagram, TikTok, YouTube, X…) o sube el video. Elige si es **video viral** (para recrear el formato) o **tutorial** (para aprender una técnica). Las notas y las cuentas son opcionales.
2. **Análisis automático:** se descarga con `yt-dlp`, se miden los cortes de escena y el ritmo con ffmpeg, se extrae un frame por plano, se transcribe la voz con Whisper y la IA (viendo los frames) arma la receta: gancho, estructura segundo a segundo, edición (ritmo, transiciones, efectos, texto, subtítulos, color, audio), por qué funciona, la técnica con pasos y parámetros, cómo la hace la máquina y adaptaciones por cuenta.
3. **Recrear para una cuenta:** crea la idea en Producción ligada a la referencia; al desarrollarla, el guion de edición sigue la estructura y el ritmo de la referencia con la línea de la cuenta.
4. **Técnicas por construir:** si un tutorial enseña algo que la máquina todavía no tiene, queda marcado y el botón "Instrucción para Claude Code" da el pedido para programarlo como plantilla.

Archivos: `content-dna/_library/references/<id>/` (video, frames, hoja de contacto, `PLAYBOOK.md`, `analysis.json`) y el índice `content-dna/_library/TECNICAS.md`. Desde la terminal: `cd studio && npm run analyze-reference -- <id>`.

Instagram y TikTok a veces piden sesión: si un link falla, sube el video a mano, o define `YTDLP_COOKIES_BROWSER=chrome` en `.env` para que yt-dlp use tu sesión del navegador. Se recrea el formato y la técnica con material propio; nunca se reutiliza el contenido, la música con derechos ni la imagen de otros.
