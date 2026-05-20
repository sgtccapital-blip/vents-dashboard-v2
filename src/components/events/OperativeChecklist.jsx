import React, { useState } from 'react';
import { CheckSquare, Square, ListTodo, AlertCircle } from 'lucide-react';

export default function OperativeChecklist({ checklist = {}, updateChecklistItem }) {
    
    // Group checklist items by category
    const categories = ['Promo', 'Logística', 'Imagen'];
    
    const [expandedCategory, setExpandedCategory] = useState('Promo');

    const toggleItem = (categoryId, itemId, currentValue) => {
        updateChecklistItem(categoryId, itemId, !currentValue);
    };

    const calculateProgress = (categoryId) => {
        const items = checklist[categoryId] || [];
        if (items.length === 0) return 0;
        const completed = items.filter(i => i.completed).length;
        return Math.round((completed / items.length) * 100);
    };

    return (
        <div className="glass-panel" style={{ padding: '24px', animation: 'slideUp 0.5s ease-out' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '18px' }}>
                <ListTodo size={20} className="text-primary" /> Checklist Operativo
            </h3>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                {categories.map(cat => {
                    const progress = calculateProgress(cat);
                    const isCompleted = progress === 100;
                    
                    return (
                        <button 
                            key={cat}
                            onClick={() => setExpandedCategory(cat)}
                            style={{
                                padding: '12px 16px',
                                background: expandedCategory === cat ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${expandedCategory === cat ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)'}`,
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                minWidth: '120px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '14px', fontWeight: '500' }}>
                                {cat}
                                {isCompleted && <AlertCircle size={14} className="text-primary" />}
                            </div>
                            
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: isCompleted ? '#10b981' : 'var(--primary-color)', transition: 'width 0.3s ease' }}></div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right', width: '100%' }}>
                                {progress}%
                            </div>
                        </button>
                    )
                })}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--text-secondary)' }}>Tareas de {expandedCategory}</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(!checklist[expandedCategory] || checklist[expandedCategory].length === 0) ? (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                            No hay tareas en esta categoría
                        </div>
                    ) : (
                        checklist[expandedCategory].map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => toggleItem(expandedCategory, item.id, item.completed)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    padding: '12px', 
                                    background: item.completed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${item.completed ? 'rgba(16, 185, 129, 0.2)' : 'transparent'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ color: item.completed ? '#10b981' : 'var(--text-tertiary)' }}>
                                    {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <span style={{ fontSize: '14px', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                                    {item.task}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
