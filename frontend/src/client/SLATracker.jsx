import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_SLAS = [
  { id: 'SLA-002', jobTitle: 'DevOps Lead', client: 'FinServe', deadline: new Date(Date.now() + 180000000).toISOString(), totalHours: 72, candidatesSubmitted: 1, target: 3 },
  { id: 'SLA-003', jobTitle: 'ML Engineer', client: 'AILabs', deadline: new Date(Date.now() + 90000000).toISOString(), totalHours: 72, candidatesSubmitted: 4, target: 4 },
];

export default function SLATracker({ apiHost }) {
  const [slas, setSlas] = useState([]);
  const [now, setNow] = useState(new Date());

  // Toggle state to show/hide the configuration form
  const [showAddForm, setShowAddForm] = useState(false);

  // Input states for new role SLA creation
  const [newRole, setNewRole] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDuration, setNewDuration] = useState('72');
  const [newTarget, setNewTarget] = useState('3');

  // Load custom client SLAs from local storage
  const [customSlas, setCustomSlas] = useState(() => {
    const saved = localStorage.getItem('custom_slas');
    return saved ? JSON.parse(saved) : [];
  });

  const fetchSLAs = async () => {
    try {
      const res = await fetch(`${apiHost}/client/status`);
      const data = await res.json();
      
      const activeList = [];
      if (data.job_order) {
        // Construct dynamic SLA from active backend job order
        activeList.push({
          id: data.job_order.id,
          jobTitle: data.job_order.role_name,
          client: data.job_order.client_name,
          deadline: data.job_order.sla_deadline,
          totalHours: 72,
          candidatesSubmitted: data.pipeline ? data.pipeline.length : 0,
          target: data.job_order.target_submissions || 5
        });
      }
      
      // Combine custom user-added SLAs with backend active SLAs and mock list
      setSlas([...customSlas, ...activeList, ...MOCK_SLAS]);
    } catch (e) {
      console.error("Failed to load SLAs:", e);
      setSlas([...customSlas, ...MOCK_SLAS]);
    }
  };

  useEffect(() => {
    fetchSLAs();
    const fetchInterval = setInterval(fetchSLAs, 10000);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    
    return () => {
      clearInterval(fetchInterval);
      clearInterval(clockInterval);
    };
  }, [customSlas]);

  const getTimeLeft = (deadline) => {
    const diff = new Date(deadline) - now;
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { hours, minutes, seconds, expired: false };
  };

  const getProgress = (deadline, totalHours) => {
    const diff = new Date(deadline) - now;
    const total = totalHours * 60 * 60 * 1000;
    return Math.max(0, Math.min(100, ((total - diff) / total) * 100));
  };

  const handleAddSLA = (e) => {
    e.preventDefault();
    if (!newRole || !newClient) return;

    const newSla = {
      id: `SLA-${Math.floor(100 + Math.random() * 900)}`,
      jobTitle: newRole,
      client: newClient,
      deadline: new Date(Date.now() + parseInt(newDuration) * 60 * 60 * 1000).toISOString(),
      totalHours: parseInt(newDuration),
      candidatesSubmitted: 0,
      target: parseInt(newTarget)
    };

    const updated = [newSla, ...customSlas];
    setCustomSlas(updated);
    localStorage.setItem('custom_slas', JSON.stringify(updated));

    // Sync new role to recruiter job-order registry
    fetch(`${apiHost}/recruiter/job-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newSla.id,
        role_name: newSla.jobTitle,
        client_name: newSla.client,
        jd_text: '',
        required_skills: [],
        nice_to_have_skills: [],
        budget_max: 0,
        location: 'Remote',
        duration_type: 'Full-time',
        timeline: '',
        sla_hours: newSla.totalHours,
        target_submissions: newSla.target,
        deadline: newSla.deadline,
        candidates_submitted: 0,
        source: 'manual'
      })
    }).catch(e => console.warn('Could not sync SLA to recruiter registry:', e));

    // Clear form and hide it
    setNewRole('');
    setNewClient('');
    setNewDuration('72');
    setNewTarget('3');
    setShowAddForm(false);
  };

  const handleDeleteSLA = (id) => {
    const updated = customSlas.filter(item => item.id !== id);
    setCustomSlas(updated);
    localStorage.setItem('custom_slas', JSON.stringify(updated));
  };

  return (
    <div className="sla-page">
      {/* SLA Section Header with Add Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 500 }}>
          Active SLA Performance Trackers
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-approve"
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem', fontWeight: 500, width: 'auto', flex: 'none' }}
          >
            + Configure SLA Tracker
          </button>
        )}
      </div>

      {/* Add New SLA Configuration Form */}
      {showAddForm && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--brand-primary-light)', animation: 'fadeIn 0.25s ease-out' }}>
          <h4 style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 500, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--brand-primary)" /> Configure New Role SLA Tracker
          </h4>
          <form onSubmit={handleAddSLA} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto', gap: '1rem', alignItems: 'end' }}>
            <div className="login-field" style={{ gap: '0.3rem', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Role Name</label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.55rem 0.75rem', background: 'var(--surface-1)',
                  border: '1px solid var(--outline)', borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
            <div className="login-field" style={{ gap: '0.3rem', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Company / Client</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.55rem 0.75rem', background: 'var(--surface-1)',
                  border: '1px solid var(--outline)', borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
            <div className="login-field" style={{ gap: '0.3rem', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>SLA (Hours)</label>
              <input
                type="number"
                min="1"
                max="720"
                placeholder="72"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.55rem 0.75rem', background: 'var(--surface-1)',
                  border: '1px solid var(--outline)', borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
            <div className="login-field" style={{ gap: '0.3rem', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Target Submissions</label>
              <input
                type="number"
                min="1"
                max="20"
                placeholder="3"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.55rem 0.75rem', background: 'var(--surface-1)',
                  border: '1px solid var(--outline)', borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 'none' }}>
              <button type="submit" className="btn btn-approve" style={{ height: '37px', padding: '0 1.25rem', borderRadius: 'var(--radius-xs)', fontWeight: 500, fontSize: '0.85rem', width: 'auto', flex: 'none' }}>
                Add SLA
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-edit"
                style={{ height: '37px', padding: '0 1.25rem', borderRadius: 'var(--radius-xs)', fontWeight: 500, fontSize: '0.85rem', width: 'auto', flex: 'none' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sla-grid">
        {slas.map((sla, idx) => {
          const time = getTimeLeft(sla.deadline);
          const progress = getProgress(sla.deadline, sla.totalHours);
          const isUrgent = time.hours < 24 && !time.expired;
          const isMet = sla.candidatesSubmitted >= sla.target;
          const isCustom = customSlas.some(item => item.id === sla.id);

          return (
            <motion.div
              key={sla.id}
              className="glass-panel sla-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="sla-card-header">
                <div>
                  <h4 style={{ color: 'var(--text-main)' }}>{sla.jobTitle}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sla.client}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {time.expired ? (
                    <span className="sla-badge expired"><AlertTriangle size={12} /> Expired</span>
                  ) : isMet ? (
                    <span className="sla-badge met"><CheckCircle size={12} /> Target Met</span>
                  ) : isUrgent ? (
                    <span className="sla-badge urgent"><TrendingDown size={12} /> Urgent</span>
                  ) : (
                    <span className="sla-badge ontrack"><Clock size={12} /> On Track</span>
                  )}
                  
                  {isCustom && (
                    <button
                      onClick={() => handleDeleteSLA(sla.id)}
                      style={{
                        background: 'transparent', border: 'none', color: 'var(--brand-danger)',
                        cursor: 'pointer', fontSize: '0.8rem', marginLeft: '0.25rem', padding: '0.2rem',
                        fontWeight: 'bold'
                      }}
                      title="Remove SLA Tracker"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Countdown Display */}
              <div className="sla-countdown">
                <div className="sla-time-unit">
                  <span className="sla-time-number" style={{ color: isUrgent || time.expired ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
                    {String(time.hours).padStart(2, '0')}
                  </span>
                  <span className="sla-time-label">Hours</span>
                </div>
                <span className="sla-time-sep">:</span>
                <div className="sla-time-unit">
                  <span className="sla-time-number" style={{ color: isUrgent || time.expired ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
                    {String(time.minutes).padStart(2, '0')}
                  </span>
                  <span className="sla-time-label">Min</span>
                </div>
                <span className="sla-time-sep">:</span>
                <div className="sla-time-unit">
                  <span className="sla-time-number" style={{ color: isUrgent || time.expired ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
                    {String(time.seconds).padStart(2, '0')}
                  </span>
                  <span className="sla-time-label">Sec</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="sla-progress-track">
                <div
                  className="sla-progress-fill"
                  style={{
                    width: `${progress}%`,
                    background: isUrgent ? 'linear-gradient(90deg, #F9AB00, #D93025)' : 'linear-gradient(90deg, #1A73E8, #4285F4)',
                  }}
                />
              </div>

              {/* Submission Progress */}
              <div className="sla-submissions">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Candidates: <strong style={{ color: 'var(--text-main)' }}>{sla.candidatesSubmitted}</strong> / {sla.target}
                </span>
                <div className="sla-dots">
                  {Array.from({ length: sla.target }).map((_, i) => (
                    <div
                      key={i}
                      className="sla-dot"
                      style={{
                        background: i < sla.candidatesSubmitted ? 'var(--brand-success)' : 'rgba(60,64,67,0.15)',
                        boxShadow: i < sla.candidatesSubmitted ? '0 0 6px rgba(30, 142, 62, 0.3)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
