// BİLET BAĞLANTISI DENETİMİ: her satış sitesinden örnek bilet bağlantılarını açar; son adres, sayfa başlığı ve
// sayfada etkinliğin adının geçip geçmediğini yazar (kullanıcı: "fiyata tıklayınca o etkinliğin biletine götürmeli").
// Yalnızca günlüğe yazar. Kendini tanıtan kimlik ve robots.txt kuralıyla. Kullanım: N=3 node linkcheck.mjs
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { ROOT, readJSON, fold } from "./lib/util.mjs";
import { renderPage, closeBrowser } from "./lib/net.mjs";
const N = +process.env.N || 3, by = new Map();
const files = ["data/events.json", ...(await readdir(join(ROOT, "data/c"))).filter((f) => /^[a-z]+\.json$/.test(f)).map((f) => "data/c/" + f)];
for (const f of files) for (const e of (await readJSON(join(ROOT, f), { events: [] })).events || []) for (const t of e.tickets || []) {
  const L = by.get(t.site) || []; if (L.length < N && !L.some((x) => x.url === t.url)) { L.push({ title: e.title, url: t.url, d: e.d }); by.set(t.site, L); } }
const words = (s) => fold(s).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 3);
for (const [site, L] of by) for (const x of L) {
  const r = await renderPage(x.url, { scrolls: 0 }).catch((e) => ({ error: e.message }));
  const html = fold((r.html || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  const W = words(x.title), hit = W.filter((w) => html.includes(w)).length;
  const title = ((r.html || "").match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim().slice(0, 80);
  console.log(`${W.length && hit / W.length >= .6 ? "TAMAM" : "SORUN"} | ${site} | ${x.title.slice(0, 40)} | ${r.status || r.error} | ${x.url}${r.url && r.url !== x.url ? " → " + r.url : ""} | başlık: ${title}`);
}
await closeBrowser();
