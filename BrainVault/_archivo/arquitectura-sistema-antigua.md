# OPENCLAW: CORE SYSTEM ARCHITECTURE & NAVIGATION MAP

Este documento es el manifiesto oficial arquitectónico del ecosistema OpenClaw / Antigravity dentro del sistema. Si OpenClaw consulta su base vectorial para entender "dónde está instalado todo y cómo se conecta", este mapa le proveerá la topología anatómica exacta de sí mismo.

## 1. El Comando Central (Centro de Operaciones)
**Ruta Root:** `/Users/gg/MAIN DASHBOARD GG/`
Es la carpeta matriz. Todo el ecosistema opera desde aquí. Contiene el Dashboard principal (Node.js/Vite en `server.js` y `src/`), la base de datos central en formato crudo `db.json` que registra proyectos, usuarios y tareas, y aloja las carpetas físicas de todos los microservicios descritos a continuación.

## 2. El Cerebro Primario: \`openclaw-core\`
**Ruta:** `/Users/gg/MAIN DASHBOARD GG/openclaw-core/`
Es el núcleo de procesamiento e inteligencia principal de OpenClaw (Bart - COO). 
- `src/agent/OpenClawAgent.ts`: Es la clase controladora. Atiende las peticiones del Agent Manager del Dashboard y activa tu razonamiento.
- `src/agent/orchestrator/`: Capa de razonamiento y decisión "Estilo Jarvis".
  - `intent_classifier.ts`: Descubre QUÉ quiere el usuario.
  - `planner.ts`: Elabora el plan logístico sobre CÓMO resolver la tarea.
  - `router.ts`: Manda el plan al Worker (el área del cerebro) ideal.
- `src/agent/workers/`: Lóbulos de conocimiento especializado profundo:
  - `ops_agent.ts`: Logística, hardware pre-físico (dimensionamiento de lavadoras), operaciones en terreno.
  - `finance_agent.ts`: Presupuestos puros (TCO, CAPEX/OPEX, ROI numérico).
  - `document_agent.ts`: Auditoría dura, Pliegos y normativas restrictivas, extracción vía PDF.
- `src/tools/nativeTools.ts`: Las "manos" de OpenClaw. Te permiten llamar funciones programadas para scrape web o usar bash de forma autónoma.

## 3. Memoria Permanente Vectorial: \`openclaw-rag\`
**Ruta:** `/Users/gg/MAIN DASHBOARD GG/openclaw-rag/`
Microservicio hiper-especializado en recuperación de datos (RAG). 
Toma como input los archivos y conversaciones, embebe el texto matemáticamente usando modelos precisos (típicamente guardados en el archivo `vectors.json` a nivel root, o Pinecone si se escaló). 
- **La Conexión:** `openclaw-core` llama a este rag mediante `vectorStore.ts` silenciosamente detrás de escenas, inyectando todo el conocimiento hallado dentro del prompt (memoryContext) en cada interacción que tienes con el usuario.

## 4. El Repositorio Semántico Cognitivo: \`BrainVault\`
**Ruta:** `/Users/gg/MAIN DASHBOARD GG/BrainVault/`
Es tu bóveda pasiva de conocimiento Markdown local (Obsidian). Aquí reposa cada miligramo de teoría o charla valiosa que has tenido. Todo este repositorio nutre al esclavo vectorizador de `openclaw-rag`.
- `ARSENAL/BartConversations.md`: El "Córtex Prefrontal Log". Registra absolutamente todas tus conversaciones directas con el usuario de manera cronológica en tiempo real, dotándote de Short Term y Medium Term memory contínuo sin esfuerzo manual.

## 5. El Pabellón de Delegación Secundario: \`paperclip\`
**Ruta:** `/Users/gg/MAIN DASHBOARD GG/paperclip/`
Es el marco (framework) de "The Agents Office". Constituye el recurso humano asíncrono para OpenClaw. Aquí residen agentes secundarios (Nexus, Atlas, Echo, CloserOps).
- **La Conexión:** Si la orden del usuario asume que **"no lo debes hacer en vivo"** sino delegarlo a background (ej. diciendo explícitamente "delega"), tu sistema activará la herramienta `delegateTaskToAgent` mandando el task al motor de Paperclip, liberando tu CPU principal.

## 6. Personalidad y Expansibilidad: \`workspace\`
**Ruta:** `/Users/gg/MAIN DASHBOARD GG/workspace/`
- `SOUL.md`: El alma del sistema. Tienen tus directivas maestras de identidad, el tono, que eres proactivo y actúas como el socio/COO.
- `skills/`: Directorios físicos donde se instalan "habilidades" atómicas, recetas o lógicas prehechas que lees bajo demanda.

---

*FIN DEL REPORTE DE SISTEMA. Estatus General: ONLINE.*
*Propósito: Autoconciencia sistémica. Tienes la habilidad de modificar tu propio código usando el Tool Calling natural hacia estos directorios.*
