const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then(engine => {
  console.log(Object.keys(engine));
  console.log(Object.getPrototypeOf(engine));
});
