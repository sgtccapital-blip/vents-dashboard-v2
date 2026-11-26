# ARRIVE Dashboard en ChatGPT

## Estado verificado (25 de noviembre de 2026)

- MCP público: `https://arrive-command-center.tail30aa5a.ts.net/mcp`.
- Tailscale Funnel publica únicamente `/mcp` y sus rutas internas. El dashboard permanece privado.
- OAuth 2.1: descubrimiento, registro dinámico de cliente, código de autorización con PKCE S256, token de acceso y renovación. El inicio de sesión usa la contraseña existente del dashboard. Las credenciales se guardan fuera de Git en `agents-hub/oauth/oauth.json`; los tokens de agente existentes siguen funcionando.
- Servicio y túnel: LaunchAgents `com.arrive.command-center` y `com.arrive.tailscaled`, ambos con `RunAtLoad` y `KeepAlive`.
- Paquete inicial importado por MCP: 22 proyectos (20 nuevos y 2 vinculados), 22 briefs versionados, 141 tareas y 22 archivos Markdown originales. La repetición de la captura no añadió registros. Comprobante: `gg-portfolio-2026-11-25-v1` (207 operaciones, 0 errores). Los proyectos vinculados fueron HangOut → `portfolio-hangout` y LicitIA → `proj-2`. Se conservaron los datos actuales de ambos. El paquete no tenía eventos ni fechas de tarea.
- Los enlaces del comprobante abren el dashboard local en `http://localhost:8090` desde esta Mac. ChatGPT puede recuperar los archivos desde cualquier chat conectado con `read_project_document` y el ID del archivo; el dominio público solo expone rutas `/mcp`.

## Registrar e instalar en ChatGPT

1. En **ChatGPT web**, abre [Plugins](https://chatgpt.com/plugins). La creación de servidores MCP personalizados requiere ChatGPT Business o Enterprise/Edu y permiso del workspace; en Business lo hace un administrador o propietario.
2. Pulsa **+ → Add custom MCP server**.
3. Nombre: **ARRIVE Dashboard**. Descripción sugerida: “Proyectos, briefs, tareas, calendario y documentos de ARRIVE”. En **Connection**, pega `https://arrive-command-center.tail30aa5a.ts.net/mcp`.
4. Selecciona **OAuth**. Acepta el aviso de riesgo y pulsa **Create as a plugin**. ChatGPT detectará las herramientas y abrirá la autorización cuando sea necesaria.
5. En la página de ARRIVE, introduce la **contraseña del dashboard** y autoriza. ChatGPT recibirá tokens renovables; no copies `API_TOKEN` ni llaves `cc_` a la URL.
6. Revisa las herramientas detectadas e instala el plugin en tu cuenta o workspace según los permisos que muestre ChatGPT. En un chat nuevo escribe `@ARRIVE Dashboard` y selecciónalo. Repítelo en cada chat donde quieras usar la conexión.
7. Prueba: “Consulta `get_project` para `portfolio-hangout` y dime el ID”. Luego: “Previsualiza una captura de esta conversación sin guardarla”. Para guardar, pide expresamente la captura y verifica el comprobante.

Frase de uso:

> Guarda en ARRIVE lo acordado en esta conversación para [proyecto]: actualiza el brief, crea solo tareas pendientes, registra únicamente las fechas explícitas y adjunta los documentos accesibles. Revisa duplicados y dame el comprobante con IDs, enlaces y errores.

El conector recibe el contexto y los bytes de archivos que el cliente pueda enviar desde el chat activo. No lee automáticamente otras conversaciones. Si el cliente no puede enviar los bytes, el archivo no se considera adjunto.

## Operación y recuperación

```sh
cd '/Users/admin/Documents/Dashboard Events'
sh scripts/command-center-service.sh status
sh scripts/tailscale.sh funnel status
curl -i https://arrive-command-center.tail30aa5a.ts.net/mcp
curl -i https://arrive-command-center.tail30aa5a.ts.net/mcp/.well-known/oauth-protected-resource
```

`/mcp` debe responder `401` sin token y la metadata OAuth debe responder `200`. Tras reiniciar la Mac e iniciar sesión, los LaunchAgents vuelven a arrancar. Si faltan, `sh scripts/command-center-service.sh install`; para reiniciar el servidor, `launchctl kickstart -k gui/$(id -u)/com.arrive.command-center`. La disponibilidad exige que la Mac permanezca encendida, con la sesión de usuario iniciada y Tailscale conectado.

Los datos se guardan en `db.json` y `agents-hub/` (ambos fuera de Git). Copia anterior a la importación: `backups/db.pre-arrive-connector-2026-11-25.json`. Para revocar un cliente OAuth, usa la API administrativa `GET /api/agent-hub/oauth-clients` y `DELETE /api/agent-hub/oauth-clients/:id` desde la sesión autenticada del dashboard. Para consultar la captura, llama a `get_capture_receipt` con `gg-portfolio-2026-11-25-v1`.

Referencias: [Conectar servidores MCP personalizados en ChatGPT](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt), [Conectar y probar un plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt), [Autenticación de plugins MCP](https://developers.openai.com/plugins/build/auth).
