// HABERDEN ETKİNLİK KEŞFİ (kullanıcı, 18.11.2026 15:28: "temel problem Atların Dansı'nın olmaması değil, benim öğrenip sana söylemem;
// sistem benim uyarıma gerek kalmadan her şeyi bünyesinde bulundurmalı, bütün Türkiye").
// Bilet sitesinde satılmayan etkinlikler (ücretsiz/başvurulu gösteriler, belediye etkinlikleri, uzatılan sergiler…) haberle duyurulur.
// Bu iş haber akışlarındaki etkinlik haberlerini okur, haberin sayfasından YALNIZCA OLGULARI çıkarır (etkinliğin adı, il, tarih(ler), mekân)
// ve bizde olmayanları data/haber.json'a yazar. Haber metni yalnızca bellekte okunur; saklanan: ad, il, tarih, mekân, tür, haberin sitesi ve bağlantısı.
// Haberin paylaşım görselinin yalnızca adresi tutulur (afişi bulunamayan etkinlikte "Görsel: <haber sitesi>"; kullanıcı kararı 18.11.2026). Kayıtlar Ankara taramasında (run.mjs) ve il birleştirmesinde (sehirler-birlestir.mjs) listelere girer.
//   node haber-kesif.mjs
import { join } from "node:path";
import { ROOT, log, readJSON, writeJSON, decodeEntities, todayIST, fold, pool, withTimeout } from "./lib/util.mjs";
import { fetchText } from "./lib/net.mjs";
import { parseFeed, FEEDS as BUZZ_FEEDS } from "./buzz.mjs";
import { candidatesFrom } from "./audit.mjs";
import { CITIES, cityOfText } from "./lib/cities.mjs";
const ABROAD = /\b(gazze|filistin|riyad|cidde|dubai|doha|katar|tahran|bakü|baku|kktc|lefkoşa|girne|berlin|paris|londra|new york|los angeles|viyana|roma|madrid|atina|moskova|amsterdam|brüksel|cannes|venedik|tokyo|kahire|beyrut|şam|bağdat|erbil|üsküp|saraybosna|tiflis|almanya|fransa|ingiltere|abd|amerika|italya|ispanya|yunanistan|rusya|mısır|lübnan|suriye|irak|iran|azerbaycan)(['’ ]?(da|de|ta|te|nda|nde|daki|deki))\b/i;
import { guessCat, fixCat } from "./lib/normalize.mjs";
import { speakerIn } from "./lib/konusmaci.mjs";

const OUT = join(ROOT, "data/haber.json");
const MAX_ART = +process.env.HABER_MAX || 450;   // çalışma başına en çok bu kadar haber sayfası okunur
const DAYS = 14, AHEAD = 120;

// kültür-sanat akışları (buzz) + genel/yerel akışlar: belediye, valilik, kurum duyuruları çoğu zaman "gündem/yerel" başlığında çıkar
const FEEDS = [
  ...BUZZ_FEEDS.filter((f) => f.kind === "haber"),
  { id: "aa-guncel", name: "AA", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel" },
  { id: "trt-turkiye", name: "TRT Haber", url: "https://www.trthaber.com/turkiye_articles.rss" },
  { id: "trt-gundem", name: "TRT Haber", url: "https://www.trthaber.com/gundem_articles.rss" },
  { id: "haberturk-gundem", name: "Habertürk", url: "https://www.haberturk.com/rss/kategori/gundem.xml" },
  { id: "sabah-yasam", name: "Sabah", url: "https://www.sabah.com.tr/rss/yasam.xml" },
  { id: "cumhuriyet-turkiye", name: "Cumhuriyet", url: "https://www.cumhuriyet.com.tr/rss/turkiye" },
  { id: "mansetankara", name: "Manşet Ankara", url: "https://mansetankara.com/rss" },
  { id: "mansetankara2", name: "Manşet Ankara", url: "https://mansetankara.com/rss.xml" },
  { id: "ankarahaber", name: "Ankara Haber", url: "https://www.ankarahaber.com.tr/rss" },
  { id: "iha", name: "İHA", url: "https://www.iha.com.tr/rss" },
  { id: "dha", name: "DHA", url: "https://www.dha.com.tr/rss" },
  ...MORE(),
];
// 18.11.2026 16:11 (kullanıcı: "ne gerekiyorsa yap, her şey gözüksün"): ulusal kültür-sanat/yaşam akışları ve il il yerel gazeteler.
// Adresler sitelerin yaygın akış biçimleri; çalışmayan (404, robots kapalı) akış yalnızca günlüğe "x: 404" olarak düşer, işi durdurmaz.
// Aynı sitenin birden çok biçimi denenir; ilk çalışan kalır (aynı alan adı için ikincisi atlanır).
function MORE() {
  const N = [
    ["ntv-sanat", "NTV", "https://www.ntv.com.tr/sanat.rss"], ["ntv-turkiye", "NTV", "https://www.ntv.com.tr/turkiye.rss"],
    ["cnnturk-kultur", "CNN Türk", "https://www.cnnturk.com/feed/rss/kultur-sanat/news"], ["cnnturk-turkiye", "CNN Türk", "https://www.cnnturk.com/feed/rss/turkiye/news"],
    ["milliyet-kultur", "Milliyet", "https://www.milliyet.com.tr/rss/rssnew/kultursanatrss.xml"], ["milliyet-gundem", "Milliyet", "https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml"],
    ["yenisafak-kultur", "Yeni Şafak", "https://www.yenisafak.com/rss?xml=kultur-sanat"], ["t24-kultur", "T24", "https://t24.com.tr/rss/haber/kultur-sanat"],
    ["birgun", "BirGün", "https://www.birgun.net/rss/home"], ["duvar", "Gazete Duvar", "https://www.gazeteduvar.com.tr/export/rss"],
    ["karar", "Karar", "https://www.karar.com/rss/kultur-sanat"], ["star", "Star", "https://www.star.com.tr/rss/rss.asp"],
    ["haberler-kultur", "Haberler.com", "https://rss.haberler.com/rss.asp?kategori=kultur-sanat"], ["haberler-yasam", "Haberler.com", "https://rss.haberler.com/rss.asp?kategori=yasam"],
    ["haber7-kultur", "Haber7", "https://i12.haber7.net/sondakika/newsstand/latest.xml"], ["iha-kultur", "İHA", "https://www.iha.com.tr/rss/kultur-sanat"],
    ["aa-yasam", "AA", "https://www.aa.com.tr/tr/rss/default?cat=yasam"], ["trt-yasam", "TRT Haber", "https://www.trthaber.com/yasam_articles.rss"],
    ["hurriyet-gundem", "Hürriyet", "https://www.hurriyet.com.tr/rss/gundem"], ["sozcu-gundem", "Sözcü", "https://www.sozcu.com.tr/feeds-rss-category-gundem"],
  ];
  // yerel gazeteler (il adı başlıkta geçmese de cityOfText gövdeden bulur)
  const L = [
    ["Manşet Ankara", "mansetankara.com", ["/rss/ozel-haber", "/rss/kultur-sanat", "/rss/guncel", "/rss/ankara"]],
    ["Ankara Net Haber", "www.ankaranethaber.com", ["/rss", "/rss.xml", "/feed"]], ["Ankara Masası", "www.ankaramasasi.com", ["/rss", "/rss/kultur-sanat"]],
    ["Başkent Postası", "www.baskentpostasi.com.tr", ["/rss", "/rss/kultur-sanat"]], ["Başkent Gazete", "www.baskentgazete.com.tr", ["/rss", "/feed"]],
    ["Yeni Asır", "www.yeniasir.com.tr", ["/rss/kultur-sanat.xml", "/rss/anasayfa.xml"]], ["Ege'de Son Söz", "www.egedesonsoz.com", ["/rss", "/rss/kultur-sanat"]],
    ["Ege Telgraf", "www.egetelgraf.com", ["/rss", "/rss/kultur-sanat"]], ["İzmir Time24", "www.izmirtime24.com", ["/rss"]],
    ["Olay", "www.olay.com.tr", ["/rss", "/rss/kultur-sanat"]], ["Bursa Hakimiyet", "www.bursahakimiyet.com.tr", ["/rss", "/rss/kultur-sanat"]], ["Bursada Bugün", "www.bursadabugun.com", ["/rss", "/rss/kultur-sanat"]],
    ["Antalya Körfez", "www.antalyakorfez.com", ["/rss"]], ["Antalya Son Dakika", "www.antalyasondakika.com", ["/rss"]], ["Akdeniz Gazetesi", "www.akdenizgazetesi.com.tr", ["/rss"]],
    ["Yeni Adana", "www.yeniadana.net", ["/rss"]], ["Adana Medya", "www.adanamedya.com", ["/rss"]], ["Konya Yenigün", "www.konyayenigun.com", ["/rss"]], ["Yeni Konya", "www.yenikonya.com.tr", ["/rss"]],
    ["Eskişehir Anadolu", "www.esanadolugazetesi.com", ["/rss"]], ["Sakarya Yenigün", "www.sakaryayenigun.com", ["/rss"]], ["Kocaeli Barış", "www.kocaelibarisgazetesi.com", ["/rss"]],
    ["Özgür Kocaeli", "www.ozgurkocaeli.com.tr", ["/rss"]], ["Kayseri Anadolu Haber", "www.kayserianadoluhaber.com.tr", ["/rss"]], ["Gaziantep Olay", "www.olaygazetesi.com.tr", ["/rss"]],
    ["Samsun Haber", "www.samsunhaber.com", ["/rss"]], ["Taka", "www.takagazete.com.tr", ["/rss"]], ["Mersin Haber", "www.mersinhaber.com", ["/rss"]],
    ["Hatay Gazetesi", "www.hataygazetesi.com.tr", ["/rss"]], ["Denizli Haber", "www.denizlihaber.com", ["/rss"]], ["Muğla Haber", "www.muglahaber.com.tr", ["/rss"]],
    ["Bodrum Haber", "www.bodrumhaber.com", ["/rss"]], ["Erzurum Pusula", "www.pusulahaber.com.tr", ["/rss"]], ["Diyarbakır Söz", "www.diyarbakirsoz.com", ["/rss"]],
    ["Van Haber", "www.vanhaber.net", ["/rss"]], ["Malatya Haber", "www.malatyahaber.com", ["/rss"]], ["Elazığ Haber", "www.elazighaber.com.tr", ["/rss"]],
    ["Sivas Haber", "www.sivashaber.com", ["/rss"]], ["Tokat Haber", "www.tokathaber.com.tr", ["/rss"]], ["Çanakkale Olay", "www.canakkaleolay.com", ["/rss"]],
    ["Edirne Haber", "www.edirnehaber.org", ["/rss"]], ["Tekirdağ Haber", "www.tekirdaghaber.com", ["/rss"]], ["Balıkesir Haber", "www.balikesirhaber.com.tr", ["/rss"]],
    ["Manisa Haber", "www.manisahaber.com.tr", ["/rss"]], ["Aydın Ses", "www.aydinses.com", ["/rss"]], ["Isparta Haber", "www.ispartahaber.com", ["/rss"]],
    ["Afyon Haber", "www.afyonhaber.com", ["/rss"]], ["Kütahya Haber", "www.kutahyahaber.com", ["/rss"]], ["Zonguldak Haber", "www.zonguldakhaber.net", ["/rss"]],
    ["Bolu Olay", "www.boluolay.com", ["/rss"]], ["Düzce Haber", "www.duzcehaber.com", ["/rss"]], ["Ordu Olay", "www.orduolay.com", ["/rss"]],
    ["Giresun Haber", "www.giresunhaber.com", ["/rss"]], ["Rize Haber", "www.rizehaber.com", ["/rss"]], ["Kastamonu Haber", "www.kastamonuhaber.com", ["/rss"]],
    ["Şanlıurfa Haber", "www.urfanatik.com", ["/rss"]], ["Mardin Haber", "www.mardinhaber.com", ["/rss"]], ["Kahramanmaraş Haber", "www.kahramanmarashaber.com", ["/rss"]],
    ["Nevşehir Haber", "www.nevsehirhaber.com", ["/rss"]], ["Aksaray Haber", "www.aksarayhaber.com", ["/rss"]], ["Niğde Haber", "www.nigdehaber.com", ["/rss"]],
    ["Bilecik Haber", "www.bilecikhaber.com", ["/rss"]], ["Kırşehir Haber", "www.kirsehirhaber.com", ["/rss"]], ["Yozgat Haber", "www.yozgathaber.com", ["/rss"]],
    ["Çorum Haber", "www.corumhaber.net", ["/rss"]], ["Amasya Haber", "www.amasyahaber.com", ["/rss"]], ["Karabük Haber", "www.karabukhaber.com", ["/rss"]],
  ];
  const out = N.map(([id, name, url]) => ({ id, name, url }));
  for (const [name, host, paths] of L) paths.forEach((p, i) => out.push({ id: host.replace(/^www\./, "").split(".")[0] + (i ? "-" + i : ""), name, url: "https://" + host + p, host }));
  return out;
}

const EVW = /festival|şenli[gğ]|konser|gösteri|sergi|tiyatro|oyun(u|unu)? sahnelen|sahnelenecek|sahne alacak|dinleti|resital|gala|fuar|panayır|söyleşi|seminer|konferans|panel|imza gün|konuşmacı|konuşacak|konuk olacak|buluşacak|buluşuyor|atölye|etkinli[gğ]|kutlama|anma töreni|yarışma|turnuva|maraton|uzatıldı|ek gösterim|biletler tükendi|ücretsiz/i;
const NOT = /deprem|kaza|cinayet|gözaltı|tutuklan|yaralı|öldü|hayatını kaybet|operasyon|seçim|mahkeme|dolandır|yangın|sel |fırtına|trafik kazası|maç sonucu|transfer|borsa|dolar|enflasyon/i;
const AY = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];
const AYR = "(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)";
const mi = (m) => AY.indexOf(fold(m));
const pad = (n) => String(n).padStart(2, "0");

const stripHtml = (h) => decodeEntities(String(h || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
  .replace(/<\/(p|div|h\d|li|br)>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t ]+/g, " ").replace(/\n\s*/g, "\n").trim();
// haberin gövdesi: <article> ya da en uzun paragraf kümesi; yan sütun/menü metni ayıklanır
// Paylaşım görseli (og:image / twitter:image). Site logosu, varsayılan görsel elenir.
export function ogImg(html, base) {
  const m = html && (html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i));
  if (!m) return "";
  let u = ""; try { u = new URL(m[1].replace(/&amp;/g, "&"), base).href; } catch { return ""; }
  return /^https:/.test(u) && !/logo|favicon|default|placeholder|no[-_]?image|share[-_]?image|sprite|icon/i.test(u) ? u : "";
}
function bodyOf(html) {
  const a = (html.match(/<article\b[\s\S]*?<\/article>/i) || [])[0];
  const src = a && a.length > 800 ? a : html;
  const ps = [...src.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripHtml(m[1])).filter((t) => t.length > 40);
  return (ps.length >= 2 ? ps.join("\n") : stripHtml(src)).slice(0, 8000);
}

/* Tarihler: "21 Kasım", "21-22 Kasım", "21 ve 22 Kasım", "30 Kasım'a kadar", "28 Kasım 2026", "21 Kasım Cumartesi saat 20.00" */
export function datesOf(text, today = todayIST()) {
  const y0 = +today.slice(0, 4), m0 = +today.slice(5, 7);
  const iso = (d, m, y) => { if (!(d >= 1 && d <= 31) || m < 0) return ""; let yy = y || y0; if (!y && m + 1 < m0 - 1) yy = y0 + 1; return `${yy}-${pad(m + 1)}-${pad(d)}`; };
  const end = new Date(Date.parse(today + "T12:00:00Z") + AHEAD * 864e5).toISOString().slice(0, 10);
  const ok = (s) => s && s >= today && s <= end;
  const days = new Set(); let until = "", from = "", time = "";
  const T = String(text);
  for (const m of T.matchAll(new RegExp(`(\\d{1,2})\\s*(?:[-–]|ile|ve)\\s*(\\d{1,2})\\s+${AYR}(?:\\s+(20\\d\\d))?`, "gi"))) {
    const a = +m[1], b = +m[2], M = mi(m[3]), y = m[4] ? +m[4] : 0;
    if (b >= a && b - a <= 6) for (let d = a; d <= b; d++) { const s = iso(d, M, y); if (ok(s)) days.add(s); }
    else if (b > a) { const s = iso(a, M, y), e = iso(b, M, y); if (ok(e)) { from = from || s; until = until || e; } }
  }
  for (const m of T.matchAll(new RegExp(`(\\d{1,2})\\s+${AYR}(?:\\s+(20\\d\\d))?['’]?\\s*(?:(?:a|e|ya|ye|'a|'e)\\s+)?(kadar|tarihine kadar|tarihleri arasında)?`, "gi"))) {
    const s = iso(+m[1], mi(m[2]), m[3] ? +m[3] : 0); if (!ok(s)) continue;
    if (/kadar/i.test(m[0])) { if (!until || s > until) until = s; } else days.add(s);
  }
  const tm = T.match(/saat\s+(\d{1,2})[.:](\d{2})/i); if (tm && +tm[1] < 24) time = `${pad(+tm[1])}:${tm[2]}`;
  return { days: [...days].sort(), until, from, time };
}

/* Mekân: "X Merkezi'nde düzenlenecek", "X Salonu'nda sahnelenecek" — büyük harfle başlayan ad + bulunma eki + etkinlik fiili */
const VENUE_WORD = /merkez|salon|sahne|park|meydan|kütüphane|müze|galeri|tiyatro|opera|kongre|fuar|stadyum|arena|orman|bahçe|kampüs|üniversite|konservatuvar|ada|köşk|saray|kale|han|çarşı|sanat|kültür|gösteri|amfi/i;
export function venueOf(text) {
  const re = /((?:[A-ZÇĞİÖŞÜ][\p{L}0-9.&-]*\s+){0,7}[A-ZÇĞİÖŞÜ][\p{L}0-9.-]*)['’]?(?:n)?(?:da|de|ta|te)(?:ki)?\s+(?:[\p{L}0-9.:’']+\s+){0,6}?(?:düzenlen|gerçekleştiril|sahnelen|yapıl|açıl|sergilen|buluş|izleyici|ziyaret|başla|sürecek|devam)/gu;
  let best = "";
  for (const m of String(text).matchAll(re)) { const v = m[1].trim().replace(/^(Bu|Etkinlik|Gösteri|Sergi|Festival|Program|Konser)\s+/, ""); if (VENUE_WORD.test(v) && v.length > best.length && v.split(/\s+/).length >= 2) best = v; }
  if (best) return best;
  // fiil yoksa: mekân sözcüğü taşıyan, bulunma ekli ilk büyük harfli ad ("… Kültür Merkezi'nde")
  for (const m of String(text).matchAll(/((?:[A-ZÇĞİÖŞÜ][\p{L}0-9.&-]*\s+){1,7}[A-ZÇĞİÖŞÜ][\p{L}0-9.-]*)['’](?:n)?(?:da|de|ta|te)\b/gu)) { const v = m[1].trim(); if (VENUE_WORD.test(v)) return v; }
  return "";
}

/* Etkinliğin adı: başlıktaki tırnaklı ad ya da "X gösterisi/sergisi/festivali…" öbeği (audit.mjs → candidatesFrom) */
// Ad: tırnak artıkları temizlenir; büyük harf ya da rakamla başlamalı ("ta açılan" gibi kırpıntı olmaz);
// tek sözcüklü ad yalnızca başlıkta tırnak içindeyse ("Seramik" sergisi gibi genel sözcükler etkinlik adı sayılmaz).
const cleanName = (x) => String(x || "").replace(/^[\s“”"‘’'«»]+|[\s“”"‘’'«»:,.]+$/g, "").trim();
function nameOf(title) {
  const c = candidatesFrom(title).map(cleanName).filter((x) => /^[A-ZÇĞİÖŞÜ0-9]/.test(x) && (x.split(/\s+/).length >= 2 || new RegExp(`[“"‘'«]${x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[”"’'»]`).test(title)));
  return c.sort((a, b) => b.length - a.length)[0] || "";
}
// Yurt dışında yapılan etkinlik (haber Türkçe ama yer başka ülke) alınmaz
const FOREIGN = /selanik|atina|berlin|cannes|venedik|londra|paris|viyana|new york|los angeles|sundance|toronto|busan|rotterdam|karlovy|saraybosna|bak[uü]\b|tiflis|amsterdam|roma\b|milano|madrid|barselona|tokyo|dubai|kahire|moskova|kiev|sofya|üsküp|priştine|lefkoşa|girne|magosa/i;
// Kayıt denetimi (her çalışmada eski kayıtlara da uygulanır): ad geçerli, yer yurt dışı değil, mekân başka ili gösteriyorsa il mekândan
export function fixItem(x) {
  const title = cleanName(x.title);
  if (!/^[A-ZÇĞİÖŞÜ0-9]/.test(title) || title.split(/\s+/).length < 2 || FOREIGN.test(title)) return null;   // tek sözcük ("Seramik") genel ad olabilir
  const vc = x.venue ? cityOfText(x.venue) : "";
  return { ...x, title, city: vc && vc !== x.city ? vc : x.city };
}
const catOf = (name, title) => {
  const t = fold(title + " " + name);
  const hint = /sergi/.test(t) ? "atolye" : /festival|senlik|fuar|panayir/.test(t) ? "festival" : /tiyatro|oyun|sahnelen/.test(t) ? "tiyatro" : /konser|dinleti|resital/.test(t) ? "konser"
    : /gosteri|dans|bale|opera|sema/.test(t) ? "sahne" : /cocuk|aile/.test(t) ? "cocuk" : /soylesi|seminer|konferans|imza gun|atolye|panel/.test(t) ? "atolye" : "";
  return hint || fixCat({ cat: guessCat({ title: name + " " + title }), title: name, venue: "" });
};

async function main() {
  const today = todayIST(), now = new Date().toISOString();
  const prev = await readJSON(OUT, { items: [] });
  const known = new Map((prev.items || []).filter((x) => (x.until || x.days?.at(-1) || "") >= today).map((x) => [x.url, x]));
  const seen = new Set(), cands = [], notes = [];
  const okHost = new Set(), RES = new Map();
  await pool(FEEDS, 8, async (f) => { RES.set(f, await withTimeout(fetchText(f.url, { retries: f.host ? 0 : 1 }), 25000).catch((e) => ({ error: String(e?.message || e).slice(0, 40) }))); });
  for (const f of FEEDS) {
    if (f.host && okHost.has(f.host) && !/ozel-haber|kultur/.test(f.url)) continue;
    const r = RES.get(f) || {};
    if (!r.text || r.status !== 200 || !/<(rss|feed|rdf)\b/i.test(r.text.slice(0, 3000))) { notes.push(`${f.id}: ${r.robots ? "robots kapalı" : r.status !== 200 ? r.status || r.error : "akış değil"}`); continue; }
    if (f.host) okHost.add(f.host);
    let n = 0;
    for (const it of parseFeed(r.text)) {
      if (!it.title || !it.link || seen.has(it.link)) continue; seen.add(it.link);
      if (it.date && Date.parse(it.date) < Date.now() - DAYS * 864e5) continue;
      const sp = speakerIn(it.title);                              // tanınmış konuşmacı: "… Ankara'ya geliyor" gibi başlıklar da okunur
      if ((!EVW.test(it.title) && !(sp && /geliyor|gelecek|konuş|söyleş|buluş|konuk/i.test(it.title))) || NOT.test(it.title) || FOREIGN.test(it.title)) continue;
      const name = nameOf(it.title) || (sp ? sp + " söyleşisi" : ""); if (!name) continue;
      cands.push({ name, head: it.title, url: it.link, site: f.name, teaser: it.text || "" }); n++;
    }
    notes.push(`${f.id}: ${n} aday`);
  }
  log(`Haber keşfi: ${cands.length} aday haber (${notes.join(", ")})`);
  const items = [...known.values()];
  let read = 0;
  const todo = cands.filter((c) => !known.has(c.url)).slice(0, MAX_ART);
  await pool(todo, 8, async (c) => {
    const r = await withTimeout(fetchText(c.url, { retries: 0 }), 25000).catch(() => ({})); read++;
    if (!r.text || r.status !== 200) return;
    const body = bodyOf(r.text), all = c.head + "\n" + body;      // metin yalnızca bellekte
    // yurt dışında olan etkinliğin haberi alınmaz (25.11.2026: "Gazze'de Çocuk Film Festivali" İstanbul'a, "Riyad'da festival" İstanbul'a düşüyordu)
    if ((ABROAD.test(c.head) || ABROAD.test(decodeURIComponent(String(c.url || "")).replace(/-/g, " "))) && !cityOfText(c.head)) return;
    const city = cityOfText(c.head) || cityOfText(body.slice(0, 1500)); if (!city) return;
    const D = datesOf(all, today);
    if (!D.days.length && !D.until) return;                       // tarihi yazmayan haber etkinlik sayılmaz
    const venue = venueOf(body);
    const img = ogImg(r.text, c.url);                                  // haberin tanıtım görseli: yalnızca adresi, kaynağıyla
    items.push({ id: fold(c.name).replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + city, city, title: c.name, cat: catOf(c.name, c.head), venue,
      days: D.days, until: D.until, from: D.from, t: D.time, free: /ücretsiz|ucretsiz|bedava|giriş serbest/i.test(all) || undefined,
      soldout: /biletler(i)? (anında )?tükendi|kontenjan doldu/i.test(all) || undefined, ...(img ? { img } : {}), site: c.site, url: c.url, seen: now });
  });
  // aynı etkinlik birden çok haberde: ad + il birleşir (tarihler toplanır, en son haber bağlantısı kalır)
  const byId = new Map();
  for (const x of items) { const m = byId.get(x.id); if (!m) { byId.set(x.id, { ...x, days: [...(x.days || [])] }); continue; }
    m.days = [...new Set([...m.days, ...(x.days || [])])].sort(); if ((x.until || "") > (m.until || "")) m.until = x.until; if (!m.venue && x.venue) m.venue = x.venue; if (!m.img && x.img) { m.img = x.img; m.imgBy = x.site; } if (!m.t && x.t) m.t = x.t;
    if (x.seen > m.seen) { m.url = x.url; m.site = x.site; m.seen = x.seen; } m.free ||= x.free; m.soldout ||= x.soldout; }
  // aynı ildeki aynı etkinliğin kısa/uzun adı ("Ankara Caz Festivali" ↔ "30. Uluslararası Ankara Caz Festivali"): uzun ad kalır, tarihler birleşir
  const V = [...byId.values()].map(fixItem).filter(Boolean), nf = (t) => fold(t).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  V.sort((a, b) => b.title.length - a.title.length);
  const keep = [];
  for (const x of V) { const k = nf(x.title), m = keep.find((y) => y.city === x.city && k.length >= 10 && nf(y.title).includes(k));
    if (!m) { keep.push(x); continue; } m.days = [...new Set([...(m.days || []), ...(x.days || [])])].sort(); if ((x.until || "") > (m.until || "")) m.until = x.until; if (!m.img && x.img) { m.img = x.img; m.imgBy = x.imgBy || x.site; } if (!m.venue && x.venue) m.venue = x.venue; }
  const out = keep.filter((x) => (x.until || x.days.at(-1) || "") >= today).map((x) => ({ ...x, days: x.days.filter((d) => d >= today) }));
  await writeJSON(OUT, { updated: now, notes, items: out }, true);
  const per = {}; for (const x of out) per[x.city] = (per[x.city] || 0) + 1;
  log(`Haber keşfi: ${read} haber okundu, ${out.length} etkinlik (${Object.entries(per).map(([k, v]) => k + " " + v).join(", ")})`);
}

/* Listelere girecek hali: her tarih bir kayıt; "…'a kadar" süren etkinlik bugünden (ya da başlangıcından) itibaren her gün değil,
   tek kayıt olarak bugünün tarihinde durur ve `until` taşır (site "30 Kasım'a kadar" yazar); iş günde iki kez çalıştığı için tarih kendiliğinden ilerler. */
export function haberEvents(items, city, today = todayIST()) {
  const L = [];
  for (const x of items || []) {
    if (x.city !== city) continue;
    const base = { t: x.t || "", title: x.title, venue: x.venue || "", cat: x.cat, catLocked: true, src: "haber", news: { site: x.site, url: x.url },
      ...(x.soldout ? { status: "tukendi" } : {}), ...(x.free ? { free: true } : {}), genre: x.free ? "Ücretsiz" : "",
      tickets: [{ site: `${x.site} haberi`, url: x.url, src: "haber", seen: x.seen }], ...(x.img ? { img: x.img, imgBy: x.imgBy || x.site } : {}), firstSeen: x.seen, lastSeen: x.seen };
    const days = (x.days || []).filter((d) => d >= today);
    if (days.length) for (const d of days) L.push({ ...base, d, ...(x.until ? { until: x.until } : {}) });
    else if (x.until && x.until >= today) L.push({ ...base, d: x.from && x.from > today ? x.from : today, until: x.until });
  }
  return L;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
