import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Farmer {
  _id: string;
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
  createdAt: string;
}

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [crop, setCrop] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (state) params.set('state', state);
    if (crop) params.set('crop', crop);
    api
      .get<{ farmers: Farmer[]; total: number }>(`/farmers?${params}`)
      .then((r) => {
        setFarmers(r.farmers);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [page, search, state, crop]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (crop) params.set('crop', crop);
    const blob = await api.getBlob(`/farmers/export?${params}`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'farmers.csv';
    a.click();
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Farmers</h1>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
        />
        <input
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
        />
        <input
          placeholder="Crop"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
        />
        <button
          onClick={handleExport}
          style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}
        >
          Export CSV
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Age</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>State</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>District</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Crop</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((f) => (
                  <tr key={f._id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 12 }}>{f.farmer_name}</td>
                    <td style={{ padding: 12 }}>{f.age}</td>
                    <td style={{ padding: 12 }}>{f.state}</td>
                    <td style={{ padding: 12 }}>{f.district}</td>
                    <td style={{ padding: 12 }}>{f.crop}</td>
                    <td style={{ padding: 12 }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#6b7280' }}>Total: {total}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
