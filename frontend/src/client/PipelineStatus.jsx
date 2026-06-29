import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, CheckCircle, HelpCircle, Star, ThumbsDown } from 'lucide-react';

export default function PipelineStatus({ apiHost, wsHost }) {
  const [pipelineData, setPipelineData] = useState({ job_order: null, pipeline: [], sla_hours_remaining: 72.0 });
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("salary_mismatch");

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiHost}/client/status`);
      const data = await res.json();
      setPipelineData(data);
    } catch (e) {
      console.error("Failed to load client status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Set up WebSocket connection for real-time recruiter updates
    const socket = new WebSocket(wsHost);
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("WebSocket event received:", msg);
      if (msg.event === "candidate_submitted") {
        // Append new candidate to pipeline dynamically
        setPipelineData(prev => {
          // Check if candidate already exists
          const exists = prev.pipeline.some(c => c.candidate_id === msg.candidate_id);
          if (exists) return prev;
          
          return {
            ...prev,
            pipeline: [...prev.pipeline, {
              candidate_id: msg.candidate_id,
              name: msg.candidate_name,
              match_score: msg.match_score,
              reasons: msg.reasons,
              risks: msg.risks,
              status: "Under Review",
              evidence_chain: msg.evidence_chain
            }]
          };
        });
      } else if (msg.event === "pipeline_updated" || msg.event === "client_feedback_submitted") {
        fetchStatus();
      }
    };

    socket.onerror = (e) => console.error("WS error:", e);
    return () => socket.close();
  }, []);

  const submitFeedback = async (candidateId, isAccept) => {
    const feedbackPayload = {
      job_id: pipelineData.job_order?.id || "JOB-MOCK",
      candidate_id: candidateId,
      rating: isAccept ? 5 : rating,
      rejection_reason: isAccept ? null : rejectionReason,
      comments: isAccept ? "Approved for next-stage client interview." : comments
    };

    try {
      const res = await fetch(`${apiHost}/client/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackPayload)
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(isAccept ? "Candidate approved for interview!" : "Rejection feedback logged into long-term memory.");
        setActiveFeedbackId(null);
        setComments("");
        // Update the candidate status in the pipeline local view instead of removing it
        setPipelineData(prev => ({
          ...prev,
          pipeline: prev.pipeline.map(c => 
            c.candidate_id === candidateId 
              ? { ...c, status: isAccept ? "Interview Scheduled" : "Rejected" } 
              : c
          )
        }));
      }
    } catch (e) {
      console.error(e);
      alert("Error sending feedback.");
    }
  };

  return (
    <div>
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        
        {/* Main Status Panel */}
        <div>
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ color: 'var(--text-main)' }}>
              {pipelineData.job_order ? pipelineData.job_order.role_name : "Active Pipeline Tracking"}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Client: {pipelineData.job_order ? pipelineData.job_order.client_name : "N/A"} | Location: {pipelineData.job_order ? pipelineData.job_order.location : "N/A"} | Budget Limit: {pipelineData.job_order ? `$${pipelineData.job_order.budget_max}` : "N/A"}
            </p>
          </div>

          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Submitted Candidates Under Review</h3>
          
          {pipelineData.pipeline.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Sourcing in progress. Approved recruiter candidates will appear here in real-time.
            </div>
          ) : (
            <div className="cards-container">
              {pipelineData.pipeline.map((cand) => (
                <div key={cand.candidate_id} className="glass-panel action-card" style={{ borderLeft: `4px solid ${cand.status === 'Interview Scheduled' ? 'var(--brand-success)' : (cand.status === 'Rejected' ? 'var(--brand-danger)' : 'var(--brand-info)')}` }}>
                  <div className="card-header">
                    <div>
                      <h3 className="candidate-name" style={{ color: 'var(--text-main)' }}>{cand.name}</h3>
                      <span className={`status-pill ${cand.status === 'Interview Scheduled' ? 'submitted' : (cand.status === 'Rejected' ? 'review' : 'review')}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                        {cand.status}
                      </span>
                    </div>
                    <div className="match-circle" style={{ background: cand.status === 'Interview Scheduled' ? 'linear-gradient(135deg, var(--brand-success), #059669)' : 'linear-gradient(135deg, var(--brand-info), var(--brand-primary))' }}>
                      {cand.match_score}%
                    </div>
                  </div>

                  {/* Reasons & Risks */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <h5 style={{ color: '#10B981', fontSize: '0.85rem' }}>Strengths Alignment</h5>
                    <ul style={{ fontSize: '0.85rem', color: 'var(--text-main)', paddingLeft: '1.25rem', marginTop: '0.2rem' }}>
                      {cand.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>

                  {/* Explanation Evidence Chain */}
                  <div style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                    <h5 style={{ color: 'var(--brand-info)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Match Justification</h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', whiteSpace: 'pre-line' }}>
                      {cand.evidence_chain.assessment}
                    </p>
                  </div>

                  {/* Actions / Decision status representation */}
                  {cand.status === "Under Review" ? (
                    <div className="actions-bar">
                      <button className="btn btn-approve" onClick={() => submitFeedback(cand.candidate_id, true)}>
                        <ShieldCheck size={16} /> Request Interview
                      </button>
                      <button className="btn btn-reject" onClick={() => setActiveFeedbackId(cand.candidate_id)}>
                        <ThumbsDown size={16} /> Log Rejection
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                      <span className={`status-pill ${cand.status === 'Interview Scheduled' ? 'submitted' : 'review'}`} style={{
                        background: cand.status === 'Interview Scheduled' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: cand.status === 'Interview Scheduled' ? '#10B981' : '#EF4444',
                        border: cand.status === 'Interview Scheduled' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        {cand.status === 'Interview Scheduled' ? '✓ Interview Requested' : '✗ Rejected by Client'}
                      </span>
                    </div>
                  )}

                  {/* Structured Feedback Drawer */}
                  {activeFeedbackId === cand.candidate_id && (
                    <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <h4 style={{ color: 'var(--brand-danger)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Structured Rejection Analysis</h4>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Feedback Rating:</label>
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                          {[1, 2, 3, 4, 5].map(num => (
                            <Star key={num} size={16} color={num <= rating ? "#F59E0B" : "#4B5563"} style={{ cursor: 'pointer' }} onClick={() => setRating(num)} />
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Primary Rejection Code:</label>
                        <select className="reason-input" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}>
                          <option value="salary_mismatch">Salary limits exceeded</option>
                          <option value="underqualified">Underqualified / missing skills</option>
                          <option value="overqualified">Overqualified / flight risk</option>
                          <option value="stability">Frequent employment changes</option>
                          <option value="other">Other / communication</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comments / Specific requirements context:</label>
                        <input
                          type="text"
                          className="reason-input"
                          placeholder="e.g. Needs more TypeScript, salary limit strictly 120k..."
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-approve" style={{ background: '#EF4444', color: '#FFF' }} onClick={() => submitFeedback(cand.candidate_id, false)}>
                          Submit Rejection
                        </button>
                        <button className="btn btn-edit" onClick={() => setActiveFeedbackId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLA Countdown Timer Tracker */}
        <div>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Clock size={40} color="#F59E0B" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ color: 'var(--text-main)' }}>SLA Matching Timer</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Countdown to fulfill recruitment submission criteria.
            </p>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, margin: '1rem 0', color: pipelineData.sla_hours_remaining < 24 ? 'var(--brand-danger)' : 'var(--brand-success)', fontFamily: 'var(--font-title)' }}>
              {pipelineData.sla_hours_remaining} hrs
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              SLA deadline threshold limit: 72 hours
            </p>
          </div>

          {/* Market Rates Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Local Talent Benchmarks</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Talent demand for React profiles is currently **High**. Typical market ranges in Remote locations are between **$110k and $140k**.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
