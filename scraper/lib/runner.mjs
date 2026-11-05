// Bir kaynağı tarar: liste sayfaları → etkinlik bağlantıları → detay sayfaları → ham kayıtlar
import { getPage, fetchText } from "./net.mjs";
import { extractDetail, eventsFromLd, eventsFromJson, linksIn } from "./extract.mjs";
import { looksAnkara } from "./normalize.mjs";
import { log, pool, todayIST, writeText, writeJSON, ROOT } from "./util.mjs";
import { join } from "node:path";

const DEBUG = process.env.DEBUG_DIR || join(ROOT, "scraper/out/debug");

async function sitemapUrls(src) {
  const seeds = [].concat(src.sitemaps || []);
  if (!seeds.length) {
    const r = await fetchText(new URL("/robots.txt", src.home).href, { retries: 0 });
    for (const m of (r.text || "").matchAll(/^\s*sitemap:\s*(\S+)/gim)) seeds.push(m[1]);
    if (!seeds.length) seeds.push(new URL("/sitemap.xml", src.home).href);
  }
  const out = new Set(), seen = new Set();
  const queue = [...seeds];
  while (queue.length && seen.size < 25) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const r = await fetchText(u, { retries: 0 });
    if (r.status !== 200) continue;
    for (const m of r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const loc = m[1].replace(/&amp;/g, "&");
      if (/\.xml(\?|$)/i.test(loc)) { if (!src.sitemapFilter || src.sitemapFilter.test(loc) || /event|etkinlik|tiyatro|muzik|konser/i.test(loc)) queue.push(loc); }
      else if (src.link.test(loc) && (!src.sitemapFilter || src.sitemapFilter.test(loc))) out.add(loc);
    }
  }
  return [...out];
}

/**
 * src: sources/index.mjs içindeki tanım
 * known: bu kaynaktan daha önce bulunmuş detay adresleri (fiyat/durum tazelemek için)
 * mode: "full" | "refresh"
 */
export async function runSource(src, { known = [], mode = "full", debug = true, budgetMs = 11 * 60e3 } = {}) {
  const t0 = Date.now();
  const deadline = t0 + budgetMs; // süre dolunca yarıda kesmek yerine o ana kadar bulunanlarla döner
  const raws = [];
  const detail = new Set();
  const notes = [];
  const today = todayIST();

  if (mode === "full") {
    for (const listing of src.listings || []) {
      const page = await getPage(listing, { render: src.render, loadMore: src.loadMore || [], scrolls: src.scrolls ?? 6 });
      if (!page.html) { notes.push(`liste açılmadı: ${listing} (${page.status || page.error || "?"})`); continue; }
      const ld = eventsFromLd(page.html, page.url || listing);
      const js = (page.jsons || []).flatMap((j) => eventsFromJson(j.data, j.url));
      raws.push(...ld, ...js);
      const links = linksIn(page.html, page.url || listing).filter((u) => src.link.test(u));
      links.forEach((u) => detail.add(u));
      // JSON'dan gelen bağlantılar da detay adayıdır
      js.forEach((e) => e.url && src.link.test(e.url) && detail.add(e.url));
      notes.push(`${listing.replace(/^https?:\/\//, "")}: ${links.length} bağlantı, ${ld.length} yapısal, ${js.length} JSON kaydı, durum ${page.status}`);
      if (debug) {
        const slug = listing.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 80);
        await writeText(join(DEBUG, src.id, slug + ".html"), page.html.slice(0, 3e6));
        if (page.jsons?.length) await writeJSON(join(DEBUG, src.id, slug + ".json"), page.jsons.map((j) => ({ url: j.url, sample: JSON.stringify(j.data).slice(0, 4000) })), true);
      }
    }
    if (src.sitemap) {
      const sm = await sitemapUrls(src).catch(() => []);
      sm.slice(0, src.maxSitemap || 400).forEach((u) => detail.add(u));
      notes.push(`site haritası: ${sm.length} adres`);
    }
  }
  known.forEach((u) => detail.add(u));

  // detay sayfaları: önce bilinmeyenler (yeni etkinlikler), sonra bilinenler (tazeleme)
  const knownSet = new Set(known);
  const list = [...detail].sort((a, b) => knownSet.has(a) - knownSet.has(b)).slice(0, mode === "full" ? src.maxDetail ?? 250 : src.maxRefresh ?? 150);
  let okDetail = 0, gone = [];
  let skipped = 0;
  await pool(list, src.concurrency || 3, async (u) => {
    if (Date.now() > deadline) { skipped++; return; }
    const page = await getPage(u, { render: src.renderDetail, scrolls: 1, captureJson: !!src.renderDetail });
    if (page.status === 404 || page.status === 410) { gone.push(u); return; }
    if (!page.html) return;
    let evs = extractDetail(page.html, page.url || u, src);
    if (!evs.length && page.jsons?.length) evs = page.jsons.flatMap((j) => eventsFromJson(j.data, j.url));
    if (evs.length) okDetail++;
    for (const e of evs) { if (!e.url || e.url === page.url) e.url = u; raws.push(e); }
  });

  // filtre: Ankara + gelecek tarih + tekrarsız
  const seen = new Set();
  const out = raws.filter((r) => {
    if (!r.d || r.d < today || !r.title) return false;
    if (src.city !== "ankara" && !looksAnkara(r)) return false;
    if (src.city === "ankara" && r.city && !/ankara/i.test(r.city) && !looksAnkara(r)) return false;
    const k = r.d + r.t + r.title + (r.url || "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const ms = Date.now() - t0;
  if (skipped) notes.push(`süre doldu: ${skipped} detay sayfası bu tur atlandı`);
  log(`  ${src.name}: ${out.length} kayıt (${detail.size} aday, ${okDetail} detay okundu${skipped ? `, ${skipped} atlandı` : ""}, ${Math.round(ms / 1000)} sn)`);
  return { raws: out, detailCount: detail.size, okDetail, gone, notes, ms };
}
