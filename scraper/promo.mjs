// Reklam görselleri (kullanıcı isteği, 14.11.2026): site ekran görüntüsü DEĞİL, tasarlanmış tanıtım görselleri.
//   reklam-bugun     "Bugün Ankara'da neler var?"   bugünün afişleri (gönderi 4:5 + hikâye 9:16)
//   reklam-hafta     "Bu hafta Ankara'da neler var?" 7 günün öne çıkanları, gün etiketiyle
//   reklam-uygulama  "Ankara'nın etkinlikleri artık cebinde" uygulama tanıtımı
// Hepsinin altında "Uygulamamızı indirin · nevarneyok.net.tr/indir" çağrısı ve "by oneside".
// Afişler etkinliklerin herkese açık afişleridir: değiştirilmeden (kırpılmadan, sığdırılarak), altında "Görsel: <kaynak>".
// Afişi yüklenmeyen etkinlik görselden çıkarılır; yeterli afiş yoksa o görsel üretilmez. Fiyat yazılmaz.
import { join } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { ROOT, esc, writeJSON, todayIST, log } from "./lib/util.mjs";
import { fmtDate, dayName, addDaysISO } from "./lib/site.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas");
const today = process.env.SOCIAL_DATE || todayIST();
const TEST = process.env.PROMO_TEST_IMG || ""; // yalnızca yerel deneme: bütün afişler yerine bu dosya
const data = JSON.parse(await readFile(join(ROOT, "data/events.json"), "utf8"));
const block = await readFile(join(ROOT, "data/blocklist.txt"), "utf8").catch(() => "");
const nowHM = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
const past = (e) => !process.env.SOCIAL_DATE && e.d === todayIST() && e.t && e.t < nowHM; // gün içinde üretilirse saati geçmiş etkinlik girmez
const ev = data.events.filter((e) => e.img && !e.status && e.d >= today && !past(e));

const GUNK = ["PAZ", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"];
const AYK = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const dd = (iso) => new Date(iso + "T12:00:00");
const BIG = /congresium|cso ada|jolly joker|if performance|ankara arena|mebi|bilkent|opera|devlet tiyatro|akm|ankara spor salonu|chillout|ODTÜ|ccc|holiday inn/i;
const PRI = ["konser", "tiyatro", "standup", "cocuk", "opera", "festival", "sahne", "sergi", "parti", "atolye", "spor", "diger"];
const score = (e) => (BIG.test(e.venue || "") ? 3 : 0) + ((e.tickets || []).length > 1 ? 2 : 0) + (e.price ? 1 : 0) + (["konser", "tiyatro", "standup"].includes(e.cat) ? 1 : 0) + (e.imgBy && !/bilet|passo|biletix|mobilet|bubilet/i.test(e.imgBy) ? 1 : 0);
const norm = (s) => String(s || "").toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşöçı]+/g, "");
const blocked = (e) => block.split("\n").some((l) => { const [k, v] = l.split(":").map((x) => (x || "").trim().toLocaleLowerCase("tr")); return v && ((k === "etkinlik" && norm(e.title).includes(norm(v))) || (k === "mekan" && norm(e.venue).includes(norm(v)))); });

/* Çeşitli seçim: kategorilere sırayla dağıt, aynı ad bir kez, aynı afiş bir kez */
function pick(list, n) {
  const seenT = new Set(), seenI = new Set(), by = {};
  for (const e of [...list].sort((a, b) => score(b) - score(a) || (a.t || "").localeCompare(b.t || ""))) {
    const k = norm(e.title).slice(0, 24); if (seenT.has(k) || seenI.has(e.img) || blocked(e)) continue;
    seenT.add(k); seenI.add(e.img); (by[e.cat] ||= []).push(e);
  }
  const cats = Object.keys(by).sort((a, b) => (PRI.indexOf(a) + 99) % 99 - (PRI.indexOf(b) + 99) % 99), out = [];
  while (out.length < n && cats.some((c) => by[c].length)) for (const c of cats) if (by[c].length && out.length < n) out.push(by[c].shift());
  return out;
}

const LENS = (id) => `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="34%" cy="28%" r="82%"><stop offset="0" stop-color="#FF6B8F"/><stop offset=".55" stop-color="#7C5CFF"/><stop offset="1" stop-color="#1D1F4A"/></radialGradient></defs><path d="M66 66L89 89" stroke="#FF3B6B" stroke-width="15" stroke-linecap="round"/><circle cx="44" cy="44" r="31" fill="none" stroke="#fff" stroke-width="13"/><circle cx="44" cy="44" r="25" fill="url(#${id})"/><path d="M26 34 A20 20 0 0 1 40 22" fill="none" stroke="rgba(255,255,255,.82)" stroke-width="4.5" stroke-linecap="round"/></svg>`;
let lid = 0;
const WORD = (cls = "") => `<div class="wm ${cls}"><span>NE VAR</span><span>NE Y<span class="O">${LENS("l" + ++lid)}</span>K</span></div>`;
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
const CTA = `<div class="cta"><div class="tile">${WORD("sm")}</div><div class="ct"><b>Uygulamamızı indirin</b><span>nevarneyok.net.tr/indir</span><i>Android · iPhone · ücretsiz</i></div><div class="go">İNDİR<svg viewBox="0 0 24 24"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
<div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div>`;

const CSS = `@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,600..800&family=Onest:wght@500;600;700&family=JetBrains+Mono:wght@600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%}
body{position:relative;overflow:hidden;color:#fff;font-family:Onest,system-ui,sans-serif;background:radial-gradient(70% 45% at 12% 4%,rgba(124,92,255,.55),transparent 70%),radial-gradient(60% 40% at 95% 20%,rgba(255,59,107,.38),transparent 70%),radial-gradient(80% 50% at 50% 110%,rgba(124,92,255,.35),transparent 70%),linear-gradient(180deg,#14163a,#0a0b19 60%,#0b0c22)}
body::before{content:"";position:absolute;inset:0;background-image:radial-gradient(1.6px 1.6px at 12% 18%,#fff8,transparent),radial-gradient(1.4px 1.4px at 82% 9%,#fff7,transparent),radial-gradient(1.2px 1.2px at 64% 30%,#fff6,transparent),radial-gradient(1.6px 1.6px at 30% 6%,#fff7,transparent),radial-gradient(1.2px 1.2px at 92% 44%,#fff5,transparent),radial-gradient(1.4px 1.4px at 6% 52%,#fff5,transparent)}
.pg{position:absolute;left:64px;right:64px;top:var(--top);bottom:var(--bot);display:flex;flex-direction:column}
.wm{display:inline-flex;flex-direction:column;font:800 44px/.9 "Bricolage Grotesque",system-ui;font-variation-settings:"wdth" 85;letter-spacing:-.02em}
.wm .O{display:inline-block;width:.86em;height:.86em;vertical-align:-.08em;margin:0 .015em}.wm .O svg{width:100%;height:100%;overflow:visible}
.wm.sm{font-size:21px}
.top{display:flex;justify-content:space-between;align-items:center}
.pill{padding:10px 18px;border-radius:999px;border:1.5px solid rgba(255,255,255,.28);font:700 17px "JetBrains Mono",monospace;letter-spacing:.2em}
h1{margin-top:34px;font:800 92px/.92 "Bricolage Grotesque",system-ui;font-variation-settings:"wdth" 84;letter-spacing:-.03em}
h1 em{font-style:normal;color:#ff3b6b}
.sub{margin-top:16px;font:700 21px "JetBrains Mono",monospace;letter-spacing:.18em;color:rgba(255,255,255,.75)}
.grid{flex:1;display:grid;gap:20px 18px;margin:28px 0 24px;align-content:start;min-height:0}
.c{display:flex;flex-direction:column;min-width:0}
.ph{position:relative;height:var(--ph,260px);border-radius:16px;overflow:hidden;background:#000;box-shadow:0 14px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.1)}
.ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.ph .bg{position:absolute;inset:-20px;width:calc(100% + 40px);height:calc(100% + 40px);object-fit:cover;filter:blur(18px) brightness(.55);transform:scale(1.1)}
.day{position:absolute;left:10px;top:10px;z-index:2;padding:5px 10px;border-radius:9px;background:#ff3b6b;font:800 15px "JetBrains Mono",monospace;letter-spacing:.06em}
.c b{margin-top:10px;font:700 19px/1.15 Onest;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c small{margin-top:3px;font:600 14px Onest;color:rgba(255,255,255,.66);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c u{margin-top:2px;text-decoration:none;font:600 11px "JetBrains Mono",monospace;color:rgba(255,255,255,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cta{display:flex;align-items:center;gap:22px;padding:20px 22px;border-radius:28px;background:linear-gradient(160deg,rgba(30,32,78,.96),rgba(14,15,38,.96));box-shadow:0 0 0 2px rgba(255,59,107,.6),0 20px 44px rgba(0,0,0,.5)}
.tile{display:grid;place-items:center;flex:none;width:104px;height:104px;border-radius:24px;background:radial-gradient(120% 90% at 20% 10%,#3a1f5c,#14163a 55%,#0a0b19);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.16),0 10px 22px rgba(0,0,0,.45)}
.ct{flex:1;display:flex;flex-direction:column;min-width:0}
.ct b{font:800 40px/1 "Bricolage Grotesque";font-variation-settings:"wdth" 86;letter-spacing:-.02em}
.ct span{margin-top:8px;font:700 21px "JetBrains Mono",monospace;color:#ff8aa6}
.ct i{margin-top:6px;font:600 14px "JetBrains Mono",monospace;font-style:normal;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.go{display:flex;align-items:center;gap:8px;flex:none;padding:18px 22px;border-radius:18px;background:linear-gradient(115deg,#ff3b6b,#ff7a59);font:800 22px "Bricolage Grotesque";letter-spacing:.04em;box-shadow:0 10px 24px rgba(255,59,107,.45)}
.go svg{width:26px;height:26px}
.os{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:18px;color:#fff}
.os span{font:300 16px Poppins;opacity:.6}.os svg{width:24px;height:24px;fill:#fff}.os em{font:300 20px/1 Poppins;font-style:normal}.os em b{font-weight:800}
/* uygulama tanıtımı */
.hero{flex:1;position:relative;display:grid;place-items:center;margin:10px 0}
.fan{position:absolute;width:300px;aspect-ratio:830/1200;border-radius:18px;overflow:hidden;background:#000;box-shadow:0 20px 40px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.12)}
.fan img{width:100%;height:100%;object-fit:cover}
.big{position:relative;z-index:3;display:grid;place-items:center;width:330px;height:330px;border-radius:76px;background:radial-gradient(120% 90% at 20% 10%,#3a1f5c,#14163a 55%,#0a0b19);box-shadow:inset 0 0 0 3px rgba(255,255,255,.16),0 30px 70px rgba(0,0,0,.6),0 0 90px rgba(124,92,255,.45)}
.big .wm{font-size:74px}
.feat{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:26px}
.feat span{padding:12px 18px;border-radius:999px;background:rgba(255,255,255,.09);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);font:700 20px Onest}
.feat span::before{content:"✓ ";color:#ff3b6b}`;

function page(w, h, body) {
  const story = h > w * 1.4;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}
:root{--top:${story ? 250 : 64}px;--bot:${story ? 250 : 56}px}</style></head><body>${body}</body></html>`;
}
const credit = (e) => (e.imgBy ? `Görsel: ${esc(e.imgBy)}` : "");
const src = (e) => esc(TEST || e.img);
const card = (e, day) => `<div class="c"><div class="ph"><img class="bg" src="${src(e)}" referrerpolicy="no-referrer" alt=""><img class="po" src="${src(e)}" referrerpolicy="no-referrer" alt="">${day ? `<span class="day">${day}</span>` : ""}</div><b>${esc(e.t ? e.t + " · " : "")}${esc(e.title)}</b><small>${esc(e.venue || "")}</small><u>${credit(e)}</u></div>`;
const dayLbl = (iso) => { const d = dd(iso); return `${GUNK[d.getDay()]} ${d.getDate()}`; };

let browser;
const out = [];
async function render(file, w, h, html, { min = 0, max = 99, sel = ".grid .c" } = {}) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  try {
    await p.setContent(html, { waitUntil: "domcontentloaded" });
    await p.evaluate(async ({ sel, min, max }) => {
      const imgs = [...document.images];
      await Promise.race([Promise.all(imgs.map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 20000))]);
      const ok = (i) => i.complete && i.naturalWidth > 40;
      document.querySelectorAll(sel).forEach((c) => { const i = c.querySelector("img.po,img"); if (i && !ok(i)) c.remove(); });
      [...document.querySelectorAll(sel)].slice(max).forEach((c) => c.remove());
      if (document.querySelectorAll(sel).length < min) document.body.dataset.skip = "1";
      await document.fonts.ready;
    }, { sel, min, max });
    if (await p.evaluate(() => document.body.dataset.skip === "1")) { log(`reklam: ${file} atlandı (yeterli afiş yüklenmedi)`); return null; }
    await p.waitForTimeout(300);
    await p.screenshot({ path: join(OUT, file) });
    out.push(file); return file;
  } finally { await p.close(); }
}

const d0 = dd(today), dateLine = `${d0.getDate()} ${AY[d0.getMonth()].toLocaleUpperCase("tr")} ${["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"][d0.getDay()]}`;
const todayAll = data.events.filter((e) => e.d === today && !e.status).length;
const todayEv = pick(ev.filter((e) => e.d === today), 14);
const week = [];
for (let i = 0; i < 7; i++) { const iso = addDaysISO(today, i); week.push(...pick(ev.filter((e) => e.d === iso), i < 2 ? 3 : 2).map((e) => ({ e, day: dayLbl(iso) }))); }
const weekSorted = week.sort((a, b) => score(b.e) - score(a.e)).slice(0, 18).sort((a, b) => a.e.d.localeCompare(b.e.d) || (a.e.t || "").localeCompare(b.e.t || ""));
const last = dd(addDaysISO(today, 6)), range = `${d0.getDate()}${d0.getMonth() === last.getMonth() ? "" : " " + AYK[d0.getMonth()]}–${last.getDate()} ${AY[last.getMonth()].toLocaleUpperCase("tr")}`;
const weekAll = data.events.filter((e) => e.d >= today && e.d <= addDaysISO(today, 6) && !e.status).length;

const head = (h1, sub) => `<div class="top">${WORD()}<span class="pill">ANKARA</span></div><h1>${h1}</h1><div class="sub">${sub}</div>`;
const bugun = (cols, ph) => `<div class="pg" style="--ph:${ph}px">${head("Bugün Ankara'da<br><em>neler var?</em>", `${dateLine} · ${todayAll} ETKİNLİK`)}<div class="grid" style="grid-template-columns:repeat(${cols},1fr)">${todayEv.map((e) => card(e)).join("")}</div>${CTA}</div>`;
const hafta = (cols, ph) => `<div class="pg" style="--ph:${ph}px">${head("Bu hafta Ankara'da<br><em>neler var?</em>", `${range} · ${weekAll} ETKİNLİK`)}<div class="grid" style="grid-template-columns:repeat(${cols},1fr)">${weekSorted.map((x) => card({ ...x.e, t: "" }, x.day + (x.e.t ? " · " + x.e.t : ""))).join("")}</div>${CTA}</div>`;
const fanEv = pick(ev.filter((e) => e.d <= addDaysISO(today, 3)), 8);
const uyg = (story) => `<div class="pg">${head("Ankara'nın etkinlikleri<br><em>artık cebinde.</em>", "KONSER · TİYATRO · SİNEMA · ÇOCUK · STAND-UP")}
<div class="hero"><div class="fans">${fanEv.map((e, i) => `<div class="fan c" style="transform:translate(${[-250, 250, -170, 170, 0][i % 5]}px,${[30, 30, -60, -60, -120][i % 5]}px) rotate(${[-12, 12, -5, 5, 0][i % 5]}deg);z-index:${i < 2 ? 1 : 0}"><img class="po" src="${src(e)}" referrerpolicy="no-referrer" alt=""></div>`).join("")}</div><div class="big">${WORD()}</div></div>
<div class="feat"><span>Bilet siteleri yan yana</span><span>Sinema seansları</span><span>İptal ve ertelemeler</span><span>Her gün güncel</span>${story ? "<span>Afiş duvarı</span><span>Ücretsiz</span>" : ""}</div>${CTA}
<div style="position:absolute;left:0;right:0;bottom:-34px;text-align:center;font:600 11px 'JetBrains Mono',monospace;color:rgba(255,255,255,.4)">Afişler etkinliklerin kendi sayfalarından; görseller sahiplerine aittir.</div></div>`;

try {
  await mkdir(OUT, { recursive: true });
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const opt = { args: ["--no-sandbox"] }; if (process.env.CHROME_PATH) opt.executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch(opt);
  const fanCSS = `<style>.fans{position:absolute;inset:0;display:grid;place-items:center}.fans .fan{grid-area:1/1}</style>`;
  await render("reklam-bugun.png", 1080, 1350, page(1080, 1350, bugun(3, 262)), { min: 3, max: 6 });
  await render("reklam-bugun-hikaye.png", 1080, 1920, page(1080, 1920, bugun(2, 330)), { min: 4, max: 4 });
  await render("reklam-hafta.png", 1080, 1350, page(1080, 1350, hafta(4, 262)), { min: 4, max: 8 });
  await render("reklam-hafta-hikaye.png", 1080, 1920, page(1080, 1920, hafta(3, 330)), { min: 6, max: 6 });
  await render("reklam-uygulama.png", 1080, 1350, page(1080, 1350, fanCSS + uyg(false)), { min: 2, max: 4, sel: ".fans .c" });
  await render("reklam-uygulama-hikaye.png", 1080, 1920, page(1080, 1920, fanCSS + uyg(true)), { min: 2, max: 5, sel: ".fans .c" });
} finally { if (browser) await browser.close(); }

const CAP = {
  bugun: `Bugün Ankara'da neler var? 👀 ${fmtDate(today)} ${dayName(today)}\n\nKonser, tiyatro, sinema, çocuk etkinlikleri ve daha fazlası tek yerde. Saatler, mekânlar ve bilet siteleri yan yana.\n\n📲 Uygulamamızı indirin: nevarneyok.net.tr/indir\n🔗 Bağlantı profilde\n\nAfişler etkinliklerin kendi sayfalarından alınmıştır; görseller sahiplerine aittir.\n\n#ankara #ankaraetkinlik #ankaradabugün #neyapsam #başkent`,
  hafta: `Bu hafta Ankara'da neler var? 🗓️ ${range.toLocaleLowerCase("tr")}\n\nHaftanın öne çıkan etkinlikleri. Gün gün bütün etkinlikler, sinema seansları ve bilet siteleri: nevarneyok.net.tr\n\n📲 Uygulamamızı indirin: nevarneyok.net.tr/indir\n🔗 Bağlantı profilde\n📌 Kaydet, hafta boyunca lazım olur.\n\nAfişler etkinliklerin kendi sayfalarından alınmıştır; görseller sahiplerine aittir.\n\n#ankara #ankaraetkinlik #buhafta #neyapsam #başkent`,
  uygulama: `Ne Var Ne Yok artık telefonunda 📲\n\nAnkara'nın konserleri, tiyatroları, sinema seansları ve çocuk etkinlikleri; bilet siteleri yan yana, iptal ve ertelemeler işaretli, her gün güncel.\n\nÜcretsiz indir: nevarneyok.net.tr/indir\n🔗 Bağlantı profilde\n\n#ankara #ankaraetkinlik #uygulama #neyapsam #başkent`,
};
await writeJSON(join(OUT, "reklam.json"), { date: today, files: out, captions: CAP }, true);
log(`reklam: ${out.length} görsel → ${out.join(", ")}`);
