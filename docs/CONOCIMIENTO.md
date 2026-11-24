# Motor de conocimiento (RAG)

Un solo índice con búsqueda por significado (embeddings `gemini-embedding-2`) más palabras clave, que junta:

| Fuente | Qué entra | `source` / `kind` |
|---|---|---|
| ChatGPT | Cada conversación resumida por IA (decisiones, ideas, pendientes, cómo piensa el usuario, datos) y, si no es trivial, el texto completo | `chatgpt` / `digest`, `transcript` |
| ChatGPT | Memoria consolidada por proyecto | `chatgpt` / `project_memory` |
| ChatGPT | Perfil de trabajo del usuario | `chatgpt` / `profile` |
| Dashboard | Proyectos, eventos, tareas, notas y documentos subidos (`ragDocuments`) | `dashboard` / categoría |
| Agentes | Memorias que guarda cualquier agente | `memory` / `memory` |
| Referencias | Links de YouTube, Instagram, TikTok, Vimeo, X… analizados por IA (paso a paso, herramientas, técnicas, estilo, cómo recrearlo, transcripción) | `reference` / tipo (`tutorial`, `motion_graphics`, `edicion`…) |

Código: `src/services/knowledge/`. Datos (privados, fuera de git): `knowledge/` junto a `db.json` (`KNOWLEDGE_DIR` para moverlo).

## Cómo entra ChatGPT

**Automático (extensión de Chrome, `extensions/chatgpt-sync/`).** Corre solo en chatgpt.com con la sesión del usuario: cada 20 minutos (y al salir de la pestaña) lista las conversaciones por última actualización, compara con lo que ya tiene el dashboard (`GET /ingest/chatgpt/state`) y descarga solo las nuevas o modificadas, incluidas las de Proyectos de ChatGPT. Las manda a `POST /ingest/chatgpt/conversations` con una llave de agente con permiso de escritura (fuera de `/api`; Funnel no publica esta ruta). La primera vez recorre todo el historial en tandas de 150. Usa la API interna de chatgpt.com: no es oficial y puede romperse si OpenAI la cambia; el estado y los errores se ven en el popup de la extensión y en Memoria ChatGPT. Instalación: chrome://extensions → Modo de desarrollador → Cargar descomprimida → esa carpeta; la llave se crea desde la misma pantalla.

Si la IA no tiene cuota, las conversaciones se indexan igual sin resumen (ya las encuentran los agentes) y se resumen solas cuando vuelva la cuota.

Los agentes internos (chat de OpenClaw/Hermes y orquestador) reciben en cada prompt el perfil de trabajo del usuario y la memoria de sus proyectos, además de lo que encuentre el RAG para ese mensaje.

**Respaldo: exportación completa.**

1. ChatGPT → Configuración → Controles de datos → Exportar datos. Llega un correo con el `.zip`.
2. Si el zip cae en la carpeta vigilada (`~/Downloads` por defecto, `CHATGPT_EXPORT_DIR` o desde la pantalla) se importa solo cada 10 minutos. También se puede subir en Agent & RAG → Memoria ChatGPT.
3. Solo se procesan conversaciones nuevas o modificadas. La cola corre en segundo plano, empieza por lo más reciente y, si Gemini se queda sin cuota, se pausa y reintenta sola.

## Referencias (tutoriales y referencias de video)

Agent & RAG → **Referencias**: se pegan uno o varios links con una nota de para qué se guardan, la cuenta y etiquetas. También por API (`POST /api/knowledge/references` `{ urls, note?, account?, tags? }`) o con la herramienta MCP `add_reference`.

Cada link pasa por una cola (`src/services/knowledge/references.js`, estado en `knowledge/references.json`):

1. `yt-dlp` saca título, autor, duración, descripción y subtítulos.
2. Gemini **ve el video completo** (imagen + audio): YouTube directo desde el link; Instagram, TikTok y el resto se descargan a 720p (360p si dura más de 15 min), se suben a la Files API de Gemini y se borran al terminar.
3. Sale un desglose estructurado que entra al índice como `source: reference`. Si no se puede ver el video (post de fotos, privado) se analiza solo con el texto y queda marcado como *Analizado sin ver el video*.

Variables: `REFERENCE_VIDEO_MODEL` (por defecto el de `KNOWLEDGE_LLM_MODEL`, `gemini-3.8-flash`), `REFERENCE_COOKIES_BROWSER=chrome` si Instagram pide sesión, `YTDLP_PATH`.

Los agentes las encuentran con `search_knowledge` (`source: "reference"`) y leen el desglose completo con `get_reference`.

## API para agentes (`Authorization: Bearer <API_TOKEN>`)

- `POST /api/knowledge/search` `{ query, topK?, source?, kind?, projectId? }` → trozos con `title`, `source`, `kind`, `meta` (proyecto, fecha, relevancia) y `text`.
- `POST /api/knowledge/memory` `{ title?, content, agent?, projectId?, tags? }` → guarda algo para que lo vean todos los agentes.
- `GET /api/knowledge/projects` → memoria por proyecto (resumen, decisiones vigentes, pendientes, lógica del usuario).
- `GET /api/knowledge/profile` → perfil de trabajo del usuario (para usar como contexto fijo).
- `GET /api/knowledge/chatgpt/conversations?q=&relevance=` y `/:id` → listado y detalle (resumen + mensajes).
- `GET /api/knowledge/status` → estado de la cola e índice.

`POST /api/brain/query`, `POST /api/rag/search` y todos los agentes internos que usan `ragEngine.query` ya buscan en este índice.

## Servidor MCP para agentes

Cualquier agente compatible con MCP (Claude Code, Claude Desktop, Cursor, OpenClaw, Hermes, ChatGPT…) se conecta a `http://<host>:8090/mcp` (Streamable HTTP, sin sesión). Código: `src/services/agentHub/`.

- **Llaves por agente:** se crean en Agent & RAG → Agentes conectados. Cada una tiene permiso *lee y escribe* o *solo lectura*, se puede revocar y solo se muestra al crearla (se guarda su hash en `agents-hub/`, fuera de git).
- **Cómo mandar la llave:** cabecera `Authorization: Bearer cc_…` o dentro de la URL (`/mcp/cc_…`) para clientes que no permiten cabeceras. El `API_TOKEN` de administración también sirve (agente `admin`, o el nombre en la cabecera `X-Agent-Name`).
- **Registro:** cada llamada queda en `agents-hub/activity.jsonl` y se ve en la pantalla. Lo que escriben los agentes también aparece en el feed de actividad del Home.

Herramientas:

| Herramienta | Tipo | Para qué |
|---|---|---|
| `get_context` | lectura | Primero: perfil del usuario, proyectos, próximos eventos, tareas pendientes y vencidas |
| `search_knowledge` | lectura | Búsqueda por significado en ChatGPT, dashboard y memorias |
| `list_projects` / `get_project` | lectura | Ficha + memoria consolidada + tareas + conversaciones de un proyecto |
| `list_tasks` / `list_events` | lectura | Tareas filtradas y agenda (incluye fechas de eventos recurrentes) |
| `get_chatgpt_conversation` | lectura | Resumen y mensajes de una conversación importada |
| `create_task` / `update_task` | escritura | Pendientes en el dashboard (quedan firmados con el nombre del agente) |
| `save_memory` | escritura | Decisiones y datos que deben ver todos los agentes |
| `add_reference` / `get_reference` | escritura / lectura | Guardar links de video como referencia y leer su desglose |
| `log_activity` | escritura | Qué hizo el agente, en el feed del Home |
- `search` / `fetch` (lectura): mismo índice en el formato que exige ChatGPT para sus conectores.

## URL pública y ChatGPT

ChatGPT y los agentes en la nube llegan al MCP de esta Mac por **Tailscale Funnel**, que publica **solo `/mcp`** (el resto del dashboard sigue privado). Tailscale corre en modo usuario con estado propio en `~/Library/Application Support/arrive-tailscale`.

```bash
sh scripts/command-center-service.sh install   # dashboard + tailscaled arrancan solos al iniciar sesión (LaunchAgents)
sh scripts/tailscale.sh up --hostname=arrive-command-center   # una vez: abre el enlace e inicia sesión
sh scripts/tailscale.sh funnel --bg --set-path /mcp http://127.0.0.1:8090/mcp
```

Luego `PUBLIC_URL=https://arrive-command-center.<tu-tailnet>.ts.net` en `.env` y reiniciar el servicio (`launchctl kickstart -k gui/$(id -u)/com.arrive.command-center`). Logs del servicio: `~/Library/Logs/arrive-command-center/server.log`. Para quitarlo todo: `sh scripts/command-center-service.sh uninstall`.

En ChatGPT (Modo desarrollador → crear conector) la URL es `https://…ts.net/mcp/<llave>` con autenticación **Ninguna**. La guía paso a paso y las instrucciones personalizadas sugeridas están en Agent & RAG → Agentes conectados.
