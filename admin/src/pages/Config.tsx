import { useState, useEffect } from 'react';
import { api } from '../api/client';
import GlobalMessageBar from '../components/shared/GlobalMessageBar';
import Button from '../components/shared/Button';
import { PAGE_INFO_BANNERS } from '../constants/pageInfoBanners';

// Defaults when nothing is saved in DB (match backend defaults in message.service / flow-response)
const DEFAULT_CONFIG: Record<string, string> = {
  flow_cta: 'Register',
  flow_header: 'कृषि सलाह / Agri Advisory',
  flow_body: 'Register to get crop advisory.',
  flow_completion_message: "Thank you! We've received your details.",
  whatsapp_phone_number_id: '',
  flow_id: '',
};

const CONFIG_KEYS = [
  {
    key: 'flow_cta',
    label: 'Flow CTA Button Text',
    type: 'text',
    hint: 'Text on the button that opens the registration flow in WhatsApp (e.g. “Register” or “किसान पंजीकरण”).',
  },
  {
    key: 'flow_header',
    label: 'Flow Header',
    type: 'text',
    hint: 'Title shown at the top of the flow when the user opens it in WhatsApp.',
  },
  {
    key: 'flow_body',
    label: 'Flow Body Text',
    type: 'text',
    hint: 'Short description shown in the flow invite message (e.g. “Register to get crop advisory.”).',
  },
  {
    key: 'flow_completion_message',
    label: 'Flow Completion Message',
    type: 'text',
    hint: 'Message sent to the user after they successfully submit the flow (e.g. “Thank you, we’ll be in touch.”).',
  },
  {
    key: 'whatsapp_phone_number_id',
    label: 'WhatsApp Phone Number ID',
    type: 'text',
    hint: 'Meta’s ID for your WhatsApp Business phone number; leave blank to use the value from GitHub/env.',
  },
  {
    key: 'flow_id',
    label: 'Flow ID',
    type: 'text',
    hint: 'WhatsApp Flow ID from the “Deploy Flow” run; leave blank to use the value from GitHub/env.',
  },
];

type PreviewMode = 'chat' | 'flow';

export default function Config() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('flow');
  const [flowStep, setFlowStep] = useState(0);

  useEffect(() => {
    api
      .get<Record<string, unknown>>('/config')
      .then((r) => {
        const out: Record<string, string> = {};
        for (const k of CONFIG_KEYS) {
          const v = r[k.key];
          const raw = v != null ? String(v).trim() : '';
          out[k.key] = raw !== '' ? raw : (DEFAULT_CONFIG[k.key] ?? '');
        }
        setConfig(out);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/config', config);
      setMessage('Saved successfully');
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const previewHeader = config.flow_header?.trim() || 'कृषि सलाह / Agri Advisory';
  const previewBody = config.flow_body?.trim() || 'Register to get crop advisory.';
  const previewCta = config.flow_cta?.trim() || 'Register';
  const previewCompletion = config.flow_completion_message?.trim() || "Thank you! We've received your details.";

  if (loading) return <p className="text-slate-600">Loading...</p>;

  const banner = PAGE_INFO_BANNERS.config;

  return (
    <div>
      <GlobalMessageBar title={banner.title} description={banner.description} className="mb-4" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Configuration</h1>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        Configure WhatsApp and Flow settings. Saved in the database and loaded automatically; change values and click Save to update.
      </p>
      <div className="flex flex-wrap gap-8 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-[480px] min-w-[280px] flex-1">
          {CONFIG_KEYS.map(({ key, label, hint }) => (
            <div key={key} className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</label>
              {hint && <p className="text-sm text-slate-600 mb-1.5">{hint}</p>}
              <input
                value={config[key] ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          ))}
          {message && (
            <p className={`mb-4 text-sm ${message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>
          )}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="flex-1 min-w-[280px] flex flex-col items-center sticky top-6">
          <div className="flex items-center justify-center gap-2 mb-2 w-full">
            <button
              type="button"
              onClick={() => setPreviewMode('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === 'chat' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Chat invite
            </button>
            <button
              type="button"
              onClick={() => { setPreviewMode('flow'); setFlowStep(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${previewMode === 'flow' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Flow screens
            </button>
          </div>
          {/* iPhone-style wireframe — same size for Chat invite and Flow screens */}
          <div
            style={{
              width: 319,
              background: '#000',
              borderRadius: 38,
              padding: 4,
              boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', left: -2, top: 120, width: 2, height: 20, background: '#1a1a1a', borderRadius: 1 }} />
            <div style={{ position: 'absolute', left: -2, top: 148, width: 2, height: 28, background: '#1a1a1a', borderRadius: 1 }} />
            <div style={{ position: 'absolute', left: -2, top: 182, width: 2, height: 28, background: '#1a1a1a', borderRadius: 1 }} />
            <div style={{ position: 'absolute', right: -2, top: 120, width: 2, height: 48, background: '#1a1a1a', borderRadius: 1 }} />
            <div style={{ background: '#fff', borderRadius: 34, overflow: 'hidden', height: 700, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 88, height: 24, borderRadius: 12, background: '#000', zIndex: 2 }} />
              <div style={{ padding: '40px 16px 12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f0fdf4', fontSize: 13, color: '#166534', flexShrink: 0 }}>
                Kweka Jeeto
              </div>

              {previewMode === 'chat' ? (
                <div style={{ padding: '12px 10px 12px 10px', background: '#e5e5e5', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
                  <div>
                    <div style={{ marginLeft: 0, marginRight: '4%', width: '96%', background: '#fff', borderRadius: '12px 12px 12px 4px', padding: '8px 12px 10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#111', lineHeight: 1.35 }}>{previewHeader}</div>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 10, lineHeight: 1.4 }}>{previewBody}</div>
                      <div style={{ display: 'inline-block', padding: '8px 16px', background: '#25D366', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>{previewCta}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Tap button to open flow</div>
                  </div>
                  <div style={{ marginLeft: 0, marginRight: '4%', width: '96%', background: '#fff', borderRadius: '12px 12px 12px 4px', padding: '8px 12px 10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                    <span style={{ color: '#6b7280' }}>After submit: </span>{previewCompletion}
                  </div>
                </div>
              ) : (
                <>
                  {/* Flow screens: Personalised-Offer style */}
                  <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0, background: '#fff' }}>
                    {flowStep === 0 && (
                      <div className="space-y-4">
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
                          <img
                            src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                            alt="Agriculture"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight" style={{ fontSize: 18 }}>{previewHeader}</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">{previewBody}</p>
                        <div className="space-y-3">
                          <div className="rounded-xl border-2 border-slate-200 overflow-hidden flex gap-0 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer bg-white">
                            <div className="w-20 h-20 shrink-0 bg-slate-100">
                              <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=160&q=80" alt="Crop" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 flex flex-col justify-center min-w-0">
                              <p className="font-semibold text-slate-900 text-sm">Crop advisory</p>
                              <p className="text-xs text-slate-500">Get personalised crop tips</p>
                            </div>
                          </div>
                          <div className="rounded-xl border-2 border-slate-200 overflow-hidden flex gap-0 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer bg-white">
                            <div className="w-20 h-20 shrink-0 bg-slate-100">
                              <img src="https://images.unsplash.com/photo-1504386106331-3e4e71712b38?w=160&q=80" alt="Weather" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 flex flex-col justify-center min-w-0">
                              <p className="font-semibold text-slate-900 text-sm">Weather & tips</p>
                              <p className="text-xs text-slate-500">Local weather and alerts</p>
                            </div>
                          </div>
                          <div className="rounded-xl border-2 border-slate-200 overflow-hidden flex gap-0 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer bg-white">
                            <div className="w-20 h-20 shrink-0 bg-slate-800 flex items-center justify-center relative">
                              <img src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=160&q=80" alt="Video" className="w-full h-full object-cover opacity-80" />
                              <span className="absolute inset-0 flex items-center justify-center text-white text-2xl drop-shadow">▶</span>
                            </div>
                            <div className="p-3 flex flex-col justify-center min-w-0">
                              <p className="font-semibold text-slate-900 text-sm">Watch intro</p>
                              <p className="text-xs text-slate-500">See how it works (video)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {flowStep === 1 && (
                      <div className="space-y-4">
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img
                            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80"
                            alt="Farm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight" style={{ fontSize: 18 }}>Your details</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">Share your details to get personalised advice.</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Name</label>
                            <div className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-500">e.g. Farmer name</div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">State</label>
                            <div className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 flex items-center text-sm text-slate-400">Select state</div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Crop</label>
                            <div className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 flex items-center text-sm text-slate-400">Select crop</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {flowStep === 2 && (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="rounded-xl overflow-hidden border border-slate-200 w-full max-w-[200px] aspect-square mb-4 bg-primary/10">
                          <img
                            src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=300&q=80"
                            alt="Success"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl text-primary font-bold mb-2">✓</div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Thank you!</h2>
                        <p className="text-sm text-slate-600 leading-relaxed max-w-[220px]">{previewCompletion}</p>
                      </div>
                    )}
                  </div>
                  {/* Flow footer CTA (step 0 and 1) */}
                  {(flowStep === 0 || flowStep === 1) && (
                    <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setFlowStep((s) => s + 1)}
                        className="w-full min-h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center"
                        style={{ background: '#25D366' }}
                      >
                        {flowStep === 0 ? previewCta : 'Submit'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {previewMode === 'flow' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button type="button" onClick={() => setFlowStep(0)} className={`w-2 h-2 rounded-full ${flowStep === 0 ? 'bg-primary' : 'bg-slate-300'}`} aria-label="Step 1" />
              <button type="button" onClick={() => setFlowStep(1)} className={`w-2 h-2 rounded-full ${flowStep === 1 ? 'bg-primary' : 'bg-slate-300'}`} aria-label="Step 2" />
              <button type="button" onClick={() => setFlowStep(2)} className={`w-2 h-2 rounded-full ${flowStep === 2 ? 'bg-primary' : 'bg-slate-300'}`} aria-label="Step 3" />
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2 text-center">Phone Number ID and Flow ID are not shown to users.</p>
        </div>
      </div>
    </div>
  );
}
