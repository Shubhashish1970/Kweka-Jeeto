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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Farmers</p>
          <p className="text-3xl font-bold text-primary">{summary.total}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">By Crop</h3>
          <ul className="divide-y divide-slate-100">
            {Object.entries(summary.byCrop).map(([crop, count]) => (
              <li key={crop} className="py-3 flex justify-between text-sm text-slate-700">
                <span>{crop}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
            {Object.keys(summary.byCrop).length === 0 && <li className="py-3 text-slate-500 text-sm">No data yet</li>}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">By State</h3>
          <ul className="divide-y divide-slate-100">
            {Object.entries(summary.byState).map(([state, count]) => (
              <li key={state} className="py-3 flex justify-between text-sm text-slate-700">
                <span>{state}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
            {Object.keys(summary.byState).length === 0 && <li className="py-3 text-slate-500 text-sm">No data yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
