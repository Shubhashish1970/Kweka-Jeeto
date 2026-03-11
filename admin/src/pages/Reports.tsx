import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Summary {
  total: number;
  byCrop: Record<string, number>;
  byState: Record<string, number>;
}

export default function Reports() {
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

  const cropEntries = Object.entries(summary.byCrop).sort((a, b) => b[1] - a[1]);
  const stateEntries = Object.entries(summary.byState).sort((a, b) => b[1] - a[1]);
  const maxCrop = Math.max(...cropEntries.map(([, v]) => v), 1);
  const maxState = Math.max(...stateEntries.map(([, v]) => v), 1);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Reports</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginBottom: 16 }}>Registrations by Crop</h3>
          {cropEntries.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cropEntries.map(([crop, count]) => (
                <div key={crop}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{crop}</span>
                    <span>{count}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: '#e5e7eb',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(count / maxCrop) * 100}%`,
                        height: '100%',
                        background: '#2563eb',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginBottom: 16 }}>Registrations by State</h3>
          {stateEntries.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stateEntries.map(([state, count]) => (
                <div key={state}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{state}</span>
                    <span>{count}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: '#e5e7eb',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(count / maxState) * 100}%`,
                        height: '100%',
                        background: '#059669',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
