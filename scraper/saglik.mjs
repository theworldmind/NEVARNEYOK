// SİSTEM SAĞLIĞI (25.11.2026, kullanıcı: "profesyonel, kullanıcı söyleyince öğrenmeyelim"): bütün tarama kayıtlarını tek özette toplar.
// Girdi: data/health.json (Ankara), data/c/_tr-health.json (Türkiye listeleri), data/c/src/<il>-health.json (80 il), data/cities.json, data/festival.json.
// Çıktı: data/saglik.json (Yönetim → "🩺 Sistem sağlığı" okur) ve scraper/out/saglik.md (sorun varsa GitHub'da "Sistem sağlığı" konusuna yazılır).
// Kişisel veri yok; yalnızca kaynak adı, durum, sayı ve zaman.
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rj = async (p, d = null) => { try { return JSON.parse(await readFile(join(ROOT, p), "utf8")); } catch { return d; } };
const now = Date.now(), hAgo = (t) => t ? Math.round((now - Date.parse(t)) / 36e5) : 9999;
const runs = [["ankara", await rj("data/health.json")], ["tr", await rj("data/c/_tr-health.json")]];
for (const f of (await readdir(join(ROOT, "data/c/src")).catch(() => [])).filter((f) => f.endsWith("-health.json"))) runs.push([f.replace("-health.json", ""), await rj(`data/c/src/${f}`)]);
const src = [], sorun = [];
for (const [il, h] of runs) {
  if (!h) { sorun.push({ k: "kayit", il, m: "sağlık kaydı yok" }); continue; }
  const age = hAgo(h.runAt);
  if (age > (il === "ankara" ? 30 : 20)) sorun.push({ k: "eski", il, m: `son tarama ${age} saat önce` });
  for (const x of Object.values(h.sources || {})) {
    src.push({ il, id: x.id, ad: x.name, durum: x.status, n: x.count, onceki: x.prevCount, seri: x.failStreak || 0, sure: x.seconds || 0, hata: (x.error || "").slice(0, 160) });
    // tek seferlik boşluk olağan; üst üste 3 tarama düşen/hatalı kaynak sorundur (Ankara'da 2)
    if (x.status !== "calisiyor" && x.status !== "bos" && (x.failStreak || 0) >= (il === "ankara" ? 2 : 3)) sorun.push({ k: "kaynak", il, id: x.id, m: `${x.name}: ${x.status === "hata" ? "hata" : "düştü"} (${x.failStreak} taramadır${x.error ? " · " + x.error.slice(0, 80) : ""})` });
  }
}
// il başına etkinlik: önceki özetle karşılaştır (yarıdan fazla düşüş sorun)
const prev = await rj("data/saglik.json", {}), cities = (await rj("data/cities.json", {}))?.cities || {}, iller = {};
for (const [id, c] of Object.entries(cities)) { iller[id] = c.n || 0; const p = prev.iller?.[id]; if (p >= 20 && (c.n || 0) < p * 0.5) sorun.push({ k: "dusus", il: id, m: `etkinlik ${p} → ${c.n}` }); }
const fest = ((await rj("data/festival.json", {}))?.festivals || []).length;
const ozet = { at: new Date().toISOString(), kaynak: src.length, calisan: src.filter((x) => x.durum === "calisiyor").length, etkinlik: Object.values(iller).reduce((a, b) => a + b, 0), il: Object.values(iller).filter((n) => n > 0).length, festival: fest };
await writeFile(join(ROOT, "data/saglik.json"), JSON.stringify({ ozet, sorun, kaynaklar: src.sort((a, b) => (a.durum === "calisiyor") - (b.durum === "calisiyor") || b.seri - a.seri), iller }));
await mkdir(join(ROOT, "scraper/out"), { recursive: true });
const md = sorun.length ? `## Sistem sağlığı · ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}\n\n${ozet.calisan}/${ozet.kaynak} kaynak çalışıyor · ${ozet.etkinlik} etkinlik · ${ozet.il}/81 il\n\n${sorun.map((s) => `- **${s.il}** ${s.m}`).join("\n")}\n` : "";
await writeFile(join(ROOT, "scraper/out/saglik.md"), md);
console.log(`Sağlık: ${ozet.calisan}/${ozet.kaynak} kaynak çalışıyor · ${ozet.etkinlik} etkinlik · ${ozet.il} il · ${sorun.length} sorun`);
for (const s of sorun.slice(0, 30)) console.log("  ⚠", s.il, s.m);
