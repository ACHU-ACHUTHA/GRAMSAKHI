import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, Users, AlertTriangle, Bell, Search, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import './index.css';

import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import EmergencyBoard from './pages/EmergencyBoard';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import { getSyncQueue, clearSyncItem } from './db/offlineStorage';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Heart size={24} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '1px' }}>GRAMSAKHI</div>
          <div style={{ fontSize: '0.65rem', color: '#9ca3af', letterSpacing: '0.5px' }}>COMMUNITY HEALTH</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/patients" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Users size={20} /> Patients
        </NavLink>
        <NavLink to="/emergency" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <AlertTriangle size={20} /> Emergencies
        </NavLink>
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ fontSize: '0.7rem', color: '#4b5563', textAlign: 'center', margin: 0, letterSpacing: '0.5px' }}>
          Developed by <span style={{ color: '#38bdf8', fontWeight: 600 }}>Achu</span>
        </p>
      </div>
    </aside>
  );
}

function TopHeader({ worker, handleLogout, emergencyCount }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch emergencies as notifications
    const fetchNotifs = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/emergencies');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.slice(0, 5));
        }
      } catch (err) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  let title = `${worker?.village || 'Village'} Dashboard`;
  if (location.pathname === '/patients') title = 'Patients';
  if (location.pathname === '/emergency') title = 'Emergencies';

  const timeSince = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/patients?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <header className="top-header">
      <div className="header-title">
        <h1>{title}</h1>
        <p>{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>
      <div className="header-actions">
        <form onSubmit={handleSearchSubmit} className="search-bar" style={{ display: 'flex', alignItems: 'center' }}>
          <button type="submit" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Search size={18} color="var(--text-muted)" />
          </button>
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: 'none', outline: 'none', marginLeft: '8px', background: 'transparent', width: '100%' }}
          />
        </form>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Bell size={20} />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '10px', height: '10px', background: 'var(--risk-high)', borderRadius: '50%', border: '2px solid white' }}></span>
            )}
          </button>

          {showNotifications && (
            <div style={{ position: 'absolute', top: '55px', right: 0, background: 'white', borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', width: '340px', zIndex: 50, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: '#fef2f2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={16} color="#ef4444" />
                  <span style={{ fontWeight: 600, color: '#991b1b' }}>Emergency Alerts</span>
                </div>
                <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0 }}>No active emergencies!</p>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', marginTop: '0.4rem', flexShrink: 0 }}></div>
                    <div>
                      <p style={{ margin: '0 0 0.2rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{n.patient?.name || 'Unknown'}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.description?.substring(0, 60)}...</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#ef4444' }}>{timeSince(n.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {notifications.length > 0 && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', background: '#f8fafc' }}>
                  <a href="/emergency" style={{ color: '#ef4444', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>View all emergencies →</a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div style={{ position: 'relative' }}>
          <div className="avatar-circle" onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} style={{ cursor: 'pointer' }}>
            {worker?.name?.substring(0, 2).toUpperCase() || 'GS'}
          </div>

          {showProfile && (
            <div style={{ 
              position: 'absolute', top: '50px', right: '0', 
              background: 'white', padding: '1.5rem', 
              borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              width: '250px', zIndex: 50, border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>{worker?.name}</h3>
              <p style={{ margin: '0 0 0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>📞 {worker?.phone || 'Not set'}</p>
              <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>📍 {worker?.village} Area</p>
              
              <button 
                onClick={handleLogout} 
                style={{ width: '100%', padding: '0.6rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    // Check local storage for worker
    const storedWorker = localStorage.getItem('worker');
    if (storedWorker) {
      setWorker(JSON.parse(storedWorker));
    }

    const handleOnline = () => {
      setIsOffline(false);
      processBackgroundSync();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateSyncCount();

    // Immediate sync on load if online
    if (navigator.onLine) {
      processBackgroundSync();
    }

    // Also try to sync periodically if online
    const syncInterval = setInterval(() => {
      if (navigator.onLine) processBackgroundSync();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const updateSyncCount = async () => {
    const queue = await getSyncQueue();
    setSyncCount(queue.length);
  };

  const processBackgroundSync = async () => {
    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      const response = await fetch('http://localhost:5000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue })
      });

      if (response.ok) {
        const { processedIds } = await response.json();
        for (const id of processedIds) {
          await clearSyncItem(id);
        }
        updateSyncCount();
        console.log(`Synced ${processedIds.length} items`);
        window.dispatchEvent(new Event('sync-completed'));
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('worker');
    localStorage.removeItem('workerId');
    setWorker(null);
  };

  const handleUpdateWorker = (updatedWorker) => {
    localStorage.setItem('worker', JSON.stringify(updatedWorker));
    setWorker(updatedWorker);
  };

  if (!worker) {
    return <Login onLogin={setWorker} isOffline={isOffline} />;
  }

  // If worker still has default village (new user), show onboarding
  if (worker.village === 'Demo Village') {
    return <Onboarding worker={worker} onComplete={handleUpdateWorker} />;
  }

  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <TopHeader worker={worker} handleLogout={handleLogout} />
          {syncCount > 0 && (
            <div style={{ background: '#fef3c7', padding: '0.5rem 2rem', fontSize: '0.875rem', color: '#d97706', display: 'flex', justifyContent: 'space-between' }}>
              <span>⚠️ You are offline. {syncCount} items pending synchronization.</span>
              <button style={{ background: 'transparent', border: '1px solid #d97706', color: '#d97706', borderRadius: '4px', cursor: 'pointer' }} onClick={() => !isOffline && processBackgroundSync()}>Sync Now</button>
            </div>
          )}
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard worker={worker} isOffline={isOffline} syncCount={syncCount} updateSyncCount={updateSyncCount} />} />
              <Route path="/patients" element={<Patients worker={worker} isOffline={isOffline} updateSyncCount={updateSyncCount} />} />
              <Route path="/emergency" element={<EmergencyBoard isOffline={isOffline} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
