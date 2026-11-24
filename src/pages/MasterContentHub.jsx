import React, { useState, useMemo } from 'react';
import { 
  Film, Sparkles, Scissors, Calendar, Plus, Search, Filter, 
  Grid, List, CheckCircle2, Clock, AlertCircle, Play, Eye, 
  TrendingUp, Trash2, Edit3, ChevronRight, Terminal, Sliders, ExternalLink, RefreshCw, Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NewContentModal from '../components/contentHub/NewContentModal';
import ClaudeBridgeModal from '../components/contentHub/ClaudeBridgeModal';
import MotionGraphicsHub from '../components/contentHub/MotionGraphicsHub';
import ClippingHub from '../components/contentHub/ClippingHub';
import '../components/contentHub/ContentHub.css';

export default function MasterContentHub() {
  const navigate = useNavigate();
  const { contentTasks, socialMedia, updateContentTask, deleteContentTask } = useApp();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'motion' | 'clipping' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalCategory, setNewModalCategory] = useState('video');
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = contentTasks.length;
    const shooting = contentTasks.filter(t => t.status === 'shooting').length;
    const editing = contentTasks.filter(t => t.status === 'editing').length;
    const ready = contentTasks.filter(t => t.status === 'ready').length;
    const published = contentTasks.filter(t => t.status === 'published').length;
    const motionCount = contentTasks.filter(t => t.hubCategory === 'motion_graphics' || (t.format && t.format.includes('Motion'))).length;
    const clippingCount = contentTasks.filter(t => t.hubCategory === 'clipping' || (t.format && t.format.includes('Clip'))).length;

    return { total, shooting, editing, ready, published, motionCount, clippingCount };
  }, [contentTasks]);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return contentTasks.filter(task => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesAccount = task.accountHandler?.toLowerCase().includes(query);
        const matchesPillar = task.pillar?.toLowerCase().includes(query);
        const matchesHook = task.hookVerbal?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesAccount && !matchesPillar && !matchesHook) return false;
      }

      // Account
      if (selectedAccount !== 'ALL' && task.accountId !== selectedAccount) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && task.status !== selectedStatus) {
        return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && (task.hubCategory || 'video') !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [contentTasks, searchQuery, selectedAccount, selectedStatus, selectedCategory]);

  const handleStatusChange = async (taskId, newStatus) => {
    if (updateContentTask) {
      await updateContentTask(taskId, { status: newStatus });
    }
  };

  const handleDeleteTask = async (taskId, title) => {
    if (window.confirm(`¿Estás seguro de eliminar "${title}"?`)) {
      if (deleteContentTask) {
        await deleteContentTask(taskId);
      }
    }
  };

  return (
    <div className="content-hub-container">
      {/* Top Header */}
      <div className="hub-header">
        <div className="hub-title-area">
          <h1>
            <Film size={26} color="var(--accent-primary)" />
            Master Content Hub
            <span className="hub-title-badge">Production OS</span>
          </h1>
          <p className="hub-subtitle">
            Control integral de videos, reels, proyectos audiovisuales y ecosistemas de contenido de todas las marcas.
          </p>
        </div>

        <div className="hub-header-actions">
          <button 
            className="hub-btn hub-btn-claude"
            onClick={() => setIsBridgeModalOpen(true)}
            title="Sincronizar y conectar con Claude Code"
          >
            <Cpu size={15} />
            Puente Claude Code
          </button>

          <button 
            className="hub-btn"
            onClick={() => navigate('/creative-brief')}
          >
            <Sparkles size={15} color="var(--accent-primary)" />
            Creative Brief
          </button>

          <button 
            className="hub-btn"
            onClick={() => navigate('/production-calendar')}
          >
            <Calendar size={15} color="#34d399" />
            Production Calendar
          </button>

          <button 
            className="hub-btn hub-btn-primary"
            onClick={() => {
              setNewModalCategory(activeTab === 'motion' ? 'motion_graphics' : activeTab === 'clipping' ? 'clipping' : 'video');
              setIsNewModalOpen(true);
            }}
          >
            <Plus size={16} />
            Nuevo Video / Proyecto
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="hub-metrics-grid">
        <div className="hub-metric-card">
          <div className="hub-metric-icon purple">
            <Film size={22} />
          </div>
          <div className="hub-metric-info">
            <span className="hub-metric-value">{metrics.total}</span>
            <span className="hub-metric-label">Total Videos & Proyectos</span>
          </div>
        </div>

        <div className="hub-metric-card">
          <div className="hub-metric-icon red">
            <Play size={22} />
          </div>
          <div className="hub-metric-info">
            <span className="hub-metric-value">{metrics.shooting}</span>
            <span className="hub-metric-label">En Rodaje / Por Grabar</span>
          </div>
        </div>

        <div className="hub-metric-card">
          <div className="hub-metric-icon blue">
            <Scissors size={22} />
          </div>
          <div className="hub-metric-info">
            <span className="hub-metric-value">{metrics.editing}</span>
            <span className="hub-metric-label">En Edición & Post</span>
          </div>
        </div>

        <div className="hub-metric-card">
          <div className="hub-metric-icon amber">
            <CheckCircle2 size={22} />
          </div>
          <div className="hub-metric-info">
            <span className="hub-metric-value">{metrics.ready}</span>
            <span className="hub-metric-label">Listos / Aprobados</span>
          </div>
        </div>

        <div className="hub-metric-card">
          <div className="hub-metric-icon green">
            <TrendingUp size={22} />
          </div>
          <div className="hub-metric-info">
            <span className="hub-metric-value">{metrics.published}</span>
            <span className="hub-metric-label">Publicados</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="hub-tabs-bar">
        <div className="hub-tabs-list">
          <button 
            className={`hub-tab-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Film size={15} />
            Todos los Videos & Proyectos
            <span className="hub-tab-badge">{contentTasks.length}</span>
          </button>

          <button 
            className={`hub-tab-item ${activeTab === 'motion' ? 'active' : ''}`}
            onClick={() => setActiveTab('motion')}
          >
            <Sparkles size={15} />
            Motion Graphics Hub
            <span className="hub-tab-badge">{metrics.motionCount}</span>
          </button>

          <button 
            className={`hub-tab-item ${activeTab === 'clipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('clipping')}
          >
            <Scissors size={15} />
            Clipping Hub
            <span className="hub-tab-badge">{metrics.clippingCount}</span>
          </button>

          <button 
            className={`hub-tab-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={15} />
            Pipeline & Métricas
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="hub-view-toggles">
            <button 
              className={`hub-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista en Cards"
            >
              <Grid size={15} />
            </button>
            <button 
              className={`hub-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista en Tabla"
            >
              <List size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Motion Graphics Hub View */}
      {activeTab === 'motion' && (
        <MotionGraphicsHub 
          tasks={contentTasks}
          onNewMotion={() => {
            setNewModalCategory('motion_graphics');
            setIsNewModalOpen(true);
          }}
          onOpenBridge={() => setIsBridgeModalOpen(true)}
        />
      )}

      {/* Clipping Hub View */}
      {activeTab === 'clipping' && (
        <ClippingHub 
          tasks={contentTasks}
          onNewClip={() => {
            setNewModalCategory('clipping');
            setIsNewModalOpen(true);
          }}
          onOpenBridge={() => setIsBridgeModalOpen(true)}
        />
      )}

      {/* Analytics View */}
      {activeTab === 'analytics' && (
        <div className="integration-hub-view">
          <div className="integration-hero-card">
            <div className="integration-hero-info">
              <span className="integration-hero-badge motion">
                <TrendingUp size={13} /> Métricas de Producción & Pipeline
              </span>
              <h2>Distribución y Rendimiento de Contenido</h2>
              <p>
                Visión estratégica del funnel de producción audiovisual: desde ideas y guiones hasta grabaciones completadas, edición y piezas publicadas por marca.
              </p>
            </div>
          </div>

          <div className="hub-metrics-grid">
            <div className="hub-metric-card">
              <div className="hub-metric-icon purple"><Film size={22} /></div>
              <div className="hub-metric-info">
                <span className="hub-metric-value">{Math.round((metrics.published / (metrics.total || 1)) * 100)}%</span>
                <span className="hub-metric-label">Tasa de Publicación</span>
              </div>
            </div>
            <div className="hub-metric-card">
              <div className="hub-metric-icon cyan"><Sparkles size={22} /></div>
              <div className="hub-metric-info">
                <span className="hub-metric-value">{metrics.motionCount}</span>
                <span className="hub-metric-label">Proyectos Motion</span>
              </div>
            </div>
            <div className="hub-metric-card">
              <div className="hub-metric-icon amber"><Scissors size={22} /></div>
              <div className="hub-metric-info">
                <span className="hub-metric-value">{metrics.clippingCount}</span>
                <span className="hub-metric-label">Clips Repurposed</span>
              </div>
            </div>
            <div className="hub-metric-card">
              <div className="hub-metric-icon green"><Calendar size={22} /></div>
              <div className="hub-metric-info">
                <span className="hub-metric-value">{contentTasks.filter(t => t.shootingDate).length}</span>
                <span className="hub-metric-label">Rodajes Programados</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Videos & Projects View */}
      {activeTab === 'all' && (
        <>
          {/* Controls Bar */}
          <div className="hub-controls-bar">
            <div className="hub-search-wrapper">
              <Search className="hub-search-icon" size={16} />
              <input
                type="text"
                className="hub-search-input"
                placeholder="Buscar video, gancho, cuenta o pilar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="hub-filter-group">
              <select
                className="hub-select"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="ALL">Todas las Cuentas</option>
                {socialMedia.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.handler || s.accountName || s.id}
                  </option>
                ))}
              </select>

              <select
                className="hub-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="video">🎬 Videos / Reels</option>
                <option value="motion_graphics">⚡ Motion Graphics</option>
                <option value="clipping">✂️ Clipping Hub</option>
              </select>

              <select
                className="hub-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="idea">💡 Ideas</option>
                <option value="script">📝 Guion / Brief</option>
                <option value="shooting">🎥 Por Grabar</option>
                <option value="editing">✂️ En Edición</option>
                <option value="ready">✅ Listos</option>
                <option value="published">🚀 Publicados</option>
              </select>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <>
              {filteredTasks.length === 0 ? (
                <div className="hub-empty-state">
                  <div className="hub-empty-icon">
                    <Film size={28} />
                  </div>
                  <h3>No se encontraron videos</h3>
                  <p>Ajusta los filtros de búsqueda o crea un nuevo video o proyecto audiovisual.</p>
                  <button 
                    className="hub-btn hub-btn-primary"
                    onClick={() => {
                      setNewModalCategory('video');
                      setIsNewModalOpen(true);
                    }}
                  >
                    <Plus size={15} /> Crear Nuevo Video
                  </button>
                </div>
              ) : (
                <div className="hub-cards-grid">
                  {filteredTasks.map(task => {
                    const cat = task.hubCategory || 'video';
                    return (
                      <div key={task.id} className="hub-card">
                        <div className="hub-card-header">
                          <div className="hub-card-badges">
                            <span className={`badge-category ${cat}`}>
                              {cat === 'motion_graphics' ? <Sparkles size={11} /> : cat === 'clipping' ? <Scissors size={11} /> : <Film size={11} />}
                              {cat === 'motion_graphics' ? 'Motion' : cat === 'clipping' ? 'Clip' : 'Video'}
                            </span>
                            <span className="badge-format">{task.format}</span>
                            <span className={`badge-priority ${task.priority || 'normal'}`}>
                              {task.priority || 'normal'}
                            </span>
                          </div>

                          <select
                            className={`status-pill ${task.status || 'idea'}`}
                            value={task.status || 'idea'}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="idea">💡 Idea</option>
                            <option value="script">📝 Guion</option>
                            <option value="shooting">🎥 Grabación</option>
                            <option value="editing">✂️ Edición</option>
                            <option value="ready">✅ Listo</option>
                            <option value="published">🚀 Publicado</option>
                          </select>
                        </div>

                        <div className="hub-card-body">
                          <div className="hub-card-account">
                            {task.accountHandler} · {task.pillar || 'Contenido'}
                          </div>

                          <h3 
                            className="hub-card-title"
                            onClick={() => navigate(`/creative-brief?id=${task.id}`)}
                          >
                            {task.title}
                          </h3>

                          {(task.hookVerbal || task.hookVisual) && (
                            <div className="hub-card-hook">
                              {task.hookVerbal ? `"${task.hookVerbal}"` : task.hookVisual}
                            </div>
                          )}

                          <div className="hub-card-milestones">
                            {task.shootingDate && (
                              <div className="milestone-row">
                                <span className="milestone-label">🎥 Grabación:</span>
                                <span className="milestone-date">{task.shootingDate}</span>
                              </div>
                            )}
                            {task.editDeadline && (
                              <div className="milestone-row">
                                <span className="milestone-label">✂️ Edición:</span>
                                <span className="milestone-date">{task.editDeadline}</span>
                              </div>
                            )}
                            {task.deliveryDate && (
                              <div className="milestone-row">
                                <span className="milestone-label">📦 Entrega:</span>
                                <span className="milestone-date active">{task.deliveryDate}</span>
                              </div>
                            )}
                            {task.publishDate && (
                              <div className="milestone-row">
                                <span className="milestone-label">🚀 Publicación:</span>
                                <span className="milestone-date active">{task.publishDate}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="hub-card-footer">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                              className="hub-action-btn"
                              style={{ padding: '6px 8px' }}
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              title="Eliminar Video"
                            >
                              <Trash2 size={13} color="#f87171" />
                            </button>
                            <button 
                              className="hub-action-btn"
                              style={{ padding: '6px 8px' }}
                              onClick={() => navigate(`/production-calendar`)}
                              title="Ver en Production Calendar"
                            >
                              <Calendar size={13} color="#60a5fa" />
                            </button>
                          </div>

                          <button 
                            className="hub-action-btn primary"
                            onClick={() => navigate(`/creative-brief?id=${task.id}`)}
                          >
                            <Sparkles size={13} />
                            Creative Brief
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="hub-table-wrapper">
              <table className="hub-table">
                <thead>
                  <tr>
                    <th>Video / Proyecto</th>
                    <th>Cuenta / Marca</th>
                    <th>Categoría & Formato</th>
                    <th>Estado</th>
                    <th>Grabación</th>
                    <th>Edición</th>
                    <th>Publicación</th>
                    <th>Asignado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const cat = task.hubCategory || 'video';
                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="table-title-cell">
                            <span 
                              className="table-title-main"
                              onClick={() => navigate(`/creative-brief?id=${task.id}`)}
                            >
                              {task.title}
                            </span>
                            <span className="table-title-sub">
                              {task.pillar || 'General'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '12px' }}>
                            {task.accountHandler}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`badge-category ${cat}`}>
                              {cat === 'motion_graphics' ? 'Motion' : cat === 'clipping' ? 'Clip' : 'Video'}
                            </span>
                            <span className="badge-format">{task.format}</span>
                          </div>
                        </td>
                        <td>
                          <select
                            className={`status-pill ${task.status || 'idea'}`}
                            value={task.status || 'idea'}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="idea">Idea</option>
                            <option value="script">Guion</option>
                            <option value="shooting">Grabación</option>
                            <option value="editing">Edición</option>
                            <option value="ready">Listo</option>
                            <option value="published">Publicado</option>
                          </select>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: task.shootingDate ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                            {task.shootingDate || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: task.editDeadline ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                            {task.editDeadline || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: task.publishDate ? '#34d399' : 'var(--text-tertiary)', fontWeight: 600 }}>
                            {task.publishDate || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {task.assignee || 'Equipo'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                              className="hub-action-btn primary"
                              style={{ padding: '5px 10px', fontSize: '11.5px' }}
                              onClick={() => navigate(`/creative-brief?id=${task.id}`)}
                            >
                              Brief
                            </button>
                            <button 
                              className="hub-action-btn"
                              style={{ padding: '5px 8px' }}
                              onClick={() => handleDeleteTask(task.id, task.title)}
                            >
                              <Trash2 size={12} color="#f87171" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* New Content Modal */}
      <NewContentModal 
        isOpen={isNewModalOpen}
        initialCategory={newModalCategory}
        onClose={() => setIsNewModalOpen(false)}
      />

      {/* Claude Bridge Modal */}
      <ClaudeBridgeModal 
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
      />
    </div>
  );
}
