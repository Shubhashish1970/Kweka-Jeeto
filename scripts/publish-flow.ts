/**
 * Publish a draft WhatsApp Flow by FLOW_ID.
 * Run AFTER the backend endpoint is live and responding to pings.
 *
 * Usage: npm run publish:flow
 * Requires: FLOW_ID and WHATSAPP_ACCESS_TOKEN in env / GitHub Secrets
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FLOW_ID = process.env.FLOW_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!FLOW_ID || !ACCESS_TOKEN) {
  console.error('Missing required env vars: FLOW_ID and WHATSAPP_ACCESS_TOKEN');
  process.exit(1);
}

const run = async () => {
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  console.log(`Publishing flow ${FLOW_ID}...`);
  await axios.post(`${GRAPH_API}/${FLOW_ID}/publish`, {}, { headers });
  console.log('Flow published successfully!');
  console.log(`FLOW_ID=${FLOW_ID}`);
};

run().catch((err: unknown) => {
  const ax = err as { response?: { status?: number; data?: unknown } };
  if (ax.response) {
    console.error('Meta API error:', ax.response.status, JSON.stringify(ax.response.data, null, 2));
  } else {
    console.error('Publish failed:', err);
  }
  process.exit(1);
});
