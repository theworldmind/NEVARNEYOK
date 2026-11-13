// Instagram paylaşımları: her sabah günün gönderilerini ve hikâyelerini hazırlar → paylas/ (paylas.json + görseller + index.html)
//
// Görseller sitenin kendisiyle çizilir (yerel sunucu + Playwright): logo, afişler, kategori renkleri, patlamış mısır kutusu, gökyüzü.
// Afişler etkinliklerin herkese açık afişleridir (kullanıcı kararı, 13.11.2026): değiştirilmeden, "Görsel: <kaynak>" ile.
// Sanatçı fotoğrafı ya da başkasının videosu kullanılmaz. Görsellerde fiyat, "fiyatı düştü", "haberlerde" gibi ifadeler yoktur.
//
// Günlük plan (Europe/Istanbul) — kaydırmalı gönderi: 1. sayfa temalı kapak, sonraki her sayfada tek etkinlik büyük bilet olarak:
//   10:00  "Bugün Ankara'da"    stand-up, opera-bale, çocuk, festival, atölye, parti   (gündüz gökyüzü + Ankara silüeti)
//   12:30  "Bugün sinemada"     o günün filmleri ve seansları                          (kadife perde, ışıklı tabela, mısır kutuları)
//   15:00  "Bu akşam konser"    o günün konserleri                                     (sahne ışıkları, neon, ses dalgası)
//   17:00  "Bu akşam tiyatro"   o günün oyunları                                       (kadife perde, altın sırma)
// Her gönderinin kapağı ve ilk iki bileti hikâye olarak da paylaşılır (+1, +2, +3 dk).
// Gün içine dağılmış, doğrudan siteden alınmış hikâyeler (telefon görünümü): 09:00 günaydın, 11:30 afiş duvarı, 14:00 açık bilet,
// 16:30 sinema perdesi, 19:30 konser sahnesi, 21:30 yarın neler var. Her görselde "nevarneyok.net.tr · Bağlantı profilde".
import { join, extname, normalize } from "node:path";
import { rm, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { ROOT, esc, writeText, writeJSON, todayIST, log } from "./lib/util.mjs";
import { fmtDate, dayName, addDaysISO } from "./lib/site.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas");
const DOMAIN = "nevarneyok.net.tr";
const today = process.env.SOCIAL_DATE || todayIST();
const tomorrow = addDaysISO(today, 1);
const TEST = process.env.SOCIAL_TEST_IMG ? process.env.SOCIAL_TEST_IMG.split(",") : null; // yalnızca yerel deneme

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

/* ---------- Sayfanın içinde: günün seçimi ---------- */
// afiş gerçekten yükleniyor mu? (kayıtlı adres bozuk olabilir) — yüklenmeyen etkinlik gönderiye girmez
async function selectInPage() {
  const postersOk = async (urls) => {
  const one = (u) => new Promise((r) => { const im = new Image(); im.referrerPolicy = "no-referrer"; const t = setTimeout(() => r(false), 9000); im.onload = () => { clearTimeout(t); r(im.naturalWidth > 80 && im.naturalHeight > 80); }; im.onerror = () => { clearTimeout(t); r(false); }; im.src = u; });
  const res = await Promise.all(urls.map(one)); return Object.fromEntries(urls.map((u, i) => [u, res[i]]));
};
  const AWAY = /kocaeli|istanbul|izmir|bursa|eski[şs]ehir|konya|antalya|adana|mersin|kayseri|samsun/i;
  const ok = (e) => e.d === todayIso && !["tukendi", "iptal", "ertelendi"].includes(e.status) && !AWAY.test(e.venue || "") && !(e.t && e.t < "09:00");
  const cand = E.filter((e) => ok(e) && e.img), fc = FILMS.filter((f) => f.img && fShows(f, todayIso).length);
  const okImg = await postersOk([...new Set([...cand.map((e) => e.img), ...fc.map((f) => f.img)])]);
  const pickE = (f, n) => { const seen = new Set(), out = [];
    for (const e of cand.filter((e) => okImg[e.img] && f(e)).sort((a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0) || (b.gold ? 1 : 0) - (a.gold ? 1 : 0) || (a.t || "99").localeCompare(b.t || "99"))) { const k = e.title.toLocaleLowerCase("tr"); if (seen.has(k)) continue; seen.add(k); out.push(e); }
    const total = new Set(E.filter((e) => ok(e) && f(e)).map((e) => e.title.toLocaleLowerCase("tr"))).size; // sayı: afişsizler dahil
    return { keys: out.slice(0, n).sort((a, b) => (a.t || "99").localeCompare(b.t || "99")).map(key), total }; };
  const films = fc.filter((f) => okImg[f.img]).sort((a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0) || fScore(b) - fScore(a) || fShows(b, todayIso).length - fShows(a, todayIso).length);
  const all = FILMS.filter((f) => fShows(f, todayIso).length), sh = all.flatMap((f) => fShows(f, todayIso));
  return {
    genel: pickE((e) => !["konser", "tiyatro", "sinema"].includes(e.cat), 8),
    konser: pickE((e) => e.cat === "konser", 8),
    tiyatro: pickE((e) => e.cat === "tiyatro", 8),
    sinema: { ids: films.slice(0, 8).map((f) => f.id), total: all.length, salon: new Set(sh.map((x) => x.cid)).size, seans: sh.length },
  };
}
function listInPage({ keys, ids }) {
  if (ids) return ids.map((id) => { const f = FILMS.find((x) => x.id === id), s = fShows(f, todayIso); return { title: f.title, genre: (f.genre || "").split(",")[0], salon: new Set(s.map((x) => x.cid)).size, seans: s.length }; });
  return keys.map((k) => { const e = E.find((x) => key(x) === k); return { t: e.t, title: e.title, venue: e.venue, cat: e.cat }; });
}

/* ---------- Sayfanın içinde: temalı sayfa (kapak ya da tek bilet) ---------- */
function slideInPage(o) {
  const D = document.documentElement; D.style.overflow = "hidden"; document.body.style.overflow = "hidden"; scrollTo(0, 0);
  document.getElementById("ig")?.remove();
  const W = o.w, H = o.h, story = H > 1500, T = o.theme;
  if (!document.getElementById("igcss")) {
    const st = document.createElement("style"); st.id = "igcss";
    st.textContent = `
  #ig{position:fixed;left:0;top:0;z-index:2147483000;overflow:hidden;color:#fff;font-family:var(--f-body)}
  #ig *{animation:none!important;transition:none!important;box-sizing:border-box}
  /* bilet */
  #ig .tk2{position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;filter:drop-shadow(0 30px 50px rgba(0,0,0,.55));z-index:3}
  #ig .ph2{position:relative;aspect-ratio:830/1200;border-radius:22px 22px 0 0;overflow:hidden;background:linear-gradient(160deg,var(--d1),var(--d2))}
  #ig .ph2>:not(.pst):not(.pbg):not(.pshade),#ig .cp>:not(.pst):not(.pbg):not(.pshade){z-index:2}
  #ig .ph2 .pby,#ig .cp .pby{font-size:13px!important;opacity:1}
  #ig .ph2 .tp-t{font-size:58px!important}#ig .cp .tp-t{font-size:34px!important}
  #ig .stub2{position:relative;border-radius:0 0 22px 22px;padding:24px 28px 24px;display:grid;grid-template-columns:auto 1fr;gap:6px 24px;align-items:center;background:var(--sb);color:var(--sx)}
  #ig .stub2::before{content:"";position:absolute;left:20px;right:20px;top:0;border-top:3px dashed color-mix(in srgb,var(--sx) 35%,transparent)}
  #ig .stub2::after{content:"";position:absolute;left:-16px;right:-16px;top:-16px;height:32px;background:radial-gradient(circle at 0 50%,var(--hole) 15px,transparent 16px),radial-gradient(circle at 100% 50%,var(--hole) 15px,transparent 16px)}
  #ig .s-l{display:flex;flex-direction:column;align-items:center;padding-right:24px;border-right:2px solid color-mix(in srgb,var(--sx) 18%,transparent);grid-row:span 3;min-width:120px}
  #ig .s-l small{font:800 14px var(--f-mono);letter-spacing:.2em;opacity:.75}
  #ig .s-l b{font:800 54px/1.05 var(--f-disp);font-stretch:80%;color:var(--sa)}
  #ig .s-t{font:800 34px/1.08 var(--f-disp);font-stretch:86%;max-height:2.2em;overflow:hidden}
  #ig .s-v{font:600 20px var(--f-body);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #ig .s-x{display:flex;flex-wrap:wrap;gap:6px}
  #ig .s-x span{font:700 15px var(--f-mono);padding:4px 9px;border-radius:7px;background:color-mix(in srgb,var(--sx) 10%,transparent)}
  #ig .bar{position:absolute;left:56px;right:56px;display:flex;align-items:center;justify-content:space-between;z-index:5}
  #ig .bar .lab{font:800 16px var(--f-mono);letter-spacing:.22em;padding:9px 16px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.28)}
  #ig .cta{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:10px;z-index:6}
  #ig .url{display:inline-flex;align-items:center;gap:14px;padding:15px 32px;border-radius:999px;background:var(--nar);color:#fff;font:800 31px var(--f-disp);font-stretch:88%;box-shadow:0 14px 40px rgba(255,59,107,.45);white-space:nowrap}
  #ig .url small{font:700 16px var(--f-mono);letter-spacing:.14em;padding-left:14px;border-left:1.5px solid rgba(255,255,255,.55)}
  #ig .cr{font:500 12px var(--f-body);opacity:.6}
  #ig .cnt{position:absolute;left:0;right:0;text-align:center;font:800 30px var(--f-disp);font-stretch:88%;z-index:5;text-shadow:0 2px 16px rgba(0,0,0,.5)}
  /* kapak kolajı */
  #ig .cp{position:absolute;aspect-ratio:830/1200;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,var(--d1),var(--d2));box-shadow:0 30px 60px -18px rgba(0,0,0,.8),0 0 0 3px var(--fr)}
  /* SİNEMA */
  #ig.t-sinema{background:radial-gradient(55% 38% at 50% 48%,rgba(255,190,120,.22),transparent 70%),linear-gradient(180deg,#1c070b,#0b0306 75%);--sb:linear-gradient(180deg,#24110f,#170a0a);--sx:#ffe9c2;--sa:#ffc861;--hole:#12050a;--fr:rgba(255,214,140,.55)}
  #ig .cur{position:absolute;top:0;bottom:0;z-index:1;background:linear-gradient(90deg,rgba(0,0,0,.45),transparent 40%,rgba(0,0,0,.35)),repeating-linear-gradient(90deg,#4f0712 0 16px,#9a1026 16px 34px,#5e0915 34px 50px)}
  #ig .cur.l{left:0;box-shadow:inset -10px 0 0 #c9973f,inset -30px 0 40px rgba(0,0,0,.6)}
  #ig .cur.r{right:0;box-shadow:inset 10px 0 0 #c9973f,inset 30px 0 40px rgba(0,0,0,.6)}
  #ig .val{position:absolute;left:0;right:0;top:0;height:96px;z-index:2;background:radial-gradient(circle at 50% 0,#a3132b 62%,transparent 63%) 0 30px/72px 72px repeat-x,linear-gradient(#7d0f1f,#7d0f1f) 0 0/100% 46px no-repeat;filter:drop-shadow(0 8px 10px rgba(0,0,0,.5))}
  #ig .val::after{content:"";position:absolute;left:0;right:0;top:44px;height:5px;background:repeating-linear-gradient(90deg,#f3c46a 0 10px,#b8862b 10px 14px)}
  #ig .sign{position:absolute;left:50%;transform:translateX(-50%);padding:22px 54px 26px;border-radius:26px;background:#1d090c;border:6px solid #f3c46a;text-align:center;box-shadow:0 0 0 10px #1d090c,0 0 60px rgba(255,200,97,.35);z-index:4;white-space:nowrap}
  #ig .sign::before{content:"";position:absolute;inset:-22px;border-radius:36px;padding:10px;background:radial-gradient(circle,#fff3c8 0 4px,rgba(255,220,140,.4) 5px,transparent 8px) 0 0/30px 30px;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
  #ig .sign small{display:block;font:800 22px var(--f-mono);letter-spacing:.42em;color:#ffe9c2;padding-left:.42em}
  #ig .sign b{display:block;font:800 88px/1 var(--f-disp);font-stretch:78%;letter-spacing:.02em;color:#ffc861;text-shadow:0 0 24px rgba(255,200,97,.6)}
  #ig .pop{position:absolute;width:200px;z-index:4;filter:drop-shadow(0 18px 24px rgba(0,0,0,.6))}
  #ig.t-sinema .cp::before,#ig.t-sinema .cp::after,#ig.t-sinema .ph2::before,#ig.t-sinema .ph2::after{content:"";position:absolute;top:0;bottom:0;width:16px;z-index:3;background:#0b0306 repeating-linear-gradient(180deg,transparent 0 7px,rgba(255,240,215,.9) 7px 15px,transparent 15px 21px) center/7px 100% no-repeat}
  #ig.t-sinema .cp::before,#ig.t-sinema .ph2::before{left:0}#ig.t-sinema .cp::after,#ig.t-sinema .ph2::after{right:0}
  /* KONSER */
  #ig.t-konser{background:radial-gradient(70% 40% at 50% 100%,rgba(255,59,107,.38),transparent 70%),radial-gradient(60% 40% at 50% 0,rgba(124,58,237,.35),transparent 70%),linear-gradient(180deg,#0e0824,#170b33 55%,#0a0619);--sb:linear-gradient(180deg,#1d1140,#120a28);--sx:#f4efff;--sa:#ff6fae;--hole:#0c0720;--fr:rgba(255,111,174,.65)}
  #ig .beam{position:absolute;top:-40px;width:520px;height:1300px;transform-origin:50% 0;background:linear-gradient(180deg,var(--bc),transparent 75%);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);opacity:.5;z-index:1}
  #ig .eq{position:absolute;left:0;right:0;height:120px;z-index:1;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='60'%3E%3Cg fill='%23ff6fae' fill-opacity='.5'%3E%3Crect x='0' y='30' width='6' height='30' rx='2'/%3E%3Crect x='12' y='12' width='6' height='48' rx='2'/%3E%3Crect x='24' y='38' width='6' height='22' rx='2'/%3E%3Crect x='36' y='4' width='6' height='56' rx='2'/%3E%3Crect x='48' y='24' width='6' height='36' rx='2'/%3E%3Crect x='60' y='44' width='6' height='16' rx='2'/%3E%3Crect x='72' y='16' width='6' height='44' rx='2'/%3E%3Crect x='84' y='34' width='6' height='26' rx='2'/%3E%3C/g%3E%3C/svg%3E") 0 100%/192px 120px repeat-x}
  #ig .neon{position:absolute;left:0;right:0;text-align:center;z-index:4}
  #ig .neon small{display:block;font:800 26px var(--f-mono);letter-spacing:.5em;padding-left:.5em;color:#cfe9ff;text-shadow:0 0 12px #6cb8ff}
  #ig .neon b{display:block;font:800 120px/1 var(--f-disp);font-stretch:76%;color:#fff;text-shadow:0 0 8px #ff6fae,0 0 26px #ff3b6b,0 0 60px #ff3b6b}
  /* TİYATRO */
  #ig.t-tiyatro{background:radial-gradient(50% 38% at 50% 48%,rgba(242,196,109,.22),transparent 70%),linear-gradient(180deg,#26070f,#120308 75%);--sb:linear-gradient(165deg,#f6dc95,#c9973f);--sx:#2a0a10;--sa:#6e0f22;--hole:#140409;--fr:rgba(242,196,109,.8)}
  #ig.t-tiyatro .cur.l{box-shadow:inset -14px 0 0 #e2b456,inset -18px 0 0 #8a5d1c,inset -40px 0 40px rgba(0,0,0,.6)}
  #ig.t-tiyatro .cur.r{box-shadow:inset 14px 0 0 #e2b456,inset 18px 0 0 #8a5d1c,inset 40px 0 40px rgba(0,0,0,.6)}
  #ig .gold{position:absolute;left:0;right:0;text-align:center;z-index:4}
  #ig .gold small{display:block;font:italic 600 40px/1 Lora,Georgia,serif;color:#f6e3b0}
  #ig .gold b{display:block;margin-top:8px;font:700 112px/1 Lora,Georgia,serif;letter-spacing:.06em;background:linear-gradient(180deg,#fff2c4,#e2b456 55%,#a8741a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 18px rgba(0,0,0,.5))}
  #ig .gold i{display:block;margin:14px auto 0;width:420px;height:3px;background:linear-gradient(90deg,transparent,#e2b456,transparent)}
  /* BUGÜN */
  #ig.t-genel{background:linear-gradient(180deg,rgba(10,12,40,0),rgba(10,12,40,.38)),linear-gradient(180deg,var(--sky1),var(--sky2) 50%,var(--sky3));--sb:linear-gradient(180deg,#fffaf0,#f1e7d6);--sx:#1b1a33;--sa:#ff3b6b;--hole:#5f6c9c;--fr:rgba(255,255,255,.75)}
  #ig .ttl2{position:absolute;left:0;right:0;text-align:center;z-index:4}
  #ig .ttl2 small{display:block;font:700 22px var(--f-mono);letter-spacing:.36em;padding-left:.36em;text-shadow:0 2px 10px rgba(0,0,0,.3)}
  #ig .ttl2 b{display:inline-flex;gap:.2em;margin-top:14px;font:800 100px/1 var(--f-disp);font-stretch:75%;letter-spacing:-.02em;text-shadow:0 6px 30px rgba(0,0,0,.3)}
  #ig .ttl2 b span{background:var(--nar);padding:.02em .2em .08em;border-radius:.12em;box-shadow:0 14px 40px rgba(255,59,107,.45)}`;
    document.head.append(st);
  }
  const box = document.createElement("div"); box.id = "ig"; box.className = "t-" + T; box.style.width = W + "px"; box.style.height = H + "px";
  const add = (html) => { box.insertAdjacentHTML("beforeend", html); return box.lastElementChild; };
  const logo = (fs) => { const l = document.getElementById("heroLogo").cloneNode(true); l.removeAttribute("id"); l.classList.add("rest"); l.style.fontSize = fs + "px";
    l.querySelectorAll("[id]").forEach((n) => n.id = n.id + "IG" + fs); l.querySelectorAll("[fill^='url(#']").forEach((n) => n.setAttribute("fill", n.getAttribute("fill").replace(")", "IG" + fs + ")"))); return l; };
  const POP = `<svg viewBox="0 0 120 150" aria-hidden="true"><use href="#pop-box"/></svg>`;
  const stage = T === "sinema" || T === "tiyatro";
  if (stage) { const cw = story ? 140 : 110; add(`<i class="cur l" style="width:${cw}px"></i>`); add(`<i class="cur r" style="width:${cw}px"></i>`); add(`<i class="val"></i>`); }
  if (T === "konser") { add(`<i class="beam" style="left:-80px;--bc:rgba(108,184,255,.55);transform:rotate(-22deg)"></i>`); add(`<i class="beam" style="left:${W / 2 - 260}px;--bc:rgba(255,111,174,.5)"></i>`); add(`<i class="beam" style="right:-80px;--bc:rgba(177,124,255,.55);transform:rotate(22deg)"></i>`); add(`<i class="eq" style="bottom:${story ? 250 : 0}px"></i>`); }
  if (T === "genel") try { // gökyüzü ve Ankara silüeti (ANKARA yazısı olmadan)
    const a = sky.ank; sky.ank = null; paintBg(performance.now());
    const cv = document.getElementById("sky"), d = sky.dpr, top = Math.max(0, sky.base - 470), hh = sky.base - top + 30;
    const c = document.createElement("canvas"); c.width = cv.width; c.height = Math.round(hh * d); c.getContext("2d").drawImage(cv, 0, top * d, cv.width, hh * d, 0, 0, c.width, c.height);
    // Ankara Kalesi'ndeki bayrak sitede ayrı (dalgalanan) bir tuvalde çizilir: kopyaya o da eklenir
    try { fxFrame(performance.now(), true); const f = sky.flag, fc = sky.fc; if (f && fc) c.getContext("2d").drawImage(fc, f.ox * d, (f.oy - top) * d, fc.width, fc.height); } catch {}
    sky.ank = a; paintBg(performance.now());
    const sc = W / sky.W, im = add(`<img alt="" style="position:absolute;left:0;z-index:1;width:${W}px;height:${hh * sc}px;object-fit:cover;opacity:.9;-webkit-mask:linear-gradient(180deg,transparent,#000 30%,#000 85%,transparent)">`);
    im.src = c.toDataURL("image/jpeg", .88); im.style.top = (o.kind === "cover" ? H - hh * sc - (story ? 240 : -20) : (story ? 120 : -120)) + "px";
  } catch {}
  const ev = (k) => E.find((e) => key(e) === k), fm = (id) => FILMS.find((f) => f.id === id);
  const posterOf = (x) => x.f ? `<div class="tpos tp-sinema" lang="tr"><i class="tp-pat"></i><span class="tp-k">Vizyonda</span><b class="tp-t">${escA(x.f.title)}</b></div>${pstHTML(x.f.img, "sinemalar.com")}` : tposHTML(x.e) + pstHTML(x.e.img, x.e.imgBy);
  const colOf = (x) => x.f ? fCol(x.f) : DEEP[x.e.cat];
  const items = (o.ids || []).map((id) => ({ f: fm(id) })).concat((o.keys || []).map((k) => ({ e: ev(k) }))).filter((x) => x.f || x.e);
  const cta = (y) => add(`<div class="cta" style="top:${y}px"><div class="url">nevarneyok.net.tr<small>BAĞLANTI PROFİLDE ↗</small></div>${story ? `<div class="cr">Afişler etkinliklerin kendi sayfalarından; görseller sahiplerine aittir.</div>` : ""}</div>`);
  const placeLogo = (fs, top) => { const lg = logo(fs); Object.assign(lg.style, { position: "absolute", left: "50%", transform: "translateX(-50%)", top: top + "px", zIndex: 6 }); box.append(lg); };
  if (o.kind === "cover") {
    const y0 = story ? 250 : 0;
    placeLogo(story ? 46 : 30, story ? 150 : (stage ? 112 : 30));
    if (T === "sinema") add(`<div class="sign" style="top:${y0 + (story ? 120 : 200)}px"><small>BUGÜN</small><b>SİNEMADA</b></div>`);
    else if (T === "konser") add(`<div class="neon" style="top:${y0 + (story ? 100 : 120)}px"><small>BU AKŞAM</small><b>KONSER</b></div>`);
    else if (T === "tiyatro") add(`<div class="gold" style="top:${y0 + (story ? 110 : 196)}px"><small>Bu akşam perde açılıyor</small><b>TİYATRO</b><i></i></div>`);
    else add(`<div class="ttl2" style="top:${y0 + (story ? 100 : 130)}px"><small>${escA(o.kicker)}</small><b>Bugün <span>Ankara'da</span></b></div>`);
    // kolaj: ortada büyük afiş, iki yanında arkada eğik iki afiş
    const cy = story ? 690 : 470, cwid = story ? 450 : 360, side = story ? 360 : 290;
    const three = items.slice(0, 3), order = three.length === 3 ? [0, 2, 1] : three.map((_, i) => i);
    const pos = three.length === 1 ? [[0, 0, 0]] : three.length === 2 ? [[-150, 0, -5], [150, 0, 5]] : [[-(story ? 290 : 255), 50, -8], [0, 0, 0], [(story ? 290 : 255), 50, 8]];
    for (const i of order) { const x = three[i], p = pos[i], wv = p[0] === 0 && three.length !== 2 ? cwid : side, dp = colOf(x);
      add(`<div class="cp" style="width:${wv}px;left:${W / 2 - wv / 2 + p[0]}px;top:${cy + p[1]}px;transform:rotate(${p[2]}deg);z-index:${p[0] === 0 ? 3 : 2};--d1:${dp[0]};--d2:${dp[1]}">${posterOf(x)}</div>`); }
    if (T === "sinema") { add(`<div class="pop" style="left:${story ? 40 : 10}px;top:${story ? 1180 : 960}px;transform:rotate(-10deg)">${POP}</div>`); add(`<div class="pop" style="right:${story ? 40 : 10}px;top:${story ? 1180 : 960}px;transform:rotate(10deg)">${POP}</div>`); }
    add(`<div class="cnt" style="top:${story ? 1400 : 1010 + (stage ? 0 : 0)}px"></div>`).textContent = o.count || "";
    if (!story) box.lastElementChild.style.top = (cy + cwid * 1.4457 + 16) + "px";
    cta(story ? 1500 : 1254);
  } else {
    const x = items[0]; if (!x) return false;
    const bar = add(`<div class="bar" style="top:${story ? 240 : (stage ? 112 : 34)}px"><span class="lab"></span></div>`); bar.querySelector(".lab").textContent = o.label || ""; bar.prepend(logo(story ? 40 : 30));
    const pw = story ? 640 : (stage ? 520 : 560), dp = colOf(x);
    const tk = add(`<div class="tk2" style="top:${story ? 340 : (stage ? 196 : 124)}px;width:${pw}px"><div class="ph2" style="--d1:${dp[0]};--d2:${dp[1]}">${posterOf(x)}</div><div class="stub2"></div></div>`);
    const sb = tk.querySelector(".stub2");
    if (x.f) { const s = fShows(x.f, todayIso), ts = [...new Set(s.map((y) => y.t))], sal = new Set(s.map((y) => y.cid)).size;
      sb.innerHTML = `<div class="s-l"><small>BUGÜN</small><b>${s.length}</b><small>SEANS</small></div><div class="s-t"></div><div class="s-v"></div><div class="s-x">${ts.slice(0, 7).map((t) => `<span>${t}</span>`).join("")}${ts.length > 7 ? `<span>+${ts.length - 7}</span>` : ""}</div>`;
      sb.querySelector(".s-t").textContent = x.f.title; sb.querySelector(".s-v").textContent = [(x.f.genre || "").split(",")[0], durTxt(x.f.dur), sal + " salonda"].filter(Boolean).join(" · "); }
    else { const e = x.e, d = pd(e.d);
      sb.innerHTML = `<div class="s-l"><small>${escA(GUNK[d.getDay()].toLocaleUpperCase("tr"))}</small><b>${e.t || d.getDate()}</b><small>${escA(`${d.getDate()} ${SHORTM[d.getMonth()]}`.toLocaleUpperCase("tr"))}</small></div><div class="s-t"></div><div class="s-v"></div><div class="s-x"><span>${escA(CATS[e.cat] || "")}</span>${[...new Set(e.tickets.map((t) => t.site))].slice(0, 2).map((t) => `<span>🎟 ${escA(t)}</span>`).join("")}</div>`;
      sb.querySelector(".s-t").textContent = e.title; sb.querySelector(".s-v").textContent = e.venue; }
    cta(story ? 1560 : 1262);
  }
  document.body.append(box);
  box.querySelectorAll("img.pst").forEach((im) => { im.loading = "eager"; });
  pstWire(box);
  return true;
}

/* ---------- Sayfanın içinde: siteden ekran görüntüsü için hazırlık + üst/alt bant ---------- */
async function siteInPage({ what, label }) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.getElementById("igov")?.remove();
  // afişi olmayan etkinlik paylaşılmaz (kullanıcı isteği): sitenin görüntüsünde de yalnızca afişli etkinlikler kalır
  for (let i = upcoming.length - 1; i >= 0; i--) if (!upcoming[i].img) upcoming.splice(i, 1);
  state.cat = "hepsi"; state.range = "hepsi"; state.limit = 60;
  if (what === "wall") { render(true); openWall(todayIso); }
  if (what === "wall-yarin") { render(true); openWall(tomIso); }
  if (what === "sinema") { state.cat = "sinema"; render(true); const c = document.querySelector(".cine"); scrollTo(0, (c?.getBoundingClientRect().top || 0) + scrollY - (document.querySelector(".bar")?.offsetHeight || 60) - 12); }
  const barH = () => (document.querySelector(".bar")?.offsetHeight || 60) + 12;
  if (what === "konser") { state.cat = "konser"; render(true); const c = document.querySelector(".cstage"); scrollTo(0, (c?.getBoundingClientRect().top || 0) + scrollY - barH()); }
  if (what === "yarin") { state.range = "yarin"; render(true); const c = document.querySelector("#main .period") || document.getElementById("main"); scrollTo(0, c.getBoundingClientRect().top + scrollY - barH()); }
  if (what === "bilet") {
    render(true);
    const L = upcoming.filter((e) => e.img && (e.d === todayIso || e.d === tomIso) && !["tukendi", "iptal"].includes(e.status));
    const e = L.find((x) => x.gold) || L[0]; if (!e) return false;
    const m = document.getElementById("main"); const c = card(e); m.prepend(c); scrollTo(0, c.getBoundingClientRect().top + scrollY - 80); await wait(300); openTicket(e, c); await wait(900);
  }
  await wait(1200);
  document.querySelectorAll("img.pst").forEach((im) => { im.loading = "eager"; });
  const ov = document.createElement("div"); ov.id = "igov";
  ov.innerHTML = `<style>#igov{position:fixed;inset:0;z-index:2147483600;pointer-events:none;font-family:var(--f-body)}#igov::before{content:"";position:absolute;left:0;right:0;bottom:0;height:260px;background:linear-gradient(180deg,transparent,rgba(8,8,26,.78) 45%,rgba(8,8,26,.92))}.goldbar span,.goldbar a{display:none!important}#igov .t{position:absolute;left:50%;bottom:146px;transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:rgba(12,10,36,.85);color:#fff;font:800 11px var(--f-mono);letter-spacing:.14em;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.35)}#igov .b{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:#ff3b6b;color:#fff;font:800 15px var(--f-disp);white-space:nowrap;box-shadow:0 10px 30px rgba(255,59,107,.5)}#igov .b small{font:700 9px var(--f-mono);letter-spacing:.12em;padding-left:8px;border-left:1px solid rgba(255,255,255,.55)}</style><div class="t"></div><div class="b">nevarneyok.net.tr<small>BAĞLANTI PROFİLDE ↗</small></div>`;
  ov.querySelector(".t").textContent = label; document.body.append(ov);
  return true;
}

/* ---------- Açıklamalar ---------- */
const EMO = { konser: "🎶", tiyatro: "🎭", standup: "🎤", sahne: "🩰", cocuk: "🧸", festival: "🎪", parti: "🪩", atolye: "🎨", sinema: "🎬" };
const LINK = `Saatler, mekânlar ve bilet bağlantıları: ${DOMAIN}\n🔗 Bağlantı profilde`;
const FOLLOW = "🔔 Ankara'da her gün neler var, takipte kal.";
const CHECK = "ℹ️ Son durum (iptal, erteleme) için gitmeden önce bilet sitesine göz at; iptaller sitemizde de işaretlenir.";
const CREDIT = "Afişler etkinliklerin kendi sayfalarından alınmıştır; görseller sahiplerine aittir.";
const day = `${fmtDate(today)} ${dayName(today)}`;
const more = (n, L) => (n > L.length ? `\n…ve sitede daha fazlası.` : "");
function capGenel(L, n) { return `Bugün Ankara'da neler var? 👇 ${day}\n\n${L.map((e) => `${EMO[e.cat] || "📍"} ${e.t || "Gün boyu"} · ${e.title} — ${e.venue}`).join("\n")}${more(n, L)}\n\n➡️ Kaydır, her etkinliğin biletine bak.\n\n${LINK}\n\n📌 Kaydet, plan yaparken lazım olur.\n${CHECK}\n${FOLLOW}\n\n${CREDIT}\n\n#ankara #ankaraetkinlik #ankaradabugün #standup #çocuketkinliği #neyapsam #başkent`; }
function capSinema(L, s) { return `🍿 Bugün Ankara sinemalarında neler var? ${day}\n\n${L.map((f) => `🎬 ${f.title}${f.genre ? ` (${f.genre})` : ""} — ${f.salon} salonda, ${f.seans} seans`).join("\n")}\n\nBugün ${s.salon} salonda ${s.total} film, ${s.seans} seans. Salon salon bütün saatler: ${DOMAIN}\n🔗 Bağlantı profilde\n\n🎟️ Kiminle gideceksin? Etiketle!\n${FOLLOW}\n\nAfişler: sinemalar.com\n\n#ankara #ankarasinema #sinema #vizyondakiler #bugünsinemada #neyapsam #başkent`; }
function capKonser(L, n) { return `🎶 Bu akşam Ankara'da konser var! ${day}\n\n${L.map((e) => `🎤 ${e.t || ""} · ${e.title} — ${e.venue}`).join("\n")}${more(n, L)}\n\n➡️ Kaydır, her konserin biletine bak.\n\n${LINK}\n\n👥 Bu akşam birlikte gideceğin kişiyi etiketle!\n${CHECK}\n${FOLLOW}\n\n${CREDIT}\n\n#ankara #ankarakonser #konser #canlımüzik #ankaradabuakşam #neyapsam #başkent`; }
function capTiyatro(L, n) { return `🎭 Bu akşam Ankara'da perde açılıyor! ${day}\n\n${L.map((e) => `🎭 ${e.t || ""} · ${e.title} — ${e.venue}`).join("\n")}${more(n, L)}\n\n➡️ Kaydır, her oyunun biletine bak.\n\n${LINK}\n\n👥 Tiyatroya birlikte gideceğin kişiyi etiketle!\n${CHECK}\n${FOLLOW}\n\n${CREDIT}\n\n#ankara #ankaratiyatro #tiyatro #devlettiyatroları #ankaradabuakşam #neyapsam #başkent`; }

/* ---------- Üret ---------- */
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const posts = [];
const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/`;
let browser;
async function open(theme, w, h, mobile) {
  const page = await browser.newPage(mobile ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" } : { viewport: { width: w, height: h }, reducedMotion: "reduce" });
  page.on("pageerror", (e) => log("sayfa hatası:", e.message));
  await page.addInitScript((t) => { try { localStorage.setItem("nvny-tema", t); localStorage.setItem("nvny-seen", "1"); } catch {} }, theme);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.evaluate(() => { try { leaveSplash(); } catch {} }).catch(() => {}); // tıklamadan (tıklama bir menüyü açabiliyor)
  await page.waitForTimeout(2600);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  if (TEST) await page.evaluate((t) => { E.forEach((e, i) => { if (e.img) e.img = t[i % t.length]; }); FILMS.forEach((f, i) => { if (f.img) f.img = t[i % t.length]; }); }, TEST);
  return page;
}
const imgsDone = (page) => page.waitForFunction(() => [...document.querySelectorAll("img.pst")].filter((i) => { const r = i.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; }).every((i) => i.complete), null, { timeout: 12000 }).catch(() => {});
const PAGES = {}; // aynı temadaki sayfalar tek sekmede üretilir (site her seferinde yeniden açılmaz)
async function slide(theme, w, h, spec, file) {
  const page = PAGES[theme] ||= await open(theme, w, h);
  const vs = page.viewportSize(); if (vs.width !== w || vs.height !== h) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(500); }
  const ok = await page.evaluate(slideInPage, { ...spec, w, h });
  if (!ok) return null;
  await imgsDone(page); await page.waitForTimeout(300);
  // afişi yüklenmeyen bilet sayfası paylaşılmaz; kapakta da en az bir afiş görünmeli
  const shown = await page.evaluate(() => document.querySelectorAll("#ig .has-pst").length);
  if (!shown || (spec.kind === "item" && !(await page.evaluate(() => !!document.querySelector("#ig .ph2.has-pst"))))) { log("afiş yüklenmedi, atlandı:", file); return null; }
  await page.screenshot({ path: join(OUT, file) }); return file;
}
async function siteShot(theme, what, label, file) {
  const page = await open(theme, 360, 640, true);
  const ok = await page.evaluate(siteInPage, { what, label }).catch((e) => { log("site görüntüsü:", what, e.message); return false; });
  if (!ok) { await page.close(); return null; }
  await imgsDone(page); await page.waitForTimeout(500);
  // afişi yüklenmeyen kart görüntüden çıkarılır (yazı afişi paylaşılmaz); ekranda afiş kalmazsa hikâye üretilmez
  const n = await page.evaluate((w) => {
    document.querySelectorAll(".vc, .wt, .fc").forEach((c) => { if (!c.querySelector(".has-pst")) c.remove(); });
    if (w === "bilet" && !document.querySelector(".tkw .has-pst")) return 0;
    return [...document.querySelectorAll(".has-pst")].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 40 && r.bottom > 0 && r.top < innerHeight; }).length;
  }, what).catch(() => 0);
  if (!n) { log("site görüntüsünde afiş yok, atlandı:", file); await page.close(); return null; }
  await imgsDone(page); await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, file) }); await page.close(); return file;
}
const plus = (slot, m) => { const [h, mm] = slot.split(":").map(Number), t = h * 60 + mm + m; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
try {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const opt = { args: ["--no-sandbox"] };
  if (process.env.CHROME_PATH) opt.executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch(opt);
  const probe = await open("gun", 1080, 1350);
  const S = await probe.evaluate(selectInPage);  // yalnızca afişi yüklenen etkinlikler
  const lists = { genel: await probe.evaluate(listInPage, { keys: S.genel.keys }), konser: await probe.evaluate(listInPage, { keys: S.konser.keys }), tiyatro: await probe.evaluate(listInPage, { keys: S.tiyatro.keys }), sinema: await probe.evaluate(listInPage, { ids: S.sinema.ids }) };
  await probe.close();
  const kicker = `ANKARA · ${fmtDate(today).toLocaleUpperCase("tr")} ${dayName(today).toLocaleUpperCase("tr")}`;
  const SETS = [
    { id: "bugun", slot: "10:00", theme: "genel", site: "gun", sel: S.genel, count: "Stand-up, sahne, çocuk, festival ve daha fazlası", label: "BUGÜN ANKARA'DA", cap: () => capGenel(lists.genel, S.genel.total) },
    { id: "sinema", slot: "12:30", theme: "sinema", site: "gece", sel: { ids: S.sinema.ids }, count: `Bugün ${S.sinema.salon} salonda ${S.sinema.total} film · ${S.sinema.seans} seans`, label: "BUGÜN SİNEMADA", cap: () => capSinema(lists.sinema, S.sinema) },
    { id: "konser", slot: "15:00", theme: "konser", site: "gece", sel: S.konser, count: `Bu akşam ${S.konser.total} konser`, label: "BU AKŞAM KONSER", cap: () => capKonser(lists.konser, S.konser.total) },
    { id: "tiyatro", slot: "17:00", theme: "tiyatro", site: "gece", sel: S.tiyatro, count: `Bu akşam ${S.tiyatro.total} oyun sahnede`, label: "BU AKŞAM TİYATRO", cap: () => capTiyatro(lists.tiyatro, S.tiyatro.total) },
  ];
  for (const st of SETS) {
    const ks = st.sel.ids ? st.sel.ids.map((id) => ({ ids: [id] })) : (st.sel.keys || []).map((k) => ({ keys: [k] }));
    if (ks.length < 2) { log(`Instagram: ${st.id} atlandı (${ks.length})`); continue; }
    const base = { theme: st.theme, kicker, count: st.count }, all = st.sel.ids ? { ids: st.sel.ids } : { keys: st.sel.keys };
    const files = [await slide(st.site, 1080, 1350, { ...base, kind: "cover", ...all }, `${st.id}-0.png`)];
    for (let i = 0; i < ks.length; i++) files.push(await slide(st.site, 1080, 1350, { ...base, kind: "item", ...ks[i], label: `${st.label} · ${i + 1}/${ks.length}` }, `${st.id}-${i + 1}.png`));
    const ff = files.filter(Boolean); if (ff.length < 2) { log(`Instagram: ${st.id} atlandı (afişli sayfa yok)`); continue; }
    posts.push({ id: st.id, slot: st.slot, type: "POST", files: ff, caption: st.cap(), title: st.label });
    const sc = await slide(st.site, 1080, 1920, { ...base, kind: "cover", ...all }, `${st.id}-hikaye-0.png`);
    if (sc) posts.push({ id: st.id + "-hikaye", slot: plus(st.slot, 1), type: "STORY", file: sc, title: `${st.label} (hikâye kapak)` });
    for (let i = 0; i < Math.min(2, ks.length); i++) { const f = await slide(st.site, 1080, 1920, { ...base, kind: "item", ...ks[i], label: st.label }, `${st.id}-hikaye-${i + 1}.png`); if (f) posts.push({ id: st.id + "-hikaye", slot: plus(st.slot, 2 + i), type: "STORY", file: f, title: `${st.label} (hikâye ${i + 1})` }); }
  }
  for (const k in PAGES) await PAGES[k].close().catch(() => {});
  // gün içine dağılmış, doğrudan siteden hikâyeler (telefon görünümü)
  const SITE = [
    ["09:00", "sabah", "wall", "GÜNAYDIN ANKARA · BUGÜNÜN AFİŞLERİ"],
    ["14:00", "gun", "bilet", "BİLETİ AÇ, İNCELE"],
    ["16:30", "gece", "sinema", "PERDE AÇILDI · VİZYONDA"],
    ["19:30", "gece", "konser", "BU AKŞAM SAHNEDE"],
    ["20:45", "gece", "wall-yarin", "AFİŞ DUVARI · YARIN"],
    ["21:30", "gece", "yarin", "YARIN ANKARA'DA NELER VAR?"],
  ];
  for (const [slot, theme, what, label] of SITE) { const f = await siteShot(theme, what, label, `site-${what}.png`); if (f) posts.push({ id: "site-" + what, slot, type: "STORY", file: f, title: label }); }
} finally { if (browser) await browser.close(); srv.close(); }

posts.sort((a, b) => a.slot.localeCompare(b.slot));
await writeJSON(join(OUT, "paylas.json"), { date: today, tomorrow, posts }, true);
await writeText(join(OUT, "index.html"), kitPage(posts));
log(`Instagram: ${posts.filter((p) => p.type === "POST").length} gönderi (${posts.filter((p) => p.type === "POST").map((p) => p.files.length).join("+")} sayfa), ${posts.filter((p) => p.type === "STORY").length} hikâye`);

function kitPage(posts) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Paylaşımlar · ${esc(fmtDate(today))}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0b1030;color:#fff;padding:16px}main{max-width:900px;margin:auto}
h1{font-size:24px;margin:6px 0 4px}p.s{opacity:.75;margin:0 0 18px}section{background:#1d1f4a;border-radius:16px;padding:14px;margin-bottom:18px}
h2{margin:0 0 10px;font-size:19px}.im{display:flex;gap:8px;overflow-x:auto}.im img{height:300px;border-radius:10px}
textarea{width:100%;box-sizing:border-box;min-height:200px;border-radius:10px;padding:10px;font:14px/1.45 system-ui;background:#fff;color:#111;margin-top:10px}
button{margin-top:8px;font:700 15px system-ui;background:#ff3b6b;color:#fff;border:0;border-radius:999px;padding:12px 18px;width:100%}</style></head>
<body><main><h1>Bugünün paylaşımları</h1><p class="s">${esc(fmtDate(today))} ${esc(dayName(today))} · sistem her sabah yeniler, Metricool kendiliğinden planlar</p>
${posts.map((m, i) => `<section><h2>${esc(m.slot)} · ${m.type === "POST" ? `Gönderi (${m.files.length} sayfa)` : "Hikâye"} · ${esc(m.title)}</h2><div class="im">${(m.files || [m.file]).map((f) => `<a href="${f}" download><img src="${f}" alt=""></a>`).join("")}</div>
${m.caption ? `<textarea id="c${i}" readonly>${esc(m.caption)}</textarea><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('c${i}').value).then(()=>this.textContent='Kopyalandı ✓')">Metni kopyala</button>` : ""}</section>`).join("")}
</main></body></html>`;
}
