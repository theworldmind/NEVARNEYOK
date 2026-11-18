// Mekân konumları, toplu yöntem (18.11.2026, kullanıcı: "yer bazlı işaretlemeler her ilde olacak, hepsi tek tek").
// geo.mjs mekânları tek tek arıyordu (saniyede 1 istek, çoğu bulunamıyordu). Burada OpenStreetMap'in Overpass hizmetinden (anahtarsız)
// her ilin sınırları içindeki adlı mekânlar bir kerede alınır, bizim mekân adlarıyla yerelde eşleştirilir. İl sınırdan geldiği için il yanlış olamaz.
// "Yanlış harita göstermektense haritasız" kuralı sürer: ad tutmuyorsa ya da aynı ad ildeki farklı yerlerde varsa konum yazılmaz.
// GEO_DRY=1: yalnızca dener, dosyaları değiştirmez. GEO_ILLER="samsun van": yalnızca bu iller. Eşleşmeler scraper/out/geo-osm.tsv'ye yazılır.
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { ROOT, readJSON, writeJSON, sleep, log, todayIST } from "./lib/util.mjs";
import { CITIES, fold } from "./lib/cities.mjs";

const DRY = /^(1|true)$/.test(process.env.GEO_DRY || ""), ONLY = (process.env.GEO_ILLER || "").split(/\s+/).filter(Boolean);
const UA = "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr; contact.openmind.vision@gmail.com)";
const END = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const PLATE = "adana adiyaman afyonkarahisar agri amasya ankara antalya artvin aydin balikesir bilecik bingol bitlis bolu burdur bursa canakkale cankiri corum denizli diyarbakir edirne elazig erzincan erzurum eskisehir gaziantep giresun gumushane hakkari hatay isparta mersin istanbul izmir kars kastamonu kayseri kirklareli kirsehir kocaeli konya kutahya malatya manisa kahramanmaras mardin mugla mus nevsehir nigde ordu rize sakarya samsun siirt sinop sivas tekirdag tokat trabzon tunceli sanliurfa usak van yozgat zonguldak aksaray bayburt karaman kirikkale batman sirnak bartin ardahan igdir yalova karabuk kilis osmaniye duzce".split(" ");
const iso = (id) => "TR-" + String(PLATE.indexOf(id) + 1).padStart(2, "0");

const today = todayIST();
const VT = (await readJSON(join(ROOT, "data/venues-tr.json"), {})) || {}, VA = (await readJSON(join(ROOT, "data/venues.json"), {})) || {};
const MT = (await readJSON(join(ROOT, "data/geo-miss-tr.json"), {})) || {}, MA = (await readJSON(join(ROOT, "data/geo-miss.json"), {})) || {};
const has = (c, v) => c === "ankara" ? VA[v]?.lat : VT[c + "|" + v]?.lat;
const NOPE = /^(tüm mekanlar|tum mekanlar|online|çevrimiçi|çeşitli mekânlar|belirtilmedi)$|\bsinemaları$/i;

// Her ilin konumu olmayan mekânları (etkinlik + sinema salonu), etkinlik sayısıyla
const want = new Map();
const add = (c, v, n = 1) => { v = String(v || "").trim(); if (!v || NOPE.test(v) || has(c, v)) return; const m = want.get(c) || want.set(c, new Map()).get(c); m.set(v, (m.get(v) || 0) + n); };
for (const c of CITIES) {
  if (ONLY.length && !ONLY.includes(c.id)) continue;
  const ev = (await readJSON(join(ROOT, c.id === "ankara" ? "data/events.json" : `data/c/${c.id}.json`), { events: [] }))?.events || [];
  for (const e of ev) if (e.d >= today && e.status !== "iptal") add(c.id, e.venue);
  const F = await readJSON(join(ROOT, c.id === "ankara" ? "data/films.json" : `data/c/${c.id}-films.json`), null);
  for (const x of Object.values(F?.cinemas || {})) add(c.id, x?.name, 2);
}

const AM = "theatre|cinema|arts_centre|community_centre|conference_centre|events_venue|exhibition_centre|music_venue|planetarium|stage|nightclub|bar|pub|biergarten|cafe|restaurant|library|social_centre|university|college|townhall";
const query = (id) => `[out:json][timeout:240];area["ISO3166-2"="${iso(id)}"]["boundary"="administrative"]->.a;(nwr(area.a)["name"]["amenity"~"^(${AM})$"];nwr(area.a)["name"]["tourism"~"^(museum|gallery|hotel|attraction|theme_park|zoo|aquarium|resort)$"];nwr(area.a)["name"]["leisure"~"^(stadium|sports_centre|sports_hall|park|marina|water_park|dance|bowling_alley|ice_rink|garden)$"];nwr(area.a)["name"]["shop"="mall"];nwr(area.a)["name"]["building"~"^(civic|public|theatre|cinema|university|stadium|sports_hall|hotel|commercial)$"];nwr(area.a)["name"]["historic"~"^(castle|monument|ruins|archaeological_site|building)$"];);out center tags;`;
let ei = 0;
async function pois(id) {
  for (let t = 0; t < 6; t++) { const u = END[ei % END.length];
    try { const r = await fetch(u, { method: "POST", headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", referer: "https://nevarneyok.net.tr/" }, body: "data=" + encodeURIComponent(query(id)), signal: AbortSignal.timeout(280000) });
      if (r.ok) { const j = await r.json(); if (j.remark && !j.elements?.length) throw new Error(j.remark.slice(0, 80)); return j.elements || []; }
      throw new Error("durum " + r.status); }
    catch (err) { log(`geo-osm: ${id} ${new URL(u).host}: ${err.message}`); ei++; await sleep(8000 * (t + 1)); } }
  return null;
}

const GEN = new Set("sahne sahnesi salon salonu salonlari kultur kulturel merkez merkezi sanat sanatlar sanatlari tiyatro tiyatrosu tiyatrolari belediye belediyesi buyuksehir devlet sehir konser kongre konferans opera bale sinema sinemasi sinemalari avm alisveris park parki otel hotel cafe kafe bar pub club kulup restaurant restoran universite universitesi fakulte fakultesi muze muzesi galeri galerisi stadyum spor arena hall performans performance center centre merkezim ve ile the of in ici kampus kampusu ogretmenevi evi".split(" "));
const BRAND = new Set("cinemaximum cinetime paribu cineverse prestige avsar cinemapink cinens cine cinema cinemarine sinemia cinebonus megaplex".split(" "));
const WEAK = new Set("ataturk cumhuriyet milli gazi mehmet akif ersoy fatih sultan yunus emre mimar sinan ismet inonu hasan ali yucel kent halk genclik".split(" "));
const STRONG = /^(amenity\/(theatre|cinema|arts_centre|community_centre|conference_centre|events_venue|exhibition_centre|music_venue|planetarium|stage|university|college|library|townhall|nightclub)|shop\/mall|tourism\/(museum|gallery)|leisure\/(stadium|sports_hall)|building\/(theatre|cinema|civic|public))$/;
const LOOSE = /^(amenity\/(cafe|restaurant|bar|pub|biergarten)|tourism\/hotel|leisure\/(park|garden))$/;
const toks = (s) => fold(s).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1);
const dist = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 12742e3 * Math.asin(Math.sqrt(x)); };
const kindOf = (t) => { for (const k of ["amenity", "shop", "tourism", "leisure", "historic", "building"]) if (t[k]) return k + "/" + t[k]; return ""; };
const variants = (v) => { const a = v.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim(), first = a.split(/ · | - | – |,|\/|:/)[0].trim(), tail = (s) => s.replace(/\b((büyük|küçük|kırmızı|mor|mavi|yeşil|ana|çok amaçlı|[a-c0-9])\s+)?(sahne(si)?|salon(u)?)\b.*$/i, "").trim();
  return [...new Set([a, first, tail(a), tail(first)].filter((x) => x.length > 2))]; };

function index(els, il) { const L = [], by = new Map(), ilT = new Set(toks(il));
  for (const e of els) { const t = e.tags || {}, ll = e.center ? [e.center.lat, e.center.lon] : e.lat ? [e.lat, e.lon] : null; if (!ll) continue; const kind = kindOf(t);
    for (const n of new Set([t.name, t["name:tr"], t.alt_name, t.official_name, t.short_name, t.old_name].filter(Boolean).flatMap((s) => s.split(";")))) { const all = toks(n), P = new Set(all.filter((w) => !ilT.has(w))); if (!all.length) continue;
      const x = { n: t.name, ll, kind, t, all: new Set(all), P }; const i = L.push(x) - 1; for (const w of new Set(all)) (by.get(w) || by.set(w, []).get(w)).push(i); } }
  return { L, by, ilT }; }
function score(Vall, V, x) { const P = x.P; let c = 0; for (const w of V) if (P.has(w)) c++;
  if (Vall.size === x.all.size && [...Vall].every((w) => x.all.has(w))) return 3; // adın tamamı aynı
  if (!c || !V.size || !P.size) return 0; const D = [...V].filter((w) => P.has(w) && !GEN.has(w) && !BRAND.has(w) && w.length > 2); if (!D.length) return 0;
  const rest = [...V].filter((w) => !GEN.has(w) && !BRAND.has(w)); if (rest.some((w) => w.length > 2) && !rest.filter((w) => w.length > 2).every((w) => P.has(w))) return 0; // mekânın ayırt edici sözcüklerinin hepsi tutmalı
  if (D.every((w) => WEAK.has(w)) && c < 3 && c < V.size) return 0;
  const inV = c === P.size, inP = c === V.size, jac = c / (V.size + P.size - c); if (!inV && !inP) return 0;
  const strong = STRONG.test(x.kind), loose = LOOSE.test(x.kind);
  if (loose && jac < .75) return 0; if (!strong && jac < .5) return 0; if (strong && jac < .34) return 0; if (inV && P.size === 1 && !(strong && [...P][0].length >= 5)) return 0;
  return jac + (strong ? .3 : 0); }
function match(v, I) { let best = null;
  for (const q of variants(v)) { const all = toks(q), Vall = new Set(all), V = new Set(all.filter((w) => !I.ilT.has(w))); const seen = new Set(), hits = [];
    for (const w of Vall) { if (GEN.has(w) || I.ilT.has(w)) continue; for (const i of I.by.get(w) || []) { if (seen.has(i)) continue; seen.add(i); const s = score(Vall, V, I.L[i]); if (s) hits.push([s, I.L[i]]); } }
    if (!hits.length) continue; hits.sort((a, b) => b[0] - a[0]); const [s, x] = hits[0];
    if (hits.some(([z, y]) => z >= s - .05 && dist(x.ll, y.ll) > 500)) return null; // aynı ad ilin başka yerinde de var: hangisi olduğu belli değil
    best = x; break; }
  return best; }

await mkdir(join(ROOT, "scraper/out"), { recursive: true });
const TSV = []; let tot = 0, hit = 0, evT = 0, evH = 0, fail = 0; const rep = [];
for (const c of CITIES) { const W = want.get(c.id); if (!W?.size) continue;
  const els = await pois(c.id); await sleep(2500); if (!els) { fail++; rep.push(`${c.id}:YOK`); continue; }
  const I = index(els, c.name); let h = 0;
  for (const [v, n] of W) { tot++; evT += n; const x = match(v, I); TSV.push([c.id, n, v, x ? x.n : "", x ? x.kind : ""].join("\t")); if (!x) continue; hit++; h++; evH += n; const t = x.t;
    const addr = [t["addr:street"] && (t["addr:street"] + (t["addr:housenumber"] ? " No:" + t["addr:housenumber"] : "")), t["addr:neighbourhood"] || t["addr:suburb"], t["addr:district"]].filter(Boolean).join(", ");
    const rec = { lat: +x.ll[0].toFixed(7), lng: +x.ll[1].toFixed(7), addr, ilce: t["addr:district"] || "", src: "osm", v: 2, osm: x.kind, m: "ov" };
    if (c.id === "ankara") { VA[v] = rec; delete MA[v]; } else { VT[c.id + "|" + v] = rec; delete MT[c.id + "|" + v]; } }
  rep.push(`${c.id}:${h}/${W.size}(${els.length})`); log(`geo-osm: ${c.name}: ${els.length} OSM yeri, ${h}/${W.size} mekân eşleşti`); }
await writeFile(join(ROOT, "scraper/out/geo-osm.tsv"), TSV.join("\n"));
if (!DRY) { await writeJSON(join(ROOT, "data/venues-tr.json"), VT, true); await writeJSON(join(ROOT, "data/venues.json"), VA, true); await writeJSON(join(ROOT, "data/geo-miss-tr.json"), MT, true); await writeJSON(join(ROOT, "data/geo-miss.json"), MA, true); }
log(`geo-osm${DRY ? " (deneme)" : ""}: ${hit}/${tot} mekân bulundu (etkinlik ağırlığı ${evH}/${evT}); alınamayan il ${fail}`); log(rep.join(" "));
