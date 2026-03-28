/**
 * Create and publish a new WhatsApp Flow with the latest farmer-registration.json.
 * Meta does not support in-place JSON updates for published flows — a new flow is always created.
 *
 * After this script runs:
 *   1. Copy the printed FLOW_ID
 *   2. Go to Admin Portal → Config → set whatsapp_flow_id = <new FLOW_ID>
 *   No backend redeploy needed (whatsapp_flow_id is read from DB at runtime).
 *
 * Usage: npm run update:flow
 * Requires: WHATSAPP_ACCESS_TOKEN, WABA_ID (or WHATSAPP_PHONE_NUMBER_ID), FLOW_ENDPOINT_URI
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

function randomFlowSuffix(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => chars[b % 36]).join('');
}

const WABA_ID = process.env.WABA_ID;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!ACCESS_TOKEN) { console.error('Missing WHATSAPP_ACCESS_TOKEN'); process.exit(1); }
if (!WABA_ID && !PHONE_NUMBER_ID) { console.error('Missing WABA_ID or WHATSAPP_PHONE_NUMBER_ID'); process.exit(1); }

const flowPath = path.join(__dirname, '../flows/farmer-registration.json');
const flowJson = fs.readFileSync(flowPath, 'utf-8');

/** Collect WABA IDs from me?fields=businesses. */
async function resolveWabaFromToken(headers: Record<string, string>): Promise<string[]> {
  const catchResponse = (e: { response?: { status?: number; data?: unknown } }) => e.response;
  const meRes = await axios.get(
    `${GRAPH_API}/me?fields=businesses{owned_whatsapp_business_accounts{id},client_whatsapp_business_accounts{id}}`,
    { headers }
  ).catch(catchResponse);
  if (!meRes || meRes.status !== 200) return [];
  const raw = meRes.data as { businesses?: { data?: Array<{ owned_whatsapp_business_accounts?: { data?: Array<{ id: string }> }; client_whatsapp_business_accounts?: { data?: Array<{ id: string }> } }> } };
  const businesses = Array.isArray(raw?.businesses?.data) ? raw.businesses!.data! : [];
  const wabaIds = new Set<string>();
  for (const biz of businesses) {
    for (const w of biz?.owned_whatsapp_business_accounts?.data ?? []) if (w?.id) wabaIds.add(w.id);
    for (const w of biz?.client_whatsapp_business_accounts?.data ?? []) if (w?.id) wabaIds.add(w.id);
  }
  return Array.from(wabaIds);
}

async function getPhoneNumberIdsForWaba(wabaId: string, headers: Record<string, string>): Promise<string[]> {
  const res = await axios.get(`${GRAPH_API}/${wabaId}/phone_numbers?fields=id`, { headers }).catch(() => null);
  if (!res || res.status !== 200) return [];
  const data = (res.data as { data?: Array<{ id: string }> })?.data;
  return Array.isArray(data) ? data.map((p) => p.id).filter(Boolean) : [];
}

const run = async () => {
  const headers = { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
  const catchResponse = (e: { response?: { status?: number; data?: unknown } }) => e.response;

  // Resolve WABA ID
  let effectiveWabaId: string | null = WABA_ID || null;
  if (!effectiveWabaId) {
    console.log('Resolving WABA from token...');
    const wabaIds = await resolveWabaFromToken(headers);
    if (wabaIds.length === 0) { console.error('Could not resolve WABA. Set WABA_ID in GitHub Secrets.'); process.exit(1); }
    if (wabaIds.length === 1) {
      effectiveWabaId = wabaIds[0];
    } else if (PHONE_NUMBER_ID) {
      for (const wabaId of wabaIds) {
        if ((await getPhoneNumberIdsForWaba(wabaId, headers)).includes(PHONE_NUMBER_ID)) {
          effectiveWabaId = wabaId;
          break;
        }
      }
      if (!effectiveWabaId) { console.error('Multiple WABAs found; set WABA_ID in GitHub Secrets.'); process.exit(1); }
    } else {
      effectiveWabaId = wabaIds[0];
    }
    console.log('WABA resolved:', effectiveWabaId);
  }

  const endpointUri = process.env.FLOW_ENDPOINT_URI || '';
  const flowName = `farmer_registration_poc_${randomFlowSuffix()}`;
  console.log(`Creating new draft flow: ${flowName}`);
  if (endpointUri) console.log('Endpoint URI:', endpointUri);

  // Create draft flow with new JSON
  const createRes = await axios.post(
    `${GRAPH_API}/${effectiveWabaId}/flows`,
    {
      name: flowName,
      categories: ['LEAD_GENERATION'],
      flow_json: flowJson,
      publish: false,
      ...(endpointUri ? { endpoint_uri: endpointUri } : {}),
    },
    { headers }
  ).catch(catchResponse);

  if (!createRes || createRes.status !== 200 && createRes.status !== 201) {
    console.error('Create flow FAILED:', JSON.stringify(createRes?.data ?? 'No response', null, 2));
    process.exit(1);
  }

  const flowId = (createRes.data as { id?: string })?.id;
  if (!flowId) { console.error('No flow ID in create response:', JSON.stringify(createRes.data, null, 2)); process.exit(1); }
  console.log(`Flow created (draft): ${flowId}`);

  // Check validation errors
  const validationErrors: unknown[] = (createRes.data as { validation_errors?: unknown[] }).validation_errors ?? [];
  if (validationErrors.length > 0) {
    console.error('\n=== Flow JSON validation errors ===');
    (validationErrors as Array<{ error?: string; message?: string; pointers?: Array<{ path?: string; line_start?: number; line_end?: number }> }>).forEach((e, i) => {
      console.error(`[${i + 1}] ${e.error ?? 'ERROR'}: ${e.message ?? ''}`);
      const p = e.pointers?.[0];
      if (p?.path) console.error(`    path: ${p.path}`);
      if (p?.line_start != null) console.error(`    lines: ${p.line_start}-${p.line_end ?? p.line_start}`);
    });
    console.error(JSON.stringify(validationErrors, null, 2));
    process.exit(1);
  }

  // Publish the new flow
  console.log('Publishing new flow...');
  const publishRes = await axios.post(`${GRAPH_API}/${flowId}/publish`, {}, { headers }).catch(catchResponse);
  if (!publishRes || publishRes.status !== 200) {
    console.error('Publish FAILED:', JSON.stringify(publishRes?.data ?? 'No response', null, 2));
    console.error('Flow was created as draft:', flowId, '— publish manually once endpoint is live.');
    process.exit(1);
  }

  fs.writeFileSync(path.join(__dirname, '../.flow_id'), flowId, 'utf-8');

  console.log('');
  console.log('==========================================');
  console.log('Flow updated and published successfully!');
  console.log('');
  console.log(`New FLOW_ID = ${flowId}`);
  console.log('');
  console.log('Next step (no redeploy needed):');
  console.log('  Admin Portal → Config → set  whatsapp_flow_id = ' + flowId);
  console.log('==========================================');
};

run().catch((err: unknown) => {
  const ax = err as { response?: { status?: number; data?: unknown } };
  console.error('Update failed:', ax.response ? JSON.stringify(ax.response.data, null, 2) : err);
  process.exit(1);
});
