// Mekân konumları, toplu yöntem (18.11.2026, kullanıcı: "yer bazlı işaretlemeler her ilde olacak, hepsi tek tek").
// geo.mjs mekânları tek tek arıyordu (saniyede 1 istek, çoğu bulunamıyordu). Burada OpenStreetMap'in Overpass hizmetinden (anahtarsız)
// her ilin sınırları içindeki adlı mekânlar bir kerede alınır, bizim mekân adlarıyla yerelde eşleştirilir. İl sınırdan geldiği için il yanlış olamaz.
// "Yanlış harita göstermektense haritasız" kuralı sürer: ad tutmuyorsa ya da aynı ad ildeki farklı yerlerde varsa konum yazılmaz.
// GEO_DRY=1: yalnızca dener, dosyaları değiştirmez. GEO_ILLER="samsun van": yalnızca bu iller. Eşleşmeler scraper/out/geo-osm.tsv'ye yazılır.
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { ROOT, readJSON, writeJSON, sleep, log, todayIST } from "./lib/util.mjs";
import { CITIES, fold, cityOfText } from "./lib/cities.mjs";
import { fetchText } from "./lib/net.mjs";
import { kindOk } from "./lib/venue-kind.mjs";

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

// Her ilin konumu olmayan mekânları (etkinlik + sinema salonu), etkinlik sayısıyla; Biletinial bağlantısı olanların etkinlik sayfası da tutulur
const want = new Map(), biUrl = new Map(), cinema = new Set();
const add = (c, v, n = 1, e) => { v = String(v || "").trim(); if (!v || NOPE.test(v) || has(c, v)) return; const m = want.get(c) || want.set(c, new Map()).get(c); m.set(v, (m.get(v) || 0) + n);
  const u = (e?.tickets || []).find((t) => /biletinial\.com\/tr-tr\//.test(t.url || ""))?.url; if (u && !biUrl.has(c + "|" + v)) biUrl.set(c + "|" + v, u); };
for (const c of CITIES) {
  if (ONLY.length && !ONLY.includes(c.id)) continue;
  const ev = (await readJSON(join(ROOT, c.id === "ankara" ? "data/events.json" : `data/c/${c.id}.json`), { events: [] }))?.events || [];
  for (const e of ev) if (e.d >= today && e.status !== "iptal") add(c.id, e.venue, 1, e);
  const F = await readJSON(join(ROOT, c.id === "ankara" ? "data/films.json" : `data/c/${c.id}-films.json`), null);
  for (const x of Object.values(F?.cinemas || {})) { add(c.id, x?.name, 2); if (x?.name) cinema.add(c.id + "|" + x.name); }
}

const AM = "theatre|cinema|arts_centre|community_centre|conference_centre|events_venue|exhibition_centre|music_venue|planetarium|stage|nightclub|bar|pub|biergarten|cafe|restaurant|library|social_centre|university|college|townhall";
const query = (id) => `[out:json][timeout:240];area["ISO3166-2"="${iso(id)}"]["boundary"="administrative"]->.a;(nwr(area.a)["name"]["amenity"~"^(${AM})$"];nwr(area.a)["name"]["tourism"~"^(museum|gallery|hotel|attraction|theme_park|zoo|aquarium|resort)$"];nwr(area.a)["name"]["leisure"~"^(stadium|sports_centre|sports_hall|park|marina|water_park|dance|bowling_alley|ice_rink|garden)$"];nwr(area.a)["name"]["shop"="mall"];nwr(area.a)["name"]["building"~"^(civic|public|theatre|cinema|university|stadium|sports_hall|hotel|commercial)$"];nwr(area.a)["name"]["historic"~"^(castle|monument|ruins|archaeological_site|building)$"];);out center tags;`;
/* Türkiye'nin OpenStreetMap kopyası (Geofabrik, konum.yml süzüp GEO_SEQ dosyasına yazar) varsa sunucuya hiç sorulmaz; il, noktanın il sınırı içinde kalmasından bulunur.
   Yalnızca aradığımız mekânların sözcüklerini içeren yerler tutulur. Dosya yoksa Overpass'a il il sorulur. */
const SEQ = process.env.GEO_SEQ || "/tmp/tr.geojsonseq";
let byIl = null;
async function loadSeq() { if (!existsSync(SEQ)) return; const need = new Set(); for (const W of want.values()) for (const v of W.keys()) for (const q of variants(v)) for (const w of toks(q)) if (w.length > 2 && !GEN.has(w)) need.add(w);
  const areas = [], P = []; const idOf = (i) => PLATE[+i.slice(3) - 1];
  for await (const raw of createInterface({ input: createReadStream(SEQ), crlfDelay: Infinity })) { const line = raw.replace(/^\x1e/, ""); if (!line.includes('"name') && !line.includes("ISO3166-2")) continue; let f; try { f = JSON.parse(line); } catch { continue; } const t = f.properties || {}, g = f.geometry; if (!g) continue;
    if (/^TR-\d\d$/.test(t["ISO3166-2"] || "") && /Polygon/.test(g.type)) { const rings = (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map((p) => p[0].filter((_, i) => i % 4 === 0)); let w = 99, e = 0, s = 99, n = 0; for (const r of rings) for (const [x, y] of r) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); } areas.push({ id: idOf(t["ISO3166-2"]), rings, w, e, s, n }); continue; }
    const names = [t.name, t["name:tr"], t.alt_name, t.official_name, t.short_name, t.old_name].filter(Boolean); if (!names.length || !kindOf(t) || !names.some((n) => toks(n).some((w) => need.has(w)))) continue;
    let lon, lat; if (g.type === "Point") [lon, lat] = g.coordinates; else { let w = 99, e = 0, s = 99, n = 0; const walk = (a) => { if (typeof a[0] === "number") { w = Math.min(w, a[0]); e = Math.max(e, a[0]); s = Math.min(s, a[1]); n = Math.max(n, a[1]); } else a.forEach(walk); }; walk(g.coordinates); lon = (w + e) / 2; lat = (s + n) / 2; }
    P.push({ center: { lat, lon }, tags: t }); }
  const inside = (r, x, y) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [a, b] = r[i], [d, e] = r[j]; if ((b > y) !== (e > y) && x < (d - a) * (y - b) / (e - b) + a) c = !c; } return c; };
  byIl = {}; let lost = 0; for (const p of P) { const { lat: y, lon: x } = p.center, A = areas.find((a) => x >= a.w && x <= a.e && y >= a.s && y <= a.n && a.rings.some((r) => inside(r, x, y))); if (A) (byIl[A.id] ||= []).push(p); else lost++; }
  log(`geo-osm: OSM kopyası: ${areas.length} il sınırı, ${P.length} ilgili yer (${lost} tanesi il dışında kaldı)`); if (areas.length < 75) byIl = null; }
let ei = 0;
async function pois(id) { if (byIl) return byIl[id] || [];
  for (let t = 0; t < 6; t++) { const u = END[ei % END.length];
    try { const r = await fetch(u, { method: "POST", headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", referer: "https://nevarneyok.net.tr/" }, body: "data=" + encodeURIComponent(query(id)), signal: AbortSignal.timeout(280000) });
      if (r.ok) { const j = await r.json(); if (j.remark && !j.elements?.length) throw new Error(j.remark.slice(0, 80)); return j.elements || []; }
      throw new Error("durum " + r.status); }
    catch (err) { log(`geo-osm: ${id} ${new URL(u).host}: ${err.message}`); ei++; await sleep(8000 * (t + 1)); } }
  return null;
}

const GEN = new Set("sahne sahnesi salon salonu salonlari kultur kulturel merkez merkezi sanat sanatlar sanatlari tiyatro tiyatrosu tiyatrolari belediye belediyesi buyuksehir devlet sehir konser kongre konferans opera bale sinema sinemasi sinemalari avm alisveris park parki otel hotel cafe kafe bar pub club kulup restaurant restoran universite universitesi fakulte fakultesi muze muzesi galeri galerisi stadyum spor arena hall performans performance center centre merkezim ve ile the of in ici kampus kampusu ogretmenevi evi".split(" "));
const BRAND = new Set("cinemaximum cinetime paribu cineverse prestige avsar cinemapink cinens cine cineplus cinema cinemarine sinemia cinebonus megaplex".split(" "));
const WEAK = new Set("ataturk cumhuriyet milli gazi mehmet akif ersoy fatih sultan yunus emre mimar sinan ismet inonu hasan ali yucel kent halk genclik".split(" "));
const STRONG = /^(amenity\/(theatre|cinema|arts_centre|community_centre|conference_centre|events_venue|exhibition_centre|music_venue|planetarium|stage|university|college|library|townhall|nightclub)|shop\/mall|tourism\/(museum|gallery)|leisure\/(stadium|sports_hall)|building\/(theatre|cinema))$/;
const LOOSE = /^(amenity\/(cafe|restaurant|bar|pub|biergarten)|tourism\/hotel|leisure\/(park|garden))$/;
const toks = (s) => fold(s).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1);
const dist = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 12742e3 * Math.asin(Math.sqrt(x)); };
const kindOf = (t) => { for (const k of ["amenity", "shop", "tourism", "leisure", "historic", "building"]) if (t[k]) return k + "/" + t[k]; return ""; };
const ALIAS = [[/\bK\.\s?M\.?(?=\s|$)|\bKM\b/gi, "Kültür Merkezi"], [/\bKSM\b/gi, "Kültür Sanat Merkezi"], [/\bB\.\s?B\.?(?=\s|$)|\bBld\b\.?|\bBel\.(?=\s|$)/gi, "Belediyesi"], [/\bDT\b/g, "Devlet Tiyatrosu"], [/\bSanat Merk\.?(?=\s|$)/gi, "Sanat Merkezi"], [/\bÜniv?\.(?=\s|$)/gi, "Üniversitesi"]];
const expand = (v) => ALIAS.reduce((s, [r, b]) => s.replace(r, b), v);
const variants = (v0) => { const v = expand(v0), a = (toks(v).some((w) => BRAND.has(w)) ? v.replace(/[()]/g, " ") : v.replace(/\([^)]*\)/g, " ")).replace(/\s+/g, " ").trim(), first = a.split(/ · | - | – |,|\/|:/)[0].trim(), tail = (s) => s.replace(/\b((büyük|küçük|kırmızı|mor|mavi|yeşil|ana|çok amaçlı|[a-c0-9])\s+)?(sahne(si)?|salon(u)?)\b.*$/i, "").trim();
  return [...new Set([a, first, tail(a), tail(first)].filter((x) => x.length > 2))]; };

function index(els, il) { const L = [], by = new Map(), ilT = new Set(toks(il));
  for (const e of els) { const t = e.tags || {}, ll = e.center ? [e.center.lat, e.center.lon] : e.lat ? [e.lat, e.lon] : null; if (!ll) continue; const kind = kindOf(t);
    for (const n of new Set([t.name, t["name:tr"], t.alt_name, t.official_name, t.short_name, t.old_name].filter(Boolean).flatMap((s) => s.split(";")))) { const all = toks(n), P = new Set(all.filter((w) => !ilT.has(w))); if (!all.length) continue;
      const x = { n: t.name, ll, kind, t, all: new Set(all), P }; const i = L.push(x) - 1; for (const w of new Set(all)) (by.get(w) || by.set(w, []).get(w)).push(i); } }
  return { L, by, ilT }; }
function score(Vall, V0, x) { const P0 = x.P, V = new Set([...V0].filter((w) => !BRAND.has(w))), P = new Set([...P0].filter((w) => !BRAND.has(w))); let c = 0; for (const w of V) if (P.has(w)) c++;
  if (Vall.size === x.all.size && [...Vall].every((w) => x.all.has(w))) return 3; // adın tamamı aynı
  if (!c || !V.size || !P.size) return 0; const D = [...V].filter((w) => P.has(w) && !GEN.has(w) && !BRAND.has(w) && w.length > 2); if (!D.length) return 0;
  const rest = [...V].filter((w) => !GEN.has(w) && !BRAND.has(w)); if (rest.some((w) => w.length > 2) && !rest.filter((w) => w.length > 2).every((w) => P.has(w))) return 0; // mekânın ayırt edici sözcüklerinin hepsi tutmalı
  if (D.every((w) => WEAK.has(w)) && c < 3 && c < V.size) return 0;
  const inV = c === P.size, inP = c === V.size, jac = c / (V.size + P.size - c); if (!inV && !inP) return 0;
  const strong = STRONG.test(x.kind), loose = LOOSE.test(x.kind);
  if (loose && jac < .75) return 0; if (!strong && jac < .5) return 0; if (strong && jac < .34) return 0; if (inV && P.size === 1 && !(strong && [...P][0].length >= 5)) return 0;
  if (V.size === 1 && !strong && jac < 1) return 0; if (inP && !inV && jac < .6 && ![...P].every((w) => V.has(w) || GEN.has(w))) return 0; // yerin adında mekânda olmayan başka ayırt edici sözcük varsa başka yerdir
  return jac + (strong ? .3 : 0); }
function match(v, I) { let best = null;
  for (const q of variants(v)) { const all = toks(q), Vall = new Set(all), V = new Set(all.filter((w) => !I.ilT.has(w))); const seen = new Set(), hits = [];
    for (const w of Vall) { if (GEN.has(w) || I.ilT.has(w)) continue; for (const i of I.by.get(w) || []) { if (seen.has(i)) continue; seen.add(i); const s = score(Vall, V, I.L[i]); if (s) hits.push([s, I.L[i]]); } }
    if (!hits.length) continue; hits.sort((a, b) => b[0] - a[0]); const [s, x] = hits[0];
    if (hits.some(([z, y]) => z >= s - .05 && dist(x.ll, y.ll) > 500)) return null; // aynı ad ilin başka yerinde de var: hangisi olduğu belli değil
    best = x; break; }
  return best; }

const put = (c, v, rec) => { if (c === "ankara") { VA[v] = rec; delete MA[v]; } else { VT[c + "|" + v] = rec; delete MT[c + "|" + v]; } want.get(c)?.delete(v); };
const clean = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const inTR = (a, o) => a > 35.7 && a < 42.3 && o > 25.5 && o < 44.9;

/* 1) Biletinial'in kendi mekân sayfaları (18.11.2026): etkinlik sayfasında mekâna bağlantı (/tr-tr/mekan/<ad>), mekân sayfasında adres ve haritanın koordinatı var.
   Aynı adlı mekân birçok ilde olabilir ("Atatürk Sanat Merkezi" 47 ilde): sayfadaki adres ilimizi göstermiyorsa alınmaz. Yalnızca olgu (adres, koordinat) saklanır. */
const BI_MAX = +(process.env.GEO_BI_MAX || 6000), slugs = new Map(), pages = new Map(); let biReq = 0, biHit = 0;
const ILW = new Set(CITIES.flatMap((c) => toks(c.name))), nk = (s) => toks(expand(s)).filter((w) => !ILW.has(w)).join(" ");
async function biPage(slug) { if (pages.has(slug)) return pages.get(slug); biReq++; await sleep(300); const r = await fetchText(`https://biletinial.com/tr-tr/mekan/${slug}`, { retries: 1 }), h = r.text || "";
  const m = h.match(/maps\.google\.com\/maps\?q=(-?\d+\.\d+)\s*(?:,|%2C)\s*(-?\d+\.\d+)/i), ad = clean((h.match(/<h3>\s*Adres\s*<\/h3>\s*<p>([\s\S]*?)<\/p>/i) || [])[1]);
  const p = m && inTR(+m[1], +m[2]) ? { lat: +m[1], lng: +m[2], addr: ad } : ad ? { addr: ad } : null; pages.set(slug, p); return p; }
const biTodo = [...biUrl].filter(([k]) => { const i = k.indexOf("|"); return want.get(k.slice(0, i))?.has(k.slice(i + 1)); }), seenU = new Set();
for (const [k, u] of biTodo) { if (biReq >= BI_MAX) break; const i = k.indexOf("|"), c = k.slice(0, i), v = k.slice(i + 1); if (!want.get(c)?.has(v)) continue;
  if (!slugs.has(nk(v)) && !seenU.has(u)) { seenU.add(u); biReq++; await sleep(300); const r = await fetchText(u, { retries: 1 }); for (const m of (r.text || "").matchAll(/href="\/tr-tr\/mekan\/([a-z0-9-]+)"[^>]*>([^<]{2,120})</gi)) { const n = nk(clean(m[2])); (slugs.get(n) || slugs.set(n, new Set()).get(n)).add(m[1]); } }
  for (const s of slugs.get(nk(v)) || []) { const p = await biPage(s); if (!p?.lat) continue; const il = cityOfText(p.addr); if (il !== c) continue;
    put(c, v, { lat: +p.lat.toFixed(7), lng: +p.lng.toFixed(7), addr: p.addr, ilce: (p.addr.match(/([^\s,\/]+)\s*\/\s*[^\/]+$/) || [])[1] || "", src: "biletinial", v: 2 }); biHit++; break; } }
log(`geo-osm: Biletinial mekân sayfaları: ${biHit} mekân bulundu (${biReq} istek, ${slugs.size} mekân adı)`);

// 1b) Kaynak sayfalarının yapısal verisi (AllEvents, Biletix, biletimGO, Radar): adresi o ili gösteren ve merkez noktası olmayan koordinat
{ const VL = await readJSON(join(ROOT, "data/c/_vloc.json"), {}) || {}; let n = 0; for (const [k, x] of Object.entries(VL)) { if (!x?.g) continue; const i = k.indexOf("|"), c = k.slice(0, i), v = k.slice(i + 1); if (!want.get(c)?.has(v)) continue; put(c, v, { lat: x.g[0], lng: x.g[1], addr: x.a, ilce: "", src: "jsonld", v: 2 }); n++; } log(`geo-osm: kaynak sayfası koordinatı: ${n} mekân`); }
await loadSeq();
// 2) Kalanlar: OpenStreetMap yerleri + aynı ildeki konumu bilinen mekânlar ("AYDIN GÜN SALONU" = "Aydın Gün Salonu", "Ata Sahne" = "Atakum Belediyesi Ata Sahne")
await mkdir(join(ROOT, "scraper/out"), { recursive: true });
const known = (c) => Object.entries(c === "ankara" ? VA : Object.fromEntries(Object.entries(VT).filter(([k]) => k.startsWith(c + "|")).map(([k, x]) => [k.slice(c.length + 1), x]))).filter(([, x]) => x?.lat).map(([n, x]) => ({ type: "known", center: { lat: x.lat, lon: x.lng }, tags: { name: expand(n), amenity: "theatre", "nvny:addr": x.addr || "", "addr:district": x.ilce || "" } }));
const TSV = []; let tot = 0, hit = 0, evT = 0, evH = 0, fail = 0; const rep = [];
for (const c of CITIES) { const W = want.get(c.id); if (!W?.size) continue;
  let els = await pois(c.id); await sleep(2500); if (!els) { fail++; rep.push(`${c.id}:YOK`); els = []; }
  const I = index([...known(c.id), ...els], c.name); let h = 0;
  for (const [v, n] of [...W]) { tot++; evT += n; const x0 = match(v, I), x = x0 && kindOk(v, x0.kind) ? x0 : null; TSV.push([c.id, n, v, x ? x.n : "", x ? x.kind : ""].join("\t")); if (!x) continue; hit++; h++; evH += n; const t = x.t;
    const addr = t["nvny:addr"] || [t["addr:street"] && (t["addr:street"] + (t["addr:housenumber"] ? " No:" + t["addr:housenumber"] : "")), t["addr:neighbourhood"] || t["addr:suburb"], t["addr:district"]].filter(Boolean).join(", ");
    put(c.id, v, { lat: +x.ll[0].toFixed(7), lng: +x.ll[1].toFixed(7), addr, ilce: t["addr:district"] || "", src: "osm", v: 2, osm: x.kind, m: "ov" }); }
  rep.push(`${c.id}:${h}/${W.size + h}(${els.length})`); log(`geo-osm: ${c.name}: ${els.length} OSM yeri, ${h} mekân eşleşti, ${W.size} kaldı`); }
await writeFile(join(ROOT, "scraper/out/geo-osm.tsv"), TSV.join("\n"));
if (DRY) { const H = TSV.map((l) => l.split("\t")); console.log("--- eşleşenler\n" + H.filter((x) => x[3]).slice(0, 120).map((x) => `${x[0]} | ${x[2]} => ${x[3]} [${x[4]}]`).join("\n")); console.log("--- kalanlar\n" + H.filter((x) => !x[3]).sort((a, b) => b[1] - a[1]).slice(0, 80).map((x) => `${x[0]} | ${x[1]} | ${x[2]}`).join("\n")); }
// sinema salonları adresleriyle yeniden denensin diye (geo.mjs) eski "bulunamadı" kayıtları silinir
for (const k of cinema) if (MT[k] && (Date.parse(today) - Date.parse(MT[k])) / 864e5 >= 2) delete MT[k];
if (!DRY) { await writeJSON(join(ROOT, "data/venues-tr.json"), VT, true); await writeJSON(join(ROOT, "data/venues.json"), VA, true); await writeJSON(join(ROOT, "data/geo-miss-tr.json"), MT, true); await writeJSON(join(ROOT, "data/geo-miss.json"), MA, true); }
log(`geo-osm${DRY ? " (deneme)" : ""}: Biletinial ${biHit}, OSM + aynı il ${hit}/${tot} (etkinlik ağırlığı ${evH}/${evT}); alınamayan il ${fail}`); log(rep.join(" "));
