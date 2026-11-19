// Toplu taşıma tarifi denemesi: canlı sitede ?pt=1 ile birkaç yol çizilir, adımlar ve ekran görüntüsü kaydedilir.
import { chromium } from "playwright"; import { writeFileSync as W, mkdirSync as M } from "node:fs";
const OUT = process.env.OUT || "/tmp/harita"; M(OUT, { recursive: true });
const T = [["kizilay-gazihukuk", [39.9208, 32.8541], "39.9347,32.8282", "Gazi Hukuk"], ["batikent-kizilay", [39.9686, 32.7306], "39.9208,32.8541", "Kızılay"], ["kadikoy-taksim", [40.9907, 29.0230], "41.0369,28.9850", "Taksim"]];
const b = await chromium.launch(), R = {};
for (const [k, me, to, ad] of T) { const c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "tr-TR", geolocation: { latitude: me[0], longitude: me[1] }, permissions: ["geolocation"] });
  await c.addInitScript(() => { for (const [x, v] of Object.entries({ "nvny-city": "ankara", "nvny-intro": "1", "nvny-intro-done": "1", "nvny-tur-ana": "1", "nvny-tur-harita": "1", "nvny-tur-sinema": "1", "nvny-rota-kaynak": "me" })) localStorage.setItem(x, v); });
  const p = await c.newPage(), er = []; p.on("pageerror", (e) => er.push(e.message.slice(0, 160)));
  try { await p.goto(`https://nevarneyok.net.tr/?pt=1&t=${Date.now()}#/${k.startsWith("kadikoy") ? "istanbul" : "ankara"}/harita?yer=${to}&ad=${encodeURIComponent(ad)}&rota=1`, { timeout: 60000 }); await p.waitForSelector('.rseg [data-m="pt"]', { timeout: 60000 }); await p.waitForTimeout(3000);
    await p.click('.rseg [data-m="pt"]'); await p.waitForTimeout(9000); R[k] = await p.evaluate(() => ({ ozet: document.querySelector(".rtp .rs1, .rtp .rerr")?.innerText.replace(/\s+/g, " "), hat: [...document.querySelectorAll(".rtp .ptl")].map((x) => x.innerText.replace(/\s+/g, " ")).slice(0, 6), adim: [...document.querySelectorAll(".rtp .ptw, .rtp .ptr")].map((x) => x.innerText.replace(/\s+/g, " ")) }));
    await p.screenshot({ path: `${OUT}/pt-${k}.jpg`, type: "jpeg", quality: 78 }); await p.click("#rgr").catch(() => {}); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/pt-${k}-acik.jpg`, type: "jpeg", quality: 78 });
  } catch (e) { R[k] = { hata: e.message.slice(0, 200) }; await p.screenshot({ path: `${OUT}/pt-${k}-hata.jpg` }).catch(() => {}); }
  R[k].sayfa = er; await c.close(); }
W(`${OUT}/pt.json`, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await b.close();
