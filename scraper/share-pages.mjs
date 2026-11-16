// PAYLAŞIM SAYFALARI (kullanıcı isteği, 15.11.2026: "arkadaşınla paylaş; paylaşınca o etkinliğin önizlemesi görünsün").
// 81 ilin her etkinliği için küçük bir sayfa: e/<il>/<ad>/index.html. WhatsApp, Instagram DM, X gibi uygulamalar bağlantının
// önizlemesini bu sayfadaki og etiketlerinden kurar: etkinliğin adı, tarihi, saati, mekânı ve afişi (afiş kaynağındaki adresinden
// gösterilir, kopyalanmaz). Sayfayı açan kişi anında uygulamadaki etkinlik sayfasına geçer. Arama motorlarına kapalıdır (noindex);
// arama için Ankara'nın etkinlik/ sayfaları vardır.
// Ad (slug) uygulamadaki slugOf ile birebir aynı kurulur; aynı gün aynı adlı ikinci etkinliğe "-2" eklenir.
import { readdir, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, readJSON, todayIST, log } from "./lib/util.mjs";

const BASE = "https://nevarneyok.net.tr";
const today = todayIST();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// app.js'deki fold/slugOf'un aynısı
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
const GUNK = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"], AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const dShort = (s) => { const d = new Date(s + "T12:00:00"); return `${GUNK[d.getDay()]} ${d.getDate()} ${AYK[d.getMonth()]}`; };
const CATS = { konser: "Konser", tiyatro: "Tiyatro", standup: "Stand-up", sahne: "Opera · Bale · Dans", cocuk: "Çocuk & Aile", festival: "Festival", parti: "Parti", atolye: "Atölye & Söyleşi", sinema: "Sinema" };

const cities = (await readJSON(join(ROOT, "data/cities.json"), { cities: {} })).cities || {};
const OG = new Set((await readJSON(join(ROOT, "s/_og.json"), [])) || []); // afiş + logomuzla hazırlanmış önizleme görselleri (share-img.mjs → s/o/<kod>.jpg)
await rm(join(ROOT, "e"), { recursive: true, force: true }); await rm(join(ROOT, "d"), { recursive: true, force: true });
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const dLong = (s) => { const d = new Date(s + "T12:00:00"); return `${d.getDate()} ${AY[d.getMonth()]} ${GUN[d.getDay()]}`; };
const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,700..900&family=Inter+Tight:wght@500;600;700;800&display=swap">`;
const ogMeta = (t, d, u, img, alt) => `<meta property="og:site_name" content="Ne Var Ne Yok"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:url" content="${u}"><meta property="og:image" content="${esc(img)}">${img.includes("/s/o/") ? '<meta property="og:image:width" content="720"><meta property="og:image:height" content="900">' : ""}
<meta property="og:image:alt" content="${esc(alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0a0a10"><link rel="icon" type="image/png" href="/icons/icon-192.png?v=4"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=4">`;
/* Davet sayfası (kullanıcı isteği, 16.11.2026 14:54–14:58: "davet butonu; afişle, logoyla, özel davet yazısıyla; beraber gidelim mi"):
   bağlantıyı açan arkadaş davetiyeyi görür: davet cümlesi (gönderenin seçtiği, bağlantıdaki ?s=), afiş, ad, tarih, mekân;
   "Varım 🙌" takvimine ekler, "Bilet al" satış sitesine, "Yol tarifi" haritaya, "Ne Var Ne Yok'ta aç" uygulamadaki etkinliğe götürür. */
const invitePage = (o) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">
<title>✉️ Beraber gidelim mi? · ${esc(o.title)}</title><meta name="description" content="${esc(o.desc)}">${ogMeta("✉️ Beraber gidelim mi? · " + o.title, o.desc, o.url, o.og, o.title + " davetiyesi")}${FONT}
<link rel="stylesheet" href="/davet.css?v=1"></head><body><div class="bg" ${o.img ? `style="background-image:url('${esc(o.img)}')"` : ""}></div><main>
<a class="lg" href="/" aria-label="Ne Var Ne Yok"><img src="/brand/logo-cam.png" alt="Ne Var Ne Yok"></a>
<div class="inv" id="inv">✉️ Beraber gidelim mi?</div>
${o.img ? `<div class="ps"><img src="${esc(o.img)}" alt="${esc(o.title)} afişi" referrerpolicy="no-referrer" onerror="this.parentNode.remove();document.querySelector('.cr')?.remove()"></div>${o.by ? `<p class="cr">Görsel: ${esc(o.by)}</p>` : ""}` : ""}
<h1>${esc(o.title)}</h1><div class="mt"><b>📅 ${esc(o.when)}</b><span>📍 ${esc(o.place)}</span></div>
<div class="bt"><button type="button" class="p" id="var">Varım 🙌</button><div class="rw">${o.tix ? `<a href="${esc(o.tix)}" target="_blank" rel="noopener">🎟️ Bilet al</a>` : ""}<a href="${esc(o.maps)}" target="_blank" rel="noopener"${o.tix ? "" : ' style="grid-column:span 2"'}>🧭 Yol tarifi</a></div><a href="${esc(o.app)}">🔍 Ne Var Ne Yok'ta aç</a></div>
<p class="ft">Bu davetiye <a href="/">Ne Var Ne Yok</a> ile hazırlandı · nevarneyok.net.tr</p></main>
<script type="application/json" id="E">${JSON.stringify({ t: o.title, d: o.d, h: o.t, p: o.place }).replace(/</g, "\\u003c")}</script><script src="/davet.js?v=3" defer></script></body></html>`;
// Yeni tarihlerini takip et (takip.js → NV.akey): 81 ilin dizini idx/a.json — anahtar → [[il, gün, saat, ad, mekân]]
const NVK = new Function(await readFile(join(ROOT, "takip.js"), "utf8") + ";return NV")();
const AIDX = {};
// Harita sekmesi bütün Türkiye (kullanıcı isteği, 16.11.2026): konumu bilinen mekânlardaki önümüzdeki 8 günün etkinlikleri → idx/harita.json
// { v: [[enlem, boylam, il, mekân, ilçe]], e: [[mekân sırası (-1: konum yok), ad (slug), başlık, gün, saat, kategori, afiş, il, mekân adı (konum yoksa), durum (t: tükendi, e: ertelendi), doğrulanmış en düşük fiyat, doğrulandığı saat, ücretsiz]] }
const VA = (await readJSON(join(ROOT, "data/venues.json"), {})) || {}, VT = (await readJSON(join(ROOT, "data/venues-tr.json"), {})) || {};
const HV = [], HVi = new Map(), HE = [], hLast = (() => { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); })();
const HT = [], HTi = new Map(), HI = [], HIi = new Map(); // tekrar eden ad ve afiş adresleri tablo olarak (dosya küçülsün)
const tix = (t) => { if (!HTi.has(t)) { HTi.set(t, HT.length); HT.push(t); } return HTi.get(t); }, iix = (u) => { if (!HIi.has(u)) { HIi.set(u, HI.length); HI.push(u); } return HIi.get(u); };
const hVen = (id, name) => { const v = id === "ankara" ? VA[name] : VT[id + "|" + name]; if (!v?.lat) return -1; const k = id + "|" + name; if (!HVi.has(k)) { HVi.set(k, HV.length); HV.push([+(+v.lat).toFixed(5), +(+v.lng).toFixed(5), id, name, v.ilce || ""]); } return HVi.get(k); };
/* haritadaki bütçe filtresi için fiyat (fiyat kuralı): yalnızca satış sitesinde doğrulanmış fiyat ve doğrulandığı saat; uygulama 36 saati aşanı göstermez → [fiyat, saat (epoch/36e5)] */
const hPrice = (e, base) => { let p = 0, h = 0; for (const x of e.tickets || []) if (x.price && !x.est && x.seen && x.seen !== base && (!p || x.price < p)) { p = x.price; h = Math.round(Date.parse(x.seen) / 36e5); } return [p, h]; };
let n = 0;
for (const [id, c] of Object.entries(cities)) {
  const file = id === "ankara" ? "data/events.json" : `data/c/${id}.json`;
  const EVF = (await readJSON(join(ROOT, file), { events: [] })) || {}, ev = EVF.events || [], base = EVF.baseline;
  const seen = new Map();
  for (const e of ev.filter((x) => x.d >= today)) { // dosya sırası, uygulamadaki gibi
    let s = slugOf(e); const k = (seen.get(s) || 0) + 1; seen.set(s, k); if (k > 1) s += "-" + k;
    /* (16.11.2026 14:55) önizleme: başlık = etkinliğin adı; açıklama = tarih, saat, mekân (ilçe, il) + "Biletine, yol tarifine ve bütün ayrıntılara Ne Var Ne Yok'tan ulaş 🔍".
       Görsel: afiş + logomuz (s/o/<kod>.jpg; 7 gün içindekiler), yoksa afişin kendisi, o da yoksa site kartı. Fiyat yazılmaz (önizleme günlerce saklanır, fiyat eskir). */
    const title = e.title, code = NVK.scode(id, s), vv = id === "ankara" ? VA[e.venue] : VT[id + "|" + e.venue];
    const when = `${dLong(e.d)}${e.t ? " · " + e.t : ""}`, place = [e.venue, vv?.ilce, c.name].filter(Boolean).filter((x, i, A) => A.indexOf(x) === i).join(", ");
    const desc = `${when} · ${place}. Biletine, yol tarifine ve bütün ayrıntılara Ne Var Ne Yok'tan ulaş 🔍`;
    const app = `/#/${id}/e/${encodeURIComponent(s)}`;
    const img = OG.has(code) ? `${BASE}/s/o/${code}.jpg` : e.img || `${BASE}/icons/og.png`;
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} · ${esc(when)}</title><meta name="description" content="${esc(desc)}">${ogMeta(title, desc, `${BASE}/e/${code}`, img, title + " afişi")}
<script>location.replace(${JSON.stringify(app)})</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a10;color:#fff;font:600 16px system-ui,sans-serif;text-align:center}a{color:#c4b5fd}</style>
</head><body><p><b>${esc(title)}</b><br>${esc(when)} · ${esc(place)}<br><br><a href="${esc(app)}">Ne Var Ne Yok'ta aç →</a></p></body></html>`;
    if (e.status !== "iptal") {
      const tk = (e.tickets || []).find((x) => x.url), maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, vv?.addr || vv?.ilce, c.name].filter(Boolean).join(", "))}`;
      const dsc = `${when} · ${place}. Biletine ve yol tarifine Ne Var Ne Yok'tan ulaş 🔍`;
      for (const [dir0, body] of [[join(ROOT, "e", code), html], [join(ROOT, "d", code), invitePage({ title, desc: dsc, url: `${BASE}/d/${code}`, og: img, img: e.img || "", by: e.imgBy || "", when, place, tix: tk?.url || "", maps, app, d: e.d, t: e.t || "" })]]) { await mkdir(dir0, { recursive: true }); await writeFile(join(dir0, "index.html"), body); }
    }
    /* bütün tarihler (kullanıcı, 09:09: "bütün Türkiye, bütün etkinlikler haritada") */ if (e.status !== "iptal") { const vi = hVen(id, e.venue || ""); const pf = hPrice(e, base); HE.push([vi, s, tix(e.title), e.d, e.t || "", e.cat || "", e.img ? iix(e.img) : -1, id, vi < 0 ? e.venue || "" : "", e.status === "tukendi" ? "t" : e.status === "ertelendi" ? "e" : "", pf[0], pf[1], /ücretsiz/i.test(e.note || "") ? 1 : 0]); } // konumu olmayan da girer (il düzeyinde gösterilir)
    { const ak = NVK.akey(e.title); if (ak && ak.length >= 3 && e.status !== "iptal") (AIDX[ak] ||= []).push([id, e.d, e.t || "", s, e.venue || ""]); }
    const dir = join(ROOT, "e", id, s);
    await mkdir(dir, { recursive: true }); await writeFile(join(dir, "index.html"), html); n++;
  }
}
/* Sinema seansları da haritada (kullanıcı, 16.11 11:20): her gün her salonda oynayan her film bir satır; saatleri x[14], film no x[13] (bağlantı film sayfasına) */
let nf = 0;
for (const [id] of Object.entries(cities)) {
  const F = await readJSON(join(ROOT, id === "ankara" ? "data/films.json" : `data/c/${id}-films.json`), null); if (!F?.films) continue;
  for (const f of F.films) for (const [d, L] of Object.entries(f.s || {})) { if (d < today) continue; const by = new Map();
    for (const [cid, str] of L) { const tm = String(str).split("|")[0].split(",").map((x) => x.trim()).filter(Boolean); (by.get(cid) || by.set(cid, []).get(cid)).push(...tm); }
    for (const [cid, tm] of by) { const cn = F.cinemas?.[cid]?.name; if (!cn) continue; const T = [...new Set(tm)].sort(); const vi = hVen(id, cn);
      HE.push([vi, "", tix(f.title), d, T[0] || "", "sinema", f.img ? iix(f.img) : -1, id, vi < 0 ? cn : "", "", 0, 0, 0, f.id, T.join(" ")]); nf++; } } }
log(`Harita dizini: ${nf} sinema seansı (film × salon × gün) eklendi`);
await mkdir(join(ROOT, "idx"), { recursive: true }); await writeFile(join(ROOT, "idx/a.json"), JSON.stringify(AIDX));
await writeFile(join(ROOT, "idx/harita.json"), JSON.stringify({ d: today, v: HV, t: HT, i: HI, e: HE }));
log(`Harita dizini: ${HE.length} etkinlik, ${HV.length} mekân (idx/harita.json)`);
log(`Paylaşım sayfaları: ${n} etkinlik (e/<il>/<ad>/, e/<kod>/, davet d/<kod>/)`);
log(`Yeni tarih dizini: ${Object.keys(AIDX).length} ad (idx/a.json)`);
