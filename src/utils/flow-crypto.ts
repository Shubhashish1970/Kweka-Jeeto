/**
 * WhatsApp Flows Encryption/Decryption Utilities
 * Exact port of Meta's official encryption.js from WhatsApp-Flows-Tools.
 *
 * Incoming: RSA-OAEP-SHA256 decrypts AES key → AES-128-GCM decrypts payload
 * Outgoing: Flip IV bits (bitwise NOT) → AES-128-GCM encrypt response
 */
import crypto from 'crypto';

export class FlowEndpointException extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'FlowEndpointException';
    this.statusCode = statusCode;
  }
}

interface DecryptResult {
  decryptedBody: Record<string, unknown>;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
}

export const decryptRequest = (
  body: { encrypted_aes_key: string; encrypted_flow_data: string; initial_vector: string },
  privatePem: string,
  passphrase?: string
): DecryptResult => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase: passphrase || undefined });

  let decryptedAesKey: Buffer;
  try {
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encrypted_aes_key, 'base64')
    );
  } catch (error) {
    console.error(error);
    // HTTP 421: tells WhatsApp to refresh the public key on the client
    throw new FlowEndpointException(
      421,
      'Failed to decrypt the request. Please verify your private key.'
    );
  }

  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const initialVectorBuffer = Buffer.from(initial_vector, 'base64');

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, initialVectorBuffer);
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final(),
  ]).toString('utf-8');

  return {
    decryptedBody: JSON.parse(decryptedJSONString) as Record<string, unknown>,
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
};

export const encryptResponse = (
  response: Record<string, unknown>,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string => {
  // Flip IV bits (bitwise NOT) — exact pattern from Meta's encryption.js
  const flipped_iv: number[] = [];
  for (const pair of initialVectorBuffer.entries()) {
    flipped_iv.push(~pair[1]);
  }

  const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, Buffer.from(flipped_iv));
  return Buffer.concat([
    cipher.update(JSON.stringify(response), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64');
};
