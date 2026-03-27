/**
 * WhatsApp Flows Data Exchange Endpoint — Business Logic
 * Handles INIT, ping, and data_exchange actions for farmer registration flow.
 * Pattern: Meta's personalised-offer example (getNextScreen routing).
 */
import { getFarmerByWaId, upsertFarmer } from '../data/repositories/farmer.repository';
import { getStateCrop } from '../data/repositories/stateCrop.repository';
import { getDistrictsByState } from '../data/repositories/stateMaster.repository';
import { getConfigValue } from '../data/repositories/config.repository';
import { sendTextMessage } from './message.service';
import { logger } from '../utils/logger';
import {
  DEFAULT_LANGUAGE,
  validateLanguage,
  getLocalizedString,
  type Language,
} from '../utils/i18n';
import {
  FARM_HERO_IMAGE,
  CROP_FIELD_IMAGE,
  HARVEST_IMAGE,
  CROP_IMAGES,
} from '../assets/images';

// ---------------------------------------------------------------------------
// Flow token encoding/decoding (encodes wa_id without a DB round-trip)
// ---------------------------------------------------------------------------

export const encodeFlowToken = (waId: string): string =>
  'kj_' + Buffer.from(waId).toString('base64url') + '_' + Date.now();

export const decodeWaIdFromFlowToken = (flowToken: string): string | null => {
  try {
    const parts = flowToken.split('_');
    // Format: kj_<base64url>_<timestamp>
    // base64url may contain underscores, so rejoin everything between first and last segment
    if (parts.length < 3 || parts[0] !== 'kj') return null;
    const encoded = parts.slice(1, -1).join('_');
    return Buffer.from(encoded, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// State → crop recommendations
// ---------------------------------------------------------------------------

interface CropOption {
  id: string;
  title: string;
  description: string;
  image?: { src: string; 'alt-text': string };
}

function cropImg(id: string): { src: string; 'alt-text': string } | undefined {
  const src = CROP_IMAGES[id];
  return src ? { src, 'alt-text': id } : undefined;
}

function makeCrop(id: string, title: string, desc: string): CropOption {
  const img = cropImg(id);
  return img ? { id, title, description: desc, image: img } : { id, title, description: desc };
}

export const STATE_CROPS: Record<string, CropOption[]> = {
  punjab: [
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–May'),
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Sep–Oct'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
  ],
  haryana: [
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Apr–May'),
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
    makeCrop('mustard', 'Mustard', 'Rabi crop • Harvested Feb–Mar'),
  ],
  uttar_pradesh: [
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–May'),
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
    makeCrop('potato', 'Potato', 'Rabi crop • Harvested Jan–Mar'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Sep–Oct'),
  ],
  maharashtra: [
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
    makeCrop('soybean', 'Soybean', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('jowar', 'Jowar (Sorghum)', 'Kharif crop • Harvested Sep–Oct'),
    makeCrop('bajra', 'Bajra (Pearl Millet)', 'Kharif crop • Harvested Aug–Sep'),
  ],
  karnataka: [
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('ragi', 'Ragi (Finger Millet)', 'Kharif crop • Harvested Sep–Oct'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
    makeCrop('chilli', 'Chilli', 'Both seasons • Harvested Oct–Feb'),
  ],
  gujarat: [
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('groundnut', 'Groundnut', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('castor', 'Castor', 'Kharif crop • Harvested Jan–Feb'),
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–May'),
    makeCrop('bajra', 'Bajra (Pearl Millet)', 'Kharif crop • Harvested Aug–Sep'),
  ],
  rajasthan: [
    makeCrop('bajra', 'Bajra (Pearl Millet)', 'Kharif crop • Harvested Sep–Oct'),
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Apr–May'),
    makeCrop('mustard', 'Mustard', 'Rabi crop • Harvested Feb–Mar'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Sep–Oct'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
  ],
  madhya_pradesh: [
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–May'),
    makeCrop('soybean', 'Soybean', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('chilli', 'Chilli', 'Both seasons • Harvested Oct–Feb'),
  ],
  andhra_pradesh: [
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('chilli', 'Chilli', 'Both seasons • Harvested Oct–Feb'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('groundnut', 'Groundnut', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Aug–Sep'),
  ],
  telangana: [
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Aug–Sep'),
    makeCrop('chilli', 'Chilli', 'Both seasons • Harvested Oct–Feb'),
    makeCrop('soybean', 'Soybean', 'Kharif crop • Harvested Oct–Nov'),
  ],
  tamil_nadu: [
    makeCrop('paddy', 'Paddy (Rice)', 'Year-round • Main harvest Nov–Jan'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
    makeCrop('banana', 'Banana', 'Year-round • Harvested 9–11 months'),
    makeCrop('tomato', 'Tomato', 'Both seasons • Harvested 3–4 months'),
    makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
  ],
  west_bengal: [
    makeCrop('paddy', 'Paddy (Rice)', 'Aman • Harvested Nov–Jan'),
    makeCrop('jute', 'Jute', 'Kharif crop • Harvested Aug–Sep'),
    makeCrop('potato', 'Potato', 'Rabi crop • Harvested Jan–Mar'),
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–Apr'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Sep–Oct'),
  ],
  bihar: [
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Nov'),
    makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–May'),
    makeCrop('maize', 'Maize', 'Kharif crop • Harvested Sep–Oct'),
    makeCrop('sugarcane', 'Sugarcane', 'Annual crop • Harvested Feb–Mar'),
    makeCrop('lychee', 'Lychee', 'Summer fruit • Harvested May–Jun'),
  ],
  kerala: [
    makeCrop('paddy', 'Paddy (Rice)', 'Kharif • Virippu season'),
    makeCrop('coconut', 'Coconut', 'Year-round • Major Kerala crop'),
    makeCrop('rubber', 'Rubber', 'Tapped year-round • Peak Jun–Sep'),
    makeCrop('banana', 'Banana', 'Year-round • Harvested 9–12 months'),
    makeCrop('pepper', 'Black Pepper', 'Kharif • Harvested Nov–Jan'),
  ],
};

const DEFAULT_CROPS: CropOption[] = [
  makeCrop('cotton', 'Cotton', 'Kharif crop • Harvested Oct–Dec'),
  makeCrop('paddy', 'Paddy (Rice)', 'Kharif crop • Harvested Oct–Nov'),
  makeCrop('wheat', 'Wheat', 'Rabi crop • Harvested Mar–May'),
  makeCrop('maize', 'Maize', 'Kharif crop • Harvested Sep–Oct'),
  makeCrop('chilli', 'Chilli', 'Both seasons • Harvested Oct–Feb'),
];

export const STATE_LABELS: Record<string, string> = {
  maharashtra: 'Maharashtra', punjab: 'Punjab', karnataka: 'Karnataka',
  uttar_pradesh: 'Uttar Pradesh', gujarat: 'Gujarat', rajasthan: 'Rajasthan',
  madhya_pradesh: 'Madhya Pradesh', andhra_pradesh: 'Andhra Pradesh',
  tamil_nadu: 'Tamil Nadu', west_bengal: 'West Bengal', bihar: 'Bihar',
  telangana: 'Telangana', haryana: 'Haryana', kerala: 'Kerala', other: 'Your State',
};

// ---------------------------------------------------------------------------
// Crop label for advisory messages
// ---------------------------------------------------------------------------

export const CROP_LABEL_MAP: Record<string, string> = {
  cotton: 'Cotton', paddy: 'Paddy (Rice)', wheat: 'Wheat', maize: 'Maize',
  chilli: 'Chilli', sugarcane: 'Sugarcane', soybean: 'Soybean',
  jowar: 'Jowar (Sorghum)', bajra: 'Bajra (Pearl Millet)', groundnut: 'Groundnut',
  castor: 'Castor', mustard: 'Mustard', potato: 'Potato', ragi: 'Ragi (Finger Millet)',
  jute: 'Jute', coconut: 'Coconut', rubber: 'Rubber', banana: 'Banana',
  pepper: 'Black Pepper', lychee: 'Lychee', tomato: 'Tomato',
};

function cropLabel(id: string): string {
  return CROP_LABEL_MAP[id] ?? id;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseAdvisoryDate(value: unknown): Date | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') return new Date(value);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Template helper — replaces {name}, {crop}, {state}, {date} placeholders
// ---------------------------------------------------------------------------

function applyTemplate(tmpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), tmpl);
}

// ---------------------------------------------------------------------------
// Main routing — matches Meta's getNextScreen pattern
// ---------------------------------------------------------------------------

export const getNextScreen = async (
  decryptedBody: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const action = String(decryptedBody.action ?? '');
  const screen = String(decryptedBody.screen ?? '');
  const flowToken = String(decryptedBody.flow_token ?? '');
  const data = (decryptedBody.data ?? {}) as Record<string, unknown>;

  // Health check
  if (action === 'ping') {
    return { data: { status: 'active' } };
  }

  // Client-side errors (notification only)
  if (data?.error) {
    logger.warn('Flow endpoint: client-side error received:', data.error);
    return { data: { acknowledged: true } };
  }

  // Flow opened — personalize WELCOME screen
  if (action === 'INIT') {
    return handleInit(flowToken);
  }

  if (action === 'data_exchange') {
    switch (screen) {
      case 'FARMER_DETAILS':
        // Differentiate state-change (on-select-action) from form submit (Continue)
        if (String(data.action_type ?? '') === 'state_change') {
          return handleStateChange(data);
        }
        return handleFarmerDetails(data, flowToken);
      case 'CROP_SELECTION':
        return handleCropSelection(data, flowToken);
      default:
        logger.warn('Flow endpoint: unknown screen in data_exchange:', screen);
        return { data: { acknowledged: true } };
    }
  }

  logger.warn('Flow endpoint: unhandled action:', action);
  return { data: { acknowledged: true } };
};

// ---------------------------------------------------------------------------
// Screen handlers
// ---------------------------------------------------------------------------

async function handleInit(flowToken: string): Promise<Record<string, unknown>> {
  const waId = decodeWaIdFromFlowToken(flowToken);

  // Load all raw config values (may be locale-map objects or legacy plain strings)
  const [
    rawWelcomeTitle, rawWelcomeBody, rawWelcomeButton,
    rawReturningTitle, rawReturningBody, rawReturningButton,
  ] = await Promise.all([
    getConfigValue<unknown>('flow_welcome_title'),
    getConfigValue<unknown>('flow_welcome_body'),
    getConfigValue<unknown>('flow_welcome_button_label'),
    getConfigValue<unknown>('flow_returning_title'),
    getConfigValue<unknown>('flow_returning_body'),
    getConfigValue<unknown>('flow_returning_button_label'),
  ]);

  if (waId) {
    try {
      const existing = await getFarmerByWaId(waId);
      if (existing) {
        const lang: Language = existing.language
          ? validateLanguage(existing.language)
          : DEFAULT_LANGUAGE;
        logger.info('Flow INIT: returning farmer', waId, 'lang:', lang, 'crop:', existing.crop);
        const cropName = cropLabel(existing.crop);
        const vars = { name: existing.farmer_name, crop: cropName };
        // Pre-load district options for returning farmer's saved state
        let pfDistrictOptions: { id: string; title: string }[] = [];
        if (existing.state) {
          try {
            const districts = await getDistrictsByState(existing.state);
            pfDistrictOptions = districts.map((d) => ({ id: d, title: d }));
          } catch (err) {
            logger.warn('Flow INIT: could not load districts for state:', existing.state, err);
          }
        }
        return {
          screen: 'WELCOME',
          data: {
            header_image_src: FARM_HERO_IMAGE,
            welcome_title: applyTemplate(
              getLocalizedString(rawReturningTitle, lang, 'flow_returning_title'), vars
            ),
            welcome_body: applyTemplate(
              getLocalizedString(rawReturningBody, lang, 'flow_returning_body'), vars
            ),
            button_label: getLocalizedString(rawReturningButton, lang, 'flow_returning_button_label'),
            // Pre-fill data passed via navigate payload → FARMER_DETAILS Form init-values
            pf_farmer_name: existing.farmer_name || '',
            pf_age: parseInt(existing.age) || 0,
            pf_profession: existing.profession || '',
            pf_state: existing.state || '',
            pf_district: existing.district || '',
            pf_district_options: pfDistrictOptions,
            pf_language: lang,
          },
        };
      }
    } catch (err) {
      logger.warn('Flow INIT: could not check existing farmer:', err);
    }
  }

  // New farmer — use default language (English)
  const lang = DEFAULT_LANGUAGE;
  return {
    screen: 'WELCOME',
    data: {
      header_image_src: FARM_HERO_IMAGE,
      welcome_title: getLocalizedString(rawWelcomeTitle, lang, 'flow_welcome_title'),
      welcome_body: getLocalizedString(rawWelcomeBody, lang, 'flow_welcome_body'),
      button_label: getLocalizedString(rawWelcomeButton, lang, 'flow_welcome_button_label'),
      // Prefill for new farmers — only non-text fields to avoid triggering
      // WhatsApp's required-field validation on first render (empty string init-values
      // on required TextInput show the ! error immediately on load).
      pf_age: 0,
      pf_state: '',
      pf_district: '',
      pf_district_options: [],
      pf_language: lang,
    },
  };
}

// Called when the user selects a state in FARMER_DETAILS — returns district options
// for that state without navigating away (same screen, updated data).
async function handleStateChange(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const state = String(data.state ?? '').toLowerCase().replace(/ /g, '_');
  logger.info('Flow STATE_CHANGE: state=%s', state);

  let districtOptions: { id: string; title: string }[] = [];
  try {
    const districts = await getDistrictsByState(state);
    districtOptions = districts.map((d) => ({ id: d, title: d }));
  } catch (err) {
    logger.warn('Flow STATE_CHANGE: could not load districts for state:', state, err);
  }

  return {
    screen: 'FARMER_DETAILS',
    data: { district_options: districtOptions },
  };
}

async function handleFarmerDetails(
  data: Record<string, unknown>,
  flowToken: string
): Promise<Record<string, unknown>> {
  const state = String(data.state ?? '').toLowerCase().replace(/ /g, '_');
  const stateLabel = STATE_LABELS[state] ?? 'Your State';

  const stateCropDoc = await getStateCrop(state);
  const cropOptions = (stateCropDoc?.crops?.length ? stateCropDoc.crops : null) ?? STATE_CROPS[state] ?? DEFAULT_CROPS;

  logger.info('Flow FARMER_DETAILS: state=%s crops=%d (source=%s)', state, cropOptions.length, stateCropDoc?.crops?.length ? 'db' : 'fallback');

  // Strip 'image' from crop options — the flow JSON schema only declares id/title/description.
  // Meta validates responses against the schema and rejects extra fields.
  const cropOptionsForFlow = cropOptions.map(({ id, title, description }) => ({ id, title, description }));

  // Look up existing crop + advisory date to pre-fill CROP_SELECTION via Form init-values
  let pfCrop = '';
  let pfAdvisoryDate = '';
  const waId = decodeWaIdFromFlowToken(flowToken);
  if (waId) {
    try {
      const existing = await getFarmerByWaId(waId);
      if (existing) {
        pfCrop = existing.crop || '';
        if (existing.advisory_start_date) {
          pfAdvisoryDate = new Date(existing.advisory_start_date as Date).toISOString().split('T')[0];
        }
        logger.info('Flow FARMER_DETAILS: prefill crop=%s date=%s for %s', pfCrop, pfAdvisoryDate, waId);
      }
    } catch (err) {
      logger.warn('Flow FARMER_DETAILS: could not fetch existing farmer for prefill:', err);
    }
  }

  const lang: Language = validateLanguage(String(data.language ?? 'en'));

  const rawCropSectionTitle = await getConfigValue<unknown>('flow_crop_section_title');
  const cropSectionTitle = applyTemplate(
    getLocalizedString(rawCropSectionTitle, lang, 'flow_crop_section_title'),
    { state: stateLabel }
  );

  return {
    screen: 'CROP_SELECTION',
    data: {
      header_image_src: CROP_FIELD_IMAGE,
      crop_section_title: cropSectionTitle,
      crop_options: cropOptionsForFlow,
      // Pass farmer details through to CROP_SELECTION so they're in the final payload
      farmer_name: data.farmer_name,
      age: data.age,
      profession: data.profession,
      state: data.state,
      state_label: stateLabel,
      district: data.district,
      language: lang,
      // Pre-fill existing crop and advisory date via CROP_SELECTION Form init-values
      pf_crop: pfCrop,
      pf_advisory_start_date: pfAdvisoryDate,
    },
  };
}

async function handleCropSelection(
  data: Record<string, unknown>,
  flowToken: string
): Promise<Record<string, unknown>> {
  const waId = decodeWaIdFromFlowToken(flowToken);
  const lang: Language = validateLanguage(String(data.language ?? 'en'));
  const farmerName = String(data.farmer_name ?? 'Farmer');
  const cropId = String(data.crop ?? '');
  const cropName = cropLabel(cropId);
  const advisoryDate = parseAdvisoryDate(data.advisory_start_date);

  const dateStr = advisoryDate ? formatDate(advisoryDate) : 'soon';
  const templateVars = { name: farmerName, crop: cropName, date: dateStr };

  const [rawSuccessHeading, rawSuccessBody, rawCompletionMsg] = await Promise.all([
    getConfigValue<unknown>('flow_success_heading'),
    getConfigValue<unknown>('flow_success_body'),
    getConfigValue<unknown>('flow_completion_message'),
  ]);

  const successHeading = applyTemplate(
    getLocalizedString(rawSuccessHeading, lang, 'flow_success_heading'), templateVars
  );
  const successBody = applyTemplate(
    getLocalizedString(rawSuccessBody, lang, 'flow_success_body'), templateVars
  );
  const confirmMsg = applyTemplate(
    getLocalizedString(rawCompletionMsg, lang, 'flow_completion_message'), templateVars
  );

  if (waId) {
    try {
      await upsertFarmer({
        wa_id: waId,
        farmer_name: farmerName,
        age: String(data.age ?? ''),
        profession: String(data.profession ?? ''),
        state: String(data.state ?? '').toLowerCase().replace(/ /g, '_'),
        district: String(data.district ?? ''),
        crop: cropId,
        advisory_start_date: advisoryDate,
        flow_token: flowToken,
        language: lang,
      });
      logger.info('Flow CROP_SELECTION: farmer saved', waId, cropId);

      sendTextMessage(waId, confirmMsg).catch((err) =>
        logger.error('Flow: confirmation text failed:', err)
      );
    } catch (err) {
      logger.error('Flow CROP_SELECTION: failed to save farmer:', err);
    }
  }

  return {
    screen: 'SUCCESS',
    data: {
      success_image_src: HARVEST_IMAGE,
      confirmation_heading: successHeading,
      confirmation_body: successBody,
      extension_message_response: {
        params: { flow_token: flowToken },
      },
    },
  };
}
