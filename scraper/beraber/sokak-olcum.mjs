// Sokak görünümü kapsam ölçümü (25.11.2026, kullanıcı: "önizleme Google Haritalar'daki sokak modu gibi olsun"):
// Panoramax ortak kataloğu (api.panoramax.xyz, anahtarsız, açık lisans; STAC arama) Türkiye'de il merkezlerinin çevresinde kaç sokak fotoğrafı var?
// Çıktı: günlüğe il il sayı + ilk birkaç fotoğrafın türü (360° mi), tarihi, lisansı. Siteye hiçbir şey yazmaz.
import { CITIES as C0 } from "../lib/cities.mjs";
const ILLL = { adana: [37.00, 35.32], adiyaman: [37.76, 38.28], afyonkarahisar: [38.76, 30.54], agri: [39.72, 43.05], amasya: [40.65, 35.83], ankara: [39.93, 32.86], antalya: [36.89, 30.71], artvin: [41.18, 41.82], aydin: [37.85, 27.84], balikesir: [39.65, 27.88], bilecik: [40.14, 29.98], bingol: [38.88, 40.50], bitlis: [38.40, 42.11], bolu: [40.74, 31.61], burdur: [37.72, 30.29], bursa: [40.19, 29.06], canakkale: [40.15, 26.41], cankiri: [40.60, 33.62], corum: [40.55, 34.95], denizli: [37.78, 29.09], diyarbakir: [37.91, 40.24], edirne: [41.68, 26.56], elazig: [38.68, 39.22], erzincan: [39.75, 39.49], erzurum: [39.90, 41.27], eskisehir: [39.78, 30.52], gaziantep: [37.07, 37.38], giresun: [40.91, 38.39], gumushane: [40.46, 39.48], hakkari: [37.58, 43.74], hatay: [36.20, 36.16], isparta: [37.76, 30.55], mersin: [36.81, 34.64], istanbul: [41.01, 28.98], izmir: [38.42, 27.14], kars: [40.60, 43.10], kastamonu: [41.38, 33.78], kayseri: [38.73, 35.49], kirklareli: [41.73, 27.22], kirsehir: [39.15, 34.16], kocaeli: [40.77, 29.92], konya: [37.87, 32.48], kutahya: [39.42, 29.98], malatya: [38.35, 38.31], manisa: [38.61, 27.43], kahramanmaras: [37.58, 36.94], mardin: [37.31, 40.74], mugla: [37.22, 28.36], mus: [38.75, 41.51], nevsehir: [38.62, 34.71], nigde: [37.97, 34.68], ordu: [40.98, 37.88], rize: [41.02, 40.52], sakarya: [40.78, 30.40], samsun: [41.29, 36.33], siirt: [37.93, 41.94], sinop: [42.03, 35.15], sivas: [39.75, 37.02], tekirdag: [40.98, 27.51], tokat: [40.31, 36.55], trabzon: [41.00, 39.72], tunceli: [39.11, 39.55], sanliurfa: [37.16, 38.79], usak: [38.68, 29.41], van: [38.50, 43.38], yozgat: [39.82, 34.81], zonguldak: [41.45, 31.79], aksaray: [38.37, 34.03], bayburt: [40.26, 40.23], karaman: [37.18, 33.22], kirikkale: [39.85, 33.51], batman: [37.88, 41.13], sirnak: [37.52, 42.46], bartin: [41.63, 32.34], ardahan: [41.11, 42.70], igdir: [39.92, 44.04], yalova: [40.65, 29.27], karabuk: [41.20, 32.62], kilis: [36.72, 37.12], osmaniye: [37.07, 36.25], duzce: [40.84, 31.16] };
const CITIES = C0.map((c) => ({ ...c, lat: ILLL[c.id]?.[0], lng: ILLL[c.id]?.[1] }));
const UA = { "User-Agent": "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr)" };
const j = async (u) => { try { const r = await fetch(u, { headers: UA }); return r.ok ? r.json() : { err: r.status }; } catch (e) { return { err: String(e.message || e) }; } };
const out = []; let tot = 0;
// bütün Türkiye: kaç koleksiyon (seri) var
const all = await j("https://api.panoramax.xyz/api/collections?bbox=25.6,35.8,44.9,42.2&limit=1000");
console.log("Türkiye'de seri:", all.features?.length ?? all.err, (all.features || []).slice(0, 8).map((c) => `${c.title || c.id} · ${c["stats:items"]?.count ?? "?"} foto · ${(c.extent?.temporal?.interval?.[0] || []).join("–")}`).join("\n  "));
for (const c of CITIES) {
  if (!c.lat) continue; const d = 0.06; // ~6 km
  const r = await j(`https://api.panoramax.xyz/api/search?bbox=${c.lng - d},${c.lat - d},${c.lng + d},${c.lat + d}&limit=500`);
  const F = r.features || []; tot += F.length;
  const pano = F.filter((f) => /equirectangular|360/i.test(JSON.stringify(f.properties?.["pers:interior_orientation"] || f.properties?.["geovisio:type"] || ""))).length;
  out.push([c.name, F.length, pano, F[0]?.properties?.datetime?.slice(0, 10) || "", F[0]?.properties?.license || ""]);
  await new Promise((res) => setTimeout(res, 400));
}
out.sort((a, b) => b[1] - a[1]);
console.log(`\nToplam (il merkezleri ±6 km, il başı en çok 500): ${tot}`);
for (const r of out) if (r[1]) console.log(`  ${r[0]}: ${r[1]} foto${r[2] ? ` (${r[2]} adet 360°)` : ""} · ${r[3]} · ${r[4]}`);
console.log(`Fotoğrafı olmayan il: ${out.filter((r) => !r[1]).length}/81`);
const s = await j(`https://api.panoramax.xyz/api/search?bbox=32.84,39.91,32.87,39.93&limit=3`); // Kızılay
console.log("\nKızılay örnek:", JSON.stringify((s.features || []).slice(0, 2).map((f) => ({ id: f.id, dt: f.properties?.datetime, typ: f.properties?.["geovisio:type"], az: f.properties?.["view:azimuth"], assets: Object.keys(f.assets || {}), links: (f.links || []).map((l) => l.rel) })), null, 1).slice(0, 2500));
