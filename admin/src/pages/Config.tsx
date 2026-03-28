import { useState, useEffect } from 'react';
import { api } from '../api/client';
import GlobalMessageBar from '../components/shared/GlobalMessageBar';
import Button from '../components/shared/Button';
import { PAGE_INFO_BANNERS } from '../constants/pageInfoBanners';

// ---------------------------------------------------------------------------
// Language support (mirrors src/utils/i18n.ts)
// ---------------------------------------------------------------------------
const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
  te: 'తెలుగు',
  bn: 'বাংলা',
};
type Language = keyof typeof SUPPORTED_LANGUAGES;
const LANGUAGE_KEYS = Object.keys(SUPPORTED_LANGUAGES) as Language[];

// The 10 flow screen text keys that support multiple languages
const MULTILINGUAL_KEYS = [
  'flow_welcome_title',
  'flow_welcome_body',
  'flow_welcome_button_label',
  'flow_returning_title',
  'flow_returning_body',
  'flow_returning_button_label',
  'flow_crop_section_title',
  'flow_success_heading',
  'flow_success_body',
  'flow_completion_message',
];

// Built-in defaults (match src/utils/i18n.ts DEFAULT_STRINGS)
const DEFAULT_STRINGS: Record<Language, Record<string, string>> = {
  en: {
    flow_welcome_title: 'Welcome to Kweka Jeeto! 🌾',
    flow_welcome_body:
      'Get personalized daily crop advisory on WhatsApp — powered by local farming expertise. Register in under a minute.',
    flow_welcome_button_label: 'Register Now',
    flow_returning_title: 'Welcome back, {name}! 🌾',
    flow_returning_body:
      "You're registered for {crop} advisory. You can update your details below.",
    flow_returning_button_label: 'Update Details',
    flow_crop_section_title: 'Popular crops in {state}',
    flow_success_heading: "You're All Set, {name}! 🌾",
    flow_success_body:
      "Daily *{crop}* advisory will arrive every morning starting {date}. You'll get tips on watering, fertilizers, pest control & market prices tailored to your farm.",
    flow_completion_message:
      "✅ Registration complete! Hello {name}, you'll receive daily *{crop}* advisory starting {date}. Check your WhatsApp every morning for personalized tips. Welcome to Kweka Jeeto! 🌾",
  },
  hi: {
    flow_welcome_title: 'Kweka Jeeto में आपका स्वागत है! 🌾',
    flow_welcome_body:
      'WhatsApp पर व्यक्तिगत दैनिक फसल सलाह पाएं — स्थानीय कृषि विशेषज्ञता द्वारा संचालित। एक मिनट से भी कम समय में पंजीकरण करें।',
    flow_welcome_button_label: 'अभी पंजीकरण करें',
    flow_returning_title: 'वापस आने पर स्वागत, {name}! 🌾',
    flow_returning_body:
      'आप {crop} सलाह के लिए पंजीकृत हैं। आप नीचे अपना विवरण अपडेट कर सकते हैं।',
    flow_returning_button_label: 'विवरण अपडेट करें',
    flow_crop_section_title: '{state} में लोकप्रिय फसलें',
    flow_success_heading: 'आप तैयार हैं, {name}! 🌾',
    flow_success_body:
      'दैनिक *{crop}* सलाह {date} से हर सुबह आएगी। आपको पानी, खाद, कीट नियंत्रण और बाज़ार भाव पर व्यक्तिगत सुझाव मिलेंगे।',
    flow_completion_message:
      '✅ पंजीकरण पूर्ण! नमस्ते {name}, आपको {date} से दैनिक *{crop}* सलाह मिलेगी। व्यक्तिगत सुझावों के लिए हर सुबह अपना WhatsApp देखें। Kweka Jeeto में आपका स्वागत है! 🌾',
  },
  mr: {
    flow_welcome_title: 'Kweka Jeeto मध्ये आपले स्वागत आहे! 🌾',
    flow_welcome_body:
      'WhatsApp वर वैयक्तिक दैनंदिन पीक सल्ला मिळवा — स्थानिक शेती तज्ञतेद्वारे. एक मिनिटापेक्षा कमी वेळात नोंदणी करा.',
    flow_welcome_button_label: 'आता नोंदणी करा',
    flow_returning_title: 'परत आल्याबद्दल स्वागत, {name}! 🌾',
    flow_returning_body:
      'तुम्ही {crop} सल्ल्यासाठी नोंदणीकृत आहात. तुम्ही खाली तुमचे तपशील अपडेट करू शकता.',
    flow_returning_button_label: 'तपशील अपडेट करा',
    flow_crop_section_title: '{state} मधील लोकप्रिय पिके',
    flow_success_heading: 'तुम्ही तयार आहात, {name}! 🌾',
    flow_success_body:
      'दैनंदिन *{crop}* सल्ला {date} पासून दररोज सकाळी येईल. तुम्हाला पाणी, खते, कीड नियंत्रण आणि बाजारभाव यावर वैयक्तिक टिप्स मिळतील.',
    flow_completion_message:
      '✅ नोंदणी पूर्ण! नमस्कार {name}, तुम्हाला {date} पासून दैनंदिन *{crop}* सल्ला मिळेल. वैयक्तिक टिप्ससाठी दररोज सकाळी WhatsApp तपासा. Kweka Jeeto मध्ये स्वागत आहे! 🌾',
  },
  te: {
    flow_welcome_title: 'Kweka Jeeto కి స్వాగతం! 🌾',
    flow_welcome_body:
      'WhatsApp లో వ్యక్తిగత రోజువారీ పంట సలహా పొందండి — స్థానిక వ్యవసాయ నిపుణత ద్వారా. ఒక నిమిషం కంటే తక్కువ సమయంలో నమోదు చేసుకోండి.',
    flow_welcome_button_label: 'ఇప్పుడు నమోదు చేయండి',
    flow_returning_title: 'తిరిగి స్వాగతం, {name}! 🌾',
    flow_returning_body:
      'మీరు {crop} సలహా కోసం నమోదు చేసుకున్నారు. మీరు క్రింద మీ వివరాలను అప్‌డేట్ చేయవచ్చు.',
    flow_returning_button_label: 'వివరాలు అప్‌డేట్ చేయండి',
    flow_crop_section_title: '{state} లో ప్రముఖ పంటలు',
    flow_success_heading: 'మీరు సిద్ధంగా ఉన్నారు, {name}! 🌾',
    flow_success_body:
      'రోజువారీ *{crop}* సలహా {date} నుండి ప్రతి ఉదయం వస్తుంది. నీటి, ఎరువులు, చీడపీడల నియంత్రణ మరియు మార్కెట్ ధరలపై వ్యక్తిగత చిట్కాలు మీకు అందుతాయి.',
    flow_completion_message:
      '✅ నమోదు పూర్తైంది! నమస్కారం {name}, మీకు {date} నుండి రోజువారీ *{crop}* సలహా వస్తుంది. వ్యక్తిగత చిట్కాల కోసం ప్రతి ఉదయం WhatsApp చెక్ చేయండి. Kweka Jeeto కి స్వాగతం! 🌾',
  },
  bn: {
    flow_welcome_title: 'Kweka Jeeto তে আপনাকে স্বাগতম! 🌾',
    flow_welcome_body:
      'WhatsApp এ ব্যক্তিগত দৈনিক ফসল পরামর্শ পান — স্থানীয় কৃষি বিশেষজ্ঞতা দ্বারা পরিচালিত। এক মিনিটের কম সময়ে নিবন্ধন করুন।',
    flow_welcome_button_label: 'এখনই নিবন্ধন করুন',
    flow_returning_title: 'ফিরে আসার স্বাগতম, {name}! 🌾',
    flow_returning_body:
      'আপনি {crop} পরামর্শের জন্য নিবন্ধিত আছেন। আপনি নীচে আপনার বিবরণ আপডেট করতে পারেন।',
    flow_returning_button_label: 'বিবরণ আপডেট করুন',
    flow_crop_section_title: '{state} এ জনপ্রিয় ফসল',
    flow_success_heading: 'আপনি প্রস্তুত, {name}! 🌾',
    flow_success_body:
      'দৈনিক *{crop}* পরামর্শ {date} থেকে প্রতি সকালে আসবে। আপনি জল দেওয়া, সার, কীটপতঙ্গ নিয়ন্ত্রণ ও বাজার মূল্যে ব্যক্তিগত পরামর্শ পাবেন।',
    flow_completion_message:
      '✅ নিবন্ধন সম্পূর্ণ! নমস্কার {name}, আপনি {date} থেকে দৈনিক *{crop}* পরামর্শ পাবেন। ব্যক্তিগত পরামর্শের জন্য প্রতি সকালে WhatsApp চেক করুন। Kweka Jeeto তে স্বাগতম! 🌾',
  },
};

// ---------------------------------------------------------------------------
// Defaults for non-multilingual keys
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG: Record<string, string> = {
  flow_cta: 'Register',
  flow_header: 'কৃষি সলাহ / Agri Advisory',
  flow_body: 'Register to get crop advisory.',
  whatsapp_phone_number_id: '',
  whatsapp_flow_id: '',
};

const ALL_CONFIG_KEYS = [
  ...MULTILINGUAL_KEYS,
  'flow_cta',
  'flow_header',
  'flow_body',
  'whatsapp_phone_number_id',
  'whatsapp_flow_id',
];

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  hint: string;
  maxLength?: number;
  placeholders?: string[];
  multilingual?: boolean;
}

interface LockedItemDef {
  label: string;
  reason: string;
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
  lockedItems?: LockedItemDef[];
  note?: string;
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Chat Invite Message',
    fields: [
      {
        key: 'flow_cta',
        label: 'CTA Button Text',
        type: 'text',
        hint: 'Button label in the WhatsApp chat that opens the flow.',
        maxLength: 20,
      },
      {
        key: 'flow_header',
        label: 'Message Header',
        type: 'text',
        hint: 'Bold title shown in the chat invite card.',
        maxLength: 60,
      },
      {
        key: 'flow_body',
        label: 'Message Body',
        type: 'textarea',
        hint: 'Short description in the chat invite card.',
        maxLength: 1024,
      },
    ],
  },
  {
    title: 'Welcome Screen — New Farmer',
    fields: [
      {
        key: 'flow_welcome_title',
        label: 'Title',
        type: 'text',
        hint: 'Heading shown at the top of the WELCOME screen for first-time users.',
        maxLength: 80,
        multilingual: true,
      },
      {
        key: 'flow_welcome_body',
        label: 'Body',
        type: 'textarea',
        hint: 'Introductory paragraph below the title.',
        maxLength: 500,
        multilingual: true,
      },
      {
        key: 'flow_welcome_button_label',
        label: 'Button Label',
        type: 'text',
        hint: 'Text on the action button at the bottom.',
        maxLength: 20,
        multilingual: true,
      },
    ],
    lockedItems: [
      {
        label: 'Hero image',
        reason: 'Stored as base64 in code (src/assets/images.ts). Changing it requires a code update and redeploy.',
      },
      {
        label: '"What you get:" text',
        reason: 'Hardcoded in the WhatsApp Flow JSON: "What you get: Daily crop care tips, local weather alerts, pest & disease warnings, market price updates, and sowing & harvest calendar." Requires a Meta flow re-upload to change.',
      },
    ],
  },
  {
    title: 'Welcome Screen — Returning Farmer',
    fields: [
      {
        key: 'flow_returning_title',
        label: 'Title template',
        type: 'text',
        hint: 'Heading for users who are already registered.',
        maxLength: 80,
        placeholders: ['{name}', '{crop}'],
        multilingual: true,
      },
      {
        key: 'flow_returning_body',
        label: 'Body template',
        type: 'textarea',
        hint: 'Paragraph shown below the returning-farmer title.',
        maxLength: 500,
        placeholders: ['{name}', '{crop}'],
        multilingual: true,
      },
      {
        key: 'flow_returning_button_label',
        label: 'Button Label',
        type: 'text',
        hint: 'Text on the action button for returning farmers.',
        maxLength: 20,
        multilingual: true,
      },
    ],
  },
  {
    title: 'Crop Selection Screen',
    fields: [
      {
        key: 'flow_crop_section_title',
        label: 'Sub-heading (below "Choose Your Crop")',
        type: 'text',
        hint: 'Shown as the sub-heading under the hardcoded "Choose Your Crop" heading.',
        maxLength: 80,
        placeholders: ['{state}'],
        multilingual: true,
      },
    ],
    lockedItems: [
      {
        label: '"Choose Your Crop" heading',
        reason: 'Hardcoded in the WhatsApp Flow JSON. Requires a Meta flow re-upload to change.',
      },
      {
        label: 'Crop options per state',
        reason: 'Managed per-state in the Crop Config page.',
      },
    ],
  },
  {
    title: 'Success Screen',
    fields: [
      {
        key: 'flow_success_heading',
        label: 'Heading template',
        type: 'text',
        hint: 'Large heading shown after successful registration.',
        maxLength: 80,
        placeholders: ['{name}', '{crop}', '{date}'],
        multilingual: true,
      },
      {
        key: 'flow_success_body',
        label: 'Body template',
        type: 'textarea',
        hint: 'Paragraph below the success heading.',
        maxLength: 500,
        placeholders: ['{name}', '{crop}', '{date}'],
        multilingual: true,
      },
    ],
    lockedItems: [
      {
        label: 'Success image',
        reason: 'Stored as base64 in code (src/assets/images.ts). Changing it requires a code update and redeploy.',
      },
    ],
  },
  {
    title: 'Post-Submit WhatsApp Message',
    fields: [
      {
        key: 'flow_completion_message',
        label: 'Text template',
        type: 'textarea',
        hint: 'WhatsApp text message sent automatically after the farmer submits the flow.',
        maxLength: 500,
        placeholders: ['{name}', '{crop}', '{date}'],
        multilingual: true,
      },
    ],
  },
  {
    title: 'WhatsApp Settings',
    fields: [
      {
        key: 'whatsapp_phone_number_id',
        label: 'Phone Number ID',
        type: 'text',
        hint: "Meta's ID for your WhatsApp Business phone number. Leave blank to use the environment variable.",
      },
      {
        key: 'whatsapp_flow_id',
        label: 'Flow ID',
        type: 'text',
        hint: "WhatsApp Flow ID sent to farmers. Update this after running the 'Update Flow JSON' GitHub Action — copy the new FLOW_ID from the action logs.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Locked field component
// ---------------------------------------------------------------------------
function LockedField({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 mb-3">
      <span className="text-slate-400 mt-0.5 shrink-0" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 7V5a3 3 0 0 0-6 0v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1zm-4 0V5a1 1 0 1 1 2 0v2H7z" />
        </svg>
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-xs text-slate-500 italic mt-0.5">{reason}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder badge
// ---------------------------------------------------------------------------
function PlaceholderBadge({ vars }: { vars: string[] }) {
  return (
    <span className="text-xs text-slate-500">
      Placeholders:{' '}
      {vars.map((v) => (
        <code key={v} className="bg-slate-100 rounded px-1 py-0.5 mr-1 text-slate-600">{v}</code>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Preview helpers
// ---------------------------------------------------------------------------
function applyPreview(tmpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), tmpl);
}

const PREVIEW_VARS = { name: 'Ravi', crop: 'Cotton', state: 'Maharashtra', date: '21 March 2026' };

type PreviewMode = 'chat' | 'flow';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Config() {
  // Regular (non-multilingual) config values
  const [config, setConfig] = useState<Record<string, string>>({});
  // Multilingual config: key → { en: '...', hi: '...', ... }
  const [mlConfig, setMlConfig] = useState<Record<string, Record<Language, string>>>({});
  // Currently edited language tab
  const [editLang, setEditLang] = useState<Language>('en');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('flow');
  const [flowStep, setFlowStep] = useState(0);

  useEffect(() => {
    api
      .get<Record<string, unknown>>('/config')
      .then((r) => {
        const plainConfig: Record<string, string> = {};
        const multiConfig: Record<string, Record<Language, string>> = {};

        for (const k of ALL_CONFIG_KEYS) {
          const v = r[k];
          if (MULTILINGUAL_KEYS.includes(k)) {
            // Build locale map for this key
            const map: Record<Language, string> = {} as Record<Language, string>;
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              // DB has a locale-map object
              for (const lang of LANGUAGE_KEYS) {
                const t = (v as Record<string, unknown>)[lang];
                map[lang] = typeof t === 'string' && t.trim() !== ''
                  ? t
                  : DEFAULT_STRINGS[lang][k] ?? '';
              }
            } else if (typeof v === 'string' && v.trim() !== '') {
              // Legacy plain string — treat as English, use built-ins for rest
              map['en'] = v;
              for (const lang of LANGUAGE_KEYS.filter((l) => l !== 'en')) {
                map[lang] = DEFAULT_STRINGS[lang][k] ?? '';
              }
            } else {
              // Missing — use built-ins for all languages
              for (const lang of LANGUAGE_KEYS) {
                map[lang] = DEFAULT_STRINGS[lang][k] ?? '';
              }
            }
            multiConfig[k] = map;
          } else {
            const raw = v != null ? String(v).trim() : '';
            plainConfig[k] = raw !== '' ? raw : (DEFAULT_CONFIG[k] ?? '');
          }
        }

        setConfig(plainConfig);
        setMlConfig(multiConfig);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const savePayload: Record<string, unknown> = { ...config };
      for (const k of MULTILINGUAL_KEYS) {
        savePayload[k] = mlConfig[k] ?? {};
      }
      await api.put('/config', savePayload);
      setMessage('Saved successfully');
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const mlVal = (key: string, lang: Language = editLang): string =>
    mlConfig[key]?.[lang] ?? DEFAULT_STRINGS[lang]?.[key] ?? '';

  const val = (key: string) => config[key] ?? DEFAULT_CONFIG[key] ?? '';

  // Preview computed values — use editLang for multilingual keys
  const previewHeader = val('flow_header') || 'कृषि सलाह / Agri Advisory';
  const previewBody = val('flow_body') || 'Register to get crop advisory.';
  const previewCta = val('flow_cta') || 'Register';
  const previewCompletion = applyPreview(
    mlVal('flow_completion_message') || DEFAULT_STRINGS[editLang].flow_completion_message,
    PREVIEW_VARS
  );
  const previewWelcomeTitle = mlVal('flow_welcome_title') || DEFAULT_STRINGS[editLang].flow_welcome_title;
  const previewWelcomeBody = mlVal('flow_welcome_body') || DEFAULT_STRINGS[editLang].flow_welcome_body;
  const previewWelcomeButton = mlVal('flow_welcome_button_label') || DEFAULT_STRINGS[editLang].flow_welcome_button_label;
  const previewCropTitle = applyPreview(
    mlVal('flow_crop_section_title') || DEFAULT_STRINGS[editLang].flow_crop_section_title,
    PREVIEW_VARS
  );
  const previewSuccessHeading = applyPreview(
    mlVal('flow_success_heading') || DEFAULT_STRINGS[editLang].flow_success_heading,
    PREVIEW_VARS
  );
  const previewSuccessBody = applyPreview(
    mlVal('flow_success_body') || DEFAULT_STRINGS[editLang].flow_success_body,
    PREVIEW_VARS
  );

  if (loading) return <p className="text-slate-600">Loading...</p>;

  const banner = PAGE_INFO_BANNERS.config;

  return (
    <div>
      <GlobalMessageBar title={banner.title} description={banner.description} className="mb-4" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Configuration</h1>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        Configure WhatsApp and Flow screen text. Saved in the database and loaded automatically.
      </p>
      <div className="flex flex-wrap gap-8 items-start">
        {/* ── Left: Sectioned form ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-[520px] min-w-[300px] flex-1">

          {/* ── Language tab bar (for multilingual fields) ── */}
          <div className="mb-6 pb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Language for Flow Screen Text
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGE_KEYS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setEditLang(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    editLang === lang
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {SUPPORTED_LANGUAGES[lang]}
                </button>
              ))}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">
                {section.title}
              </h2>
              {section.note && (
                <p className="text-xs text-slate-500 italic mb-3">{section.note}</p>
              )}
              {section.fields.map(({ key, label, type, hint, maxLength, placeholders, multilingual }) => {
                const isML = multilingual === true;
                const value = isML ? (mlConfig[key]?.[editLang] ?? '') : (config[key] ?? '');
                const len = value.length;
                const atLimit = maxLength != null && len >= maxLength;

                const handleChange = (newVal: string) => {
                  if (isML) {
                    setMlConfig((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], [editLang]: newVal },
                    }));
                  } else {
                    setConfig((c) => ({ ...c, [key]: newVal }));
                  }
                };

                return (
                  <div key={`${key}-${editLang}`} className="mb-4">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        {label}
                        {isML && (
                          <span className="ml-1.5 normal-case font-normal text-primary/70 tracking-normal">
                            · {SUPPORTED_LANGUAGES[editLang]}
                          </span>
                        )}
                      </label>
                      {maxLength != null && (
                        <span className={`text-xs tabular-nums shrink-0 ${atLimit ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                          {len}/{maxLength}
                        </span>
                      )}
                    </div>
                    {hint && <p className="text-sm text-slate-600 mb-1.5">{hint}</p>}
                    {placeholders && <div className="mb-1.5"><PlaceholderBadge vars={placeholders} /></div>}
                    {type === 'textarea' ? (
                      <textarea
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        maxLength={maxLength}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        maxLength={maxLength}
                        className="w-full min-h-10 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    )}
                    {maxLength != null && (
                      <p className="mt-1 text-xs text-slate-400">Max {maxLength} characters.</p>
                    )}
                  </div>
                );
              })}
              {section.lockedItems?.map((item) => (
                <LockedField key={item.label} label={item.label} reason={item.reason} />
              ))}
            </div>
          ))}

          {message && (
            <p className={`mb-4 text-sm ${message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* ── Right: Live preview ── */}
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

          {/* Language indicator for preview */}
          {previewMode === 'flow' && (
            <p className="text-xs text-slate-500 mb-2">
              Previewing: <span className="font-medium text-primary">{SUPPORTED_LANGUAGES[editLang]}</span>
            </p>
          )}

          {/* iPhone wireframe */}
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
                <div style={{ padding: '12px 10px', background: '#e5e5e5', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
                  <div>
                    <div style={{ marginRight: '4%', width: '96%', background: '#fff', borderRadius: '12px 12px 12px 4px', padding: '8px 12px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#111', lineHeight: 1.35 }}>{previewHeader}</div>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 10, lineHeight: 1.4 }}>{previewBody}</div>
                      <div style={{ display: 'inline-block', padding: '8px 16px', background: '#25D366', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>{previewCta}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Tap button to open flow</div>
                  </div>
                  <div style={{ marginRight: '4%', width: '96%', background: '#fff', borderRadius: '12px 12px 12px 4px', padding: '8px 12px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                    <span style={{ color: '#6b7280' }}>After submit: </span>{previewCompletion}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0, background: '#fff' }}>
                    {/* Step 0: WELCOME */}
                    {flowStep === 0 && (
                      <div className="space-y-3">
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
                          <img
                            src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                            alt="Agriculture"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h2 className="font-bold text-slate-900 leading-tight" style={{ fontSize: 18 }}>{previewWelcomeTitle}</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">{previewWelcomeBody}</p>
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 flex items-start gap-2">
                          <span className="text-slate-400 mt-0.5 shrink-0">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11 7V5a3 3 0 0 0-6 0v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1zm-4 0V5a1 1 0 1 1 2 0v2H7z" /></svg>
                          </span>
                          <p className="text-xs text-slate-500 italic leading-relaxed">
                            What you get: Daily crop care tips, local weather alerts, pest &amp; disease warnings, market price updates, and sowing &amp; harvest calendar.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 1: FARMER_DETAILS */}
                    {flowStep === 1 && (
                      <div className="space-y-3">
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img
                            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80"
                            alt="Farm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h2 className="font-bold text-slate-900 leading-tight" style={{ fontSize: 18 }}>Tell Us About Yourself</h2>
                        <p className="text-sm text-slate-500">Help us personalize your crop advisory</p>
                        <div className="space-y-2">
                          {['Preferred Language', 'Full Name', 'Age', 'Occupation', 'State', 'District / Village'].map((f) => (
                            <div key={f}>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{f}</label>
                              <div className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-400">—</div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 flex items-center gap-2">
                          <span className="text-slate-400 text-xs shrink-0">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11 7V5a3 3 0 0 0-6 0v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1zm-4 0V5a1 1 0 1 1 2 0v2H7z" /></svg>
                          </span>
                          <p className="text-xs text-slate-500 italic">Field labels &amp; layout are fixed in the WhatsApp Flow JSON</p>
                        </div>
                      </div>
                    )}

                    {/* Step 2: CROP_SELECTION */}
                    {flowStep === 2 && (
                      <div className="space-y-3">
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] bg-slate-100">
                          <img
                            src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80"
                            alt="Crops"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h2 className="font-bold text-slate-900 leading-tight" style={{ fontSize: 18 }}>Choose Your Crop</h2>
                        <p className="text-sm text-slate-500">{previewCropTitle}</p>
                        <div className="space-y-2">
                          {['Cotton', 'Paddy (Rice)', 'Wheat', 'Maize', 'Chilli'].map((crop) => (
                            <div key={crop} className="rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-2 bg-white">
                              <div className="w-2 h-2 rounded-full border-2 border-slate-300 shrink-0" />
                              <p className="text-sm text-slate-700">{crop}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 flex items-center gap-2">
                          <span className="text-slate-400 text-xs shrink-0">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11 7V5a3 3 0 0 0-6 0v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1zm-4 0V5a1 1 0 1 1 2 0v2H7z" /></svg>
                          </span>
                          <p className="text-xs text-slate-500 italic">Crop options managed in Crop Config page</p>
                        </div>
                      </div>
                    )}

                    {/* Step 3: SUCCESS */}
                    {flowStep === 3 && (
                      <div className="flex flex-col items-center py-4 text-center space-y-4">
                        <div className="rounded-xl overflow-hidden border border-slate-200 w-full max-w-[180px] aspect-square bg-primary/10">
                          <img
                            src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=300&q=80"
                            alt="Success"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg text-primary font-bold">✓</div>
                        <h2 className="font-bold text-slate-900 leading-tight" style={{ fontSize: 17 }}>{previewSuccessHeading}</h2>
                        <p className="text-sm text-slate-600 leading-relaxed max-w-[220px]">{previewSuccessBody}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer CTA */}
                  {flowStep < 3 && (
                    <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setFlowStep((s) => s + 1)}
                        className="w-full min-h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center"
                        style={{ background: '#25D366' }}
                      >
                        {flowStep === 0 ? previewWelcomeButton : flowStep === 2 ? 'Submit' : 'Next'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {previewMode === 'flow' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {['WELCOME', 'DETAILS', 'CROPS', 'SUCCESS'].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFlowStep(i)}
                  title={label}
                  className={`w-2 h-2 rounded-full transition-colors ${flowStep === i ? 'bg-primary' : 'bg-slate-300'}`}
                  aria-label={label}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2 text-center">
            Preview uses sample values: name=Ravi, crop=Cotton
          </p>
        </div>
      </div>
    </div>
  );
}
