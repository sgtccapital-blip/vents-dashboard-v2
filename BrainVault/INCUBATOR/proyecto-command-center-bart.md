---
titulo: "Proyecto: Command Center y Bart"
tipo: proyecto
archivo: INCUBATOR/proyecto-command-center-bart.md
actualizado: 2026-10-14
fuente: "_archivo/docs-antiguos/Executive_Summary.md, Business_Plan.md, Marketing_Plan.md, Task_Plan.md, Task_System.md, COMMAND_CENTER_OS.md, DASHBOARD_AGENT_BRIEF.md, SOURCE_OF_TRUTH.md, MASTER_PROJECT_REGISTRY.md; db.seed.json (agents, projects: proj-1787275228256); CLAUDE.md; README.md"
etiquetas: [proyecto, portafolio, command-center, bart, dashboard]
relacionados: [ARSENAL/arquitectura-command-center.md, NEGOCIO/vision-y-prioridades.md, NEGOCIO/equipo.md]
---

# Proyecto: Command Center y Bart

## Resumen
El Command Center es el dashboard central de GG para coordinar ARRIVE, los venues y eventos, y todo
el portafolio; Bart es su agente de IA. En los documentos de abril de 2026 el proyecto se llamaba
"Trading Command Center" (también "Dashboard Events" o "Command Center OS") y el agente se llamaba
"Hermes". Era la prioridad número tres del portafolio. Cómo funciona hoy está en
ARSENAL/arquitectura-command-center.md.

## Datos clave
- El Command Center es el sistema interno de GG para coordinar tareas, información, operación y seguimiento de múltiples líneas de trabajo.
- El Command Center se llamaba antes "Trading Command Center", "Dashboard Events" y "Command Center OS"; su agente se llamaba "Hermes" y hoy se llama Bart.
- El Command Center era la prioridad número tres del portafolio de GG (según documentos de abr 2026, por confirmar).
- El valor del Command Center para GG es control, visibilidad, coordinación, memoria operativa y seguimiento.
- El riesgo principal del Command Center, según el Business Plan, es volverse demasiado genérico o mezclar demasiadas funciones sin prioridad.
- Los módulos base del Command Center son registro del portafolio, hub de proyectos y eventos, tablero de tareas, registro de decisiones, BrainVault (memoria en Markdown) y el puente del agente.
- El rol de Bart en el Command Center es mantener el dashboard organizado, detectar faltantes de documentación, mantener la coordinación entre proyectos y proponer qué atacar primero.
- Bart figura en el dashboard como "Chief Automation & Executive Copilot", con habilidades de tool calling, búsqueda RAG, sincronización de datos, gestión de proyectos y orquestación de tareas.
- El Command Center tiene además los agentes Pulse (WhatsApp y comunidad, relaciones VIP) y LicitIA Scout (inteligencia de licitaciones).
- La decisión de producto pendiente del Command Center es si queda como herramienta interna de GG o se empaqueta como producto para equipos pequeños con varias líneas operativas.
- El repositorio del Command Center es vents-dashboard-v2 (cuenta sgtccapital-blip en GitHub).
- En el dashboard existe el proyecto de prueba "Sistema Autónomo Bart Test" (creado por Bart el 2026-08-21) para probar la integración del puente de Bart, con stack React, FastAPI y Gemini AI y presupuesto de 2,500.

## Cómo se trabaja
1. Bloque crítico (abr 2026): ordenar el command center operativo, definir qué se ve primero, módulos obligatorios y flujo diario y semanal.
2. Bloque crítico: mantener registro maestro, prioridades activas, tareas por proyecto, decisiones clave y actividad de Bart.
3. Bloque alto: definir qué acciones dispara Bart, qué datos lee primero, convenciones de logs y notas, y cómo usar el BrainVault como memoria.
4. Bloque medio: roadmap del command center, qué queda interno vs visible, reducir ruido histórico y preparar automatizaciones.

## Preguntas frecuentes
P: ¿Qué es el Command Center?
R: El dashboard central de GG donde se coordinan ARRIVE, los venues y eventos de nightlife y todos los proyectos del portafolio, con Bart como agente de IA.

P: ¿Quién es Hermes?
R: Hermes era el nombre viejo del agente del dashboard; hoy se llama Bart.

P: ¿Qué hace Bart en el Command Center?
R: Lee el estado del dashboard, responde preguntas, crea y completa tareas, eventos, proyectos y notas cuando se lo piden, busca en el cerebro (BrainVault) y propone qué atacar primero.

P: ¿El Command Center es un producto para vender?
R: No está decidido. Los documentos de abril de 2026 lo dejan como uso interno de GG, con la posibilidad de empaquetarlo luego para equipos pequeños.

P: ¿Qué otros agentes tiene el Command Center además de Bart?
R: Pulse, para WhatsApp, comunidad y relaciones VIP, y LicitIA Scout, para inteligencia de licitaciones en PanamáCompra.

P: ¿Qué es "Sistema Autónomo Bart Test"?
R: Un proyecto de prueba creado por Bart el 2026-08-21 para probar la integración del puente de Bart; no es un proyecto de negocio.

## Pendientes
- [PENDIENTE] Prioridad actual del Command Center dentro del portafolio.
- [PENDIENTE] Decisión: herramienta interna o producto.
- [PENDIENTE] Roadmap actualizado del Command Center y de Bart.
- [PENDIENTE] Si "Sistema Autónomo Bart Test" se puede archivar.
