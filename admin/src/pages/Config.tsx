import { useState, useEffect } from 'react';
import { api } from '../api/client';

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

export default function Config() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get<Record<string, unknown>>('/config')
      .then((r) => {
        const out: Record<string, string> = {};
        for (const k of CONFIG_KEYS) {
          const v = r[k.key];
          out[k.key] = v != null ? String(v) : '';
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

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Configuration</h1>
      <p style={{ marginBottom: 16, color: '#6b7280' }}>
        Configure WhatsApp and Flow settings. These override environment variables when set.
      </p>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 480, minWidth: 280, flex: '1 1 400px' }}>
          {CONFIG_KEYS.map(({ key, label, hint }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{label}</label>
              {hint && (
                <p style={{ marginBottom: 6, fontSize: 13, color: '#6b7280' }}>{hint}</p>
              )}
              <input
                value={config[key] ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                }}
              />
            </div>
          ))}
          {message && <p style={{ marginBottom: 16, color: message.includes('Failed') ? '#dc2626' : '#059669' }}>{message}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div style={{ flex: '0 0 auto', position: 'sticky', top: 24 }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Preview on WhatsApp</p>
          <div
            style={{
              width: 280,
              background: '#1f2937',
              borderRadius: 24,
              padding: 12,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', minHeight: 420 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f0fdf4', fontSize: 13, color: '#166534' }}>
                Kweka Jeeto
              </div>
              <div style={{ padding: 16, background: '#e5e5e5' }}>
                <div
                  style={{
                    marginLeft: 0,
                    marginRight: '20%',
                    background: '#fff',
                    borderRadius: '12px 12px 12px 4px',
                    padding: '10px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#111' }}>{previewHeader}</div>
                  <div style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>{previewBody}</div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: '#25D366',
                      color: '#fff',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {previewCta}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Tap button to open flow</div>
                <div
                  style={{
                    marginTop: 12,
                    marginLeft: 0,
                    marginRight: '20%',
                    background: '#fff',
                    borderRadius: '12px 12px 12px 4px',
                    padding: '10px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    fontSize: 13,
                    color: '#374151',
                  }}
                >
                  <span style={{ color: '#6b7280' }}>After submit: </span>
                  {previewCompletion}
                </div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Phone Number ID and Flow ID are not shown to users.</p>
        </div>
      </div>
    </div>
  );
}
