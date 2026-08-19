// Renders og-source.html to og-image.png at exactly 1200x630 — the size the
// social card scrapers expect, and the size declared in the page's meta tags.
//
//   npx electron scripts/build-og.js
//
// Electron rather than a screenshot tool because it gives an exact pixel size
// with no window chrome, and renders the same webfonts the site itself uses.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const W = 1200;
const H = 630;
const SRC = path.join(__dirname, 'og-source.html');
const OUT = path.join(__dirname, '..', 'og-image.png');

app.disableHardwareAcceleration();

// capturePage renders at the display's scale factor, so on a machine running
// at 150% this silently produces an 1800x945 file — which no longer matches the
// og:image:width the page declares. Pin it.
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: W,
    height: H,
    show: false,
    frame: false,
    useContentSize: true,
    backgroundColor: '#0a0a0a',
    webPreferences: { offscreen: false },
  });

  await win.loadFile(SRC);

  // The webfonts arrive over the network; capturing before they land renders
  // the whole card in a fallback face.
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await new Promise(r => setTimeout(r, 600));

  const image = await win.webContents.capturePage();
  const png = image.toPNG();
  fs.writeFileSync(OUT, png);

  const size = image.getSize();
  console.log(`RESULT wrote ${path.basename(OUT)} — ${size.width}x${size.height}, ${(png.length / 1024).toFixed(0)}KB`);
  app.exit(size.width === W && size.height === H ? 0 : 1);
});
