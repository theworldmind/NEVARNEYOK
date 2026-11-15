// BÜTÜN TÜRKİYE: il taramalarını birleştir → data/c/<il>.json (sitenin okuduğu) ve data/cities.json (hangi ilde ne kadar etkinlik var)
//   data/c/src/<il>.json   : o ilin kendi taraması (Biletix, Biletinial; CITY=<il> node run.mjs)
//   data/c/_tr.json        : bütün Türkiye listeleri (Sanatçepte/Devlet Tiyatroları, DOB; CITY=tr), etkinliğin ili `city` alanında
//   data/c/<il>-films.json : o ilin sinema seansları (films.mjs)
// Ankara kendi taramasıyla (data/events.json, data/films.json) gelir; burada yalnızca sayılır.
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { ROOT, log, readJSON, writeJSON, todayIST, fold } from "./lib/util.mjs";
import { CITIES } from "./lib/cities.mjs";

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
const have = new Set(await readdir(join(ROOT, "data/c")).catch(() => []));
const index = { updated: new Date().toISOString(), cities: {} };
const pool7 = []; // girişteki kayan sayfalar için: her ilin önümüzdeki 7 gündeki afişli etkinlikleri
const wk = new Date(Date.parse(today + "T12:00:00Z") + 7 * 864e5).toISOString().slice(0, 10);
const take = (C, L) => { for (const e of L) if (e.img && e.d >= today && e.d <= wk && !/iptal|ertelendi/.test(e.status || "")) pool7.push({ e, C, s: (e.tickets || []).length * 2 + (e.status === "tukendi" ? 3 : 0) + (/arena|psm|akm|kongre|opera|cso|stadyum|holly stone|jolly joker|bostanci|volkswagen|harbiye/i.test(e.venue || "") ? 3 : 0) + (["konser", "tiyatro", "standup", "festival"].includes(e.cat) ? 1 : 0) }); };

for (const C of CITIES) {
  let n = 0, films = 0, posters = 0;
  if (C.id === "ankara") {
    const ev = (await readJSON(join(ROOT, "data/events.json"), { events: [] })).events || [];
    const L = ev.filter((e) => e.d >= today); n = L.length; posters = L.filter((e) => e.img).length; take(C, L);
    films = ((await readJSON(join(ROOT, "data/films.json"), { films: [] })).films || []).filter((f) => Object.keys(f.s || {}).length).length; // yalnızca seansı olan filmler
  } else {
    const own = (await readJSON(join(ROOT, `data/c/src/${C.id}.json`), { events: [] })).events || [];
    const out = new Map(), byDay = new Map();
    for (const e of [...tr.filter((x) => x.city === C.id), ...own]) { // kamu kaynağı önce: ad, saat, mekân ondan
      if (e.d < today) continue;
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
const open = Object.values(index.cities).filter((c) => c.n || c.films);
log(`Şehirler: ${open.length}/81 ilde etkinlik ya da film var · toplam ${Object.values(index.cities).reduce((a, c) => a + c.n, 0)} etkinlik`);
