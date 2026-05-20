import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import CloudSyncPanel from './components/CloudSyncPanel';
import { X } from 'lucide-react';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import React from 'react';
import Eventos from './pages/Eventos';
import EventoDetail from './pages/EventoDetail';
import SocialMedia from './pages/SocialMedia';
import MasterCalendar from './pages/MasterCalendar';

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

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);

  return (
    <div className="app-layout">
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/calendar" element={<MasterCalendar />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/eventos/:id" element={<EventoDetail />} />
            <Route path="/social" element={<SocialMedia />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ErrorBoundary>
      </div>

      {/* Cloud Sync Side-over Modal */}
      <CloudSyncPanel isOpen={cloudSyncOpen} onClose={() => setCloudSyncOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
