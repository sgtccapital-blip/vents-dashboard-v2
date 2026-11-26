# AI OFFICE HQ — EVALUACIÓN DE REPOSITORIOS OPEN SOURCE DE REFERENCIA
**Documento:** `AI_OFFICE_REPOSITORIES.md`  
**Fecha:** Noviembre 2026  
**Ecosistema:** MAIN DASHBOARD GG  

---

## 1. Objetivo del Análisis

Analizar de forma exhaustiva los repositorios abiertos clave de oficinas virtuales, orquestación de agentes y motores gráficos, determinando:
1. **Qué código podemos reutilizar legal y técnicamente** (licencia, compatibilidad ESM/Vite, seguridad).
2. **Qué patrones arquitectónicos y modelos de datos adaptar**.
3. **Qué herramientas y librerías mantener únicamente como referencia conceptual**.
4. **Cómo salvaguardar la soberanía de nuestro motor RAG y orquestador BART existente**.

---

## 2. Matriz de Repositorios Evaluados

| Repositorio | Categoría | Licencia | Estado / Mantenimiento | Relevancia para AI Office HQ | Veredicto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Paperclip** (`paperclipai/paperclip`) | Orquestación empresarial / Multi-Agente | MIT / Apache 2.0 | Activo (pnpm workspace) | **Máxima**: Modelo de roles (CEO/COO), tickets, presupuestos, aprobaciones y heartbeats. | **Reutilizar & Adaptar lógica de estado** (código ya clonado localmente en `./paperclip`). |
| **Claw Empire** (`GreenSheep01201/claw-empire`) | Oficina Virtual / Pixel Art / OpenClaw | MIT | Activo | **Muy Alta**: Estética Habbo Hotel / isometric pixel art, asignación de escritorios y estados visuales. | **Adaptar patrones de renderizado y diseño isométrico**. |
| **Cubicle** (`caglarutkuguler/cubicle`) | Oficina Isométrica 2.5D | MIT | Mantenido | **Alta**: Disposición de cubículos, áreas comunes y salas de juntas en proyección 2.5D. | **Reutilizar layouts de salas y cálculo de coordenadas isométricas**. |
| **My Virtual Office** (`eliautobot/my-virtual-office`) | Canvas Virtual Office | MIT | Experimental | **Media**: Simulación de presencia y teleconferencias virtuales. | **Referencia conceptual**. |
| **Claude Office** (`rigel-hq/claude-office`) | Interfaz de Agentes Claude | MIT | Mantenido | **Media**: Visualización de turnos de pensamiento y streaming de salida. | **Referencia para tarjetas de agente y logs**. |
| **Agent Office** (`IVibeStuff/agent-office`) | Espacio colaborativo de agentes | Apache 2.0 | Experimental | **Media**: Visualización de agentes trabajando en paralelo. | **Referencia conceptual**. |
| **OpenClaw** (`openclaw/openclaw`) | Infraestructura y Ejecución | Apache 2.0 | Activo en repo local (`openclaw-core/`) | **Núcleo**: Conexión a herramientas locales, scraping y workers. | **Reutilizar infraestructura local existente**. |
| **Browser-Use** (`browser-use/browser-use`) | Navegación autónoma web | MIT | Muy Activo | **Alta**: Ejecución de acciones en browser real para agentes como CloserOps y Scout. | **Integrar vía endpoints de backend y workers**. |
| **Playwright** (`microsoft/playwright`) | Automatización de navegador | Apache 2.0 | Tier 1 (Microsoft) | **Alta**: Headless runner para testing, scraping y screenshots de entregables. | **Reutilizar en servicios de backend**. |
| **n8n** (`n8n-io/n8n`) | Workflows & Integraciones | Fair-Code (Sustainable) | Enterprise / Muy Activo | **Estratégica**: Webhooks para WhatsApp, CRM y pasarelas de pago. | **Conectar mediante Webhooks y MCP**. |
| **PixiJS** (`pixijs/pixijs`) | Motor Gráfico 2D WebGL/Canvas | MIT | Muy Activo (v8) | **Alta**: Renderizado acelerado de sprites, iluminación 2D y mapas isométricos grandes. | **Opcional para renderizado avanzado desacoplado**. |
| **Phaser** (`phaserjs/phaser`) | Motor de Videojuegos 2D | MIT | Muy Activo | **Media**: Excelente para físicas/pathfinding de juegos, pero pesado para un dashboard SaaS reactivo. | **No recomendado para integración nativa en React**. |
| **Three.js** (`mrdoob/three.js`) | Motor 3D WebGL | MIT | Tier 1 | **Baja-Media**: Complejidad excesiva de carga de shaders y modelos 3D para una oficina estilo Habbo/Gather Town. | **Descartado para la Fase 1**. |

---

## 3. Análisis Detallado por Componente

### 3.1. Oficina Virtual y Renderizado Gráfico (Claw Empire + Cubicle vs PixiJS vs React SVG/Canvas)

#### Hallazgo
Las oficinas virtuales tipo Habbo Hotel o The Sims que mejor rendimiento ofrecen en interfaces corporativas utilizan proyección **isométrica dimétrica 2:1** (donde $X$ e $Y$ se proyectan en ángulos de $30^\circ$ o mediante la fórmula clásica $isoX = x - y$ e $isoY = (x + y) / 2$).
- **PixiJS**: Excelente para más de 1,000 sprites móviles simultáneos. Sin embargo, introduce un canvas WebGL externo que dificulta el renderizado de tooltips nativos en Tailwind, accesibilidad y modales reactivos.
- **Enfoque Híbrido React Canvas / Isometric SVG Grid (Recomendado para Fase 1)**:
  - Permite renderizar cubículos, paredes translúcidas, escritorios con pantallas iluminadas, plantas, salas de reuniones y avatares con animaciones CSS/Canvas fluidas a 60 FPS.
  - Ofrece interacción nativa DOM/React para clics directos, tooltips flotantes en glassmorphism, modales contextuales y selección de agentes sin latencia de contexto WebGL.
  - La capa gráfica (Capa 1) se mantiene desacoplada en una interfaz `OfficeCanvasAdapter`, de modo que si en una fase posterior se desea montar un renderer completo en PixiJS, los datos y estados se mantienen idénticos.

### 3.2. Modelo de Empresa Autónoma (Paperclip)

#### Hallazgo
El repositorio `paperclip` (presente en `./paperclip` del proyecto) provee el diseño organizacional perfecto para nuestra visión de empresa digital autónoma:
- **Organigrama Jerárquico:** Define el flujo estricto `CEO (Usuario) ➔ COO (BART) ➔ Department Leads ➔ Specialized Agents`.
- **Heartbeat & Event Loop:** Cada agente ejecuta un ciclo de evaluación de tareas (`idle ➔ evaluating ➔ running ➔ reviewing ➔ done`).
- **Control de Presupuesto:** Cada tarea y agente dispone de límites de gasto en tokens y llamadas a APIs para evitar consumo desmedido.
- **Sistemas de Aprobaciones (Human-in-the-Loop):** Si una acción excede el nivel de autonomía autorizado, se genera un ticket de aprobación que el CEO debe validar desde su oficina.

### 3.3. Infraestructura de Ejecución (OpenClaw + Browser-Use + Playwright)

#### Hallazgo
- Nuestro repositorio ya cuenta con `openclaw-core/` estructurado con pasarela de herramientas (`nativeTools.ts`), puente (`openclawBridge.ts`) y delegación (`antigravityDelegator.ts`).
- **Browser-Use & Playwright:** Se emplean para que agentes como **Sentinel** (análisis de licitaciones o mercado) o **Scout** (proveedores y cotizaciones) naveguen y extraigan información real en tiempo de ejecución.
- **Salvaguarda de RAG y Orquestador:** El sistema RAG actual (`src/services/knowledge/` + `BrainVault/`) supera a implementaciones genéricas de terceros por su optimización en español, búsqueda híbrida y conocimiento ya indexado de las empresas del usuario. **No se reemplaza; se alimenta y consulta.**

---

## 4. Decisiones de Reutilización Técnica

1. **Reutilizar Directamente:**
   - La arquitectura de tickets y niveles de autonomía de `paperclip` adaptada a la estructura de `./db.json`.
   - La infraestructura de workers y herramientas de `openclaw-core/`.
   - La indexación semántica y búsqueda híbrida de `src/services/knowledge/`.
   - Los avatares y estilos de estaciones de trabajo de `src/components/ArriveTeamOffice.jsx`.

2. **Adaptar:**
   - La estética isométrica corporativa de `claw-empire` y `cubicle`, traduciéndola a componentes visuales React modulares con Canvas/SVG y soporte para zoom/pan y selección de habitaciones.
   - El protocolo de comunicación inter-agente de Paperclip para fluir a través de `server.js` y `db.activityFeed`.

3. **Mantener como Referencia Externa:**
   - `n8n` para webhooks de terceros sin necesidad de instalar el core completo en el contenedor local.
   - `three.js` y `phaser` se descartan para mantener la ligereza y rapidez de carga del dashboard.
