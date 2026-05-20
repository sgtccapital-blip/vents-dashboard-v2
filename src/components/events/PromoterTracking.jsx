import React from 'react';
import { Users, TrendingUp, Award, UserPlus } from 'lucide-react';

export default function PromoterTracking({ promoters = [], leads = [], assignedPromoterIds = [] }) {
    
    // Calculate stats for each assigned promoter based on leads
    const trackingData = assignedPromoterIds.map(promoterId => {
        const promoterInfo = promoters.find(p => p.id === promoterId) || { name: 'Desconocido', style: 'N/A' };
        const promoterLeads = leads.filter(l => l.promoter === promoterId);
        
        const generated = promoterLeads.length;
        const confirmed = promoterLeads.filter(l => ['Confirmado', 'Llegó', 'No llegó'].includes(l.status)).length;
        const attended = promoterLeads.filter(l => l.status === 'Llegó').length;
        
        const conversion = generated > 0 ? Math.round((attended / generated) * 100) : 0;
        
        return {
            id: promoterId,
            name: promoterInfo.name,
            style: promoterInfo.style,
            generated,
            confirmed,
            attended,
            conversion
        };
    }).sort((a, b) => b.attended - a.attended); // Sort by highest attendance

    return (
        <div className="glass-panel" style={{ padding: '24px', animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                    <TrendingUp size={20} className="text-primary" /> Tracking de Promotores
                </h3>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <UserPlus size={14} /> Asignar
                </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px', fontWeight: '500' }}>Promotor</th>
                            <th style={{ padding: '12px 8px', fontWeight: '500' }}>Estilo</th>
                            <th style={{ padding: '12px 8px', fontWeight: '500', textAlign: 'center' }}>Leads</th>
                            <th style={{ padding: '12px 8px', fontWeight: '500', textAlign: 'center' }}>Confirmados</th>
                            <th style={{ padding: '12px 8px', fontWeight: '500', textAlign: 'center' }}>Llegaron</th>
                            <th style={{ padding: '12px 8px', fontWeight: '500', textAlign: 'right' }}>Conversión</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trackingData.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay promotores asignados a este evento</td>
                            </tr>
                        ) : trackingData.map((data, idx) => (
                            <tr key={data.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px 8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {idx === 0 && data.attended > 0 ? <Award size={14} className="text-primary" /> : <Users size={14} className="text-secondary" />}
                                        <span style={{ fontWeight: idx === 0 && data.attended > 0 ? '600' : '400', color: idx === 0 && data.attended > 0 ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                                            {data.name}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{data.style}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>{data.generated}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'center', color: '#8b5cf6' }}>{data.confirmed}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>{data.attended}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '12px' }}>
                                        {data.conversion}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
