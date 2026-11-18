// Mekân konumları: haritası çıkmayan mekânlar için OpenStreetMap Nominatim'den koordinat ve adres bulur (kullanıcı isteği 15.11.2026:
// "seçilen etkinlikte harita önizlemesi"). Anahtarsız; Nominatim kullanım kuralına uyar: kendini tanıtan kimlik, saniyede en çok 1 istek,
// sonuçlar kalıcı saklanır (data/venues.json), aynı mekân bulunamazsa 14 gün yeniden sorulmaz (data/geo-miss.json). Harita sayfası OSM'yi kaynak gösterir.
import { kindOk } from "./lib/venue-kind.mjs";
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
let dropped = 0; for (const [k, x] of Object.entries(venues)) if (x && x.src === "osm" && x.v !== 2) { delete venues[k]; delete miss[k]; dropped++; }
if (dropped) log(`geo: eski yöntemle bulunmuş ${dropped} konum silindi, sıkı kurala göre yeniden aranacak`);
const known = new Set(Object.keys(venues).map(fold));
const NAME = Object.fromEntries(CITIES.map((c) => [c.id, c.name]));

// En çok etkinliği olan, koordinatı olmayan mekânlar önce
const cnt = new Map(); // anahtar → [il, mekân, sayı]
const add = (city, v) => { const k = TR ? city + "|" + v : v; if (known.has(fold(k))) return; const x = cnt.get(k) || [city, v, 0]; x[2]++; cnt.set(k, x); };
if (TR) { for (const c of CITIES) { if (c.id === "ankara") continue; const d = await readJSON(join(ROOT, `data/c/${c.id}.json`), { events: [] }); for (const e of d?.events || []) if (e.d >= today && e.venue) add(c.id, e.venue); } }
else { const data = await readJSON(join(ROOT, "data/events.json"), { events: [] }); for (const e of data.events || []) if (e.d >= today && e.venue) add("ankara", e.venue); }
/* Sinemalar da haritada (kullanıcı, 16.11 11:20: "bugün bütün Türkiye'de bu kadar mı etkinlik"): vizyondaki filmlerin seansı olan salonlar
   seans sayısı kadar öncelikli aranır; salonun sinemalar.com'daki açık adresi ad bulunamazsa yedek olarak kullanılır. */
const caddr = new Map();
const addC = async (city, file) => { const f = await readJSON(join(ROOT, file), null); if (!f?.cinemas) return; const n = {};
  for (const fl of f.films || []) for (const [d, L] of Object.entries(fl.s || {})) if (d >= today) for (const r of L) n[r[0]] = (n[r[0]] || 0) + 1;
  for (const [cid, c] of Object.entries(f.cinemas)) { if (!n[cid] || !c?.name) continue; const k = TR ? city + "|" + c.name : c.name; if (known.has(fold(k))) continue;
    const x = cnt.get(k) || [city, c.name, 0]; x[2] += n[cid] * 2; cnt.set(k, x); if (c.addr) caddr.set(k, c.addr); } };
if (TR) { for (const c of CITIES) if (c.id !== "ankara") await addC(c.id, `data/c/${c.id}-films.json`); } else await addC("ankara", "data/films.json");
if (TR) { const VL = await readJSON(join(ROOT, "data/c/_vloc.json"), {}) || {}; for (const [k, x] of Object.entries(VL)) if (x?.a && cnt.has(k) && !caddr.has(k)) caddr.set(k, x.a); } // kaynak sayfasının yazdığı adres: ad bulunamazsa adresle aranır
const todo = [...cnt].sort((a, b) => b[1][2] - a[1][2]).map(([k, x]) => [k, x[0], x[1]]).filter(([k]) => !(miss[k] && (Date.parse(today) - Date.parse(miss[k])) / 864e5 < 14)).slice(0, MAX);

// "Karagöz Müzesi · Hayali Küçük Ali Sahne" → önce tamamı, sonra ana ad; salon/sahne ekleri atılarak yeniden denenir
const variants = (v) => [...new Set([v, v.split(/ · | - |,/)[0], v.replace(/\b(sahnesi|sahne|salonu|salon|kırmızı salon|mor salon)\b.*$/i, "").trim()].filter((x) => x && x.length > 3))];
const fl2 = (s) => fold(s).replace(/ı/g, "i");
/* Nominatim GitHub sunucularından çoğu zaman 503 veriyor (16.11.2026: 150 mekânda 1 sonuç). O zaman aynı OpenStreetMap verisini veren
   anahtarsız Photon (photon.komoot.io) kullanılır; aynı sıkı kurallar (bina/mekân türü, ad tutmalı, doğru il) geçerli. Saniyede en çok 1 istek. */
let provider = "nom";
const PT = { street: "road", locality: "suburb", district: "district", city: "city", county: "county", state: "state", house: "house", other: "other" };
async function search(q, city, loose = false) {
  const il = NAME[city] || "Ankara";
  let L;
  if (provider === "nom") {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q + ", " + il)}`;
    const r = await fetch(u, { headers: { "user-agent": UA, referer: "https://nevarneyok.net.tr/" } });
    await sleep(1100);
    if (r.ok) L = await r.json();
    else if ([403, 429, 503].includes(r.status)) { provider = "photon"; log(`geo: Nominatim ${r.status}, Photon'a geçildi`); }
    else throw new Error("Nominatim " + r.status);
  }
  if (provider === "photon") {
    const u = `https://photon.komoot.io/api/?limit=5&bbox=25.6,35.8,44.9,42.2&q=${encodeURIComponent(q + ", " + il)}`;
    const r = await fetch(u, { headers: { "user-agent": UA, referer: "https://nevarneyok.net.tr/" } });
    await sleep(1100);
    if (!r.ok) throw new Error("Photon " + r.status);
    const j = await r.json();
    L = (j.features || []).filter((f) => (f.properties?.countrycode || "TR").toUpperCase() === "TR").map((f) => { const p = f.properties || {};
      return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: p.name || "", category: p.osm_key, class: p.osm_key, type: p.osm_value, addresstype: PT[p.type] || p.type,
        display_name: [p.name, p.street, p.district, p.city, p.county, p.state].filter(Boolean).join(", "), address: { province: p.state, state: p.state, city: p.city, county: p.county, road: p.street, suburb: p.district, house_number: p.housenumber } }; });
  }
  // loose: salon adresiyle arama (ad tutmak zorunda değil; yalnızca il ve mekân/cadde düzeyi)
  const ok = loose ? (x) => !["boundary", "place", "landuse", "natural"].includes(x.category || x.class) && !["city", "town", "village", "county", "state", "province", "district", "municipality"].includes(x.addresstype) : (x) => isPlace(x) && nameOk(want, x) && kindOk(want, (x.category || x.class) + "/" + x.type);
  if (!TR) return L.filter((x) => +x.lat > BOX.s && +x.lat < BOX.n && +x.lon > BOX.w && +x.lon < BOX.e && ok(x));
  return L.filter((x) => { const a = x.address || {}; return ok(x) && [a.province, a.state, a.city].some((p) => p && fl2(p).includes(fl2(il))); });
}
/* Yanlış konum olmasın (kullanıcı, 15.11.2026 23:46: "bazıları yanlış gösteriyor, hepsi doğru olmalı"). Önceden ilk sonuç alınıyordu;
   "Farabi Sahnesi" Farabi Sokağı'na, "Necip Fazıl Salonu" Pursaklar'daki aynı adlı yere, "Pursaklar DT Sahnesi" ilçenin ortasına düşüyordu.
   Artık yalnızca bina/mekân türündeki sonuç (sokak, mahalle, ilçe değil) ve adı mekânın ayırt edici bir sözcüğünü içeren sonuç kabul edilir.
   Bulunamazsa harita gösterilmez: yanlış harita göstermektense haritasız. */
const BAD = new Set(["highway", "place", "boundary", "landuse", "natural", "railway", "waterway", "route", "junction"]);
const isPlace = (x) => !BAD.has(x.category || x.class) && !["road", "suburb", "neighbourhood", "quarter", "city", "town", "village", "county", "state", "province", "district", "municipality", "hamlet"].includes(x.addresstype);
const STOP = new Set("sahne sahnesi salon salonu salonlari belediyesi belediye ankara kultur merkezi merkez muzesi muze devlet tiyatrolari tiyatro tiyatrosu sanat sanatlar sanatlari cafe kafe pub bar otel hotel park parki ici ve the club kulup kongre konferans avm alisveris dt ckm yeni buyuk kucuk salonlar".split(" "));
const toks = (s) => fl2(s).replace(/[çğöşü]/g, (c) => ({ ç: "c", ğ: "g", ö: "o", ş: "s", ü: "u" }[c])).split(" ").filter((w) => w.length >= 3);
let want = "";
function nameOk(v, x) {
  const vn = toks(v), all = toks([x.name, x.display_name?.split(",")[0]].join(" "));
  const key = vn.filter((w) => !STOP.has(w) && !Object.values(NAME).some((n) => toks(n).includes(w)));
  if (!all.length) return false;
  const par = (v.match(/\(([^)]+)\)/) || [])[1]; // "(Gençlik Parkı İçi)" gibi ipucu: sonucun adresinde de geçmeli
  if (par) { const dn = toks(x.display_name || ""); const pk = toks(par).filter((w) => !["ici", "yani", "karsisi"].includes(w)); if (pk.length && !pk.some((w) => dn.includes(w) || all.includes(w))) return false; }
  if (!key.length) return vn.every((w) => all.includes(w)); // "Etimesgut Belediyesi" gibi: bütün sözcükler tutmalı
  if (!key.some((w) => all.includes(w))) return false; // en az bir ayırt edici sözcük yerin adında, iki ve fazlasıysa ikincisi adda ya da adreste de tutmalı
  const dn = toks(x.display_name || ""); return key.filter((w) => all.includes(w) || dn.includes(w)).length >= Math.min(2, key.length);
}
let found = 0, tried = 0;
for (const [key, city, v] of todo) {
  let hit = null;
  let byAddr = false;
  try { want = v; for (const q of variants(v)) { const r = await search(q, city); tried++; if (r.length) { hit = r[0]; break; } }
    if (!hit && caddr.has(key)) { const ad = caddr.get(key).replace(/\S+@\S+/g, "").replace(/\b(AVM|Alışveriş Merkezi)\b/gi, "$1").replace(/\s+/g, " ").trim(); const r = await search(ad, city, true); tried++; if (r.length) { hit = r[0]; byAddr = true; } } }
  catch (err) { log("geo: durdu,", err.message); break; }
  if (!hit) { miss[key] = today; continue; }
  const a = hit.address || {};
  const ilce = a.city_district || a.district || a.town || a.county || a.suburb || "";
  const addr = [a.road && (a.road + (a.house_number ? " No:" + a.house_number : "")), a.suburb || a.neighbourhood, ilce].filter(Boolean).join(", ");
  venues[key] = { lat: +(+hit.lat).toFixed(7), lng: +(+hit.lon).toFixed(7), addr: byAddr ? caddr.get(key).replace(/\S+@\S+/g, "").trim() : addr, ilce: ilce.replace(/ İlçesi$/i, ""), src: "osm", v: 2, osm: (hit.category || hit.class) + "/" + hit.type, ...(byAddr ? { adr: 1 } : {}) };
  delete miss[key]; found++;
}
/* İğne yolun değil binanın üstünde olsun (kullanıcı, 23:47: "CerModern'de yolu gösteriyor, giriş oradan değil").
   Google'dan gelen konumlar adresin sokaktaki noktası olabiliyor. Mekânın OpenStreetMap'teki bina/mekân kaydı aranır;
   adı tutuyor ve eski noktaya 500 m'den yakınsa iğne oraya taşınır (eski nokta "gp" olarak kalır). 30 günde bir yeniden bakılır. */
const mdist = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 12742e3 * Math.asin(Math.sqrt(x)); };
let moved = 0, left = Math.max(0, MAX - tried);
for (const [k, x] of Object.entries(venues)) {
  if (left <= 0) break;
  if (!x || !x.place || x.src === "osm" || (x.chk && (Date.parse(today) - Date.parse(x.chk)) / 864e5 < 30)) continue;
  const city = TR ? k.split("|")[0] : "ankara", name = TR ? k.split("|").slice(1).join("|") : k;
  let hit = null;
  try { want = name; for (const q of variants(name)) { const r = await search(q, city); left--; const near = r.filter((h) => mdist([x.lat, x.lng], [+h.lat, +h.lon]) < 500); if (near.length) { hit = near[0]; break; } if (left <= 0) break; } }
  catch (err) { log("geo: durdu,", err.message); break; }
  x.chk = today;
  if (hit) { if (!x.gp) x.gp = [x.lat, x.lng]; x.lat = +(+hit.lat).toFixed(7); x.lng = +(+hit.lon).toFixed(7); x.osm = (hit.category || hit.class) + "/" + hit.type; moved++; }
}
if (moved) log(`geo: ${moved} mekânın iğnesi binanın üstüne taşındı`);
await writeJSON(join(ROOT, VF), venues, true);
await writeJSON(join(ROOT, MF), miss, true);
log(`geo: ${todo.length} mekân denendi (${tried} istek), ${found} konum bulundu; toplam ${Object.keys(venues).length} mekânın konumu var`);
