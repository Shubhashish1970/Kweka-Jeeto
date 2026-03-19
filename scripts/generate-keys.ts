/**
 * Generate RSA key pair for WhatsApp Flows endpoint encryption.
 *
 * Usage: npm run generate:keys
 *
 * Then:
 *  1. Copy the FLOW_PRIVATE_KEY value printed below into GitHub Secrets
 *  2. Run: npm run upload:public-key   (registers the public key with Meta)
 *  3. Set APP_SECRET in GitHub Secrets (from Facebook App → Basic Settings → App Secret)
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const keysDir = path.join(__dirname, '../keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

console.log('Generating 2048-bit RSA key pair...');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privatePath = path.join(keysDir, 'private_key.pem');
const publicPath = path.join(keysDir, 'public_key.pem');

fs.writeFileSync(privatePath, privateKey);
fs.writeFileSync(publicPath, publicKey);

console.log('');
console.log('Keys saved:');
console.log('  Private key:', privatePath);
console.log('  Public key: ', publicPath);
console.log('');
console.log('=== GitHub Secret: FLOW_PRIVATE_KEY ===');
console.log('(Copy this entire value — including BEGIN/END lines — into GitHub Secrets)');
console.log('');
console.log(privateKey.replace(/\n/g, '\\n'));
console.log('');
console.log('=== Public key (for Meta upload) ===');
console.log(publicKey);
console.log('');
console.log('Next steps:');
console.log('  1. Add FLOW_PRIVATE_KEY to GitHub Secrets (value printed above)');
console.log('  2. Run: npm run upload:public-key');
console.log('  3. Add APP_SECRET to GitHub Secrets (Facebook App → Basic Settings → App Secret)');
console.log('  4. Add FLOW_ENDPOINT_URI to GitHub Secrets (= https://<cloud-run-url>/flow/endpoint)');
