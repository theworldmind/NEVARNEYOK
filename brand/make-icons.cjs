// Uygulama simgeleri ve og.png: brand/logo.svg + logonun zemini (siyah, ortada mor ışıma, harflerde mor hale).
// Çalıştırma: NODE_PATH=$(npm root -g) node brand/make-icons.cjs  (Playwright gerekir)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const R = path.join(__dirname, ".."), svg = fs.readFileSync(path.join(__dirname, "logo.svg"), "utf8");
const BG = "radial-gradient(52% 36% at 50% 50%,rgba(70,34,160,.95),rgba(38,18,92,.6) 50%,rgba(16,8,40,.3) 75%,transparent 95%),#050409";
const page = (w, h, lw) => `<body style="margin:0"><div style="width:${w}px;height:${h}px;background:${BG};display:grid;place-items:center"><div style="width:${lw}%;filter:drop-shadow(0 0 ${w / 28}px rgba(105,60,240,.7)) drop-shadow(0 ${w / 200}px ${w / 90}px rgba(5,2,20,.6))">${svg.replace("<svg ", '<svg style="width:100%;display:block" ')}</div></div></body>`;
(async () => { const b = await chromium.launch();
  for (const [f, w, h, lw] of [["icon-512.png", 512, 512, 80], ["icon-192.png", 192, 192, 78], ["icon-maskable-512.png", 512, 512, 62], ["apple-touch-icon.png", 180, 180, 76], ["og.png", 1200, 630, 58]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(page(w, h, lw)); await p.screenshot({ path: path.join(R, "icons", f) }); await p.close(); }
  await b.close(); })();
