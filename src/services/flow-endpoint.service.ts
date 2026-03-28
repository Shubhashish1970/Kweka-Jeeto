/**
 * WhatsApp Flows Data Exchange Endpoint — Business Logic
 * Handles INIT, ping, and data_exchange actions for farmer registration flow.
 * Pattern: Meta's personalised-offer example (getNextScreen routing).
 */
import { getFarmerByWaId, upsertFarmer } from '../data/repositories/farmer.repository';
import { getStateCrop } from '../data/repositories/stateCrop.repository';
import { getDistrictsByState } from '../data/repositories/stateMaster.repository';
import { getAllLandholdingUnits, getLandholdingUnitById } from '../data/repositories/landholdingUnit.repository';
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
      case 'WELCOME':
        if (String(data.action_type ?? '') === 'welcome_button') {
          return handleWelcomeButton(data);
        }
        break;
      case 'FARMER_DETAILS':
        // Differentiate state-change (on-select-action) from form submit (Continue)
        if (String(data.action_type ?? '') === 'state_change') {
          return handleStateChange(data);
        }
        return handleFarmerDetails(data, flowToken);
      case 'CROP_SELECTION':
        return handleCropSelection(data, flowToken);
      default:
        break;
    }
    logger.warn('Flow endpoint: unknown screen/action_type in data_exchange: screen=%s action_type=%s', screen, data.action_type);
    return { data: { acknowledged: true } };
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
        const pfAge = parseInt(existing.age) || 0;
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
            // Pass returning farmer data via WELCOME navigate payload → FARMER_DETAILS
            // Only include non-empty values — empty string on required fields triggers validation errors
            pf_language: lang,
            ...(existing.farmer_name ? { pf_farmer_name: existing.farmer_name } : {}),
            ...(pfAge > 0 ? { pf_age: pfAge } : {}),
            ...(existing.profession ? { pf_profession: existing.profession } : {}),
            ...(existing.state ? { pf_state: existing.state } : {}),
            ...(existing.district ? { pf_district: existing.district } : {}),
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
      // No pf_* prefill for new farmers — avoids validation errors on empty required fields
      pf_language: lang,
    },
  };
}

// Called when WELCOME button is clicked — returns FARMER_DETAILS with district options
// pre-loaded (for returning farmers) and pf_* prefill values.
async function handleWelcomeButton(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const pfState = String(data.pf_state ?? '').toLowerCase().replace(/ /g, '_');
  logger.info('Flow WELCOME_BUTTON: pf_state=%s', pfState || '(new farmer)');

  let districtOptions: { id: string; title: string }[] = [];
  if (pfState) {
    try {
      const districts = await getDistrictsByState(pfState);
      districtOptions = districts.map((d) => ({ id: d, title: d }));
    } catch (err) {
      logger.warn('Flow WELCOME_BUTTON: could not load districts for state:', pfState, err);
    }
  }

  const pfFarmerName = String(data.pf_farmer_name ?? '');
  const pfAge = Number(data.pf_age ?? 0);
  const pfProfession = String(data.pf_profession ?? '');
  const pfDistrict = String(data.pf_district ?? '');
  const pfLanguage = String(data.pf_language ?? 'en') || 'en';

  const responseData: Record<string, unknown> = {
    district_options: districtOptions,
    pf_language: pfLanguage,
  };

  // Only include prefill values when non-empty — avoids validation errors on new-farmer screens
  if (pfFarmerName) responseData.pf_farmer_name = pfFarmerName;
  if (pfAge > 0)    responseData.pf_age = pfAge;
  if (pfProfession) responseData.pf_profession = pfProfession;
  if (pfState)      responseData.pf_state = pfState;
  if (pfDistrict)   responseData.pf_district = pfDistrict;

  return { screen: 'FARMER_DETAILS', data: responseData };
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
    data: {
      district_options: districtOptions,
      // Must echo pf_state back — without it, WhatsApp re-applies init-values
      // and the selected state gets wiped.
      pf_state: state,
    },
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

  // Look up existing data to pre-fill CROP_SELECTION via Form init-values
  let pfCrop = '';
  let pfAdvisoryDate = '';
  let pfLandholdingValue = 0;
  let pfLandholdingUnit = '';
  const waId = decodeWaIdFromFlowToken(flowToken);
  if (waId) {
    try {
      const existing = await getFarmerByWaId(waId);
      if (existing) {
        pfCrop = existing.crop || '';
        if (existing.advisory_start_date) {
          pfAdvisoryDate = new Date(existing.advisory_start_date as Date).toISOString().split('T')[0];
        }
        if (existing.landholding) {
          pfLandholdingValue = existing.landholding.value || 0;
          pfLandholdingUnit = existing.landholding.unit || '';
        }
        logger.info('Flow FARMER_DETAILS: prefill crop=%s date=%s landholding=%s%s for %s',
          pfCrop, pfAdvisoryDate, pfLandholdingValue, pfLandholdingUnit, waId);
      }
    } catch (err) {
      logger.warn('Flow FARMER_DETAILS: could not fetch existing farmer for prefill:', err);
    }
  }

  // Load landholding unit options from DB (cached)
  let landholdingUnitOptions: { id: string; title: string }[] = [];
  try {
    const units = await getAllLandholdingUnits();
    landholdingUnitOptions = units.map((u) => ({ id: u.id, title: u.label }));
  } catch (err) {
    logger.warn('Flow FARMER_DETAILS: could not load landholding units:', err);
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
      landholding_unit_options: landholdingUnitOptions,
      // Pass farmer details through to CROP_SELECTION so they're in the final payload
      farmer_name: data.farmer_name,
      age: data.age,
      profession: data.profession,
      state: data.state,
      state_label: stateLabel,
      district: data.district,
      language: lang,
      // Pre-fill existing values — only include when non-empty/non-zero
      ...(pfCrop ? { pf_crop: pfCrop } : {}),
      ...(pfAdvisoryDate ? { pf_advisory_start_date: pfAdvisoryDate } : {}),
      ...(pfLandholdingValue > 0 ? { pf_landholding_value: pfLandholdingValue } : {}),
      ...(pfLandholdingUnit ? { pf_landholding_unit: pfLandholdingUnit } : {}),
    },
  };
}

async function handleCropSelection(
  data: Record<string, unknown>,
  flowToken: string
): Promise<Record<string, unknown>> {
  const waId = decodeWaIdFromFlowToken(flowToken);
  logger.info('Flow CROP_SELECTION: received data keys=%s landholding_value=%s landholding_unit=%s', Object.keys(data).join(','), data.landholding_value, data.landholding_unit);
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

  // Compute landholding in acres
  const landholdingValue = Number(data.landholding_value ?? 0);
  const landholdingUnitId = String(data.landholding_unit ?? '');
  let landholding: { value: number; unit: string; acres: number } | undefined;
  if (landholdingValue > 0 && landholdingUnitId) {
    try {
      const unitDoc = await getLandholdingUnitById(landholdingUnitId);
      const factor = unitDoc?.conversion_factor ?? 1;
      landholding = {
        value: landholdingValue,
        unit: landholdingUnitId,
        acres: Math.round(landholdingValue * factor * 1000) / 1000,
      };
      logger.info('Flow CROP_SELECTION: landholding %s %s = %s acres', landholdingValue, landholdingUnitId, landholding.acres);
    } catch (err) {
      logger.warn('Flow CROP_SELECTION: could not compute landholding acres:', err);
    }
  }

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
        landholding,
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
