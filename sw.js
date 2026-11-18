/* NE VAR NE YOK · bildirim service worker'ı (yalnızca bildirim için; sayfaları önbelleğe almaz, çevrimdışı çalışma yok).
   Android'de kurulan uygulamada telefon arada bir (günde aşağı yukarı bir kez) "nvny-takip" ile uyandırır:
   güncel etkinlik listesini indirir, takip edilenlerdeki değişiklikleri ve hatırlatmaları (1 hafta, 3 gün, 1 gün önce, o gün, az kaldı, ertesi gün) bildirir;
   değişiklik yoksa gün içinde öneri gönderir (NV.digest: sabah, kuşluk, öğle, akşam, gece; her dilimde en çok bir). Telefon uyandırma sıklığına kendisi karar verir. */
importScripts("takip.js?v=13");
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function run() {
  const follows = (await NV.get("follows")) || {}, prefs = await NV.get("prefs"), city = (await NV.get("city")) || "ankara", cityName = await NV.get("cityName");
  const today = NV.today(), file = (c) => (c === "ankara" ? "data/events.json" : `data/c/${c}.json`);
  const get = async (c) => { const r = await fetch(file(c), { cache: "no-store" }); if (!r.ok) return null; return ((await r.json()).events || []).filter((e) => e.d >= today); };
  // takip edilenler hangi illerdeyse o illerin verisi indirilir
  const cities = [...new Set([city, ...Object.values(follows).map((f) => f.city || "ankara")])];
  let F = follows, msgs = [], mine = null;
  for (const c of cities) {
    const ev = await get(c).catch(() => null); if (!ev) continue; if (c === city) mine = ev;
    const res = NV.check(F, ev, c); F = res.follows; msgs = msgs.concat(res.msgs);
  }
  await NV.set("follows", F);
  // yeni tarihlerini takip ettiği sanatçı/oyunlar (81 ilin dizini) ve takip ettiği filmler (ilin film dosyası)
  const arts = (await NV.get("arts")) || {}, fl = (await NV.get("films")) || {};
  if (Object.keys(arts).length) { try { const idx = await (await fetch("idx/a.json", { cache: "no-store" })).json(); const r = NV.watchA(arts, idx, null); await NV.set("arts", r.arts); msgs = msgs.concat(r.msgs); } catch {} }
  for (const c of [...new Set(Object.values(fl).map((f) => f.city || "ankara"))]) { try { const fd = await (await fetch(c === "ankara" ? "data/films.json" : `data/c/${c}-films.json`, { cache: "no-store" })).json(); const r = NV.watchF(Object.fromEntries(Object.entries(fl).filter(([, f]) => (f.city || "ankara") === c)), fd.films || [], c, ""); Object.assign(fl, r.films); msgs = msgs.concat(r.msgs); } catch {} }
  await NV.set("films", fl);
  const cfg = await NV.get("ncfg"); msgs = msgs.filter((m) => NV.allow(m, cfg));
  for (const m of msgs.slice(0, 4)) await self.registration.showNotification(m.title, { body: m.body, tag: m.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: m.url } });
  // gün içinde öneri: sabah, öğle (afişli), akşam — her dilimde en çok bir (NV.digest)
  const fm = await fetch(city === "ankara" ? "data/films.json" : `data/c/${city}-films.json`, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((j) => j?.films || []).catch(() => []);
  const last = await NV.get("dgSlots"), dg = mine && NV.digest(mine, prefs, last, city, cityName, fm);
  if (dg && !msgs.length && NV.allow(dg, cfg)) { await self.registration.showNotification(dg.title, { body: dg.body, tag: dg.tag + "-" + dg.slot, icon: "icons/icon-192.png", badge: "icons/icon-192.png", ...(dg.image ? { image: dg.image } : {}), vibrate: [40, 60, 40], data: { url: dg.url } });
    const t = NV.today(); await NV.set("dgSlots", { d: t, s: [...(last && last.d === t ? last.s || [] : []), dg.slot] }); }
}
self.addEventListener("periodicsync", (e) => { if (e.tag === "nvny-takip") e.waitUntil(run().catch(() => {})); });
self.addEventListener("message", (e) => { if (e.data === "nvny-check") e.waitUntil(run().catch(() => {})); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { for (const c of cs) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } return self.clients.openWindow(url); }));
});
