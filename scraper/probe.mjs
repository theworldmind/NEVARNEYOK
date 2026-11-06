// Kaynak keşfi: bir sayfanın yapısını yalnızca iş akışı günlüğüne yazar (hiçbir şey depoya kaydedilmez).
// Aynı açık kimlik ve robots.txt kuralıyla çalışır. Kullanım: node probe.mjs <adres> [<adres> ...]
import { renderPage, closeBrowser, robotsAllows } from "./lib/net.mjs";

const DATE = /(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık))/i;

function shape(path) { return path.split("/").map(s => /^\d+$/.test(s) ? "{n}" : /\d/.test(s) && s.length > 12 ? "{slug-n}" : s.length > 25 ? "{slug}" : s).slice(0, 5).join("/"); }

for (const url of process.argv.slice(2)) {
  console.log("\n================", url);
  const rb = await robotsAllows(url);
  console.log("robots:", rb.ok ? "izin var" : "İZİN YOK", "gecikme:", rb.delay);
  if (!rb.ok) continue;
  const r = await renderPage(url, { scrolls: 4 });
  console.log("durum:", r.status, "son adres:", r.url, r.error ? "hata: " + r.error : "");
  if (!r.html) continue;
  const html = r.html;
  console.log("başlık:", (html.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim());
  const host = new URL(r.url).host;
  const groups = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(m[1].replace(/&amp;/g, "&"), r.url); } catch { continue; }
    if (u.host !== host) continue;
    const k = shape(u.pathname);
    const txt = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const g = groups.get(k) || { n: 0, ex: [], dated: 0 };
    g.n++; if (g.ex.length < 3) g.ex.push(u.pathname + u.search); if (DATE.test(txt)) g.dated++;
    groups.set(k, g);
  }
  console.log("iç bağlantı kalıpları (sayı, tarihli metin, örnek):");
  for (const [k, g] of [...groups].sort((a, b) => b[1].n - a[1].n).slice(0, 18)) console.log(`  ${String(g.n).padStart(3)} ${String(g.dated).padStart(3)}  ${k}   ${g.ex.join("  ")}`);
  const ld = [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => { try { const j = JSON.parse(m[1]); return [].concat(j["@graph"] || j).map(x => x["@type"]).join(","); } catch { return "?"; } });
  console.log("JSON-LD türleri:", ld.join(" | ") || "yok");
  console.log("JSON yanıtları:", r.jsons.length); for (const j of r.jsons.slice(0, 12)) console.log("  ", j.url.slice(0, 160), Array.isArray(j.data) ? `[dizi ${j.data.length}]` : Object.keys(j.data || {}).slice(0, 8).join(","));
  const iframes = [...html.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map(m => m[1]).slice(0, 5);
  if (iframes.length) console.log("iframe:", iframes.join("  "));
  const dates = (html.replace(/<[^>]+>/g, " ").match(new RegExp(DATE.source, "gi")) || []).length;
  console.log("sayfadaki tarih ifadesi sayısı:", dates, "html boyu:", html.length);
}
await closeBrowser();
