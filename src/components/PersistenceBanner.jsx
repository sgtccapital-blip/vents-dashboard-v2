import { useState } from 'react';
import { AlertTriangle, Download, CloudLightning, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Aviso visible cuando los datos NO están a salvo (Render sin Supabase, conflicto o error de sync).
export default function PersistenceBanner({ onOpenCloudSync }) {
    const { supabaseStatus } = useApp();
    const [dismissed, setDismissed] = useState(() => {
        try { return sessionStorage.getItem('persistence-banner-dismissed') === '1'; } catch { return false; }
    });

    const status = supabaseStatus?.status;
    let message = null;
    if (supabaseStatus?.ephemeralStorage && status === 'unconfigured') {
        message = 'Tus datos se borran en el próximo deploy o reinicio del servidor: conecta Supabase para guardarlos en la nube.';
    } else if (status === 'conflict') {
        message = 'La copia en la nube cambió desde otro lugar y no se está sincronizando. Revisa Cloud Sync.';
    } else if (status === 'connected_missing_table') {
        message = 'Supabase está conectado pero falta la tabla command_center_state: los cambios no se guardan en la nube.';
    } else if (status === 'unauthorized' || status === 'error') {
        message = 'No se pudo sincronizar con Supabase. Tus cambios recientes solo están en el servidor.';
    }
    if (!message || dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        try { sessionStorage.setItem('persistence-banner-dismissed', '1'); } catch { /* sin storage */ }
    };

    return (
        <div className="persistence-banner" role="alert">
            <AlertTriangle size={18} className="persistence-banner-icon" />
            <span className="persistence-banner-text">{message}</span>
            <div className="persistence-banner-actions">
                <button type="button" className="btn btn-primary" onClick={onOpenCloudSync}>
                    <CloudLightning size={14} /> Configurar
                </button>
                <a className="btn btn-ghost" href="/api/backup" download>
                    <Download size={14} /> Respaldo
                </a>
                <button type="button" className="btn btn-ghost persistence-banner-close" onClick={dismiss} aria-label="Ocultar aviso">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
