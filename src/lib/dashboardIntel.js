import { eventStatus, isDone, isStaleEvent, isActiveEvent, EVENT_STATUS_LABELS } from './status.js';

export const getEventPressure = (event = {}) => {
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  const statusWeight = { activo: 2, planificacion: 3, completado: 0, cancelado: 0 };
  const priority = priorityWeight[event.priority] || 1;
  const status = statusWeight[eventStatus(event)] ?? 1;
  const deadline = event.date ? new Date(event.date) : null;
  const today = new Date();
  const daysLeft = deadline ? Math.ceil((deadline - today) / 86400000) : null;
  const urgency = daysLeft == null ? 0 : daysLeft < 0 ? 4 : daysLeft <= 3 ? 3 : daysLeft <= 7 ? 2 : 1;
  return priority + status + urgency;
};

export const buildDecisionInbox = ({ events = [], tasks = [] }) => {
  const decisions = [];

  events.forEach(event => {
    const pressure = getEventPressure(event);
    if (eventStatus(event) === 'pausado' && ['critical', 'high'].includes(event.priority)) {
      decisions.push({
        id: `event-paused-${event.id}`,
        type: 'decide',
        title: `Definir ${event.name}`,
        summary: `Evento ${event.priority} está pausado. Decidir reactivar, redefinir o archivar.`,
        priority: 'P1',
        pressure: pressure + 3,
        owner: 'Bart',
        linkedId: event.id,
      });
    }

    if (event.date) {
      const daysLeft = Math.ceil((new Date(event.date) - new Date()) / 86400000);
      if (daysLeft <= 7 && !['completado', 'cancelado', 'borrador'].includes(eventStatus(event))) {
        decisions.push({
          id: `event-deadline-${event.id}`,
          type: 'approve',
          title: `Revisar fecha de ${event.name}`,
          summary: daysLeft < 0
            ? `Evento vencido. Requiere plan de recovery inmediato.`
            : `Fecha en ${daysLeft} día(s). Validar capacidad y próximo paso.`,
          priority: daysLeft <= 3 ? 'P1' : 'P2',
          pressure: pressure + 2,
          owner: 'Bart',
          linkedId: event.id,
        });
      }
    }
  });

  tasks.filter(t => !isDone(t)).forEach(task => {
    const hasOwner = task.assignee || task.assignedTo || task.owner;
    if ((task.priority === 'high' || task.priority === 'critical') && !hasOwner) {
      decisions.push({
        id: `task-owner-${task.id}`,
        type: 'delegar',
        title: `Asignar dueño a tarea crítica`,
        summary: task.text,
        priority: 'P1',
        pressure: 8,
        owner: 'Bart',
        linkedId: task.id,
      });
    }
  });

  return decisions.sort((a, b) => b.pressure - a.pressure).slice(0, 8);
};

const PRIORITY_LABELS = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };

export const buildDailyPriorityPanel = ({ events = [], tasks = [] }) => {
  const activeEvents = [...events]
    .filter(e => isActiveEvent(e) && (eventStatus(e) !== 'pausado' || ['critical', 'high'].includes(e.priority)))
    .sort((a, b) => getEventPressure(b) - getEventPressure(a));

  const topPriorities = activeEvents.slice(0, 3).map(event => ({
    id: event.id,
    title: event.name,
    subtitle: `${PRIORITY_LABELS[event.priority] || 'Media'} • ${EVENT_STATUS_LABELS[eventStatus(event)]}`,
    pressure: getEventPressure(event),
  }));

  const topRisks = [];
  events.forEach(event => {
    if (eventStatus(event) === 'pausado' && ['critical', 'high'].includes(event.priority)) {
      topRisks.push({ id: `risk-${event.id}`, title: `${event.name} pausado`, subtitle: 'Riesgo de oportunidad estancada' });
    }
    if (isStaleEvent(event)) {
      topRisks.push({ id: `risk-overdue-${event.id}`, title: `${event.name} vencido`, subtitle: 'Fecha rebasada' });
    }
  });

  const topOpportunities = activeEvents
    .filter(e => ['critical', 'high'].includes(e.priority))
    .slice(0, 3)
    .map(event => ({
      id: `opp-${event.id}`,
      title: event.name,
      subtitle: event.kpi?.name ? `${event.kpi.name}: ${event.kpi.current}/${event.kpi.target}` : 'Evento de alto impacto',
    }));

  // Vencida = fecha límite anterior a hoy en calendario local (una tarea que vence hoy aún está a tiempo)
  const overdue = tasks
    .filter(t => !isDone(t) && (daysUntil(t.due) ?? 0) < 0)
    .map(t => ({ id: t.id, title: t.text, subtitle: `Vencida • ${t.due}` }))
    .slice(0, 5);

  return { topPriorities, topRisks: topRisks.slice(0, 3), topOpportunities, overdue };
};

export const summarizeFocusMode = ({ events = [] }) => {
  const counts = { WAR: 0, BUILD: 0, SYSTEM: 0, SCALE: 0 };
  events.forEach(event => {
    const tags = (event.tags || []).map(t => String(t).toLowerCase());
    if (event.priority === 'critical' || tags.includes('war') || tags.includes('sales')) counts.WAR += 1;
    if (tags.includes('system') || tags.includes('automation') || tags.includes('ops')) counts.SYSTEM += 1;
    if (tags.includes('build') || tags.includes('product') || tags.includes('software')) counts.BUILD += 1;
    if (tags.includes('scale') || tags.includes('growth') || tags.includes('expansion')) counts.SCALE += 1;
  });

  const activeMode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'WAR';
  return { activeMode, counts };
};

// ─── Command Center: helpers de Home ─────────────────────────

/** YYYY-MM-DD en hora local (toISOString usa UTC y en Panamá cambia de día a las 7pm). */
export const localDateKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseDay = (value) => {
  if (!value) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Días (enteros, en calendario local) entre hoy y la fecha dada. Negativo = ya pasó. */
export const daysUntil = (value, today = new Date()) => {
  const d = parseDay(value);
  if (!d) return null;
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - start) / 86400000);
};

const PROJECT_CLOSED = ['completed', 'completado', 'done', 'archived', 'archivado', 'cancelled', 'cancelado'];

/** Proyectos vivos con avance por hitos, tareas abiertas y días a deadline, ordenados por urgencia. */
export const buildPortfolioPulse = ({ projects = [], tasks = [] }, today = new Date()) => {
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  return projects
    .filter(p => !PROJECT_CLOSED.includes(String(p.status || '').toLowerCase()))
    .map(p => {
      const milestones = Array.isArray(p.milestones) ? p.milestones : [];
      const doneMilestones = milestones.filter(m => m.done).length;
      const progress = milestones.length > 0
        ? Math.round((doneMilestones / milestones.length) * 100)
        : (Number(p.progress) || 0);
      const openTasks = tasks.filter(t => !isDone(t) && (t.projectId === p.id || t.eventId === p.id)).length;
      const nextMilestone = milestones.find(m => !m.done)?.title || null;
      const daysLeft = daysUntil(p.deadline, today);
      const urgency = daysLeft == null ? 0 : daysLeft < 0 ? 4 : daysLeft <= 7 ? 3 : daysLeft <= 30 ? 2 : 1;
      return {
        id: p.id,
        name: p.name,
        priority: p.priority || 'medium',
        progress,
        openTasks,
        nextMilestone,
        daysLeft,
        score: (priorityWeight[p.priority] || 1) * 2 + urgency,
      };
    })
    .sort((a, b) => b.score - a.score);
};

const CYCLE_TO_MONTHLY = { monthly: 1, mensual: 1, yearly: 1 / 12, annual: 1 / 12, anual: 1 / 12, weekly: 52 / 12, semanal: 52 / 12, quarterly: 1 / 3, trimestral: 1 / 3 };

/** Gasto mensual equivalente de las suscripciones activas y las que se renuevan pronto. */
export const summarizeSubscriptions = (subscriptions = [], today = new Date(), windowDays = 7) => {
  const active = subscriptions.filter(s => !['cancelled', 'cancelado', 'inactive', 'paused'].includes(String(s.status || '').toLowerCase()));
  const monthlyBurn = active.reduce((acc, s) => {
    const cost = parseFloat(s.cost) || 0;
    const factor = CYCLE_TO_MONTHLY[String(s.cycle || 'monthly').toLowerCase()] ?? 1;
    return acc + cost * factor;
  }, 0);
  const upcomingRenewals = active
    .map(s => ({ id: s.id, name: s.name, cost: parseFloat(s.cost) || 0, daysLeft: daysUntil(s.nextPayment, today) }))
    .filter(s => s.daysLeft != null && s.daysLeft >= 0 && s.daysLeft <= windowDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return { activeCount: active.length, monthlyBurn, upcomingRenewals };
};
