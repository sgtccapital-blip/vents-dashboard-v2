import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, CloudLightning, DatabaseZap, CloudOff, RefreshCw, Key, ShieldCheck, Database, Save, HelpCircle, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export default function CloudSyncPanel({ isOpen, onClose }) {
    const { supabaseStatus, manualSync, saveSupabaseConfig } = useApp();
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState(null);

    // Initialize inputs when state changes
    useEffect(() => {
        if (supabaseStatus) {
            setDbUrl(supabaseStatus.url || '');
            setDbKey('');
        }
    }, [supabaseStatus, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveResult(null);
        try {
            const res = await saveSupabaseConfig(dbUrl, dbKey);
            if (res.success) {
                setSaveResult({ success: true, message: 'Configuración guardada correctamente.' });
                setDbKey(''); // Reset key input
            } else {
                setSaveResult({ success: false, message: res.error || 'Error al guardar.' });
            }
        } catch (err) {
            setSaveResult({ success: false, message: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async (action) => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await manualSync(action);
            if (res.success) {
                setSyncResult({ 
                    success: true, 
                    message: `Sincronización finalizada: ${res.inserted || 0} insertados, ${res.updated || 0} actualizados, ${res.deleted || 0} eliminados.` 
                });
            } else {
                setSyncResult({ success: false, message: res.error || 'Error durante la sincronización.' });
            }
        } catch (err) {
            setSyncResult({ success: false, message: err.message });
        } finally {
            setSyncing(false);
        }
    };

    // Determine status badge/indicators
    let statusText = 'Desconectado';
    let statusDesc = 'El dashboard está funcionando en modo local offline (Local Storage & API local).';
    let statusClass = 'status-disconnected';
    let statusIcon = <CloudOff size={24} className="text-muted" style={{ color: 'var(--text-tertiary)' }} />;

    if (supabaseStatus?.status === 'connected') {
        statusText = 'Conectado a la Nube';
        statusDesc = 'Las credenciales son correctas y las tablas de la base de datos están listas para sincronizar.';
        statusClass = 'status-connected';
        statusIcon = <ShieldCheck size={24} style={{ color: 'var(--accent-green)' }} />;
    } else if (supabaseStatus?.status === 'connected_missing_table') {
        statusText = 'Falta Tabla';
        statusDesc = 'Conectado a Supabase pero la tabla "dashboard_state" no existe. Presiona "Inicializar Base de Datos" abajo.';
        statusClass = 'status-warning';
        statusIcon = <AlertTriangle size={24} style={{ color: 'var(--accent-orange)' }} />;
    } else if (supabaseStatus?.status === 'unauthorized' || supabaseStatus?.status === 'error') {
        statusText = 'Error de Conexión';
        statusDesc = `Credenciales incorrectas o problema de red: ${supabaseStatus.error || ''}`;
        statusClass = 'status-error';
        statusIcon = <AlertCircle size={24} style={{ color: 'var(--accent-red)' }} />;
    }

    return (
        <>
            {/* Backdrop */}
            <div 
                className="cloud-sync-backdrop" 
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0, right: 0, bottom: 0, left: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease'
                }}
            />

            {/* Sidebar Slide-over */}
            <div 
                className="cloud-sync-panel slide-over-card"
                style={{
                    position: 'fixed',
                    top: 0, right: 0, bottom: 0,
                    width: '100%',
                    maxWidth: '450px',
                    background: 'var(--bg-card-glass)',
                    backdropFilter: 'blur(20px)',
                    borderLeft: '1px solid var(--border-subtle)',
                    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DatabaseZap size={20} style={{ color: 'var(--accent-primary)' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Nube & Sincronización</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px',
                            borderRadius: '50%', transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="custom-scrollbar">
                    
                    {/* Real-time Status Card */}
                    <div className={`status-display-card ${statusClass}`} style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        marginBottom: '24px',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start'
                    }}>
                        <div style={{ marginTop: '2px' }}>{statusIcon}</div>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {statusText}
                            </h4>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {statusDesc}
                            </p>
                        </div>
                    </div>

                    {/* Sync Actions */}
                    {supabaseStatus?.configured && (
                        <div style={{ marginBottom: '28px' }}>
                            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '12px', fontWeight: 600 }}>
                                Sincronización de Datos
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => handleSync('push')}
                                    disabled={syncing}
                                    className="btn-sync-action btn-push"
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                        padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--text-primary)',
                                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
                                    }}
                                >
                                    <CloudLightning size={20} style={{ color: '#3b82f6' }} />
                                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Subir a la Nube</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Sobrescribe la nube</div>
                                </button>

                                <button
                                    onClick={() => handleSync('pull')}
                                    disabled={syncing}
                                    className="btn-sync-action btn-pull"
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                        padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--text-primary)',
                                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
                                    }}
                                >
                                    <RefreshCw size={20} style={{ color: 'var(--accent-green)' }} className={syncing ? 'spin' : ''} />
                                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Bajar al Local</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Sobrescribe el local</div>
                                </button>
                            </div>

                            {supabaseStatus?.status === 'connected_missing_table' && (
                                <button
                                    onClick={() => handleSync('init')}
                                    disabled={syncing}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        background: 'var(--accent-orange)', color: '#000', fontWeight: 600,
                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px', fontSize: '12px', marginBottom: '12px'
                                    }}
                                >
                                    <Database size={14} />
                                    Inicializar Base de Datos (Crear Tabla)
                                </button>
                            )}

                            {syncResult && (
                                <div style={{
                                    padding: '10px 12px', borderRadius: '8px',
                                    background: syncResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                    border: `1px solid ${syncResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start'
                                }}>
                                    {syncResult.success ? <CheckCircle2 size={14} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '1px' }} />}
                                    <span>{syncResult.message}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Supabase Configuration Form */}
                    <div>
                        <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '12px', fontWeight: 600 }}>
                            Credenciales Supabase
                        </h3>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div className="input-group">
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                                    SUPABASE URL
                                </label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://xxxxxx.supabase.co"
                                    value={dbUrl}
                                    onChange={(e) => setDbUrl(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)', fontSize: '12px', outline: 'none'
                                    }}
                                />
                            </div>

                            <div className="input-group">
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                                    SUPABASE SERVICE ROLE KEY (o Anon Key)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="password"
                                        placeholder={supabaseStatus?.configured ? '•••••••••••••••••••••••••••••• (Configurado)' : 'Introducir Supabase API key'}
                                        value={dbKey}
                                        onChange={(e) => setDbKey(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-primary)', fontSize: '12px', outline: 'none'
                                        }}
                                    />
                                    <Key size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-tertiary)' }} />
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                                    Nota: El Service Role Key se recomienda para sincronizaciones bidireccionales automáticas completas.
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    background: 'var(--accent-primary)', color: '#000', fontWeight: 600,
                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '8px', fontSize: '12px', marginTop: '6px'
                                }}
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Credenciales'}
                            </button>

                            {saveResult && (
                                <div style={{
                                    padding: '10px 12px', borderRadius: '8px',
                                    background: saveResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                    border: `1px solid ${saveResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start'
                                }}>
                                    {saveResult.success ? <CheckCircle2 size={14} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '1px' }} />}
                                    <span>{saveResult.message}</span>
                                </div>
                            )}
                        </form>
                    </div>

                </div>

                {/* Footer Info */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <HelpCircle size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                        Tu base de datos Supabase actúa como un espejo seguro en la nube. Al sincronizar se consolidan tus Eventos, Tareas, Bloc de Notas y Checklist.
                    </span>
                </div>
            </div>
        </>
    );
}
