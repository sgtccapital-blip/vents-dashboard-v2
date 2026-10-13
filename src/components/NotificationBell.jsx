import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const urlBase64ToUint8Array = (base64) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

/**
 * 🔔 Activa/desactiva las notificaciones push en este dispositivo.
 * En iPhone solo funcionan con la app añadida a la pantalla de inicio (iOS 16.4+).
 */
export default function NotificationBell() {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const [state, setState] = useState(supported ? 'checking' : 'unsupported'); // checking | off | on | denied | unsupported | busy

    useEffect(() => {
        if (!supported) return;
        navigator.serviceWorker.ready
            .then(reg => reg.pushManager.getSubscription())
            .then(sub => setState(Notification.permission === 'denied' ? 'denied' : sub ? 'on' : 'off'))
            .catch(() => setState('off'));
    }, [supported]);

    const enable = async () => {
        if (isIOS() && !isStandalone()) {
            window.alert('En iPhone las notificaciones funcionan con la app instalada: toca Compartir → "Añadir a pantalla de inicio", abre la app desde el ícono y activa la campana ahí.');
            return;
        }
        setState('busy');
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'off'); return; }
            const { publicKey } = await fetch(`${API_BASE}/push/public-key`, { credentials: 'include' }).then(r => r.json());
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
            const res = await fetch(`${API_BASE}/push/subscribe`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: subscription.toJSON() }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudo registrar');
            await fetch(`${API_BASE}/push/test`, { method: 'POST', credentials: 'include' });
            setState('on');
        } catch (err) {
            window.alert(`No se pudieron activar las notificaciones: ${err.message}`);
            setState('off');
        }
    };

    const disable = async () => {
        if (!window.confirm('¿Desactivar las notificaciones en este dispositivo?')) return;
        setState('busy');
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch(`${API_BASE}/push/unsubscribe`, {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
        } finally {
            setState('off');
        }
    };

    if (state === 'unsupported' || state === 'checking') return null;

    const titles = {
        on: 'Notificaciones activas en este dispositivo (toca para desactivar)',
        off: 'Activar notificaciones: resumen de la mañana, tareas asignadas y eventos de mañana',
        denied: 'Bloqueaste las notificaciones: actívalas en los ajustes del navegador para este sitio',
        busy: 'Un momento…',
    };
    const Icon = state === 'on' ? BellRing : state === 'denied' ? BellOff : Bell;

    return (
        <button
            type="button"
            className={`topbar-bell ${state}`}
            title={titles[state]}
            aria-label={titles[state]}
            disabled={state === 'busy'}
            onClick={() => {
                if (state === 'on') disable();
                else if (state === 'denied') window.alert(titles.denied);
                else enable();
            }}
        >
            <Icon size={16} />
        </button>
    );
}
