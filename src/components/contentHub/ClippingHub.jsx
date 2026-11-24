import React, { useState } from 'react';
import { 
  Scissors, Play, Film, Plus, Terminal, ExternalLink, 
  CheckCircle, Clock, Copy, Check, ChevronRight, Mic, Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClippingHub({ tasks, onNewClip, onOpenTask, onOpenBridge }) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);

  const clippingTasks = tasks.filter(t => 
    t.hubCategory === 'clipping' || 
    (t.format && t.format.toLowerCase().includes('clip')) ||
    t.clippingSpecs != null
  );

  const copyClipCommand = (task) => {
    const start = task.clippingSpecs?.sourceTimestampStart || '00:00';
    const end = task.clippingSpecs?.sourceTimestampEnd || '00:45';
    const cmd = `# Recorte con ffmpeg para clip vertical\nffmpeg -ss ${start} -to ${end} -i raw_source.mp4 -vf "crop=ih*(9/16):ih" -c:a copy out/${task.id}.mp4`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(task.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="integration-hub-view">
      {/* Hero Banner */}
      <div className="integration-hero-card">
        <div className="integration-hero-info">
          <span className="integration-hero-badge clipping">
            <Scissors size={13} /> Clipping Engine & Long-to-Short Repurposing
          </span>
          <h2>Hub de Clipping (Conectado con Claude)</h2>
          <p>
            Plataforma para reciclar y transformar material largo (podcasts, sets de DJs en vivo, grabaciones de eventos en Casco Antiguo y conferencias) en clips verticales 9:16 de alto impacto viral con transcripción Whisper, auto-reframe y subtitulado dinámico.
          </p>
          <div className="integration-bridge-snippet">
            <span>Workflow: <code>Drive Raw / Podcast</code> → <code>Whisper AI</code> → <code>Auto-crop 9:16</code> → <code>Claude Post</code></span>
            <button className="hub-btn hub-btn-claude" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={onOpenBridge}>
              <Terminal size={12} /> Estado de Claude
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="hub-btn hub-btn-primary" onClick={onNewClip}>
            <Plus size={15} /> Nuevo Clip
          </button>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="integration-pipeline-steps">
        <div className="pipeline-step-box">
          <span className="pipeline-step-num">Paso 1: Detección</span>
          <span className="pipeline-step-title">Hooks & Timestamps</span>
          <p className="pipeline-step-desc">Identifica los mejores 30-60s de debate, controversia o revelaciones de valor.</p>
        </div>
        <div className="pipeline-step-box">
          <span className="pipeline-step-num">Paso 2: Whisper AI</span>
          <span className="pipeline-step-title">Subtítulos Hormozi</span>
          <p className="pipeline-step-desc">Transcripción palabra por palabra con emojis y resaltados dinámicos.</p>
        </div>
        <div className="pipeline-step-box">
          <span className="pipeline-step-num">Paso 3: Auto Reframe</span>
          <span className="pipeline-step-title">Formato 9:16 Vertical</span>
          <p className="pipeline-step-desc">Seguimiento de rostro de oradores con B-rolls de apoyo intercalados.</p>
        </div>
      </div>

      {/* Clipping Projects List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
          Clips & Píldoras Virales en Proceso ({clippingTasks.length})
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Optimizado para TikTok, Reels & Shorts
        </span>
      </div>

      {clippingTasks.length === 0 ? (
        <div className="hub-empty-state">
          <div className="hub-empty-icon">
            <Scissors size={28} />
          </div>
          <h3>No hay clips registrados en el Hub</h3>
          <p>
            Crea tu primer clip o sincroniza las píldoras que estás procesando desde Claude Code.
          </p>
          <button className="hub-btn hub-btn-primary" onClick={onNewClip}>
            <Plus size={15} /> Registrar Nuevo Clip
          </button>
        </div>
      ) : (
        <div className="hub-cards-grid">
          {clippingTasks.map(task => (
            <div key={task.id} className="hub-card">
              <div className="hub-card-header">
                <div className="hub-card-badges">
                  <span className="badge-category clipping">
                    <Scissors size={11} /> Viral Clip
                  </span>
                  <span className="badge-format">{task.format || '9:16'}</span>
                  <span className={`badge-priority ${task.priority || 'normal'}`}>
                    {task.priority || 'normal'}
                  </span>
                </div>
                <span className={`status-pill ${task.status || 'idea'}`}>
                  {task.status}
                </span>
              </div>

              <div className="hub-card-body">
                <div className="hub-card-account">
                  {task.accountHandler || '@Arrive.models'}
                </div>
                <h4 
                  className="hub-card-title" 
                  onClick={() => navigate(`/creative-brief?id=${task.id}`)}
                >
                  {task.title}
                </h4>

                {task.hookVerbal && (
                  <div className="hub-card-hook">
                    <strong>Gancho:</strong> "{task.hookVerbal}"
                  </div>
                )}

                {task.clippingSpecs && (
                  <div style={{ 
                    background: 'rgba(245, 158, 11, 0.08)', 
                    border: '1px solid rgba(245, 158, 11, 0.25)', 
                    borderRadius: '8px', 
                    padding: '10px', 
                    fontSize: '11.5px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div>
                      <strong style={{ color: '#fbbf24' }}>Timestamps:</strong> {task.clippingSpecs.sourceTimestampStart || '00:00'} → {task.clippingSpecs.sourceTimestampEnd || '00:45'}
                    </div>
                    {task.clippingSpecs.sourceTitle && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Fuente:</strong> {task.clippingSpecs.sourceTitle}
                      </div>
                    )}
                    {task.clippingSpecs.viralFactor && (
                      <div style={{ color: '#34d399', fontSize: '11px' }}>
                        ★ {task.clippingSpecs.viralFactor}
                      </div>
                    )}
                  </div>
                )}

                <div className="hub-card-milestones">
                  {task.editDeadline && (
                    <div className="milestone-row">
                      <span className="milestone-label">Deadline Edición:</span>
                      <span className="milestone-date">{task.editDeadline}</span>
                    </div>
                  )}
                  {task.publishDate && (
                    <div className="milestone-row">
                      <span className="milestone-label">Publicación:</span>
                      <span className="milestone-date active">{task.publishDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="hub-card-footer">
                <button 
                  className="hub-action-btn"
                  onClick={() => copyClipCommand(task)}
                  title="Copiar comando ffmpeg de corte"
                >
                  {copiedId === task.id ? <Check size={12} color="#34d399" /> : <Terminal size={12} />}
                  {copiedId === task.id ? 'Copiado' : 'ffmpeg Trim'}
                </button>
                <div className="hub-card-actions">
                  <button 
                    className="hub-action-btn primary"
                    onClick={() => navigate(`/creative-brief?id=${task.id}`)}
                  >
                    Brief Técnico <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
