/* NE VAR NE YOK · bildirim service worker'ı (yalnızca bildirim için; sayfaları önbelleğe almaz, çevrimdışı çalışma yok).
   Android'de kurulan uygulamada telefon arada bir (günde aşağı yukarı bir kez) "nvny-takip" ile uyandırır:
   güncel etkinlik listesini indirir, takip edilenlerdeki değişiklikleri ve hatırlatmaları (1 hafta, 3 gün, 1 gün önce, o gün, az kaldı, ertesi gün) bildirir;
   değişiklik yoksa günün tatlı önerisini (NV.digest, günde en çok bir) gönderir. */
importScripts("takip.js?v=7");
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
  for (const m of msgs.slice(0, 4)) await self.registration.showNotification(m.title, { body: m.body, tag: m.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: m.url } });
  const dg = mine && NV.digest(mine, prefs, await NV.get("lastDigest"), city, cityName);
  if (dg && !msgs.length) { await self.registration.showNotification(dg.title, { body: dg.body, tag: dg.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: dg.url } }); await NV.set("lastDigest", Date.now()); }
}
self.addEventListener("periodicsync", (e) => { if (e.tag === "nvny-takip") e.waitUntil(run().catch(() => {})); });
self.addEventListener("message", (e) => { if (e.data === "nvny-check") e.waitUntil(run().catch(() => {})); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { for (const c of cs) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } return self.clients.openWindow(url); }));
});
