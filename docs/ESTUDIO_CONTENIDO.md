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
