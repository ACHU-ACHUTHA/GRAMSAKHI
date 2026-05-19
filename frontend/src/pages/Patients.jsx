import React, { useState, useEffect } from 'react';
import { Eye, Trash2, X, AlertTriangle, User, Phone, MapPin, Calendar } from 'lucide-react';
import { savePatientOffline } from '../db/offlineStorage';

function AddPatientModal({ worker, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'Female', phone: '', village: worker?.village || '', medicalHistory: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender) return;
    setLoading(true);
    try {
      const patientData = {
        id: `patient-${Date.now()}`,
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
        phone: form.phone,
        village: form.village || worker?.village || 'N/A',
        workerId: worker?.id || 'default-worker',
        medicalHistory: form.medicalHistory
      };
      // Try online first
      try {
        const res = await fetch('http://localhost:5000/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientData)
        });
        if (res.ok) {
          const saved = await res.json();
          onSave(saved);
          return;
        }
      } catch (netErr) {
        // Offline – save locally
        await savePatientOffline(patientData);
        onSave(patientData);
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Add New Patient</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label"><User size={14} style={{ marginRight: 4 }} />Full Name *</label>
            <input name="name" className="input-field" placeholder="Patient's full name" value={form.name} onChange={handleChange} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label"><Calendar size={14} style={{ marginRight: 4 }} />Age *</label>
              <input name="age" type="number" className="input-field" placeholder="Age" value={form.age} onChange={handleChange} required min="0" />
            </div>
            <div className="input-group">
              <label className="input-label">Gender *</label>
              <select name="gender" className="input-field" value={form.gender} onChange={handleChange} required>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label"><Phone size={14} style={{ marginRight: 4 }} />Phone Number</label>
            <input name="phone" className="input-field" placeholder="e.g. 9876543210" value={form.phone} onChange={handleChange} />
          </div>
          <div className="input-group">
            <label className="input-label"><MapPin size={14} style={{ marginRight: 4 }} />Village</label>
            <input name="village" className="input-field" placeholder="Patient's village" value={form.village} onChange={handleChange} />
          </div>
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Medical History</label>
            <textarea name="medicalHistory" className="input-field" placeholder="Any pre-existing conditions..." value={form.medicalHistory} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}>
              {loading ? 'Saving...' : '+ Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PatientDetailModal({ patient, onClose }) {
  const getRiskColor = (risk) => {
    if (risk === 'High' || risk === 'High Emergency') return 'var(--risk-high)';
    if (risk === 'Medium' || risk === 'Moderate Risk') return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };
  const displayRisk = patient.riskLevel === 'High Emergency' ? 'High' : patient.riskLevel === 'Moderate Risk' ? 'Medium' : patient.riskLevel || 'Low';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Patient Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
          <div className="patient-initial" style={{ background: getRiskColor(displayRisk), width: 56, height: 56, fontSize: '1.4rem', borderRadius: '14px' }}>
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{patient.name}</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{patient.age} yrs • {patient.gender} • {patient.village}</p>
          </div>
          <span style={{ marginLeft: 'auto', background: getRiskColor(displayRisk), color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{displayRisk}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {patient.phone && <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><Phone size={16} color="var(--text-muted)" /><span>{patient.phone}</span></div>}
          {patient.medicalHistory && <div><p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Medical History</p><p style={{ color: 'var(--text-muted)', margin: 0 }}>{patient.medicalHistory}</p></div>}
          {patient.symptoms && patient.symptoms.length > 0 && (
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Symptom Logs ({patient.symptoms.length})</p>
              {patient.symptoms.slice(0, 5).map((s, i) => (
                <div key={i} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 600, color: getRiskColor(s.riskLevel) }}>{s.riskLevel}</span> — {s.symptoms}
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>Close</button>
      </div>
    </div>
  );
}

function Patients({ worker, isOffline, updateSyncCount }) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [isOffline, worker]);

  const fetchPatients = async () => {
    try {
      if (isOffline) throw new Error('Offline');
      const res = await fetch(`http://localhost:5000/api/patients?workerId=${worker?.id}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.log('Using offline data for patients');
    }
  };

  const getRiskColor = (risk) => {
    if (risk === 'High' || risk === 'High Emergency') return 'var(--risk-high)';
    if (risk === 'Medium' || risk === 'Moderate Risk') return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };

  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`Are you sure you want to delete ${patient.name}?`)) return;
    setPatients(prev => prev.filter(p => p.id !== patient.id));
  };

  const handlePatientAdded = (newPatient) => {
    setPatients(prev => [newPatient, ...prev]);
    if (updateSyncCount) updateSyncCount();
  };

  // The base list is real API data OR demo fallback if no API data loaded yet
  const DEMO_PATIENTS = [
    { id: 1, name: 'Aarav Patel', age: 45, gender: 'Male', village: 'Rampur', status: 'Stable', riskLevel: 'Low', symptoms: [] },
    { id: 2, name: 'Diya Sharma', age: 65, gender: 'Female', village: 'Rampur', status: 'Critical', riskLevel: 'High Emergency', symptoms: [] },
    { id: 3, name: 'Rohan Verma', age: 32, gender: 'Male', village: 'Keshpur', status: 'Recovering', riskLevel: 'Low', symptoms: [] },
    { id: 4, name: 'Priya Gupta', age: 58, gender: 'Female', village: 'Keshpur', status: 'Stable', riskLevel: 'Moderate Risk', symptoms: [] }
  ];
  const baseList = patients.length > 0 ? patients : DEMO_PATIENTS;

  // Search & filter always run on the full base list
  const displayPatients = baseList.filter(p => {
    const displayRisk = p.riskLevel === 'High Emergency' ? 'High' : p.riskLevel === 'Moderate Risk' ? 'Medium' : p.riskLevel || 'Low';
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.village || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'All' || displayRisk === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div>
      {showAddModal && <AddPatientModal worker={worker} onClose={() => setShowAddModal(false)} onSave={handlePatientAdded} />}
      {selectedPatient && <PatientDetailModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          {(searchQuery || riskFilter !== 'All')
            ? `${displayPatients.length} of ${baseList.length} patient${baseList.length !== 1 ? 's' : ''} match`
            : `${displayPatients.length} patient${displayPatients.length !== 1 ? 's' : ''} found`}
        </p>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '0.6rem 1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          + Add Patient
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, background: 'white', border: '1px solid var(--border-color)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Search by name or village..."
            style={{ width: '100%' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={16} /></button>}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRiskDropdown(!showRiskDropdown)}
            style={{ background: riskFilter !== 'All' ? 'var(--primary)' : 'white', color: riskFilter !== 'All' ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
            <AlertTriangle size={16} />
            {riskFilter === 'All' ? 'Filter Risk' : riskFilter} ⌄
          </button>
          {showRiskDropdown && (
            <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 10, minWidth: 140 }}>
              {['All', 'Low', 'Medium', 'High'].map(r => (
                <button key={r} onClick={() => { setRiskFilter(r); setShowRiskDropdown(false); }}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: riskFilter === r ? '#f0f9ff' : 'white', cursor: 'pointer', textAlign: 'left', fontWeight: riskFilter === r ? 600 : 400, color: r === 'High' ? 'var(--risk-high)' : r === 'Medium' ? 'var(--risk-medium)' : r === 'Low' ? 'var(--risk-low)' : 'var(--text-main)' }}>
                  {r === 'All' ? '🔍 All Risks' : r === 'High' ? '🔴 High Risk' : r === 'Medium' ? '🟡 Medium Risk' : '🟢 Low Risk'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="patients-table-container">
        <table className="patients-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Age</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Symptoms</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayPatients.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div>😔 No patients match your search.</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try clearing the search or changing the risk filter.</div>
              </td></tr>
            ) : displayPatients.map((p, idx) => {
              const displayRisk = p.riskLevel === 'High Emergency' ? 'High' : p.riskLevel === 'Moderate Risk' ? 'Medium' : p.riskLevel || 'Low';
              return (
                <tr key={p.id || idx} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="patient-cell">
                      <div className="patient-initial" style={{ background: getRiskColor(displayRisk) }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="patient-info">
                        <strong>{p.name}</strong>
                        <span>{p.gender} • {p.village}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-main)' }}>{p.age}y</td>
                  <td>
                    <span className="status-dot" style={{ background: getRiskColor(displayRisk) }}></span>
                    <span style={{ color: displayRisk === 'High' ? 'var(--risk-high)' : displayRisk === 'Low' ? 'var(--risk-low)' : 'var(--text-main)', fontWeight: 500 }}>
                      {p.status || (displayRisk === 'High' ? 'Critical' : displayRisk === 'Medium' ? 'Monitor' : 'Stable')}
                    </span>
                  </td>
                  <td>
                    <span style={{ background: getRiskColor(displayRisk), color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {displayRisk}
                    </span>
                  </td>
                  <td>
                    {p.symptoms && p.symptoms.length > 0
                      ? p.symptoms.slice(0, 2).map((sym, i) => <span key={i} className="badge">{sym.symptoms || sym}</span>)
                      : <span className="badge">None logged</span>}
                    {p.symptoms && p.symptoms.length > 2 && <span className="badge">+{p.symptoms.length - 2}</span>}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button title="View Details" onClick={() => setSelectedPatient(p)}
                        style={{ background: '#f0f9ff', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#0ea5e9', display: 'flex', alignItems: 'center' }}>
                        <Eye size={16} />
                      </button>
                      <button title="Delete Patient" onClick={() => handleDeletePatient(p)}
                        style={{ background: '#fef2f2', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Patients;
