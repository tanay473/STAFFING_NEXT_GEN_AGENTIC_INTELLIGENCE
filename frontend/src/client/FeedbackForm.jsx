import React, { useState, useEffect } from 'react';
import { Star, Send, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REJECTION_CODES = [
  { value: 'salary_mismatch', label: 'Salary expectations too high' },
  { value: 'underqualified', label: 'Missing required skills' },
  { value: 'overqualified', label: 'Overqualified / flight risk' },
  { value: 'culture_fit', label: 'Culture fit concern' },
  { value: 'experience_type', label: 'Wrong type of experience' },
  { value: 'timing', label: 'Timing / availability issue' },
  { value: 'other', label: 'Other' },
];

export default function FeedbackForm({ apiHost }) {
  const [candidates, setCandidates] = useState([]);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [rating, setRating] = useState(3);
  const [rejectionCode, setRejectionCode] = useState('');
  const [comments, setComments] = useState('');
  const [interestLevel, setInterestLevel] = useState('interested');
  const [submitted, setSubmitted] = useState(new Set());
  const [jobId, setJobId] = useState('JOB-ACTIVE');

  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${apiHost}/client/status`);
      const data = await res.json();
      if (data.job_order) {
        setJobId(data.job_order.id);
      }
      
      const list = (data.pipeline || []).map(c => ({
        id: c.candidate_id,
        name: c.name,
        role: data.job_order ? data.job_order.role_name : 'Candidate Match',
        matchScore: c.match_score,
        status: 'awaiting_feedback'
      }));
      setCandidates(list);
    } catch (e) {
      console.error("Failed to load candidates for feedback:", e);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleSubmit = async (candidateId, isPositive) => {
    const payload = {
      job_id: jobId,
      candidate_id: candidateId,
      rating: isPositive ? 5 : rating,
      rejection_reason: isPositive ? null : rejectionCode,
      comments: isPositive ? `Approved. Interest level: ${interestLevel}` : comments,
    };

    try {
      const res = await fetch(`${apiHost}/client/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSubmitted(prev => new Set([...prev, candidateId]));
        setActiveFeedback(null);
        setComments('');
        setRating(3);
        setRejectionCode('');
        
        // Refresh list
        fetchCandidates();
      }
    } catch (e) {
      console.error("Failed to submit client feedback:", e);
    }
  };

  const pending = candidates.filter(c => !submitted.has(c.id));
  const done = candidates.filter(c => submitted.has(c.id));

  return (
    <div className="feedback-page">
      <div className="glass-panel feedback-header-panel">
        <MessageSquare size={20} color="var(--brand-purple)" />
        <div>
          <h3 style={{ color: 'var(--text-main)' }}>Structured Candidate Feedback</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Your feedback trains the AI to deliver better matches. Be specific for best results.
          </p>
        </div>
      </div>

      <div className="cards-container" style={{ marginTop: '1rem' }}>
        <AnimatePresence>
          {pending.map((cand, idx) => (
            <motion.div
              key={cand.id}
              className="glass-panel action-card"
              style={{ borderLeft: '4px solid var(--brand-purple)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <div className="card-header">
                <div>
                  <h3 className="candidate-name">{cand.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cand.role}</p>
                </div>
                <div className="match-circle" style={{ background: 'linear-gradient(135deg, var(--brand-purple), var(--brand-primary))' }}>
                  {cand.matchScore}%
                </div>
              </div>

              {activeFeedback === cand.id ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="feedback-form-inner"
                >
                  {/* Rating */}
                  <div className="feedback-field">
                    <label>Overall Rating</label>
                    <div className="star-row">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          size={22}
                          fill={n <= rating ? '#F59E0B' : 'none'}
                          color={n <= rating ? '#F59E0B' : '#4B5563'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setRating(n)}
                        />
                      ))}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{rating}/5</span>
                    </div>
                  </div>

                  {/* Rejection Code */}
                  <div className="feedback-field">
                    <label>Primary Concern (if rejecting)</label>
                    <select className="reason-input" value={rejectionCode} onChange={e => setRejectionCode(e.target.value)}>
                      <option value="">— Select —</option>
                      {REJECTION_CODES.map(rc => (
                        <option key={rc.value} value={rc.value}>{rc.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Interest Level */}
                  <div className="feedback-field">
                    <label>Interest Level</label>
                    <div className="interest-chips">
                      {['very_interested', 'interested', 'neutral', 'not_interested'].map(level => (
                        <button
                          key={level}
                          className={`interest-chip ${interestLevel === level ? 'active' : ''}`}
                          onClick={() => setInterestLevel(level)}
                        >
                          {level.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="feedback-field">
                    <label>Detailed Comments</label>
                    <textarea
                      className="textarea-jd"
                      style={{ height: '80px' }}
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="What specifically do you like or dislike about this candidate?"
                    />
                  </div>

                  <div className="actions-bar">
                    <button className="btn btn-approve" onClick={() => handleSubmit(cand.id, true)}>
                      <CheckCircle size={16} /> Approve for Interview
                    </button>
                    <button className="btn btn-reject" onClick={() => handleSubmit(cand.id, false)} disabled={!rejectionCode}>
                      <AlertTriangle size={16} /> Submit Rejection
                    </button>
                    <button className="btn btn-edit" onClick={() => setActiveFeedback(null)}>Cancel</button>
                  </div>
                </motion.div>
              ) : (
                <div className="actions-bar" style={{ marginTop: '0.5rem' }}>
                  <button className="btn btn-approve" onClick={() => handleSubmit(cand.id, true)}>
                    Quick Approve
                  </button>
                  <button className="btn btn-edit" onClick={() => setActiveFeedback(cand.id)}>
                    <MessageSquare size={14} /> Provide Detailed Feedback
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {done.length > 0 && (
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', color: 'var(--brand-success)' }}>
            <CheckCircle size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {done.length} candidate{done.length > 1 ? 's' : ''} reviewed — feedback stored in AI memory.
          </div>
        )}

        {pending.length === 0 && done.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No candidates pending your review.
          </div>
        )}
      </div>
    </div>
  );
}
