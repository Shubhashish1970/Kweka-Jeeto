/**
 * List all WhatsApp Flows and show their status + data_api_version.
 * Usage: WHATSAPP_ACCESS_TOKEN=xxx WABA_ID=xxx ts-node scripts/check-flows.ts
 */
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WABA_ID;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!ACCESS_TOKEN || !WABA_ID) {
  console.error('Usage: WHATSAPP_ACCESS_TOKEN=xxx WABA_ID=xxx ts-node scripts/check-flows.ts');
  process.exit(1);
}

const run = async () => {
  const res = await axios.get(
    `${GRAPH_API}/${WABA_ID}/flows?fields=id,name,status,data_api_version,endpoint_uri`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  const flows = (res.data as { data: unknown[] }).data;
  console.log(`Found ${flows.length} flow(s):\n`);
  (flows as Array<Record<string, unknown>>).forEach(f => {
    console.log(`ID: ${f.id}`);
    console.log(`  Name:             ${f.name}`);
    console.log(`  Status:           ${f.status}`);
    console.log(`  data_api_version: ${f.data_api_version ?? '❌ NOT SET'}`);
    console.log(`  endpoint_uri:     ${f.endpoint_uri ?? '(none)'}`);
    console.log('');
  });
};

run().catch(err => {
  const ax = err as { response?: { data?: unknown } };
  console.error(ax.response?.data ?? err);
  process.exit(1);
});
