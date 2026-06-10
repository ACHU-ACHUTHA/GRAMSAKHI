import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

function Dashboard({ worker, isOffline }) {
  const [patients, setPatients] = useState([]);

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
      const res = await fetch(`${API_URL}/api/patients?workerId=${worker?.id}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.log('Using offline data for dashboard charts');
      try {
        const { getAllOfflinePatients } = await import('../db/offlineStorage');
        const offlinePatients = await getAllOfflinePatients();
        const filtered = offlinePatients.filter(p => p.workerId === worker?.id || p.workerId === 'default-worker');
        setPatients(filtered);
      } catch (e) {
        console.error('Failed to load offline data for dashboard', e);
      }
    }
  };

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

    if (p.medicalHistory) {
      const h = p.medicalHistory.toLowerCase();
      const highConditions = ['cancer','carcinoma','tumor','leukemia','lymphoma','heart failure',
        'kidney failure','renal failure','liver failure','hiv','aids','tuberculosis','tb',
        'sepsis','sickle cell'];
      const medConditions = ['diabetes','diabetic','hypertension','high blood pressure','asthma',
        'copd','epilepsy','anemia','malnutrition','pneumonia','hepatitis','dengue','malaria',
        'typhoid','cardiac','heart disease'];
      if (highConditions.some(c => h.includes(c))) return 'High';
      if (medConditions.some(c => h.includes(c))) return 'Medium';
    }
    return 'Low';
  };

  // Dynamic line chart calculation
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const last4Months = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    last4Months.push({
      monthIndex: d.getMonth(),
      name: months[d.getMonth()],
      val1: 0,
      val2: 0
    });
  }

  patients.forEach(p => {
    const date = new Date(p.createdAt || Date.now());
    const mIndex = date.getMonth();
    const target = last4Months.find(m => m.monthIndex === mIndex);
    if (target) {
      const risk = getDisplayRisk(p);
      if (risk === 'High') {
        target.val1++;
      } else {
        target.val2++;
      }
    }
  });

  const lineData = last4Months.map(({ name, val1, val2 }) => ({ name, val1, val2 }));

  // Dynamic pie chart calculation
  const lowCount = patients.filter(p => getDisplayRisk(p) === 'Low').length;
  const medCount = patients.filter(p => getDisplayRisk(p) === 'Medium').length;
  const highCount = patients.filter(p => getDisplayRisk(p) === 'High').length;
  const pieData = [
    { name: 'Low', value: lowCount, color: '#10b981' },
    { name: 'Medium', value: medCount, color: '#f59e0b' },
    { name: 'High', value: highCount, color: '#ef4444' },
  ];

  // Dynamic bar chart calculation
  const ageGroups = {
    '0-18': 0,
    '19-35': 0,
    '36-50': 0,
    '51-65': 0,
    '65+': 0
  };
  patients.forEach(p => {
    const age = p.age;
    if (age <= 18) ageGroups['0-18']++;
    else if (age <= 35) ageGroups['19-35']++;
    else if (age <= 50) ageGroups['36-50']++;
    else if (age <= 65) ageGroups['51-65']++;
    else ageGroups['65+']++;
  });
  const barData = Object.entries(ageGroups).map(([name, val]) => ({ name, val }));

  // Recent patients logic
  const recentPatients = patients.slice(0, 3);

  const getRiskColor = (risk) => {
    if (risk === 'High' || risk === 'High Emergency') return 'var(--risk-high)';
    if (risk === 'Medium' || risk === 'Moderate Risk') return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };

  return (
    <div>
      <div className="dashboard-grid">
        {/* Main Chart */}
        <div className="dashboard-card" style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="val1" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="val2" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="dashboard-card" style={{ height: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }}></span>
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart - Age Distribution */}
        <div className="dashboard-card">
          <h2 className="card-title">Age Distribution</h2>
          <p className="card-subtitle">Patient breakdown by age group</p>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Patients List */}
        <div className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="card-title" style={{ marginBottom: 0 }}>Recent Patients</h2>
              <p className="card-subtitle" style={{ margin: '0.25rem 0 0' }}>Latest additions</p>
            </div>
            <a href="/patients" style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>View all →</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentPatients.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No patients registered yet.</p>
              </div>
            ) : recentPatients.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="patient-cell">
                  <div className="patient-initial" style={{ background: getRiskColor(getDisplayRisk(p)) }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="patient-info">
                    <strong>{p.name}</strong>
                    <span>{p.age}y, {p.gender}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
                  {getDisplayRisk(p)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
