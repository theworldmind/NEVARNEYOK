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
