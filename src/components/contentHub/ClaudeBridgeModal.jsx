import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, Terminal, Code2, Download, Upload, Cpu, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ClaudeBridgeModal({ isOpen, onClose }) {
  const { contentTasks, addContentTask } = useApp();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');

  if (!isOpen) return null;

  const claudePrompt = `Hola Claude. Estamos integrando el Hub de Motion Graphics y el Hub de Clipping con el Command Center Dashboard.

El dashboard tiene implementado el Master Content Hub con soporte nativo para 'hubCategory': 'motion_graphics' y 'hubCategory': 'clipping'.
La API REST local está corriendo en:
- Endpoint: http://localhost:8090/api/contentTasks
- Base de datos local: ./db.json (campo 'contentTasks')

Por favor exporta/sincroniza los proyectos de Motion Graphics y Clipping que hemos desarrollado hacia esta colección respetando la estructura con:
- id, title, accountId, accountHandler, hubCategory ('motion_graphics' | 'clipping' | 'video')
- format, status, priority, hookVerbal, hookVisual, storyline
- specs: { resolution, fps, aspectRatio, codec, audioTarget }
- motionSpecs: { template, motionNotes, lowerThird, animatedTitle, brandKitApplied, remotionComposition }
- clippingSpecs: { sourceTitle, sourceUrl, sourceTimestampStart, sourceTimestampEnd, speaker, viralFactor, captionsStyle }
- edl: array de escenas [{ order, scene, inOut, visualAction, voiceover, overlayText, transition, soundFx }]
- shootingDate, editDeadline, deliveryDate, publishDate, assignee`;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(claudePrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const copyCurrentJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(contentTasks, null, 2));
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      let added = 0;
      for (const item of items) {
        if (item.title) {
          const formatted = {
            ...item,
            id: item.id || `ct-claude-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            hubCategory: item.hubCategory || 'video'
          };
          if (addContentTask) {
            await addContentTask(formatted);
            added++;
          }
        }
      }
      setImportStatus(`¡Éxito! ${added} proyecto(s) importados correctamente al Dashboard.`);
      setImportText('');
    } catch (err) {
      setImportStatus(`Error al parsear JSON: ${err.message}`);
    }
  };

  return (
    <div className="hub-modal-overlay" onClick={onClose}>
      <div className="hub-modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-header">
          <h2>
            <Cpu size={22} color="#f59e0b" />
            Puente de Integración con Claude Code
          </h2>
          <button className="hub-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hub-modal-body">
          <div className="claude-integration-banner" style={{ margin: 0 }}>
            <div className="claude-banner-left">
              <div className="claude-banner-icon">
                <Terminal size={22} />
              </div>
              <div className="claude-banner-text">
                <h3>Conecta tus proyectos de Motion Graphics & Clipping</h3>
                <p>Usa este puente para que Claude Code monte directamente los proyectos en el Master Content Hub.</p>
              </div>
            </div>
            <button className="hub-btn hub-btn-claude" onClick={copyPrompt}>
              {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
              {copiedPrompt ? 'Copiado al Portapapeles' : 'Copiar Prompt para Claude'}
            </button>
          </div>

          <div className="integration-pipeline-steps">
            <div className="pipeline-step-box">
              <span className="pipeline-step-num">Paso 1</span>
              <span className="pipeline-step-title">Copia el Prompt</span>
              <p className="pipeline-step-desc">Pásale las especificaciones a Claude Code en la otra ventana o terminal.</p>
            </div>
            <div className="pipeline-step-box">
              <span className="pipeline-step-num">Paso 2</span>
              <span className="pipeline-step-title">Claude Genera / Conecta</span>
              <p className="pipeline-step-desc">Claude puede hacer POST a <code style={{ color: '#fbbf24' }}>/api/contentTasks</code> o darte el JSON.</p>
            </div>
            <div className="pipeline-step-box">
              <span className="pipeline-step-num">Paso 3</span>
              <span className="pipeline-step-title">Dashboard Unificado</span>
              <p className="pipeline-step-desc">Tus piezas aparecerán en vivo en Motion Graphics Hub, Clipping Hub y Calendario.</p>
            </div>
          </div>

          <div className="hub-form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="hub-form-label" style={{ margin: 0 }}>
                Importar Proyectos desde JSON (Pegar respuesta de Claude)
              </label>
              <button 
                type="button" 
                className="hub-btn" 
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={copyCurrentJSON}
              >
                {copiedSchema ? <Check size={12} /> : <Code2 size={12} />}
                {copiedSchema ? 'Copiado' : 'Exportar JSON Actual'}
              </button>
            </div>
            <textarea
              className="hub-form-textarea"
              rows={6}
              placeholder='[ { "title": "Mi Proyecto Remotion", "hubCategory": "motion_graphics", ... } ]'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          {importStatus && (
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: '8px', 
              fontSize: '12.5px', 
              background: importStatus.startsWith('¡Éxito') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: importStatus.startsWith('¡Éxito') ? '#34d399' : '#f87171',
              border: '1px solid ' + (importStatus.startsWith('¡Éxito') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
            }}>
              {importStatus}
            </div>
          )}
        </div>

        <div className="hub-modal-footer">
          <button type="button" className="hub-btn" onClick={onClose}>
            Cerrar
          </button>
          <button 
            type="button" 
            className="hub-btn hub-btn-primary" 
            onClick={handleImport}
            disabled={!importText.trim()}
          >
            <Upload size={14} />
            Importar al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
