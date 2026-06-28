import React, { useState, useEffect } from 'react';
import { AlertTriangle, Ghost, Clock, UserX, PhoneOff, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const severityConfig = {
  high: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', label: 'Critical' },
  medium: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', label: 'Warning' },
  low: { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.25)', label: 'Info' },
};

export default function GhostingAlerts({ apiHost }) {
  const [alerts, setAlerts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${apiHost}/recruiter/queue`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) {
      console.error("Failed to load alerts:", e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const handleActOn = async (alert) => {
    console.log('Acting on alert:', alert.id);
    // Dismiss locally after executing
    handleDismiss(alert.id);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAlerts();
    setTimeout(() => setLoading(false), 600);
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));
  const highCount = visibleAlerts.filter(a => a.severity === 'high').length;
  const medCount = visibleAlerts.filter(a => a.severity === 'medium').length;

  return (
    <div className="alerts-page">
      {/* Summary Strip */}
      <div className="alerts-summary glass-panel">
        <div className="alerts-summary-item">
          <AlertTriangle size={18} color="#EF4444" />
          <span><strong>{highCount}</strong> critical alerts</span>
        </div>
        <div className="alerts-summary-item">
          <Clock size={18} color="#F59E0B" />
          <span><strong>{medCount}</strong> warnings</span>
        </div>
        <div className="alerts-summary-item" style={{ cursor: 'pointer' }} onClick={handleRefresh}>
          <RefreshCw size={14} className={loading ? "spin" : ""} style={{ color: 'var(--text-muted)' }} />
          <span>{loading ? "Refreshing..." : "Auto-refresh active"}</span>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="alerts-list">
        <AnimatePresence>
          {visibleAlerts.map((alert, idx) => {
            const severity = alert.severity || 'low';
            const cfg = severityConfig[severity];
            const isExpanded = expandedId === alert.id;

            // Determine suggested action
            let suggestedAction = "Direct outreach recommended. Check last communication status.";
            let Icon = AlertTriangle;
            
            const lowerType = (alert.type || '').toLowerCase();
            if (lowerType.includes('ghost')) {
              suggestedAction = "Initiate follow-up outreach with urgency. Verify candidate placement status.";
              Icon = Ghost;
            } else if (lowerType.includes('sla')) {
              suggestedAction = "Submit additional candidates to meet SLA target count before deadline.";
              Icon = Clock;
            } else if (lowerType.includes('cold') || lowerType.includes('client')) {
              suggestedAction = "Contact client directly to request feedback on submitted candidates.";
              Icon = UserX;
            }

            // Extract candidate name if possible
            let candName = "N/A";
            const match = alert.message.match(/Candidate '([^']+)'/);
            if (match) {
              candName = match[1];
            }

            // Format relative time if timestamp is ISO
            let timeStr = "Just now";
            if (alert.timestamp) {
              try {
                const diffMs = new Date() - new Date(alert.timestamp);
                const diffMin = Math.floor(diffMs / 60000);
                if (diffMin > 0) {
                  timeStr = diffMin < 60 ? `${diffMin}m ago` : `${Math.floor(diffMin / 60)}h ago`;
                }
              } catch (err) {}
            }

            return (
              <motion.div
                key={alert.id}
                className="alert-card glass-panel"
                style={{ borderLeft: `4px solid ${cfg.color}` }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="alert-card-header" onClick={() => setExpandedId(isExpanded ? null : alert.id)}>
                  <div className="alert-card-icon" style={{ background: cfg.bg, color: cfg.color }}>
                    <Icon size={20} />
                  </div>
                  <div className="alert-card-info">
                    <div className="alert-card-top">
                      <h4>{alert.title}</h4>
                      <span className="alert-severity-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="alert-card-meta">
                      {candName !== 'N/A' && <span>Candidate: {candName} · </span>}
                      Client: {alert.client_id || 'Global'}
                    </p>
                  </div>
                  <span className="alert-time">{timeStr}</span>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="alert-card-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <p className="alert-message">{alert.message}</p>
                      <div className="alert-suggestion">
                        <Sparkles size={14} />
                        <span><strong>AI Suggested Action:</strong> {suggestedAction}</span>
                      </div>
                      <div className="alert-actions">
                        <button className="btn btn-approve" style={{ flex: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => handleActOn(alert)}>
                          <Mail size={14} /> Execute Action
                        </button>
                        <button className="btn btn-edit" style={{ flex: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => handleDismiss(alert.id)}>
                          Dismiss
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {visibleAlerts.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--brand-success)' }} />
            All clear — no active ghosting or silence alerts.
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkles({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>;
}

function CheckCircle({ size, style }) {
  return <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>;
}
