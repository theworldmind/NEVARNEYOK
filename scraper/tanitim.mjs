// UYGULAMA TANITIM GÖRSELLERİ (kullanıcı isteği, 19.11.2026: "uygulamamızı tanıtan harita, yol tarifi, etkinlikler; portre, uygulama içinden, yüksek çözünürlük").
// 1) Canlı site (nevarneyok.net.tr) iPhone boyunda, uygulama kipinde açılır; gerçek ekranlar 3× çekilir:
//    harita (il geneli, 3B yakın), yol tarifi (yürüyerek, toplu taşıma adımları), şehir sayfası, etkinlik, sinema, Planım.
// 2) Ekranlar Apple tanıtımı gibi sade sahnelere konur: 1080×1350 gönderi ve 1080×1920 hikâye, 2× çözünürlükte (2160×2700 / 2160×3840).
//    Kısa başlık + logo; "indir" çağrısı, fiyat, iddia yok (kullanıcı: "göstererek reklam"). Konum: Kızılay (yalnızca tarayıcıya verilen deneme konumu).
// Çıktı: OUT_DIR/tanitim-*.png (+ _ekran-*.png ham ekranlar).
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, log } from "./lib/util.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas/tanitim");
const BASE = process.env.SITE || "https://nevarneyok.net.tr/";
const C = process.env.SHOT_CITY || "ankara";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const W = 393, H = 808;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "tr-TR", timezoneId: "Europe/Istanbul",
  geolocation: { latitude: 39.92077, longitude: 32.85411, accuracy: 15 }, permissions: ["geolocation", "notifications"],
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
await ctx.route(/goatcounter/, (r) => r.abort());
const today = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
const addD = (n) => new Date(Date.parse(today + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
await ctx.addInitScript(({ C, notes }) => {
  try { Object.defineProperty(navigator, "standalone", { get: () => true }); } catch {}
  const F = { "nvny-hosgeldin": "1", "nvny-hosgeldin-sor": "1", "nvny-nask-x": "1", "nvny-nask-f": "1", "nvny-intro": "1", "nvny-app-ilk": "1", "nvny-intro-done": "1", "nvny-city": C,
    "nvny-tur-ana": "1", "nvny-tur-sinema": "1", "nvny-tur-harita": "1", "nvny-tur-plan": "1", "nvny-tur-akis": "1", "nvny-ses": "0", "nvny-gece": "0", "nvny-ajanda": notes };
  for (const [k, v] of Object.entries(F)) try { if (localStorage.getItem(k) == null || k === "nvny-ajanda") localStorage.setItem(k, v); } catch {}
  const s = document.createElement("style"); s.textContent = "*,*::before,*::after{caret-color:transparent!important}::-webkit-scrollbar{display:none}.maplibregl-ctrl-attrib{opacity:.55}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
}, { C, notes: JSON.stringify([{ id: "n1", d: addD(1), t: "19:30", x: "Ece ile buluşma, Kızılay" }, { id: "n2", d: addD(3), t: "", x: "Bilet çıktısını al" }, { id: "n3", d: addD(5), t: "14:00", x: "Sinema, bütün grup" }]) });
const page = await ctx.newPage();
page.on("pageerror", (e) => log("sayfa hatası: " + e.message.slice(0, 160)));
const settle = async (ms = 1200) => {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].filter((i) => !i.complete && i.getBoundingClientRect().top < innerHeight).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 7000); }))])).catch(() => {});
  await page.waitForTimeout(ms);
};
let NAV = 0;
const go = async (hash, ms) => { await page.goto(BASE + `?s=${++NAV}` + hash, { waitUntil: "domcontentloaded", timeout: 60000 }); await settle(ms); };
const shots = {};
const snap = async (name) => {
  await page.evaluate(() => document.querySelectorAll(".ph img.p").forEach((i) => { if (i.complete && i.naturalWidth) i.parentNode.classList.add("ok"); })).catch(() => {});
  await page.waitForTimeout(500); const f = join(OUT, `_ekran-${name}.png`); await page.screenshot({ path: f }); shots[name] = "data:image/png;base64," + (await readFile(f)).toString("base64"); log(`ekran: ${name}`);
};
const cam = (c, z, p = 0, b = 0) => page.evaluate(({ C, c, z, p, b }) => { const h = JSON.parse(localStorage.getItem("nvny-harita") || "{}"); h.cam = { city: C, c, z, p, b }; localStorage.setItem("nvny-harita", JSON.stringify(h)); }, { C, c, z, p, b });
const tryIt = async (n, f) => { try { await f(); } catch (e) { log(`atlandı ${n}: ${e.message.slice(0, 140)}`); } };

await go(`#/${C}`, 1500);
/* şehir sayfası ve etkinlik */
await tryIt("sehir", async () => { await go(`#/${C}`, 2500); await snap("sehir");
  const ev = await page.evaluate(() => { const L = [...document.querySelectorAll('a.cd[href*="/e/"]')].filter((x) => !x.classList.contains("off") && x.querySelector(".ph img.p")); return (L.find((x) => /konser|müzik|caz|rock|senfoni/i.test(x.textContent)) || L.find((x) => /tiyatro|stand/i.test(x.textContent)) || L[0])?.getAttribute("href"); });
  if (ev) { await go(ev, 2000); await snap("etkinlik"); } });
/* harita: il geneli ve 3B yakın */
await tryIt("harita_genel", async () => { await cam([32.80, 39.925], 10.6); await go(`#/${C}/harita`, 7000); await snap("harita_genel"); });
await tryIt("harita_yakin", async () => { await cam([32.8545, 39.9195], 15.4, 58, -28); await go(`#/${C}/harita`, 9000); await snap("harita_yakin"); });
/* yol tarifi: Kızılay → Kuğulu Park (kullanıcı, 19.11.2026: "Gazi Hukuk dışında güzel bir yer, hem normal hem önizlemeli") */
const DST = process.env.SHOT_DEST || "39.90265,32.86085", DNM = process.env.SHOT_DEST_NAME || "Kuğulu Park";
const mode = async (m) => { const b = await page.$(`[data-m="${m}"]`); if (b) { await b.click(); await settle(4500); } return !!b; };
await tryIt("rota", async () => {
  await go(`#/${C}/harita?yer=${DST}&ad=${encodeURIComponent(DNM)}&rota=1`, 9000);
  if (await mode("foot")) await snap("rota_yuru");
  if (await mode("pt")) { await snap("rota_pt"); const g = await page.$("#rgr"); if (g) { await g.click(); await page.waitForTimeout(1600); await snap("rota_pt_adim"); } }
  await mode("foot");
});
/* önizleme: yerinde canlanma (ada.js) */
await tryIt("onizle", async () => { await go(`#/${C}/harita?yer=${DST}&ad=${encodeURIComponent(DNM)}&onizle=1`, 4000); await page.waitForTimeout(16000); await snap("onizle");
  await page.waitForTimeout(6000); await snap("onizle2"); });
/* sinema ve Planım */
await tryIt("sinema", async () => { await go(`#/${C}/sinema`, 2500); await snap("sinema"); });
await tryIt("plan", async () => { await go(`#/${C}/takip`, 2500); await snap("plan"); });

/* --- sahneler --- */
const LOGO = "data:image/png;base64," + (await readFile(join(ROOT, "brand/logo.png"))).toString("base64");
const STATUS = `<div class="sb"><b>9:41</b><i class="di"></i><span><svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .4C5.1.4 2.5 1.5.5 3.4l1.3 1.3C3.4 3.1 5.6 2.2 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.5L13 6c-1.3-1.3-3.1-2-5-2s-3.7.7-5 2l1.3 1.3c1-1 2.3-1.5 3.7-1.5Zm0 3.6c.5 0 1 .2 1.3.5L8 11.2 6.7 9.9c.3-.3.8-.5 1.3-.5Z"/></svg><em class="bat"><i></i></em></span></div>`;
const P = (k, w, x, y, r = 0, z = 1, extra = "") => shots[k] ? `<div class="ph" style="--pw:${w}px;left:${x}px;top:${y}px;transform:rotate(${r}deg);z-index:${z}${extra}"><div class="scr">${STATUS}<img src="${shots[k]}" alt=""></div><i class="gl"></i></div>` : "";
const pick = (...k) => k.find((x) => shots[x]);
const CSS = `@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@500;600;700;800&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%}
body{position:relative;overflow:hidden;color:#fff;font-family:"Inter Tight",Arial,sans-serif;background:#0a0a10}
.bg{position:absolute;inset:0;background:radial-gradient(70% 38% at 50% var(--gy,74%),#8b5cf670,transparent 70%),radial-gradient(60% 30% at 50% -4%,#8b5cf630,transparent 70%),radial-gradient(40% 30% at 0% 100%,#22d3ee14,transparent 70%),radial-gradient(40% 30% at 100% 100%,#c026d318,transparent 70%)}
.bg::after{content:"";position:absolute;left:10%;right:10%;top:calc(var(--gy,74%) + 16%);height:2px;background:linear-gradient(90deg,transparent,#c4b5fd66,transparent);filter:blur(1px)}
.hd{position:absolute;left:0;right:0;top:var(--ht,78px);display:flex;flex-direction:column;align-items:center;text-align:center}
.hd .lg{height:44px}.hd .lg img{height:100%;display:block}
.hd h1{margin-top:30px;font:900 var(--hs,112px)/.86 Archivo,"Arial Narrow",Arial,sans-serif;font-stretch:70%;text-transform:uppercase;letter-spacing:-.005em}
.hd h1 em{font-style:normal;background:linear-gradient(180deg,#e9d5ff,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}
.hd p{margin-top:20px;max-width:820px;font:600 30px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffa8}
.st{position:absolute;left:0;right:0;bottom:0;top:var(--st,480px);-webkit-mask-image:linear-gradient(#000 80%,transparent 98%);mask-image:linear-gradient(#000 80%,transparent 98%)}
.ph{position:absolute;width:var(--pw);aspect-ratio:393/852;border-radius:calc(var(--pw)*.155);padding:calc(var(--pw)*.026);background:linear-gradient(145deg,#5a5470,#1d1a28 22%,#0c0b12 55%,#3a3450 85%,#6a6380);box-shadow:0 0 0 1.5px #ffffff30 inset,0 0 0 calc(var(--pw)*.006) #000 inset,0 60px 120px -30px #000,0 0 160px -40px #8b5cf6aa}
.ph .scr{position:relative;width:100%;height:100%;border-radius:calc(var(--pw)*.13);overflow:hidden;background:#0a0a10;display:flex;flex-direction:column}
.ph .scr img{display:block;width:100%;flex:1;min-height:0;object-fit:cover;object-position:top}
.ph .gl{position:absolute;inset:calc(var(--pw)*.026);border-radius:calc(var(--pw)*.13);background:linear-gradient(115deg,#ffffff14 0%,transparent 28%);pointer-events:none}
.sb{height:calc(var(--pw)*.112);flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 9% 0 11%;font:700 calc(var(--pw)*.04)/1 -apple-system,"Inter Tight";position:relative}
.sb span{display:flex;gap:6px;align-items:center}.sb svg{height:calc(var(--pw)*.028);fill:#fff}
.sb .di{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:31%;height:calc(var(--pw)*.083);border-radius:99px;background:#000}
.bat{width:calc(var(--pw)*.062);height:calc(var(--pw)*.029);border:1.6px solid #ffffff99;border-radius:4px;padding:1.5px;display:block}.bat i{display:block;height:100%;width:80%;background:#fff;border-radius:2px}
.chip{position:absolute;z-index:9;display:flex;align-items:center;gap:12px;padding:16px 24px;border-radius:99px;background:linear-gradient(180deg,#ffffff2a,#ffffff10);backdrop-filter:blur(18px);box-shadow:0 0 0 1.5px #ffffff38 inset,0 24px 50px -16px #000c;font:800 26px/1 "Inter Tight";white-space:nowrap}
.chip i{font-style:normal;font-size:28px}.chip.p{background:linear-gradient(180deg,#a78bfa,#7c3aed);box-shadow:0 0 0 1.5px #ffffff40 inset,0 20px 50px -12px #7c3aedcc}
.ft{position:absolute;left:0;right:0;bottom:34px;text-align:center;font:700 22px/1 "Inter Tight";color:#ffffff70;letter-spacing:.02em}`;
const SC = [
  { id: "harita", h: "ŞEHRİN<br><em>HARİTADA.</em>", p: "Bütün etkinlikler, mekânlar ve afişler tek haritada.",
    body: (s) => P(pick("harita_yakin", "harita_genel"), s ? 560 : 470, s ? 260 : 305, s ? 40 : 10, 0, 2) + (shots.harita_genel && shots.harita_yakin ? P("harita_genel", s ? 420 : 350, s ? -150 : -110, s ? 210 : 140, -9, 1) + P("sehir", s ? 420 : 350, s ? 810 : 840, s ? 210 : 140, 9, 1) : "") },
  { id: "yol", h: "YOLUNU<br><em>BUL.</em>", p: "Yürüyerek, bisikletle, arabayla. Nereden istersen.",
    body: (s) => P(pick("rota_yuru"), s ? 560 : 470, s ? 260 : 305, s ? 40 : 10, 0, 2) + `<span class="chip" style="left:${s ? 70 : 60}px;top:${s ? 180 : 120}px"><i>🚶</i>Yürüyerek</span><span class="chip p" style="right:${s ? 60 : 50}px;top:${s ? 520 : 380}px"><i>📍</i>${DNM}</span>` },
  { id: "toplu", h: "METRO, OTOBÜS,<br><em>VAPUR.</em>", p: "Hangi hat, hangi durak, kaç durak. Adım adım.",
    body: (s) => P(pick("rota_pt_adim", "rota_pt"), s ? 560 : 470, s ? 260 : 305, s ? 40 : 10, 0, 2) + (shots.rota_pt && shots.rota_pt_adim ? P("rota_pt", s ? 420 : 350, s ? -150 : -110, s ? 210 : 140, -9, 1) : "") + `<span class="chip p" style="right:${s ? 60 : 50}px;top:${s ? 300 : 200}px"><i>🚌</i>Hangi hat, kaç durak</span><span class="chip" style="left:${s ? 60 : 50}px;top:${s ? 620 : 430}px"><i>🚏</i>Durak no ile</span>` },
  { id: "onizle", h: "GİTMEDEN<br><em>GÖR.</em>", p: "Buluşacağın yer, çevresiyle birlikte canlanır.",
    body: (s) => P(pick("onizle2", "onizle"), s ? 560 : 470, s ? 260 : 305, s ? 40 : 10, 0, 2) + (shots.onizle && shots.onizle2 ? P("rota_yuru", s ? 420 : 350, s ? -150 : -110, s ? 210 : 140, -9, 1) : "") + `<span class="chip p" style="right:${s ? 60 : 50}px;top:${s ? 300 : 200}px"><i>📍</i>${DNM}</span>` },
  { id: "etkinlik", h: "BU AKŞAM<br><em>NE VAR?</em>", p: "Konser, tiyatro, stand-up, sergi. Afiş afiş.",
    body: (s) => P("sehir", s ? 470 : 400, s ? 70 : 90, s ? 90 : 50, -6, 1) + P(pick("etkinlik"), s ? 470 : 400, s ? 540 : 590, s ? 170 : 110, 6, 2) },
  { id: "sinema", h: "SEANS<br><em>SEANS.</em>", p: "Vizyondaki filmler, salon salon, saat saat.",
    body: (s) => P(pick("sinema"), s ? 560 : 470, s ? 260 : 305, s ? 40 : 10, 0, 2) + `<span class="chip" style="left:${s ? 70 : 60}px;top:${s ? 260 : 180}px"><i>🍿</i>Vizyonda</span>` },
  { id: "plan", h: "PLANIN<br><em>HAZIR.</em>", p: "Gideceğin etkinlikler ve kendi notların, gün gün.",
    body: (s) => P(pick("plan"), s ? 560 : 470, s ? 260 : 305, s ? 40 : 10, 0, 2) + (shots.etkinlik ? P("etkinlik", s ? 420 : 350, s ? 810 : 840, s ? 210 : 140, 9, 1) : "") },
  { id: "hepsi", h: "NE VAR<br><em>NE YOK.</em>", p: "Etkinlikler, harita, yol tarifi, sinema. 81 il.",
    body: (s) => P(pick("harita_yakin", "harita_genel"), s ? 400 : 340, s ? 40 : 40, s ? 200 : 130, -10, 1) + P("sehir", s ? 480 : 410, s ? 300 : 335, s ? 60 : 20, 0, 3) + P(pick("rota_pt_adim", "rota_yuru"), s ? 400 : 340, s ? 640 : 700, s ? 200 : 130, 10, 1) },
];
const html = (sc, s) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="bg" style="--gy:${s ? 70 : 76}%"></div>
<div class="hd" style="--ht:${s ? 190 : 72}px;--hs:${s ? 136 : 112}px"><div class="lg"><img src="${LOGO}" alt="Ne Var Ne Yok"></div><h1>${sc.h}</h1><p>${sc.p}</p></div>
<div class="st" style="--st:${s ? 640 : 470}px">${sc.body(s)}</div><div class="ft">nevarneyok.net.tr</div></body></html>`;
const cp = await browser.newPage({ deviceScaleFactor: 2 });
for (const sc of SC) for (const s of [false, true]) {
  await cp.setViewportSize({ width: 1080, height: s ? 1920 : 1350 });
  await cp.setContent(html(sc, s), { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await cp.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; }); await cp.waitForTimeout(300);
  const file = `tanitim-${sc.id}-${s ? "hikaye" : "gonderi"}.png`; await cp.screenshot({ path: join(OUT, file) }); log(`görsel: ${file}`);
}
await browser.close();
log(`Tanıtım görselleri hazır → ${OUT}`);
