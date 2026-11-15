// PAYLAŞIM SAYFALARI (kullanıcı isteği, 15.11.2026: "arkadaşınla paylaş; paylaşınca o etkinliğin önizlemesi görünsün").
// 81 ilin her etkinliği için küçük bir sayfa: e/<il>/<ad>/index.html. WhatsApp, Instagram DM, X gibi uygulamalar bağlantının
// önizlemesini bu sayfadaki og etiketlerinden kurar: etkinliğin adı, tarihi, saati, mekânı ve afişi (afiş kaynağındaki adresinden
// gösterilir, kopyalanmaz). Sayfayı açan kişi anında uygulamadaki etkinlik sayfasına geçer. Arama motorlarına kapalıdır (noindex);
// arama için Ankara'nın etkinlik/ sayfaları vardır.
// Ad (slug) uygulamadaki slugOf ile birebir aynı kurulur; aynı gün aynı adlı ikinci etkinliğe "-2" eklenir.
import { readdir, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, readJSON, todayIST, log } from "./lib/util.mjs";

const BASE = "https://nevarneyok.net.tr";
const today = todayIST();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// app.js'deki fold/slugOf'un aynısı
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
const GUNK = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"], AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const dShort = (s) => { const d = new Date(s + "T12:00:00"); return `${GUNK[d.getDay()]} ${d.getDate()} ${AYK[d.getMonth()]}`; };
const CATS = { konser: "Konser", tiyatro: "Tiyatro", standup: "Stand-up", sahne: "Opera · Bale · Dans", cocuk: "Çocuk & Aile", festival: "Festival", parti: "Parti", atolye: "Atölye & Söyleşi", sinema: "Sinema" };

const cities = (await readJSON(join(ROOT, "data/cities.json"), { cities: {} })).cities || {};
const OG = new Set((await readJSON(join(ROOT, "s/_og.json"), [])) || []); // afişi olmayan etkinliğin önizleme kartı (share-img.mjs)
await rm(join(ROOT, "e"), { recursive: true, force: true });
// Yeni tarihlerini takip et (takip.js → NV.akey): 81 ilin dizini idx/a.json — anahtar → [[il, gün, saat, ad, mekân]]
const NVK = new Function(await readFile(join(ROOT, "takip.js"), "utf8") + ";return NV")();
const AIDX = {};
let n = 0;
for (const [id, c] of Object.entries(cities)) {
  const file = id === "ankara" ? "data/events.json" : `data/c/${id}.json`;
  const ev = ((await readJSON(join(ROOT, file), { events: [] })) || {}).events || [];
  const seen = new Map();
  for (const e of ev.filter((x) => x.d >= today)) { // dosya sırası, uygulamadaki gibi
    let s = slugOf(e); const k = (seen.get(s) || 0) + 1; seen.set(s, k); if (k > 1) s += "-" + k;
    const title = e.title, when = `${dShort(e.d)}${e.t ? " · " + e.t : ""}`;
    const desc = `${when} · ${e.venue || c.name || ""} · ${CATS[e.cat] || "Etkinlik"} · Ne Var Ne Yok'ta bilet sitelerini ve fiyatları gör.`;
    const app = `/#/${id}/e/${encodeURIComponent(s)}`;
    const img = e.img || (OG.has(`${id}/${s}-og.jpg`) ? `${BASE}/s/${id}/${s}-og.jpg` : `${BASE}/icons/og.png`);
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} · ${esc(when)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:site_name" content="Ne Var Ne Yok"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(title)} · ${esc(when)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE}/e/${id}/${esc(s)}/"><meta property="og:image" content="${esc(img)}">
<meta property="og:image:alt" content="${esc(title)} afişi"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0a0a10">
<link rel="icon" type="image/png" href="/icons/icon-192.png?v=2"><script>location.replace(${JSON.stringify(app)})</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a10;color:#fff;font:600 16px system-ui,sans-serif;text-align:center}a{color:#c4b5fd}</style>
</head><body><p><b>${esc(title)}</b><br>${esc(when)} · ${esc(e.venue || "")}<br><br><a href="${esc(app)}">Ne Var Ne Yok'ta aç →</a></p></body></html>`;
    { const ak = NVK.akey(e.title); if (ak && ak.length >= 3 && e.status !== "iptal") (AIDX[ak] ||= []).push([id, e.d, e.t || "", s, e.venue || ""]); }
    const dir = join(ROOT, "e", id, s);
    await mkdir(dir, { recursive: true }); await writeFile(join(dir, "index.html"), html); n++;
  }
}
await mkdir(join(ROOT, "idx"), { recursive: true }); await writeFile(join(ROOT, "idx/a.json"), JSON.stringify(AIDX));
log(`Paylaşım sayfaları: ${n} etkinlik (e/<il>/<ad>/)`);
log(`Yeni tarih dizini: ${Object.keys(AIDX).length} ad (idx/a.json)`);
