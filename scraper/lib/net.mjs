// Sayfa getirme: önce düz istek (hızlı), gerekirse gerçek tarayıcı (JavaScript ile yüklenen siteler)
import { sleep, log, withTimeout } from "./util.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const HEADERS = { "user-agent": UA, "accept-language": "tr-TR,tr;q=0.9,en;q=0.6", accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" };

const lastHit = new Map(); // site başına nezaket aralığı
async function polite(url, gap = 700) {
  const h = new URL(url).host, t = lastHit.get(h) || 0, w = t + gap - Date.now();
  if (w > 0) await sleep(w);
  lastHit.set(h, Date.now());
}

export async function fetchText(url, { timeout = 25000, retries = 1, gap } = {}) {
  for (let i = 0; i <= retries; i++) {
    await polite(url, gap);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const r = await fetch(url, { headers: HEADERS, redirect: "follow", signal: ac.signal });
      const text = await r.text();
      if (r.status === 429 || r.status >= 500) { if (i < retries) { await sleep(3000 * (i + 1)); continue; } }
      return { status: r.status, text, url: r.url };
    } catch (e) {
      if (i >= retries) return { status: 0, text: "", url, error: String(e.message || e) };
      await sleep(2000);
    } finally { clearTimeout(t); }
  }
}

/* ---------- Gerçek tarayıcı (Playwright) ---------- */
let browserP = null;
export async function browser() {
  if (!browserP) {
    browserP = (async () => {
      const { chromium } = await import("playwright");
      const opt = { headless: true, args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"] };
      if (process.env.CHROME_PATH) opt.executablePath = process.env.CHROME_PATH;
      return chromium.launch(opt);
    })();
  }
  return browserP;
}
export async function closeBrowser() { if (browserP) { try { (await browserP).close(); } catch {} browserP = null; } }

async function newPage() {
  const b = await browser();
  const ctx = await b.newContext({ userAgent: UA, locale: "tr-TR", timezoneId: "Europe/Istanbul", viewport: { width: 1366, height: 900 } });
  await ctx.route("**/*", (route) => {
    const t = route.request().resourceType();
    return ["image", "media", "font"].includes(t) ? route.abort() : route.continue();
  });
  return { ctx, page: await ctx.newPage() };
}

// Sayfayı aç, aşağı kaydır, "daha fazla" düğmelerine bas, arka plandaki JSON yanıtlarını topla
export async function renderPage(url, { scrolls = 6, loadMore = [], loadMoreClicks = 8, waitMs = 1500, captureJson = true, timeout = 90000 } = {}) {
  await polite(url, 1200);
  const { ctx, page } = await newPage();
  const jsons = [];
  if (captureJson) {
    page.on("response", async (res) => {
      try {
        const ct = res.headers()["content-type"] || "";
        if (!/json/i.test(ct) || res.request().resourceType() === "script") return;
        const len = +(res.headers()["content-length"] || 0);
        if (len > 6e6) return;
        const data = await res.json();
        jsons.push({ url: res.url(), data });
      } catch { /* yanıt okunamadı */ }
    });
  }
  try {
    return await withTimeout((async () => {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await acceptCookies(page);
      for (let i = 0; i < scrolls; i++) { await page.mouse.wheel(0, 2400); await page.waitForTimeout(450); }
      let clicks = 0;
      for (const text of loadMore) {
        while (clicks < loadMoreClicks) {
          const btn = page.getByText(text, { exact: false }).first();
          if (!(await btn.isVisible().catch(() => false))) break;
          await btn.click({ timeout: 4000 }).catch(() => {});
          clicks++;
          await page.waitForTimeout(1200);
          await page.mouse.wheel(0, 3000);
        }
      }
      await page.waitForTimeout(waitMs);
      return { status: resp ? resp.status() : 0, html: await page.content(), url: page.url(), jsons, clicks };
    })(), timeout, "sayfa");
  } catch (e) {
    log("  tarayıcı hatası:", url, e.message);
    return { status: 0, html: "", url, jsons, error: e.message };
  } finally { await ctx.close().catch(() => {}); }
}
async function acceptCookies(page) {
  for (const t of ["Kabul et", "Tümünü kabul et", "Kabul Et", "Anladım", "Tamam", "Accept all", "Accept"]) {
    const b = page.getByRole("button", { name: t }).first();
    if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 2000 }).catch(() => {}); return; }
  }
}

// Düz istek; 403/boş içerik gelirse tarayıcıyla dene
export async function getPage(url, { render = false, ...opt } = {}) {
  if (!render) {
    const r = await fetchText(url);
    if (r.status >= 200 && r.status < 400 && r.text.length > 2000) return { ...r, html: r.text, jsons: [] };
    if (process.env.NO_BROWSER) return { ...r, html: r.text || "", jsons: [] };
  }
  return renderPage(url, opt);
}
