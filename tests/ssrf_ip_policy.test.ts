import { isPrivateIP } from '../electron/main/ipAddress';

const blocked = [
  '0.0.0.0',
  '10.0.0.1',
  '100.64.0.1',
  '127.0.0.1',
  '169.254.169.254',
  '172.16.0.1',
  '192.0.0.1',
  '192.0.2.10',
  '192.168.1.1',
  '198.18.0.1',
  '198.51.100.10',
  '203.0.113.10',
  '224.0.0.1',
  '::',
  '::1',
  '::ffff:127.0.0.1',
  '::ffff:192.168.1.1',
  'fc00::1',
  'fe80::1',
  'ff02::1',
  '2001:db8::1',
  'not-an-ip'
];

const allowed = ['8.8.8.8', '1.1.1.1', '2001:4860:4860::8888'];

for (const ip of blocked) {
  if (!isPrivateIP(ip)) throw new Error(`Expected SSRF IP policy to block ${ip}`);
}
for (const ip of allowed) {
  if (isPrivateIP(ip)) throw new Error(`Expected SSRF IP policy to allow public address ${ip}`);
}

console.log(`[PASS] [SSRF-IP-Policy] Blocked ${blocked.length} private/reserved/malformed addresses and allowed ${allowed.length} public addresses.`);
