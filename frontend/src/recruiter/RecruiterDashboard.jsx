import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, Bell, TrendingUp, Users, Clock,
  Zap, Activity, CheckCircle, XCircle, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import PriorityQueue from './PriorityQueue.jsx';
import GhostingAlerts from './GhostingAlerts.jsx';
import DraftOutreach from './DraftOutreach.jsx';

const API_HOST = "http://localhost:8000";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const { tab } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('queue');
  
  // Sync tab with route param changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('queue');
    }
  }, [tab]);

  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingActions: 0,
    submittedToday: 0,
    ghostAlerts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_HOST}/recruiter/queue`);
        const data = await res.json();
        const cards = data.action_cards || [];
        const alerts = data.alerts || [];
        
        // Find unique job ids in the current shortlist
        const uniqueJobs = new Set(cards.map(c => c.job_id));
        const activeJobsCount = uniqueJobs.size || (cards.length > 0 ? 1 : 0);
        
        setStats({
          activeJobs: activeJobsCount,
          pendingActions: cards.filter(c => c.status === 'Pending').length,
          submittedToday: cards.filter(c => c.status === 'Approved' || c.status === 'Edited').length,
          ghostAlerts: alerts.length
        });
      } catch (e) {
        console.error("Failed to fetch recruiter stats:", e);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <motion.div
        className="welcome-banner glass-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="welcome-text">
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p>Your AI-powered recruitment workspace is ready. {stats.pendingActions} action{stats.pendingActions !== 1 ? 's' : ''} need attention.</p>
        </div>
        <div className="welcome-stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
              <Zap size={20} color="#6366F1" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.activeJobs}</span>
              <span className="stat-label">Active Jobs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <Clock size={20} color="#F59E0B" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.pendingActions}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle size={20} color="#10B981" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.submittedToday}</span>
              <span className="stat-label">Submitted</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <AlertTriangle size={20} color="#EF4444" />
            </div>
            <div className="stat-info">
              <span className="stat-number">{stats.ghostAlerts}</span>
              <span className="stat-label">Ghost Alerts</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="dash-tabs">
        <button className={`dash-tab ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => navigate('/recruiter/queue')}>
          <BarChart3 size={16} /> Priority Queue
        </button>
        <button className={`dash-tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => navigate('/recruiter/alerts')}>
          <Bell size={16} /> Ghosting Alerts
        </button>
        <button className={`dash-tab ${activeTab === 'outreach' ? 'active' : ''}`} onClick={() => navigate('/recruiter/outreach')}>
          <Sparkles size={16} /> Draft Outreach
        </button>
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'queue' && <PriorityQueue apiHost={API_HOST} />}
        {activeTab === 'alerts' && <GhostingAlerts apiHost={API_HOST} />}
        {activeTab === 'outreach' && <DraftOutreach apiHost={API_HOST} />}
      </motion.div>
    </div>
  );
}
