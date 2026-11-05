// Ortak yardımcılar: Türkçe metin, tarih, fiyat, dosya
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = process.env.ROOT_OVERRIDE || resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const TZ = "Europe/Istanbul";

// Sitedeki app.js ile birebir aynı: bağlantı adresleri (#e/...) ikisinde de aynı çıkmalı
export const fold = (s) =>
  (s || "")
    .toLocaleLowerCase("tr")
    .replace(/[ıi̇]/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a")
    .replace(/[^a-z0-9 ]+/g, " ");
export const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
export const slugify = (s) => fold(s).trim().replace(/\s+/g, "-").slice(0, 60) || "x";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

export async function readJSON(p, fallback = null) {
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return fallback; }
}
export async function writeJSON(p, data, pretty = false) {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, pretty ? 1 : 0) + "\n", "utf8");
}
export async function writeText(p, text) {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, text, "utf8");
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// HTML varlıklarını çöz ve etiketleri at
export function decodeEntities(s) {
  return String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&([a-z]+);/gi, (m, n) => ({ ccedil: "ç", Ccedil: "Ç", ouml: "ö", Ouml: "Ö", uuml: "ü", Uuml: "Ü", rsquo: "’", lsquo: "‘", ndash: "–", mdash: "—", hellip: "…" })[n] || m);
}
export const stripTags = (html) =>
  decodeEntities(String(html ?? "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t\r\f\v]+/g, " ").replace(/\n\s*/g, "\n").trim();
export const clean = (s) => decodeEntities(String(s ?? "")).replace(/\s+/g, " ").trim();

/* ---------- Tarih ---------- */
const AYLAR = { ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
  oca: 1, sub: 2, mar: 3, nis: 4, may: 5, haz: 6, tem: 7, agu: 8, eyl: 9, eki: 10, kas: 11, ara: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const pad = (n) => String(n).padStart(2, "0");

// Bir anı İstanbul saatine göre {d:"YYYY-MM-DD", t:"HH:MM"} yapar
export function istanbulParts(date) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { d: `${p.year}-${p.month}-${p.day}`, t: `${p.hour}:${p.minute}` };
}
export const todayIST = () => istanbulParts(new Date()).d;

// "2026-11-07T20:00:00+03:00", "2026-11-07 20:00", "2026-11-07" → {d,t}
export function parseISOish(s) {
  if (!s) return null;
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, tz] = m;
  if (h == null) return { d: `${y}-${mo}-${d}`, t: "" };
  if (tz) {
    const dt = new Date(`${y}-${mo}-${d}T${pad(h)}:${mi}:00${tz === "Z" ? "Z" : tz.length === 5 ? tz.slice(0, 3) + ":" + tz.slice(3) : tz}`);
    if (!isNaN(dt)) return istanbulParts(dt);
  }
  const t = `${pad(h)}:${mi}`;
  return { d: `${y}-${mo}-${d}`, t: t === "00:00" ? "" : t };
}

// Türkçe serbest metinden tarih/saat: "7 Kasım 2026 Cumartesi 20:00", "07.11.2026 - 20:30", "7 Kas 20.00"
export function parseTrDate(text, refYear = new Date().getFullYear()) {
  if (!text) return null;
  // fold() ":" ve "." işaretlerini siler; saat için onları koruyan ayrı bir sadeleştirme
  const s = String(text).toLocaleLowerCase("tr").replace(/[ıi̇]/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9:.\/ ]+/g, " ").replace(/\s+/g, " ");
  let m = s.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\b(?:\D{0,12}(\d{1,2})[:.](\d{2}))?/);
  if (m) return mk(+m[3], +m[2], +m[1], m[4], m[5]);
  m = s.match(/\b(\d{1,2}) (ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik|oca|sub|mar|nis|may|haz|tem|agu|eyl|eki|kas|ara)[a-z]*\.?(?: (\d{4}))?(?:[^0-9]{0,24}(\d{1,2})[:.](\d{2}))?/);
  if (m) {
    let y = m[3] ? +m[3] : refYear;
    const mo = AYLAR[m[2]];
    // Yıl yazmıyorsa: içinde bulunduğumuz aydan önceki bir ay, gelecek yıla aittir
    if (!m[3]) { const now = new Date(); if (refYear === now.getFullYear() && mo < now.getMonth() + 1) y = refYear + 1; }
    return mk(y, mo, +m[1], m[4], m[5]);
  }
  return null;
  function mk(y, mo, d, h, mi) {
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 2000)) return null;
    const t = h != null && +h < 24 ? `${pad(h)}:${mi}` : "";
    return { d: `${y}-${pad(mo)}-${pad(d)}`, t };
  }
}

/* ---------- Fiyat ---------- */
// "1.250,00 TL", "₺ 1250", "1250.5", 1250 → 1250 (₺); makul olmayan değerler null
export function parsePrice(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v > 0 && v < 200000 ? Math.round(v * 100) / 100 : null;
  let s = String(v).replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}(\D|$)/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(/,/g, "");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return n > 0 && n < 200000 ? Math.round(n * 100) / 100 : null;
}
// Metindeki ₺/TL fiyatlarından en küçüğü
export function minPriceInText(text) {
  const out = [];
  const re = /(?:₺\s*([\d.,]+)|([\d.,]+)\s*(?:₺|TL\b|tl\b))/g;
  let m;
  while ((m = re.exec(text || ""))) { const p = parsePrice(m[1] || m[2]); if (p && p >= 20) out.push(p); }
  return out.length ? Math.min(...out) : null;
}

export function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }
export function absUrl(href, base) { try { return new URL(href, base).href.replace(/#.*$/, ""); } catch { return null; } }

// Basit eşzamanlılık havuzu
export async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}
export function withTimeout(p, ms, label = "işlem") {
  let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${label} ${Math.round(ms / 1000)} sn içinde bitmedi`)), ms); })]).finally(() => clearTimeout(t));
}
