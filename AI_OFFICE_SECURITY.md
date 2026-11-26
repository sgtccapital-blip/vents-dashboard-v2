# AI OFFICE HQ — POLÍTICAS DE SEGURIDAD, GOBERNANZA Y GUARDRAILS
**Documento:** `AI_OFFICE_SECURITY.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG  

---

## 1. Principios de Seguridad

La autonomía de los agentes en AI OFFICE HQ se rige por el principio de **mínimo privilegio operativo**, aislamiento de entornos y supervisión jerárquica obligatoria.

1. **El CEO mantiene el control absoluto:** Ningún agente puede auto-asignarse presupuestos o eludir la validación humana en acciones que involucren impacto financiero, reputacional o de infraestructura.
2. **Sanitización de Salidas y Herramientas:** Todas las instrucciones generadas por modelos LLM son validadas contra esquemas Zod estrictos antes de ser pasadas a herramientas del sistema operativo o navegadores.
3. **No exposición de Secretos:** Las claves de API (`GEMINI_API_KEY`, tokens MCP, contraseñas de base de datos) se gestionan exclusivamente en el entorno del servidor (`process.env`) y jamás se envían al cliente frontend.

---

## 2. Niveles de Autonomía y Gobernanza

```
┌────────────────────────────────────────────────────────────────────────┐
│ Nivel 4 (Crítico): > $5,000 USD / Redes Públicas                       │
│ Requiere: Autorización directa del CEO con contraseña o confirmación.  │
├────────────────────────────────────────────────────────────────────────┤
│ Nivel 3 (Medio-Alto): $500 - $5,000 USD / Modificación de DB           │
│ Requiere: Aprobación en panel de Aprobaciones del Despacho del CEO.    │
├────────────────────────────────────────────────────────────────────────┤
│ Nivel 2 (Operativo): < $500 USD / Acciones Internas                    │
│ Requiere: Ejecución autónoma con notificación a BART y Activity Feed.  │
├────────────────────────────────────────────────────────────────────────┤
│ Nivel 1 (Informativo): Solo Lectura / Análisis / Borradores            │
│ Requiere: Ejecución autónoma silenciosa con registro en historial.     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Circuit Breakers y Resiliencia

Para prevenir bucles de error o consumos anómalos de tokens:
- **Límite de Fallos Continuos:** Si un agente acumula 3 fallos consecutivos en menos de 10 minutos, su estado pasa automáticamente a `BLOCKED` y su circuit breaker a `FROZEN`.
- **Ruta de Escalación:** Las tareas del agente bloqueado se re-enrutan de inmediato hacia **BART (COO)** para re-evaluación o solicitud de ayuda al CEO.
- **Ventana de Recuperación:** Los disyuntores se resetean manualmente desde el despacho del CEO o tras 24 horas de enfriamiento una vez diagnosticado el fallo.

---

## 4. Botón de Emergencia (`Kill Switch`)

En el despacho del CEO se implementa un control de desconexión inmediata:
- Detiene todas las peticiones activas hacia las APIs de LLM.
- Pausa todos los procesos hijos de Node.js, OpenClaw y navegadores Playwright/Browser-Use.
- Congela temporalmente el scheduler y los cron jobs hasta la reactivación expresa por parte del usuario.
