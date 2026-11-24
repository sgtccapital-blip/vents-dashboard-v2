# AI OFFICE HQ — ARQUITECTURA DEL SISTEMA EN 6 CAPAS
**Documento:** `AI_OFFICE_ARCHITECTURE.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG  
**Liderazgo:** Usuario (CEO) / BART (COO & Lead Orchestrator)  

---

## 1. Visión Arquitectónica y Principios de Diseño

AI OFFICE HQ está concebida como la sede operativa visual de una empresa autónoma de agentes de inteligencia artificial. No es una simulación decorativa ni un juego aislado: **cada elemento visual en la oficina refleja una entidad, proceso, tarea o recurso en ejecución real.**

### Principios Fundamentales:
1. **Verdad Operativa:** Si un agente se muestra "escribiendo código", es porque hay un proceso de desarrollo o ticket en curso. Si está "en reunión", es porque participa en una deliberación multiagente en el canal de consulta.
2. **Desacoplamiento Estricto:** La capa de renderizado visual (Capa 1) está completamente separada del motor de agentes y del almacenamiento. La visualización puede apagarse, cambiarse de motor gráfico o verse en modo lista/mapa sin alterar la ejecución de los agentes.
3. **Jerarquía Corporativa Claramente Definida:**  
   $$\text{CEO (Usuario)} \longrightarrow \text{BART (COO)} \longrightarrow \text{Directores de Departamento / Agentes Especialistas}$$
4. **Human-in-the-Loop Obligatorio:** Umbrales de presupuesto y acciones críticas requieren autorización explícita del CEO desde su despacho.

---

## 2. Diagrama de Arquitectura en 6 Capas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CAPA 1: OFFICE EXPERIENCE (GUI)                       │
│  [Mapa Isométrico 2.5D] [Avatares & Despachos] [Rooms] [Tooltips] [Modales] │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Eventos de Interfaz / Telemetría
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       CAPA 2: AGENT MANAGEMENT                              │
│  [Registro de Agentes] [Departamentos] [Skills] [Modelos LLM] [Presupuestos]│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Asignación de Roles & Capacidades
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    CAPA 3: AGENT ORCHESTRATION (BART COO)                   │
│  [Objetivos] [Descomposición en Tareas] [Scoring] [Supervisión] [Breakers]  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Consultas de Contexto & Persistencia
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    CAPA 4: INTELLIGENCE & MEMORY (RAG)                      │
│  [BrainVault Markdown] [Hybrid Search] [Vectores/Pinecone] [Memoria Epígrafe]│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Llamada a Herramientas & Handlers
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                   CAPA 5: EXECUTION & INTEGRATIONS                          │
│  [OpenClaw Core] [Browser-Use/Playwright] [MCP Server] [WhatsApp] [Webhooks] │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Guardrails, Límites & Autorizaciones
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                         CAPA 6: GOVERNANCE & CONTROL                        │
│  [Aprobaciones del CEO] [Auditoría] [Circuit Breakers] [Kill Switch General] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación Detallada de las 6 Capas

### Capa 1: Office Experience (Interfaz Gráfica)
Responsable del renderizado, la interacción espacial y el feedback visual.
- **Render Engine:** Proyección isométrica 2.5D con soporte de pan/zoom interactivo, minimapa de navegación y selector de departamentos.
- **Distribución de Espacios (Layout):**
  - **Recepción:** Punto de entrada de nuevas misiones, carga de briefs y visualización del backlog global.
  - **CEO Office:** Despacho privado del usuario. Command Center con enlace directo a BART, monitor de métricas financieras y botón de parada de emergencia (`Kill Switch`).
  - **Executive Office:** Despacho de BART (COO). Mesa de estrategia, tablero de orquestación y estado de los departamentos.
  - **Cubículos Departamentales:** Estaciones individuales de trabajo equipadas con monitor dinámico (muestra estado y tarea actual), lámpara de estado y badge de la empresa activa.
  - **Meeting Room / War Room:** Mesa de juntas central para deliberaciones multiagente, votaciones y análisis estratégico conjunto.
  - **Creative Studio:** Espacio para diseño, redacción de copys, generación de contenido y guiones de video.
  - **Tech & Dev Lab:** Laboratorio de ingeniería de software, testing y frontend (estación de Antigravity).
  - **Operations & Logistics Hub:** Gestión de inventarios, venues y coordinación técnica.
  - **Sales & CRM Station:** Manejo de embudos, leads y acuerdos comerciales.
  - **Server Room & MCP Gate:** Racks con luces de actividad que representan el estado de los servicios backend, OpenClaw y el servidor MCP.
  - **Knowledge Library:** Estanterías interactivas para explorar la base de conocimiento (`BrainVault`) y el estado del motor RAG.
- **Estados Operativos Visuales:**
  - `OFFLINE`: Avatar en reposo, pantalla de escritorio apagada.
  - `AVAILABLE`: Pantalla en verde suave, listo para recibir asignaciones.
  - `PLANNING`: Burbuja con icono de engranajes y barra de pensamiento activo.
  - `EXECUTING`: Animación de tipeo activo, brillo en el monitor con el color del departamento y barra de progreso.
  - `WAITING_APPROVAL`: Halo pulsante ámbar y alerta en el despacho del CEO.
  - `BLOCKED`: Halo rojo con indicador de bloqueo y mensaje de asistencia.
  - `IN_MEETING`: Avatar posicionado en la sala de reuniones junto a los agentes colaboradores.
  - `RESTING`: Estado de bajo consumo de recursos entre ciclos.

---

### Capa 2: Agent Management (Gestión de Empleados Digitales)
Administra la identidad y competencias de la fuerza laboral digital.
- **Entidad `Agent`:**
  - `id`, `name`, `role`, `departmentId`, `hierarchyLevel` (Lead, Specialist, Worker).
  - `modelConfig`: Modelo LLM asignado (ej: `gemini-2.5-flash` para velocidad y razonamiento, `gemini-2.5-pro` para análisis complejo).
  - `skills`: Habilidades activas (ej: `copywriting`, `data_mining`, `image_prompter`, `whatsapp_messaging`).
  - `tools`: Herramientas permitidas (ej: `web_search`, `read_vault`, `write_inbox`, `browser_exec`).
  - `budgetAllowance`: Límite máximo de gasto diario y por tarea (en dólares y tokens).
  - `currentStatus`: Estado operativo en tiempo real.

---

### Capa 3: Agent Orchestration (BART como COO)
El cerebro operativo que traduce las intenciones del CEO en resultados terminados.
- **Recepción de Misiones:** BART recibe objetivos de alto nivel desde la barra de comandos o la recepción (ej: "Lanzar campaña de HangOut Panamá").
- **Descomposición Jerárquica:** Divide la misión en un grafo acíclico dirigido (DAG) de `agentTasks` con dependencias explícitas.
- **Scoring y Triaje:** Asigna cada tarea al departamento y agente especialista correspondiente mediante la fórmula de scoring de prioridad auditada.
- **Supervisión & Heartbeat:** Monitorea la ejecución en intervalos regulares. Si un agente se retrasa o reporta un error, BART aplica reintentos automáticos o re-enruta la tarea.
- **Control de Calidad (QA):** Antes de entregar un resultado al CEO, BART verifica que el entregable cumpla con el brief inicial.

---

### Capa 4: Intelligence & Memory (RAG y Memoria)
Provee el contexto corporativo y la continuidad del aprendizaje.
- **Memoria a Largo Plazo:** Archivo `BrainVault/ARSENAL/BartConversations.md` y base vectorial local `vectors.json`.
- **Memoria de Proyectos:** Registro de decisiones (`decisionLog`) y restricciones comerciales por empresa o venue.
- **Memoria de Ejecución:** Historial de logs por agente en `db.json` (`agentMemory`) con lecciones aprendidas de ejecuciones previas.
- **Búsqueda Semántica Híbrida:** Consultas en tiempo real al motor RAG para contextualizar prompts con información de clientes, eventos y precios.

---

### Capa 5: Execution & Integrations
El puente hacia el mundo real y las aplicaciones externas.
- **OpenClaw Engine:** Ejecución de scripts y tareas de scraping o extracción de datos.
- **Browser Automation:** Conexión con `browser-use` y `playwright` para navegación web controlada.
- **Servidor MCP (`@modelcontextprotocol/sdk`):** Permite a agentes externos (Claude, Gemini CLI, Cursor) consultar el contexto de la empresa y reportar entregables vía el protocolo estándar MCP.
- **Canales de Salida:** Agente de Difusión (`/difusion`) para envíos por WhatsApp, Instagram, TikTok y webhooks externos.

---

### Capa 6: Governance (Gobernanza y Seguridad)
Garantiza el control absoluto del CEO y la seguridad operacional.
- **Niveles de Autonomía (1 a 4):**
  - **Nivel 1:** Acciones de solo lectura y generación de borradores. Ejecución autónoma total.
  - **Nivel 2:** Operaciones internas de bajo impacto (< \$500). Ejecución autónoma con registro en `activityFeed`.
  - **Nivel 3:** Modificaciones en bases de datos o compras entre \$500 y \$5,000. Requiere confirmación del CEO en el panel de aprobaciones.
  - **Nivel 4:** Acciones críticas (> \$5,000 o publicaciones directas en redes públicas). Bloqueo estricto hasta aprobación formal con firma digital/contraseña.
- **Circuit Breakers:** Desconexión automática de agentes que alcancen umbrales de fallo continuo para proteger presupuestos y APIs.
- **Kill Switch Global:** Botón físico/virtual en el despacho del CEO que detiene de inmediato todos los workers y procesos activos.
