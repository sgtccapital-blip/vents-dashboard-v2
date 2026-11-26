# Sincronización automática ChatGPT → conocimiento

La extensión `extensions/chatgpt-sync/` usa la sesión de `chatgpt.com` en Chrome. El servidor recibe una señal de la extensión, no puede inspeccionar si Chrome está instalado o conectado en este instante. En la auditoría del 25 de noviembre de 2026, `knowledge/state.json` contenía 476 conversaciones; 409 estaban resumidas, 22 indexadas sin resumen y 45 pendientes. El último reporte de la extensión 1.0.4 indicaba 1.027 conversaciones revisadas, 80 enviadas y 537 pendientes de captura. Estos números son una fotografía, no garantía de cobertura total.

## Alcance y seguridad

- La sincronización solo escribe conocimiento y su índice. Los pendientes mencionados en un chat son datos, no tareas del dashboard. Crear o modificar tareas, eventos y proyectos requiere una petición explícita de GG por otra herramienta.
- La fuente web cubre conversaciones accesibles por la API interna de la sesión de `chatgpt.com`, incluidas las de Proyectos que devuelve esa API. Es una interfaz no oficial y puede cambiar. Conversaciones inaccesibles, eliminadas o de otra cuenta no se infieren.
- Codex y otros chats fuera de esa fuente requieren un adaptador propio o captura MCP explícita. `capture_conversation_knowledge` acepta solo el contenido que el cliente MCP entrega y exige cuenta, workspace e ID de conversación. No descubre chats por sí misma.
- Un enlace a un adjunto, imagen o archivo no significa que se haya leído su contenido. La importación conserva el JSON recibido; el resumen procesa el texto disponible en los mensajes. Adjuntos y archivos reales requieren un adaptador que entregue sus bytes y metadatos.
- El contenido importado se encierra como datos no confiables para el resumidor. Nunca autoriza herramientas ni cambios de permisos.

## Identidad, revisiones y almacenamiento

La clave de una conversación es el SHA-256 de cuenta, workspace e ID original. La revisión es un SHA-256 del título y los mensajes visibles con sus identificadores y texto. Así una edición con igual cantidad de mensajes se detecta, y distintas cuentas quedan aisladas. Extensión, exportación subida y captura MCP comparten clave cuando se proporciona la misma identidad. Sin identidad verificada, una exportación queda en el espacio histórico separado; no se fusiona por parecido de texto con otra cuenta. El watcher de `Downloads` tampoco puede inferir la cuenta del ZIP.

`knowledge/raw/chatgpt/original/` guarda cada revisión JSON recibida; el archivo normalizado conserva la rama visible para búsqueda. Las ramas editadas no visibles permanecen en el original. El índice se actualiza al capturar; el resumen llega en segundo plano. Las conversaciones largas se procesan en segmentos por mensaje, incluidos los mensajes centrales. El resumen incorpora temas, hechos, propuestas, decisiones, correcciones, preguntas y pendientes con referencias a mensajes. Si una extracción carece de referencia válida, el resumen falla y se reintenta; el texto original permanece buscable. Una decisión debe citar un mensaje del usuario: las propuestas del asistente no se convierten en decisiones.

La cola vive en `knowledge/state.json`. Los errores programan esperas de 1 minuto hasta 6 horas y sobreviven a reinicios. El panel muestra capturadas, resumidas, indexadas, fallidas, fuentes, última señal de la extensión, retraso, exclusiones y pendientes. Reintentar limpia el límite de intentos; reprocesar una conversación reconstruye su resumen; purgar elimina el original, resumen e índice de esa conversación y permite capturarla otra vez. Excluir evita su reingesta.

## Consulta

MCP: `get_sync_status`, `list_recent_conversation_updates`, `get_conversation_summary`, `reprocess_conversation`, `capture_conversation_knowledge`, `get_context` y `search_knowledge`. `get_context` incluye novedades de los últimos siete días con fecha. La búsqueda muestra `source: chatgpt`, fecha, cuenta, workspace, origen y revisión en metadatos.

La cobertura de la extensión depende de que Chrome esté abierto, la sesión web sea válida y la API interna responda. Un error o desconexión se registra en el siguiente intento. El servidor no puede declarar una instalación activa basándose solo en que el código de la extensión exista.

Tras actualizar la carpeta de la extensión a la versión 1.1.5, recárgala en `chrome://extensions`. Cada ciclo usa una pestaña temporal, inyecta explícitamente el content script vigente y la cierra al terminar; un script anterior no puede responder al mensaje versionado. La identidad usa `user.id` y el `account.id` activo que informa la sesión web, para aislar también workspaces. El reporte del servidor permite comprobar que la versión 1.1.5 volvió a conectarse con identidad de cuenta. Si ChatGPT responde 429, el reporte conserva la cantidad de conversaciones pendientes y el próximo ciclo reintenta.
