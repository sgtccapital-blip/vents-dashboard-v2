// Misión en pasos: la cadena de agentes que armó BART, con el estado de cada paso.
import React from 'react';
import { Route, ArrowDown } from 'lucide-react';
import { TASK_STATUS, statusMeta } from './officeUi';

export default function OfficeMission({ task, onOpenTask }) {
    const children = new Map((task.children || []).map(c => [c.id, c]));
    const steps = task.missionSteps || [];
    return (
        <div className="ms">
            <div className="ms-head">
                <Route size={13} />
                <span>Misión en {steps.length} pasos</span>
                <span className="ms-mode">{task.autoAdvance ? 'Cada paso arranca cuando el anterior entrega' : 'Cada paso arranca cuando apruebas el anterior'}</span>
            </div>
            {steps.map((st, i) => {
                const child = children.get(st.taskId);
                const meta = statusMeta(TASK_STATUS, child?.status || 'blocked');
                return (
                    <React.Fragment key={st.taskId}>
                        {i > 0 && <ArrowDown size={12} className="ms-arrow" />}
                        <button type="button" className="ms-step" onClick={() => onOpenTask?.(st.taskId)}>
                            <span className="ms-n" style={{ borderColor: meta.color, color: meta.color }}>{i + 1}</span>
                            <span className="ms-body">
                                <span className="ms-agent">{st.agentName}</span>
                                <span className="ms-task">{st.task}</span>
                                {st.why && <span className="ms-why">{st.why}</span>}
                            </span>
                            <span className="ms-status" style={{ color: meta.color }}>{meta.label}</span>
                        </button>
                    </React.Fragment>
                );
            })}
            {task.status === 'done' && <p className="ms-done">🏁 Todos los pasos aprobados. El entregable de arriba junta lo que hizo cada agente.</p>}
        </div>
    );
}
