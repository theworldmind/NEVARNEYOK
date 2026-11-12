// Instagram paylaşımları: her sabah günün gönderilerini ve hikâyelerini hazırlar → paylas/ (paylas.json + görseller + paylas/index.html)
//
// Görseller sitenin kendisiyle çizilir: depo yerel bir sunucuda açılır, saate uygun tema seçilir (nvny-tema), logo, gökyüzü/silüet,
// kategori renkleri ve afişler sitedekiyle aynıdır. Afişler etkinliklerin herkese açık afişleridir (kullanıcı kararı, 13.11.2026);
// değiştirilmeden, üzerinde "Görsel: <kaynak>" ile konur. Sanatçı fotoğrafı ya da başkasının videosu kullanılmaz.
// Fiyat yalnızca öne çıkan gönderide ve yalnızca toplayıcının son 36 saatte doğruladığı fiyatsa, kontrol saatiyle yazılır.
//
// Günlük plan (Europe/Istanbul):
//   10:00 gönderi + 10:01 hikâye  "Bugün Ankara'da"      Gün teması, 6 afiş
//   12:30 gönderi + 12:31 hikâye  Öne çıkan 1             fiyatı düşen / yeni açıklanan etkinlik
//   15:00 gönderi + 15:01 hikâye  "Bu akşam Ankara'da"   Gece teması, akşam etkinlikleri (17:30 sonrası)
//   18:30 hikâye                  "Bu akşam" hatırlatması
//   19:00 gönderi + 19:01 hikâye  Öne çıkan 2             yoğun ilgi / gişede 1 numara
// Görsellerde ve hikâyelerde "nevarneyok.net.tr · bağlantı profilde" yönlendirmesi vardır.
import { join, extname, normalize } from "node:path";
import { rm, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { ROOT, esc, readJSON, writeText, writeJSON, todayIST, log, slugOf } from "./lib/util.mjs";
import { fmtDate, dayName, addDaysISO, pdate, siteUrl } from "./lib/site.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas");
const BASE = await siteUrl();
const DOMAIN = "nevarneyok.net.tr";
const today = process.env.SOCIAL_DATE || todayIST();
const upTR = (s) => s.toLocaleUpperCase("tr");
const kick = (d) => `ANKARA · ${upTR(fmtDate(d))} ${upTR(dayName(d))}`;

/* ---------- Siteyi yerelde sun ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
function serve() {
  return new Promise((res) => {
    const srv = createServer(async (req, rsp) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (p.endsWith("/")) p += "index.html";
        const f = normalize(join(ROOT, p));
        if (!f.startsWith(ROOT)) throw 0;
        const b = await readFile(f);
        rsp.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
        rsp.end(b);
      } catch { rsp.writeHead(404); rsp.end(); }
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

/* ---------- Sayfanın içinde: seçim (sitenin kendi verisi ve kurallarıyla: afiş, yoğun ilgi, doğrulanmış fiyat) ---------- */
function pickInPage({ day, evening, exclude, n }) {
  const AWAY = /kocaeli|istanbul|izmir|bursa|eski[şs]ehir|konya|antalya|adana|mersin|kayseri|samsun/i;
  const ex = new Set(exclude || []);
  const L = E.filter((e) => e.d === day && !["tukendi", "iptal", "ertelendi"].includes(e.status) && !AWAY.test(e.venue || "") && !ex.has(key(e)) && (evening ? e.t && e.t >= "17:30" : !(e.t && e.t < "09:00")));
  const seen = new Set(), pool = [];
  const sc = (e) => (e.img ? 6 : 0) + (e.gold ? 4 : 0) + (e.tickets.length > 1 ? 1 : 0) + (e.cat === "konser" || e.cat === "tiyatro" ? 1 : 0);
  for (const e of L.sort((a, b) => sc(b) - sc(a) || (a.t || "99").localeCompare(b.t || "99"))) { const k = e.title.toLocaleLowerCase("tr"); if (seen.has(k)) continue; seen.add(k); pool.push(e); }
  return { keys: pool.slice(0, n).sort((a, b) => (a.t || "99").localeCompare(b.t || "99")).map(key), total: new Set(L.map((e) => e.title)).size };
}
function spotsInPage({ exclude }) {
  const AWAY = /kocaeli|istanbul|izmir|bursa|eski[şs]ehir|konya|antalya|adana|mersin|kayseri|samsun/i;
  const ex = new Set(exclude || []), end = iso(addDays(today, 10)), out = [];
  const L = upcoming.filter((e) => e.img && e.d <= end && !["tukendi", "iptal", "ertelendi"].includes(e.status) && !AWAY.test(e.venue || "") && !ex.has(key(e)));
  const fresh = (e) => { const p = e.tickets.filter((x) => x.price).map((x) => x.price); return p.length ? Math.min(...p) : 0; };
  for (const e of L) {
    const dr = dropOf(e), pr = fresh(e);
    // fiyat düşüşü yalnızca tek sitede satılan etkinlikte (iki sitenin fiyatı karşılaştırılıp yanlış "düştü" denmesin) ve makul aralıkta
    if (dr >= 10 && dr <= 45 && pr && e.tickets.length === 1) out.push({ kind: "drop", key: key(e), s: 60 + dr, hook: `Fiyatı %${dr} düştü`, sub: `${fmtTL(e.prevPrice)} → ${fmtTL(pr)}` });
    if (e.gold) out.push({ kind: "gold", key: key(e), s: 40 + (e.goldNews || []).length * 6 + (e.goldWhy || []).length, hook: "Yoğun ilgi görüyor", sub: (e.goldWhy || []).slice(0, 2).join(" · ") });
    if (isNew(e) && (e.gold || e.tickets.length > 1 || e.cat === "konser")) out.push({ kind: "new", key: key(e), s: 35 + (e.cat === "konser" ? 5 : 0), hook: "Biletler satışta", sub: "Yeni açıklandı" });
  }
  // gişe: bu hafta sonunun en çok izlenen filmi, bugün Ankara'da seansı varsa
  const fl = FILMS.filter((f) => fHot(f).bo && fShows(f, todayIso).length).sort((a, b) => fHot(a).bo[0] - fHot(b).bo[0])[0];
  if (fl) { const h = fHot(fl), sh = fShows(fl, todayIso); out.push({ kind: "film", film: fl.id, s: 50 - h.bo[0] * 2, hook: h.bo[0] === 1 ? "Gişede 1 numara" : `Gişede ${h.bo[0]}. sırada`, sub: `${h.bo[1] ? h.bo[1].toLocaleString("tr-TR") + " seyirci · " : ""}bugün ${new Set(sh.map((x) => x.cid)).size} salonda ${sh.length} seans` }); }
  out.sort((a, b) => b.s - a.s);
  const one = out.find((x) => x.kind === "drop" || x.kind === "new") || out[0];
  const two = out.find((x) => x !== one && (x.kind === "gold" || x.kind === "film") && x.key !== one?.key) || out.find((x) => x !== one && x.key !== one?.key);
  const meta = (x) => { if (!x) return null; if (x.kind === "film") { const f = FILMS.find((y) => y.id === x.film); return { ...x, title: f.title, cat: "sinema", link: f.url, img: !!f.img }; }
    const e = E.find((y) => key(y) === x.key), p = fresh(e), c = e.tickets.find((t) => t.price && t.price === p);
    return { ...x, title: e.title, d: e.d, t: e.t, venue: e.venue, cat: e.cat, sites: e.tickets.map((t) => t.site), price: p || null, checked: c?.checked || null }; };
  return [meta(one), meta(two)].filter(Boolean);
}

/* ---------- Sayfanın içinde: kompozisyon ---------- */
function composeInPage(o) {
  const D = document.documentElement;
  D.style.overflow = "hidden"; document.body.style.overflow = "hidden"; scrollTo(0, 0);
  document.getElementById("ig")?.remove();
  if (o.testImg) E.forEach((e, i) => { if (e.img) e.img = o.testImg[i % o.testImg.length]; });
  const story = o.h > 1500, W = o.w;
  if (!document.getElementById("igcss")) {
    const st = document.createElement("style"); st.id = "igcss";
    st.textContent = `
  html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
  #ig{position:fixed;left:0;top:0;z-index:2147483000;overflow:hidden;color:#fff;font-family:var(--f-body);background:linear-gradient(180deg,var(--sky1),var(--sky2) 46%,var(--sky3))}
  #ig *{animation:none!important;transition:none!important}
  #ig .logo .wm{color:#fff}
  #ig .kick{font:700 17px var(--f-mono);letter-spacing:.32em;opacity:.95;white-space:nowrap;text-shadow:0 2px 10px rgba(0,0,0,.3)}
  #ig .ttl{display:inline-flex;align-items:center;gap:.22em;font:800 64px/.95 var(--f-disp);font-stretch:75%;letter-spacing:-.03em;white-space:nowrap}
  #ig .ttl b{font-weight:800;text-shadow:0 6px 30px rgba(8,6,30,.3)}
  #ig .ttl span{padding:.04em .2em .1em;border-radius:.14em;background:var(--nar);box-shadow:0 14px 40px color-mix(in srgb,var(--nar) 45%,transparent)}
  #ig .hd{position:absolute;display:flex;align-items:center}
  #ig .grid{position:absolute;display:grid;grid-template-columns:repeat(3,1fr)}
  #ig .gc{display:flex;flex-direction:column;gap:9px;min-width:0}
  #ig .gph{position:relative;aspect-ratio:830/1200;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,var(--d1),var(--d2));box-shadow:0 0 0 1px rgba(255,255,255,.16),0 18px 34px -14px rgba(0,0,0,.6)}
  #ig .gph>:not(.pst):not(.pbg):not(.pshade){z-index:2}
  #ig .gph .tpos{padding:12% 9% 9%}#ig .gph .tp-t{font-size:28px!important}
  #ig .pby{font-size:11px!important;opacity:1}
  #ig .gt{font:800 15px var(--f-mono);letter-spacing:.08em;color:#fff;display:flex;gap:8px;align-items:center;white-space:nowrap;overflow:hidden}
  #ig .gt i{font-style:normal;padding:3px 8px;border-radius:7px;background:var(--c);color:#fff}
  #ig .gt em{font-style:normal;opacity:.8;text-transform:uppercase;letter-spacing:.12em;font-size:12px;overflow:hidden;text-overflow:ellipsis}
  #ig .gn{font:800 22px/1.13 var(--f-disp);min-height:2.26em;font-stretch:88%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 2px 12px rgba(0,0,0,.25)}
  #ig .gv{font:600 16px var(--f-body);opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:-4px}
  #ig .ft{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:10px}
  #ig .url{display:inline-flex;align-items:center;gap:14px;padding:14px 30px;border-radius:999px;background:var(--nar);color:#fff;font:800 30px var(--f-disp);font-stretch:88%;box-shadow:0 14px 40px color-mix(in srgb,var(--nar) 50%,transparent);white-space:nowrap}
  #ig .url small{font:700 16px var(--f-mono);letter-spacing:.14em;opacity:.95;padding-left:14px;border-left:1.5px solid rgba(255,255,255,.55)}
  #ig .more{font:700 16px var(--f-mono);letter-spacing:.2em;padding:7px 16px;border-radius:999px;background:rgba(10,8,34,.42);border:1px solid rgba(255,255,255,.24);white-space:nowrap}
  #ig .cr{font:500 12px var(--f-body);opacity:.6}
  /* öne çıkan */
  #ig .sp{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center}
  #ig .hook{font:800 74px/1 var(--f-disp);font-stretch:75%;letter-spacing:-.03em;text-shadow:0 8px 34px rgba(8,6,30,.35)}
  #ig .hook mark{background:var(--nar);color:#fff;padding:.02em .2em .08em;border-radius:.14em}
  #ig .hsub{margin-top:10px;font:700 24px var(--f-mono);letter-spacing:.04em;opacity:.95}
  #ig .big{position:relative;aspect-ratio:830/1200;border-radius:22px;overflow:hidden;background:linear-gradient(160deg,var(--d1),var(--d2));box-shadow:0 0 0 2px rgba(255,255,255,.22),0 30px 60px -20px rgba(0,0,0,.7)}
  #ig .big>:not(.pst):not(.pbg):not(.pshade){z-index:2}
  #ig .big .pby{font-size:13px!important}#ig .big .tp-t{font-size:56px!important}
  #ig .sk{font:800 15px var(--f-mono);letter-spacing:.2em;text-transform:uppercase;padding:5px 12px;border-radius:8px;background:var(--c)}
  #ig .st{margin-top:10px;font:800 44px/1.08 var(--f-disp);text-shadow:0 4px 20px rgba(0,0,0,.25);font-stretch:85%;letter-spacing:-.02em;max-width:92%;max-height:2.2em;overflow:hidden}
  #ig .si{margin-top:10px;font:700 22px var(--f-body);opacity:.95;display:flex;gap:6px 14px;justify-content:center;flex-wrap:wrap;max-width:92%}
  #ig .si .dot::before{content:"·";margin-right:14px;opacity:.7}
  #ig .pp{margin-top:14px;display:inline-flex;align-items:baseline;gap:12px;padding:8px 20px;border-radius:14px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font:700 18px var(--f-body)}
  #ig .pp b{font:800 34px var(--f-disp);font-stretch:90%}`;
    document.head.append(st);
  }
  const box = document.createElement("div"); box.id = "ig"; box.style.width = W + "px"; box.style.height = o.h + "px";
  const glow = o.mode === "spot" ? `var(--c-${o.spot.kind === "film" ? "sinema" : (E.find((e) => key(e) === o.spot.key) || {}).cat})` : "var(--nar)";
  box.style.backgroundImage = `radial-gradient(70% 40% at 50% ${o.mode === "spot" ? 52 : 30}%,color-mix(in srgb,${glow} 26%,transparent),transparent 72%),radial-gradient(60% 30% at 0% 100%,color-mix(in srgb,var(--g2) 30%,transparent),transparent 70%),linear-gradient(180deg,rgba(10,12,40,.06),rgba(10,12,40,.40)),linear-gradient(180deg,var(--sky1),var(--sky2) 50%,var(--sky3))`;
  const mkLogo = (fs) => { const l = document.getElementById("heroLogo").cloneNode(true); l.removeAttribute("id"); l.classList.add("rest"); l.style.fontSize = fs + "px";
    l.querySelectorAll("[id]").forEach((n) => n.id = n.id + "IG"); l.querySelectorAll("[fill^='url(#']").forEach((n) => n.setAttribute("fill", n.getAttribute("fill").replace(")", "IG)"))); return l; };
  // hikâyede üst bant: sitenin gökyüzü ve Ankara silüeti (ANKARA yazısı olmadan), ufuk başlığın hemen altında
  if (story) try {
    const a = sky.ank; sky.ank = null; paintBg(performance.now());
    const cv = document.getElementById("sky"), d = sky.dpr, top = Math.max(0, sky.base - 470), hh = sky.base - top + 24;
    const c = document.createElement("canvas"); c.width = cv.width; c.height = Math.round(hh * d); c.getContext("2d").drawImage(cv, 0, top * d, cv.width, hh * d, 0, 0, c.width, c.height);
    sky.ank = a; paintBg(performance.now());
    const im = document.createElement("img"); im.src = c.toDataURL("image/jpeg", .88); im.className = "skyb";
    const sc = W / sky.W; Object.assign(im.style, { position: "absolute", left: 0, width: W + "px", top: (500 - hh * sc) + "px", height: hh * sc + "px", objectFit: "cover",
      maskImage: "linear-gradient(180deg,transparent,#000 22%,#000 82%,transparent)", webkitMaskImage: "linear-gradient(180deg,transparent,#000 22%,#000 82%,transparent)", opacity: .95 });
    box.append(im);
  } catch {}
  const foot = (y, more, credit) => { const f = document.createElement("div"); f.className = "ft"; f.style.top = y + "px";
    f.innerHTML = `<div style="display:flex;gap:16px;align-items:center">${more ? `<div class="more">${more}</div>` : ""}<div class="url">nevarneyok.net.tr<small>BAĞLANTI PROFİLDE ↗</small></div></div>${credit ? `<div class="cr">Afişler etkinliklerin kendi sayfalarından; görseller sahiplerine aittir.</div>` : ""}`; box.append(f); };
  const ev = (k) => E.find((e) => key(e) === k);
  if (o.mode === "grid") {
    const evs = o.keys.map(ev).filter(Boolean);
    const hd = document.createElement("div"); hd.className = "hd";
    if (story) { Object.assign(hd.style, { left: 0, right: 0, top: "214px", flexDirection: "column", gap: "14px" }); hd.append(mkLogo(74)); }
    else { Object.assign(hd.style, { left: "74px", right: "74px", top: "40px", justifyContent: "space-between" }); hd.append(mkLogo(50)); }
    hd.insertAdjacentHTML("beforeend", `<div style="display:flex;flex-direction:column;align-items:${story ? "center" : "flex-end"};gap:10px"><div class="kick">${o.kicker}</div><div class="ttl" style="font-size:${story ? 66 : 58}px"><b></b><span></span></div></div>`);
    hd.querySelector(".ttl b").textContent = o.h1; hd.querySelector(".ttl span").textContent = o.hl; box.append(hd);
    const g = document.createElement("div"); g.className = "grid";
    const cw = story ? 280 : 292, gap = story ? 26 : 28, gw = cw * 3 + gap * 2;
    Object.assign(g.style, { left: (W - gw) / 2 + "px", width: gw + "px", top: (story ? 520 : 168) + "px", gap: `${story ? 24 : 18}px ${gap}px`, gridTemplateColumns: `repeat(3,${cw}px)` });
    for (const e of evs) { const c = document.createElement("div"); c.className = "gc"; c.style.setProperty("--c", `var(--c-${e.cat})`); const dp = DEEP[e.cat];
      c.innerHTML = `<div class="gph" style="--d1:${dp[0]};--d2:${dp[1]}">${tposHTML(e)}${pstHTML(e.img, e.imgBy)}</div><div class="gt"><i>${e.t || "Gün boyu"}</i><em>${escA(CATS[e.cat] || "")}</em></div><div class="gn"></div><div class="gv"></div>`;
      c.querySelector(".gn").textContent = e.title; c.querySelector(".gv").textContent = e.venue; g.append(c); }
    box.append(g);
    const left = o.total - evs.length;
    foot(story ? 1592 : 1268, left > 0 ? `+${left} ETKİNLİK DAHA` : "", story);
  } else {
    const x = o.spot, f = x.kind === "film" ? FILMS.find((y) => y.id === x.film) : null, e = f ? null : ev(x.key);
    const cat = f ? "sinema" : e.cat, dp = f ? fCol(f) : DEEP[cat];
    const lg = mkLogo(story ? 60 : 40); Object.assign(lg.style, { position: "absolute", left: "50%", transform: "translateX(-50%)", top: (story ? 214 : 32) + "px" }); box.append(lg);
    const sp = document.createElement("div"); sp.className = "sp"; sp.style.top = (story ? 372 : 136) + "px"; sp.style.setProperty("--c", `var(--c-${cat})`);
    const pw = story ? 560 : 470;
    const when = e ? `${pd(e.d).getDate()} ${AY[pd(e.d).getMonth()]} ${GUN[pd(e.d).getDay()]}${e.t ? " · " + e.t : ""}` : "";
    sp.innerHTML = `<div class="hook"><mark></mark></div><div class="hsub"></div>
      <div class="big" style="width:${pw}px;margin-top:${story ? 30 : 22}px;--d1:${dp[0]};--d2:${dp[1]}">${f ? `<div class="tpos tp-sinema" lang="tr"><i class="tp-pat"></i><span class="tp-k">Vizyonda</span><b class="tp-t">${escA(f.title)}</b></div>${pstHTML(f.img, "sinemalar.com")}` : tposHTML(e) + pstHTML(e.img, e.imgBy)}</div>
      <div class="sk" style="margin-top:${story ? 26 : 18}px">${escA(f ? "Sinema · Vizyonda" : CATS[cat] || "")}</div><div class="st"></div>
      <div class="si">${e ? `<span>${when}</span><span class="dot">${escA(e.venue)}</span>` : `<span>${escA((f.genre || "").split(",").slice(0, 2).join(" · ") || "Vizyonda")}</span><span class="dot">Ankara sinemalarında</span>`}</div>
      ${e && x.price ? `<div class="pp"><b>${fmtTL(x.price)}'den</b><span>${x.checked ? `${new Date(x.checked).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} itibarıyla` : ""}</span></div>` : ""}`;
    sp.querySelector(".hook mark").textContent = x.hook; sp.querySelector(".hsub").textContent = x.sub || ""; sp.querySelector(".st").textContent = f ? f.title : e.title;
    box.append(sp);
    foot(story ? 1592 : 1262, "", story);
  }
  document.body.append(box);
  box.querySelectorAll("img.pst").forEach((im) => { im.loading = "eager"; });
  pstWire(box);
  return true;
}

/* ---------- Açıklamalar ---------- */
const EMO = { konser: "🎶", tiyatro: "🎭", standup: "🎤", sahne: "🩰", cocuk: "🧸", festival: "🎪", parti: "🪩", atolye: "🎨", sinema: "🎬" };
const TAGCAT = { konser: "#ankarakonser", tiyatro: "#ankaratiyatro", standup: "#standup", sahne: "#opera #bale", cocuk: "#çocuketkinliği", festival: "#festival", parti: "#ankaragece", atolye: "#atölye", sinema: "#sinema" };
const pick = (a) => a[pdate(today).getUTCDate() % a.length];
const LINK = `Saatler, mekânlar ve bilet bağlantıları: ${DOMAIN}\n🔗 Bağlantı profilde`;
const FOLLOW = "🔔 Ankara'da her gün neler var, takipte kal.";
function tags(list, extra = []) { return [...new Set(["#ankara", "#ankaraetkinlik", "#ankaradabugün", ...extra, ...list.map((e) => TAGCAT[e.cat]).filter(Boolean), "#neyapsam", "#başkent"])].slice(0, 12).join(" "); }
function gridCaption(kind, evs, total, day) {
  const hook = kind === "aksam" ? pick(["Bu akşam ne yapsam diyenler, buraya 👇", "Akşam planın hâlâ yoksa tam zamanı 👇", "Bu akşam Ankara'da sahne ışıkları yanıyor ✨"]) : pick(["Bugün Ankara'da neler var? 👇", "Güne plan yaparak başla, işte bugün Ankara'da 👇", "Bugün Ankara'da kaçırılmayacaklar 👇"]);
  const lines = evs.map((e) => `${EMO[e.cat] || "📍"} ${e.t || "Gün boyu"} · ${e.title} — ${e.venue}`);
  const head = kind === "aksam" ? `Bu akşam Ankara'da! ${fmtDate(day)} ${dayName(day)}` : `${day === today ? "Bugün" : "Yarın"} Ankara'da! ${fmtDate(day)} ${dayName(day)}`;
  return `${hook}\n\n${head}\n\n${lines.join("\n")}${total > evs.length ? `\n…ve ${total - evs.length} etkinlik daha.` : ""}\n\n${LINK}\n\n${kind === "aksam" ? "👥 Bu akşam birlikte çıkacağın kişiyi etiketle!" : "📌 Kaydet, plan yaparken lazım olur."}\n${FOLLOW}\n\nAfişler etkinliklerin kendi sayfalarından alınmıştır; görseller sahiplerine aittir.\n\n${tags(evs, kind === "aksam" ? ["#ankaradabuakşam"] : [])}`;
}
function spotCaption(x) {
  const em = { drop: "📉", gold: "🔥", new: "🆕", film: "🍿" }[x.kind] || "✨";
  if (x.kind === "film") return `${em} ${x.hook}: ${x.title}\n\n${x.sub}.\nAnkara'daki bütün seanslar ve salonlar sitemizde: ${DOMAIN}\n🔗 Bağlantı profilde\n\n🎬 Kiminle gideceksin? Etiketle!\n${FOLLOW}\n\nGişe verisi: Box Office Türkiye · Afiş: sinemalar.com\n\n#ankara #ankarasinema #sinema #vizyondakiler #gişe #neyapsam #başkent`;
  const d = pdate(x.d), when = `${fmtDate(x.d)} ${dayName(x.d)}${x.t ? " · " + x.t : ""}`;
  const price = x.price ? `\n🎟️ Biletler ${x.price.toLocaleString("tr-TR")} ₺'den başlıyor${x.checked ? ` (${new Date(x.checked).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} itibarıyla; fiyatlar değişebilir)` : ""}` : `\n🎟️ Biletler ${[...new Set(x.sites)].join(", ")} üzerinden satışta`;
  const line = x.kind === "drop" ? `Fiyatı düştü: ${x.sub}` : x.kind === "gold" ? `Neden öne çıkıyor: ${x.sub}` : "Biletler yeni satışa çıktı.";
  void d;
  return `${em} ${x.hook}: ${x.title}\n\n📅 ${when}\n📍 ${x.venue}${price}\n${line}\n\n${LINK}\n\n👥 Birlikte gitmek istediğin kişiyi etiketle!\n${FOLLOW}\n\nAfiş etkinliğin kendi sayfasından alınmıştır; görsel sahibine aittir.\n\n${tags([x])}`;
}

/* ---------- Üret ---------- */
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const posts = [];
const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/`;
const TEST = process.env.SOCIAL_TEST_IMG ? process.env.SOCIAL_TEST_IMG.split(",") : null; // yalnızca yerel deneme
let browser;
async function open(theme, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  page.on("pageerror", (e) => log("sayfa hatası:", e.message));
  await page.addInitScript((t) => { try { localStorage.setItem("nvny-tema", t); localStorage.setItem("nvny-seen", "1"); } catch {} }, theme);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.mouse.click(w / 2, h / 2).catch(() => {});
  await page.waitForTimeout(2600);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  return page;
}
async function shot(theme, w, h, spec, file) {
  const page = await open(theme, w, h);
  await page.evaluate(composeInPage, { ...spec, w, h, testImg: TEST });
  // afişlerin yüklenmesini bekle (en çok 12 sn); yüklenemeyen afişin yerinde yazı afişi kalır
  await page.waitForFunction(() => [...document.querySelectorAll("#ig img.pst")].every((i) => i.complete), null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, file) });
  await page.close();
  return file;
}
try {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const opt = { args: ["--no-sandbox"] };
  if (process.env.CHROME_PATH) opt.executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch(opt);
  const probe = await open("gun", 1080, 1350);
  // bugün: gündüz; az etkinlik varsa yarın
  let day = today, g1 = await probe.evaluate(pickInPage, { day, evening: false, exclude: [], n: 6 });
  if (g1.keys.length < 3) { day = addDaysISO(today, 1); g1 = await probe.evaluate(pickInPage, { day, evening: false, exclude: [], n: 6 }); }
  const g2 = await probe.evaluate(pickInPage, { day: today, evening: true, exclude: g1.keys, n: 6 });
  const g2b = g2.keys.length >= 3 ? g2 : await probe.evaluate(pickInPage, { day: today, evening: true, exclude: [], n: 6 });
  const spots = await probe.evaluate(spotsInPage, { exclude: [...g1.keys, ...g2b.keys] });
  const evOf = (keys) => probe.evaluate((ks) => ks.map((k) => { const e = E.find((x) => key(x) === k); return { d: e.d, t: e.t, title: e.title, venue: e.venue, cat: e.cat }; }), keys);
  const ev1 = await evOf(g1.keys), ev2 = await evOf(g2b.keys);
  await probe.close();
  const add = (o) => posts.push(o);
  if (g1.keys.length) {
    const spec = { mode: "grid", keys: g1.keys, total: g1.total, kicker: kick(day), h1: day === today ? "Bugün" : "Yarın", hl: "Ankara'da" };
    const cap = gridCaption("gun", ev1, g1.total, day);
    add({ id: "gun", slot: "10:00", type: "POST", file: await shot("gun", 1080, 1350, spec, "gun-gonderi.png"), caption: cap, title: `${spec.h1} Ankara'da` });
    add({ id: "gun", slot: "10:01", type: "STORY", file: await shot("gun", 1080, 1920, spec, "gun-hikaye.png"), title: `${spec.h1} Ankara'da (hikâye)` });
  }
  if (spots[0]) {
    const s = spots[0];
    add({ id: "one-cikan-1", slot: "12:30", type: "POST", file: await shot("gun", 1080, 1350, { mode: "spot", spot: s }, "one-cikan-1-gonderi.png"), caption: spotCaption(s), title: `${s.hook}: ${s.title}` });
    add({ id: "one-cikan-1", slot: "12:31", type: "STORY", file: await shot("gun", 1080, 1920, { mode: "spot", spot: s }, "one-cikan-1-hikaye.png"), title: `${s.hook} (hikâye)` });
  }
  if (g2b.keys.length >= 2) {
    const spec = { mode: "grid", keys: g2b.keys, total: g2b.total, kicker: kick(today), h1: "Bu akşam", hl: "Ankara'da" };
    const cap = gridCaption("aksam", ev2, g2b.total, today);
    add({ id: "aksam", slot: "15:00", type: "POST", file: await shot("gece", 1080, 1350, spec, "aksam-gonderi.png"), caption: cap, title: "Bu akşam Ankara'da" });
    const st = await shot("gece", 1080, 1920, spec, "aksam-hikaye.png");
    add({ id: "aksam", slot: "15:01", type: "STORY", file: st, title: "Bu akşam Ankara'da (hikâye)" });
    add({ id: "aksam-hatirlatma", slot: "18:30", type: "STORY", file: st, title: "Bu akşam hatırlatması (hikâye)" });
  }
  if (spots[1]) {
    const s = spots[1];
    add({ id: "one-cikan-2", slot: "19:00", type: "POST", file: await shot("gunbatimi", 1080, 1350, { mode: "spot", spot: s }, "one-cikan-2-gonderi.png"), caption: spotCaption(s), title: `${s.hook}: ${s.title}` });
    add({ id: "one-cikan-2", slot: "19:01", type: "STORY", file: await shot("gunbatimi", 1080, 1920, { mode: "spot", spot: s }, "one-cikan-2-hikaye.png"), title: `${s.hook} (hikâye)` });
  }
} finally { if (browser) await browser.close(); srv.close(); }

posts.sort((a, b) => a.slot.localeCompare(b.slot));
await writeJSON(join(OUT, "paylas.json"), { date: today, posts }, true);
await writeText(join(OUT, "index.html"), kitPage(posts));
log(`Instagram: ${posts.filter((p) => p.type === "POST").length} gönderi, ${posts.filter((p) => p.type === "STORY").length} hikâye · ${posts.map((p) => p.slot + " " + p.id).join(", ")}`);

function kitPage(posts) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Paylaşımlar · ${esc(fmtDate(today))}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0b1030;color:#fff;padding:16px}main{max-width:760px;margin:auto}
h1{font-size:24px;margin:6px 0 4px}p.s{opacity:.75;margin:0 0 18px}section{background:#1d1f4a;border-radius:16px;padding:14px;margin-bottom:18px}
h2{margin:0 0 10px;font-size:19px}img{width:100%;max-width:360px;border-radius:10px;display:block;margin:0 auto 8px}a.d{display:block;text-align:center;color:#fff;font-weight:700}
textarea{width:100%;box-sizing:border-box;min-height:220px;border-radius:10px;padding:10px;font:14px/1.45 system-ui;background:#fff;color:#111;margin-top:10px}
button{margin-top:8px;font:700 15px system-ui;background:#ff3b6b;color:#fff;border:0;border-radius:999px;padding:12px 18px;width:100%}</style></head>
<body><main><h1>Bugünün paylaşımları</h1><p class="s">${esc(fmtDate(today))} ${esc(dayName(today))} · sistem her sabah yeniler, Metricool kendiliğinden planlar</p>
${posts.length ? posts.map((m, i) => `<section><h2>${esc(m.slot)} · ${m.type === "POST" ? "Gönderi" : "Hikâye"} · ${esc(m.title)}</h2><img src="${m.file}" alt="${esc(m.title)}"><a class="d" href="${m.file}" download>İndir</a>
${m.caption ? `<textarea id="c${i}" readonly>${esc(m.caption)}</textarea><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('c${i}').value).then(()=>this.textContent='Kopyalandı ✓')">Metni kopyala</button>` : ""}</section>`).join("") : "<p>Bugün için hazır paylaşım yok.</p>"}
</main></body></html>`;
}
