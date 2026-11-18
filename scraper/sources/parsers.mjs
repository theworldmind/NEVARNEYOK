// Siteye özel detay sayfası okuyucuları.
// Genel yöntemler (JSON-LD, metin) bu sitelerde yanlış/eksik sonuç verdiği için sayfanın kendi yapısından okunur.
// Her biri [] (etkinlik yok), dizi (bulunanlar) ya da null (tanımadım → genel yönteme bırak) döner.
import { clean, stripTags, parseTrDate } from "../lib/util.mjs";

const txt = (h) => clean(stripTags(h || ""));

// Sanatçepte (Kültür ve Turizm Bakanlığı: DT, DOB, CSO Ada...)
//  <h1 itemprop="name">…</h1> <span class="eventAddress">Ankara - Küçük Tiyatro</span>
//  <div class="location">Küçük Tiyatro</div><div class="date-container"><button class="seanceSelect">06 Kasım 2026 Cuma <span>20:00</span></button>…
//  "02:35:00 dakika" süredir, seans saati değildir.
export function sanatcepte(html, url) {
  const title = txt((html.match(/<h1[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  if (!title) return null;
  const addr = txt((html.match(/class="eventAddress"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]);
  const city = (addr.split(/\s+-\s+/)[0] || "").trim();
  const dm = html.match(/(\d{1,2}):(\d{2}):\d{2}\s*dakika/i);
  const dur = dm && (+dm[1] || +dm[2]) ? [+dm[1] ? `${+dm[1]} sa` : "", +dm[2] ? `${+dm[2]} dk` : ""].filter(Boolean).join(" ") : "";
  const desc = txt((html.match(/data-content="commentAciklama"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]).slice(0, 400);
  const out = [];
  const re = /class="location"[^>]*>([\s\S]*?)<\/div>\s*<div class="date-container">([\s\S]*?)<\/div>/gi;
  for (const blk of html.matchAll(re)) {
    const venue = txt(blk[1]);
    for (const b of blk[2].matchAll(/<button[^>]*seanceSelect[^>]*>([\s\S]*?)<\/button>/gi)) {
      const when = parseTrDate(txt(b[1]));
      if (!when?.d) continue;
      out.push({ title, d: when.d, t: when.t || "", venue, city, desc, dur, url, via: "site", pc: 0,
        status: /disabled|tukendi|soldout/i.test(b[0].slice(0, 300)) ? "tukendi" : "" });
    }
  }
  return out;
}

// Bilkent Senfoni bilet sitesi: <h1>Başlık</h1><div class="time">07 November 2026, 20:00</div><div class="place">…
// Fiyatlar sayfadaki priceGroups dizisinde; boş koltuğu kalmayan fiyat grubu en düşük fiyat sayılmaz.
export function bilkent(html, url) {
  const title = txt((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  const when = parseTrDate(txt((html.match(/class="time"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]));
  if (!title || !when?.d) return null;
  const venueRaw = txt((html.match(/class="place"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]);
  const venue = /bilkent (concert hall|konser salonu)/i.test(venueRaw) || !venueRaw ? "Bilkent Konser Salonu" : venueRaw;
  let price = null, soldOut = false;
  try {
    const groups = JSON.parse((html.match(/priceGroups:\s*(\[[\s\S]*?\])\s*,\s*\n/) || [])[1] || "[]");
    const seats = JSON.parse((html.match(/seats:\s*(\[[\s\S]*?\])\s*,\s*\n/) || [])[1] || "[]");
    const open = new Set(seats.filter((s) => s.unavailable === "N" && s.hidden !== "Y" && s.closed !== "Y").map((s) => String(s.price_group_id)));
    const prices = groups.filter((g) => !seats.length || open.has(String(g.id))).map((g) => parseFloat(String(g.price).replace(",", "."))).filter((p) => p > 0);
    if (prices.length) price = Math.min(...prices);
    else if (seats.length && groups.length) soldOut = true;
    const free = {}; for (const st of seats) if (st.unavailable === "N" && st.hidden !== "Y" && st.closed !== "Y") free[st.price_group_id] = (free[st.price_group_id] || 0) + 1;
    var cats = groups.map((g) => [String(g.name || "").replace(/^Category\s*/i, "Kategori ").trim(), parseFloat(String(g.price).replace(",", ".")), seats.length ? (free[g.id] ? 1 : 0) : 1, seats.length ? free[g.id] || 0 : undefined]).filter((c) => c[0] && c[1] > 0).sort((a, b) => a[1] - b[1]);
  } catch { /* fiyat okunamadı → fiyat gösterilmez */ }
  return [{ title, d: when.d, t: when.t || "", venue, city: "Ankara", url, price, pc: price ? 3 : 0, via: "site", ...(typeof cats !== "undefined" && cats.length > 1 ? { cats } : {}),
    status: soldOut ? "tukendi" : "", catHint: "konser" }];
}

// Etimesgut Belediyesi: <span class="thumb-info-inner"> Tiyatrolar</span> | <span class="thumb-info-type"> 09 Kasım 2026 20:00 - 23:00</span> <h2>BAŞLIK</h2>
const ETI_CAT = { tiyatro: "tiyatro", konser: "konser", cocuk: "cocuk", sinema: "sinema", film: "sinema", atolye: "atolye", soylesi: "atolye", sergi: "sahne", festival: "festival" };
export function etimesgut(html, url) {
  const when = parseTrDate(txt((html.match(/class="thumb-info-type"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]));
  const title = txt((html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1]) || txt((html.match(/<title>([^|<]*)/i) || [])[1]);
  if (!when?.d || !title) return null;
  const kind = txt((html.match(/class="thumb-info-inner"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]).toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ğ/g, "g");
  const catHint = Object.entries(ETI_CAT).find(([k]) => kind.includes(k))?.[1] || "";
  return [{ title, d: when.d, t: when.t || "", venue: "", city: "Ankara", url, via: "site", pc: 0, catHint }];
}

/* ---------- Kurumların kendi sitelerinin kullandığı açık veri (anahtar gerekmez) ---------- */
const hhmm = (iso) => (String(iso || "").match(/T(\d{2}:\d{2})/) || [])[1] || "";
const day = (iso) => String(iso || "").slice(0, 10);
const getJSON = async (fetchText, url) => {
  const r = await fetchText(url, { retries: 1 });
  if (r.status !== 200 || !r.text) throw new Error(`${url.replace(/^https?:\/\//, "").slice(0, 60)} → ${r.status || r.error}`);
  return JSON.parse(r.text);
};

// Devlet Opera ve Balesi: operabale.gov.tr/program sayfasının kendi kullandığı program listesi.
// Yalnızca olgular alınır: eser adı, tarih, saat, sahne. Konu metni ve afiş alınmaz.
// Satış bağlantısı (seoFullUrl) "Bilet al" olarak kullanılır.
export async function dobCollect({ fetchText, city }) {
  // Ankara taramasında yalnızca Ankara Müdürlüğü; bütün Türkiye taramasında (CITY=tr) hepsi, il müdürlüğün adından
  const all = city === "tr";
  const out = [];
  for (let page = 1, last = 1; page <= last && page <= 40; page++) {
    const j = await getJSON(fetchText, `https://apimain.operabale.gov.tr/v1/web/temsil/program/listele?sehir=&sahne=&grup=&tur=&page=${page}&limit=20`);
    last = +j.toplamSayfaSayisi || +j.sonSayfaNo || 1;
    for (const x of j.data || []) {
      if ((!all && !/ankara/i.test(x.mudurlukAdi || "")) || !x.eserAdi || !x.oyunTarihi) continue;
      const il = all ? (x.mudurlukAdi || "").replace(/devlet opera ve balesi|müdürlüğü|mudurlugu/gi, "").trim() : "Ankara";
      const times = (x.oyunSaatleri || []).filter(Boolean);
      for (const t of times.length ? times : [hhmm(x.oyunTarihi)]) {
        out.push({ title: x.eserAdi, d: day(x.oyunTarihi), t, venue: x.sahneAdi || "", city: il,
          url: x.seoUrl ? `https://www.operabale.gov.tr/eser/${x.seoUrl}` : "https://www.operabale.gov.tr/program",
          buyUrl: /^https?:\/\//.test(x.seoFullUrl || "") ? x.seoFullUrl : "", via: "site", pc: 0,
          org: `${il} Devlet Opera ve Balesi`, genre: x.eserGrupAdi || "", catHint: "sahne", image: (x.afisler || [])[0] || "" });
      }
    }
  }
  return out;
}

// Mamak Belediyesi: /mamak/etkinlikler sayfasının kullandığı aylık faaliyet listesi (bu ay ve gelecek ay)
const MAMAK_CAT = { konser: "konser", tiyatro: "tiyatro", sinema: "sinema", film: "sinema", çocuk: "cocuk", atölye: "atolye", söyleşi: "atolye", sergi: "sahne", festival: "festival", şenlik: "festival" };
export async function mamakCollect({ getPage }) {
  // Sayfa açılınca tarayıcının kendi yaptığı aylık istek yakalanır (doğrudan istekte sunucu boş liste dönüyor)
  const page = await getPage("https://www.mamak.bel.tr/mamak/etkinlikler", { render: true, scrolls: 1 });
  const out = [];
  for (const j of (page.jsons || []).filter((x) => /getFaaliyet/i.test(x.url))) {
    const r = j.data?.result;
    const rows = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : Object.values(r || {}).flat().filter((x) => x && typeof x === "object");
    for (const x of rows) {
      if (!/etkinlik/i.test(x.hizmetKategorisi || "") || !x.baslamaTarihi) continue;
      const kind = clean(x.hizmetAdi || "");
      // Ad: belediyenin verdiği kısa etkinlik adı; uzun açıklama metni ad olarak kullanılmaz
      const name = clean(x.aciklama || "");
      const title = name && name.length <= 90 ? name : [kind || "Etkinlik", x.mahalleAdi && clean(x.mahalleAdi)].filter(Boolean).join(" · ");
      const catHint = Object.entries(MAMAK_CAT).find(([w]) => kind.toLocaleLowerCase("tr").includes(w))?.[1] || "";
      out.push({ title, d: day(x.baslamaTarihi), t: hhmm(x.baslamaTarihi), venue: clean(x.mekanAdi || "") || "Mamak", city: "Ankara",
        url: "https://www.mamak.bel.tr/mamak/etkinlikler", via: "site", pc: 0, org: "Mamak Belediyesi", catHint });
    }
  }
  return out;
}

/* ---------- Takvim sayfaları: ad, tarih, saat ve yer liste sayfasının kendisinde ---------- */
const abs = (h, base) => { try { return new URL(h.replace(/&amp;/g, "&"), base).href; } catch { return base; } };

// Erimtan Müzesi takvimi: <a href><time datetime="2026-11-05 15:00">…</time><h3>Konferanslar</h3><h2>Ad</h2>
const ERIMTAN_CAT = { konser: "konser", müzik: "konser", konferans: "atolye", atölye: "atolye", tur: "atolye", film: "sinema", sinema: "sinema" };
export function erimtanList(html, url) {
  const out = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?[^"]*"[^>]*>[\s\S]*?<\/time>\s*(?:<h3[^>]*>([\s\S]*?)<\/h3>)?\s*<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const kind = txt(m[4]).toLocaleLowerCase("tr");
    out.push({ title: txt(m[5]), d: m[2], t: m[3] || "", venue: "Erimtan Arkeoloji ve Sanat Müzesi", city: "Ankara", url: abs(m[1], url),
      via: "site", pc: 0, genre: txt(m[4]), catHint: Object.entries(ERIMTAN_CAT).find(([w]) => kind.includes(w))?.[1] || "atolye" });
  }
  return out;
}

// CerModern etkinlikleri: <div class="event-box"><a href> … <span class="category">Tiyatro</span><h3>Ad</h3><span class="date"> 15 Kasım 2026 - 15 Kasım 2026
// Yalnızca tek günlük etkinlikler alınır; birkaç güne yayılan atölye dizilerinin seansları liste sayfasında yazmıyor.
const CER_CAT = { tiyatro: "tiyatro", konser: "konser", film: "sinema", söyleşi: "atolye", atölye: "atolye", "stand-up": "standup" };
export function cermodernList(html, url) {
  const out = [];
  for (const m of html.matchAll(/class="event-box"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>\s*(?:<img[^>]+src="([^"]+)"[^>]*>)?[\s\S]*?class="category"[^>]*>([\s\S]*?)<\/span>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<span class="date"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/gi)) {
    const [a, b] = txt(m[5]).split(/\s+-\s+/);
    const s = parseTrDate(a), e = parseTrDate(b || a);
    if (!s?.d || (e?.d && e.d !== s.d)) continue;
    const kind = txt(m[3]).toLocaleLowerCase("tr");
    out.push({ title: txt(m[4]), d: s.d, image: m[2] ? abs(m[2], url) : "", t: s.t || "", venue: "CerModern", city: "Ankara", url: abs(m[1], url), via: "site", pc: 0,
      genre: txt(m[3]), catHint: Object.entries(CER_CAT).find(([w]) => kind.includes(w))?.[1] || "" });
  }
  return out;
}

// Ankara Büyükşehir etkinlik listesi: <a href="/etkinlik/…" title="Ad" class="event-list-item"> … <span class="category">Konser</span>
//   <i class="fal fa-calendar"></i> <span>10 Mayıs 2026 15:00</span> … <i class="fal fa-location-dot"></i> <span>Mekân, adres</span>
export function abbList(html, url) {
  const out = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]*\/etkinlik\/[^"]+)"[^>]*class="event-list-item[\s\S]*?<\/a>/gi)) {
    const blk = m[0];
    const title = txt((blk.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i) || [])[1]);
    const when = parseTrDate(txt((blk.match(/fa-calendar[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i) || [])[1]));
    if (!title || !when?.d) continue;
    const place = txt((blk.match(/fa-location-dot[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i) || [])[1]);
    const image = (blk.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || "";
    // mekân adı: adresin mahalle/numara kısmından önceki bölüm
    const venue = place.replace(/\s+\S+\s+Mah(\.|allesi)\s[\s\S]*$/i, "").split(",")[0].trim();
    const kind = txt((blk.match(/class="category"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]);
    out.push({ title, d: when.d, t: when.t || "", venue, city: "Ankara", url: abs(m[1], url), via: "site", pc: 0, image: image ? abs(image, url) : "",
      org: "Ankara Büyükşehir Belediyesi", genre: kind, catHint: kind.toLocaleLowerCase("tr").includes("konser") ? "konser" : "" });
  }
  return out;
}

/* ---------- Biletinial: liste sayfasının kendi "daha fazla" isteği ----------
 * biletinial.com/tr-tr/<kategori>/ankara sayfası etkinlikleri /List/GetMoreItems ile sayfa sayfa yükler;
 * her kayıtta ad, salon, salon sayısı, bütün seans tarihleri ve en düşük bilet tutarı var. Görsel alınmaz.
 * Tek salonlu kayıtlar doğrudan seanslara açılır; birden çok salonlu tiyatro ve konserler detay sayfasından okunur.
 * Stand-up ve çocuk oyunları tiyatro listesinin içinde (ayrı kategori adresleri 404/500).
 * Sinema: festival gösterimlerinin her seansı; vizyondaki filmlerin önümüzdeki 5 günde günde bir seansı (en erken). */
const BI_CATS = [["tiyatro", "tiyatro"], ["muzik", "konser"], ["opera-bale", "sahne"], ["stand-up", "standup"], ["cocuk-aktiviteleri", "cocuk"], ["festival", "festival"], ["egitim", "atolye"], ["etkinlik", ""], ["sinema", "sinema"]];
export async function biletinialCollect({ fetchText, getPage, today, src, city }) {
  const out = [], detail = new Set(), miss = [], noSeance = [], images = {};
  // Şehir: Ankara'nın numarası 3; başka il için numarayı sitenin kendi liste isteğinden öğren (sayfayı açınca kendisi çağırır)
  let cu = src?.cityUrl || "ankara"; const cn = src?.cityName || "Ankara"; let cityId = src?.cityId || (cu === "ankara" ? 3 : 0);
  if (!cityId) {
    try { const pg = await getPage(`https://biletinial.com/tr-tr/tiyatro/${cu}`, { render: true });
      for (const j of pg.jsons || []) { const m = String(j.url).match(/GetMoreItems\?[^#]*cityId=(\d+)&cityUrl=([a-z0-9-]+)/); if (m && m[2] === cu) { cityId = +m[1]; break; } }
      /* (18.11.2026) Küçük illerde sayfa bu isteği hiç yapmıyor (bütün liste ilk sayfaya sığıyor): 80 ilin 68'inde numara bulunamıyor, veri yarıya düşüyordu.
         Numara sayfanın il seçim listesinde her zaman var: <option data-name="Samsun" value="samsun" data-id="43">. Sitenin il adresi bizimkinden farklıysa (Afyon gibi) adıyla bulunur. */
      if (!cityId) { const O = [...String(pg.html || "").matchAll(/<option\b[^>]*data-name="([^"]+)"[^>]*value="([a-z0-9-]+)"[^>]*data-id="(\d+)"/g)], fo = (x) => x.toLocaleLowerCase("tr").trim();
        const m = O.find((x) => x[2] === cu) || O.find((x) => fo(x[1]) === fo(cn)); if (m) { cityId = +m[3]; cu = m[2]; } }
    } catch {}
    if (!cityId) return { raws: [], detail: [], images: {}, note: `şehir numarası bulunamadı: ${cu}` };
  }
  const end5 = new Date(Date.parse(today + "T00:00:00+03:00") + 5 * 864e5).toISOString().slice(0, 10);
  for (const [org, cat] of BI_CATS) {
    const items = [];
    for (let page = 1; page <= 40; page++) {
      const r = await fetchText(`https://biletinial.com/List/GetMoreItems?region=tr-tr&cityId=${cityId}&cityUrl=${cu}&order=0&isKids=false&isCampaign=false&isForeign=false&organizerUrl=${org}&page=${page}`, { retries: 1 });
      let j; try { j = JSON.parse(r.text); } catch { if (page === 1) miss.push(`${org}:${r.status || r.error}`); break; }
      items.push(...(j.items || []));
      if (!j.hasMore || !(j.items || []).length) break;
    }
    for (const x of items) {
      if (!x.name || !x.seoUrl) continue;
      const url = `https://biletinial.com/tr-tr/${x.organizerUrl || org}/${x.seoUrl}`;
      const seances = (x.seances || []).filter(Boolean).sort();
      const fest = /^festival\s*[-–:]\s*/i.test(x.name);
      const title = x.name.replace(/^festival\s*[-–:]\s*/i, "");
      const multi = (x.saloonCount || 0) > 1 || x.showOnAllCities;
      const image = x.imageUrl ? (/^https?:/.test(x.imageUrl) ? x.imageUrl : "https://b6s54eznn8xq.merlincdn.net" + x.imageUrl) : "";
      if (image) images[url] = image;
      if (org !== "sinema" && (multi || !seances.length)) { detail.add(url); continue; }
      if (!seances.length) { if (org === "sinema") noSeance.push(`${title}[${x.dateText || "-"}|${x.saloonName || "-"}|${x.saloonCount}]`); continue; }
      const base = { title, venue: org === "sinema" && multi ? `${cn} sinemaları` : clean(x.saloonName || ""), city: x.cityName || cn, url, via: "site", image,
        ...(x.isFree ? { free: true } : x.minTicketAmount > 0 ? { price: Math.round(x.minTicketAmount), pc: 1 } : {}),
        catHint: cat, ...(fest ? { genre: "Film festivali" } : x.categoryName ? { genre: clean(x.categoryName) } : {}) };
      let list = seances.map((s) => ({ d: day(s), t: hhmm(s) }));
      if (org === "sinema" && !fest) {
        const seen = new Set();
        list = list.filter((s) => s.d <= end5 && !seen.has(s.d) && seen.add(s.d));
      }
      for (const s of list) out.push({ ...base, ...s });
    }
  }
  const note = [miss.length && `okunamayan: ${miss.join(", ")}`, noSeance.length && `seansı listede olmayan ${noSeance.length} film: ${noSeance.slice(0, 12).join("; ")}`].filter(Boolean).join(" · ");
  return { raws: out, detail: [...detail], images, note };
}

// Biletix: sitenin kendi arama sayfasının kullandığı açık arama dizini (/solr/tr/select; robots.txt'te kapalı değil).
// Bütün Türkiye'deki etkinlikleri ad, tarih, saat, mekân, il, tür, durum ve afişle tek seferde verir (15.11.2026: 3.466 kayıt).
// Fiyat dizinde yok: yakın tarihli olanların detay sayfası (en çok maxDetail) okunur. Tanıtım metni (description) alınmaz.
const BX_ST = (s) => /sold|tuken/i.test(s) ? "tukendi" : /cancel|iptal/i.test(s) ? "iptal" : /postpon|ertel/i.test(s) ? "ertelendi" : "";
const BX_CAT = (c, sub) => { const x = `${sub || ""} ${c || ""}`.toLowerCase();
  return /comedy|stand/.test(x) ? "standup" : /opera|ballet|bale|dance|dans|classic/.test(x) ? "sahne" : /theat|tiyatro|musical/.test(x) ? "tiyatro" : /festival/.test(x) ? "festival" : /family|child|cocuk/.test(x) ? "cocuk" : /music/.test(x) ? "konser" : /sport/.test(x) ? "spor" : /museum|exhib|sergi/.test(x) ? "sergi" : ""; };
export async function biletixCollect({ fetchText, city, today }) {
  const from = `${today || new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  const out = [], seen = new Set(); let total = 0;
  for (let start = 0; start < 6000; start += 1000) {
    const q = `https://www.biletix.com/solr/tr/select?wt=json&q=*:*&sort=start%20asc&start=${start}&rows=1000&fq=start:%5B${encodeURIComponent(from)}%20TO%20*%5D`;
    const j = await getJSON(fetchText, q); const docs = j?.response?.docs || []; total = j?.response?.numFound || total;
    for (const x of docs) {
      if (!x.id || !x.start || seen.has(x.id)) continue; seen.add(x.id);
      const il = (x.city || [])[0] || x.region || "";
      if (city !== "tr" && city && !new RegExp(city, "i").test(il.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, ""))) continue;
      const loc = new Date(Date.parse(x.start) + 3 * 36e5).toISOString(); // Türkiye saati
      out.push({ title: (x.sname || (x.name || [])[0] || "").trim(), d: loc.slice(0, 10), t: loc.slice(11, 16), venue: (x.svenue || (x.venue || [])[0] || "").trim(), city: il,
        url: `https://www.biletix.com/etkinlik/${x.id}/TURKIYE/tr`, via: "bilet", pc: 0, status: BX_ST(x.status || ""), catHint: BX_CAT(x.category, x.subcategory),
        image: x.image_url ? `https://www.biletix.com/static/images/live/event/eventimages/${x.image_url}` : "" });
    }
    if (!docs.length || start + 1000 >= total) break;
  }
  // fiyat için detay: en yakın tarihliler önce
  const detail = out.filter((e) => !e.status).sort((a, b) => a.d.localeCompare(b.d)).map((e) => e.url);
  return { raws: out.filter((e) => e.title && e.d), detail: [...new Set(detail)], note: `dizinde ${total} kayıt` };
}

// İzmir Büyükşehir Belediyesi Kültürsanat (kultursanat.izmir.bel.tr): belediyenin kendi bilet sitesi; sayfanın kullandığı
// seans listesi (kultursanatapi.izmir.bel.tr/api/session/list) yakalanır. Ad, tarih, saat, mekân, afiş ve (yazıyorsa) fiyat. Tanıtım metni alınmaz.
const izSlug = (t) => String(t || "").toLocaleLowerCase("tr").replace(/ı/g, "").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// İKSV: sitenin kendi takviminin kullandığı etkinlik listesi (sayfa açılınca tarayıcının yaptığı istek yakalanır; plugins.ashx, plugin=events)
const IKSV_CAT = [[/caz|jazz/i, "konser"], [/müzik|muzik|music/i, "konser"], [/film/i, "sinema"], [/tiyatro|theatre/i, "tiyatro"], [/dans|bale/i, "sahne"], [/çocuk|cocuk|atölye|atolye/i, "cocuk"]];
export async function iksvCollect({ getPage }) {
  const out = [], keys = new Set(), seen = new Set();
  for (const u of ["https://www.iksv.org/tr", "https://www.iksv.org/tr/etkinlikler"]) {
    let page; try { page = await getPage(u, { render: true, scrolls: 3 }); } catch { continue; }
    for (const j of (page.jsons || []).filter((x) => /plugins\.ashx/i.test(x.url))) {
      const rows = Array.isArray(j.data?.data) ? j.data.data.flatMap((x) => Array.isArray(x?.events) ? x.events : [x]) : [];
      for (const x of rows) { if (!x?.headline) continue; Object.keys(x).forEach((k) => keys.add(k));
        const ms = +(String(x.dateFormatted || "").match(/\d{10,}/) || [])[0] || (x.date1 ? Date.parse(x.date1 + "+03:00") : 0); if (!ms) continue;
        const iso = new Date(ms + 3 * 36e5).toISOString(), d = iso.slice(0, 10), t = x.time || iso.slice(11, 16);
        const k = (x.articleId || x.headline) + d + t; if (seen.has(k)) continue; seen.add(k);
        const zone = clean(x.zone || ""), f = (x.files || [])[0] || {}, img = f.url || f.path || f.fileUrl || f.src || "";
        const href = x.url || x.link || x.seoUrl || x.friendlyUrl || x.detailUrl || "";
        out.push({ title: clean(x.headline), d, t, venue: clean(x.place || ""), city: "İstanbul",
          url: href ? (/^https?:/.test(href) ? href : "https://www.iksv.org" + (href.startsWith("/") ? "" : "/tr/etkinlikler/") + href) : "https://www.iksv.org/tr", via: "site", pc: 0,
          org: "İKSV" + (zone ? " · " + zone : ""), image: img ? (/^https?:/.test(img) ? img : "https://www.iksv.org" + (img.startsWith("/") ? "" : "/") + img) : "",
          catHint: (IKSV_CAT.find(([r]) => r.test(zone + " " + (x.categoryName || ""))) || [])[1] || "" });
      }
    }
  }
  return { raws: out, note: `alanlar: ${[...keys].slice(0, 40).join(",")}` };
}
export async function izmirKsCollect({ getPage }) {
  const out = [], seen = new Set(), keys = new Set();
  for (const u of ["https://kultursanat.izmir.bel.tr/", "https://kultursanat.izmir.bel.tr/etkinlikler"]) {
    const page = await getPage(u, { render: true, scrolls: 4 });
    const links = new Map(); for (const m of (page.html || "").matchAll(/href="(\/event\/[^"\/]+\/([0-9a-f-]{36}))"/g)) links.set(m[2], "https://kultursanat.izmir.bel.tr" + m[1]);
    for (const j of (page.jsons || []).filter((x) => /session\/list/i.test(x.url))) for (const x of j.data?.data || []) {
      if (!x.eventDate || !x.event?.name) continue; Object.keys(x).forEach((k) => keys.add(k));
      const k = x.event.id + x.eventDate; if (seen.has(k)) continue; seen.add(k);
      const pr = [x.price, x.minPrice, x.ticketPrice, ...(Array.isArray(x.prices) ? x.prices.map((p) => p?.price ?? p) : []), ...(Array.isArray(x.blocks) ? x.blocks.map((b) => b?.price) : [])].map(Number).filter((n) => n > 0);
      out.push({ title: clean(x.event.name), d: day(x.eventDate), t: hhmm(x.eventDate), venue: clean(x.venue?.name || ""), city: "İzmir",
        url: links.get(x.event.id) || `https://kultursanat.izmir.bel.tr/event/${izSlug(x.event.name)}/${x.event.id}`, via: "site", pc: pr.length ? 3 : 0, price: pr.length ? Math.min(...pr) : undefined,
        org: clean(x.company?.name || "İzmir Büyükşehir Belediyesi"), image: x.eventImageUrl || "", status: x.isSoldOut === true ? "tukendi" : "" });
    }
  }
  return { raws: out, note: `seans alanları: ${[...keys].slice(0, 30).join(",")}` };
}

// BUGECE (17.11.2026 keşif): il sayfasının (/tr/browse/<il>/events) kendi kullandığı liste (robots.txt izin veriyor).
// Yalnızca olgular: ad, tarih/saat (UTC → İstanbul), mekân, il, afiş adresi, etkinlik sayfası. Açıklama alınmaz.
const ISTF2 = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const ist = (iso) => { const t = Date.parse(iso || ""); if (!t) return null; const s = ISTF2.format(new Date(t)); return { d: s.slice(0, 10), t: s.slice(11, 16) }; };
export async function bugeceCollect({ fetchText, src }) {
  const slug = src.cityUrl || "ankara", out = [], seen = new Set();
  for (let page = 0; page < 30; page++) {
    let j; try { j = await getJSON(fetchText, `https://bugece.co/api/list?page=${page}&pageSize=60&indices=events&city=${slug}`); } catch { break; }
    const L = Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.hits) ? j.data.hits : Array.isArray(j?.data?.events) ? j.data.events : [];
    if (!L.length) break; let fresh = 0;
    for (const x of L) {
      if (!x?.name || !x.slug || seen.has(x.slug)) continue; seen.add(x.slug); fresh++;
      const w = ist(x.start_time || x.date); if (!w) continue;
      const music = (x.music_categories || []).map((m) => String(m.name || "").split("@@")[0]).filter(Boolean);
      out.push({ title: x.name, d: w.d, t: w.t, venue: x.venue?.name || "", city: x.city?.name || src.cityName || "", url: `https://bugece.co/tr/event/${x.slug}`,
        image: x.image || "", genre: music.slice(0, 2).join(", "), catHint: /techno|house|electronic|dj|bounce|trance|disco/i.test(music.join(" ")) ? "parti" : "konser" });
    }
    if (!fresh) break;
  }
  return out;
}
