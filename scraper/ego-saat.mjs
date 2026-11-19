// EGO hareket saatleri (kullanıcı, 19.11.2026: "Ankara'da otobüs ve metroların tahmini geliş saatlerinden yararlan").
// Kaynak: ego.gov.tr/tr/hareketsaatleri (herkese açık sayfa, robots.txt izinli; formun kendi isteği, belirteç yok). Kendini NeVarNeYokBot diye tanıtır, istekler arası 1,5 sn.
// Hat başına: ad, mesafe, uçtan uca süre, ilk duraktan kalkış saatleri (hafta içi / cumartesi / pazar), durak sırası (durak no + ad).
// "Otobüs Nerede?" (canlı) sayfası her açılışta değişen alan adı ve güvenlik belirteci kullanıyor, otomasyona kapalı: kullanılmaz.
// Çıktı: OUT/ego/<hat>.json + OUT/ego/index.json
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchText, robotsAllows } from "./lib/net.mjs";
const B = "https://www.ego.gov.tr", OUT = join(process.env.OUT || "/tmp/ego", "ego"), MAX = +process.env.EGO_MAX || 0;
await mkdir(OUT, { recursive: true });
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr/#/bilgi/iletisim)";
const ent = (s) => String(s || "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const txt = (h) => ent(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const min = (s) => (s.match(/\b([01]?\d|2[0-4])[:.]([0-5]\d)\b/g) || []).map((x) => { const [h, m] = x.split(/[:.]/).map(Number); return h * 60 + m; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await fetchText(B + "/tr/hareketsaatleri");
if (page.status !== 200) { console.log("sayfa açılmadı", page.status); process.exit(1); }
const L = [];
for (const s of page.text.matchAll(/<select[^>]*name="(hat_no\d)"[^>]*id="([^"]+)"[\s\S]*?<\/select>/g)) for (const o of s[0].matchAll(/<option value="([^"]+)"[^>]*>([^<]*)/g)) if (o[1] !== "0") L.push({ f: s[1], v: o[1], kind: /metro/.test(s[2]) ? "metro" : /ankaray/.test(s[2]) ? "hafif" : /teleferik/.test(s[2]) ? "teleferik" : "otobus" });
console.log("hat sayısı", L.length, Object.entries(L.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {})));
if (!(await robotsAllows(B + "/HareketSaatleri")).ok) { console.log("robots izin vermiyor"); process.exit(1); }
const idx = {}; let ok = 0, bos = 0, hata = 0, n = 0;
for (const h of MAX ? [...L.filter((x) => x.kind === "otobus").slice(0, MAX), ...L.filter((x) => x.kind !== "otobus")] : L) {
  n++; let t = "";
  for (let k = 0; k < 3; k++) { try { const r = await fetch(B + "/HareketSaatleri", { method: "POST", headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", "accept-language": "tr-TR" }, body: new URLSearchParams({ [h.f]: h.v }), signal: AbortSignal.timeout(25000) }); if (r.ok) { t = await r.text(); break; } } catch {} await sleep(4000 * (k + 1)); }
  await sleep(1500);
  if (!t) { hata++; continue; }
  const kv = {}; for (const m of t.matchAll(/<tr><td class="key">([^<]+)<\/td><td class="sep">:<\/td><td>([\s\S]*?)<\/td><\/tr>/g)) kv[txt(m[1])] = txt(m[2]);
  const tb = (t.match(/<table class="hs-table">([\s\S]*?)<\/table>/) || [])[1] || "";
  const heads = [...tb.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((m) => txt(m[1]));
  const cols = [...tb.matchAll(/<td class="hs-times">([\s\S]*?)<\/td>/g)].map((m) => min(m[1]));
  const rt = (t.match(/<caption>Geçtiği Güzergahlar<\/caption>([\s\S]*?)<\/table>/) || [])[1] || "";
  const S = [...rt.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => txt(c[1]))).filter((c) => c.length >= 3 && /^\d+$/.test(c[0])).map((c) => [c[1], c[2]]);
  if (n <= 3 || h.kind !== "otobus") console.log("örnek", h.v, JSON.stringify(kv), heads, cols.map((c) => c.length), S.length, (txt(t).match(/İlk[^.]{0,80}|Son[^.]{0,80}/gi) || []).slice(0, 4));
  if (!kv["Hat No"] && !S.length) { bos++; continue; }
  const pick = (re) => { const i = heads.findIndex((x) => re.test(x)); return i >= 0 ? cols[i] || [] : []; };
  const o = { n: kv["Hat Adı"] || "", km: parseFloat((kv["Mesafesi"] || "").replace(",", ".")) || 0, dk: parseInt(kv["Süresi"] || "") || 0, k: h.kind,
    t: [pick(/hafta/i), pick(/cumartesi/i), pick(/pazar/i)], s: S };
  await writeFile(join(OUT, `${h.v.replace(/[^\w-]/g, "_")}.json`), JSON.stringify(o));
  idx[h.v] = [o.n, o.k, o.t.map((x) => x.length), S.length]; ok++;
  if (n % 50 === 0) console.log(n, "/", L.length, "tamam", ok);
}
await writeFile(join(OUT, "index.json"), JSON.stringify({ zaman: new Date().toISOString(), kaynak: "EGO Genel Müdürlüğü · ego.gov.tr hareket saatleri", h: idx }));
console.log("bitti: tamam", ok, "boş", bos, "hata", hata, "saatli", Object.values(idx).filter((x) => x[2][0] + x[2][1] + x[2][2] > 0).length);
if (ok < L.length * 0.5 && !MAX) { console.log("çok az hat alındı, yazılmıyor"); process.exit(1); }
