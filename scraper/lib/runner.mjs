// Bir kaynağı tarar: liste sayfaları → etkinlik bağlantıları → detay sayfaları → ham kayıtlar
import { getPage, fetchText } from "./net.mjs";
import { extractDetail, eventsFromLd, eventsFromJson, linksIn } from "./extract.mjs";
import { looksAnkara } from "./normalize.mjs";
import { cityById, cityOfText, fold as cfold } from "./cities.mjs";
// Hangi il taranıyor: CITY=ankara (varsayılan) | <il kimliği> | tr (bütün Türkiye: etkinliğin ili adresinden bulunur)
const CITY = process.env.CITY || "ankara";
import { log, pool, todayIST, writeText, writeJSON, ROOT } from "./util.mjs";
import { join } from "node:path";
import { badEvent } from "./quality.mjs";

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

  // Kurumun kendi sitesinin kullandığı açık veri uç noktası (anahtar gerekmez): kaynak kendi toplayıcısını verir.
  // Ucuzdur ve satış durumunu da taşır; bu yüzden tazeleme turunda da çalışır.
  const listImages = {}; // liste verisinden gelen afiş adresleri: detay sayfasında afiş yoksa kullanılır
  if (src.collect) {
    try {
      // Dizi ya da { raws, detail } döner: detail, liste verisi yetmeyen (birden çok mekânlı) kayıtların detay sayfalarıdır
      const res = (await src.collect({ fetchText, getPage, today, log, src, city: CITY })) || [];
      const got = Array.isArray(res) ? res : res.raws || [];
      raws.push(...got);
      for (const u of res.detail || []) if (!src.link || src.link.test(u)) detail.add(u);
      Object.assign(listImages, res.images || {});
      notes.push(`açık veri: ${got.length} seans${res.detail?.length ? `, ${res.detail.length} detay sayfası` : ""}${res.note ? `, ${res.note}` : ""}`);
    } catch (e) { notes.push(`açık veri okunamadı: ${e.message}`); }
  }

  if (mode === "full") {
    for (const listing of src.listings || []) {
      const page = await getPage(listing, { render: src.render, loadMore: src.loadMore || [], scrolls: src.scrolls ?? 6 });
      if (!page.html) { notes.push(`liste açılmadı: ${listing} (${page.status || page.error || "?"})`); continue; }
      const ld = eventsFromLd(page.html, page.url || listing, src);
      const js = (page.jsons || []).flatMap((j) => eventsFromJson(j.data, j.url));
      raws.push(...ld, ...js);
      // Liste sayfasının kendisi tarih, saat ve adı veriyorsa (takvim sayfaları) doğrudan oradan okunur
      const listed = src.parseList ? src.parseList(page.html, page.url || listing) || [] : [];
      raws.push(...listed);
      const links = src.link ? linksIn(page.html, page.url || listing).filter((u) => src.link.test(u)) : [];
      links.forEach((u) => detail.add(u));
      // JSON'dan gelen bağlantılar da detay adayıdır
      js.forEach((e) => e.url && src.link?.test(e.url) && detail.add(e.url));
      notes.push(`${listing.replace(/^https?:\/\//, "")}: ${links.length} bağlantı, ${ld.length} yapısal, ${js.length} JSON kaydı${src.parseList ? `, ${listed.length} takvim satırı` : ""}, durum ${page.status}${(src.loadMore || []).length && page.clicks >= 8 ? ", daha fazla düğmesi sınıra ulaştı (liste kesilmiş olabilir)" : ""}`);
      if (debug) {
        const slug = listing.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 80);
        await writeText(join(DEBUG, src.id, slug + ".html"), page.html.slice(0, 6e5));
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
  if (!src.link) detail.clear(); // yalnızca açık veri / takvim sayfasıyla çalışan kaynak
  const list = [...detail].sort((a, b) => knownSet.has(a) - knownSet.has(b)).slice(0, mode === "full" ? src.maxDetail ?? 250 : src.maxRefresh ?? 150);
  let okDetail = 0, gone = [];
  const readUrls = [];
  let skipped = 0, savedDetail = 0;
  await pool(list, src.concurrency || 3, async (u) => {
    if (Date.now() > deadline) { skipped++; return; }
    const page = await getPage(u, { render: src.renderDetail, scrolls: 1, captureJson: !!src.renderDetail });
    if (page.status === 404 || page.status === 410) { gone.push(u); return; }
    if (!page.html) return;
    if (debug && savedDetail < 3) { savedDetail++; await writeText(join(DEBUG, src.id, "detay-" + savedDetail + ".html"), `<!-- ${u} -->\n` + page.html.slice(0, 6e5)); }
    let evs = extractDetail(page.html, page.url || u, src);
    if (!evs.length && page.jsons?.length) evs = page.jsons.flatMap((j) => eventsFromJson(j.data, j.url));
    if (evs.length) { okDetail++; readUrls.push(u); }
    // Yapısal veride afiş yoksa sayfadaki afiş görselinin adresi (yalnızca adres; dosya indirilmez)
    if (evs.some((e) => !e.image)) {
      const m = page.html.match(/<img[^>]+src=["']([^"']*(?:\/Uploads\/|afis|afiş|poster)[^"']*\.(?:jpe?g|png|webp)[^"']*)["']/i);
      if (m) { const im = new URL(m[1].replace(/&amp;/g, "&"), page.url || u).href; for (const e of evs) if (!e.image) e.image = im; }
    }
    for (const e of evs) { if (!e.url || e.url === page.url) e.url = u; raws.push(e); }
  });

  for (const r of raws) if (!r.image && r.url && listImages[r.url]) r.image = listImages[r.url];
  // Takvim sayfasından okunan kaynaklarda afiş, etkinliğin kendi sayfasındaki paylaşım görselidir (og:image); yalnızca adres alınır
  if (src.posterFromPage && mode === "full") {
    const urls = [...new Set(raws.filter((r) => !r.image && r.url && r.d >= today).map((r) => r.url))].slice(0, 40), got = {};
    for (const u of urls) {
      const r = await fetchText(u, { retries: 0 });
      const m = r.text && (r.text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || r.text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i));
      if (m) got[u] = new URL(m[1].replace(/&amp;/g, "&"), u).href;
    }
    for (const r of raws) if (!r.image && got[r.url]) r.image = got[r.url];
    notes.push(`afiş: ${Object.keys(got).length}/${urls.length} etkinlik sayfasından`);
  }
  // filtre: Ankara + gelecek tarih + tekrarsız
  const seen = new Set(), why = {}, ex = {}; const no = (k, r) => { why[k] = (why[k] || 0) + 1; if (!ex[k]) ex[k] = `${r.title || "?"} | ${r.venue || ""} | ${String(r.address || "").slice(0, 60)} | ${r.city || ""} | ${r.d || ""}`; return false; };
  const out = raws.filter((r) => {
    if (!r.title) return no("adsız", r); if (!r.d) return no("tarihsiz", r); if (r.d < today) return no("geçmiş", r);
    if (isJunk(r)) return no(badEvent(r) ? "kalite" : "etkinlik değil", r);
    if (CITY === "ankara") {
      if (src.city !== "ankara" && !looksAnkara(r)) return false;
      if (src.city === "ankara" && r.city && !/ankara/i.test(r.city) && !looksAnkara(r)) return false;
    } else if (CITY === "tr") {
      // bütün Türkiye listesi: ili adresten bul; bulunamayan alınmaz
      const id = cityOfText(r.city || "") || cityOfText([r.venue, r.address].join(" "));
      if (!id) return false; r.cid = id;
    } else {
      // tek il: kaynak o ilin listesini veriyor; başka il yazan kayıt alınmaz
      const C = cityById(CITY), other = r.city && cityOfText(r.city);
      if (other && other !== C.id) return no("başka il (il alanı)", r);
      // Turne: bilet sitesinin etkinlik sayfası bütün illerdeki seansları verir (15.11.2026: Rize'de Bandırma, Ankara, Bursa seansları görünüyordu).
      // Adresi ya da mekânın adı başka ili gösteren seans bu ile yazılmaz.
      { const oa = cityOfText(r.address || "") || cityOfText(r.venue || ""); if (oa && oa !== C.id) return no("başka il (adres/mekân)", r); }
      if (src.city === "tr" && !C.re.test(cfold([r.venue, r.address, r.city, r.url].join(" ")))) return no("il bulunamadı", r);
      r.cid = C.id;
    }
    const k = r.d + r.t + r.title + (r.url || "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (Object.keys(why).length && raws.length) { const w = "elenen: " + Object.entries(why).map(([k, n]) => `${k} ${n} (ör. ${ex[k]})`).join("; "); notes.push(w); if (!out.length) log("  " + w); } // neden boş kaldığı sağlık kaydında görünsün
  const ms = Date.now() - t0;
  if (skipped) notes.push(`süre doldu: ${skipped} detay sayfası bu tur atlandı`);
  log(`  ${src.name}: ${out.length} kayıt (${detail.size} aday, ${okDetail} detay okundu${skipped ? `, ${skipped} atlandı` : ""}, ${Math.round(ms / 1000)} sn)`);
  return { raws: out, detailCount: detail.size, okDetail, gone, notes, ms, readUrls };
}

// Etkinlik olmayan kayıtlar: haberler, başvuru formları, kategori sayfaları, sezon kombineleri, spor maçları
const JUNK_TITLE = /(başvuru formu|basvuru formu|belli oldu|duyuru|haberler?$|^etkinlikler$|^kategoriler$|^fuar$|^şura$|kombine|abonman|sezon kart|season ticket|hediye çeki|gift card)/i;
const TEAMS = /\b(ankaragücü|ankaragucu|gençlerbirliği|genclerbirligi|keçiörengücü|keciorengucu|hacettepe sk|fenerbahçe|galatasaray|beşiktaş|trabzonspor|türk telekom|halkbank|ziraat bankkart)\b/i;
const SPORT = /(\b(fk|sk|spor|futbol|kul[uü]b[uü]?|basketbol|voleybol|hentbol|gençlik ?gücü|gücü)\b.*\s[-–]\s|\s[-–]\s.*\b(fk|sk|spor|futbol|kul[uü]b[uü]?|basketbol|voleybol)\b|\bmaç(ı|lar)?\b)/i;
export function isJunk(r) {
  const title = String(r.title || "");
  if (badEvent(r)) return true;                                    // test kaydı, online ya da yurt dışı adres
  if (JUNK_TITLE.test(title)) return true;
  if (SPORT.test(title) || (TEAMS.test(title) && /\s[-–]\s|\bvs\.?\b/i.test(title)) || /stad(yum|ı)/i.test(r.venue || "")) return true;
  // genel metin tahmini: ne saat ne mekân bulunduysa sayfa büyük ihtimalle etkinlik değil (haber, liste...)
  if (r.via === "heuristic" && !r.t && !r.venue) return true;
  return false;
}
