// UYGULAMA İÇİ REKLAM GÖRSELLERİ (kullanıcı isteği, 15.11.2026: "uygulama içi görüntüler … ballandıra ballandıra").
// 1) Site yerelde açılır, telefon (iPhone 15 boyu) ve uygulama kipinde gerçek ekranlar çekilir:
//    il tekerleği, şehir sayfası, etkinlik sayfası (Takip et), filtreler, kişiselleştir, sinema.
// 2) Bu ekranlar telefon çerçevesine konup tasarlanmış reklamlara yerleştirilir: gönderi 1080×1350 + hikâye 1080×1920.
//    Hepsinin altında "Uygulamamızı indirin · nevarneyok.net.tr/indir" ve by oneside. Fiyat ve iddia yazılmaz.
//    Ekranlardaki afişler etkinliklerin herkese açık afişleridir; uygulamada olduğu gibi altında "Görsel: <kaynak>" yazar.
// Çıktı: OUT_DIR/uygulama-*.png + uygulama-reklam.json (açıklamalar).
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";
import { ROOT, log, todayIST } from "./lib/util.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas/uygulama");
const CITY = process.env.SHOT_CITY || "istanbul";
await mkdir(OUT, { recursive: true });

/* --- yerel sunucu --- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".jpg": "image/jpeg" };
const srv = createServer(async (q, r) => {
  let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  try { const b = await readFile(join(ROOT, p)); r.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); r.end(b); }
  catch { r.writeHead(404); r.end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${srv.address().port}/`;

const browser = await chromium.launch();
const W = 393, H = 808; // 852 − 44 px durum çubuğu (çerçevede çizilir)
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "tr-TR", timezoneId: "Europe/Istanbul",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
await ctx.grantPermissions(["notifications"], { origin: BASE.slice(0, -1) });
await ctx.route(/goatcounter/, (r) => r.abort());
await ctx.addInitScript(() => {
  try { Object.defineProperty(navigator, "standalone", { get: () => true }); } catch {}
  for (const [k, v] of Object.entries({ "nvny-hosgeldin": "1", "nvny-hosgeldin-sor": "1", "nvny-nask-x": "1", "nvny-nask-f": "1" })) try { localStorage.setItem(k, v); } catch {}
  const s = document.createElement("style"); s.textContent = "*,*::before,*::after{caret-color:transparent!important}::-webkit-scrollbar{display:none}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
});
const page = await ctx.newPage();
const settle = async (ms = 900) => {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].filter((i) => !i.complete && i.getBoundingClientRect().top < innerHeight).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 6000); }))])).catch(() => {});
  await page.waitForTimeout(ms);
};
const go = async (hash) => { await page.goto(BASE + hash, { waitUntil: "domcontentloaded" }); await settle(); };
const shots = {};
const snap = async (name) => { await page.evaluate(() => document.querySelectorAll(".ph img.p").forEach((i) => { if (i.complete && i.naturalWidth) i.parentNode.classList.add("ok"); })).catch(() => {}); await page.waitForTimeout(450); const f = join(OUT, `_ekran-${name}.png`); await page.screenshot({ path: f }); shots[name] = "data:image/png;base64," + (await readFile(f)).toString("base64"); log(`ekran: ${name}`); };

/* Ekranlar: ana il (MAIN) bütün ekranlar; diğer büyük illerde şehir sayfası, raflar ve sinema.
   Kullanıcı isteği (15.11.2026): görsellerde daha çok Ankara, İstanbul…; bütün Türkiye olduğu anlaşılsın. */
const CITIES_ = (process.env.SHOT_CITIES || "ankara istanbul izmir antalya").split(/\s+/).filter(Boolean);
const MAIN = CITIES_[0];
const waitStory = async () => {
  for (let k = 0; k < 6; k++) {
    const ok = await page.evaluate(() => new Promise((r) => { const s = [...document.querySelectorAll(".stp .sps")]; const c = s.find((x) => { const b = x.getBoundingClientRect(); return b.left >= -5 && b.left < innerWidth / 2; }) || s[0]; const im = c?.querySelector(".po img"); if (!im) return r(true); if (im.complete && im.naturalWidth) return r(true); im.addEventListener("load", () => r(true)); im.addEventListener("error", () => r(false)); setTimeout(() => r(im.naturalWidth > 0), 8000); }));
    if (ok) break; await page.click(".stp .nx").catch(() => {}); await page.waitForTimeout(900);
  }
};

/* 1) il tekerleği: ana il ortada */
await go("#/");
await page.evaluate((id) => { const wl = document.querySelector("#wl"); const li = [...wl.querySelectorAll("li")]; const f = (t) => t.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i"); const i = li.findIndex((x) => f(x.textContent.trim()) === id); wl.scrollTop = Math.max(0, i) * 52; }, MAIN);
await page.waitForTimeout(700); await snap("tekerlek");

for (const C of CITIES_) {
  await page.evaluate((c) => localStorage.setItem("nvny-city", c), C);
  await go(`#/${C}`); await waitStory(); await page.waitForTimeout(400); await snap(`sehir_${C}`);
  await page.evaluate(() => { const r = document.querySelector(".rail"); if (r) scrollTo(0, r.getBoundingClientRect().top + scrollY - 70); });
  await settle(700); await snap(`raflar_${C}`);
  if (C === MAIN) {
    const ev = await page.evaluate(() => { const L = [...document.querySelectorAll('a.cd[href*="/e/"]')].filter((x) => !x.classList.contains("off")); return (L.find((x) => x.querySelector(".ph.ok img")) || L[0])?.getAttribute("href"); });
    if (ev) { await go(ev); await snap("etkinlik");
      const f = await page.$("#flw"); if (f) { await f.click(); await page.waitForTimeout(400); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); await snap("takip"); } }
    await go(`#/${C}/kesfet?t=haftasonu&k=konser,tiyatro&f=1`); await page.waitForTimeout(700); await snap("filtre");
    await page.evaluate(() => localStorage.setItem("nvny-prefs", JSON.stringify({ cats: ["konser", "tiyatro", "standup"], ilce: [], when: ["aksam", "haftasonu"], budget: 600, kids: false })));
    await go(`#/${C}`); const pz = await page.$("#pz"); if (pz) { await pz.click(); await page.waitForTimeout(800); await snap("kisisel"); }
    await page.evaluate(() => localStorage.removeItem("nvny-prefs"));
  }
  await go(`#/${C}/sinema`); await snap(`sinema_${C}`);
}
const [A, B, Cc, D] = [CITIES_[0], CITIES_[1] || CITIES_[0], CITIES_[2] || CITIES_[0], CITIES_[3] || CITIES_[1] || CITIES_[0]];
const IDX = JSON.parse(await readFile(join(ROOT, "data/cities.json"), "utf8")).cities;
const cityName = CITIES_.map((c) => IDX[c]?.name || c).join(", ");

/* --- reklamlar --- */
const LOGO = "data:image/png;base64," + (await readFile(join(ROOT, "brand/logo.png"))).toString("base64");
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M262 113C262 215 215 262 113 262H262Z"/><path d="M274 424C274 321 321 274 424 274H274Z"/></svg>`;
const STATUS = `<div class="sb"><b>9:41</b><i class="di"></i><span><svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .4C5.1.4 2.5 1.5.5 3.4l1.3 1.3C3.4 3.1 5.6 2.2 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.5L13 6c-1.3-1.3-3.1-2-5-2s-3.7.7-5 2l1.3 1.3c1-1 2.3-1.5 3.7-1.5Zm0 3.6c.5 0 1 .2 1.3.5L8 11.2 6.7 9.9c.3-.3.8-.5 1.3-.5Z"/></svg><em class="bat"><i></i></em></span></div>`;
const phone = (k, cls = "") => shots[k] ? `<div class="ph ${cls}"><div class="scr">${STATUS}<img src="${shots[k]}" alt=""></div></div>` : "";
const CTA = `<div class="cta"><div class="ic"><img src="${LOGO}" alt=""></div><div class="ct"><b>Uygulamamızı indirin</b><span>nevarneyok.net.tr/indir</span></div><div class="go">İNDİR<svg viewBox="0 0 24 24"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
<div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div>`;
const CSS = `@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@500;600;700;800&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%}
body{position:relative;overflow:hidden;color:#fff;font-family:"Inter Tight",Arial,sans-serif;font-style:normal;background:#0a0a10}
.bg{position:absolute;inset:0;background:radial-gradient(60% 40% at 18% 8%,#8b5cf655,transparent 70%),radial-gradient(55% 40% at 95% 70%,#8b5cf633,transparent 70%),radial-gradient(40% 30% at 30% 100%,#6d28d933,transparent 70%)}
.wall{position:absolute;inset:-12% -20%;display:grid;grid-template-columns:repeat(6,1fr);gap:22px;transform:rotate(-12deg);opacity:.5;filter:blur(1.2px) saturate(1.2);-webkit-mask-image:linear-gradient(#000 0%,#0008 45%,transparent 75%);mask-image:linear-gradient(#000 0%,#0008 45%,transparent 75%)}.wall i{aspect-ratio:2/3;border-radius:18px;background:#1a1726 center/cover}
.bg::after{content:"";position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff6,transparent),radial-gradient(1.2px 1.2px at 82% 9%,#fff5,transparent),radial-gradient(1.2px 1.2px at 64% 30%,#fff4,transparent),radial-gradient(1.4px 1.4px at 92% 44%,#fff4,transparent),radial-gradient(1.2px 1.2px at 6% 62%,#fff4,transparent)}
.pg{position:absolute;left:72px;right:72px;top:var(--top);bottom:var(--bot);display:flex;flex-direction:column}
.logo{height:58px;align-self:flex-start}.logo img{height:100%;display:block}
.kick{margin-top:34px;align-self:flex-start;font:800 26px/1 Archivo,Arial,sans-serif;font-stretch:90%;letter-spacing:.04em;text-transform:uppercase;color:#fff;padding:12px 20px;border-radius:99px;background:#8b5cf6;box-shadow:0 0 40px #8b5cf699}
h1{margin-top:22px;font:900 var(--hs,104px)/.86 Archivo,"Arial Narrow",Arial,sans-serif;font-style:normal;font-stretch:70%;text-transform:uppercase;letter-spacing:-.005em;text-shadow:0 6px 40px #0008}
h1 em{font-style:normal;color:#a78bfa;text-shadow:0 0 50px #8b5cf6aa}
.sub{margin-top:22px;font:600 32px/1.28 "Inter Tight",Arial,sans-serif;color:#ffffffd0;max-width:880px}
.stage{position:relative;flex:1;margin:34px -72px 0;min-height:0;overflow:hidden;-webkit-mask-image:linear-gradient(#000 82%,transparent);mask-image:linear-gradient(#000 82%,transparent)}
.ph{position:absolute;width:var(--pw,430px);aspect-ratio:393/852;border-radius:calc(var(--pw,430px)*.15);padding:calc(var(--pw,430px)*.028);background:linear-gradient(150deg,#3b3550,#14121c 40%,#0b0a10 60%,#2c2740);box-shadow:0 0 0 2px #ffffff22 inset,0 50px 90px -20px #000c,0 0 120px -30px #8b5cf688}
.ph .scr{position:relative;width:100%;height:100%;border-radius:calc(var(--pw,430px)*.125);overflow:hidden;background:#0a0a10;display:flex;flex-direction:column}
.ph .scr img{display:block;width:100%;flex:1;object-fit:cover;object-position:top}
.sb{height:calc(var(--pw,430px)*.112);flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 9% 0 11%;font:700 calc(var(--pw,430px)*.04)/1 -apple-system,"Inter Tight";position:relative}
.sb span{display:flex;gap:6px;align-items:center}.sb svg{height:calc(var(--pw,430px)*.028);fill:#fff}
.sb .di{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:31%;height:calc(var(--pw,430px)*.083);border-radius:99px;background:#000}
.bat{width:calc(var(--pw,430px)*.062);height:calc(var(--pw,430px)*.029);border:1.6px solid #ffffff99;border-radius:4px;padding:1.5px;display:block}.bat i{display:block;height:100%;width:80%;background:#fff;border-radius:2px}
.cta{display:flex;align-items:center;gap:22px;padding:20px 22px;border-radius:30px;background:linear-gradient(180deg,#ffffff1a,#ffffff0a);box-shadow:0 0 0 1.5px #ffffff26 inset,0 20px 60px -20px #8b5cf6aa;margin-top:30px}
.cta .ic{width:84px;height:84px;border-radius:22px;background:#0a0a10;display:grid;place-items:center;box-shadow:0 0 0 1.5px #ffffff22 inset;flex:none;padding:8px}.cta .ic img{width:100%}
.ct{flex:1;display:flex;flex-direction:column;gap:6px}.ct b{font:900 38px/1 Archivo,Arial,sans-serif;font-stretch:80%;text-transform:uppercase}.ct span{font:700 26px/1 "Inter Tight";color:#c4b5fd}
.go{display:flex;align-items:center;gap:10px;padding:20px 28px;border-radius:99px;background:#8b5cf6;font:900 30px/1 Archivo,Arial,sans-serif;font-stretch:85%;box-shadow:0 0 40px #8b5cf699}.go svg{width:30px;height:30px}
.os{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:22px;color:#ffffffb0;font:300 22px/1 Poppins}.os svg{width:22px;height:22px;fill:currentColor}.os em{font-style:normal;font-weight:300}.os b{font-weight:800}
.bub{position:absolute;padding:20px 24px;border-radius:28px;background:linear-gradient(180deg,#2a2440f0,#17141ff0);box-shadow:0 0 0 1.5px #ffffff24 inset,0 30px 60px -20px #000c;display:flex;gap:16px;align-items:center;width:var(--bw,520px)}
.bub .ai{width:62px;height:62px;border-radius:16px;background:#0a0a10;flex:none;display:grid;place-items:center;padding:6px;box-shadow:0 0 0 1px #ffffff22 inset}.bub .ai img{width:100%}
.bub b{display:block;font:800 25px/1.15 "Inter Tight"}.bub p{font:500 22px/1.3 "Inter Tight";color:#ffffffb8;margin-top:4px}.bub small{font:600 18px/1 "Inter Tight";color:#ffffff80;position:absolute;right:22px;top:18px}
.tag{position:absolute;padding:14px 22px;border-radius:99px;background:#8b5cf6;font:800 24px/1 "Inter Tight";box-shadow:0 0 30px #8b5cf688;white-space:nowrap}
.tag.w{background:#fff;color:#0a0a10;box-shadow:0 20px 40px -10px #000a}
.pl{position:absolute;left:50%;top:-20px;transform:translateX(-50%);padding:10px 18px;border-radius:99px;background:#fff;color:#0a0a10;font:800 calc(var(--pw)*.058)/1 Archivo,Arial,sans-serif;font-stretch:88%;text-transform:uppercase;white-space:nowrap;box-shadow:0 14px 30px -10px #000a;z-index:3}
.ph{margin-top:0}.stage{padding-top:0}
.rib{position:absolute;left:-60px;right:-60px;height:78px;background:#8b5cf6;box-shadow:0 0 60px #8b5cf6aa,0 20px 40px -10px #000c;z-index:0;overflow:hidden;display:flex;align-items:center}
.rib div{display:flex;gap:22px;align-items:center;white-space:nowrap;font:900 40px/1 Archivo,Arial,sans-serif;font-stretch:76%;text-transform:uppercase;padding-left:30px}
.rib span{color:#ffffffd8}.rib span.b{color:#fff}.rib i{font-style:normal;color:#0a0a1088}
.cloud{position:absolute;inset:10px 40px 120px;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:2px 18px;line-height:.95}
.cloud span{font-weight:900;font-family:Archivo,Arial,sans-serif;font-stretch:74%;color:#ffffff59}
.cloud span.t2{color:#ffffffd0}.cloud span.t1{color:#a78bfa;text-shadow:0 0 40px #8b5cf6aa}
.pts{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.pts i{font:700 24px/1 "Inter Tight";font-style:normal;padding:13px 20px;border-radius:99px;background:#ffffff12;box-shadow:0 0 0 1.5px #ffffff20 inset}`;

const PST = (JSON.parse(await readFile(join(ROOT, "data/one-cikan.json"), "utf8").catch(() => "{}")).events || []).map((e) => e.img).filter(Boolean);
const WALL = PST.length ? `<div class="wall">${[...Array(36)].map((_, i) => `<i style="background-image:url('${PST[i % PST.length].replace(/'/g, "%27")}')"></i>`).join("")}</div>` : "";
const LOGOH = `<div class="logo"><img src="${LOGO}" alt="Ne Var Ne Yok"></div>`;
const NOTE = (t, p, x, y, w = 520, when = "şimdi") => `<div class="bub" style="left:${x}px;top:${y}px;--bw:${w}px"><div class="ai"><img src="${LOGO}" alt=""></div><div><b>${t}</b><p>${p}</p></div><small>${when}</small></div>`;

// Her reklam: sahne, yatay/dikey için ayrı konumlar
const NM = (c) => IDX[c]?.name || c;
// Türkçe ekler: Ankara'dan / İzmir'den, Ankara'ya / İzmir'e
const lastV = (w) => (w.toLocaleLowerCase("tr").match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ["a"])[0];
const back = (w) => "aıou".includes(lastV(w));
const DAN = (c) => { const w = NM(c); return `${w}'${/[fsthçşkp]$/i.test(w) ? "t" : "d"}${back(w) ? "a" : "e"}n`; };
const YA = (c) => { const w = NM(c); return `${w}'${/[aıoueiöü]$/i.test(w) ? "y" : ""}${back(w) ? "a" : "e"}`; };
const UP = (c) => NM(c).toLocaleUpperCase("tr");
// telefon: ekran, genişlik, konum, açı, üstünde il etiketi
const P = (k, w, x, y, r = 0, z = 1, label = "") => shots[k] ? `<div class="ph" style="--pw:${w}px;left:${x}px;top:${y}px;transform:rotate(${r}deg);z-index:${z}">${label ? `<span class="pl">📍 ${label}</span>` : ""}<div class="scr">${STATUS}<img src="${shots[k]}" alt=""></div></div>` : "";
// bütün Türkiye şeridi: büyük iller önde, sonra diğerleri, "81 İL"
const ORDER = Object.entries(IDX).sort((a, b) => (b[1].n + b[1].films * 5) - (a[1].n + a[1].films * 5)).map(([id]) => id);
const RIBBON = () => ""; // il şeridi kaldırıldı (kullanıcı: "mor şeridi güzel bulmuyorum", 15.11.2026)
const CLOUD = (story) => { const mx = Math.max(...Object.values(IDX).map((c) => c.n + c.films * 5)) || 1;
  const ids = Object.keys(IDX).sort((a, b) => NM(a).localeCompare(NM(b), "tr"));
  return `<div class="cloud${story ? " st" : ""}">${ids.map((c) => { const v = IDX[c].n + IDX[c].films * 5, f = Math.round((story ? 26 : 21) + Math.sqrt(v / mx) * (story ? 92 : 74)); const top = ORDER.indexOf(c);
    return `<span class="${top < 3 ? "t1" : top < 10 ? "t2" : ""}" style="font-size:${f}px">${UP(c)}</span>`; }).join("")}</div>`; };

let CSS_EXTRA = "";
const ADS = [
  { id: "uygulama-turkiye", kick: "Tek uygulama · 81 il", h: "TÜM TÜRKİYE'NİN<br><em>ETKİNLİKLERİ.</em>", sub: `${DAN(A)} ${YA(B)}, ${DAN(Cc)} ${YA(D)}… Hangi ildeysen orada ne var ne yok, gör.`,
    stage: (s) => CLOUD(s) + RIBBON(s ? 130 : 70, -3),
    cap: `Tüm Türkiye'nin etkinlikleri tek uygulamada 🇹🇷\n\n${NM(A)}, ${NM(B)}, ${NM(Cc)}, ${NM(D)}… 81 ilin konserleri, tiyatroları, stand-up'ları ve sinema seansları. Hangi ildeysen şehrini seç, orada ne var ne yok hemen gör.\n\n📲 Uygulamamızı indirin: nevarneyok.net.tr/indir (bağlantı profilde)\nÜcretsiz · Android ve iPhone\n\n#nevarneyok #etkinlik #ankara #istanbul #izmir #antalya #konser #tiyatro #sinema #türkiye` },
  { id: "uygulama-cebinde", kick: `${UP(A)} · ${UP(B)} · ${UP(Cc)} · 81 İL`, h: "NE VAR NE YOK,<br><em>ARTIK CEBİNDE.</em>", sub: "Konser, tiyatro, stand-up, sinema seansları. Şehrini seç, hemen gör.",
    stage: (s) => s ? P(`sehir_${B}`, 400, 50, 170, -8, 1, NM(B)) + P(`sehir_${A}`, 470, 305, 70, 0, 2, NM(A)) + P(`sehir_${Cc}`, 400, 630, 170, 8, 1, NM(Cc)) + RIBBON(150, -4)
      : P(`sehir_${B}`, 330, 60, 110, -8, 1, NM(B)) + P(`sehir_${A}`, 380, 350, 50, 0, 2, NM(A)) + P(`sehir_${Cc}`, 330, 690, 110, 8, 1, NM(Cc)) + RIBBON(90, -4),
    cap: `Ne var ne yok, artık cebinde 📲✨\n\n${NM(A)}, ${NM(B)}, ${NM(Cc)}… 81 ilin konserleri, tiyatroları, stand-up'ları ve sinema seansları tek uygulamada. Şehrini seç, bu akşam neler var hemen gör; sevdiğin etkinliği takip et, bir şey değişirse ilk sen öğren 🔔\n\n📲 Uygulamamızı indirin: nevarneyok.net.tr/indir (bağlantı profilde)\nÜcretsiz · Android ve iPhone\n\n#nevarneyok #etkinlik #ankara #istanbul #izmir #konser #tiyatro #standup #sinema #haftasonu` },
  { id: "uygulama-sehrini-sec", kick: "81 il · bir kaydır, bir dokun", h: "ŞEHRİNİ SEÇ,<br><em>NE VAR NE YOK GÖR.</em>", sub: `${NM(A)}, ${NM(B)}, ${NM(Cc)}… 81 il tek tekerlekte. Kaydır, şehrin ortaya gelsin.`,
    stage: (s) => P("tekerlek", s ? 480 : 400, s ? 110 : 110, s ? 30 : 20, -5, 1) + P(`sehir_${A}`, s ? 400 : 340, s ? 580 : 590, s ? 190 : 120, 6, 2, NM(A)) + RIBBON(s ? 150 : 90, -4),
    cap: `Şehrini seç, ne var ne yok gör 📍\n\n${NM(A)}, ${NM(B)}, ${NM(Cc)}, ${NM(D)}… 81 il tek tekerlekte: kaydır, şehrin ortaya gelsin, dokun. Bu akşam, hafta sonu, vizyondaki filmler… hepsi karşında.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #ankara #istanbul #izmir #konser #tiyatro #sinema #haftasonu` },
  { id: "uygulama-takip", kick: "Takip et, rahat et", h: "HİÇBİR ŞEYİ<br><em>KAÇIRMA.</em>", sub: "Takip ettiğin etkinlikte iptal, erteleme, saat ya da yer değişirse ilk senin haberin olur.",
    stage: (s) => P(shots.takip ? "takip" : "etkinlik", s ? 500 : 430, s ? 290 : 325, s ? 150 : 40, 0, 1, NM(A)) +
      NOTE("Yarın akşam! ⏰", "Takip ettiğin etkinlik yarın. Biletini unutma 😉", s ? 70 : 40, s ? 30 : 110, s ? 600 : 520, "şimdi") +
      NOTE("Saat değişti 🔔", "Takip ettiğin etkinliğin saati güncellendi, bir bak.", s ? 420 : 480, s ? 560 : 520, s ? 600 : 520, "2 sa önce"),
    cap: "Takip et, hiçbir şeyi kaçırma 🔔\n\nGitmek istediğin etkinliğe \"Takip et\" de; iptal, erteleme, saat ya da yer değişikliğinde bildirimle ilk sen öğren. Günü gelince de \"Hadi, bugün o gün!\" diye haber veriyoruz 🎉 81 ilin hangisinde olursan ol.\n\nTakip listen yalnızca senin telefonunda kalır; üyelik yok, giriş yok.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #konser #tiyatro #bildirim #haftasonu" },
  { id: "uygulama-sana-gore", kick: "Filtrele, kişiselleştir", h: "TAM<br><em>SANA GÖRE.</em>", sub: "Ne zaman, hangi tür, hangi saat, kimlerle… Seç, sana uygun olanlar öne çıksın.",
    stage: (s) => P("filtre", s ? 450 : 390, s ? 80 : 110, s ? 60 : 30, -5, 1) + P("kisisel", s ? 450 : 390, s ? 540 : 570, s ? 220 : 70, 5, 2) +
      `<div class="tag" style="left:${s ? 90 : 60}px;bottom:${s ? 110 : 100}px;z-index:3">🎸 Konser</div><div class="tag w" style="left:${s ? 290 : 250}px;bottom:${s ? 90 : 80}px;z-index:3">Hafta sonu</div><div class="tag" style="left:${s ? 520 : 480}px;bottom:${s ? 110 : 100}px;z-index:3">👨‍👩‍👧 Aile</div>`,
    cap: "Tam sana göre ✨\n\nKonser mi, tiyatro mu, stand-up mı? Bu akşam mı, hafta sonu mu? Ailecek mi? Seç; \"Senin için\" rafı ve sıralama sana göre oluşsun. Seçimlerin yalnızca senin telefonunda kalır.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #konser #tiyatro #standup #aile #haftasonu" },
  { id: "uygulama-sinema", kick: "Vizyonda ne var?", h: "SEANSLAR<br><em>SALON SALON.</em>", sub: `${DAN(A)} ${YA(B)}, şehrindeki sinemaların seansları gün gün, salon salon.`,
    stage: (s) => P(`sinema_${B}`, s ? 440 : 380, s ? 80 : 110, s ? 60 : 30, -5, 1, NM(B)) + P(`sinema_${A}`, s ? 440 : 380, s ? 560 : 590, s ? 200 : 70, 5, 2, NM(A)) +
      `<div class="tag" style="left:${s ? 70 : 60}px;bottom:${s ? 120 : 90}px;z-index:3">🍿 Vizyonda</div>`,
    cap: `Vizyonda ne var? 🍿\n\n${DAN(A)} ${YA(B)}, 81 ilde sinemaların seansları gün gün, salon salon. Filmi seç, saatini bul, bilete tek dokunuşla geç.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #sinema #vizyon #film #seans #ankara #istanbul` },
];

/* --- afişli reklamlar (kullanıcı: "afişler, il seçme gözüksün, bir sürü tanıtım fotoğrafı") ---
   Afişler değiştirilmeden, kırpılmadan sığdırılır; her birinin altında "Görsel: <kaynak>". Yüklenmeyen afiş çıkarılır. Fiyat yok. */
const today = todayIST(), wk = new Date(Date.parse(today + "T12:00:00Z") + 7 * 864e5).toISOString().slice(0, 10);
const BIGV = /arena|psm|akm|kongre|congresium|opera|cso|stadyum|jolly joker|bostanci|volkswagen|harbiye|zorlu|if performance|bilkent|devlet tiyatro|sahne/i;
const fold = (t) => String(t || "").toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşöçı]+/g, "");
async function topOf(c, n = 8) {
  const f = c === "ankara" ? "data/events.json" : `data/c/${c}.json`;
  const L = (JSON.parse(await readFile(join(ROOT, f), "utf8").catch(() => "{}")).events || []).filter((e) => e.img && e.d >= today && e.d <= wk && !/iptal|ertelendi/.test(e.status || ""));
  const sc = (e) => (e.tickets || []).length * 2 + (BIGV.test(e.venue || "") ? 3 : 0) + (["konser", "tiyatro", "standup", "festival"].includes(e.cat) ? 2 : 0);
  const seen = new Set(), seenI = new Set(), out = [];
  for (const e of L.sort((a, b) => sc(b) - sc(a))) { const k = fold(e.title).slice(0, 22); if (seen.has(k) || seenI.has(e.img)) continue; seen.add(k); seenI.add(e.img); out.push({ ...e, cityName: NM(c) }); if (out.length >= n) break; }
  return out;
}
const GUN = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"], AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const dd = (d) => { const x = new Date(d + "T12:00:00"); return d === today ? "Bugün" : `${x.getDate()} ${AYK[x.getMonth()]} ${GUN[x.getDay()]}`; };
const escH = (t) => String(t || "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
const PCARD = (e, city = false) => `<figure class="pc"><div class="pi"><img class="pb" src="${escH(e.img)}" alt="" referrerpolicy="no-referrer"><img class="pf" src="${escH(e.img)}" alt="" referrerpolicy="no-referrer" onerror="this.closest('.pc').remove()"></div><figcaption>${city ? `<span class="cy">📍 ${escH(e.cityName)}</span>` : ""}<b>${escH(e.title)}</b><small>${dd(e.d)}${e.t ? " · " + escH(e.t) : ""}</small><i>Görsel: ${escH(e.imgBy || "kaynak site")}</i></figcaption></figure>`;
const PGRID = (L, cols, city) => `<div class="pgr" style="--c:${cols}">${L.map((e) => PCARD(e, city)).join("")}</div>`;
CSS_EXTRA = `.pgr{position:absolute;inset:0 56px 40px;display:grid;grid-template-columns:repeat(var(--c),1fr);gap:22px;align-content:start}
.pc{margin:0;display:flex;flex-direction:column;gap:10px;min-width:0}
.pi{position:relative;aspect-ratio:830/1200;border-radius:22px;overflow:hidden;background:#15121f;box-shadow:0 0 0 1.5px #ffffff1f inset,0 30px 60px -20px #000c}
.pi .pb{position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:blur(24px) brightness(.55)}
.pi .pf{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.pc figcaption{display:flex;flex-direction:column;gap:4px}
.pc b{font:900 26px/1 Archivo,Arial,sans-serif;font-stretch:78%;text-transform:uppercase;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pc small{font:700 20px/1.1 "Inter Tight",Arial,sans-serif;color:#c4b5fd}
.pc i{font:500 14px/1 "Inter Tight",Arial,sans-serif;font-style:normal;color:#ffffff70}
.pc .cy{align-self:flex-start;font:800 16px/1 "Inter Tight",Arial,sans-serif;padding:7px 11px;border-radius:99px;background:#8b5cf6;margin-bottom:2px}
.pgr.c2 .pc b{font-size:34px}`;

const FEAT = await (async () => { const all = []; for (const c of CITIES_) all.push(...(await topOf(c, 4)).map((e) => ({ ...e, c }))); // illere sırayla
  const by = CITIES_.map((c) => all.filter((e) => e.c === c)), out = []; for (let r = 0; r < 4; r++) for (const L of by) if (L[r]) out.push(L[r]); return out; })();
ADS.push({ id: "uygulama-afisler", kick: `${UP(A)} · ${UP(B)} · ${UP(Cc)} · ${UP(D)}`, h: "BU HAFTA<br><em>NE VAR NE YOK?</em>", sub: "Türkiye'nin dört bir yanından bu haftanın öne çıkanları. Daha fazlası uygulamada.",
  stage: (s) => PGRID(FEAT.slice(0, s ? 9 : 6), 3, true),
  cap: `Bu hafta ne var ne yok? 🎟️\n\n${NM(A)}, ${NM(B)}, ${NM(Cc)}, ${NM(D)}… 81 ilden bu haftanın öne çıkan konserleri, oyunları, gösterileri. Şehrini seç, hepsini afiş afiş gör.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\nGörseller etkinliklerin kendi afişleridir; son durumu bilet sitesinden kontrol et.\n\n#nevarneyok #etkinlik #konser #tiyatro #haftasonu #${CITIES_.join(" #")}` });
for (const c of CITIES_) {
  const L = await topOf(c, 6); if (L.length < 4) continue;
  ADS.push({ id: `uygulama-${c}`, kick: `📍 ${UP(c)} · bu hafta`, h: `${UP(c)}'${back(NM(c)) ? "DA" : "DE"}<br><em>NE VAR NE YOK?</em>`.replace(/'(D)/, (m, d) => /[fsthçşkp]$/i.test(NM(c)) ? "'T" : "'D"), sub: `${NM(c)}'${/[fsthçşkp]$/i.test(NM(c)) ? "t" : "d"}${back(NM(c)) ? "a" : "e"} bu haftanın öne çıkanları. Hepsi, saatleri ve sinema seansları uygulamada.`,
    stage: (s) => s ? PGRID(L.slice(0, 4), 2) .replace('class="pgr"', 'class="pgr c2" style="--c:2;right:470px"') + P(`raflar_${c}`, 380, 640, 60, 5, 3, NM(c))
      : PGRID(L.slice(0, 3), 3).replace('class="pgr"', 'class="pgr" style="--c:3;right:420px;--x:0"') + P(`sehir_${c}`, 340, 700, 20, 5, 3, NM(c)),
    cap: `${NM(c)}'${/[fsthçşkp]$/i.test(NM(c)) ? "t" : "d"}${back(NM(c)) ? "a" : "e"} bu hafta ne var ne yok? 📍\n\nKonserler, oyunlar, stand-up'lar ve sinema seansları; hepsi afiş afiş, saat saat Ne Var Ne Yok'ta. Sen de şehrini seç, hemen gör.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\nGörseller etkinliklerin kendi afişleridir; son durumu bilet sitesinden kontrol et.\n\n#nevarneyok #${c} #${c}etkinlik #konser #tiyatro #sinema #haftasonu` });
}
// il seçimi büyük: tekerlek tek başına, çevresinde il şeridi
ADS.push({ id: "uygulama-hangi-sehir", kick: "81 il seni bekliyor", h: "HANGİ<br><em>ŞEHİRDESİN?</em>", sub: "Tekerleği çevir, şehrini seç: o ilin konserleri, oyunları, sinema seansları karşında.",
  stage: (s) => RIBBON(s ? 620 : 360, 5) + P("tekerlek", s ? 520 : 430, s ? 280 : 325, s ? 20 : 10, -3, 2) + RIBBON(s ? 180 : 110, -5),
  cap: `Hangi şehirdesin? 📍\n\n${NM(A)}, ${NM(B)}, ${NM(Cc)}, ${NM(D)}… 81 il tek tekerlekte. Çevir, şehrini seç; o ilin konserleri, oyunları ve sinema seansları karşında.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #türkiye #${CITIES_.join(" #")}` });

const html = (ad, story) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}${CSS_EXTRA}</style></head><body>${WALL}<div class="bg"></div>
<div class="pg" style="--top:${story ? 230 : 70}px;--bot:${story ? 220 : 56}px;--hs:${story ? 128 : 112}px">${LOGOH}<div class="kick">${ad.kick}</div><h1>${ad.h}</h1>${story ? `<p class="sub">${ad.sub}</p>` : ""}
<div class="stage">${ad.stage(story)}</div>${CTA}</div>
<script>document.fonts.ready.then(()=>{const c=document.querySelector(".cloud");if(c){let k=1;const S=[...c.children].map(x=>parseFloat(x.style.fontSize));for(let t=0;t<40&&c.scrollHeight>c.clientHeight+2;t++){k*=.95;c.children.length&&[...c.children].forEach((x,i)=>x.style.fontSize=S[i]*k+"px")}}})</script></body></html>`;

const out = [];
const cp = await browser.newPage({ deviceScaleFactor: 1 });
for (const ad of ADS) {
  for (const story of [false, true]) {
    await cp.setViewportSize({ width: 1080, height: story ? 1920 : 1350 });
    await cp.setContent(html(ad, story), { waitUntil: "networkidle" }); await cp.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; }); await cp.waitForTimeout(300);
    const file = `${ad.id}-${story ? "hikaye" : "gonderi"}.png`;
    await cp.screenshot({ path: join(OUT, file) }); out.push({ file, type: story ? "STORY" : "POST", caption: ad.cap }); log(`reklam: ${file}`);
  }
}
/* --- VİTRİN: Apple tanıtımı gibi kaydırmalı gönderi (kullanıcı isteği, 15.11.2026: "Instagram portre, temamızı yansıtan, Apple kalitesinde uygulama görselleri").
   6 sayfa 1080×1350: sade ortalı başlık, büyük gerçek ekranlı telefonlar, yansıma, mor ışık; kalabalık etiket yok. */
const ICON = "data:image/png;base64," + (await readFile(join(ROOT, "icons/icon-512.png"))).toString("base64");
const VCSS = `.v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.v .vg{position:absolute;inset:0;background:radial-gradient(60% 34% at 50% 72%,#8b5cf65c,transparent 70%),radial-gradient(50% 24% at 50% 0%,#8b5cf628,transparent 70%)}
.v .vl{position:relative;margin-top:64px;height:46px}.v .vl img{height:100%}
.v .ve{position:relative;margin-top:26px;font:700 26px/1 "Inter Tight",Arial,sans-serif;color:#c4b5fd}
.v h2{position:relative;margin-top:14px;font:900 104px/.86 Archivo,"Arial Narrow",Arial,sans-serif;font-stretch:70%;text-transform:uppercase;letter-spacing:-.005em}
.v h2 em{font-style:normal;color:#a78bfa}
.v .vs{position:relative;margin-top:18px;max-width:760px;font:600 29px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffb0}
.v .vst{position:absolute;left:0;right:0;bottom:0;top:var(--st,560px);-webkit-mask-image:linear-gradient(#000 78%,transparent 96%);mask-image:linear-gradient(#000 78%,transparent 96%)}
.v .ph .pl{display:none}
.v .vf{position:absolute;left:0;right:0;bottom:30px;display:flex;justify-content:center;align-items:center;gap:14px;font:700 22px/1 "Inter Tight",Arial,sans-serif;color:#ffffff90}
.v .vf b{color:#fff}.v .vf i{font-style:normal;color:#ffffff40}
.v .bub{text-align:left}
.v .ic{position:relative;margin-top:150px;width:260px;height:260px;border-radius:60px;box-shadow:0 0 0 2px #ffffff22,0 40px 90px -20px #000,0 0 120px #8b5cf699}
.v .btn{position:relative;margin-top:60px;display:inline-flex;align-items:center;gap:14px;padding:26px 46px;border-radius:99px;background:#fff;color:#0a0a10;font:900 40px/1 Archivo,Arial,sans-serif;font-stretch:84%;text-transform:uppercase;box-shadow:0 0 70px #8b5cf688}
.v .btn svg{width:34px;height:34px}
.v .url{position:relative;margin-top:28px;font:800 34px/1 "Inter Tight",Arial,sans-serif;color:#c4b5fd}
.v .pills{position:relative;margin-top:34px;display:flex;gap:12px}.v .pills span{font:700 22px/1 "Inter Tight",Arial,sans-serif;padding:13px 20px;border-radius:99px;background:#ffffff10;box-shadow:0 0 0 1.5px #ffffff22 inset}`;
const VF = (n) => `<div class="vf"><b>nevarneyok.net.tr/indir</b><i>·</i><span>${n}/6</span></div>`;
const VP = (k, w, x, y, r = 0, z = 1) => P(k, w, x, y, r, z);
const VITRIN = [
  { n: 1, e: "81 il · tek uygulama", h: "NE VAR NE YOK.<br><em>ARTIK CEBİNDE.</em>", s: "Konser, tiyatro, stand-up ve sinema. Hangi ildeysen.", st: 520,
    body: () => VP("tekerlek", 330, 80, 150, -9, 1) + VP(`sehir_${A}`, 380, 350, 60, 0, 3) + VP(`sinema_${B}`, 330, 670, 150, 9, 1) },
  { n: 2, e: "Bir kaydır, bir dokun", h: "ŞEHRİNİ<br><em>SEÇ.</em>", s: "81 il tek tekerlekte. Ortaya gelen il büyür, dokun ve gir.", st: 500,
    body: () => VP("tekerlek", 440, 320, 40, 0, 2) },
  { n: 3, e: "Afiş afiş, raf raf", h: "BU AKŞAM<br><em>NE VAR?</em>", s: `${NM(A)}, ${NM(B)}, ${NM(Cc)}… Bu akşam, hafta sonu, vizyondakiler.`, st: 500,
    body: () => VP(`raflar_${A}`, 380, 150, 60, -5, 1) + VP(`raflar_${B}`, 380, 550, 110, 5, 2) },
  { n: 4, e: "Takip et, rahat et", h: "HİÇBİR ŞEYİ<br><em>KAÇIRMA.</em>", s: "İptal, erteleme, saat ya da yer değişirse ilk sen öğren.", st: 500,
    body: () => VP(shots.takip ? "takip" : "etkinlik", 440, 320, 70, 0, 2) + NOTE("Yarın akşam! ⏰", "Takip ettiğin etkinlik yarın. Biletini unutma 😉", 60, 10, 500, "şimdi") },
  { n: 5, e: "Vizyonda ne var?", h: "SEANSLAR<br><em>SALON SALON.</em>", s: "Şehrindeki sinemalar gün gün, saat saat.", st: 500,
    body: () => VP(`sinema_${A}`, 380, 150, 110, -5, 1) + VP(`sinema_${B}`, 380, 550, 60, 5, 2) },
  { n: 6, end: true },
];
const vhtml = (v) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}${VCSS}</style></head><body><div class="v"><div class="vg"></div>
${v.end ? `<div class="vl"><img src="${LOGO}" alt="Ne Var Ne Yok"></div><img class="ic" src="${ICON}" alt=""><h2 style="margin-top:60px">HEMEN<br><em>İNDİR.</em></h2>
<div class="pills"><span>Ücretsiz</span><span>Üyelik yok</span><span>Android · iPhone</span><span>81 il</span></div>
<div class="btn">Uygulamayı indir<svg viewBox="0 0 24 24"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="url">nevarneyok.net.tr/indir</div>
<div class="os" style="position:absolute;bottom:34px;left:0;right:0"><span>by</span>${OS}<em>one<b>side</b></em></div>`
  : `<div class="vl"><img src="${LOGO}" alt="Ne Var Ne Yok"></div><div class="ve">${v.e}</div><h2>${v.h}</h2><p class="vs">${v.s}</p><div class="vst" style="--st:${v.st}px">${v.body()}</div>${VF(v.n)}`}
</div></body></html>`;
for (const v of VITRIN) {
  await cp.setViewportSize({ width: 1080, height: 1350 });
  await cp.setContent(vhtml(v), { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); await cp.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; }); await cp.waitForTimeout(300);
  const file = `vitrin-${v.n}.png`; await cp.screenshot({ path: join(OUT, file) }); log(`vitrin: ${file}`);
}
out.push({ file: VITRIN.map((v) => `vitrin-${v.n}.png`).join(","), type: "CAROUSEL", caption: `Ne Var Ne Yok artık cebinde 📲✨\n\n${DAN(A)} ${YA(B)}, 81 ilin konserleri, tiyatroları, stand-up'ları ve sinema seansları tek uygulamada. Kaydır, gör 👉\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\nÜcretsiz · üyelik yok · Android ve iPhone\n\n#nevarneyok #etkinlik #konser #tiyatro #standup #sinema #haftasonu #ankara #istanbul #izmir` });

await writeFile(join(OUT, "uygulama-reklam.json"), JSON.stringify({ city: cityName, posts: out }, null, 2));
await browser.close(); srv.close();
log(`Uygulama reklamları hazır: ${out.length} görsel → ${OUT}`);
