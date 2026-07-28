import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Filter, User, Mail, Phone, Calendar, Instagram, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';

export default function Contactos() {
    const { contacts, addContact, updateContact, deleteContact } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('Todos');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        instagram: '',
        role: 'Invitado',
        dob: '',
        tags: ''
    });

    // Unique roles for filter
    const roles = ['Todos', ...new Set(contacts?.map(c => c.role) || [])];

    // Filtered contacts
    const filteredContacts = useMemo(() => {
        return (contacts || []).filter(c => {
            const matchesSearch = 
                (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.instagram || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesRole = filterRole === 'Todos' || c.role === filterRole;
            return matchesSearch && matchesRole;
        });
    }, [contacts, searchQuery, filterRole]);

    const openModal = (contact = null) => {
        if (contact) {
            setEditingContact(contact);
            setFormData({
                ...contact,
                tags: contact.tags ? contact.tags.join(', ') : ''
            });
        } else {
            setEditingContact(null);
            setFormData({ name: '', phone: '', email: '', instagram: '', role: 'Invitado', dob: '', tags: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContact(null);
    };

    const handleSave = () => {
        if (!formData.name) return;
        
        const contactToSave = {
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        };

        if (editingContact) {
            updateContact(editingContact.id, contactToSave);
        } else {
            addContact(contactToSave);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Seguro que deseas eliminar este contacto?')) {
            deleteContact(id);
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            'VIP': '#f59e0b',
            'Promotor': '#3b82f6',
            'Staff': '#10b981',
            'Proveedor': '#8b5cf6',
            'Invitado': '#6b7280'
        };
        return colors[role] || 'var(--text-secondary)';
    };

    return (
        <div className="page-container" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <User size={28} color="var(--accent-primary)" /> Directorio de Contactos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                        Gestiona tu base de datos central de clientes VIP, staff, proveedores e invitados. ({contacts?.length || 0} en total)
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                    <Plus size={18} /> Añadir Contacto
                </button>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ padding: '16px', display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, teléfono, email, IG..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '12px 16px 12px 42px', 
                            background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                            borderRadius: '12px', color: 'var(--text-primary)', outline: 'none'
                        }}
                    />
                </div>
                
                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {roles.map(role => (
                        <button 
                            key={role}
                            onClick={() => setFilterRole(role)}
                            style={{
                                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: filterRole === role ? 'var(--accent-primary)' : 'var(--bg-base)',
                                color: filterRole === role ? '#fff' : 'var(--text-secondary)',
                                border: filterRole === role ? 'none' : '1px solid var(--border-subtle)',
                                transition: 'all 0.2s', whiteSpace: 'nowrap'
                            }}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Contacto</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Categoría</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Contacto Info</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Instagram</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Etiquetas</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        No se encontraron contactos.
                                    </td>
                                </tr>
                            ) : filteredContacts.map(contact => (
                                <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-base)' } }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ 
                                                width: '40px', height: '40px', borderRadius: '50%', 
                                                background: `linear-gradient(135deg, ${getRoleColor(contact.role)}30, transparent)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `1px solid ${getRoleColor(contact.role)}50`,
                                                color: getRoleColor(contact.role), fontWeight: 700, fontSize: '16px'
                                            }}>
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{contact.name}</div>
                                                {contact.dob && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                        <Calendar size={10} /> {contact.dob}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                            background: `${getRoleColor(contact.role)}20`, color: getRoleColor(contact.role)
                                        }}>
                                            {contact.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {contact.phone && (
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Phone size={12} /> {contact.phone}
                                                </div>
                                            )}
                                            {contact.email && (
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Mail size={12} /> {contact.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {contact.instagram ? (
                                            <a href={`https://instagram.com/${contact.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#E1306C', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 600 }}>
                                                <Instagram size={14} /> {contact.instagram}
                                            </a>
                                        ) : (
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {(contact.tags || []).slice(0, 3).map((tag, i) => (
                                                <span key={i} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                    {tag}
                                                </span>
                                            ))}
                                            {(contact.tags || []).length > 3 && (
                                                <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-base)', fontSize: '10px', color: 'var(--text-tertiary)' }}>+{contact.tags.length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button className="btn btn-ghost" onClick={() => openModal(contact)} style={{ padding: '6px' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-ghost" onClick={() => handleDelete(contact.id)} style={{ padding: '6px', color: '#ef4444' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', padding: '32px', animation: 'scaleUp 0.2s ease-out' }}>
                        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>{editingContact ? 'Editar Contacto' : 'Añadir Nuevo Contacto'}</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre Completo *</label>
                                <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Juan Pérez" />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Categoría</label>
                                    <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="VIP">VIP</option>
                                        <option value="Promotor">Promotor</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Proveedor">Proveedor</option>
                                        <option value="Invitado">Invitado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Usuario Instagram</label>
                                    <input type="text" className="input" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} placeholder="@usuario" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Teléfono</label>
                                    <input type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+507 6000-0000" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Email</label>
                                    <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" />
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Fecha de Cumpleaños</label>
                                    <input type="date" className="input" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Etiquetas (separadas por coma)</label>
                                    <input type="text" className="input" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="Alta Gasto, Frecuente" />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={!formData.name}>Guardar Contacto</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
