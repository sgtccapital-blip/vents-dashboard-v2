import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, TrendingUp, Crown, ArrowRight, BrainCircuit } from 'lucide-react';

const Section = ({ icon: Icon, title, items, emptyText, tone = 'default' }) => (
  <div className="widget widget-sm bart-ops-widget">
    <div className="widget-header">
      <div className="widget-title">
        <Icon size={16} />
        {title}
      </div>
      <span className={`bart-mini-pill bart-mini-pill-${tone}`}>{items.length}</span>
    </div>
    <div className="widget-body bart-ops-list">
      {items.length === 0 ? (
        <div className="bart-empty-state">{emptyText}</div>
      ) : (
        items.map(item => (
          <div key={item.id} className="bart-ops-item">
            <div className="bart-ops-item-main">{item.title}</div>
            {item.subtitle && <div className="bart-ops-item-sub">{item.subtitle}</div>}
          </div>
        ))
      )}
    </div>
  </div>
);

export default function BartOpsOverview({ dailyPanel, decisionInbox, focusMode }) {
  return (
    <>
      <div className="widget widget-lg bart-focus-widget">
        <div className="widget-header">
          <div className="widget-title">
            <Crown size={16} />
            Bart Decision Layer
          </div>
          <span className="tag tag-active">{focusMode.activeMode} MODE</span>
        </div>
        <div className="widget-body">
          <div className="bart-focus-grid">
            <div className="bart-focus-card">
              <div className="bart-focus-label">Top priorities</div>
              <div className="bart-focus-value">{dailyPanel.topPriorities.length}</div>
            </div>
            <div className="bart-focus-card">
              <div className="bart-focus-label">Critical decisions</div>
              <div className="bart-focus-value">{decisionInbox.filter(d => d.priority === 'P1').length}</div>
            </div>
            <div className="bart-focus-card">
              <div className="bart-focus-label">Overdue items</div>
              <div className="bart-focus-value">{dailyPanel.overdue.length}</div>
            </div>
            <div className="bart-focus-card">
              <div className="bart-focus-label">Main focus</div>
              <div className="bart-focus-value bart-focus-value-sm">{focusMode.activeMode}</div>
            </div>
          </div>

          <div className="bart-decision-stack">
            {decisionInbox.slice(0, 4).map(item => (
              <div key={item.id} className="bart-decision-item">
                <div>
                  <div className="bart-decision-title">{item.title}</div>
                  <div className="bart-decision-summary">{item.summary}</div>
                </div>
                <div className="bart-decision-meta">
                  <span className={`bart-priority bart-priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            ))}
            {decisionInbox.length === 0 && (
              <div className="bart-empty-state">Sin decisiones críticas abiertas.</div>
            )}
          </div>
        </div>
      </div>

      <Section
        icon={TrendingUp}
        title="Daily Priorities"
        items={dailyPanel.topPriorities}
        emptyText="No hay prioridades urgentes cargadas."
        tone="blue"
      />
      <Section
        icon={ShieldAlert}
        title="Top Risks"
        items={dailyPanel.topRisks}
        emptyText="Sin riesgos rojos ahora mismo."
        tone="red"
      />
      <Section
        icon={BrainCircuit}
        title="Opportunities"
        items={dailyPanel.topOpportunities}
        emptyText="No hay oportunidades destacadas todavía."
        tone="purple"
      />
      <Section
        icon={AlertTriangle}
        title="Overdue / Stale"
        items={dailyPanel.overdue}
        emptyText="Nada vencido. Milagro raro, pero bueno."
        tone="yellow"
      />
    </>
  );
}
