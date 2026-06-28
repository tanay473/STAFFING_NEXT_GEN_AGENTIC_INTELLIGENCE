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
      
      // Combine with mock history for visualization variety
      setSlas([...activeList, ...MOCK_SLAS]);
    } catch (e) {
      console.error("Failed to load SLAs:", e);
      setSlas(MOCK_SLAS);
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
  }, []);

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

  return (
    <div className="sla-page">
      <div className="sla-grid">
        {slas.map((sla, idx) => {
          const time = getTimeLeft(sla.deadline);
          const progress = getProgress(sla.deadline, sla.totalHours);
          const isUrgent = time.hours < 24 && !time.expired;
          const isMet = sla.candidatesSubmitted >= sla.target;

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
                {time.expired ? (
                  <span className="sla-badge expired"><AlertTriangle size={12} /> Expired</span>
                ) : isMet ? (
                  <span className="sla-badge met"><CheckCircle size={12} /> Target Met</span>
                ) : isUrgent ? (
                  <span className="sla-badge urgent"><TrendingDown size={12} /> Urgent</span>
                ) : (
                  <span className="sla-badge ontrack"><Clock size={12} /> On Track</span>
                )}
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
                    background: isUrgent ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : 'linear-gradient(90deg, #4F46E5, #06B6D4)',
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
                        background: i < sla.candidatesSubmitted ? 'var(--brand-success)' : 'rgba(15,23,42,0.1)',
                        boxShadow: i < sla.candidatesSubmitted ? '0 0 6px rgba(16, 185, 129, 0.3)' : 'none',
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
