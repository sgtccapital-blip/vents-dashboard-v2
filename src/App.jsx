import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import MobileTabBar from './components/Layout/MobileTabBar';
import CloudSyncPanel from './components/CloudSyncPanel';
import { X } from 'lucide-react';
import React, { lazy, Suspense } from 'react';

// Cada página se descarga solo cuando se abre (antes iba todo en un archivo de 1,1 MB)
const Home = lazy(() => import('./pages/Home'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Eventos = lazy(() => import('./pages/Eventos'));
const EventoDetail = lazy(() => import('./pages/EventoDetail'));
const SocialMedia = lazy(() => import('./pages/SocialMedia'));
const MasterCalendar = lazy(() => import('./pages/MasterCalendar'));
const AgentBrain = lazy(() => import('./pages/AgentBrain'));
const Contactos = lazy(() => import('./pages/Contactos'));
const PortfolioOS = lazy(() => import('./pages/PortfolioOS'));
const WhatsAppAgent = lazy(() => import('./pages/WhatsAppAgent'));
const ArriveAgencyOS = lazy(() => import('./pages/ArriveAgencyOS'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#fff' }}>
          <h1>Component Error</h1>
          <p>{this.state.error?.toString()}</p>
          <pre>{this.state.errorInfo?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import DashboardCopilot from './components/DashboardCopilot';

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);

  return (
    <div className={`app-layout ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className={`main-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Topbar
          collapsed={sidebarCollapsed}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          onCloudSyncToggle={() => setCloudSyncOpen(true)}
        />
        <ErrorBoundary>
          <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/arrive" element={<ArriveAgencyOS />} />
            <Route path="/portfolio" element={<PortfolioOS />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/calendar" element={<MasterCalendar />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/eventos/:id" element={<EventoDetail />} />
            <Route path="/social" element={<SocialMedia />} />
            <Route path="/contactos" element={<Contactos />} />
            <Route path="/whatsapp-agent" element={<WhatsAppAgent />} />
            <Route path="/agent-brain" element={<AgentBrain />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Navegación inferior en móvil */}
      <MobileTabBar onMenu={() => setMobileMenuOpen(true)} />

      {/* Cloud Sync Side-over Modal */}
      <CloudSyncPanel isOpen={cloudSyncOpen} onClose={() => setCloudSyncOpen(false)} />

      {/* Persistent Dashboard Copilot Agent */}
      <DashboardCopilot />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<AppLayout />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthGate>
  );
}
