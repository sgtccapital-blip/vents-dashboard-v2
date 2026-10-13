/**
 * Agente WhatsApp (Pulse): cartelera semanal, grupos, referencias y variaciones de copy.
 * Gemini si hay clave (mismos modelos que OpenClaw); si no, generador local.
 */
import { generateGeminiJSON } from '../agent.js';

export function registerWhatsAppRoutes(app, ctx) {
    const { readDB, writeDB, geminiKeyFor } = ctx;

    // ─── WhatsApp & Community Outreach Agent Endpoints ───────────

    function getWeekEventsForBroadcast(db, weekOffset = 0, startDateStr = null, endDateStr = null) {
        let start, end;
        if (startDateStr && endDateStr) {
            start = new Date(startDateStr + 'T00:00:00');
            end = new Date(endDateStr + 'T23:59:59');
        } else {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
            start = new Date(now);
            start.setDate(diff + (weekOffset * 7));
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        }

        const allEvents = db.events || [];
        const matched = [];

        for (const ev of allEvents) {
            let isMatch = false;
            let eventDate = ev.date;

            if (ev.date) {
                const d = new Date(ev.date + 'T12:00:00');
                if (d >= start && d <= end) {
                    isMatch = true;
                    eventDate = ev.date;
                }
            }

            if (Array.isArray(ev.instances)) {
                for (const inst of ev.instances) {
                    if (inst.date) {
                        const idate = new Date(inst.date + 'T12:00:00');
                        if (idate >= start && idate <= end) {
                            isMatch = true;
                            eventDate = inst.date;
                            break;
                        }
                    }
                }
            }

            if (isMatch) {
                matched.push({ ...ev, activeDate: eventDate });
            }
        }

        if (matched.length === 0) {
            // Fallback to active/upcoming events to ensure rich content
            return {
                events: allEvents.filter(e => e.status === 'activo' || e.status === 'planificacion' || e.status === 'upcoming' || e.status === 'ejecucion').slice(0, 6),
                start,
                end,
                isGeneralLineup: true
            };
        }

        return { events: matched, start, end, isGeneralLineup: false };
    }

    function generateLocalWhatsAppCampaign(events, start, end, tone = 'nightlife_vip', customInstructions = '') {
        const startStr = start.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
        const endStr = end.toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' });

        const eventBulletPoints = events.map(e => {
            const dateStr = e.activeDate || e.date || 'Esta semana';
            const loc = e.location || 'Casco Antiguo';
            const artists = (e.instances && e.instances[0]?.artists?.map(a => a.name).join(', ')) || '';
            return `• *${e.name}* (${dateStr}) @ ${loc}${artists ? ` | Lineup: ${artists}` : ''}${e.description ? `\n  _${e.description.substring(0, 90)}..._` : ''}`;
        }).join('\n\n');

        const weeklySchedule = [
            {
                id: `sch-1-${Date.now()}`,
                day: 'Lunes',
                date: start.toISOString().split('T')[0],
                title: '📢 Lanzamiento de Cartelera Semanal',
                type: 'Cartelera General',
                targetAudience: 'Todos los Grupos & Comunidades',
                status: 'ready',
                whatsappCopy: `🔥 *CARTELERA SEMANAL VIP | SEMANA ${startStr.toUpperCase()} - ${endStr.toUpperCase()}* 🔥\n\n¡Arrancamos la semana con toda la energía! Aquí tienes la programación oficial de eventos y experiencias para esta semana:\n\n${eventBulletPoints}\n\n📲 *RESERVAS & MESAS VIP:*\nEscríbenos directamente para asegurar tu espacio antes del Sold Out.\n\n📍 _¡Comparte este mensaje con tu grupo de fiesta!_ 🥂`
            },
            {
                id: `sch-2-${Date.now()}`,
                day: 'Martes',
                date: new Date(start.getTime() + 86400000).toISOString().split('T')[0],
                title: '🍾 Preventa de Boxes & Mesas VIP',
                type: 'Ventas VIP / Botellas',
                targetAudience: 'Comunidad VIP & Clientes Frecuentes',
                status: 'ready',
                whatsappCopy: `🍾 *ATENCIÓN CLIENTES VIP | RESERVAS DE MESAS*\n\nSi vas a salir este fin de semana, no esperes a última hora. Los mejores spots y boxes se llenan rápido:\n\n✅ *Boxes VIP 212 Club / Candela Trump*\n✅ *Atención personalizada & bottle service*\n✅ *Acceso preferencial sin filas*\n\nResponde a este mensaje con la palabra *MESA* para pasarte el menú y ubicación disponible. 🥂⚡`
            },
            {
                id: `sch-3-${Date.now()}`,
                day: 'Miércoles',
                date: new Date(start.getTime() + 86400000 * 2).toISOString().split('T')[0],
                title: '🎟️ Listas de Invitados & Acceso Especial',
                type: 'Listas Free / Chicas',
                targetAudience: 'Grupos Masivos & Redes',
                status: 'ready',
                whatsappCopy: `✨ *LISTAS ABIERTAS PARA EL FIN DE SEMANA* ✨\n\n¿Ya estás en lista? Tenemos acceso free y beneficios exclusivos para los primeros en confirmar:\n\n🍸 *Chicas Free Pass* hasta las 11:30 PM\n🍹 *Welcome Shots* para grupos de 5+\n\nEnvía tus nombres completos (Nombre + Apellido) por interno para agregarte a la lista oficial de puerta. 💃🕺`
            },
            {
                id: `sch-4-${Date.now()}`,
                day: 'Jueves',
                date: new Date(start.getTime() + 86400000 * 3).toISOString().split('T')[0],
                title: '🎧 Lineup de DJs & Artistas Invitados',
                type: 'Música & Experiencia',
                targetAudience: 'Comunidad Electrónica & Música',
                status: 'ready',
                whatsappCopy: `🎧 *LINEUP & DJS DE LA SEMANA* 🎶\n\nEste fin de semana el sonido estará a otro nivel con nuestros DJs residentes e invitados especiales.\n\n🔊 *Música curada: Deep, Tech House & Crossover*\n⏰ *Puertas abiertas desde las 9:00 PM*\n\n¡No te quedes por fuera del mejor ambiente de la ciudad! 🚀`
            },
            {
                id: `sch-5-${Date.now()}`,
                day: 'Viernes',
                date: new Date(start.getTime() + 86400000 * 4).toISOString().split('T')[0],
                title: '🔥 HOY ES VIERNES: Kickoff de Fin de Semana',
                type: 'Apertura de Fin de Semana',
                targetAudience: 'Todos los Canales',
                status: 'ready',
                whatsappCopy: `🚨 *¡HOY SE PRENDE EL FIN DE SEMANA!* 🚨\n\nTodo listo para la noche de hoy. Si buscas el mejor spot con buen ambiente, coctelería y música en vivo:\n\n📍 *Ubicación:* Casco Antiguo / 212 Club / Candela\n⏰ *Apertura:* 09:00 PM\n🍾 *Promoción:* 2x1 en cócteles seleccionados hasta las 11:00 PM\n\n¡Llega temprano para evitar fila en puerta! 💥`
            },
            {
                id: `sch-6-${Date.now()}`,
                day: 'Sábado',
                date: new Date(start.getTime() + 86400000 * 5).toISOString().split('T')[0],
                title: '⚡ SÁBADO GIGANTE | Last Call de Mesas',
                type: 'Sold Out Warning',
                targetAudience: 'Todos los Grupos & Directos',
                status: 'ready',
                whatsappCopy: `🔥 *SÁBADO DE CASA LLENA | ÚLTIMAS ENTRADAS Y MESAS* 🔥\n\nQuedan muy pocas mesas disponibles para esta noche. El dress code es elegante/casual y la vibra estará insuperable.\n\n⚠️ *Aforo controlado en puerta*\n🍾 *Últimos 2 Boxes VIP disponibles*\n\nEscríbenos YA si vienes en grupo grande para apartar tu mesa. ¡Nos vemos en la pista! 🥂✨`
            },
            {
                id: `sch-7-${Date.now()}`,
                day: 'Domingo',
                date: end.toISOString().split('T')[0],
                title: '🚶‍♂️ Domingo de Casco & After Recap',
                type: 'Cultural & Cierre',
                targetAudience: 'Comunidad Casco & General',
                status: 'ready',
                whatsappCopy: `☀️ *DOMINGO DE CASCO PEATONAL & TARDEO* 🚶‍♂️✨\n\nCerramos la semana con el mejor plan de tarde: caminata por las plazas, música en vivo, arte urbano y gastronomía.\n\n📍 *Punto de encuentro:* Plaza Catedral, Casco Antiguo\n🎷 *Shows en vivo & acústicos*\n\n¡Gracias a todos los que bailaron con nosotros este fin de semana! Nos vemos el próximo Lunes con nueva cartelera. 🙌💛`
            }
        ];

        const vipDirectMessages = [
            {
                id: 'vip-msg-1',
                audience: 'VIP High Spenders (Mesas & Boxes)',
                title: 'Invitación Privada a Mesa VIP',
                whatsappCopy: `Hola {{nombre}}, ¿cómo estás? Te escribo para comentarte que esta semana tenemos eventos exclusivos en Casco. Tenemos disponible el Box VIP principal con botella de cortesía si confirmas tu mesa antes del jueves. ¿Te reservo tu espacio habitual? 🍾🥂`
            },
            {
                id: 'vip-msg-2',
                audience: 'Invitados VIP / Listas Free',
                title: 'Pase Free & Acceso Directo',
                whatsappCopy: `¡Hola {{nombre}}! 🌟 Te agregué a la lista VIP de esta semana para nuestros eventos en Casco. Tienes entrada Free Pass + 1 acompañante hasta las 11:30 PM. Solo avísame con quién vas para dejar los nombres en puerta. 🙌`
            },
            {
                id: 'vip-msg-3',
                audience: 'Promotores & RRPP',
                title: 'Directiva Semanal & Metas de Venta',
                whatsappCopy: `Equipo, activa la promoción de esta semana. Tenemos meta de 15 mesas y 80 personas en lista para el fin de semana. El link de reservas ya está abierto y las comisiones aplican desde la primera reserva. ¡Vamos con todo! ⚡`
            },
            {
                id: 'vip-msg-4',
                audience: 'Cumpleañeros del Mes / Semana',
                title: 'Paquete de Cumpleaños & Bottle Free',
                whatsappCopy: `🎉 ¡Feliz cumpleaños {{nombre}}! Queremos celebrarte en grande: te regalamos 1 botella de espumante + mesa reservada + entradas free para tus invitados este fin de semana. Responde aquí para activar tu paquete de cumple. 🎂🍾`
            }
        ];

        const communityBroadcasts = [
            {
                id: 'cb-1',
                groupCategory: 'VIP & Clientes Frecuentes',
                title: 'Comunicado Exclusivo para Comunidad VIP',
                whatsappCopy: `👑 *COMUNIDAD VIP | ACCESO ANTICIPADO*\n\nMiembros de la comunidad, aquí tienen en primicia los eventos de la semana (${startStr} - ${endStr}):\n\n${eventBulletPoints}\n\nLos miembros de este grupo tienen 15% de descuento en botellas seleccionadas antes de las 11:00 PM. 🥂`
            },
            {
                id: 'cb-2',
                groupCategory: 'Comunidad Masiva & Seguidores',
                title: 'Broadcast General para Canales de WhatsApp',
                whatsappCopy: `🚀 *WEEKLY LINEUP & PLANES DE LA SEMANA*\n\n¡Se viene una semana cargada de buena música, eventos al aire libre y fiesta!\n\n${eventBulletPoints}\n\n¡Guarda la fecha y comparte este mensaje con tu grupo! Nos vemos en el Casco. 💃🕺`
            }
        ];

        return {
            id: `camp-${Date.now()}`,
            name: `Campaña Semanal (${startStr} - ${endStr})`,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            tone,
            customInstructions,
            summary: `Estrategia de difusión multi-canal que cubre ${events.length} eventos activos para la semana del ${startStr} al ${endStr}. Incluye 7 copys de publicación diaria, 4 plantillas personalizadas para clientes 1 a 1 y 2 comunicados para grupos de WhatsApp.`,
            weeklySchedule,
            vipDirectMessages,
            communityBroadcasts,
            createdAt: new Date().toISOString()
        };
    }

    // Generate campaign endpoint
    // Genera (y guarda) la campaña semanal: Gemini si hay clave, si no el generador local.
    // La usan el botón "Generar" y el cron de los lunes.
    async function generateWeeklyCampaign({ weekOffset = 0, startDate, endDate, tone = 'nightlife_vip', customInstructions = '' } = {}) {
        const db = readDB();
        const { events, start, end } = getWeekEventsForBroadcast(db, parseInt(weekOffset) || 0, startDate, endDate);

        // Gemini (clave del entorno o del dashboard, mismos modelos que el agente); si falla, generador local
        const apiKey = geminiKeyFor(db);
        let aiError = null;
        if (apiKey) {
            try {
                console.log(`[WhatsAppAgent] Generando campaña con Gemini para ${events.length} eventos (Semana ${start.toISOString().split('T')[0]})...`);

                const eventsContext = events.map(e => ({
                    nombre: e.name,
                    fecha: e.activeDate || e.date,
                    lugar: e.location,
                    tipo: e.type,
                    descripcion: e.description,
                    artistas: e.instances?.[0]?.artists?.map(a => a.name) || [],
                    mesas: e.tables?.length || 0,
                    promos: e.instances?.[0]?.checklist?.promo || []
                }));

                const prompt = `Eres "Pulse", el agente de inteligencia artificial especializado en comunicación, difusión de eventos y Community Management de WhatsApp para centros nocturnos, eventos masivos (Casco Peatonal) y hospitalidad VIP en Panamá.

    Tus tareas son:
    1. Analizar los siguientes eventos programados para la semana del ${start.toISOString().split('T')[0]} al ${end.toISOString().split('T')[0]}:
    ${JSON.stringify(eventsContext, null, 2)}

    2. Redactar una campaña de WhatsApp completa estructurada en JSON estrictamente válido.
    Reglas de formato de WhatsApp:
    - Usa negritas (*texto*), cursivas (_texto_), viñetas (• o ✅), emojis atractivos y llamados a la acción claros.
    - Tono solicitado: "${tone}" (ej: fiesta nocturna, VIP sofisticado, cercano, enérgico).
    - Instrucciones especiales del usuario: "${customInstructions || 'Ninguna'}".

    Devuelve ÚNICAMENTE un objeto JSON con este formato exacto:
    {
      "summary": "Resumen ejecutivo de la estrategia de la semana",
      "weeklySchedule": [
    {
      "id": "sch-1",
      "day": "Lunes",
      "date": "${start.toISOString().split('T')[0]}",
      "title": "Título de la publicación del día",
      "type": "Cartelera Semanal",
      "targetAudience": "Grupos de WhatsApp & Comunidades",
      "status": "ready",
      "whatsappCopy": "Texto formateado para WhatsApp con emojis y *negrita* listo para enviar..."
    }
    // ... genera exactamente los 7 días de Lunes a Domingo
      ],
      "vipDirectMessages": [
    {
      "id": "vip-1",
      "audience": "Clientes VIP Mesas",
      "title": "Invitación Personalizada de Mesa",
      "whatsappCopy": "Mensaje 1 a 1 usando {{nombre}} para personalizar..."
    },
    {
      "id": "vip-2",
      "audience": "Invitados Listas Free / Chicas",
      "title": "Acceso Free Pass",
      "whatsappCopy": "Mensaje para invitar a listas..."
    },
    {
      "id": "vip-3",
      "audience": "Promotores & RRPP",
      "title": "Directiva de Ventas",
      "whatsappCopy": "Mensaje con metas para promotores..."
    }
      ],
      "communityBroadcasts": [
    {
      "id": "cb-1",
      "groupCategory": "VIP & Clientes Frecuentes",
      "title": "Anuncio Exclusivo para Comunidad VIP",
      "whatsappCopy": "Texto de broadcast para comunidad VIP..."
    },
    {
      "id": "cb-2",
      "groupCategory": "Comunidad General",
      "title": "Cartelera General para Canales de WhatsApp",
      "whatsappCopy": "Texto de broadcast para todos los grupos..."
    }
      ]
    }`;

                const ai = await generateGeminiJSON({ apiKey, model: db.openclawConfig?.model, prompt });
                if (ai.error) throw new Error(ai.error);
                const parsed = ai.data;

                if (parsed && Array.isArray(parsed.weeklySchedule)) {
                    const campaign = {
                        id: `camp-${Date.now()}`,
                        name: `Campaña IA Semanal (${start.toISOString().split('T')[0]} al ${end.toISOString().split('T')[0]})`,
                        startDate: start.toISOString().split('T')[0],
                        endDate: end.toISOString().split('T')[0],
                        tone,
                        customInstructions,
                        summary: parsed.summary || `Campaña generada con ${ai.model}`,
                        weeklySchedule: parsed.weeklySchedule,
                        vipDirectMessages: parsed.vipDirectMessages || [],
                        communityBroadcasts: parsed.communityBroadcasts || [],
                        createdAt: new Date().toISOString(),
                        model: ai.model
                    };

                    // Guardar automáticamente en db
                    if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
                    db.whatsappCampaigns.unshift(campaign);
                    db.whatsappCampaigns = db.whatsappCampaigns.slice(0, 10);
                    writeDB(db);

                    return { campaign, eventsCount: events.length, source: 'gemini', model: ai.model };
                }
                throw new Error('Gemini no devolvió el formato esperado');
            } catch (aiErr) {
                aiError = aiErr.message;
                console.warn('[WhatsAppAgent] Error con Gemini, recurriendo a generador determinístico:', aiErr.message);
            }
        }

        // Local deterministic fallback
        const localCampaign = generateLocalWhatsAppCampaign(events, start, end, tone, customInstructions);
        if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
        db.whatsappCampaigns.unshift(localCampaign);
        db.whatsappCampaigns = db.whatsappCampaigns.slice(0, 10);
        writeDB(db);

        return { campaign: localCampaign, eventsCount: events.length, source: 'local_engine', aiError, geminiConfigured: !!apiKey };
    }

    app.post('/api/agent/whatsapp-campaign/generate', async (req, res) => {
        try {
            const result = await generateWeeklyCampaign(req.body || {});
            res.json({ success: true, ...result });
        } catch (err) {
            console.error('[WhatsAppAgent] Error en generate:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Get current or latest campaign
    app.get('/api/agent/whatsapp-campaign/current', (req, res) => {
        const db = readDB();
        const campaigns = db.whatsappCampaigns || [];
        if (campaigns.length > 0) {
            return res.json({ success: true, campaign: campaigns[0], total: campaigns.length });
        }
        // Generate one immediately if none exist
        const { events, start, end } = getWeekEventsForBroadcast(db, 0);
        const campaign = generateLocalWhatsAppCampaign(events, start, end);
        if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
        db.whatsappCampaigns.push(campaign);
        writeDB(db);
        res.json({ success: true, campaign, total: 1 });
    });

    // Save modified campaign
    app.post('/api/agent/whatsapp-campaign/save', (req, res) => {
        const { campaign } = req.body;
        if (!campaign || !campaign.id) return res.status(400).json({ error: 'Falta objeto campaign' });

        const db = readDB();
        if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
        const idx = db.whatsappCampaigns.findIndex(c => c.id === campaign.id);
        if (idx >= 0) {
            db.whatsappCampaigns[idx] = campaign;
        } else {
            db.whatsappCampaigns.unshift(campaign);
        }
        writeDB(db);
        res.json({ success: true, campaign });
    });

    // WhatsApp Groups CRUD
    app.get('/api/agent/whatsapp-groups', (req, res) => {
        const db = readDB();
        res.json(db.whatsappGroups || []);
    });

    app.post('/api/agent/whatsapp-groups', (req, res) => {
        const group = req.body;
        if (!group.name) return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });

        const db = readDB();
        if (!db.whatsappGroups) db.whatsappGroups = [];

        if (group.id) {
            const idx = db.whatsappGroups.findIndex(g => g.id === group.id);
            if (idx >= 0) {
                db.whatsappGroups[idx] = { ...db.whatsappGroups[idx], ...group, updatedAt: new Date().toISOString() };
            } else {
                db.whatsappGroups.push({ ...group, createdAt: new Date().toISOString() });
            }
        } else {
            const newGroup = {
                id: `wag-${Date.now()}`,
                name: group.name,
                category: group.category || 'Comunidad General',
                memberCount: parseInt(group.memberCount) || 0,
                inviteLink: group.inviteLink || '',
                postDays: group.postDays || ['Lunes', 'Viernes'],
                notes: group.notes || '',
                createdAt: new Date().toISOString()
            };
            db.whatsappGroups.push(newGroup);
        }
        writeDB(db);
        res.json({ success: true, groups: db.whatsappGroups });
    });

    app.delete('/api/agent/whatsapp-groups/:id', (req, res) => {
        const db = readDB();
        if (db.whatsappGroups) {
            db.whatsappGroups = db.whatsappGroups.filter(g => g.id !== req.params.id);
            writeDB(db);
        }
        res.json({ success: true });
    });

    // Log dispatches
    app.post('/api/agent/whatsapp-campaign/log-dispatch', (req, res) => {
        const { title, target, channel, recipientName, recipientPhone, copyPreview } = req.body;
        const db = readDB();
        if (!db.whatsappLogs) db.whatsappLogs = [];

        const newLog = {
            id: `wlog-${Date.now()}`,
            title: title || 'Despacho de WhatsApp',
            target: target || 'Grupo de WhatsApp',
            channel: channel || 'whatsapp_web',
            recipientName: recipientName || '',
            recipientPhone: recipientPhone || '',
            copyPreview: copyPreview ? copyPreview.substring(0, 120) + '...' : '',
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        db.whatsappLogs.unshift(newLog);
        db.whatsappLogs = db.whatsappLogs.slice(0, 100); // max 100 logs

        // Also record activity in general activity log
        if (!db.activityLog) db.activityLog = [];
        db.activityLog.unshift({
            id: `act-${Date.now()}`,
            text: `📲 WhatsApp Agent despachó mensaje: "${newLog.title}" para ${newLog.target || newLog.recipientName}`,
            time: new Date().toLocaleTimeString('es-PA'),
            type: 'whatsapp_dispatch'
        });

        writeDB(db);
        res.json({ success: true, log: newLog });
    });

    app.get('/api/agent/whatsapp-campaign/logs', (req, res) => {
        const db = readDB();
        res.json(db.whatsappLogs || []);
    });

    // ─── WhatsApp Reference Library & Generator ─────────────────────

    const DEFAULT_WHATSAPP_REFERENCES = [
        {
            id: 'ref-mie-furia-sushi-chicas',
            title: 'Miércoles Furia — 🍣 Cena Sushi & Drinks de Chicas',
            venue: 'Furia',
            day: 'Miércoles',
            objective: 'chicas_sushi_drinks',
            objectiveLabel: '🍣 Chicas Cena Sushi & Drinks',
            copy: `🍣 *EXCLUSIVO CHICAS | SUSHI DINNER & DRINKS @ FURIA* 🥂✨\n\n¡Chicas! Este *miércoles* abrimos mesa especial de cena para ustedes en *Furia Panamá*.\n\n✨ *La experiencia incluye:*\n• Degustación de sushi rolls premium & bocados de autor\n• Welcome drinks & cócteles de cortesía durante la cena\n• Acceso VIP directo a la fiesta post-cena sin fila ni cover\n\n⏰ *Hora de cena:* 08:30 PM (Mesas limitadas por reserva)\n📍 *Ubicación:* Furia, Calle Uruguay / Obarrio\n\n¿Cuántas chicas van en tu grupo para confirmar su mesa? Responde *SUSHI CHICAS* 📲`
        },
        {
            id: 'ref-jue-terraplen-drinks-chicas',
            title: 'Jueves Terraplén — 🍸 Drinks Chicas (Llenar la Fiesta)',
            venue: 'Terraplen',
            day: 'Jueves',
            objective: 'chicas_party_drinks',
            objectiveLabel: '🍸 Drinks de Chicas (Fiesta de Mujeres)',
            copy: `🍸 *THURSDAY ROOFTOP | DRINKS FOR THE GIRLS @ TERRAPLÉN* 🌇🔥\n\n¡Este *jueves* el mejor rooftop de Casco Antiguo se enciende para ustedes!\n\n🌸 *BENEFICIO EXCLUSIVO PARA CHICAS:*\n✅ *Open Bar de cócteles seleccionados* de 09:00 PM a 11:30 PM\n✅ *Entrada Free Pass* en lista VIP de chicas\n✅ La mejor vista panorámica, atardecer y DJs en vivo\n\n📍 *Terraplén Rooftop* (Casco Antiguo)\n\nResponde con tu nombre y apellido + número de amigas para anotarlas en la lista VIP 💃✨`
        },
        {
            id: 'ref-vie-furia-hombres-mesas',
            title: 'Viernes Furia — 🍾 Venta Sushi Party & Mesas VIP Hombres',
            venue: 'Furia',
            day: 'Viernes',
            objective: 'hombres_sushi_party',
            objectiveLabel: '🍾 Venta Sushi Party & Mesas Hombres',
            copy: `🍾 *SUSHI PARTY & MESAS VIP | VIERNES EN FURIA* 🔥⚡\n\nBro, este *viernes* la fiesta principal se vive en *Furia*. Si vienes con tu corillo, no te quedes por fuera:\n\n💥 *PACK SUSHI PARTY VIP:*\n• Mesa VIP reservada en zona principal\n• Combo de Sushi rolls gigantes para el grupo\n• Bottle service & mixers ilimitados\n• Acceso preferencial para ti y tus invitados sin fila\n\nLas mesas de viernes se van rápido. Responde *MESA FURIA* para enviarte el plano y consumo mínimo. 🥂🚀`
        },
        {
            id: 'ref-sab-varios-spam-tickets',
            title: 'Sábado General — 🎟️ Spam Tickets & Accesos Semanales',
            venue: 'Furia / Terraplén / Piano Bar',
            day: 'Sábado',
            objective: 'spam_tickets',
            objectiveLabel: '🎟️ Spam Tickets & Entradas',
            copy: `🚨 *SÁBADO DE FIESTA | TICKETS & ACCESOS DISPONIBLES* 💥\n\n¡La noche más caliente de la semana ya tiene cartelera lista!\n\n🔥 *¿A dónde vas este sábado?*\n1️⃣ *FURIA:* Noche de clubbing, techno & open format (Mesas & Tickets)\n2️⃣ *TERRAPLÉN ROOFTOP:* Sunset to late night en Casco Antiguo\n3️⃣ *PIANO BAR:* Música en vivo, cócteles clásicos y ambiente íntimo VIP\n\n🎟️ *Consigue tus tickets y preventas aquí:*\n👉 https://arriveservices.com/tickets\n\n¡Evita filas y asegura tu entrada antes de sold out! 🍾⚡`
        },
        {
            id: 'ref-dom-terraplen-chicas-sunset',
            title: 'Domingo Terraplén — 🌅 Sunset Chicas & Drinks',
            venue: 'Terraplen',
            day: 'Domingo',
            objective: 'chicas_party_drinks',
            objectiveLabel: '🍸 Drinks de Chicas (Fiesta de Mujeres)',
            copy: `🌅 *SUNDAY SUNSET SESSION @ TERRAPLÉN ROOFTOP* 🍹✨\n\nDespide la semana en el rooftop más top de la ciudad.\n\n✨ *Plan de domingo para chicas:*\n• 2x1 en Sangrías & Gin Tonics hasta las 08:00 PM\n• Rolls de sushi y bocados frescos para compartir\n• Sunset beats con los mejores DJs locales\n\n📍 *Terraplén Rooftop* — Abrimos desde las 05:00 PM.\n¿Te anoto en lista con tus amigas? Escribe *DOMINGO* 🥂`
        },
        {
            id: 'ref-sab-pianobar-mesas',
            title: 'Sábado Piano Bar — 🎹 Noche Exclusiva & Live Sessions',
            venue: 'Piano Bar',
            day: 'Sábado',
            objective: 'hombres_sushi_party',
            objectiveLabel: '🍾 Venta Sushi Party & Mesas Hombres',
            copy: `🎹 *SATURDAY LIVE SESSIONS @ PIANO BAR CASCO* 🍸✨\n\nUna noche diferente, exclusiva y con la mejor atmósfera musical de la ciudad.\n\n🥂 *PARA RESERVAS DE GRUPO & MESAS:*\n• Coctelería de autor premium\n• Pianistas y cantantes en vivo con los mejores clásicos\n• Espacios VIP íntimos para compartir con amigos o pareja\n\n📍 *Piano Bar* (Casco Antiguo)\nResponde *PIANO* para separar tu mesa con anticipación. Cupos estrictamente limitados. 🎶✨`
        }
    ];

    // GET reference messages
    app.get('/api/agent/whatsapp-references', (req, res) => {
        const db = readDB();
        if (!db.whatsappReferences || db.whatsappReferences.length === 0) {
            db.whatsappReferences = DEFAULT_WHATSAPP_REFERENCES;
            writeDB(db);
        }
        res.json(db.whatsappReferences);
    });

    // POST / PUT reference message
    app.post('/api/agent/whatsapp-references', (req, res) => {
        const db = readDB();
        if (!db.whatsappReferences) db.whatsappReferences = [...DEFAULT_WHATSAPP_REFERENCES];

        const { id, title, venue, day, objective, objectiveLabel, copy } = req.body;
        if (!copy || !title) return res.status(400).json({ error: 'Título y texto del mensaje son obligatorios.' });

        const existingIdx = db.whatsappReferences.findIndex(r => r.id === id);
        if (existingIdx !== -1) {
            db.whatsappReferences[existingIdx] = {
                ...db.whatsappReferences[existingIdx],
                title, venue, day, objective, objectiveLabel, copy,
                updatedAt: new Date().toISOString()
            };
            writeDB(db);
            return res.json({ success: true, reference: db.whatsappReferences[existingIdx] });
        }

        const newRef = {
            id: id || `ref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title,
            venue: venue || 'Furia',
            day: day || 'Miércoles',
            objective: objective || 'chicas_sushi_drinks',
            objectiveLabel: objectiveLabel || 'Mensaje de Difusión',
            copy,
            createdAt: new Date().toISOString()
        };

        db.whatsappReferences.unshift(newRef);
        writeDB(db);
        res.status(201).json({ success: true, reference: newRef });
    });

    // DELETE reference message
    app.delete('/api/agent/whatsapp-references/:id', (req, res) => {
        const db = readDB();
        if (db.whatsappReferences) {
            db.whatsappReferences = db.whatsappReferences.filter(r => r.id !== req.params.id);
            writeDB(db);
        }
        res.json({ success: true });
    });

    // GENERATE 3 VARIATIONS FROM REFERENCE WITH AI
    app.post('/api/agent/whatsapp-references/generate', async (req, res) => {
        try {
            const { venue = 'Furia', day = 'Miércoles', objective = 'chicas_sushi_drinks', referenceMessage = '', customNotes = '', eventName = '' } = req.body;

            let objectiveDesc = '';
            if (objective === 'chicas_sushi_drinks') objectiveDesc = 'Invitar exclusivamente a grupos de chicas a cena de sushi + drinks de bienvenida de cortesía.';
            else if (objective === 'chicas_party_drinks') objectiveDesc = 'Open bar / drinks gratis para chicas para que la fiesta se llene de mujeres desde temprano.';
            else if (objective === 'hombres_sushi_party') objectiveDesc = 'Vender paquetes de Sushi Party, reservas de mesas VIP, botellas y consumo para hombres/grupos.';
            else if (objective === 'spam_tickets') objectiveDesc = 'Difusión masiva directa para venta de tickets, preventas, enlaces de compra y accesos al evento.';

            const db = readDB();
            const apiKey = geminiKeyFor(db);
            let aiError = null;
            if (apiKey) {
                try {

                    const prompt = `Eres el redactor maestro de WhatsApp y Community Manager de ARRIVE Agency para centros nocturnos y rooftops en Panamá (Furia, Terraplén Rooftop, Piano Bar).

    OBJETIVO:
    Generar 3 variaciones de mensajes de WhatsApp de alta conversión adaptados al venue, día de la semana y objetivo estratégico, tomando como inspiración y estilo el mensaje de referencia proporcionado.

    PARÁMETROS:
    - Venue: ${venue}
    - Día de la semana: ${day}
    - Objetivo de campaña: ${objective} (${objectiveDesc})
    - Nombre del Evento o Fiesta: ${eventName || venue}
    - Notas adicionales / Promos de esta semana: ${customNotes || 'Ninguna'}

    MENSAJE DE REFERENCIA / EJEMPLO PROPORCIONADO:
    """
    ${referenceMessage || 'Usa el formato seductor, nocturno y VIP de ARRIVE Agency Panamá'}
    """

    REGLAS DE FORMATO WHATSAPP:
    - Usa negritas (*texto*), cursivas (_texto_), listas con viñetas (• o ✅), emojis llamativos y un Call to Action final muy claro (ej: Responde *PALABRA* para confirmar).
    - Conserva el tono y estructura del mensaje de referencia, pero redacta 3 versiones con ángulos distintos:
      * Variación 1: Enérgica & Directa
      * Variación 2: Seductora & VIP Exclusiva
      * Variación 3: Urgencia & FOMO (Últimos cupos / listas cerrando)

    Devuelve ÚNICAMENTE un objeto JSON estrictamente válido en este formato exacto:
    {
      "variations": [
        {
          "id": "var-1",
          "style": "🔥 Enérgica & Directa",
          "copy": "Texto del mensaje 1..."
        },
        {
          "id": "var-2",
          "style": "🥂 Seductora & VIP Exclusiva",
          "copy": "Texto del mensaje 2..."
        },
        {
          "id": "var-3",
          "style": "🚨 Urgencia & FOMO (Sold Out)",
          "copy": "Texto del mensaje 3..."
        }
      ]
    }`;

                    const ai = await generateGeminiJSON({ apiKey, model: db.openclawConfig?.model, prompt });
                    if (ai.error) throw new Error(ai.error);
                    if (Array.isArray(ai.data?.variations) && ai.data.variations.length > 0) {
                        return res.json({ success: true, variations: ai.data.variations, source: 'gemini', model: ai.model });
                    }
                    throw new Error('Gemini no devolvió variaciones');
                } catch (err) {
                    aiError = err.message;
                    console.warn('[WhatsAppReferences] Error en IA Gemini, usando fallback determinístico:', err.message);
                }
            }

            // High quality deterministic fallback variations
            const cleanRef = referenceMessage.trim() || '';
            const variations = [
                {
                    id: 'var-1',
                    style: '🔥 Enérgica & Directa',
                    copy: cleanRef ? `${cleanRef}\n\n⚡ *DETALLES SEMANA ACTUAL:*\n${customNotes || 'Asegura tu grupo con tiempo respondiendo a este chat.'}` : `🔥 *${day.toUpperCase()} EN ${venue.toUpperCase()} | PLAN ACTIVADO* ⚡\n\n${objectiveDesc}\n\n${customNotes ? `📌 *Nota:* ${customNotes}\n\n` : ''}📍 *Spot:* ${venue}\n📲 *Responde con tu nombre para confirmar asistencia.*`
                },
                {
                    id: 'var-2',
                    style: '🥂 Seductora & VIP Exclusiva',
                    copy: `✨ *UNA EXPERIENCIA ÚNICA ESTE ${day.toUpperCase()} @ ${venue.toUpperCase()}* 🍾🍸\n\n${objectiveDesc}\n\nAtmósfera exclusiva, música en vivo, atención personalizada y la mejor gente de la ciudad.\n\n${customNotes ? `💎 *Beneficio especial:* ${customNotes}\n\n` : ''}Reservas estrictamente por lista. Escribe *CONFIRMAR* para anotarte. 🥂`
                },
                {
                    id: 'var-3',
                    style: '🚨 Urgencia & FOMO (Últimos Cupos)',
                    copy: `🚨 *ÚLTIMOS CUPOS DISPONIBLES | ${day.toUpperCase()} @ ${venue.toUpperCase()}* ⏳💥\n\nLas listas y mesas para este ${day.toLowerCase()} se están cerrando más rápido de lo esperado.\n\n${objectiveDesc}\n\n${customNotes ? `⚠️ *Importante:* ${customNotes}\n\n` : ''}¡No te quedes por fuera! Responde *YA* para asegurar tu espacio antes del sold out total. 📲`
                }
            ];

            res.json({ success: true, variations, source: 'deterministic', aiError, geminiConfigured: !!apiKey });
        } catch (err) {
            console.error('[WhatsAppReferences] Error general en generación:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return { generateWeeklyCampaign };
}
