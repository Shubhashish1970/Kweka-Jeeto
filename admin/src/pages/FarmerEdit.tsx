/**
 * FarmerEdit — full-page edit form per UI_STANDARDS.md
 * Teal left bar, two-column layout, section headers, h-10 inputs.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Button from '../components/shared/Button';
import Toast from '../components/shared/Toast';
import ConfirmDialog from '../components/shared/ConfirmDialog';

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

const STATE_OPTIONS = [
  { value: 'maharashtra', label: 'Maharashtra' },
  { value: 'punjab', label: 'Punjab' },
  { value: 'karnataka', label: 'Karnataka' },
  { value: 'uttar_pradesh', label: 'Uttar Pradesh' },
  { value: 'gujarat', label: 'Gujarat' },
  { value: 'rajasthan', label: 'Rajasthan' },
  { value: 'madhya_pradesh', label: 'Madhya Pradesh' },
  { value: 'andhra_pradesh', label: 'Andhra Pradesh' },
  { value: 'tamil_nadu', label: 'Tamil Nadu' },
  { value: 'west_bengal', label: 'West Bengal' },
  { value: 'bihar', label: 'Bihar' },
  { value: 'telangana', label: 'Telangana' },
  { value: 'haryana', label: 'Haryana' },
  { value: 'kerala', label: 'Kerala' },
  { value: 'other', label: 'Other' },
];

const CROP_OPTIONS = [
  { value: 'cotton', label: 'Cotton' },
  { value: 'paddy', label: 'Paddy (Rice)' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'maize', label: 'Maize' },
  { value: 'chilli', label: 'Chilli' },
  { value: 'sugarcane', label: 'Sugarcane' },
  { value: 'soybean', label: 'Soybean' },
  { value: 'jowar', label: 'Jowar (Sorghum)' },
  { value: 'bajra', label: 'Bajra (Pearl Millet)' },
  { value: 'groundnut', label: 'Groundnut' },
  { value: 'castor', label: 'Castor' },
  { value: 'mustard', label: 'Mustard' },
  { value: 'potato', label: 'Potato' },
  { value: 'ragi', label: 'Ragi (Finger Millet)' },
  { value: 'jute', label: 'Jute' },
  { value: 'coconut', label: 'Coconut' },
  { value: 'rubber', label: 'Rubber' },
  { value: 'banana', label: 'Banana' },
  { value: 'pepper', label: 'Black Pepper' },
  { value: 'lychee', label: 'Lychee' },
  { value: 'tomato', label: 'Tomato' },
];

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1';

export default function FarmerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    farmer_name: '',
    age: '',
    profession: '',
    state: '',
    district: '',
    crop: '',
  });
  const [waId, setWaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<{ farmers: Farmer[]; total: number }>(`/farmers?limit=1000`).then((r) => {
      const farmer = r.farmers.find((f) => f._id === id);
      if (farmer) {
        setWaId(farmer.wa_id);
        setForm({
          farmer_name: farmer.farmer_name,
          age: farmer.age,
          profession: farmer.profession,
          state: farmer.state,
          district: farmer.district,
          crop: farmer.crop,
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/farmers/${id}`, form);
      setToast({ type: 'success', message: 'Farmer updated successfully.' });
      setTimeout(() => navigate('/farmers'), 1200);
    } catch {
      setToast({ type: 'error', message: 'Failed to update farmer. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/farmers/${id}`);
      setShowDeleteDialog(false);
      setToast({ type: 'success', message: 'Farmer deleted.' });
      setTimeout(() => navigate('/farmers'), 1000);
    } catch {
      setToast({ type: 'error', message: 'Failed to delete farmer.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading…</div>;
  }

  return (
    <div className="mx-[15px] pb-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${form.farmer_name || 'this farmer'}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Form card — teal left bar per UI_STANDARDS */}
      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-visible min-h-[min(85vh,720px)] px-6 py-5">

        {/* Back link */}
        <button
          onClick={() => navigate('/farmers')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-200 hover:text-slate-900 transition-colors mb-5"
        >
          ← Back to Farmers
        </button>

        {/* Title row */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Edit Farmer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Mobile: <span className="font-medium text-slate-700">+{waId}</span>
          </p>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6">
          {/* Left — Personal Details */}
          <div>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4 pl-3 border-l-4 border-l-primary bg-slate-100 text-slate-800 rounded-r-lg py-2.5 border-b border-slate-200/60">
              <span className="text-xs font-bold uppercase tracking-widest">Personal Details</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  className={inputCls}
                  value={form.farmer_name}
                  onChange={(e) => handleChange('farmer_name', e.target.value)}
                  placeholder="Farmer's full name"
                />
              </div>
              <div>
                <label className={labelCls}>Age</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="Age"
                  min={1}
                  max={120}
                />
              </div>
              <div>
                <label className={labelCls}>Profession</label>
                <input
                  className={inputCls}
                  value={form.profession}
                  onChange={(e) => handleChange('profession', e.target.value)}
                  placeholder="e.g. Farmer, Agronomist"
                />
              </div>
              <div>
                <label className={labelCls}>Mobile Number</label>
                <input
                  className={`${inputCls} bg-slate-50 text-slate-500`}
                  value={waId}
                  readOnly
                />
                <p className="text-xs text-slate-400 mt-1">WhatsApp ID — cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Right — Location & Crop */}
          <div className="mt-6 lg:mt-0 lg:pl-6 lg:border-l lg:border-slate-200">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4 pl-3 border-l-4 border-l-primary bg-slate-100 text-slate-800 rounded-r-lg py-2.5 border-b border-slate-200/60">
              <span className="text-xs font-bold uppercase tracking-widest">Location & Crop</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>State *</label>
                <select
                  className={inputCls}
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                >
                  <option value="">Select state</option>
                  {STATE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>District</label>
                <input
                  className={inputCls}
                  value={form.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder="District name"
                />
              </div>
              <div>
                <label className={labelCls}>Crop *</label>
                <select
                  className={inputCls}
                  value={form.crop}
                  onChange={(e) => handleChange('crop', e.target.value)}
                >
                  <option value="">Select crop</option>
                  {CROP_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center">
          <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
            Delete Farmer
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/farmers')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !form.farmer_name || !form.crop}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
