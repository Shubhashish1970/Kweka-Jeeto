/**
 * Local diagnostic: send a properly signed + encrypted ping to the live endpoint.
 * Usage: APP_SECRET=<your_app_secret> ts-node scripts/test-flow-endpoint.ts
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const APP_SECRET = process.env.APP_SECRET;
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://kweka-jeeto-744226784105.asia-south1.run.app/flow/endpoint';
const PUBLIC_KEY_PATH = path.join(__dirname, '../keys/public_key.pem');

if (!APP_SECRET) {
  console.error('Usage: APP_SECRET=<your_facebook_app_secret> ts-node scripts/test-flow-endpoint.ts');
  process.exit(1);
}

if (!fs.existsSync(PUBLIC_KEY_PATH)) {
  console.error('Public key not found at', PUBLIC_KEY_PATH);
  process.exit(1);
}

const publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');

const run = async () => {
  console.log('Testing flow endpoint:', ENDPOINT_URL);
  console.log('');

  // 1. Generate AES key + IV
  const aesKey = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);

  // 2. Encrypt AES key with RSA public key (OAEP-SHA256)
  const encryptedAesKey = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  );

  // 3. Encrypt ping payload with AES-128-GCM
  const pingPayload = JSON.stringify({ version: '3.0', action: 'ping', flow_token: 'diagnostic_test' });
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
  const encryptedData = Buffer.concat([cipher.update(pingPayload, 'utf-8'), cipher.final(), cipher.getAuthTag()]);

  const body = JSON.stringify({
    encrypted_aes_key: encryptedAesKey.toString('base64'),
    encrypted_flow_data: encryptedData.toString('base64'),
    initial_vector: iv.toString('base64'),
  });

  // 4. Compute HMAC-SHA256 signature using APP_SECRET
  const signature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
  console.log('Signature computed:', signature.slice(0, 20) + '...');

  // 5. Send to endpoint
  try {
    const res = await axios.post(ENDPOINT_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
      },
      responseType: 'text',
    });

    console.log('HTTP Status:', res.status);
    console.log('Response (base64 encrypted):', String(res.data).slice(0, 60) + '...');

    // 6. Decrypt response
    const flipped_iv = Buffer.from([...iv].map(b => ~b));
    const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, flipped_iv);
    const responseBuffer = Buffer.from(res.data as string, 'base64');
    const responseData = responseBuffer.subarray(0, -16);
    const responseTag = responseBuffer.subarray(-16);
    decipher.setAuthTag(responseTag);
    const decrypted = Buffer.concat([decipher.update(responseData), decipher.final()]).toString('utf-8');

    console.log('Decrypted response:', decrypted);
    console.log('');
    console.log('✅ Endpoint is working correctly! You can now publish the flow.');

  } catch (err: unknown) {
    const ax = err as { response?: { status?: number; data?: unknown } };
    if (ax.response) {
      console.error('❌ HTTP', ax.response.status, ':', ax.response.data);
      if (ax.response.status === 432) {
        console.error('→ Signature validation failed. APP_SECRET in Cloud Run does not match what you provided.');
        console.error('  Fix: update APP_SECRET in GitHub Secrets to match your Facebook App → Basic Settings → App Secret');
      } else if (ax.response.status === 421) {
        console.error('→ Decryption failed. FLOW_PRIVATE_KEY in Cloud Run does not match the uploaded public key.');
        console.error('  Fix: re-run generate:keys, upload:public-key, update FLOW_PRIVATE_KEY secret, redeploy.');
      } else if (ax.response.status === 500) {
        console.error('→ Server error. FLOW_PRIVATE_KEY is likely empty in Cloud Run.');
        console.error('  Fix: ensure FLOW_PRIVATE_KEY is in GitHub Secrets and trigger Deploy workflow.');
      }
    } else {
      console.error('❌ Network error:', err);
    }
    process.exit(1);
  }
};

run();
