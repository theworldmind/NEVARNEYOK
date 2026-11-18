// Yayından önce denetim (18.11.2026): eksik site asla yayına çıkmaz; denetim düşerse sitede son sağlam yayın kalır.
// 17-18.11'de harita dizini eksik yayınlandığı için "Etkinlikler yüklenemedi" görünmüştü. Kullanım: node scraper/site-check.mjs _site
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
const dir = process.argv[2] || "_site", bad = [], J = async (f) => JSON.parse(await readFile(join(dir, f), "utf8"));
const must = async (name, fn) => { try { const m = await fn(); if (m) bad.push(`${name}: ${m}`); } catch (e) { bad.push(`${name}: ${e.message}`); } };
for (const f of ["index.html", "app.js", "takip.js", "sw.js", "manifest.webmanifest", "data/events.json", "data/one-cikan.json"]) await must(f, async () => (await stat(join(dir, f))).size < 200 ? "çok küçük" : "");
await must("data/cities.json", async () => { const n = Object.keys((await J("data/cities.json")).cities || {}).length; return n < 40 ? `yalnızca ${n} il` : ""; });
await must("idx/harita.json", async () => { const j = await J("idx/harita.json"), n = j.e?.length || 0; return n < 3000 ? `yalnızca ${n} satır` : ""; });
for (const d of ["e", "d"]) await must(d + "/", async () => { const n = (await readdir(join(dir, d))).length; return n < 500 ? `yalnızca ${n} sayfa` : ""; });
if (bad.length) { console.error("Yayın durduruldu, sitede son sağlam yayın kalıyor:\n- " + bad.join("\n- ")); process.exit(1); }
console.log("Site denetimi tamam");
