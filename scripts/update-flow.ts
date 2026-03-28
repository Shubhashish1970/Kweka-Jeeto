/**
 * Update an existing WhatsApp Flow's JSON asset without creating a new flow.
 * Use this whenever the flow JSON changes (screens, fields, logic).
 * Requires the flow to be in DRAFT state first (it re-deprecates a published flow).
 *
 * Usage: npm run update:flow
 * Requires: FLOW_ID and WHATSAPP_ACCESS_TOKEN in env / GitHub Secrets
 *
 * Meta API: POST /{flow-id}/assets  (multipart/form-data)
 */
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

const FLOW_ID = process.env.FLOW_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!FLOW_ID) {
  console.error('Missing FLOW_ID env var. Set it to the existing flow ID in GitHub Secrets.');
  process.exit(1);
}
if (!ACCESS_TOKEN) {
  console.error('Missing WHATSAPP_ACCESS_TOKEN env var.');
  process.exit(1);
}

const flowPath = path.join(__dirname, '../flows/farmer-registration.json');
const flowJson = fs.readFileSync(flowPath, 'utf-8');

const run = async () => {
  const authHeaders = { Authorization: `Bearer ${ACCESS_TOKEN}` };

  // Step 1: Check current flow status
  console.log(`Checking flow ${FLOW_ID} status...`);
  const detailsRes = await axios.get(
    `${GRAPH_API}/${FLOW_ID}?fields=status,validation_errors,name`,
    { headers: authHeaders }
  ).catch((e: { response?: { status?: number; data?: unknown } }) => e.response);

  if (!detailsRes || detailsRes.status !== 200) {
    console.error('Could not fetch flow details:', JSON.stringify(detailsRes?.data ?? 'No response', null, 2));
    process.exit(1);
  }

  const { status: flowStatus, name: flowName } = detailsRes.data as { status: string; name: string };
  console.log(`Flow: "${flowName}" | Status: ${flowStatus}`);

  // Step 2: If PUBLISHED, deprecate it first so we can upload new JSON
  if (flowStatus === 'PUBLISHED') {
    console.log('Flow is PUBLISHED — deprecating to allow JSON update...');
    await axios.post(
      `${GRAPH_API}/${FLOW_ID}/deprecate`,
      {},
      { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
    ).catch((e: { response?: { status?: number; data?: unknown } }) => {
      console.error('Deprecate failed:', JSON.stringify(e.response?.data ?? e, null, 2));
      process.exit(1);
    });
    console.log('Flow deprecated (now DRAFT). Uploading new JSON...');
  } else {
    console.log('Flow is in DRAFT — uploading new JSON directly...');
  }

  // Step 3: Upload new flow JSON via assets API
  const form = new FormData();
  form.append('name', 'farmer-registration.json');
  form.append('asset_type', 'FLOW_JSON');
  form.append('file', Buffer.from(flowJson, 'utf-8'), {
    filename: 'farmer-registration.json',
    contentType: 'application/json',
  });

  const uploadRes = await axios.post(
    `${GRAPH_API}/${FLOW_ID}/assets`,
    form,
    { headers: { ...authHeaders, ...form.getHeaders() } }
  ).catch((e: { response?: { status?: number; data?: unknown } }) => e.response);

  if (!uploadRes || uploadRes.status !== 200) {
    console.error('Upload FAILED. Meta API response:', JSON.stringify(uploadRes?.data ?? 'No response', null, 2));
    process.exit(1);
  }

  console.log('Flow JSON uploaded successfully.');

  // Step 4: Check validation errors
  const validationRes = await axios.get(
    `${GRAPH_API}/${FLOW_ID}?fields=validation_errors`,
    { headers: authHeaders }
  ).catch(() => null);

  const validationErrors: unknown[] = (validationRes?.data as { validation_errors?: unknown[] })?.validation_errors ?? [];
  if (validationErrors.length > 0) {
    console.error('');
    console.error('=== Flow JSON validation errors ===');
    console.error('Docs: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes/');
    (validationErrors as Array<{ error?: string; message?: string; path?: string; pointers?: Array<{ path?: string; line_start?: number; line_end?: number }> }>).forEach((e, i) => {
      console.error(`[${i + 1}] ${e.error ?? 'ERROR'}: ${e.message ?? ''}`);
      const p = e.pointers?.[0]?.path ?? e.path;
      if (p) console.error(`    path: ${p}`);
      if (e.pointers?.[0]?.line_start != null) console.error(`    lines: ${e.pointers![0].line_start}-${e.pointers![0].line_end ?? e.pointers![0].line_start}`);
      console.error('');
    });
    console.error(JSON.stringify(validationErrors, null, 2));
    console.error('=== End validation errors ===');
    process.exit(1);
  }

  // Step 5: Publish the updated flow
  console.log('No validation errors. Publishing updated flow...');
  await axios.post(
    `${GRAPH_API}/${FLOW_ID}/publish`,
    {},
    { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
  ).catch((e: { response?: { status?: number; data?: unknown } }) => {
    console.error('Publish failed:', JSON.stringify(e.response?.data ?? e, null, 2));
    process.exit(1);
  });

  console.log('');
  console.log('Flow updated and published successfully!');
  console.log(`FLOW_ID=${FLOW_ID}`);
};

run().catch((err: unknown) => {
  const ax = err as { response?: { status?: number; data?: unknown } };
  console.error('Update failed:', ax.response ? JSON.stringify(ax.response.data, null, 2) : err);
  process.exit(1);
});
