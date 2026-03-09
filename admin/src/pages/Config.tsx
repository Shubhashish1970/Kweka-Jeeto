import { useState, useEffect } from 'react';
import { api } from '../api/client';

const CONFIG_KEYS = [
  { key: 'flow_cta', label: 'Flow CTA Button Text', type: 'text' },
  { key: 'flow_header', label: 'Flow Header', type: 'text' },
  { key: 'flow_body', label: 'Flow Body Text', type: 'text' },
  { key: 'flow_completion_message', label: 'Flow Completion Message', type: 'text' },
  { key: 'whatsapp_phone_number_id', label: 'WhatsApp Phone Number ID', type: 'text' },
  { key: 'flow_id', label: 'Flow ID', type: 'text' },
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

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Configuration</h1>
      <p style={{ marginBottom: 16, color: '#6b7280' }}>
        Configure WhatsApp and Flow settings. These override environment variables when set.
      </p>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 600 }}>
        {CONFIG_KEYS.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{label}</label>
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
    </div>
  );
}
