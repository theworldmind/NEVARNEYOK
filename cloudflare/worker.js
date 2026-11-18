// Ne Var Ne Yok · Beraber önizleme deposu. KV bağlantısının adı: YER
const SITE = "https://nevarneyok.net.tr", MAX = 260 * 1024, TTL = 60 * 86400, seen = new Map();
const cors = { "Access-Control-Allow-Origin": SITE, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
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
export default { async fetch(req, env) {
  const u = new URL(req.url), a = u.pathname.split("/").filter(Boolean);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
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
