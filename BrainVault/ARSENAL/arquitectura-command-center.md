---
titulo: "Sistema: arquitectura del Command Center"
tipo: sistema
archivo: ARSENAL/arquitectura-command-center.md
actualizado: 2026-10-14
fuente: "CLAUDE.md; README.md; server/agent.js; server/routes/bridge.js; server/routes/rag.js; server/brainVault.js; server/push.js; server.js; bridge/SKILL.md; _archivo/arquitectura-sistema-antigua.md (solo como contexto histórico)"
etiquetas: [sistema, arquitectura, bart, rag, openclaw, render, supabase, notificaciones]
relacionados: [INCUBATOR/proyecto-command-center-bart.md, NEGOCIO/equipo.md, OPERATIONS/comunidades-whatsapp.md]
---

# Sistema: arquitectura del Command Center

## Resumen
El Command Center es una página web (React + servidor Express) publicada en Render, con sus datos
guardados en un archivo local y copiados en la nube de Supabase. Bart, el agente, responde desde la
nube con Gemini (o con un motor local sin IA si Gemini no está disponible) y, cuando el Mac de GG
está conectado, a través del OpenClaw del Mac mediante un puente. Bart consulta un "cerebro" (RAG)
que mezcla estos documentos del BrainVault con los datos en vivo del dashboard. Cada persona del
equipo entra con su usuario y recibe notificaciones en su teléfono.

## Datos clave
- El Command Center está publicado como un solo servicio web en Render: el mismo servidor sirve la página y la API.
- El Command Center guarda todo en un archivo local (db.json) para que sea rápido y lo copia en segundo plano a Supabase; al reiniciarse en Render, recupera el último estado desde Supabase.
- El cerebro de Bart en el Command Center es una búsqueda por palabras clave (BM25) sobre los documentos curados del BrainVault, los documentos subidos y los datos en vivo del dashboard (proyectos, eventos, tareas, notas, contactos).
- El BrainVault del Command Center se vuelve a indexar en cada arranque del servidor, así que cada deploy trae los documentos más recientes; lo que empieza con "_" (plantillas y archivo) no se indexa.
- Bart en la nube del Command Center usa Gemini con llamadas a herramientas (modelo por defecto gemini-2.5-flash) y, si no hay clave de Gemini o falla, responde con un motor local sin IA.
- La sección "OpenClaw Master Orchestrator" es la única del Command Center que dice "OpenClaw": conecta con Bart en el OpenClaw del Mac de GG.
- El puente del Command Center con el Mac (bart-bridge) corre en el Mac y se conecta hacia el dashboard; el gateway de OpenClaw nunca se expone a internet.
- El puente bart-bridge del Command Center pide mensajes pendientes al dashboard, los pasa al OpenClaw local y devuelve la respuesta de Bart.
- El puente del Command Center da al Mac por desconectado si no hay noticias en 45 segundos, y Bart tiene hasta unos 170 segundos para responder desde el Mac.
- Si el Mac está apagado, el Command Center responde con Bart en la nube (Gemini o motor local).
- La skill "command-center" instalada en el OpenClaw del Mac permite que Bart lea y actúe en el dashboard desde cualquier chat (tareas, eventos, proyectos, notas, posts de clientes ARRIVE).
- Las acciones de Bart en el Command Center son: crear y completar tareas, crear eventos y proyectos, añadir notas e hitos, cambiar estados y crear posts de clientes.
- Cada persona del equipo del Command Center (GG, JOSHUA, MARIO, ANDREA, FANNY, JEIKOB, FIVVR) inicia sesión con su nombre; puede tener contraseña propia o usar la común, y la sesión queda en una cookie segura.
- Lo que una persona hace en el Command Center queda registrado con su nombre, y los mensajes que le manda a Bart llegan como "[Command Center · PERSONA]".
- Las notificaciones push del Command Center avisan solo a la persona indicada: al asignarle una tarea, con un resumen diario a las 8:00 AM y con un recordatorio a las 6:00 PM si hay eventos al día siguiente (hora de Panamá).
- El agente Pulse del Command Center compila cada lunes a las 9:00 AM (hora de Panamá) un borrador de campaña semanal de WhatsApp.
- La zona horaria del Command Center es America/Panama y las fechas se manejan en formato AAAA-MM-DD.
- La arquitectura vieja del Command Center (carpetas openclaw-core, openclaw-rag, paperclip y workspace en el Mac) es solo contexto histórico; la de hoy es la descrita en esta ficha.

## Cómo se trabaja
1. Para conectar el Mac: en Render debe existir la clave de API; en el dashboard ir a "Bart & Cerebro RAG → OpenClaw Master Orchestrator → Conectar mi Mac", copiar el comando y pegarlo en la Terminal del Mac.
2. El instalador activa el endpoint local de OpenClaw, encuentra a Bart, instala la skill "command-center" y deja el puente como servicio que arranca solo.
3. Para revisar el puente en el Mac: ver el log en ~/.bart-bridge/bridge.log.
4. Para agregar conocimiento al cerebro: crear una ficha en la carpeta correcta del BrainVault siguiendo las plantillas y hacer deploy; se indexa al arrancar.

## Preguntas frecuentes
P: ¿Dónde vive el Command Center?
R: En Render, como un solo servicio web. Los datos se guardan en un archivo local del servidor y se copian a Supabase, de donde se recuperan cuando el servidor se reinicia.

P: ¿Qué pasa si el Mac de GG está apagado?
R: Bart sigue respondiendo desde la nube con Gemini, o con el motor local sin IA si Gemini no está disponible. La sección OpenClaw Master Orchestrator mostrará el Mac como desconectado.

P: ¿De dónde saca Bart lo que sabe?
R: De dos fuentes: los datos en vivo del dashboard (proyectos, eventos, tareas, notas, contactos) y los documentos curados del BrainVault y los documentos subidos, que busca por palabras clave.

P: ¿Cómo actualizo lo que sabe Bart?
R: Los datos que cambian se editan en el dashboard y Bart los ve al instante. El conocimiento fijo (venues, procesos, precios, personas) se escribe como ficha en el BrainVault; se indexa en el siguiente arranque o deploy.

P: ¿Es seguro conectar el OpenClaw del Mac?
R: Sí: el gateway de OpenClaw nunca se expone a internet. Es el Mac el que se conecta hacia el dashboard con una clave de API y recoge los mensajes pendientes.

P: ¿Cómo sabe Bart quién le está hablando?
R: Cada persona inicia sesión con su nombre y sus mensajes a Bart llegan marcados como "[Command Center · PERSONA]"; así "mis tareas" se refiere a las de esa persona.

P: ¿Cuándo llegan notificaciones al teléfono?
R: Cuando a alguien se le asigna una tarea, cada día a las 8:00 AM con el resumen, y a las 6:00 PM si hay eventos al día siguiente.

## Pendientes
- [PENDIENTE] URL pública del dashboard en Render y quién administra la cuenta (sin claves).
- [PENDIENTE] Quién del equipo ya activó las notificaciones en su teléfono.
- [PENDIENTE] Qué modelo de IA usa Bart en el OpenClaw del Mac.
- [PENDIENTE] Plan de respaldo si Supabase o Render fallan.
