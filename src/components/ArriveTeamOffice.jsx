import React, { useState, useMemo } from 'react';
import {
    Users, Briefcase, Film, GlassWater, Monitor,
    Plus, Check, Clock, Phone, Mail, Edit3, Trash2,
    CheckCircle2, AlertCircle, Sparkles, MapPin,
    Layers, Search, Filter, ShieldCheck, ChevronRight,
    Sliders, Laptop, ExternalLink, Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Initial default team members tailored for ARRIVE Agency office operations
export const DEFAULT_OFFICE_TEAM = [
    {
        id: 'team-director-general',
        personName: 'Gabriel',
        avatar: '👑',
        role: 'Director General & Fundador',
        division: 'Executive & Strategy',
        station: 'Estación 01 — Dirección General & Alianzas',
        setup: 'MacBook Pro M3 Max + Pantalla Studio Display 5K',
        status: 'En Oficina',
        statusColor: '#10b981',
        phone: '50762110001',
        email: 'gabriel@arriveservices.com',
        currentFocus: 'Estrategia de crecimiento de ARRIVE, alianzas de marca y nuevos negocios',
        defaultTasks: [
            'Revisión estratégica de nuevos contratos y alianzas con venues',
            'Reunión directiva de alineación de proyectos del mes',
            'Definición de visión comercial para Q4'
        ]
    },
    {
        id: 'team-creative-lead',
        personName: 'Mario',
        avatar: '🎨',
        role: 'Director Creativo & Content Strategist',
        division: 'Creative & Strategy',
        station: 'Estación 02 — Dirección Creativa, Concept & Pitching',
        setup: 'MacBook Pro M3 Pro + iPad Pro con Apple Pencil para bocetado',
        status: 'En Oficina',
        statusColor: '#10b981',
        phone: '50762110004',
        email: 'mario@arriveservices.com',
        currentFocus: 'Pitch decks para nuevos clientes, conceptos visuales, branding e ideas de campañas',
        defaultTasks: [
            'Diseño de presentación comercial (Pitch Deck) para nuevo cliente',
            'Conceptualización creativa del próximo Content Day de venues',
            'Supervisión de línea gráfica y estética de las marcas aliadas'
        ]
    },
    {
        id: 'team-filmmaker',
        personName: 'Suira',
        avatar: '🎬',
        role: 'Lead Filmmaker & Productora Audiovisual',
        division: 'ARRIVE Studio',
        station: 'Estación 03 — Suite de Edición 4K & Color Grading',
        setup: 'Mac Studio M2 Ultra + 64GB + Dual 4K ProArt + Sony FX3',
        status: 'En Edición',
        statusColor: '#60a5fa',
        phone: '50762110003',
        email: 'suira@arriveservices.com',
        currentFocus: 'Color grading, sound design y edición de Reels 4K para Terraplén y Furia',
        defaultTasks: [
            'Exportar 2 Reels en 4K HDR para Terraplén Rooftop',
            'Edición de recap de fiesta y cena en Furia Panamá',
            'Backup en disco NAS y organización de tomas de cámara'
        ]
    },
    {
        id: 'team-account-executive',
        personName: 'Joshua',
        avatar: '💼',
        role: 'Operations Lead & Logística de Agencia',
        division: 'Agency Operations',
        station: 'Estación 04 — Operations & Retainers Care',
        setup: 'Dell XPS 15 + Suite de Facturación + Google Workspace',
        status: 'En Oficina',
        statusColor: '#10b981',
        phone: '50762110002',
        email: 'joshua@arriveservices.com',
        currentFocus: 'Seguimiento de tareas operativas, facturas de retainers del mes y logística de venues',
        defaultTasks: [
            'Envío de factura y recibo mensual de retainers a clientes',
            'Coordinar logística técnica y proveedores de venues',
            'Revisión y actualización del tablero de tareas operativas'
        ]
    },
    {
        id: 'team-executive-assistant',
        personName: 'Dalia',
        avatar: '📋',
        role: 'Asistente Ejecutiva & Secretaria de Dirección',
        division: 'Executive Assistance',
        station: 'Estación 05 — Coordinación Ejecutiva & Secretaría',
        setup: 'iMac 24" M3 + iPhone 15 + Suite Administrativa Google & Notion',
        status: 'En Oficina',
        statusColor: '#10b981',
        phone: '50762110005',
        email: 'dalia@arriveservices.com',
        currentFocus: 'Gestión de agenda directiva, minutas de reuniones, reservas y compras de oficina',
        defaultTasks: [
            'Coordinar agenda semanal de reuniones y llamadas del equipo',
            'Redactar y enviar minutas de acuerdos con clientes',
            'Gestión de insumos de oficina, catering y reservas en Casco'
        ]
    }
];

const PRESENCE_STATUSES = [
    { label: 'En Oficina', color: '#10b981', icon: '🏢' },
    { label: 'En Edición', color: '#60a5fa', icon: '🎬' },
    { label: 'Convocando Cenas', color: '#f472b6', icon: '🍸' },
    { label: 'En Rodaje / Shooting', color: '#a855f7', icon: '📸' },
    { label: 'Reunión Cliente', color: '#fbbf24', icon: '🤝' },
    { label: 'Remoto', color: '#94a3b8', icon: '💻' }
];

export default function ArriveTeamOffice() {
    const { tasks, addTask, toggleTask, addActivity } = useApp();

    // Local Storage for Team
    const [team, setTeam] = useState(() => {
        try {
            const saved = localStorage.getItem('arrive_agency_office_team');
            if (saved) {
                const parsed = JSON.parse(saved);
                const hasOldRoles = Array.isArray(parsed) && parsed.some(m =>
                    (m.personName === 'Joshua' && m.role?.includes('Filmmaker')) ||
                    (m.personName === 'Suira' && m.role?.includes('Operations')) ||
                    (m.personName === 'Mario' && m.role?.includes('Community')) ||
                    (m.personName === 'Dalia' && m.role?.includes('Talent')) ||
                    ['Mateo L.', 'Camila S.', 'Valeria R.', 'Andrés V.'].includes(m.personName)
                );
                if (!hasOldRoles && Array.isArray(parsed) && parsed.length === 5) return parsed;
            }
        } catch (e) {
            console.error('Error loading office team', e);
        }
        return DEFAULT_OFFICE_TEAM;
    });

    const [viewMode, setViewMode] = useState('stations'); // 'stations' | 'matrix'
    const [filterDivision, setFilterDivision] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for adding/editing team member
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [formData, setFormData] = useState({
        personName: '',
        avatar: '👤',
        role: '',
        division: 'ARRIVE Services',
        station: '',
        setup: '',
        status: 'En Oficina',
        phone: '',
        email: '',
        currentFocus: ''
    });

    // Inline task creation for a member
    const [inlineTaskInput, setInlineTaskInput] = useState({});

    // Save team to LocalStorage
    const saveTeam = (updatedTeam) => {
        setTeam(updatedTeam);
        try {
            localStorage.setItem('arrive_agency_office_team', JSON.stringify(updatedTeam));
        } catch (e) {
            console.error('Error saving office team', e);
        }
    };

    // Filtered team
    const filteredTeam = useMemo(() => {
        return team.filter(member => {
            const matchDivision = filterDivision === 'all' || member.division.toLowerCase().includes(filterDivision.toLowerCase());
            const matchSearch = !searchQuery || 
                member.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.currentFocus.toLowerCase().includes(searchQuery.toLowerCase());
            return matchDivision && matchSearch;
        });
    }, [team, filterDivision, searchQuery]);

    // Handle presence status change
    const handleStatusChange = (memberId, newStatus) => {
        const statusObj = PRESENCE_STATUSES.find(s => s.label === newStatus) || { color: '#94a3b8' };
        const updated = team.map(m => {
            if (m.id === memberId) {
                return { ...m, status: newStatus, statusColor: statusObj.color };
            }
            return m;
        });
        saveTeam(updated);
        const member = team.find(m => m.id === memberId);
        if (addActivity) {
            addActivity(`Oficina: ${member?.personName || 'Miembro'} cambió su estado a "${newStatus}"`, statusObj.color);
        }
    };

    // Open Modal
    const handleOpenModal = (member = null) => {
        if (member) {
            setEditingMember(member);
            setFormData({ ...member });
        } else {
            setEditingMember(null);
            setFormData({
                personName: '',
                avatar: '👤',
                role: '',
                division: 'ARRIVE Services',
                station: `Estación 0${team.length + 1} — Oficina Central`,
                setup: 'MacBook Pro / Workstation',
                status: 'En Oficina',
                phone: '',
                email: '',
                currentFocus: ''
            });
        }
        setShowModal(true);
    };

    // Handle Form Submit
    const handleSaveMember = (e) => {
        e.preventDefault();
        if (!formData.personName.trim()) return;

        let updated;
        const statusObj = PRESENCE_STATUSES.find(s => s.label === formData.status) || { color: '#10b981' };

        if (editingMember) {
            updated = team.map(m => m.id === editingMember.id ? { ...formData, id: m.id, statusColor: statusObj.color } : m);
            if (addActivity) addActivity(`Actualizado perfil de equipo: ${formData.personName}`, '#60a5fa');
        } else {
            const newMember = {
                ...formData,
                id: `team-${Date.now()}`,
                statusColor: statusObj.color,
                defaultTasks: []
            };
            updated = [...team, newMember];
            if (addActivity) addActivity(`Nuevo integrante agregado a la oficina: ${formData.personName} (${formData.role})`, '#fbbf24');
        }

        saveTeam(updated);
        setShowModal(false);
    };

    // Delete Member
    const handleDeleteMember = (memberId) => {
        if (window.confirm('¿Seguro que deseas eliminar este miembro del equipo de la oficina?')) {
            const member = team.find(m => m.id === memberId);
            const updated = team.filter(m => m.id !== memberId);
            saveTeam(updated);
            if (addActivity) addActivity(`Eliminado miembro de oficina: ${member?.personName || ''}`, '#ef4444');
        }
    };

    // Add inline task directly assigned to a team member
    const handleAddMemberTask = (member) => {
        const text = inlineTaskInput[member.id];
        if (!text || !text.trim()) return;

        const newTask = {
            id: `task-${Date.now()}`,
            text: text.trim(),
            assignedTo: member.personName,
            division: member.division,
            tag: `#Oficina${member.personName.replace(/\s+/g, '')}`,
            priority: 'high',
            done: false,
            createdAt: new Date().toISOString()
        };

        if (addTask) {
            addTask(newTask);
        }

        // Also add to member's defaultTasks
        const updated = team.map(m => {
            if (m.id === member.id) {
                return { ...m, defaultTasks: [text.trim(), ...(m.defaultTasks || [])] };
            }
            return m;
        });
        saveTeam(updated);

        setInlineTaskInput(prev => ({ ...prev, [member.id]: '' }));
        if (addActivity) {
            addActivity(`Tarea asignada a ${member.personName}: "${text.trim()}"`, '#fbbf24');
        }
    };

    // Get live tasks for member (from AppContext tasks + defaultTasks)
    const getMemberTasks = (member) => {
        const appTasks = (tasks || []).filter(t => 
            !t.done && (
                t.assignedTo === member.personName || 
                t.assignedTo === member.id || 
                (t.text && t.text.toLowerCase().includes(member.personName.toLowerCase().split(' ')[0]))
            )
        );
        return appTasks;
    };

    // Count in office
    const inOfficeCount = team.filter(m => m.status === 'En Oficina').length;
    const editingCount = team.filter(m => m.status === 'En Edición').length;

    return (
        <div className="arrive-team-office-section animate-in">
            {/* Top Toolbar & Summary */}
            <div className="arrive-team-header-bar">
                <div className="arrive-team-summary">
                    <div className="arrive-team-title-row">
                        <div className="arrive-team-icon-badge">
                            <Monitor size={18} />
                        </div>
                        <div>
                            <h2 className="arrive-team-title">Equipo, Roles & Estaciones de Oficina</h2>
                            <p className="arrive-team-subtitle">
                                Distribución física y operativa de la oficina HQ en Panamá para gestión de clientes, producción y talento.
                            </p>
                        </div>
                    </div>
                    
                    <div className="arrive-team-stat-badges">
                        <span className="arrive-stat-chip chip-green">
                            <span className="dot-pulse"></span> {inOfficeCount} en Oficina Física
                        </span>
                        <span className="arrive-stat-chip chip-blue">
                            🎬 {editingCount} en Suite de Edición
                        </span>
                        <span className="arrive-stat-chip chip-gold">
                            🪑 {team.length} Estaciones Operativas
                        </span>
                    </div>
                </div>

                <div className="arrive-team-actions-right">
                    <div className="arrive-view-toggle">
                        <button 
                            className={`arrive-view-btn ${viewMode === 'stations' ? 'active' : ''}`}
                            onClick={() => setViewMode('stations')}
                            title="Vista Tarjetas de Estación"
                        >
                            <Monitor size={13} /> Estaciones
                        </button>
                        <button 
                            className={`arrive-view-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                            onClick={() => setViewMode('matrix')}
                            title="Vista Matriz Operativa"
                        >
                            <Layers size={13} /> Matriz
                        </button>
                    </div>

                    <button 
                        className="arrive-btn-primary"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus size={14} /> Nuevo Miembro / Estación
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="arrive-filters-row">
                <div className="arrive-search-box">
                    <Search size={14} style={{ color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, rol, estación o foco del día..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="arrive-division-chips">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'creative', label: '👑 Creative & Strategy' },
                        { id: 'studio', label: '🎬 ARRIVE Studio' },
                        { id: 'models', label: '🍸 ARRIVE Models' },
                        { id: 'services', label: '📱 ARRIVE Services' },
                        { id: 'operations', label: '💼 Operations' }
                    ].map(div => (
                        <button
                            key={div.id}
                            className={`arrive-filter-chip ${filterDivision === div.id ? 'active' : ''}`}
                            onClick={() => setFilterDivision(div.id)}
                        >
                            {div.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════ VIEW: WORKSTATION CARDS ══════ */}
            {viewMode === 'stations' ? (
                <div className="arrive-stations-grid">
                    {filteredTeam.map(member => {
                        const memberLiveTasks = getMemberTasks(member);
                        return (
                            <div key={member.id} className="arrive-station-card">
                                {/* Station Topbar */}
                                <div className="station-card-topbar">
                                    <div className="station-badge">
                                        <Monitor size={11} /> {member.station}
                                    </div>
                                    
                                    {/* Presence Dropdown Switcher */}
                                    <div className="presence-select-wrapper">
                                        <select 
                                            value={member.status}
                                            onChange={(e) => handleStatusChange(member.id, e.target.value)}
                                            className="presence-status-select"
                                            style={{ 
                                                borderColor: member.statusColor,
                                                color: member.statusColor
                                            }}
                                        >
                                            {PRESENCE_STATUSES.map(st => (
                                                <option key={st.label} value={st.label}>
                                                    {st.icon} {st.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Member Profile Header */}
                                <div className="station-member-header">
                                    <div className="station-avatar">
                                        <span>{member.avatar}</span>
                                    </div>
                                    <div className="station-member-info">
                                        <h3 className="station-member-name">{member.personName}</h3>
                                        <div className="station-member-role">{member.role}</div>
                                        <div className="station-member-div">{member.division}</div>
                                    </div>
                                    
                                    <div className="station-card-actions">
                                        <button 
                                            className="station-action-icon"
                                            onClick={() => handleOpenModal(member)}
                                            title="Editar información"
                                        >
                                            <Edit3 size={13} />
                                        </button>
                                        <button 
                                            className="station-action-icon delete"
                                            onClick={() => handleDeleteMember(member.id)}
                                            title="Eliminar de la oficina"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Hardware & Station Setup */}
                                <div className="station-setup-box">
                                    <div className="station-setup-label">
                                        <Laptop size={11} /> Setup & Hardware:
                                    </div>
                                    <div className="station-setup-text">{member.setup}</div>
                                </div>

                                {/* Current Focus */}
                                <div className="station-focus-box">
                                    <div className="station-focus-label">
                                        <Sparkles size={11} style={{ color: '#fbbf24' }} /> Foco Operativo del Día:
                                    </div>
                                    <div className="station-focus-text">
                                        "{member.currentFocus}"
                                    </div>
                                </div>

                                {/* Active Assigned Tasks */}
                                <div className="station-tasks-section">
                                    <div className="station-tasks-header">
                                        <span className="station-tasks-title">
                                            <CheckCircle2 size={12} style={{ color: '#10b981' }} /> Tareas Asignadas
                                        </span>
                                        <span className="station-tasks-count">
                                            {(member.defaultTasks?.length || 0) + memberLiveTasks.length} pendientes
                                        </span>
                                    </div>

                                    <div className="station-tasks-list">
                                        {/* Context tasks */}
                                        {memberLiveTasks.map(t => (
                                            <div key={t.id} className="station-task-item">
                                                <input 
                                                    type="checkbox"
                                                    checked={t.done}
                                                    onChange={() => toggleTask(t.id)}
                                                    className="station-task-checkbox"
                                                />
                                                <span className={`station-task-name ${t.done ? 'done' : ''}`}>
                                                    {t.text}
                                                </span>
                                            </div>
                                        ))}

                                        {/* Member specific seed tasks */}
                                        {(member.defaultTasks || []).map((tText, i) => (
                                            <div key={i} className="station-task-item">
                                                <div className="station-bullet" />
                                                <span className="station-task-name">{tText}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Inline Add Task to Member */}
                                    <div className="station-inline-add-task">
                                        <input 
                                            type="text" 
                                            placeholder={`Asignar tarea a ${member.personName.split(' ')[0]}...`}
                                            value={inlineTaskInput[member.id] || ''}
                                            onChange={(e) => setInlineTaskInput({ ...inlineTaskInput, [member.id]: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddMemberTask(member);
                                            }}
                                        />
                                        <button 
                                            onClick={() => handleAddMemberTask(member)}
                                            className="station-inline-add-btn"
                                            title="Asignar tarea inmediata"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Direct Contact Footer */}
                                <div className="station-footer">
                                    {member.phone && (
                                        <a 
                                            href={`https://wa.me/${member.phone}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="station-contact-link"
                                            title="Abrir chat de WhatsApp"
                                        >
                                            <Phone size={12} style={{ color: '#22c55e' }} /> WhatsApp
                                        </a>
                                    )}
                                    {member.email && (
                                        <a 
                                            href={`mailto:${member.email}`}
                                            className="station-contact-link"
                                            title="Enviar correo"
                                        >
                                            <Mail size={12} style={{ color: '#60a5fa' }} /> {member.email}
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ══════ VIEW: OPERATIONAL MATRIX (TABLE) ══════ */
                <div className="arrive-matrix-wrapper">
                    <table className="arrive-matrix-table">
                        <thead>
                            <tr>
                                <th>Estación Física</th>
                                <th>Responsable</th>
                                <th>Rol & Especialidad</th>
                                <th>División</th>
                                <th>Presencia / Estado</th>
                                <th>Foco Operativo del Día</th>
                                <th>Setup Hardware</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeam.map(member => (
                                <tr key={member.id}>
                                    <td className="matrix-station-cell">
                                        <Monitor size={12} style={{ color: '#fbbf24', marginRight: '6px' }} />
                                        {member.station}
                                    </td>
                                    <td className="matrix-member-cell">
                                        <span className="matrix-avatar">{member.avatar}</span>
                                        <strong>{member.personName}</strong>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{member.role}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{member.email}</div>
                                    </td>
                                    <td>
                                        <span className="arrive-matrix-tag">{member.division}</span>
                                    </td>
                                    <td>
                                        <span 
                                            className="arrive-status-pill"
                                            style={{ 
                                                background: `${member.statusColor}18`, 
                                                color: member.statusColor,
                                                border: `1px solid ${member.statusColor}40`
                                            }}
                                        >
                                            <span className="dot-pulse" style={{ background: member.statusColor }}></span>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="matrix-focus-cell">
                                        "{member.currentFocus}"
                                    </td>
                                    <td style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        {member.setup}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                            <button 
                                                className="station-action-icon"
                                                onClick={() => handleOpenModal(member)}
                                                title="Editar"
                                            >
                                                <Edit3 size={13} />
                                            </button>
                                            <button 
                                                className="station-action-icon delete"
                                                onClick={() => handleDeleteMember(member.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════ MODAL: ADD / EDIT TEAM MEMBER ══════ */}
            {showModal && (
                <div className="arrive-modal-overlay animate-in" onClick={() => setShowModal(false)}>
                    <div className="arrive-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="arrive-modal-header">
                            <div>
                                <h3 className="arrive-modal-title">
                                    {editingMember ? 'Editar Estación & Miembro' : 'Nueva Estación / Integrante de Oficina'}
                                </h3>
                                <p className="arrive-modal-subtitle">
                                    Configura los roles, setup técnico y presencia para la oficina de ARRIVE Agency.
                                </p>
                            </div>
                            <button className="arrive-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSaveMember} className="arrive-modal-form">
                            <div className="arrive-form-grid">
                                <div className="arrive-form-group">
                                    <label>Nombre y Apellido</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ej: Gabriel Gómez"
                                        value={formData.personName}
                                        onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group">
                                    <label>Avatar / Emoji</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: 👑, 🎬, 🍸, 📱, 💼"
                                        value={formData.avatar}
                                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group">
                                    <label>Rol Oficial en la Agencia</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ej: Director Creativo, Lead Filmmaker, Booker..."
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group">
                                    <label>División</label>
                                    <select 
                                        value={formData.division}
                                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                    >
                                        <option value="Creative & Strategy">👑 Creative & Strategy</option>
                                        <option value="ARRIVE Studio">🎬 ARRIVE Studio (Video & 4K)</option>
                                        <option value="ARRIVE Models">🍸 ARRIVE Models & Hostesses</option>
                                        <option value="ARRIVE Services">📱 ARRIVE Services (Social Media)</option>
                                        <option value="Agency Operations">💼 Agency Operations & Retainers</option>
                                    </select>
                                </div>

                                <div className="arrive-form-group">
                                    <label>Estación de Trabajo Física</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Estación 01 — Dirección Creativa & Pitching"
                                        value={formData.station}
                                        onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group">
                                    <label>Presencia Inicial</label>
                                    <select 
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {PRESENCE_STATUSES.map(st => (
                                            <option key={st.label} value={st.label}>
                                                {st.icon} {st.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="arrive-form-group">
                                    <label>Teléfono (WhatsApp)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: 50762110000"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group">
                                    <label>Email Corporativo</label>
                                    <input 
                                        type="email" 
                                        placeholder="Ej: nombre@arriveservices.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group full-width">
                                    <label>Setup Técnico & Hardware Asignado</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Mac Studio M2 Ultra + Pantallas ProArt + Kit Sony FX3..."
                                        value={formData.setup}
                                        onChange={(e) => setFormData({ ...formData, setup: e.target.value })}
                                    />
                                </div>

                                <div className="arrive-form-group full-width">
                                    <label>Foco Operativo del Día / Sprint</label>
                                    <textarea 
                                        rows={2}
                                        placeholder="¿En qué entregable crítico está enfocado hoy?"
                                        value={formData.currentFocus}
                                        onChange={(e) => setFormData({ ...formData, currentFocus: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="arrive-modal-footer">
                                <button type="button" className="arrive-btn-cancel" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="arrive-btn-primary">
                                    {editingMember ? 'Guardar Cambios' : 'Crear Estación & Asignar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
