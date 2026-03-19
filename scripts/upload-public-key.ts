/**
 * Upload the RSA public key to Meta for WhatsApp Flows encryption.
 * Must be run once per phone number after generating keys.
 *
 * Usage: npm run upload:public-key
 * Requires: WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env
 */
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

const publicKeyPath = path.join(__dirname, '../keys/public_key.pem');

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.error('Missing required env vars: WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN');
  process.exit(1);
}

if (!fs.existsSync(publicKeyPath)) {
  console.error('Public key not found at', publicKeyPath);
  console.error('Run: npm run generate:keys');
  process.exit(1);
}

const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');

const run = async () => {
  console.log('Uploading public key to Meta for phone number:', PHONE_NUMBER_ID);

  const res = await axios.post(
    `${GRAPH_API}/${PHONE_NUMBER_ID}/whatsapp_business_encryption`,
    { business_public_key: publicKey },
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('Public key uploaded successfully:', JSON.stringify(res.data, null, 2));
  console.log('');
  console.log('WhatsApp Flows encryption is now configured for phone number:', PHONE_NUMBER_ID);
};

run().catch((err: unknown) => {
  const ax = err as { response?: { status?: number; data?: unknown } };
  if (ax.response) {
    console.error('Meta API error:', ax.response.status, JSON.stringify(ax.response.data, null, 2));
  } else {
    console.error('Upload failed:', err);
  }
  process.exit(1);
});
