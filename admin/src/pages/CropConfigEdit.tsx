/**
 * CropConfigEdit — manage crops for a single state.
 * UI_STANDARDS: teal left bar card, h-10 inputs, Toast, ConfirmDialog.
 */
import { useState, useEffect } from 'react';
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
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

const emptyForm = (): CropEntry => ({ id: '', title: '', description: '' });

export default function CropConfigEdit() {
  const { state } = useParams<{ state: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<StateCrop | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add form state
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<CropEntry>(emptyForm());
  const [addSaving, setAddSaving] = useState(false);

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CropEntry>(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!state) return;
    api
      .get<StateCrop>(`/state-crops/${state}`)
      .then(setDoc)
      .catch(() => setToast({ type: 'error', message: 'Failed to load crop data.' }))
      .finally(() => setLoading(false));
  }, [state]);

  const handleAdd = async () => {
    if (!state || !addForm.id || !addForm.title || !addForm.description) return;
    setAddSaving(true);
    try {
      const updated = await api.post<StateCrop>(`/state-crops/${state}/crops`, addForm);
      setDoc(updated);
      setAdding(false);
      setAddForm(emptyForm());
      setToast({ type: 'success', message: 'Crop added.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to add crop.' });
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (crop: CropEntry) => {
    setEditingId(crop.id);
    setEditForm({ ...crop });
  };

  const handleEditSave = async () => {
    if (!state || !editingId) return;
    setEditSaving(true);
    try {
      const updated = await api.put<StateCrop>(
        `/state-crops/${state}/crops/${editingId}`,
        editForm
      );
      setDoc(updated);
      setEditingId(null);
      setToast({ type: 'success', message: 'Crop updated.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to update crop.' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!state || !deleteId) return;
    setDeleting(true);
    try {
      const updated = await api.delete<StateCrop>(
        `/state-crops/${state}/crops/${deleteId}`
      );
      setDoc(updated);
      setDeleteId(null);
      setToast({ type: 'success', message: 'Crop deleted.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to delete crop.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading…</div>;
  }

  if (!doc) {
    return <div className="p-6 text-sm text-red-600">State not found.</div>;
  }

  return (
    <div className="mx-[15px] pb-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Crop"
        message={`Delete "${deleteTitle}" from ${doc.stateLabel}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-visible">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <button
            onClick={() => navigate('/crop-config')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-200 hover:text-slate-900 transition-colors mb-4"
          >
            ← Back to Crop Config
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{doc.stateLabel}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {doc.crops.length} crop{doc.crops.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            {!adding && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                + Add Crop
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                  Crop ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Add row */}
              {adding && (
                <tr className="bg-green-50">
                  <td className="px-6 py-3">
                    <input
                      className={inputCls}
                      placeholder="e.g. cotton"
                      value={addForm.id}
                      onChange={(e) => setAddForm((f) => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      className={inputCls}
                      placeholder="e.g. Cotton"
                      value={addForm.title}
                      onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      className={inputCls}
                      placeholder="e.g. Kharif crop • Harvested Oct–Dec"
                      value={addForm.description}
                      onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="primary"
                        onClick={handleAdd}
                        disabled={addSaving || !addForm.id || !addForm.title || !addForm.description}
                      >
                        {addSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { setAdding(false); setAddForm(emptyForm()); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing crops */}
              {doc.crops.map((crop) =>
                editingId === crop.id ? (
                  <tr key={crop.id} className="bg-amber-50">
                    <td className="px-6 py-3">
                      <input
                        className={inputCls}
                        value={editForm.id}
                        onChange={(e) => setEditForm((f) => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        className={inputCls}
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        className={inputCls}
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          onClick={handleEditSave}
                          disabled={editSaving || !editForm.id || !editForm.title || !editForm.description}
                        >
                          {editSaving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={crop.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-600 text-xs">{crop.id}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{crop.title}</td>
                    <td className="px-6 py-3 text-slate-600">{crop.description}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-xs font-medium text-primary hover:text-primary/70 transition-colors"
                          onClick={() => startEdit(crop)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                          onClick={() => { setDeleteId(crop.id); setDeleteTitle(crop.title); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {doc.crops.length === 0 && !adding && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                    No crops configured. Click "Add Crop" to add the first one.
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
