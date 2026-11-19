#!/usr/bin/env node
/**
 * Generates `changelog-media.json` for a tagged GitHub Release so Nova Browser clients
 * automatically ingest structured release descriptions, chapters, and GitHub-hosted
 * screenshots/videos as soon as a new release goes live.
 *
 * Usage:
 *   node scripts/generate-release-manifest.mjs --tag v1.5.3 --out release-assets/changelog-media.json
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const REPO_RAW_BASE = 'https://raw.githubusercontent.com/unitybtw/nova-browser';

function parseArgs(argv) {
  const opts = { tag: '', out: 'release-assets/changelog-media.json' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tag' && argv[i + 1]) opts.tag = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) opts.out = argv[++i];
  }
  return opts;
}

function toRawGitHubUrl(tag, relativePublicPath) {
  const cleanRel = relativePublicPath.replace(/^\.\//, '');
  const cleanPath = cleanRel.startsWith('public/') ? cleanRel : `public/${cleanRel}`;
  return `${REPO_RAW_BASE}/${encodeURIComponent(tag)}/${cleanPath}`;
}

function rewriteMediaForTag(tag, media) {
  if (!media || typeof media.src !== 'string') return media;
  const next = { ...media };
  if (next.src.startsWith('./')) next.src = toRawGitHubUrl(tag, next.src);
  if (typeof next.poster === 'string' && next.poster.startsWith('./')) {
    next.poster = toRawGitHubUrl(tag, next.poster);
  }
  if (typeof next.captions === 'string' && next.captions.startsWith('./')) {
    next.captions = toRawGitHubUrl(tag, next.captions);
  }
  return next;
}

function loadCuratedRelease(version) {
  try {
    const esbuild = require('esbuild');
    const outFile = path.join(os.tmpdir(), `nova-changelog-data-${process.pid}.cjs`);
    esbuild.buildSync({
      entryPoints: [path.resolve('src/data/changelog.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: outFile,
      logLevel: 'silent',
    });
    const mod = require(outFile);
    fs.rmSync(outFile, { force: true });
    const list = Array.isArray(mod?.CHANGELOG_DATA) ? mod.CHANGELOG_DATA : [];
    return list.find((r) => String(r.version) === String(version)) || null;
  } catch {
    return null;
  }
}

function readGitCommitSubjects(tag) {
  try {
    const tagsRaw = execFileSync('git', ['tag', '--sort=-v:refname'], { encoding: 'utf8' });
    const tags = tagsRaw.split('\n').map((t) => t.trim()).filter(Boolean);
    const prevTag = tags.find((t) => t !== tag);
    const range = prevTag ? `${prevTag}..HEAD` : '-n 15';
    const args = prevTag ? ['log', range, '--pretty=format:%s'] : ['log', '-n', '15', '--pretty=format:%s'];
    const logOut = execFileSync('git', args, { encoding: 'utf8' });
    return logOut
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('Merge ') && !s.startsWith('release:'));
  } catch {
    return [];
  }
}

function categorizeSubject(msg) {
  const match = msg.match(/^([a-z]+)(?:\(([^)]+)\))?:\s*(.+)$/i);
  if (match) {
    const type = match[1].toLowerCase();
    const scope = match[2] ? `[${match[2]}] ` : '';
    const text = scope + match[3].charAt(0).toUpperCase() + match[3].slice(1);
    let category = 'improvement';
    if (type === 'feat' || type === 'feature') category = 'feature';
    else if (type === 'fix' || type === 'bugfix') category = 'fix';
    else if (type === 'perf' || type === 'performance') category = 'performance';
    else if (type === 'security' || type === 'sec' || scope.toLowerCase().includes('security')) category = 'security';
    return { category, text };
  }
  return { category: 'improvement', text: msg.charAt(0).toUpperCase() + msg.slice(1) };
}

function discoverPublicMedia(tag) {
  const screenshotDir = path.resolve('public/screenshots');
  const preferredOrder = [
    'vertical-clean-light.jpg',
    'horizontal-newtab.png',
    'horizontal-clean-light.jpg',
    'preview.png',
    'horizontal-preview.png',
  ];
  const mediaGallery = [];
  if (!fs.existsSync(screenshotDir)) return mediaGallery;

  const files = fs
    .readdirSync(screenshotDir)
    .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
    .sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    })
    .slice(0, 4);

  for (const file of files) {
    const label = file
      .replace(/\.[a-z0-9]+$/i, '')
      .split(/[-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    mediaGallery.push({
      src: toRawGitHubUrl(tag, `./screenshots/${file}`),
      kind: 'image',
      title: label,
      alt: `Nova Browser ${tag} — ${label}`,
    });
  }
  return mediaGallery;
}

function main() {
  const { tag: rawTag, out } = parseArgs(process.argv.slice(2));
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  const tag = (rawTag || `v${pkg.version}`).trim();
  const version = tag.replace(/^v/i, '');
  const nowDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const curated = loadCuratedRelease(version);
  let manifest;

  if (curated) {
    manifest = {
      version: curated.version,
      date: curated.date || nowDate,
      title: curated.title,
      badge: curated.badge || 'New Release',
      lede: curated.lede,
      hero: curated.hero ? rewriteMediaForTag(tag, curated.hero) : undefined,
      mediaGallery: Array.isArray(curated.mediaGallery)
        ? curated.mediaGallery.map((m) => rewriteMediaForTag(tag, m))
        : undefined,
      highlights: curated.highlights,
      sections: Array.isArray(curated.sections)
        ? curated.sections.map((s) => ({
            ...s,
            ...(s.media ? { media: rewriteMediaForTag(tag, s.media) } : {}),
          }))
        : undefined,
      changes: curated.changes,
    };
  } else {
    const subjects = readGitCommitSubjects(tag);
    const changes =
      subjects.length > 0
        ? subjects.slice(0, 20).map(categorizeSubject)
        : [{ category: 'improvement', text: 'Stability, security, and performance updates.' }];
    const mediaGallery = discoverPublicMedia(tag);
    manifest = {
      version,
      date: nowDate,
      title: `Nova Browser ${tag}`,
      badge: 'New Release',
      lede: `Automated release notes and visual previews for Nova Browser v${version}.`,
      ...(mediaGallery[0] ? { hero: mediaGallery[0] } : {}),
      ...(mediaGallery.length > 0 ? { mediaGallery } : {}),
      highlights: changes.slice(0, 4).map((c) => c.text),
      changes,
    };
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[generate-release-manifest] Wrote ${out} for v${version}`);
}

main();
