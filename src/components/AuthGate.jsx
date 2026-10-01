import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Pide la contraseña del dashboard antes de montar la app.
 * El servidor guarda la sesión en una cookie HttpOnly; si alguna petición devuelve 401
 * (sesión vencida), AppContext dispara `auth:required` y volvemos a esta pantalla.
 */
export default function AuthGate({ children }) {
    const [state, setState] = useState('checking'); // checking | locked | unlocked | unconfigured
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE}/auth/session`)
            .then(r => r.json())
            .then(data => setState(data.authenticated ? 'unlocked' : data.configured === false ? 'unconfigured' : 'locked'))
            .catch(() => setState('locked'));

        const onAuthRequired = () => setState('locked');
        window.addEventListener('auth:required', onAuthRequired);
        return () => window.removeEventListener('auth:required', onAuthRequired);
    }, []);

    const login = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
            setPassword('');
            setState('unlocked');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (state === 'unlocked') return children;
    if (state === 'checking') return <div style={{ minHeight: '100vh', background: 'var(--bg-base, #0b0b10)' }} />;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg-base, #0b0b10)', color: 'var(--text-primary, #fff)' }}>
            <form onSubmit={login} style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '28px', borderRadius: '16px', background: 'var(--bg-surface, #15151d)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={18} />
                    <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Command Center</h1>
                </div>
                {state === 'unconfigured' ? (
                    <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary, #aaa)', margin: 0 }}>
                        El servidor no tiene contraseña configurada. Define <code>DASHBOARD_PASSWORD</code> en el archivo .env (o en las variables de Render) y reinicia el servidor.
                    </p>
                ) : (
                    <>
                        <input
                            className="form-input"
                            type="password"
                            autoFocus
                            autoComplete="current-password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        {error && <div style={{ fontSize: '12.5px', color: 'var(--accent-red, #f87171)' }}>{error}</div>}
                        <button className="btn btn-primary" type="submit" disabled={submitting || !password}>
                            {submitting ? 'Entrando…' : 'Entrar'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
