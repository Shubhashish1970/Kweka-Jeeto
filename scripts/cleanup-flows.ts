/**
 * Cleanup old WhatsApp Flows — keep only the latest PUBLISHED flow with
 * data_api_version set and the correct endpoint_uri. Delete all DRAFTs,
 * deprecate old PUBLISHED flows.
 *
 * Usage: WHATSAPP_ACCESS_TOKEN=xxx WABA_ID=xxx ts-node scripts/cleanup-flows.ts
 * Prints the FLOW_ID to keep at the end.
 */
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WABA_ID;
const ENDPOINT_URI = process.env.FLOW_ENDPOINT_URI || process.env.VITE_API_URL
  ? `${process.env.VITE_API_URL}/flow/endpoint`
  : '';
const GRAPH_API = 'https://graph.facebook.com/v21.0';

if (!ACCESS_TOKEN || !WABA_ID) {
  console.error('Usage: WHATSAPP_ACCESS_TOKEN=xxx WABA_ID=xxx ts-node scripts/cleanup-flows.ts');
  process.exit(1);
}

interface Flow {
  id: string;
  name: string;
  status: string;
  data_api_version?: string;
  endpoint_uri?: string;
}

const headers = { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
const safe = (p: Promise<unknown>) => p.catch((e: { response?: { data?: unknown } }) => {
  console.warn('  ⚠ ', e.response?.data ?? e);
});

const run = async () => {
  const res = await axios.get(
    `${GRAPH_API}/${WABA_ID}/flows?fields=id,name,status,data_api_version,endpoint_uri`,
    { headers }
  );
  const flows: Flow[] = (res.data as { data: Flow[] }).data;
  console.log(`Found ${flows.length} flow(s)\n`);

  // The flow to keep: PUBLISHED + has data_api_version + has endpoint_uri
  const toKeep = flows.find(
    f => f.status === 'PUBLISHED' && f.data_api_version && f.endpoint_uri
  );

  if (!toKeep) {
    console.error('No suitable PUBLISHED flow with data_api_version + endpoint_uri found. Run Deploy Flow first.');
    process.exit(1);
  }

  console.log(`✅ Keeping: ${toKeep.id} (${toKeep.name}) — PUBLISHED, data_api_version: ${toKeep.data_api_version}`);
  console.log('');

  for (const flow of flows) {
    if (flow.id === toKeep.id) continue;

    if (flow.status === 'DRAFT') {
      console.log(`🗑  Deleting DRAFT: ${flow.id} (${flow.name})`);
      await safe(axios.delete(`${GRAPH_API}/${flow.id}`, { headers }));
    } else if (flow.status === 'PUBLISHED') {
      console.log(`⛔ Deprecating old PUBLISHED: ${flow.id} (${flow.name})`);
      await safe(axios.post(`${GRAPH_API}/${flow.id}/deprecate`, {}, { headers }));
    }
  }

  console.log('');
  console.log('=========================================');
  console.log(`FLOW_ID to use: ${toKeep.id}`);
  console.log('Update this in GitHub Secrets → FLOW_ID');
  console.log('=========================================');

  // Write flow_id file so the workflow can output it
  fs.writeFileSync(path.join(__dirname, '../.flow_id'), toKeep.id, 'utf-8');
};

run().catch(err => {
  const ax = err as { response?: { data?: unknown } };
  console.error(ax.response?.data ?? err);
  process.exit(1);
});
