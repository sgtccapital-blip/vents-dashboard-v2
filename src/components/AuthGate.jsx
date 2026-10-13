import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { CurrentUserContext } from '../lib/currentUser';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const LAST_USER_KEY = 'cc-last-user';
const DEFAULT_TEAM = ['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'];

const readLastUser = () => {
    try { return localStorage.getItem(LAST_USER_KEY) || ''; } catch { return ''; }
};

/**
 * Pide quién eres + contraseña antes de montar la app.
 * El servidor guarda la sesión (con el usuario) en una cookie HttpOnly; si alguna petición
 * devuelve 401 (sesión vencida), AppContext dispara `auth:required` y volvemos a esta pantalla.
 */
export default function AuthGate({ children }) {
    const [state, setState] = useState('checking'); // checking | locked | unlocked | unconfigured
    const [session, setSession] = useState({ user: null, team: DEFAULT_TEAM, personalPasswords: [] });
    const [user, setUser] = useState(readLastUser);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE}/auth/session`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                setSession({ user: data.user || null, team: data.team?.length ? data.team : DEFAULT_TEAM, personalPasswords: data.personalPasswords || [] });
                setState(data.authenticated ? 'unlocked' : data.configured === false ? 'unconfigured' : 'locked');
            })
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
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
            try { localStorage.setItem(LAST_USER_KEY, data.user); } catch { /* sin storage */ }
            setPassword('');
            setSession(s => ({ ...s, user: data.user }));
            setState('unlocked');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const ctx = useMemo(() => ({
        user: session.user,
        team: session.team,
        logout: async () => {
            await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
            setSession(s => ({ ...s, user: null }));
            setState('locked');
        },
    }), [session.user, session.team]);

    if (state === 'unlocked') return <CurrentUserContext.Provider value={ctx}>{children}</CurrentUserContext.Provider>;
    if (state === 'checking') return <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0a0a0f)' }} />;

    const hasOwnPassword = session.personalPasswords.includes(user);

    return (
        <div className="auth-gate">
            <form onSubmit={login} className="auth-card">
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
                        <div>
                            <div className="auth-label">¿Quién eres?</div>
                            <div className="auth-team" role="radiogroup" aria-label="Miembro del equipo">
                                {session.team.map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        role="radio"
                                        aria-checked={user === m}
                                        className={`auth-member ${user === m ? 'active' : ''}`}
                                        onClick={() => { setUser(m); setError(''); }}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            className="form-input"
                            type="password"
                            autoComplete="current-password"
                            placeholder={user ? (hasOwnPassword ? `Contraseña de ${user}` : 'Contraseña del equipo') : 'Contraseña'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        {error && <div style={{ fontSize: '12.5px', color: 'var(--accent-red, #f87171)' }}>{error}</div>}
                        <button className="btn btn-primary" type="submit" disabled={submitting || !password || !user}>
                            {submitting ? 'Entrando…' : user ? `Entrar como ${user}` : 'Elige quién eres'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
