/* NE VAR NE YOK · harita ve yol tarifi (25.11.2026, hız: app.js'ten ayrıldı; yalnızca harita ya da yol tarifi açılınca yüklenir).
   app.js'in genel değişkenlerini ve yardımcılarını kullanır (aynı genel kapsam). Sürümü build-pages.mjs günceller (app.js içindeki harita.js?v=). */
"use strict";
const RMOD = { left: "sola", right: "sağa", "slight left": "hafif sola", "slight right": "hafif sağa", "sharp left": "keskin sola", "sharp right": "keskin sağa", straight: "düz", uturn: "geri" };
const RROT = { left: -90, right: 90, "slight left": -45, "slight right": 45, "sharp left": -135, "sharp right": 135, straight: 0, uturn: 180 };
const cap1 = (x) => x.charAt(0).toLocaleUpperCase("tr") + x.slice(1);
function stepTxt(s, venue) {
  const m = s.maneuver || {}, t = m.type, md = RMOD[m.modifier] || "", n = s.name ? `<b>${esc(s.name)}</b>` : "";
  if (t === "depart") return n ? `${n} üzerinden yola çık` : "Yola çık";
  if (t === "arrive") return `Vardın 🎉 <b>${esc(venue)}</b>${m.modifier === "left" ? " solunda" : m.modifier === "right" ? " sağında" : ""}`;
  if (t === "roundabout" || t === "rotary" || t === "roundabout turn") return `Döner kavşaktan ${m.exit ? m.exit + ". çıkışı " : ""}al${n ? ", " + n : ""}`;
  if (t === "exit roundabout" || t === "exit rotary") return `Kavşaktan çık${n ? ", " + n : ""}`;
  if (md === "geri") return "Geri dön";
  if (!md || md === "düz") return `Düz devam et${n ? ", " + n : ""}`;
  if (t === "fork") return `Yol ayrımında ${md} git${n ? ", " + n : ""}`;
  if (t === "end of road") return `Yolun sonunda ${md} dön${n ? ", " + n : ""}`;
  if (t === "merge") return `${cap1(md)} katıl${n ? ", " + n : ""}`;
  if (t === "on ramp") return `${cap1(md)} bağlantı yoluna gir${n ? ", " + n : ""}`;
  if (t === "off ramp") return `${cap1(md)} çıkıştan çık${n ? ", " + n : ""}`;
  return `${cap1(md)} dön${n ? ", " + n : ""}`;
}
const mTxt = (m) => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km";
const arrow = (s) => { const m = s.maneuver || {}, r = m.type === "arrive" ? null : m.type === "depart" ? 0 : RROT[m.modifier] ?? 0;
  return r === null ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
    : `<svg viewBox="0 0 24 24" style="transform:rotate(${r}deg)"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
const RCACHE = new Map();
async function routeOf(mode, a, b) {
  const k = mode + a.map((x) => x.toFixed(4)) + b; if (RCACHE.has(k)) return RCACHE.get(k);
  const u = `https://routing.openstreetmap.de/routed-${mode === "car" ? "car" : mode === "bike" ? "bike" : "foot"}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  const r = await fetch(u); if (!r.ok) throw new Error("rota " + r.status); const j = await r.json(); if (j.code !== "Ok" || !j.routes?.length) throw new Error("rota yok");
  RCACHE.set(k, j.routes[0]); return j.routes[0];
}
/* Toplu taşıma tarifi (19.11.2026, kullanıcı: "hangi hatların nerelerden geçtiği açık kaynak, saat şart değil"): OpenStreetMap'teki hatlar ve durak sıraları
   (yv/yh/<enlem>_<boylam>.json, scraper/beraber/hatlar.py). Saat yok: süre yürüme + bekleme + yolculuk tahmini. En çok 3 biniş; duraklar arası aktarma yürüyüşü 400 m'ye kadar. */
const EGOL = { p: null }, PT_ON = true, YH = new Map(), yhGet = (c) => { if (!YH.has(c)) YH.set(c, fetch(`/yv/yh/${c}.json`).then((r) => r.ok && /json/.test(r.headers.get("content-type") || "") ? r.json() : null).catch(() => null)); return YH.get(c); };
const PTM = { metro: ["🚇", 36, 4, "Metro"], hafif: ["🚈", 30, 5, "Hafif raylı"], tram: ["🚊", 18, 5, "Tramvay"], tren: ["🚆", 45, 10, "Banliyö / tren"], otobus: ["🚌", 18, 8, "Otobüs"], metrobus: ["🚌", 36, 3, "Metrobüs"], dolmus: ["🚐", 20, 6, "Dolmuş"], vapur: ["⛴️", 22, 12, "Vapur"], teleferik: ["🚡", 12, 4, "Teleferik"] };
const ptWalk = (a, b) => km(a, b) * 1.3 / 4.8 * 60;
async function ptRoute(A, B) {
  const cells = new Set(); for (const p of [A, B]) for (const da of [-.3, 0, .3]) for (const dn of [-.3, 0, .3]) cells.add(`${Math.floor(p[0] + da)}_${Math.floor(p[1] + dn)}`);
  const T = (await Promise.all([...cells].map(yhGet))).filter(Boolean); if (!T.length) return { yok: 1 };
  const S = [], SK = new Map(), L = [], LK = new Set();
  for (const t of T) { const map2 = t.s.map((s) => { const k = s[0] + "|" + (s[3] || "") + "|" + s[1].toFixed(4) + "|" + s[2].toFixed(4); if (!SK.has(k)) { SK.set(k, S.length); S.push({ n: s[0], p: [s[1], s[2]], r: s[3] || "" }); } return SK.get(k); });
    for (const h of t.h) { const seq = h[5].map((i) => map2[i]), k = h[0] + "|" + h[1] + "|" + seq[0] + "|" + seq[seq.length - 1] + "|" + seq.length; if (LK.has(k)) continue; LK.add(k); L.push({ ref: h[0], name: h[1], mode: h[2], col: /^#?[0-9a-f]{3,6}$/i.test(h[3]) ? (h[3][0] === "#" ? h[3] : "#" + h[3]) : "", uni: h[4] === 1, seq, ...(h[6] ? { w: h[6] } : {}) }); } } // h[6]: GTFS sefer sıklığından bekleme (dk)
  // Ankara: EGO'nun kendi durak sıraları (yv/ego/hatlar.json) OSM'deki durak numaralarına bağlanıp hat olarak eklenir (OSM'de olmayan hatlar da gelir)
  if ([A, B].every((p) => p[0] > 39.3 && p[0] < 40.5 && p[1] > 31.8 && p[1] < 33.8)) { const EH = await (EGOL.p || (EGOL.p = fetch("/yv/ego/hatlar.json").then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { if (!j) EGOL.p = null; return j; })));
    if (EH) { const RS = new Map(); S.forEach((s, i) => { if (s.r && s.p[0] > 39.3 && s.p[0] < 40.5 && s.p[1] > 31.8 && s.p[1] < 33.8 && !RS.has(s.r)) RS.set(s.r, i); });
      const wd = istNow().wd, di = wd === 6 ? 1 : wd === 0 ? 2 : 0;
      for (const [k, [n, D, cn]] of Object.entries(EH)) { const c = cn ? cn[di] : 20; if (!c) continue; const seq = []; for (const r of D) { const i = RS.get(r); if (i != null && seq[seq.length - 1] !== i) seq.push(i); }
        // bekleme: o günün sefer sayısından ortalama aralığın yarısı (az seferli hat seçilmesin)
        if (seq.length >= 3 && seq.length >= D.length * .55) L.push({ ref: k, name: n, mode: "otobus", col: "", uni: true, seq, ego: 1, w: Math.min(60, Math.max(3, 960 / c / 2)) }); } } }
  const G = new Map(), gk = (p) => `${Math.floor(p[0] / .004)}_${Math.floor(p[1] / .005)}`; S.forEach((s, i) => { const k = gk(s.p); if (!G.has(k)) G.set(k, []); G.get(k).push(i); });
  const near = (p, m) => { const R2 = Math.ceil(m / 400) + 1, a0 = Math.floor(p[0] / .004), o0 = Math.floor(p[1] / .005), out = []; for (let a = a0 - R2; a <= a0 + R2; a++) for (let o = o0 - R2; o <= o0 + R2; o++) for (const i of G.get(`${a}_${o}`) || []) { const d = km(p, S[i].p) * 1000; if (d <= m) out.push([i, d]); } return out; };
  const at = S.map(() => []); L.forEach((l, li) => l.seq.forEach((s, j) => at[s].push([li, j])));
  const K = 4, N = S.length * K;
  const run = (o = {}) => { const ok = o.ok || (() => true), wf = o.wf || 1, bp = o.bp || 0, cost = new Float64Array(N).fill(Infinity), prev = new Array(N), done = new Uint8Array(N), H = [];
  const push = (st, c, pv) => { if (c < cost[st]) { cost[st] = c; prev[st] = pv; let i = H.length; H.push([c, st]); while (i) { const q = (i - 1) >> 1; if (H[q][0] <= H[i][0]) break; [H[q], H[i]] = [H[i], H[q]]; i = q; } } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
  for (const [i, d] of ac) push(i * K, d * 1.3 / 80 * wf, { w: 1, d });
  let best = Infinity, bst = -1, it = 0;
  while (H.length && it++ < 400000) { const [c, st] = pop(); if (done[st] || c > cost[st]) continue; done[st] = 1; if (c >= best) break; const s = Math.floor(st / K), k = st % K;
    if (k > 0 && EG.has(s)) { const t = c + EG.get(s) * 1.3 / 80 * wf; if (t < best) { best = t; bst = st; } }
    if (k > 0) for (const [t2, d] of near(S[s].p, 400)) if (t2 !== s) push(t2 * K + k, c + d * 1.3 / 80 * wf + 1, { tr: st, d });
    if (k < K - 1) for (const [li, j] of at[s]) { const l = L[li]; if (!ok(l)) continue; const M = PTM[l.mode] || PTM.otobus, w = (l.w ?? M[2]) + (k ? 2 : 0) + bp;
      for (const dir of l.uni ? [1] : [1, -1]) { let r = 0; for (let x = j + dir; x >= 0 && x < l.seq.length; x += dir) { r += km(S[l.seq[x - dir]].p, S[l.seq[x]].p) * 1.25 / M[1] * 60 + .4; push(l.seq[x] * K + k + 1, c + w + r, { li, a: j, b: x, from: st }); } } } }
  if (bst < 0) return null;
  const legs = []; let st = bst; legs.unshift({ t: "w", a: S[Math.floor(st / K)].p, b: B, d: EG.get(Math.floor(st / K)), to: S[Math.floor(st / K)].n });
  while (st != null) { const pv = prev[st]; if (!pv) break; const s = Math.floor(st / K);
    if (pv.w) { legs.unshift({ t: "w", a: A, b: S[s].p, d: pv.d, toStop: S[s].n, toRef: S[s].r }); break; }
    if (pv.tr != null) { const f = Math.floor(pv.tr / K); legs.unshift({ t: "w", a: S[f].p, b: S[s].p, d: pv.d, tr: 1, toStop: S[s].n, toRef: S[s].r }); st = pv.tr; continue; }
    const l = L[pv.li], dir = pv.b > pv.a ? 1 : -1, P = []; for (let x = pv.a; x !== pv.b + dir; x += dir) P.push(l.seq[x]);
    const sA = P[0], sB = P[P.length - 1], alt = []; // aynı duraktan aynı durağa giden başka hatlar (tarifeye göre en erken gelen seçilir)
    L.forEach((l2, j2) => { if (j2 === pv.li || alt.length >= 12) return; const i1 = l2.seq.indexOf(sA); if (i1 < 0) return; let i2 = l2.seq.indexOf(sB, i1 + 1); if (i2 < 0 && !l2.uni) { i2 = l2.seq.lastIndexOf(sB, i1 - 1); if (i2 < 0 || i2 >= i1) return; } else if (i2 < 0) return; alt.push({ l: l2, head: S[i2 > i1 ? l2.seq[l2.seq.length - 1] : l2.seq[0]].n || l2.name }); });
    legs.unshift({ t: "r", l, P: P.map((i) => S[i]), head: S[dir > 0 ? l.seq[l.seq.length - 1] : l.seq[0]].n || l.name, alt }); st = pv.from; }
  return legs; };
  let ac = near(A, 900); if (!ac.length) ac = near(A, 1600); let eg = near(B, 900); if (!eg.length) eg = near(B, 1600); if (!ac.length || !eg.length) return { yok: 2 };
  const EG = new Map(eg.map(([i, d]) => [i, d]));
  // Gerçek süre tahmini (cezasız): yürüme + bekleme + yolculuk; aktarma yürüyüşüne +1 dk
  const real = (legs) => legs.reduce((t, x) => { if (x.t === "w") return t + (x.d || 0) * 1.3 / 80 + (x.tr ? 1 : 0); const M = PTM[x.l.mode] || PTM.otobus; let r = x.l.w ?? M[2]; for (let i = 1; i < x.P.length; i++) r += km(x.P[i - 1].p, x.P[i].p) * 1.25 / M[1] * 60 + .4; return t + r; }, 0);
  const RAILM = (l) => !["otobus", "dolmus", "metrobus"].includes(l.mode), BUSM = (l) => ["otobus", "dolmus", "metrobus"].includes(l.mode);
  // Seçenekler (25.11.2026, kullanıcı: "aynı yere hem metro hem otobüs gidiyor olabilir; farklı opsiyonlar sun"): en hızlı, en az aktarma, en az yürüme, yalnız raylı, yalnız otobüs
  const V = [["hizli", "En hızlı", {}], ["aktarma", "En az aktarma", { bp: 14 }], ["yurume", "En az yürüme", { wf: 3.2 }], ["rayli", "Raylı sistem", { ok: RAILM }], ["otobus", "Otobüsle", { ok: BUSM }]];
  const opts = [], seen = new Set();
  for (const [id, ad, o] of V) { const legs = run(o); if (!legs) continue; const R2 = legs.filter((x) => x.t === "r"), sig = R2.map((x) => x.l.ref + ":" + x.P[0].n + ">" + x.P[x.P.length - 1].n).join("|"); if (!R2.length || seen.has(sig)) { const same = opts.find((q) => q.sig === sig); if (same && !same.tags.includes(ad)) same.tags.push(ad); continue; } seen.add(sig);
    const wm = legs.filter((x) => x.t === "w").reduce((a, x) => a + (x.d || 0), 0); opts.push({ id, tags: [ad], sig, legs, min: Math.round(real(legs)), tr: Math.max(0, R2.length - 1), walkM: Math.round(wm) }); }
  if (!opts.length) return { yok: 3 };
  opts.sort((a, b) => a.min - b.min); const b0 = opts[0], bw = Math.min(...opts.map((q) => q.walkM)); // mantıksız seçenek (çok uzun, çok yürüyüşlü) gösterilmez
  for (let i = opts.length - 1; i > 0; i--) { const q = opts[i]; if (q.min > Math.max(b0.min * 1.8, b0.min + 25) || q.walkM > Math.max(1600, bw * 2.2)) opts.splice(i, 1); }
  const legs = opts[0].legs, best = opts[0].min;
  return { legs, min: Math.round(best), walkMin: Math.round(ptWalk(A, B)), opts };
}
/* EGO hareket saatleri (19.11.2026, kullanıcı: "Ankara'da otobüs ve metroların tahmini geliş saatlerinden yararlan"):
   scraper/ego-saat.mjs → yv/ego/<hat>.json {n, km, dk, k, t:[hafta içi, cumartesi, pazar] (ilk duraktan kalkış, dakika), s:[[durak no, ad]]}.
   Durağa geliş = kalkış + uçtan uca süre × (durak sırası / durak sayısı). Canlı değil, tarifeye göre; trafik hesaba girmez. Yalnızca Ankara. */
const EGOI = { p: null }, EGOF = new Map();
const egoIdx = () => EGOI.p || (EGOI.p = fetch("/yv/ego/index.json").then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { if (!j) EGOI.p = null; return j; }));
const egoHat = (h) => { if (!EGOF.has(h)) EGOF.set(h, fetch(`/yv/ego/${h.replace(/[^\w-]/g, "_")}.json`).then((r) => r.ok ? r.json() : null).catch(() => null)); return EGOF.get(h); };
const istNow = () => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value])); return { m: +p.hour * 60 + +p.minute, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) }; };
const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const egoStop = (x) => fold(String(x).normalize("NFD").replace(/[\u0302\u0301\u0300]/g, "")).replace(/\b(metro|metrosu|istasyonu|istasyon|ankaray|duragi|durak|m[0-9]|a1|1)\b/g, " ").replace(/\s+/g, " ").trim();
async function egoPlan(P, A) {
  if (!(A[0] > 39.3 && A[0] < 40.5 && A[1] > 31.8 && A[1] < 33.8)) return null;  // yalnızca Ankara
  const ix = await egoIdx(); if (!ix?.h) return null; const keys = Object.keys(ix.h);
  const now = istNow(); let t = now.m, day = 0, any = false; const out = [];
  const cands = (l) => { const r = String(l.ref || "").toUpperCase().replace(/\s+/g, ""); if (!r) return []; if (l.ego) return [l.ref];
    if (l.mode === "metro") return keys.filter((k) => k.startsWith((/^M[123]$/.test(r) ? "M1" : r) + "-"));  // EGO M1–M2–M3'ü tek hat (Koru–Törekent) olarak yayınlıyor
    if (l.mode === "hafif") return keys.filter((k) => /^A1-/.test(k));
    return keys.filter((k) => k === r || k.startsWith(r + "-") || r.startsWith(k + "-")).slice(0, 6); };
  for (let i = 0; i < P.legs.length; i++) { const x = P.legs[i];
    if (x.t === "w") { t += Math.max(1, (x.d || 0) * 1.3 / 80); continue; }
    const M = PTM[x.l.mode] || PTM.otobus, km0 = x.P.slice(1).reduce((a, q, j) => a + km(x.P[j].p, q.p), 0), est = km0 * 1.25 / M[1] * 60 + .4 * (x.P.length - 1);
    let best = null;
    for (const [lx, head] of [[x.l, x.head], ...(x.alt || []).map((a) => [a.l, a.head])]) for (const k of cands(lx)) { const H = await egoHat(k); if (!H?.s?.length || !H.dk) continue;
      const find = (q) => { if (q.r) { const j = H.s.findIndex((s) => s[0] === q.r); if (j >= 0) return j; } const f = egoStop(q.n || ""); return f ? H.s.findIndex((s) => { const g = egoStop(s[1]); return g && (g === f || g.startsWith(f) || f.startsWith(g)); }) : -1; };
      const a = find(x.P[0]), b = find(x.P[x.P.length - 1]); if (a < 0 || b <= a) continue;
      const N = Math.max(1, H.s.length - 1), off = H.dk * a / N, rd = Math.max(1, H.dk * (b - a) / N);
      const T = (dd) => { const wd = (now.wd + dd) % 7; return H.t[wd === 6 ? 1 : wd === 0 ? 2 : 0] || []; };
      let arr = null, nx = null, yarin = false; for (let dd = 0; dd < 2 && arr == null; dd++) { const L = T(day + dd).map((m) => m + off + (day + dd) * 1440).filter((m) => m >= t - .5).sort((p, q) => p - q); if (L.length) { arr = L[0]; nx = L[1] ?? null; yarin = day + dd > 0; } }
      if (arr == null) continue;
      if (!best || arr + rd < best.arr + best.rd) best = { k, arr, nx, rd, yarin, last: nx == null, n: H.n, l: lx, head };
    }
    if (best) { any = true; out[i] = best; t = best.arr + best.rd; if (best.arr >= 1440 * (day + 1)) day++; }
    else { out[i] = null; t += M[2] + est; }
  }
  if (!any) return null;
  return { legs: out, arrive: t, now: now.m, yarin: out.some((g) => g?.yarin) };
}
function routeSheet(e, v, city) {
  /* Yol tarifi + navigasyon (kullanıcı isteği, 16.11.2026 02:17: "kişi yürüdükçe orada da ilerlesin; araçla ya da yaya; güzel yapalım").
     Önce özet: süre, mesafe, varış, adım adım tarif. "Başla" ile navigasyon: harita tam ekran, seni izler; üstte sıradaki dönüş ve kalan metre,
     altta kalan süre, mesafe, varış saati; geçtiğin yol solar; dönüşe yaklaşınca titreşim + kısa ses ve istersen Türkçe sesli yönlendirme (telefonun kendi sesi);
     yoldan saparsan yeniden hesaplanır; ekran kapanmaz (izin verirse). Konum yalnızca yol hesaplamak için yol sunucusuna gider. */
  haptic(6);
  const sh = sheet(`<div class="pn rtp" role="dialog" aria-label="Yol tarifi">
    <div class="rtm map" id="rmap"></div>
    <div class="rtop" id="rtop"><div class="hd"><button type="button" class="rbk" data-close aria-label="Geri"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="rth"><small id="rtk">Yol tarifi</small><b id="rtn">${esc(e.venue || "")}</b></span><button type="button" class="rsw" id="rsw" aria-label="Yönü değiştir"><svg viewBox="0 0 24 24"><path d="M8 4v15M4.5 7.5 8 4l3.5 3.5M16 20V5M12.5 16.5 16 20l3.5-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
    <div class="rfr" id="rfr" role="tablist" aria-label="Nereden"></div><div class="rctl"><button type="button" id="r3d" aria-label="3B görünüm">3B</button><button type="button" id="rfit" aria-label="Bütün yolu göster"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="rfx" id="rfx" hidden><label class="fvi"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><input id="rfi" placeholder="Semt, adres ya da yer adı" enterkeyhint="search" autocomplete="off"></label><div class="rfl" id="rfl"></div></div></div>
    <div class="nvt" id="nvt"><i></i><span><b></b><small></small></span></div>
    <div class="nvb" id="nvb"><span><b id="nvm"></b><small id="nvk"></small></span><button type="button" class="nvv" id="nvv" aria-label="Sesli yönlendirme"></button><button type="button" class="nve" id="nve">Bitir</button></div>
    <button type="button" class="nvc" id="nvc" aria-label="Konumuma dön"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="currentColor"/></svg></button>
    <div class="bd2 rcd" id="rcd"><button type="button" class="rgr" id="rgr" aria-label="Ayrıntıları aç"></button><div class="rseg" role="tablist" style="--n:${PT_ON ? 4 : 3}"><i></i><button type="button" data-m="foot" role="tab">Yürü</button><button type="button" data-m="bike" role="tab">Bisiklet</button><button type="button" data-m="car" role="tab">Araba</button>${PT_ON ? '<button type="button" data-m="pt" role="tab">Toplu taşıma</button>' : ""}</div>
    <div class="rsum" id="rsum"><span class="sk" style="display:block;height:52px;border-radius:14px"></span></div>
    <ol class="rst" id="rst"></ol>
    <p class="rnote">Yol OpenStreetMap verisiyle hesaplanır; trafik hesaba katılmaz. Bunun için yalnızca başlangıç ve varış noktası OpenStreetMap'in yol sunucusuna gider, bizde saklanmaz.</p></div></div>`, "mn rt");
  let lw = null, map = null, line = null, done = null, me = null, watch = null, mode = null, from = null, R = null, S = [], nav = false, C = [], cum = [], sIdx = [], ni = 0, lastStep = -1, warned = -1, wl = null, follow = true;
  let voice = store.get("nvny-sesli") !== "0";
  const dest = [v.lat, v.lng], seg = sh.querySelector(".rseg"), sum = sh.querySelector("#rsum"), st = sh.querySelector("#rst");
  let fl = null; sum.addEventListener("click", async (ev) => { if (!ev.target.closest("#rfm") || fl || !map || C.length < 2) return; haptic(8); snd.sel?.(); await Promise.all([adaJ(), bjs()]); if (fl || !document.body.contains(sh)) return; follow = false; sh.classList.add("film"); map.resize(); fl = window.NVA.film(map, maplibregl, { C, S: S.map((s, i) => ({ at: cum[sIdx[i]] || 0, a: arrow(s), t: stepTxt(s, toName()), n: s.name || "" })), name: toName(), root: sh.querySelector(".rtp"), lite: (navigator.hardwareConcurrency || 8) < 5 || (navigator.deviceMemory || 8) < 4, tick: () => tick(), canlan: (d, bitti) => adaOpen(map, [d[1], d[0]], toName(), bitti), onEnd: () => { fl = null; sh.classList.remove("film"); map.resize(); fitRoute(); } }); if (!fl) { sh.classList.remove("film"); map.resize(); toast("Bu yol film için çok kısa.", 2200); } });
  /* Yol tarifi doğrudan tam ekran haritada (kullanıcı, 16.11.2026 15:31–15:32: "ayrı panelde küçük kalmayalım, haritada özgürüz; hem yol tarifi hem 3B").
     Apple Haritalar gibi: üstte cam kart (geri, varış, nereden), altta sürüklenen cam kart (kısa: süre + Başla; açık: adım adım tarif).
     Harita her yöne serbest: iki parmakla döndür/eğ, "3B" ile eğik bakış, çerçeve düğmesiyle bütün yol. Kart yalnızca transform ile kayar. */
  const card = $("#rcd", sh), rtop = $("#rtop", sh), wide = () => innerWidth >= 700; let cOpen = false, cTy = 9999, d3 = false;
  const cMini = () => Math.min(card.offsetHeight, st.offsetTop + 14);
  const cSet = (open, anim = true) => { cOpen = open; const H = card.offsetHeight; cTy = open || wide() ? 0 : Math.max(0, H - cMini());
    card.style.transition = anim ? "transform .44s cubic-bezier(.32,.72,0,1)" : "none"; card.style.transform = `translate3d(0,${cTy}px,0)`; card.classList.toggle("open", open || wide());
    sh.style.setProperty("--cb", (wide() ? 0 : H - cTy) + "px"); };
  card.style.transform = "translate3d(0,110%,0)"; requestAnimationFrame(() => requestAnimationFrame(() => cSet(false)));
  { let y0 = 0, dY = 0, dr = false, t0 = 0;
    card.addEventListener("touchstart", (ev) => { if (wide() || (cOpen && card.scrollTop > 0) || ev.target.closest("input,.rseg,.nvs")) return; dr = true; y0 = ev.touches[0].clientY; dY = 0; t0 = performance.now(); }, { passive: true });
    card.addEventListener("touchmove", (ev) => { if (!dr) return; dY = ev.touches[0].clientY - y0; if (cOpen && dY < 0) return; if (Math.abs(dY) > 6) { const ty = Math.min(card.offsetHeight - 40, Math.max(0, cTy + dY)); card.style.transition = "none"; card.style.transform = `translate3d(0,${ty}px,0)`; } }, { passive: true });
    card.addEventListener("touchend", () => { if (!dr) return; dr = false; if (Math.abs(dY) < 7) { cSet(cOpen); return; } const vv = dY / Math.max(1, performance.now() - t0), H = card.offsetHeight;
      const open = vv < -.35 ? true : vv > .35 ? false : cTy + dY < (H - cMini()) / 2; if (open !== cOpen) { haptic(5); snd.sel?.(); } cSet(open); }, { passive: true }); }
  $("#rgr", sh).addEventListener("click", () => { haptic(5); snd.sel?.(); cSet(!cOpen); });
  addEventListener("resize", () => cSet(cOpen, false));
  const oldClose = sh.close; sh.close = () => { fl?.stop(); lw?.stop(); if (watch != null) navigator.geolocation.clearWatch(watch); try { wl?.release(); speechSynthesis.cancel(); } catch {} oldClose(); };
  const setMode = (m) => { mode = m; seg.style.setProperty("--i", ["foot", "bike", "car", "pt"].indexOf(m)); seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.m === m)); };
  /* Yönü değiştir (kullanıcı, 16.11.2026 20:02: "haritada istediğim her yere yol tarifi"): ⇅ ile gidiş ↔ dönüş. Ters yönde "Başla" yok (canlı yol gösterme yalnızca konumundan çıkarken). */
  let rev = false; const srcName = () => src === "me" ? "Konumun" : src === "x" ? xPlace?.n || "Seçilen yer" : F.find((x) => x.id === src)?.n || "";
  const toName = () => rev ? srcName() : e.venue || "";
  const hdr = () => { $("#rtk", sh).textContent = rev ? `${e.venue || ""} → ` : "Yol tarifi"; $("#rtn", sh).textContent = toName(); sh.classList.toggle("fixed", src !== "me" || rev); sh.classList.toggle("rev", rev); };
  const say = (t) => { if (!voice || !("speechSynthesis" in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/<[^>]+>/g, "")); u.lang = "tr-TR"; u.rate = 1.02; speechSynthesis.speak(u); } catch {} };
  const vIcon = () => { $("#nvv", sh).innerHTML = voice ? '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'; };
  const prep = () => { // yol noktaları, birikimli mesafe, her adımın yol üzerindeki yeri
    C = R.geometry.coordinates.map((c) => [c[1], c[0]]); cum = [0]; for (let i = 1; i < C.length; i++) cum.push(cum[i - 1] + km(C[i - 1], C[i]) * 1000);
    let j = 0; sIdx = S.map((s) => { const p = [s.maneuver.location[1], s.maneuver.location[0]]; let b = j, bd = 1e9; for (let i = j; i < C.length; i++) { const d = km(p, C[i]); if (d < bd) { bd = d; b = i; } if (bd < .005 && i > b + 5) break; } j = b; return b; });
    ni = 0; lastStep = -1; warned = -1;
  };
  let ptLast = null, ptSel = 0;
  const ptPaint = async (A, B, pick) => { R = null; C = [];
    let P; if (pick != null && ptLast && ptLast.A === A && ptLast.B === B) { ptSel = pick; const o = ptLast.P.opts[pick]; P = { ...ptLast.P, legs: o.legs, min: o.min }; }
    else { try { P = await ptRoute(A, B); } catch { P = { yok: 9 }; } ptSel = 0; ptLast = P.opts ? { A, B, P } : null; }
    if (mode !== "pt") return;
    if (P.yok || !P.legs) { sum.innerHTML = `<div class="rerr">${P.yok === 1 ? "Bu bölgede açık hat verisi yok." : "Bu iki nokta arasında hat bulamadık."} Yürüyerek ~${durTxt(Math.max(1, Math.round(ptWalk(A, B))))}.</div>`; ptDraw([]); return; }
    const rides = P.legs.filter((x) => x.t === "r"), tr = Math.max(0, rides.length - 1);
    const paint = (E) => { if (E?.yarin) E = { ...E, arrive: null }; const LN = (x, i) => E?.legs[i]?.l || x.l, HD = (x, i) => E?.legs[i]?.head || x.head;
      const at = E?.arrive != null ? hm(E.arrive) : new Date(Date.now() + P.min * 60e3).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }), dur = E?.arrive != null ? Math.max(1, Math.round(E.arrive - E.now)) : P.min;
    const pill = (l, noE) => { const M = PTM[l.mode] || PTM.otobus; return `<span class="ptl" style="--c:${l.col || (l.mode === "metro" ? "#e11d48" : l.mode === "tram" ? "#0ea5e9" : l.mode === "otobus" ? "#2563eb" : "#64748b")}">${noE ? "" : M[0] + " "}<b>${esc(l.ref || M[3])}</b></span>`; };
    const OP = P.opts || [], opH = OP.length > 1 ? `<div class="pto" role="tablist">${OP.map((o, i) => `<button type="button" role="tab" data-po="${i}" class="${i === ptSel ? "on" : ""}" aria-selected="${i === ptSel}"><b>~${durTxt(o.min)}</b><small>${esc(o.tags.join(" · "))}</small><span class="ptc">${o.legs.filter((x) => x.t === "r").map((x) => pill(x.l)).join("<i>›</i>")}</span><small>${o.tr ? o.tr + " aktarma" : "Aktarmasız"} · ${mTxt(o.walkM)} yürüme</small></button>`).join("")}</div>` : "";
    sum.innerHTML = opH + `<div class="rs1"><b>~${durTxt(dur)}</b><span>${tr ? `${tr} aktarma` : "Aktarmasız"} · varış ~${at}</span></div><div class="ptc">${P.legs.map((x, i) => x.t === "r" ? pill(LN(x, i)) : "").filter(Boolean).join('<i>›</i>')}</div>${E?.yarin ? `<small class="go ptz2">Bu yolda bugün için sefer kalmamış olabilir; saatlere bak.</small>` : ""}${P.walkMin <= dur ? `<small class="go">Yürüyerek ~${durTxt(P.walkMin)}; yürümek daha kısa sürebilir.</small>` : ""}<small class="ptn">${E ? "Saatler EGO hareket saatlerine göre tahmindir; trafik hesaba girmez." : "Saatler gösterilmez; süre tahminidir."} Hat bilgisi: OpenStreetMap, belediyelerin açık verisi${E ? ", EGO" : ""}.</small>`;
    const RAIL = (l) => l && !["otobus", "dolmus"].includes(l.mode), yer = (l) => !l ? "durak" : l.mode === "vapur" ? "iskele" : RAIL(l) ? "istasyon" : "durak", noB = (r, l) => r ? ` <span class="ptd">Durak no ${esc(r)}</span>` : RAIL(l) ? ` <span class="ptd">${esc(l.ref || (PTM[l.mode] || PTM.otobus)[3])} ${{ istasyon: "istasyonu", iskele: "iskelesi", durak: "durağı" }[yer(l)]}</span>` : "";
    st.innerHTML = P.legs.map((x, i) => { if (x.t === "w") { const last = i === P.legs.length - 1, nx = P.legs[i + 1]?.l, wm = `${mTxt(x.d)} · ~${durTxt(Math.max(1, Math.round(x.d * 1.3 / 80)))}`;
        if (last) return `<li class="ptw pte"><i>🏁</i><span>Varış: <b>${esc(toName() || "varış yeri")}</b><small>${x.d >= 40 ? `İnince ${wm} yürü · ` : ""}varış ~${at}</small></span></li>`;
        if (x.d < 40 && !x.tr) return "";
        return `<li class="ptw"><i>🚶</i><span>${x.tr ? `Aktarma: <b>${esc(x.toStop || "yakındaki " + yer(nx))}</b> ${yer(nx) === "durak" ? "durağına" : yer(nx) === "iskele" ? "iskelesine" : "istasyonuna"} geç` : `${yer(nx) === "durak" ? "Durağa" : yer(nx) === "iskele" ? "İskeleye" : "İstasyona"} yürü: <b>${esc(x.toStop || "en yakın " + yer(nx))}</b>`}${noB(x.toRef, nx)}<small>${wm}</small></span></li>`; }
      const g = E?.legs[i], tm = g ? `<em class="pts${g.yarin ? " ptz" : ""}">🕒 ${g.yarin ? `Bugün sefer kalmadı · yarın ~${hm(g.arr)}` : `Durağa tarifeye göre ~${hm(g.arr)}${g.nx != null ? ` · sonra ${hm(g.nx)}` : " · son sefer"}`}</em>` : "";
      const xl = LN(x, i);
      return `<li class="ptr" style="--c:${xl.col || "#8b5cf6"}"><i>${(PTM[xl.mode] || PTM.otobus)[0]}</i><span>${pill(xl, 1)} <b>${esc(HD(x, i))}</b> yönü${tm}<small>Biniş: ${esc(x.P[0].n || "—")}${x.P[0].r ? ` (durak no ${esc(x.P[0].r)})` : ""} · İniş: <b>${esc(x.P[x.P.length - 1].n || "—")}</b>${x.P[x.P.length - 1].r ? ` (durak no ${esc(x.P[x.P.length - 1].r)})` : ""} · ${x.P.length - 1} ${RAIL(x.l) ? "istasyon" : "durak"}</small>${x.l.mode === "otobus" || x.l.mode === "dolmus" ? `<details class="ptdl"><summary>Duraklar</summary><ol>${x.P.map((q) => `<li>${esc(q.n || "Durak")}${q.r ? ` <span class="ptd">${esc(q.r)}</span>` : ""}</li>`).join("")}</ol></details>` : ""}</span></li>`; }).join("");
    sum.querySelectorAll("[data-po]").forEach((b) => b.addEventListener("click", (ev) => { ev.stopPropagation(); const i = +b.dataset.po; if (i === ptSel) return; haptic(6); snd.sel?.(); ptPaint(A, B, i); }));
    }; paint(null);
    C = [A, ...rides.flatMap((r) => r.P.map((q) => q.p)), B]; ptDraw(P.legs); cSet(cOpen, false); fitRoute();
    // tarife saatleri arkada gelir; ekran açık kaldıkça dakikada bir tazelenir (hesap küçük, takılma yok)
    const my = ++ptRun, tick = () => { if (my !== ptRun || mode !== "pt" || !st.isConnected) return; egoPlan(P, A).then((E) => { if (E && my === ptRun && mode === "pt") paint(E); }).catch(() => {}); setTimeout(tick, 60e3); }; tick(); };
  let ptRun = 0;
  const ptDraw = (legs) => { if (!mapOk) return; const LLc = (c) => [c[1], c[0]];
    map.getSource("pt")?.setData({ type: "FeatureCollection", features: legs.flatMap((x) => x.t === "w" ? [{ type: "Feature", properties: { w: 1, c: "#c7c7cc" }, geometry: { type: "LineString", coordinates: [LLc(x.a), LLc(x.b)] } }] : [{ type: "Feature", properties: { w: 0, c: x.l.col || "#a78bfa" }, geometry: { type: "LineString", coordinates: x.P.map((q) => LLc(q.p)) } }, ...[x.P[0], x.P[x.P.length - 1]].map((q) => ({ type: "Feature", properties: { s: 1, c: x.l.col || "#a78bfa" }, geometry: { type: "Point", coordinates: LLc(q.p) } }))]) }); };
  const paint = async () => {
    sum.innerHTML = `<span class="sk" style="display:block;height:52px;border-radius:14px"></span>`; st.innerHTML = "";
    const A = rev ? dest : from, B = rev ? from : dest; hdr(); rDraw();
    if (mode === "pt") return ptPaint(A, B);
    try { R = await routeOf(mode, A, B); }
    catch { sum.innerHTML = `<div class="rerr">Yol şu an hesaplanamadı. Kuş uçuşu ${kmTxt(km(from, dest))}. <button type="button" class="rerb">Tekrar dene</button></div>`; $(".rerb", sum).addEventListener("click", paint); return; }
    S = R.legs[0].steps.filter((s, i, a) => !(s.maneuver.type === "new name" && s.distance < 15 && i < a.length - 1)); prep();
    const min = Math.max(1, Math.round(R.duration / 60)), at = new Date(Date.now() + R.duration * 1000).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
    const late = !rev && e.t && e.d === nowIST().d ? (() => { const [h, mm] = e.t.split(":").map(Number), leave = h * 60 + mm - min - 10, n = nowIST().hm.split(":").map(Number), now = n[0] * 60 + n[1]; return leave >= now ? `<small class="go">Tam yetişmek için en geç <b>${String(Math.floor(leave / 60)).padStart(2, "0")}:${String(leave % 60).padStart(2, "0")}</b>'da çık</small>` : now < h * 60 + mm ? `<small class="go late">Başlamasına ${h * 60 + mm - now} dk var, hemen çıkmalısın</small>` : ""; })() : "";
    sum.innerHTML = `<div class="rs1"><b>${durTxt(min)}</b><span>${mTxt(R.distance)} · varış ${at}</span><button type="button" class="nvs" id="nvs">Başla</button></div>${late}<button type="button" class="rfm" id="rfm"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>Yolu izle</button>`;
    st.innerHTML = S.map((s, i) => `<li data-i="${i}"><i>${arrow(s)}</i><span>${stepTxt(s, toName())}${s.distance >= 5 && s.maneuver.type !== "arrive" ? `<small>${mTxt(s.distance)}</small>` : ""}</span></li>`).join("");
    st.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => { const s = S[+li.dataset.i]; if (map) map.flyTo({ center: s.maneuver.location, zoom: 17, duration: 600 }); haptic(4); }));
    $("#nvs", sum).addEventListener("click", start);
    cSet(cOpen, false); rDraw(); if (!nav) fitRoute();
    if (nav) update(from, true);
  };
  function update(p, force) { // navigasyon sırasında her konum değişiminde
    if (!R || !C.length) return;
    let b = ni, bd = 1e9; for (let i = Math.max(0, ni - 5); i < Math.min(C.length, ni + 60); i++) { const d = km(p, C[i]); if (d < bd) { bd = d; b = i; } }
    if (b >= ni || force) ni = b;
    const left = Math.max(0, cum[cum.length - 1] - cum[ni] + bd * 1000), k = sIdx.findIndex((x, i) => i > 0 && x > ni), step = k < 0 ? S.length - 1 : k, toTurn = Math.max(0, cum[sIdx[step]] - cum[ni]);
    const s = S[step], tx = stepTxt(s, toName());
    const T = $("#nvt", sh); T.querySelector("i").innerHTML = arrow(s); T.querySelector("b").textContent = s.maneuver.type === "arrive" ? "Varış" : mTxt(toTurn); T.querySelector("small").innerHTML = tx;
    const min = Math.max(1, Math.round(R.duration * (left / Math.max(1, R.distance)) / 60)), at = new Date(Date.now() + min * 60e3).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
    $("#nvm", sh).textContent = durTxt(min); $("#nvk", sh).textContent = `${mTxt(left)} · varış ${at}`;
    rSet(C.slice(0, ni + 1).concat([p]), [p].concat(C.slice(ni + 1)));
    if (step !== lastStep) { lastStep = step; T.classList.remove("pop"); void T.offsetWidth; T.classList.add("pop"); if (!force) { snd.sel?.(); haptic(8); } say(`${mTxt(toTurn)} sonra, ${tx}`); }
    if (toTurn < (mode === "car" ? 120 : mode === "bike" ? 60 : 35) && warned !== step && s.maneuver.type !== "arrive") { warned = step; haptic(25); snd.ok(); say(tx); }
    if (left < 25) { T.querySelector("b").textContent = "Vardın 🎉"; T.querySelector("small").innerHTML = esc(e.venue || ""); if (warned !== -2) { warned = -2; snd.ok(); haptic(40); say("Vardın. İyi eğlenceler!"); } }
    // 3B navigasyon (kullanıcı, 09:22): Apple Haritalar gibi eğik bakış, harita gidiş yönüne döner
    if (follow && mapOk) map.easeTo({ center: [p[1], p[0]], zoom: Math.max(map.getZoom(), mode === "car" ? 16.6 : mode === "bike" ? 17 : 17.6), pitch: 58, bearing: brg(p, C[Math.min(C.length - 1, ni + 4)]), duration: 900 });
  }
  async function start() {
    if (!R || rev || src !== "me") return; nav = true; follow = true; sh.classList.add("nav"); snd.push?.(); haptic(12); vIcon();
    try { wl = await navigator.wakeLock?.request("screen"); } catch {}
    setTimeout(() => { map?.resize(); update(from, true); }, 360);
  }
  function stop() { nav = false; sh.classList.remove("nav"); try { wl?.release(); speechSynthesis.cancel(); } catch {} setTimeout(() => { map?.resize(); fitRoute(); }, 360); haptic(6); }
  $("#nve", sh).addEventListener("click", stop);
  $("#nvv", sh).addEventListener("click", () => { voice = !voice; store.set("nvny-sesli", voice ? "1" : "0"); vIcon(); snd.sel?.(); if (!voice) try { speechSynthesis.cancel(); } catch {} });
  $("#nvc", sh).addEventListener("click", () => { follow = true; sh.classList.remove("free"); if (from && mapOk) { if (nav) update(from, true); else map.easeTo({ center: [from[1], from[0]], zoom: 17, duration: 700 }); } haptic(5); });
  seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.m === mode || !from) return; snd.sel?.(); haptic(4); setMode(b.dataset.m); store.set("nvny-rota-mod", b.dataset.m); paint(); }));
  // harita (MapLibre; 3B binalar, açık/koyu tema haritadaki seçimle aynı)
  let mapOk = false; const LL = (c) => [c[1], c[0]], ln = (P) => ({ type: "Feature", geometry: { type: "LineString", coordinates: P.map(LL) }, properties: {} });
  function rSet(D, Lc) { if (!mapOk) return; map.getSource("rt-d")?.setData(ln(D)); map.getSource("rt-l")?.setData(ln(Lc)); }
  function rDraw() { if (!mapOk) return; const pt = mode === "pt"; if (!pt) { rSet([], C); map.getSource("pt")?.setData({ type: "FeatureCollection", features: [] }); } else rSet([], []);
    map.setLayoutProperty("rt-f", "visibility", mode === "foot" ? "visible" : "none"); map.setLayoutProperty("rt-c", "visibility", mode === "foot" || pt ? "none" : "visible"); map.setLayoutProperty("rt-cs", "visibility", pt ? "none" : "visible"); }
  function fitRoute() { if (!mapOk || !C.length) return; const b = C.reduce((b, c) => [[Math.min(b[0][0], c[1]), Math.min(b[0][1], c[0])], [Math.max(b[1][0], c[1]), Math.max(b[1][1], c[0])]], [LL(C[0]), LL(C[0])]);
    const pad = wide() ? { top: 60, bottom: 60, left: card.offsetWidth + 70, right: 70 } : { top: rtop.offsetTop + rtop.offsetHeight + 30, bottom: Math.min(innerHeight * .5, card.offsetHeight - (cTy > 2000 ? card.offsetHeight - cMini() : cTy)) + 30, left: 40, right: 72 };
    map.fitBounds(b, { padding: pad, pitch: d3 ? 55 : 0, bearing: d3 ? map.getBearing() : 0, duration: 700 }); }
  $("#r3d", sh).addEventListener("click", (ev) => { if (!mapOk) return; d3 = !d3; ev.currentTarget.classList.toggle("on", d3); haptic(6); snd.sel?.(); map.easeTo({ pitch: d3 ? 60 : 0, bearing: d3 ? (map.getBearing() || -18) : 0, duration: 750 }); });
  $("#rfit", sh).addEventListener("click", () => { haptic(5); snd.sel?.(); follow = false; fitRoute(); });
  Promise.all([mlgl(), mStyle(mTheme() === "acik" ? "acik" : "koyu")]).then(([, style]) => { const el = sh.querySelector("#rmap"); if (!document.body.contains(el)) return;
    map = new maplibregl.Map({ container: el, style, center: LL(dest), zoom: 15, maxPitch: 70, attributionControl: { compact: true }, fadeDuration: 150 }); mNvb(map);
    map.on("style.load", () => { const z = { type: "FeatureCollection", features: [] };
      map.addSource("rt-d", { type: "geojson", data: z }); map.addSource("rt-l", { type: "geojson", data: z });
      map.addLayer({ id: "rt-dl", type: "line", source: "rt-d", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#8e8e93", "line-width": 6, "line-opacity": .7 } });
      map.addLayer({ id: "rt-cs", type: "line", source: "rt-l", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#4c1d95", "line-width": 11, "line-opacity": .55 } });
      map.addLayer({ id: "rt-c", type: "line", source: "rt-l", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#a78bfa", "line-width": 7 } });
      map.addLayer({ id: "rt-f", type: "line", source: "rt-l", layout: { "line-cap": "round", "line-join": "round", visibility: "none" }, paint: { "line-color": "#c4b5fd", "line-width": 7, "line-dasharray": [0, 1.9] } });
      map.addSource("pt", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "pt-w", type: "line", source: "pt", filter: ["==", ["get", "w"], 1], layout: { "line-cap": "round" }, paint: { "line-color": "#c7c7cc", "line-width": 5, "line-dasharray": [0, 1.8] } });
      map.addLayer({ id: "pt-rc", type: "line", source: "pt", filter: ["==", ["get", "w"], 0], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0a0a10", "line-width": 10, "line-opacity": .5 } });
      map.addLayer({ id: "pt-r", type: "line", source: "pt", filter: ["==", ["get", "w"], 0], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "c"], "line-width": 6.5 } });
      map.addLayer({ id: "pt-s", type: "circle", source: "pt", filter: ["==", ["get", "s"], 1], paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-color": ["get", "c"], "circle-stroke-width": 3 } });
      mapOk = true; if (C.length) { rDraw(); if (!nav) fitRoute(); } });
    map.on("dragstart", () => { if (nav) { follow = false; sh.classList.add("free"); } });
    new maplibregl.Marker({ element: elOf('<div class="pin"></div>'), anchor: "bottom" }).setLngLat(LL(dest)).addTo(map);
    if (meP) me = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat(LL(meP)).addTo(map);
    if (src === "x" && xPlace) pin(xPlace.ll, '<div class="pin"></div>'); else { const f = F.find((x) => x.id === src); if (f) pin(f.ll, `<span class="fv"><span class="fvp">${favIc(f.n)}</span><b>${esc(f.n)}</b></span>`); }
    if (R) paint();
  }).catch(() => sh.querySelector("#rmap")?.remove());
  /* Nereden? (kullanıcı, 16.11.2026 14:59: "illa konuma gerek yok; okulunu işaretlediyse okuldan, evden ya da başka bir yerden çizelim")
     Konumum · haritada kaydettiğin yerler (Ev, Okul…) · Başka bir yer (semt, adres, yer adı). Kayıtlı ya da aranan yerden çizilen yolda
     navigasyon başlamaz (yalnızca özet ve adım adım tarif); "Başla" yalnızca Konumum seçiliyken. Seçim bu telefonda hatırlanır. */
  const rfr = $("#rfr", sh), rfx = $("#rfx", sh), F = (() => { try { return JSON.parse(store.get("nvny-yerler") || "[]") || []; } catch { return []; } })();
  let src = store.get("nvny-rota-kaynak") || "me", meP = null, srcM = null, xPlace = null, watching = false;
  const pin = (ll, html) => { srcM?.remove(); srcM = null; if (map && html) srcM = new maplibregl.Marker({ element: elOf(html), anchor: "bottom" }).setLngLat([ll[1], ll[0]]).addTo(map); };
  const chips = () => { rfr.innerHTML = `<button type="button" data-s="me" class="${src === "me" ? "on" : ""}"><span class="cgi" style="background:#0a84ff"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="#fff"/></svg></span>Konumum</button>`
      + F.map((f) => `<button type="button" data-s="${f.id}" class="${src === f.id ? "on" : ""}">${favIc(f.n)}${esc(f.n)}</button>`).join("")
      + `<button type="button" data-s="x" class="${src === "x" ? "on" : ""}"><span class="cgi" style="background:rgba(120,120,128,.4)"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" fill="none" stroke="#fff" stroke-width="2.2"/><path d="m15.5 15.5 4 4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></span>${src === "x" && xPlace ? esc(xPlace.n) : "Başka yer"}</button>`;
    rfr.insertAdjacentHTML("afterbegin", `<span class="rfk">${rev ? "Nereye" : "Nereden"}</span>`);
    rfr.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { snd.sel?.(); haptic(4); pick(b.dataset.s, true); })); };
  $("#rsw", sh).addEventListener("click", (ev) => { if (nav) return; rev = !rev; const b = ev.currentTarget; b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin"); snd.sel?.(); haptic(8); chips(); hdr(); if (from) paint(); });
  const go = (p) => { from = p; if (!mode) setMode(km(p, dest) < 2.5 ? "foot" : km(p, dest) < 6 && store.get("nvny-rota-mod") === "bike" ? "bike" : "car"); paint(); };
  const startWatch = () => { if (watching || !navigator.geolocation?.watchPosition) return; watching = true;
    watch = navigator.geolocation.watchPosition((q) => { const np = [q.coords.latitude, q.coords.longitude]; meP = np; DATA.me = { p: np, t: Date.now() }; locSave(np);
      if (map && !me) me = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat([np[1], np[0]]).addTo(map); me?.setLngLat([np[1], np[0]]);
      if (src !== "me" || rev) return;
      if (R && C.length) { let off = 1e9; for (let i = Math.max(0, ni - 3); i < Math.min(C.length, ni + 40); i++) off = Math.min(off, km(np, C[i])); if (off > .06) { from = np; paint(); return; } }
      from = np; if (nav) update(np);
    }, () => {}, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 }); };
  // konum yoksa yol tarifi kapanmaz, başka yere de atlamaz: burada açmasını ister, gelir gelmez yolu çizer
  const locCard = (k, fast) => { from = null; st.innerHTML = ""; const no = k === "off2"; // kullanıcı (13:27): "millete yol gösterme, basınca açılsın": tek cümle, tek düğme
    if (no && fast && /android/i.test(navigator.userAgent)) { try { location.href = "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end"; } catch {} }
    sum.innerHTML = `<div class="lcd"><span class="lci"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="#fff"/></svg></span><span class="lct"><b>${no ? "Konum açılmadı" : "Konumun kapalı"}</b><small id="lch">${no ? "Açıldığı an yolu burada çizeriz." : "Aç, yolu hemen çizelim."}</small></span></div><button type="button" class="lcb">Konumunu aç</button>`;
    // 18.11.2026 16:13 (kullanıcı: "konumu aç'a tıkladım, bir şey olmadı"): Chromebook, bilgisayar ve iPhone'da tarayıcı sitenin konumu açmasına izin vermez,
    // bu yüzden düğme hemen reddedildiğinde "bir şey olmuyor" gibi kalıyordu. Yalnızca o durumda, tek satırla cihazın kendi anahtarının yeri yazılır (Android'de ayar ekranı doğrudan açılır).
    if (no && fast && !/android/i.test(navigator.userAgent)) (navigator.permissions?.query ? navigator.permissions.query({ name: "geolocation" }).then((q) => q.state, () => "") : Promise.resolve("")).then((ps) => {
      const ua = navigator.userAgent, den = ps === "denied", h = $("#lch", sum); if (!h) return;
      h.innerHTML = isIOS ? "<b>Ayarlar › Gizlilik › Konum Servisleri</b>'ni aç, sonra tekrar dokun."
        : /CrOS/.test(ua) ? (den ? (standalone ? "Pencerenin <b>⋮</b> menüsü › <b>Uygulama bilgileri</b> › <b>Konum</b>'u aç." : "Adres çubuğundaki <b>simgeye</b> dokun › <b>Konum</b>'u aç.") : "<b>Ayarlar › Güvenlik ve gizlilik › Konum erişimi</b>'ni aç.")
        : den ? (standalone ? "Pencerenin <b>⋮</b> menüsü › <b>Uygulama bilgileri</b> › <b>Konum</b>'u aç." : "Adres çubuğundaki <b>simgeye</b> tıkla › <b>Konum</b>'u aç.")
        : /Mac/.test(ua) ? "<b>Sistem Ayarları › Gizlilik ve Güvenlik › Konum Servisleri</b>'nde tarayıcını aç." : /Windows/.test(ua) ? "<b>Ayarlar › Gizlilik ve güvenlik › Konum</b>'u aç." : "Cihazının konum anahtarını aç.";
      h.insertAdjacentHTML("beforeend", " Açtığın an yolu çizeriz."); });
    $(".lcb", sum).addEventListener("click", (ev) => { const b = ev.currentTarget; b.classList.add("w"); b.textContent = "Konum aranıyor…"; lw?.retry(); snd.sel?.(); haptic(6); }); };
  function pick(s, user) {
    if (nav && s !== "me") return; if (s !== "me") { lw?.stop(); lw = null; } src = s; store.set("nvny-rota-kaynak", s === "x" ? "me" : s); chips(); rfx.hidden = s !== "x" || !!(xPlace && !user); sh.classList.toggle("fixed", s !== "me" || rev);
    if (s === "me") { pin(null); if (meP) { go(meP); return; }
      sum.innerHTML = `<span class="sk" style="display:block;height:52px;border-radius:14px"></span>`;
      lw?.stop(); lw = locWait((p) => { lw = null; meP = p; haptic(8); if (map && !me) me = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat([p[1], p[0]]).addTo(map); if (src === "me") go(p); startWatch(); }, (k, x) => { if (src === "me" && !meP) locCard(k, x); });
      return; }
    if (s === "x") { if (xPlace && !user) { pin(xPlace.ll, '<div class="pin"></div>'); go(xPlace.ll); } else { sum.innerHTML = `<p class="rnote" style="margin:4px 2px">Nereden yola çıkacaksın? Semt, adres ya da yer adı yaz.</p>`; st.innerHTML = ""; setTimeout(() => $("#rfi", sh).focus(), 120); } return; }
    const f = F.find((x) => x.id === s); if (!f) return pick("me"); pin(f.ll, `<span class="fv"><span class="fvp">${favIc(f.n)}</span><b>${esc(f.n)}</b></span>`); go(f.ll);
  }
  // "Başka yer" araması (19.11.2026, kullanıcı: "yazmama rağmen bir şey yapmıyor"): Photon bir kez daha denenir, bizim yer verimiz de aranır,
  // Enter'da ya da Photon hiç cevap vermezse Nominatim; sonuç yoksa "bulunamadı", hata olursa "Tekrar dene" — sessiz kalmaz.
  let rq = 0; const rfi = $("#rfi", sh), box = $("#rfl", sh);
  const pj = (u, t = 6000) => { const ac = new AbortController(), k = setTimeout(() => ac.abort(), t); return fetch(u, { signal: ac.signal }).then((r) => r.ok ? r.json() : Promise.reject(r.status)).finally(() => clearTimeout(k)); };
  const phot = (q, ll) => pj(`https://photon.komoot.io/api/?limit=8&bbox=25.6,35.8,44.9,42.2${ll ? `&lat=${ll[0]}&lon=${ll[1]}&location_bias_scale=0.3` : ""}&q=${encodeURIComponent(q)}`).then((j) => (j?.features || []).map(hukF).filter((f) => (f.properties?.countrycode || "").toUpperCase() === "TR").map((f) => { const p = f.properties, [lng, lat] = f.geometry.coordinates; return { n: p.name || p.street || q, s: [p.district || p.locality, p.city, p.state].filter(Boolean).join(" · "), ll: [lat, lng] }; }));
  const nomi = (q) => pj(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=tr&limit=6&accept-language=tr&q=${encodeURIComponent(q)}`, 8000).then((L) => (L || []).map((x) => ({ n: x.name || String(x.display_name || q).split(",")[0], s: String(x.display_name || "").split(",").slice(1, 4).join(" · ").trim(), ll: [+x.lat, +x.lon] })));
  const local = async (q) => { if (!window.NVYV) return []; const W = fold(q).split(" ").filter(Boolean); if (!W.length) return []; try { const L = await window.NVYV(dest, .12); return L.filter((x) => { const f = fold(x[0]); return W.every((w) => f.includes(w)); }).slice(0, 4).map((x) => ({ n: x[0], s: "Yakında", ll: [x[1], x[2]] })); } catch { return []; } };
  const show = (L, q, err) => { if (!L.length) { box.innerHTML = err ? `<p class="rnote">Arama şu an cevap vermedi. <button type="button" class="rre" id="rre">Tekrar dene</button></p>` : `<p class="rnote">“${esc(q)}” bulunamadı. Semt ya da cadde adıyla dene.</p>`; $("#rre", box)?.addEventListener("click", () => run(true)); return; }
    box.innerHTML = L.map((x, i) => `<button type="button" data-i="${i}"><b>${esc(x.n)}</b><small>${esc(x.s)}</small></button>`).join("");
    box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { const x = L[+b.dataset.i]; xPlace = { n: x.n, ll: x.ll }; snd.sel?.(); haptic(5); rfi.blur(); box.innerHTML = ""; pick("x"); })); };
  const run = async (deep) => { const q = rfi.value.trim(), my = ++rq; if (q.length < 2) { box.innerHTML = ""; return; }
    const W = fold(q).split(" ").filter(Boolean), hit = (x) => W.filter((w) => fold(x.n + " " + x.s).includes(w)).length;
    let err = false; const grab = (p) => p.catch(() => { err = true; return []; });
    let [A, B, Cc] = await Promise.all([grab(phot(q, dest)), grab(phot(q)), local(q)]);
    if (my !== rq) return;
    if (!A.length && !B.length && err) { await new Promise((r) => setTimeout(r, 700)); if (my !== rq) return; err = false; [A, B] = await Promise.all([grab(phot(q, dest)), grab(phot(q))]); if (my !== rq) return; }
    let L = [...Cc, ...A, ...B]; if (deep || !L.length) { const N = await grab(nomi(q)); if (my !== rq) return; L = L.concat(N); }
    const seen = new Set(); L = L.filter((x) => Number.isFinite(x.ll[0]) && Number.isFinite(x.ll[1]) && hit(x) > 0).filter((x) => { const k = fold(x.n) + "|" + x.ll[0].toFixed(3) + x.ll[1].toFixed(3); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => hit(b) - hit(a)).slice(0, 7);
    show(L, q, err && !L.length); };
  let rt = 0; rfi.addEventListener("input", () => { clearTimeout(rt); if (rfi.value.trim().length < 2) { ++rq; box.innerHTML = ""; return; } rt = setTimeout(() => run(false), 300); });
  rfi.addEventListener("compositionend", () => { clearTimeout(rt); rt = setTimeout(() => run(false), 300); });
  rfi.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(rt); run(true); } });
  chips(); pick(F.some((f) => f.id === src) ? src : "me");
}

/* ---------- Ayarlar (kullanıcı isteği, 15.11.2026 23:46: "ayarlar kısmı olsun; sesi, bildirimleri açıp kapatabilsin") ----------
   iPhone Ayarlar gibi gruplu kartlar. Her şey yalnızca bu telefonda saklanır. Üst çubuktaki dişliden açılır: #/<il>/ayarlar */
function viewHarita(city, Q = {}) {
  turAt("harita"); setTop(city); document.title = `Harita · Ne Var Ne Yok`;
  V.innerHTML = `<div class="hmap${mTheme() === "acik" ? " lt" : ""}" id="hmw"><div class="map" id="hm"></div>
    <div class="hm-top"><form class="hm-q" id="hmq" role="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><input id="hmi" type="search" placeholder="Etkinlik, mekân, il ya da yer ara" autocomplete="off" enterkeyhint="search"><button type="button" class="hm-x" id="hmx" aria-label="Temizle" hidden>✕</button><button type="button" class="hm-f" id="hmf" aria-label="Filtreler">${ICO.flt}<i id="hmfn"></i></button></form>
    <div class="hm-r" id="hmr" hidden></div><div class="hm-t" id="hmt"></div></div>
    <div class="hm-ctl"><button type="button" id="hm3" aria-label="3B görünüm">${ICO.d3}</button><button type="button" id="hmth" aria-label="Harita görünümü: koyu, açık, uydu">${thIc(mTheme())}</button><button type="button" id="hmme" class="bl" aria-label="Etrafımda ne var">${ICO.me}</button></div>
    <button type="button" class="hm-cmp" id="hmc" aria-label="Kuzeye çevir" hidden>${ICO.cmp}</button>
    <div class="hm-tc" id="hmtc" hidden><div class="hm-tch"><span><b>Başlama saati</b><small id="hmtl"></small></span><div class="hm-seg" role="tablist"><i></i><button type="button" data-ta="1">Tüm gün</button><button type="button" data-ta="0">Saat seç</button></div><button type="button" class="hm-tcx" aria-label="Kapat">✕</button></div><div id="hmtr">${trHTML()}</div></div>
    <button type="button" class="hm-n" id="hmn"><span class="sk" style="display:inline-block;width:150px;height:14px;border-radius:7px"></span></button></div>`;
  const el = $("#hm"), wrap = $("#hmw"), N = CNAME(); let map = null, IX = null, retryIx = null, VG = [], UG = new Map(), E = [], pinM = null, meM = null, live = 0, posters = new Map(), favM = [], raf = 0;
  const alive = () => document.body.contains(el);
  const vSheet = (g) => { const today = nowIST().d, S = new Set(g.L), rg = hmRange(HM.when); venueSheetX({ ...g, more: g.vi == null ? [] : IX.e.filter((x) => x[0] === g.vi && !S.has(x) && x[3] >= today && (x[3] < rg[0] || x[3] > rg[1]) && x[3] <= addD(today, 120)) }); };
  const lt = () => mTheme() === "acik";
  /* adı bilinen yerler: yakınlaşınca görünür, dokununca adı hazır yer kartı açılır; yalnızca bakılan bölgenin küçük dosyası iner */
  const YVC = new Map(), YVT = ["kafe", "yemek", "bar", "park", "muze", "sahne", "avm", "gezi", "spor", "sinema", "yer", "kutuphane"], YVL = ["Kafe", "Restoran", "Mekân", "Park", "Müze", "Sahne", "AVM", "Gezilecek yer", "Spor", "Sinema", "Yer", "Kütüphane"], YVR = ["#ff9f0a", "#ff6b4a", "#bf5af2", "#30d158", "#64d2ff", "#ff375f", "#5e5ce6", "#ffd60a", "#32ade6", "#ff2d55", "#98989f", "#5ac8fa"];
  const yvCell = (la, lo) => `${Math.floor(la * 10)}_${Math.floor(lo * 10)}`, yvGet = (c) => { if (!YVC.has(c)) YVC.set(c, fetch(`/yv/${c}.json`).then((r) => r.ok && /json/.test(r.headers.get("content-type") || "") ? r.json() : []).catch(() => [])); return YVC.get(c); };
  const yvAround = async (ll, r) => { const S = new Set(); for (const a of [-r, 0, r]) for (const o of [-r, 0, r]) S.add(yvCell(ll[0] + a, ll[1] + o)); let hk = 0; return (await Promise.all([...S].map(yvGet))).flat().map((x) => { const n = hukName(x[0], x[1], x[2]); return n === x[0] ? x : [n, 39.9347, 32.8282, x[3]]; }).filter((x) => x[0] !== HUKN || !hk++); };
  const YVE = new Map(), yvEk = (c) => { if (!YVE.has(c)) YVE.set(c, fetch(`/yv/ek/${c}.json`).then((r) => r.ok && /json/.test(r.headers.get("content-type") || "") ? r.json() : []).catch(() => [])); return YVE.get(c); };
  /* kullanıcıların önerip yöneticinin onayladığı yerler (25.11.2026): aramada bizim veriyle birlikte */
  const YVK = new Map(), yvKul = (c) => { if (!YVK.has(c)) YVK.set(c, fetch(`${PVW}/api/yerler?h=${c}`).then((r) => r.ok ? r.json() : { L: [] }).then((j) => (j.L || []).map((x) => [x[0], x[1], x[2], 10])).catch(() => [])); return YVK.get(c); };
  const yvAll = window.NVYV = async (ll, r) => { const S = new Set(); for (const a of [-r, 0, r]) for (const o of [-r, 0, r]) S.add(yvCell(ll[0] + a, ll[1] + o)); return (await Promise.all([...S].flatMap((c) => [yvGet(c), yvEk(c), yvKul(c)]))).flat().map((x) => { const n = hukName(x[0], x[1], x[2]); return n === x[0] ? x : [n, 39.9347, 32.8282, x[3]]; }); };
  /* sokak ve kapı numarası araması (25.11.2026): OpenStreetMap'teki adresler ve sokak adları, yalnızca aranan bölgenin küçük dosyası iner (yv/adr/<hücre>.json) */
  const ADRC = new Map(), adrGet = (c) => { if (!ADRC.has(c)) ADRC.set(c, fetch(`/yv/adr/${c}.json`).then((r) => r.ok && /json/.test(r.headers.get("content-type") || "") ? r.json() : null).catch(() => null)); return ADRC.get(c); };
  const ABR = [[/\b(sk|sok|skk)\b/g, "sokak"], [/\b(cd|cad|cadd)\b/g, "cadde"], [/\b(blv|bul|bulv)\b/g, "bulvar"], [/\b(mah|mh)\b/g, "mahalle"]];
  const canon = (t) => ABR.reduce((z, [r, v]) => z.replace(r, v), fold(t).replace(/sokagi/g, "sokak").replace(/caddesi/g, "cadde").replace(/bulvari/g, "bulvar").replace(/mahallesi/g, "mahalle")).replace(/\s+/g, " ").trim();
  const adrFind = async (raw, ll, ll2) => { const q = canon(raw), num = (q.match(/(?:^|\s)(?:no\s*)?(\d{1,4}[a-z]?)(?=\s|$)/) || [])[1] || "";
    const W = q.split(" ").filter((w) => w && w !== num && w !== "no" && w.length > 1); if (!W.length || (!num && !W.some((w) => /^(sokak|cadde|bulvar)$/.test(w)))) return [];
    const S = new Set(); for (const c of [ll, ...(ll2 ? [ll2] : [])]) for (const d of [-.1, 0, .1]) for (const e of [-.1, 0, .1]) S.add(yvCell(c[0] + d, c[1] + e));
    const D = (await Promise.all([...S].map(adrGet))).filter(Boolean), R = [], ok = (st) => { const c = canon(st); return W.every((w) => c.includes(w)); };
    for (const d of D) { if (num) for (const x of d.a || []) if ((x[1].match(/^\d+[a-z]?/i) || [""])[0].toLowerCase() === num && ok(x[0])) R.push({ n: `${x[0]} No:${x[1]}`, s: "Adres", ll: [x[2], x[3]], m: `${fold(raw)} ${q}`, adr: 1 });
      if (!num) for (const x of d.s || []) if (ok(x[0])) R.push({ n: x[0], s: "Sokak", ll: [x[1], x[2]], m: `${fold(raw)} ${q}`, adr: 1 }); }
    const sn = new Set(); return R.filter((x) => { const k = fold(x.n) + Math.round(x.ll[0] * 300) + Math.round(x.ll[1] * 230); if (sn.has(k)) return false; sn.add(k); return true; }).sort((u, v) => km(ll, u.ll) - km(ll, v.ll)).slice(0, 6); };
  const yvTx = (c, k) => k === 10 ? (lt() ? "#4a4a52" : "#c9c9d3") : lt() ? c.replace(/^#(..)(..)(..)$/, (_, r, g, b) => "#" + [r, g, b].map((h) => Math.round(parseInt(h, 16) * .62).toString(16).padStart(2, "0")).join("")) : c.replace(/^#(..)(..)(..)$/, (_, r, g, b) => "#" + [r, g, b].map((h) => Math.round(parseInt(h, 16) + (255 - parseInt(h, 16)) * .38).toString(16).padStart(2, "0")).join("")); /* Apple Haritalar gibi: ad kategorisinin renginde (25.11.2026) */
  const YVLM = /cami|mescit|kilise|sinagog|t[üu]rbe|an[ıi]t|heykel|m[üu]ze|kale|hastane|[üu]niversite|lise|okul|belediye|valilik|istasyon|gar[ıi]|meydan/i; let yvT = 0, yvQ = 0; const yvSync = () => { clearTimeout(yvT); yvT = setTimeout(async () => { if (!map?.getSource("yv") || map.getZoom() < 14.8) { map?.getSource("yv")?.setData({ type: "FeatureCollection", features: [] }); return; } const q = ++yvQ, c = map.getCenter(), b = map.getBounds(), zz = map.getZoom(), L = await yvAround([c.lat, c.lng], .1); if (q !== yvQ || !map) return; /* haritada yalnızca güvenilir adlar: yv/ek ve 5. alanı 0 olanlar (düşük güvenli Overture, GeoNames) yalnızca aramada (25.11.2026) */ const pr = (x) => YVLM.test(x[0]) ? 0 : x[3] !== 10 && x[3] > 2 ? 1 : x[3] !== 10 ? 2 : 3, V = L.filter((x) => x[4] !== 0 && x[0] !== HUKN && b.contains([x[2], x[1]])).map((x) => [x, pr(x)]).sort((x, y) => x[1] - y[1]).slice(0, zz >= 16.3 ? 3000 : 1600); map.getSource("yv").setData({ type: "FeatureCollection", features: V.map(([x, p]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [x[2], x[1]] }, properties: { n: x[0], k: YVL[x[3]], c: /cami|mescit/i.test(x[0]) ? "#34c58a" : YVR[x[3]], t: yvTx(/cami|mescit/i.test(x[0]) ? "#34c58a" : YVR[x[3]], x[3]), p } })) }); }, 160); };
  // veriyi haritanın anlayacağı biçime çevir (filtre değişince yalnızca kaynaklar yenilenir; katmanlar yerinde kalır)
  const build = () => {
    E = hmFilter(IX, HM); const { d: today, hm } = nowIST(), now = +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
    const byV = new Map(); UG = new Map(); for (const x of E) { if (x[0] >= 0) (byV.get(x[0]) || byV.set(x[0], []).get(x[0])).push(x); else (UG.get(x[7]) || UG.set(x[7], []).get(x[7])).push(x); }
    VG = [...byV].map(([vi, L]) => ({ v: IX.v[vi], L, vi })); const byC = new Map(); live = 0;
    const vf = VG.map((g, i) => { const cc = {}; for (const x of g.L) cc[x[5]] = (cc[x[5]] || 0) + 1; const top = Object.entries(cc).sort((p, q) => q[1] - p[1])[0][0];
      const lv = g.L.some((x) => x[3] === today && x[4] && (() => { const m = +x[4].slice(0, 2) * 60 + +x[4].slice(3, 5) - now; return m <= 180 && m >= -60; })()); if (lv) live++; g.lv = lv;
      byC.set(g.v[2], (byC.get(g.v[2]) || 0) + g.L.length);
      return { type: "Feature", geometry: { type: "Point", coordinates: [g.v[1], g.v[0]] }, properties: { i, n: g.L.length, ic: CG[top] ? "c-" + top : "c-diger", so: g.L.every((x) => x[9] === "t") ? 1 : 0, lv: lv ? 1 : 0, nm: g.v[3] } }; });
    for (const [c, L] of UG) byC.set(c, (byC.get(c) || 0) + L.length);
    const uf = [...UG].filter(([c]) => ILLL[c]).map(([c, L]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [ILLL[c][1], ILLL[c][0]] }, properties: { c, n: L.length, t: `${L.length.toLocaleString("tr-TR")} etkinlik daha` } }));
    const cf = [...byC].filter(([c]) => ILLL[c]).map(([c, n]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [ILLL[c][1], ILLL[c][0]] }, properties: { c, n, me: c === city ? 1 : 0, nm: N[c] || c, t: `${n.toLocaleString("tr-TR")} etkinlik`, k: -(n + (c === city ? 1e6 : 0)) } }));
    const fc = (F) => ({ type: "FeatureCollection", features: F });
    return { hv: fc(vf), hu: fc(uf), hc: fc(cf), hh: fc([...vf, ...uf]) };
  };
  const setData = () => { if (!map || !IX) return; const D = build(); for (const k of Object.keys(D)) map.getSource(k)?.setData(D[k]);
    if (!IX.e.length) { $("#hmn").classList.add("err"); $("#hmn").innerHTML = `<b>Etkinlikler yüklenemedi</b><small> · Tekrar dene</small>`; return; }
    $("#hmn").classList.remove("err"); $("#hmn").innerHTML = `<b>${E.length.toLocaleString("tr-TR")}</b> etkinlik${HM.when === "tumu" ? "" : " · " + HMW.find((w) => w[0] === HM.when)[1].toLowerCase()}<small> · ${VG.length} mekân</small>`;
    // haritanın üstünde her zaman: Tümü · Bugün · Yarın · Hafta sonu… (Apple Haritalar'daki hızlı seçimler gibi) + seçili diğer filtreler
    const tg = hmTags(), ot = tg.filter((t) => t !== hmWhen()), row = $("#hmt"); $("#hmfn").textContent = tg.length || "";
    row.innerHTML = `<button type="button" class="hw hcl${HM.from ? " on" : ""}" data-hclk><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${HM.from ? HM.from + "+" : "Saat"}</button><i class="hsep"></i><div class="hfv" id="hmfv"></div>` + HMW.map(([k, l]) => `<button type="button" class="hw${HM.when === k ? " on" : ""}" data-hw="${k}">${l}</button>`).join("") + (ot.filter((t) => !/ sonrası$/.test(t)).length ? `<i class="hsep"></i>${ot.filter((t) => !/ sonrası$/.test(t)).map((t) => `<span>${esc(t)}</span>`).join("")}<button type="button" id="hmt0">Sıfırla</button>` : "");
    $("[data-hclk]", row).addEventListener("click", () => tcOpen()); favBar();
    const on = row.querySelector(".hw.on:not(.hcl)"); if (on) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
    $$("[data-hw]", row).forEach((b) => b.addEventListener("click", () => { if (HM.when === b.dataset.hw) return; HM.when = b.dataset.hw; hmSave(); snd.sel?.(); haptic(5); setData(); }));
    $$(":scope > span", row).forEach((x) => x.addEventListener("click", () => $("#hmf").click()));
    $("#hmt0")?.addEventListener("click", () => { Object.assign(HM, { ...HM0, when: HM.when, cats: [] }); hmSave(); snd.sel?.(); haptic(5); setData(); });
    posters.forEach((m) => m.remove()); posters.clear(); near(); pulse(); };
  // haritanın üstündeki saat kartı (kullanıcı, 10:45: "saat seçme daha görünür olsun"): Tüm gün / Saat seç + çark; değişiklik anında haritada
  const tc = $("#hmtc"), tcSeg = $(".hm-seg", tc); let tcT = 0;
  const tcUI = () => { $("#hmtl").textContent = HM.from ? `${HM.from} ve sonrası` : "Bütün saatler"; tcSeg.classList.toggle("r", !!HM.from); tcSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", (b.dataset.ta === "1") === !HM.from)); };
  const tcR = trBind(tc, () => HM.from, (v, fin) => { HM.from = v; tcUI(); if (fin) { hmSave(); clearTimeout(tcT); tcT = setTimeout(setData, 30); } });
  const tcOpen = () => { if (!tc.hidden) return tcClose(); tc.hidden = false; wrap.classList.add("tco"); snd.sheet?.(); haptic(6); tcUI(); tcR.sync(); };
  const tcClose = () => { tc.hidden = true; wrap.classList.remove("tco"); snd.close?.(); haptic(4); };
  $(".hm-tcx", tc).addEventListener("click", tcClose);
  tcSeg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const all = b.dataset.ta === "1"; if (all === !HM.from) return; HM.from = all ? "" : trNext(); hmSave(); snd.sel?.(); haptic(5); tcUI(); tcR.sync(); setData(); }));
  // katmanlar (stil her değiştiğinde yeniden eklenir)
  let IMG = null;
  const addLayers = async () => {
    const D = build(); IMG ||= await mImgs(); if (!alive() || !map) return;
    for (const [k, im] of IMG) if (!map.hasImage("c-" + k)) map.addImage("c-" + k, im, { pixelRatio: 2 });
    if (!map.hasImage("c-diger")) map.addImage("c-diger", IMG[0][1], { pixelRatio: 2 });
    if (map.hasImage("pill")) map.removeImage("pill"); map.addImage("pill", lt() ? mPill("rgba(255,255,255,.94)", "rgba(124,58,237,.35)") : mPill("rgba(28,25,42,.9)", "rgba(167,139,250,.55)"), mPillOpt);
    if (!map.hasImage("pill-me")) map.addImage("pill-me", mPill("rgba(124,58,237,.96)", "rgba(255,255,255,.45)"), mPillOpt);
    for (const k of Object.keys(D)) if (!map.getSource(k)) map.addSource(k, { type: "geojson", data: D[k] }); else map.getSource(k).setData(D[k]);
    if (!map.getSource("ring")) map.addSource("ring", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const font = ["Noto Sans Bold"];
    if (!map.getSource("yv")) map.addSource("yv", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "yv-d", type: "circle", source: "yv", minzoom: 15, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, ["case", ["==", ["get", "p"], 0], 4, 3], 18, ["case", ["==", ["get", "p"], 0], 7.5, 6]], "circle-color": ["get", "c"], "circle-stroke-color": lt() ? "#fff" : "#0a0a10", "circle-stroke-width": 1.4 } });
    map.addLayer({ id: "yv-t", type: "symbol", source: "yv", minzoom: 15.4, layout: { "symbol-sort-key": ["get", "p"], "text-field": ["get", "n"], "text-font": ["case", ["==", ["get", "p"], 0], ["literal", ["Noto Sans Bold"]], ["literal", ["Noto Sans Regular"]]], "text-size": ["case", ["==", ["get", "p"], 0], 12.5, 11.5], "text-letter-spacing": .01, "text-radial-offset": .75, "text-variable-anchor": ["top", "bottom", "right", "left"], "text-justify": "auto", "text-max-width": 8, "text-optional": true, "text-padding": 3, "text-allow-overlap": false, "text-ignore-placement": false }, paint: { "text-color": ["coalesce", ["get", "t"], lt() ? "#333" : "#d8d8e4"], "text-halo-color": lt() ? "rgba(255,255,255,.94)" : "rgba(10,10,16,.92)", "text-halo-width": 1.4, "text-halo-blur": .4 } });
    yvSync();
    map.addLayer({ id: "heat", type: "heatmap", source: "hh", maxzoom: 12.5, paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "n"], 1, .6, 10, 1, 60, 1.8, 400, 3],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 1, 9, 1.2, 12, 1.4],
      "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(91,33,182,0)", .15, "rgba(109,40,217,.38)", .4, "rgba(139,92,246,.62)", .7, "rgba(167,139,250,.8)", 1, "rgba(221,214,254,.9)"],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 12, 8, 22, 11, 32],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, .9, 10.5, .35, 11.8, 0] } });
    map.addLayer({ id: "ring-f", type: "fill", source: "ring", paint: { "fill-color": "#0a84ff", "fill-opacity": .1 } });
    map.addLayer({ id: "ring-l", type: "line", source: "ring", paint: { "line-color": "#0a84ff", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": .8 } });
    map.addLayer({ id: "ven", type: "symbol", source: "hv", minzoom: 8.5, layout: {
      "icon-image": ["get", "ic"], "icon-size": ["interpolate", ["linear"], ["zoom"], 8.5, .55, 12, .85, 15, 1], "icon-allow-overlap": true, "icon-ignore-placement": true, "symbol-sort-key": ["-", 0, ["get", "n"]],
      "text-field": ["case", [">", ["get", "n"], 1], ["to-string", ["get", "n"]], ""], "text-font": font, "text-size": 10.5, "text-offset": [1.15, -1.05], "text-allow-overlap": true, "text-ignore-placement": true },
      paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0, 9.3, ["case", ["==", ["get", "so"], 1], .45, 1]], "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0, 9.3, 1], "text-color": "#fff", "text-halo-color": "#7c3aed", "text-halo-width": 2.6 } });
    map.addLayer({ id: "ven-n", type: "symbol", source: "hv", minzoom: 12.3, layout: { "text-field": ["get", "nm"], "text-font": font, "text-size": 11.5, "text-offset": [0, 1.75], "text-anchor": "top", "text-max-width": 9, "text-optional": true },
      paint: { "text-color": lt() ? "#1c1c1e" : "#fff", "text-halo-color": lt() ? "rgba(255,255,255,.92)" : "rgba(11,11,18,.9)", "text-halo-width": 1.6, "text-opacity": ["interpolate", ["linear"], ["zoom"], 12.3, 0, 12.9, 1] } });
    map.addLayer({ id: "un", type: "symbol", source: "hu", minzoom: 8.6, maxzoom: 15, layout: { "icon-image": "pill", "icon-text-fit": "both", "icon-text-fit-padding": [3, 9, 3, 9], "text-field": ["get", "t"], "text-font": font, "text-size": 11.5, "text-offset": [0, 2.6], "icon-allow-overlap": true, "text-allow-overlap": true },
      paint: { "text-color": lt() ? "#3a2a6b" : "#fff", "icon-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 0, 9.4, 1], "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 0, 9.4, 1] } });
    map.addLayer({ id: "city", type: "symbol", source: "hc", maxzoom: 9.6, layout: { "icon-image": ["case", ["==", ["get", "me"], 1], "pill-me", "pill"], "icon-text-fit": "both", "icon-text-fit-padding": [4, 11, 4, 11], "symbol-sort-key": ["get", "k"],
      "text-field": ["format", ["get", "nm"], { "font-scale": 1 }, "\n", {}, ["get", "t"], { "font-scale": .78 }], "text-font": font, "text-size": 13.5, "text-line-height": 1.15, "icon-padding": 3 },
      paint: { "text-color": lt() ? ["case", ["==", ["get", "me"], 1], "#fff", "#1c1c1e"] : "#fff", "icon-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 1, 9.5, 0], "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 1, 9.5, 0] } });
    const ptr = (id) => { map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; }); };
    if (!map.__nvb) { map.__nvb = 1; ["ven", "ven-n", "un", "city"].forEach(ptr);
      map.on("click", "ven", (ev) => { const g = VG[ev.features[0].properties.i]; if (g) { recAdd({ k: "v", l: g.v[3], s: N[g.v[2]] || "", c: g.v[2] }); vSheet(g); } });
      map.on("click", "ven-n", (ev) => { const g = VG[ev.features[0].properties.i]; if (g) vSheet(g); });
      map.on("click", "un", (ev) => { const c = ev.features[0].properties.c; if (UG.has(c)) unSheet(c, UG.get(c)); });
      map.on("click", "city", (ev) => { const c = ev.features[0].properties.c; haptic(6); snd.push?.(); goCity(c); }); }
    setData();
  };
  const goCity = (c) => { const pts = VG.filter((g) => g.v[2] === c).map((g) => [g.v[1], g.v[0]]); if (ILLL[c]) pts.push([ILLL[c][1], ILLL[c][0]]);
    if (pts.length > 1) { const b = pts.reduce((b, p) => [[Math.min(b[0][0], p[0]), Math.min(b[0][1], p[1])], [Math.max(b[1][0], p[0]), Math.max(b[1][1], p[1])]], [pts[0], pts[0]]); map.fitBounds(b, { padding: { top: 170, bottom: 140, left: 40, right: 70 }, maxZoom: 12.5, duration: 1100 }); }
    else map.flyTo({ center: pts[0] || [32.86, 39.93], zoom: 11.5, duration: 1100 }); };
  // afişler: iyice yaklaşınca ekrandaki mekânlar, üst üste binmeyecek kadar; simge dönerek afişe dönüşür
  let lastLod = "";
  const near = () => { if (!map) return; const z = map.getZoom(), m = z < 9.4 ? "far" : z >= 14 ? "near" : "mid";
    if (lastLod && m !== lastLod) { tick(); haptic(4); } lastLod = m;
    if (m !== "near") { posters.forEach((mk) => mk.remove()); posters.clear(); return; }
    const b = map.getBounds(), W = el.clientWidth, H = el.clientHeight, kept = [], want = new Set();
    const C = VG.map((g, i) => [g, i]).filter(([g]) => b.contains([g.v[1], g.v[0]])).sort((p, q) => q[0].L.length - p[0].L.length).slice(0, 70);
    for (const [g, i] of C) { const p = map.project([g.v[1], g.v[0]]); if (p.x < -30 || p.y < -40 || p.x > W + 30 || p.y > H + 40) continue; const r = [p.x - 25, p.y - 70, p.x + 25, p.y + 4];
      if (kept.some((k) => r[0] < k[2] && r[2] > k[0] && r[1] < k[3] && r[3] > k[1])) continue; kept.push(r); want.add(i);
      if (!posters.has(i)) { const x0 = g.L.find((x) => x[6]) || g.L[0], cc = CG[x0[5]]?.[0] || "#8b5cf6";
        const e = elOf(`<button type="button" class="mk2${g.L.every((x) => x[9] === "t") ? " so" : ""}" style="--c:${cc}" aria-label="${esc(g.v[3])}"><span>${x0[6] ? `<img decoding="async" src="${esc(x0[6])}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<em>${esc(x0[2].slice(0, 30))}</em></span>${g.L.length > 1 ? `<b>${g.L.length}</b>` : ""}</button>`);
        e.addEventListener("click", (ev) => { ev.stopPropagation(); recAdd({ k: "v", l: g.v[3], s: N[g.v[2]] || "", c: g.v[2] }); vSheet(g); });
        posters.set(i, new maplibregl.Marker({ element: e, anchor: "bottom", offset: [0, 4] }).setLngLat([g.v[1], g.v[0]]).addTo(map)); } }
    for (const [i, mk] of posters) if (!want.has(i)) { mk.remove(); posters.delete(i); } };
  // "canlı" mekânlar: başlamasına 3 saatten az kalan (ya da yeni başlamış) etkinliği olanlar yumuşakça nabız gibi atar
  // (11:08 akıcılık) nabız artık haritayı her karede yeniden çizdirmez: canlı mekânlarda küçük HTML halkalar, CSS ile (yalnızca transform/opacity, ekran kartında)
  let lvM = [];
  const pulse = () => { lvM.forEach((m) => m.remove()); lvM = []; if (!map) return;
    for (const g of VG) if (g.lv && lvM.length < 60) lvM.push(new maplibregl.Marker({ element: elOf('<i class="lvp"></i>'), className: "lvm" }).setLngLat([g.v[1], g.v[0]]).addTo(map)); };
  // haritayı kur; en son kaldığı yer (aynı il seçiliyse) yoksa seçili il
  const cam = HM.cam && HM.cam.city === city ? HM.cam : null;
  Promise.all([mlgl(), hIdx(), mStyle(mTheme())]).then(([, ix, style]) => { if (!alive()) return; IX = ix || { v: [], e: [] };
    // dizin inmediyse sessizce yeniden dene (1,5 / 4 / 10 / 20 sn, bağlantı gelince ve uygulamaya dönünce); gelince harita yerinde dolar
    if (!ix) { let n = 0, busy = false; const retry = () => { if (busy || !alive() || IX.e.length) return; busy = true; hIdx().then((j) => { busy = false; if (j && alive()) { IX = j; setData(); } else if (alive()) setTimeout(retry, [1500, 4000, 10000, 20000, 30000][Math.min(n++, 4)]); }); };
      setTimeout(retry, 1500); addEventListener("online", retry); document.addEventListener("visibilitychange", () => { if (!document.hidden) retry(); }); retryIx = retry; }
    map = new maplibregl.Map({ container: el, style, center: cam ? cam.c : [(ILLL[city] || [39.93, 32.86])[1], (ILLL[city] || [39.93, 32.86])[0]], zoom: cam ? cam.z : 10.5, pitch: cam?.p || 0, bearing: cam?.b || 0,
      minZoom: 4.6, maxZoom: 18.5, maxPitch: 70, maxBounds: [[19, 32], [51, 46]], attributionControl: { compact: true }, dragRotate: true, pitchWithRotate: true, fadeDuration: 180 });
    window.__hm = map; mNvb(map); map.touchZoomRotate.enableRotation();
    map.on("style.load", () => { addLayers(); });
    map.once("load", () => { wrap.classList.toggle("z9", map.getZoom() >= 8.5); if (!cam) goCity(city); drawFavs(); if (DATA.me && !DATA.me.c) meDot(DATA.me.p); if (HM.q) { inp.value = HM.q; clr.hidden = false; } deep(); });
    map.on("moveend", () => { HM.cam = { c: map.getCenter().toArray().map((v) => +v.toFixed(5)), z: +map.getZoom().toFixed(2), p: Math.round(map.getPitch()), b: Math.round(map.getBearing()), city }; hmSave(); near(); yvSync(); });
    map.on("zoom", () => { wrap.classList.toggle("z9", map.getZoom() >= 8.5); favZoom(); const z = map.getZoom(), m = z < 9.4 ? "far" : z >= 14 ? "near" : "mid"; if (m !== lastLod) near(); });
    map.on("rotate", cmp); map.on("pitch", cmp); cmp();
    longPress();
  }).catch(() => { el.innerHTML = `<div class="hm-err"><b>Harita şu an açılamadı</b><small>İnternet bağlantını kontrol edip tekrar dene.</small><button type="button" class="ok" id="hmre">Tekrar dene</button></div>`; const H = location.hash, re = () => { clearTimeout(T); removeEventListener("online", re); if (location.hash === H && $("#hmre")) viewHarita(city); }, T = setTimeout(re, 5000); addEventListener("online", re); $("#hmre")?.addEventListener("click", re); });
  // pusula (döndürünce ya da eğince görünür; dokununca kuzeye ve düze döner) ve 3B
  const cmp = () => { if (!map) return; const b = map.getBearing(), p = map.getPitch(), c = $("#hmc"); c.hidden = Math.abs(b) < 1 && p < 1; c.querySelector("svg").style.transform = `rotate(${-b}deg)`; $("#hm3").innerHTML = p > 10 ? ICO.d2 : ICO.d3; $("#hm3").classList.toggle("on", p > 10); };
  $("#hmc").addEventListener("click", () => { if (!map) return; snd.sel?.(); haptic(5); map.easeTo({ bearing: 0, pitch: 0, duration: 600 }); });
  $("#hm3").addEventListener("click", () => { if (!map) return; snd.sel?.(); haptic(6); const on = map.getPitch() > 10; map.easeTo({ pitch: on ? 0 : 60, bearing: on ? 0 : map.getBearing() || -18, zoom: on ? map.getZoom() : Math.max(map.getZoom(), 15.5), duration: 900 }); });
  $("#hmth").addEventListener("click", () => { if (!map) return; const c0 = mTheme(), th = c0 === "koyu" ? "acik" : c0 === "acik" ? "uydu" : "koyu"; store.set("nvny-harita-tema", th); snd.sel?.(); haptic(6); wrap.classList.toggle("lt", th === "acik"); $("#hmth").innerHTML = thIc(th); toast(th === "uydu" ? "Uydu görünümü" : th === "acik" ? "Açık harita" : "Koyu harita", 1300);
    mStyle(th).then((s) => { if (map) map.setStyle(s, { diff: false }); }).catch(() => {}); });
  // benim konumum (mavi nokta) ve "Etrafımda ne var": 15 dakikalık yürüme halkası + en yakın etkinlikler
  const meDot = (p) => { meM?.remove(); meM = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat([p[1], p[0]]).addTo(map); };
  $("#hmme").addEventListener("click", () => { haptic(6); snd.sel?.(); whereAmI(true).then((p) => { if (!map) return; meDot(p); map.getSource("ring")?.setData({ type: "FeatureCollection", features: [circlePoly(p, 1.2)] });
    map.flyTo({ center: [p[1], p[0]], zoom: 14.2, duration: 1000 }); setTimeout(() => nearList(p, "Etrafında", "15 dk yürüme mesafesi mavi halkada"), 1050); }).catch((err) => geoHelp(city, err?.code)); });
  // yakındaki etkinlikler (yer araması, kayıtlı yer, etrafımda)
  const nearList = (ll, name, sub) => {
    const R = []; for (const g of VG) { const d = km(ll, [g.v[0], g.v[1]]); for (const x of g.L) R.push([d, g, x]); } R.sort((p, q) => p[0] - q[0] || p[2][3].localeCompare(q[2][3])); const top = R.slice(0, 40);
    snd.pop?.(); haptic(8);
    sheet(`<div class="pn" role="dialog" aria-label="${esc(name)}"><div class="hd"><span class="rth"><b>${esc(name)}</b><small>${top.length ? `En yakın ${top.length} etkinlik${sub ? " · " + esc(sub) : ""}` : "Yakında etkinlik bulunamadı"}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><div class="mpl">${top.map(([d, g, x]) => `<a href="${hmHref(x, g.v[2])}"><span class="mpi"><span class="mpx" style="--c:${CG[x[5]]?.[0] || "#8b5cf6"}"><svg viewBox="0 0 24 24">${CG[x[5]]?.[1] || ""}</svg>${x[6] ? `<img decoding="async" src="${esc(x[6])}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : ""}</span></span><span><b>${esc(x[2])}</b><small><em class="kmb">${kmTxt(d)}</em> · ${rel(x[3])}${x[4] ? " · " + esc(x[4]) : ""} · ${esc(g.v[3])}</small></span></a>`).join("")}</div>
      ${top.length ? "" : `<p class="kmn">Bu filtrelerle yakınında konumu bilinen etkinlik yok. Filtreleri genişletmeyi dene.</p>`}</div></div>`, "mn"); };
  // aranan yer: harita oraya gider, Apple gibi yer kartı açılır (Yol tarifi, Kaydet, Yakındaki etkinlikler)
  const nearPlace = (ll, name, sub) => { if (!map) return; pinM?.remove(); pinM = new maplibregl.Marker({ element: elOf('<div class="pin drop"></div>'), anchor: "bottom" }).setLngLat([ll[1], ll[0]]).addTo(map);
    map.flyTo({ center: [ll[1], ll[0]], zoom: Math.max(map.getZoom(), 15.5), duration: 1000 }); setTimeout(() => placeCard(ll, { n: name, s: sub || "", keep: true }), 1000); };
  /* Kayıtlı yerler (kullanıcı, 09:22: "GTA gibi; bir yeri seçip okul ya da ev yazabilmeli, değiştirene kadar kalmalı"): haritada bir yere basılı tut → ad ver.
     Haritada kendi simgesiyle durur, aramanın en üstünde çıkar; dokununca yakındaki etkinlikler, adını değiştir, sil. */
  const drawFavs = () => { favM.forEach((m) => m.remove()); favM = []; if (!map) return;
    // Apple Haritalar'daki gibi: renkli daire + uç (tam o noktayı gösterir) + altında adı; uzaklaştıkça küçülüp noktaya döner (favZoom)
    for (const f of favs()) { const e = elOf(`<button type="button" data-fid="${esc(f.id)}" class="fv${f.id === newFav ? " new" : ""}" aria-label="${esc(f.n)}"><span class="fvp">${favIc(f.n)}</span><b>${esc(f.n)}</b></button>`); e.addEventListener("click", (ev) => { ev.stopPropagation(); favSheet(f); });
      favM.push(new maplibregl.Marker({ element: e, anchor: "bottom", offset: [0, 22], className: "fvm" }).setLngLat([f.ll[1], f.ll[0]]).addTo(map)); } newFav = ""; favS = favL = -1; favZoom(); favBar(); };
  let newFav = "", favS = -1, favL = -1;
  /* (18.11.2026, kullanıcı: "kayıtlı yerler sürekli en büyük görünmesin, küçülsün; üstteki sırada sembol olsun, tıklayınca gidilsin")
     Boy yakınlıkla akar: 7'de 12 px nokta, 14'te tam boy; ad 12,5–13,5 arasında belirir. Yalnızca transform/opacity, birkaç işaretin kendi değişkeni. */
  const favZoom = () => { if (!map) return; const z = map.getZoom(), t = Math.min(1, Math.max(0, (z - 7) / 7)), s = +(.3 + .7 * t * t * (3 - 2 * t)).toFixed(3), l = +Math.min(1, Math.max(0, z - 12.5)).toFixed(2);
    if (s === favS && l === favL) return; favS = s; favL = l; for (const m of favM) { const st = m.getElement().style; st.setProperty("--s", s); st.setProperty("--l", l); } };
  // üst sıradaki simgeler: dokununca oraya uçar, varınca işaret hafifçe yaylanır; zaten oradaysan yerin kartı açılır
  const favGo = (f) => { if (!map) return; snd.sel?.(); haptic(6); const c = map.getCenter();
    if (map.getZoom() >= 14.5 && km([c.lat, c.lng], f.ll) < .06) return favSheet(f);
    map.flyTo({ center: [f.ll[1], f.ll[0]], zoom: Math.max(map.getZoom(), 15), duration: 1100 });
    map.once("moveend", () => { const e = favM.map((m) => m.getElement()).find((x) => x.dataset.fid === String(f.id)); if (!e) return; e.classList.remove("arr"); void e.offsetWidth; e.classList.add("arr"); setTimeout(() => e.classList.remove("arr"), 600); }); };
  const favBar = () => { const b = $("#hmfv"); if (!b) return; const F = favs();
    b.innerHTML = F.length ? F.map((f) => `<button type="button" class="hfb" data-fv="${esc(f.id)}" aria-label="${esc(f.n)}" title="${esc(f.n)}">${favIc(f.n)}</button>`).join("") + '<i class="hsep"></i>' : "";
    $$("[data-fv]", b).forEach((x) => x.addEventListener("click", () => { const f = F.find((y) => String(y.id) === x.dataset.fv); if (f) favGo(f); })); };
  const favEdit = (ll, f, pre = "") => { snd.pop?.(); haptic(14);
    const sh = sheet(`<div class="pn fve" role="dialog" aria-label="Yeri kaydet"><div class="hd"><span class="rth"><b>${f ? "Adını değiştir" : "Bu yeri kaydet"}</b><small>${f ? esc(f.n) : "Haritada hep burada durur; değiştirene kadar."}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><label class="fvi">${favIc(f?.n || "")}<input id="fvn" maxlength="28" placeholder="Ev, okul, iş, spor salonu…" value="${esc(f?.n || pre)}" enterkeyhint="done"></label>
      <div class="fvq">${["Ev", "Okul", "İş", "Spor salonu", "Annemler"].map((q) => `<button type="button" data-q="${q}">${favIc(q)}${q}</button>`).join("")}</div>
      <button type="button" class="ok fvs" id="fvs" disabled>Kaydet</button>${f ? "" : `<button type="button" class="fvy" id="fvy">Yakınındaki etkinlikler</button>`}</div></div>`, "mn");
    const inp2 = $("#fvn", sh), ok = $("#fvs", sh), ic = () => { sh.querySelector(".fvi .cgi").outerHTML = favIc(inp2.value.trim()); ok.disabled = !inp2.value.trim(); };
    inp2.addEventListener("input", ic); ic(); setTimeout(() => { if (!f) inp2.focus(); }, 380);
    $$("[data-q]", sh).forEach((b) => b.addEventListener("click", () => { inp2.value = b.dataset.q; ic(); snd.sel?.(); haptic(4); }));
    const save = () => { const n = inp2.value.trim(); if (!n) return; const L = favs(); if (f) { const x = L.find((y) => y.id === f.id); if (x) x.n = n; } else { newFav = Date.now().toString(36); L.push({ id: newFav, n, ll: [+ll[0].toFixed(6), +ll[1].toFixed(6)] }); }
      favSave(L); snd.ok(); haptic(12); pinM?.remove(); sh.close(); drawFavs(); };
    ok.addEventListener("click", save); inp2.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); save(); } });
    $("#fvy", sh)?.addEventListener("click", () => { sh.close(); setTimeout(() => nearList(ll, "Bu noktanın yakınında"), 280); }); };
  const favSheet = (f) => { snd.pop?.(); haptic(8);
    const sh = sheet(`<div class="pn" role="dialog" aria-label="${esc(f.n)}"><div class="hd"><span class="rth" style="display:flex;flex-direction:row;align-items:center;gap:10px;text-align:left">${favIc(f.n)}<span><b>${esc(f.n)}</b><small>Kayıtlı yer${DATA.me && !DATA.me.c ? " · " + kmTxt(km(DATA.me.p, f.ll)) : ""}</small></span></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><button type="button" class="pcr" data-a="t">${ICO.car}<span><b>Yol tarifi</b><small>${esc(f.n)} için</small></span></button><button type="button" class="pcv" data-a="b"><span>✉️</span><b>Beraber gidelim mi?</b></button><div class="fvl"><button type="button" data-a="y">Yakınındaki etkinlikler</button><button type="button" data-a="g">Haritada göster</button><button type="button" data-a="r">Adını değiştir</button><button type="button" data-a="s" class="red">Sil</button></div></div></div>`, "mn");
    sh.querySelector("[data-a=y]").addEventListener("click", () => { sh.close(); setTimeout(() => { map?.flyTo({ center: [f.ll[1], f.ll[0]], zoom: 14, duration: 900 }); setTimeout(() => nearList(f.ll, f.n + " yakınında"), 950); }, 260); });
    sh.querySelector("[data-a=g]").addEventListener("click", () => { sh.close(); map?.flyTo({ center: [f.ll[1], f.ll[0]], zoom: 15.5, duration: 900 }); });
    sh.querySelector("[data-a=t]").addEventListener("click", () => { sh.close(); setTimeout(() => routeTo(f.ll, f.n), 260); });
    sh.querySelector("[data-a=b]").addEventListener("click", () => { sh.close(); setTimeout(() => placeInvite({ n: f.n, ll: f.ll, il: city, priv: true }), 240); });
    sh.querySelector("[data-a=r]").addEventListener("click", () => { sh.close(); setTimeout(() => favEdit(f.ll, f), 280); });
    sh.querySelector("[data-a=s]").addEventListener("click", () => { favSave(favs().filter((x) => x.id !== f.id)); snd.close?.(); haptic(10); sh.close(); drawFavs(); }); };
  /* Her yere yol tarifi (kullanıcı, 16.11.2026 20:02: "haritalardan istediğim her yere yol tarifi yapılabilsin"). Apple Haritalar'daki yer kartı:
     basılı tutulan nokta, haritadaki hazır yerler (kafe, okul, durak…), arama sonuçları ve kayıtlı yerler aynı kartla açılır:
     ad + tür/adres + uzaklık, büyük "Yol tarifi" (konumun biliniyorsa tahmini süreyle), Kaydet, Yakındaki etkinlikler.
     Adresi olmayan nokta için adres Photon'dan (anahtarsız) sorulur; gönderilen yalnızca noktanın koordinatıdır. */
  const routeTo = (ll, n) => routeSheet({ title: n, venue: n }, { lat: ll[0], lng: ll[1] }, city);
  const revGeo = (ll) => fetch(`https://photon.komoot.io/reverse?lat=${ll[0]}&lon=${ll[1]}&limit=1`).then((r) => r.ok ? r.json() : null).then((j) => { const p = j?.features?.[0]?.properties; if (!p) return null;
    const st2 = [p.street, p.housenumber].filter(Boolean).join(" "); return { n: p.name || st2 || p.district || p.locality || "", s: [p.name ? st2 : "", p.district || p.locality, p.city || p.county, p.state].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") }; }).catch(() => null);
  // Önizle = sokak modu (25.11.2026, kullanıcı: "video değil, Google Haritalar'daki sokak modu gibi"): Panoramax sokak fotoğrafı ya da yaya yüksekliğinde 3B model (sokak.js)
  const skOpen = (ll, n) => { const uy = mTheme() === "uydu", go = () => loadJS("/sokak.js?v=2", 15000).then(() => window.NVSK.open({ lat: ll[0], lng: ll[1], name: n, map, maplibregl: window.maplibregl, three: () => adaJ().then(() => window.NVA.three()), tick: () => { tick(); }, onClose: uy ? () => mStyle("uydu").then((u) => map.setStyle(u, { diff: false })) : null })).catch(() => toast("Sokak görünümü açılamadı, tekrar dene"));
    if (!uy) return go(); mStyle("koyu").then((st) => { map.once("idle", go); map.setStyle(st, { diff: false }); }); };
  const adaH = (ll, n) => skOpen(ll, n);
  const adaEski = (ll, n) => { if (mTheme() !== "uydu") return adaOpen(map, ll, n); mStyle("koyu").then((st) => { map.once("idle", () => adaOpen(map, ll, n, () => mStyle("uydu").then((u) => map.setStyle(u, { diff: false })))); map.setStyle(st, { diff: false }); }); };
  const placeCard = (ll, o = {}) => { snd.pop?.(); haptic(8); adaPre(); if (o.n || hukIn(ll[0], ll[1])) { const hn = hukName(o.n, ll[0], ll[1], o.s); if (hn !== o.n) o = { ...o, n: hn, s: "Üniversite" }; }
    if (!o.keep) { pinM?.remove(); pinM = map ? new maplibregl.Marker({ element: elOf('<div class="pin drop"></div>'), anchor: "bottom" }).setLngLat([ll[1], ll[0]]).addTo(map) : null; }
    const me2 = DATA.me && !DATA.me.c ? DATA.me.p : null, dist = me2 ? km(me2, ll) : null, nm = o.n || "Seçilen yer";
    const sh = sheet(`<div class="pn plc" role="dialog" aria-label="${esc(nm)}"><div class="hd"><span class="rth" style="display:flex;flex-direction:row;align-items:center;gap:11px;text-align:left">${o.ic || '<span class="cgi" style="background:#ff3b30"><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"/><circle cx="12" cy="10" r="2.3" fill="#ff3b30"/></svg></span>'}<span><b id="pcn">${esc(nm)}</b><small id="pcs">${esc(o.s || (o.n ? "" : "Adres bulunuyor…"))}${dist != null ? `${o.s ? " · " : ""}${kmTxt(dist)}` : ""}</small></span></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><button type="button" class="pcr" data-a="t">${ICO.car}<span><b>Yol tarifi</b><small id="pct">${dist != null ? "Süre hesaplanıyor…" : "Nereden gideceğini sen seç"}</small></span></button>
      <div class="pcy" id="pcy" hidden></div><button type="button" class="pcv" data-a="p"><span>🚶</span><b>Sokak görünümü</b></button><button type="button" class="pcv" data-a="b"><span>✉️</span><b>Beraber gidelim mi?</b></button><button type="button" class="pcv" data-a="q"><span>💬</span><b>Alıntıla</b></button><div class="pcb"><button type="button" data-a="k">${favIc("")}<span>Kaydet</span></button><button type="button" data-a="y"><span class="cgi" style="background:#8b5cf6"><svg viewBox="0 0 24 24"><path d="M5 9.5h14M5 9.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18V9.5M5 9.5V7a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 7v2.5M9 3.5v4M15 3.5v4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></svg></span><span>Yakındaki etkinlikler</span></button></div></div></div>`, "mn");
    let cur = { n: o.n || "", s: o.s || "" }; const name = () => cur.n || "Seçilen yer";
    if (!o.n) yvAround(ll, .02).then((L) => { const box = $("#pcy", sh); if (!box) return; const N = L.map((x) => [km(ll, [x[1], x[2]]), x]).filter((x) => x[0] < .09).sort((a, b) => a[0] - b[0]).slice(0, 4); if (!N.length) return; box.hidden = false; box.innerHTML = `<h4>Burası mı?</h4>${N.map(([d, x], i) => `<button type="button" data-y="${i}"><b>${esc(x[0])}</b><small>${esc(YVL[x[3]])} · ${Math.round(d * 1000)} m</small></button>`).join("")}`; $$("[data-y]", box).forEach((b) => b.addEventListener("click", () => { const x = N[+b.dataset.y][1]; sh.close(); setTimeout(() => placeCard([x[1], x[2]], { n: x[0], s: YVL[x[3]] }), 200); })); });
    if (!o.n) revGeo(ll).then((r) => { if (!r || !document.body.contains(sh)) { $("#pcs", sh) && ($("#pcs", sh).textContent = `${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}${dist != null ? " · " + kmTxt(dist) : ""}`); return; }
      cur = r; $("#pcn", sh).textContent = name(); $("#pcs", sh).textContent = [r.s, dist != null ? kmTxt(dist) : ""].filter(Boolean).join(" · "); });
    // Apple gibi düğmede tahmini süre: konum biliniyorsa en uygun yolla (2,5 km'ye kadar yürüyerek)
    if (me2) { const m = dist < 2.5 ? "foot" : "car"; routeOf(m, me2, ll).then((R) => { const el2 = $("#pct", sh); if (el2) el2.textContent = `${m === "foot" ? "Yürüyerek" : "Arabayla"} ${durTxt(Math.max(1, Math.round(R.duration / 60)))} · ${mTxt(R.distance)}`; }).catch(() => { const el2 = $("#pct", sh); if (el2) el2.textContent = kmTxt(dist) + " uzaklıkta"; }); }
    const oc = sh.close; let keepPin = false; sh.close = () => { if (!keepPin && o.temp !== false) pinM?.remove(); oc(); };
    $("[data-a=t]", sh).addEventListener("click", () => { snd.push?.(); haptic(10); sh.close(); setTimeout(() => routeTo(ll, name()), 240); });
    $("[data-a=b]", sh).addEventListener("click", () => { sh.close(); setTimeout(() => placeInvite({ n: cur.n, s: cur.s, ll, il: city, k: o.s }), 240); }); $("[data-a=p]", sh).addEventListener("click", () => { sh.close(); setTimeout(() => adaH(ll, cur.n), 240); }); $("[data-a=q]", sh).addEventListener("click", () => { sh.close(); alintila({ tur: "yer", il: city, baslik: name(), alt: cur.s || "", lat: +ll[0].toFixed(5), lng: +ll[1].toFixed(5) }); });
    $("[data-a=k]", sh).addEventListener("click", () => { keepPin = true; sh.close(); setTimeout(() => favEdit(ll, null, cur.n && !/^\d/.test(cur.n) ? cur.n : ""), 260); });
    $("[data-a=y]", sh).addEventListener("click", () => { sh.close(); setTimeout(() => nearList(ll, name() + " yakınında"), 260); }); };
  // haritadaki hazır yerler (OpenStreetMap: kafe, okul, park, durak…): dokununca yer kartı
  const POIK = { cafe: "Kafe", restaurant: "Restoran", fast_food: "Yemek", bar: "Bar", beer: "Bar", pub: "Bar", ice_cream: "Dondurma", bakery: "Fırın", park: "Park", garden: "Bahçe", playground: "Oyun alanı", school: "Okul", kindergarten: "Anaokulu", college: "Okul", university: "Üniversite", hospital: "Hastane", doctors: "Sağlık", dentist: "Diş hekimi", pharmacy: "Eczane", bus: "Durak", railway: "İstasyon", subway: "Metro", tram: "Tramvay", ferry_terminal: "İskele", aerialway: "Teleferik", airport: "Havalimanı", shop: "Mağaza", grocery: "Market", supermarket: "Market", clothing_store: "Giyim", mall: "AVM", place_of_worship: "İbadet yeri", museum: "Müze", art_gallery: "Galeri", theatre: "Tiyatro", cinema: "Sinema", music: "Müzik", library: "Kütüphane", lodging: "Konaklama", hotel: "Otel", attraction: "Gezilecek yer", monument: "Anıt", castle: "Kale", stadium: "Stadyum", sports: "Spor", swimming: "Havuz", pitch: "Saha", town_hall: "Belediye", police: "Polis", fire_station: "İtfaiye", fuel: "Akaryakıt", parking: "Otopark", bank: "Banka", atm: "ATM", post: "Postane", zoo: "Hayvanat bahçesi", campsite: "Kamp", information: "Bilgi", toilets: "Tuvalet" };
  const poiTap = (ev) => { if (wrap.classList.contains("picking")) return; const b = [[ev.point.x - 10, ev.point.y - 10], [ev.point.x + 10, ev.point.y + 10]], F2 = map.queryRenderedFeatures(b);
    if (F2.some((f) => ["ven", "ven-n", "un", "city"].includes(f.layer.id))) return;
    const yf = F2.find((f) => f.layer.id === "yv-d" || f.layer.id === "yv-t"); if (yf) { const c0 = yf.geometry.coordinates; placeCard([c0[1], c0[0]], { n: yf.properties.n, s: yf.properties.k }); return; }
    const f = F2.find((f) => ["poi", "aerodrome_label"].includes(f.sourceLayer) && (f.properties["name:tr"] || f.properties.name)); if (!f) return;
    const P = f.properties, n = P["name:tr"] || P.name, k = POIK[P.subclass] || POIK[P.class] || "Yer", c = f.geometry.coordinates;
    placeCard([c[1], c[0]], { n, s: k }); };
  const longPress = () => { let t = null, p0 = null; const cv = map.getCanvasContainer();
    const cancel = () => { clearTimeout(t); t = null; };
    let fired = false;
    cv.addEventListener("touchstart", (ev) => { fired = false; if (ev.touches.length !== 1) return cancel(); const r = el.getBoundingClientRect(); p0 = [ev.touches[0].clientX - r.left, ev.touches[0].clientY - r.top]; cancel();
      t = setTimeout(() => { t = null; fired = true; const ll = map.unproject(p0); placeCard([ll.lat, ll.lng]); }, 560); }, { passive: true });
    cv.addEventListener("touchmove", (ev) => { if (!t) return; const r = el.getBoundingClientRect(), q = ev.touches[0]; if (ev.touches.length > 1 || Math.hypot(q.clientX - r.left - p0[0], q.clientY - r.top - p0[1]) > 8) cancel(); }, { passive: true });
    cv.addEventListener("touchend", (ev) => { cancel(); if (fired) { fired = false; ev.preventDefault(); } }); // parmak kalkınca açılan paneli kapatan tıklama olmasın cv.addEventListener("touchcancel", cancel); map.on("movestart", cancel);
    map.on("contextmenu", (ev) => { if (matchMedia("(pointer:coarse)").matches) return; placeCard([ev.lngLat.lat, ev.lngLat.lng]); });
    map.on("click", poiTap); map.on("click", "nv-huk-t", () => placeCard([39.9347, 32.8282], { n: HUKN, s: "Üniversite" })); };
  // Filtreler (Apple gibi tek panel; sayı canlı)
  $("#hmf").addEventListener("click", () => { if (!IX) return; snd.sheet?.(); haptic(6); if (!tc.hidden) { tc.hidden = true; wrap.classList.remove("tco"); }
    const T = JSON.parse(JSON.stringify({ ...HM, cam: undefined }));
    const cats = ["sinema", ...Object.keys(CATS).filter((k) => k !== "sinema")].filter((k) => IX.e.some((x) => x[5] === k));
    const sh = sheet(`<div class="pn hmfp" role="dialog" aria-label="Harita filtreleri"><div class="hd"><button type="button" class="hf-rz" id="hf0">Sıfırla</button><span class="rth"><b>Filtreler</b></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><h4>Saat</h4><div class="hf-c hf-time"><div class="hf-th"><b class="hf-tl" id="hfl"></b><div class="hm-seg" id="hfseg" role="tablist"><i></i><button type="button" data-ta="1">Tüm gün</button><button type="button" data-ta="0">Saat seç</button></div></div>${trHTML()}</div>
      <h4>Ne zaman</h4><div class="hf-w">${HMW.map(([k, l]) => `<button type="button" data-w="${k}">${l}</button>`).join("")}</div>
      <h4>Bütçe</h4><div class="hf-w">${HMB.map(([k, l]) => `<button type="button" data-b="${k}">${l}</button>`).join("")}</div><p class="hf-n">Yalnızca fiyatı satış sitesinde son 36 saatte doğrulanmış etkinlikler.</p>
      <h4>Kategori</h4><div class="hf-k">${cats.map((k) => `<button type="button" data-k="${k}">${cgIcon(k)}<span>${esc(CATS[k])}</span><small data-kn="${k}"></small></button>`).join("")}</div>
      <h4>Diğer</h4><div class="grp lst hf-c"><label class="tg2"><span>Tükenenleri gizle</span><input type="checkbox" id="hft"></label></div>
      <button type="button" class="ok hf-go" id="hfg"></button></div></div>`, "mn hmfs");
    const lab = $("#hfl", sh), seg = $("#hfseg", sh), go = $("#hfg", sh); let cnt = 0;
    const R = trBind($(".hf-time", sh), () => T.from, (v, fin) => { T.from = v; lab.textContent = `${v} ve sonrası`; if (fin) { clearTimeout(cnt); cnt = setTimeout(count, 30); } });
    const ui = () => { $$("[data-w]", sh).forEach((b) => b.classList.toggle("on", b.dataset.w === T.when)); $$("[data-b]", sh).forEach((b) => b.classList.toggle("on", +b.dataset.b === T.bud));
      $$("[data-k]", sh).forEach((b) => b.classList.toggle("on", T.cats.includes(b.dataset.k))); $("#hft", sh).checked = T.tk;
      seg.classList.toggle("r", !!T.from); seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", (b.dataset.ta === "1") === !T.from));
      lab.textContent = T.from ? `${T.from} ve sonrası` : "Bütün saatler"; clearTimeout(cnt); cnt = setTimeout(count, 60); };
    // her değişiklik haritaya hemen yansır (Apple gibi; kapatınca da kalır), düğme yalnızca paneli kapatır
    const count = () => { Object.assign(HM, { when: T.when, cats: [...T.cats], from: T.from, bud: T.bud, tk: T.tk }); hmSave(); setData(); go.textContent = `${E.length.toLocaleString("tr-TR")} etkinliği göster`; go.disabled = !E.length;
      const K = {}; for (const x of hmFilter(IX, { ...T, cats: [] })) K[x[5]] = (K[x[5]] || 0) + 1; $$("[data-kn]", sh).forEach((s) => { s.textContent = K[s.dataset.kn] || ""; }); };
    seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const all = b.dataset.ta === "1"; if (all === !T.from) return; T.from = all ? "" : trNext(); snd.sel?.(); haptic(5); ui(); R.sync(); }));
    $("#hft", sh).addEventListener("change", (ev) => { T.tk = ev.target.checked; haptic(5); ui(); });
    $$("[data-w]", sh).forEach((b) => b.addEventListener("click", () => { T.when = b.dataset.w; snd.sel?.(); haptic(4); ui(); }));
    $$("[data-b]", sh).forEach((b) => b.addEventListener("click", () => { T.bud = +b.dataset.b; snd.sel?.(); haptic(4); ui(); }));
    $$("[data-k]", sh).forEach((b) => b.addEventListener("click", () => { const k = b.dataset.k; T.cats = T.cats.includes(k) ? T.cats.filter((x) => x !== k) : [...T.cats, k]; snd.sel?.(); haptic(4); ui(); }));
    $("#hf0", sh).addEventListener("click", () => { Object.assign(T, { ...HM0, cats: [] }); snd.sel?.(); haptic(5); ui(); R.sync(); });
    go.addEventListener("click", () => { snd.ok(); haptic(10); sh.close(); });
    ui(); R.sync(); });
  $("#hmn").addEventListener("click", () => { if (IX && !IX.e.length) { haptic(5); $("#hmn").innerHTML = `<b>Yeniden deneniyor</b>`; retryIx?.(); return; } $("#hmf").click(); });
  // arama: kayıtlı yerler, son aramalar, il, mekân, etkinlik ve herhangi bir yer adı
  const inp = $("#hmi"), res = $("#hmr"), clr = $("#hmx");
  const ico = { c: '<span class="cgi" style="background:#0a84ff"><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"/><circle cx="12" cy="10" r="2.3" fill="#0a84ff"/></svg></span>', v: '<span class="cgi" style="background:#8e8e93"><svg viewBox="0 0 24 24"><path d="M4 20V10l8-6 8 6v10h-5v-6H9v6z" fill="#fff"/></svg></span>', p: '<span class="cgi" style="background:#ff453a"><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"/><circle cx="12" cy="10" r="2.3" fill="#ff453a"/></svg></span>', r: '<span class="cgi" style="background:rgba(120,120,128,.36)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8v4.3l2.8 1.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></span>' };
  const runRec = (r) => { if (!map) return; done(false);
    if (r.k === "c") { goCity(r.c); return; }
    if (r.k === "f") { const f = favs().find((x) => x.n === r.l); if (f) { map.flyTo({ center: [f.ll[1], f.ll[0]], zoom: Math.max(map.getZoom(), 15), duration: 900 }); setTimeout(() => favSheet(f), 950); } else nearPlace(r.ll, r.l, r.s); return; }
    if (r.k === "p") { nearPlace(r.ll, r.l, r.s); return; }
    const g = VG.find((g) => g.v[3] === (r.k === "v" ? r.l : r.vn) && g.v[2] === r.c);
    if (r.k === "v") { if (g) { map.flyTo({ center: [g.v[1], g.v[0]], zoom: 16, duration: 1000 }); setTimeout(() => vSheet(g), 1050); } else goCity(r.c); return; }
    if (r.k === "e") { location.hash = r.href || `#/${r.c}/e/${encodeURIComponent(r.slug)}`; } };
  const home = () => { const F = favs(), R = recents();
    res.innerHTML = `<div class="hm-fv">${F.map((f, i) => `<button type="button" data-fi="${i}">${favIc(f.n)}<span>${esc(f.n)}</span></button>`).join("")}<button type="button" class="add" data-fa><span class="cgi" style="background:rgba(120,120,128,.36)"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></span><span>Ekle</span></button></div>
      ${R.length ? `<div class="hm-rh"><b>Son aramalar</b><button type="button" id="hmrc">Temizle</button></div>${R.map((r, i) => `<button type="button" data-ri="${i}">${r.k === "e" ? cgIcon(r.cat) || ico.r : ico[r.k] || ico.r}<span><b>${esc(r.l)}</b><small>${esc(r.s || "")}</small></span></button>`).join("")}` : `<p class="hm-0">Haritada bir yere basılı tutarak “Ev”, “Okul” gibi kendi yerlerini kaydedebilirsin.</p>`}`;
    res.hidden = false;
    $$("[data-fi]", res).forEach((b) => b.addEventListener("click", () => { const f = F[+b.dataset.fi]; done(); favSheet(f); }));
    $("[data-fa]", res).addEventListener("click", () => { done(false); const c = map?.getCenter(); if (c) { pinM?.remove(); pinM = new maplibregl.Marker({ element: elOf('<div class="pin"></div>'), anchor: "bottom" }).setLngLat(c).addTo(map); favEdit([c.lat, c.lng]); } });
    $$("[data-ri]", res).forEach((b) => b.addEventListener("click", () => { const r = R[+b.dataset.ri]; recAdd(r); runRec(r); }));
    $("#hmrc", res)?.addEventListener("click", () => { store.set("nvny-hson", "[]"); snd.close?.(); haptic(6); home(); }); };
  const search = () => { const raw = inp.value.trim(), q = fold(raw); clr.hidden = !q; HM.q = raw; hmSave(); if (!IX) return; if (!q) { home(); return; }
    const ws = q.split(/\s+/), hit = (s) => { const f = fold(s); return ws.every((w) => f.includes(w)); };
    const F = favs().filter((f) => hit(f.n)), cities = CITIES.filter((c) => hit(c.name)).slice(0, 3), seenV = new Set(), venues = [], evs = [];
    for (const g of VG) if (hit(g.v[3]) && !seenV.has(g.v[3] + g.v[2])) { seenV.add(g.v[3] + g.v[2]); venues.push(g); if (venues.length >= 4) break; }
    for (const x of E) if (hit(x[2]) && evs.length < 10 && !evs.some((y) => fold(y[2]) === fold(x[2]) && y[7] === x[7])) evs.push(x);
    placeSearch(raw);
    res.innerHTML = `${F.map((f, i) => `<button type="button" data-qf="${i}">${favIc(f.n)}<span><b>${esc(f.n)}</b><small>Kayıtlı yer</small></span></button>`).join("")}<div id="hmpl"></div>${cities.map((c) => `<button type="button" data-qc="${c.id}">${ico.c}<span><b>${esc(c.name)}</b><small>İl</small></span></button>`).join("")}
      ${venues.map((g, i) => `<button type="button" data-qv="${i}">${ico.v}<span><b>${esc(g.v[3])}</b><small>Mekân · ${esc(N[g.v[2]] || "")} · ${g.L.length} etkinlik</small></span></button>`).join("")}
      ${evs.map((x, i) => { const v = x[0] >= 0 ? IX.v[x[0]] : null; return `<button type="button" data-qe="${i}">${cgIcon(x[5]) || '<span class="cgi"></span>'}<span><b>${esc(x[2])}</b><small>${esc(dShort(x[3]))}${x[4] ? " · " + esc(x[4]) : ""} · ${esc(v ? v[3] : x[8])} · ${esc(N[x[7]] || "")}</small></span></button>`; }).join("")}
      ${!F.length && !cities.length && !venues.length && !evs.length ? `<p class="hm-0" id="hm0">Aranıyor…</p>` : ""}`;
    res.hidden = false;
    $$("[data-qf]", res).forEach((b) => b.addEventListener("click", () => { const f = F[+b.dataset.qf]; done(); favSheet(f); }));
    $$("[data-qc]", res).forEach((b) => b.addEventListener("click", () => { const c = b.dataset.qc; recAdd({ k: "c", l: N[c], s: "İl", c }); done(); goCity(c); }));
    $$("[data-qv]", res).forEach((b) => b.addEventListener("click", () => { const g = venues[+b.dataset.qv]; recAdd({ k: "v", l: g.v[3], s: "Mekân · " + (N[g.v[2]] || ""), c: g.v[2] }); done(); map.flyTo({ center: [g.v[1], g.v[0]], zoom: 16, duration: 1000 }); setTimeout(() => vSheet(g), 1050); }));
    $$("[data-qe]", res).forEach((b) => b.addEventListener("click", () => { const x = evs[+b.dataset.qe], v = x[0] >= 0 ? IX.v[x[0]] : null; recAdd({ k: "e", l: x[2], s: `${dShort(x[3])} · ${v ? v[3] : x[8]} · ${N[x[7]] || ""}`, c: x[7], slug: x[1], href: hmHref(x), cat: x[5], vn: v ? v[3] : x[8] }); done();
      const g = v ? VG.find((g) => g.v === v) : { v: [null, null, x[7], x[8], ""], L: (UG.get(x[7]) || []).filter((z) => z[8] === x[8]) };
      if (v) map.flyTo({ center: [v[1], v[0]], zoom: 16, duration: 1000 }); else if (ILLL[x[7]]) map.flyTo({ center: [ILLL[x[7]][1], ILLL[x[7]][0]], zoom: 11.5, duration: 1000 });
      setTimeout(() => g && vSheet(g), 1050); }));
  };
  const done = (snd2 = true) => { inp.blur(); res.hidden = true; if (snd2) { haptic(6); snd.push?.(); } };
  /* Yer araması (kullanıcı, 16.11.2026 09:07): semt, mahalle, ilçe, cadde ya da herhangi bir yer adı OpenStreetMap'te aranır (Photon, anahtarsız);
     seçince harita oraya gider ve en yakın etkinlikler uzaklığa göre sıralanır. Gönderilen yalnızca yazılan yer adıdır. */
  let pq = 0, pickAt = null, autoDeep = false;
  const PTY = { city: "İl / şehir", district: "İlçe / semt", locality: "Mahalle", street: "Cadde / sokak", house: "Adres", county: "İlçe", state: "İl", other: "Yer" };
  /* (16.11.2026 09:59, kullanıcı: "Sıhhiye Erkek Öğrenci Yurdu bizde görünmüyor, her yer görünmeli")
     - yazılan il adı sorgudan çıkarılır, arama o ile (yoksa haritanın baktığı yere) yönlendirilir; sonuçlar önce adı tam tutanlar, sonra yakınlık
     - tam eşleşme yoksa yerin semti/mahallesi de çıkar (ör. "Sıhhiye"), yakındaki etkinlikler oradan
     - "Daha derin ara": OpenStreetMap'in ikinci arama servisi (Nominatim; kuralı gereği yazarken değil, yalnızca dokununca)
     - yine yoksa: haritaya ekle ya da haritada basılı tutup kendin kaydet */
  const GEN = new Set(["yurdu", "yurt", "yurtlari", "ogrenci", "erkek", "kiz", "ozel", "devlet", "okulu", "okul", "lisesi", "universitesi", "fakultesi", "hastanesi", "camii", "cami", "parki", "park", "merkezi", "sitesi", "apartmani", "mahallesi", "mah", "caddesi", "cad", "sokak", "sokagi", "sk", "binasi", "kampusu", "ve", "ile", "subesi", "magazasi", "restoran", "kafe", "cafe", "otel", "oteli", "salonu", "spor", "kurs", "kursu", "dershanesi", "anaokulu", "ilkokulu", "ortaokulu"]);
  const pNorm = (f, src) => { if (src === "n") { const ad = f.address || {}; return { n: hukName(f.name || f.display_name.split(",")[0], f.lat, f.lon), s: ["Yer", ad.suburb || ad.neighbourhood || ad.quarter, ad.town || ad.city_district || ad.county, ad.province || ad.state].filter(Boolean).join(" · "), ll: [+f.lat, +f.lon] }; }
    const p = f.properties || {}; return { n: p.name || p.street || "", s: [(p.type === "house" && POIK[p.osm_value]) || (p.type === "house" && p.name ? "Mekân" : "") || PTY[p.type] || "Yer", p.district || p.locality, p.city !== p.name ? p.city : "", p.state].filter(Boolean).join(" · "), ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]], tp: p.type }; };
  const photon = (q, ll, n = 10, box = "25.6,35.8,44.9,42.2") => fetch(`https://photon.komoot.io/api/?limit=${n}&bbox=${box}&lat=${ll[0]}&lon=${ll[1]}&location_bias_scale=0.25&q=${encodeURIComponent(q)}`).then((r) => r.ok ? r.json() : null).then((j) => (j?.features || []).map(hukF).filter((f) => (f.properties?.countrycode || "").toUpperCase() === "TR").map((f) => pNorm(f))).catch(() => []);
  const placeSearch = (raw) => { const my = ++pq; if (raw.length < 3) return;
    const c0 = map ? map.getCenter() : null; let ll = c0 ? [c0.lat, c0.lng] : ILLL[city] || [39.93, 32.86], cityHit = null;
    const W = raw.split(/\s+/).filter((w) => { const f = fold(w.replace(/['’].*$/, "")).trim(); const c = CITIES.find((c) => fold(c.name) === f); if (c && !cityHit) { cityHit = c; return false; } return true; });
    if (cityHit && ILLL[cityHit.id]) ll = ILLL[cityHit.id]; const q = W.join(" ") || raw, sig = W.map((w) => fold(w).trim()).filter((w) => w.length > 1);
    const key = W.filter((w) => { const f = fold(w).trim(); return f.length > 1 && !GEN.has(f); });
    const full = (n) => { const f = fold(n); return sig.every((w) => f.includes(w)); }, nm = (x) => x.m || x.n;
    // ad farklı yazılmış olabilir ("Özel Sıhhiye Öğrenci Yurdu" gibi): tam sorgu + çekirdek sorgu ("Sıhhiye Yurdu") + semt aynı anda aranır, kelime örtüşmesine göre sıralanır
    const gen = W.filter((w) => GEN.has(fold(w).trim())), core = key.length && gen.length ? [...key, gen[gen.length - 1]].join(" ") : "";
    const ov = (n) => { const f = fold(n); return sig.filter((w) => f.includes(w)).length / Math.max(1, sig.length); };
    // (19.11.2026, kullanıcı: "kova waffle ankara diyom, bambaşka il öneriyor; mekân adlarını anla"): arama ilin içinde kalır (Photon il kutusunda,
    // bizim yer verimiz de haritanın ve ilin çevresinde), hiçbir anlamlı sözcüğü tutmayan sonuç gösterilmez; tam tutan yoksa en çok sözcüğü tutan yakın yerler gelir.
    const cc = cityHit && ILLL[cityHit.id] ? ILLL[cityHit.id] : ILLL[city] || ll, bx = (c, d) => `${(c[1] - d * 1.3).toFixed(3)},${(c[0] - d).toFixed(3)},${(c[1] + d * 1.3).toFixed(3)},${(c[0] + d).toFixed(3)}`, BOX = bx(cityHit ? cc : ll, cityHit ? .75 : .6);
    const wsig = (w) => !GEN.has(w) && w.length > 2; const lastW = [...sig].reverse().find(wsig) || "";
    setTimeout(async () => { if (my !== pq) return;
      const locP = Promise.all([...new Set([ll, cc].map((c) => c.map((v) => v.toFixed(1)).join(",")))].map((k) => yvAll(k.split(",").map(Number), .1).catch(() => []))).then((A) => A.flat().filter((y) => y && y[0]).map((y) => ({ n: hukName(y[0], y[1], y[2]), s: "Mekân", ll: [y[1], y[2]], loc: 1 })));
      const [L0, L1, A0, LC0, AD] = await Promise.all([photon(q, ll, 12, BOX), core && core !== q ? photon(core, ll, 8, BOX) : [], key.length && key.length < sig.length ? photon(key.join(" "), ll, 4, BOX) : [], locP, adrFind(q, ll, cc).catch(() => [])]); if (my !== pq || res.hidden) return; const LC = [...AD, ...LC0];
      let P0 = [...L0, ...L1]; if (!P0.some((x) => full(x.n)) && !LC.some((x) => full(nm(x)))) { const T = await photon(q, cc, 8); if (my !== pq || res.hidden) return; P0 = [...P0, ...T.filter((x) => full(x.n))]; }
      const hit = (n) => { const f = fold(n); return sig.filter((w) => wsig(w) && f.includes(w)).length; };
      const seen = new Set(), L = [...LC.filter((x) => hit(nm(x))), ...P0].filter((x) => { if (!x.n) return false; const k = fold(x.n).replace(/[^a-z0-9]/g, ""); if ([...seen].some((z) => z[0] === k && km(z[1], x.ll) < .25)) return false; seen.add([k, x.ll]); return true; })
        .filter((x) => full(nm(x)) || (hit(nm(x)) > 0 && km(cc, x.ll) < 70))
        .map((x) => [x, (full(nm(x)) ? 0 : (sig.length - hit(nm(x))) * 1e4 - (lastW && fold(nm(x)).includes(lastW) ? 5e3 : 0)) + km(ll, x.ll)]).sort((a, b) => a[1] - b[1]).map((x) => { const z = x[0]; if (z.loc && !z.adr) z.s = `Mekân · ${km(ll, z.ll) < 1 ? Math.round(km(ll, z.ll) * 1000) + " m" : km(ll, z.ll).toFixed(1).replace(".", ",") + " km"}`; return z; });
      // "starbucks kızılay" gibi: sözcüklerden biri semt/ilçe ise öteki sözcükleri o semtin çevresinde ara
      if (!L.some((x) => full(nm(x))) && sig.filter(wsig).length > 1) { const AT = ["district", "locality", "city", "county", "other"];
        const AW = await Promise.all(sig.filter(wsig).map((w) => photon(w, cc, 6, BOX).then((R2) => [w, R2.find((x) => AT.includes(x.tp) && fold(x.n) === w)]))); if (my !== pq || res.hidden) return;
        const ar = AW.find((z) => z[1]); if (ar) { const rest = sig.filter((w) => w !== ar[0]), aL = ar[1].ll;
          const [LA, PA] = await Promise.all([yvAll(aL, .1).catch(() => []), photon(rest.join(" "), aL, 10, bx(aL, .15))]); if (my !== pq || res.hidden) return;
          const sn = new Set(), C = [...LA.filter((y) => y && y[0]).map((y) => ({ n: hukName(y[0], y[1], y[2]), s: "Mekân", ll: [y[1], y[2]] })), ...PA].filter((x) => x.n && rest.every((w) => fold(x.n).includes(w)) && km(aL, x.ll) < 3).filter((x) => { const k = fold(x.n).replace(/[^a-z0-9]/g, "") + x.ll.map((v) => v.toFixed(3)); if (sn.has(k)) return false; sn.add(k); return true; }).sort((u, v) => km(aL, u.ll) - km(aL, v.ll)).slice(0, 8);
          if (C.length) { const an = ar[1].n; C.forEach((x) => { const d = km(aL, x.ll); x.s = `Mekân · ${an} · ${d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1).replace(".", ",") + " km"}`; }); pickAt = aL; draw(C, true, q); return; } } }
      const exact = L.some((x) => full(nm(x))), area = exact ? [] : A0.filter((x) => ["district", "locality", "city", "county", "street", "other"].includes(x.tp)).slice(0, 1);
      pickAt = area[0]?.ll || (cityHit && ILLL[cityHit.id]) || ll;
      draw([...L.filter((x) => full(nm(x))), ...area, ...L.filter((x) => !full(nm(x)))].slice(0, 8), exact, q);
      if (!exact && autoDeep) $("[data-qd]", res)?.click(); autoDeep = false;
    }, 300);
    const draw = (R, exact, q) => { const box = $("#hmpl", res); if (!box) return; $("#hm0", res)?.remove();
      // tam eşleşme yoksa en üstte: "haritaya ekle" (iğneyi kendin tam yerine koyarsın, hep haritada kalır)
      const ADD = (exact ? "" : `<button type="button" class="hm-add" data-qa>${favIc(q)}<span><b>“${esc(q)}”i haritaya ekle</b><small>İğneyi tam yerine koy, hep haritada kalsın</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`);
      box.innerHTML = (R.length ? "" : ADD) + R.map((x, i) => `<button type="button" data-qp="${i}">${ico.p}<span><b>${esc(x.n)}</b><small>${esc(x.s)} · yakındaki etkinlikler</small></span></button>`).join("") + (R.length ? ADD : "")
        + (exact ? "" : `<button type="button" data-qd>${ico.r.replace("rgba(120,120,128,.36)", "#5e5ce6")}<span><b>“${esc(q)}” için daha derin ara</b><small>OpenStreetMap'te ikinci bir aramayla</small></span></button>`);
      $$("[data-qp]", box).forEach((b) => b.addEventListener("click", () => { const x = R[+b.dataset.qp]; recAdd({ k: "p", l: x.n, s: x.s, ll: x.ll }); done(); if (Q.ara) { map?.flyTo({ center: [x.ll[1], x.ll[0]], zoom: 16, duration: 900 }); placeCard(x.ll, { n: x.n, s: x.s }); } else nearPlace(x.ll, x.n, x.s); }));
      const yok = () => hesapJS().then(() => window.NVH.araYok(q, city)).catch(() => {});
      $("[data-qa]", box)?.addEventListener("click", () => { yok(); pick(q, pickAt); });
      $("[data-qd]", box)?.addEventListener("click", yok, { once: true });
      $("[data-qd]", box)?.addEventListener("click", (ev) => { const bt = ev.currentTarget; bt.querySelector("small").textContent = "Aranıyor…"; haptic(4);
        const c = map ? map.getCenter() : { lat: 39.93, lng: 32.86 };
        fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=tr&accept-language=tr&limit=8&viewbox=${c.lng - .7},${c.lat + .5},${c.lng + .7},${c.lat - .5}&q=${encodeURIComponent(raw)}`).then((r) => r.ok ? r.json() : []).then((j) => {
          const N2 = (j || []).map((f) => pNorm(f, "n")).filter((x) => x.n && !R.some((y) => km(y.ll, x.ll) < .05));
          if (!N2.length) { bt.querySelector("b").textContent = "OpenStreetMap'te başka sonuç yok"; bt.querySelector("small").textContent = "En üstten “haritaya ekle” ile kendin işaretleyebilirsin"; bt.disabled = true; return; }
          const A = [...N2, ...R], ex = A.some((x) => full(x.n)); draw([...A.filter((x) => full(x.n)), ...A.filter((x) => !full(x.n))].slice(0, 10), ex, q); snd.sel?.(); }).catch(() => { bt.querySelector("small").textContent = "Şu an aranamadı, tekrar dene"; }); });
    }; };
  let qt = null; inp.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(search, 120); });
  inp.addEventListener("focus", () => search());
  // Enter: önce bizdeki eşleşme; yoksa yer araması derinleşir (Nominatim yalnızca bu bilinçli aramada çağrılır)
  $("#hmq").addEventListener("submit", (ev) => { ev.preventDefault(); const b = res.querySelector("button[data-qf],button[data-qc],button[data-qv],button[data-qe]"); if (b && !res.hidden) return b.click(); autoDeep = true; search(); });
  /* "Haritaya ekle" (kullanıcı, 10:45: "haritada çıkması lazım yerin"): OpenStreetMap'te olmayan yeri kişi kendisi koyar. Harita semte gider,
     ortada Apple Haritalar'daki gibi iğne durur; harita kaydırılır (iğne kalkar, bırakınca oturur), ad düzenlenebilir, "Buraya kaydet" → kayıtlı yer olarak hep haritada. */
  const pick = (name, ll) => { done(false); pinM?.remove(); $(".hm-pk", wrap)?.remove(); if (!map) return;
    map.flyTo({ center: [ll[1], ll[0]], zoom: 16.4, duration: 1000 }); wrap.classList.add("picking"); snd.pop?.(); haptic(10);
    const ov = elOf(`<div class="hm-pk"><span class="hm-pkp fv"><span class="fvp">${favIc(name)}</span></span><i class="hm-pks"></i>
      <div class="hm-pkc"><b>Nerede?</b><small>Haritayı kaydırıp iğneyi tam yerine getir</small><label class="fvi">${favIc(name)}<input maxlength="80" value="${esc(name)}" aria-label="Yerin adı"></label><label class="hm-pko tg"><span><b>Başkaları da bulsun</b><small>Onaydan sonra herkesin aramasında çıkar. Ev gibi özel yerlerde kapalı tut.</small></span><input type="checkbox" data-pub${/^(ev|evim|okulum|isim|işim|annem|babam|sevgilim|aile|ailem|ev\b)/i.test(name.trim()) ? "" : " checked"}></label><div class="hm-pkb"><button type="button" data-x>Vazgeç</button><button type="button" class="ok" data-s>Buraya kaydet</button></div></div></div>`);
    wrap.append(ov); const inp3 = $("input", ov), up = () => { ov.classList.add("mv"); }, dn = () => { if (ov.classList.contains("mv")) { ov.classList.remove("mv"); tick(); } };
    map.on("dragstart", up); map.on("moveend", dn);
    inp3.addEventListener("input", () => { const ic = favIc(inp3.value.trim()); $(".hm-pkp .fvp", ov).innerHTML = ic; $(".fvi .cgi", ov).outerHTML = ic; });
    const end = () => { map.off("dragstart", up); map.off("moveend", dn); ov.classList.add("out"); wrap.classList.remove("picking"); setTimeout(() => ov.remove(), 260); };
    $("[data-x]", ov).addEventListener("click", () => { snd.close?.(); haptic(5); end(); });
    $("[data-s]", ov).addEventListener("click", () => { const n = inp3.value.trim() || name, c = map.getCenter(), L = favs(); newFav = Date.now().toString(36); L.push({ id: newFav, n, ll: [+c.lat.toFixed(6), +c.lng.toFixed(6)] }); favSave(L);
      recAdd({ k: "f", l: n, s: "Kayıtlı yer", ll: [c.lat, c.lng] }); snd.ok(); haptic(14);
      if ($("[data-pub]", ov)?.checked && n.length >= 3) hesapJS().then(() => window.NVH.yerOner({ ad: n, lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6), tur: "" })).then((r) => toast(r?.ok ? "Kaydedildi. Önerin de alındı; onaylanınca herkes bu yeri bulabilecek." : "Kaydedildi (yalnızca sende).", 5200)).catch(() => {});
      end(); drawFavs(); }); };
  // uygulama içi bağlantılar: ?yer=enlem,boylam&ad=… (yer kartı; &rota=1 doğrudan yol tarifi), ?ara=… (haritada arama)
  const deep = () => { const y = String(Q.yer || "").split(",").map(Number); if (y.length === 2 && y.every(Number.isFinite)) { map.flyTo({ center: [y[1], y[0]], zoom: 16.2, duration: 900 }); setTimeout(() => { if (!alive()) return; if (Q.onizle) adaH(y, Q.ad || ""); else if (Q.rota) routeTo(y, Q.ad || "Seçilen yer"); else placeCard(y, { n: Q.ad || "", s: Q.alt || "" }); }, 950); } else if (Q.ara) { inp.value = Q.ara; autoDeep = true; search(); } };
  clr.addEventListener("click", () => { inp.value = ""; search(); inp.focus(); });
  el.addEventListener("pointerdown", () => { if (!res.hidden) { res.hidden = true; inp.blur(); } });
}
// konumu henüz bulunmayan mekânların etkinlikleri (il içinde tek liste, mekân mekân)
// haritadaki listeler gün gün (Apple Takvim gibi başlıklar); satırda saat, durum ve doğrulanmış fiyat
function unSheet(c, L0) {
  snd.pop?.(); haptic(8); const N = CNAME(), w = hmWhen();
  sheet(`<div class="pn" role="dialog" aria-label="${esc(N[c] || c)}"><div class="hd"><span class="rth"><b>${esc(N[c] || c)}</b><small>${w ? esc(w) + " · " : ""}${L0.length} etkinlik · mekân konumları henüz haritada yok</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2"><div class="mpl">${hmRows(L0, c, true)}</div></div></div>`, "mn");
}
// haritadaki mekân: seçili günün etkinlikleri; diğer günler tek dokunuşla; yol tarifi
function venueSheetX(g) {
  snd.pop?.(); haptic(8);
  const [lat, lng, c, name, ilce] = g.v, N = CNAME(), d = lat != null && DATA.me && !DATA.me.c ? km(DATA.me.p, [lat, lng]) : null, w = hmWhen(), more = g.more || [];
  const sh = sheet(`<div class="pn" role="dialog" aria-label="${esc(name)}"><div class="hd"><span class="rth"><b>${esc(name)}</b><small>${esc([ilce, N[c]].filter(Boolean).join(", "))}${d != null ? " · " + kmTxt(d) : ""}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2">${w && !["bugun", "yarin"].includes(HM.when) ? `<p class="mwl"><span>${esc(w)}</span>${g.L.length} etkinlik</p>` : ""}<div class="mpl">${hmRows(g.L, c)}</div>
    ${more.length ? `<button type="button" class="mmore" data-m>Başka günlerde ${more.length} etkinlik daha<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="mpl" data-mm hidden></div>` : ""}
    ${lat != null ? `<div class="vsb"><button type="button" class="ok" data-r>${I.dir}Yol tarifi</button></div><button type="button" class="pcv" data-b style="margin-top:8px"><span>✉️</span><b>Beraber gidelim mi?</b></button>` : `<p class="kmn" style="margin:12px 2px 0">Bu mekânın haritadaki yeri henüz bulunmadı; bulununca kendi yerinde görünecek.</p>`}</div></div>`, "mn");
  sh.querySelector("[data-m]")?.addEventListener("click", (ev) => { const m = sh.querySelector("[data-mm]"); m.innerHTML = hmRows(more, c); m.hidden = false; ev.currentTarget.remove(); snd.sel?.(); haptic(5); });
  const L = [...g.L, ...more].sort((a, b) => a[3].localeCompare(b[3]));
  sh.querySelector("[data-b]")?.addEventListener("click", () => { sh.close(); setTimeout(() => placeInvite({ n: name, s: [ilce, N[c]].filter(Boolean).join(", "), ll: [lat, lng], il: c, t: "sahne" }), 240); });
  sh.querySelector("[data-r]")?.addEventListener("click", () => { sh.close(); const v = { lat, lng, ilce }; setTimeout(() => routeSheet({ title: L[0][2], venue: name, d: L[0][3], t: L[0][4] }, v, c), 280); });
}

window.NVHAR = 1;
