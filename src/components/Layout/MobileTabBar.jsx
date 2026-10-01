import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, CalendarCheck, ListChecks, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { taskStats } from '../../lib/status';

// Barra inferior solo para móvil: las 4 pantallas que más se usan en producción + menú completo.
const TABS = [
    { to: '/', label: 'Inicio', icon: Home, end: true },
    { to: '/eventos', label: 'Eventos', icon: CalendarCheck },
    { to: '/workspace', label: 'Tareas', icon: ListChecks, badge: 'pending' },
    { to: '/calendar', label: 'Calendario', icon: CalendarDays },
];

export default function MobileTabBar({ onMenu }) {
    const { tasks } = useApp();
    const pending = taskStats(tasks).pending;

    return (
        <nav className="mobile-tabbar" aria-label="Navegación principal">
            {TABS.map(tab => (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
                >
                    <span className="mobile-tab-icon">
                        <tab.icon size={22} />
                        {tab.badge === 'pending' && pending > 0 && <span className="mobile-tab-badge">{pending > 99 ? '99+' : pending}</span>}
                    </span>
                    <span className="mobile-tab-label">{tab.label}</span>
                </NavLink>
            ))}
            <button type="button" className="mobile-tab" onClick={onMenu}>
                <span className="mobile-tab-icon"><Menu size={22} /></span>
                <span className="mobile-tab-label">Más</span>
            </button>
        </nav>
    );
}
