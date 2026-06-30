import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Send, Check, Trash2, Eye, Edit3, UploadCloud, UserPlus } from 'lucide-react';

export default function PriorityQueue({ apiHost }) {
  const [jdText, setJdText] = useState("We need a Senior React Developer, 5+ years, fintech experience, remote, starting in 3 weeks.");
  const [loading, setLoading] = useState(false);
  const [queueData, setQueueData] = useState({ action_cards: [], alerts: [] });
  const [currentStep, setCurrentStep] = useState(1);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("overqualified");
  const [rejectComments, setRejectComments] = useState("");
  const [rejectionDraft, setRejectionDraft] = useState("");
  const [loadingRejectionDraft, setLoadingRejectionDraft] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${apiHost}/recruiter/queue`);
      const data = await res.json();
      setQueueData(data);
    } catch (e) {
      console.error("Failed to load queue data:", e);
    }
  };

  const generateRejectionDraft = async (card) => {
    setLoadingRejectionDraft(true);
    try {
      const res = await fetch(`${apiHost}/recruiter/draft-rejection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: card.candidate_name,
          role_name: "Senior Developer",
          client_name: card.evidence_chain.benchmarks?.source || "Vertex Client",
          reason: rejectReason,
          comments: rejectComments
        })
      });
      const data = await res.json();
      setRejectionDraft(data.rejection_draft);
    } catch (e) {
      console.error(e);
      setRejectionDraft(`Hi ${card.candidate_name}, thank you for your time. Unfortunately, the client has chosen to pass on your profile for the role due to ${rejectReason}. Let's stay in touch.`);
    } finally {
      setLoadingRejectionDraft(false);
    }
  };

  useEffect(() => {
    if (!rejectId) return;
    const selectedCard = queueData.action_cards.find(c => c.id === rejectId);
    if (selectedCard) {
      generateRejectionDraft(selectedCard);
    }
  }, [rejectId, rejectReason]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerPlanner = async () => {
    setLoading(true);
    setCurrentStep(1);
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => (prev < 4 ? prev + 1 : 4));
    }, 4500);
    try {
      const res = await fetch(`${apiHost}/recruiter/digest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: jdText })
      });
      const data = await res.json();
      if (data.status === "success") {
        setQueueData(prev => ({ ...prev, action_cards: data.recommendations, status: 'active' }));
      } else {
        alert("Failed running graph planner.");
      }
    } catch (e) {
      console.error(e);
      alert(`Error calling planner API: ${e.message}`);
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    setLoading(true);
    setCurrentStep(1);
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => (prev < 4 ? prev + 1 : 4));
    }, 4500);
    try {
      const res = await fetch(`${apiHost}/ingest/upload/jd`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "success") {
        setQueueData(prev => ({ ...prev, action_cards: data.recommendations }));
      } else {
        alert("Failed parsing uploaded JD PDF.");
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading JD PDF.");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingResume(true);
    setUploadSuccess(null);
    try {
      const res = await fetch(`${apiHost}/ingest/upload/resume`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "success") {
        setUploadSuccess({
          name: data.parsed_profile.name,
          id: data.parsed_profile.id,
          skills: data.parsed_profile.skills || []
        });
      } else {
        alert("Failed parsing candidate resume PDF.");
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading candidate resume.");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAction = async (cardId, decision, notes = "", edits = "") => {
    try {
      const res = await fetch(`${apiHost}/recruiter/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_card_id: cardId,
          decision: decision,
          notes: notes,
          edits: edits
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchQueue();
        setRejectId(null);
        setEditId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {/* Dynamic Cockpit Panels Grid */}
      <div className="cockpit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* 1. Job Intake Panel */}
        <div className="glass-panel jd-input-panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <Sparkles size={20} color="#6366F1" /> Client Job Intake
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Paste raw requirements or upload a PDF job description to execute the LangGraph matching sequence.
            </p>
            
            <textarea
              className="textarea-jd"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste requirements..."
              style={{ margin: '0.75rem 0 0', height: '100px' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <button
              className="btn btn-approve"
              style={{ width: 'auto', padding: '0.6rem 1.2rem', margin: 0 }}
              onClick={triggerPlanner}
              disabled={loading}
            >
              {loading ? "Orchestrating..." : "Run Matching Planner"}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Or PDF:</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={loading}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  width: '160px'
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Candidate Talent Intake Panel */}
        <div className="glass-panel jd-input-panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <UserPlus size={20} color="#10B981" /> Talent Pool Intake
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Upload candidate resume PDF to automatically extract details using Gemini AI and register them in the matching database.
            </p>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.01)',
              position: 'relative',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
              />
              <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.4rem' }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {uploadingResume ? "Analyzing resume with Gemini AI..." : "Click to select resume PDF"}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                PDF format limit: 5MB
              </div>
            </div>

            {uploadSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: '#FFF',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--brand-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ✓ Registered {uploadSuccess.name} ({uploadSuccess.id})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  Skills: {uploadSuccess.skills.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

       <div className="dashboard-grid">
        {/* Main List */}
        <div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Active Matches Priority Queue</h2>
          
          {loading ? (
            /* Premium AI Processing Loader Card */
            <div className="glass-panel" style={{
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              textAlign: 'center',
              border: '1px dashed var(--brand-primary)',
            }}>
              {/* Spinning Pulse Orb */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-info))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
                animation: 'spin 2s linear infinite'
              }}>
                <Sparkles size={28} color="#FFF" />
              </div>
              
              <div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  AI Planner Orchestrating Agents...
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--brand-info)', fontWeight: 600 }}>
                  {currentStep === 1 && "Ingestion Agent: Extracting skills, timeline, & budget from Job description..."}
                  {currentStep === 2 && "Retrieval Agent: Querying candidate profiles & historical benchmarks..."}
                  {currentStep === 3 && "Reasoning Agent: Computing skill matching scores & instability risk flags..."}
                  {currentStep === 4 && "Shortlist Agent: Drafting outreach playbooks & candidate submission cards..."}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Estimated matching time remaining: {20 - (currentStep * 4)} seconds
                </p>
              </div>

              {/* Skeleton Cards preview */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', opacity: 0.2 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ height: '70px', background: 'var(--surface-3)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} />
                ))}
              </div>
            </div>
          ) : queueData.action_cards.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {queueData.status === 'active' 
                ? "No candidates found with matching core skills for this job order. Halting retrieval to preserve submission quality." 
                : "No recommendations in active session. Paste a Job Description to start."}
            </div>
          ) : (
            <div className="cards-container">
              {queueData.action_cards.map((card) => (
                <div key={card.id} className="glass-panel action-card">
                  <div className="card-header">
                    <div>
                      <h3 className="candidate-name">{card.candidate_name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Card ID: {card.id}</p>
                    </div>
                    <div className="match-circle">{card.match_score}%</div>
                  </div>

                  {/* Fit Breakdown */}
                  <div className="fit-grid">
                    {Object.entries(card.fit_breakdown).map(([k, val]) => (
                      <div key={k} className="fit-item">
                        <div className="fit-label">{k}</div>
                        <div className="fit-value">{val}%</div>
                      </div>
                    ))}
                  </div>

                  {/* Evidence Chain Panel */}
                  <div style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                    <h5 style={{ color: 'var(--brand-info)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Evidence Chain</h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.25rem', whiteSpace: 'pre-line' }}>
                      {card.evidence_chain.assessment}
                    </p>
                    {card.evidence_chain.benchmarks && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Salary Benchmark: {card.evidence_chain.benchmarks.source} - (${card.evidence_chain.benchmarks.min_salary} to ${card.evidence_chain.benchmarks.max_salary})
                      </p>
                    )}
                  </div>

                  {/* Reasons & Risks */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <h5 style={{ fontSize: '0.85rem', color: 'var(--brand-success)' }}>Top Fit Factors</h5>
                      <ul className="reasons-list">
                        {card.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 style={{ fontSize: '0.85rem', color: 'var(--brand-danger)' }}>Potential Risks</h5>
                      <ul className="risks-list">
                        {card.risks.length === 0 ? <li style={{ color: 'var(--text-muted)' }}>None identified</li> : card.risks.map((rk, i) => <li key={i}>{rk}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Outreach Message Draft Section */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Edit3 size={14} /> Candidate Outreach Draft
                    </h5>
                    {editId === card.id ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <textarea
                          className="textarea-jd"
                          style={{ height: '100px' }}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button className="btn btn-approve" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleAction(card.id, "Approved", "", editDraft)}>
                            Submit Custom Draft
                          </button>
                          <button className="btn btn-edit" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setEditId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--outline-variant)', marginTop: '0.4rem', position: 'relative' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingRight: '2rem' }}>
                          "{card.outreach_draft}"
                        </p>
                        <button
                          style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                          onClick={() => { setEditId(card.id); setEditDraft(card.outreach_draft); }}
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  {card.status === "Pending" ? (
                    <div className="actions-bar">
                      <button className="btn btn-approve" onClick={() => handleAction(card.id, "Approved")}>
                        <Check size={16} /> Approve & Submit
                      </button>
                      <button className="btn btn-edit" onClick={() => { setEditId(card.id); setEditDraft(card.outreach_draft); }}>
                        Edit Draft
                      </button>
                      <button className="btn btn-reject" onClick={() => setRejectId(card.id)}>
                        <Trash2 size={16} /> Reject Candidate
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                      <span className={`status-pill ${card.status.toLowerCase() === 'approved' ? 'submitted' : 'review'}`}>
                        {card.status}
                      </span>
                    </div>
                  )}

                  {/* Rejection Reasons Sub-form */}
                  {rejectId === card.id && (
                    <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                      <h4 style={{ color: 'var(--brand-danger)', fontSize: '0.95rem' }}>Candidate Rejection Panel (AI-Powered)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rejection Category:</label>
                          <select className="reason-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ marginTop: '0.25rem' }}>
                            <option value="overqualified">Overqualified</option>
                            <option value="underqualified">Underqualified</option>
                            <option value="salary_mismatch">Salary mismatch</option>
                            <option value="stability">Job Stability Concern</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Additional Context (optional):</label>
                          <input
                            type="text"
                            className="reason-input"
                            placeholder="Add comments to adjust draft..."
                            value={rejectComments}
                            onChange={(e) => setRejectComments(e.target.value)}
                            style={{ marginTop: '0.25rem' }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Sparkles size={12} color="#EF4444" /> AI-Drafted Rejection Message:
                        </label>
                        {loadingRejectionDraft ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--brand-info)', padding: '0.5rem 0' }}>Drafting warm message with Gemini...</div>
                        ) : (
                          <textarea
                            className="textarea-jd"
                            style={{ height: '80px', marginTop: '0.25rem', fontSize: '0.82rem', lineHeight: '1.4' }}
                            value={rejectionDraft}
                            onChange={(e) => setRejectionDraft(e.target.value)}
                          />
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-approve" style={{ background: '#EF4444', color: '#FFF' }} onClick={() => handleAction(card.id, "Rejected", rejectionDraft)}>
                          Confirm Rejection
                        </button>
                        <button className="btn btn-edit" onClick={() => setRejectId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Alerts */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>System Monitoring Feed</h3>
          
          {queueData.alerts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No active alerts.
            </div>
          ) : (
            queueData.alerts.map(alert => (
              <div key={alert.id} className={`alert-banner ${alert.severity}`}>
                <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                <div>
                  <h5 style={{ fontWeight: 600, fontSize: '0.9rem' }}>{alert.title}</h5>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: '1.25' }}>{alert.message}</p>
                </div>
              </div>
            ))
          )}

          {/* AI Agent Pipeline Stepper */}
          {(loading || queueData.action_cards.length > 0) && (
            <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
              <h4 style={{ color: 'var(--text-main)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} color="var(--brand-info)" /> Pipeline Agent Orchestration
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '11px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: 'rgba(255,255,255,0.06)',
                  zIndex: 0
                }} />
                
                {[
                  { id: 1, label: "Ingestion Agent", desc: "Extracting JD PDF / Text requirements" },
                  { id: 2, label: "Retrieval Agent", desc: "Searching CRM & historical placements" },
                  { id: 3, label: "Reasoning Fit Agent", desc: "Scoring candidate matching vectors" },
                  { id: 4, label: "Shortlist Agent", desc: "Drafting outreach & final cards" }
                ].map((step) => {
                  let status = "pending";
                  if (loading) {
                    if (currentStep === step.id) status = "active";
                    else if (currentStep > step.id) status = "completed";
                  } else if (queueData.action_cards.length > 0) {
                    status = "completed";
                  }

                  return (
                    <div key={step.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', zIndex: 1 }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: status === 'completed' ? 'var(--brand-success)' : (status === 'active' ? 'var(--brand-primary)' : 'var(--surface-3)'),
                        color: status === 'completed' ? 'var(--text-inverse)' : 'var(--text-main)',
                        border: status === 'active' ? '2px solid rgba(26, 115, 232, 0.4)' : '1px solid var(--outline-variant)',
                        boxShadow: status === 'active' ? '0 0 8px rgba(26, 115, 232, 0.3)' : 'none',
                        transition: 'all 0.3s ease'
                      }}>
                        {status === 'completed' ? '✓' : step.id}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-main)' }}>
                          {step.label}
                          {status === 'active' && <span className="status-pill review" style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>Active</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
