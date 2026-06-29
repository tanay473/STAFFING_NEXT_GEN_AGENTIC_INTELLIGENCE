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
        <Briefcase size={22} color="#1A73E8" />
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
            <div className="nav-dropdown">
              <div className="nav-dropdown-header">
                <span>Recent Activity Alerts ({alerts.length})</span>
              </div>
              <div className="nav-dropdown-list">
                {alerts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
                    All clear! No notifications.
                  </p>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className={`nav-dropdown-item ${alert.severity}`}>
                      <div className="nav-dropdown-title">{alert.title}</div>
                      <div className="nav-dropdown-desc">{alert.message}</div>
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
