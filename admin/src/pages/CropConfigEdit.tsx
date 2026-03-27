/**
 * CropConfigEdit — manage crops for a single state.
 * UI_STANDARDS: teal left bar card, h-10 inputs, Toast, ConfirmDialog, icon actions.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Button from '../components/shared/Button';
import Toast from '../components/shared/Toast';
import ConfirmDialog from '../components/shared/ConfirmDialog';

interface CropEntry {
  id: string;
  title: string;
  description: string;
}

interface StateCrop {
  state: string;
  stateLabel: string;
  crops: CropEntry[];
}

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

const emptyForm = (): CropEntry => ({ id: '', title: '', description: '' });

// ── Icons ────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CircleXIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface CropModalProps {
  mode: 'add' | 'edit';
  form: CropEntry;
  saving: boolean;
  onChange: (field: keyof CropEntry, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

function CropModal({ mode, form, saving, onChange, onSave, onClose }: CropModalProps) {
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const valid = form.id.trim() && form.title.trim() && form.description.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'add' ? 'Add Crop' : 'Edit Crop'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === 'add' ? 'Add a new crop to this state.' : 'Update the crop details.'}
          </p>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Crop ID
            </label>
            <input
              ref={firstRef}
              className={inputCls}
              placeholder="e.g. cotton"
              value={form.id}
              disabled={mode === 'edit'}
              onChange={(e) =>
                onChange('id', e.target.value.toLowerCase().replace(/\s+/g, '_'))
              }
            />
            {mode === 'edit' && (
              <p className="text-xs text-slate-400 mt-1">Crop ID cannot be changed after creation.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              className={inputCls}
              placeholder="e.g. Cotton"
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <input
              className={inputCls}
              placeholder="e.g. Kharif crop • Harvested Oct–Dec"
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !valid}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add Crop' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CropConfigEdit() {
  const { state } = useParams<{ state: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<StateCrop | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal state
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; form: CropEntry } | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CropEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!state) return;
    api
      .get<StateCrop>(`/state-crops/${state}`)
      .then(setDoc)
      .catch(() => setToast({ type: 'error', message: 'Failed to load crop data.' }))
      .finally(() => setLoading(false));
  }, [state]);

  const openAdd = () => setModal({ mode: 'add', form: emptyForm() });
  const openEdit = (crop: CropEntry) => setModal({ mode: 'edit', form: { ...crop } });
  const closeModal = () => setModal(null);

  const handleModalChange = (field: keyof CropEntry, value: string) => {
    setModal((m) => m && { ...m, form: { ...m.form, [field]: value } });
  };

  const handleSave = async () => {
    if (!state || !modal) return;
    setSaving(true);
    try {
      let updated: StateCrop;
      if (modal.mode === 'add') {
        updated = await api.post<StateCrop>(`/state-crops/${state}/crops`, modal.form);
        setToast({ type: 'success', message: 'Crop added.' });
      } else {
        updated = await api.put<StateCrop>(
          `/state-crops/${state}/crops/${modal.form.id}`,
          modal.form
        );
        setToast({ type: 'success', message: 'Crop updated.' });
      }
      setDoc(updated);
      setModal(null);
    } catch {
      setToast({ type: 'error', message: `Failed to ${modal.mode === 'add' ? 'add' : 'update'} crop.` });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!state || !deleteTarget) return;
    setDeleting(true);
    try {
      const updated = await api.delete<StateCrop>(
        `/state-crops/${state}/crops/${deleteTarget.id}`
      );
      setDoc(updated);
      setDeleteTarget(null);
      setToast({ type: 'success', message: 'Crop deleted.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to delete crop.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-[15px] pb-8">
        <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm p-8">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading crops…
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-[15px] pb-8">
        <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-red-500 shadow-sm p-8 text-sm text-red-600">
          State not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-[15px] pb-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {modal && (
        <CropModal
          mode={modal.mode}
          form={modal.form}
          saving={saving}
          onChange={handleModalChange}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Crop"
        message={`Delete "${deleteTarget?.title}" from ${doc.stateLabel}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <button
            onClick={() => navigate('/masters?tab=crops')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-200 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeftIcon />
            Back to Crop Config
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{doc.stateLabel}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {doc.crops.length} crop{doc.crops.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <Button variant="primary" onClick={openAdd}>
              + Add Crop
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">
                  Crop ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doc.crops.map((crop) => (
                <tr key={crop.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{crop.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{crop.title}</td>
                  <td className="px-6 py-4 text-slate-600">{crop.description}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit icon */}
                      <button
                        onClick={() => openEdit(crop)}
                        title="Edit crop"
                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <PencilIcon />
                      </button>
                      {/* Delete icon */}
                      <button
                        onClick={() => setDeleteTarget(crop)}
                        title="Delete crop"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <CircleXIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {doc.crops.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                      </svg>
                      <p className="text-sm font-medium text-slate-500">No crops configured</p>
                      <p className="text-xs text-slate-400">Click "+ Add Crop" to add the first one.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
