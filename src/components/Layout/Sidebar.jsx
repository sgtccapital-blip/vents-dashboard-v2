import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FolderKanban, Brain, Server,
    Lightbulb, User, ChevronLeft, ChevronRight, Zap, Share2, BrainCircuit, Sparkles, BookOpen, MessageSquare, Building2, DatabaseZap, LayoutTemplate, Network, MessageCircle, Monitor, Cpu, CalendarDays, Calendar
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Command Center', section: 'OPERATIONS' },
    { path: '/workspace', icon: LayoutTemplate, label: 'Workspace', section: 'OPERATIONS' },
    { path: '/calendar', icon: Calendar, label: 'Master Calendar', section: 'OPERATIONS' },
    { path: '/eventos', icon: CalendarDays, label: 'Eventos', section: 'OPERATIONS' },
    { path: '/social', icon: Share2, label: 'Redes Sociales', section: 'OPERATIONS' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
    const location = useLocation();

    // Group items by section
    const sections = {};
    navItems.forEach(item => {
        if (!sections[item.section]) sections[item.section] = [];
        sections[item.section].push(item);
    });

    return (
        <>
        {/* Mobile Overlay */}
        {mobileOpen && (
            <div 
                className="sidebar-overlay" 
                onClick={onMobileClose}
            />
        )}
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Zap size={18} />
                </div>
                <span className="sidebar-title">Command Center</span>
            </div>

            <nav className="sidebar-nav">
                {Object.entries(sections).map(([section, items]) => (
                    <div key={section} className="nav-section">
                        <div className="nav-section-label">{section}</div>
                        {items.map(item => (
                            item.isIndependent ? (
                                <div
                                    key={item.id || item.label}
                                    id={item.id}
                                    className="nav-item"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <item.icon size={20} className="nav-item-icon" />
                                    <span className="nav-item-text">{item.label}</span>
                                </div>
                            ) : (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={onMobileClose}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active' : ''}`
                                    }
                                    end={item.path === '/'}
                                >
                                    <item.icon size={20} className="nav-item-icon" />
                                    <span className="nav-item-text">{item.label}</span>
                                </NavLink>
                            )
                        ))}
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer">
                <button className="sidebar-toggle desktop-only" onClick={onToggle}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
        </>
    );
}
