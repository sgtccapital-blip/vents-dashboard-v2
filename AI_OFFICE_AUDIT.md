# AI OFFICE HQ — AUDITORÍA TÉCNICA Y ESTADO DEL SISTEMA
**Documento:** `AI_OFFICE_AUDIT.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG / ARRIVE OS  
**Rol del Usuario:** CEO  
**Rol del Agente Orquestador:** BART (COO)  

---

## 1. Resumen Ejecutivo de la Auditoría

El presente documento constituye la auditoría técnica exhaustiva del repositorio **MAIN DASHBOARD GG**, realizada con el objetivo de servir de cimiento a la evolución del módulo de agentes hacia una **Oficina Virtual de Agentes de Inteligencia Artificial (AI OFFICE HQ)** gráfica, interactiva, operativa y 100% conectada a la infraestructura existente.

### Conclusión Principal de la Auditoría
El sistema cuenta con una base de arquitectura y servicios sumamente madura:
1. **Frontend:** React 19 + Vite 6 + React Router v7 con estilos glassmorphism dark-mode corporativos.
2. **Backend:** Servidor Node.js/Express (`server.js`) con más de 70 endpoints REST, motor RAG embebido, bus MCP nativo (`@modelcontextprotocol/sdk`), y puente de orquestación multiagente con circuit breakers.
3. **Base de Datos:** Motor transaccional local desacoplado en `./db.json` con colecciones dedicadas (`agents`, `agentTasks`, `agentMemory`, `agentKPIs`, `circuitBreakers`, `activityFeed`, `projects`, `events`, etc.).
4. **Agentes:** Orquestación centralizada en `server.js` bajo la dirección de **BART (COO)** con derivación a agentes especializados (**Nexus, Echo, Atlas, CloserOps, Scout, Sentinel, Pulse, Antigravity**), con persistencia de tareas en `_agent_inbox/` y logs en tiempo real.
5. **No hay necesidad de duplicar ni crear aplicaciones separadas:** La infraestructura ya contiene los componentes funcionales, las colecciones de base de datos y los servicios para renderizar y operar la oficina virtual directamente como una vista nuclear dentro del dashboard.

---

## 2. Pila Tecnológica (Tech Stack)

### 2.1. Frontend
- **Framework:** React `19.0.0`
- **Bundler & Dev Server:** Vite `6.0.7`
- **Enrutamiento:** `react-router-dom` `7.1.1` (con Layout persistente `AppLayout`, `Sidebar`, `Topbar`)
- **Iconografía:** `lucide-react` `0.469.0`
- **Drag & Drop:** `@hello-pangea/dnd` `18.0.1`
- **Markdown Rendering:** `react-markdown` `9.0.3`, `remark-gfm` `4.0.0`
- **Estilos:** CSS Glassmorphism modular (`src/index.css`, `src/App.css`, `src/mobile.css`, temas específicos para estudio, agencia y finanzas)

### 2.2. Backend
- **Runtime:** Node.js (ES Modules nativos `"type": "module"`)
- **Servidor HTTP:** Express `5.0.1` (en `server.js`, operando habitualmente en puerto `3001` / `8090`)
- **Protocolos en Tiempo Real:** Server-Sent Events (SSE) y polling inteligente delta (`/api/state`)
- **Orquestación & Programación:** `node-cron` `3.0.3` para disparadores automáticos y chequeos periódicos de agentes
- **Subida de Archivos:** `multer` `1.4.5-lts.1`
- **Parsers:** `pdf-parse` `1.1.1`, `youtube-transcript` `1.2.1`
- **Esquemas & Validación:** `zod` `3.24.1`

### 2.3. Modelos de Lenguaje & RAG
- **SDK Oficial Gemini:** `@google/genai` `^1.48.0` y `@google/generative-ai` `^0.24.0`
- **SDK Anthropic:** `@anthropic-ai/sdk` `^0.39.0`
- **Vector DB / RAG:**
  - Indexación local: `vectors.json` con búsqueda híbrida (Full-Text Search con normalización semántica + similitud de coseno).
  - Integración externa: `@pinecone-database/pinecone` `^7.1.0` (Pinecone Serverless para namespaces vectoriales).
  - Repositorio de Conocimiento RAG en Markdown: `BrainVault/` (subcarpetas `ARSENAL`, `OPERATIONS`, `INCUBATOR`, `PERSONAL`).
- **Servidor MCP:** `@modelcontextprotocol/sdk` `^1.6.0` implementado en `src/services/agentHub/mcpServer.js` (puerto `/mcp`).

---

## 3. Estado de Componentes Históricos Auditados

| Elemento Consultado | Estado Actual en Repositorio | Diagnóstico y Acción |
| :--- | :--- | :--- |
| `src/pages/AgentsOffice.jsx` | ⚠️ No existe como página suelta; existe `src/components/ArriveTeamOffice.jsx` (790 líneas) con el equipo humano y estaciones de trabajo de ARRIVE Agency. | Se creará `src/pages/AiOfficeHQ.jsx` integrando la visualización gráfica 2.5D/isométrica y el motor operativo multiagente. |
| `server.js` | ✅ Activo y operativo (291 KB, más de 6,000 líneas). Centraliza APIs, RAG, Webhooks, WhatsApp, y Orquestador. | Base principal del backend. Se añadirán endpoints de estado en tiempo real para la oficina virtual (`/api/office/*`). |
| API Express `localhost:3001` | ✅ Configurado y funcionando en `server.js`. | Núcleo de la API. |
| OpenClaw en `localhost:18789` | ✅ Código existente en `openclaw-core/` y proxy en `server.js` (`/api/openclaw/*`). | Integrado como ejecutor de herramientas nativas y background workers. |
| `db.json` | ✅ Activo (401 KB). Fuente de verdad local transaccional. | Contiene colecciones listas para persistir la oficina. |
| `_agent_inbox/*.md` | ✅ Activo. Utilizado por `/api/orchestrator/delegate` para inyectar tickets Markdown a Antigravity. | Canal de comunicación por tickets estandarizado. |
| Pinecone Serverless | ✅ Configurado con SDK en backend; fallback activo a RAG embebido local (`vectors.json`). | Opera en modo dual: alta disponibilidad local sin depender de latencias externas. |
| Gemini API | ✅ Integrado mediante `@google/genai` con clave `GEMINI_API_KEY` en `.env`. | Modelo preferente para inferencia, routing de BART y resúmenes. |
| `/api/orchestrator/delegate` | ✅ Implementado en línea 3704 de `server.js`. | Contiene motor de scoring de prioridad, niveles de autonomía 1-4, ruteo a agentes y circuit breakers. |
| Colección `agents` | ✅ Presente en `db.json`. | Agentes base registrados (`agent-openclaw-super`, `agent-pulse`, `agent-licitia`). Se sincroniza con el catálogo de agentes de la oficina. |
| Colección `projects` | ✅ Presente en `db.json` (8 proyectos activos: ARRIVE Agency, HangOut Panamá, LicitIA, RecordAI, Waller App, etc.). | Conectado con la asignación de misiones y tableros. |
| Colección `companies` | ⚠️ Array vacío en `db.json`; las marcas y empresas viven mapeadas en `projects` (categorías `agency`, `business`, `media`) y en `seedData.js`. | Se estandarizarán en la entidad `companies` para reflejar la relación multi-empresa (ARRIVE Services, ARRIVE Models, HangOut Panamá, Terraplén Rooftop, Furia, Piano Bar). |
| Colección `tasks` | ✅ Presente en `db.json` (60+ tareas operativas con estados, prioridad, fechas y asignación). | Se vinculan a las tareas ejecutivas de los agentes. |
| Colección `agentTasks` | ✅ Presente en `db.json`. Creada y consumida por el orquestador. | Utilizada para tracking granular de subtareas, dependencias y estados de ejecución. |
| Colección `orders` | ✅ Presente en `db.json`. | Registra pedidos/transacciones operativas. |
| Colección `activityFeed` | ✅ Presente en `db.json`. Feed unificado de eventos y acciones del sistema. | Conectado al ticker de actividad en vivo de la oficina virtual. |

---

## 4. Auditoría de Base de Datos y Esquemas (`db.json`)

El archivo `db.json` cuenta con 31 colecciones clave. Las entidades nucleares para la oficina virtual son:

```json
{
  "agents": [
    {
      "id": "agent-bart",
      "name": "BART (COO)",
      "role": "Chief Operating Officer & Head Orchestrator",
      "department": "Executive Office",
      "status": "active", // active, planning, executing, in_meeting, blocked
      "model": "gemini-2.5-flash",
      "autonomyLevel": 4,
      "skills": ["orchestration", "task_decomposition", "qa_verification", "rag_synthesis", "budget_guardrails"],
      "avatar": "👔",
      "stationId": "desk-bart"
    }
  ],
  "agentTasks": [
    {
      "id": "atask-1774350000000",
      "task": "Generar estrategia de lanzamiento para HangOut Panamá",
      "description": "Elaborar propuesta integral de marketing, booking y difusión",
      "priorityScore": 8.4,
      "autonomyLevel": 2,
      "impactEstimate": 1500,
      "status": "in_progress", // pending, in_progress, waiting_approval, done, blocked
      "assignedAgent": "Nexus (Marketing)",
      "delegatedBy": "BART (COO)",
      "projectId": "portfolio-hangout",
      "createdAt": "2026-11-24T10:00:00.000Z",
      "progress": 45,
      "currentStep": "Borrando copies para Instagram Broadcast"
    }
  ],
  "circuitBreakers": [
    {
      "agent": "Nexus (Marketing)",
      "status": "active", // active, frozen
      "failuresCount": 0,
      "lastError": null,
      "timestamp": "2026-11-24T09:00:00.000Z"
    }
  ],
  "agentMemory": [
    {
      "id": "mem-1",
      "agentId": "agent-bart",
      "scope": "project",
      "targetId": "portfolio-hangout",
      "keyInsight": "HangOut Panamá requiere una imagen nocturna chic con enfoque en DJs locales y cena VIP.",
      "updatedAt": "2026-11-24T08:00:00.000Z"
    }
  ],
  "activityFeed": [
    {
      "id": "act-1774351111111",
      "agent": "BART (COO)",
      "action": "task_delegation",
      "details": "Misión asignada a Nexus (Marketing): Campaña HangOut Panamá",
      "timestamp": "2026-11-24T10:02:00.000Z"
    }
  ]
}
```

---

## 5. Auditoría del Mecanismo de Orquestación y Delegación

El endpoint `/api/orchestrator/delegate` en `server.js` implementa un algoritmo de triaje determinista y supervisado:
1. **Árbol de Decisión Semántico:** Analiza el texto y contexto de la tarea para asignar el agente idóneo:
   - `licitaci / pliego / panamacompra` ➔ **Sentinel (Analyst)**
   - `redes / social / post / copy / contenido` ➔ **Echo (Social)**
   - `campaña / ads / growth / lanzamiento` ➔ **Nexus (Marketing)**
   - `costo / proveedor / cotizar / compras` ➔ **Scout (Sourcing)**
   - `inventario / stock / entrega / logistica` ➔ **Atlas (Logistics)**
   - `lead / crm / vender / prospecto / cliente` ➔ **CloserOps (Sales)**
   - `whatsapp / comunidad / broadcast / difusion` ➔ **Pulse (WhatsApp & Community)**
   - `codigo / ui / frontend / react / bug` ➔ **Antigravity (Engineer)** (genera ticket Markdown en `_agent_inbox/`)
   - Cualquier otra tarea ejecutiva o no clasificada ➔ **BART (COO)**
2. **Motor de Scoring de Prioridad:**  
   $$\text{PriorityScore} = (\text{ROI} \times 0.4) + (\text{Urgencia} \times 0.3) + (\text{Estrategia} \times 0.2) - (\text{Riesgo} \times 0.1)$$
3. **Niveles de Autonomía:**
   - Impacto > \$25,000: Nivel 4 (requiere aprobación explícita del CEO; estado `blocked_auth`).
   - Impacto > \$5,000: Nivel 3 (requiere aprobación explícita del CEO; estado `blocked_auth`).
   - Impacto > \$500: Nivel 2 (ejecución con notificación).
   - Impacto $\le$ \$500: Nivel 1 (ejecución autónoma).
4. **Circuit Breakers:**
   - Si un agente falla de forma reiterada o está congelado (`frozen`), el orquestador re-enruta automáticamente la tarea hacia **BART (COO)** para resolución de contingencia.

---

## 6. Arquitectura RAG y Base de Conocimiento

El sistema dispone de un motor RAG híbrido de alto rendimiento en `src/services/knowledge/`:
- **`engine.js`**: Búsqueda híbrida que pondera similitud vectorial (embeddings Gemini / locales) y coincidencia de términos en español con soporte para tildes y sinónimos.
- **`digest.js`**: Generador de resúmenes ejecutivos para reducir el consumo de tokens en conversaciones extensas.
- **`embeddings.js`**: Caché de embeddings para minimizar llamadas a la API y acelerar el tiempo de respuesta.
- **`BrainVault/`**: Contenedor documental en archivos Markdown accesibles en tiempo real por los agentes:
  - `ARSENAL/`: Configuraciones maestras, prompts, arquitectura de OpenClaw y memoria de Bart (`BartConversations.md`).
  - `OPERATIONS/`: Operaciones de venues, eventos, checklist de proyectos y workspaces.
  - `INCUBATOR/`: Ideas de nuevos negocios y líneas de ingresos.
  - `PERSONAL/`: Líneas directivas y visión del CEO.

---

## 7. Diagnóstico de Componentes Reutilizables

Para la construcción de la oficina virtual, se reutilizan de forma directa los siguientes activos comprobados:
1. **`src/components/ArriveTeamOffice.jsx`:** Estructura de estaciones de trabajo, divisiones operativas, avatares, métricas de equipo y modal de detalle.
2. **`src/components/DashboardCopilot.jsx`:** Canal de voz bidireccional (Web Speech API) y chat con BART.
3. **`src/services/agentHub/`:** Servidor MCP estándar para integración de herramientas y emisión de eventos.
4. **`src/context/AppContext.jsx`:** Gestión de estado global con sincronización reactiva local y remota (`/api/state`).
5. **Estilos e Iconografía:** `lucide-react` y variables CSS glassmorphism (`bg-[#0B0F17]/80`, `border-white/10`, `backdrop-blur-xl`, acentos neon).

**Resultado:** La base de código está en un estado óptimo para la implementación inmediata de **AI OFFICE HQ**, sin requerir refactorizaciones destructivas ni dependencias incompatibles.
