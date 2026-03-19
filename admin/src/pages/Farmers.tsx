import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import GlobalMessageBar from '../components/shared/GlobalMessageBar';
import Button from '../components/shared/Button';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import Toast from '../components/shared/Toast';
import { PAGE_INFO_BANNERS } from '../constants/pageInfoBanners';

function formatMobile(waId: string): string {
  if (/^91\d{10}$/.test(waId)) return `+91 ${waId.slice(2)}`;
  if (/^1\d{10}$/.test(waId)) return `+1 ${waId.slice(1)}`;
  return `+${waId}`;
}

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
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [crop, setCrop] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchFarmers = () => {
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
  };

  useEffect(() => {
    fetchFarmers();
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

  const confirmDelete = (farmer: Farmer) => {
    setDeleteId(farmer._id);
    setDeleteName(farmer.farmer_name);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/farmers/${deleteId}`);
      setDeleteId(null);
      setToast({ type: 'success', message: 'Farmer deleted successfully.' });
      fetchFarmers();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete farmer.' });
    } finally {
      setDeleting(false);
    }
  };

  const banner = PAGE_INFO_BANNERS.farmers;

  return (
    <div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={!!deleteId}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${deleteName}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <GlobalMessageBar title={banner.title} description={banner.description} className="mb-4" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Farmers</h1>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-w-0 overflow-hidden">
        {/* Filter / action bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <input
            placeholder="State"
            value={state}
            onChange={(e) => { setState(e.target.value); setPage(1); }}
            className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <input
            placeholder="Crop"
            value={crop}
            onChange={(e) => { setCrop(e.target.value); setPage(1); }}
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
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Mobile</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Age</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">State</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">District</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Crop</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest" colSpan={2}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {farmers.map((f) => (
                    <tr key={f._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-slate-900 font-medium truncate">{f.farmer_name}</td>
                      <td className="px-3 py-2 text-sm text-slate-700 truncate">{formatMobile(f.wa_id)}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{f.age}</td>
                      <td className="px-3 py-2 text-sm text-slate-700 truncate">{f.state}</td>
                      <td className="px-3 py-2 text-sm text-slate-700 truncate">{f.district}</td>
                      <td className="px-3 py-2 text-sm text-slate-700 truncate">{f.crop}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{new Date(f.createdAt).toLocaleDateString()}</td>
                      <td className="px-2 py-2">
                        {/* Edit */}
                        <button
                          title="Edit"
                          onClick={() => navigate(`/farmers/${f._id}/edit`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        >
                          {/* Pencil icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4 1 1-4 12.362-12.726z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        {/* Delete */}
                        <button
                          title="Delete"
                          onClick={() => confirmDelete(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
                        >
                          {/* Trash icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </td>
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
