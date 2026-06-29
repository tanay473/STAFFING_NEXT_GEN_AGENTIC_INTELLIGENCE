import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, ChevronDown, ChevronUp, Sparkles, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JobOrdersView({ apiHost }) {
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [now, setNow] = useState(new Date());

  // Merge backend registry with localStorage SLAs from client SLATracker
  const fetchJobOrders = async () => {
    try {
      const res = await fetch(`${apiHost}/recruiter/job-orders`);
      const data = await res.json();
      const backendOrders = data.job_orders || [];

      // Pull custom SLAs from localStorage (set by SLATracker on client side)
      const saved = localStorage.getItem('custom_slas');
      const customSlas = saved ? JSON.parse(saved) : [];
      const localOrders = customSlas.map(sla => ({
        id: sla.id,
        role_name: sla.jobTitle,
        client_name: sla.client,
        jd_text: sla.jd_text || '',
        required_skills: sla.required_skills || [],
        nice_to_have_skills: sla.nice_to_have_skills || [],
        budget_max: sla.budget_max || 0,
        location: sla.location || 'Remote',
        duration_type: sla.duration_type || 'Full-time',
        timeline: sla.timeline || '',
        sla_hours: sla.totalHours || 72,
        target_submissions: sla.target || 3,
        deadline: sla.deadline || '',
        candidates_submitted: sla.candidatesSubmitted || 0,
        source: 'manual'
      }));

      // Merge: backend registry first, then local ones not already in backend
      const backendIds = new Set(backendOrders.map(o => o.id));
      const merged = [...backendOrders, ...localOrders.filter(o => !backendIds.has(o.id))];
      setJobOrders(merged);
    } catch (e) {
      console.error('Failed to load job orders:', e);
    }
  };

  useEffect(() => {
    fetchJobOrders();
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const getTimeLeft = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - now;
    if (diff <= 0) return { label: 'Expired', urgent: true, expired: true };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { label: `${h}h ${m}m remaining`, urgent: h < 24, expired: false };
  };

  const handleRunMatching = async (order) => {
    if (!order.jd_text) {
      alert('No JD text stored for this role. Please add job description text from the Priority Queue.');
      return;
    }
    setRunningId(order.id);
    try {
      const res = await fetch(`${apiHost}/recruiter/digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: order.jd_text })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessId(order.id);
        setTimeout(() => setSuccessId(null), 3000);
        fetchJobOrders();
      } else {
        alert('Pipeline run failed. Check backend logs.');
      }
    } catch (e) {
      console.error(e);
      alert('Error calling matching pipeline.');
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id, source) => {
    if (source === 'pipeline') {
      alert('Pipeline-sourced orders cannot be deleted from here. They clear automatically when a new run starts.');
      return;
    }
    // Remove from backend registry
    await fetch(`${apiHost}/recruiter/job-orders/${id}`, { method: 'DELETE' }).catch(() => {});
    // Remove from localStorage
    const saved = localStorage.getItem('custom_slas');
    if (saved) {
      const updated = JSON.parse(saved).filter(s => s.id !== id);
      localStorage.setItem('custom_slas', JSON.stringify(updated));
    }
    setJobOrders(prev => prev.filter(o => o.id !== id));
  };

  if (jobOrders.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <Briefcase size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Job Orders Yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Configure SLA trackers in the Client portal, or run the matching planner from the Priority Queue tab to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: 500 }}>
          Active Job Orders — {jobOrders.length} Role{jobOrders.length !== 1 ? 's' : ''}
        </h2>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Sourced from SLA Tracker &amp; pipeline runs
        </span>
      </div>

      {jobOrders.map((order, idx) => {
        const time = getTimeLeft(order.deadline);
        const isExpanded = expandedId === order.id;
        const isRunning = runningId === order.id;
        const isSuccess = successId === order.id;
        const fillPct = order.target_submissions > 0
          ? Math.min(100, Math.round((order.candidates_submitted / order.target_submissions) * 100))
          : 0;

        return (
          <motion.div
            key={order.id}
            className="glass-panel action-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            style={{ padding: '1.25rem' }}
          >
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {order.role_name || 'Untitled Role'}
                  </h3>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                    fontSize: '0.7rem', fontWeight: 600,
                    background: order.source === 'pipeline' ? 'rgba(26,115,232,0.08)' : 'rgba(147,52,230,0.08)',
                    color: order.source === 'pipeline' ? 'var(--brand-primary)' : 'var(--brand-purple)'
                  }}>
                    {order.source === 'pipeline' ? 'Pipeline' : 'Manual SLA'}
                  </span>
                  {time && (
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem',
                      background: time.expired ? 'rgba(217,48,37,0.08)' : time.urgent ? 'rgba(249,171,0,0.08)' : 'rgba(30,142,62,0.08)',
                      color: time.expired ? 'var(--brand-danger)' : time.urgent ? 'var(--brand-warning)' : 'var(--brand-success)'
                    }}>
                      {time.expired ? <AlertTriangle size={10} /> : <Clock size={10} />}
                      {time.label}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {order.client_name} · {order.location} · {order.duration_type}
                  {order.budget_max > 0 && ` · Budget: $${order.budget_max.toLocaleString()}`}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                <button
                  className="btn btn-approve"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={() => handleRunMatching(order)}
                  disabled={isRunning}
                >
                  {isSuccess
                    ? <><CheckCircle size={14} /> Matched!</>
                    : isRunning
                    ? <><span className="spin" style={{ display: 'inline-block' }}>⟳</span> Running...</>
                    : <><Sparkles size={14} /> Run Matching</>
                  }
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--outline)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title={isExpanded ? 'Collapse' : 'View JD Details'}
                >
                  {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </button>
                <button
                  onClick={() => handleDelete(order.id, order.source)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.4rem', borderRadius: 'var(--radius-xs)' }}
                  title="Remove from view"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Submission Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  width: `${fillPct}%`,
                  background: fillPct >= 100 ? 'var(--brand-success)' : 'linear-gradient(90deg, #1A73E8, #4285F4)',
                  transition: 'width 0.6s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {order.candidates_submitted} / {order.target_submissions} candidates
              </span>
            </div>

            {/* Skills Chips */}
            {order.required_skills?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {order.required_skills.map(s => (
                  <span key={s} style={{
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem',
                    background: 'rgba(26,115,232,0.08)', color: 'var(--brand-primary)', border: '1px solid rgba(26,115,232,0.18)', fontWeight: 500
                  }}>{s}</span>
                ))}
                {order.nice_to_have_skills?.map(s => (
                  <span key={s} style={{
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem',
                    background: 'rgba(147,52,230,0.06)', color: 'var(--brand-purple)', border: '1px solid rgba(147,52,230,0.15)', fontWeight: 500
                  }}>{s} ✦</span>
                ))}
              </div>
            )}

            {/* Expandable JD Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Job Description
                    </h5>
                    {order.jd_text ? (
                      <div style={{
                        background: 'var(--surface-2)', border: '1px solid var(--outline-variant)',
                        borderRadius: 'var(--radius-xs)', padding: '0.85rem',
                        fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.65,
                        maxHeight: '260px', overflowY: 'auto'
                      }}>
                        {order.jd_text}
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(249,171,0,0.06)', border: '1px solid rgba(249,171,0,0.2)', borderRadius: 'var(--radius-xs)', padding: '0.75rem', fontSize: '0.84rem', color: 'var(--brand-warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={14} />
                        No JD text stored. Paste the JD in the Priority Queue tab and run the planner to populate this field.
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { label: 'SLA Window', value: `${order.sla_hours}h` },
                        { label: 'Timeline', value: order.timeline || '—' },
                        { label: 'Target Submissions', value: order.target_submissions },
                        { label: 'Order ID', value: order.id },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xs)', padding: '0.65rem 0.85rem' }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500, marginTop: '0.2rem' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
