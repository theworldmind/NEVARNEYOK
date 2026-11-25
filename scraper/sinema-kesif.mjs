// Sinema zincirlerinin kendi sitelerinde halk günü / indirim / bilet fiyatı nerede yazıyor? Yalnızca günlüğe yazar (keşif).
// robots.txt'e uyulur (fetchText), bot koruması aşılmaz; 403/boş sayfa olduğu gibi raporlanır.
import { getPage } from "./lib/net.mjs";

const SITES = (process.env.URLS || "").split(/\s+/).filter(Boolean).length ? process.env.URLS.split(/\s+/).filter(Boolean) : [
  "https://www.paribucineverse.com/", "https://www.paribucineverse.com/kampanyalar",
  "https://www.avsarsinemalari.com/", "https://www.avsarsinemalari.com/kampanyalar",
  "https://www.cinemapink.com.tr/", "https://www.cinemapink.com.tr/kampanyalar",
  "https://www.cinetime.com.tr/", "https://www.cinetime.com.tr/kampanyalar",
  "https://www.prestigesinemalari.com/", "https://www.cinegold.com.tr/", "https://www.buyulufener.com.tr/",
  "https://www.sitesinemalari.com/", "https://www.worldcinezone.com/", "https://www.cinemarine.com.tr/",
  "https://biletinial.com/tr-tr/sinema", "https://www.sinemalar.com/sinemalar/ankara",
  "https://www.ktb.gov.tr/", "https://www.sisay.org.tr/",
];
const KW = /halk\s*g[üu]n|indirim|kampanya|[öo][ğg]renci|tam bilet|bilet fiyat|tarife|[₺]|\bTL\b|pazartesi|[çc]ar[şs]amba/i;
const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

for (const u of SITES) {
  const r = await getPage(u, { render: !!process.env.RENDER, scrolls: 2, waitMs: 2500 }).catch((e) => ({ status: 0, error: e.message, html: "" }));
  const h = r.html || r.text || "";
  console.log(`\n=== ${u} → ${r.status} ${r.error || ""} ${h.length} bayt ${r.url && r.url !== u ? "→ " + r.url : ""}`);
  if (!h) continue;
  const t = txt(h), seen = new Set(); let n = 0;
  for (const m of t.matchAll(new RegExp(KW.source, "gi"))) {
    const s = t.slice(Math.max(0, m.index - 110), m.index + 160).trim(); const k = s.slice(60, 140);
    if (seen.has(k)) continue; seen.add(k); console.log("  ·", s); if (++n >= 14) break;
  }
  const links = [...new Set([...h.matchAll(/href="([^"#]+)"/g)].map((x) => x[1]).filter((x) => /kampanya|halk|indirim|fiyat|tarife|bilet-fiyat|firsat|avantaj/i.test(x)))].slice(0, 20);
  if (links.length) console.log("  BAĞLANTI:", links.join("  "));
  for (const j of (r.jsons || []).filter((j) => /kampanya|campaign|price|fiyat|halk|tarife/i.test(j.url)).slice(0, 8)) console.log("  JSON:", j.url.slice(0, 200), String(j.body || "").slice(0, 300));
}
