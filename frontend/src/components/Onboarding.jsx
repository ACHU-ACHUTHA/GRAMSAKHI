import React, { useState } from 'react';
import { apiFetch } from '../utils/api';

function Onboarding({ worker, onComplete }) {
  const [name, setName] = useState(worker?.name !== 'ASHA Worker' ? worker?.name : '');
  const [age, setAge] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState(worker?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !age || !village || !phone) return;

    setLoading(true);
    try {
      const res = await apiFetch(`/api/worker/${worker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, age, village, phone }),
      });

      const updatedWorker = await res.json();
      onComplete(updatedWorker);
    } catch (err) {
      console.error('Update profile error', err);
      alert(err.message || 'Network error while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <section className="glass-card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>👩🏽‍⚕️</span>
          <h2 style={{ color: 'var(--primary-color)', margin: '1rem 0 0.5rem' }}>Welcome to Gramsakhi!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Please complete your ASHA worker profile to continue.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Sunita Devi" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Age</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 34" 
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min="18"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input 
              type="tel" 
              className="input-field" 
              placeholder="e.g. 9876543210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Village Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Rampur" 
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Saving Profile...' : 'Complete Setup & Go to Dashboard'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Onboarding;
