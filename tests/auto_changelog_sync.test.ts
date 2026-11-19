import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  isTrustedReleaseMediaUrl,
  humanizeAssetFilename,
  extractMediaFromMarkdown,
  extractMediaFromReleaseAssets,
  categorizeReleaseLine,
  parseGitHubRelease,
} from '../electron/main/releaseChangelogParser';
import {
  mergeReleases,
  sanitizeReleases,
  subscribeToRefresh,
} from '../src/services/changelogService';
import { CHANGELOG_DATA } from '../src/data/changelog';

console.log('--- Auto Changelog Ingestion & Media Sync Suite ---');

// ---------------------------------------------------------------------------
// 1. URL Trust & Boilerplate Badge Filtering
// ---------------------------------------------------------------------------
{
  assert.equal(
    isTrustedReleaseMediaUrl('https://github.com/user-attachments/assets/abc-123'),
    true,
    'Allows GitHub user-attachment HTTPS assets'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('https://raw.githubusercontent.com/unitybtw/nova-browser/v1.6.0/public/screenshots/preview.png'),
    true,
    'Allows raw.githubusercontent.com screenshots'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/demo.mp4'),
    true,
    'Allows objects.githubusercontent.com release media'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('./screenshots/vertical-clean-light.jpg'),
    true,
    'Allows bundled ./screenshots/ relative path'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('./screenshots/../secret.png'),
    false,
    'Rejects relative path traversal'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('javascript:alert(1)'),
    false,
    'Rejects javascript: URI'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('http://github.com/user-attachments/assets/123'),
    false,
    'Rejects insecure http: URI'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('https://evil.example.com/payload.png'),
    false,
    'Rejects arbitrary external third-party hosts'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('https://img.shields.io/badge/build-passing-green.svg'),
    false,
    'Rejects shields.io badges'
  );
  assert.equal(
    isTrustedReleaseMediaUrl('https://github.com/unitybtw/nova-browser/actions/workflows/ci.yml/badge.svg'),
    false,
    'Rejects GitHub workflow SVG badges'
  );
  console.log('[PASS] URL trust policy & badge filtering verified');
}

// ---------------------------------------------------------------------------
// 2. Markdown, HTML & Asset Media Extraction
// ---------------------------------------------------------------------------
{
  const markdownBody = [
    'Introducing Native Command Dock and refreshed internal workflows across macOS and Windows.',
    '',
    '![Main Workspace Preview](https://github.com/user-attachments/assets/workspace-01 "Updated sidebar and minimal chrome")',
    '<img alt="MCP Inspector" src="https://raw.githubusercontent.com/unitybtw/nova-browser/v1.6.0/public/screenshots/mcp.png" width="800" />',
    '<video src="https://github.com/user-attachments/assets/demo-tour.mp4" title="Walkthrough Demo"></video>',
    '![Build Status](https://img.shields.io/badge/test-pass-brightgreen)',
    '![Untrusted](https://tracker.evil.site/pixel.png)',
    '',
    '```bash',
    '![ignored-in-codeblock](https://raw.githubusercontent.com/unitybtw/nova-browser/v1.6.0/public/screenshots/ignored.png)',
    '```',
  ].join('\n');

  const extracted = extractMediaFromMarkdown(markdownBody, 'Nova v1.6.0');
  assert.equal(extracted.length, 3, 'Extracts markdown image, HTML img, and video while ignoring code blocks & unsafe URLs');
  assert.equal(extracted[0].title, 'Main Workspace Preview');
  assert.equal(extracted[0].caption, 'Updated sidebar and minimal chrome');
  assert.equal(extracted[1].title, 'MCP Inspector');
  assert.equal(extracted[2].kind, 'video');
  assert.equal(extracted[2].title, 'Walkthrough Demo');

  assert.equal(humanizeAssetFilename('01-live-design-studio.png'), 'Live Design Studio');
  assert.equal(humanizeAssetFilename('02_mcp_ai_panel.mp4'), 'MCP AI Panel');

  const assetMedia = extractMediaFromReleaseAssets([
    {
      name: 'Nova-Browser-1.6.0.dmg',
      browser_download_url: 'https://github.com/unitybtw/nova-browser/releases/download/v1.6.0/Nova.dmg',
      content_type: 'application/x-apple-diskimage',
    },
    {
      name: '01-live-design-studio.png',
      browser_download_url: 'https://github.com/unitybtw/nova-browser/releases/download/v1.6.0/01-live-design-studio.png',
      content_type: 'image/png',
    },
    {
      name: '02-tab-motion-demo.mp4',
      browser_download_url: 'https://github.com/unitybtw/nova-browser/releases/download/v1.6.0/02-tab-motion-demo.mp4',
      content_type: 'video/mp4',
    },
  ]);
  assert.equal(assetMedia.length, 2, 'Skips installer dmg and extracts screenshot + demo video from release assets');
  assert.equal(assetMedia[0].title, 'Live Design Studio');
  assert.equal(assetMedia[0].kind, 'image');
  assert.equal(assetMedia[1].title, 'Tab Motion Demo');
  assert.equal(assetMedia[1].kind, 'video');
  console.log('[PASS] Markdown, HTML, asset extraction & filename humanization verified');
}

// ---------------------------------------------------------------------------
// 3. Full Release Parsing, Boilerplate Stripping & Thematic Synthesis
// ---------------------------------------------------------------------------
{
  const parsed = parseGitHubRelease({
    tag_name: 'v1.6.0',
    name: 'Nova Browser v1.6.0 — Editorial Sync',
    published_at: '2026-12-01T10:00:00Z',
    body: [
      'Faster startup, quieter typography, and automatic release media ingestion across all platforms.',
      '',
      '![Hero](https://github.com/user-attachments/assets/hero-shot-160)',
      '',
      '## Highlights',
      '- Redesigned Settings and Changelog views in crisp monochrome.',
      '- Automated release screenshot extraction for every tagged build.',
      '',
      '## What\'s Changed',
      '- feat(ui): add spring motion ledger for release transitions by @unitybtw in https://github.com/unitybtw/nova-browser/pull/42',
      '- perf(startup): preload critical bundles for instant paint by @unitybtw in https://github.com/unitybtw/nova-browser/pull/43',
      '- fix(csp): allow trusted GitHub asset media playback (#44)',
      '',
      '## SHA-256 Checksums',
      '```text',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  Nova-1.6.0.dmg',
      '```',
      '**Full Changelog**: https://github.com/unitybtw/nova-browser/compare/v1.5.2...v1.6.0',
    ].join('\n'),
    assets: [
      {
        name: '02-settings-overhaul.png',
        browser_download_url: 'https://github.com/unitybtw/nova-browser/releases/download/v1.6.0/02-settings-overhaul.png',
        content_type: 'image/png',
      },
    ],
  });

  assert.ok(parsed, 'Valid release parses non-null');
  assert.equal(parsed.version, '1.6.0');
  assert.equal(parsed.lede, 'Faster startup, quieter typography, and automatic release media ingestion across all platforms.');
  assert.equal(parsed.hero?.src, 'https://github.com/user-attachments/assets/hero-shot-160');
  assert.equal(parsed.mediaGallery?.length, 2, 'Combines markdown hero screenshot + uploaded asset screenshot without duplicates');
  assert.equal(parsed.highlights.length, 2);
  assert.equal(parsed.changes.length, 3);
  assert.equal(parsed.changes[0].category, 'feature');
  assert.ok(!parsed.changes[0].text.includes('by @unitybtw'), 'Strips PR attribution tail');
  assert.ok(
    !parsed.changes.some((c) => c.text.includes('aaaaaa') || c.text.includes('Full Changelog')),
    'Excludes SHA-256 checksum codeblocks and compare footers from changes'
  );
  assert.ok(parsed.sections && parsed.sections.length >= 1, 'Synthesizes clean overview chapter when body only has Highlights + What\'s Changed');

  // Compare commits fallback test
  const commitParsed = parseGitHubRelease(
    {
      tag_name: 'v1.6.1',
      name: 'Nova Browser v1.6.1',
      published_at: '2026-12-05T10:00:00Z',
      body: 'Maintenance release hardening sync concurrency.',
    },
    {
      commits: [
        { commit: { message: 'perf(ipc): batch tab title updates' } },
        { commit: { message: 'perf(cache): tighten image eviction window' } },
        { commit: { message: 'security(csp): tighten preload boundary' } },
        { commit: { message: 'Merge pull request #99 from unitybtw/main' } },
      ],
    }
  );
  assert.ok(commitParsed);
  assert.equal(commitParsed.changes.length, 3, 'Drops Merge commit noise');
  assert.equal(commitParsed.sections?.[0]?.eyebrow, 'Performance', 'Synthesizes Performance chapter when >= 2 perf commits exist');

  // Test categorize helper directly
  assert.equal(categorizeReleaseLine('sec(crypto): harden vault lock')?.category, 'security');
  console.log('[PASS] GitHub release parser, commit fallback & thematic synthesis verified');
}

// ---------------------------------------------------------------------------
// 4. Renderer Service Preservation, Sanitization & Live IPC Push
// ---------------------------------------------------------------------------
{
  const remotePayload = [
    {
      version: '1.6.0',
      date: 'December 2026',
      title: 'Automatic Release Sync & Swiss Ledger',
      lede: 'Automatically ingests remote descriptions and screenshots on update detection.',
      hero: {
        src: 'https://github.com/user-attachments/assets/hero-160',
        alt: 'Nova v1.6.0',
        kind: 'image',
        title: 'Release Journal',
      },
      mediaGallery: [
        {
          src: 'https://github.com/user-attachments/assets/hero-160',
          alt: 'Nova v1.6.0',
          kind: 'image',
          title: 'Release Journal',
        },
        {
          src: 'https://evil.tracker.example/x.png',
          alt: 'Untrusted',
          kind: 'image',
          title: 'Blocked',
        },
      ],
      sections: [
        {
          eyebrow: 'Automation',
          title: 'Zero-touch release ingestion',
          body: 'Fetches markdown chapters and screenshots dynamically.',
          points: ['Preserves sections', 'Sanitizes remote image hosts'],
        },
      ],
      highlights: ['Zero-touch changelog sync'],
      changes: [
        { category: 'feature', text: 'Added automatic remote media ingestion' },
      ],
    },
  ];

  const merged = sanitizeReleases(mergeReleases(remotePayload, CHANGELOG_DATA));
  assert.equal(merged[0].version, '1.6.0', 'Sorts incoming remote version ahead of bundled 1.5.2');
  assert.equal(merged[0].lede, 'Automatically ingests remote descriptions and screenshots on update detection.');
  assert.equal(merged[0].hero?.src, 'https://github.com/user-attachments/assets/hero-160');
  assert.equal(merged[0].mediaGallery?.length, 1, 'Filters out untrusted third-party image URL inside mediaGallery');
  assert.equal(merged[0].sections?.length, 1, 'Preserves remote editorial chapters');

  // Verify subscribeToRefresh attaches to electronAPI.onChangelogReleasesUpdated and pushes updates live
  const store = new Map<string, string>();
  const mockListeners = new Map<string, Set<Function>>();
  let pushCb: ((event: any, releases: any[]) => void) | null = null;

  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
  (globalThis as any).CustomEvent = class {
    type: string;
    detail: any;
    constructor(type: string, init: { detail?: any } = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  (globalThis as any).window = {
    electronAPI: {
      onChangelogReleasesUpdated: (cb: (event: any, releases: any[]) => void) => {
        pushCb = cb;
        return () => {
          if (pushCb === cb) pushCb = null;
        };
      },
    },
    addEventListener: (type: string, fn: Function) => {
      if (!mockListeners.has(type)) mockListeners.set(type, new Set());
      mockListeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      mockListeners.get(type)?.delete(fn);
    },
    dispatchEvent: (ev: any) => {
      mockListeners.get(ev.type)?.forEach((fn) => fn(ev));
      return true;
    },
  };

  let receivedLiveVersion = '';
  const unsubscribe = subscribeToRefresh((res) => {
    receivedLiveVersion = res.releases[0]?.version || '';
  });
  assert.ok(pushCb, 'subscribeToRefresh attaches onChangelogReleasesUpdated listener');
  pushCb!(null, remotePayload);
  assert.equal(receivedLiveVersion, '1.6.0', 'Pushed release updates subscribed ChangelogPage immediately');
  assert.ok(store.has('nova_dynamic_changelog_cache_v3'), 'Persists pushed release into v3 cache');
  unsubscribe();
  assert.equal(pushCb, null, 'Unsubscribing last listener detaches IPC listener cleanly');
  console.log('[PASS] Renderer changelogService preservation, URL guard & live IPC push verified');
}

// ---------------------------------------------------------------------------
// 5. Release Manifest Generator CLI Check
// ---------------------------------------------------------------------------
{
  const outPath = path.join(os.tmpdir(), `test-nova-manifest-${process.pid}.json`);
  try {
    execFileSync(
      process.execPath,
      [path.resolve('scripts/generate-release-manifest.mjs'), '--tag', 'v1.5.3', '--out', outPath],
      { stdio: 'pipe' }
    );
    const manifest = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    assert.equal(manifest.version, '1.5.3');
    assert.ok(manifest.lede && manifest.lede.length > 20, 'Generated manifest includes curated lede');
    assert.ok(
      manifest.hero?.src?.startsWith('https://raw.githubusercontent.com/unitybtw/nova-browser/v1.5.3/public/'),
      'Rewrites relative ./screenshots path to raw.githubusercontent.com tag URL'
    );
    assert.ok(Array.isArray(manifest.mediaGallery) && manifest.mediaGallery.length >= 2);
    assert.ok(Array.isArray(manifest.sections) && manifest.sections.length >= 1);
    assert.ok(Array.isArray(manifest.changes) && manifest.changes.length >= 1);
    console.log('[PASS] generate-release-manifest.mjs output verified');
  } finally {
    fs.rmSync(outPath, { force: true });
  }
}

console.log('\nALL Auto Changelog Sync tests passed!\n');
