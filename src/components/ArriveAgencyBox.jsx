import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, ArrowRight, ExternalLink, Calendar,
    Users, Film, GlassWater, Flame, Compass, ChevronRight,
    CheckCircle2, Share2, Layers, Briefcase
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './ArriveAgency.css';

export default function ArriveAgencyBox({ onFilterCategory }) {
    const navigate = useNavigate();
    const { events, imageGirls, socialMedia, tasks } = useApp();

    // Calculate real-time agency metrics
    const totalTalent = imageGirls?.length || 8;
    const weeklyEvents = (events || []).filter(e => 
        ['ev-terraplen-rooftop', 'ev-furia-panama', 'ev-piano-bar'].includes(e.id) ||
        (e.name && (e.name.includes('Terraplen') || e.name.includes('Furia') || e.name.includes('Piano Bar')))
    );
    const activeVenuesCount = weeklyEvents.length > 0 ? weeklyEvents.length : 3;

    // Count tasks related to arrive / dinners / posts
    const dinnerTasks = (tasks || []).filter(t => 
        !t.done && (t.division === 'models' || t.tag === '#CenaChicas' || (t.text && t.text.toLowerCase().includes('cena')))
    ).length;

    const contentTasksCount = (tasks || []).filter(t => 
        !t.done && (t.division === 'services' || t.tag === '#SocialMedia' || t.tag === '#Reels' || (t.text && t.text.toLowerCase().includes('post') || t.text?.toLowerCase().includes('reel')))
    ).length;

    return (
        <div className="arrive-hub-card animate-in">
            {/* Topbar Branding */}
            <div className="arrive-hub-topbar">
                <div className="arrive-brand-header">
                    <div className="arrive-logo-badge">
                        <span>A</span>
                    </div>
                    <div className="arrive-brand-text">
                        <h2>
                            ARRIVE <span className="gold-highlight">AGENCY</span>
                        </h2>
                        <div className="arrive-motto">
                            Creative, Talent & Experiences — <span>We create. We connect. We grow.</span>
                        </div>
                    </div>
                </div>

                <div className="arrive-hub-badges">
                    <span className="arrive-pill arrive-pill-gold">
                        <Sparkles size={11} /> AGENCIA PRINCIPAL
                    </span>
                    <span className="arrive-pill arrive-pill-live">
                        <span className="dot-pulse"></span> PANAMÁ HQ
                    </span>
                    <a 
                        href="https://arriveservices.com" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="arrive-pill" 
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', textDecoration: 'none' }}
                        title="Ver web oficial arriveservices.com"
                    >
                        <ExternalLink size={11} /> arriveservices.com
                    </a>
                </div>
            </div>

            {/* Metrics Strip */}
            <div className="arrive-metrics-strip">
                <div className="arrive-metric-item">
                    <div className="arrive-metric-label">
                        <GlassWater size={12} style={{ color: '#fbbf24' }} /> Cenas Chicas
                    </div>
                    <div className="arrive-metric-val">
                        {totalTalent} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>invitadas</span>
                    </div>
                </div>

                <div className="arrive-metric-item">
                    <div className="arrive-metric-label">
                        <Film size={12} style={{ color: '#60a5fa' }} /> Posts & Producción
                    </div>
                    <div className="arrive-metric-val">
                        {contentTasksCount || 5} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>en pipeline</span>
                    </div>
                </div>

                <div className="arrive-metric-item">
                    <div className="arrive-metric-label">
                        <Flame size={12} style={{ color: '#c084fc' }} /> Venues Semanales
                    </div>
                    <div className="arrive-metric-val">
                        {activeVenuesCount} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Terraplén · Furia · Piano</span>
                    </div>
                </div>

                <div className="arrive-metric-item">
                    <div className="arrive-metric-label">
                        <Users size={12} style={{ color: '#f472b6' }} /> Roster Modelos
                    </div>
                    <div className="arrive-metric-val">
                        {totalTalent} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>perfiles</span>
                    </div>
                </div>
            </div>

            {/* The 3 Divisions + Studio Grid */}
            <div className="arrive-divisions-grid">
                {/* 01 ARRIVE SERVICES */}
                <div 
                    className="arrive-division-card"
                    onClick={() => navigate('/arrive?tab=structure')}
                >
                    <div className="arrive-card-head">
                        <span className="arrive-card-num card-num-services">01 / CREATIVE</span>
                        <div className="arrive-card-icon" style={{ color: '#60a5fa' }}>
                            <Briefcase size={16} />
                        </div>
                    </div>
                    <div>
                        <h3 className="arrive-card-title">ARRIVE SERVICES</h3>
                        <p className="arrive-card-sub">Social media, branding, webs y campañas que escalan proyectos y marcas.</p>
                    </div>
                    <div className="arrive-card-tags">
                        <span className="arrive-card-tag">Social Media</span>
                        <span className="arrive-card-tag">Branding</span>
                        <span className="arrive-card-tag">Web & Apps</span>
                        <span className="arrive-card-tag">Growth</span>
                    </div>
                </div>

                {/* 02 ARRIVE MODELS */}
                <div 
                    className="arrive-division-card"
                    onClick={() => navigate('/arrive?tab=dinners')}
                >
                    <div className="arrive-card-head">
                        <span className="arrive-card-num card-num-models">02 / TALENTO</span>
                        <div className="arrive-card-icon" style={{ color: '#f472b6' }}>
                            <Users size={16} />
                        </div>
                    </div>
                    <div>
                        <h3 className="arrive-card-title">ARRIVE MODELS</h3>
                        <p className="arrive-card-sub">Modelos, hostesses, UGC creators y convocatorias semanales de cenas para chicas.</p>
                    </div>
                    <div className="arrive-card-tags">
                        <span className="arrive-card-tag" style={{ color: '#f472b6', background: 'rgba(236,72,153,0.1)' }}>🍸 Cenas Chicas</span>
                        <span className="arrive-card-tag">Hostesses</span>
                        <span className="arrive-card-tag">UGC Creators</span>
                    </div>
                </div>

                {/* 03 ARRIVE NIGHTLIFE */}
                <div 
                    className="arrive-division-card"
                    onClick={() => navigate('/arrive?tab=nightlife')}
                >
                    <div className="arrive-card-head">
                        <span className="arrive-card-num card-num-nightlife">03 / NIGHTLIFE</span>
                        <div className="arrive-card-icon" style={{ color: '#c084fc' }}>
                            <Flame size={16} />
                        </div>
                    </div>
                    <div>
                        <h3 className="arrive-card-title">ARRIVE NIGHTLIFE</h3>
                        <p className="arrive-card-sub">Eventos semanales, hospitalidad VIP y conexión de marcas con los mejores venues de Panamá.</p>
                    </div>
                    <div className="arrive-card-tags">
                        <span className="arrive-card-tag">Terraplén</span>
                        <span className="arrive-card-tag">Furia</span>
                        <span className="arrive-card-tag">Piano Bar</span>
                        <span className="arrive-card-tag">Mesas VIP</span>
                    </div>
                </div>

                {/* ARRIVE STUDIO */}
                <div 
                    className="arrive-division-card"
                    onClick={() => navigate('/arrive?tab=posts')}
                >
                    <div className="arrive-card-head">
                        <span className="arrive-card-num card-num-studio">STUDIO</span>
                        <div className="arrive-card-icon" style={{ color: '#2dd4bf' }}>
                            <Film size={16} />
                        </div>
                    </div>
                    <div>
                        <h3 className="arrive-card-title">ARRIVE STUDIO</h3>
                        <p className="arrive-card-sub">Content Day y producciones fotográficas y de video mensual para marcas y talento.</p>
                    </div>
                    <div className="arrive-card-tags">
                        <span className="arrive-card-tag">Content Day</span>
                        <span className="arrive-card-tag">Studio Sessions</span>
                        <span className="arrive-card-tag">Reels 4K</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="arrive-hub-actions">
                <button 
                    className="btn-arrive-gold"
                    onClick={() => navigate('/arrive')}
                >
                    <Layers size={14} />
                    <span>GESTIONAR ESTRUCTURA ARRIVE OS</span>
                    <ArrowRight size={14} />
                </button>

                <button 
                    className="btn-arrive-ghost"
                    onClick={() => navigate('/arrive?tab=dinners')}
                >
                    <GlassWater size={14} style={{ color: '#fbbf24' }} />
                    <span>Convocatorias Cenas Chicas</span>
                </button>

                <button 
                    className="btn-arrive-ghost"
                    onClick={() => navigate('/arrive?tab=posts')}
                >
                    <Film size={14} style={{ color: '#60a5fa' }} />
                    <span>Posts de Proyectos</span>
                </button>

                <button 
                    className="btn-arrive-ghost"
                    onClick={() => navigate('/arrive?tab=nightlife')}
                >
                    <Calendar size={14} style={{ color: '#c084fc' }} />
                    <span>Eventos Semanales</span>
                </button>
            </div>
        </div>
    );
}
