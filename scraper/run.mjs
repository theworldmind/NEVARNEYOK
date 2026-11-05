// ANA AKIŞ: bütün kaynakları tara → birleştir → dünkü veriyle karşılaştır → data/events.json
//   node run.mjs            tam tarama (her sabah)
//   node run.mjs --refresh  yalnızca bilinen etkinliklerin fiyat/durumunu tazele (öğleden sonra)
//   node run.mjs --only=biletinial,bubilet   yalnızca bu kaynaklar (deneme için)
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { ROOT, log, readJSON, writeJSON, writeText, pool, withTimeout, todayIST } from "./lib/util.mjs";
import { loadVenues } from "./lib/normalize.mjs";
import { runSource } from "./lib/runner.mjs";
import { rawToEvent, dedupe, mergeWithPrevious, applyManual } from "./lib/merge.mjs";
import { closeBrowser, fetchText } from "./lib/net.mjs";
import { parseManualCsv } from "./lib/manual.mjs";

const args = process.argv.slice(2);
const MODE = args.includes("--refresh") ? "refresh" : "full";
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const SOURCE_TIMEOUT = +(process.env.SOURCE_TIMEOUT_MIN || 12) * 60e3;
const PARALLEL = +(process.env.PARALLEL || 3);
const OUT = process.env.OUT_FILE || join(ROOT, "data/events.json");
const HEALTH = join(ROOT, "data/health.json");

const now = new Date().toISOString();
const prev = await readJSON(OUT, { events: [] });
loadVenues(await readJSON(join(ROOT, "data/venues.json"), {}));
const SOURCES = (await import(process.env.SOURCES_FILE || "./sources/index.mjs")).default
  .filter((s) => s.enabled !== false && (!ONLY.length || ONLY.includes(s.id)));
const prevHealth = await readJSON(HEALTH, { sources: {} });

log(`Mod: ${MODE} · ${SOURCES.length} kaynak · önceki veri: ${prev.events?.length || 0} etkinlik`);

/* ---------- 1) Kaynakları tara ---------- */
const results = {};
await pool(SOURCES, PARALLEL, async (src) => {
  const known = [...new Set((prev.events || []).flatMap((e) => (e.tickets || []).filter((t) => t.src === src.id && t.url).map((t) => t.url)))];
  log(`→ ${src.name}`);
  try {
    results[src.id] = await withTimeout(runSource(src, { known, mode: MODE, budgetMs: SOURCE_TIMEOUT - 60e3 }), SOURCE_TIMEOUT + 120e3, src.name);
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
  const count = r.raws.length, pc = prevCount(src.id);
  let status = "calisiyor";
  if (r.error) status = "hata";
  else if (count === 0 && pc === 0) status = "bos";
  else if (count === 0 || (pc >= 10 && count < pc * 0.4 && MODE === "full")) status = "dustu";
  const streak = status === "calisiyor" ? 0 : ((prevHealth.sources?.[src.id]?.failStreak || 0) + 1);
  health[src.id] = { id: src.id, name: src.name, kind: src.kind, ok: status === "calisiyor", status, count, prevCount: pc,
    error: r.error || "", notes: (r.notes || []).slice(0, 8), seconds: Math.round((r.ms || 0) / 1000), failStreak: streak,
    lastOk: status === "calisiyor" ? now : prevHealth.sources?.[src.id]?.lastOk || null };
}

/* ---------- 3) Birleştir ---------- */
const fresh = dedupe(SOURCES.flatMap((src) => (results[src.id]?.raws || []).map((r) => rawToEvent(r, src))));
// bugün tarama yapmayan (--only) kaynaklar "çalışmadı" sayılır → eski kayıtları korunur
const ranHealth = Object.fromEntries(Object.entries(health).map(([k, h]) => [k, h]));
let events = mergeWithPrevious(prev, fresh, ranHealth, { now, refresh: MODE === "refresh" });

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
if (manualRows.length) { events = applyManual(events, manualRows, now); log(`Elle eklenen/düzenlenen satır: ${manualRows.length}`); }
events = events.filter((e) => e.d >= todayIST());

/* ---------- 5) Yaz ---------- */
const sourcesMeta = SOURCES.map((s) => ({ id: s.id, name: s.name, kind: s.kind, ok: health[s.id].ok, count: health[s.id].count }));
const out = { updated: now, mode: MODE, baseline: prev.baseline || null, sources: sourcesMeta, events: events.map(strip) };
// Güvenlik ağı: sonuç dünküne göre yarıdan fazla küçüldüyse yazma (bir şey ters gitmiştir)
const shrink = (prev.events?.length || 0) > 40 && out.events.length < prev.events.length * 0.5;
if (shrink && !process.env.FORCE_WRITE) {
  log(`!! Etkinlik sayısı ${prev.events.length} → ${out.events.length}; veri korunuyor, yazılmadı. (FORCE_WRITE=1 ile zorlanabilir)`);
} else {
  await writeJSON(OUT, out);
}
await writeJSON(HEALTH, { runAt: now, mode: MODE, total: out.events.length, written: !shrink, sources: health }, true);
await writeText(join(ROOT, "scraper/out/health.md"), healthMarkdown(health, out.events.length, shrink));
const newOnes = out.events.filter((e) => e.firstSeen === now).length;
log(`Bitti: ${out.events.length} etkinlik · bugün yeni ${newOnes} · çalışan kaynak ${Object.values(health).filter((h) => h.ok).length}/${SOURCES.length}`);

/* ---------- yardımcılar ---------- */
function strip(e) {
  const o = { ...e };
  delete o._h; delete o._w;
  o.tickets = o.tickets.map(({ site, url, price, est, src, seen }) => ({ site, url, ...(price ? { price } : {}), ...(est ? { est } : {}), ...(src ? { src } : {}), ...(seen ? { seen } : {}) }));
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
