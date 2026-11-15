// "TÜM TÜRKİYE CEBİNDE" hikâyesi (kullanıcı isteği, 15.11.2026: "hikâye boyutunda, tüm Türkiye anlaşılsın, afişler mükemmel, Apple gibi").
// Apple tanıtımı gibi sade: ortalı dev başlık, farklı illerden öne çıkan afişler kapak akışı (coverflow) gibi dizili,
// her afişin altında ili ve "Görsel: <kaynak>". Afişler değiştirilmez, kırpılmaz (sığdırılır); yüklenmeyen afiş çıkarılır. Fiyat yok.
// Çıktı: OUT_DIR/turkiye-hikaye.png (1080×1920; üst/alt ~250 px Instagram için boş).
import { join } from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { ROOT, log } from "./lib/util.mjs";

const OUT = process.env.OUT_DIR || join(ROOT, "paylas/uygulama");
await mkdir(OUT, { recursive: true });
const ev = (JSON.parse(await readFile(join(ROOT, "data/one-cikan.json"), "utf8")).events || []).filter((e) => e.img);
const IDX = JSON.parse(await readFile(join(ROOT, "data/cities.json"), "utf8")).cities;
// ortada İstanbul, iki yanında Ankara ve İzmir, sonra diğer büyük iller
const PRI = ["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "adana", "mersin", "kocaeli"];
const pick = [...ev].sort((a, b) => ((PRI.indexOf(a.city) + 99) % 99) - ((PRI.indexOf(b.city) + 99) % 99));
const LOGO = "data:image/png;base64," + (await readFile(join(ROOT, "brand/logo.png"))).toString("base64");
const esc = (t) => String(t || "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
const open = Object.values(IDX).filter((c) => c.n || c.films).length;

const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter+Tight:wght@500;600;700;800&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&text=onesidby&display=swap");
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1920px}
body{position:relative;overflow:hidden;background:#0a0a10;color:#fff;font-family:"Inter Tight",Arial,sans-serif;text-align:center}
.glow{position:absolute;inset:0;background:radial-gradient(55% 28% at 50% 54%,#8b5cf655,transparent 70%),radial-gradient(50% 22% at 50% 8%,#8b5cf622,transparent 70%)}
.logo{position:absolute;top:250px;left:0;right:0;display:flex;justify-content:center}.logo img{height:66px}
.kick{position:absolute;top:356px;left:0;right:0;font:700 30px/1 "Inter Tight",Arial,sans-serif;color:#c4b5fd;letter-spacing:.01em}
h1{position:absolute;top:410px;left:0;right:0;font:900 172px/.84 Archivo,"Arial Narrow",Arial,sans-serif;font-stretch:70%;text-transform:uppercase;letter-spacing:-.01em}
h1 em{font-style:normal;color:#a78bfa}
.sub{position:absolute;top:735px;left:110px;right:110px;font:600 36px/1.3 "Inter Tight",Arial,sans-serif;color:#ffffffb8}
.flow{position:absolute;left:0;right:0;top:880px;height:640px;perspective:1600px}
.cv{position:absolute;left:50%;top:0;width:360px;margin-left:-180px;transform-style:preserve-3d;transition:none}
.pi{position:relative;aspect-ratio:830/1200;border-radius:26px;overflow:hidden;background:#15121f;box-shadow:0 0 0 1.5px #ffffff22 inset,0 40px 80px -24px #000;-webkit-box-reflect:below 14px linear-gradient(transparent 72%,#ffffff26)}
.pi .pb{position:absolute;inset:-40px;width:calc(100% + 80px);height:calc(100% + 80px);object-fit:cover;filter:blur(28px) brightness(.5)}
.pi .pf{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.cap{position:absolute;left:-40px;right:-40px;top:calc(100% + 18px);display:flex;flex-direction:column;align-items:center;gap:8px}
.cy{font:800 24px/1 "Inter Tight",Arial,sans-serif;padding:10px 18px;border-radius:99px;background:#ffffff14;box-shadow:0 0 0 1.5px #ffffff26 inset;white-space:nowrap}
.cv.c0 .cy{background:#8b5cf6;box-shadow:0 0 40px #8b5cf699}
.cr{font:500 15px/1 "Inter Tight",Arial,sans-serif;color:#ffffff66;white-space:nowrap}
.cities{position:absolute;top:1488px;left:90px;right:90px;font:600 28px/1.45 "Inter Tight",Arial,sans-serif;color:#ffffff8a}
.cities b{color:#fff;font-weight:800}
.cta{position:absolute;top:1566px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:22px}
.btn{display:inline-flex;align-items:center;gap:12px;padding:22px 38px;border-radius:99px;background:#fff;color:#0a0a10;font:900 34px/1 Archivo,Arial,sans-serif;font-stretch:84%;text-transform:uppercase;box-shadow:0 0 60px #8b5cf688}
.btn svg{width:30px;height:30px}
.url{font:700 28px/1 "Inter Tight",Arial,sans-serif;color:#c4b5fd}
.os{position:absolute;top:1676px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:10px;color:#ffffff99;font:300 22px/1 Poppins}.os svg{width:22px;height:22px;fill:currentColor}.os em{font-style:normal}.os b{font-weight:800}
</style></head><body><div class="glow"></div>
<div class="logo"><img src="${LOGO}" alt="Ne Var Ne Yok"></div>
<div class="kick">81 il · tek uygulama</div>
<h1>TÜM TÜRKİYE<br><em>CEBİNDE.</em></h1>
<p class="sub">Konser, tiyatro, stand-up, sinema. Hangi ildeysen orada ne var ne yok, tek dokunuşla.</p>
<div class="flow">${pick.slice(0, 9).map((e) => `<div class="cv" data-c="${esc(e.city)}"><div class="pi"><img class="pb" src="${esc(e.img)}" alt="" referrerpolicy="no-referrer"><img class="pf" src="${esc(e.img)}" alt="" referrerpolicy="no-referrer"></div><div class="cap"><span class="cy">📍 ${esc(e.cityName)}</span><span class="cr">Görsel: ${esc(e.imgBy || "kaynak site")}</span></div></div>`).join("")}</div>
<p class="cities" id="ct"></p>
<div class="cta"><span class="btn">Uygulamayı indir<svg viewBox="0 0 24 24"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="url">nevarneyok.net.tr/indir</span></div>
<div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div>
</body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: "networkidle" });
await p.evaluate(async () => { await Promise.all(["900 100px Archivo", "700 30px \"Inter Tight\""].map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; });
// yüklenmeyen afişleri çıkar, kalanları kapak akışı gibi diz: ortada büyük, yanlarda dönük ve küçük (en çok 7)
const shown = await p.evaluate((open) => {
  const ok = [...document.querySelectorAll(".cv")].filter((c) => { const i = c.querySelector(".pf"); const g = i.complete && i.naturalWidth > 0; if (!g) c.remove(); return g; }).slice(0, 7);
  document.querySelectorAll(".cv").forEach((c) => { if (!ok.includes(c)) c.remove(); });
  const slot = [0, -1, 1, -2, 2, -3, 3];
  ok.forEach((c, i) => { const k = slot[i], a = Math.abs(k);
    c.classList.add("c" + a);
    c.style.transform = `translateX(${k * 205}px) translateZ(${-a * 170}px) rotateY(${-k * 32}deg) scale(${1 - a * .06})`;
    c.style.zIndex = 10 - a; c.style.filter = a ? `brightness(${1 - a * .16})` : "none";
    if (a >= 2) c.querySelector(".cy").style.visibility = "hidden"; // dış afişlerde il etiketi kalabalık yapmasın; "Görsel" yazısı kalır
  });
  const names = ok.map((c) => c.querySelector(".cy").textContent.replace("📍 ", ""));
  document.getElementById("ct").innerHTML = names.slice(0, 6).map((n) => `<b>${n}</b>`).join(" · ") + ` ve ${Math.max(0, 81 - Math.min(6, names.length))} il daha`;
  return names;
}, open);
await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, "turkiye-hikaye.png") });
await browser.close();
log(`Türkiye hikâyesi hazır: ${shown.join(", ")}`);
