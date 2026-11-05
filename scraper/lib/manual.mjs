// Elle eklenen etkinlikler: Google Sheets (CSV olarak yayınlanmış) veya data/manual.csv
// Sütunlar: tarih, saat, baslik, mekan, kategori, aciklama, bilet_sitesi, bilet_linki, fiyat, durum, yas, sure, tur, not
// durum: boş | tukendi | ertelendi | iptal | gizle (yanlış toplanan bir etkinliği siteden kaldırır)
import { parsePrice, parseTrDate, fold } from "./util.mjs";

export function parseManualCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";" && !text.slice(0, 200).includes(",")) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  const H = head.map((h) => fold(h).trim().replace(/\s+/g, "_"));
  const col = (r, ...names) => { for (const n of names) { const i = H.indexOf(n); if (i >= 0 && r[i] != null && r[i].trim()) return r[i].trim(); } return ""; };
  return body.map((r) => {
    const tarih = col(r, "tarih", "date");
    const d = /^\d{4}-\d{2}-\d{2}$/.test(tarih) ? tarih : parseTrDate(tarih)?.d || "";
    const cat = fold(col(r, "kategori", "category")).replace(/[^a-z]/g, "");
    const CATMAP = { konser: "konser", tiyatro: "tiyatro", standup: "standup", komedi: "standup", opera: "sahne", bale: "sahne", sahne: "sahne", cocuk: "cocuk", aile: "cocuk", festival: "festival", parti: "parti", atolye: "atolye", quiz: "atolye", soylesi: "atolye", sinema: "sinema", film: "sinema" };
    const durum = fold(col(r, "durum", "status"));
    return {
      d, t: col(r, "saat", "time").replace(".", ":").slice(0, 5), title: col(r, "baslik", "etkinlik", "title"), venue: col(r, "mekan", "venue"),
      cat: CATMAP[cat] || "", desc: col(r, "aciklama", "description"), site: col(r, "bilet_sitesi", "site"),
      url: col(r, "bilet_linki", "bilet_url", "link", "url"), price: parsePrice(col(r, "fiyat", "price")),
      status: /gizle|sil|kaldir/.test(durum) ? "gizle" : /tukendi/.test(durum) ? "tukendi" : /ertelendi/.test(durum) ? "ertelendi" : /iptal/.test(durum) ? "iptal" : "",
      age: col(r, "yas", "yas_siniri", "age"), dur: col(r, "sure", "duration"), genre: col(r, "tur", "genre"), org: col(r, "organizator", "organizasyon"), note: col(r, "not", "note"),
    };
  }).filter((x) => x.d && x.title);
}

