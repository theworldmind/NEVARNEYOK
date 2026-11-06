// Instagram paylaşım seti: her sabah günün görsellerini ve açıklama metnini hazırlar.
// Çıktı: paylas/ klasörü (gönderi 1080×1350, hikâye 1080×1920, açıklama metni) ve paylas/index.html
// Paylaşan kişi telefondan siteadresi/paylas/ sayfasını açar, görseli indirir, metni kopyalar, paylaşır.
import { join } from "node:path";
import { rm, mkdir } from "node:fs/promises";
import { ROOT, esc, readJSON, writeText, writeJSON, todayIST, log, slugOf } from "./lib/util.mjs";
import { CATS, CAT_COLOR, AY, fmtDate, dayName, dayShort, fmtTL, minPrice, pickTop, onlyFreshPrices, weekendRange, addDaysISO, pdate, siteUrl, siteConfig } from "./lib/site.mjs";

const OUT = join(ROOT, "paylas");
const data0 = await readJSON(join(ROOT, "data/events.json"), { events: [] });
const data = { ...data0, events: onlyFreshPrices(data0.events, data0.baseline) };
const BASE = await siteUrl();
const CFG = await siteConfig();
const domain = BASE ? BASE.replace(/^https?:\/\//, "") : "nevarneyok";
const today = todayIST();
const all = data.events.filter((e) => e.d >= today);
const dow = pdate(today).getUTCDay();

/* ---------- Bugün ne paylaşılacak? ---------- */
const sets = [];
const wk = weekendRange(today);
if (dow === 1) { // Pazartesi: haftanın programı
  const end = addDaysISO(today, 6);
  sets.push({ id: "hafta", title: "Bu hafta Ankara'da", sub: `${fmtDate(today)} – ${fmtDate(end)}`, list: all.filter((e) => e.d <= end) });
} else if (dow === 4 || dow === 5) { // Perşembe/Cuma: hafta sonu
  sets.push({ id: "hafta-sonu", title: "Hafta sonu Ankara'da", sub: `${fmtDate(wk.from)} – ${fmtDate(wk.to)}`, list: all.filter((e) => e.d >= wk.from && e.d <= wk.to) });
} else {
  let day = today, list = all.filter((e) => e.d === today && !(e.t && e.t < "12:00"));
  if (list.length < 3) { day = addDaysISO(today, 1); list = all.filter((e) => e.d === day); }
  sets.push({ id: "gun", title: day === today ? "Bugün Ankara'da" : "Yarın Ankara'da", sub: `${fmtDate(day)} ${dayName(day)}`, list });
}
const fresh = all.filter((e) => e.firstSeen && e.firstSeen !== data.baseline && (Date.now() - Date.parse(e.firstSeen)) / 864e5 <= 2 && e.status !== "tukendi");
if (fresh.length >= 3) sets.push({ id: "yeni", title: "Yeni satışa çıktı", sub: "Son iki günde eklenenler", list: fresh });
const free = all.filter((e) => e.d <= addDaysISO(today, 7) && /ücretsiz/i.test((e.note || "") + (e.desc || "")));
if (free.length >= 3 && dow === 2) sets.push({ id: "ucretsiz", title: "Bu hafta ücretsiz", sub: "Ankara'da biletsiz etkinlikler", list: free });

/* ---------- Görsel şablonu ---------- */
function html(set, top, w, h) {
  const story = h > 1500;
  const rows = top.map((e) => {
    const p = minPrice(e), d = pdate(e.d);
    return `<li style="--c:${CAT_COLOR[e.cat] || "#ff3b6b"}"><div class="dt"><b>${d.getUTCDate()}</b><span>${AY[d.getUTCMonth()].slice(0, 3)}</span><i>${dayShort(e.d)}</i></div>
<div class="tx"><small>${esc(CATS[e.cat] || "")}${e.t ? " · " + esc(e.t) : ""}</small><strong>${esc(e.title)}</strong><em>${esc(e.venue)}</em></div>${p ? `<div class="pr">${esc(fmtTL(p))}<small>'den</small></div>` : ""}</li>`;
  }).join("");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,600..800&family=Onest:wght@500;600;700&display=swap">
<style>
*{box-sizing:border-box;margin:0}
body{width:${w}px;height:${h}px;overflow:hidden;color:#fff;font-family:Onest,system-ui,sans-serif;background:
 radial-gradient(70% 40% at 0% 0%,rgba(255,59,107,.35),transparent 70%),radial-gradient(60% 40% at 100% 60%,rgba(124,92,255,.35),transparent 70%),
 radial-gradient(60% 30% at 30% 100%,rgba(255,179,92,.25),transparent 70%),linear-gradient(180deg,#0b1030,#1d1f4a 60%,#3a2d5c);
 padding:${story ? "150px 70px 140px" : "70px 64px 60px"};display:flex;flex-direction:column}
.logo{font:800 ${story ? 60 : 52}px/.85 "Bricolage Grotesque","Arial Narrow",Arial,sans-serif;font-stretch:76%;letter-spacing:-.03em}
.logo b{color:#ff3b6b}.city{font:600 18px Onest,Arial,sans-serif;letter-spacing:.55em;opacity:.75;margin-top:12px}
h1{font:800 ${story ? 104 : 80}px/.9 "Bricolage Grotesque","Arial Narrow",Arial,sans-serif;font-stretch:80%;letter-spacing:-.035em;text-transform:uppercase;margin-top:${story ? 90 : 34}px}
.sub{font:600 30px Onest,Arial,sans-serif;opacity:.85;margin-top:14px}
ul{list-style:none;padding:0;margin-top:${story ? 60 : 28}px;display:flex;flex-direction:column;gap:${story ? 22 : 12}px;flex:1;min-height:0}
li{display:grid;grid-template-columns:110px 1fr auto;gap:22px;align-items:center;background:#fffefb;color:#11132b;border-radius:22px;padding:${story ? "24px 26px" : "13px 22px"};box-shadow:inset 10px 0 0 var(--c)}
.dt{display:flex;flex-direction:column;align-items:center;line-height:1}
.dt b{font:800 ${story ? 58 : 50}px "Bricolage Grotesque","Arial Narrow",Arial,sans-serif;font-stretch:80%}.dt span{font:700 20px Onest,Arial,sans-serif;text-transform:uppercase;color:#666a82}.dt i{font:600 17px Onest,Arial,sans-serif;font-style:normal;color:#666a82;margin-top:4px}
.tx{min-width:0;display:flex;flex-direction:column;gap:4px}
.tx small{font:700 19px Onest,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--c)}
.tx strong{font:800 ${story ? 40 : 36}px/1.05 "Bricolage Grotesque","Arial Narrow",Arial,sans-serif;font-stretch:88%;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tx em{font:600 22px Onest,Arial,sans-serif;font-style:normal;color:#666a82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr{font:800 34px "Bricolage Grotesque","Arial Narrow",Arial,sans-serif;white-space:nowrap;text-align:right}.pr small{display:block;font:600 17px Onest,Arial,sans-serif;color:#666a82}
.foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px;font:600 24px Onest,Arial,sans-serif}
.foot .u{font:800 30px "Bricolage Grotesque","Arial Narrow",Arial,sans-serif;background:#ff3b6b;padding:12px 22px;border-radius:999px}
.foot span{opacity:.8;max-width:55%}
</style></head><body>
<div class="logo">NE VAR<br>NE YOK<b>?</b></div><div class="city">ANKARA</div>
<h1>${esc(set.title)}</h1><div class="sub">${esc(set.sub)} · ${set.list.length} etkinlik</div>
<ul>${rows}</ul>
<div class="foot"><span>Etkinlik listesi ve bilet bağlantıları</span><div class="u">${esc(domain)}</div></div>
</body></html>`;
}

function caption(set, top) {
  const lines = top.map((e) => `📍 ${fmtDate(e.d)}${e.t ? " " + e.t : ""} · ${e.title} — ${e.venue}${minPrice(e) ? ` (${fmtTL(minPrice(e))}'den)` : ""}`);
  const tags = ["#ankara", "#ankaraetkinlik", "#ankarakonser", "#ankaratiyatro", "#başkent", "#neyapsam", "#hafta sonu".replace(" ", "")];
  const cats = [...new Set(top.map((e) => e.cat))].map((c) => ({ konser: "#konser", tiyatro: "#tiyatro", standup: "#standup", sahne: "#opera #bale", cocuk: "#çocuketkinliği", festival: "#festival", parti: "#parti", atolye: "#atölye", sinema: "#sinema" })[c]).filter(Boolean);
  return `${set.title}! ${set.sub}\n\n${lines.join("\n")}\n\nBu ${set.list.length} etkinliğin hepsi, bilet siteleri yan yana ve fiyatlarıyla: ${domain} (profildeki bağlantıda)\n\n${[...new Set([...tags, ...cats])].join(" ")}`;
}

/* ---------- Üret ---------- */
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const made = [];
let browser;
try {
  const { chromium } = await import("playwright");
  const opt = { args: ["--no-sandbox"] };
  if (process.env.CHROME_PATH) opt.executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch(opt);
  for (const set of sets) {
    if (!set.list.length) continue;
    const top = pickTop(set.list, 5, all);
    const topStory = pickTop(set.list, 6, all);
    const files = [];
    for (const [kind, w, h, list] of [["gonderi", 1080, 1350, top], ["hikaye", 1080, 1920, topStory]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(html(set, list, w, h), { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      const f = `${set.id}-${kind}.png`;
      await page.screenshot({ path: join(OUT, f) });
      await page.close();
      files.push({ kind, file: f });
    }
    made.push({ ...set, list: undefined, count: set.list.length, files, caption: caption(set, top), events: top.map((e) => ({ title: e.title, link: `${BASE}/etkinlik/${slugOf(e)}/` })) });
  }
} finally { if (browser) await browser.close(); }

await writeJSON(join(OUT, "paylas.json"), { date: today, sets: made }, true);
await writeText(join(OUT, "index.html"), kitPage(made));
log(`Instagram seti: ${made.map((m) => m.id).join(", ") || "yok"} · ${made.reduce((n, m) => n + m.files.length, 0)} görsel`);

function kitPage(made) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Paylaşım seti · ${esc(fmtDate(today))}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0b1030;color:#fff;padding:16px}main{max-width:720px;margin:auto}
h1{font-size:24px;margin:6px 0 4px}p.s{opacity:.75;margin:0 0 18px}section{background:#1d1f4a;border-radius:16px;padding:14px;margin-bottom:18px}
h2{margin:0 0 10px;font-size:20px}.imgs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.imgs a{display:block;text-align:center;color:#fff;font-weight:700;text-decoration:none}
.imgs img{width:100%;border-radius:10px;display:block;margin-bottom:6px}textarea{width:100%;box-sizing:border-box;min-height:220px;border-radius:10px;padding:10px;font:14px/1.45 system-ui;background:#fff;color:#111}
button{margin-top:8px;font:700 15px system-ui;background:#ff3b6b;color:#fff;border:0;border-radius:999px;padding:12px 18px;width:100%}ol{opacity:.85;padding-left:20px}</style></head>
<body><main><h1>Bugünün paylaşım seti</h1><p class="s">${esc(fmtDate(today))} ${esc(dayName(today))} · sistem her sabah yeniler</p>
<ol><li>Görsele dokun, açılınca uzun basıp kaydet (ya da "İndir").</li><li>"Metni kopyala"ya bas.</li><li>Instagram'da gönderi/hikâye olarak paylaş, metni yapıştır.</li></ol>
${made.length ? made.map((m, i) => `<section><h2>${esc(m.title)} · ${esc(m.sub)}</h2><div class="imgs">${m.files.map((f) => `<a href="${f.file}" download><img src="${f.file}" alt="${esc(m.title)} ${f.kind}">${f.kind === "gonderi" ? "Gönderi" : "Hikâye"} · İndir</a>`).join("")}</div>
<textarea id="c${i}" readonly>${esc(m.caption)}</textarea><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('c${i}').value).then(()=>this.textContent='Kopyalandı ✓')">Metni kopyala</button></section>`).join("") : "<p>Bugün için hazır set yok.</p>"}
</main></body></html>`;
}
