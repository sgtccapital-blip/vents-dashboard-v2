import React, { useState } from 'react';
import { 
  Sparkles, Layers, Play, Film, Code2, Plus, Terminal, 
  ExternalLink, CheckCircle, Clock, Copy, Check, ChevronRight, Wand2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MotionGraphicsHub({ tasks, onNewMotion, onOpenTask, onOpenBridge }) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);

  const motionTasks = tasks.filter(t => 
    t.hubCategory === 'motion_graphics' || 
    (t.format && t.format.toLowerCase().includes('motion')) ||
    t.motionSpecs != null
  );

  const copyRemotionCommand = (task) => {
    const comp = task.motionSpecs?.remotionComposition || 'MainComposition';
    const cmd = `cd studio && npx remotion render src/index.ts ${comp} out/${task.id}.mp4`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(task.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="integration-hub-view">
      {/* Hero Banner */}
      <div className="integration-hero-card">
        <div className="integration-hero-info">
          <span className="integration-hero-badge motion">
            <Sparkles size={13} /> Motion Graphics Studio & Remotion Engine
          </span>
          <h2>Hub de Motion Graphics (Conectado con Claude)</h2>
          <p>
            Control central para identidades visuales animadas, lower thirds, intros cibernéticas, tipografía cinética y templates de Remotion. Puedes desarrollar los componentes visuales en Claude Code y visualizarlos o lanzarlos directamente desde este dashboard.
          </p>
          <div className="integration-bridge-snippet">
            <span>Remotion Pipeline: <code>studio/remotion/</code> · Tokens: <code>brands/*/tokens.css</code></span>
            <button className="hub-btn hub-btn-claude" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={onOpenBridge}>
              <Terminal size={12} /> Estado de Claude
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="hub-btn hub-btn-primary" onClick={onNewMotion}>
            <Plus size={15} /> Nuevo Proyecto Motion
          </button>
        </div>
      </div>

      {/* Templates & Pipeline Info */}
      <div className="integration-pipeline-steps">
        <div className="pipeline-step-box">
          <span className="pipeline-step-num">Remotion Comps</span>
          <span className="pipeline-step-title">Plantillas Dinámicas</span>
          <p className="pipeline-step-desc">Glitch neón, typography kinetics, intros de marca y transiciones 60fps.</p>
        </div>
        <div className="pipeline-step-box">
          <span className="pipeline-step-num">Tokens de Marca</span>
          <span className="pipeline-step-title">Brand DNA Sync</span>
          <p className="pipeline-step-desc">Paletas cromáticas y tipografías cargadas desde <code>brands/BRAND.md</code>.</p>
        </div>
        <div className="pipeline-step-box">
          <span className="pipeline-step-num">Claude Code Bridge</span>
          <span className="pipeline-step-title">Render Automático</span>
          <p className="pipeline-step-desc">Comandos CLI generados para renderizar con ffmpeg o Remotion en 1 clic.</p>
        </div>
      </div>

      {/* Motion Projects List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
          Proyectos de Motion Graphics Activos ({motionTasks.length})
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Sincronizado con Remotion & Claude
        </span>
      </div>

      {motionTasks.length === 0 ? (
        <div className="hub-empty-state">
          <div className="hub-empty-icon">
            <Layers size={28} />
          </div>
          <h3>No hay proyectos de Motion Graphics aún</h3>
          <p>
            Crea tu primer proyecto de motion graphics o impórtalo desde la sesión de Claude que estás desarrollando.
          </p>
          <button className="hub-btn hub-btn-primary" onClick={onNewMotion}>
            <Plus size={15} /> Crear Primer Proyecto Motion
          </button>
        </div>
      ) : (
        <div className="hub-cards-grid">
          {motionTasks.map(task => (
            <div key={task.id} className="hub-card">
              <div className="hub-card-header">
                <div className="hub-card-badges">
                  <span className="badge-category motion_graphics">
                    <Sparkles size={11} /> Motion FX
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

                {task.hookVisual && (
                  <div className="hub-card-hook">
                    <strong>Visual FX:</strong> {task.hookVisual}
                  </div>
                )}

                {task.motionSpecs && (
                  <div style={{ 
                    background: 'rgba(124, 92, 252, 0.08)', 
                    border: '1px solid rgba(124, 92, 252, 0.2)', 
                    borderRadius: '8px', 
                    padding: '10px', 
                    fontSize: '11.5px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div><strong style={{ color: '#c084fc' }}>Template:</strong> {task.motionSpecs.template}</div>
                    <div><strong style={{ color: '#c084fc' }}>Composición:</strong> {task.motionSpecs.remotionComposition || 'DefaultComp'}</div>
                    {task.motionSpecs.claudeEngineStatus && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Estado Claude:</strong> {task.motionSpecs.claudeEngineStatus}
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
                  {task.deliveryDate && (
                    <div className="milestone-row">
                      <span className="milestone-label">Entrega / Review:</span>
                      <span className="milestone-date active">{task.deliveryDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="hub-card-footer">
                <button 
                  className="hub-action-btn"
                  onClick={() => copyRemotionCommand(task)}
                  title="Copiar comando de render para Claude / Terminal"
                >
                  {copiedId === task.id ? <Check size={12} color="#34d399" /> : <Terminal size={12} />}
                  {copiedId === task.id ? 'Copiado' : 'CLI Render'}
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
