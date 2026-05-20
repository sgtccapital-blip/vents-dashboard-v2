

export const getEventPressure = (event = {}) => {
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  const statusWeight = { ejecucion: 2, planeacion: 3, completado: 0, archivado: 0 };
  const priority = priorityWeight[event.priority] || 1;
  const status = statusWeight[event.status] || 1;
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
    if (event.status === 'pausado' && ['critical', 'high'].includes(event.priority)) {
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
      if (daysLeft <= 7 && event.status !== 'completado') {
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

  tasks.filter(t => !t.done).forEach(task => {
    if (task.priority === 'high' || task.priority === 'critical') {
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

export const buildDailyPriorityPanel = ({ events = [], tasks = [] }) => {
  const activeEvents = [...events]
    .filter(e => e.status === 'ejecucion' || e.status === 'planeacion' || (e.status === 'pausado' && ['critical', 'high'].includes(e.priority)))
    .sort((a, b) => getEventPressure(b) - getEventPressure(a));

  const topPriorities = activeEvents.slice(0, 3).map(event => ({
    id: event.id,
    title: event.name,
    subtitle: `${event.priority || 'medium'} • ${event.status}`,
    pressure: getEventPressure(event),
  }));

  const topRisks = [];
  events.forEach(event => {
    if (event.status === 'pausado' && ['critical', 'high'].includes(event.priority)) {
      topRisks.push({ id: `risk-${event.id}`, title: `${event.name} pausado`, subtitle: 'Riesgo de oportunidad estancada' });
    }
    if (event.date && new Date(event.date) < new Date() && event.status !== 'completado') {
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

  const overdue = [
    ...tasks.filter(t => !t.done && t.due && new Date(t.due) < new Date()).map(t => ({ id: t.id, title: t.text, subtitle: `Task vencida • ${t.due}` }))
  ].slice(0, 5);

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