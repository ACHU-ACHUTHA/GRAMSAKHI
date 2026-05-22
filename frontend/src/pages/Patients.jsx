import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, Trash2, X, AlertTriangle, User, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { savePatientOffline, getAllOfflinePatients, cachePatientsOffline, deletePatientOffline } from '../db/offlineStorage';

function AddPatientModal({ worker, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'Female', phone: '', village: worker?.village || '', medicalHistory: '', bloodGroup: '' });
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
        medicalHistory: form.medicalHistory,
        bloodGroup: form.bloodGroup
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
            <div className="input-group">
              <label className="input-label">Blood Group</label>
              <select name="bloodGroup" className="input-field" value={form.bloodGroup} onChange={handleChange}>
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
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

  // Infer risk from medicalHistory if no symptom-log risk exists
  const getRiskFromHistory = (history = '') => {
    if (!history) return 'Low';
    const h = history.toLowerCase();
    const highConditions = ['cancer','carcinoma','tumor','leukemia','lymphoma','heart failure',
      'kidney failure','renal failure','liver failure','hiv','aids','tuberculosis','tb',
      'sepsis','sickle cell'];
    const medConditions = ['diabetes','diabetic','hypertension','high blood pressure','asthma',
      'copd','epilepsy','anemia','malnutrition','pneumonia','hepatitis','dengue','malaria',
      'typhoid','cardiac','heart disease'];
    if (highConditions.some(c => h.includes(c))) return 'High';
    if (medConditions.some(c => h.includes(c))) return 'Medium';
    return 'Low';
  };

  let displayRisk;
  if (patient.riskLevel === 'High Emergency') displayRisk = 'High';
  else if (patient.riskLevel === 'Moderate Risk') displayRisk = 'Medium';
  else if (patient.riskLevel === 'High' || patient.riskLevel === 'Medium' || patient.riskLevel === 'Low') displayRisk = patient.riskLevel;
  else displayRisk = getRiskFromHistory(patient.medicalHistory);


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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>BLOOD GROUP</span>
              <strong style={{ fontSize: '1rem', color: '#dc2626' }}>{patient.bloodGroup || 'Not Specified'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>PHONE</span>
              <strong>{patient.phone || 'N/A'}</strong>
            </div>
          </div>
          {patient.medicalHistory && <div><p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Medical History</p><p style={{ color: 'var(--text-muted)', margin: 0 }}>{patient.medicalHistory}</p></div>}
          {patient.symptoms && patient.symptoms.length > 0 && (
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Symptom Logs ({patient.symptoms.length})</p>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {patient.symptoms.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map((s, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.875rem', borderLeft: `3.5px solid ${getRiskColor(s.riskLevel)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, color: getRiskColor(s.riskLevel) }}>{s.riskLevel}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Sync Pending'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}><strong>Symptoms:</strong> {s.symptoms}</div>
                    {s.notes && (
                      <div style={{ marginTop: '0.4rem', color: '#475569', fontSize: '0.8rem', background: '#f1f5f9', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                        <strong>Guidance:</strong> {s.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hospital Referral QR & SMS section */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--primary-color)' }}>🏥 Hospital Referral (QR & SMS)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#f0fdf4', padding: '0.75rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ background: 'white', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QRCodeSVG
                  value={`GRAMSAKHI PATIENT REPORT\nName: ${patient.name}\nAge/Gender: ${patient.age}y/${patient.gender}\nBlood Group: ${patient.bloodGroup || 'Not Specified'}\nVillage: ${patient.village}\nHistory: ${patient.medicalHistory || 'None'}\nLatest Symptoms: ${patient.symptoms && patient.symptoms.length > 0 ? patient.symptoms[0].symptoms : 'None logged'}`}
                  size={90}
                  level="H"
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#166534' }}>
                <strong>Scan Referral QR Code</strong>
                <p style={{ margin: '0.25rem 0 0', lineHeight: 1.3 }}>Hospitals can scan this code to instantly receive the patient's vitals, symptoms, and medical details offline.</p>
              </div>
            </div>
            
            {/* SMS Share button */}
            <a 
              href={`sms:?body=${encodeURIComponent(`GRAMSAKHI REFERRAL:\nPatient: ${patient.name} (${patient.age}y/${patient.gender})\nBlood Group: ${patient.bloodGroup || 'Not Specified'}\nVillage: ${patient.village}\nSymptoms: ${patient.symptoms && patient.symptoms.length > 0 ? patient.symptoms[0].symptoms : 'None'}\nHistory: ${patient.medicalHistory || 'None'}`)}`}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.65rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}
            >
              💬 Share Referral via SMS
            </a>
          </div>
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>Close</button>
      </div>
    </div>
  );
}

function AddSymptomModal({ patient, onClose, onSave, isOffline }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const symptomCategories = {
    'Critical / Emergency': [
      'chest pain', 'severe breathing difficulty', 'shortness of breath',
      'unconscious', 'unresponsive', 'seizures', 'severe bleeding',
      'paralysis', 'sudden vision loss', 'severe abdominal pain', 'confusion'
    ],
    'Urgent / Moderate': [
      'high fever', 'fever', 'persistent vomiting', 'vomiting',
      'severe headache', 'headache', 'diarrhea', 'dizziness',
      'palpitations', 'weakness', 'swelling', 'jaundice'
    ],
    'Mild / Common': [
      'cough', 'runny nose', 'sore throat', 'mild rash', 'muscle ache', 'fatigue', 'nausea'
    ]
  };

  const handleToggle = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      alert('Please select at least one symptom.');
      return;
    }

    setLoading(true);
    try {
      let analysisResult;
      if (isOffline) {
        const { analyzeSymptomsLocally } = await import('../utils/localAiEngine');
        analysisResult = analyzeSymptomsLocally(selectedSymptoms, patient.medicalHistory);
      } else {
        const res = await fetch('http://localhost:5000/api/analyze-symptoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symptoms: selectedSymptoms,
            patientId: patient.id,
            medicalHistory: patient.medicalHistory
          })
        });
        if (res.ok) {
          analysisResult = await res.json();
        } else {
          throw new Error('Server analysis failed');
        }
      }

      if (isOffline) {
        const { saveSymptomLogOffline } = await import('../db/offlineStorage');
        const offlineLog = {
          id: `log-${Date.now()}`,
          patientId: patient.id,
          symptoms: selectedSymptoms.join(', '),
          riskLevel: analysisResult.riskLevel,
          notes: notes ? `${analysisResult.guidance} | Notes: ${notes}` : analysisResult.guidance,
          createdAt: new Date().toISOString()
        };
        await saveSymptomLogOffline(offlineLog);
      }

      alert(`Symptom analysis complete!\n\nRisk Level: ${analysisResult.riskLevel}\nGuidance: ${analysisResult.guidance}`);
      onSave();
    } catch (err) {
      console.error(err);
      alert('Error saving symptom log. If offline, the symptoms will be saved to sync queue.');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Log Symptoms & Triage</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Patient: <strong>{patient.name}</strong> ({patient.age}y, {patient.gender})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {Object.entries(symptomCategories).map(([categoryName, symptoms]) => (
              <div key={categoryName}>
                <h4 style={{ 
                  margin: '0 0 0.75rem 0', 
                  color: categoryName.includes('Critical') ? 'var(--risk-high)' : categoryName.includes('Urgent') ? 'var(--risk-medium)' : 'var(--risk-low)',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '0.25rem'
                }}>
                  {categoryName}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.5rem' }}>
                  {symptoms.map(s => {
                    const isSelected = selectedSymptoms.includes(s);
                    return (
                      <label key={s} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.5rem 0.75rem', 
                        border: isSelected ? '1px solid var(--primary-color)' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: isSelected ? '#f0f9ff' : 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        userSelect: 'none',
                        transition: 'all 0.2s'
                      }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => handleToggle(s)} 
                          style={{ accentColor: 'var(--primary-color)' }}
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">ASHA Worker Notes / Observations</label>
            <textarea 
              className="input-field" 
              placeholder="E.g., high pulse rate, complains of dizziness for 2 days..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
              style={{ resize: 'vertical' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}>
              {loading ? 'Analyzing...' : 'Run Triage Analysis'}
            </button>
          </div>
        </form>
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
  const [patientForSymptomLog, setPatientForSymptomLog] = useState(null);
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const location = useLocation();

  // Sync searchQuery with URL query parameter 'q'
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlQuery = queryParams.get('q') || '';
    if (urlQuery) {
      setSearchQuery(urlQuery);
    }
  }, [location.search]);

  useEffect(() => {
    fetchPatients();

    const handleSync = () => {
      fetchPatients();
    };
    window.addEventListener('sync-completed', handleSync);
    return () => window.removeEventListener('sync-completed', handleSync);
  }, [isOffline, worker]);

  const fetchPatients = async () => {
    try {
      if (isOffline) throw new Error('Offline');
      const res = await fetch(`http://localhost:5000/api/patients?workerId=${worker?.id}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
        // Cache fetched patients locally for offline use
        await cachePatientsOffline(data);
      }
    } catch (err) {
      console.log('Using offline data for patients', err);
      const offlinePatients = await getAllOfflinePatients();
      const filtered = offlinePatients.filter(p => p.workerId === worker?.id || p.workerId === 'default-worker');
      setPatients(filtered);
    } finally {
      setHasLoaded(true);
    }
  };

  const getRiskFromHistory = (history = '') => {
    if (!history) return 'Low';
    const h = history.toLowerCase();
    const highConditions = ['cancer','carcinoma','tumor','leukemia','lymphoma','heart failure',
      'kidney failure','renal failure','liver failure','hiv','aids','tuberculosis','tb',
      'sepsis','sickle cell'];
    const medConditions = ['diabetes','diabetic','hypertension','high blood pressure','asthma',
      'copd','epilepsy','anemia','malnutrition','pneumonia','hepatitis','dengue','malaria',
      'typhoid','cardiac','heart disease'];
    if (highConditions.some(c => h.includes(c))) return 'High';
    if (medConditions.some(c => h.includes(c))) return 'Medium';
    return 'Low';
  };

  const getRiskColor = (risk) => {
    if (risk === 'High' || risk === 'High Emergency') return 'var(--risk-high)';
    if (risk === 'Medium' || risk === 'Moderate Risk') return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };

  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`Are you sure you want to delete ${patient.name}?`)) return;

    // Optimistically update list
    setPatients(prev => prev.filter(p => p.id !== patient.id));

    try {
      if (isOffline) {
        await deletePatientOffline(patient.id);
        if (updateSyncCount) updateSyncCount();
      } else {
        const res = await fetch(`http://localhost:5000/api/patients/${patient.id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          throw new Error('Failed to delete on server');
        }
        // Also delete from local forage cache
        await deletePatientOffline(patient.id);
      }
    } catch (err) {
      console.error('Delete patient error:', err);
      alert('Patient deleted locally. Deletion will sync once connection is restored.');
    }
  };

  const handlePatientAdded = async (newPatient) => {
    setPatients(prev => [{ ...newPatient, symptoms: newPatient.symptoms || [] }, ...prev]);
    if (updateSyncCount) updateSyncCount();
    await fetchPatients();
  };

  const handleSymptomLogged = async () => {
    if (updateSyncCount) updateSyncCount();
    await fetchPatients();
  };

  const baseList = patients;

  const getDisplayRisk = (p) => {
    if (p.riskLevel === 'High Emergency') return 'High';
    if (p.riskLevel === 'Moderate Risk') return 'Medium';
    if (p.riskLevel === 'High' || p.riskLevel === 'Medium' || p.riskLevel === 'Low') return p.riskLevel;

    if (p.symptoms && p.symptoms.length > 0) {
      const latest = [...p.symptoms].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (latest.riskLevel === 'High Emergency') return 'High';
      if (latest.riskLevel === 'Moderate Risk') return 'Medium';
      if (latest.riskLevel === 'High' || latest.riskLevel === 'Medium' || latest.riskLevel === 'Low') return latest.riskLevel;
    }

    return getRiskFromHistory(p.medicalHistory);
  };

  const displayPatients = baseList.filter(p => {
    const displayRisk = getDisplayRisk(p);
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
      {patientForSymptomLog && (
        <AddSymptomModal 
          patient={patientForSymptomLog} 
          isOffline={isOffline} 
          onClose={() => setPatientForSymptomLog(null)} 
          onSave={handleSymptomLogged} 
        />
      )}

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
        <form onSubmit={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
          <div className="search-bar" style={{ flex: 1, background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder="Search by name or village..."
              style={{ width: '100%', border: 'none', outline: 'none', marginLeft: '0.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={16} /></button>}
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: '20px', fontWeight: 600 }}>
            Search
          </button>
        </form>
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
              <th>Blood Group</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Symptoms</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!hasLoaded ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div>⏳ Loading patients...</div>
              </td></tr>
            ) : displayPatients.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {searchQuery || riskFilter !== 'All' ? (
                  <>
                    <div>😔 No patients match your search.</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try clearing the search or changing the risk filter.</div>
                  </>
                ) : (
                  <>
                    <div>📋 No patients registered yet.</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Click '+ Add Patient' to register your first patient.</div>
                  </>
                )}
              </td></tr>
            ) : displayPatients.map((p, idx) => {
              const displayRisk = getDisplayRisk(p);
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
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{p.bloodGroup || '-'}</td>
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
                    {(() => {
                      if (p.symptoms && p.symptoms.length > 0) {
                        const allSyms = Array.from(new Set(
                          p.symptoms.flatMap(s => (s.symptoms || '').split(',').map(x => x.trim()))
                        )).filter(Boolean);
                        
                        if (allSyms.length === 0) return <span className="badge">None logged</span>;
                        
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {allSyms.slice(0, 3).map((sym, i) => <span key={i} className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>{sym}</span>)}
                            {allSyms.length > 3 && <span className="badge" style={{ background: 'var(--primary-color)', color: 'white' }}>+{allSyms.length - 3}</span>}
                          </div>
                        );
                      }
                      return <span className="badge">None logged</span>;
                    })()}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button title="View Details" onClick={() => setSelectedPatient(p)}
                        style={{ background: '#f0f9ff', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#0ea5e9', display: 'flex', alignItems: 'center' }}>
                        <Eye size={16} />
                      </button>
                      <button title="Log Symptoms" onClick={() => setPatientForSymptomLog(p)}
                        style={{ background: '#f0fdf4', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center' }}>
                        <Activity size={16} />
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
