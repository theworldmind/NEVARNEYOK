// Sayfadan etkinlik çıkarma. Üç yol, güvenilirlik sırasıyla:
//  1) schema.org Event (JSON-LD): bilet sitelerinin Google için gömdüğü standart veri
//  2) Sayfanın arka planda çektiği JSON yanıtları (tarayıcıda yakalanır)
//  3) Sezgisel okuma: başlık + metindeki tarih/saat/fiyat (son çare)
import { clean, stripTags, parseISOish, parseTrDate, parsePrice, absUrl, decodeEntities } from "./util.mjs";

const EVENT_TYPES = /(^|:)(Event|MusicEvent|TheaterEvent|ComedyEvent|DanceEvent|ChildrensEvent|Festival|ScreeningEvent|EducationEvent|SocialEvent|ExhibitionEvent|LiteraryEvent|VisualArtsEvent|SportsEvent|PerformingArtsEvent)$/;
const TYPE_CAT = { MusicEvent: "konser", TheaterEvent: "tiyatro", ComedyEvent: "standup", DanceEvent: "sahne", ChildrensEvent: "cocuk", Festival: "festival", ScreeningEvent: "sinema", EducationEvent: "atolye", LiteraryEvent: "atolye", ExhibitionEvent: "atolye", VisualArtsEvent: "atolye" };

/* ---------- HTML yardımcıları (bağımlılıksız) ---------- */
export function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html || ""))) {
    const raw = m[1].trim().replace(/^<!--|-->$/g, "");
    try { out.push(JSON.parse(raw)); } catch {
      try { out.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " "))); } catch { /* bozuk blok */ }
    }
  }
  return out;
}
function flatten(node, acc = []) {
  if (Array.isArray(node)) { node.forEach((n) => flatten(n, acc)); return acc; }
  if (!node || typeof node !== "object") return acc;
  acc.push(node);
  for (const k of ["@graph", "itemListElement", "item", "subEvent", "subEvents", "event", "events", "mainEntity"]) if (node[k]) flatten(node[k], acc);
  return acc;
}
const typeOf = (n) => [].concat(n["@type"] || []).map(String);
export const isEventNode = (n) => typeOf(n).some((t) => EVENT_TYPES.test(t));

export function metaTags(html) {
  const m = {};
  const re = /<meta\s+[^>]*>/gi;
  let x;
  while ((x = re.exec(html || ""))) {
    const tag = x[0];
    const k = (tag.match(/(?:property|name|itemprop)=["']([^"']+)["']/i) || [])[1];
    const v = (tag.match(/content=["']([^"']*)["']/i) || [])[1];
    if (k && v != null && !(k.toLowerCase() in m)) m[k.toLowerCase()] = decodeEntities(v);
  }
  const t = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  if (t) m.title = clean(t);
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  if (h1) m.h1 = clean(stripTags(h1));
  const can = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  if (can) m.canonical = can;
  return m;
}

export function linksIn(html, base) {
  const out = new Set();
  const re = /href\s*=\s*["']([^"'#][^"']*)["']/gi;
  let m;
  while ((m = re.exec(html || ""))) { const u = absUrl(decodeEntities(m[1]), base); if (u) out.add(u); }
  return [...out];
}

/* ---------- 1) JSON-LD ---------- */
const str = (v) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? str(v[0]) : v.name || v["@id"] || v.url || "");
function placeOf(loc) {
  loc = Array.isArray(loc) ? loc[0] : loc;
  if (!loc) return { venue: "", address: "" };
  if (typeof loc === "string") return { venue: clean(loc), address: "" };
  const a = loc.address;
  const address = typeof a === "string" ? a : a ? [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(", ") : "";
  return { venue: clean(loc.name || ""), address: clean(address), geo: loc.geo ? { lat: +loc.geo.latitude, lng: +loc.geo.longitude } : null };
}
function offersOf(o) {
  const list = [].concat(o || []).flatMap((x) => (x && x["@type"] === "AggregateOffer" ? [x, ...[].concat(x.offers || [])] : [x])).filter(Boolean);
  // Tükenmiş kategorilerin (ör. biten erken bilet) fiyatı "en uygun fiyat" sayılmaz: yalnızca satıştaki kategoriler
  const onSale = [], all = [];
  let soldOut = list.length > 0, url = "", free = false;
  for (const x of list) {
    const av = String(x.availability || "");
    const out = /SoldOut|OutOfStock|Discontinued/i.test(av);
    if (!out) soldOut = false;
    for (const k of ["lowPrice", "price", "minPrice"]) { const p = parsePrice(x[k]); if (p) { all.push(p); if (!out) onSale.push(p); } }
    if (x.price === 0 || x.price === "0") free = true;
    if (!url && x.url) url = x.url;
  }
  const pick = onSale.length ? onSale : soldOut ? all : [];
  return { price: pick.length ? Math.min(...pick) : null, soldOut: list.length > 0 && soldOut, url, free };
}
export function eventsFromLd(html, pageUrl, cfg = {}) {
  const nodes = flatten(jsonLdBlocks(html)).filter(isEventNode);
  const out = [];
  for (const n of nodes) {
    const when = parseISOish(str(n.startDate), { zLocal: !!cfg.zLocal });
    if (!when) continue;
    const pl = placeOf(n.location);
    const of = offersOf(n.offers);
    const st = String(n.eventStatus || "");
    const types = typeOf(n).map((t) => t.replace(/^.*:/, ""));
    const img = str(n.image);
    out.push({
      title: clean(str(n.name)),
      d: when.d, t: when.t,
      venue: pl.venue, address: pl.address, geo: pl.geo,
      price: of.price, free: of.free,
      status: /Cancel/i.test(st) ? "iptal" : /Postpon|Reschedul/i.test(st) ? "ertelendi" : of.soldOut ? "tukendi" : "",
      desc: clean(stripTags(str(n.description))).slice(0, 400),
      image: img ? absUrl(img, pageUrl) : "",
      url: absUrl(str(n.url) || pageUrl, pageUrl) || pageUrl,
      buyUrl: of.url ? absUrl(of.url, pageUrl) : "",
      org: clean(str(n.organizer)),
      catHint: types.map((t) => TYPE_CAT[t]).find(Boolean) || "",
      via: "jsonld", pc: 3,
    });
  }
  return out.filter((e) => e.title);
}

/* ---------- 2) Arka plan JSON yanıtları ---------- */
// Sitenin kendi API'sinden gelen herhangi bir JSON'da "etkinliğe benzeyen" nesneleri bulur.
const K_TITLE = ["name", "title", "eventName", "eventTitle", "performanceName", "activityName", "baslik", "ad"];
const K_DATE = ["startDate", "start_date", "startTime", "start", "date", "eventDate", "sessionDate", "performanceDate", "dateTime", "datetime", "beginDate", "tarih", "seansTarihi", "showDate"];
const K_VENUE = ["venue", "venueName", "place", "placeName", "location", "locationName", "salon", "mekan", "stage", "hall", "facility"];
const K_PRICE = ["minPrice", "lowPrice", "price", "minimumPrice", "startingPrice", "fiyat", "priceMin", "lowestPrice"];
const K_URL = ["url", "link", "eventUrl", "detailUrl", "permalink", "slug", "seoUrl", "path", "href"];
const K_CITY = ["city", "cityName", "sehir", "il", "province"];
const pick = (o, ks) => { for (const k of ks) if (o[k] != null && o[k] !== "") return o[k]; return null; };
export function eventsFromJson(data, baseUrl, depth = 0, acc = []) {
  if (depth > 9 || data == null) return acc;
  if (Array.isArray(data)) { for (const x of data.slice(0, 2000)) eventsFromJson(x, baseUrl, depth + 1, acc); return acc; }
  if (typeof data !== "object") return acc;
  const title = pick(data, K_TITLE), dateRaw = pick(data, K_DATE);
  if (typeof title === "string" && title.length > 1 && dateRaw != null) {
    const when = typeof dateRaw === "number" ? parseISOish(new Date(dateRaw > 1e12 ? dateRaw : dateRaw * 1000).toISOString(), { exact: true }) : parseISOish(String(dateRaw)) || parseTrDate(String(dateRaw));
    if (when) {
      let venue = pick(data, K_VENUE);
      if (venue && typeof venue === "object") venue = venue.name || venue.title || venue.venueName || "";
      let city = pick(data, K_CITY);
      if (city && typeof city === "object") city = city.name || "";
      if (!city && data.venue && typeof data.venue === "object") city = data.venue.city?.name || data.venue.city || data.venue.cityName || "";
      let url = pick(data, K_URL);
      if (url && typeof url === "string" && !/^https?:/i.test(url) && !url.startsWith("/")) url = "/" + url;
      const time = pick(data, ["time", "startHour", "hour", "saat", "sessionTime"]);
      acc.push({
        title: clean(title), d: when.d, t: when.t || (typeof time === "string" && /^\d{1,2}[:.]\d{2}/.test(time) ? time.replace(".", ":").slice(0, 5).padStart(5, "0") : ""),
        venue: clean(typeof venue === "string" ? venue : ""), city: clean(typeof city === "string" ? city : ""),
        price: parsePrice(pick(data, K_PRICE)),
        url: typeof url === "string" ? absUrl(url, baseUrl) : "",
        status: /sold.?out|tukendi|tükendi/i.test(JSON.stringify([data.status, data.state, data.saleStatus, data.isSoldOut === true ? "soldout" : ""])) ? "tukendi" : "",
        desc: clean(stripTags(String(pick(data, ["description", "summary", "shortDescription", "aciklama"]) || ""))).slice(0, 400),
        via: "json", pc: 2,
      });
    }
  }
  for (const v of Object.values(data)) if (v && typeof v === "object") eventsFromJson(v, baseUrl, depth + 1, acc);
  return acc;
}

/* ---------- 3) Sezgisel ---------- */
export function eventFromHeuristics(html, url, cfg = {}) {
  const m = metaTags(html);
  const title = clean((m["og:title"] || m.h1 || m.title || "").split(/\s[|–-]\s(?=[^|–-]*$)/)[0]);
  if (!title) return null;
  const text = stripTags(html);
  const near = cfg.dateHint ? (text.match(new RegExp(cfg.dateHint + "[\\s\\S]{0,120}", "i")) || [text])[0] : text;
  const when = parseTrDate(near) || parseTrDate(text);
  if (!when) return null;
  let venue = "";
  const vm = text.match(/(?:Mekan|Mekân|Yer|Salon|Sahne|Konum)\s*[:\n]\s*([^\n]{3,80})/i);
  if (vm) venue = clean(vm[1]);
  return {
    title, d: when.d, t: when.t, venue, address: "",
    price: priceNearKeywords(text), // yalnızca "Fiyat: …", "…'den itibaren" gibi açık ifadelerden
    pc: 1,
    status: /t[üu]kendi|sold out/i.test(text.slice(0, 4000)) ? "tukendi" : /ertelendi/i.test(text.slice(0, 4000)) ? "ertelendi" : /iptal edildi/i.test(text.slice(0, 4000)) ? "iptal" : "",
    desc: clean(m["og:description"] || m.description || "").slice(0, 400),
    image: m["og:image"] || "", url: m.canonical ? absUrl(m.canonical, url) : url, via: "heuristic",
  };
}

// Sezgisel fiyat: sayfadaki rastgele bir sayı değil, fiyat olduğu açıkça yazan ifadeler
function priceNearKeywords(text) {
  const out = [];
  const res = [/(?:fiyat|bilet fiyat[ıi]|ücret|bilet)\s*[:：]?\s*(?:₺\s*)?([\d.]+(?:,\d{1,2})?)\s*(?:₺|TL)/gi,
    /([\d.]+(?:,\d{1,2})?)\s*(?:₺|TL)\s*['’]?\s*(?:den|dan|ten|tan)\s+(?:itibaren|başlayan)/gi];
  for (const re of res) { let m; while ((m = re.exec(text || ""))) {
    const near = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
    if (/t[üu]kendi|sold out|hizmet bedeli|kargo/i.test(near)) continue;
    const p = parsePrice(m[1]); if (p && p >= 20) out.push(p); } }
  return out.length ? Math.min(...out) : null;
}

// Bir detay sayfasından en iyi sonucu döndür
export function extractDetail(html, url, cfg = {}) {
  if (cfg.parse) { const own = cfg.parse(html, url); if (own) return own; }
  const ld = eventsFromLd(html, url, cfg);
  if (ld.length) return ld;
  const h = cfg.heuristics === false ? null : eventFromHeuristics(html, url, cfg);
  return h ? [h] : [];
}
