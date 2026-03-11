import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Summary {
  total: number;
  byCrop: Record<string, number>;
  byState: Record<string, number>;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Summary>('/reports/summary')
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Backend unreachable'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) {
    return (
      <div>
        <p style={{ color: '#dc2626', marginBottom: 8 }}>Failed to load</p>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          {error}. If the admin was deployed via &quot;Deploy to Firebase Hosting on merge&quot;, add GitHub secret <strong>VITE_API_URL</strong> with your Cloud Run backend URL and redeploy.
        </p>
      </div>
    );
  }
  if (!summary) return <p>Failed to load</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: 14 }}>Total Farmers</p>
          <p style={{ fontSize: 32, fontWeight: 700 }}>{summary.total}</p>
        </div>
      </div>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginBottom: 16 }}>By Crop</h3>
          <ul style={{ listStyle: 'none' }}>
            {Object.entries(summary.byCrop).map(([crop, count]) => (
              <li key={crop} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                <span>{crop}</span>
                <span>{count}</span>
              </li>
            ))}
            {Object.keys(summary.byCrop).length === 0 && <li style={{ color: '#6b7280' }}>No data yet</li>}
          </ul>
        </div>
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginBottom: 16 }}>By State</h3>
          <ul style={{ listStyle: 'none' }}>
            {Object.entries(summary.byState).map(([state, count]) => (
              <li key={state} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                <span>{state}</span>
                <span>{count}</span>
              </li>
            ))}
            {Object.keys(summary.byState).length === 0 && <li style={{ color: '#6b7280' }}>No data yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
