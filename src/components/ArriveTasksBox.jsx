import React, { useState } from 'react';
import {
    CheckSquare, Plus, Trash2, Tag, Calendar,
    Filter, GlassWater, Film, Flame, Sparkles,
    Check, AlertCircle, Clock, ChevronDown, UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './ArriveAgency.css';

const DEFAULT_ARRIVE_TASKS = [
    {
        id: 'arr-task-1',
        text: 'Convocatoria y selección de 8 chicas para Cena VIP en Terraplén Rooftop',
        division: 'models',
        tag: '#CenaChicas',
        venue: 'Terraplén Rooftop',
        due: 'Jueves 8:30 PM',
        priority: 'high',
        assignedTo: 'Pulse (PR Hostess)',
        done: false
    },
    {
        id: 'arr-task-2',
        text: 'Confirmación 1 a 1 por WhatsApp con menú degustación y cortesías en Furia',
        division: 'models',
        tag: '#CenaChicas',
        venue: 'Furia',
        due: 'Viernes 9:00 PM',
        priority: 'high',
        assignedTo: 'Booker ARRIVE',
        done: false
    },
    {
        id: 'arr-task-3',
        text: 'Editar y publicar Reel recap del fin de semana con audio en tendencia en @arriveagency',
        division: 'services',
        tag: '#Reels',
        venue: 'Arrive Services',
        due: 'Lunes',
        priority: 'medium',
        assignedTo: 'Creative Editor',
        done: false
    },
    {
        id: 'arr-task-4',
        text: 'Programar carrusel showcase de servicios creativos y casos de branding',
        division: 'services',
        tag: '#SocialMedia',
        venue: 'Digital Projects',
        due: 'Martes',
        priority: 'medium',
        assignedTo: 'Social Media Manager',
        done: true
    },
    {
        id: 'arr-task-5',
        text: 'Coordinar line-up de DJ residente y cobertura audiovisual en Terraplén',
        division: 'nightlife',
        tag: '#EventosSemanales',
        venue: 'Terraplén Rooftop',
        due: 'Jueves',
        priority: 'high',
        assignedTo: 'Nightlife Lead',
        done: false
    },
    {
        id: 'arr-task-6',
        text: 'Confirmar lista de mesas VIP y consumo mínimo para noche temática de viernes en Furia',
        division: 'nightlife',
        tag: '#VIP',
        venue: 'Furia',
        due: 'Viernes',
        priority: 'high',
        assignedTo: 'VIP Hostess',
        done: false
    },
    {
        id: 'arr-task-7',
        text: 'Briefing de producción y selección de outfits para próximo Content Day',
        division: 'studio',
        tag: '#ContentDay',
        venue: 'ARRIVE Studio',
        due: 'Próxima semana',
        priority: 'medium',
        assignedTo: 'Studio Director',
        done: false
    },
    {
        id: 'arr-task-8',
        text: 'Reserva de mesa principal y welcome drinks para grupo chicas en Piano Bar Casco',
        division: 'nightlife',
        tag: '#CenaChicas',
        venue: 'Piano Bar',
        due: 'Sábado 9:30 PM',
        priority: 'medium',
        assignedTo: 'PR Coordinator',
        done: false
    }
];

export default function ArriveTasksBox() {
    const { tasks, projects, addTask, toggleTask, deleteTask, addActivity } = useApp();

    const [activeFilter, setActiveFilter] = useState('all');
    const [newText, setNewText] = useState('');
    const [newDivision, setNewDivision] = useState('models');
    const [newTag, setNewTag] = useState('#CenaChicas');
    const [newVenue, setNewVenue] = useState('Terraplén Rooftop');
    const [newPriority, setNewPriority] = useState('high');
    const [selectedProjectId, setSelectedProjectId] = useState('proj-arrive-agency');
    const [selectedAssignee, setSelectedAssignee] = useState('GG');

    // Combine global tasks with arrive-specific tasks
    // If tasks has items with agency === 'arrive' or division or default ones
    const arriveTasks = (tasks || []).filter(t => 
        t.agency === 'arrive' || 
        t.projectId === 'proj-arrive-agency' ||
        t.id?.startsWith('arr-') ||
        t.division || 
        t.tag === '#CenaChicas' ||
        t.tag === '#Reels' ||
        t.tag === '#SocialMedia' ||
        t.tag === '#EventosSemanales' ||
        t.tag === '#ContentDay' ||
        t.tag === '#VIP' ||
        (t.text && (
            t.text.toLowerCase().includes('cena') ||
            t.text.toLowerCase().includes('chica') ||
            t.text.toLowerCase().includes('furia') ||
            t.text.toLowerCase().includes('terraplén') ||
            t.text.toLowerCase().includes('piano bar') ||
            t.text.toLowerCase().includes('post') ||
            t.text.toLowerCase().includes('reel') ||
            t.text.toLowerCase().includes('arrive')
        ))
    );

    // If no tasks in DB yet, show DEFAULT_ARRIVE_TASKS
    const displayTasks = arriveTasks.length > 0 ? arriveTasks : DEFAULT_ARRIVE_TASKS;

    // Filter tasks based on active pill
    const filteredTasks = displayTasks.filter(task => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'dinners') {
            return task.tag === '#CenaChicas' || 
                   task.division === 'models' || 
                   (task.text && (task.text.toLowerCase().includes('cena') || task.text.toLowerCase().includes('chica')));
        }
        if (activeFilter === 'posts') {
            return task.division === 'services' || 
                   task.tag === '#SocialMedia' || 
                   task.tag === '#Reels' || 
                   (task.text && (task.text.toLowerCase().includes('post') || task.text.toLowerCase().includes('reel') || task.text.toLowerCase().includes('carrusel')));
        }
        if (activeFilter === 'nightlife') {
            return task.division === 'nightlife' || 
                   task.tag === '#EventosSemanales' || 
                   task.tag === '#VIP' || 
                   (task.text && (task.text.toLowerCase().includes('furia') || task.text.toLowerCase().includes('terraplén') || task.text.toLowerCase().includes('piano bar')));
        }
        if (activeFilter === 'studio') {
            return task.division === 'studio' || 
                   task.tag === '#ContentDay' || 
                   task.tag === '#StudioSession' || 
                   (task.text && task.text.toLowerCase().includes('studio') || task.text?.toLowerCase().includes('content day'));
        }
        return true;
    });

    const completedCount = displayTasks.filter(t => t.done).length;
    const totalCount = displayTasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const handleCreateTask = async (e) => {
        e?.preventDefault();
        if (!newText.trim()) return;

        const proj = (projects || []).find(p => p.id === selectedProjectId);
        const projName = proj?.name || (selectedProjectId === 'proj-arrive-agency' ? 'ARRIVE AGENCY' : selectedProjectId);

        const taskObj = {
            id: `arr-t-${Date.now()}`,
            text: newText.trim(),
            division: newDivision,
            tag: newTag,
            venue: newVenue,
            priority: newPriority,
            due: newDivision === 'models' ? 'Jueves Cenas' : 'Esta Semana',
            assignedTo: selectedAssignee || (newDivision === 'models' ? 'PR Hostess' : newDivision === 'services' ? 'Social Content' : 'Ops Lead'),
            agency: selectedProjectId === 'proj-arrive-agency' ? 'arrive' : undefined,
            projectId: selectedProjectId || 'proj-arrive-agency',
            projectName: projName,
            project: projName,
            done: false,
            createdAt: new Date().toISOString()
        };

        if (addTask) {
            await addTask(taskObj);
        }
        if (addActivity) {
            addActivity(`Nueva tarea ARRIVE (${newDivision.toUpperCase()}): "${newText.trim()}"`, '#fbbf24');
        }

        setNewText('');
    };

    const handleToggle = (task) => {
        if (toggleTask && task.id) {
            toggleTask(task.id);
        } else {
            task.done = !task.done;
        }
        if (addActivity) {
            addActivity(`${task.done ? 'Completada' : 'Reabierta'} tarea ARRIVE: "${task.text.substring(0, 30)}..."`, task.done ? '#10b981' : '#94a3b8');
        }
    };

    const handleDelete = (taskId) => {
        if (deleteTask) {
            deleteTask(taskId);
        }
    };

    const getDivisionBadge = (division) => {
        switch (division) {
            case 'services':
                return <span className="arrive-division-badge badge-div-services">SERVICES</span>;
            case 'models':
                return <span className="arrive-division-badge badge-div-models">MODELS · CENAS</span>;
            case 'nightlife':
                return <span className="arrive-division-badge badge-div-nightlife">NIGHTLIFE</span>;
            case 'studio':
                return <span className="arrive-division-badge badge-div-studio">STUDIO</span>;
            default:
                return <span className="arrive-division-badge badge-div-services">ARRIVE</span>;
        }
    };

    return (
        <div className="arrive-tasks-widget animate-in">
            {/* Header */}
            <div className="arrive-tasks-header">
                <div className="arrive-tasks-title-area">
                    <div className="arrive-tasks-icon-wrap">
                        <CheckSquare size={20} />
                    </div>
                    <div>
                        <h3 className="arrive-tasks-heading">Gestión de Tareas Operativas ARRIVE</h3>
                        <p className="arrive-tasks-sub">
                            Cenas de chicas a restaurantes, posts de proyectos y eventos semanales
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                            {completedCount} de {totalCount} completadas
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{progressPercent}% completado</div>
                    </div>
                    <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                            style={{ 
                                width: `${progressPercent}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #d4af37, #fbbf24)', 
                                borderRadius: '3px',
                                transition: 'width 0.4s ease'
                            }} 
                        />
                    </div>
                </div>
            </div>

            {/* Division Filter Pills */}
            <div className="arrive-filter-bar">
                <button 
                    className={`arrive-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    <Sparkles size={13} /> Todas ({displayTasks.length})
                </button>
                <button 
                    className={`arrive-filter-pill ${activeFilter === 'dinners' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('dinners')}
                >
                    <GlassWater size={13} style={{ color: '#fbbf24' }} /> Cenas Chicas & Restaurantes
                </button>
                <button 
                    className={`arrive-filter-pill ${activeFilter === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('posts')}
                >
                    <Film size={13} style={{ color: '#60a5fa' }} /> Posts & Redes Sociales
                </button>
                <button 
                    className={`arrive-filter-pill ${activeFilter === 'nightlife' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('nightlife')}
                >
                    <Flame size={13} style={{ color: '#c084fc' }} /> Eventos Semanales
                </button>
                <button 
                    className={`arrive-filter-pill ${activeFilter === 'studio' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('studio')}
                >
                    <Sparkles size={13} style={{ color: '#2dd4bf' }} /> Studio & Content Day
                </button>
            </div>

            {/* Quick Add Task Bar */}
            <form onSubmit={handleCreateTask} className="arrive-quickadd-bar">
                <input 
                    type="text"
                    className="arrive-quickadd-input"
                    placeholder="Nueva tarea ARRIVE (ej. Confirmar 8 chicas cena Terraplén, Editar Reel Furia...)"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                />

                <select 
                    className="arrive-quickadd-select"
                    value={newDivision}
                    onChange={(e) => {
                        setNewDivision(e.target.value);
                        if (e.target.value === 'models') setNewTag('#CenaChicas');
                        else if (e.target.value === 'services') setNewTag('#Reels');
                        else if (e.target.value === 'nightlife') setNewTag('#EventosSemanales');
                        else if (e.target.value === 'studio') setNewTag('#ContentDay');
                    }}
                >
                    <option value="models">División: Models / Cenas</option>
                    <option value="services">División: Services / Marketing</option>
                    <option value="nightlife">División: Nightlife / Venues</option>
                    <option value="studio">División: Studio / Producción</option>
                </select>

                <select 
                    className="arrive-quickadd-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    style={{ fontWeight: 600, color: '#fbbf24' }}
                >
                    <option value="proj-arrive-agency">🌟 ARRIVE AGENCY</option>
                    {(projects || []).filter(p => p.id !== 'proj-arrive-agency').map(p => (
                        <option key={p.id} value={p.id}>🚀 {p.name}</option>
                    ))}
                </select>

                <select 
                    className="arrive-quickadd-select"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                >
                    <option value="Terraplén Rooftop">Terraplén Rooftop</option>
                    <option value="Furia">Furia Panamá</option>
                    <option value="Piano Bar">Piano Bar Casco</option>
                    <option value="ARRIVE Studio">ARRIVE Studio</option>
                    <option value="Proyectos Digitales">Proyectos Digitales</option>
                </select>

                <select 
                    className="arrive-quickadd-select"
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                >
                    <option value="GG">👤 GG</option>
                    <option value="JOSHUA">👤 JOSHUA</option>
                    <option value="MARIO">👤 MARIO</option>
                    <option value="ANDREA">👤 ANDREA</option>
                    <option value="FANNY">👤 FANNY</option>
                    <option value="JEIKOB">👤 JEIKOB</option>
                    <option value="FIVVR">👤 FIVVR</option>
                    <option value="PR Hostess">👑 PR Hostess</option>
                    <option value="Social Content">📱 Social Content</option>
                </select>

                <select 
                    className="arrive-quickadd-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                >
                    <option value="high">Prioridad: Alta 🔥</option>
                    <option value="medium">Prioridad: Media ⚡</option>
                    <option value="low">Prioridad: Normal ▫</option>
                </select>

                <button type="submit" className="arrive-quickadd-btn">
                    <Plus size={14} /> Añadir
                </button>
            </form>

            {/* Task Items List */}
            <div className="arrive-task-list">
                {filteredTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '13px' }}>
                        No hay tareas en esta categoría. ¡Agrega una nueva arriba! ✨
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <div 
                            key={task.id} 
                            className={`arrive-task-item ${task.done ? 'is-done' : ''}`}
                        >
                            <div className="arrive-task-left">
                                <div 
                                    className={`arrive-custom-checkbox ${task.done ? 'checked' : ''}`}
                                    onClick={() => handleToggle(task)}
                                    title={task.done ? 'Marcar como pendiente' : 'Marcar como completada'}
                                >
                                    {task.done && <Check size={13} strokeWidth={3} />}
                                </div>

                                <div className="arrive-task-meta">
                                    <span className="arrive-task-title">{task.text}</span>
                                    <div className="arrive-task-details">
                                        {getDivisionBadge(task.division)}
                                        {task.venue && (
                                            <span className="arrive-venue-badge">
                                                📍 {task.venue}
                                            </span>
                                        )}
                                        {task.tag && (
                                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                                                {task.tag}
                                            </span>
                                        )}
                                        {task.due && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cbd5e1' }}>
                                                <Clock size={11} /> {task.due}
                                            </span>
                                        )}
                                        {task.assignedTo && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#94a3b8' }}>
                                                <UserCheck size={11} /> {task.assignedTo}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="arrive-task-actions">
                                {task.priority === 'high' && (
                                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }} title="Prioridad Alta">
                                        🔥 Alta
                                    </span>
                                )}
                                <button 
                                    className="arrive-delete-btn"
                                    onClick={() => handleDelete(task.id)}
                                    title="Eliminar tarea"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
