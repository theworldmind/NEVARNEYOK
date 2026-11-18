// BÜTÜN TÜRKİYE: il taramalarını birleştir → data/c/<il>.json (sitenin okuduğu) ve data/cities.json (hangi ilde ne kadar etkinlik var)
//   data/c/src/<il>.json   : o ilin kendi taraması (Biletix, Biletinial; CITY=<il> node run.mjs)
//   data/c/_tr.json        : bütün Türkiye listeleri (Sanatçepte/Devlet Tiyatroları, DOB; CITY=tr), etkinliğin ili `city` alanında
//   data/c/<il>-films.json : o ilin sinema seansları (films.mjs)
// Ankara kendi taramasıyla (data/events.json, data/films.json) gelir; burada yalnızca sayılır.
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { ROOT, log, readJSON, writeJSON, todayIST, fold } from "./lib/util.mjs";
import { CITIES, cityOfText } from "./lib/cities.mjs";
import { vlocAdd, vlocFinal } from "./lib/vloc.mjs";
import { haberEvents } from "./haber-kesif.mjs";


const today = todayIST();
const key = (e) => fold(e.title).replace(/[^a-z0-9]+/g, "") + "|" + e.d + "|" + (e.t || "");
// Aynı etkinlik mi? Aynı gün; saat aynı ya da birinde yok; adların anlamlı kelimeleri büyük ölçüde örtüşüyor (ya da biri ötekini kapsıyor).
// Farklı sitedeki kayıt birleşir, bilet ve fiyatları yan yana durur (kullanıcı isteği, 15.11.2026: "olabildiğince iyi fiyat karşılaştırması").
const STOP = new Set("ve ile the and a an de da bir icin konseri konser tiyatro oyunu oyun muzikal muzikali stand up standup gosterisi gosteri sahnede canli live tour turnesi etkinligi biletleri bilet ozel performans".split(" "));
const toks = (t) => new Set(fold(String(t || "").replace(/\([^)]*\)/g, " ")).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !CITIES.some((c) => fold(c.name) === w)));
const tk = new WeakMap(), T = (e) => tk.get(e) || (tk.set(e, toks(e.title)), tk.get(e));
function same(a, b) {
  if (a.t && b.t && a.t !== b.t) return false;
  if ((a.tickets || []).some((x) => (b.tickets || []).some((y) => y.site === x.site))) return false; // aynı sitenin iki ayrı kaydı birleşmez
  const A = T(a), B = T(b); if (!A.size || !B.size) return false;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  const small = Math.min(A.size, B.size), jac = n / (A.size + B.size - n);
  return (n >= 2 && n / small >= .8) || jac >= .6 || (small === 1 && n === 1 && a.t && a.t === b.t && fold(a.venue).slice(0, 6) === fold(b.venue).slice(0, 6));
}
const tr = (await readJSON(join(ROOT, "data/c/_tr.json"), { events: [] })).events || [];
const HABER = (await readJSON(join(ROOT, "data/haber.json"), { items: [] })).items || []; // haber-kesif.mjs
const have = new Set(await readdir(join(ROOT, "data/c")).catch(() => []));
const index = { updated: new Date().toISOString(), cities: {} };
const pool7 = []; // girişteki kayan sayfalar için: her ilin önümüzdeki 7 gündeki afişli etkinlikleri
const wk = new Date(Date.parse(today + "T12:00:00Z") + 7 * 864e5).toISOString().slice(0, 10);
const take = (C, L) => { for (const e of L) if (e.img && e.d >= today && e.d <= wk && !/iptal|ertelendi/.test(e.status || "")) pool7.push({ e, C, s: (e.tickets || []).length * 2 + (e.status === "tukendi" ? 3 : 0) + (/arena|psm|akm|kongre|opera|cso|stadyum|holly stone|jolly joker|bostanci|volkswagen|harbiye/i.test(e.venue || "") ? 3 : 0) + (["konser", "tiyatro", "standup", "festival"].includes(e.cat) ? 1 : 0) }); };

/* Turne seansları yanlış ile yazılmasın (kullanıcı, 15.11.2026: "konumlar doğru olmalı"): bilet sitesinin etkinlik sayfası bütün illerin
   seanslarını verdiği için aynı seans (ad, gün, saat, mekân) birden çok ilin listesine düşebiliyor. Seans birden çok ilde varsa yalnızca
   mekânın asıl ilinde kalır: mekân adında il geçiyorsa o il; yoksa o mekânda en çok farklı etkinliği olan il (Ankara kendi taramasıyla sayılır). */
const vk = (e) => fold(e.venue || "").replace(/[^a-z0-9]+/g, "");
const sk = (e) => key(e) + "|" + vk(e);
const SRC = {}, vTitles = new Map(), sCities = new Map();
for (const C of CITIES) {
  const L = C.id === "ankara" ? ((await readJSON(join(ROOT, "data/events.json"), { events: [] })).events || []) : [...tr.filter((x) => x.city === C.id), ...(((await readJSON(join(ROOT, `data/c/src/${C.id}.json`), { events: [] })).events) || [])];
  if (C.id !== "ankara") L.push(...haberEvents(HABER, C.id)); // haberden keşfedilenler en sonda: aynı etkinlik bilet sitesinde varsa onunla birleşir
  SRC[C.id] = L;
  for (const e of L) { if (e.d < today || !e.venue) continue; const v = vk(e);
    const m = vTitles.get(v) || vTitles.set(v, new Map()).get(v); (m.get(C.id) || m.set(C.id, new Set()).get(C.id)).add(fold(e.title));
    (sCities.get(sk(e)) || sCities.set(sk(e), new Set()).get(sk(e))).add(C.id); }
}
const VL = {}; for (const C of CITIES) for (const e of SRC[C.id]) { vlocAdd(VL, C.id, e); delete e.vg; delete e.va; } // kaynakların yapısal adres/koordinatı: geo-osm.mjs ve geo.mjs kullanır
const homeOf = (e) => { const t = cityOfText(e.venue || ""); if (t) return t; const m = vTitles.get(vk(e)); if (!m) return ""; let best = "", bn = 0; for (const [c, S] of m) if (S.size > bn) { bn = S.size; best = c; } return best; };
/* Mekânın adında başka il yazıyorsa etkinlik o ilindir (18.11.2026: İstanbul listesinde "Jolly Joker Ankara", Bolu'da "Tekirdağ … Kültür Merkezi"): doğru ilin listesine taşınır.
   Cadde/sokak adları ve "Van Gogh" gibi adlar sayılmaz; Ankara kendi taramasıyla geldiği için oraya gidecek kayıt yalnızca bu listeden çıkar. */
const NAMES = CITIES.map((c) => [c.id, new RegExp("(^|[^a-z0-9])" + fold(c.name) + "($|[^a-z0-9])")]);
const venueCity0 = (e, cid) => { const v = fold(e.venue || ""); if (!v || /cadde|caddesi|sokak|sokagi|bulvar|mahalle|van gogh/.test(v)) return ""; const hit = NAMES.filter(([, r]) => r.test(v)).map(([id]) => id); return hit.length && !hit.includes(cid) ? hit[0] : ""; };
/* konum işinin bulduğu doğru il: mekân başka ilde tek yerde kayıtlıysa ya da adının başı/sonu başka ilin ilçesiyse ("Watergarden Ataşehir", "Kadıköy … Merkezi") */
const VIL = (await readJSON(join(ROOT, "data/c/_vil.json"), {})) || {}, ILC = (await readJSON(join(ROOT, "data/c/_ilce.json"), {})) || {}, ILNO = new Set("bahce kale kent mavi sahne yildiz merkez cumhuriyet gazi".split(" "));
const venueCity = (e, cid) => { const a = venueCity0(e, cid); if (a) return a; const k = VIL[cid + "|" + e.venue]; if (k) return k; const W = fold(e.venue || "").replace(/[^a-z0-9]+/g, " ").trim().split(" "); for (const w of [W[0], W[W.length - 1]]) { const c = ILC[w]; if (c && c !== cid && !ILNO.has(w)) return c; } return ""; };
const moved = {}; let relocated = 0;
for (const C of CITIES) { if (C.id === "ankara") continue; SRC[C.id] = SRC[C.id].filter((e) => { const h = e.d >= today && venueCity(e, C.id); if (!h) return true; relocated++; if (h !== "ankara") (moved[h] ||= []).push(e); return false; }); }
let dropped = 0;
const wrongCity = (e, cid) => { const cs = sCities.get(sk(e)); if (!cs || cs.size < 2) return false; const h = homeOf(e); if (h && h !== cid && cs.has(h)) { dropped++; return true; } return false; };

for (const C of CITIES) {
  let n = 0, films = 0, posters = 0;
  if (C.id === "ankara") {
    const ev = (await readJSON(join(ROOT, "data/events.json"), { events: [] })).events || [];
    const L = ev.filter((e) => e.d >= today); n = L.length; posters = L.filter((e) => e.img).length; take(C, L);
    films = ((await readJSON(join(ROOT, "data/films.json"), { films: [] })).films || []).filter((f) => Object.keys(f.s || {}).length).length; // yalnızca seansı olan filmler
  } else {
    const out = new Map(), byDay = new Map();
    for (const e of [...SRC[C.id], ...(moved[C.id] || [])]) { // kamu kaynağı önce: ad, saat, mekân ondan
      if (e.d < today) continue;
      if (wrongCity(e, C.id)) continue;
      const k = key(e); let m = out.get(k);
      if (!m) m = (byDay.get(e.d) || []).find((x) => same(x, e)); // aynı etkinlik başka sitede başka adla (fiyat karşılaştırması için birleştir)
      if (!m) { const n = { ...e, city: C.id, tickets: [...(e.tickets || [])] }; out.set(k, n); (byDay.get(e.d) || byDay.set(e.d, []).get(e.d)).push(n); continue; }
      for (const t of e.tickets || []) if (!m.tickets.some((x) => x.site === t.site)) m.tickets.push(t);
      if (!m.img && e.img) { m.img = e.img; m.imgBy = e.imgBy; }
    }
    const events = [...out.values()].sort((a, b) => a.d.localeCompare(b.d) || (a.t || "99").localeCompare(b.t || "99"));
    n = events.length; posters = events.filter((e) => e.img).length; take(C, events);
    if (have.has(`${C.id}-films.json`)) films = ((await readJSON(join(ROOT, `data/c/${C.id}-films.json`), { films: [] })).films || []).filter((f) => Object.keys(f.s || {}).length).length; // yalnızca seansı olan filmler
    if (n || have.has(`${C.id}.json`)) await writeJSON(join(ROOT, `data/c/${C.id}.json`), { updated: index.updated, city: C.name, events }, false);
  }
  index.cities[C.id] = { name: C.name, n, posters, films };
}
await writeJSON(join(ROOT, "data/cities.json"), index, true);
// Öne çıkanlar: büyük illerden başlayarak her turda her ilden 1, toplam 12 (aynı ad bir kez)
{ const byCity = {}; for (const x of pool7.sort((a, b) => b.s - a.s)) (byCity[x.C.id] ||= []).push(x);
  const order = Object.keys(byCity).sort((a, b) => index.cities[b].n - index.cities[a].n), seen = new Set(), top = [];
  for (let round = 0; round < 12 && top.length < 12; round++) for (const id of order) { const x = byCity[id].find((y) => !seen.has(fold(y.e.title))); if (!x || top.length >= 12) continue; seen.add(fold(x.e.title));
    const e = x.e; top.push({ title: e.title, d: e.d, t: e.t || "", venue: e.venue || "", cat: e.cat || "", img: e.img, imgBy: e.imgBy || "", city: x.C.id, cityName: x.C.name }); }
  await writeJSON(join(ROOT, "data/one-cikan.json"), { updated: index.updated, events: top }, true); }
log(`Şehirler: başka ilin listesine düşmüş ${dropped} turne seansı asıl iline bırakıldı; mekân adı başka ili gösteren ${relocated} kayıt doğru ile taşındı`);
const open = Object.values(index.cities).filter((c) => c.n || c.films);
log(`Şehirler: ${open.length}/81 ilde etkinlik ya da film var · toplam ${Object.values(index.cities).reduce((a, c) => a + c.n, 0)} etkinlik`);
await writeJSON(join(ROOT, "data/c/_vloc.json"), vlocFinal(VL), false);
