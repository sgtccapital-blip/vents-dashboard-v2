import { useState, useEffect } from 'react';
import { Plus, FileText, Search, Clock, Trash2, Tag, Book, Star, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function EventNotepad() {
    const { notes, addNote, updateNote, deleteNote, addActivity } = useApp();
    const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditorOnMobile, setShowEditorOnMobile] = useState(false);

    const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

    // Auto-select first note if current selection is deleted
    useEffect(() => {
        if (selectedNoteId && !notes.find(n => n.id === selectedNoteId)) {
            setSelectedNoteId(notes[0]?.id || null);
            setShowEditorOnMobile(false);
        }
    }, [notes, selectedNoteId]);

    const filteredNotes = notes.filter(n => {
        const title = n.title || n.text || '';
        const content = n.content || '';
        const q = searchQuery.toLowerCase();
        return title.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    });

    const handleCreateNote = () => {
        const newNote = {
            id: `note-${Date.now()}`,
            title: '',
            content: '',
            text: '',
            category: 'General',
            date: new Date().toISOString().split('T')[0],
            important: false
        };
        addNote(newNote);
        setSelectedNoteId(newNote.id);
        setShowEditorOnMobile(true);
        addActivity('📝 Created new note', 'var(--accent-yellow)', 'global');
    };

    const handleUpdateNote = (id, field, value) => {
        const payload = { [field]: value };
        // Keep text field in sync with title for quick notes sidebar display
        if (field === 'title') {
            payload.text = value;
        }
        updateNote(id, payload);
    };

    const handleDeleteNote = (id) => {
        deleteNote(id);
        addActivity('🗑️ Deleted note', 'var(--accent-red)', 'global');
        if (selectedNoteId === id) {
            const remaining = notes.filter(n => n.id !== id);
            setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
            setShowEditorOnMobile(false);
        }
    };

    const toggleImportant = (id) => {
        const note = notes.find(n => n.id === id);
        if (note) {
            updateNote(id, { important: !note.important });
        }
    };

    return (
        <div className="notepad-container" style={{ display: 'flex', height: '100%', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            
            {/* Sidebar (Note List) */}
            <div className={`notepad-sidebar ${showEditorOnMobile ? 'mobile-hidden' : ''}`} style={{ width: '320px', background: 'rgba(30,30,40,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
                
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Book size={20} style={{ color: 'var(--accent-primary)' }} />
                            Notepad
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 400 }}>({notes.length})</span>
                        </h2>
                        <button className="btn-icon" onClick={handleCreateNote} title="New Note" style={{ background: 'var(--accent-primary)', color: '#fff' }}>
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="search-bar" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <Search size={14} className="search-icon" />
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search notes..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ fontSize: '13px' }}
                        />
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {filteredNotes.map(note => {
                        const displayTitle = note.title || note.text || 'Untitled Note';
                        return (
                            <div 
                                key={note.id}
                                onClick={() => { setSelectedNoteId(note.id); setShowEditorOnMobile(true); }}
                                style={{
                                    padding: '16px 16px 16px 20px',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '4px',
                                    background: selectedNoteId === note.id ? 'var(--bg-card)' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    boxShadow: selectedNoteId === note.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedNoteId !== note.id) Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.03)' });
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedNoteId !== note.id) Object.assign(e.currentTarget.style, { background: 'transparent' });
                                }}
                            >
                                {selectedNoteId === note.id && (
                                    <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', background: 'var(--accent-primary)', borderRadius: '0 4px 4px 0' }} />
                                )}
                                <div style={{ fontSize: '15px', fontWeight: 600, color: selectedNoteId === note.id ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displayTitle}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {note.date}</span>
                                    {note.category && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={12} /> {note.category}</span>}
                                </div>
                                {note.important && (
                                    <Star size={12} style={{ position: 'absolute', top: '16px', right: '16px', color: '#eab308' }} fill="#eab308" />
                                )}
                            </div>
                        );
                    })}
                    {filteredNotes.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                            <FileText size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <br />
                            {notes.length === 0 ? 'No notes yet. Create one!' : 'No notes match your search.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Note Editor Area */}
            <div className={`notepad-editor ${!showEditorOnMobile ? 'mobile-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
                {selectedNote ? (
                    <>
                        <div className="notepad-editor-header" style={{ padding: '32px 48px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* Mobile Back Button */}
                                <button className="btn-icon mobile-only-btn" onClick={() => setShowEditorOnMobile(false)} style={{ display: 'none', marginRight: '8px', color: 'var(--text-secondary)' }}>
                                    <ChevronLeft size={20} />
                                </button>

                                <span className="tag" style={{ background: 'var(--bg-card)' }}>
                                    <Tag size={12} style={{ marginRight: '4px' }}/> 
                                    <input 
                                        value={selectedNote.category || ''}
                                        onChange={(e) => handleUpdateNote(selectedNote.id, 'category', e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', outline: 'none', width: '80px', fontSize: '11px' }}
                                    />
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-icon" onClick={() => toggleImportant(selectedNote.id)} style={{ color: selectedNote.important ? '#eab308' : 'var(--text-tertiary)' }}>
                                    <Star size={18} fill={selectedNote.important ? '#eab308' : 'none'} />
                                </button>
                                <button className="btn-icon" onClick={() => handleDeleteNote(selectedNote.id)} style={{ color: 'var(--accent-red)' }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="notepad-editor-body" style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <input
                                    type="text"
                                    placeholder="Note Title"
                                    value={selectedNote.title || ''}
                                    onChange={(e) => handleUpdateNote(selectedNote.id, 'title', e.target.value)}
                                    className="notepad-title-input"
                                    style={{
                                        width: '100%',
                                        fontSize: '42px',
                                        fontWeight: 800,
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        marginBottom: '24px',
                                        letterSpacing: '-1px'
                                    }}
                                />
                                <textarea
                                    placeholder="Start typing your ideas..."
                                    value={selectedNote.content || ''}
                                    onChange={(e) => handleUpdateNote(selectedNote.id, 'content', e.target.value)}
                                    className="notepad-content-input"
                                    style={{
                                        width: '100%',
                                        minHeight: '400px',
                                        fontSize: '16px',
                                        lineHeight: '1.8',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        outline: 'none',
                                        resize: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexDirection: 'column' }}>
                        <Book size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>Select a note or create a new one</p>
                    </div>
                )}
            </div>
        </div>
    );
}
