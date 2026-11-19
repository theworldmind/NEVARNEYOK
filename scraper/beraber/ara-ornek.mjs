// Harita yer araması denemesi: canlı sitede birkaç sorgu yazılır, sonuçlar ve ekran görüntüsü kaydedilir.
import { chromium } from "playwright"; import { writeFileSync as W, mkdirSync as M } from "node:fs";
const OUT = process.env.OUT || "/tmp/harita"; M(OUT, { recursive: true });
const b = await chromium.launch(), c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "tr-TR" });
await c.addInitScript(() => { for (const [k, v] of Object.entries({ "nvny-city": "ankara", "nvny-intro": "1", "nvny-intro-done": "1", "nvny-tur-ana": "1", "nvny-tur-harita": "1", "nvny-tur-sinema": "1" })) localStorage.setItem(k, v); });
const p = await c.newPage(), R = {};
try { await p.goto(`https://nevarneyok.net.tr/?t=${Date.now()}#/ankara/harita`, { timeout: 60000 }); await p.waitForSelector("#hmq input", { timeout: 60000 }); await p.waitForTimeout(4000);
  for (const [i, q] of ["kova waffle ankara", "waffle", "hacı bayram veli hukuk", "kuğulu park", "starbucks kızılay"].entries()) { await p.fill("#hmq input", ""); await p.click("#hmq input"); await p.type("#hmq input", q, { delay: 40 }); await p.waitForTimeout(4500);
    R[q] = await p.$$eval("#hmpl button", (L) => L.map((b) => b.innerText.replace(/\s+/g, " ").slice(0, 110))); await p.screenshot({ path: `${OUT}/ara-${i}.jpg`, type: "jpeg", quality: 78 }); }
} catch (e) { R.hata = e.message.slice(0, 200); }
W(`${OUT}/ara.json`, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await b.close();
