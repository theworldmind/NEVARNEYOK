// Arama motorları için 81 il ve festival sayfaları (25.11.2026, kullanıcı: "bir kişi internetten açtığında da her şeye erişebilsin"; tüm iller).
// build-pages.mjs Ankara'nın sayfalarını üretir; bu betik diğer 80 il ile festivalleri ekler (yalnızca yayında üretilir, depoya girmez):
//   <il>/                 ilin önümüzdeki 60 günü (en çok 400 etkinlik), kategori sayıları
//   <il>/etkinlik/<ad>/   her etkinlik: olgular (ad, gün, saat, mekân, satış siteleri, doğrulanmış fiyat), schema.org Event
//   festival/<id>/        her festival-yıl: program, filmler, schema.org Festival + ScreeningEvent
//   sitemap-tr.xml        (robots.txt'e eklenir)
// Tanıtım metni yok; açıklama olgulardan kurulur. Her sayfada "Ne Var Ne Yok'ta aç" uygulamadaki aynı sayfaya götürür.
import { readFile, writeFile, mkdir, rm, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, esc, slugOf, slugify, readJSON, todayIST, log } from "./lib/util.mjs";
import { CATS, fmtDate, dayName, fmtTL, minPrice, siteUrl, onlyFreshPrices, addDaysISO } from "./lib/site.mjs";
import { CITIES } from "./lib/cities.mjs";

const BASE = (await siteUrl()) || "https://nevarneyok.net.tr", today = todayIST(), end = addDaysISO(today, 60), urls = [];
const put = async (path, html, pr = "0.5") => { await mkdir(join(ROOT, path), { recursive: true }); await writeFile(join(ROOT, path, "index.html"), html); urls.push([path + "/", pr]); };
const shell = ({ depth, title, desc, canon, body, ld, app }) => { const r = "../".repeat(depth);
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(BASE + "/" + canon)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:image" content="${esc(BASE)}/icons/og.png"><meta name="theme-color" content="#0a0a10">
<link rel="icon" type="image/png" href="${r}icons/icon-192.png"><link rel="stylesheet" href="${r}assets/pages.css">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}</head>
<body><header class="top"><a class="brand" href="${r}">Ne Var Ne Yok<b>?</b></a><a class="back" href="${esc(app)}">Ne Var Ne Yok'ta aç →</a></header><main>${body}</main>
<footer><p>Ne Var Ne Yok bilet satmaz; bilet bağlantıları etkinliğin satıldığı siteye gider. Fiyat, saat ve durum satış sitesinde değişebilir; son durumu oradan kontrol et.</p><p><a href="${r}#/bilgi/hakkinda">Hakkında</a> · <a href="${r}#/bilgi/kaynaklar">Kaynaklar</a> · <a href="${r}#/bilgi/gizlilik">Gizlilik</a></p></footer></body></html>`; };
const SALES = /^(biletix|biletinial|passo|bubilet|biletino|mobilet|sanatçepte|sanatcepte|iticket|bilkent bilet)$/i;
const descOf = (e, il) => `${e.genre && !/^film$/i.test(e.genre) ? e.genre : CATS[e.cat] || "Etkinlik"} · ${e.venue}, ${il}. ${fmtDate(e.d)} ${dayName(e.d)}${e.t ? " " + e.t : ""}.${e.dur ? " Süre " + e.dur + "." : ""}${e.org && !SALES.test(e.org) ? " Düzenleyen " + e.org + "." : ""}`;
const tix = (e) => (e.tickets || []).filter((t) => t.url && t.src !== "haber").sort((a, b) => (a.price || 1e12) - (b.price || 1e12));
const ldEvent = (e, il, url) => { const p = minPrice(e);
  return { "@context": "https://schema.org", "@type": e.cat === "sinema" ? "ScreeningEvent" : "Event", name: e.title, startDate: e.t ? `${e.d}T${e.t}:00+03:00` : e.d, url,
    eventStatus: e.status === "iptal" ? "https://schema.org/EventCancelled" : e.status === "ertelendi" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", addressLocality: il, addressCountry: "TR" } }, ...(e.img ? { image: [e.img] } : {}),
    ...(tix(e).length ? { offers: tix(e).map((t) => ({ "@type": "Offer", url: t.url, ...(t.price ? { price: t.price, priceCurrency: "TRY" } : {}), availability: e.status === "tukendi" ? "https://schema.org/SoldOut" : "https://schema.org/InStock", seller: { "@type": "Organization", name: t.site } })) } : {}),
    ...(e.fdir ? { workPresented: { "@type": "Movie", name: e.fo || e.title, director: { "@type": "Person", name: e.fdir }, ...(e.fy ? { dateCreated: String(e.fy) } : {}) } } : {}) }; };

let nE = 0, nI = 0;
for (const c of CITIES) {
  if (c.id === "ankara") continue; // Ankara: build-pages.mjs
  const D = await readJSON(join(ROOT, `data/c/${c.id}.json`), null); if (!D?.events?.length) continue;
  await rm(join(ROOT, c.id), { recursive: true, force: true });
  const E = onlyFreshPrices(D.events, D.baseline).filter((e) => e.d >= today && e.d <= end && e.status !== "iptal").sort((a, b) => (a.d + (a.t || "")).localeCompare(b.d + (b.t || "")));
  if (!E.length) continue;
  const seen = new Set();
  for (const e of E) { const s = slugOf(e); if (seen.has(s)) continue; seen.add(s); const T = tix(e), p = minPrice(e), url = `${BASE}/${c.id}/etkinlik/${s}/`;
    const body = `<article class="evp"><p class="kat">${esc(CATS[e.cat] || "Etkinlik")}</p><h1>${esc(e.title)}</h1>${e.fo ? `<p class="fo">${esc(e.fo)}${e.fdir ? " · " + esc(e.fdir) : ""}${e.fy ? " · " + e.fy : ""}</p>` : ""}
<ul class="facts"><li><b>Gün</b> ${esc(fmtDate(e.d))} ${esc(dayName(e.d))}</li>${e.t ? `<li><b>Saat</b> ${esc(e.t)}</li>` : ""}<li><b>Mekân</b> ${esc(e.venue)}, ${esc(c.name)}</li>${e.dur ? `<li><b>Süre</b> ${esc(e.dur)}</li>` : ""}${e.age ? `<li><b>Yaş</b> ${esc(e.age)}</li>` : ""}${p ? `<li><b>Fiyat</b> ${esc(fmtTL(p))}'den (satış sitesinde doğrulandı)</li>` : ""}${e.status === "tukendi" ? "<li><b>Durum</b> Tükendi</li>" : ""}</ul>
${T.length ? `<h2>Bilet</h2><ul class="tix">${T.map((t) => `<li><a href="${esc(t.url)}" rel="nofollow noopener" target="_blank">${esc(t.site)}${t.price ? " · " + esc(fmtTL(t.price)) : ""}</a></li>`).join("")}</ul>` : ""}
<p><a class="app" href="/#/${c.id}/e/${encodeURIComponent(s)}">Ne Var Ne Yok'ta aç: harita, yol tarifi, takip, davet</a></p></article>`;
    await put(`${c.id}/etkinlik/${s}`, shell({ depth: 3, title: `${e.title} · ${fmtDate(e.d)} · ${c.name} | Ne Var Ne Yok`, desc: descOf(e, c.name), canon: `${c.id}/etkinlik/${s}/`, body, ld: ldEvent(e, c.name, url), app: `/#/${c.id}/e/${encodeURIComponent(s)}` }), "0.4"); nE++; }
  const cc = {}; for (const e of E) cc[e.cat] = (cc[e.cat] || 0) + 1;
  const li = E.slice(0, 400).map((e) => `<li><a href="etkinlik/${esc(slugOf(e))}/"><b>${esc(fmtDate(e.d))}${e.t ? " · " + esc(e.t) : ""}</b> ${esc(e.title)} <small>${esc(e.venue)}</small></a></li>`).join("");
  await put(c.id, shell({ depth: 1, title: `${c.name} etkinlikleri: konser, tiyatro, sinema, festival | Ne Var Ne Yok`, desc: `${c.name}'da önümüzdeki 60 günde ${E.length} etkinlik: ${Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${n} ${(CATS[k] || k).toLocaleLowerCase("tr")}`).join(", ")}. Saatler, mekânlar ve bilet siteleri yan yana.`, canon: `${c.id}/`,
    body: `<h1>${esc(c.name)} etkinlikleri</h1><p>${E.length} etkinlik · ${Object.entries(cc).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(CATS[k] || k)} ${n}`).join(" · ")}</p><ul class="list">${li}</ul>`,
    ld: { "@context": "https://schema.org", "@type": "ItemList", itemListElement: E.slice(0, 50).map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/${c.id}/etkinlik/${slugOf(e)}/` })) }, app: `/#/${c.id}` }), "0.7"); nI++;
}
// festivaller
const F = (await readJSON(join(ROOT, "data/festival.json"), { festivals: [] })).festivals || [];
await rm(join(ROOT, "festival"), { recursive: true, force: true }); let nF = 0;
for (const x of F) { if (!x.films?.length && !x.g?.length) continue; const il = CITIES.find((c) => c.id === x.il)?.name || "";
  const byK = new Map((x.films || []).map((f) => [f.k, f]));
  const days = [...new Set((x.g || []).map((r) => r[0]))].sort();
  const prog = days.map((d) => `<h3>${esc(fmtDate(d))} ${esc(dayName(d))}</h3><ul class="list">${x.g.filter((r) => r[0] === d).map((r) => `<li><b>${esc(r[1] || "")}</b> ${esc(r[2])} <small>${esc(r[3])}</small></li>`).join("")}</ul>`).join("");
  const fl = (x.films || []).map((f) => `<li><b>${esc(f.t)}</b>${f.en ? ` <i>${esc(f.en)}</i>` : ""} <small>${esc([f.dir, f.cn, f.y, f.dur && f.dur + " dk", f.bol].filter(Boolean).join(" · "))}</small></li>`).join("");
  const ld = { "@context": "https://schema.org", "@type": "Festival", name: x.ad, ...(x.bas ? { startDate: x.bas, endDate: x.bit || x.bas } : {}), location: { "@type": "Place", name: (x.mekan || [])[0] || il, address: { "@type": "PostalAddress", addressLocality: il, addressCountry: "TR" } }, ...(x.site ? { url: x.site } : {}),
    subEvent: (x.g || []).slice(0, 200).map((r) => ({ "@type": "ScreeningEvent", name: r[2], startDate: r[1] ? `${r[0]}T${r[1]}:00+03:00` : r[0], location: { "@type": "Place", name: r[3] }, ...(byK.get(r[4])?.dir ? { workPresented: { "@type": "Movie", name: byK.get(r[4]).en || r[2], director: { "@type": "Person", name: byK.get(r[4]).dir } } } : {}) })) };
  await put(`festival/${x.id}`, shell({ depth: 2, title: `${x.ad} · program ve filmler | Ne Var Ne Yok`, desc: `${x.ad}${il ? ", " + il : ""}${x.bas ? ` (${fmtDate(x.bas)}${x.bit && x.bit !== x.bas ? "–" + fmtDate(x.bit) : ""})` : ""}: ${(x.films || []).length} film, ${(x.g || []).length} gösterim. Gün gün program, salonlar ve bilet bağlantıları.`, canon: `festival/${x.id}/`,
    body: `<h1>${esc(x.ad)}</h1><p>${esc([il, x.bas && `${fmtDate(x.bas)}${x.bit && x.bit !== x.bas ? " – " + fmtDate(x.bit) : ""}`, (x.mekan || []).map((m) => m.split(" · ")[0]).filter((m, i, a) => a.indexOf(m) === i).slice(0, 3).join(", ")].filter(Boolean).join(" · "))}</p>${x.site ? `<p><a href="${esc(x.url || x.site)}" rel="noopener">Festivalin sitesi</a></p>` : ""}${prog ? `<h2>Program</h2>${prog}` : ""}${fl ? `<h2>Filmler</h2><ul class="list">${fl}</ul>` : ""}`,
    ld, app: `/#/${x.il || "ankara"}/festival/${x.id}` }), "0.6"); nF++; }
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, p]) => `<url><loc>${esc(BASE + "/" + u)}</loc><changefreq>daily</changefreq><priority>${p}</priority></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(ROOT, "sitemap-tr.xml"), xml);
const rb = await readFile(join(ROOT, "robots.txt"), "utf8").catch(() => "User-agent: *\nAllow: /\n"); if (!rb.includes("sitemap-tr.xml")) await writeFile(join(ROOT, "robots.txt"), rb.trimEnd() + `\nSitemap: ${BASE}/sitemap-tr.xml\n`);
log(`Arama motoru sayfaları: ${nI} il, ${nE} etkinlik, ${nF} festival (sitemap-tr.xml ${urls.length} adres)`);
