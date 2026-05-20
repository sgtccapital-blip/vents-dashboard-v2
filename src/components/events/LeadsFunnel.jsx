import React, { useState } from 'react';
import { Users, UserCheck, PartyPopper, Phone, MessageCircle, MoreVertical, Star, Ticket, Plus } from 'lucide-react';

export default function LeadsFunnel({ leads = [], updateLeadStatus, onManageLeads, onManageGirls }) {
    const statuses = ['Contactado', 'Respondió', 'Confirmado', 'No llegó', 'Llegó'];

    // Funnel Calculations
    const ticketsTotales = leads.filter(l => l.interest && (l.interest.toLowerCase().includes('ticket') || l.interest.toLowerCase().includes('general') || l.interest.toLowerCase().includes('mesa'))).length;
    const promotoresCount = new Set(leads.map(l => l.promoter).filter(Boolean)).size;
    const listaCount = leads.length;

    const estimatedRevenue = ticketsTotales * 25; // Estimación base $25 por ticket

    const promoterStats = leads.reduce((acc, lead) => {
        if (!lead.promoter) return acc;
        if (!acc[lead.promoter]) acc[lead.promoter] = 0;
        acc[lead.promoter]++;
        return acc;
    }, {});
    const topPromoter = Object.keys(promoterStats).sort((a, b) => promoterStats[b] - promoterStats[a])[0];

    return (
        <div className="glass-panel" style={{ padding: '24px', animation: 'slideUp 0.3s ease-out' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '18px' }}>
                <PartyPopper size={20} className="text-primary" /> Funnel Automático
            </h3>

            {/* Funnel Visual */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '50%', marginBottom: '12px' }}>
                        <Ticket size={24} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>{ticketsTotales}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Tickets totales</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '50%', marginBottom: '12px' }}>
                        <Users size={24} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>{promotoresCount}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Promotores</div>

                </div>

                <div 
                    style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={onManageLeads}
                    className="hover-card"
                >
                    <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '50%', marginBottom: '12px' }}>
                        <UserCheck size={24} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>{listaCount}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Invitados (Lista)</div>
                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#10b981', fontWeight: '500' }}>Administrar →</div>
                </div>

                <div 
                    style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={onManageGirls}
                    className="hover-card"
                >
                    <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '50%', marginBottom: '12px' }}>
                        <Star size={24} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>Chicas</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Modelos / Hostess</div>
                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#ec4899', fontWeight: '500' }}>Administrar →</div>
                </div>

            </div>
        </div>
    );
}
