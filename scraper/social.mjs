// Instagram paylaşım seti: her sabah günün görsellerini ve açıklama metnini hazırlar.
// Çıktı: paylas/ klasörü (gönderi 1080×1350 portre, hikâye 1080×1920, açıklama metni) ve paylas/index.html
//
// Görseller sitenin kendisiyle çizilir: depo yerel bir sunucuda açılır, istenen tema (Sabah / Gün /
// Gün batımı / Gece) seçilir, etkinlikler sitedeki card() ile gerçek dikey bilet kartı olarak üretilir.
// Böylece logo, mercek renkleri, kart tasarımı ve kartlardaki etkinlik saatindeki hava sitedekiyle aynı olur.
// Görsellerde ve açıklamalarda fiyat yoktur.
//
// Günde iki set:
//   1) "Bu akşam Ankara'da"  (Gün batımı teması)        → 12:00 paylaşımı
//   2) Pazartesi "Bu hafta", Perşembe/Cuma "Hafta sonu", diğer günler "Yeni satışa çıktı",
//      yeterli yeni yoksa "Yarın"  (Gece / Gün teması) → 19:00 paylaşımı
import { join, extname, normalize } from "node:path";
import { rm, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { ROOT, esc, readJSON, writeText, writeJSON, todayIST, log, slugOf } from "./lib/util.mjs";
import { fmtDate, dayName, pickTop, weekendRange, addDaysISO, pdate, siteUrl } from "./lib/site.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas");
const data = await readJSON(join(ROOT, "data/events.json"), { events: [] });
const BASE = await siteUrl();
const DOMAIN = "nevarneyok.net.tr";
const today = process.env.SOCIAL_DATE || todayIST();
// Ankara dışındaki mekânlar zaman zaman kaynaklardan karışıyor; paylaşımlara girmesin.
const AWAY = /kocaeli|istanbul|izmir|bursa|eski[şs]ehir|konya|antalya|adana|mersin|kayseri|samsun/i;
const all = data.events.filter((e) => e.d >= today && !AWAY.test(e.venue || "") && e.status !== "iptal");
const dow = pdate(today).getUTCDay();
const AYB = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const upTR = (s) => s.toLocaleUpperCase("tr");

/* ---------- Bugün ne paylaşılacak? ---------- */
const sets = [];
{ // 1) Bu akşam
  let list = all.filter((e) => e.d === today && e.t && e.t >= "17:30" && e.status !== "tukendi");
  if (list.length >= 3) sets.push({ id: "aksam", slot: "12:00", theme: "gunbatimi", h1: "Bu akşam", hl: "Ankara'da", kicker: `ANKARA · ${upTR(fmtDate(today))} ${upTR(dayName(today))}`, sub: `${fmtDate(today)} ${dayName(today)}`, list });
}
{ // 2) Günün ikinci paylaşımı
  const wk = weekendRange(today);
  const fresh = all.filter((e) => e.firstSeen && e.firstSeen !== data.baseline && (Date.now() - Date.parse(e.firstSeen)) / 864e5 <= 2 && e.status !== "tukendi");
  const tom = addDaysISO(today, 1);
  if (dow === 1) {
    const end = addDaysISO(today, 6);
    sets.push({ id: "hafta", slot: "19:00", theme: "gece", h1: "Bu hafta", hl: "Ankara'da", kicker: `ANKARA · ${upTR(fmtDate(today))} – ${upTR(fmtDate(end))}`, sub: `${fmtDate(today)} – ${fmtDate(end)}`, list: all.filter((e) => e.d <= end) });
  } else if (dow === 4 || dow === 5) {
    sets.push({ id: "hafta-sonu", slot: "19:00", theme: "gece", h1: "Hafta sonu", hl: "Ankara'da", kicker: `ANKARA · ${upTR(fmtDate(wk.from))} – ${upTR(fmtDate(wk.to))}`, sub: `${fmtDate(wk.from)} – ${fmtDate(wk.to)}`, list: all.filter((e) => e.d >= wk.from && e.d <= wk.to) });
  } else if (fresh.length >= 4) {
    sets.push({ id: "yeni", slot: "19:00", theme: "gece", h1: "Yeni satışa", hl: "çıktı.", kicker: "ANKARA · SON İKİ GÜNDE EKLENENLER", sub: "Son iki günde eklenenler", list: fresh });
  } else {
    sets.push({ id: "yarin", slot: "19:00", theme: "gun", h1: "Yarın", hl: "Ankara'da", kicker: `ANKARA · ${upTR(fmtDate(tom))} ${upTR(dayName(tom))}`, sub: `${fmtDate(tom)} ${dayName(tom)}`, list: all.filter((e) => e.d === tom) });
  }
}
if (!sets.length) { // Bu akşam az etkinlik varsa yine de günde bir sabit paylaşım olsun
  sets.unshift({ id: "gun", slot: "12:00", theme: "gun", h1: "Bugün", hl: "Ankara'da", kicker: `ANKARA · ${upTR(fmtDate(today))} ${upTR(dayName(today))}`, sub: `${fmtDate(today)} ${dayName(today)}`, list: all.filter((e) => e.d === today) });
}

/* ---------- Açıklama metni (fiyatsız) ---------- */
const EMO = { konser: "🎶", tiyatro: "🎭", standup: "🎤", sahne: "🩰", cocuk: "🧸", festival: "🎪", parti: "🪩", atolye: "🎨", sinema: "🎬" };
const HOOK = {
  aksam: ["Bu akşam ne yapsam diyenler, buraya 👇", "Akşam planın hâlâ yoksa tam zamanı 👇", "Bu akşam Ankara'da sahne ışıkları yanıyor ✨"],
  hafta: ["Bu hafta Ankara'da ne var, hepsi burada 👇", "Haftanın planını şimdiden yap 🗓️"],
  "hafta-sonu": ["Hafta sonu planı arayanlara 👇", "Hafta sonu Ankara'da kaçırılmayacaklar 👇"],
  yeni: ["Biletler yeni satışa çıktı, kaçırmadan bak 🎟️", "Takvime yeni eklenenler geldi 🎟️"],
  yarin: ["Yarın için plan yapmak isteyenlere 👇"],
  gun: ["Bugün Ankara'da neler var? 👇"],
};
const CTA = {
  aksam: ["📌 Kaydet, akşam lazım olur.", "👥 Bu akşam birlikte çıkacağın kişiyi etiketle!"],
  default: ["📌 Kaydet, plan yaparken lazım olur.", "👥 Birlikte gitmek istediğin kişiyi etiketle!"],
};
function caption(set, top) {
  const multi = new Set(top.map((e) => e.d)).size > 1;
  const pick = (a) => a[(pdate(today).getUTCDate()) % a.length];
  const lines = top.map((e) => `${EMO[e.cat] || "📍"} ${multi ? fmtDate(e.d) + (e.t ? " " : "") : ""}${e.t || ""}${e.t || multi ? " · " : ""}${e.title} — ${e.venue}`);
  const tagsBase = ["#ankara", "#ankaraetkinlik", "#ankarakonser", "#ankaratiyatro", "#başkent", "#neyapsam"];
  const tagsCat = [...new Set(top.map((e) => ({ konser: "#konser", tiyatro: "#tiyatro", standup: "#standup", sahne: "#opera #bale", cocuk: "#çocuketkinliği", festival: "#festival", parti: "#ankaraparti", atolye: "#atölye", sinema: "#sinema" })[e.cat]).filter(Boolean))];
  const extra = set.id === "aksam" || set.id === "gun" ? ["#ankaradabugün"] : set.id === "hafta-sonu" ? ["#haftasonu"] : [];
  const n = set.list.length;
  const tail = set.id === "yeni" ? `Son iki günde ${n} yeni etkinlik eklendi.` : `${set.h1} Ankara'da ${n} etkinlik var.`;
  return `${pick(HOOK[set.id] || HOOK.gun)}\n\n${set.h1} ${set.hl.replace(/\.$/, "")}! ${set.sub}\n\n${lines.join("\n")}\n\n${tail} Hepsini saat, mekân ve bilet bağlantılarıyla görmek için: ${DOMAIN} (profildeki bağlantıda)\n\n${(CTA[set.id] || CTA.default).join("\n")}\n🔔 Her gün güncel Ankara etkinlikleri için takipte kal.\n\n${[...new Set([...tagsBase, ...extra, ...tagsCat])].slice(0, 12).join(" ")}`;
}

/* ---------- Siteyi yerelde sun ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
function serve() {
  return new Promise((res) => {
    const srv = createServer(async (req, rsp) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (p.endsWith("/")) p += "index.html";
        const f = normalize(join(ROOT, p));
        if (!f.startsWith(ROOT)) throw 0;
        const b = await readFile(f);
        rsp.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
        rsp.end(b);
      } catch { rsp.writeHead(404); rsp.end(); }
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

/* ---------- Kompozisyon (sayfanın içinde çalışır) ---------- */
function compose({ keys, w, h, kicker, h1, hl, story }) {
  const D = document.documentElement;
  D.style.overflow = "hidden"; document.body.style.overflow = "hidden"; scrollTo(0, 0);
  const evs = keys.map((k) => E.find((e) => e.d + "|" + e.title === k)).filter(Boolean);
  const S = story ? 1 : 0, light = D.dataset.theme === "light";
  const st = document.createElement("style");
  st.textContent = `
  html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
  #ig{position:fixed;left:0;top:0;z-index:2147483000;width:${w}px;height:${h}px;overflow:hidden;color:#fff;
    background:radial-gradient(60% 40% at 12% 22%,color-mix(in srgb,var(--g2) 38%,transparent),transparent 70%),
               radial-gradient(55% 38% at 92% 30%,color-mix(in srgb,var(--g1) 30%,transparent),transparent 70%),
               linear-gradient(180deg,var(--sky1),var(--sky2) 55%,var(--sky3));font-family:var(--f-body)}
  #ig *{animation:none!important;transition:none!important}
  #ig .top{position:absolute;left:0;right:0;top:${S ? 150 : 62}px;display:flex;flex-direction:column;align-items:center;text-align:center}
  #ig .logo{font-size:${S ? 150 : 118}px;filter:drop-shadow(0 10px 30px rgba(8,6,30,.25))}
  #ig .kick{margin-top:${S ? 40 : 28}px;font:700 ${S ? 22 : 18}px var(--f-mono);letter-spacing:.42em;padding-left:.42em;opacity:.95}
  #ig .kick i{font-style:normal;color:var(--nar)}
  #ig h2{margin:${S ? 22 : 14}px 0 0;font:800 ${S ? 100 : 76}px/.92 var(--f-disp);font-stretch:75%;letter-spacing:-.03em;text-shadow:0 6px 30px rgba(8,6,30,.25)}
  #ig .hl{display:inline-block;margin-top:${S ? 12 : 8}px;padding:.02em .2em .1em;border-radius:.14em;background:var(--nar);font:800 ${S ? 100 : 76}px/.92 var(--f-disp);font-stretch:75%;letter-spacing:-.03em;box-shadow:0 14px 40px color-mix(in srgb,var(--nar) 45%,transparent)}
  #ig .lens{position:absolute;left:50%;top:${S ? 790 : 590}px;width:${S ? 920 : 820}px;height:${S ? 920 : 820}px;transform:translateX(-50%);overflow:visible}
  #ig .fan{position:absolute;left:0;right:0;top:${S ? 880 : 648}px;height:${S ? 640 : 480}px}
  #ig .fan .vc{position:absolute;left:50%;top:0;width:236px;zoom:${S ? 1.12 : 1};margin-left:-118px;box-shadow:0 26px 60px rgba(8,6,30,.35)}
  #ig .vc-pr,#ig .vc-nb.dr{display:none!important}
  #ig .fan .vc{background:${light ? "#fffefb" : "linear-gradient(180deg,#2b2452,#1b1736)"}}
  #ig .vc-buy{pointer-events:none}
  #ig .url{position:absolute;left:50%;bottom:${S ? 130 : 44}px;transform:translateX(-50%);padding:${S ? "18px 40px" : "15px 34px"};border-radius:999px;background:var(--nar);font:800 ${S ? 40 : 34}px var(--f-disp);font-stretch:88%;letter-spacing:-.01em;box-shadow:0 14px 40px color-mix(in srgb,var(--nar) 50%,transparent);white-space:nowrap}
  #ig .more{color:#fff!important;background:none!important;box-shadow:none!important;border:0!important;position:absolute;left:50%;bottom:${S ? 236 : 128}px;transform:translateX(-50%);font:700 ${S ? 22 : 19}px var(--f-mono);letter-spacing:.24em;opacity:.9;white-space:nowrap}`;
  document.head.append(st);
  const box = document.createElement("div"); box.id = "ig";
  const logo = document.getElementById("heroLogo").cloneNode(true);
  logo.removeAttribute("id"); logo.querySelectorAll("[id]").forEach((n) => n.id = n.id + "IG");
  logo.querySelectorAll("[fill^='url(#']").forEach((n) => n.setAttribute("fill", n.getAttribute("fill").replace(")", "IG)")));
  const top = document.createElement("div"); top.className = "top";
  top.append(logo);
  top.insertAdjacentHTML("beforeend", `<div class="kick"><i>📍</i>&nbsp; ${kicker}</div><h2></h2><div class="hl"></div>`);
  top.querySelector("h2").textContent = h1; top.querySelector(".hl").textContent = hl;
  // Cam mercek: beyaz halka, temaya göre renkli cam, nar renkli sap
  const lens = `<svg class="lens" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="igG" cx="38%" cy="30%" r="80%"><stop offset="0" style="stop-color:var(--g1);stop-opacity:.75"/><stop offset=".55" style="stop-color:var(--g2);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--g3);stop-opacity:.35"/></radialGradient></defs>
    <path d="M82 18L112 -12" stroke="var(--nar)" stroke-width="9" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="44" fill="url(#igG)" stroke="#fff" stroke-width="4"/>
    <path d="M21 36 A33 33 0 0 1 40 16" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  box.innerHTML = lens;
  box.prepend(top);
  const fan = document.createElement("div"); fan.className = "fan"; box.append(fan);
  const n = evs.length, mid = (n - 1) / 2;
  const spread = S ? 172 : 194;
  evs.forEach((e, i) => {
    const c = card(e), k = i - mid;
    c.style.transform = `translate(${k * spread}px,${k * k * 12 + Math.abs(k) * 8}px) rotate(${k * 6}deg)`;
    c.style.zIndex = String(10 - Math.round(Math.abs(k) * 2));
    fan.append(c);
  });
  box.insertAdjacentHTML("beforeend", `<div class="more"></div><div class="url">${location.hostname.includes("127.0.0.1") ? "" : ""}nevarneyok.net.tr</div>`);
  document.body.append(box);
  return evs.length;
}

/* ---------- Üret ---------- */
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const made = [];
const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/`;
let browser;
try {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const opt = { args: ["--no-sandbox"] };
  if (process.env.CHROME_PATH) opt.executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch(opt);
  for (const set of sets) {
    if (!set.list.length) continue;
    const top = pickTop(set.list, 5, all);
    const files = [];
    for (const [kind, w, h] of [["gonderi", 1080, 1350], ["hikaye", 1080, 1920]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
      page.on("pageerror", (e) => log("sayfa hatası:", e.message));
      await page.addInitScript((t) => { try { localStorage.setItem("nvny-tema", t); } catch {} }, set.theme);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
      await page.mouse.click(w / 2, h / 2).catch(() => {});
      await page.waitForTimeout(1800);
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      const placed = await page.evaluate(compose, { keys: top.map((e) => e.d + "|" + e.title), w, h, kicker: set.kicker, h1: set.h1, hl: set.hl, story: kind === "hikaye" });
      await page.evaluate((txt) => { const m = document.querySelector("#ig .more"); if (m) m.textContent = txt; }, set.list.length > placed ? `+${set.list.length - placed} ETKİNLİK DAHA` : "");
      await page.waitForTimeout(600);
      const f = `${set.id}-${kind}.png`;
      await page.screenshot({ path: join(OUT, f) });
      await page.close();
      files.push({ kind, file: f });
    }
    made.push({ id: set.id, slot: set.slot, theme: set.theme, title: `${set.h1} ${set.hl.replace(/\.$/, "")}`, sub: set.sub, count: set.list.length, files, caption: caption(set, top), events: top.map((e) => ({ d: e.d, t: e.t, title: e.title, venue: e.venue, cat: e.cat, link: `${BASE}/etkinlik/${slugOf(e)}/` })) });
  }
} finally { if (browser) await browser.close(); srv.close(); }

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
${made.length ? made.map((m, i) => `<section><h2>${esc(m.slot)} · ${esc(m.title)} · ${esc(m.sub)}</h2><div class="imgs">${m.files.map((f) => `<a href="${f.file}" download><img src="${f.file}" alt="${esc(m.title)} ${f.kind}">${f.kind === "gonderi" ? "Gönderi" : "Hikâye"} · İndir</a>`).join("")}</div>
<textarea id="c${i}" readonly>${esc(m.caption)}</textarea><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('c${i}').value).then(()=>this.textContent='Kopyalandı ✓')">Metni kopyala</button></section>`).join("") : "<p>Bugün için hazır set yok.</p>"}
</main></body></html>`;
}
