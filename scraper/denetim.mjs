// TASARIM DENETİMİ (19.11.2026, kullanıcı: "tam Apple kalitesi; hizalama, akıcılık"): depodaki site (eksik dosyalar canlı siteden) uygulama kipinde
// üç boyda açılır (telefon 390×844, DeX/tablet 1210×760, bilgisayar 1440×900), ekranlar çekilir; telefonda 4× yavaş işlemcide kaydırma, afiş geçişi,
// geri dönüş ve panel açılışında 50 ms'yi aşan işler ile 34 ms'yi aşan kareler sayılır. Çıktı: OUT/<boy>-<ekran>.png + OUT/olcum.json
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";
import { ROOT, log } from "./lib/util.mjs";
const OUT = process.env.OUT_DIR || "/tmp/denetim", LIVE = "https://nevarneyok.net.tr", C = process.env.SHOT_CITY || "ankara";
await mkdir(OUT, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".bin": "application/octet-stream" };
const srv = createServer(async (q, r) => {
  const u = new URL(q.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
  try { const b = await readFile(join(ROOT, p)); r.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream", "cache-control": "no-store" }); r.end(b); }
  catch { try { const x = await fetch(LIVE + u.pathname + u.search); const b = Buffer.from(await x.arrayBuffer()); r.writeHead(x.status, { "content-type": x.headers.get("content-type") || MIME[extname(p)] || "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }
}).listen(0);
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const FLAGS = { "nvny-hosgeldin": "1", "nvny-hosgeldin-sor": "1", "nvny-nask-x": "1", "nvny-nask-f": "1", "nvny-intro": "1", "nvny-app-ilk": "1", "nvny-intro-done": "1", "nvny-city": C,
  "nvny-tur-ana": "1", "nvny-tur-sinema": "1", "nvny-tur-harita": "1", "nvny-tur-plan": "1", "nvny-tur-akis": "1", "nvny-ses": "0", "nvny-gece": "0" };
const SIZES = [["telefon", 390, 844, 3, true], ["dex", 1210, 760, 2, false], ["masaustu", 1440, 900, 1.5, false]];
const M = {};
for (const [nm, w, h, dpr, mob] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mob, hasTouch: mob, locale: "tr-TR", timezoneId: "Europe/Istanbul",
    geolocation: { latitude: 39.92077, longitude: 32.85411 }, permissions: ["geolocation"],
    userAgent: mob ? "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36" : undefined });
  await ctx.route(/goatcounter/, (r) => r.abort());
  await ctx.addInitScript((F) => { try { Object.defineProperty(navigator, "standalone", { get: () => true }); } catch {} for (const [k, v] of Object.entries(F)) try { if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch {}
    const s = document.createElement("style"); s.textContent = "*{caret-color:transparent!important}::-webkit-scrollbar{display:none}"; document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s)); }, FLAGS);
  const page = await ctx.newPage(); page.on("pageerror", (e) => log(`[${nm}] sayfa hatası: ${e.message.slice(0, 200)}`));
  let n = 0; const go = async (hash, ms = 2500) => { await page.goto(BASE + `?s=${++n}` + hash, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(ms); };
  const snap = async (k) => { await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, `${nm}-${k}.png`) }); log(`${nm}: ${k}`); };
  const T = async (k, f) => { try { await f(); } catch (e) { log(`${nm} ${k} atlandı: ${e.message.slice(0, 160)}`); } };
  await T("bugun", async () => { await go(`#/${C}`, 3000); await snap("1-bugun"); await page.evaluate(() => scrollTo(0, 700)); await page.waitForTimeout(900); await snap("2-bugun-kaydir"); });
  await T("etkinlik", async () => { await go(`#/${C}`, 2500); const a = await page.$('a.cd[href*="/e/"]:has(.ph img.p)'); if (a) { await a.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await a.click(); await page.waitForTimeout(1400); await snap("3-etkinlik"); await page.evaluate(() => scrollTo(0, 600)); await page.waitForTimeout(600); await snap("4-etkinlik-alt"); } });
  await T("sinema", async () => { await go(`#/${C}/sinema`); await snap("5-sinema"); });
  await T("harita", async () => { await go(`#/${C}/harita`, 7000); await snap("6-harita"); });
  await T("plan", async () => { await go(`#/${C}/takip`); await snap("7-planim"); });
  await T("akis", async () => { await go(`#/akis`); await snap("8-akis"); });
  await T("panel", async () => { await go(`#/${C}`, 2500); const b = await page.$("#pz"); if (b) { await b.click(); await page.waitForTimeout(900); await snap("9-panel"); } });
  if (mob) { // akıcılık: 4× yavaş işlemci
    await T("olcum", async () => {
      await go(`#/${C}`, 3000); const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const meas = async (k, f) => { await page.evaluate(() => { window.__lt = 0; window.__lf = 0; window.__fr = 0; window.__po?.disconnect(); window.__po = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 50) window.__lt++; }); window.__po.observe({ type: "longtask" }); let t0 = performance.now(); window.__run = true; const tick = (t) => { if (!window.__run) return; const d = t - t0; t0 = t; window.__fr++; if (d > 34) window.__lf++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
        await f(); await page.waitForTimeout(300); M[k] = await page.evaluate(() => { window.__run = false; return { uzunIs: window.__lt, takilanKare: window.__lf, kare: window.__fr }; }); log(`ölçüm ${k}: ${JSON.stringify(M[k])}`); };
      await meas("kaydirma", async () => { for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(60); } await page.waitForTimeout(400); });
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
      await meas("afis-gecisi", async () => { const a = await page.$('a.cd[href*="/e/"]:has(.ph img.p)'); if (a) { await a.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await a.click(); await page.waitForTimeout(1200); } });
      await meas("geri", async () => { const b = await page.$("#tback"); if (b) { await b.click(); await page.waitForTimeout(1200); } });
      await meas("panel", async () => { const b = await page.$("#pz"); if (b) { await b.click(); await page.waitForTimeout(1200); } });
    });
  }
  await ctx.close();
}
await writeFile(join(OUT, "olcum.json"), JSON.stringify(M, null, 1));
await browser.close(); srv.close(); log("denetim bitti");
