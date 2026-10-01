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
    /**
     * Obtiene la biblioteca de mensajes de referencia y ejemplos
     */
    static async getReferences() {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-references`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    localStorage.setItem('__whatsapp_references', JSON.stringify(data));
                    return data;
                }
            }
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error al obtener referencias de backend:', e);
        }

        const local = localStorage.getItem('__whatsapp_references');
        return local ? JSON.parse(local) : [];
    }

    /**
     * Guarda o actualiza un mensaje de referencia
     */
    static async saveReference(reference) {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-references`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(reference)
            });
            if (res.ok) {
                const data = await res.json();
                return data;
            }
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error guardando referencia en backend:', e);
        }

        // Fallback local
        const local = localStorage.getItem('__whatsapp_references');
        let list = local ? JSON.parse(local) : [];
        const idx = list.findIndex(r => r.id === reference.id);
        const itemToSave = { ...reference, id: reference.id || `ref_${Date.now()}`, updatedAt: new Date().toISOString() };
        if (idx >= 0) {
            list[idx] = itemToSave;
        } else {
            list.unshift(itemToSave);
        }
        localStorage.setItem('__whatsapp_references', JSON.stringify(list));
        return { success: true, reference: itemToSave };
    }

    /**
     * Elimina un mensaje de referencia
     */
    static async deleteReference(id) {
        try {
            const res = await fetch(`${API_BASE}/agent/whatsapp-references/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error eliminando referencia en backend:', e);
        }

        const local = localStorage.getItem('__whatsapp_references');
        if (local) {
            const list = JSON.parse(local).filter(r => r.id !== id);
            localStorage.setItem('__whatsapp_references', JSON.stringify(list));
        }
        return { success: true };
    }

    /**
     * Genera variaciones de difusión a partir de un mensaje de referencia y parámetros semanales
     */
    static async generateFromReference({ referenceId, referenceText, day, venue, objective, customNotes, tone = 'nightlife_vip' }) {
        try {
            // Map objective aliases for backend Gemini prompt
            let backendObj = objective;
            if (objective === 'chicas_sushi') backendObj = 'chicas_sushi_drinks';
            if (objective === 'drinks_chicas') backendObj = 'chicas_party_drinks';
            if (objective === 'hombres_sushi_mesas') backendObj = 'hombres_sushi_party';

            const res = await fetch(`${API_BASE}/agent/whatsapp-references/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    referenceId,
                    referenceText: referenceText || '',
                    referenceMessage: referenceText || '',
                    copy: referenceText || '',
                    day: day || 'Miércoles',
                    venue: venue || 'Furia',
                    objective: backendObj,
                    customNotes: customNotes || '',
                    tone
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.variations && data.variations.length > 0) {
                    const normalized = data.variations.map((v, idx) => ({
                        id: v.id || `var-${idx}`,
                        title: v.style || v.title || (idx === 0 ? '⚡ Opción A: Enérgica & Directa' : idx === 1 ? '🍾 Opción B: Seductora VIP' : '🚨 Opción C: FOMO & Cierre Rápido'),
                        badge: v.badge || (idx === 0 ? '🔥 Mayor Conversión' : idx === 1 ? '💎 Premium Experience' : '⏳ Últimos Cupos'),
                        text: v.copy || v.text || ''
                    }));
                    return { success: true, variations: normalized };
                }
            }
        } catch (e) {
            console.warn('[WhatsAppAgentService] Error generando desde referencia en backend:', e);
        }

        // Fallback deterministic generator
        const dayLabel = day || 'Esta noche';
        const venueLabel = venue || 'el club';
        const notes = customNotes ? `\n\n📌 *Detalles:* ${customNotes}` : '';
        const base = referenceText || `¡Hola {{nombre}}! No te pierdas ${dayLabel} en ${venueLabel}.`;

        return {
            success: true,
            variations: [
                {
                    title: '⚡ Opción A: Directa & Alta Energía',
                    badge: '🔥 Mayor Conversión',
                    text: `${base}${notes}\n\n👉 Escríbeme directo para asegurar tu acceso o mesa VIP.`
                },
                {
                    title: '🍾 Opción B: Exclusiva & Seductora VIP',
                    badge: '💎 Premium Experience',
                    text: `✨ *Plan exclusivo para este ${dayLabel} en ${venueLabel}* ✨\n\n${base}${notes}\n\n🥂 Cupos estrictamente limitados. Reserva al privado.`
                },
                {
                    title: '🚨 Opción C: FOMO & Cierre Rápido',
                    badge: '⏳ Últimos Cupos',
                    text: `⚠️ *AVISO RÁPIDO:* Las listas para ${dayLabel} en ${venueLabel} están a punto de cerrar.\n\n${base}${notes}\n\n🎟️ Confírmame ahora antes de sold out.`
                }
            ]
        };
    }
}

export default WhatsAppAgentService;
