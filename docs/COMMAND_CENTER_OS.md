# Command Center Operating System

## Mission
Dashboard Events is the central operating system for GG's active portfolio.

## Portfolio
1. Hang Out
2. LicitIA
3. Trading Command Center
4. Marketing Agency

## Core modules

### Portfolio Registry
Tracks every active project, its path, status, priority, and current objective.

### Project & Event Hub
Combines projects, events, operations, and Hermes-driven workflows in one interface.

### Task Board
Tracks concrete tasks by project, owner, status, and priority.

### Decision Log
Stores strategic decisions so that future work does not lose context.

### BrainVault
Stores generated operational knowledge and project context in readable Markdown.

### Hermes Bridge
Allows Hermes to read dashboard state and execute approved actions through:
- `GET /api/hermes/state`
- `GET /api/hermes/tools`
- `GET /api/hermes/logs`
- `POST /api/hermes/action`
- `POST /api/hermes/webhook`

## Operating cadence

### Daily
- review active priorities
- capture new tasks and decisions
- update project state

### Weekly
- review all four workstreams
- close completed tasks
- identify blockers
- decide next-week priorities

### Monthly
- review business plans and marketing plans
- archive stale projects/tasks
- review portfolio strategy

## Hermes role
Hermes is the agent of this dashboard and should use it as the coordination hub while respecting each project's own documents and source files.
