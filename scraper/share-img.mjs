// HİKÂYE GÖRSELLERİ (kullanıcı isteği, 15.11.2026 23:58: "hikâyede afiş olmazsa olmaz, Apple kalitesinde").
// Paylaş → "Hikâyende paylaş" görseli telefonda çizilir (paylas.js). Ama bazı bilet siteleri afişlerini başka sitenin çizimine vermez
// (CORS); o sitelerin afişli etkinlikleri için görsel burada, yayın sırasında AYNI kodla (paylas.js) önceden hazırlanır: s/<il>/<ad>.jpg.
// Ayrıca afişi olmayan etkinliklere bağlantı önizlemesi kartı: s/<il>/<ad>-og.jpg (share-pages.mjs bunu og:image yapar).
// Afiş değiştirilmez (kırpılmaz, oranıyla, köşeleri yuvarlatılmış çerçevede), altında "Görsel: <kaynak>" yazar; kaldırma talebi blocklist ile.
// Kullanıcı kararı (15.11.2026 23:58–00:04): bu görsellerde afişin değiştirilmemiş kopyası bizim sitede durabilir (Instagram kararıyla aynı).
// Yalnızca önümüzdeki SHARE_DAYS günün etkinlikleri (varsayılan 4); önceki yayından kalan aynı görsel yeniden çizilmez (s/_m.json).
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { ROOT, readJSON, todayIST, log } from "./lib/util.mjs";

const DAYS = +(process.env.SHARE_DAYS || 4), MAX = +(process.env.SHARE_MAX || 4500), today = todayIST();
const addD = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const last = addD(today, DAYS - 1);
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const when = (e) => { const d = new Date(e.d + "T12:00:00"); return `${GUN[d.getDay()]}, ${d.getDate()} ${AY[d.getMonth()]}${e.t ? " · " + e.t : ""}`; };
const OUT = join(ROOT, "s");

const cities = (await readJSON(join(ROOT, "data/cities.json"), { cities: {} })).cities || {};
// (16.11.2026 14:58) bağlantı önizlemesi ve davet görseli: afiş + logomuz (NVS.og), önümüzdeki OG_DAYS gün (varsayılan 7) → s/o/<kısa kod>.jpg (720×900)
const NVK = new Function(await readFile(join(ROOT, "takip.js"), "utf8") + ";return NV")();
const OGD = +(process.env.OG_DAYS || 7), ogLast = addD(today, OGD - 1);
const jobs = [];
for (const [id, c] of Object.entries(cities)) {
  const ev = ((await readJSON(join(ROOT, id === "ankara" ? "data/events.json" : `data/c/${id}.json`), { events: [] })) || {}).events || [];
  const seen = new Map();
  for (const e of ev.filter((x) => x.d >= today)) { // slug sırası share-pages.mjs ve app.js ile aynı (dosya sırası)
    let s = slugOf(e); const k = (seen.get(s) || 0) + 1; seen.set(s, k); if (k > 1) s += "-" + k;
    if (e.status === "iptal") continue;
    const ev0 = { title: e.title, when: when(e), venue: e.venue || "", cityName: c.name || "", cat: e.cat, img: e.img || "", imgBy: e.imgBy || "", base: "https://nv.local/" };
    if (e.d <= ogLast) jobs.push({ city: id, slug: s, kind: "og2", code: NVK.scode(id, s), ev: ev0 });
    if (e.d <= last && e.img) jobs.push({ city: id, slug: s, kind: "story", ev: ev0 });
  }
}
// Afişini başka sitelere çizdiren (CORS izni veren) kaynaklar telefonda çizilir; yalnızca izin vermeyenler burada hazırlanır
const hosts = new Map();
for (const j of jobs) if (j.ev.img) { const h = new URL(j.ev.img).host; if (!hosts.has(h)) hosts.set(h, j.ev.img); }
const cors = new Set();
for (const [h, u] of hosts) {
  try { const r = await fetch(u, { headers: { origin: "https://nevarneyok.net.tr", "user-agent": "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr)" }, signal: AbortSignal.timeout(8000) }); const a = r.headers.get("access-control-allow-origin"); if (a === "*" || a === "https://nevarneyok.net.tr") cors.add(h); await r.body?.cancel(); } catch {}
}
log(`share-img: afişini telefonda çizdiren siteler: ${[...cors].join(", ") || "yok"}; izin vermeyenler: ${[...hosts.keys()].filter((h) => !cors.has(h)).join(", ") || "yok"}`);
const todo = jobs.filter((j) => j.kind === "og2" || !cors.has(new URL(j.ev.img).host)).sort((a, b) => (a.kind === "og2" ? 0 : 1) - (b.kind === "og2" ? 0 : 1) || a.ev.when.localeCompare(b.ev.when)).slice(0, MAX);

const M = (await readJSON(join(OUT, "_m.json"), {})) || {}, NM = {}, ogList = [];
const hashOf = (j) => createHash("sha1").update(JSON.stringify([j.kind, j.ev, 4])).digest("hex").slice(0, 16);
const need = todo.filter((j) => { const f = j.kind === "og2" ? `o/${j.code}.jpg` : `${j.city}/${j.slug}.jpg`, h = hashOf(j); j.f = f; j.h = h; if (M[f] === h) { NM[f] = h; return false; } return true; });
log(`share-img: ${todo.length} görsel gerekli, ${need.length} yeni çizilecek (${todo.length - need.length} önceki yayından)`);

if (need.length) {
  const PJS = await readFile(join(ROOT, "paylas.js"), "utf8");
  const b = await chromium.launch({ args: ["--disable-web-security"] });
  const ctx = await b.newContext({ deviceScaleFactor: 1 });
  await ctx.route("https://nv.local/**", async (r) => { const p = new URL(r.request().url()).pathname.slice(1); try { r.fulfill({ body: await readFile(join(ROOT, p)) }); } catch { r.abort(); } });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><head><base href="https://nv.local/"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@400;500;600;700;800&display=swap"></head><body><script>${PJS}</script></body></html>`, { waitUntil: "networkidle" }).catch(() => {});
  let ok = 0, bad = 0; const fails = [];
  // ara kayıt: adım süresi dolarsa bile o ana kadar çizilenler sonraki yayında kullanılır
  const flush = async () => { const all = { ...M, ...NM }; await mkdir(OUT, { recursive: true }); await writeFile(join(OUT, "_m.json"), JSON.stringify(all)); await writeFile(join(OUT, "_og.json"), JSON.stringify(Object.keys(all).filter((f) => f.startsWith("o/")).map((f) => f.slice(2, -4)))); };
  for (let i = 0; i < need.length; i += 6) {
    if (i && i % 300 === 0) await flush();
    await Promise.all(need.slice(i, i + 6).map(async (j0) => { let j = j0;
      // afiş önce burada indirilir (tarayıcıdan yüklenemeyen siteler için), çizime veri olarak verilir
      if (j.ev.img) { try { const r = await fetch(j.ev.img, { headers: { "user-agent": "Mozilla/5.0 (compatible; NeVarNeYokBot/1.0; +https://nevarneyok.net.tr)", accept: "image/*" }, signal: AbortSignal.timeout(15000) });
        if (r.ok) { const ct = r.headers.get("content-type") || "image/jpeg"; j = { ...j, ev: { ...j.ev, img: `data:${ct};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}` } }; } else fails.push(new URL(j.ev.img).host + " " + r.status); } catch (e) { fails.push(new URL(j.ev.img).host + " " + e.name); } }
      const data = await page.evaluate(async ({ kind, ev }) => {
        try { let im = null; if (ev.img) im = await Promise.race([NVS.img(ev.img, false), new Promise((_, n) => setTimeout(n, 12000))]).catch(() => null);
          if (kind === "story" && !im) return null;
          if (kind === "og2") { const big = await NVS.og(ev, im, null), sm = document.createElement("canvas"); sm.width = 720; sm.height = 900; const x = sm.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(big, 0, 0, 720, 900); return sm.toDataURL("image/jpeg", .82); }
          const cv = await NVS.story(ev, im); return cv.toDataURL("image/jpeg", .84); } catch (e) { return null; }
      }, j).catch(() => null);
      if (!data) { bad++; return; }
      await mkdir(dirname(join(OUT, j0.f)), { recursive: true }); await writeFile(join(OUT, j0.f), Buffer.from(data.split(",")[1], "base64")); NM[j0.f] = j0.h; ok++;
    }));
  }
  await b.close();
  log(`share-img: ${ok} görsel çizildi, ${bad} afiş yüklenemedi${fails.length ? " · " + Object.entries(fails.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {})).map(([k, v]) => k + "×" + v).join(", ") : ""}`);
}
// artık gerekmeyenleri sil
for (const f of Object.keys(M)) if (!NM[f]) await rm(join(OUT, f), { force: true });
for (const f of Object.keys(NM)) if (f.startsWith("o/")) ogList.push(f.slice(2, -4)); // kısa kodlar
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "_m.json"), JSON.stringify(NM));
await writeFile(join(OUT, "_og.json"), JSON.stringify(ogList));
log(`share-img: toplam ${Object.keys(NM).length} görsel (${ogList.length} önizleme kartı)`);
