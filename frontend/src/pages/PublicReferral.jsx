import React from 'react';
import { Heart, Activity, Phone, MapPin, Calendar, Clock, AlertOctagon, Printer, CheckCircle } from 'lucide-react';

function PublicReferral() {
  // Extract query parameters from URL
  const query = new URLSearchParams(window.location.search);
  
  const type = query.get('type') || 'referral'; // 'emergency' or 'referral'
  const name = query.get('name') || 'Unknown Patient';
  const age = query.get('age') || '';
  const gender = query.get('gender') || '';
  const blood = query.get('blood') || '';
  const village = query.get('village') || '';
  const history = query.get('history') || '';
  const symptoms = query.get('symptoms') || '';
  const dateStr = query.get('date') || new Date().toISOString();

  const isEmergency = type === 'emergency';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="public-referral-container" style={{
      maxWidth: '650px',
      margin: '2rem auto',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      border: isEmergency ? '2px solid #fee2e2' : '2px solid #f0fdf4',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Banner */}
      <div style={{
        background: isEmergency ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
        padding: '1.75rem 2rem',
        color: 'white',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justify: 'center'
          }}>
            <Heart size={24} fill="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.5px' }}>GRAMSAKHI REFERRAL</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9, fontWeight: 500 }}>COMMUNITY HEALTH SYSTEM</p>
          </div>
        </div>
        
        {/* Pulsing Badge */}
        <div style={{
          position: 'absolute',
          top: '1.75rem',
          right: '2rem',
          background: isEmergency ? 'rgba(254, 226, 226, 0.2)' : 'rgba(209, 250, 229, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '20px',
          padding: '0.4rem 1rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          {isEmergency ? (
            <>
              <AlertOctagon size={14} /> Critical Alert
            </>
          ) : (
            <>
              <Activity size={14} /> Hospital Referral
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '2rem' }}>
        {/* Verification Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isEmergency ? '#fef2f2' : '#f0fdf4',
          border: isEmergency ? '1px solid #fee2e2' : '1px solid #d1fae5',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: isEmergency ? '#b91c1c' : '#047857'
        }}>
          <CheckCircle size={16} />
          <span><strong>Secure Offline Referral Card:</strong> Verified by local ASHA health worker.</span>
        </div>

        {/* Patient Details */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', margin: '0 0 1rem' }}>👤 Patient Identification</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Full Name</span>
              <strong style={{ fontSize: '1.25rem', color: '#1e293b' }}>{name}</strong>
            </div>
            
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Blood Group</span>
              <strong style={{ fontSize: '1.25rem', color: '#ef4444' }}>{blood || 'Not Specified'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Age & Gender</span>
              <span style={{ fontSize: '1rem', color: '#334155', fontWeight: 600 }}>
                {age ? `${age} Years` : 'N/A'} • {gender || 'N/A'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="#64748b" />
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Origin Village</span>
                <span style={{ fontSize: '1rem', color: '#334155', fontWeight: 600 }}>{village || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Symptoms Section */}
        <div style={{
          background: isEmergency ? '#fff5f5' : '#f9fafb',
          borderLeft: isEmergency ? '4px solid #ef4444' : '4px solid #10b981',
          padding: '1.25rem 1.5rem',
          borderRadius: '0 8px 8px 0',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem',
            fontSize: '0.9rem',
            color: isEmergency ? '#991b1b' : '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Activity size={16} fill={isEmergency ? '#ef4444' : '#10b981'} /> Reported Symptoms & Reasons
          </h3>
          <p style={{
            margin: 0,
            fontSize: '1rem',
            lineHeight: 1.5,
            color: isEmergency ? '#7f1d1d' : '#1f2937',
            fontWeight: 500
          }}>
            {symptoms || 'No active symptoms detailed.'}
          </p>
        </div>

        {/* Medical History */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 0.5rem' }}>📋 Relevant Medical History</h3>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '0.9rem',
            color: '#334155',
            lineHeight: 1.5
          }}>
            {history || 'No pre-existing chronic conditions reported.'}
          </div>
        </div>

        {/* Date & Time of Referral */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} />
            <span>Referral Date: {new Date(dateStr).toLocaleDateString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} />
            <span>Generated: {new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Actions (Print & Help) */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justify: 'center',
              gap: '0.5rem',
              background: isEmergency ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
            onMouseOut={(e) => e.currentTarget.style.opacity = 1}
          >
            <Printer size={16} /> Print / Save Referral Report
          </button>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div style={{
        background: '#f8fafc',
        padding: '1rem',
        textAlign: 'center',
        fontSize: '0.7rem',
        color: '#94a3b8',
        borderTop: '1px solid #f1f5f9'
      }}>
        This is an official offline referral card created by Gramsakhi Platform.
      </div>

      {/* CSS for print mode */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .public-referral-container {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

export default PublicReferral;
