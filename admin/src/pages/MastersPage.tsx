/**
 * MastersPage — State & District Masters + Crop Config under one Masters menu.
 * UI_STANDARDS: teal left bar card, icon actions, modal dialogs, Toast, ConfirmDialog.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import Button from '../components/shared/Button';
import Toast from '../components/shared/Toast';
import ConfirmDialog from '../components/shared/ConfirmDialog';

// ── Types ────────────────────────────────────────────────────────────────────

interface StateMaster {
  state: string;
  stateLabel: string;
  districts: string[];
  active: boolean;
}

interface StateCropSummary {
  state: string;
  stateLabel: string;
  crops: { id: string; title: string; description: string }[];
}

interface OccupationMaster {
  id: string;
  label: string;
  active: boolean;
  order: number;
}

interface LandholdingUnit {
  id: string;
  label: string;
  conversion_factor: number;
  active: boolean;
  order: number;
}

type Tab = 'states' | 'occupations' | 'landholding' | 'crops';

// ── Icons ────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CircleXIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

// ── State Edit Modal ──────────────────────────────────────────────────────────

interface StateModalProps {
  mode: 'add' | 'edit';
  stateSlug: string;
  stateLabel: string;
  saving: boolean;
  onChangeSlug: (v: string) => void;
  onChangeLabel: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

function StateModal({ mode, stateSlug, stateLabel, saving, onChangeSlug, onChangeLabel, onSave, onClose }: StateModalProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);
  const valid = stateSlug.trim() && stateLabel.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{mode === 'add' ? 'Add State' : 'Edit State'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{mode === 'add' ? 'Add a new state to the master list.' : 'Update the state label.'}</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">State ID (slug)</label>
            <input ref={firstRef} className={inputCls + (mode === 'edit' ? ' bg-slate-50 text-slate-400 cursor-not-allowed' : '')} placeholder="e.g. andhra_pradesh" value={stateSlug} disabled={mode === 'edit'} onChange={(e) => onChangeSlug(e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            {mode === 'edit' && <p className="text-xs text-slate-400 mt-1">State ID cannot be changed.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">State Label</label>
            <input className={inputCls} placeholder="e.g. Andhra Pradesh" value={stateLabel} onChange={(e) => onChangeLabel(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !valid}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add State' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Districts Modal ───────────────────────────────────────────────────────────

interface DistrictsModalProps {
  state: StateMaster;
  onClose: () => void;
  onUpdated: (updated: StateMaster) => void;
  setToast: (t: { type: 'success' | 'error'; message: string }) => void;
}

function DistrictsModal({ state, onClose, onUpdated, setToast }: DistrictsModalProps) {
  const [districts, setDistricts] = useState<string[]>([...state.districts].sort());
  const [newDistrict, setNewDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingDistrict, setDeletingDistrict] = useState<string | null>(null);

  const handleAdd = async () => {
    const d = newDistrict.trim();
    if (!d) return;
    setSaving(true);
    try {
      const updated = await api.post<StateMaster>(`/masters/states/${state.state}/districts`, { district: d });
      setDistricts([...updated.districts].sort());
      onUpdated(updated);
      setNewDistrict('');
      setToast({ type: 'success', message: `"${d}" added.` });
    } catch {
      setToast({ type: 'error', message: 'Failed to add district.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (district: string) => {
    setDeletingDistrict(district);
    try {
      const updated = await api.delete<StateMaster>(`/masters/states/${state.state}/districts/${encodeURIComponent(district)}`);
      setDistricts([...updated.districts].sort());
      onUpdated(updated);
      setToast({ type: 'success', message: `"${district}" removed.` });
    } catch {
      setToast({ type: 'error', message: 'Failed to remove district.' });
    } finally {
      setDeletingDistrict(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Districts — {state.stateLabel}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{districts.length} district{districts.length !== 1 ? 's' : ''} configured</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Add district input */}
        <div className="px-6 py-4 border-b border-slate-100 flex gap-2">
          <input
            className={inputCls}
            placeholder="Add district name…"
            value={newDistrict}
            onChange={(e) => setNewDistrict(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button variant="primary" onClick={handleAdd} disabled={saving || !newDistrict.trim()} size="md">
            {saving ? '…' : 'Add'}
          </Button>
        </div>

        {/* District list */}
        <div className="overflow-y-auto flex-1">
          {districts.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No districts yet. Add one above.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {districts.map((d) => (
                <li key={d} className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-800">
                    <MapPinIcon />
                    {d}
                  </div>
                  <button
                    onClick={() => handleDelete(d)}
                    disabled={deletingDistrict === d}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                    title="Remove district"
                  >
                    <CircleXIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── States & Districts Tab ────────────────────────────────────────────────────

function StatesTab() {
  const [states, setStates] = useState<StateMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [stateModal, setStateModal] = useState<{ mode: 'add' | 'edit'; slug: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [districtsFor, setDistrictsFor] = useState<StateMaster | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StateMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<StateMaster[]>('/masters/states')
      .then(setStates)
      .catch(() => setToast({ type: 'error', message: 'Failed to load states.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleStateSave = async () => {
    if (!stateModal) return;
    setSaving(true);
    try {
      if (stateModal.mode === 'add') {
        const created = await api.post<StateMaster>('/masters/states', { state: stateModal.slug, stateLabel: stateModal.label });
        setStates((prev) => [...prev, created].sort((a, b) => a.stateLabel.localeCompare(b.stateLabel)));
        setToast({ type: 'success', message: 'State added.' });
      } else {
        const updated = await api.put<StateMaster>(`/masters/states/${stateModal.slug}`, { stateLabel: stateModal.label });
        setStates((prev) => prev.map((s) => s.state === stateModal.slug ? updated : s));
        setToast({ type: 'success', message: 'State updated.' });
      }
      setStateModal(null);
    } catch {
      setToast({ type: 'error', message: `Failed to ${stateModal.mode} state.` });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/masters/states/${deleteTarget.state}`);
      setStates((prev) => prev.filter((s) => s.state !== deleteTarget.state));
      setDeleteTarget(null);
      setToast({ type: 'success', message: 'State deleted.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to delete state.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
        <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading states…
      </div>
    );
  }

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {stateModal && (
        <StateModal
          mode={stateModal.mode}
          stateSlug={stateModal.slug}
          stateLabel={stateModal.label}
          saving={saving}
          onChangeSlug={(v) => setStateModal((m) => m && { ...m, slug: v })}
          onChangeLabel={(v) => setStateModal((m) => m && { ...m, label: v })}
          onSave={handleStateSave}
          onClose={() => setStateModal(null)}
        />
      )}

      {districtsFor && (
        <DistrictsModal
          state={districtsFor}
          onClose={() => setDistrictsFor(null)}
          onUpdated={(updated) => {
            setStates((prev) => prev.map((s) => s.state === updated.state ? updated : s));
            setDistrictsFor(updated);
          }}
          setToast={setToast}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete State"
        message={`Delete "${deleteTarget?.stateLabel}"? All district data for this state will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">States & Districts</h2>
            <p className="text-sm text-slate-500 mt-0.5">Manage states and their districts used in the WhatsApp registration flow.</p>
          </div>
          <Button variant="primary" onClick={() => setStateModal({ mode: 'add', slug: '', label: '' })}>
            + Add State
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-44">State ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">State Label</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Districts</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {states.map((s) => (
                <tr key={s.state} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{s.state}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{s.stateLabel}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setDistrictsFor(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      {s.districts.length} districts
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDistrictsFor(s)}
                        title="Manage districts"
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <MapPinIcon />
                      </button>
                      <button
                        onClick={() => setStateModal({ mode: 'edit', slug: s.state, label: s.stateLabel })}
                        title="Edit state"
                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        title="Delete state"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <CircleXIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {states.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400">No states configured. Click "+ Add State" to begin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Occupations Tab ───────────────────────────────────────────────────────────

interface OccupationModalProps {
  mode: 'add' | 'edit';
  id: string;
  label: string;
  order: number;
  active: boolean;
  saving: boolean;
  onChangeId: (v: string) => void;
  onChangeLabel: (v: string) => void;
  onChangeOrder: (v: number) => void;
  onChangeActive: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

function OccupationModal({ mode, id, label, order, active, saving, onChangeId, onChangeLabel, onChangeOrder, onChangeActive, onSave, onClose }: OccupationModalProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);
  const valid = id.trim() && label.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{mode === 'add' ? 'Add Occupation' : 'Edit Occupation'}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Occupation ID (slug)</label>
            <input ref={firstRef} className={inputCls + (mode === 'edit' ? ' bg-slate-50 text-slate-400 cursor-not-allowed' : '')} placeholder="e.g. farmer" value={id} disabled={mode === 'edit'} onChange={(e) => onChangeId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            {mode === 'edit' && <p className="text-xs text-slate-400 mt-1">ID cannot be changed.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Label</label>
            <input className={inputCls} placeholder="e.g. Farmer" value={label} onChange={(e) => onChangeLabel(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Display Order</label>
              <input type="number" className={inputCls} value={order} min={0} onChange={(e) => onChangeOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="occ-active" checked={active} onChange={(e) => onChangeActive(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              <label htmlFor="occ-active" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !valid}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add Occupation' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OccupationsTab() {
  const [occupations, setOccupations] = useState<OccupationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; id: string; label: string; order: number; active: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OccupationMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<OccupationMaster[]>('/masters/occupations')
      .then((docs) => setOccupations(docs.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))))
      .catch(() => setToast({ type: 'error', message: 'Failed to load occupations.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const created = await api.post<OccupationMaster>('/masters/occupations', { id: modal.id, label: modal.label, order: modal.order });
        setOccupations((prev) => [...prev, created].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)));
        setToast({ type: 'success', message: 'Occupation added.' });
      } else {
        const updated = await api.put<OccupationMaster>(`/masters/occupations/${modal.id}`, { label: modal.label, order: modal.order, active: modal.active });
        setOccupations((prev) => prev.map((o) => o.id === modal.id ? updated : o).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)));
        setToast({ type: 'success', message: 'Occupation updated.' });
      }
      setModal(null);
    } catch {
      setToast({ type: 'error', message: `Failed to ${modal.mode} occupation.` });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/masters/occupations/${deleteTarget.id}`);
      setOccupations((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ type: 'success', message: 'Occupation deleted.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to delete occupation.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
        <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading occupations…
      </div>
    );
  }

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {modal && (
        <OccupationModal
          mode={modal.mode}
          id={modal.id}
          label={modal.label}
          order={modal.order}
          active={modal.active}
          saving={saving}
          onChangeId={(v) => setModal((m) => m && { ...m, id: v })}
          onChangeLabel={(v) => setModal((m) => m && { ...m, label: v })}
          onChangeOrder={(v) => setModal((m) => m && { ...m, order: v })}
          onChangeActive={(v) => setModal((m) => m && { ...m, active: v })}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Occupation"
        message={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Occupations</h2>
            <p className="text-sm text-slate-500 mt-0.5">Manage occupation options shown in the WhatsApp registration flow.</p>
          </div>
          <Button variant="primary" onClick={() => setModal({ mode: 'add', id: '', label: '', order: occupations.length + 1, active: true })}>
            + Add Occupation
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Label</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Order</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {occupations.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{o.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{o.label}</td>
                  <td className="px-6 py-4 text-center text-slate-500">{o.order}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${o.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {o.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ mode: 'edit', id: o.id, label: o.label, order: o.order, active: o.active })}
                        title="Edit occupation"
                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(o)}
                        title="Delete occupation"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <CircleXIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {occupations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400">No occupations configured. Click "+ Add Occupation" to begin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Landholding Units Tab ─────────────────────────────────────────────────────

interface LandholdingModalProps {
  mode: 'add' | 'edit';
  id: string;
  label: string;
  conversion_factor: number;
  order: number;
  active: boolean;
  saving: boolean;
  onChangeId: (v: string) => void;
  onChangeLabel: (v: string) => void;
  onChangeFactor: (v: number) => void;
  onChangeOrder: (v: number) => void;
  onChangeActive: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

function LandholdingModal({ mode, id, label, conversion_factor, order, active, saving, onChangeId, onChangeLabel, onChangeFactor, onChangeOrder, onChangeActive, onSave, onClose }: LandholdingModalProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);
  const valid = id.trim() && label.trim() && conversion_factor > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{mode === 'add' ? 'Add Landholding Unit' : 'Edit Landholding Unit'}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unit ID (slug)</label>
            <input ref={firstRef} className={inputCls + (mode === 'edit' ? ' bg-slate-50 text-slate-400 cursor-not-allowed' : '')} placeholder="e.g. bigha" value={id} disabled={mode === 'edit'} onChange={(e) => onChangeId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            {mode === 'edit' && <p className="text-xs text-slate-400 mt-1">ID cannot be changed.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Label</label>
            <input className={inputCls} placeholder="e.g. Bigha" value={label} onChange={(e) => onChangeLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Conversion Factor (to Acres)</label>
            <input type="number" step="0.000001" min="0.000001" className={inputCls} placeholder="e.g. 0.619" value={conversion_factor} onChange={(e) => onChangeFactor(Number(e.target.value))} />
            <p className="text-xs text-slate-400 mt-1">1 {label || 'unit'} = {conversion_factor || '?'} acre{conversion_factor !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Display Order</label>
              <input type="number" className={inputCls} value={order} min={0} onChange={(e) => onChangeOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="lh-active" checked={active} onChange={(e) => onChangeActive(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              <label htmlFor="lh-active" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !valid}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add Unit' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LandholdingTab() {
  const [units, setUnits] = useState<LandholdingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; id: string; label: string; conversion_factor: number; order: number; active: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LandholdingUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<LandholdingUnit[]>('/masters/landholding-units')
      .then((docs) => setUnits(docs.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))))
      .catch(() => setToast({ type: 'error', message: 'Failed to load landholding units.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const created = await api.post<LandholdingUnit>('/masters/landholding-units', { id: modal.id, label: modal.label, conversion_factor: modal.conversion_factor, order: modal.order });
        setUnits((prev) => [...prev, created].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)));
        setToast({ type: 'success', message: 'Unit added.' });
      } else {
        const updated = await api.put<LandholdingUnit>(`/masters/landholding-units/${modal.id}`, { label: modal.label, conversion_factor: modal.conversion_factor, order: modal.order, active: modal.active });
        setUnits((prev) => prev.map((u) => u.id === modal.id ? updated : u).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)));
        setToast({ type: 'success', message: 'Unit updated.' });
      }
      setModal(null);
    } catch {
      setToast({ type: 'error', message: `Failed to ${modal.mode} unit.` });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/masters/landholding-units/${deleteTarget.id}`);
      setUnits((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ type: 'success', message: 'Unit deleted.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to delete unit.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
        <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading landholding units…
      </div>
    );
  }

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {modal && (
        <LandholdingModal
          mode={modal.mode}
          id={modal.id}
          label={modal.label}
          conversion_factor={modal.conversion_factor}
          order={modal.order}
          active={modal.active}
          saving={saving}
          onChangeId={(v) => setModal((m) => m && { ...m, id: v })}
          onChangeLabel={(v) => setModal((m) => m && { ...m, label: v })}
          onChangeFactor={(v) => setModal((m) => m && { ...m, conversion_factor: v })}
          onChangeOrder={(v) => setModal((m) => m && { ...m, order: v })}
          onChangeActive={(v) => setModal((m) => m && { ...m, active: v })}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Landholding Unit"
        message={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Landholding Units</h2>
            <p className="text-sm text-slate-500 mt-0.5">Configure units and their conversion factors to acres. Farmers pick their preferred unit during onboarding.</p>
          </div>
          <Button variant="primary" onClick={() => setModal({ mode: 'add', id: '', label: '', conversion_factor: 1, order: units.length + 1, active: true })}>
            + Add Unit
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Label</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Factor (→ Acres)</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">Order</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{u.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{u.label}</td>
                  <td className="px-6 py-4 text-right text-slate-600 font-mono text-xs">{u.conversion_factor}</td>
                  <td className="px-6 py-4 text-center text-slate-500">{u.order}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ mode: 'edit', id: u.id, label: u.label, conversion_factor: u.conversion_factor, order: u.order, active: u.active })} title="Edit unit" className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                        <PencilIcon />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} title="Delete unit" className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <CircleXIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400">No units configured. Click "+ Add Unit" to begin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Crop Config Tab ───────────────────────────────────────────────────────────

function CropConfigTab() {
  const navigate = useNavigate();
  const [stateCrops, setStateCrops] = useState<StateCropSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.get<StateCropSummary[]>('/state-crops')
      .then(setStateCrops)
      .catch(() => setToast({ type: 'error', message: 'Failed to load crop config.' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
        <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading crop config…
      </div>
    );
  }

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Crop Config</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage crops shown per state in the WhatsApp registration flow. Changes take effect immediately.
            </p>
          </div>
          <span className="text-sm text-slate-400 font-medium">{stateCrops.length} states</span>
        </div>

        <div className="divide-y divide-slate-100">
          {stateCrops.map((s) => (
            <div key={s.state} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{s.stateLabel}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {s.crops.length} crop{s.crops.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => navigate(`/masters/crop/${s.state}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Manage <ChevronRightIcon />
              </button>
            </div>
          ))}
          {stateCrops.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No crop data found.</div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Masters Page ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'states',      label: 'States & Districts' },
  { key: 'occupations', label: 'Occupations' },
  { key: 'landholding', label: 'Landholding Units' },
  { key: 'crops',       label: 'Crop Config' },
];

export default function MastersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = (searchParams.get('tab') as Tab) || 'states';

  const setTab = (t: Tab) => setSearchParams(t === 'states' ? {} : { tab: t });

  return (
    <div className="mx-[15px] pb-8 space-y-5">
      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === key
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'states'      && <StatesTab />}
      {tab === 'occupations' && <OccupationsTab />}
      {tab === 'landholding' && <LandholdingTab />}
      {tab === 'crops'       && <CropConfigTab />}
    </div>
  );
}
