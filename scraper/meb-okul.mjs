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
// 1) il il liste
let seen = 0;
for (let il = 1; il <= 81 && Date.now() < END; il++) {
  const r = await fetchText(`https://www.meb.gov.tr/baglantilar/okullar/index.php?ILKODU=${il}`, { gap: 1500, retries: 2 });
  let n = 0;
  for (const m of (r.text || "").matchAll(/<a href="https?:\/\/([a-z0-9-]+\.meb\.k12\.tr)\/?"[^>]*>\s*([^<]+?)\s*<\/a>/gi)) {
    const host = m[1].toLowerCase(), parts = dec(m[2]).split(" - ");
    if (parts.length < 3) continue;
    const [pil, pilce, ...rest] = parts, ad = rest.join(" - ");
    const x = DB[host] || [ad, pil, pilce, null, null, ""]; x[0] = ad; x[1] = pil; x[2] = pilce; DB[host] = x; n++;
  }
  seen += n; if (!n) console.log("liste boş: il", il, r.status, r.error || "");
}
console.log("listede kurum:", seen, "· toplam kayıt:", Object.keys(DB).length);
// 2) konumu olmayanlar (ya da 90 günden eski denemeler) — kendi harita sayfalarından
const todo = Object.entries(DB).filter(([, x]) => x[3] == null && ago(x[5]) > 20 || x[3] != null && ago(x[5]) > 90).sort((a, b) => (a[1][5] || "").localeCompare(b[1][5] || "")).slice(0, MAX);
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
await Promise.all(Array.from({ length: 4 }, work));
// aynı noktayı gösteren 4+ kurum: varsayılan/il merkezi konumu sayılır, kullanılmaz
const C = {}; for (const x of Object.values(DB)) if (x[3] != null) { const k = x[3].toFixed(4) + "," + x[4].toFixed(4); C[k] = (C[k] || 0) + 1; }
let bad = 0; for (const x of Object.values(DB)) if (x[3] != null && C[x[3].toFixed(4) + "," + x[4].toFixed(4)] >= 4) { x[3] = x[4] = null; bad++; }
await writeFile(`${OUT}/okullar.json`, JSON.stringify(DB));
const tot = Object.values(DB).filter((x) => x[3] != null).length;
console.log(`konum bulundu ${ok}, bulunamadı ${no}, ortak noktalı ${bad}; konumlu kurum ${tot}/${Object.keys(DB).length}`);
