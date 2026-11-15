// 81 İL İÇİN GOOGLE SAYFALARI (kullanıcı isteği, 15.11.2026 00:03: "biri Samsun etkinlik, Van etkinlik, Ankara etkinlik yazınca bizim çıkmamız").
//   /<il>/              "<İl> etkinlikleri": önümüzdeki 7 gün, gün gün (afiş, ad, saat, mekân)
//   /<il>/hafta-sonu/   bu hafta sonu (Instagram biyografisine konabilecek sabit bağlantı; her yayında yenilenir)
//   /<il>/bugun/        bugün
//   /<il>/<kategori>/   konser, tiyatro, stand-up, çocuk, sahne, festival, parti, atölye (30 gün)
// Her sayfada Event yapısal verisi (Google'ın etkinlik sonuçları için), kanonik adres, sitemap. Yalnızca olgular: ad, tarih, saat, mekân, tür;
// tanıtım metni yok, fiyat yok (fiyat kuralı: sayfa statik, 36 saat kuralını tutamaz). Afiş kaynağından gösterilir (kopyalanmaz).
// Etkinliğe dokunan uygulamadaki sayfasına gider (e/<il>/<ad>/ paylaşım sayfası üzerinden).
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, readJSON, todayIST, log } from "./lib/util.mjs";

const BASE = "https://nevarneyok.net.tr", today = todayIST();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
const addD = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const dl = (s) => { const d = new Date(s + "T12:00:00Z"); return `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${GUN[d.getUTCDay()]}`; };
const CATS = { konser: ["Konser", "konser"], tiyatro: ["Tiyatro", "tiyatro"], standup: ["Stand-up", "stand-up"], cocuk: ["Çocuk & Aile", "cocuk"], sahne: ["Opera, Bale ve Dans", "opera-bale-dans"], festival: ["Festival", "festival"], parti: ["Parti", "parti"], atolye: ["Atölye ve Söyleşi", "atolye"], sinema: ["Sinema", "sinema-etkinlikleri"] };
// "Samsun'da", "İzmir'de", "Kars'ta": Türkçe bulunma eki
const de = (w) => { const v = (w.toLocaleLowerCase("tr").match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ["a"])[0]; return w + "'" + (/[fsthçşkp]$/i.test(w) ? "t" : "d") + ("aıou".includes(v) ? "a" : "e"); };
const dow = new Date(today + "T12:00:00Z").getUTCDay(), fri = addD(today, (5 - dow + 7) % 7), ws = dow === 6 || dow === 0 ? today : fri, we = dow === 0 ? today : addD(fri, 2);

const CSS = `:root{color-scheme:dark}*{box-sizing:border-box;margin:0}body{background:#0a0a10;color:#fff;font:16px/1.5 "Inter Tight",-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}.w{max-width:1080px;margin:0 auto;padding:0 18px}
.top{position:sticky;top:0;z-index:5;background:rgba(10,10,16,.72);backdrop-filter:saturate(180%) blur(18px);-webkit-backdrop-filter:saturate(180%) blur(18px);border-bottom:.5px solid rgba(255,255,255,.08)}
.top .w{display:flex;align-items:center;justify-content:space-between;height:60px}.top img{height:34px;width:auto;display:block}
.cta{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 18px;border-radius:999px;background:#fff;color:#0a0a10;font-weight:800;font-size:14px}
.glow{position:fixed;inset:-20% -10% auto;height:70vh;background:radial-gradient(50% 60% at 20% 20%,rgba(139,92,246,.35),transparent 70%);pointer-events:none;z-index:-1}
h1{font:900 clamp(44px,11vw,104px)/.9 Archivo,sans-serif;font-stretch:75%;text-transform:uppercase;letter-spacing:-.01em;margin:34px 0 14px}
.lead{color:rgba(235,235,245,.72);max-width:680px;font-size:17px}.lead b{color:#fff}
.nav{display:flex;gap:8px;overflow-x:auto;margin:22px 0 6px;padding-bottom:6px;scrollbar-width:none}.nav a{flex:none;padding:9px 15px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);font-weight:700;font-size:14px}.nav a.on{background:#fff;color:#0a0a10}
h2{font:900 28px/1 Archivo,sans-serif;font-stretch:80%;text-transform:uppercase;margin:38px 0 14px}h2 small{display:block;font:600 13px "Inter Tight",sans-serif;color:rgba(235,235,245,.5);text-transform:none;margin-top:6px;letter-spacing:0}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:18px 14px}
.c .p{position:relative;aspect-ratio:2/3;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,#2a1f4a,#14121f);box-shadow:0 10px 24px rgba(0,0,0,.4),0 0 0 .5px rgba(255,255,255,.1)}
.c .p img{width:100%;height:100%;object-fit:cover;display:block}.c .p span{position:absolute;inset:auto 0 0;padding:28px 10px 10px;font:900 19px/1 Archivo,sans-serif;font-stretch:80%;text-transform:uppercase;background:linear-gradient(transparent,rgba(0,0,0,.7))}
.c .p.i span{display:none}.c b{display:block;margin-top:9px;font-weight:800;font-size:15px;line-height:1.25}.c small{display:block;color:rgba(235,235,245,.6);font-size:13px;margin-top:2px}.c em{font-style:normal;color:#c4b5fd;font-weight:700;font-size:13px}
.cr{font-size:10px;color:rgba(235,235,245,.4);margin-top:3px}
.app{margin:56px 0 30px;padding:30px 24px;border-radius:26px;text-align:center;background:linear-gradient(180deg,rgba(139,92,246,.24),rgba(139,92,246,.06));box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 0 .5px rgba(255,255,255,.1)}
.app img{width:72px;height:72px;border-radius:17px}.app h3{font:900 30px/1 Archivo,sans-serif;font-stretch:78%;text-transform:uppercase;margin:14px 0 8px}.app p{color:rgba(235,235,245,.7);margin-bottom:18px}
footer{padding:28px 0 50px;color:rgba(235,235,245,.45);font-size:13px}footer a{text-decoration:underline}.iller{display:flex;flex-wrap:wrap;gap:6px 12px;margin:10px 0 18px}.iller a{text-decoration:none;color:rgba(235,235,245,.6)}`;

function page({ il, path, title, desc, h1, lead, nav, sections, ld, all }) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${BASE}/${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:url" content="${BASE}/${path}"><meta property="og:image" content="${BASE}/icons/og.png">
<meta name="theme-color" content="#0a0a10"><link rel="icon" type="image/png" href="/icons/icon-192.png?v=3"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=3"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,800..900&family=Inter+Tight:wght@500;600;700;800&display=swap" media="print" onload="this.media='all'">
<style>${CSS}</style>${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}
<script data-goatcounter="https://nevarneyok.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script></head>
<body><div class="glow"></div><header class="top"><div class="w"><a href="/#/${il.id}" aria-label="Ne Var Ne Yok"><img src="/brand/logo-cam.png" alt="Ne Var Ne Yok" width="68" height="34"></a><a class="cta" href="/#/${il.id}">Uygulamada aç</a></div></header>
<main class="w"><h1>${esc(h1)}</h1><p class="lead">${lead}</p><nav class="nav">${nav}</nav>${sections}
<section class="app"><img src="/icons/icon-192.png?v=3" alt="" width="72" height="72"><h3>Ne var ne yok, artık cebinde</h3><p>81 ilin etkinlikleri tek yerde. Takip et, değişiklik olursa ilk sen duy. Ücretsiz.</p><a class="cta" href="/indir/">Uygulamayı indir</a></section></main>
<footer class="w"><div>Diğer iller</div><div class="iller">${all}</div>Bilgiler bilet sitelerinin, kurumların ve mekânların herkese açık sayfalarından toplanır; son durumu bilet sitesinden kontrol et. <a href="/#/bilgi/kaynaklar">Kaynaklar</a> · <a href="/#/bilgi/gizlilik">Gizlilik</a> · by oneside</footer></body></html>`;
}
const card = (il, e) => `<a class="c" href="/e/${il.id}/${e.slug}/"><div class="p${e.img ? " i" : ""}">${e.img ? `<img src="${esc(e.img)}" alt="${esc(e.title)} afişi" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('i');this.remove()">` : ""}<span>${esc(e.title)}</span></div>${e.imgBy ? `<div class="cr">Görsel: ${esc(e.imgBy)}</div>` : ""}<b>${esc(e.title)}</b><small><em>${esc(e.t || "")}</em>${e.t ? " · " : ""}${esc(e.venue || "")}</small></a>`;
const eventLD = (il, e) => ({ "@type": "Event", name: e.title, startDate: e.d + (e.t ? `T${e.t}:00+03:00` : ""), eventStatus: e.status === "ertelendi" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: { "@type": "Place", name: e.venue || il.name, address: { "@type": "PostalAddress", addressLocality: il.name, addressCountry: "TR" } }, ...(e.img ? { image: [e.img] } : {}), url: `${BASE}/e/${il.id}/${e.slug}/` });

const cities = (await readJSON(join(ROOT, "data/cities.json"), { cities: {} })).cities || {};
const IL = Object.entries(cities).map(([id, c]) => ({ id, name: c.name, n: c.n || 0 })).sort((a, b) => a.name.localeCompare(b.name, "tr"));
const allLinks = IL.filter((x) => x.n).map((x) => `<a href="/${x.id}/">${esc(x.name)}</a>`).join("");
const urls = [];
let pages = 0;
for (const il of IL) {
  if (!il.n) continue;
  const raw = ((await readJSON(join(ROOT, il.id === "ankara" ? "data/events.json" : `data/c/${il.id}.json`), { events: [] })) || {}).events || [];
  const seen = new Map(), E = [];
  for (const e of raw.filter((x) => x.d >= today)) { let s = slugOf(e); const k = (seen.get(s) || 0) + 1; seen.set(s, k); if (k > 1) s += "-" + k; if (e.status !== "iptal") E.push({ ...e, slug: s }); }
  const days = (a, b, L) => { const out = []; for (let d = a; d <= b; d = addD(d, 1)) { const x = L.filter((e) => e.d === d).sort((p, q) => (p.t || "99").localeCompare(q.t || "99")); if (x.length) out.push([d, x]); } return out; };
  const dedupe = (L) => { const s = new Set(); return L.filter((e) => { const k = fold(e.title).slice(0, 30) + e.d; if (s.has(k)) return false; s.add(k); return true; }); };
  const sec = (L, cap = 40) => L.map(([d, x]) => `<h2>${d === today ? "Bugün" : d === addD(today, 1) ? "Yarın" : esc(dl(d))}<small>${d === today || d === addD(today, 1) ? esc(dl(d)) + " · " : ""}${x.length} etkinlik</small></h2><div class="g">${dedupe(x).slice(0, cap).map((e) => card(il, e)).join("")}</div>`).join("");
  const catN = Object.keys(CATS).filter((c) => E.some((e) => e.cat === c && e.d <= addD(today, 30)));
  const nav = (on) => [["", "Bu hafta"], ["bugun", "Bugün"], ["hafta-sonu", "Hafta sonu"], ...catN.map((c) => [CATS[c][1], CATS[c][0]])].map(([p, l]) => `<a href="/${il.id}/${p ? p + "/" : ""}"${p === on ? ' class="on"' : ""}>${esc(l)}</a>`).join("");
  const ld = (L, name) => ({ "@context": "https://schema.org", "@type": "ItemList", name, itemListElement: dedupe(L).slice(0, 60).map((e, i) => ({ "@type": "ListItem", position: i + 1, item: eventLD(il, e) })) });
  const put = async (sub, o) => { const dir = join(ROOT, il.id, sub); await mkdir(dir, { recursive: true }); await writeFile(join(dir, "index.html"), page({ il, path: `${il.id}/${sub ? sub + "/" : ""}`, all: allLinks, ...o })); urls.push(`${il.id}/${sub ? sub + "/" : ""}`); pages++; };
  const W = E.filter((e) => e.d <= addD(today, 6)), cc = {}; for (const e of W) cc[e.cat] = (cc[e.cat] || 0) + 1;
  const top = Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${n} ${(CATS[c]?.[0] || "etkinlik").toLocaleLowerCase("tr")}`).join(", ");
  const D = de(il.name);
  await put("", { title: `${il.name} Etkinlikleri · Bu Hafta Konser, Tiyatro, Stand-up | Ne Var Ne Yok`, desc: `${D} bu hafta ${W.length} etkinlik: ${top}. Gün gün tarih, saat ve mekânlarıyla ${il.name} etkinlik takvimi.`,
    h1: `${D} bu hafta`, lead: `<b>${W.length.toLocaleString("tr-TR")} etkinlik</b> önümüzdeki 7 günde${top ? ": " + esc(top) : ""}. Gün gün, saat ve mekânlarıyla.`, nav: nav(""), sections: sec(days(today, addD(today, 6), W), 30), ld: ld(W, `${il.name} etkinlikleri`) });
  const T = E.filter((e) => e.d === today);
  await put("bugun", { title: `${il.name} Bugün Etkinlik · ${dl(today)} | Ne Var Ne Yok`, desc: `${D} bugün (${dl(today)}) ${T.length} etkinlik: konser, tiyatro, stand-up ve daha fazlası, saat ve mekânlarıyla.`,
    h1: `${D} bugün`, lead: `<b>${T.length} etkinlik</b> · ${esc(dl(today))}`, nav: nav("bugun"), sections: sec(days(today, today, T), 80), ld: ld(T, `${il.name} bugün`) });
  const H = E.filter((e) => e.d >= ws && e.d <= we);
  await put("hafta-sonu", { title: `${il.name} Hafta Sonu Etkinlikleri · ${dl(ws).split(" ").slice(0, 2).join(" ")}–${dl(we).split(" ").slice(0, 2).join(" ")} | Ne Var Ne Yok`, desc: `${D} bu hafta sonu ${H.length} etkinlik. Cuma, cumartesi ve pazar ne var ne yok, saat ve mekânlarıyla.`,
    h1: `${D} hafta sonu`, lead: `<b>${H.length} etkinlik</b> · ${esc(dl(ws))} – ${esc(dl(we))}`, nav: nav("hafta-sonu"), sections: sec(days(ws, we, H), 60), ld: ld(H, `${il.name} hafta sonu`) });
  for (const c of catN) { const C = E.filter((e) => e.cat === c && e.d <= addD(today, 30)), [nm, p] = CATS[c];
    await put(p, { title: `${il.name} ${nm} Etkinlikleri · Tarih ve Saatler | Ne Var Ne Yok`, desc: `${D} önümüzdeki 30 günde ${C.length} ${nm.toLocaleLowerCase("tr")} etkinliği, tarih, saat ve mekânlarıyla.`,
      h1: `${il.name} ${nm}`, lead: `<b>${C.length} etkinlik</b> önümüzdeki 30 günde.`, nav: nav(p), sections: sec(days(today, addD(today, 30), C), 24), ld: ld(C, `${il.name} ${nm}`) }); }
}
// sitemap'e ekle (build-pages.mjs önce yazar)
try { const sp = join(ROOT, "sitemap.xml"); let x = await readFile(sp, "utf8"); const add = urls.map((u) => `<url><loc>${BASE}/${u}</loc><changefreq>daily</changefreq><priority>${u.split("/").length <= 2 ? "0.9" : "0.7"}</priority></url>`).join("\n");
  x = x.replace("</urlset>", add + "\n</urlset>"); await writeFile(sp, x); } catch (e) { log("il-pages: sitemap'e eklenemedi " + e.message); }
log(`İl sayfaları: ${pages} sayfa (${IL.filter((x) => x.n).length} il)`);
