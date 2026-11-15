// Uygulama simgeleri ve og.png: brand/logo.svg + logonun zemini (siyah, ortada mor ışıma, harflerde mor hale).
// Çalıştırma: NODE_PATH=$(npm root -g) node brand/make-icons.cjs  (Playwright gerekir)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const R = path.join(__dirname, ".."), svg = fs.readFileSync(path.join(__dirname, "logo.svg"), "utf8"), mark = fs.readFileSync(path.join(__dirname, "mark.svg"), "utf8");
const BG = "#0a0a10"; // düz koyu zemin (yeni logo)
const page = (w, h, lw, g) => `<body style="margin:0"><div style="width:${w}px;height:${h}px;background:${BG};display:grid;place-items:center"><div style="width:${lw}%">${(g || svg).replace("<svg ", '<svg style="width:100%;display:block" ')}</div></div></body>`;
(async () => { const b = await chromium.launch();
  // uygulama simgeleri: yalnızca büyüteç (brand/nevarneyok-simge.png); paylaşım görseli: tam logo
  for (const [f, w, h, lw, g] of [["icon-512.png", 512, 512, 56, mark], ["icon-192.png", 192, 192, 58, mark], ["icon-maskable-512.png", 512, 512, 46, mark], ["apple-touch-icon.png", 180, 180, 58, mark], ["og.png", 1200, 630, 56]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(page(w, h, lw, g)); await p.screenshot({ path: path.join(R, "icons", f) }); await p.close(); }
  await b.close(); })();
