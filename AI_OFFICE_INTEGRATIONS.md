# AI OFFICE HQ — MATRIZ DE INTEGRACIONES Y SERVICIOS EXTERNOS
**Documento:** `AI_OFFICE_INTEGRATIONS.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG  

---

## 1. Mapa de Integraciones del Sistema

AI OFFICE HQ actúa como el orquestador central que vincula herramientas digitales con los agentes de la empresa:

```
                  ┌────────────────────────┐
                  │      AI OFFICE HQ      │
                  │   BART (COO) & AGENTS  │
                  └───────────┬────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
┌────▼─────────────┐   ┌──────▼───────────┐   ┌────────▼──────────┐
│  EJECUCIÓN & OS  │   │  INTELIGENCIA    │   │ COMUNICACIÓN & CRM│
│  - OpenClaw Core │   │  - Google Gemini │   │ - WhatsApp Agent  │
│  - Playwright    │   │  - BrainVault RAG│   │ - IG Broadcast    │
│  - Browser-Use   │   │  - Pinecone      │   │ - TikTok / DMs    │
│  - MCP Server    │   │  - Drive & Docs  │   │ - Webhooks / n8n  │
└──────────────────┘   └──────────────────┘   └───────────────────┘
```

---

## 2. Detalle de Integraciones Técnicas

### 2.1. OpenClaw Core (Ejecución de Herramientas Locales)
- **Ruta de Código:** `./openclaw-core/`
- **Capacidades:** Ejecución de scripts en shell, manipulación de archivos locales, compilación de reportes y delegación a Antigravity.
- **Protocolo:** Gateway HTTP local en puerto `18789` con proxy en `server.js` (`/api/openclaw/*`).

### 2.2. Servidor MCP (`@modelcontextprotocol/sdk`)
- **Ruta de Código:** `src/services/agentHub/mcpServer.js` y `routes.js`
- **Capacidades:** Permite a Claude Code, Codex, Cursor o clientes MCP externos conectarse a la oficina virtual con autenticación por token para consultar tareas, actualizar estados y registrar entregables.

### 2.3. Agente de Difusión Multi-Canal
- **Ruta de Código:** `src/services/WhatsAppAgentService.js` y endpoints `/api/agent/whatsapp-*`
- **Capacidades:** Envío automatizado y estructurado de invitaciones a cenas VIP, anuncios de eventos de nightlife (Terraplén, Furia, Piano Bar, HangOut) y seguimiento de promotores. Canales soportados: WhatsApp 1:1, WhatsApp Grupos, Canales de Difusión de Instagram, Mensajes Directos de Instagram y TikTok.

### 2.4. Google Workspace (Drive & Calendar)
- **Ruta de Código:** `src/services/contentStudio/drive.js` y `src/lib/studioApi.js`
- **Capacidades:** Exploración automática de carpetas con material en bruto (Raw), sincronización de briefs de video y sincronización con el calendario corporativo de Google.
