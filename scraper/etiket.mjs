// BAĞLANTI ETİKETLİ HİKÂYE ZEMİNİ (kullanıcı isteği, 15.11.2026: "etiketi koyabileceğim bir şey, boş olsun, temamız ve logomuz olsun, linki ben koyacağım").
// 1080×1920: logo, başlık, uygulama simgesi; ortada Instagram bağlantı etiketi için BOŞ alan ve üstünde "dokun" ipucu.
// Arkada öne çıkan afişlerin bulanık duvarı (yazı yok, fiyat yok). Çıktı: OUT_DIR/etiket-hikaye.png
import { join } from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { ROOT, log } from "./lib/util.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas/uygulama");
await mkdir(OUT, { recursive: true });
const b64 = async (f) => "data:image/png;base64," + (await readFile(join(ROOT, f))).toString("base64");
const LOGO = await b64("brand/logo.png"), ICON = await b64("icons/icon-512.png");
const PST = (JSON.parse(await readFile(join(ROOT, "data/one-cikan.json"), "utf8")).events || []).map((e) => e.img).filter(Boolean);
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
const WALL = PST.length ? `<div class="wall">${[...Array(30)].map((_, i) => `<i style="background-image:url('${PST[i % PST.length].replace(/'/g, "%27")}')"></i>`).join("")}</div>` : "";

const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@500;600;700;800&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1920px}
body{position:relative;overflow:hidden;background:#0a0a10;color:#fff;font-family:"Inter Tight",Arial,sans-serif;text-align:center}
.wall{position:absolute;inset:-10% -25%;display:grid;grid-template-columns:repeat(6,1fr);gap:24px;transform:rotate(-12deg);opacity:.42;filter:blur(2px) saturate(1.2);-webkit-mask-image:radial-gradient(70% 55% at 50% 40%,transparent 20%,#000 75%);mask-image:radial-gradient(70% 55% at 50% 40%,transparent 20%,#000 75%)}
.wall i{aspect-ratio:2/3;border-radius:18px;background:#1a1726 center/cover}
.veil{position:absolute;inset:0;background:linear-gradient(#0a0a10cc,#0a0a1066 30%,#0a0a1099 60%,#0a0a10f2 88%)}
.glow{position:absolute;inset:0;background:radial-gradient(50% 22% at 50% 30%,#8b5cf650,transparent 70%),radial-gradient(45% 14% at 50% 73%,#8b5cf666,transparent 70%)}
.logo{position:absolute;top:265px;left:0;right:0;display:flex;justify-content:center}.logo img{height:120px}
h1{position:absolute;top:470px;left:0;right:0;font:900 150px/.84 Archivo,"Arial Narrow",Arial,sans-serif;font-stretch:70%;text-transform:uppercase}
h1 em{font-style:normal;color:#a78bfa}
.sub{position:absolute;top:760px;left:120px;right:120px;font:600 36px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffc0}
.app{position:absolute;top:925px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:20px}
.app img{width:190px;height:190px;border-radius:44px;box-shadow:0 0 0 2px #ffffff22,0 30px 70px -20px #000,0 0 90px #8b5cf688}
.app .meta{display:flex;gap:14px}.app .meta span{font:700 24px/1 "Inter Tight",Arial,sans-serif;padding:12px 18px;border-radius:99px;background:#ffffff12;box-shadow:0 0 0 1.5px #ffffff22 inset}
.hint{position:absolute;top:1280px;left:0;right:0;font:900 52px/1 Archivo,Arial,sans-serif;font-stretch:80%;text-transform:uppercase}
.hint small{display:block;margin-top:14px;font:600 28px/1 "Inter Tight",Arial,sans-serif;text-transform:none;color:#c4b5fd}
.arrow{position:absolute;top:1385px;left:50%;width:56px;height:56px;margin-left:-28px;color:#a78bfa}
/* 1450–1600 arası boş: Instagram bağlantı etiketi buraya */
.os{position:absolute;top:1672px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:10px;color:#ffffff99;font:300 22px/1 Poppins}.os svg{width:22px;height:22px;fill:currentColor}.os em{font-style:normal}.os b{font-weight:800}
</style></head><body>${WALL}<div class="veil"></div><div class="glow"></div>
<div class="logo"><img src="${LOGO}" alt="Ne Var Ne Yok"></div>
<h1>Uygulamamız<br><em>çıktı!</em></h1>
<p class="sub">81 ilin konserleri, tiyatroları, stand-up'ları ve sinema seansları tek uygulamada.</p>
<div class="app"><img src="${ICON}" alt=""><div class="meta"><span>Ücretsiz</span><span>Android · iPhone</span><span>81 il</span></div></div>
<div class="hint">Hemen indir<small>Aşağıdaki bağlantıya dokun</small></div>
<svg class="arrow" viewBox="0 0 24 24"><path d="M12 4v15m-6-6 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div>
</body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
await p.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; });
await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, "etiket-hikaye.png") });
await browser.close();
log("Bağlantı etiketli hikâye zemini hazır");
