// KAPSAM DENETİMİ: "Neyi kaçırıyorum?" Her tam taramadan sonra çalışır.
// 1) Kendi verisini geçmişiyle karşılaştırır (kaynak, kategori, gün, mekân bazında ani düşüş ve boşluk)
// 2) Kesilen listeleri yakalar (daha fazla düğmesi sınırı)
// 3) Haber akışlarında Ankara'daki etkinlik adlarını arar ve bizde olmayanları listeler (meraklı tarama)
// Çıktılar: data/coverage.json (geçmiş, son 30 tarama), scraper/out/coverage.md (rapor), scraper/out/probe-urls.txt
// Hiçbir şey siteye yayımlanmaz; rapor GitHub'da "Kapsam raporu" konusuna yazılır.
import { join } from "node:path";
import { ROOT, log, readJSON, writeJSON, writeText, fold, todayIST } from "./lib/util.mjs";
import { fetchText } from "./lib/net.mjs";

const HIST = join(ROOT, "data/coverage.json");
// Google Haberler robots.txt ile otomatik okumaya kapalı; kullanılmaz. Okunamayan akış raporda not edilir.
const NEWS = (process.env.AUDIT_FEEDS || [
  "https://www.trthaber.com/kultur_sanat_articles.rss",
  "https://www.aa.com.tr/tr/rss/default?cat=kultur",
  "https://www.yeniankara.com.tr/rss",
  "https://www.evrensel.net/rss/kultur-sanat.xml",
  "https://www.hurriyet.com.tr/rss/kelebek",
].join(" ")).split(/\s+/).filter(Boolean);

const median = (a) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const addDays = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export function snapshot(events, health, today) {
  const end14 = addDays(today, 14), end30 = addDays(today, 30);
  const up = events.filter((e) => e.d >= today && e.d <= end30);
  const byCat = {}, byDay = {}, venues = {};
  for (const e of up) {
    if (e.d <= end14) byCat[e.cat || "diger"] = (byCat[e.cat || "diger"] || 0) + 1;
    const off = Math.round((Date.parse(e.d) - Date.parse(today)) / 864e5);
    if (off <= 13) byDay[off] = (byDay[off] || 0) + 1;
    if (e.venue) venues[e.venue] = (venues[e.venue] || 0) + 1;
  }
  const bySource = Object.fromEntries(Object.values(health.sources || {}).map((s) => [s.id, s.count]));
  const filmNow = up.filter((e) => e.cat === "sinema" && e.d <= addDays(today, 6) && !/festival/i.test(e.genre || "")).length;
  return { at: today, total: events.length, bySource, byCat, byDay, venues, filmNow };
}

export function findGaps(cur, hist, health) {
  const out = [];
  const H = hist.slice(-14);
  const enough = H.length >= 3;
  // a) kaynak olağandan az getirdi
  for (const [id, n] of Object.entries(cur.bySource)) {
    const m = median(H.map((h) => h.bySource?.[id]));
    if (enough && m >= 10 && n < m * 0.6) out.push({ w: 3, k: "kaynak", t: `**${health.sources[id]?.name || id}** olağandan az getirdi: ${n} (son günlerin ortası ${m}).` });
  }
  // b) kategori boşalması (önümüzdeki 14 gün)
  const cats = new Set([...Object.keys(cur.byCat), ...H.flatMap((h) => Object.keys(h.byCat || {}))]);
  for (const c of cats) {
    const n = cur.byCat[c] || 0, m = median(H.map((h) => h.byCat?.[c] || 0));
    if (enough && m >= 8 && n < m * 0.6) out.push({ w: 3, k: "kategori", t: `**${c}** kategorisinde önümüzdeki 14 gün için ${n} etkinlik var; olağanı ${m}.` });
  }
  // c) gün boşluğu
  for (let off = 1; off <= 13; off++) {
    const n = cur.byDay[off] || 0, m = median(H.map((h) => h.byDay?.[off] || 0));
    if (enough && m >= 15 && n < m * 0.5) out.push({ w: 2, k: "gun", t: `${addDays(cur.at, off)} gününde yalnızca ${n} etkinlik var; olağanı ${m}.` });
  }
  // d) sessizleşen mekân: son taramaların çoğunda 3+ etkinliği olan mekân bugün boş
  const vs = new Set(H.flatMap((h) => Object.keys(h.venues || {})));
  for (const v of vs) {
    const busy = H.filter((h) => (h.venues?.[v] || 0) >= 3).length;
    if (enough && busy >= Math.ceil(H.length * 0.6) && !(cur.venues[v] > 0)) out.push({ w: 2, k: "mekan", t: `**${v}** mekânında önümüzdeki 30 gün için hiç etkinlik kalmadı (önceden düzenli vardı).` });
  }
  // e) kesilen listeler ve uzun süredir çalışmayan kaynaklar
  for (const s of Object.values(health.sources || {})) {
    for (const n of s.notes || []) if (/sınıra ulaştı/.test(n)) out.push({ w: 3, k: "kesik", t: `**${s.name}** listesi sonuna kadar açılamadı: ${n.split(":")[0]}` });
    if (!s.ok && (s.failStreak || 0) >= 3) out.push({ w: 1, k: "bozuk", t: `**${s.name}** ${s.failStreak} taramadır boş/hatalı (${s.status}).`, probe: s.id });
  }
  // f) sinema: vizyondaki filmler
  if (cur.filmNow < 10) out.push({ w: 2, k: "sinema", t: `Önümüzdeki 7 günde festival dışında yalnızca ${cur.filmNow} film seansı var; vizyondaki filmler büyük ölçüde eksik.` });
  return out.sort((a, b) => b.w - a.w);
}

/* ---------- Meraklı tarama: haberlerde geçen ama bizde olmayan adlar ---------- */
const EVENT_WORDS = /festival|gala|prömiyer|konser|sahne alacak|tiyatro|sergi|gösteri|vizyon|açılış|resital|bienal|şenlik|söyleşi|turne/i;
const STOP = new Set("ankara ankarada ankaranin uluslararasi ulusal festivali festival bienali haftasi gunleri turkiye konseri konser gala galasi ile ve the of".split(" "));
export function candidatesFrom(title) {
  const t = title.replace(/\s+[-–|]\s+[^-–|]+$/, ""); // "Başlık - Kaynak"
  const c = new Set();
  for (const m of t.matchAll(/[“"‘'«]([^”"’'»]{3,60})[”"’'»]/g)) c.add(m[1].trim());
  for (const m of t.matchAll(/((?:\d+\.\s*)?(?:[A-ZÇĞİÖŞÜ][\wçğıöşü'’]*\s+){0,4}(?:Festivali|Bienali|Haftası|Günleri|Şenliği|Konseri|Galası))/g)) c.add(m[1].trim());
  return [...c].filter((x) => x.length >= 4);
}
export function known(cand, events) {
  const words = fold(cand).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  if (!words.length) return true;
  return events.some((e) => { const h = " " + fold([e.title, e.genre, e.venue, e.org].filter(Boolean).join(" ")) + " "; return words.every((w) => h.includes(w)); });
}
async function newsScan(events) {
  const seen = new Set(), miss = [], notes = [];
  for (const url of NEWS) {
    const r = await fetchText(url, { retries: 1 });
    if (!r.text || r.status !== 200) { notes.push(`${new URL(url).host}: ${r.robots ? "robots.txt izin vermiyor" : r.status || r.error}`); continue; }
    let n = 0;
    for (const it of r.text.split(/<item[\s>]/i).slice(1)) {
      const g = (tag) => ((it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      const title = g("title"), link = g("link"), when = Date.parse(g("pubDate"));
      if (!title || !EVENT_WORDS.test(title)) continue;
      if (when && Date.now() - when > 10 * 864e5) continue; // yalnızca son 10 günün haberleri
      if (!/ankara|başkent|vizyon/i.test(title)) continue;   // başlıkta Ankara geçmeli (vizyon haberleri hariç)
      n++;
      for (const c of candidatesFrom(title)) {
        const key = fold(c); if (seen.has(key)) continue; seen.add(key);
        if (!known(c, events)) miss.push({ c, title: title.slice(0, 140), link });
      }
    }
    notes.push(`${new URL(url).host}: ${n} ilgili haber`);
  }
  return { miss: miss.slice(0, 25), notes };
}

export async function main() {
  const today = todayIST();
  const data = await readJSON(join(ROOT, "data/events.json"), { events: [] });
  const health = await readJSON(join(ROOT, "data/health.json"), { sources: {} });
  const hist = await readJSON(HIST, []);
  const cur = snapshot(data.events, health, today);
  const gaps = findGaps(cur, hist.filter((h) => h.at !== today), health);
  const news = process.env.AUDIT_NO_NEWS ? { miss: [], notes: ["haber taraması kapalı"] } : await newsScan(data.events);
  await writeJSON(HIST, [...hist.filter((h) => h.at !== today), cur].slice(-30), false);

  const probeIds = gaps.filter((g) => g.probe).map((g) => g.probe).slice(0, 4);
  const sources = (await import("./sources/index.mjs")).default;
  const probeUrls = probeIds.map((id) => sources.find((s) => s.id === id)?.listings?.[0]).filter(Boolean);
  await writeText(join(ROOT, "scraper/out/probe-urls.txt"), probeUrls.join(" "));

  const L = [`# Kapsam raporu · ${today}`, "", `Sitede ${data.events.length} etkinlik. Denetim kendi geçmişiyle (${Math.min(hist.length, 14)} tarama) ve haber akışlarıyla karşılaştırdı.`, ""];
  L.push("## Şüpheli boşluklar", "");
  if (gaps.length) for (const g of gaps) L.push(`- ${g.t}`); else L.push("- Geçmişe göre belirgin düşüş ya da boşluk yok.");
  L.push("", "## Haberlerde geçiyor, bizde bulamadım", "", "_Elle bakılmalı: bazıları davetli tören, başka şehir ya da geçmiş tarih olabilir._", "");
  if (news.miss.length) for (const m of news.miss) L.push(`- **${m.c}**: [${m.title}](${m.link})`); else L.push("- Yok.");
  L.push("", `<sub>Haber akışları: ${news.notes.join(" · ")}</sub>`);
  if (probeUrls.length) L.push("", "## Otomatik keşif", "", "Uzun süredir çalışmayan kaynakların liste sayfaları incelendi; çıktı aşağıda.", "");
  await writeText(join(ROOT, "scraper/out/coverage.md"), L.join("\n") + "\n");
  const findings = gaps.filter((g) => g.k !== "bozuk").length + news.miss.length;
  await writeText(join(ROOT, "scraper/out/coverage-count.txt"), String(findings));
  log(`Kapsam denetimi: ${gaps.length} şüpheli boşluk, haberlerde bizde olmayan ${news.miss.length} ad, keşfe giden ${probeUrls.length} kaynak`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
