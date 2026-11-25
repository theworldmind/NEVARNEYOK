// FİLM FESTİVALLERİ (25.11.2026, kullanıcı: "Ankara'daki film festivali bile verilmedi; festival her şeyi çek, geçmişi silme").
// Kaynaklar: (1) festivalin kendi sitesindeki program (yalnızca olgular: ad, özgün ad, yönetmen, ülke, yıl, süre, bölüm, afiş adresi),
//            (2) bilet sitelerinden gelen seanslar (bütün illerin güncel verisi + geçmiş arşivi data/gecmis): festival adı başlıkta, türde,
//                düzenleyende ya da Biletinial'in film türünde ("37. Ankara Film Festivali") geçiyorsa ya da programdaki bir film festival günlerinde
//                festivalin salonunda gösteriliyorsa.
// Çıktı data/festival.json → { festivals: [{ id, f, ad, kisa, il, yil, no, bas, bit, site, url, mekan, films: [...], g: [[gün, saat, ad, mekân, filmAnahtarı, afiş, bağlantı, il]] }] }
// Geçmiş festivaller silinmez. Tanıtım metni alınmaz. Kullanım: node festival.mjs
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchText } from "./lib/net.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data/festival.json");
const rj = async (p, d) => { try { return JSON.parse(await readFile(p, "utf8")); } catch { return d; } };
const T = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10), Y = +T.slice(0, 4);
const fold = (s) => String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9!]+/g, " ").trim();
const ent = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "’").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const txt = (s) => ent(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const tkey = (s) => fold(String(s || "").split(" / ")[0].replace(/^festival\s*[-–:]\s*/i, "")).replace(/\b(altyazili|dublaj|film gosterimi|gosterim|soylesili|2d|3d)\b/g, "").replace(/\s+/g, " ").trim();
const AYL = { ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12 };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

import { FEST } from "./lib/festivaller.mjs";
export { FEST };
const which = (s) => { const x = fold(s); if (!x) return null; return FEST.find((F) => F.re.test(x)) || null; };

/* ---------- Ankara Film Festivali programı: filmfestankara.org.tr/<no>-aff ----------
   Program sayfasındaki her film kartında ad, küçük afiş ve festivalin kendi seans satırı var:
   <h3><a href="mutter-…">MUTTER: … / MUTTER: The Diary of a Mother</a></h3> … <p class="list-group-item-warning …">15 Kasım Pazar 18.30 Salon 1<br> 17 Kasım …</p>
   Filmin sayfasındaki açıklama etiketinden ülke, yıl, süre ve yönetmen; <h5>'ten bölüm okunur. */
const NOTFILM = /basvuru|yonetmelik|kurumsal|haberler|tarihce|ekip|sponsor|odul|iletisim|contact|^filmler$|-aff$|^index|search|user_|ustalik|atolye|soylesi|panel|masterclass|konser|acilis|kapanis|toren/;
const EN_C = /\b(France|Germany|Belgium|Italy|Spain|Iran|Poland|Brazil|USA|United States|UK|United Kingdom|Japan|Greece|Romania|Netherlands|Denmark|Sweden|Norway|Austria|Switzerland|Portugal|Mexico|Argentina|Chile|Canada|China|South Korea|Korea|India|Russia|Ukraine|Georgia|Turkey|Türkiye|Bulgaria|Hungary|Czechia|Czech Republic|Slovakia|Serbia|Croatia|Bosnia and Herzegovina|Lebanon|Palestine|Israel|Egypt|Tunisia|Morocco|Algeria|Iraq|Syria|Jordan|Finland|Iceland|Ireland|Luxembourg|Estonia|Latvia|Lithuania|Colombia|Peru|Uruguay|Venezuela|Cuba|Philippines|Indonesia|Thailand|Vietnam|Taiwan|Hong Kong|Kazakhstan|Azerbaijan|Armenia|Afghanistan|Pakistan|Bangladesh|Nepal|Senegal|Nigeria|South Africa|Kenya|Cyprus|Albania|Kosovo|North Macedonia|Slovenia|Montenegro|Qatar|Saudi Arabia)\b/g;
const country = (s) => { s = String(s || "").replace(EN_C, "").replace(/\s*,\s*(,\s*)*/g, ", ").replace(/^[\s,]+|[\s,]+$/g, ""); const w = s.split(" "); return w.length % 2 === 0 && w.slice(0, w.length / 2).join(" ") === w.slice(w.length / 2).join(" ") ? w.slice(0, w.length / 2).join(" ") : s; };
const AYR = "ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık";
async function affProgram(url, base, yil, venue) {
  const r = await fetchText(url, { retries: 1 }); if (r.status !== 200 || !r.text) return { films: [], g: [], err: `program ${r.status || r.error}` };
  const H = r.text, films = [], g = [], seen = new Set();
  const range = txt(H).match(new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${AYR})\\s+(20\\d\\d)`, "i"));
  const cards = H.split(/<div class="col-lg-3/).slice(1);
  for (const c of cards) {
    const a = c.match(/<h3[^>]*>\s*<a[^>]+href="(?:https?:\/\/filmfestankara\.org\.tr\/)?\/?([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/i); if (!a) continue;
    const slug = a[1], title = txt(a[2]); if (seen.has(slug) || NOTFILM.test(slug)) continue; seen.add(slug);
    const [tr, en] = title.split(" / ").map((x) => x.trim()); const k = tkey(tr);
    const img = (c.match(/background-image:url\(([^)]+)\)/i) || [])[1] || "";
    const sch = txt((c.match(/class="list-group-item-warning[^"]*"[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
    for (const m of sch.matchAll(new RegExp(`(\\d{1,2})\\s+(${AYR})\\s+\\S+\\s+(\\d{1,2})[.:](\\d{2})\\s*(salon\\s*\\d+)?`, "gi"))) {
      const d = iso(yil, AYL[fold(m[2])], m[1]), t = `${m[3].padStart(2, "0")}:${m[4]}`;
      g.push([d, t, tr, venue + (m[5] ? " · " + m[5].replace(/\s+/, " ") : ""), k, img ? img.replace("/small/", "/large/") : "", `${base}/${slug}`, "ankara"]);
    }
    films.push({ k, t: tr, ...(en && fold(en) !== fold(tr) ? { en } : {}), img: img ? img.replace("/small/", "/large/") : "", url: `${base}/${slug}`, ...(sch ? {} : { nos: 1 }) });
  }
  // ayrıntı: ülke, yıl, süre, yönetmen, bölüm (filmin kendi sayfası; etkinlik/söyleşi sayfaları bölümsüz kalır)
  for (const f of films.slice(0, 160)) {
    const p = await fetchText(f.url, { retries: 1 }); if (p.status !== 200) continue;
    const h = p.text, md = ent((h.match(/<meta name="description" content="([^"]*)"/i) || [])[1]);
    const parts = md.split("/").map((x) => x.trim());
    const yr = +(md.match(/\/\s*((?:19|20)\d\d)\s*\//) || [])[1] || 0, dur = +(md.match(/\/\s*(\d{1,3})\s*[’']/) || [])[1] || 0;
    const dir = (md.match(/Yönetmen\s*(?:Director)?\s*:\s*(.+?)(?:\s+(?:Senaryo|Screenplay|Oyuncular|Cast|Görüntü|Yapımcı)\b|\.\.\.|$)/i) || [])[1] || "";
    const bol = txt((h.match(/<h5>([\s\S]*?)<\/h5>/i) || [])[1]), tur = txt((h.match(/<div class="d-none">\s*<h4>([\s\S]*?)<\/h4>/i) || [])[1]);
    Object.assign(f, { ...(parts[0] && yr ? { cn: country(parts[0]) } : {}), ...(yr ? { y: yr } : {}), ...(dur > 0 && dur < 400 ? { dur } : {}), ...(dir ? { dir: dir.trim().slice(0, 90) } : {}), ...(bol ? { bol } : {}), ...(tur ? { tur } : {}) });
  }
  return { films: films.filter((f) => f.bol || f.y || !f.nos), g, range };
}

/* ---------- seansları topla: güncel veri + arşiv, bütün iller ---------- */
const CITIES = (await import("./lib/cities.mjs")).CITIES.map((c) => c.id);
const rows = []; // [gün, saat, ad, mekân, kategori, afiş, bağlantı, il, metin]
const push = (il, e) => { if (!e?.d || !e.title) return; const tk = (e.tickets || [])[0] || {}; rows.push([e.d, e.t || "", e.title, e.venue || "", e.cat || "", e.img || "", tk.url || e.url || "", il, [e.title, e.genre, e.org, e.fest].join(" ")]); };
for (const e of (await rj(join(ROOT, "data/events.json"), {})).events || []) push("ankara", e);
for (const il of CITIES) if (il !== "ankara") for (const e of (await rj(join(ROOT, `data/c/${il}.json`), {})).events || []) push(il, e);
const gi = await rj(join(ROOT, "data/gecmis/index.json"), {});
for (const [il, months] of Object.entries(gi)) for (const ay of months) for (const x of (await rj(join(ROOT, `data/gecmis/${il}/${ay}.json`), {})).e || [])
  rows.push([x[0], x[1], x[2], x[3], x[4], x[5], x[7], il, [x[2], x[9]].join(" ")]);

/* ---------- festival-yıl kayıtlarını kur ---------- */
const prev = await rj(OUT, { festivals: [] });
const byId = new Map((prev.festivals || []).map((x) => [x.id, x]));
const notes = [];
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const ensure = (F, yil, il, name = "") => {
  const gn = F.f === "genel" ? (name.match(/(?:\d+\.\s*)?([^:–|]*?(?:film festival|film günleri|film haftası|sinema günleri|belgesel günleri)\S*)/i)?.[1] || "").trim() : "";
  const id = F.f === "genel" ? `genel-${il}-${slug(gn || "gosterim")}-${yil}` : `${F.f}-${yil}`;
  let x = byId.get(id);
  if (!x) { const no = F.no ? F.no(yil) : 0; x = { id, f: F.f, ad: `${no ? no + ". " : ""}${F.f === "genel" ? (gn || "Film festivali gösterimleri") : F.ad}`, kisa: F.f === "genel" ? (gn || "Film festivali") : F.ad, il: F.il || il, yil, ...(no ? { no } : {}), site: F.site || "", url: F.program ? F.program(yil) : F.site || "", films: [], g: [] }; byId.set(id, x); }
  return x;
};
// program: içinde bulunduğumuz yıl ve (ilk kez) geçmiş yıllar
for (const F of FEST.filter((F) => F.program)) {
  for (const yil of [Y, Y - 1, Y - 2, Y - 3, Y - 4]) {
    const x = ensure(F, yil, F.il);
    const fresh = x.films?.length && x.pAt && (yil < Y || (x.bit && x.bit < T && x.pAt > x.bit)); // biten festivalin programı bir daha çekilmez
    if (fresh) continue;
    const p = await affProgram(x.url, F.site, yil, "Büyülü Fener Kızılay");
    if (p.films.length) { x.films = p.films; x.pAt = T; }
    if (p.g.length) { x.resmi = p.g; const ds = p.g.map((r) => r[0]).sort(); if (!p.range) { x.bas = ds[0]; x.bit = ds.at(-1); } } // festivalin kendi seans çizelgesi
    if (p.range) { const [, a, b, ay, y] = p.range, m = AYL[fold(ay)]; x.bas = iso(y, m, a); x.bit = iso(y, m, b); }
    notes.push(`${x.ad}: programda ${p.films.length} film, ${p.g.length} resmî seans${p.err ? " · " + p.err : ""}${p.range ? ` · ${x.bas}–${x.bit}` : ""}`);
    if (!p.films.length && !x.films?.length && yil < Y) byId.delete(x.id);
  }
}
// seans eşleştirme
const seen = new Set();
for (const x of byId.values()) x.g = (x.g || []).filter((r) => { const k = x.id + r[0] + r[1] + fold(r[2]); if (seen.has(k)) return false; seen.add(k); return true; });
// festivalin kendi çizelgesi: bilet sitesindeki aynı seansın bağlantısı varsa o kullanılır
for (const x of byId.values()) for (const r of x.resmi || []) {
  const k = x.id + r[0] + r[1] + fold(r[2]); if (seen.has(k)) continue; seen.add(k);
  const b = rows.find((q) => q[7] === r[7] && q[0] === r[0] && tkey(q[2]) === r[4] && /biletinial|biletix|passo/i.test(q[6] || ""));
  x.g.push(b ? [...r.slice(0, 6), b[6], r[7]] : r);
}
for (const x of byId.values()) delete x.resmi;
const progIdx = [...byId.values()].filter((x) => x.films?.length).map((x) => ({ x, F: FEST.find((F) => F.f === x.f), keys: new Map(x.films.map((f) => [f.k, f])) }));
let matched = 0;
for (const r of rows) {
  if (r[4] && r[4] !== "sinema" && !/film/i.test(r[8])) continue;
  let x = null, fk = "";
  let F = which(r[8]);
  // "23. Uluslararası Film Festivali" (Eskişehir): ilde tek festival varsa adında il geçmese de odur
  if (F?.f === "genel") { const L = FEST.filter((Q) => Q.il === r[7] && Q.f !== "genel"); if (L.length === 1 && /uluslararasi film festival/.test(fold(r[8]))) F = L[0]; }
  if (F) { x = ensure(F, +r[0].slice(0, 4), r[7], r[2]); const pad = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
    if (x.bas && x.bit && (r[0] < pad(x.bas, -1) || r[0] > pad(x.bit, 1))) x = null; } // festival günlerinin dışındaki aynı adlı kayıt (tören, tiyatro oyunu) festival seansı sayılmaz
  // programdaki film, festival günlerinde (±1) festivalin salonunda
  const k = tkey(r[2]);
  for (const P of progIdx) {
    if (P.x.il !== r[7] || !P.x.bas || r[0] < P.x.bas || r[0] > P.x.bit) continue;
    if (P.F?.mekan && !P.F.mekan.test(fold(r[3]))) continue;
    const f = P.keys.get(k) || [...P.keys.values()].find((f) => k.length > 5 && (f.k.startsWith(k) || k.startsWith(f.k) || (f.en && tkey(f.en) === k)));
    if (f || (F && F.f === P.x.f)) { x = P.x; fk = f?.k || ""; break; }
  }
  if (!x) continue;
  const key = x.id + r[0] + r[1] + fold(r[2]); if (seen.has(key)) continue; seen.add(key);
  x.g.push([r[0], r[1], String(r[2]).replace(/^festival\s*[-–:]\s*/i, ""), r[3], fk, r[5], r[6], r[7]]); matched++;
}
// tarih aralığı, mekânlar, programda olmayan gösterimlerden film listesi
for (const x of byId.values()) {
  x.g.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
  if (x.g.length) { const a = x.g[0][0], b = x.g[x.g.length - 1][0]; if (!x.bas || a < x.bas) x.bas = x.bas && a < x.bas && Date.parse(x.bas) - Date.parse(a) > 5 * 864e5 ? x.bas : a; if (!x.bit || b > x.bit) x.bit = x.bit && Date.parse(b) - Date.parse(x.bit) > 5 * 864e5 ? x.bit : b; }
  x.mekan = [...new Set(x.g.map((r) => r[3]).filter(Boolean))].slice(0, 12);
  if (!x.films.length && x.g.length) { const m = new Map(); for (const r of x.g) { const k = tkey(r[2]); if (!m.has(k)) m.set(k, { k, t: r[2], img: r[5] || "", auto: 1 }); r[4] = k; } x.films = [...m.values()]; }
}
const festivals = [...byId.values()].filter((x) => x.g.length || x.films.length).sort((a, b) => (b.bas || "").localeCompare(a.bas || "") || a.ad.localeCompare(b.ad, "tr"));
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), festivals }));
console.log(`Festivaller: ${festivals.length} festival-yıl · ${matched} yeni seans eşleşti · ${festivals.reduce((a, x) => a + x.g.length, 0)} seans`);
for (const n of notes) console.log("  " + n);
for (const x of festivals.slice(0, 15)) console.log(`  ${x.id} ${x.bas || "?"}–${x.bit || "?"} · ${x.films.length} film · ${x.g.length} seans · ${x.mekan.slice(0, 3).join(", ")}`);
