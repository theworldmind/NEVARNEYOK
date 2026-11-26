// Sinema indirimleri ve bilet fiyatları (26.11.2026, kullanıcı: "sinemalarda biletleri, fiyatları; halk günleri, indirimler; o günlerde bildir").
// Yalnızca zincirin / satış sitesinin KENDİ sayfasında açıkça yazan olgular alınır: hangi gün, kampanyanın adı, sayfada yazan fiyat, bitiş günü.
// Uydurma yok: sayfa okunamazsa ya da kalıp tutmazsa o zincir için hiçbir şey yazılmaz (eski kayıt 7 gün sonra düşer).
// robots.txt'e uyulur (fetchText); bot koruması aşılmaz. Çıktı: data/sinema-indirim.json
import fs from "node:fs";
import { getPage, closeBrowser } from "./lib/net.mjs";

const OUT = new URL("../data/sinema-indirim.json", import.meta.url);
const NOW = new Date(), ISO = NOW.toISOString();
const AY = { ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12 };
const GUN = { pazartesi: 1, salı: 2, sali: 2, çarşamba: 3, carsamba: 3, perşembe: 4, persembe: 4, cuma: 5, cumartesi: 6, pazar: 0 };
const DRE = "Pazartesi|Salı|Çarşamba|Perşembe|Cumartesi|Cuma|Pazar";

// Zincirler: ad, salon adını tanıyan kalıp (sinemalar.com salon adları), kampanya sayfası.
export const ZINCIR = [
  { id: "cineverse", ad: "Paribu Cineverse", re: "paribu|cineverse|cinemaximum|\\bcgv\\b", url: "https://www.paribucineverse.com/kampanyalar",
    ek: ["https://www.paribucineverse.com/kampanyalar/her-pazartesi-ve-carsamba-halk-gunu", "https://www.paribucineverse.com/kampanyalar/her-carsamba-sinema-gunu"] },
  { id: "cinetime", ad: "Cinetime", re: "cinetime", url: "https://www.cinetime.com.tr/kampanyalar" },
];

const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, " ");
const lower = (s) => s.toLocaleLowerCase("tr");

// "31 Aralık 2026" / "31 Aralık" → "2026-12-31" (yıl yoksa bu yıl; geçtiyse gelecek yıl)
function endDate(s) {
  const m = s.match(new RegExp(`(?:Son G[üu]n|Biti?ş|Btiş|Bitiş|-|–)\\s*:?\\s*(\\d{1,2})[. ]+(${Object.keys(AY).join("|")})(?:[. ]+(\\d{4}))?`, "i"));
  if (!m) return null;
  const mo = AY[lower(m[2])], dd = +m[1]; let y = m[3] ? +m[3] : NOW.getFullYear();
  if (!m[3] && new Date(y, mo - 1, dd) < new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())) y++;
  return `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// Sayfa yazısından haftalık indirim günlerini çıkar
export function parseDays(t) {
  const out = [];
  const re = new RegExp(`(?:Her\\s+)?((?:${DRE})(?:\\s*(?:ve|,|&)\\s*(?:${DRE}))*)\\s+(?:g[üu]nleri?\\s+)?([^!.?]{0,70}?)(Halk G[üu]n[üu]|Sinema G[üu]n[üu]|indirimli)`, "gi");
  for (const m of t.matchAll(re)) {
    const days = [...new Set(m[1].split(/\s*(?:ve|,|&)\s*/).map((x) => GUN[lower(x.trim())]).filter((x) => x != null))];
    if (!days.length) continue;
    const kind = lower(m[3]).startsWith("halk") ? "Halk Günü" : lower(m[3]).startsWith("sinema") ? "Sinema Günü" : "İndirimli bilet";
    const after = t.slice(m.index, m.index + 420), before = t.slice(Math.max(0, m.index - 220), m.index);
    // kampanyanın kendi bölümü: bir sonraki sayfa (¶), "Detaylı Bilgi" ya da başka günün başlığına kadar
    let win = t.slice(m.index, m.index + 700).split(/ ¶ |Detaylı Bilgi/)[0]; const nx = [...win.matchAll(new RegExp(`Her\\s+(${DRE})`, "gi"))].find((x) => x.index > 5 && lower(x[1]) !== lower(m[1].split(/\s/)[0])); if (nx) win = win.slice(0, nx.index);
    // fiyat yalnızca kampanyanın kendi cümlesinde açıkça yazıyorsa ("2D 160 TL ve 3D formatlar 170 TL")
    const sent = win.split(/Kampanya Detayları|Son G[üu]n|Kampanya Ba/i)[0];
    const fiyat = {};
    for (const p of sent.matchAll(/\b(2D|3D|IMAX|4DX|ScreenX)\b[^0-9₺]{0,14}(?:₺\s*)?(\d{2,4})(?:[.,]\d{2})?\s*(?:TL|₺)/gi)) fiyat[p[1].toUpperCase()] = +p[2];
    const bitis = endDate(after.split(/ ¶ /)[0]) || endDate(before.split(/Detaylı Bilgi| ¶ /).pop() || "");
    const tatil = /resm[iî] tatil[^.]{0,60}(hari[çc]|ge[çc]erli de[ğg]il)/i.test(win);
    const k = kind + days.join(","), prev = out.find((x) => x.ad + x.gun.join(",") === k);
    if (prev) { if (Object.keys(fiyat).length) prev.fiyat = { ...fiyat, ...(prev.fiyat || {}) }; if (tatil) prev.tatil = true; if (!prev.bitis && bitis) prev.bitis = bitis; continue; }
    out.push({ ad: kind, gun: days, ...(Object.keys(fiyat).length ? { fiyat } : {}), ...(bitis ? { bitis } : {}), ...(tatil ? { tatil } : {}) });
  }
  return out;
}
// Günsüz bilet kampanyaları (2. bilet hediye, 1 alana 1) — yalnızca adı, bağlantı kampanya sayfası
export function parseOther(t) {
  const out = [], STRIP = /^.*?(?:Detaylı Bilgi|Kampanya Detayları|Hemen Bilet Al|İncele|Son G[üu]n \d{1,2} \S+(?: \d{4})?|Kampanya Bi?t?iş \d{1,2} \S+(?: \S+)?)\s+/i;
  for (const m of t.matchAll(/([A-ZÇĞİÖŞÜ0-9][^.!?¶]{0,130}?(?:2\.\s*Bilet(?:in)?\s+Hediye|1\s+(?:Sinema\s+)?Bileti?\s+Alana\s+1(?:\s+Sinema)?\s+Bileti?\s+Hediye)!?)/g)) {
    let s = m[1], p; do { p = s; s = s.replace(STRIP, ""); } while (s !== p);
    s = s.replace(/\s+/g, " ").trim(); if (s.length >= 12 && s.length <= 130) out.push(s);
  }
  return [...new Set(out)].filter((x, _, A) => !A.some((y) => y !== x && x.includes(y))).slice(0, 4);
}

async function readPage(u) {
  let r = await getPage(u).catch(() => null);
  let t = r?.html ? txt(r.html) : "";
  if (!/halk g[üu]n|sinema g[üu]n|indirim/i.test(t) && !process.env.NO_BROWSER) { r = await getPage(u, { render: true, scrolls: 2, waitMs: 2500 }).catch(() => null); t = r?.html ? txt(r.html) : ""; }
  return { status: r?.status || 0, t };
}

const old = (() => { try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return {}; } })();
const res = { updated: ISO, kaynak: "Zincirlerin kendi kampanya sayfaları", zincir: [], notlar: [] };
for (const z of ZINCIR) {
  const pages = [await readPage(z.url)]; for (const u of z.ek || []) pages.push(await readPage(u));
  const status = pages[0].status, t = pages.map((p) => p.t).join(" ¶ ");
  const kamp = t ? parseDays(t).filter((k) => !k.bitis || k.bitis >= ISO.slice(0, 10)) : [];
  const diger = t ? parseOther(t) : [];
  if (kamp.length || diger.length) { res.zincir.push({ id: z.id, ad: z.ad, re: z.re, url: z.url, dogrulandi: ISO, kampanya: kamp, diger }); console.log(`${z.ad}: ${kamp.map((k) => `${k.ad} [${k.gun}] ${JSON.stringify(k.fiyat || {})} ${k.bitis || ""}`).join(" · ")} ${diger.length ? "· " + diger.join(" | ") : ""}`); continue; }
  // okunamadıysa son doğrulanmış kayıt 7 gün kalır, fiyatı uygulama 36 saat kuralıyla zaten göstermez
  const prev = (old.zincir || []).find((x) => x.id === z.id);
  if (prev && NOW - Date.parse(prev.dogrulandi) < 7 * 864e5) res.zincir.push(prev);
  res.notlar.push(`${z.ad}: kampanya okunamadı (durum ${status})`); console.log(`${z.ad}: okunamadı (${status})`);
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(`→ data/sinema-indirim.json: ${res.zincir.length} zincir`);
await closeBrowser(); process.exit(0); // açık tarayıcı süreci bekletmesin
