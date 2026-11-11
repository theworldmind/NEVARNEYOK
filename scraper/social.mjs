// Instagram paylaşım seti: her sabah günün görsellerini ve açıklama metnini hazırlar.
// Çıktı: paylas/ klasörü (gönderi 1080×1350 portre ve açıklama metni; hikâyede aynı görsel paylaşılır) ve paylas/index.html
//
// Görseller sitenin kendisiyle çizilir: depo yerel bir sunucuda açılır, istenen tema (Sabah / Gün /
// Gün batımı / Gece) seçilir, etkinlikler sitedeki ticket() ile gerçek yatay bilet olarak üretilir
// (fiyat kutusu ve açıklama gizlenir). Logo, mercek renkleri, bilet tasarımı ve biletin koçanındaki
// etkinlik saatindeki hava sitedekiyle aynı olur. Görsellerde ve açıklamalarda fiyat yoktur.
//
// Günde iki set:
//   1) "Bugün Ankara'da"     Gün teması          → 10:00 paylaşımı
//   2) "Bu akşam Ankara'da"  Gün batımı teması   → 15:00 paylaşımı (birinci setteki etkinlikler tekrar edilmez)
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
const kickToday = `ANKARA · ${upTR(fmtDate(today))} ${upTR(dayName(today))}`;
const todayList = all.filter((e) => e.d === today && e.status !== "tukendi");
const sets = [];
{
  const list = todayList.filter((e) => !(e.t && e.t < "10:00"));
  if (list.length) sets.push({ id: "gun", slot: "10:00", theme: "gun", h1: "Bugün", hl: "Ankara'da", kicker: kickToday, sub: `${fmtDate(today)} ${dayName(today)}`, list });
}
{
  const list = todayList.filter((e) => e.t && e.t >= "17:30");
  if (list.length >= 2) sets.push({ id: "aksam", slot: "15:00", theme: "gunbatimi", h1: "Bu akşam", hl: "Ankara'da", kicker: kickToday, sub: `${fmtDate(today)} ${dayName(today)}`, list });
}
if (!sets.length) { // Bugün etkinlik yoksa yarını paylaş
  const tom = addDaysISO(today, 1);
  sets.push({ id: "yarin", slot: "10:00", theme: "gun", h1: "Yarın", hl: "Ankara'da", kicker: `ANKARA · ${upTR(fmtDate(tom))} ${upTR(dayName(tom))}`, sub: `${fmtDate(tom)} ${dayName(tom)}`, list: all.filter((e) => e.d === tom) });
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
  const S = story ? 1 : 0;
  const st = document.createElement("style");
  st.textContent = `
  html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
  #ig{position:fixed;left:0;top:0;z-index:2147483000;width:${w}px;height:${h}px;overflow:hidden;color:#fff;
    background:radial-gradient(60% 34% at 10% 18%,color-mix(in srgb,var(--g2) 40%,transparent),transparent 70%),
               radial-gradient(55% 30% at 95% 12%,color-mix(in srgb,var(--g1) 34%,transparent),transparent 70%),
               linear-gradient(180deg,var(--sky1),var(--sky2) 50%,var(--sky3));font-family:var(--f-body)}
  #ig *{animation:none!important;transition:none!important}
  #ig .top{position:absolute;left:0;right:0;top:${S ? 150 : 52}px;display:flex;flex-direction:column;align-items:center;text-align:center}
  #ig .logo{font-size:${S ? 128 : 88}px;filter:drop-shadow(0 10px 30px rgba(8,6,30,.22))}
  #ig .kick{margin-top:${S ? 34 : 24}px;font:700 ${S ? 21 : 17}px var(--f-mono);letter-spacing:.42em;padding-left:.42em}
  #ig .kick i{font-style:normal}
  #ig .ttl{margin-top:${S ? 22 : 14}px;display:flex;align-items:center;gap:.24em;font:800 ${S ? 92 : 70}px/.95 var(--f-disp);font-stretch:75%;letter-spacing:-.03em}
  #ig .ttl b{font-weight:800;text-shadow:0 6px 30px rgba(8,6,30,.25)}
  #ig .ttl span{padding:.02em .2em .1em;border-radius:.14em;background:var(--nar);box-shadow:0 14px 40px color-mix(in srgb,var(--nar) 45%,transparent)}
  #ig .list{position:absolute;left:${S ? 36 : 40}px;right:${S ? 36 : 40}px;top:${S ? 560 : 360}px;display:flex;flex-direction:column;gap:${S ? 22 : 14}px}
  #ig .tkw{content-visibility:visible!important;contain-intrinsic-size:none!important;filter:drop-shadow(0 18px 30px rgba(8,6,30,.30))!important;transform:none!important}
  #ig .tk{min-height:0!important;--photo:${S ? 236 : 222}px;--stub:${S ? 200 : 188}px}
  #ig .tk .desc,#ig .tk .info,#ig .tk .tixes,#ig .tk .foot,#ig .tk .vlink small,#ig .ph .nb.dr,#ig .tk .goldbar,#ig .stub .src{display:none!important}
  #ig .tk .content{padding-top:${S ? 18 : 14}px!important;padding-bottom:${S ? 18 : 14}px!important;gap:${S ? 8 : 6}px!important}
  #ig .tk h3{font-size:${S ? 36 : 32}px!important;line-height:1.02!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  #ig .ph{min-height:${S ? 214 : 186}px}
  #ig .ph .art{top:22px!important;width:${S ? 120 : 108}px!important}
  #ig .stamp .dn{font-size:${S ? 64 : 58}px!important}
  #ig .url{position:absolute;left:50%;bottom:${S ? 120 : 34}px;transform:translateX(-50%);padding:${S ? "18px 40px" : "14px 32px"};border-radius:999px;background:var(--nar);color:#fff;font:800 ${S ? 40 : 32}px var(--f-disp);font-stretch:88%;letter-spacing:-.01em;box-shadow:0 14px 40px color-mix(in srgb,var(--nar) 50%,transparent);white-space:nowrap}
  #ig .more{position:absolute;left:50%;bottom:${S ? 214 : 104}px;transform:translateX(-50%);color:#fff!important;background:rgba(10,8,34,.40)!important;box-shadow:none!important;border:1px solid rgba(255,255,255,.24)!important;border-radius:999px;padding:8px 16px 8px 20px;font:700 ${S ? 20 : 16}px var(--f-mono);letter-spacing:.22em;white-space:nowrap}
  #ig .more:empty{display:none}`;
  document.head.append(st);
  const box = document.createElement("div"); box.id = "ig";
  const logo = document.getElementById("heroLogo").cloneNode(true);
  logo.removeAttribute("id"); logo.querySelectorAll("[id]").forEach((n) => n.id = n.id + "IG");
  logo.querySelectorAll("[fill^='url(#']").forEach((n) => n.setAttribute("fill", n.getAttribute("fill").replace(")", "IG)")));
  const top = document.createElement("div"); top.className = "top";
  top.append(logo);
  top.insertAdjacentHTML("beforeend", `<div class="kick"><i>📍</i>&nbsp; ${kicker}</div><div class="ttl"><b></b><span></span></div>`);
  top.querySelector(".ttl b").textContent = h1; top.querySelector(".ttl span").textContent = hl;
  box.append(top);
  const list = document.createElement("div"); list.className = "list"; box.append(list);
  for (const e of evs) list.append(ticket(e));
  box.insertAdjacentHTML("beforeend", `<div class="more"></div><div class="url">nevarneyok.net.tr</div>`);
  document.body.append(box);
  // Sığmayan bileti çıkar (uzun adlar iki satıra taşabilir)
  const limit = h - (S ? 250 : 156);
  while (list.children.length > 2 && list.getBoundingClientRect().bottom > limit) list.lastElementChild.remove();
  return list.children.length;
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
  const used = new Set();
  for (const set of sets) {
    if (!set.list.length) continue;
    const fresh = set.list.filter((e) => !used.has(e.d + "|" + e.title));
    const pool = fresh.length >= 4 ? fresh : set.list;
    const top = pickTop(pool, 5, all);
    const files = [];
    for (const [kind, w, h] of [["gonderi", 1080, 1350]]) { // hikâyede aynı gönderi görseli paylaşılır
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
      page.on("pageerror", (e) => log("sayfa hatası:", e.message));
      await page.addInitScript((t) => { try { localStorage.setItem("nvny-tema", t); } catch {} }, set.theme);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
      await page.mouse.click(w / 2, h / 2).catch(() => {});
      await page.waitForTimeout(1800);
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      const placed = await page.evaluate(compose, { keys: top.map((e) => e.d + "|" + e.title), w, h, kicker: set.kicker, h1: set.h1, hl: set.hl, story: kind === "hikaye" });
      if (kind === "gonderi") top.slice(0, placed).forEach((e) => used.add(e.d + "|" + e.title));
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
