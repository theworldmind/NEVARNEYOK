// HABERDEN ETKİNLİK KEŞFİ (kullanıcı, 18.11.2026 15:28: "temel problem Atların Dansı'nın olmaması değil, benim öğrenip sana söylemem;
// sistem benim uyarıma gerek kalmadan her şeyi bünyesinde bulundurmalı, bütün Türkiye").
// Bilet sitesinde satılmayan etkinlikler (ücretsiz/başvurulu gösteriler, belediye etkinlikleri, uzatılan sergiler…) haberle duyurulur.
// Bu iş haber akışlarındaki etkinlik haberlerini okur, haberin sayfasından YALNIZCA OLGULARI çıkarır (etkinliğin adı, il, tarih(ler), mekân)
// ve bizde olmayanları data/haber.json'a yazar. Haber metni yalnızca bellekte okunur; saklanan: ad, il, tarih, mekân, tür, haberin sitesi ve bağlantısı.
// Görsel alınmaz (haber fotoğrafı gazetenin). Kayıtlar Ankara taramasında (run.mjs) ve il birleştirmesinde (sehirler-birlestir.mjs) listelere girer.
//   node haber-kesif.mjs
import { join } from "node:path";
import { ROOT, log, readJSON, writeJSON, decodeEntities, todayIST, fold } from "./lib/util.mjs";
import { fetchText } from "./lib/net.mjs";
import { parseFeed, FEEDS as BUZZ_FEEDS } from "./buzz.mjs";
import { candidatesFrom } from "./audit.mjs";
import { CITIES, cityOfText } from "./lib/cities.mjs";
import { guessCat, fixCat } from "./lib/normalize.mjs";

const OUT = join(ROOT, "data/haber.json");
const MAX_ART = +process.env.HABER_MAX || 160;   // çalışma başına en çok bu kadar haber sayfası okunur
const DAYS = 14, AHEAD = 120;

// kültür-sanat akışları (buzz) + genel/yerel akışlar: belediye, valilik, kurum duyuruları çoğu zaman "gündem/yerel" başlığında çıkar
const FEEDS = [
  ...BUZZ_FEEDS.filter((f) => f.kind === "haber"),
  { id: "aa-guncel", name: "AA", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel" },
  { id: "trt-turkiye", name: "TRT Haber", url: "https://www.trthaber.com/turkiye_articles.rss" },
  { id: "trt-gundem", name: "TRT Haber", url: "https://www.trthaber.com/gundem_articles.rss" },
  { id: "haberturk-gundem", name: "Habertürk", url: "https://www.haberturk.com/rss/kategori/gundem.xml" },
  { id: "sabah-yasam", name: "Sabah", url: "https://www.sabah.com.tr/rss/yasam.xml" },
  { id: "cumhuriyet-turkiye", name: "Cumhuriyet", url: "https://www.cumhuriyet.com.tr/rss/turkiye" },
  { id: "mansetankara", name: "Manşet Ankara", url: "https://mansetankara.com/rss" },
  { id: "mansetankara2", name: "Manşet Ankara", url: "https://mansetankara.com/rss.xml" },
  { id: "ankarahaber", name: "Ankara Haber", url: "https://www.ankarahaber.com.tr/rss" },
  { id: "iha", name: "İHA", url: "https://www.iha.com.tr/rss" },
  { id: "dha", name: "DHA", url: "https://www.dha.com.tr/rss" },
];

const EVW = /festival|şenli[gğ]|konser|gösteri|sergi|tiyatro|oyun(u|unu)? sahnelen|sahnelenecek|sahne alacak|dinleti|resital|gala|fuar|panayır|söyleşi|atölye|etkinli[gğ]|kutlama|anma töreni|yarışma|turnuva|maraton|uzatıldı|ek gösterim|biletler tükendi|ücretsiz/i;
const NOT = /deprem|kaza|cinayet|gözaltı|tutuklan|yaralı|öldü|hayatını kaybet|operasyon|seçim|mahkeme|dolandır|yangın|sel |fırtına|trafik kazası|maç sonucu|transfer|borsa|dolar|enflasyon/i;
const AY = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];
const AYR = "(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)";
const mi = (m) => AY.indexOf(fold(m));
const pad = (n) => String(n).padStart(2, "0");

const stripHtml = (h) => decodeEntities(String(h || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
  .replace(/<\/(p|div|h\d|li|br)>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t ]+/g, " ").replace(/\n\s*/g, "\n").trim();
// haberin gövdesi: <article> ya da en uzun paragraf kümesi; yan sütun/menü metni ayıklanır
// Paylaşım görseli (og:image / twitter:image). Site logosu, varsayılan görsel elenir.
export function ogImg(html, base) {
  const m = html && (html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i));
  if (!m) return "";
  let u = ""; try { u = new URL(m[1].replace(/&amp;/g, "&"), base).href; } catch { return ""; }
  return /^https:/.test(u) && !/logo|favicon|default|placeholder|no[-_]?image|share[-_]?image|sprite|icon/i.test(u) ? u : "";
}
function bodyOf(html) {
  const a = (html.match(/<article\b[\s\S]*?<\/article>/i) || [])[0];
  const src = a && a.length > 800 ? a : html;
  const ps = [...src.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripHtml(m[1])).filter((t) => t.length > 40);
  return (ps.length >= 2 ? ps.join("\n") : stripHtml(src)).slice(0, 8000);
}

/* Tarihler: "21 Kasım", "21-22 Kasım", "21 ve 22 Kasım", "30 Kasım'a kadar", "28 Kasım 2026", "21 Kasım Cumartesi saat 20.00" */
export function datesOf(text, today = todayIST()) {
  const y0 = +today.slice(0, 4), m0 = +today.slice(5, 7);
  const iso = (d, m, y) => { if (!(d >= 1 && d <= 31) || m < 0) return ""; let yy = y || y0; if (!y && m + 1 < m0 - 1) yy = y0 + 1; return `${yy}-${pad(m + 1)}-${pad(d)}`; };
  const end = new Date(Date.parse(today + "T12:00:00Z") + AHEAD * 864e5).toISOString().slice(0, 10);
  const ok = (s) => s && s >= today && s <= end;
  const days = new Set(); let until = "", from = "", time = "";
  const T = String(text);
  for (const m of T.matchAll(new RegExp(`(\\d{1,2})\\s*(?:[-–]|ile|ve)\\s*(\\d{1,2})\\s+${AYR}(?:\\s+(20\\d\\d))?`, "gi"))) {
    const a = +m[1], b = +m[2], M = mi(m[3]), y = m[4] ? +m[4] : 0;
    if (b >= a && b - a <= 6) for (let d = a; d <= b; d++) { const s = iso(d, M, y); if (ok(s)) days.add(s); }
    else if (b > a) { const s = iso(a, M, y), e = iso(b, M, y); if (ok(e)) { from = from || s; until = until || e; } }
  }
  for (const m of T.matchAll(new RegExp(`(\\d{1,2})\\s+${AYR}(?:\\s+(20\\d\\d))?['’]?\\s*(?:(?:a|e|ya|ye|'a|'e)\\s+)?(kadar|tarihine kadar|tarihleri arasında)?`, "gi"))) {
    const s = iso(+m[1], mi(m[2]), m[3] ? +m[3] : 0); if (!ok(s)) continue;
    if (/kadar/i.test(m[0])) { if (!until || s > until) until = s; } else days.add(s);
  }
  const tm = T.match(/saat\s+(\d{1,2})[.:](\d{2})/i); if (tm && +tm[1] < 24) time = `${pad(+tm[1])}:${tm[2]}`;
  return { days: [...days].sort(), until, from, time };
}

/* Mekân: "X Merkezi'nde düzenlenecek", "X Salonu'nda sahnelenecek" — büyük harfle başlayan ad + bulunma eki + etkinlik fiili */
const VENUE_WORD = /merkez|salon|sahne|park|meydan|kütüphane|müze|galeri|tiyatro|opera|kongre|fuar|stadyum|arena|orman|bahçe|kampüs|üniversite|konservatuvar|ada|köşk|saray|kale|han|çarşı|sanat|kültür|gösteri|amfi/i;
export function venueOf(text) {
  const re = /((?:[A-ZÇĞİÖŞÜ][\p{L}0-9.&-]*\s+){0,7}[A-ZÇĞİÖŞÜ][\p{L}0-9.-]*)['’]?(?:n)?(?:da|de|ta|te)(?:ki)?\s+(?:[\p{L}0-9.:’']+\s+){0,6}?(?:düzenlen|gerçekleştiril|sahnelen|yapıl|açıl|sergilen|buluş|izleyici|ziyaret|başla|sürecek|devam)/gu;
  let best = "";
  for (const m of String(text).matchAll(re)) { const v = m[1].trim().replace(/^(Bu|Etkinlik|Gösteri|Sergi|Festival|Program|Konser)\s+/, ""); if (VENUE_WORD.test(v) && v.length > best.length && v.split(/\s+/).length >= 2) best = v; }
  if (best) return best;
  // fiil yoksa: mekân sözcüğü taşıyan, bulunma ekli ilk büyük harfli ad ("… Kültür Merkezi'nde")
  for (const m of String(text).matchAll(/((?:[A-ZÇĞİÖŞÜ][\p{L}0-9.&-]*\s+){1,7}[A-ZÇĞİÖŞÜ][\p{L}0-9.-]*)['’](?:n)?(?:da|de|ta|te)\b/gu)) { const v = m[1].trim(); if (VENUE_WORD.test(v)) return v; }
  return "";
}

/* Etkinliğin adı: başlıktaki tırnaklı ad ya da "X gösterisi/sergisi/festivali…" öbeği (audit.mjs → candidatesFrom) */
function nameOf(title) {
  const c = candidatesFrom(title).filter((x) => x.split(/\s+/).length >= 2 || /^[“"‘'«]/.test(x) || x.length >= 6);
  return c.sort((a, b) => b.length - a.length)[0] || "";
}
const catOf = (name, title) => {
  const t = fold(title + " " + name);
  const hint = /sergi/.test(t) ? "atolye" : /festival|senlik|fuar|panayir/.test(t) ? "festival" : /tiyatro|oyun|sahnelen/.test(t) ? "tiyatro" : /konser|dinleti|resital/.test(t) ? "konser"
    : /gosteri|dans|bale|opera|sema/.test(t) ? "sahne" : /cocuk|aile/.test(t) ? "cocuk" : /soylesi|atolye|panel/.test(t) ? "atolye" : "";
  return hint || fixCat({ cat: guessCat({ title: name + " " + title }), title: name, venue: "" });
};

async function main() {
  const today = todayIST(), now = new Date().toISOString();
  const prev = await readJSON(OUT, { items: [] });
  const known = new Map((prev.items || []).filter((x) => (x.until || x.days?.at(-1) || "") >= today).map((x) => [x.url, x]));
  const seen = new Set(), cands = [], notes = [];
  for (const f of FEEDS) {
    const r = await fetchText(f.url, { retries: 1 });
    if (!r.text || r.status !== 200) { notes.push(`${f.id}: ${r.robots ? "robots kapalı" : r.status || r.error}`); continue; }
    let n = 0;
    for (const it of parseFeed(r.text)) {
      if (!it.title || !it.link || seen.has(it.link)) continue; seen.add(it.link);
      if (it.date && Date.parse(it.date) < Date.now() - DAYS * 864e5) continue;
      if (!EVW.test(it.title) || NOT.test(it.title)) continue;
      const name = nameOf(it.title); if (!name) continue;
      cands.push({ name, head: it.title, url: it.link, site: f.name, teaser: it.text || "" }); n++;
    }
    notes.push(`${f.id}: ${n} aday`);
  }
  log(`Haber keşfi: ${cands.length} aday haber (${notes.join(", ")})`);
  const items = [...known.values()];
  let read = 0;
  for (const c of cands) {
    if (known.has(c.url)) continue;
    if (read >= MAX_ART) break;
    const r = await fetchText(c.url, { retries: 0 }); read++;
    if (!r.text || r.status !== 200) continue;
    const body = bodyOf(r.text), all = c.head + "\n" + body;      // metin yalnızca bellekte
    const city = cityOfText(c.head) || cityOfText(body.slice(0, 1500)); if (!city) continue;
    const D = datesOf(all, today);
    if (!D.days.length && !D.until) continue;                     // tarihi yazmayan haber etkinlik sayılmaz
    const venue = venueOf(body);
    const img = ogImg(r.text, c.url);                                  // haberin tanıtım görseli: yalnızca adresi, kaynağıyla
    items.push({ id: fold(c.name).replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + city, city, title: c.name, cat: catOf(c.name, c.head), venue,
      days: D.days, until: D.until, from: D.from, t: D.time, free: /ücretsiz|ucretsiz|bedava|giriş serbest/i.test(all) || undefined,
      soldout: /biletler(i)? (anında )?tükendi|kontenjan doldu/i.test(all) || undefined, ...(img ? { img } : {}), site: c.site, url: c.url, seen: now });
  }
  // aynı etkinlik birden çok haberde: ad + il birleşir (tarihler toplanır, en son haber bağlantısı kalır)
  const byId = new Map();
  for (const x of items) { const m = byId.get(x.id); if (!m) { byId.set(x.id, { ...x, days: [...(x.days || [])] }); continue; }
    m.days = [...new Set([...m.days, ...(x.days || [])])].sort(); if ((x.until || "") > (m.until || "")) m.until = x.until; if (!m.venue && x.venue) m.venue = x.venue; if (!m.img && x.img) { m.img = x.img; m.imgBy = x.site; } if (!m.t && x.t) m.t = x.t;
    if (x.seen > m.seen) { m.url = x.url; m.site = x.site; m.seen = x.seen; } m.free ||= x.free; m.soldout ||= x.soldout; }
  const out = [...byId.values()].filter((x) => (x.until || x.days.at(-1) || "") >= today).map((x) => ({ ...x, days: x.days.filter((d) => d >= today) }));
  await writeJSON(OUT, { updated: now, notes, items: out }, true);
  const per = {}; for (const x of out) per[x.city] = (per[x.city] || 0) + 1;
  log(`Haber keşfi: ${read} haber okundu, ${out.length} etkinlik (${Object.entries(per).map(([k, v]) => k + " " + v).join(", ")})`);
}

/* Listelere girecek hali: her tarih bir kayıt; "…'a kadar" süren etkinlik bugünden (ya da başlangıcından) itibaren her gün değil,
   tek kayıt olarak bugünün tarihinde durur ve `until` taşır (site "30 Kasım'a kadar" yazar); iş günde iki kez çalıştığı için tarih kendiliğinden ilerler. */
export function haberEvents(items, city, today = todayIST()) {
  const L = [];
  for (const x of items || []) {
    if (x.city !== city) continue;
    const base = { t: x.t || "", title: x.title, venue: x.venue || "", cat: x.cat, catLocked: true, src: "haber", news: { site: x.site, url: x.url },
      ...(x.soldout ? { status: "tukendi" } : {}), ...(x.free ? { free: true } : {}), genre: x.free ? "Ücretsiz" : "",
      tickets: [{ site: `${x.site} haberi`, url: x.url, src: "haber", seen: x.seen }], ...(x.img ? { img: x.img, imgBy: x.imgBy || x.site } : {}), firstSeen: x.seen, lastSeen: x.seen };
    const days = (x.days || []).filter((d) => d >= today);
    if (days.length) for (const d of days) L.push({ ...base, d, ...(x.until ? { until: x.until } : {}) });
    else if (x.until && x.until >= today) L.push({ ...base, d: x.from && x.from > today ? x.from : today, until: x.until });
  }
  return L;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
