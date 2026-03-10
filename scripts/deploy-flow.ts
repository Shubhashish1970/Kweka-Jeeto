import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WABA_ID = process.env.WABA_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!WABA_ID || !ACCESS_TOKEN) {
  console.error('Missing WABA_ID or WHATSAPP_ACCESS_TOKEN');
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
`;

const isMetaPermissionError = (data: unknown): boolean => {
  const d = data as { error?: { code?: number; error_subcode?: number } };
  return d?.error?.code === 100 && d?.error?.error_subcode === 33;
};

const run = async () => {
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Preflight: verify we can access the WABA (avoids confusing error on POST)
    const preflight = await axios.get(`${GRAPH_API}/${WABA_ID}`, { headers }).catch((e: { response?: { status?: number; data?: unknown } }) => e.response);
    if (!preflight || preflight.status !== 200) {
      const data = preflight?.data;
      console.error('Cannot access WhatsApp Business Account. Meta API response:', JSON.stringify(data ?? 'No response', null, 2));
      if (data && isMetaPermissionError(data)) {
        console.error(WABA_HELP);
      }
      process.exit(1);
    }
    console.log('WABA access OK, creating flow...');

    const res = await axios.post(
      `${GRAPH_API}/${WABA_ID}/flows`,
      {
        name: 'farmer_registration_poc',
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
