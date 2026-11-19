// Ne Var Ne Yok · Beraber önizleme deposu. KV bağlantısının adı: YER
const SITE = "https://nevarneyok.net.tr", MAX = 260 * 1024, TTL = 60 * 86400, seen = new Map();
const cors = { "Access-Control-Allow-Origin": SITE, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Vary": "Origin" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = s => String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 70);
const type = s => /^[a-z0-9-]{1,24}$/.test(s || "") ? s : "yer";
function place(q) {
  const lat = +q.get("lat"), lng = +q.get("lng"), n = clean(q.get("n"));
  if (!n || !(lat > 35.5 && lat < 42.5 && lng > 25.5 && lng < 45)) return null;
  return { lat: lat.toFixed(4), lng: lng.toFixed(4), n, t: type(q.get("t")) };
}
async function idOf(p) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${p.lat},${p.lng}|${p.n.toLocaleLowerCase("tr")}`)));
  return [...h.slice(0, 9)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function jpegOk(b) {
  if (b.length < 2048 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return false;
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) return false;
    const m = b[i + 1], l = b[i + 2] << 8 | b[i + 3];
    if (m >= 0xc0 && m <= 0xc2) { const h = b[i + 5] << 8 | b[i + 6], w = b[i + 7] << 8 | b[i + 8]; return w >= 600 && w <= 1600 && h >= 300 && h <= 1600; }
    i += 2 + l;
  }
  return false;
}
function limited(ip) {
  const now = Date.now(), e = seen.get(ip);
  if (!e || now - e.t > 36e5) { if (seen.size > 5000) seen.clear(); seen.set(ip, { t: now, c: 1 }); return false; }
  return ++e.c > 30;
}
const page = (u, id, m) => {
  const title = `✉️ Beraber gidelim mi? · ${m.n}`, go = `${SITE}/y/t/${m.t}/`, img = `${u.origin}/g/${id}.jpg`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="robots" content="noindex"><meta property="og:type" content="website"><meta property="og:site_name" content="Ne Var Ne Yok"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="Dokun, orayı çevresiyle 3B gör. Geliyorsan Varım de."><meta property="og:url" content="${esc(u.href)}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:secure_url" content="${esc(img)}"><meta property="og:image:type" content="image/jpeg"><meta name="twitter:card" content="summary_large_image"><style>html{background:#0a0a10}</style><script>location.replace(${JSON.stringify(go)}+location.hash)</script></head><body><noscript><a href="${esc(go)}">Daveti aç</a></noscript></body></html>`;
};

/* ---------- Hesaplar (Google ile giriş). Bağlantılar: DB (D1). Gizli değerler: OTURUM_SIRRI, ADMIN_EPOSTA ---------- */
const GID = "1011120503952-d4i6abes7jkn59d08htbuomlrepq1jbh.apps.googleusercontent.com", OGUN = 60, b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), unb = (x) => Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(x.length / 4) * 4, "=")), (c) => c.charCodeAt(0)), TE = new TextEncoder(), AYRI = new Set("bt admin yonetici destek nevarneyok nvny oneside google resmi moderator api www profil hesap ayarlar".split(" ")); let JW = null, JT = 0;
const hmac = async (env, t) => b64u(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", TE.encode(env.OTURUM_SIRRI), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), TE.encode(t))), sha = async (t) => b64u(await crypto.subtle.digest("SHA-256", TE.encode(t)));
async function google(tok) { const [h, p, g] = String(tok).split("."); if (!g) return null; const H = JSON.parse(new TextDecoder().decode(unb(h))), C = JSON.parse(new TextDecoder().decode(unb(p))); if (Date.now() - JT > 36e5 || !JW) { JW = (await (await fetch("https://www.googleapis.com/oauth2/v3/certs")).json()).keys; JT = Date.now(); } const J = JW.find((k) => k.kid === H.kid); if (!J || H.alg !== "RS256") return null; const K = await crypto.subtle.importKey("jwk", J, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]); if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", K, unb(g), TE.encode(h + "." + p))) return null; return C.aud === GID && /^(https:\/\/)?accounts\.google\.com$/.test(C.iss) && C.exp * 1000 > Date.now() && C.email_verified ? C : null; }
const oturum = async (env, id) => { const t = id + "." + (Math.floor(Date.now() / 1000) + OGUN * 86400); return t + "." + await hmac(env, t); };
async function ben(req, env) { const m = (req.headers.get("Authorization") || "").match(/^Bearer (\d+)\.(\d+)\.([\w-]+)$/); if (!m || +m[2] * 1000 < Date.now() || await hmac(env, m[1] + "." + m[2]) !== m[3]) return null; return env.DB.prepare("SELECT * FROM kisi WHERE id=?").bind(+m[1]).first(); }
const gor = (k) => ({ ad: k.ad, gorunen: k.gorunen || k.ad, gizli: !!k.gizli, admin: k.rol === "admin" }), metin = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const KOTU = /(amk|aq\b|orospu|sik(er|iş|tir)|yarrak|piç|ibne|göt(veren|ün)|fuck|nazi)/i;
const acik = async (env, k) => k.rol === "admin" || k.beta || (await env.DB.prepare("SELECT v FROM ayar WHERE k='sosyal'").first())?.v === "1";
async function hesap(req, env, a) { const DB = env.DB, yol = a.slice(1).join("/"), G = req.method === "GET", B = G ? {} : await req.json().catch(() => ({})); if (!G && req.headers.get("Origin") !== SITE) return json({ hata: "izin" }, 403); if (!DB || !env.OTURUM_SIRRI) return json({ hata: "kurulum" }, 503);
  if (yol === "giris" && !G) { if (limited("g" + (req.headers.get("CF-Connecting-IP") || "?"))) return json({ hata: "cok" }, 429); const C = await google(B.kimlik).catch(() => null); if (!C) return json({ hata: "kimlik" }, 401); const gid = await sha("g:" + C.sub), adm = env.ADMIN_EPOSTA && String(C.email).toLowerCase() === String(env.ADMIN_EPOSTA).toLowerCase(); let k = await DB.prepare("SELECT * FROM kisi WHERE gid=?").bind(gid).first(); if (!k) { await DB.prepare("INSERT INTO kisi (gid,gorunen,rol,beta,olusma) VALUES (?,?,?,?,?)").bind(gid, "", adm ? "admin" : "uye", adm ? 1 : 0, Date.now()).run(); k = await DB.prepare("SELECT * FROM kisi WHERE gid=?").bind(gid).first(); } else if (adm && k.rol !== "admin") { await DB.prepare("UPDATE kisi SET rol='admin',beta=1 WHERE id=?").bind(k.id).run(); k.rol = "admin"; k.beta = 1; } return json({ oturum: await oturum(env, k.id), ben: k.ad ? gor(k) : null, sosyal: await acik(env, k), admin: k.rol === "admin" }); }
  const K = await ben(req, env); if (!K) return json({ hata: "giris" }, 401);
  if (yol === "ben") return json({ ben: K.ad ? gor(K) : null, sosyal: await acik(env, K), admin: K.rol === "admin", istek: (await DB.prepare("SELECT COUNT(*) n FROM takip WHERE kimi=? AND durum='bekliyor'").bind(K.id).first()).n });
  if (yol === "ad" && !G) { const ad = String(B.ad || "").toLowerCase().trim(), gr = metin(B.gorunen, 40); if (!/^[a-z0-9._]{2,20}$/.test(ad) || /^[._]|[._]$|\.\./.test(ad) || (ad.length < 3 && !(ad === "bt" && K.rol === "admin"))) return json({ hata: "bicim" }, 400); if ((AYRI.has(ad) && !(ad === "bt" && K.rol === "admin")) || KOTU.test(ad) || KOTU.test(gr)) return json({ hata: "uygun" }, 400); const v = await DB.prepare("SELECT id FROM kisi WHERE ad=? AND id<>?").bind(ad, K.id).first(); if (v) return json({ hata: "dolu" }, 409); await DB.prepare("UPDATE kisi SET ad=?,gorunen=?,gizli=? WHERE id=?").bind(ad, gr, B.gizli === false ? 0 : 1, K.id).run(); return json({ ben: gor({ ...K, ad, gorunen: gr, gizli: B.gizli === false ? 0 : 1 }) }); }
  if (yol === "sil" && !G) { for (const q of ["DELETE FROM takip WHERE kim=?1 OR kimi=?1", "DELETE FROM engel WHERE kim=?1 OR kimi=?1", "DELETE FROM kisi WHERE id=?1"]) await DB.prepare(q).bind(K.id).run(); return json({ ok: 1 }); }
  if (a[1] === "admin") { if (K.rol !== "admin") return json({ hata: "izin" }, 403); if (a[2] === "ozet") return json({ kisi: (await DB.prepare("SELECT COUNT(*) n FROM kisi").first()).n, adli: (await DB.prepare("SELECT COUNT(*) n FROM kisi WHERE ad IS NOT NULL").first()).n, sosyal: (await DB.prepare("SELECT v FROM ayar WHERE k='sosyal'").first())?.v === "1" }); if (a[2] === "sosyal" && !G) { await DB.prepare("INSERT INTO ayar (k,v) VALUES ('sosyal',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(B.acik ? "1" : "0").run(); return json({ ok: 1 }); } if (a[2] === "beta" && !G) { await DB.prepare("UPDATE kisi SET beta=? WHERE ad=?").bind(B.acik ? 1 : 0, String(B.ad || "").toLowerCase()).run(); return json({ ok: 1 }); } return json({ hata: "yok" }, 404); }
  if (!K.ad) return json({ hata: "ad" }, 409); if (!await acik(env, K)) return json({ hata: "kapali" }, 403);
  const hedef = async (ad) => { const h = await DB.prepare("SELECT * FROM kisi WHERE ad=?").bind(String(ad || "").toLowerCase()).first(); if (!h) return null; const e = await DB.prepare("SELECT 1 x FROM engel WHERE (kim=?1 AND kimi=?2) OR (kim=?2 AND kimi=?1)").bind(K.id, h.id).first(); return e ? null : h; }, say = async (id) => ({ takipci: (await DB.prepare("SELECT COUNT(*) n FROM takip WHERE kimi=? AND durum='onay'").bind(id).first()).n, takip: (await DB.prepare("SELECT COUNT(*) n FROM takip WHERE kim=? AND durum='onay'").bind(id).first()).n });
  if (a[1] === "u" && G) { const h = await hedef(a[2]); if (!h) return json({ hata: "yok" }, 404); const t = await DB.prepare("SELECT durum FROM takip WHERE kim=? AND kimi=?").bind(K.id, h.id).first(), g2 = await DB.prepare("SELECT durum FROM takip WHERE kim=? AND kimi=?").bind(h.id, K.id).first(); return json({ ...gor(h), ...await say(h.id), ben: h.id === K.id, durum: t?.durum || "", seniTakip: g2?.durum === "onay", gorunur: h.id === K.id || !h.gizli || t?.durum === "onay" }); }
  if (yol === "ara" && G) { const q = String(new URL(req.url).searchParams.get("q") || "").toLowerCase().replace(/[%_]/g, "").slice(0, 20); if (q.length < 2) return json({ kisiler: [] }); const r = await DB.prepare("SELECT k.ad,k.gorunen,k.gizli,k.rol FROM kisi k WHERE k.ad LIKE ?1 AND k.id NOT IN (SELECT kim FROM engel WHERE kimi=?2) AND k.id NOT IN (SELECT kimi FROM engel WHERE kim=?2) LIMIT 20").bind(q + "%", K.id).all(); return json({ kisiler: r.results.map(gor) }); }
  if (yol === "istekler" && G) { const r = await DB.prepare("SELECT k.ad,k.gorunen,k.gizli,k.rol FROM takip t JOIN kisi k ON k.id=t.kim WHERE t.kimi=? AND t.durum='bekliyor' ORDER BY t.zaman DESC LIMIT 100").bind(K.id).all(); return json({ kisiler: r.results.map(gor) }); }
  if (/^(takipciler|takipler)$/.test(a[1]) && G) { const h = await hedef(a[2]); if (!h) return json({ hata: "yok" }, 404); if (h.id !== K.id && h.gizli && !(await DB.prepare("SELECT 1 x FROM takip WHERE kim=? AND kimi=? AND durum='onay'").bind(K.id, h.id).first())) return json({ hata: "gizli" }, 403); const r = await DB.prepare(a[1] === "takipciler" ? "SELECT k.ad,k.gorunen,k.gizli,k.rol FROM takip t JOIN kisi k ON k.id=t.kim WHERE t.kimi=? AND t.durum='onay' LIMIT 200" : "SELECT k.ad,k.gorunen,k.gizli,k.rol FROM takip t JOIN kisi k ON k.id=t.kimi WHERE t.kim=? AND t.durum='onay' LIMIT 200").bind(h.id).all(); return json({ kisiler: r.results.map(gor) }); }
  if (G) return json({ hata: "yok" }, 404); const h = await hedef(B.ad); if (!h && yol !== "gizlilik") return json({ hata: "yok" }, 404);
  if (yol === "gizlilik") { await DB.prepare("UPDATE kisi SET gizli=? WHERE id=?").bind(B.gizli ? 1 : 0, K.id).run(); if (!B.gizli) await DB.prepare("UPDATE takip SET durum='onay' WHERE kimi=? AND durum='bekliyor'").bind(K.id).run(); return json({ ok: 1 }); } if (h.id === K.id) return json({ hata: "kendin" }, 400);
  if (yol === "takip") { const d = h.gizli ? "bekliyor" : "onay"; await DB.prepare("INSERT INTO takip (kim,kimi,durum,zaman) VALUES (?,?,?,?) ON CONFLICT(kim,kimi) DO NOTHING").bind(K.id, h.id, d, Date.now()).run(); return json({ durum: (await DB.prepare("SELECT durum FROM takip WHERE kim=? AND kimi=?").bind(K.id, h.id).first()).durum }); }
  if (yol === "birak") { await DB.prepare("DELETE FROM takip WHERE kim=? AND kimi=?").bind(K.id, h.id).run(); return json({ durum: "" }); } if (yol === "kabul") { await DB.prepare("UPDATE takip SET durum='onay' WHERE kim=? AND kimi=? AND durum='bekliyor'").bind(h.id, K.id).run(); return json({ ok: 1 }); } if (yol === "reddet" || yol === "cikar") { await DB.prepare("DELETE FROM takip WHERE kim=? AND kimi=?").bind(h.id, K.id).run(); return json({ ok: 1 }); }
  if (yol === "engelle") { await DB.prepare("INSERT OR IGNORE INTO engel (kim,kimi) VALUES (?,?)").bind(K.id, h.id).run(); await DB.prepare("DELETE FROM takip WHERE (kim=?1 AND kimi=?2) OR (kim=?2 AND kimi=?1)").bind(K.id, h.id).run(); return json({ ok: 1 }); } return json({ hata: "yok" }, 404); }
export default { async fetch(req, env) {
  const u = new URL(req.url), a = u.pathname.split("/").filter(Boolean);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (a[0] === "api") { try { return await hesap(req, env, a); } catch (e) { return json({ hata: "sunucu" }, 500); } }
  if (req.method === "GET" && a[0] === "var") { const p = place(u.searchParams); if (!p) return json({ hata: "yer" }, 400); const id = await idOf(p); return json({ id, var: !!(await env.YER.get("g:" + id, { type: "stream" }).then(s => (s && s.cancel(), s))) }); }
  if (req.method === "POST" && a[0] === "yukle") {
    if (req.headers.get("Origin") !== SITE) return json({ hata: "izin" }, 403);
    if (limited(req.headers.get("CF-Connecting-IP") || "?")) return json({ hata: "cok" }, 429);
    const p = place(u.searchParams); if (!p) return json({ hata: "yer" }, 400);
    if (+req.headers.get("Content-Length") > MAX) return json({ hata: "boyut" }, 413);
    const b = new Uint8Array(await req.arrayBuffer()); if (b.length > MAX) return json({ hata: "boyut" }, 413);
    if (!jpegOk(b)) return json({ hata: "gorsel" }, 415);
    const id = await idOf(p), k = "g:" + id;
    const old = await env.YER.get(k, { type: "stream" }); if (old) { old.cancel(); return json({ id, var: true }); }
    try { await env.YER.put(k, b, { expirationTtl: TTL, metadata: { n: p.n, t: p.t } }); } catch { return json({ hata: "kota" }, 503); }
    return json({ id, var: true });
  }
  if (req.method === "GET" || req.method === "HEAD") {
    const id = (a[1] || "").replace(/\.jpg$/, "");
    if (/^[0-9a-f]{18}$/.test(id) && (a[0] === "y" || a[0] === "g")) {
      const r = await env.YER.getWithMetadata("g:" + id, { type: "stream" });
      if (r.value && a[0] === "g") return new Response(r.value, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=2592000", "X-Content-Type-Options": "nosniff" } });
      if (r.value) { r.value.cancel(); return new Response(page(u, id, r.metadata), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } }); }
      if (a[0] === "y") return Response.redirect(`${SITE}/y/t/yer/`, 302);
    }
  }
  return new Response("Bulunamadı", { status: 404 });
} };
