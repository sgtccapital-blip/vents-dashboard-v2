# Conector MCP del Command Center: operación, permisos y estado

Versión del servidor MCP: **2.0.0** (`src/services/agentHub/mcpServer.js`). El conector actual (ChatGPT por OAuth, llaves `cc_` de Claude Code, OpenClaw y Hermes, extensión de sincronización de ChatGPT) sigue funcionando igual: las herramientas anteriores conservan nombre y forma de respuesta, y ahora añaden campos. Las piezas nuevas se activan por permisos.

## 1. Arquitectura

```
Cliente MCP (ChatGPT, Claude, OpenClaw…)
        │  HTTPS (Tailscale Funnel → /mcp)  ·  OAuth o llave cc_
        ▼
Gateway MCP  ── server.js + src/services/agentHub/routes.js  (com.arrive.command-center, puerto 8090)
  · decide permisos en cada llamada (permissions.js + toolkit.js)
  · lee/escribe datos con los servicios del dashboard (createEntity/updateEntity/archiveEntity…)
  · registra cada operación con su id y redacta secretos (hubStore.js + redact.js)
  · encola trabajos en disco: agents-hub/jobs/<id>/job.json
        │  cola en archivos (no depende de la petición HTTP)
        ▼
Ejecutor  ── scripts/arrive-runner.mjs  (proceso aparte, latido cada 3 s)
  · pruebas, lint, build, scripts autorizados, preparar/validar/desplegar/revertir
  · entorno mínimo: no recibe las llaves del .env
```

- El servidor arranca el ejecutor solo y lo vigila cada 60 s. Para desactivarlo: `RUNNER_AUTOSTART=0`. Para arrancarlo a mano: `npm run runner`, o el botón **Arrancar ejecutor** del panel.
- Si el ejecutor se cae o se reinicia, los trabajos que estaban en marcha quedan como `interrupted` y no se repiten solos. Así un reintento no duplica efectos.
- Las fechas operativas usan **America/Panama**: `today`, fechas de decisiones y lo que se considera vencido.

## 2. Permisos

Cada agente es un *principal*: una llave `tok-…`, un cliente OAuth `oauth:<id>` o un agente interno de AI Office `office:<agentId>`. Los agentes internos usan un cliente MCP en proceso (`agentHub.connectInternal({ agent, principal })`) con los mismos permisos y la misma auditoría; sin política guardada solo leen datos, documentos y memoria. Tiene un nivel por función:

| Función | Niveles | Qué habilita |
|---|---|---|
| `data` | none → read → write | Proyectos, tareas, eventos, notas, contactos, campañas… |
| `documents` | none → read → write | Briefs, documentos adjuntos, transferencias, archivos de AI Office |
| `memory` | none → read → write → approve | Conocimiento, memorias, conversaciones; `approve` aprueba decisiones |
| `code` | none → read → write → commit | Leer código y Git; preparar/aplicar parches; ramas y commits |
| `exec` | none → run | Lanzar trabajos (test, lint, build, scripts autorizados) |
| `deploy` | none → prepare → release | Preparar/validar; desplegar y revertir |

Reglas:

- **Sin política guardada**, la llave conserva su permiso de siempre:
  - lectura: `data`, `documents` y `memory` en `read`;
  - escritura: esas tres en `write`;
  - `code`, `exec` y `deploy` quedan en `none`. Así nadie gana acceso a código sin configurarlo.
- **El cliente MCP manda**: un token OAuth o una llave autorizados solo con lectura nunca escriben, aunque la política diga más.
- **El servidor comprueba el permiso en cada operación**:
  - las herramientas sin permiso no aparecen en `tools/list`;
  - si un cliente las llama igualmente, recibe `PERMISSION_DENIED` con el nivel requerido y qué hacer.
  - Las anotaciones (`readOnlyHint`…) son solo pistas para el cliente.
- **Las políticas persisten** en `agents-hub/policies.json`. Valen hasta que se cambien o revoquen, así que no hay que reconfirmar cada acción rutinaria.
- **La revocación es inmediata**: la llave o el cliente OAuth deja de funcionar en la siguiente llamada.
- **Workspaces**: además del nivel de `code`/`exec`/`deploy`, el agente necesita el workspace en su lista (o `*`). Un worktree `ws:rama` hereda el permiso de `ws`.

Se configuran en **Agent & RAG → Agentes conectados → Permisos**, o por API (sesión del dashboard):
- `PUT /api/agent-hub/policies/:principal`
- `POST /api/agent-hub/policies/:principal/revoke`
- `DELETE /api/agent-hub/policies/:principal` (vuelve al permiso de la llave)

## 3. Herramientas (87)

Cada herramienta declara `inputSchema` y `outputSchema`, y devuelve `structuredContent` más el mismo JSON en texto para clientes antiguos.

| Módulo | Herramientas | Permiso |
|---|---|---|
| Descubrimiento | `get_capabilities`, `get_connection_status`, `get_permissions` | ninguno |
| Contexto | `get_context` (breve por defecto; `detail:"full"`, `sections`, `project_id`) | data:read |
| Conocimiento | `search_knowledge`, `search`, `fetch`, `get_chatgpt_conversation`, `list_library`, `search_library`, `get_library_item` | memory:read / documents:read |
| Sincronización ChatGPT | `get_sync_status`, `list_recent_conversation_updates`, `get_conversation_summary` | memory:read |
| | `reprocess_conversation`, `capture_conversation_knowledge` | memory:write |
| Memoria | `save_memory` (idempotente por contenido), `add_to_library`, `add_reference`, `get_reference`, `log_activity` | memory:write |
| Registros (todos los módulos) | `query_records` (filtros, orden, paginación), `get_record`, `list_record_versions`, `get_record_version` | data:read |
| | `create_record`, `update_record` (`expected_etag`), `archive_record`, `restore_record`, `batch_records`, `restore_record_version`, `normalize_records` | data:write |
| Atajos previos | `list_projects`, `get_project`, `list_tasks`, `list_events`, `create_task`, `update_task` | data |
| Capturas de conversación | `preview_conversation_capture`, `apply_conversation_capture`, `get_capture_receipt`, `upsert_project`, `upsert_project_brief`, `upsert_dashboard_task`, `upsert_calendar_event` | data:write |
| Documentos | `attach_project_document`, `read_project_document`, `list_document_versions`, `restore_document_version`, `restore_brief_version`, `create_upload`, `get_upload`, `create_download_link` | documents |
| Decisiones | `list_decisions` | memory:read |
| | `record_decision` (siempre queda propuesta) | memory:write |
| | `approve_decision`, `reject_decision` | memory:approve |
| Código | `list_workspaces`, `list_files`, `search_files`, `read_file`, `git_status`, `git_diff`, `get_patch` | code:read |
| | `prepare_patch`, `apply_patch` | code:write |
| | `create_branch`, `commit_changes` | code:commit |
| Ejecución | `start_job`, `get_job`, `get_job_logs`, `cancel_job`, `list_jobs` | exec:run |
| Despliegue | `prepare_deployment`, `validate_deployment`, `get_deployment_status`, `list_deployments` | deploy:prepare |
| | `deploy`, `rollback_deployment` | deploy:release |
| AI Office | `get_my_office_tasks`, `claim_office_task`, `report_office_progress`, `submit_office_result`, `get_office_task`, `read_office_file`, `attach_office_file`, `handoff_office_task` | data |

**Módulos de `*_record`:**
- Con escritura: `projects`, `tasks`, `events`, `notes`, `ideas`, `contacts`, `companies`, `contentTasks`, `portfolioRoadmap`, `socialMedia`, `subscriptions`, `promoters`, `dinnerGuestlist`, `whatsappGroups`, `whatsappCampaigns`.
- Solo lectura: `decisionLog`, `agents`, `references`, `orders`. El registro de decisiones se modifica con las herramientas de decisiones.

Todas las escrituras pasan por la validación del dashboard.

### Contratos comunes

- **Recibo**: cada escritura devuelve `operationId`, la entidad, su `_etag` y versión. El `operationId` también va en `_meta`, en el registro de actividad y en los commits (trailer `Operation:`).
- **Idempotencia**: `idempotency_key` en creaciones, lotes, trabajos y despliegues.
  - La misma clave con los mismos parámetros devuelve el resultado original (`deduplicated: true`).
  - La misma clave con parámetros distintos devuelve `CONFLICT`.
  - Las capturas repetidas no duplican.
- **Concurrencia**: `expected_etag` (registros), `expected_sha256` (archivos de código), `expected_head` (commits), `expected_current_id`/`expected_current_version` (documentos y briefs), `expected_current` (despliegues). Si no coinciden, devuelve `VERSION_CONFLICT` con el valor actual.
- **Restauraciones**: no pisan trabajo posterior. `restore_record_version` falla con `RESTORE_WOULD_OVERWRITE` si otro actor cambió después los mismos campos. Para seguir, hay que elegir `fields` o confirmar `overwrite_later`. Las restauraciones de documentos y briefs crean una versión nueva.
- **Errores**: `{ error: { code, message, hint, retryable, details, operationId } }`. El texto dice «Qué hacer».
- **Registro**: actor, principal, herramienta, proyecto, argumentos recortados, resultado, código de error y duración. Los secretos se redactan antes de escribir.

## 4. Código (workspaces)

- **Registro**: `agents-hub/workspaces.json`, editable en el panel (pestaña Workspaces). El workspace inicial es `dashboard`, este repositorio.
- **Rutas**: se resuelven con `realpath`. Se rechaza todo lo que salga del workspace, también a través de enlaces simbólicos. Nunca se exponen:
  - `.git`;
  - `.env*` (salvo los de ejemplo);
  - llaves y certificados, `credentials*.json`, `.npmrc`, `.netrc`;
  - las carpetas de datos internos del dashboard (`db.json`, `backups`, `knowledge`, `agents-hub`, `office-files`, biblioteca, vault).
- **Lectura**: `read_file` lee por rangos de líneas (máx. 2000 líneas / 256 KB) y devuelve el `sha256` del archivo completo. Los valores con forma de credencial salen redactados.
- **Parches**: `prepare_patch` acepta ediciones con `expected_sha256` o un diff unificado.
  - Se rechazan los que introducen secretos.
  - Devuelve una vista previa y un `patchId`.
  - `apply_patch` vuelve a comprobar las versiones base. Si alguien cambió el archivo, responde `VERSION_CONFLICT` y no escribe nada. La escritura es atómica, con vuelta atrás.
- **Ramas y commits**:
  - `create_branch` crea un worktree aparte (`agents-hub/worktrees/…`), registrado como `ws:rama`. Así el agente no toca la copia de trabajo del usuario.
  - `commit_changes` exige rutas explícitas y `expected_head`, rechaza ramas protegidas (`main`, `master`, `production`), revisa el diff en busca de secretos y añade los trailers `Agent:` y `Operation:`.
  - No hay push a remotos (ver matriz).

## 5. Ejecución

- **Tipos de trabajo**: `test`, `lint`, `build` y `script`. Los scripts tienen que estar en `allowedScripts` del workspace.
- **Argumentos**: se validan con una lista de flags permitidos y un juego de caracteres seguro. Las rutas deben quedar dentro del workspace. No se usa shell.
- **Límites**: tiempo máximo por tipo, registro de 2 MB con redacción línea a línea, 10 trabajos activos por agente, 2 simultáneos en el ejecutor. Al cancelar o agotar el tiempo se mata el grupo de procesos completo.
- **Persistencia**: cada trabajo guarda id, estado, progreso (incluido el recuento de pruebas), marcas de tiempo, código de salida, commit y artefactos con SHA-256. Se puede consultar desde otra llamada o desde otro chat.
- **Mac apagada o ejecutor caído**: los trabajos quedan `queued` y `get_job` lo explica en `note`.

## 6. Despliegues

1. `prepare_deployment`: construye en un worktree aislado en el commit exacto y copia el artefacto a `agents-hub/artifacts/<id>` con un manifiesto SHA-256.
2. `validate_deployment`: ejecuta las pruebas en ese mismo commit.
3. `deploy`: requiere `expected_current`. Comprueba que el artefacto no cambió y cambia el enlace `current` de forma atómica.
4. `rollback_deployment`: vuelve a una versión conocida.

Proveedor implementado: `static-release`, que publica en una carpeta local. Se configura en el workspace (`deploy: { provider: "static-release", targetDir: "/ruta/destino", artifactDir: "dist" }`); sin `artifactDir` se usa la carpeta de artefactos del trabajo `build` (por defecto `dist`). **Render** aparece como pendiente: no se promete.

## 7. Conocimiento y archivos

- **`get_context`**: breve por defecto, con indicaciones de qué pedir para ampliar. Incluye las conversaciones actualizadas en los últimos 7 días.
- **Decisiones**: se guardan con procedencia (agente, conversación, URL, cita), fecha de Panamá, versión y estado (`proposed`, `approved`, `rejected`, `superseded`).
  - `record_decision` marca posibles contradicciones con decisiones vigentes y con la síntesis del proyecto, pero nunca aprueba sola.
  - La aprobación la hace una persona en el panel, o un agente con `memory:approve`.
- **Normalización**: prioridad `low`/`medium`/`high`/`critical` y responsable `{ name, role }`. `normalize_records` la aplica en lote.
- **Documentos**: se versionan por nombre (`current`/`superseded`), con historial y recuperación.
- **Archivos grandes**:
  - `create_upload` da una URL PUT de un solo uso (15 min, tamaño y SHA-256 obligatorios, máx. 25 MB por `MCP_MAX_UPLOAD_BYTES`), así los bytes no pasan por el contexto del modelo.
  - `create_download_link` da una URL firmada de corta duración.

## 8. Integraciones y disponibilidad

`get_connection_status` y el panel (pestaña Salud) muestran cada integración:
- estados: `connected`, `configured`, `requires_configuration`, `offline` o `pending`;
- cómo se comprueba;
- qué permiso MCP la usa.

Nunca muestran valores de credenciales. No se exponen cuentas, apps u otros chats que no estén conectados. La captura de conversaciones solo guarda lo que el cliente envía.

**Hoy todo vive en la Mac.** Si está apagada o dormida, el conector no responde. Si solo falta el ejecutor, el gateway sigue sirviendo datos, conocimiento, documentos y código, y encola los trabajos.

### Diseño: gateway siempre disponible (pendiente de implantar)

1. **Gateway en la nube** (Render o Fly, con el `render.yaml` existente como base). Atiende `/mcp`, OAuth y la misma capa de permisos (`permissions.js`, `toolkit.js`).
   - Lee de la réplica de Supabase, que `initSupabaseSync` ya mantiene.
   - Guarda las escrituras de datos en una tabla de operaciones con su `operationId`.
2. **Cola duradera compartida**: una tabla `jobs` en Supabase con el mismo esquema que `job.json`.
3. **Ejecutor de la Mac en modo *pull***: se conecta hacia fuera con una credencial propia de ejecutor, recoge trabajos y operaciones, y reporta latido, registros y artefactos. No abre puertos.
4. **Con la Mac apagada**:
   - siguen disponibles la lectura de datos y conocimiento, las escrituras de datos (se aplican al volver, en orden y con control de versión) y la creación y consulta de trabajos;
   - esperan al ejecutor el código local, las pruebas, los builds y los despliegues.
   - `get_connection_status` ya devuelve esta separación (`availability`).

## 9. Panel de administración

**Agent & RAG → Agentes conectados**. Se conservan las secciones de llaves, la conexión con ChatGPT y la actividad. Las pestañas nuevas son:

- **Salud**: gateway, ejecutor (último latido, arrancar), qué espera al ejecutor e integraciones.
- **Permisos**: niveles por función y workspaces de cada agente; guardar, volver al permiso de la llave, revocar.
- **Workspaces**: registrar, activar o desactivar, quitar; estado de Git.
- **Trabajos**: activos e historial; lanzar, ver registro, cancelar.
- **Cambios y despliegues**: parches preparados y aplicados; despliegues con commit y hash del artefacto.
- **Decisiones**: propuestas de agentes con procedencia; aprobar o rechazar.
- **Errores y costos**: fallos recientes con `operationId`; costos de AI Office.

## 10. Pruebas

`tests/agentOps.test.js` levanta el servidor real con un cliente MCP oficial, un repositorio Git temporal y el ejecutor en un proceso aparte. Comprueba:

1. descubrimiento de capacidades, estado y permisos reales;
2. rechazo sin permiso (también al llamar herramientas ocultas), política persistente y revocación;
3. crear, actualizar, archivar y restaurar sin duplicados, con `expected_etag`;
4. recuperar una versión sin pisar cambios posteriores;
5. aplicar un parche y detectar el conflicto de versión, la salida del workspace, los secretos, la rama/worktree y el commit;
6. ejecutar pruebas, recuperar resultados y consultarlos tras reconectar con otro cliente;
7. cancelar, y detectar los trabajos interrumpidos al matar el ejecutor;
8. desplegar el artefacto exacto de un commit y revertir;
9. transferencia autenticada con hash y versiones de documentos;
10. decisiones con procedencia y contradicciones, sin aprobación automática;
11. respuestas, registros, trabajos y auditoría sin credenciales.

`npm test` corre toda la suite (124 pruebas, incluidas las del conector anterior).

## 11. Matriz de estado

| Capacidad | Estado | Nota |
|---|---|---|
| Descubrimiento (`get_capabilities`, `get_connection_status`, `get_permissions`) | Disponible | |
| Permisos por función, persistentes, revocables, aplicados en servidor | Disponible | Panel → Permisos |
| Conector actual (ChatGPT OAuth, llaves `cc_`, capturas, sincronización) | Disponible | Sin cambios de nombre ni forma |
| Registros: consultar, crear, editar, archivar, restaurar, lotes, versiones | Disponible | 15 módulos escribibles, 4 de lectura |
| Idempotencia y control de concurrencia | Disponible | |
| Recuperar versiones sin pisar trabajo posterior | Disponible | |
| Decisiones con procedencia, estado y contradicciones | Disponible | La aprobación es humana o `memory:approve` |
| `get_context` breve / completo | Disponible | |
| Versiones de documentos y briefs, recuperación | Disponible | |
| Transferencias de archivos grandes (subida/descarga firmadas) | Disponible | Máx. 25 MB |
| Lectura de código, búsqueda, Git status/diff | Requiere configuración | Dar `code:read` y el workspace al agente |
| Parches con control de versión | Requiere configuración | `code:write` |
| Ramas (worktree) y commits | Requiere configuración | `code:commit`; nunca en ramas protegidas |
| Trabajos test/lint/build/scripts con ejecutor aparte | Requiere configuración | `exec:run`; el ejecutor arranca solo |
| Otros repositorios | Requiere configuración | Registrarlos en Panel → Workspaces |
| Despliegue `static-release` con rollback | Requiere configuración | `deploy` en el workspace y permiso `deploy` |
| Acceso público para ChatGPT | Disponible | Tailscale Funnel + `PUBLIC_URL` (en producción) |
| Panel de administración (salud, permisos, workspaces, trabajos, cambios, despliegues, decisiones, errores, costos) | Disponible | |
| Despliegue en Render por MCP | Pendiente | Falta API key de Render y el proveedor |
| Push a GitHub / pull requests | Pendiente | No hay credenciales de GitHub en el servidor |
| Gateway siempre disponible + ejecutor en modo pull | Pendiente | Diseño en §8 |
| Costos por llamada MCP | Pendiente | Hoy se muestran los costos de modelos de AI Office |
