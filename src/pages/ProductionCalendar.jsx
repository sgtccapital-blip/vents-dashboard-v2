import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Video, 
  Scissors, Package, Send, Plus, Filter, Sparkles, Film, 
  Clock, MapPin, User, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ScheduleMilestoneModal from '../components/contentHub/ScheduleMilestoneModal';
import '../components/contentHub/ContentHub.css';
import '../components/contentHub/ProductionCalendar.css';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export default function ProductionCalendar() {
  const navigate = useNavigate();
  const { contentTasks, socialMedia } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 24)); // Nov 24, 2026
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda'
  const [selectedAccount, setSelectedAccount] = useState('ALL');

  // Stage filters
  const [showShooting, setShowShooting] = useState(true);
  const [showEditing, setShowEditing] = useState(true);
  const [showDelivery, setShowDelivery] = useState(true);
  const [showPublishing, setShowPublishing] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStage, setModalStage] = useState('shooting');
  const [modalInitialDate, setModalInitialDate] = useState('');

  // Extract all calendar events from contentTasks
  const allEvents = useMemo(() => {
    const list = [];
    contentTasks.forEach(task => {
      if (selectedAccount !== 'ALL' && task.accountId !== selectedAccount) return;

      // 1. Shooting (Grabación)
      if (task.shootingDate) {
        list.push({
          id: `${task.id}-shooting`,
          taskId: task.id,
          task,
          title: task.title,
          accountHandler: task.accountHandler,
          stage: 'shooting',
          date: task.shootingDate,
          time: task.shootingTime || '18:00',
          location: task.shootingLocation || 'Casco Antiguo',
          assignee: task.shootingCrew || task.assignee || 'Equipo de Cámara',
          label: '🎥 Grabación'
        });
      }

      // 2. Editing (Edición)
      if (task.editDeadline) {
        list.push({
          id: `${task.id}-editing`,
          taskId: task.id,
          task,
          title: task.title,
          accountHandler: task.accountHandler,
          stage: 'editing',
          date: task.editDeadline,
          time: '23:59',
          assignee: task.assignee || 'Editor Lead / Claude Code',
          label: '✂️ Edición'
        });
      }

      // 3. Delivery (Entrega)
      if (task.deliveryDate) {
        list.push({
          id: `${task.id}-delivery`,
          taskId: task.id,
          task,
          title: task.title,
          accountHandler: task.accountHandler,
          stage: 'delivery',
          date: task.deliveryDate,
          time: '18:00',
          version: task.deliveryVersion || 'v1',
          label: '📦 Entrega'
        });
      }

      // 4. Publishing (Publicación)
      if (task.publishDate) {
        list.push({
          id: `${task.id}-publishing`,
          taskId: task.id,
          task,
          title: task.title,
          accountHandler: task.accountHandler,
          stage: 'publishing',
          date: task.publishDate,
          time: task.publishTime || '19:00',
          label: '🚀 Publicación'
        });
      }
    });

    return list;
  }, [contentTasks, selectedAccount]);

  // Filtered by selected stages
  const activeEvents = useMemo(() => {
    return allEvents.filter(e => {
      if (e.stage === 'shooting' && !showShooting) return false;
      if (e.stage === 'editing' && !showEditing) return false;
      if (e.stage === 'delivery' && !showDelivery) return false;
      if (e.stage === 'publishing' && !showPublishing) return false;
      return true;
    });
  }, [allEvents, showShooting, showEditing, showDelivery, showPublishing]);

  // Stage counts for summary cards
  const stageCounts = useMemo(() => {
    return {
      shooting: allEvents.filter(e => e.stage === 'shooting').length,
      editing: allEvents.filter(e => e.stage === 'editing').length,
      delivery: allEvents.filter(e => e.stage === 'delivery').length,
      publishing: allEvents.filter(e => e.stage === 'publishing').length,
    };
  }, [allEvents]);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2026, 10, 24)); // November 24, 2026
  };

  // Build days for month view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday is index 0 in Spain/Latin America
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Prev month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month days
    const todayStr = '2026-11-24';
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month filling days to complete multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  }, [currentDate]);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = {};
    activeEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [activeEvents]);

  // Group events for Agenda view (Hoy, Esta Semana, Próximamente)
  const agendaGroups = useMemo(() => {
    const todayStr = '2026-11-24';
    const sorted = [...activeEvents].sort((a, b) => a.date.localeCompare(b.date));

    const todayEvents = [];
    const upcomingThisWeek = [];
    const upcomingNextWeek = [];
    const laterEvents = [];

    sorted.forEach(e => {
      if (e.date === todayStr) {
        todayEvents.push(e);
      } else if (e.date > todayStr && e.date <= '2026-11-30') {
        upcomingThisWeek.push(e);
      } else if (e.date > '2026-11-30' && e.date <= '2026-12-07') {
        upcomingNextWeek.push(e);
      } else if (e.date > '2026-12-07') {
        laterEvents.push(e);
      }
    });

    return [
      { title: '🔥 Hoy (24 Noviembre 2026)', events: todayEvents },
      { title: '📅 Esta Semana (25 - 30 Noviembre)', events: upcomingThisWeek },
      { title: '⚡ Próxima Semana (1 - 7 Diciembre)', events: upcomingNextWeek },
      { title: '🚀 Más Adelante', events: laterEvents }
    ];
  }, [activeEvents]);

  const handleDayClick = (dateStr) => {
    setModalInitialDate(dateStr);
    setIsModalOpen(true);
  };

  return (
    <div className="prod-calendar-container">
      {/* Header */}
      <div className="prod-calendar-header">
        <div className="prod-calendar-title-area">
          <h1>
            <CalendarIcon size={26} color="#34d399" />
            Production Calendar
            <span className="prod-calendar-badge">Workflow Timeline</span>
          </h1>
          <p className="hub-subtitle">
            Organización y seguimiento cronológico de Grabaciones, Ediciones, Entregas y Publicaciones de todas las cuentas.
          </p>
        </div>

        <div className="hub-header-actions">
          <button 
            className="hub-btn"
            onClick={() => navigate('/content-hub')}
          >
            <Film size={15} color="var(--accent-primary)" />
            Master Content Hub
          </button>

          <button 
            className="hub-btn"
            onClick={() => navigate('/creative-brief')}
          >
            <Sparkles size={15} color="#fbbf24" />
            Creative Brief
          </button>

          <button 
            className="hub-btn hub-btn-primary"
            onClick={() => {
              setModalStage('shooting');
              setModalInitialDate('');
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            Programar Hito de Producción
          </button>
        </div>
      </div>

      {/* Stage Summary Cards */}
      <div className="stage-summary-bar">
        <div 
          className={`stage-summary-box ${showShooting ? 'active' : ''}`}
          onClick={() => setShowShooting(!showShooting)}
        >
          <div className="stage-summary-icon shooting">
            <Video size={22} />
          </div>
          <div className="stage-summary-info">
            <span className="stage-summary-count">{stageCounts.shooting}</span>
            <span className="stage-summary-label">Grabaciones (Shootings)</span>
          </div>
        </div>

        <div 
          className={`stage-summary-box ${showEditing ? 'active' : ''}`}
          onClick={() => setShowEditing(!showEditing)}
        >
          <div className="stage-summary-icon editing">
            <Scissors size={22} />
          </div>
          <div className="stage-summary-info">
            <span className="stage-summary-count">{stageCounts.editing}</span>
            <span className="stage-summary-label">Deadlines de Edición</span>
          </div>
        </div>

        <div 
          className={`stage-summary-box ${showDelivery ? 'active' : ''}`}
          onClick={() => setShowDelivery(!showDelivery)}
        >
          <div className="stage-summary-icon delivery">
            <Package size={22} />
          </div>
          <div className="stage-summary-info">
            <span className="stage-summary-count">{stageCounts.delivery}</span>
            <span className="stage-summary-label">Entregas / Review</span>
          </div>
        </div>

        <div 
          className={`stage-summary-box ${showPublishing ? 'active' : ''}`}
          onClick={() => setShowPublishing(!showPublishing)}
        >
          <div className="stage-summary-icon publishing">
            <Send size={22} />
          </div>
          <div className="stage-summary-info">
            <span className="stage-summary-count">{stageCounts.publishing}</span>
            <span className="stage-summary-label">Publicaciones Programadas</span>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="calendar-controls-bar">
        <div className="calendar-nav-group">
          <button className="calendar-nav-btn" onClick={prevMonth} title="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-current-date">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button className="calendar-nav-btn" onClick={nextMonth} title="Mes siguiente">
            <ChevronRight size={16} />
          </button>
          <button className="hub-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={goToToday}>
            Hoy
          </button>
        </div>

        {/* Filters */}
        <div className="stage-filter-toggles">
          <button 
            className={`stage-toggle-pill shooting ${showShooting ? 'active' : ''}`}
            onClick={() => setShowShooting(!showShooting)}
          >
            🎥 Grabaciones
          </button>
          <button 
            className={`stage-toggle-pill editing ${showEditing ? 'active' : ''}`}
            onClick={() => setShowEditing(!showEditing)}
          >
            ✂️ Edición
          </button>
          <button 
            className={`stage-toggle-pill delivery ${showDelivery ? 'active' : ''}`}
            onClick={() => setShowDelivery(!showDelivery)}
          >
            📦 Entregas
          </button>
          <button 
            className={`stage-toggle-pill publishing ${showPublishing ? 'active' : ''}`}
            onClick={() => setShowPublishing(!showPublishing)}
          >
            🚀 Publicaciones
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="hub-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="ALL">Todas las Cuentas</option>
            {socialMedia.map(s => (
              <option key={s.id} value={s.id}>{s.handler || s.accountName || s.id}</option>
            ))}
          </select>

          <div className="calendar-view-tabs">
            <button 
              className={`calendar-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Mes
            </button>
            <button 
              className={`calendar-view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="calendar-month-grid">
          {/* Day Headers */}
          {DAY_NAMES.map(name => (
            <div key={name} className="calendar-day-header">
              {name}
            </div>
          ))}

          {/* Days */}
          {monthDays.map((day, idx) => {
            const dayEvents = eventsByDate[day.dateStr] || [];
            return (
              <div 
                key={idx} 
                className={`calendar-day-cell ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}`}
                onClick={() => handleDayClick(day.dateStr)}
              >
                <div className="day-cell-top">
                  <span className="day-number">{day.dayNumber}</span>
                  {dayEvents.length > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      {dayEvents.length} hitos
                    </span>
                  )}
                </div>

                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`cal-event-badge ${ev.stage}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/creative-brief?id=${ev.taskId}`);
                    }}
                    title={`${ev.label}: ${ev.title} (${ev.accountHandler})`}
                  >
                    <span>{ev.stage === 'shooting' ? '🎥' : ev.stage === 'editing' ? '✂️' : ev.stage === 'delivery' ? '📦' : '🚀'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="agenda-timeline-view">
          {agendaGroups.map((group, gIdx) => {
            if (group.events.length === 0) return null;
            return (
              <div key={gIdx} className="agenda-group">
                <div className="agenda-group-title">
                  {group.title} ({group.events.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.events.map(ev => (
                    <div key={ev.id} className="agenda-card">
                      <div className="agenda-card-left">
                        <div className={`agenda-stage-tag ${ev.stage}`}>
                          {ev.stage === 'shooting' && <Video size={18} />}
                          {ev.stage === 'editing' && <Scissors size={18} />}
                          {ev.stage === 'delivery' && <Package size={18} />}
                          {ev.stage === 'publishing' && <Send size={18} />}
                        </div>

                        <div className="agenda-card-info">
                          <h4 onClick={() => navigate(`/creative-brief?id=${ev.taskId}`)}>
                            {ev.title}
                          </h4>
                          <div className="agenda-card-meta">
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                              {ev.accountHandler}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {ev.date} {ev.time ? `· ${ev.time}` : ''}
                            </span>
                            {ev.location && (
                              <>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} /> {ev.location}
                                </span>
                              </>
                            )}
                            {ev.assignee && (
                              <>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={12} /> {ev.assignee}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="agenda-card-right">
                        <span className={`status-pill ${ev.stage}`}>
                          {ev.label}
                        </span>
                        <button 
                          className="hub-action-btn primary"
                          onClick={() => navigate(`/creative-brief?id=${ev.taskId}`)}
                        >
                          Ver Brief <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Milestone Modal */}
      <ScheduleMilestoneModal 
        isOpen={isModalOpen}
        initialStage={modalStage}
        initialDate={modalInitialDate}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
