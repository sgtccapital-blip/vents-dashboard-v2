# AI OFFICE HQ — ROADMAP DE IMPLEMENTACIÓN FASEADA
**Documento:** `AI_OFFICE_ROADMAP.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG  

---

## 1. Visión General del Roadmap

El despliegue de **AI OFFICE HQ** se realiza de manera incremental y modular, garantizando que el dashboard se mantenga 100% operativo en cada fase y que todas las pruebas automatizadas sigan pasando sin regresiones.

---

## 2. Detalle de Fases de Desarrollo

### FASE 0: Auditoría Técnica e Investigación (COMPLETADA ✅)
- [x] Auditoría completa de código, dependencias, RAG y endpoints (`AI_OFFICE_AUDIT.md`).
- [x] Análisis comparativo y selección de repositorios open source (`AI_OFFICE_REPOSITORIES.md`).
- [x] Definición formal de la arquitectura en 6 capas (`AI_OFFICE_ARCHITECTURE.md`).
- [x] Especificación de modelos de datos y máquinas de estado (`AI_OFFICE_DATA_MODEL.md`).
- [x] Protocolo de comunicación inter-agente (`AI_OFFICE_AGENT_PROTOCOL.md`).
- [x] Protocolo de seguridad y guardrails (`AI_OFFICE_SECURITY.md`).
- [x] Catálogo de integraciones técnicas (`AI_OFFICE_INTEGRATIONS.md`).

---

### FASE 1: Oficina Gráfica Funcional & Command Center (EN EJECUCIÓN 🚀)
**Objetivo:** Construir la experiencia visual interactiva completa y conectarla con los datos reales del dashboard.
- [ ] Enrutamiento en `src/App.jsx` (`/office` y `/ai-office`) y enlaces en `Sidebar.jsx` y `Topbar.jsx`.
- [ ] Creación de la página principal `src/pages/AiOfficeHQ.jsx` con soporte de modos de visualización:
  1. **Live Office (Vista Isométrica 2.5D):** Renderizado de las salas corporativas con animación suave de monitores, lámparas de estado, cubículos y avatares.
  2. **Strategic Map:** Matriz de departamentos, agentes y proyectos activos.
  3. **Org Chart:** Jerarquía visual corporativa (CEO ➔ BART COO ➔ Leads ➔ Especialistas).
  4. **Metrics & Budgets:** Consumo de tokens, costos en USD, tasa de éxito y velocidad de respuesta.
  5. **Governance & Approvals:** Bandeja de solicitudes de autorización para el CEO.
- [ ] Componente `src/components/office/OfficeIsometricCanvas.jsx`:
  - Renderizado dimétrico 2:1 con zoom interactivo (50% a 150%) y drag-to-pan.
  - Salas definidas: Recepción, Despacho del CEO, Despacho de BART, Creative Studio, Tech & Dev Lab, Operations, Sales, Marketing, Meeting Room (War Room), Server Room y Knowledge Library.
  - Indicadores visuales de estados operativos reales (`AVAILABLE`, `PLANNING`, `EXECUTING`, `WAITING_APPROVAL`, `BLOCKED`, `IN_MEETING`, etc.).
- [ ] Modal de Detalle de Agente con 8 pestañas completas:
  1. *Overview* (Cargo, departamento, modelo, cubículo y KPI clave).
  2. *Chat* (Conversación directa con el agente).
  3. *Tasks* (Tareas asignadas con barra de progreso).
  4. *Memory* (Memoria del agente e insights acumulados).
  5. *Tools* (Herramientas disponibles y estado de permisos).
  6. *Activity* (Log de eventos en tiempo real del agente).
  7. *Performance* (Métricas, tokens y tasa de éxito).
  8. *Settings* (Ajuste de nivel de autonomía, modelo LLM y prompt de rol).
- [ ] Barra de Comandos del CEO (`OfficeCommandBar.jsx`):
  - Input para despachar misiones directas a BART.
  - Acciones rápidas (Nueva Misión, Convocar War Room, Pausar Todo / Kill Switch, Recargar Datos).
  - Filtro interactivo por departamento.
- [ ] Endpoints de Backend en `server.js` (`/api/office/state`, `/api/office/dispatch`, `/api/office/agent/:id/status`, `/api/office/approvals`).
- [ ] Verificación completa con `npm test` y validación con el escenario de prueba de "HangOut Panamá".

---

### FASE 2: Orquestación Inteligente y Colaboración Multiagente (SIGUIENTE)
- [ ] Motor de descomposición de misiones con BART generando grafos de tareas interdependientes.
- [ ] Visualización de la Sala de Juntas (War Room) con agentes discutiendo en tiempo real mediante turnos de diálogo.
- [ ] Sistema de Heartbeats periódicos en backend con re-enrutamiento automático en caso de timeout.

---

### FASE 3: Integración Profunda de Herramientas y Ejecución Real
- [ ] Conexión directa de workers de OpenClaw y Playwright para tareas de web scraping y auditoría web.
- [ ] Disparo automático de campañas de difusión (WhatsApp, Instagram, TikTok) directamente desde los entregables de los agentes.

---

### FASE 4: Autonomía Controlada y Optimización Continua
- [ ] Presupuestos autónomos diarios con corte automático de APIs.
- [ ] Aprendizaje continuo: guardado automático de aprendizajes en `BrainVault/` al completar cada proyecto.
