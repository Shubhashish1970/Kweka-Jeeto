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

  if (loading) return <p className="text-slate-600">Loading...</p>;
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <p className="text-base text-red-500 mb-2">Failed to load</p>
        <p className="text-sm text-slate-600">
          {error}. If the admin was deployed via &quot;Deploy to Firebase Hosting on merge&quot;, add GitHub secret <strong>VITE_API_URL</strong> with your Cloud Run backend URL and redeploy.
        </p>
      </div>
    );
  }
  if (!summary) return <p className="text-slate-600">Failed to load</p>;

  const cropEntries = Object.entries(summary.byCrop).sort((a, b) => b[1] - a[1]);
  const stateEntries = Object.entries(summary.byState).sort((a, b) => b[1] - a[1]);
  const maxCrop = Math.max(...cropEntries.map(([, v]) => v), 1);
  const maxState = Math.max(...stateEntries.map(([, v]) => v), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Reports</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Registrations by Crop</h3>
          {cropEntries.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cropEntries.map(([crop, count]) => (
                <div key={crop}>
                  <div className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>{crop}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary rounded"
                      style={{ width: `${(count / maxCrop) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Registrations by State</h3>
          {stateEntries.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {stateEntries.map(([state, count]) => (
                <div key={state}>
                  <div className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>{state}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary rounded"
                      style={{ width: `${(count / maxState) * 100}%` }}
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
