# RECORDAI — Sprint 14 días (War Mode)

## Objetivo
Lanzar MVP usable para founders: recordar decisiones + tareas desde web chat.

## Scope MVP (no negociar)
1. Captura conversacional (chat web)
2. Extracción automática de tareas/decisiones
3. Búsqueda: "¿qué decidimos sobre X?"

## Semana 1
### Día 1-2
- [ ] Definir schema base (users, conversations, messages, tasks, memories)
- [ ] Crear API base (auth + conversations + tasks)
- [ ] Definir prompts NLU para task/decision extraction

### Día 3-4
- [ ] Implementar memory pipeline v1 (chunk + embed + index)
- [ ] Endpoint de retrieval (RAG básico)
- [ ] Guardar decisiones detectadas por chat

### Día 5-7
- [ ] UI web chat + panel Today
- [ ] Vista tasks por prioridad
- [ ] QA interno con 20 casos reales

## Semana 2
### Día 8-10
- [ ] Mejorar precisión de extracción (fechas/acciones)
- [ ] Añadir reminders one-time
- [ ] Activar activity feed

### Día 11-12
- [ ] Landing waitlist + pricing $3/$6/$9
- [ ] Instrumentación métricas (activation + task completion)

### Día 13-14
- [ ] Cierre de bugs críticos
- [ ] Deploy MVP
- [ ] Preparar fase 2: WhatsApp integration

## Asignación de agentes
- Bart: dirección de producto/scope
- Antigravity: frontend/chat UX
- Codex: backend/API/DB
- DataMiner: memory extraction + retrieval quality
- CopyForge: landing + pricing copy
- OpsSentinel: QA + release checklist

## KPI de salida
- 80%+ de tareas detectadas correctamente
- <2s respuesta promedio en queries de memoria
- 10 usuarios founder en waitlist
