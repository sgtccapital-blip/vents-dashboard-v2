---
FROM: OpenClaw
TO: Antigravity
PRIORITY: High
STATUS: Pending
---

# CONTEXTO DEL ANÁLISIS
GG confirmó enfoque War Mode para RecordAI. Se requiere cerrar ejecución operativa desde el dashboard: 1) tablero Kanban por proyecto (Pending/In Progress/Done), 2) acción directa para enviar tareas al Agents Office (Mission Control), manteniendo estética premium dark mode del Command Center.

# REQUERIMIENTOS TÉCNICOS
1. Implementar vista Kanban en `/projects` agrupando tareas por `status` (`pending`, `in-progress`, `done`) y por `project`.
2. Agregar botón `Send to Agent Office` por tarea, con feedback visual de éxito y registro en activity feed local.
3. Permitir reasignar agente desde la tarjeta de tarea (select inline).
4. Mantener compatibilidad con `seedTasks` existente y estados actuales (`active` también debe mapear a `in-progress`).
5. No romper navegación ni estilos globales actuales.

# ESTRUCTURA DE DATOS (DATA MODELING)
```json
{
  "taskStatusMap": {
    "pending": "pending",
    "in-progress": "in-progress",
    "done": "done",
    "active": "in-progress"
  },
  "seedTasks": [
    {
      "id": "task-7",
      "text": "Definir MVP de RecordAI (3 features core)",
      "done": false,
      "priority": "high",
      "project": "RecordAI",
      "agentId": "agent-1",
      "status": "in-progress",
      "due": "2026-03-10"
    },
    {
      "id": "task-8",
      "text": "Diseñar onboarding + flujo de primer valor",
      "done": false,
      "priority": "high",
      "project": "RecordAI",
      "agentId": "agent-2",
      "status": "active",
      "due": "2026-03-11"
    },
    {
      "id": "task-9",
      "text": "Configurar stack técnico y repositorio base",
      "done": false,
      "priority": "high",
      "project": "RecordAI",
      "agentId": "agent-3",
      "status": "in-progress",
      "due": "2026-03-11"
    },
    {
      "id": "task-10",
      "text": "Implementar Memory Pipeline v1 (capture/chunk/embed)",
      "done": false,
      "priority": "high",
      "project": "RecordAI",
      "agentId": "agent-4",
      "status": "active",
      "due": "2026-03-12"
    },
    {
      "id": "task-11",
      "text": "Crear landing de waitlist y formulario",
      "done": false,
      "priority": "medium",
      "project": "RecordAI",
      "agentId": "agent-6",
      "status": "active",
      "due": "2026-03-12"
    },
    {
      "id": "task-12",
      "text": "Definir casos de prueba y QA de recuperación",
      "done": false,
      "priority": "medium",
      "project": "RecordAI",
      "agentId": "agent-7",
      "status": "active",
      "due": "2026-03-13"
    }
  ],
  "seedAgentsMinimal": [
    { "id": "agent-1", "name": "Bart (COO)" },
    { "id": "agent-2", "name": "Antigravity" },
    { "id": "agent-3", "name": "Codex" },
    { "id": "agent-4", "name": "DataMiner" },
    { "id": "agent-6", "name": "CopyForge" },
    { "id": "agent-7", "name": "OpsSentinel" }
  ]
}
```

# INSTRUCCIONES DE EJECUCIÓN (PAUTAS PARA ANTIGRAVITY)
- Usa Tailwind CSS.
- El componente se debe llamar `ProjectKanbanBoard.jsx`.
- Hazlo premium, estilo dark mode, como el resto del Command Center.
