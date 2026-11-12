// VİZYONDAKİ FİLMLER: Ankara sinemalarındaki filmler ve 7 günlük seansları → data/films.json
// Kaynak: sinemalar.com (vizyondaki ve yakında listeleri, filmin Ankara seans sayfası). robots.txt izin veriyor.
// Yalnızca olgular alınır: film adı, vizyon tarihi, süre, ülke, tür, salon, seans saati, dil/biçim.
// Konu metni, afiş ve görsel alınmaz. Bilet için filmin Ankara seans sayfasına bağlanılır.
//   node films.mjs
import { join } from "node:path";
import { ROOT, log, readJSON, writeJSON, clean, decodeEntities, todayIST } from "./lib/util.mjs";
import { fetchText } from "./lib/net.mjs";

const BASE = "https://www.sinemalar.com";
const OUT = process.env.FILMS_FILE || join(ROOT, "data/films.json");
const AY = { ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6, temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12 };
const txt = (s) => clean(decodeEntities(String(s || "").replace(/<[^>]+>/g, " ")));
const addDays = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

/* "06.11.2026 • 1 saat 31 dakika • İngiltere, ABD • Animasyon, Komedi" */
export function parseInfo(line) {
  const parts = txt(line).split("•").map((x) => x.trim()).filter(Boolean);
  const o = {};
  for (const p of parts) {
    let m;
    if ((m = p.match(/^(\d{2})\.(\d{2})\.(\d{4})$/))) o.release = `${m[3]}-${m[2]}-${m[1]}`;
    else if (/saat|dakika/.test(p)) { const h = +(p.match(/(\d+)\s*saat/) || [0, 0])[1], mi = +(p.match(/(\d+)\s*dakika/) || [0, 0])[1]; if (h || mi) o.dur = h * 60 + mi; }
    else if (!o.country) o.country = p;
    else o.genre = p;
  }
  return o;
}
function trDate(s) { const m = txt(s).toLocaleLowerCase("tr").match(/(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})/); return m && AY[m[2]] ? `${m[3]}-${String(AY[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; }

/* Liste sayfası (vizyondaki / yakında): her filmin kartı → {id, slug, title, release, dur, country, genre} */
export function parseList(html) {
  const out = [], seen = new Set();
  // "Yakında" sayfası kartları tarih başlıklarının altında gruplar: <h2>13 Kasım 2026</h2>
  const marks = [...html.matchAll(/<(h[1-4]|div|span|p)\b[^>]*>\s*(?:<b>)?\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s*(?:<\/b>)?\s*<\/\1>/g)].map((m) => [m.index, trDate(m[2])]).filter((m) => m[1]);
  const parts = html.split(/class="card metadata-card"/);
  let pos = parts[0].length;
  for (const chunk of parts.slice(1)) {
    const at = pos; pos += chunk.length + 'class="card metadata-card"'.length;
    const head = marks.filter((m) => m[0] < at).pop();
    const a = chunk.match(/href="https?:\/\/www\.sinemalar\.com\/film\/(\d+)\/([a-z0-9-]+)"/i);
    if (!a || seen.has(a[1])) continue;
    const h = chunk.match(/\/film\/\d+\/[a-z0-9-]+"[^>]*>\s*<h[23]>([\s\S]*?)<\/h[23]>/i);
    const alt = (chunk.match(/alt="([^"]+?)\s*(?:\(\d{4}\))?\s*afişi"/) || [])[1];
    const title = txt(h ? h[1] : alt || "");
    if (!title) continue;
    seen.add(a[1]);
    const info = (chunk.match(/<div class="card-info">\s*([^<]*•[^<]*)<\/div>/) || [])[1] || "";
    const vt = (chunk.match(/Vizyon Tarihi:<\/b>\s*([^<]+)</) || [])[1] || "";
    const o = { id: +a[1], slug: a[2], title, ...parseInfo(info) };
    if (!o.release && vt) o.release = trDate(vt);
    if (!o.release && head) o.release = head[1];
    out.push(o);
  }
  return out;
}

/* Filmin Ankara seans sayfası: 7 günün her biri için salon → [saat, biçim] */
export function parseSeances(html) {
  const days = {}, cinemas = {};
  for (const dayChunk of html.split(/<div class="seance-day/).slice(1)) {
    const d = (dayChunk.match(/^[^>]*data-day="(\d{4}-\d{2}-\d{2})"/) || [])[1];
    if (!d) continue;
    for (const card of dayChunk.split(/class="card metadata-card"/).slice(1)) {
      const nm = card.match(/href="https?:\/\/www\.sinemalar\.com\/sinemasalonu\/(\d+)\/[^"]*"[^>]*>\s*<h3>([\s\S]*?)<\/h3>/);
      if (!nm) continue;
      const cid = +nm[1];
      if (!cinemas[cid]) cinemas[cid] = { name: txt(nm[2]).replace(/^Ankara\s+/i, ""), addr: txt((card.match(/<div class="card-info dark">([^<]*)<\/div>/) || [])[1] || "").replace(/\s*\d+([.,]\d+)?\s*km$/i, "") };
      for (const sg of card.split(/<div class="seance"/).slice(1)) {
        const fmt = [((sg.match(/data-dimension="([^"]*)"/) || [])[1] || ""), ((sg.match(/data-language="([^"]*)"/) || [])[1] || "")].filter(Boolean).join(" ");
        const times = [...sg.matchAll(/<a class="btn secondary vertical[^"]*"[^>]*>\s*<span>(\d{1,2}:\d{2})<\/span>/g)].map((m) => m[1].padStart(5, "0"));
        if (!times.length) continue;
        ((days[d] ||= {})[cid] ||= []).push([times, fmt]);
      }
    }
  }
  return { days, cinemas };
}

export async function main() {
  const today = todayIST(), soon = addDays(today, 7);
  const prev = await readJSON(OUT, { films: [], cinemas: {} });
  const notes = [];
  const get = async (path) => { const r = await fetchText(BASE + path, { retries: 1 }); if (r.status !== 200) notes.push(`${path}: ${r.robots ? "robots.txt izin vermiyor" : r.status || r.error}`); return r.status === 200 ? r.text : ""; };
  const now = parseList(await get("/filmler/vizyondaki"));
  const comingAll = parseList(await get("/filmler/pekyakinda"));
  const coming = comingAll.filter((f) => f.release && f.release <= soon);
  log(`Filmler: vizyonda ${now.length}, yakında ${comingAll.length} (7 gün içinde ${coming.length}; tarihsiz ${comingAll.filter((f) => !f.release).length})`);
  const seen = new Set(), list = [];
  for (const f of [...now, ...coming]) if (!seen.has(f.id)) { seen.add(f.id); list.push(f); }
  const cinemas = {}, films = [];
  for (const f of list) {
    const page = `/seans/${f.id}/${f.slug}/ankara`;
    const html = await get(page);
    if (!html) continue;
    const { days, cinemas: cs } = parseSeances(html);
    Object.assign(cinemas, cs);
    const s = {};
    for (const [d, byC] of Object.entries(days)) {
      if (d < today) continue;
      s[d] = Object.entries(byC).map(([cid, groups]) => [+cid, groups.map(([t, fmt]) => `${t.join(",")}${fmt ? "|" + fmt : ""}`).join(";")]);
    }
    const nS = Object.values(s).flat().reduce((n, [, g]) => n + g.split(/[;,]/).length, 0);
    if (!nS && !(f.release >= today)) continue; // Ankara'da seansı olmayan eski filmler alınmaz
    films.push({ id: f.id, title: f.title, release: f.release || "", dur: f.dur || 0, country: f.country || "", genre: f.genre || "", url: BASE + page, s });
  }
  // Kaynak boş döndüyse dünkü veriyi silme (site boş kalmasın)
  if (!films.length && prev.films?.length) { log(`Filmler: kaynak boş döndü (${notes.join(" · ")}), dünkü veri korunuyor`); return; }
  films.sort((a, b) => (b.release || "").localeCompare(a.release || "") || a.title.localeCompare(b.title, "tr"));
  await writeJSON(OUT, { updated: new Date().toISOString(), source: "sinemalar.com", city: "Ankara", cinemas, films, notes }, false);
  const ns = films.reduce((n, f) => n + Object.values(f.s).flat().reduce((k, [, g]) => k + g.split(/[;,]/).length, 0), 0);
  log(`Filmler: ${films.length} film, ${Object.keys(cinemas).length} salon, ${ns} seans${notes.length ? " · " + notes.join(" · ") : ""}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
