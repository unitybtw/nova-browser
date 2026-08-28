/**
 * Ed25519 Key Pair Generator for Blocklist Signing
 * 
 * Run this script to generate a new key pair:
 *   npx tsx electron/main/generate-keys.ts
 * 
 * The public key should be embedded in electron/main/blocklist.ts
 * The private key should be kept secure and used to sign the blocklist.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  
  console.log('=== Ed25519 Key Pair Generated ===\n');
  console.log('PUBLIC KEY (embed in blocklist.ts):');
  console.log(publicKeyPem);
  console.log('\nPRIVATE KEY (keep secure, use for signing):');
  console.log(privateKeyPem);
  
  // Save to files for reference
  const keysDir = path.join(__dirname, '..', 'keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(keysDir, 'blocklist-public.pem'), publicKeyPem);
  fs.writeFileSync(path.join(keysDir, 'blocklist-private.pem'), privateKeyPem);
  
  console.log('\nKeys saved to electron/keys/');
  console.log('IMPORTANT: Keep the private key secure! Do not commit it to version control.');
}

generateKeyPair();