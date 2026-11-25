// ANA AKIŞ: bütün kaynakları tara → birleştir → dünkü veriyle karşılaştır → data/events.json
//   node run.mjs            tam tarama (her sabah)
//   node run.mjs --refresh  yalnızca bilinen etkinliklerin fiyat/durumunu tazele (öğleden sonra)
//   node run.mjs --only=biletinial,bubilet   yalnızca bu kaynaklar (deneme için)
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { ROOT, log, readJSON, writeJSON, writeText, pool, withTimeout, todayIST, fold } from "./lib/util.mjs";
import { loadVenues, cleanTitle } from "./lib/normalize.mjs";
import { runSource, isJunk } from "./lib/runner.mjs";
import { rawToEvent, dedupe, mergeWithPrevious, applyManual } from "./lib/merge.mjs";
import { closeBrowser, fetchText } from "./lib/net.mjs";
import { parseManualCsv } from "./lib/manual.mjs";
import { haberEvents } from "./haber-kesif.mjs";
import { sameEvent } from "./lib/normalize.mjs";

const args = process.argv.slice(2);
const MODE = args.includes("--refresh") ? "refresh" : "full";
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const SOURCE_TIMEOUT = +(process.env.SOURCE_TIMEOUT_MIN || 12) * 60e3;
const PARALLEL = +(process.env.PARALLEL || 3);
const OUT = process.env.OUT_FILE || join(ROOT, "data/events.json");
const HEALTH = process.env.HEALTH_FILE || join(ROOT, "data/health.json");

const now = new Date().toISOString();
const prev = await readJSON(OUT, { events: [] });
loadVenues(await readJSON(join(ROOT, "data/venues.json"), {}));
const SOURCES = (await import(process.env.SOURCES_FILE || "./sources/index.mjs")).default
  .filter((s) => s.enabled !== false && (!ONLY.length || ONLY.includes(s.id)));
const prevHealth = await readJSON(HEALTH, { sources: {} });
{ const BL0 = await loadBlocklist(), sites = BL0.filter((b) => b.k === "site").map((b) => b.v);
  for (let i = SOURCES.length - 1; i >= 0; i--) if (sites.some((v) => (SOURCES[i].home || "").toLocaleLowerCase("tr").includes(v))) { log(`  engel listesinde, taranmıyor: ${SOURCES[i].name}`); SOURCES.splice(i, 1); } }
// dünkü veriye de bugünkü kurallar uygulanır (maç/kombine/haber ayıklama, başlık düzeltme)
// ne saati ne mekânı olan, ilk taramalarda metin tahminiyle gelmiş kayıtlar da (haber sayfaları) bırakılır
const vagueBot = (e) => !e.manual && !e.t && /^(çeşitli mekânlar|)$/i.test(e.venue || "") && (e.tickets || []).every((t) => t.src !== "elle" && t.seen && t.seen !== prev.baseline);
if (prev.events) prev.events = prev.events.filter((e) => e.manual || (!isJunk(e) && !vagueBot(e))).map((e) => (e.manual ? e : { ...e, title: cleanTitle(e.title) }));

// İl taramasında: artık bu ilin kaynak listesinde olmayan kaynakların eski kayıtları bırakılır
// (15.11.2026: Biletix şehir seçimini dikkate almadığı için her ile aynı 66 kayıt yazılmıştı; Biletix artık Türkiye listesinden gelir)
if (process.env.CITY && process.env.CITY !== "ankara" && prev.events) {
  const ids = new Set(SOURCES.map((s) => s.id));
  prev.events = prev.events.map((e) => (e.manual ? e : { ...e, tickets: (e.tickets || []).filter((t) => !t.src || ids.has(t.src)) })).filter((e) => e.manual || e.tickets.length);
}
log(`Mod: ${MODE} · ${SOURCES.length} kaynak · önceki veri: ${prev.events?.length || 0} etkinlik`);

/* ---------- 1) Kaynakları tara ---------- */
const results = {};
await pool(SOURCES, PARALLEL, async (src) => {
  const known = [...new Set((prev.events || []).flatMap((e) => (e.tickets || []).filter((t) => t.src === src.id && t.url).map((t) => t.url)))];
  log(`→ ${src.name}`);
  try {
    const lim = (src.budgetMin ? src.budgetMin * 60e3 : SOURCE_TIMEOUT);
    results[src.id] = await withTimeout(runSource(src, { known, mode: MODE, budgetMs: lim - 60e3 }), lim + 120e3, src.name);
  } catch (e) {
    log(`  ✗ ${src.name}: ${e.message}`);
    results[src.id] = { raws: [], error: e.message, notes: [], gone: [] };
  }
});
await closeBrowser();

/* ---------- 2) Sağlık: hangi kaynak çalıştı, hangisi düştü ---------- */
const health = {};
const prevCount = (id) => (prev.events || []).filter((e) => (e.tickets || []).some((t) => t.src === id)).length;
for (const src of SOURCES) {
  const r = results[src.id] || { raws: [] };
  // düşüş, bir önceki taramanın ham sayısıyla ölçülür (25.11.2026: birikmiş etkinlik sayısıyla karşılaştırınca Biletinial 25 ilde yanlışlıkla "düştü" görünüyordu)
  const count = r.raws.length, ph = prevHealth.sources?.[src.id] || {}, pc0 = ph.okCount ?? ph.count, pc = pc0 != null ? pc0 : prevCount(src.id);
  let status = "calisiyor";
  if (r.error) status = "hata";
  else if (count === 0 && pc === 0) status = "bos";
  else if (count === 0 || (pc >= 10 && count < pc * 0.4 && MODE === "full")) status = "dustu";
  const streak = status === "calisiyor" ? 0 : ((prevHealth.sources?.[src.id]?.failStreak || 0) + 1);
  health[src.id] = { id: src.id, name: src.name, kind: src.kind, ok: status === "calisiyor", status, count, prevCount: pc,
    error: r.error || "", notes: (r.notes || []).slice(0, 8), seconds: Math.round((r.ms || 0) / 1000), failStreak: streak,
    lastOk: status === "calisiyor" ? now : prevHealth.sources?.[src.id]?.lastOk || null, okCount: status === "calisiyor" ? count : (ph.okCount ?? null) };
}

/* ---------- 3) Birleştir ---------- */
// Kaynak önceliği: aynı etkinlik birden çok yerde görünürse ad, saat ve mekân önce kamu kurumundan,
// sonra mekânın kendi sitesinden alınır; ticari bilet siteleri yalnızca bilet bağlantısı ve fiyat ekler.
const RANK = { kurum: 0, mekan: 1, toplayici: 2, bilet: 3 };
const BY_RANK = [...SOURCES].sort((a, b) => (RANK[a.kind] ?? 9) - (RANK[b.kind] ?? 9));
const fresh = dedupe(BY_RANK.flatMap((src) => (results[src.id]?.raws || []).map((r) => rawToEvent(r, src))));
// bugün tarama yapmayan (--only) kaynaklar "çalışmadı" sayılır → eski kayıtları korunur
const ranHealth = Object.fromEntries(Object.entries(health).map(([k, h]) => [k, h]));
const readUrls = new Set(SOURCES.flatMap((src) => (health[src.id].ok ? results[src.id]?.readUrls || [] : [])));
let events = mergeWithPrevious(prev, fresh, ranHealth, { now, refresh: MODE === "refresh", readUrls });

// artık bulunmayan (404) bilet sayfaları
// (yalnızca sağlıklı kaynaklarda ve az sayıdaysa: her sayfa 404 veriyorsa site yapısı değişmiştir, silme)
const gone = new Set(SOURCES.flatMap((src) => {
  const r = results[src.id] || {}, g = r.gone || [];
  return health[src.id].ok && g.length <= Math.max(3, (r.detailCount || 0) * 0.3) ? g : [];
}));
if (gone.size) events = events.map((e) => ({ ...e, tickets: e.tickets.filter((t) => !gone.has(t.url)) })).filter((e) => e.tickets.length);

/* ---------- 4) Elle eklenenler: Google Sheets ve data/manual.csv ---------- */
const manualRows = [];
for (const csv of [process.env.SHEET_CSV_URL ? await fetchText(process.env.SHEET_CSV_URL).then((r) => (r.status === 200 ? r.text : "")) : "",
  await readFile(join(ROOT, "data/manual.csv"), "utf8").catch(() => "")]) {
  if (csv) manualRows.push(...parseManualCsv(csv));
}
if (manualRows.length && (process.env.CITY || "ankara") === "ankara") { /* elle eklenenler şimdilik Ankara'nın */ events = applyManual(events, manualRows, now); log(`Elle eklenen/düzenlenen satır: ${manualRows.length}`); }
/* Haberden keşfedilen etkinlikler (haber-kesif.mjs → data/haber.json; kullanıcı 18.11.2026: "benim uyarıma gerek kalmadan her şeyi bulundur"):
   bilet sitelerinde olmayan ücretsiz/başvurulu gösteriler, belediye etkinlikleri, uzatılan sergiler. Zaten olan etkinlik eklenmez (bilet sitesi kaydı önce gelir). */
if ((process.env.CITY || "ankara") === "ankara") {
  const H = haberEvents((await readJSON(join(ROOT, "data/haber.json"), { items: [] })).items, "ankara");
  let nh = 0; for (const h of H) { if (events.some((e) => sameEvent(e, h) || (e.d === h.d && fold(e.title).includes(fold(h.title))))) continue; events.push(h); nh++; }
  if (H.length) log(`Haberden: ${nh} etkinlik eklendi (${H.length - nh} zaten vardı)`);
}
events = events.filter((e) => e.d >= todayIST());
/* Başka ilin mekânı Ankara listesine girmesin (25.11.2026: Passo, İstanbul'daki Suç ve Ceza Film Festivali'nin "Beyoğlu Sineması" gösterimlerini Ankara'da veriyordu).
   Temkinli: mekân adında başka bir il adı (Ankara'da cadde/yol adı olarak da geçenler hariç) ya da başka ilin Ankara'da semt adı olmayan belirgin bir ilçesi geçiyorsa çıkarılır. */
if ((process.env.CITY || "ankara") === "ankara") {
  const { CITIES } = await import("./lib/cities.mjs"), SOKAK = new Set(["sakarya", "konya", "eskisehir", "izmir", "samsun", "bursa yolu"]);
  const NM = CITIES.filter((c) => c.id !== "ankara" && !SOKAK.has(fold(c.name))).map((c) => new RegExp("(^|[^a-z0-9])" + fold(c.name) + "($|[^a-z0-9])"));
  const DIST = new Set("beyoglu kadikoy besiktas sisli uskudar atasehir bakirkoy sariyer kartal beylikduzu esenyurt zeytinburnu karsiyaka bornova buca nilufer osmangazi muratpasa konyaalti atakum odunpazari tepebasi meram selcuklu seyhan cukurova sahinbey sehitkamil".split(" "));
  const other = (e) => { const v = fold(e.venue || ""); if (!v || /cadde|caddesi|sokak|sokagi|bulvar|mahalle|yolu|van gogh|ankara/.test(v)) return false; return NM.some((r) => r.test(v)) || v.split(/[^a-z0-9]+/).some((w) => DIST.has(w)); };
  const n0 = events.length; events = events.filter((e) => !other(e)); if (events.length < n0) log(`Başka ilin mekânı: ${n0 - events.length} kayıt Ankara listesinden çıkarıldı`);
}

/* ---------- 4b) Engel listesi: kaldırılmasını isteyen hak sahipleri (data/blocklist.txt) ---------- */
const BL = await loadBlocklist();
if (BL.length) {
  const before = events.length;
  events = events.map((e) => ({ ...e, tickets: e.tickets.filter((t) => !blocked(BL, { site: t.url })) }))
    .filter((e) => e.tickets.length && !blocked(BL, e));
  // afis: yalnızca afişi kaldırır (etkinlik kalır); etkinlik adı, afiş adresi ya da afişin kaynağıyla eşleşir
  const AF = BL.filter((b) => b.k === "afis"); let na = 0;
  for (const e of events) if (e.img && AF.some(({ v }) => [e.title, e.img, e.imgBy].some((x) => (x || "").toLocaleLowerCase("tr").includes(v)))) { delete e.img; delete e.imgBy; na++; }
  log(`Engel listesi: ${BL.length} kural · ${before - events.length} etkinlik çıkarıldı · ${na} afiş kaldırıldı`);
}

/* ---------- 5) Yaz ---------- */
const sourcesMeta = SOURCES.map((s) => ({ id: s.id, name: s.name, kind: s.kind, ok: health[s.id].ok, count: health[s.id].count }));
// Aynı görsel birçok farklı etkinlikte kullanılıyorsa bu bir site/kurum görselidir, afiş değil: gösterilmez
{ const use = {}; for (const e of events) if (e.img) (use[e.img] ||= new Set()).add(e.title.toLocaleLowerCase("tr"));
  for (const e of events) if (e.img && use[e.img].size > 4) { delete e.img; delete e.imgBy; } }
// Afişi olmayan etkinlik, aynı etkinliğin başka tarihteki ya da başka kaynaktaki afişini kullanır (aynı ad, aynı mekân ya da aynı ad tek mekânda)
{ const nt = (t) => fold(t).replace(/\s+/g, " ").trim(), byT = {}, byTV = {};
  for (const e of events) if (e.img) { byTV[nt(e.title) + "|" + fold(e.venue || "")] ||= e; (byT[nt(e.title)] ||= new Set()).add(e.img); }
  let n = 0;
  for (const e of events) if (!e.img) {
    const m = byTV[nt(e.title) + "|" + fold(e.venue || "")] || (byT[nt(e.title)]?.size === 1 ? events.find((x) => x.img && nt(x.title) === nt(e.title)) : null);
    if (m && nt(e.title).length >= 4) { e.img = m.img; e.imgBy = m.imgBy; n++; }
  }
  log(`Afiş: ${events.filter((e) => e.img).length}/${events.length} etkinlikte (${n} tanesi aynı etkinliğin başka kaydından)`); }
// Hâlâ afişi olmayan yaklaşan etkinlik: etkinliğin KENDİ sayfasındaki paylaşım görseli (og:image) okunur; yalnızca adresi tutulur.
// Bot korumalı sitelere girilmez, robots.txt'e uyulur (fetchText). Görseli olmayan sayfa 7 gün yeniden denenmez (imgTried).
// Tam taramada 220, tazelemede 80 sayfa (yeni eklenen afişsiz etkinlikler gün içinde de tamamlansın).
{
  const BOT = /bubilet|passo|biletino|mobilet/i, today = todayIST(), week = Date.now() - 7 * 864e5;
  const need = events.filter((e) => !e.img && e.d >= today && !(e.imgTried && Date.parse(e.imgTried) > week));
  const byUrl = new Map();
  // Her etkinliğin BÜTÜN satış/kaynak sayfaları sırayla denenir (ilkinde görsel yoksa ikincisi…); yaklaşanlar önce.
  need.sort((a, b) => a.d.localeCompare(b.d));
  const ok = (x) => x.url && x.src !== "haber" && !BOT.test(x.url) && !BOT.test(x.site || "");
  for (const e of need) for (const t of (e.tickets || []).filter(ok).slice(0, 3)) (byUrl.get(t.url) || byUrl.set(t.url, { site: t.site, evs: [] }).get(t.url)).evs.push(e);
  const urls = [...byUrl.keys()].slice(0, MODE === "full" ? 2500 : 600); let got = 0;
  const nt = (t) => fold(t).replace(/\s+/g, " ").trim(), until = Date.now() + (MODE === "full" ? (process.env.CITY && process.env.CITY !== "ankara" ? 8 : 14) : 6) * 60e3;   // süre sınırı: tarama uzamasın
  const OG = (h) => h && (h.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i));
  await pool(urls, 6, async (u) => {
    if (Date.now() > until || byUrl.get(u).evs.every((e) => e.img)) return;
    const r = await withTimeout(fetchText(u, { retries: 0 }), 20000).catch(() => null), m = OG(r?.text), it = byUrl.get(u);
    let img = ""; try { img = m ? new URL(m[1].replace(/&amp;/g, "&"), u).href : ""; } catch {}
    if (img && /^https:/.test(img) && !/\.(svg|gif|ico)(\?|$)/i.test(img) && !/logo|favicon|default|placeholder|no[-_]?image|share[-_]?image|sprite/i.test(img)) { for (const e of it.evs) if (!e.img) { e.img = img; e.imgBy = it.site; } got++; }
  });
  for (const e of need) if (!e.img) e.imgTried = new Date().toISOString();
  // Son çare: aynı etkinliği anlatan haberin tanıtım görseli (data/haber.json; yalnızca adres, "Görsel: <haber sitesi>")
  const H = (await readJSON(join(ROOT, "data/haber.json"), { items: [] }).catch(() => ({ items: [] }))).items || [];
  let hg = 0;
  for (const e of events) if (!e.img && e.d >= today) { const k = nt(e.title); if (k.length < 6) continue;
    const h = H.find((x) => x.img && (nt(x.title) === k || (nt(x.title).length >= 10 && (k.includes(nt(x.title)) || nt(x.title).includes(k))))); if (h) { e.img = h.img; e.imgBy = h.imgBy || h.site; hg++; } }
  if (hg) log(`Afiş: ${hg} etkinliğe haberin tanıtım görseli`);
  // aynı görsel çok etkinlikte geçiyorsa site görselidir: yine düşer
  const use = {}; for (const e of events) if (e.img) (use[e.img] ||= new Set()).add(e.title.toLocaleLowerCase("tr"));
  for (const e of events) if (e.img && use[e.img].size > 4) { delete e.img; delete e.imgBy; }
  log(`Afiş: etkinlik sayfalarından ${got}/${urls.length} yeni afiş · toplam ${events.filter((e) => e.img).length}/${events.length}`);
}
const out = { updated: now, mode: MODE, baseline: prev.baseline || null, sources: sourcesMeta, events: events.map(strip) };
// Güvenlik ağı: sonuç dünküne göre yarıdan fazla küçüldüyse yazma (bir şey ters gitmiştir)
const shrink = (prev.events?.length || 0) > 40 && out.events.length < prev.events.length * 0.5;
if (shrink && !process.env.FORCE_WRITE) {
  log(`!! Etkinlik sayısı ${prev.events.length} → ${out.events.length}; veri korunuyor, yazılmadı. (FORCE_WRITE=1 ile zorlanabilir)`);
} else {
  await writeJSON(OUT, out);
}
// tek kaynaklı denemeler (--only) öteki kaynakların sağlık kaydını silmesin (25.11.2026: health.json'da yalnızca film-ankara kalmıştı)
await writeJSON(HEALTH, { runAt: now, mode: MODE, total: out.events.length, written: !shrink, sources: ONLY.length ? { ...(prevHealth.sources || {}), ...health } : health }, true);
await writeText(join(ROOT, process.env.HEALTH_MD || "scraper/out/health.md"), healthMarkdown(health, out.events.length, shrink));
const newOnes = out.events.filter((e) => e.firstSeen === now).length;
log(`Bitti: ${out.events.length} etkinlik · bugün yeni ${newOnes} · çalışan kaynak ${Object.values(health).filter((h) => h.ok).length}/${SOURCES.length}`);

/* ---------- yardımcılar ---------- */
async function loadBlocklist() {
  const txt = await readFile(process.env.BLOCKLIST_FILE || join(ROOT, "data/blocklist.txt"), "utf8").catch(() => "");
  return txt.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(site|mekan|mekân|etkinlik|duzenleyen|düzenleyen|afis|afiş)\s*:\s*(.+)$/i);
    return m ? { k: m[1].toLocaleLowerCase("tr").replace("â", "a").replace("ü", "u").replace("ş", "s"), v: m[2].trim().toLocaleLowerCase("tr") } : null;
  }).filter(Boolean);
}
function blocked(BL, e) {
  const has = (a, b) => (a || "").toLocaleLowerCase("tr").includes(b);
  return BL.some(({ k, v }) => (k === "site" && e.site !== undefined && has(e.site, v)) || (k === "mekan" && has(e.venue, v)) ||
    (k === "etkinlik" && has(e.title, v)) || (k === "duzenleyen" && has(e.org, v)) ||
    (k === "site" && e.tickets && e.tickets.every((t) => has(t.url, v))));
}
function strip(e) {
  const o = { ...e };
  delete o._h; delete o._w; delete o._caps; delete o.image;
  if (!o.manual) delete o.desc; // bilet sitelerinin tanıtım metinleri yayımlanmaz; yalnızca organizatörün kendi gönderdiği metin kalır
  o.tickets = o.tickets.map(({ site, url, price, pc, src, seen }) => ({ site, url, ...(price ? { price, pc } : {}), ...(src ? { src } : {}), ...(seen ? { seen } : {}) }));
  return o;
}

function healthMarkdown(h, total, shrink) {
  const icon = { calisiyor: "🟢", dustu: "🟠", hata: "🔴", bos: "⚪" };
  const name = { calisiyor: "çalışıyor", dustu: "düştü", hata: "hata", bos: "hiç veri gelmedi" };
  const rows = Object.values(h).sort((a, b) => (a.ok - b.ok) || b.count - a.count)
    .map((x) => `| ${icon[x.status]} ${x.name} | ${name[x.status]} | ${x.count} | ${x.prevCount} | ${x.failStreak || 0} | ${(x.error || x.notes[0] || "").replace(/\|/g, "/").slice(0, 120)} |`);
  return [`## Kaynak sağlık raporu · ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`, "",
    `Toplam etkinlik: **${total}**${shrink ? " · ⚠️ sayı çok düştüğü için veri **yazılmadı**, dünkü liste korunuyor" : ""}`, "",
    "| Kaynak | Durum | Bugün | Dün | Art arda sorun | Not |", "|---|---|---|---|---|---|", ...rows, "",
    "🟠/🔴 olan kaynakların liste sayfası veya bağlantı kalıbı değişmiş olabilir. `scraper/sources/index.mjs` içinden düzeltilir; çalıştırmanın **debug** dosyalarında sitenin o günkü sayfası durur."].join("\n");
}
