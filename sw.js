/* NE VAR NE YOK · bildirim service worker'ı (yalnızca bildirim için; sayfaları önbelleğe almaz, çevrimdışı çalışma yok).
   Android'de kurulan uygulamada telefon arada bir (günde aşağı yukarı bir kez) "nvny-takip" ile uyandırır:
   güncel etkinlik listesini indirir, takip edilenlerdeki değişiklikleri ve hatırlatmaları bildirir. */
importScripts("takip.js?v=1");
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function run() {
  const follows = (await NV.get("follows")) || {}, prefs = await NV.get("prefs"), city = (await NV.get("city")) || "ankara";
  if (!Object.keys(follows).length && !prefs) return;
  const r = await fetch("data/events.json", { cache: "no-store" }); if (!r.ok) return;
  const data = await r.json(), today = NV.today();
  const events = (data.events || []).filter((e) => e.d >= today);
  const res = NV.check(follows, events, city);
  await NV.set("follows", res.follows);
  for (const m of res.msgs.slice(0, 4)) await self.registration.showNotification(m.title, { body: m.body, tag: m.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: m.url } });
  const dg = NV.digest(events, prefs, await NV.get("lastDigest"), city);
  if (dg && !res.msgs.length) { await self.registration.showNotification(dg.title, { body: dg.body, tag: dg.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: dg.url } }); await NV.set("lastDigest", Date.now()); }
}
self.addEventListener("periodicsync", (e) => { if (e.tag === "nvny-takip") e.waitUntil(run().catch(() => {})); });
self.addEventListener("message", (e) => { if (e.data === "nvny-check") e.waitUntil(run().catch(() => {})); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { for (const c of cs) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } return self.clients.openWindow(url); }));
});
