// "NASIL KURULUR?" kaydırmalı gönderisi (kullanıcı isteği, 15.11.2026): siteye nasıl gidilir, uygulama Android'de ve iPhone'da nasıl kurulur.
// 4 sayfa, 1080×1350, Apple tanıtımı sadeliğinde; telefonlarda sitenin gerçek ekranları (yerelde açılıp çekilir). Çıktı: OUT_DIR/nasil-1..4.png
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";
import { ROOT, log } from "./lib/util.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas/uygulama");
await mkdir(OUT, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const srv = createServer(async (q, r) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  try { const b = await readFile(join(ROOT, p)); r.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch();

/* 1) gerçek ekranlar: /indir (Android görünümü) ve il çarkı */
const shots = {};
async function shoot(name, path, ua, prep) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 808 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "tr-TR", userAgent: ua });
  await ctx.route(/goatcounter|gc\.zgo/, (r) => r.abort());
  await ctx.addInitScript(() => { try { sessionStorage.setItem("nvny-yonlendi", "1"); } catch {} });
  const p = await ctx.newPage(); await p.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {}); await p.waitForTimeout(1800);
  if (prep) await p.evaluate(prep).catch(() => {}); await p.waitForTimeout(500);
  const f = join(OUT, `_nasil-${name}.png`); await p.screenshot({ path: f }); shots[name] = "data:image/png;base64," + (await readFile(f)).toString("base64"); await ctx.close();
}
const AND = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
await shoot("indir", "indir/", AND);
await shoot("indir-ios", "indir/", IOS, () => { const h = document.getElementById("how"); if (h) scrollTo(0, h.getBoundingClientRect().top + scrollY - 260); });
await shoot("cark", "#/", AND, () => { const wl = document.querySelector("#wl"); if (!wl) return; const li = [...wl.querySelectorAll("li")]; const i = li.findIndex((x) => x.textContent.trim() === "Ankara"); wl.scrollTop = Math.max(0, i) * 52; });

/* 2) sayfalar */
const b64 = async (f) => "data:image/png;base64," + (await readFile(join(ROOT, f))).toString("base64");
const LOGO = await b64("brand/logo.png"), ICON = await b64("icons/icon-512.png");
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
const SB = `<div class="sb"><b>9:41</b><i class="di"></i><span><em class="bat"><i></i></em></span></div>`;
const PHONE = (k, w, x, y, r = 0, z = 1) => `<div class="ph" style="--pw:${w}px;left:${x}px;top:${y}px;transform:rotate(${r}deg);z-index:${z}"><div class="scr">${SB}<img src="${shots[k]}" alt=""></div></div>`;
// iOS'taki paylaş simgesi gibi genel bir çizim (kare ve yukarı ok) ve "ana ekrana ekle" artısı
const SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m-4 4 4-4 4 4"/><path d="M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/></svg>`;
const PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;
const DOTS = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
const DL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg>`;

const CSS = `@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@500;600;700;800&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1350px}
body{position:relative;overflow:hidden;background:#0a0a10;color:#fff;font-family:"Inter Tight",Arial,sans-serif}
.glow{position:absolute;inset:0;background:radial-gradient(55% 30% at 50% 78%,#8b5cf655,transparent 70%),radial-gradient(45% 22% at 15% 0%,#8b5cf630,transparent 70%)}
.top{position:absolute;top:58px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between}.top img{height:44px}
.pg{font:700 22px/1 "Inter Tight",Arial,sans-serif;color:#ffffff80}
.kick{position:absolute;top:150px;left:72px;font:800 24px/1 Archivo,Arial,sans-serif;font-stretch:90%;letter-spacing:.03em;text-transform:uppercase;padding:11px 18px;border-radius:99px;background:#8b5cf6;box-shadow:0 0 40px #8b5cf699}
h1{position:absolute;top:208px;left:72px;right:72px;font:900 108px/.86 Archivo,"Arial Narrow",Arial,sans-serif;font-stretch:70%;text-transform:uppercase}
h1 em{font-style:normal;color:#a78bfa}
.sub{position:absolute;left:72px;right:72px;font:600 30px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffb8}
.ph{position:absolute;aspect-ratio:393/852;border-radius:calc(var(--pw)*.15);padding:calc(var(--pw)*.028);background:linear-gradient(150deg,#3b3550,#14121c 40%,#0b0a10 60%,#2c2740);box-shadow:0 0 0 2px #ffffff22 inset,0 50px 90px -20px #000c,0 0 120px -30px #8b5cf688}
.ph .scr{width:100%;height:100%;border-radius:calc(var(--pw)*.125);overflow:hidden;background:#0a0a10;display:flex;flex-direction:column}
.ph .scr img{width:100%;flex:1;object-fit:cover;object-position:top;display:block}
.sb{height:calc(var(--pw)*.112);flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 9% 0 11%;font:700 calc(var(--pw)*.04)/1 "Inter Tight";position:relative}
.sb .di{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:31%;height:calc(var(--pw)*.083);border-radius:99px;background:#000}
.bat{display:block;width:calc(var(--pw)*.062);height:calc(var(--pw)*.029);border:1.6px solid #ffffff99;border-radius:4px;padding:1.5px}.bat i{display:block;height:100%;width:80%;background:#fff;border-radius:2px}
.steps{position:absolute;left:72px;width:520px;display:flex;flex-direction:column;gap:22px}
.st{display:flex;gap:20px;align-items:flex-start;padding:22px 24px;border-radius:26px;background:linear-gradient(180deg,#ffffff14,#ffffff07);box-shadow:0 0 0 1.5px #ffffff1c inset}
.st .n{flex:none;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#8b5cf6;font:900 28px/1 Archivo,Arial,sans-serif;box-shadow:0 0 30px #8b5cf688}
.st b{display:block;font:800 30px/1.15 "Inter Tight",Arial,sans-serif}.st small{display:block;margin-top:6px;font:600 22px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffa8}
.ico{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#ffffff1c;vertical-align:-10px;margin:0 4px}.ico svg{width:26px;height:26px;color:#fff}
.ico.bl svg{color:#4aa3ff}
.url{display:inline-flex;align-items:center;gap:14px;padding:22px 30px;border-radius:99px;background:#fff;color:#0a0a10;font:900 46px/1 Archivo,Arial,sans-serif;font-stretch:84%;box-shadow:0 0 70px #8b5cf688}
.url i{font-style:normal;color:#8b5cf6}
.note{position:absolute;left:72px;right:72px;display:flex;gap:16px;align-items:center;padding:20px 24px;border-radius:24px;background:#8b5cf61f;box-shadow:0 0 0 1.5px #8b5cf655 inset;font:600 24px/1.35 "Inter Tight",Arial,sans-serif;color:#ffffffd0}
.note b{color:#fff}
.foot{position:absolute;left:72px;right:72px;bottom:48px;display:flex;justify-content:space-between;align-items:center;font:700 22px/1 "Inter Tight",Arial,sans-serif;color:#ffffff80}
.foot .os{display:flex;align-items:center;gap:8px;font:300 20px/1 Poppins}.foot .os svg{width:20px;height:20px;fill:currentColor}.foot .os b{font-weight:800}
.swipe{display:flex;align-items:center;gap:10px;color:#fff}.swipe i{font-style:normal;font-size:28px}
.pills{position:absolute;left:72px;display:flex;gap:12px;flex-wrap:wrap}.pills span{font:700 23px/1 "Inter Tight",Arial,sans-serif;padding:13px 20px;border-radius:99px;background:#ffffff12;box-shadow:0 0 0 1.5px #ffffff22 inset}
.app{position:absolute;display:flex;flex-direction:column;align-items:center;gap:14px}.app img{width:150px;height:150px;border-radius:34px;box-shadow:0 0 0 2px #ffffff22,0 30px 60px -20px #000,0 0 80px #8b5cf688}.app span{font:700 22px/1 "Inter Tight",Arial,sans-serif}`;
const FOOT = (n, last) => `<div class="foot"><span class="os"><span>by</span>${OS}<em style="font-style:normal">one<b>side</b></em></span>${last ? `<span>nevarneyok.net.tr/indir</span>` : `<span class="swipe">${n}/4 · Kaydır <i>→</i></span>`}</div>`;
const page = (n, body) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="glow"></div><div class="top"><img src="${LOGO}" alt="Ne Var Ne Yok"><span class="pg">Nasıl kurulur?</span></div>${body}${FOOT(n, n === 4)}</body></html>`;

const P = [
  page(1, `<div class="kick">Mağaza yok · üyelik yok · ücretsiz</div>
    <h1>UYGULAMAYI<br><em>30 SANİYEDE</em><br>KUR.</h1>
    <p class="sub" style="top:560px;max-width:520px">Android ve iPhone'da çalışır. Siteden kurulur, telefonunda gerçek bir uygulama gibi açılır.</p>
    <div class="pills" style="top:740px"><span>📍 81 il</span><span>🔔 Bildirim</span><span>💸 Fiyat karşılaştırma</span></div>
    ${PHONE("cark", 400, 610, 300, 5, 2)}
    <div class="app" style="left:110px;top:880px"><img src="${ICON}" alt=""><span>Ne Var Ne Yok</span></div>`),
  page(2, `<div class="kick">Adım 1</div>
    <h1>SİTEYE<br><em>GİT.</em></h1>
    <p class="sub" style="top:430px;max-width:540px">Profilimizdeki bağlantıya dokun ya da tarayıcına şunu yaz:</p>
    <div style="position:absolute;left:72px;top:560px"><span class="url">${DL}<span>nevarneyok.net.tr<i>/indir</i></span></span></div>
    <div class="note" style="top:720px;right:520px">📲 <span>Instagram içinde açılırsa endişelenme: seni <b>kendiliğinden</b> Chrome'a ya da Safari'ye geçiriyoruz.</span></div>
    ${PHONE("indir", 400, 610, 300, 4, 2)}`),
  page(3, `<div class="kick">Adım 2 · Android</div>
    <h1>ANDROID'DE<br><em>KUR.</em></h1>
    <div class="steps" style="top:440px">
      <div class="st"><span class="n">1</span><div><b>Chrome'da aç</b><small>nevarneyok.net.tr/indir sayfası açılır.</small></div></div>
      <div class="st"><span class="n">2</span><div><b>"Uygulamayı indir"e dokun</b><small>Mor parlayan büyük düğme.</small></div></div>
      <div class="st"><span class="n">3</span><div><b>"Yükle"yi seç</b><small>Telefon kendi penceresini açar. Olmazsa sağ üstteki <span class="ico">${DOTS}</span> menüden "Uygulamayı yükle".</small></div></div>
    </div>
    ${PHONE("indir", 400, 620, 300, 4, 2)}`),
  page(4, `<div class="kick">Adım 2 · iPhone</div>
    <h1>İPHONE'DA<br><em>KUR.</em></h1>
    <div class="steps" style="top:440px">
      <div class="st"><span class="n">1</span><div><b>Safari'de aç</b><small>nevarneyok.net.tr/indir</small></div></div>
      <div class="st"><span class="n">2</span><div><b>Paylaş <span class="ico bl">${SHARE}</span> simgesine dokun</b><small>Ekranın altında, kare ve yukarı ok.</small></div></div>
      <div class="st"><span class="n">3</span><div><b>"Ana Ekrana Ekle" <span class="ico">${PLUS}</span></b><small>Listede biraz aşağıda olabilir.</small></div></div>
      <div class="st"><span class="n">4</span><div><b>Sağ üstte "Ekle"</b><small>Simge ana ekranında, hazırsın! 🎉</small></div></div>
    </div>
    ${PHONE("indir-ios", 400, 620, 300, 4, 2)}`),
];
const p = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (let i = 0; i < P.length; i++) {
  await p.setContent(P[i], { waitUntil: "networkidle" }); await p.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; }); await p.waitForTimeout(300);
  await p.screenshot({ path: join(OUT, `nasil-${i + 1}.png`) }); log(`nasil-${i + 1}.png`);
}
await browser.close(); srv.close();
