// Herramientas de los agentes internos. El agente las pide con bloques de texto (funciona igual
// con Gemini, Claude, OpenAI u OpenRouter), la oficina las ejecuta y le devuelve el resultado
// para que siga trabajando. Son las mismas capacidades que tienen los agentes externos por MCP.

const clip = (s, n) => {
    const t = String(s ?? '');
    return t.length > n ? `${t.slice(0, n)}…(recortado)` : t;
};
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const MAX_TOOL_STEPS = 6;
export const MAX_CALLS_PER_STEP = 3;
const TOOL_OUTPUT_CHARS = 5000;

const TOOL_RE = /<<<HERRAMIENTA\s+([a-z_]+)\s*>>>([\s\S]*?)<<<FIN HERRAMIENTA>>>/g;

/** [{ name, input }] de los bloques de herramienta de una respuesta. */
export function parseToolCalls(text) {
    const calls = [];
    for (const m of String(text || '').matchAll(TOOL_RE)) {
        const body = m[2].trim();
        let input = {};
        if (body) {
            try {
                input = JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1));
            } catch {
                input = { _error: `No es JSON válido: ${clip(body, 200)}` };
            }
        }
        calls.push({ name: m[1], input });
    }
    return calls;
}

export const stripToolCalls = text => String(text || '').replace(TOOL_RE, '').trim();

export const TOOL_SPECS = [
    {
        name: 'buscar_memoria',
        label: 'Buscando en la memoria',
        about: 'Busca en la memoria de la agencia (historial de ChatGPT del CEO, decisiones, referencias, entregables aprobados de otros agentes).',
        args: '{"consulta": "qué buscar, en palabras claras", "cantidad": 5}',
        brief: i => i.consulta,
    },
    {
        name: 'leer_archivo',
        label: 'Leyendo archivo',
        about: 'Lee completo un archivo de esta tarea (adjuntos del CEO, entregas anteriores, archivos heredados).',
        args: '{"archivo": "nombre del archivo"}',
        brief: i => i.archivo,
    },
    {
        name: 'leer_marca',
        label: 'Leyendo línea de marca',
        about: 'Lee el ADN de contenido y la línea gráfica de una cuenta (Ignite, The Room, Hang Out, Dinner Club…).',
        args: '{"cuenta": "nombre o id de la cuenta"}',
        brief: i => i.cuenta,
    },
    {
        name: 'consultar_dashboard',
        label: 'Consultando el dashboard',
        about: 'Consulta datos reales del Command Center: "eventos" (fechas, lugar, capacidad), "proyectos" (estado, próxima acción, bloqueos) o "tareas_oficina" (trabajo reciente de otros agentes).',
        args: '{"seccion": "eventos" | "proyectos" | "tareas_oficina", "filtro": "texto opcional"}',
        brief: i => `${i.seccion || ''}${i.filtro ? `: ${i.filtro}` : ''}`,
    },
    {
        name: 'pasar_tarea',
        label: 'Proponiendo traspaso',
        about: 'Propone que otro agente siga con el trabajo cuando termines (por ejemplo: tú redactas, Pulse lo difunde). Se crea cuando el CEO apruebe tu entrega y recibe tus archivos.',
        args: '{"agente": "id o nombre del agente", "tarea": "qué debe hacer", "descripcion": "contexto opcional"}',
        brief: i => `${i.agente || ''}: ${i.tarea || ''}`,
    },
    {
        name: 'preguntar_al_ceo',
        label: 'Preguntando al CEO',
        about: 'Si te falta un dato que solo el CEO sabe y no puedes suponerlo, pregúntale. Tu trabajo se pausa hasta que responda. Úsala solo si de verdad no puedes avanzar.',
        args: '{"pregunta": "una pregunta concreta"}',
        brief: i => i.pregunta,
    },
    {
        name: 'ver_herramienta_hub',
        label: 'Revisando herramienta del hub',
        about: 'Muestra qué hace una herramienta del hub del Command Center y qué argumentos lleva. Úsala antes de usar_hub si no conoces sus argumentos.',
        args: '{"herramienta": "nombre"}',
        brief: i => i.herramienta,
        hub: true,
    },
    {
        name: 'usar_hub',
        label: 'Usando el hub',
        about: 'Llama a una herramienta del hub del Command Center (la misma que usan ChatGPT y Claude por MCP) con tus permisos. Las escrituras son reales e inmediatas.',
        args: '{"herramienta": "nombre", "argumentos": { ... }}',
        brief: i => i.herramienta,
        hub: true,
    },
];

// Herramientas del hub que no aplican a un agente interno (son para agentes externos de la oficina).
const HUB_SKIP = new Set(['get_my_office_tasks', 'claim_office_task', 'report_office_progress', 'submit_office_result', 'get_office_task', 'read_office_file', 'attach_office_file', 'handoff_office_task', 'get_connection_status']);
const firstSentence = d => clip(String(d || '').split(/(?<=\.)\s/)[0], 110);

export const toolSpec = name => TOOL_SPECS.find(t => t.name === name);

export function toolInstructions({ agents = [], hubTools = [] } = {}) {
    const specs = TOOL_SPECS.filter(t => !t.hub || hubTools.length);
    return `HERRAMIENTAS (opcionales):
Puedes usar herramientas antes de entregar. Para usar una, responde SOLO con uno o más bloques así (máximo ${MAX_CALLS_PER_STEP} por turno) y nada más:
<<<HERRAMIENTA nombre>>>
{"argumento": "valor"}
<<<FIN HERRAMIENTA>>>
Recibirás el resultado y podrás seguir. Tienes hasta ${MAX_TOOL_STEPS} turnos. Cuando tengas lo necesario, responde con tu ENTREGA FINAL, sin bloques de herramienta.

${specs.map(t => `- ${t.name}: ${t.about}\n  Argumentos: ${t.args}`).join('\n')}
${hubTools.length ? `\nHERRAMIENTAS DEL HUB QUE TIENES PERMITIDAS (úsalas con usar_hub; si no sabes sus argumentos, primero ver_herramienta_hub):\n${hubTools.map(t => `- ${t.name}: ${firstSentence(t.description)}`).join('\n')}\n` : ''}
${agents.length ? `\nAGENTES A LOS QUE PUEDES PASAR TRABAJO:\n${agents.map(a => `- ${a.id} | ${a.name} | ${a.role || ''}`).join('\n')}\n` : ''}
No uses herramientas si ya tienes todo lo necesario: entrega directamente.`;
}

/**
 * @param {{ searchKnowledge?: Function, brandContext?: object, readDB: Function, readTaskFile?: Function, agentsFor?: Function }} deps
 */
export function createAgentTools({ searchKnowledge, brandContext, readDB, readTaskFile, agentsFor, connectHub }) {
    /** Conexión al hub MCP con los permisos del agente (principal office:<id>). Una por corrida. */
    async function openHub(agent) {
        if (!connectHub) return null;
        const conn = await connectHub(agent);
        if (!conn?.client) return null;
        try {
            const { tools = [] } = await conn.client.listTools();
            const list = tools.filter(t => !HUB_SKIP.has(t.name)).map(t => ({ name: t.name, description: t.description || '', inputSchema: t.inputSchema || {} }));
            return {
                tools: list,
                policy: conn.policy || null,
                call: (name, args) => conn.client.callTool({ name, arguments: args || {} }),
                close: () => conn.close?.(),
            };
        } catch (err) {
            await Promise.resolve(conn.close?.()).catch(() => {});
            throw err;
        }
    }

    async function run(name, input, { task, hub = null }) {
        if (input?._error) return { output: `Error: ${input._error}` };
        switch (name) {
            case 'buscar_memoria': {
                if (!searchKnowledge) return { output: 'La memoria no está disponible.' };
                const consulta = String(input.consulta || '').trim();
                if (!consulta) return { output: 'Error: falta "consulta".' };
                const { results = [] } = await searchKnowledge({ query: consulta.slice(0, 500), topK: Math.min(Number(input.cantidad) || 5, 8) });
                if (!results.length) return { output: `Nada en la memoria para «${consulta}».` };
                return { output: results.map((r, i) => `${i + 1}. [${r.doc?.title || r.docId}] ${clip(r.text || r.snippet, 900)}`).join('\n\n'), found: results.map(r => r.doc?.title || r.docId) };
            }
            case 'leer_archivo': {
                const wanted = fold(input.archivo || '');
                const files = task.artifacts || [];
                const f = files.find(x => x.id === input.archivo) || files.find(x => fold(x.name) === wanted) || files.find(x => wanted && fold(x.name).includes(wanted));
                if (!f) return { output: `No hay un archivo «${input.archivo}» en la tarea. Archivos: ${files.map(x => x.name).join(', ') || 'ninguno'}.` };
                if (!readTaskFile) return { output: 'No se pueden leer archivos.' };
                try {
                    return { output: `### ${f.name}\n${clip(await readTaskFile(f), 12000)}` };
                } catch (e) {
                    return { output: `«${f.name}» no se puede leer como texto (${f.mime}): ${e.message}` };
                }
            }
            case 'leer_marca': {
                if (!brandContext) return { output: 'Las líneas de marca no están disponibles.' };
                const q = String(input.cuenta || '').trim();
                const account = brandContext.byId(q) || brandContext.detect(q) || brandContext.list().find(a => fold(a.name).includes(fold(q)));
                if (!account) return { output: `No conozco la cuenta «${q}». Cuentas: ${brandContext.list().map(a => a.name).join(', ')}.` };
                const loaded = brandContext.load(account.id, { maxCharsPerFile: 7000 });
                return { output: `LÍNEA DE MARCA DE ${loaded.name} (${loaded.handler}):\n\n${loaded.files.map(f => `### ${f.label}\n${f.text}`).join('\n\n')}` };
            }
            case 'consultar_dashboard': {
                const db = readDB();
                const filtro = fold(input.filtro || '');
                const match = obj => !filtro || fold(JSON.stringify(obj)).includes(filtro);
                const seccion = fold(input.seccion || '');
                if (seccion.startsWith('evento')) {
                    const rows = (db.events || []).filter(match).slice(0, 15).map(e => {
                        const dates = (e.instances || []).map(i => i.date || i.startDate).filter(Boolean).slice(0, 4).join(', ');
                        return `- ${e.name} | ${e.status || ''} | ${e.location || ''}${e.capacity ? ` | capacidad ${e.capacity}` : ''}${dates ? ` | fechas: ${dates}` : ''}${e.description ? ` | ${clip(e.description, 160)}` : ''}`;
                    });
                    return { output: rows.length ? rows.join('\n') : 'Sin eventos que coincidan.' };
                }
                if (seccion.startsWith('proyecto')) {
                    const rows = (db.projects || []).filter(match).slice(0, 15).map(p => `- ${p.name} | ${p.status || ''}${p.priority ? ` | prioridad ${p.priority}` : ''}${p.nextAction ? ` | próxima acción: ${clip(p.nextAction, 140)}` : ''}${p.blockers ? ` | bloqueos: ${clip(p.blockers, 120)}` : ''}`);
                    return { output: rows.length ? rows.join('\n') : 'Sin proyectos que coincidan.' };
                }
                if (seccion.startsWith('tarea')) {
                    const rows = (db.agentTasks || []).filter(t => t.id !== task.id).filter(match).slice(0, 15)
                        .map(t => `- [${t.status}] ${clip(t.task, 120)} — ${t.assignedAgent || ''}${t.result ? ` | resultado: ${clip(t.result, 200)}` : ''}`);
                    return { output: rows.length ? rows.join('\n') : 'Sin tareas que coincidan.' };
                }
                return { output: 'Error: "seccion" debe ser "eventos", "proyectos" o "tareas_oficina".' };
            }
            case 'pasar_tarea': {
                const agents = agentsFor ? agentsFor() : [];
                const q = fold(input.agente || '');
                const target = agents.find(a => a.id === input.agente) || agents.find(a => q && fold(a.name).includes(q));
                if (!target) return { output: `No encontré al agente «${input.agente}». Agentes: ${agents.map(a => a.id).join(', ')}.` };
                if (!String(input.tarea || '').trim()) return { output: 'Error: falta "tarea".' };
                return {
                    output: `Anotado: cuando el CEO apruebe tu entrega, ${target.name} recibirá «${clip(input.tarea, 120)}» con tus archivos.`,
                    control: { handoff: { agentId: target.id, agentName: target.name, task: clip(input.tarea, 300), description: clip(input.descripcion || '', 1500) } },
                };
            }
            case 'preguntar_al_ceo': {
                const q = String(input.pregunta || '').trim();
                if (!q) return { output: 'Error: falta "pregunta".' };
                return { output: 'Pregunta enviada al CEO. Tu trabajo queda en pausa hasta que responda.', control: { question: clip(q, 600) } };
            }
            case 'ver_herramienta_hub':
            case 'usar_hub': {
                if (!hub) return { output: 'El hub no está disponible para ti en esta tarea.' };
                const tool = hub.tools.find(t => t.name === input.herramienta);
                if (!tool) return { output: `«${input.herramienta}» no existe o no tienes permiso. Puedes usar: ${hub.tools.map(t => t.name).join(', ') || 'ninguna'}.` };
                if (name === 'ver_herramienta_hub') return { output: `${tool.name}: ${tool.description}\n\nArgumentos (JSON Schema):\n${clip(JSON.stringify(tool.inputSchema), 3000)}` };
                const args = input.argumentos && typeof input.argumentos === 'object' ? input.argumentos : {};
                const res = await hub.call(tool.name, args);
                const sc = res?.structuredContent;
                if (res?.isError) {
                    const e = res._meta?.['arrive/error'] || sc?.error || {};
                    return { output: `Error del hub (${e.code || 'ERROR'}): ${e.message || res.content?.[0]?.text || 'sin detalle'}${e.hint ? `\nQué hacer: ${e.hint}` : ''}` };
                }
                return { output: clip(sc ? JSON.stringify(sc) : (res?.content || []).map(c => c.text || '').join('\n'), TOOL_OUTPUT_CHARS) };
            }
            default:
                return { output: `No existe la herramienta «${name}». Disponibles: ${TOOL_SPECS.map(t => t.name).join(', ')}.` };
        }
    }
    return { run, openHub, specs: TOOL_SPECS };
}
