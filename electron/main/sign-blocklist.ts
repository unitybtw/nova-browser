/**
 * Blocklist Signer
 * 
 * Signs the blocked-domains.json file using the Ed25519 private key.
 * Run this after updating the blocklist:
 *   npx tsx electron/main/sign-blocklist.ts
 * 
 * The signature will be saved as blocked-domains.json.sig
 * This file should be deployed alongside the blocklist.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function signBlocklist() {
  const blocklistPath = path.join(__dirname, '..', 'blocked-domains.json');
  const privateKeyPath = path.join(__dirname, '..', 'keys', 'blocklist-private.pem');
  const signaturePath = path.join(__dirname, '..', 'blocked-domains.json.sig');
  
  // Load blocklist
  if (!fs.existsSync(blocklistPath)) {
    console.error('Blocklist not found at:', blocklistPath);
    process.exit(1);
  }
  
  const blocklistData = fs.readFileSync(blocklistPath, 'utf8');
  
  // Validate JSON
  try {
    JSON.parse(blocklistData);
  } catch (err) {
    console.error('Invalid JSON in blocklist:', err);
    process.exit(1);
  }
  
  // Load private key
  if (!fs.existsSync(privateKeyPath)) {
    console.error('Private key not found at:', privateKeyPath);
    console.error('Run generate-keys.ts first to create keys.');
    process.exit(1);
  }
  
  const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
  
  // Import private key using Web Crypto API
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'Ed25519' },
    false,
    ['sign']
  );
  
  // Sign the blocklist data
  const signature = await crypto.subtle.sign(
    'Ed25519',
    privateKey,
    new TextEncoder().encode(blocklistData)
  );
  
  const signatureB64 = Buffer.from(signature).toString('base64');
  
  // Save signature
  fs.writeFileSync(signaturePath, signatureB64, 'utf8');
  
  console.log('Blocklist signed successfully!');
  console.log('Signature saved to:', signaturePath);
  console.log('Signature (base64):', signatureB64);
  
  // Verify the signature works
  const publicKeyPath = path.join(__dirname, '..', 'keys', 'blocklist-public.pem');
  if (fs.existsSync(publicKeyPath)) {
    const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
    
    const publicKey = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(publicKeyPem),
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    
    const isValid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signature,
      new TextEncoder().encode(blocklistData)
    );
    
    console.log('Verification test:', isValid ? 'PASSED' : 'FAILED');
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '');
  const binary = Buffer.from(b64, 'base64');
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

signBlocklist();