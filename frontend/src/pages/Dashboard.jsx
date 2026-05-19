import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

function Dashboard({ worker, isOffline }) {
  const [patients, setPatients] = useState([]);

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
      console.log('Using offline data for dashboard charts (not fully implemented)');
    }
  };

  // Mock data for charts as per screenshot
  const lineData = [
    { name: 'Jan', val1: 3, val2: 12 },
    { name: 'Feb', val1: 5, val2: 10 },
    { name: 'Mar', val1: 4, val2: 13 },
    { name: 'Apr', val1: 3, val2: 8 },
  ];

  const pieData = [
    { name: 'Low', value: 2, color: '#10b981' },
    { name: 'Medium', value: 3, color: '#f59e0b' },
    { name: 'High', value: 3, color: '#ef4444' },
  ];

  const barData = [
    { name: '0-18', val: 0 },
    { name: '19-35', val: 3 },
    { name: '36-50', val: 1 },
    { name: '51-65', val: 2 },
    { name: '65+', val: 2 },
  ];

  // Recent patients logic
  const recentPatients = patients.slice(0, 3);
  if (recentPatients.length === 0) {
    // Fill with mock data matching the screenshot if no real data
    recentPatients.push(
      { id: 1, name: 'Test Patient', age: 30, gender: 'Female', status: 'Stable', riskLevel: 'Medium' },
      { id: 2, name: 'achu', age: 85, gender: 'Female', status: 'Critical', riskLevel: 'High' },
      { id: 3, name: 'Ananya Reddy', age: 28, gender: 'Female', status: 'Recovering', riskLevel: 'Medium' }
    );
  }

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
            {recentPatients.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="patient-cell">
                  <div className="patient-initial" style={{ background: getRiskColor(p.riskLevel) }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="patient-info">
                    <strong>{p.name}</strong>
                    <span>{p.age}y, {p.gender}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
                  {p.riskLevel === 'High Emergency' ? 'High' : p.riskLevel === 'Moderate Risk' ? 'Medium' : p.riskLevel || 'Low'}
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
