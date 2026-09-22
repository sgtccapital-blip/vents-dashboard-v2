/**
 * WhatsAppAgentService — Conector y Utilidades para el Agente de Difusión Semanal & WhatsApp
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const CAMPAIGN_TONES = [
    { id: 'nightlife_vip', label: '🔥 Nightlife & Fiesta VIP', desc: 'Enérgico, emojis de fiesta, llamadas a la acción directas para mesas y accesos.' },
    { id: 'exclusive_hospitality', label: '🍾 Exclusivo & Sofisticado', desc: 'Atención personalizada, hospitalidad premium, tono VIP para clientes high-ticket.' },
    { id: 'casual_friendly', label: '✨ Casual & Cercano', desc: 'Amigable, natural, enfocado en comunidad, música y planes de fin de semana.' },
    { id: 'urgent_fomo', label: '🚨 Urgente / Sold Out Alert', desc: 'Sensación de urgencia, últimos cupos, listas cerrando y aforo limitado.' },
    { id: 'cultural_family', label: '🚶‍♂️ Cultural & Casco Peatonal', desc: 'Familiar, artístico, enfocado en plazas, shows al aire libre y gastronomía.' }
];

export const AUDIENCE_TAGS = [
    { id: 'all', label: 'Todos los Contactos' },
    { id: 'VIP', label: '👑 Clientes VIP' },
    { id: 'Promotor', label: '⚡ Promotores & RRPP' },
    { id: 'Invitado', label: '🎟️ Invitados / Listas' },
    { id: 'Proveedor', label: '💼 Proveedores / DJs' },
    { id: 'Staff', label: '🛡️ Staff & Operativa' }
];

class WhatsAppAgentService {
    /**
     * Genera una campaña semanal completa usando IA (Gemini) o motor local
     */
    static async generateCampaign({ weekOffset = 0, startDate = null, endDate = null, tone = 'nightlife_vip', customInstructions = '' } = {}) {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-campaign/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekOffset, startDate, endDate, tone, customInstructions })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.campaign) {
                    localStorage.setItem('__last_whatsapp_campaign', JSON.stringify(data.campaign));
                    return data;
                }
            }
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error al generar con backend, usando caché/local:', e);
        }

        // Fallback local
        const cached = localStorage.getItem('__last_whatsapp_campaign');
        if (cached) {
            return { success: true, campaign: JSON.parse(cached), source: 'local_cached' };
        }

        return { success: false, error: 'No se pudo generar la campaña' };
    }

    /**
     * Obtiene la campaña activa actual
     */
    static async getCurrentCampaign() {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-campaign/current`);
            if (res.ok) {
                const data = await res.json();
                if (data.campaign) return data.campaign;
            }
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error al obtener campaña actual:', e);
        }

        const cached = localStorage.getItem('__last_whatsapp_campaign');
        return cached ? JSON.parse(cached) : null;
    }

    /**
     * Guarda modificaciones a una campaña semanal
     */
    static async saveCampaign(campaign) {
        localStorage.setItem('__last_whatsapp_campaign', JSON.stringify(campaign));
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-campaign/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaign })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error guardando campaña en backend:', e);
        }
        return { success: true, campaign };
    }

    /**
     * Obtiene los grupos y comunidades de WhatsApp
     */
    static async getGroups() {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-groups`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error cargando grupos:', e);
        }
        
        const local = localStorage.getItem('__whatsapp_groups');
        return local ? JSON.parse(local) : [];
    }

    /**
     * Guarda o actualiza un grupo de WhatsApp
     */
    static async saveGroup(group) {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(group)
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error guardando grupo:', e);
        }
        return { success: false };
    }

    /**
     * Elimina un grupo de WhatsApp
     */
    static async deleteGroup(id) {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-groups/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error eliminando grupo:', e);
        }
        return { success: true };
    }

    /**
     * Registra un despacho de mensaje en el historial
     */
    static async logDispatch({ title, target, channel = 'whatsapp_web', recipientName = '', recipientPhone = '', copyPreview = '' }) {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-campaign/log-dispatch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, target, channel, recipientName, recipientPhone, copyPreview })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error guardando log de despacho:', e);
        }
        return { success: true };
    }

    /**
     * Obtiene el historial de logs de despachos
     */
    static async getLogs() {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-campaign/logs`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error obteniendo logs:', e);
        }
        return [];
    }

    /**
     * Construye un enlace directo a WhatsApp Web / App
     * @param {string} phone - Teléfono con o sin código de país
     * @param {string} text - Texto del mensaje
     * @returns {string} - URL lista para window.open
     */
    static buildWhatsAppLink(phone = '', text = '') {
        const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        const encoded = encodeURIComponent(text || '');
        if (cleanPhone) {
            return `https://wa.me/${cleanPhone}?text=${encoded}`;
        }
        return `https://wa.me/?text=${encoded}`;
    }

    /**
     * Reemplaza variables en un mensaje personalizado
     */
    static personalizeMessage(template, contact = {}) {
        let msg = template || '';
        const firstName = (contact.name || 'amigo').split(' ')[0];
        msg = msg.replace(/\{\{nombre\}\}/gi, firstName);
        msg = msg.replace(/\{\{nombre_completo\}\}/gi, contact.name || 'Cliente VIP');
        msg = msg.replace(/\{\{telefono\}\}/gi, contact.phone || '');
        msg = msg.replace(/\{\{instagram\}\}/gi, contact.instagram || '');
        return msg;
    }
}

export default WhatsAppAgentService;
