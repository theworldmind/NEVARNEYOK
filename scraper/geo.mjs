// Mekân konumları: haritası çıkmayan mekânlar için OpenStreetMap Nominatim'den koordinat ve adres bulur (kullanıcı isteği 15.11.2026:
// "seçilen etkinlikte harita önizlemesi"). Anahtarsız; Nominatim kullanım kuralına uyar: kendini tanıtan kimlik, saniyede en çok 1 istek,
// sonuçlar kalıcı saklanır (data/venues.json), aynı mekân bulunamazsa 14 gün yeniden sorulmaz (data/geo-miss.json). Harita sayfası OSM'yi kaynak gösterir.
import { join } from "node:path";
import { ROOT, readJSON, writeJSON, sleep, log, todayIST } from "./lib/util.mjs";

const MAX = +(process.env.GEO_MAX || 40);
const UA = "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr; contact.openmind.vision@gmail.com)";
const BOX = { s: 39.3, n: 40.5, w: 31.6, e: 33.9 }; // Ankara il sınırı kabaca
const today = todayIST();

const venues = (await readJSON(join(ROOT, "data/venues.json"), {})) || {};
const miss = (await readJSON(join(ROOT, "data/geo-miss.json"), {})) || {};
const data = await readJSON(join(ROOT, "data/events.json"), { events: [] });
const fold = (s) => String(s || "").toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]+/g, " ").trim();
const known = new Set(Object.keys(venues).map(fold));

// En çok etkinliği olan, koordinatı olmayan mekânlar önce
const cnt = new Map();
for (const e of data.events || []) if (e.d >= today && e.venue && !known.has(fold(e.venue))) cnt.set(e.venue, (cnt.get(e.venue) || 0) + 1);
const todo = [...cnt].sort((a, b) => b[1] - a[1]).map(([v]) => v).filter((v) => !(miss[v] && (Date.parse(today) - Date.parse(miss[v])) / 864e5 < 14)).slice(0, MAX);

// "Karagöz Müzesi · Hayali Küçük Ali Sahne" → önce tamamı, sonra ana ad; salon/sahne ekleri atılarak yeniden denenir
const variants = (v) => [...new Set([v, v.split(/ · | - |,/)[0], v.replace(/\b(sahnesi|sahne|salonu|salon|kırmızı salon|mor salon)\b.*$/i, "").trim()].filter((x) => x && x.length > 3))];
async function search(q) {
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q + ", Ankara")}`;
  const r = await fetch(u, { headers: { "user-agent": UA, referer: "https://nevarneyok.net.tr/" } });
  await sleep(1100);
  if (!r.ok) throw new Error("Nominatim " + r.status);
  return (await r.json()).filter((x) => +x.lat > BOX.s && +x.lat < BOX.n && +x.lon > BOX.w && +x.lon < BOX.e);
}
let found = 0, tried = 0;
for (const v of todo) {
  let hit = null;
  try { for (const q of variants(v)) { const r = await search(q); tried++; if (r.length) { hit = r[0]; break; } } }
  catch (err) { log("geo: durdu,", err.message); break; }
  if (!hit) { miss[v] = today; continue; }
  const a = hit.address || {};
  const ilce = a.city_district || a.district || a.town || a.county || a.suburb || "";
  const addr = [a.road && (a.road + (a.house_number ? " No:" + a.house_number : "")), a.suburb || a.neighbourhood, ilce].filter(Boolean).join(", ");
  venues[v] = { lat: +(+hit.lat).toFixed(7), lng: +(+hit.lon).toFixed(7), addr, ilce: ilce.replace(/ İlçesi$/i, ""), src: "osm" };
  delete miss[v]; found++;
}
await writeJSON(join(ROOT, "data/venues.json"), venues, true);
await writeJSON(join(ROOT, "data/geo-miss.json"), miss, true);
log(`geo: ${todo.length} mekân denendi (${tried} istek), ${found} konum bulundu; toplam ${Object.keys(venues).length} mekânın konumu var`);
