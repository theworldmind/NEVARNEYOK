// Mekân konumları: haritası çıkmayan mekânlar için OpenStreetMap Nominatim'den koordinat ve adres bulur (kullanıcı isteği 15.11.2026:
// "seçilen etkinlikte harita önizlemesi"). Anahtarsız; Nominatim kullanım kuralına uyar: kendini tanıtan kimlik, saniyede en çok 1 istek,
// sonuçlar kalıcı saklanır (data/venues.json), aynı mekân bulunamazsa 14 gün yeniden sorulmaz (data/geo-miss.json). Harita sayfası OSM'yi kaynak gösterir.
import { join } from "node:path";
import { ROOT, readJSON, writeJSON, sleep, log, todayIST } from "./lib/util.mjs";
// GEO_SCOPE=tr (kullanıcı isteği, 15.11.2026: "Yakınımda"): Ankara dışındaki 80 ilin mekânları; anahtar "<il>|<mekân>",
// kayıt data/venues-tr.json (Ankara'nın venues.json'u ile çakışmasın diye ayrı dosya). Sonucun ili Nominatim adresindeki il (province/state) ile doğrulanır.
import { CITIES } from "./lib/cities.mjs";
const MAX = +(process.env.GEO_MAX || 40);
const TR = process.env.GEO_SCOPE === "tr";
const UA = "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr; contact.openmind.vision@gmail.com)";
const BOX = { s: 39.3, n: 40.5, w: 31.6, e: 33.9 }; // Ankara il sınırı kabaca
const today = todayIST();
const VF = TR ? "data/venues-tr.json" : "data/venues.json", MF = TR ? "data/geo-miss-tr.json" : "data/geo-miss.json";
const venues = (await readJSON(join(ROOT, VF), {})) || {};
const miss = (await readJSON(join(ROOT, MF), {})) || {};
const fold = (s) => String(s || "").toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]+/g, " ").trim();
const known = new Set(Object.keys(venues).map(fold));
const NAME = Object.fromEntries(CITIES.map((c) => [c.id, c.name]));

// En çok etkinliği olan, koordinatı olmayan mekânlar önce
const cnt = new Map(); // anahtar → [il, mekân, sayı]
const add = (city, v) => { const k = TR ? city + "|" + v : v; if (known.has(fold(k))) return; const x = cnt.get(k) || [city, v, 0]; x[2]++; cnt.set(k, x); };
if (TR) { for (const c of CITIES) { if (c.id === "ankara") continue; const d = await readJSON(join(ROOT, `data/c/${c.id}.json`), { events: [] }); for (const e of d?.events || []) if (e.d >= today && e.venue) add(c.id, e.venue); } }
else { const data = await readJSON(join(ROOT, "data/events.json"), { events: [] }); for (const e of data.events || []) if (e.d >= today && e.venue) add("ankara", e.venue); }
const todo = [...cnt].sort((a, b) => b[1][2] - a[1][2]).map(([k, x]) => [k, x[0], x[1]]).filter(([k]) => !(miss[k] && (Date.parse(today) - Date.parse(miss[k])) / 864e5 < 14)).slice(0, MAX);

// "Karagöz Müzesi · Hayali Küçük Ali Sahne" → önce tamamı, sonra ana ad; salon/sahne ekleri atılarak yeniden denenir
const variants = (v) => [...new Set([v, v.split(/ · | - |,/)[0], v.replace(/\b(sahnesi|sahne|salonu|salon|kırmızı salon|mor salon)\b.*$/i, "").trim()].filter((x) => x && x.length > 3))];
const fl2 = (s) => fold(s).replace(/ı/g, "i");
async function search(q, city) {
  const il = NAME[city] || "Ankara";
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q + ", " + il)}`;
  const r = await fetch(u, { headers: { "user-agent": UA, referer: "https://nevarneyok.net.tr/" } });
  await sleep(1100);
  if (!r.ok) throw new Error("Nominatim " + r.status);
  const L = await r.json();
  if (!TR) return L.filter((x) => +x.lat > BOX.s && +x.lat < BOX.n && +x.lon > BOX.w && +x.lon < BOX.e);
  return L.filter((x) => { const a = x.address || {}; return [a.province, a.state, a.city].some((p) => p && fl2(p).includes(fl2(il))); });
}
let found = 0, tried = 0;
for (const [key, city, v] of todo) {
  let hit = null;
  try { for (const q of variants(v)) { const r = await search(q, city); tried++; if (r.length) { hit = r[0]; break; } } }
  catch (err) { log("geo: durdu,", err.message); break; }
  if (!hit) { miss[key] = today; continue; }
  const a = hit.address || {};
  const ilce = a.city_district || a.district || a.town || a.county || a.suburb || "";
  const addr = [a.road && (a.road + (a.house_number ? " No:" + a.house_number : "")), a.suburb || a.neighbourhood, ilce].filter(Boolean).join(", ");
  venues[key] = { lat: +(+hit.lat).toFixed(7), lng: +(+hit.lon).toFixed(7), addr, ilce: ilce.replace(/ İlçesi$/i, ""), src: "osm" };
  delete miss[key]; found++;
}
await writeJSON(join(ROOT, VF), venues, true);
await writeJSON(join(ROOT, MF), miss, true);
log(`geo: ${todo.length} mekân denendi (${tried} istek), ${found} konum bulundu; toplam ${Object.keys(venues).length} mekânın konumu var`);
