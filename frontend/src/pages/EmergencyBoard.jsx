import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

function EmergencyBoard({ isOffline }) {
  const [emergencies, setEmergencies] = useState([]);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 5000);
    return () => clearInterval(interval);
  }, [isOffline]);

  const fetchEmergencies = async () => {
    if (isOffline) return;
    try {
      const res = await fetch(`${API_URL}/api/emergencies`);
      if (res.ok) {
        const data = await res.json();
        // Deduplicate: keep only one emergency per patient (the most recent)
        const seen = new Set();
        const unique = data.filter(e => {
          if (seen.has(e.patientId)) return false;
          seen.add(e.patientId);
          return true;
        });
        setEmergencies(unique);
      }
    } catch (err) {
      console.error('Failed to fetch emergencies');
    }
  };

  const handleResolve = async (emergencyId) => {
    setResolving(emergencyId);
    try {
      const res = await fetch(`${API_URL}/api/emergencies/${emergencyId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patientId) {
          try {
            const { deletePatientOffline } = await import('../db/offlineStorage');
            await deletePatientOffline(data.patientId);
          } catch (offlineErr) {
            console.error('Offline delete error:', offlineErr);
          }
        }
        setEmergencies(prev => prev.filter(e => e.id !== emergencyId));
      }
    } catch (err) {
      console.error('Failed to resolve emergency');
    } finally {
      setResolving(null);
    }
  };

  const timeSince = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--risk-high)', margin: '0 0 0.25rem' }}>🚨 Active Hospital Referrals</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Real-time dashboard — each unique patient shown once.</p>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
          <span style={{ fontWeight: 600, color: '#b91c1c', fontSize: '0.875rem' }}>{emergencies.length} Active</span>
        </div>
      </div>

      {isOffline && (
        <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', marginBottom: '2rem', color: '#92400e', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertTriangle size={18} />
          <div><strong>You are offline.</strong> New emergencies cannot be synchronized until connection is restored.</div>
        </div>
      )}

      {emergencies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)', background: 'white', borderRadius: '16px' }}>
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-main)' }}>All Clear!</h3>
          <p>No active emergencies at the moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {emergencies.map(e => (
            <div key={e.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--risk-high)', boxShadow: '0 4px 20px rgba(239,68,68,0.1)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, background: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', color: '#ef4444' }}>
                    {(e.patient?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{e.patient?.name || 'Unknown Patient'}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      {e.patient?.age} yrs • {e.patient?.gender} • {e.patient?.village} {e.patient?.bloodGroup && `• Blood Group: ${e.patient.bloodGroup}`}
                    </p>
                  </div>
                </div>
                <span style={{ background: '#ef4444', color: 'white', padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>HIGH EMERGENCY</span>
              </div>

              {/* Time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Clock size={14} />
                {timeSince(e.createdAt)}
              </div>

              {/* Description */}
              <div style={{ background: '#fef2f2', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#991b1b', margin: '0 0 0.25rem' }}>Reason:</p>
                <p style={{ fontSize: '0.875rem', margin: 0, color: '#7f1d1d' }}>{e.description}</p>
              </div>

              {/* QR Code & SMS Sharing Container */}
              <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #fecaca', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <QRCodeSVG
                      value={`GRAMSAKHI EMERGENCY REPORT\n---------------------------\nPatient: ${e.patient?.name || 'Unknown'}\nAge/Gender: ${e.patient?.age || 'N/A'}y / ${e.patient?.gender || 'N/A'}\nBlood Group: ${e.patient?.bloodGroup || 'Not Specified'}\nVillage: ${e.patient?.village || 'N/A'}\nEmergency Symptoms: ${e.description}\nHistory: ${e.patient?.medicalHistory || 'None'}`}
                      size={80}
                      level="H"
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>Hospital QR Code</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                      Scan at hospital reception for instant access to symptoms, blood group, and medical history.
                    </p>
                  </div>
                </div>
                
                {/* SMS Share button */}
                <a 
                  href={`sms:?body=${encodeURIComponent(`GRAMSAKHI EMERGENCY REFERRAL:\nPatient: ${e.patient?.name || 'Unknown'} (${e.patient?.age || 'N/A'}y/${e.patient?.gender || 'N/A'})\nBlood Group: ${e.patient?.bloodGroup || 'Not Specified'}\nVillage: ${e.patient?.village || 'N/A'}\nEmergency Symptoms: ${e.description}\nHistory: ${e.patient?.medicalHistory || 'None'}`)}`}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.65rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', width: '100%', marginTop: '0.75rem', boxSizing: 'border-box' }}
                >
                  💬 Share Report via SMS
                </a>
              </div>

              {/* Resolve Button */}
              <button
                onClick={() => handleResolve(e.id)}
                disabled={resolving === e.id}
                style={{ width: '100%', padding: '0.65rem', background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} />
                {resolving === e.id ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmergencyBoard;
