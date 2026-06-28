import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Briefcase, UserCheck, Users, LogOut, Bell, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAlerts = async () => {
      try {
        const res = await fetch('http://localhost:8000/recruiter/queue');
        const data = await res.json();
        const allAlerts = data.alerts || [];
        
        // Filter alerts based on role (Client sees their company alerts only)
        if (user.role === 'client') {
          setAlerts(allAlerts.filter(a => a.client_id === 'CLI-001'));
        } else {
          setAlerts(allAlerts);
        }
      } catch (e) {
        console.error("Navbar failed to fetch notifications:", e);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isRecruiter = user?.role === 'recruiter';

  return (
    <header className="navbar">
      <div className="nav-logo">
        <Briefcase size={22} color="#6366F1" />
        <span>Staffing.<span>NBA</span></span>
      </div>

      <nav className="nav-center">
        {isRecruiter ? (
          <>
            <Link to="/recruiter" className={`nav-link ${location.pathname === '/recruiter' ? 'active' : ''}`}>
              Dashboard
            </Link>
            <Link to="/recruiter/queue" className={`nav-link ${location.pathname === '/recruiter/queue' ? 'active' : ''}`}>
              Priority Queue
            </Link>
            <Link to="/recruiter/alerts" className={`nav-link ${location.pathname === '/recruiter/alerts' ? 'active' : ''}`}>
              Alerts
            </Link>
          </>
        ) : (
          <>
            <Link to="/client" className={`nav-link ${location.pathname === '/client' ? 'active' : ''}`}>
              Pipeline
            </Link>
            <Link to="/client/feedback" className={`nav-link ${location.pathname === '/client/feedback' ? 'active' : ''}`}>
              Feedback
            </Link>
            <Link to="/client/insights" className={`nav-link ${location.pathname === '/client/insights' ? 'active' : ''}`}>
              Market Insights
            </Link>
          </>
        )}
      </nav>

      <div className="nav-right">
        <div className="nav-notifications-container" style={{ position: 'relative' }}>
          <button className="nav-icon-btn" title="Notifications" onClick={() => setShowDropdown(!showDropdown)}>
            <Bell size={18} />
            {alerts.length > 0 && <span className="nav-badge">{alerts.length}</span>}
          </button>
          
          {showDropdown && (
            <div className="nav-dropdown glass-panel" style={{
              position: 'absolute',
              right: 0,
              top: '120%',
              width: '320px',
              padding: '1rem',
              zIndex: 1000,
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}>
              <h4 style={{ color: '#FFF', fontSize: '0.95rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                Recent Activity Alerts ({alerts.length})
              </h4>
              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
                    All clear! No notifications.
                  </p>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} style={{
                      fontSize: '0.8rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: alert.severity === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      borderLeft: `3px solid ${alert.severity === 'high' ? '#EF4444' : '#F59E0B'}`,
                      color: '#FFF',
                      textAlign: 'left'
                    }}>
                      <div style={{ fontWeight: 600 }}>{alert.title}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem', fontSize: '0.75rem', lineHeight: '1.3' }}>
                        {alert.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="nav-profile">
          <div className={`nav-avatar ${isRecruiter ? 'avatar-recruiter' : 'avatar-client'}`}>
            {user?.avatar}
          </div>
          <div className="nav-profile-info">
            <span className="nav-profile-name">{user?.name}</span>
            <span className="nav-profile-role">{isRecruiter ? 'Agency Admin' : 'Client'}</span>
          </div>
        </div>
        <button className="nav-icon-btn" onClick={handleLogout} title="Sign Out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
