import React, { useState } from 'react';
import { X, CalendarDays, CheckSquare, Share2, Edit3, Save, ExternalLink, Plus, Trash2, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function CalendarItemModal({ item, onClose }) {
    const navigate = useNavigate();
    const { updateTask, updateEvent } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    
    // Copy the full item to local state for editing
    const [formData, setFormData] = useState(() => {
        if (!item || !item.fullItem) return {};
        // Deep copy to safely edit arrays
        return JSON.parse(JSON.stringify(item.fullItem));
    });

    if (!item) return null;

    const handleSave = () => {
        if (item.type === 'task') {
            updateTask(item.fullItem.id, formData);
        } else if (item.type === 'event') {
            updateEvent(item.fullItem.id, formData);
        }
        // content entries... we need to see if updateContentEntry exists in useApp
        setIsEditing(false);
        onClose(); // Optional: close or just stop editing
    };

    const handleGoToDetail = () => {
        if (item.type === 'event') {
            navigate(`/eventos/${item.eventId}`);
        } else if (item.type === 'content') {
            // maybe navigate to social media?
            navigate('/social');
        } else if (item.type === 'task') {
            // tasks are managed in standard pages
            navigate('/empresas');
        }
    };

    // --- RENDERERS ---

    const renderTask = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Texto de Tarea</label>
                {isEditing ? (
                    <input 
                        type="text" 
                        value={formData.text || ''} 
                        onChange={e => setFormData({...formData, text: e.target.value})}
                        style={{ padding: '8px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', width: '100%' }}
                    />
                ) : (
                    <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{formData.text}</div>
                )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '60px' }}>Prioridad</label>
                {isEditing ? (
                    <select 
                        value={formData.priority || 'medium'}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                        style={{ padding: '6px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)' }}
                    >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                    </select>
                ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{formData.priority || 'Medium'}</div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '60px' }}>Estado</label>
                <div 
                    onClick={() => {
                        if (isEditing) setFormData({...formData, done: !formData.done});
                    }}
                    style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '6px 12px', borderRadius: '6px', cursor: isEditing ? 'pointer' : 'default',
                        background: formData.done ? 'rgba(34,197,94,0.1)' : 'var(--bg-canvas)',
                        color: formData.done ? '#22c55e' : 'var(--text-secondary)',
                        border: `1px solid ${formData.done ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`
                    }}>
                    <CheckSquare size={14} />
                    {formData.done ? 'Completada' : 'Pendiente'}
                </div>
            </div>
        </div>
    );

    const renderEvent = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nombre del Evento</label>
                {isEditing ? (
                    <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        style={{ padding: '8px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', width: '100%' }}
                    />
                ) : (
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{formData.name}</div>
                )}
            </div>

            {/* Puntos / Requerimientos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    Requerimientos / Puntos
                    {isEditing && (
                        <button 
                            onClick={() => setFormData({...formData, requirements: [...(formData.requirements || []), { title: 'Nuevo Requerimiento', items: [''] }]})}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                            <Plus size={12} /> Agregar Lista
                        </button>
                    )}
                </label>
                
                {(!formData.requirements || formData.requirements.length === 0) && !isEditing && (
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No hay requerimientos definidos.</div>
                )}

                {(formData.requirements || []).map((req, rIdx) => (
                    <div key={rIdx} style={{ background: 'var(--bg-canvas)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            {isEditing ? (
                                <input 
                                    type="text" value={req.title}
                                    onChange={e => {
                                        const newReq = [...formData.requirements];
                                        newReq[rIdx].title = e.target.value;
                                        setFormData({...formData, requirements: newReq});
                                    }}
                                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', outline: 'none', flex: 1 }}
                                />
                            ) : (
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)' }}>{req.title}</div>
                            )}
                            
                            {isEditing && (
                                <button onClick={() => {
                                    const newReq = [...formData.requirements];
                                    newReq.splice(rIdx, 1);
                                    setFormData({...formData, requirements: newReq});
                                }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '8px' }}>
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(req.items || []).map((ritem, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-tertiary)', flexShrink: 0 }} />
                                    {isEditing ? (
                                        <input 
                                            type="text" value={ritem}
                                            onChange={e => {
                                                const newReq = [...formData.requirements];
                                                newReq[rIdx].items[iIdx] = e.target.value;
                                                setFormData({...formData, requirements: newReq});
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', outline: 'none', flex: 1 }}
                                            placeholder="Detalle..."
                                        />
                                    ) : (
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ritem}</div>
                                    )}
                                    {isEditing && (
                                        <button onClick={() => {
                                            const newReq = [...formData.requirements];
                                            newReq[rIdx].items.splice(iIdx, 1);
                                            setFormData({...formData, requirements: newReq});
                                        }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {isEditing && (
                                <button 
                                    onClick={() => {
                                        const newReq = [...formData.requirements];
                                        newReq[rIdx].items.push('');
                                        setFormData({...formData, requirements: newReq});
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '11px', textAlign: 'left', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Plus size={10} /> Agregar punto
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {!isEditing && (
                <button 
                    onClick={handleGoToDetail}
                    style={{ 
                        marginTop: '10px', width: '100%', padding: '10px', background: 'rgba(99,102,241,0.1)', 
                        color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                    }}>
                    <Maximize2 size={16} />
                    Abrir Detalle Completo
                </button>
            )}
        </div>
    );

    const renderContent = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tema de Contenido</label>
                {isEditing ? (
                    <input 
                        type="text" 
                        value={formData.topic || ''} 
                        onChange={e => setFormData({...formData, topic: e.target.value})}
                        style={{ padding: '8px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', width: '100%' }}
                    />
                ) : (
                    <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{formData.topic || 'Sin tema asignado'}</div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notas</label>
                {isEditing ? (
                    <textarea 
                        value={formData.notes || ''} 
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        style={{ padding: '8px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', width: '100%', minHeight: '80px', resize: 'vertical' }}
                    />
                ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{formData.notes || 'No hay notas.'}</div>
                )}
            </div>
            
            {!isEditing && (
                <button 
                    onClick={handleGoToDetail}
                    style={{ 
                        marginTop: '10px', width: '100%', padding: '10px', background: 'var(--bg-canvas)', 
                        color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
                    }}>
                    <ExternalLink size={16} />
                    Ir a Redes Sociales
                </button>
            )}
        </div>
    );

    const getIcon = () => {
        if (item.type === 'task') return <CheckSquare size={16} color="var(--accent-primary)" />;
        if (item.type === 'event') return <CalendarDays size={16} color={item.color || '#10b981'} />;
        if (item.type === 'content') return <Share2 size={16} color="#f59e0b" />;
        return null;
    };

    const getTypeLabel = () => {
        if (item.type === 'task') return 'Tarea';
        if (item.type === 'event') return 'Evento';
        if (item.type === 'content') return 'Redes Sociales';
        return 'Item';
    };

    return (
        <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 
        }}>
            <div style={{ 
                background: 'var(--bg-surface)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '16px', 
                width: '100%', maxWidth: '450px', 
                maxHeight: '85vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid var(--border-subtle)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '6px', background: 'var(--bg-canvas)', borderRadius: '8px', display: 'flex' }}>
                            {getIcon()}
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                {getTypeLabel()}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {item.dateObj.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isEditing ? (
                            <button 
                                onClick={handleSave}
                                style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <Save size={14} /> Guardar
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <Edit3 size={14} />
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-tertiary)', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    {item.type === 'task' && renderTask()}
                    {item.type === 'event' && renderEvent()}
                    {item.type === 'content' && renderContent()}
                </div>
            </div>
        </div>
    );
}
