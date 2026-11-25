// MEB'in herkese açık "Okullar ve Diğer Kurumlar" listesi (il il) + her kurumun kendi sitesindeki harita sayfasından konum.
// 25.11.2026 (kullanıcı: "her yolu dene, tüm verileri çekelim"). Yalnızca ad, il, ilçe ve konum tutulur. robots.txt'e uyar, kendini tanıtır.
// Çıktı: $OUT/okullar.json → { "<site>": [ad, il, ilçe, enlem, boylam, denendiği gün] }. Her çalışmada en çok $MAX kurumun konumu sorulur; kalanlar sonraki günlere.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fetchText } from "./lib/net.mjs";
const OUT = process.env.OUT || "/tmp/mo", MAX = +(process.env.MAX || 9000), END = Date.now() + (+(process.env.DK || 70)) * 60e3;
await mkdir(OUT, { recursive: true });
let DB = {}; try { DB = JSON.parse(await readFile(`${OUT}/okullar.json`, "utf8")); } catch {}
const today = new Date().toISOString().slice(0, 10), ago = (d) => (Date.parse(today) - Date.parse(d || "2000-01-01")) / 864e5;
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
// 1) il il liste: sayfanın kendi kullandığı okullar_ajax.php (DataTables, sayfa sayfa)
import { robotsAllows, BOT } from "./lib/net.mjs";
const LU = "https://www.meb.gov.tr/baglantilar/okullar/okullar_ajax.php", UA = `Mozilla/5.0 (compatible; ${BOT}/1.0; +https://nevarneyok.net.tr/#/bilgi/iletisim)`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const page = async (il, start, len) => { for (let k = 0; k < 3; k++) { try { const body = new URLSearchParams({ draw: "1", start: String(start), length: String(len), "search[value]": "", "search[regex]": "false", "order[0][column]": "0", "order[0][dir]": "asc", "columns[0][data]": "OKUL_ADI", il: String(il), ilce: "0" });
  const r = await fetch(LU, { method: "POST", body, headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "x-requested-with": "XMLHttpRequest", referer: `https://www.meb.gov.tr/baglantilar/okullar/index.php?ILKODU=${il}` }, signal: AbortSignal.timeout(30000) });
  if (r.ok) return await r.json(); } catch {} await sleep(4000 * (k + 1)); } return null; };
let seen = 0;
const listeTaze = DB._liste && ago(DB._liste) < 7; if (listeTaze) console.log("liste taze (" + DB._liste + "), yalnızca konumlar");
if (!listeTaze && (await robotsAllows(LU)).ok) for (let il = 1; il <= 81 && Date.now() < END; il++) {
  let start = 0, total = 1, n = 0; const LEN = 250;
  while (start < total && Date.now() < END) { const j = await page(il, start, LEN); await sleep(1500); if (!j) { console.log("liste alınamadı: il", il, "başlangıç", start); break; }
    total = +j.recordsFiltered || +j.recordsTotal || 0; const D = j.data || [];
    for (const x of D) { const host = String(x.HOST || "").toLowerCase().replace(/\.meb\.k12\.tr$/, ""); if (!/^[a-z0-9-]+$/.test(host)) continue; const parts = dec(String(x.OKUL_ADI || "")).split(" - "); if (parts.length < 3) continue;
      const [pil, pilce, ...rest] = parts, h = host + ".meb.k12.tr", y = DB[h] || [rest.join(" - "), pil, pilce, null, null, ""]; y[0] = rest.join(" - "); y[1] = pil; y[2] = pilce; DB[h] = y; n++; }
    if (!D.length) break; start += D.length; }
  seen += n; if (il === 1 || il === 6 || !n) console.log("il", il, "kurum", n, "/", total);
} else console.log("robots.txt liste adresine izin vermiyor");
if (seen > 40000) DB._liste = today;
console.log("listede kurum:", seen, "· toplam kayıt:", Object.keys(DB).length);
// 2) konumu olmayanlar (ya da 90 günden eski denemeler) — kendi harita sayfalarından
const todo = Object.entries(DB).filter(([h]) => h !== "_liste").filter(([, x]) => x[3] == null && ago(x[5]) > 20 || x[3] != null && ago(x[5]) > 90).sort((a, b) => (a[1][5] || "").localeCompare(b[1][5] || "")).slice(0, MAX);
console.log("konumu sorulacak:", todo.length);
let ok = 0, no = 0, i = 0;
const work = async () => {
  while (i < todo.length && Date.now() < END) {
    const [host, x] = todo[i++];
    const r = await fetchText(`https://${host}/tema/harita.php`, { gap: 1000, retries: 1, timeout: 20000 });
    const m = (r.text || "").match(/[?&]q=(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,2}\.\d{3,})/) || (r.text || "").match(/LatLng\(\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,2}\.\d{3,})/);
    const a = m ? +m[1] : null, o = m ? +m[2] : null;
    if (a && a > 35.7 && a < 42.2 && o > 25.6 && o < 44.9) { x[3] = +a.toFixed(6); x[4] = +o.toFixed(6); ok++; } else no++;
    x[5] = today;
  }
};
await Promise.all(Array.from({ length: 6 }, work));
// aynı noktayı gösteren 4+ kurum: varsayılan/il merkezi konumu sayılır, kullanılmaz
const KV = Object.entries(DB).filter(([h]) => h !== "_liste").map(([, x]) => x); const C = {}; for (const x of KV) if (x[3] != null) { const k = x[3].toFixed(4) + "," + x[4].toFixed(4); C[k] = (C[k] || 0) + 1; }
let bad = 0; for (const x of KV) if (x[3] != null && C[x[3].toFixed(4) + "," + x[4].toFixed(4)] >= 4) { x[3] = x[4] = null; bad++; }
await writeFile(`${OUT}/okullar.json`, JSON.stringify(DB));
const tot = KV.filter((x) => x[3] != null).length;
console.log(`konum bulundu ${ok}, bulunamadı ${no}, ortak noktalı ${bad}; konumlu kurum ${tot}/${KV.length}`);
