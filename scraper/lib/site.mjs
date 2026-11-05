// Sitenin kendi sayfaları (Google sayfaları ve Instagram görselleri) için ortak bilgiler
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, todayIST } from "./util.mjs";

export const CATS = { konser: "Konser", tiyatro: "Tiyatro", standup: "Stand-up · Komedi", sahne: "Opera · Bale · Dans", cocuk: "Çocuk · Aile", festival: "Festival", parti: "Parti · Gece", atolye: "Atölye · Quiz · Söyleşi", sinema: "Film Gösterimi" };
export const CAT_COLOR = { konser: "#e8344e", tiyatro: "#b8860b", standup: "#e8670c", sahne: "#b03cc0", cocuk: "#1f9d55", festival: "#6a9a12", parti: "#6a46e6", atolye: "#0891b2", sinema: "#3462e0" };
export const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export const BIG = /Congresium|MEB Şura|Ziraat Bankası Ana Salon|Jolly Joker Ankara|Spor Salonu|Arena|Tepe Prime|Milyon|Opera Sahnesi/;

export const pdate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
export const dayName = (s) => GUN[pdate(s).getUTCDay()];
export const dayShort = (s) => ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][pdate(s).getUTCDay()];
export const fmtDate = (s) => { const d = pdate(s); return `${d.getUTCDate()} ${AY[d.getUTCMonth()]}`; };
export const fmtTL = (n) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
export const minPrice = (e) => { const p = (e.tickets || []).filter((t) => t.price && !t.est).map((t) => t.price); return p.length ? Math.min(...p) : null; };
export const addDaysISO = (s, n) => { const d = pdate(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Site adresi: CNAME dosyası > SITE_URL ortam değişkeni > boş (göreli bağlantılar)
export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  try { const c = (await readFile(join(ROOT, "CNAME"), "utf8")).trim(); if (c) return "https://" + c; } catch {}
  return "";
}
export async function siteConfig() {
  const html = await readFile(join(ROOT, "index.html"), "utf8");
  const m = html.match(/window\.NVNY_SITE=(\{[^;]*\});/);
  try { return Function(`return ${m[1]}`)(); } catch { return {}; }
}

// Öne çıkarma puanı: Instagram ve "bu hafta sonu" sayfaları için
export function score(e, all) {
  if (e.status === "tukendi" || e.status === "ertelendi" || e.status === "iptal") return -1;
  let s = 0;
  const priced = (e.tickets || []).filter((t) => t.price && !t.est).length;
  if (priced >= 2) s += 3;
  if (BIG.test(e.venue)) s += 3;
  if (e.desc && e.desc.length > 60) s += 1;
  if (e.t) s += 1;
  if (e.venue && e.venue !== "Çeşitli mekânlar") s += 1;
  const same = all.filter((x) => x.title === e.title).length;
  if (same >= 3) s += 1;
  if (/quiz|trivia|karaoke/i.test(e.title)) s -= 2;
  return s;
}
export function pickTop(list, n, all) {
  const scored = list.map((e) => [score(e, all), e]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0] || (a[1].d + (a[1].t || "")).localeCompare(b[1].d + (b[1].t || "")));
  const out = [], seenT = new Set(), catN = {};
  for (const [, e] of scored) {
    if (seenT.has(e.title)) continue;
    if ((catN[e.cat] || 0) >= 2 && scored.length > n * 2) continue; // çeşitlilik
    out.push(e); seenT.add(e.title); catN[e.cat] = (catN[e.cat] || 0) + 1;
    if (out.length >= n) break;
  }
  return out.sort((a, b) => (a.d + (a.t || "99")).localeCompare(b.d + (b.t || "99")));
}
export function weekendRange(today = todayIST()) {
  const dow = pdate(today).getUTCDay(); // 0 Pazar
  const toFri = (5 - dow + 7) % 7;
  const fri = dow === 6 ? addDaysISO(today, -1) : dow === 0 ? addDaysISO(today, -2) : addDaysISO(today, toFri);
  return { from: dow === 6 || dow === 0 ? today : fri, to: addDaysISO(fri, 2) };
}
