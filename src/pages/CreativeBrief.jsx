import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Sparkles, Save, Copy, Check, Download, ArrowLeft, Plus, 
  Trash2, Film, Scissors, Layers, CheckCircle2, Clock, 
  ExternalLink, Wand2, Terminal, Code2, AlertCircle, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../components/contentHub/ContentHub.css';
import '../components/contentHub/CreativeBrief.css';

export default function CreativeBrief() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { contentTasks, socialMedia, updateContentTask, addContentTask } = useApp();

  const taskIdFromUrl = searchParams.get('id');

  // Selected task state
  const currentTask = useMemo(() => {
    if (!contentTasks.length) return null;
    if (taskIdFromUrl) {
      const found = contentTasks.find(t => t.id === taskIdFromUrl);
      if (found) return found;
    }
    return contentTasks[0];
  }, [contentTasks, taskIdFromUrl]);

  // Form states
  const [activeTab, setActiveTab] = useState('creative'); // 'creative' | 'technical' | 'preview'
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState('');
  const [format, setFormat] = useState('Reel 9:16');
  const [pillar, setPillar] = useState('');
  const [status, setStatus] = useState('script');
  const [priority, setPriority] = useState('high');
  const [hubCategory, setHubCategory] = useState('video');

  // Creative
  const [hookVerbal, setHookVerbal] = useState('');
  const [hookVisual, setHookVisual] = useState('');
  const [storyline, setStoryline] = useState('');
  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [edl, setEdl] = useState([]);

  // Technical Specs
  const [resolution, setResolution] = useState('1080x1920 (4K 9:16)');
  const [fps, setFps] = useState('30 fps');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [codec, setCodec] = useState('H.264');
  const [audioTarget, setAudioTarget] = useState('-14 LUFS');

  // Motion Specs
  const [motionTemplate, setMotionTemplate] = useState('');
  const [motionNotes, setMotionNotes] = useState('');
  const [remotionComposition, setRemotionComposition] = useState('');
  const [motionLowerThird, setMotionLowerThird] = useState(true);

  // Clipping Specs
  const [clipSourceTitle, setClipSourceTitle] = useState('');
  const [clipSourceUrl, setClipSourceUrl] = useState('');
  const [clipTimestampStart, setClipTimestampStart] = useState('00:00');
  const [clipTimestampEnd, setClipTimestampEnd] = useState('00:45');
  const [clipSpeaker, setClipSpeaker] = useState('');
  const [clipViralFactor, setClipViralFactor] = useState('');
  const [clipCaptionsStyle, setClipCaptionsStyle] = useState('Hormozi / Word-by-word');

  // Production dates & assignees
  const [shootingDate, setShootingDate] = useState('');
  const [shootingLocation, setShootingLocation] = useState('');
  const [shootingCrew, setShootingCrew] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('19:00');
  const [assignee, setAssignee] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Sync state when currentTask changes
  useEffect(() => {
    if (currentTask) {
      setTitle(currentTask.title || '');
      setAccountId(currentTask.accountId || (socialMedia[0]?.id || ''));
      setFormat(currentTask.format || 'Reel 9:16');
      setPillar(currentTask.pillar || '');
      setStatus(currentTask.status || 'script');
      setPriority(currentTask.priority || 'high');
      setHubCategory(currentTask.hubCategory || 'video');

      setHookVerbal(currentTask.hookVerbal || '');
      setHookVisual(currentTask.hookVisual || '');
      setStoryline(currentTask.storyline || '');
      setCaption(currentTask.caption || '');
      setCta(currentTask.cta || '');
      setHashtags(currentTask.hashtags || '');

      setEdl(Array.isArray(currentTask.edl) && currentTask.edl.length ? currentTask.edl : [
        {
          order: 1,
          scene: 'Hook de Apertura (0-3s)',
          inOut: '00:00 - 00:03',
          visualAction: currentTask.hookVisual || 'Impacto visual',
          voiceover: currentTask.hookVerbal || 'Gancho sonoro',
          overlayText: 'TEXTO IMPACTANTE',
          transition: 'Impact Cut',
          soundFx: 'Whoosh + Bass Drop'
        }
      ]);

      // Specs
      const sp = currentTask.specs || {};
      setResolution(sp.resolution || '1080x1920 (4K 9:16)');
      setFps(sp.fps || '30 fps');
      setAspectRatio(sp.aspectRatio || '9:16');
      setCodec(sp.codec || 'H.264');
      setAudioTarget(sp.audioTarget || '-14 LUFS');

      // Motion
      const ms = currentTask.motionSpecs || {};
      setMotionTemplate(ms.template || '');
      setMotionNotes(ms.motionNotes || '');
      setRemotionComposition(ms.remotionComposition || '');
      setMotionLowerThird(ms.lowerThird !== false);

      // Clipping
      const cs = currentTask.clippingSpecs || {};
      setClipSourceTitle(cs.sourceTitle || '');
      setClipSourceUrl(cs.sourceUrl || '');
      setClipTimestampStart(cs.sourceTimestampStart || '00:00');
      setClipTimestampEnd(cs.sourceTimestampEnd || '00:45');
      setClipSpeaker(cs.speaker || '');
      setClipViralFactor(cs.viralFactor || '');
      setClipCaptionsStyle(cs.captionsStyle || 'Hormozi / Word-by-word');

      // Dates
      setShootingDate(currentTask.shootingDate || '');
      setShootingLocation(currentTask.shootingLocation || '');
      setShootingCrew(currentTask.shootingCrew || '');
      setEditDeadline(currentTask.editDeadline || '');
      setDeliveryDate(currentTask.deliveryDate || '');
      setPublishDate(currentTask.publishDate || '');
      setPublishTime(currentTask.publishTime || '19:00');
      setAssignee(currentTask.assignee || '');

      // Checklist
      setChecklist(Array.isArray(currentTask.checklist) ? currentTask.checklist : [
        { text: 'Margen seguro 9:16 para Reels e Historias verificado', done: true },
        { text: 'Audio normalizado a -14 LUFS', done: true },
        { text: 'Color grading y tokens de marca aplicados', done: false },
        { text: 'Aprobación final de dirección creativa', done: false }
      ]);
    }
  }, [currentTask]);

  // EDL handlers
  const handleEdlChange = (index, field, value) => {
    setEdl(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddEdlScene = () => {
    setEdl(prev => [
      ...prev,
      {
        order: prev.length + 1,
        scene: `Escena ${prev.length + 1}`,
        inOut: '00:00 - 00:05',
        visualAction: '',
        voiceover: '',
        overlayText: '',
        transition: 'Hard Cut',
        soundFx: ''
      }
    ]);
  };

  const handleRemoveEdlScene = (index) => {
    setEdl(prev => prev.filter((_, i) => i !== index).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  // Checklist handlers
  const handleToggleChecklist = (index) => {
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, done: !item.done } : item));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist(prev => [...prev, { text: newChecklistText.trim(), done: false }]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (index) => {
    setChecklist(prev => prev.filter((_, i) => i !== index));
  };

  // Save changes
  const handleSave = async () => {
    if (!currentTask) return;
    setIsSaving(true);
    setSaveMessage('');

    const selectedAccount = socialMedia.find(s => s.id === accountId);
    const accountHandler = selectedAccount?.handler || selectedAccount?.accountName || currentTask.accountHandler || '@Arrive.models';

    const updatedData = {
      title,
      accountId,
      accountHandler,
      format,
      pillar,
      status,
      priority,
      hubCategory,
      hookVerbal,
      hookVisual,
      storyline,
      caption,
      cta,
      hashtags,
      edl,
      specs: {
        resolution,
        fps,
        aspectRatio,
        codec,
        audioTarget
      },
      motionSpecs: (hubCategory === 'motion_graphics' || motionTemplate) ? {
        hasMotion: true,
        template: motionTemplate,
        motionNotes,
        remotionComposition,
        lowerThird: motionLowerThird,
        brandKitApplied: true,
        claudeEngineStatus: 'Actualizado en Creative Brief'
      } : null,
      clippingSpecs: (hubCategory === 'clipping' || clipSourceTitle) ? {
        isClip: true,
        sourceTitle: clipSourceTitle,
        sourceUrl: clipSourceUrl,
        sourceTimestampStart: clipTimestampStart,
        sourceTimestampEnd: clipTimestampEnd,
        speaker: clipSpeaker,
        viralFactor: clipViralFactor,
        captionsStyle: clipCaptionsStyle,
        claudeEngineStatus: 'Actualizado en Creative Brief'
      } : null,
      shootingDate,
      shootingLocation,
      shootingCrew,
      editDeadline,
      deliveryDate,
      publishDate,
      publishTime,
      assignee,
      checklist
    };

    try {
      if (updateContentTask) {
        await updateContentTask(currentTask.id, updatedData);
      }
      setSaveMessage('¡Cambios guardados con éxito!');
      setTimeout(() => setSaveMessage(''), 2500);
    } catch (err) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Markdown Brief for Claude Code & Export
  const generatedMarkdown = useMemo(() => {
    if (!currentTask) return '';
    const selectedAccount = socialMedia.find(s => s.id === accountId);
    const handler = selectedAccount?.handler || currentTask.accountHandler || '@Arrive.models';

    return `# ${title || currentTask.title}

> **Cuenta:** ${handler} · **Formato:** ${format} · **Pilar:** ${pillar || 'General'}
> **Estado:** ${status} · **Prioridad:** ${priority} · **Publicación:** ${publishDate || 'Sin fecha'} ${publishTime || ''}
> **Asignado a:** ${assignee || 'Equipo Creativo'}

---

## 🎯 Ganchos de Apertura (0-3s Retención)
- **Gancho Visual:** ${hookVisual || 'Impacto visual en primeros planos.'}
- **Gancho Verbal / Sonoro:** "${hookVerbal || 'Frase de inicio de alta intriga.'}"
- **Concepto / Storyline:** ${storyline || 'Narrativa visual de la pieza.'}

---

## 🎬 Guion de Edición (EDL / Edit Decision List)

| # | Escena / Toma | Tiempo (In → Out) | Acción Visual | Voz en Off / Diálogo | Texto en Pantalla | Transición | SFX |
|---|---|---|---|---|---|---|---|
${edl.map(s => `| ${s.order} | ${s.scene || 'Toma'} | ${s.inOut || '00:00'} | ${s.visualAction || '—'} | ${s.voiceover || '—'} | ${s.overlayText || '—'} | ${s.transition || 'Cut'} | ${s.soundFx || '—'} |`).join('\n')}

---

## ⚙️ Especificaciones Técnicas (Specs)
- **Aspect Ratio:** ${aspectRatio}
- **Resolución:** ${resolution}
- **Frame Rate:** ${fps}
- **Códec:** ${codec}
- **Audio Target:** ${audioTarget}

${(hubCategory === 'motion_graphics' || motionTemplate) ? `
### ⚡ Directivas de Motion Graphics (Claude & Remotion)
- **Template Remotion:** \`${motionTemplate || 'default-template'}\`
- **Composición:** \`${remotionComposition || 'MainComp'}\`
- **Lower Thirds:** ${motionLowerThird ? 'Sí (con tokens de marca)' : 'No'}
- **Notas Técnicas:** ${motionNotes || 'Sin notas adicionales'}
` : ''}

${(hubCategory === 'clipping' || clipSourceTitle) ? `
### ✂️ Directivas de Clipping & Repurposing
- **Fuente Raw:** ${clipSourceTitle || 'Archivo original'} (${clipSourceUrl || 'En Drive'})
- **Corte exacto:** \`${clipTimestampStart}\` → \`${clipTimestampEnd}\`
- **Orador / Speaker:** ${clipSpeaker || 'Principal'}
- **Factor Viral:** ${clipViralFactor || 'Hook de alto debate'}
- **Estilo de Subtítulos:** ${clipCaptionsStyle || 'Hormozi / Word-by-word'}
` : ''}

---

## ✍️ Copy, Caption & Llamado a la Acción (CTA)
**Caption:**
${caption || 'Copy propuesto para la publicación.'}

**Call to Action (CTA):**
${cta || 'Guarda este video y comenta tu opinión.'}

**Hashtags:**
\`${hashtags || '#panama #nightlife #arriveagency'}\`

---

## ✅ Checklist de Calidad
${checklist.map(c => `- [${c.done ? 'x' : ' '}] ${c.text}`).join('\n')}

---

## 🤖 Instrucciones para Claude Code
Para ejecutar este brief:
1. Monta la edición siguiendo el EDL y el estilo visual de la marca (\`brands/*/BRAND.md\`).
2. Sincroniza audio, subtítulos y cortes respetando las especificaciones técnicas descritas.
3. Si incluye Motion Graphics, compila el render en \`studio/remotion/\`.
`;
  }, [
    currentTask, title, accountId, format, pillar, status, priority, 
    hookVisual, hookVerbal, storyline, edl, aspectRatio, resolution, fps, 
    codec, audioTarget, hubCategory, motionTemplate, remotionComposition, 
    motionLowerThird, motionNotes, clipSourceTitle, clipSourceUrl, 
    clipTimestampStart, clipTimestampEnd, clipSpeaker, clipViralFactor, 
    clipCaptionsStyle, caption, cta, hashtags, checklist, publishDate, 
    publishTime, assignee, socialMedia
  ]);

  const copyPromptForClaude = async () => {
    try {
      await navigator.clipboard.writeText(generatedMarkdown);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadMarkdownFile = () => {
    const slug = (title || 'brief').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brief-${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentTask) {
    return (
      <div className="brief-container">
        <div className="hub-empty-state">
          <Film size={32} />
          <h3>No hay videos en el sistema</h3>
          <p>Crea tu primer video o proyecto en el Master Content Hub.</p>
          <button className="hub-btn hub-btn-primary" onClick={() => navigate('/content-hub')}>
            Ir al Master Content Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="brief-container">
      {/* Back button */}
      <div className="brief-nav-back" onClick={() => navigate('/content-hub')}>
        <ArrowLeft size={16} /> Volver al Master Content Hub
      </div>

      {/* Header */}
      <div className="brief-header">
        <div className="brief-title-area">
          <h1>
            <Sparkles size={24} color="var(--accent-primary)" />
            Creative Brief & Specs Técnicas
          </h1>
          <p className="hub-subtitle">
            Desarrollo individual de guion, ganchos de retención, EDL y especificaciones técnicas para editores y Claude Code.
          </p>
        </div>

        <div className="hub-header-actions">
          <button 
            className="hub-btn hub-btn-claude" 
            onClick={copyPromptForClaude}
            title="Copiar brief completo estructurado para Claude Code"
          >
            {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
            {copiedPrompt ? '¡Brief Copiado para Claude!' : 'Copiar Brief para Claude'}
          </button>

          <button 
            className="hub-btn" 
            onClick={downloadMarkdownFile}
            title="Descargar archivo Markdown (.md)"
          >
            <Download size={14} />
            Descargar .MD
          </button>

          <button 
            className="hub-btn hub-btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={15} />
            {isSaving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 600,
          background: saveMessage.startsWith('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: saveMessage.startsWith('Error') ? '#f87171' : '#34d399',
          border: '1px solid ' + (saveMessage.startsWith('Error') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)')
        }}>
          {saveMessage}
        </div>
      )}

      {/* Video Selector Bar */}
      <div className="brief-selector-bar">
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Film size={15} /> Seleccionar Video:
        </span>
        <select
          className="brief-select-video"
          value={currentTask.id}
          onChange={(e) => setSearchParams({ id: e.target.value })}
        >
          {contentTasks.map(t => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.accountHandler || 'Sin cuenta'} · {t.format || '9:16'})
            </option>
          ))}
        </select>
        <span className={`status-pill ${status}`}>
          {status}
        </span>
        <span className={`badge-category ${hubCategory}`}>
          {hubCategory}
        </span>
      </div>

      {/* Tabs */}
      <div className="brief-tabs">
        <button 
          className={`brief-tab-btn ${activeTab === 'creative' ? 'active' : ''}`}
          onClick={() => setActiveTab('creative')}
        >
          <Sparkles size={16} />
          Desarrollo Creativo & Guion (EDL)
        </button>
        <button 
          className={`brief-tab-btn ${activeTab === 'technical' ? 'active' : ''}`}
          onClick={() => setActiveTab('technical')}
        >
          <Layers size={16} />
          Desarrollo Técnico & Claude Specs
        </button>
        <button 
          className={`brief-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <FileText size={16} />
          Vista Previa Markdown (Brief Claude)
        </button>
      </div>

      {/* TAB 1: CREATIVE DEVELOPMENT */}
      {activeTab === 'creative' && (
        <div className="brief-main-grid">
          {/* Metadata */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <Film size={17} color="var(--accent-primary)" />
              Información de la Pieza Audiovisual
            </h3>
            
            <div className="hub-form-group">
              <label className="hub-form-label">Título del Video</label>
              <input 
                type="text" 
                className="hub-form-input" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
              />
            </div>

            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Cuenta / Marca</label>
                <select 
                  className="hub-form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {socialMedia.map(s => (
                    <option key={s.id} value={s.id}>{s.handler || s.accountName || s.id}</option>
                  ))}
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
                  <option value="Shorts 9:16">Shorts 9:16</option>
                  <option value="YouTube 16:9">YouTube 16:9</option>
                  <option value="Motion Graphic 9:16">Motion Graphic 9:16</option>
                  <option value="Podcast Clip 9:16">Podcast Clip 9:16</option>
                </select>
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Pilar de Contenido</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  value={pillar} 
                  onChange={(e) => setPillar(e.target.value)} 
                />
              </div>
            </div>

            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Estado de Producción</label>
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

              <div className="hub-form-group">
                <label className="hub-form-label">Prioridad</label>
                <select 
                  className="hub-form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟡 Alta</option>
                  <option value="normal">⚪ Normal</option>
                  <option value="low">🟢 Baja</option>
                </select>
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Categoría Hub</label>
                <select 
                  className="hub-form-select"
                  value={hubCategory}
                  onChange={(e) => setHubCategory(e.target.value)}
                >
                  <option value="video">🎬 Video / Reel</option>
                  <option value="motion_graphics">⚡ Motion Graphics (Claude)</option>
                  <option value="clipping">✂️ Clipping Hub (Claude)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hooks & Storyline */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <Sparkles size={17} color="#fbbf24" />
              Ganchos de Retención & Concepto Narrativo (Primeros 3 segundos)
            </h3>

            <div className="hub-form-group">
              <label className="hub-form-label">Gancho Verbal / Sonoro (Lo que se dice o escucha al segundo 00:00)</label>
              <textarea 
                className="hub-form-textarea" 
                rows={2}
                placeholder="Ej. Si eres creadora de contenido en Panamá, este es el único grupo VIP del que necesitas formar parte..."
                value={hookVerbal}
                onChange={(e) => setHookVerbal(e.target.value)}
              />
            </div>

            <div className="hub-form-group">
              <label className="hub-form-label">Gancho Visual (Lo que se ve en pantalla para frenar el scroll)</label>
              <textarea 
                className="hub-form-textarea" 
                rows={2}
                placeholder="Ej. Corte ultra rápido a 60fps con audio drop sincronizado de botellas, luces y skyline del Casco..."
                value={hookVisual}
                onChange={(e) => setHookVisual(e.target.value)}
              />
            </div>

            <div className="hub-form-group">
              <label className="hub-form-label">Concepto Central / Ángulo Emocional</label>
              <textarea 
                className="hub-form-textarea" 
                rows={2}
                placeholder="Ej. Mostrar el acceso VIP y la exclusividad del grupo para despertar FOMO en la audiencia femenina..."
                value={storyline}
                onChange={(e) => setStoryline(e.target.value)}
              />
            </div>
          </div>

          {/* Interactive EDL Table */}
          <div className="brief-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 className="brief-card-title" style={{ border: 'none', padding: 0, margin: 0 }}>
                <Film size={17} color="#60a5fa" />
                Guion de Edición Escena por Escena (EDL / Storyboard)
              </h3>
              <button 
                type="button" 
                className="hub-btn hub-btn-primary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={handleAddEdlScene}
              >
                <Plus size={14} /> Añadir Escena
              </button>
            </div>

            <div className="edl-table-wrapper">
              <table className="edl-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th style={{ width: '130px' }}>In → Out</th>
                    <th style={{ minWidth: '180px' }}>Acción Visual</th>
                    <th style={{ minWidth: '160px' }}>Voz / Diálogo</th>
                    <th style={{ minWidth: '150px' }}>Texto en Pantalla</th>
                    <th style={{ width: '120px' }}>Transición</th>
                    <th style={{ width: '130px' }}>Efecto Sonoro (SFX)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {edl.map((scene, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {scene.order || idx + 1}
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="edl-input" 
                          value={scene.inOut || ''} 
                          placeholder="00:00 - 00:03"
                          onChange={(e) => handleEdlChange(idx, 'inOut', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="edl-input" 
                          value={scene.visualAction || ''} 
                          placeholder="Detalle visual o plano"
                          onChange={(e) => handleEdlChange(idx, 'visualAction', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="edl-input" 
                          value={scene.voiceover || ''} 
                          placeholder="Texto hablado"
                          onChange={(e) => handleEdlChange(idx, 'voiceover', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="edl-input" 
                          value={scene.overlayText || ''} 
                          placeholder="Subtítulo / Grafismo"
                          onChange={(e) => handleEdlChange(idx, 'overlayText', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="edl-input" 
                          value={scene.transition || ''} 
                          placeholder="Whip Pan / Hard Cut"
                          onChange={(e) => handleEdlChange(idx, 'transition', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="edl-input" 
                          value={scene.soundFx || ''} 
                          placeholder="Riser / Sub drop"
                          onChange={(e) => handleEdlChange(idx, 'soundFx', e.target.value)}
                        />
                      </td>
                      <td>
                        <button 
                          type="button" 
                          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                          onClick={() => handleRemoveEdlScene(idx)}
                          title="Eliminar escena"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="edl-add-row" onClick={handleAddEdlScene}>
              <Plus size={14} /> Añadir siguiente escena al EDL
            </button>
          </div>

          {/* Social Copy & CTA */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <FileText size={17} color="#34d399" />
              Copywriting & Piezas de Redes Sociales
            </h3>

            <div className="hub-form-group">
              <label className="hub-form-label">Caption Propuesto (Descripción del Post)</label>
              <textarea 
                className="hub-form-textarea" 
                rows={3}
                placeholder="The night belongs to ARRIVE. Creamos experiencias que transforman la noche panameña..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Call to Action (CTA)</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Ej. Comenta 'VIP' para enviarte la invitación..."
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Hashtags</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="#arriveagency #panama #cascoantiguo"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TECHNICAL DEVELOPMENT & CLAUDE SPECS */}
      {activeTab === 'technical' && (
        <div className="brief-main-grid">
          {/* General Video Specs */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <Layers size={17} color="#60a5fa" />
              Parámetros Técnicos de Video & Audio
            </h3>

            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Aspect Ratio</label>
                <select 
                  className="hub-form-select"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="9:16">9:16 (Vertical Reels / TikTok)</option>
                  <option value="16:9">16:9 (Horizontal YouTube)</option>
                  <option value="1:1">1:1 (Cuadrado)</option>
                  <option value="4:5">4:5 (Instagram Feed)</option>
                </select>
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Resolución</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  value={resolution} 
                  onChange={(e) => setResolution(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Frame Rate (FPS)</label>
                <select 
                  className="hub-form-select"
                  value={fps}
                  onChange={(e) => setFps(e.target.value)}
                >
                  <option value="24 fps">24 fps (Cinemático)</option>
                  <option value="30 fps">30 fps (Estándar)</option>
                  <option value="60 fps">60 fps (Fluido / High Motion)</option>
                </select>
              </div>
            </div>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Códec / Formato</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  value={codec} 
                  onChange={(e) => setCodec(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Audio Target</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  value={audioTarget} 
                  onChange={(e) => setAudioTarget(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Motion Graphics Specs */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <Sparkles size={17} color="#c084fc" />
              Directivas de Motion Graphics & Remotion (Claude Ready)
            </h3>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Plantilla Remotion / After Effects</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Ej. remotion-techno-glitch-v2"
                  value={motionTemplate} 
                  onChange={(e) => setMotionTemplate(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Nombre de Composición</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Ej. ElementoLogoGlitch"
                  value={remotionComposition} 
                  onChange={(e) => setRemotionComposition(e.target.value)} 
                />
              </div>
            </div>

            <div className="hub-form-group">
              <label className="hub-form-label">Notas Técnicas para Animador / Prompt de Remotion</label>
              <textarea 
                className="hub-form-textarea" 
                rows={2}
                placeholder="Efectos de audio reactivo, tokens de color aplicados, tipografía kinetic..."
                value={motionNotes}
                onChange={(e) => setMotionNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Clipping Specs */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <Scissors size={17} color="#fbbf24" />
              Directivas de Clipping & Repurposing (Podcast / Raw)
            </h3>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Archivo Fuente / Podcast Titulo</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Ej. Podcast On-The-Go EP14"
                  value={clipSourceTitle} 
                  onChange={(e) => setClipSourceTitle(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Enlace a Material Raw (Google Drive)</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="https://drive.google.com/..."
                  value={clipSourceUrl} 
                  onChange={(e) => setClipSourceUrl(e.target.value)} 
                />
              </div>
            </div>

            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Timestamp Inicio (In)</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="12:35"
                  value={clipTimestampStart} 
                  onChange={(e) => setClipTimestampStart(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Timestamp Fin (Out)</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="13:20"
                  value={clipTimestampEnd} 
                  onChange={(e) => setClipTimestampEnd(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Orador / Speaker</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Ej. Gabriel G."
                  value={clipSpeaker} 
                  onChange={(e) => setClipSpeaker(e.target.value)} 
                />
              </div>
            </div>

            <div className="hub-form-grid-2">
              <div className="hub-form-group">
                <label className="hub-form-label">Factor Viral / Motivo del Recorte</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Alta controversia / Insight de negocio"
                  value={clipViralFactor} 
                  onChange={(e) => setClipViralFactor(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Estilo de Subtítulos</label>
                <select 
                  className="hub-form-select"
                  value={clipCaptionsStyle}
                  onChange={(e) => setClipCaptionsStyle(e.target.value)}
                >
                  <option value="Hormozi / Word-by-word">Hormozi (Palabra por palabra con color)</option>
                  <option value="Minimal Clean">Minimal Clean (Serif blanca inferior)</option>
                  <option value="Karaoke Dynamic Wave">Karaoke Dynamic Wave</option>
                </select>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <CheckCircle2 size={17} color="#34d399" />
              Checklist de Control de Calidad (QC)
            </h3>

            <div className="brief-checklist">
              {checklist.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`checklist-item ${item.done ? 'done' : ''}`}
                  onClick={() => handleToggleChecklist(idx)}
                >
                  <input 
                    type="checkbox" 
                    checked={item.done} 
                    onChange={() => {}} 
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontSize: '13px' }}>{item.text}</span>
                  <button 
                    type="button" 
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveChecklistItem(idx);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input 
                type="text" 
                className="hub-form-input" 
                placeholder="Añadir nuevo punto de control de calidad..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); } }}
              />
              <button 
                type="button" 
                className="hub-btn hub-btn-primary" 
                onClick={handleAddChecklistItem}
              >
                Añadir
              </button>
            </div>
          </div>

          {/* Production Schedule */}
          <div className="brief-card">
            <h3 className="brief-card-title">
              <Clock size={17} color="#f59e0b" />
              Hitos de Producción & Asignados
            </h3>

            <div className="hub-form-grid-3">
              <div className="hub-form-group">
                <label className="hub-form-label">Fecha de Grabación (Rodaje)</label>
                <input 
                  type="date" 
                  className="hub-form-input" 
                  value={shootingDate} 
                  onChange={(e) => setShootingDate(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Deadline Edición</label>
                <input 
                  type="date" 
                  className="hub-form-input" 
                  value={editDeadline} 
                  onChange={(e) => setEditDeadline(e.target.value)} 
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
                <label className="hub-form-label">Locación & Equipo de Rodaje</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Terraplén Rooftop / 2 Cámaras Sony FX3"
                  value={shootingLocation} 
                  onChange={(e) => setShootingLocation(e.target.value)} 
                />
              </div>

              <div className="hub-form-group">
                <label className="hub-form-label">Editor / Asignado</label>
                <input 
                  type="text" 
                  className="hub-form-input" 
                  placeholder="Andrés V. / Claude Code"
                  value={assignee} 
                  onChange={(e) => setAssignee(e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARKDOWN PREVIEW */}
      {activeTab === 'preview' && (
        <div className="brief-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 className="brief-card-title" style={{ border: 'none', padding: 0, margin: 0 }}>
              <FileText size={17} color="var(--accent-primary)" />
              Vista Previa Estructurada del Brief (Listo para Claude Code)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="hub-btn hub-btn-claude" onClick={copyPromptForClaude}>
                {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                {copiedPrompt ? '¡Copiado!' : 'Copiar Texto'}
              </button>
              <button className="hub-btn" onClick={downloadMarkdownFile}>
                <Download size={14} /> Descargar .MD
              </button>
            </div>
          </div>

          <pre className="brief-markdown-preview">
            {generatedMarkdown}
          </pre>
        </div>
      )}
    </div>
  );
}
