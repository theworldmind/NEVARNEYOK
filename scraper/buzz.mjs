// İLGİ TAKİBİ: hangi etkinlik ve film haberlerde, gişede öne çıkıyor? → data/buzz.json
// Kaynaklar: kültür-sanat ve sinema haber akışları (RSS/Atom) ve Box Office Türkiye hafta sonu tablosu.
// Haber metni ALINMAZ ve SAKLANMAZ: metin yalnızca bellekte, adı geçiyor mu diye okunur.
// Saklanan: hangi sitede, hangi tarihte haber yapıldığı ve haberin bağlantısı; gişe sırası ve seyirci sayısı (olgu).
//   node buzz.mjs
import { join } from "node:path";
import { ROOT, log, readJSON, writeJSON, decodeEntities, todayIST } from "./lib/util.mjs";
import { fetchText } from "./lib/net.mjs";

const OUT = process.env.BUZZ_FILE || join(ROOT, "data/buzz.json");
const KEEP_DAYS = 21;
const BO = "https://boxofficeturkiye.com";

/* kind: haber (genel kültür-sanat) | sinema (yalnızca sinema yazan siteler) */
export const FEEDS = [
  { id: "trt", name: "TRT Haber", kind: "haber", url: "https://www.trthaber.com/kultur_sanat_articles.rss" },
  { id: "aa", name: "AA", kind: "haber", url: "https://www.aa.com.tr/tr/rss/default?cat=kultur" },
  { id: "yeniankara", name: "Yeni Ankara", kind: "haber", url: "https://www.yeniankara.com.tr/rss" },
  { id: "evrensel", name: "Evrensel", kind: "haber", url: "https://www.evrensel.net/rss/kultur-sanat.xml" },
  { id: "hurriyet", name: "Hürriyet", kind: "haber", url: "https://www.hurriyet.com.tr/rss/kelebek" },
  { id: "haberturk", name: "Habertürk", kind: "haber", url: "https://www.haberturk.com/rss/kategori/kultur-sanat.xml" },
  { id: "sabah", name: "Sabah", kind: "haber", url: "https://www.sabah.com.tr/rss/kultur-sanat.xml" },
  { id: "cumhuriyet", name: "Cumhuriyet", kind: "haber", url: "https://www.cumhuriyet.com.tr/rss/kultur-sanat" },
  { id: "sozcu", name: "Sözcü", kind: "haber", url: "https://www.sozcu.com.tr/feeds-rss-category-kultur-sanat" },
  { id: "beyazperde", name: "Beyazperde", kind: "sinema", url: "https://www.beyazperde.com/rss/haberler.xml" },
  { id: "boxoffice", name: "Box Office Türkiye", kind: "sinema", url: BO + "/feed/news.atom" },
];

/* Karşılaştırma anahtarı: Türkçe harfler sadeleşir, harf ve rakam dışı her şey boşluk olur */
export const fold = (s) => (s || "").toLocaleLowerCase("tr").replace(/[ıi̇]/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[âä]/g, "a").replace(/[éè]/g, "e").replace(/[^a-z0-9]+/g, " ").trim();
/* Sitedeki (app.js) anahtarla aynı: boşluksuz */
export const nk = (s) => fold(s).replace(/ /g, "");
const strip = (s) => decodeEntities(String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/* RSS (<item>) ve Atom (<entry>) akışı → [{title, link, date, text}] — text yalnızca bellekte kalır */
export function parseFeed(xml) {
  const out = [];
  for (const it of String(xml || "").split(/<(?:item|entry)[\s>]/i).slice(1)) {
    const g = (tag) => (it.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i")) || [])[1] || "";
    const title = strip(g("title"));
    let link = strip(g("link")) || (it.match(/<link\b[^>]*href="([^"]+)"/i) || [])[1] || strip(g("guid"));
    const date = Date.parse(strip(g("pubDate")) || strip(g("updated")) || strip(g("published")) || strip(g("dc:date")));
    if (!title) continue;
    out.push({ title, link: decodeEntities(link || ""), date: Number.isFinite(date) ? new Date(date).toISOString().slice(0, 10) : "", text: (title + " " + strip(g("description") || g("summary") || g("content"))).slice(0, 4000) });
  }
  return out;
}

/* Box Office Türkiye hafta sonu tablosu → [{title, slug, rank, aud}] */
export function parseWeekend(html) {
  const tb = (html.match(/id="WeeklyMovieData"[\s\S]*?<\/table>/i) || [html])[0];
  const heads = [...(tb.match(/<thead[\s\S]*?<\/thead>/i) || [""])[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => fold(strip(m[1])));
  const ai = heads.findIndex((h) => /seyirci/.test(h));
  const rows = [];
  for (const tr of (tb.match(/<tbody[\s\S]*?<\/tbody>/i) || [tb])[0].split(/<tr\b/i).slice(1)) {
    // satırda önce afiş bağlantısı (yalnızca resim), sonra adın yazdığı bağlantı gelir: adı olan ilk bağlantı ya da title niteliği alınır
    let a = null, title = "";
    for (const m of tr.matchAll(/<a\b([^>]*)href="(?:https?:\/\/boxofficeturkiye\.com)?\/film\/([a-z0-9-]+)"([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const t = strip(m[4]) || strip(((m[1] + m[3]).match(/title="([^"]+)"/) || [])[1]);
      if (t) { a = [null, m[2]]; title = t; break; }
    }
    if (!a) continue;
    const tds = [...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => strip(m[1]));
    const num = (s) => +String(s || "").replace(/[^\d]/g, "") || 0;
    const aud = ai >= 0 && tds[ai] ? num(tds[ai]) : 0;
    rows.push({ title, slug: a[1], rank: rows.length + 1, aud });
  }
  return rows;
}

/* Ad, haber metninde geçiyor mu? Kısa ya da genel adlarda ek kanıt aranır (yanlış eşleşme olmasın) */
const SUFFIX = /\b(ankara|konseri|konser|tiyatro oyunu|oyunu|gosterisi|gosterimi|turnesi|soylesisi|sergisi|2026|2027)\b/g;
const GENERIC = new Set(["konser", "tiyatro", "festival", "sergi", "film", "gala", "opera", "bale", "caz", "jazz", "stand up", "quiz", "atolye", "parti", "dans", "muzikal", "masal", "sinema", "gece", "aksam", "bayram", "yilbasi", "cumhuriyet"]);
export function phraseOf(title) {
  const base = String(title || "").split(/ · | \| /)[0].replace(/\s+[-–]\s+(ankara|[^-–]*(dob|asm|sahnesi|salonu))\s*$/i, "");
  const p = fold(base).replace(SUFFIX, " ").replace(/\s+/g, " ").trim();
  return p.length >= 4 && !GENERIC.has(p) ? p : "";
}
export function mentions(text, phrase, { strong, ctx = [] } = {}) {
  const T = " " + fold(text) + " ";
  if (!T.includes(" " + phrase + " ")) return false;
  const words = phrase.split(" ");
  if (strong || (words.length >= 2 && phrase.length >= 10)) return true;
  return ctx.some((c) => c && T.includes(" " + c + " "));
}
const quoted = (raw, p) => { const t = p; return [...String(raw).matchAll(/[“"‘'«]([^”"’'»]{2,80})[”"’'»]/g)].some((m) => fold(m[1]) === t); };

export function matchAll(items, events, films) {
  const ev = {}, fm = {};
  const add = (map, key, it) => { const a = (map[key] ||= []); if (!a.some((x) => x[1] === it.link)) a.push([it.src, it.link, it.date]); };
  // etkinlikler: aynı ad bir kez denenir; kısa adlarda "ankara" ya da mekânın adı da geçmeli
  const byP = new Map();
  for (const e of events) {
    if (e.cat === "sinema") continue;
    const p = phraseOf(e.title); if (!p) continue;
    const v = fold(e.venue || "").split(" ").filter((w) => w.length >= 5 && !/^(salonu|sahnesi|kultur|merkezi|ankara|tiyatro|sanat|belediyesi)$/.test(w))[0];
    const o = byP.get(p) || { key: nk(e.title.split(/ · | \| /)[0]), ctx: new Set(["ankara", "baskent"]) };
    if (v) o.ctx.add(v); byP.set(p, o);
  }
  for (const it of items) for (const [p, o] of byP) if (mentions(it.text, p, { ctx: [...o.ctx] })) add(ev, o.key, it);
  // filmler: sinema sitelerinde ad yeter; genel haberlerde tek kelimelik ad tırnak içinde geçmeli
  for (const f of films) {
    const ps = [...new Set([phraseOf(f.title), phraseOf(f.title.split(/:\s/)[0])].filter(Boolean))];
    for (const p of ps) {
      const long = p.split(" ").length >= 2 && p.length >= 8;
      for (const it of items) {
        if (!fold(it.text).includes(p)) continue;
        if (mentions(it.text, p, { strong: long || it.kind === "sinema" || quoted(it.text, p) })) add(fm, nk(f.title), it);
      }
    }
  }
  return { ev, fm };
}

export async function main() {
  const today = todayIST(), cut = new Date(Date.parse(today) - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  const prev = await readJSON(OUT, { ev: {}, fm: {}, bo: {} });
  const evData = await readJSON(join(ROOT, "data/events.json"), { events: [] });
  const fData = await readJSON(join(ROOT, "data/films.json"), { films: [] });
  const events = (evData.events || []).filter((e) => e.d >= today), films = fData.films || [];
  const items = [], src = {};
  for (const f of FEEDS) {
    const r = await fetchText(f.url, { retries: 1 });
    if (r.status !== 200 || !r.text) { src[f.id] = { name: f.name, ok: false, note: r.robots ? "robots.txt izin vermiyor" : String(r.status || r.error) }; continue; }
    const its = parseFeed(r.text).filter((x) => !x.date || x.date >= cut);
    its.forEach((x) => { x.src = f.id; x.kind = f.kind; });
    items.push(...its); src[f.id] = { name: f.name, ok: true, n: its.length };
  }
  const { ev, fm } = matchAll(items, events, films);
  // önceki günlerin eşleşmeleriyle birleştir (akışlar yalnızca son haberleri verir); 21 günden eskiler düşer
  const merge = (a = {}, b = {}) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const m = new Map(); for (const x of [...(a[k] || []), ...(b[k] || [])]) if (!x[2] || x[2] >= cut) m.set(x[1], x); if (m.size) o[k] = [...m.values()].sort((x, y) => (y[2] || "").localeCompare(x[2] || "")).slice(0, 8); } return o; };
  // gişe: en son hafta sonu tablosu
  let bo = prev.bo || {};
  const yl = await fetchText(BO + "/hafta-sonu/yillar", { retries: 1 });
  const wk = (yl.text?.match(/\/hafta-sonu\/detay\/(\d{4}-\d{1,2})/) || [])[1];
  if (wk) {
    const r = await fetchText(`${BO}/hafta-sonu/detay/${wk}`, { retries: 1 });
    const rows = r.status === 200 ? parseWeekend(r.text) : [];
    if (rows.length) { bo = { week: wk, url: `${BO}/hafta-sonu/detay/${wk}`, films: {} }; for (const x of rows.slice(0, 20)) bo.films[nk(x.title)] = [x.rank, x.aud]; src.bohs = { name: "Box Office Türkiye hafta sonu", ok: true, n: rows.length }; }
    else src.bohs = { name: "Box Office Türkiye hafta sonu", ok: false, note: String(r.status || r.error) };
  }
  const out = { updated: new Date().toISOString(), names: Object.fromEntries(FEEDS.map((f) => [f.id, f.name])), sources: src, ev: merge(prev.ev, ev), fm: merge(prev.fm, fm), bo };
  await writeJSON(OUT, out, false);
  log(`İlgi: ${items.length} haber okundu · ${Object.keys(out.ev).length} etkinlik ve ${Object.keys(out.fm).length} film haberlerde · gişe ${bo.week || "yok"} (${Object.keys(bo.films || {}).length} film) · ${Object.entries(src).filter(([, s]) => !s.ok).map(([k, s]) => `${k}: ${s.note}`).join(", ") || "bütün kaynaklar okundu"}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
