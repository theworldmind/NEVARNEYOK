// TEKLİ GÖNDERİLER VE HİKÂYELER (kullanıcı isteği, 15.11.2026 18:48: "genel birkaç tek gönderi ve hikâyelikler"), "nasıl kurulur" ile aynı dil;
// eski başlık: "NASIL KURULUR + UYGULAMANIN İÇİ" (kullanıcı isteği, 15.11.2026 18:32:
// "bio'daki linkten nereden kurulduğunu anlat, uygulama içi tanıtım da yap; Apple kalitesi, cam, bulanık, afişler").
// 6 sayfa, 1080×1350. Arka planda öne çıkan afişlerin bulanık duvarı, üstünde buzlu cam kartlar; telefonlarda sitenin gerçek ekranları.
// Afişler kaynağından gösterilir, değiştirilmez; fiyat yalnızca uygulamanın kendi ekranında (doğrulanmış) görünür. Çıktı: OUT_DIR/nasil-1..6.png
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

/* 1) gerçek ekranlar */
const shots = {};
const AND = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
async function shoot(name, path, { ua = IOS, app = false, prep, wait = 1800 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 808 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "tr-TR", timezoneId: "Europe/Istanbul", userAgent: ua });
  await ctx.route(/goatcounter|gc\.zgo/, (r) => r.abort());
  await ctx.addInitScript((app) => { try { sessionStorage.setItem("nvny-yonlendi", "1"); for (const k of ["nvny-hosgeldin", "nvny-hosgeldin-sor", "nvny-nask-x", "nvny-nask-f"]) localStorage.setItem(k, "1"); localStorage.setItem("nvny-city", "ankara"); if (app) Object.defineProperty(navigator, "standalone", { get: () => true }); } catch {} }, app);
  const p = await ctx.newPage(); await p.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {}); await p.waitForTimeout(wait);
  if (prep) { const to = await p.evaluate(prep).catch(() => null); if (typeof to === "string") { await p.goto(BASE + to, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {}); await p.waitForTimeout(1500); await p.evaluate(() => { const c = document.querySelector(".pcx"); if (c) scrollTo(0, c.getBoundingClientRect().top + scrollY - 250); }).catch(() => {}); } }
  await p.evaluate(() => document.querySelectorAll(".ph img.p").forEach((i) => { if (i.complete && i.naturalWidth) i.parentNode.classList.add("ok"); })).catch(() => {});
  await p.waitForTimeout(700);
  const f = join(OUT, `_tekli-${name}.png`); await p.screenshot({ path: f }); shots[name] = "data:image/png;base64," + (await readFile(f)).toString("base64"); await ctx.close();
}
await shoot("indir", "indir/", { ua: AND });
await shoot("indir-ios", "indir/", { prep: () => { const h = document.getElementById("how"); if (h) scrollTo(0, h.getBoundingClientRect().top + scrollY - 260); } });
await shoot("cark", "#/", { app: true, prep: () => { const wl = document.querySelector("#wl"); if (!wl) return; const i = [...wl.querySelectorAll("li")].findIndex((x) => x.textContent.trim() === "İstanbul"); wl.scrollTop = Math.max(0, i) * 52; } });
await shoot("sehir", "#/istanbul", { app: true, wait: 4000 });
await shoot("sinema", "#/istanbul/sinema", { app: true, wait: 3500 });
await shoot("fiyat", "#/ankara", { app: true, wait: 3000, prep: () => { const L = (typeof DATA !== "undefined" ? DATA.events : []).filter((e) => e.img && e.tickets.filter((x) => x.price).length > 1); L.sort((a, b) => { const d = (e) => { const p = e.tickets.filter((x) => x.price).map((x) => x.price); return Math.max(...p) - Math.min(...p); }; return d(b) - d(a); }); return L[0] ? `#/ankara/e/${encodeURIComponent(L[0].slug)}` : null; } });

/* 2) tasarım */
const b64 = async (f) => "data:image/png;base64," + (await readFile(join(ROOT, f))).toString("base64");
const LOGO = await b64("brand/logo.png"), ICON = await b64("icons/icon-512.png");
const PST = (JSON.parse(await readFile(join(ROOT, "data/one-cikan.json"), "utf8")).events || []).map((e) => e.img).filter(Boolean);
const WALL = (o = .55) => PST.length ? `<div class="wall" style="opacity:${o}">${[...Array(28)].map((_, i) => `<i style="background-image:url('${PST[(i * 5) % PST.length].replace(/'/g, "%27")}')"></i>`).join("")}</div><div class="veil"></div>` : "";
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
const SB = `<div class="sb"><b>9:41</b><i class="di"></i><span><em class="bat"><i></i></em></span></div>`;
const PHONE = (k, w, x, y, r = 0, z = 2) => shots[k] ? `<div class="ph" style="--pw:${w}px;left:${x}px;top:${y}px;transform:rotate(${r}deg);z-index:${z}"><div class="scr">${SB}<img src="${shots[k]}" alt=""></div></div>` : "";
const SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m-4 4 4-4 4 4"/><path d="M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/></svg>`;
const PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;
const DL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg>`;
const LINK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>`;
const TAP = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="26" cy="22" r="16" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><circle cx="26" cy="22" r="9" fill="#fff" fill-opacity=".25"/><path d="M24 22v20l-5-4c-2-1.5-4.5 1-3 3l9 10c1.6 1.8 3.9 3 6.3 3H40c4.4 0 8-3.6 8-8V33c0-1.7-1.3-3-3-3s-3 1.3-3 3v-2c0-1.7-1.3-3-3-3s-3 1.3-3 3v-2c0-1.7-1.3-3-3-3s-3 1.3-3 3V22c0-1.7-1.3-3-3-3s-3 1.3-3 3Z" fill="#fff"/></svg>`;

const CSS = `@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@500;600;700;800&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:var(--H,1350px)}
body{position:relative;overflow:hidden;background:#0a0a10;color:#fff;font-family:"Inter Tight",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wall{position:absolute;inset:-12% -22%;display:grid;grid-template-columns:repeat(7,1fr);gap:22px;transform:rotate(-10deg);filter:blur(5px) saturate(1.35) brightness(1.1)}
.wall i{aspect-ratio:2/3;border-radius:20px;background:#1a1726 center/cover}
.veil{position:absolute;inset:0;background:radial-gradient(75% 55% at 50% 45%,#0a0a1000,#0a0a10aa 85%),linear-gradient(#0a0a10cc,#0a0a1040 30%,#0a0a1060 65%,#0a0a10e6)}
.glow{position:absolute;inset:0;background:radial-gradient(50% 30% at 75% 70%,#8b5cf650,transparent 70%),radial-gradient(45% 25% at 10% 5%,#8b5cf640,transparent 70%)}
.glass{position:absolute;border-radius:36px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));-webkit-backdrop-filter:blur(30px) saturate(1.6);backdrop-filter:blur(30px) saturate(1.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1.5px rgba(255,255,255,.14),0 40px 80px -30px rgba(0,0,0,.7)}
.top{position:absolute;z-index:6;top:56px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between}.top img{height:44px}
.chip{display:inline-flex;align-items:center;gap:10px;padding:12px 20px;border-radius:99px;font:700 22px/1 "Inter Tight",Arial,sans-serif;background:rgba(255,255,255,.12);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18)}
.kick{position:absolute;z-index:5;top:146px;left:72px;font:800 24px/1 Archivo,Arial,sans-serif;font-stretch:90%;letter-spacing:.03em;text-transform:uppercase;padding:11px 18px;border-radius:99px;background:#8b5cf6;box-shadow:0 0 40px #8b5cf699}
h1{position:absolute;z-index:5;top:204px;left:72px;right:72px;font:900 104px/.86 Archivo,"Arial Narrow",Arial,sans-serif;font-stretch:70%;text-transform:uppercase;text-shadow:0 8px 40px #0009}
h1 em{font-style:normal;color:#b9a3ff}
.sub{position:absolute;z-index:5;left:72px;font:600 29px/1.32 "Inter Tight",Arial,sans-serif;color:#ffffffc8}
.ph{position:absolute;aspect-ratio:393/852;border-radius:calc(var(--pw)*.15);padding:calc(var(--pw)*.028);background:linear-gradient(150deg,#4a4362,#17141f 40%,#0b0a10 60%,#3a3352);box-shadow:0 0 0 2px #ffffff26 inset,0 60px 100px -20px #000d,0 0 140px -30px #8b5cf6aa}
.ph .scr{width:100%;height:100%;border-radius:calc(var(--pw)*.125);overflow:hidden;background:#0a0a10;display:flex;flex-direction:column}
.ph .scr img{width:100%;flex:1;object-fit:cover;object-position:top;display:block}
.sb{height:calc(var(--pw)*.112);flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 9% 0 11%;font:700 calc(var(--pw)*.04)/1 "Inter Tight";position:relative}
.sb .di{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:31%;height:calc(var(--pw)*.083);border-radius:99px;background:#000}
.bat{display:block;width:calc(var(--pw)*.062);height:calc(var(--pw)*.029);border:1.6px solid #ffffff99;border-radius:4px;padding:1.5px}.bat i{display:block;height:100%;width:80%;background:#fff;border-radius:2px}
.st{display:flex;gap:18px;align-items:flex-start}
.st .n{flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#8b5cf6;font:900 26px/1 Archivo,Arial,sans-serif;box-shadow:0 0 26px #8b5cf688}
.st b{display:block;font:800 28px/1.15 "Inter Tight",Arial,sans-serif}.st small{display:block;margin-top:5px;font:600 21px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffaa}
.ico{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#ffffff22;vertical-align:-9px;margin:0 3px}.ico svg{width:24px;height:24px;color:#fff}.ico.bl svg{color:#4aa3ff}
.foot{z-index:6;position:absolute;left:72px;right:72px;bottom:46px;display:flex;justify-content:space-between;align-items:center;font:700 22px/1 "Inter Tight",Arial,sans-serif;color:#ffffffa0}
.foot .os{display:flex;align-items:center;gap:8px;font:300 20px/1 Poppins}.foot .os svg{width:20px;height:20px;fill:currentColor}.foot .os b{font-weight:800}
.swipe{display:flex;align-items:center;gap:10px;color:#fff;padding:12px 18px;border-radius:99px;background:rgba(255,255,255,.12);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18)}
.app{display:flex;align-items:center;gap:22px}.app img{width:120px;height:120px;border-radius:28px;box-shadow:0 0 0 2px #ffffff26,0 24px 50px -16px #000,0 0 70px #8b5cf699}
.app b{display:block;font:900 40px/1 Archivo,Arial,sans-serif;font-stretch:80%;text-transform:uppercase}.app small{display:block;margin-top:8px;font:600 22px/1.2 "Inter Tight",Arial,sans-serif;color:#ffffffb0}
.url{display:inline-flex;align-items:center;gap:12px;padding:16px 22px;border-radius:18px;background:rgba(139,92,246,.22);box-shadow:inset 0 0 0 1.5px rgba(167,139,250,.6),0 0 50px rgba(139,92,246,.45);font:800 30px/1 "Inter Tight",Arial,sans-serif;color:#d9ccff}.url svg{width:28px;height:28px}
.tap{position:absolute;width:110px;height:110px;filter:drop-shadow(0 10px 20px #0008)}
.feat{display:flex;gap:16px;align-items:center}.feat .fi{flex:none;width:58px;height:58px;border-radius:16px;display:grid;place-items:center;font-size:30px;background:linear-gradient(180deg,#8b5cf6,#6d3fe0);box-shadow:0 0 30px #8b5cf666,inset 0 1px 0 #ffffff55}
.feat b{display:block;font:800 26px/1.15 "Inter Tight",Arial,sans-serif}.feat small{display:block;margin-top:4px;font:600 20px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffa8}
.col h3{font:900 34px/1 Archivo,Arial,sans-serif;font-stretch:82%;text-transform:uppercase;display:flex;align-items:center;gap:12px;margin-bottom:24px}.col h3 i{font-style:normal;font-size:30px}
.col .st+.st{margin-top:22px}`;
const FOOT = (n, N, last) => `<div class="foot"><span class="os"><span>by</span>${OS}<em style="font-style:normal">one<b>side</b></em></span>${last ? `<span class="swipe">nevarneyok.net.tr/indir</span>` : `<span class="swipe">${n}/${N} · Kaydır →</span>`}</div>`;
const N = 6;
const page = (n, body, o) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${WALL(o)}<div class="glow"></div><div class="top"><img src="${LOGO}" alt="Ne Var Ne Yok"><span class="chip">📲 Uygulamayı kur</span></div>${body}${FOOT(n, N, n === N)}</body></html>`;


/* Tek gönderi (1080×1350) ve hikâye (1080×1920; üst 230, alt 220 px Instagram için boş) */
const NOTI = (t, b, when = "şimdi") => `<div class="noti"><img src="${ICON}" alt=""><div><span><b>NE VAR NE YOK</b><i>${when}</i></span><b>${t}</b><small>${b}</small></div></div>`;
const EXTRA = `.noti{display:flex;gap:16px;align-items:flex-start;padding:20px 22px;border-radius:30px;background:rgba(40,36,58,.55);-webkit-backdrop-filter:blur(30px) saturate(1.7);backdrop-filter:blur(30px) saturate(1.7);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 0 0 1.5px rgba(255,255,255,.12),0 30px 60px -20px rgba(0,0,0,.7)}
.noti img{width:58px;height:58px;border-radius:14px;flex:none}.noti div{flex:1}.noti span{display:flex;justify-content:space-between;font:700 18px/1 "Inter Tight",Arial,sans-serif;color:#ffffff99;letter-spacing:.04em}.noti span i{font-style:normal;letter-spacing:0}
.noti>div>b{display:block;margin-top:8px;font:800 24px/1.2 "Inter Tight",Arial,sans-serif}.noti small{display:block;margin-top:4px;font:600 21px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffd0}
.cta{display:flex;align-items:center;gap:20px;padding:22px 24px}.cta img{width:84px;height:84px;border-radius:20px;box-shadow:0 0 50px #8b5cf688}.cta b{display:block;font:900 32px/1 Archivo,Arial,sans-serif;font-stretch:82%;text-transform:uppercase}.cta small{display:block;margin-top:8px;font:700 22px/1 "Inter Tight",Arial,sans-serif;color:#c9b8ff}`;
const CTA = (x, y, w) => `<div class="glass cta" style="left:${x}px;top:${y}px;width:${w}px"><img src="${ICON}" alt=""><div><b>Bio'daki bağlantıdan kur</b><small>nevarneyok.net.tr/indir · ücretsiz</small></div></div>`;
const doc = (H, inner, o) => `<!doctype html><html lang="tr" style="--H:${H}px"><head><meta charset="utf-8"><style>${CSS}${EXTRA}</style></head><body>${WALL(o)}<div class="glow"></div>${inner}</body></html>`;
const TOP = (y) => `<div class="top" style="top:${y}px"><img src="${LOGO}" alt="Ne Var Ne Yok"><span class="chip">📲 Ücretsiz uygulama</span></div>`;
const SIGN = (y) => `<div class="foot" style="bottom:auto;top:${y}px"><span class="os"><span>by</span>${OS}<em style="font-style:normal">one<b>side</b></em></span><span class="swipe">nevarneyok.net.tr</span></div>`;

// konu: başlık, alt yazı, gönderide ve hikâyede sahne
const ADS = [
  { id: "bu-aksam", kick: "Bu akşam ne var?", h: "ŞEHRİNDE<br>BU AKŞAM<br><em>NE VAR?</em>", sub: "Konser, tiyatro, stand-up, sinema. Afiş afiş, saat saat, tek uygulamada.",
    post: () => PHONE("sehir", 400, 620, 330, 4), story: () => PHONE("sehir", 520, 280, 770, 0) },
  { id: "fiyat", kick: "Fiyat karşılaştırma", h: "AYNI BİLET,<br><em>FARKLI FİYAT.</em>", sub: "Hangi sitede ne kadar, yan yana gör. En düşük olanı tek dokunuşla al.",
    post: () => PHONE("fiyat", 400, 620, 330, 4), story: () => PHONE("fiyat", 520, 280, 770, 0) },
  { id: "kacirma", kick: "Takip et, bildirim al", h: "HİÇBİR ŞEYİ<br><em>KAÇIRMA.</em>", sub: "Takip ettiğin etkinlikte bir şey değişirse ilk sen öğren.",
    post: () => `<div style="position:absolute;left:72px;right:72px;top:560px;display:flex;flex-direction:column;gap:18px;z-index:3">${NOTI("Fiyatı düştü 💸", "Takip ettiğin oyunun bileti artık daha uygun. Tam zamanı!")}${NOTI("Yarın büyük gün ✨", "Takip ettiğin konser yarın akşam. Biletin hazır mı?", "2 sa önce")}${NOTI("Saat değişti ⏰", "Takip ettiğin etkinliğin yeni saati 21:00. Takvimini güncellemeyi unutma!", "dün")}</div>`,
    story: () => `<div style="position:absolute;left:72px;right:72px;top:720px;display:flex;flex-direction:column;gap:20px;z-index:3">${NOTI("Fiyatı düştü 💸", "Takip ettiğin oyunun bileti artık daha uygun. Tam zamanı!")}${NOTI("Yarın büyük gün ✨", "Takip ettiğin konser yarın akşam. Biletin hazır mı?", "2 sa önce")}${NOTI("Müjde! 🎉", "Takip ettiğin oyunun biletleri yeniden satışta. Bu sefer kaçırma!", "dün")}${NOTI("Hafta sonu planın hazır mı? 🌟", "Şehrinde bu hafta sonu yüzlerce etkinlik var; sana göre olanları seçtik ✨", "Cuma")}</div>` },
  { id: "81-il", kick: "81 il · tek çark", h: "HANGİ<br><em>ŞEHİRDESİN?</em>", sub: "Kaydır, şehrin ortaya gelsin. Ankara'dan Van'a, 81 ilin etkinlikleri burada.",
    post: () => PHONE("cark", 400, 620, 330, 4), story: () => PHONE("cark", 520, 280, 770, 0) },
  { id: "sinema", kick: "Vizyonda ne var?", h: "SEANSLAR<br><em>SALON SALON.</em>", sub: "Şehrindeki sinemaların seansları gün gün. Filmi seç, saatini bul.",
    post: () => PHONE("sinema", 400, 620, 330, 4), story: () => PHONE("sinema", 520, 280, 770, 0) },
];
const NOTES = {
  "bu-aksam": "Not: fiyatlar uygulamada yalnızca satış sitesinde doğrulanmışsa görünür.",
};
const post = (a) => doc(1350, `${TOP(56)}<div class="kick">${a.kick}</div><h1 style="font-size:100px">${a.h}</h1><p class="sub" style="top:${a.id === "kacirma" ? 430 : 500}px;width:${a.id === "kacirma" ? 936 : 500}px">${a.sub}</p>${a.post()}${a.id === "kacirma" ? CTA(72, 1100, 936) : CTA(72, 1080, 500)}${SIGN(1290)}`, .85);
const story = (a) => doc(1920, `${TOP(240)}<div class="kick" style="top:330px">${a.kick}</div><h1 style="top:388px;font-size:118px">${a.h}</h1><p class="sub" style="top:${a.id === "kacirma" ? 620 : 640}px;width:936px">${a.sub}</p>${a.story()}${CTA(72, 1550, 936)}`, .85);

const p = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const a of ADS) for (const [kind, H, fn] of [["gonderi", 1350, post], ["hikaye", 1920, story]]) {
  await p.setViewportSize({ width: 1080, height: H });
  await p.setContent(fn(a), { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); await p.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; }); await p.waitForTimeout(400);
  await p.screenshot({ path: join(OUT, `tek-${a.id}-${kind}.png`) }); log(`tek-${a.id}-${kind}.png`);
}
await browser.close(); srv.close();
