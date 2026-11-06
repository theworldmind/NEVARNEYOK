// Kaynak keşfi: bir sayfanın yapısını yalnızca iş akışı günlüğüne yazar (hiçbir şey depoya kaydedilmez).
// Aynı açık kimlik ve robots.txt kuralıyla çalışır. Kullanım: node probe.mjs <adres> [<adres> ...]
import { renderPage, closeBrowser, robotsAllows } from "./lib/net.mjs";

const DATE = /(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık))/i;

function shape(path) { return path.split("/").map(s => /^\d+$/.test(s) ? "{n}" : /\d/.test(s) && s.length > 12 ? "{slug-n}" : s.length > 25 ? "{slug}" : s).slice(0, 5).join("/"); }

for (const arg of process.argv.slice(2)) {
  // adres#yakın=METİN → sayfa yapısını görmek için o metnin çevresindeki işaretlemeyi de yaz
  const [url, near] = arg.split("#yakin=");
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
  console.log("JSON yanıtları:", r.jsons.length);
  for (const j of r.jsons.slice(0, 12)) {
    if (/twitter|youtube|google|eskimi|facebook/.test(j.url)) continue;
    console.log("  ", j.url.slice(0, 200), Array.isArray(j.data) ? `[dizi ${j.data.length}]` : Object.keys(j.data || {}).slice(0, 8).join(","));
    const first = (o, d = 0) => Array.isArray(o) ? o[0] : (o && typeof o === "object" && d < 3) ? first(Object.values(o).find(v => Array.isArray(v) && v.length) ?? Object.values(o).find(v => v && typeof v === "object"), d + 1) : o;
    const f = first(j.data);
    if (f && typeof f === "object") console.log("      örnek kayıt:", JSON.stringify(f, (k, v) => typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "…" : v).slice(0, 900));
  }
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ");
  console.log("h1:", (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120));
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && (DATE.test(l) || /\b\d{1,2}[:.]\d{2}\b/.test(l)) && l.length < 200).slice(0, 12);
  for (const l of lines) console.log("   ·", l.slice(0, 150));
  if (near) {
    const key = decodeURIComponent(near).replace(/_/g, " ");
    let at = html.indexOf(key), shown = 0;
    while (at >= 0 && shown < 2) { console.log(`--- "${key}" çevresi ---\n` + html.slice(Math.max(0, at - 900), at + 900).replace(/\s+/g, " ")); shown++; at = html.indexOf(key, at + 2000); }
    if (!shown) console.log(`--- "${key}" bulunamadı`);
  }
  const iframes = [...html.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map(m => m[1]).slice(0, 5);
  if (iframes.length) console.log("iframe:", iframes.join("  "));
  const dates = (html.replace(/<[^>]+>/g, " ").match(new RegExp(DATE.source, "gi")) || []).length;
  console.log("sayfadaki tarih ifadesi sayısı:", dates, "html boyu:", html.length);
}
await closeBrowser();
