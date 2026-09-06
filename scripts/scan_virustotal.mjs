#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const API_KEY = process.env.VIRUSTOTAL_API_KEY;

if (!API_KEY) {
  console.error('\x1b[31m[ERROR] VIRUSTOTAL_API_KEY is not set.\x1b[0m');
  console.error('Usage: VIRUSTOTAL_API_KEY="<key>" node scripts/scan_virustotal.mjs <file-or-hash>');
  process.exit(1);
}

const target = process.argv[2];
if (!target) {
  console.log('\x1b[33mUsage: node scripts/scan_virustotal.mjs <file-or-hash>\x1b[0m');
  console.log('Testing VirusTotal API connection with configured key...');
  try {
    const res = await fetch('https://www.virustotal.com/api/v3/users/' + API_KEY, {
      headers: { 'x-apikey': API_KEY }
    });
    if (!res.ok) {
      console.error(`\x1b[31mAPI Check Failed (${res.status}): ${await res.text()}\x1b[0m`);
      process.exit(1);
    }
    const data = await res.json();
    console.log('\x1b[32m[SUCCESS] VirusTotal API Key is Valid!\x1b[0m');
    console.log(`User: ${data.data?.attributes?.first_name || ''} (@${data.data?.id})`);
    console.log(`Daily Quota: ${data.data?.attributes?.quotas?.api_requests_daily?.used}/${data.data?.attributes?.quotas?.api_requests_daily?.allowed}`);
    console.log(`Status: ${data.data?.attributes?.status}`);
  } catch (err) {
    console.error('\x1b[31mNetwork error connecting to VirusTotal:\x1b[0m', err.message);
  }
  process.exit(0);
}

// Check if target is a 64-char hex hash
const isHash = /^[a-fA-F0-9]{64}$/.test(target.trim());

async function checkHash(hash) {
  console.log(`\x1b[36mQuerying VirusTotal for SHA-256:\x1b[0m ${hash}`);
  const res = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
    headers: { 'x-apikey': API_KEY }
  });

  if (res.status === 404) {
    console.log('\x1b[33m[NOT FOUND] This file hash has not been analyzed on VirusTotal yet.\x1b[0m');
    return null;
  }

  if (!res.ok) {
    console.error(`\x1b[31m[ERROR] HTTP ${res.status}: ${await res.text()}\x1b[0m`);
    return null;
  }

  const json = await res.json();
  const stats = json.data?.attributes?.last_analysis_stats || {};
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const harmless = stats.harmless || 0;
  const undetected = stats.undetected || 0;
  const total = malicious + suspicious + harmless + undetected;

  console.log('\n================ VIRUSTOTAL REPORT ================');
  if (malicious === 0 && suspicious === 0) {
    console.log(`\x1b[32m[RESULT: CLEAN] 0 / ${total} security vendors detected issues.\x1b[0m`);
  } else {
    console.log(`\x1b[31m[RESULT: DETECTIONS FOUND] ${malicious + suspicious} / ${total} flagged this file.\x1b[0m`);
  }
  console.log(`- Harmless: ${harmless}`);
  console.log(`- Undetected: ${undetected}`);
  console.log(`- Suspicious: ${suspicious}`);
  console.log(`- Malicious: ${malicious}`);
  console.log(`- Permalink: https://www.virustotal.com/gui/file/${hash}`);
  console.log('===================================================\n');
  return json;
}

if (isHash) {
  await checkHash(target.trim());
} else {
  if (!fs.existsSync(target)) {
    console.error(`\x1b[31mFile not found: ${target}\x1b[0m`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(target);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  console.log(`File: ${target}`);
  console.log(`Size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`SHA-256: ${hash}`);

  const report = await checkHash(hash);
  if (!report && fileBuffer.length <= 32 * 1024 * 1024) {
    console.log('\nUploading file to VirusTotal for immediate analysis...');
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), path.basename(target));

    const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: { 'x-apikey': API_KEY },
      body: formData
    });

    if (!uploadRes.ok) {
      console.error(`\x1b[31mUpload failed (${uploadRes.status}): ${await uploadRes.text()}\x1b[0m`);
    } else {
      const uploadJson = await uploadRes.json();
      console.log(`\x1b[32mUpload successful! Analysis ID: ${uploadJson.data?.id}\x1b[0m`);
      console.log(`View live analysis: https://www.virustotal.com/gui/file/${hash}`);
    }
  }
}
