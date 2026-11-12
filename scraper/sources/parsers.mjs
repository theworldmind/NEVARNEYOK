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
  } catch { /* fiyat okunamadı → fiyat gösterilmez */ }
  return [{ title, d: when.d, t: when.t || "", venue, city: "Ankara", url, price, pc: price ? 3 : 0, via: "site",
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
export async function dobCollect({ fetchText }) {
  const out = [];
  for (let page = 1, last = 1; page <= last && page <= 40; page++) {
    const j = await getJSON(fetchText, `https://apimain.operabale.gov.tr/v1/web/temsil/program/listele?sehir=&sahne=&grup=&tur=&page=${page}&limit=20`);
    last = +j.toplamSayfaSayisi || +j.sonSayfaNo || 1;
    for (const x of j.data || []) {
      if (!/ankara/i.test(x.mudurlukAdi || "") || !x.eserAdi || !x.oyunTarihi) continue;
      const times = (x.oyunSaatleri || []).filter(Boolean);
      for (const t of times.length ? times : [hhmm(x.oyunTarihi)]) {
        out.push({ title: x.eserAdi, d: day(x.oyunTarihi), t, venue: x.sahneAdi || "", city: "Ankara",
          url: x.seoUrl ? `https://www.operabale.gov.tr/eser/${x.seoUrl}` : "https://www.operabale.gov.tr/program",
          buyUrl: /^https?:\/\//.test(x.seoFullUrl || "") ? x.seoFullUrl : "", via: "site", pc: 0,
          org: "Ankara Devlet Opera ve Balesi", genre: x.eserGrupAdi || "", catHint: "sahne", image: (x.afisler || [])[0] || "" });
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
const BI_CATS = [["tiyatro", "tiyatro"], ["muzik", "konser"], ["opera-bale", "sahne"], ["etkinlik", ""], ["sinema", "sinema"]];
export async function biletinialCollect({ fetchText, today }) {
  const out = [], detail = new Set(), miss = [], noSeance = [], images = {};
  const end5 = new Date(Date.parse(today + "T00:00:00+03:00") + 5 * 864e5).toISOString().slice(0, 10);
  for (const [org, cat] of BI_CATS) {
    const items = [];
    for (let page = 1; page <= 40; page++) {
      const r = await fetchText(`https://biletinial.com/List/GetMoreItems?region=tr-tr&cityId=3&cityUrl=ankara&order=0&isKids=false&isCampaign=false&isForeign=false&organizerUrl=${org}&page=${page}`, { retries: 1 });
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
      const base = { title, venue: org === "sinema" && multi ? "Ankara sinemaları" : clean(x.saloonName || ""), city: "Ankara", url, via: "site", image,
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
