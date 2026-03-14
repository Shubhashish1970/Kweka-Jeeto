import { useState, useEffect } from 'react';
import { api } from '../api/client';
import GlobalMessageBar from '../components/shared/GlobalMessageBar';
import Button from '../components/shared/Button';
import { PAGE_INFO_BANNERS } from '../constants/pageInfoBanners';

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

  const banner = PAGE_INFO_BANNERS.farmers;

  return (
    <div>
      <GlobalMessageBar title={banner.title} description={banner.description} className="mb-4" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Farmers</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-w-0 overflow-hidden">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <input
            placeholder="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <input
            placeholder="Crop"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <Button type="button" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
        {loading ? (
          <p className="text-slate-600 text-sm">Loading...</p>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Age</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">State</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">District</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Crop</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {farmers.map((f) => (
                    <tr key={f._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-slate-900 font-medium">{f.farmer_name}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{f.age}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{f.state}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{f.district}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{f.crop}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{new Date(f.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-slate-600">Total: {total}</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
