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
import { ROOT, log } from "./lib/util.mjs";

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

/* 1) il tekerleği: İstanbul ortada */
await go("#/");
await page.evaluate((id) => { const wl = document.querySelector("#wl"); const li = [...wl.querySelectorAll("li")]; const i = li.findIndex((x) => (x.dataset.id || x.textContent).toLocaleLowerCase("tr").startsWith(id === "istanbul" ? "i̇stanbul" : id) || x.textContent.trim() === "İstanbul"); wl.scrollTop = Math.max(0, i) * 52; }, CITY);
await page.waitForTimeout(700); await snap("tekerlek");

/* 2) şehir sayfası (kayan sayfalar + raflar) */
await page.evaluate((c) => localStorage.setItem("nvny-city", c), CITY);
await go(`#/${CITY}`);
// vitrin (kayan sayfalar) afişi yüklenene kadar bekle; yüklenmeyen sayfayı atla
for (let k = 0; k < 6; k++) {
  const ok = await page.evaluate(() => new Promise((r) => { const s = [...document.querySelectorAll(".stp .sps")]; const c = s.find((x) => { const b = x.getBoundingClientRect(); return b.left >= -5 && b.left < innerWidth / 2; }) || s[0]; const im = c?.querySelector(".po img, img.bg"); if (!im) return r(true); if (im.complete && im.naturalWidth) return r(true); im.addEventListener("load", () => r(true)); im.addEventListener("error", () => r(false)); setTimeout(() => r(im.naturalWidth > 0), 8000); }));
  if (ok) break; await page.click(".stp .nx").catch(() => {}); await page.waitForTimeout(900);
}
const dbg = await page.evaluate(() => [...document.querySelectorAll(".stp .po img.p")].slice(0, 4).map((i) => [i.complete, i.naturalWidth, i.parentNode.className, i.src.slice(0, 80)]));
log("vitrin: " + JSON.stringify(dbg));
await page.evaluate(() => document.querySelectorAll(".ph img.p").forEach((i) => { if (i.complete && i.naturalWidth) i.parentNode.classList.add("ok"); }));
await page.waitForTimeout(600); await snap("sehir");
// biraz aşağı: raflar
await page.evaluate(() => { const r = document.querySelector(".rail"); if (r) scrollTo(0, r.getBoundingClientRect().top + scrollY - 70); });
await settle(700); await snap("raflar");

/* 3) etkinlik sayfası: afişi yüklenmiş, iptal edilmemiş bir etkinlik; Takip et'e dokun */
const ev = await page.evaluate(() => { const L = [...document.querySelectorAll('a.cd[href*="/e/"]')].filter((x) => !x.classList.contains("off")); return (L.find((x) => x.querySelector(".ph.ok img")) || L[0])?.getAttribute("href"); });
if (ev) {
  await go(ev); await snap("etkinlik");
  const f = await page.$("#flw"); if (f) { await f.click(); await page.waitForTimeout(400); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); await snap("takip"); }
}

/* 4) filtreler: hafta sonu + konser/tiyatro seçili */
await go(`#/${CITY}/kesfet?t=haftasonu&k=konser,tiyatro&f=1`); await page.waitForTimeout(700); await snap("filtre");

/* 5) kişiselleştir: birkaç ilgi alanı seçili */
await page.evaluate(() => localStorage.setItem("nvny-prefs", JSON.stringify({ cats: ["konser", "tiyatro", "standup"], ilce: [], when: ["aksam", "haftasonu"], budget: 600, kids: false })));
await go(`#/${CITY}`); const pz = await page.$("#pz"); if (pz) { await pz.click(); await page.waitForTimeout(800); await snap("kisisel"); }
await page.evaluate(() => localStorage.removeItem("nvny-prefs"));

/* 6) sinema */
await go(`#/${CITY}/sinema`); await snap("sinema");
const cityName = await page.evaluate((c) => (window.CITIES || []).find?.((x) => x.id === c)?.name, CITY).catch(() => null) || (CITY === "istanbul" ? "İstanbul" : CITY);

/* --- reklamlar --- */
const LOGO = "data:image/png;base64," + (await readFile(join(ROOT, "brand/logo.png"))).toString("base64");
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
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
.pts{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.pts i{font:700 24px/1 "Inter Tight";font-style:normal;padding:13px 20px;border-radius:99px;background:#ffffff12;box-shadow:0 0 0 1.5px #ffffff20 inset}`;

const PST = (JSON.parse(await readFile(join(ROOT, "data/one-cikan.json"), "utf8").catch(() => "{}")).events || []).map((e) => e.img).filter(Boolean);
const WALL = PST.length ? `<div class="wall">${[...Array(36)].map((_, i) => `<i style="background-image:url('${PST[i % PST.length].replace(/'/g, "%27")}')"></i>`).join("")}</div>` : "";
const LOGOH = `<div class="logo"><img src="${LOGO}" alt="Ne Var Ne Yok"></div>`;
const NOTE = (t, p, x, y, w = 520, when = "şimdi") => `<div class="bub" style="left:${x}px;top:${y}px;--bw:${w}px"><div class="ai"><img src="${LOGO}" alt=""></div><div><b>${t}</b><p>${p}</p></div><small>${when}</small></div>`;

// Her reklam: sahne, yatay/dikey için ayrı konumlar
const ADS = [
  { id: "uygulama-cebinde", kick: "81 ilin etkinlikleri", h: "NE VAR NE YOK,<br><em>ARTIK CEBİNDE.</em>", sub: "Konser, tiyatro, stand-up, sinema seansları. Şehrini seç, hemen gör.",
    stage: (s) => s ? `${phone("raflar", "")}`.replace('class="ph "', `class="ph" style="--pw:400px;left:60px;top:150px;transform:rotate(-8deg)"`) + phone("sehir").replace('class="ph "', `class="ph" style="--pw:470px;left:305px;top:40px;z-index:2"`) + phone("sinema").replace('class="ph "', `class="ph" style="--pw:400px;left:620px;top:150px;transform:rotate(8deg)"`)
      : phone("raflar").replace('class="ph "', `class="ph" style="--pw:330px;left:70px;top:90px;transform:rotate(-8deg)"`) + phone("sehir").replace('class="ph "', `class="ph" style="--pw:380px;left:350px;top:20px;z-index:2"`) + phone("sinema").replace('class="ph "', `class="ph" style="--pw:330px;left:680px;top:90px;transform:rotate(8deg)"`),
    cap: "Ne var ne yok, artık cebinde 📲✨\n\n81 ilin konserleri, tiyatroları, stand-up'ları ve sinema seansları tek uygulamada. Şehrini seç, bu akşam neler var hemen gör; sevdiğin etkinliği takip et, bir şey değişirse ilk sen öğren 🔔\n\n📲 Uygulamamızı indirin: nevarneyok.net.tr/indir (bağlantı profilde)\nÜcretsiz · Android ve iPhone\n\n#nevarneyok #etkinlik #konser #tiyatro #standup #sinema #bugünneyapsak #haftasonu" },
  { id: "uygulama-sehrini-sec", kick: "Bir kaydır, bir dokun", h: "ŞEHRİNİ SEÇ,<br><em>NE VAR NE YOK GÖR.</em>", sub: "81 il tek tekerlekte. Kaydır, şehrin ortaya gelsin, gerisini biz gösterelim.",
    stage: (s) => phone("tekerlek").replace('class="ph "', `class="ph" style="--pw:${s ? 500 : 420}px;left:${s ? 200 : 120}px;top:${s ? 20 : 20}px;transform:rotate(-4deg)"`) +
      phone("sehir").replace('class="ph "', `class="ph" style="--pw:${s ? 380 : 330}px;left:${s ? 600 : 590}px;top:${s ? 200 : 150}px;transform:rotate(6deg);z-index:2"`) +
      `<div class="tag" style="left:${s ? 120 : 80}px;bottom:${s ? 190 : 170}px;z-index:3">📍 81 il</div><div class="tag w" style="left:${s ? 120 : 80}px;bottom:${s ? 110 : 90}px;z-index:3">Tık tık… işte burada 👆</div>`,
    cap: "Şehrini seç, ne var ne yok gör 📍\n\n81 il tek tekerlekte: kaydır, şehrin ortaya gelsin, dokun. Bu akşam, hafta sonu, vizyondaki filmler… hepsi karşında.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #şehir #konser #tiyatro #sinema #haftasonu" },
  { id: "uygulama-takip", kick: "Takip et, rahat et", h: "HİÇBİR ŞEYİ<br><em>KAÇIRMA.</em>", sub: "Takip ettiğin etkinlikte iptal, erteleme, saat ya da yer değişirse ilk senin haberin olur.",
    stage: (s) => phone(shots.takip ? "takip" : "etkinlik").replace('class="ph "', `class="ph" style="--pw:${s ? 500 : 430}px;left:${s ? 290 : 325}px;top:${s ? 150 : 40}px"`) +
      NOTE("Yarın akşam! ⏰", "Takip ettiğin etkinlik yarın. Biletini unutma 😉", s ? 70 : 40, s ? 30 : 110, s ? 600 : 520, "şimdi") +
      NOTE("Saat değişti 🔔", "Takip ettiğin etkinliğin saati güncellendi, bir bak.", s ? 420 : 480, s ? 560 : 520, s ? 600 : 520, "2 sa önce"),
    cap: "Takip et, hiçbir şeyi kaçırma 🔔\n\nGitmek istediğin etkinliğe \"Takip et\" de; iptal, erteleme, saat ya da yer değişikliğinde bildirimle ilk sen öğren. Bir gün önceden de dürtüyoruz 😉\n\nTakip listen yalnızca senin telefonunda kalır; üyelik yok, giriş yok.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #konser #tiyatro #bildirim #haftasonu" },
  { id: "uygulama-sana-gore", kick: "Filtrele, kişiselleştir", h: "TAM<br><em>SANA GÖRE.</em>", sub: "Ne zaman, hangi tür, hangi saat, kimlerle… Seç, sana uygun olanlar öne çıksın.",
    stage: (s) => phone("filtre").replace('class="ph "', `class="ph" style="--pw:${s ? 450 : 390}px;left:${s ? 80 : 110}px;top:${s ? 60 : 30}px;transform:rotate(-5deg)"`) +
      phone("kisisel").replace('class="ph "', `class="ph" style="--pw:${s ? 450 : 390}px;left:${s ? 540 : 570}px;top:${s ? 220 : 70}px;transform:rotate(5deg);z-index:2"`) +
      `<div class="tag" style="left:${s ? 90 : 60}px;bottom:${s ? 110 : 100}px;z-index:3">🎸 Konser</div><div class="tag w" style="left:${s ? 290 : 250}px;bottom:${s ? 90 : 80}px;z-index:3">Hafta sonu</div><div class="tag" style="left:${s ? 520 : 480}px;bottom:${s ? 110 : 100}px;z-index:3">👨‍👩‍👧 Aile</div>`,
    cap: "Tam sana göre ✨\n\nKonser mi, tiyatro mu, stand-up mı? Bu akşam mı, hafta sonu mu? Ailecek mi? Seç; \"Senin için\" rafı ve sıralama sana göre oluşsun. Seçimlerin yalnızca senin telefonunda kalır.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #etkinlik #konser #tiyatro #standup #aile #haftasonu" },
  { id: "uygulama-sinema", kick: "Vizyonda ne var?", h: "SEANSLAR<br><em>SALON SALON.</em>", sub: "Şehrindeki bütün sinemaların seansları gün gün, salon salon. Bilete tek dokunuş.",
    stage: (s) => phone("sinema").replace('class="ph "', `class="ph" style="--pw:${s ? 520 : 440}px;left:${s ? 280 : 320}px;top:${s ? 60 : 20}px"`) +
      `<div class="tag" style="left:${s ? 90 : 70}px;top:${s ? 260 : 160}px;z-index:3">🍿 Vizyonda</div><div class="tag w" style="left:${s ? 690 : 740}px;bottom:${s ? 200 : 170}px;z-index:3">20:30 · 22:45</div>`,
    cap: "Vizyonda ne var? 🍿\n\nŞehrindeki sinemaların seansları gün gün, salon salon. Filmi seç, saatini bul, bilete tek dokunuşla geç.\n\n📲 nevarneyok.net.tr/indir (bağlantı profilde)\n\n#nevarneyok #sinema #vizyon #film #seans #haftasonu" },
];

const html = (ad, story) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${WALL}<div class="bg"></div>
<div class="pg" style="--top:${story ? 230 : 70}px;--bot:${story ? 220 : 56}px;--hs:${story ? 136 : 118}px">${LOGOH}<div class="kick">${ad.kick}</div><h1>${ad.h}</h1>${story ? `<p class="sub">${ad.sub}</p>` : ""}
<div class="stage">${ad.stage(story)}</div>${CTA}</div></body></html>`;

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
await writeFile(join(OUT, "uygulama-reklam.json"), JSON.stringify({ city: cityName, posts: out }, null, 2));
await browser.close(); srv.close();
log(`Uygulama reklamları hazır: ${out.length} görsel → ${OUT}`);
