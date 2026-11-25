// Sokak görünümü canlı denemesi: yayındaki site + gerçek Panoramax (360° WebGL mi, şerit mi, 3B model mi). Çıktı: günlük + /tmp/sokak/*.png
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const OUT = "/tmp/sokak"; await mkdir(OUT, { recursive: true });
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const P = [["taksim", 41.0369, 28.9850, "Taksim Meydanı"], ["izmir-kordon", 38.4333, 27.1430, "Kordon"], ["bursa-ulucami", 40.1840, 29.0618, "Ulu Cami"], ["kizilay", 39.9208, 32.8541, "Kızılay"], ["sakarya", 40.7806, 30.4033, "Sakarya merkez"]];
for (const [id, lat, lng, name] of P) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }), p = await c.newPage();
  p.on("pageerror", (e) => console.log("  HATA", e.message));
  await p.goto("https://nevarneyok.net.tr/indir/", { waitUntil: "domcontentloaded" });
  await p.addScriptTag({ url: "https://nevarneyok.net.tr/sokak.js?v=" + Date.now() });
  await p.addScriptTag({ url: "https://nevarneyok.net.tr/ada.js?v=40" }).catch(() => {});
  await p.evaluate(([lat, lng, name]) => { window.NVSK.open({ lat, lng, name, three: () => window.NVA.three() }); }, [lat, lng, name]);
  await p.waitForTimeout(9000);
  const r = await p.evaluate(() => ({ alt: document.querySelector(".skv-s")?.textContent, cr: document.querySelector(".skv-cr")?.textContent, webgl: !!document.querySelector(".skv-st canvas"), serit: !!document.querySelector(".skv-pn"), duz: !!document.querySelector(".skv-fl"), yok: !!document.querySelector(".skv-no"), yon: document.querySelector(".skv-to small")?.textContent }));
  await p.screenshot({ path: `${OUT}/${id}-1.png` });
  await p.mouse.move(300, 420); await p.mouse.down(); await p.mouse.move(80, 420, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${id}-2.png` });
  const nx = await p.$("[data-k=next]"); if (nx) { await nx.click(); await p.waitForTimeout(5000); await p.screenshot({ path: `${OUT}/${id}-3.png` }); }
  const r2 = await p.evaluate(() => document.querySelector(".skv-cr")?.textContent);
  console.log(`${name}: ${JSON.stringify(r)} · ileri sonrası: ${r2}`);
  await c.close();
}
await b.close();
