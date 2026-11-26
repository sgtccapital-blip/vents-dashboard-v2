import React, { useState } from 'react';
import { X, Sparkles, Film, Wand2, Calendar, User, Tag, Layers, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function NewContentModal({ isOpen, onClose, initialCategory = 'video' }) {
  const { socialMedia, addContentTask, projects } = useApp();

  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState(socialMedia[0]?.id || 'social-arrive-models');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'proj-arrive-agency');
  const [hubCategory, setHubCategory] = useState(initialCategory);
  const [format, setFormat] = useState('Reel 9:16');
  const [pillar, setPillar] = useState('Branding & Lifestyle');
  const [priority, setPriority] = useState('high');
  const [status, setStatus] = useState('idea');
  
  // Creative
  const [hookVerbal, setHookVerbal] = useState('');
  const [hookVisual, setHookVisual] = useState('');
  const [storyline, setStoryline] = useState('');

  // Production Dates
  const [shootingDate, setShootingDate] = useState('');
  const [shootingLocation, setShootingLocation] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('19:00');
  const [assignee, setAssignee] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedAccount = socialMedia.find(s => s.id === accountId);
    const accountHandler = selectedAccount?.handler || selectedAccount?.accountName || '@Arrive.models';

    const newTask = {
      id: `ct-${Date.now()}`,
      title: title.trim(),
      accountId,
      accountHandler,
      projectId: projectId || null,
      hubCategory,
      format,
      pillar,
      priority,
      status,
      hookVerbal: hookVerbal.trim(),
      hookVisual: hookVisual.trim(),
      storyline: storyline.trim(),
      specs: {
        resolution: format.includes('16:9') ? '3840x2160 (4K 16:9)' : '1080x1920 (4K 9:16)',
        fps: '30 fps',
        aspectRatio: format.includes('16:9') ? '16:9' : '9:16',
        codec: 'H.264',
        audioTarget: '-14 LUFS'
      },
      motionSpecs: hubCategory === 'motion_graphics' ? {
        hasMotion: true,
        template: 'remotion-custom-template',
        motionNotes: 'Diseño cinético creado para Claude Code',
        lowerThird: true,
        animatedTitle: true,
        brandKitApplied: true,
        claudeEngineStatus: 'Listo para montaje en Claude'
      } : null,
      clippingSpecs: hubCategory === 'clipping' ? {
        isClip: true,
        sourceTitle: 'Archivo Raw / Podcast',
        sourceUrl: '',
        sourceTimestampStart: '00:00',
        sourceTimestampEnd: '00:45',
        speaker: 'Principal',
        viralFactor: 'Gancho de alta retención',
        captionsStyle: 'Hormozi / Word-by-word',
        claudeEngineStatus: 'Esperando corte con Claude'
      } : null,
      edl: [
        {
          order: 1,
          scene: 'Hook de Apertura (0-3s)',
          inOut: '00:00 - 00:03',
          visualAction: hookVisual || 'Primer plano de alto impacto',
          voiceover: hookVerbal || 'Gancho sonoro',
          overlayText: title.toUpperCase(),
          transition: 'Impact Cut',
          soundFx: 'Whoosh + Sub Bass'
        }
      ],
      checklist: [
        { text: 'Margen seguro 9:16 revisado', done: false },
        { text: 'Audio normalizado a -14 LUFS', done: false },
        { text: 'Color grading de marca aplicado', done: false },
        { text: 'Aprobación final de dirección', done: false }
      ],
      shootingDate: shootingDate || null,
      shootingLocation: shootingLocation || '',
      shootingTime: '18:00',
      editDeadline: editDeadline || null,
      deliveryDate: deliveryDate || null,
      deliveryVersion: 'v1',
      publishDate: publishDate || null,
      publishTime: publishTime || '19:00',
      assignee: assignee || 'Equipo Audiovisual',
      caption: '',
      hashtags: '#panama #nightlife #arriveagency'
    };

    if (addContentTask) {
      await addContentTask(newTask);
    }
    onClose();
  };

  return (
    <div className="hub-modal-overlay" onClick={onClose}>
      <div className="hub-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-header">
          <h2>
            <Film size={20} color="var(--accent-primary)" />
            Crear Nuevo Video / Proyecto
          </h2>
          <button className="hub-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="hub-modal-body">
            {/* Title */}
            <div className="hub-form-group">
              <label className="hub-form-label">Título del Video o Proyecto *</label>
              <input
                type="text"
                className="hub-form-input"
                placeholder="Ej. Sunset Sessions: Girls Dinner & Coctelería de Autor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Category & Format */}
            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Hub / Categoría</label>
                <select
                  className="hub-form-select"
                  value={hubCategory}
                  onChange={(e) => setHubCategory(e.target.value)}
                >
                  <option value="video">🎬 Video / Reel / Short</option>
                  <option value="motion_graphics">⚡ Motion Graphics (Claude)</option>
                  <option value="clipping">✂️ Clipping Hub (Claude)</option>
                </select>
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Formato</label>
                <select
                  className="hub-form-select"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="Reel 9:16">Reel 9:16 (Instagram)</option>
                  <option value="TikTok 9:16">TikTok 9:16</option>
                  <option value="Shorts 9:16">YouTube Shorts 9:16</option>
                  <option value="YouTube 16:9">YouTube 16:9 (Horizontal)</option>
                  <option value="Motion Graphic 9:16">Motion Graphic 9:16</option>
                  <option value="Podcast Clip 9:16">Podcast Clip 9:16</option>
                </select>
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Estado Inicial</label>
                <select
                  className="hub-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="idea">💡 Idea</option>
                  <option value="script">📝 Guion / Brief</option>
                  <option value="shooting">🎥 Por Grabar (Rodaje)</option>
                  <option value="editing">✂️ En Edición</option>
                  <option value="ready">✅ Listo / Aprobado</option>
                  <option value="published">🚀 Publicado</option>
                </select>
              </div>
            </div>

            {/* Account & Pillar */}
            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Cuenta / Marca Asignada</label>
                <select
                  className="hub-form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {socialMedia.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.handler || s.accountName || s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Pilar de Contenido</label>
                <input
                  type="text"
                  className="hub-form-input"
                  placeholder="Ej. Branding & Lifestyle, Nightlife, Estrategia"
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value)}
                />
              </div>
            </div>

            {/* Hooks */}
            <div className="hub-form-group">
              <label className="hub-form-label">Gancho Verbal / Sonoro (Primeros 3s)</label>
              <input
                type="text"
                className="hub-form-input"
                placeholder="Ej. Si eres creadora de contenido en Panamá, este es el único grupo VIP..."
                value={hookVerbal}
                onChange={(e) => setHookVerbal(e.target.value)}
              />
            </div>

            <div className="hub-form-group">
              <label className="hub-form-label">Gancho Visual (Acción de apertura)</label>
              <input
                type="text"
                className="hub-form-input"
                placeholder="Ej. Corte rápido a 60fps con bengalas, botellas y skyline de Casco..."
                value={hookVisual}
                onChange={(e) => setHookVisual(e.target.value)}
              />
            </div>

            {/* Production Dates */}
            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Fecha de Grabación</label>
                <input
                  type="date"
                  className="hub-form-input"
                  value={shootingDate}
                  onChange={(e) => setShootingDate(e.target.value)}
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Fecha Entrega / Review</label>
                <input
                  type="date"
                  className="hub-form-input"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Fecha de Publicación</label>
                <input
                  type="date"
                  className="hub-form-input"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                />
              </div>
            </div>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Locación de Rodaje</label>
                <input
                  type="text"
                  className="hub-form-input"
                  placeholder="Ej. Terraplén Rooftop / Casco Antiguo"
                  value={shootingLocation}
                  onChange={(e) => setShootingLocation(e.target.value)}
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Responsable / Editor Asignado</label>
                <input
                  type="text"
                  className="hub-form-input"
                  placeholder="Ej. Andrés V. (Lead Filmmaker) / Claude Code"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="hub-modal-footer">
            <button type="button" className="hub-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="hub-btn hub-btn-primary">
              <CheckCircle size={16} />
              Crear Video & Abrir en Hub
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
