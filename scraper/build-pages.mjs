// Google için ayrı adresli sayfalar üretir:
//   etkinlik/<ad>/   her etkinlik       mekan/<ad>/   her mekânın programı
//   kategori/<ad>/   her kategori       bu-hafta-sonu/, bugun/
//   sitemap.xml, robots.txt, feed.xml (yeni etkinlikler RSS)
// Ayrıca index.html'deki app.js?v=... sürümünü günceller (tarayıcı eski kodu tutmasın)
import { readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ROOT, esc, slugOf, slugify, readJSON, writeText, todayIST, log } from "./lib/util.mjs";
import { CATS, CAT_COLOR, fmtDate, dayName, dayShort, fmtTL, minPrice, siteUrl, siteConfig, pickTop, onlyFreshPrices, weekendRange, addDaysISO } from "./lib/site.mjs";

const data0 = await readJSON(join(ROOT, "data/events.json"), { events: [] });
const data = { ...data0, events: onlyFreshPrices(data0.events, data0.baseline) };
const venues = await readJSON(join(ROOT, "data/venues.json"), {});
const BASE = await siteUrl();
const CFG = await siteConfig();
const today = todayIST();
const events = data.events.filter((e) => e.d >= today);
const horizon = addDaysISO(today, 120);
const pageEvents = events.filter((e) => e.d <= horizon);

for (const dir of ["etkinlik", "mekan", "kategori", "bu-hafta-sonu", "bugun"]) await rm(join(ROOT, dir), { recursive: true, force: true });

const urls = [];
const put = async (path, html, prio = "0.6") => { await writeText(join(ROOT, path, "index.html"), html); urls.push([path + "/", prio]); };
const rel = (depth) => "../".repeat(depth);

/* ---------- ortak şablon ---------- */
function shell({ depth, title, desc, canonical, body, jsonld }) {
  const r = rel(depth);
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
${BASE ? `<link rel="canonical" href="${esc(BASE + "/" + canonical)}">` : ""}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR">
${BASE ? `<meta property="og:image" content="${esc(BASE)}/icons/og.png">` : ""}
<link rel="icon" type="image/png" href="${r}icons/icon-192.png"><link rel="stylesheet" href="${r}assets/pages.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,600..800&family=Onest:wght@400;600;700&display=swap">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head><body><header class="top"><a class="brand" href="${r}">Ne Var Ne Yok<b>?</b> <span>Ankara</span></a><a class="back" href="${r}">Tüm etkinlikler →</a></header>
<main>${body}</main>
<footer><p>Ne Var Ne Yok? Ankara bilet satmaz; bilet bağlantıları etkinliğin satıldığı siteye gider. Fiyat ve seanslar satış sitesinde değişebilir.</p>
<p>Son güncelleme: ${esc(new Date(data.updated || Date.now()).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}${CFG.instagram ? ` · <a href="https://instagram.com/${esc(CFG.instagram)}">Instagram</a>` : ""}</p><div class="byos" aria-label="by oneside"><span class="byos-by">by</span><span class="byos-card"><svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg><span class="byos-w">one<b>side</b></span></span></div><style>.byos{display:flex;align-items:center;justify-content:center;gap:12px;margin:26px auto 6px;padding-bottom:env(safe-area-inset-bottom,0px)}.byos-by{font:300 15px/1 Poppins,var(--f-body,system-ui),sans-serif;letter-spacing:.04em;opacity:.7}.byos-card{display:inline-flex;align-items:center;gap:14px;padding:12px 22px 12px 18px;border-radius:14px;background:#060e33;color:#fff;box-shadow:0 8px 24px rgba(6,14,51,.25)}.byos-card svg{width:30px;height:30px;fill:#fff;flex:none}.byos-w{font:300 26px/1 Poppins,system-ui,sans-serif;letter-spacing:-.01em}.byos-w b{font-weight:800}</style></footer></body></html>`;
}
const venueSlug = (v) => slugify(v);
function card(e, depth) {
  const r = rel(depth), p = minPrice(e);
  const st = e.status === "tukendi" ? "Tükendi" : e.status === "ertelendi" ? "Ertelendi" : e.status === "iptal" ? "İptal" : "";
  return `<li class="ev" style="--c:${CAT_COLOR[e.cat] || "#e0245a"}"><a href="${r}etkinlik/${esc(slugOf(e))}/">
<span class="dt"><b>${esc(fmtDate(e.d).split(" ")[0])}</b>${esc(fmtDate(e.d).split(" ")[1])}<i>${esc(dayShort(e.d))}${e.t ? " · " + esc(e.t) : ""}</i></span>
<span class="tx"><small>${esc(CATS[e.cat] || "")}</small><strong>${esc(e.title)}</strong><em>${esc(e.venue)}</em></span>
<span class="pr">${st ? `<s>${st}</s>` : p ? esc(fmtTL(p)) + "<small>’den</small>" : ""}</span></a></li>`;
}
const list = (arr, depth) => arr.length ? `<ul class="list">${arr.map((e) => card(e, depth)).join("")}</ul>` : `<p class="none">Şu an listelenen etkinlik yok.</p>`;

// Etkinlik tanımı: bilet sitelerinin tanıtım metni değil, olgulardan bizim kurduğumuz kısa cümle.
// Organizatörün kendi gönderdiği (elle eklenen) metin varsa o kullanılır.
const SALES = /^(biletix|biletinial|passo|bubilet|biletino|mobilet|sanatçepte|sanatcepte|iticket|bilkent bilet)$/i;
const orgOf = (e) => (e.org && !SALES.test(e.org.trim()) ? e.org : "");
function ourDesc(e) {
  const f = [e.dur && `süre ${e.dur}`, e.age && `${e.age.replace("+", "")} yaş ve üzeri`, orgOf(e) && `düzenleyen ${orgOf(e)}`].filter(Boolean).join(" · ");
  return `${e.genre || CATS[e.cat] || "Etkinlik"} · ${e.venue}.${f ? " " + f[0].toLocaleUpperCase("tr") + f.slice(1) + "." : ""} Kadro, program ve kurallar için bilet sayfasına göz at.`;
}
const descOf = (e) => (e.manual && e.desc ? e.desc : ourDesc(e));
function eventLd(e) {
  const v = venues[e.venue] || {};
  const p = minPrice(e);
  return {
    "@context": "https://schema.org", "@type": "Event", name: e.title,
    startDate: e.t ? `${e.d}T${e.t}:00+03:00` : e.d,
    eventStatus: e.status === "iptal" ? "https://schema.org/EventCancelled" : e.status === "ertelendi" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", streetAddress: v.addr || "", addressLocality: v.ilce || "Ankara", addressRegion: "Ankara", addressCountry: "TR" },
      ...(v.lat ? { geo: { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng } } : {}) },
    description: descOf(e),
    offers: e.tickets.map((t) => ({ "@type": "Offer", url: t.url, ...(t.price && !t.est ? { price: t.price, priceCurrency: "TRY" } : {}),
      availability: e.status === "tukendi" ? "https://schema.org/SoldOut" : "https://schema.org/InStock", seller: { "@type": "Organization", name: t.site } })),
    ...(orgOf(e) ? { organizer: { "@type": "Organization", name: orgOf(e) } } : {}),
  };
}

/* ---------- etkinlik sayfaları ---------- */
const bySlug = new Set();
for (const e of pageEvents) {
  const s = slugOf(e);
  if (bySlug.has(s)) continue;
  bySlug.add(s);
  const v = venues[e.venue] || {};
  const others = events.filter((x) => x !== e && x.title === e.title).slice(0, 10);
  const p = minPrice(e);
  const desc = `${fmtDate(e.d)} ${dayName(e.d)}${e.t ? " " + e.t : ""} · ${e.venue}, Ankara. ${p ? `Biletler ${fmtTL(p)}'den başlıyor. ` : ""}${e.genre || CATS[e.cat] || ""}${e.dur ? ", " + e.dur : ""}${e.age ? ", " + e.age : ""}.`;
  const body = `<article class="det" style="--c:${CAT_COLOR[e.cat]}"><p class="kicker">${esc(CATS[e.cat] || "")}${e.genre ? " · " + esc(e.genre) : ""}</p>
<h1>${esc(e.title)}</h1>
<p class="when">${esc(fmtDate(e.d))} ${esc(dayName(e.d))}${e.t ? ` · <b>${esc(e.t)}</b>` : ""}</p>
<p class="where"><a href="../../mekan/${esc(venueSlug(e.venue))}/">${esc(e.venue)}</a>${v.addr ? ` · ${esc(v.addr)}` : ""}</p>
<p class="desc">${esc(descOf(e))}</p>
<dl>${[["Süre", e.dur], ["Yaş sınırı", e.age], ["Kapı açılış", e.door], ["Organizasyon", orgOf(e)], ["Bilgi", e.note]].filter((x) => x[1]).map(([k, x]) => `<div><dt>${k}</dt><dd>${esc(x)}</dd></div>`).join("")}</dl>
<h2>Biletler</h2><ul class="tix">${e.tickets.map((t) => `<li><span>${esc(t.site)}</span><b>${t.price && !t.est ? esc(fmtTL(t.price)) : ""}</b><a rel="nofollow noopener" target="_blank" href="${esc(t.url)}">Bilet al ↗</a></li>`).join("")}</ul>
<p class="cta"><a class="btn" href="../../#e/${esc(s)}">Sitede aç: hava durumu ve diğer bilgiler</a>${v.place ? ` <a class="btn ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}&query_place_id=${v.place}">Haritada aç ↗</a>` : ""}</p>
${others.length ? `<h2>Diğer tarihler</h2>${list(others, 2)}` : ""}</article>`;
  await put(`etkinlik/${s}`, shell({ depth: 2, title: `${e.title} · ${fmtDate(e.d)} · ${e.venue} | Ne Var Ne Yok? Ankara`, desc, canonical: `etkinlik/${s}/`, body, jsonld: eventLd(e) }), "0.7");
}

/* ---------- mekân sayfaları ---------- */
const byVenue = {};
for (const e of events) if (e.venue && e.venue !== "Çeşitli mekânlar") (byVenue[e.venue] ||= []).push(e);
for (const [name, evs] of Object.entries(byVenue)) {
  const v = venues[name] || {};
  const body = `<h1>${esc(name)}</h1><p class="sub">${v.addr ? esc(v.addr) + " · " : ""}${evs.length} yaklaşan etkinlik</p>${list(evs, 2)}`;
  await put(`mekan/${venueSlug(name)}`, shell({ depth: 2, title: `${name} etkinlikleri ve bilet fiyatları | Ne Var Ne Yok? Ankara`, desc: `${name} (Ankara) yaklaşan etkinlik programı: ${evs.slice(0, 4).map((e) => e.title).join(", ")}…`, canonical: `mekan/${venueSlug(name)}/`, body,
    jsonld: { "@context": "https://schema.org", "@type": "Place", name, ...(v.addr ? { address: v.addr } : {}) } }), "0.5");
}

/* ---------- kategori sayfaları ---------- */
for (const [k, label] of Object.entries(CATS)) {
  const evs = events.filter((e) => e.cat === k).slice(0, 300);
  const body = `<h1>Ankara ${esc(label)}</h1><p class="sub">${evs.length} yaklaşan etkinlik · her sabah güncellenir</p>${list(evs, 2)}`;
  await put(`kategori/${k}`, shell({ depth: 2, title: `Ankara ${label} etkinlikleri ve bilet fiyatları | Ne Var Ne Yok?`, desc: `Ankara'daki ${label.toLocaleLowerCase("tr")} etkinlikleri, tarihleri ve bilet sitelerinin fiyatları yan yana.`, canonical: `kategori/${k}/`, body }), "0.8");
}

/* ---------- bu hafta sonu / bugün ---------- */
const wk = weekendRange(today);
const wkEvents = events.filter((e) => e.d >= wk.from && e.d <= wk.to);
const top = pickTop(wkEvents, 8, events);
await put("bu-hafta-sonu", shell({ depth: 1, title: `Bu hafta sonu Ankara'da ne var? (${fmtDate(wk.from)}–${fmtDate(wk.to)}) | Ne Var Ne Yok?`,
  desc: `Bu hafta sonu Ankara'da ${wkEvents.length} etkinlik: konser, tiyatro, stand-up, çocuk etkinlikleri. Öne çıkanlar: ${top.slice(0, 3).map((e) => e.title).join(", ")}.`, canonical: "bu-hafta-sonu/",
  body: `<h1>Bu hafta sonu Ankara'da</h1><p class="sub">${esc(fmtDate(wk.from))} – ${esc(fmtDate(wk.to))} · ${wkEvents.length} etkinlik</p>${top.length ? `<h2>Öne çıkanlar</h2>${list(top, 1)}<h2>Hepsi</h2>` : ""}${list(wkEvents, 1)}` }), "0.9");
const td = events.filter((e) => e.d === today);
await put("bugun", shell({ depth: 1, title: `Bugün Ankara'da ne var? (${fmtDate(today)}) | Ne Var Ne Yok?`, desc: `Bugün Ankara'da ${td.length} etkinlik var. Saatleri, mekânları ve bilet fiyatları.`, canonical: "bugun/",
  body: `<h1>Bugün Ankara'da</h1><p class="sub">${esc(fmtDate(today))} ${esc(dayName(today))} · ${td.length} etkinlik</p>${list(td, 1)}` }), "0.9");

/* ---------- sitemap, robots, RSS ---------- */
if (BASE) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n${urls.map(([u, p]) => `<url><loc>${esc(BASE + "/" + u)}</loc><changefreq>daily</changefreq><priority>${p}</priority></url>`).join("\n")}\n</urlset>\n`;
  await writeFile(join(ROOT, "sitemap.xml"), xml);
} else log("SITE_URL / CNAME yok: sitemap.xml yazılmadı (alan adı bağlanınca otomatik yazılır)");
await writeFile(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n${BASE ? `Sitemap: ${BASE}/sitemap.xml\n` : ""}`);

const fresh = events.filter((e) => e.firstSeen && e.firstSeen !== data.baseline).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen)).slice(0, 60);
const feedItems = (fresh.length ? fresh : events.slice(0, 40)).map((e) => {
  const link = `${BASE}/etkinlik/${slugOf(e)}/`;
  return `<item><title>${esc(`${e.title} · ${fmtDate(e.d)} · ${e.venue}`)}</title><link>${esc(link)}</link><guid isPermaLink="false">${esc(slugOf(e))}</guid><pubDate>${new Date(e.firstSeen || data.updated).toUTCString()}</pubDate><category>${esc(CATS[e.cat] || "")}</category><description>${esc((minPrice(e) ? fmtTL(minPrice(e)) + "'den başlayan biletler. " : "") + (e.desc || ""))}</description></item>`;
}).join("\n");
await writeFile(join(ROOT, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Ne Var Ne Yok? Ankara · yeni eklenen etkinlikler</title><link>${esc(BASE || ".")}/</link><description>Ankara'da yeni satışa çıkan etkinlikler</description><language>tr</language>\n${feedItems}\n</channel></rss>\n`);

/* ---------- app.js sürüm damgası ---------- */
const app = await readFile(join(ROOT, "app.js"));
const ver = createHash("sha1").update(app).digest("hex").slice(0, 10);
const idxPath = join(ROOT, "index.html");
const idx = await readFile(idxPath, "utf8");
const idx2 = idx.replace(/app\.js\?v=[\w-]+/, `app.js?v=${ver}`);
if (idx2 !== idx) await writeFile(idxPath, idx2);

log(`Sayfalar: ${bySlug.size} etkinlik, ${Object.keys(byVenue).length} mekân, ${Object.keys(CATS).length} kategori, hafta sonu ${wkEvents.length}, bugün ${td.length}${BASE ? " · sitemap " + (urls.length + 1) + " adres" : ""}`);
