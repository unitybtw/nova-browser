// ⚡ Perf: activate the print-media Google Fonts stylesheet once it loads.
// This lives in an external file (not an inline onload="" handler) because the
// production CSP sets script-src 'self' without 'unsafe-inline', which blocks
// inline event handlers — the swap would silently never happen in packaged
// builds, leaving fonts stuck at media="print".
const activate = (link) => { link.media = 'all'; };

document.querySelectorAll('link[rel="stylesheet"][media="print"]').forEach((link) => {
  // The sheet may already be loaded by the time this deferred module runs.
  if (link.sheet) {
    activate(link);
    return;
  }
  link.addEventListener('load', () => activate(link), { once: true });
});
