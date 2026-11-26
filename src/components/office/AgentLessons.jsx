// Lecciones de un agente: lo que el CEO dijo al revisar sus entregas. El agente recibe las
// más recientes en cada tarea nueva (internos en su prompt, externos por MCP en get_office_task).
import React, { useEffect, useState } from 'react';
import { GraduationCap, Trash2 } from 'lucide-react';
import { timeAgo } from './officeUi';

const KIND = {
    changes: { label: 'Corrección', color: '#f5b638' },
    reject: { label: 'Descartado', color: '#f87171' },
    approve: { label: 'Bien hecho', color: '#34d399' },
};

export default function AgentLessons({ agentId, onOpenTask }) {
    const [lessons, setLessons] = useState(null);
    const [error, setError] = useState('');
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let alive = true;
        fetch(`/api/office/agent/${agentId}/lessons`)
            .then(r => r.json())
            .then(d => { if (alive) setLessons(d.lessons || []); })
            .catch(() => { if (alive) setLessons([]); });
        return () => { alive = false; };
    }, [agentId, tick]);

    const remove = async id => {
        setError('');
        const r = await fetch(`/api/office/lessons/${id}`, { method: 'DELETE' });
        if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'No se pudo borrar');
        setTick(n => n + 1);
    };

    return (
        <div className="al">
            <div className="al-head">
                <GraduationCap size={14} />
                <h4>Lecciones de tus revisiones</h4>
                {lessons && <span>{lessons.length}</span>}
            </div>
            <p className="al-help">
                Cada vez que pides cambios, descartas o apruebas con un comentario, queda aquí. El agente recibe las 8 más recientes en cada tarea nueva para no repetir errores. Borra las que ya no apliquen.
            </p>
            {error && <div className="occ-notice">{error}</div>}
            {lessons === null && <p className="al-help">Cargando…</p>}
            {lessons?.length === 0 && <p className="al-empty">Todavía no hay lecciones. Aparecen cuando revisas una entrega con un comentario.</p>}
            {lessons?.map((l, i) => {
                const k = KIND[l.kind] || KIND.changes;
                return (
                    <div key={l.id} className={`al-row ${i >= 8 ? 'old' : ''}`}>
                        <span className="al-kind" style={{ color: k.color, borderColor: `${k.color}55` }}>{k.label}</span>
                        <div className="al-body">
                            <p>{l.notes}</p>
                            <button type="button" className="al-task" onClick={() => onOpenTask?.(l.taskId)}>«{l.task}» · {timeAgo(l.at)}</button>
                        </div>
                        <button type="button" className="al-del" title="Borrar lección" onClick={() => remove(l.id)}><Trash2 size={13} /></button>
                    </div>
                );
            })}
            {lessons?.length > 8 && <p className="al-help">Las atenuadas ya no se envían (solo van las 8 más recientes).</p>}
        </div>
    );
}
