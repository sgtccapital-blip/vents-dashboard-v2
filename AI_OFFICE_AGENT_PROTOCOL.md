# AI OFFICE HQ — PROTOCOLO DE COMUNICACIÓN INTER-AGENTE (AICP)
**Documento:** `AI_OFFICE_AGENT_PROTOCOL.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG  

---

## 1. Visión del Protocolo

El **AI Agent Inter-Communication Protocol (AICP)** define las reglas, estructuras JSON y canales que gobiernan el intercambio de información entre el CEO, BART (COO) y todos los agentes departamentales.

El protocolo garantiza que:
1. Ninguna acción se ejecute sin trazabilidad en `activityFeed` y `agentTasks`.
2. Las tareas se comuniquen de forma estructurada con contexto de negocio y criterios de aceptación claros.
3. Las colaboraciones entre departamentos no generen bucles infinitos gracias a un contador de saltos (`hopCount`).

---

## 2. Tipos de Mensajes del Protocolo

### 2.1. Mensaje de Delegación (`DELEGATE_TASK`)
Emitido por el CEO o por BART hacia un agente especialista.

```json
{
  "protocol": "AICP/1.0",
  "messageId": "msg-del-1774350100000",
  "type": "DELEGATE_TASK",
  "timestamp": "2026-11-24T10:05:00.000Z",
  "sender": { "id": "agent-bart", "name": "BART (COO)" },
  "recipient": { "id": "agent-echo", "name": "Echo (Social)" },
  "payload": {
    "taskId": "atask-1774350000000",
    "missionId": "miss-hangout-launch",
    "project": "HangOut Panamá",
    "objective": "Redactar 3 guiones de video corto (Reels/TikTok) para anunciar el evento de apertura",
    "businessContext": {
      "targetAudience": "Jóvenes profesionales y amantes del nightlife en Ciudad de Panamá",
      "tone": "Vibrante, exclusivo, chic",
      "keyDates": "Viernes 5 de Diciembre 2026"
    },
    "constraints": ["No exceder 60 segundos por guión", "Incluir llamada a la acción hacia WhatsApp"],
    "requiredOutputs": ["copy_scripts", "hook_variations"],
    "priorityScore": 8.5,
    "deadline": "2026-11-24T14:00:00.000Z"
  }
}
```

---

### 2.2. Mensaje de Progreso en Vivo (`TASK_HEARTBEAT`)
Emitido periódicamente por el agente durante la ejecución para actualizar la oficina virtual.

```json
{
  "protocol": "AICP/1.0",
  "messageId": "msg-hb-1774350150000",
  "type": "TASK_HEARTBEAT",
  "timestamp": "2026-11-24T10:07:30.000Z",
  "sender": { "id": "agent-echo", "name": "Echo (Social)" },
  "recipient": { "id": "agent-bart", "name": "BART (COO)" },
  "payload": {
    "taskId": "atask-1774350000000",
    "status": "executing",
    "progress": 65,
    "currentActivity": "Estructurando hook visual del segundo Reel (formato POV)",
    "tokensConsumed": 420,
    "activeTool": "contentStudio.generators"
  }
}
```

---

### 2.3. Mensaje de Colaboración Inter-Agente (`COLLABORATION_REQUEST`)
Utilizado cuando un especialista requiere insumos de otro departamento (ej: Echo solicita a Atlas la fecha y DJ confirmado).

```json
{
  "protocol": "AICP/1.0",
  "messageId": "msg-col-1774350200000",
  "type": "COLLABORATION_REQUEST",
  "timestamp": "2026-11-24T10:10:00.000Z",
  "sender": { "id": "agent-echo", "name": "Echo (Social)" },
  "recipient": { "id": "agent-atlas", "name": "Atlas (Logistics)" },
  "supervisedBy": "agent-bart",
  "hopCount": 1,
  "payload": {
    "query": "¿Cuál es el line-up confirmado de DJs y la hora de apertura para el viernes en HangOut?",
    "urgency": "high"
  }
}
```

---

### 2.4. Mensaje de Solicitud de Aprobación al CEO (`CEO_APPROVAL_REQUEST`)
Enviado cuando una acción sobrepasa el nivel de autonomía autorizado (Nivel 3 o 4).

```json
{
  "protocol": "AICP/1.0",
  "messageId": "msg-appr-1774350300000",
  "type": "CEO_APPROVAL_REQUEST",
  "timestamp": "2026-11-24T10:15:00.000Z",
  "sender": { "id": "agent-nexus", "name": "Nexus (Marketing)" },
  "recipient": { "id": "user", "name": "CEO" },
  "payload": {
    "taskId": "atask-1774350290000",
    "action": "Configurar campaña de pauta publicitaria en Meta Ads",
    "estimatedSpendUSD": 1200,
    "autonomyLevelRequired": 3,
    "rationale": "La campaña acelerará la venta de las primeras 100 entradas VIP para la apertura de HangOut.",
    "riskAssessment": "Bajo: audiencia hiperlocal segmentada en Casco Antiguo y San Francisco."
  }
}
```

---

### 2.5. Entrega Final de Resultados (`MISSION_DELIVERY`)
Presentación de entregables al CEO por parte de BART tras validación de calidad.

```json
{
  "protocol": "AICP/1.0",
  "messageId": "msg-deliv-1774350400000",
  "type": "MISSION_DELIVERY",
  "timestamp": "2026-11-24T10:30:00.000Z",
  "sender": { "id": "agent-bart", "name": "BART (COO)" },
  "recipient": { "id": "user", "name": "CEO" },
  "payload": {
    "missionId": "miss-hangout-launch",
    "status": "completed",
    "summary": "Plan de lanzamiento de HangOut Panamá completado con éxito.",
    "deliverables": [
      { "name": "Estrategia de Difusión Multi-Canal", "url": "/difusion" },
      { "name": "3 Guiones de Contenido Corto", "url": "/content-hub" },
      { "name": "Presupuesto Operativo y Logística", "url": "/finanzas" }
    ],
    "qaNotes": "Verificado contra la base de conocimiento y los estándares de ARRIVE Agency."
  }
}
```
