import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3, Clock, TrendingUp, Users, CheckCircle, FileText,
  MessageSquare, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import PipelineStatus from './PipelineStatus.jsx';
import SLATracker from './SLATracker.jsx';
import FeedbackForm from './FeedbackForm.jsx';
import MarketInsights from './MarketInsights.jsx';

const API_HOST = "http://localhost:8000";
const WS_HOST = "ws://localhost:8000/ws";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { tab } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Sync tab with URL route param changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('pipeline');
    }
  }, [tab]);

  const [stats, setStats] = useState({
    activePipelines: 0,
    candidatesReviewing: 0,
    interviewsScheduled: 1,
    slaHoursLeft: 72,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_HOST}/client/status`);
        const data = await res.json();
        
        // Candidates under review in the pipeline
        const inReview = data.pipeline ? data.pipeline.length : 0;
        
        // SLA remaining
        const slaLeft = data.sla_hours_remaining !== undefined ? data.sla_hours_remaining : 72;
        
        setStats({
          activePipelines: data.job_order ? 1 : 0,
          candidatesReviewing: inReview,
          interviewsScheduled: inReview > 0 ? 1 : 0, // dynamic interview scheduling flag based on review pipeline
          slaHoursLeft: slaLeft
        });
      } catch (e) {
        console.error("Failed to fetch client stats:", e);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-page">
      {/* Client Welcome */}
      <motion.div
        className="welcome-banner glass-panel client-welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="welcome-text">
          <h1>Hello, {user?.name?.split(' ')[0]}</h1>
          <p>Your talent pipeline is active. {stats.candidatesReviewing} candidate{stats.candidatesReviewing !== 1 ? 's' : ''} awaiting your review.</p>
        </div>
        <div className="welcome-stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
              <Activity size={20} color="#06B6D4" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.activePipelines}</span>
              <span className="stat-label">Pipelines</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
              <Users size={20} color="#8B5CF6" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.candidatesReviewing}</span>
              <span className="stat-label">In Review</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle size={20} color="#10B981" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.interviewsScheduled}</span>
              <span className="stat-label">Interviews</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <Clock size={20} color="#F59E0B" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.slaHoursLeft}h</span>
              <span className="stat-label">SLA Left</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Client Tabs */}
      <div className="dash-tabs">
        <button className={`dash-tab ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => navigate('/client/pipeline')}>
          <BarChart3 size={16} /> Pipeline Status
        </button>
        <button className={`dash-tab ${activeTab === 'sla' ? 'active' : ''}`} onClick={() => navigate('/client/sla')}>
          <Clock size={16} /> SLA Tracker
        </button>
        <button className={`dash-tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => navigate('/client/feedback')}>
          <MessageSquare size={16} /> Feedback
        </button>
        <button className={`dash-tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => navigate('/client/insights')}>
          <TrendingUp size={16} /> Market Insights
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'pipeline' && <PipelineStatus apiHost={API_HOST} wsHost={WS_HOST} />}
        {activeTab === 'sla' && <SLATracker apiHost={API_HOST} />}
        {activeTab === 'feedback' && <FeedbackForm apiHost={API_HOST} />}
        {activeTab === 'insights' && <MarketInsights />}
      </motion.div>
    </div>
  );
}
