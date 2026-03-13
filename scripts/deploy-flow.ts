import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WABA_ID = process.env.WABA_ID;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!ACCESS_TOKEN) {
  console.error('Missing WHATSAPP_ACCESS_TOKEN');
  process.exit(1);
}

if (!WABA_ID && !PHONE_NUMBER_ID) {
  console.error('Missing both WABA_ID and WHATSAPP_PHONE_NUMBER_ID. Set at least one in GitHub Secrets.');
  console.error('• WABA_ID = WhatsApp Business Account ID (from Meta → WhatsApp → API Setup).');
  console.error('• If you only have a phone number ID, set WHATSAPP_PHONE_NUMBER_ID; we will try to resolve WABA from the token.');
  process.exit(1);
}

const flowPath = path.join(__dirname, '../flows/farmer-registration.json');
const flowJson = fs.readFileSync(flowPath, 'utf-8');

const WABA_HELP = `
WABA_ID / token issue (Meta error 100, subcode 33):
• Use the WhatsApp Business Account ID, NOT the Phone Number ID.
• Get it: Meta for Developers → Your App → WhatsApp → API Setup → "WhatsApp Business Account ID".
• Use a System User access token with whatsapp_business_management permission.
• Phone Number ID is only for sending messages; flow creation requires the Business Account ID.
• After fixing: update the WABA_ID (or WHATSAPP_ACCESS_TOKEN) secret in GitHub and re-run Deploy Flow (One-Time).
`;

const isMetaPermissionError = (data: unknown): boolean => {
  const d = data as { error?: { code?: number; error_subcode?: number } };
  return d?.error?.code === 100 && d?.error?.error_subcode === 33;
};

const TOKEN_HELP = `
WHATSAPP_ACCESS_TOKEN appears invalid or expired:
• Use a System User or User access token (not the short-lived "Temporary" token from the API Setup page).
• Create one: Meta Business Settings → Users → System Users → Add Assets → your App → Generate token.
• Required permission: whatsapp_business_management (and optionally whatsapp_business_messaging).
`;

/** Collect WABA IDs from me?fields=businesses (owned + client WABAs). Requires business_management + whatsapp_business_management. */
async function resolveWabaFromToken(
  headers: Record<string, string>
): Promise<string[]> {
  const catchResponse = (e: { response?: { status?: number; data?: unknown } }) => e.response;
  const meRes = await axios.get(
    `${GRAPH_API}/me?fields=businesses{owned_whatsapp_business_accounts{id},client_whatsapp_business_accounts{id}}`,
    { headers }
  ).catch(catchResponse);
  if (!meRes || meRes.status !== 200) {
    if (meRes?.data) console.error('me/businesses response:', JSON.stringify(meRes.data, null, 2));
    return [];
  }
  const raw = meRes.data as {
    businesses?: { data?: Array<{
      owned_whatsapp_business_accounts?: { data?: Array<{ id: string }> };
      client_whatsapp_business_accounts?: { data?: Array<{ id: string }> };
    }> };
  };
  const businesses = Array.isArray(raw?.businesses?.data) ? raw.businesses!.data! : [];
  const wabaIds = new Set<string>();
  for (const biz of businesses) {
    const owned = biz?.owned_whatsapp_business_accounts?.data ?? [];
    const client = biz?.client_whatsapp_business_accounts?.data ?? [];
    for (const w of owned) if (w?.id) wabaIds.add(w.id);
    for (const w of client) if (w?.id) wabaIds.add(w.id);
  }
  return Array.from(wabaIds);
}

/** For a given WABA, get list of phone number IDs. */
async function getPhoneNumberIdsForWaba(
  wabaId: string,
  headers: Record<string, string>
): Promise<string[]> {
  const catchResponse = (e: { response?: { status?: number; data?: unknown } }) => e.response;
  const res = await axios.get(
    `${GRAPH_API}/${wabaId}/phone_numbers?fields=id`,
    { headers }
  ).catch(catchResponse);
  if (!res || res.status !== 200) return [];
  const data = (res.data as { data?: Array<{ id: string }> })?.data;
  return Array.isArray(data) ? data.map((p) => p.id).filter(Boolean) : [];
}

const run = async () => {
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const catchResponse = (e: { response?: { status?: number; data?: unknown } }) => e.response;

  try {
    // Step 1: Verify token (token-only check)
    console.log('Step 1: Verifying WHATSAPP_ACCESS_TOKEN...');
    const tokenCheck = await axios.get(`${GRAPH_API}/me?fields=id`, { headers }).catch(catchResponse);
    if (!tokenCheck || tokenCheck.status !== 200) {
      const data = tokenCheck?.data;
      console.error('Token check FAILED. Meta API response:', JSON.stringify(data ?? 'No response', null, 2));
      console.error(TOKEN_HELP);
      process.exit(1);
    }
    console.log('Step 1 OK: Token is valid (identity id:', (tokenCheck.data as { id?: string })?.id ?? 'ok', ')');

    // Resolve effective WABA: use WABA_ID if set, else discover from token (and optionally match by PHONE_NUMBER_ID)
    let effectiveWabaId: string | null = WABA_ID || null;
    if (!effectiveWabaId) {
      console.log('Step 2a: WABA_ID not set; resolving WABA from token (businesses → WABAs)...');
      const wabaIds = await resolveWabaFromToken(headers);
      if (wabaIds.length === 0) {
        console.error('Could not resolve any WABA from token. Ensure the token has business_management and whatsapp_business_management, and the app is linked to a Business with a WhatsApp Business Account.');
        console.error('Alternatively, set WABA_ID in GitHub Secrets to the WhatsApp Business Account ID from Meta → WhatsApp → API Setup.');
        process.exit(1);
      }
      if (wabaIds.length === 1) {
        effectiveWabaId = wabaIds[0];
        console.log('Step 2a OK: Resolved single WABA from token:', effectiveWabaId);
      } else if (PHONE_NUMBER_ID) {
        for (const wabaId of wabaIds) {
          const phoneIds = await getPhoneNumberIdsForWaba(wabaId, headers);
          if (phoneIds.includes(PHONE_NUMBER_ID)) {
            effectiveWabaId = wabaId;
            console.log('Step 2a OK: Resolved WABA from token using WHATSAPP_PHONE_NUMBER_ID:', effectiveWabaId);
            break;
          }
        }
        if (!effectiveWabaId) {
          console.error('Multiple WABAs found but none own the given WHATSAPP_PHONE_NUMBER_ID. Set WABA_ID in GitHub Secrets to the correct WhatsApp Business Account ID.');
          process.exit(1);
        }
      } else {
        effectiveWabaId = wabaIds[0];
        console.log('Step 2a OK: Multiple WABAs found; using first. To target a specific WABA, set WABA_ID in GitHub Secrets.');
      }
    }

    // Step 2: Verify WABA access (effective WABA + token permission)
    console.log('Step 2: Verifying access to WhatsApp Business Account...');
    const wabaCheck = await axios.get(`${GRAPH_API}/${effectiveWabaId}`, { headers }).catch(catchResponse);
    if (!wabaCheck || wabaCheck.status !== 200) {
      const data = wabaCheck?.data;
      console.error('WABA check FAILED. Meta API response:', JSON.stringify(data ?? 'No response', null, 2));
      console.error('Token is valid, so the issue is likely WABA_ID or token permission for this WABA.');
      console.error(WABA_HELP);
      process.exit(1);
    }
    console.log('Step 2 OK: WABA access confirmed. Creating flow...');

    const res = await axios.post(
      `${GRAPH_API}/${effectiveWabaId}/flows`,
      {
        name: 'farmer_registration_poc_v2',
        categories: ['LEAD_GENERATION'],
        flow_json: flowJson,
        publish: true,
      },
      { headers }
    );

    const flowId = res.data?.id;
    if (flowId) {
      console.log('Flow published successfully!');
      console.log(`FLOW_ID=${flowId}`);
      fs.writeFileSync(path.join(__dirname, '../.flow_id'), flowId, 'utf-8');
      process.exit(0);
    } else {
      console.error('Unexpected response:', JSON.stringify(res.data, null, 2));
      process.exit(1);
    }
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number; data?: unknown } };
    if (ax.response) {
      console.error('Meta API error:', ax.response.status, JSON.stringify(ax.response.data, null, 2));
      if (isMetaPermissionError(ax.response.data)) {
        console.error(WABA_HELP);
      }
    } else {
      console.error('Deploy failed:', err);
    }
    process.exit(1);
  }
};

run();
