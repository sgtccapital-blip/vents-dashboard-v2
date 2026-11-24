import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, Scissors, CheckCircle, User, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ScheduleMilestoneModal({ isOpen, onClose, initialTask = null, initialStage = 'shooting', initialDate = '' }) {
  const { contentTasks, updateContentTask } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState(initialTask?.id || contentTasks[0]?.id || '');
  const [stage, setStage] = useState(initialStage);
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    if (initialTask) {
      setSelectedTaskId(initialTask.id);
    } else if (contentTasks.length && !selectedTaskId) {
      setSelectedTaskId(contentTasks[0].id);
    }
    if (initialStage) setStage(initialStage);
    if (initialDate) setDate(initialDate);
  }, [initialTask, initialStage, initialDate, contentTasks]);

  if (!isOpen) return null;

  const currentSelectedTask = contentTasks.find(t => t.id === selectedTaskId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentSelectedTask) return;

    const updates = {};
    if (stage === 'shooting') {
      updates.shootingDate = date;
      updates.shootingTime = time;
      if (location) updates.shootingLocation = location;
      if (assignee) updates.shootingCrew = assignee;
      if (currentSelectedTask.status === 'idea' || currentSelectedTask.status === 'script') {
        updates.status = 'shooting';
      }
    } else if (stage === 'editing') {
      updates.editDeadline = date;
      if (assignee) updates.assignee = assignee;
      if (currentSelectedTask.status === 'shooting') {
        updates.status = 'editing';
      }
    } else if (stage === 'delivery') {
      updates.deliveryDate = date;
    } else if (stage === 'publishing') {
      updates.publishDate = date;
      updates.publishTime = time;
      if (currentSelectedTask.status === 'editing') {
        updates.status = 'ready';
      }
    }

    if (updateContentTask) {
      await updateContentTask(currentSelectedTask.id, updates);
    }
    onClose();
  };

  return (
    <div className="hub-modal-overlay" onClick={onClose}>
      <div className="hub-modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-header">
          <h2>
            <Calendar size={20} color="var(--accent-primary)" />
            Programar Hito de Producción
          </h2>
          <button className="hub-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="hub-modal-body">
            <div className="hub-form-group">
              <label className="hub-form-label">Video / Proyecto</label>
              <select
                className="hub-form-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                required
              >
                {contentTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.accountHandler || 'Sin cuenta'})
                  </option>
                ))}
              </select>
            </div>

            <div className="hub-form-group">
              <label className="hub-form-label">Tipo de Hito de Producción</label>
              <select
                className="hub-form-select"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="shooting">🎥 Grabación (Rodaje / Shoot)</option>
                <option value="editing">✂️ Edición (Deadline de Postproducción)</option>
                <option value="delivery">📦 Entrega / Review con Cliente</option>
                <option value="publishing">🚀 Publicación (Lanzamiento en Redes)</option>
              </select>
            </div>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Fecha Programada *</label>
                <input
                  type="date"
                  className="hub-form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Hora (Opcional)</label>
                <input
                  type="time"
                  className="hub-form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {stage === 'shooting' && (
              <div className="hub-form-group">
                <label className="hub-form-label">Locación del Rodaje</label>
                <input
                  type="text"
                  className="hub-form-input"
                  placeholder="Ej. Terraplén Rooftop / Casco Antiguo"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            )}

            <div className="hub-form-group">
              <label className="hub-form-label">Responsable / Asignado</label>
              <input
                type="text"
                className="hub-form-input"
                placeholder="Ej. Andrés V. (Lead Filmmaker) / Claude Code"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>
          </div>

          <div className="hub-modal-footer">
            <button type="button" className="hub-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="hub-btn hub-btn-primary">
              <CheckCircle size={15} />
              Guardar en Calendario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
