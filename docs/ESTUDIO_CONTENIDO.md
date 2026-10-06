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
