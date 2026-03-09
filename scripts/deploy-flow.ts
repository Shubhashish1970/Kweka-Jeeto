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

const run = async () => {
  try {
    const res = await axios.post(
      `${GRAPH_API}/${WABA_ID}/flows`,
      {
        name: 'farmer_registration_poc',
        categories: ['LEAD_GENERATION'],
        flow_json: flowJson,
        publish: true,
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const flowId = res.data?.id;
    if (flowId) {
      console.log('Flow published successfully!');
      console.log(`FLOW_ID=${flowId}`);
    } else {
      console.error('Unexpected response:', res.data);
    }
  } catch (err: unknown) {
    const data = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: unknown } }).response?.data
      : err;
    console.error('Deploy failed:', data);
    process.exit(1);
  }
};

run();
