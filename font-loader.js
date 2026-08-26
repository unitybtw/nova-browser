// ⚡ Perf: activate the print-media font stylesheet once it loads. External file
// because the production CSP blocks inline event handlers.
const activate = (link) => { link.media = 'all'; };

document.querySelectorAll('link[rel="stylesheet"][media="print"]').forEach((link) => {
  if (link.sheet) {
    activate(link);
    return;
  }
  link.addEventListener('load', () => activate(link), { once: true });
});
