// Uçtan uca deneme: sahte bilet siteleri (yerel sunucu) + dünkü veri → run.mjs → beklenen sonuçlar
//   node test/run-tests.mjs           (gerçek tarayıcı denemesi için CHROME_PATH verilebilir)
import { createServer } from "node:http";
import { mkdtemp, writeFile, readFile, cp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseTrDate, parsePrice, parseISOish, istanbulParts } from "../lib/util.mjs";
import { eventsFromLd, eventsFromJson, eventFromHeuristics } from "../lib/extract.mjs";
import { sameEvent, loadVenues, canonVenue, guessCat } from "../lib/normalize.mjs";
import { parseManualCsv } from "../lib/manual.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRAPER = join(HERE, "..");
let failed = 0;
const t = (name, fn) => { try { fn(); console.log("  ✓", name); } catch (e) { failed++; console.log("  ✗", name, "\n    ", e.message); } };

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return istanbulParts(d).d; };
const D1 = day(2), D2 = day(3), D3 = day(9);

console.log("Birim denemeleri");
t("Türkçe tarih", () => {
  assert.deepEqual(parseTrDate("7 Kasım 2026 Cumartesi 20:00"), { d: "2026-11-07", t: "20:00" });
  assert.deepEqual(parseTrDate("07.11.2026 - 20.30"), { d: "2026-11-07", t: "20:30" });
  assert.equal(parseTrDate("Şubat 14 yok"), null);
});
t("ISO tarih ve saat dilimi", () => {
  assert.deepEqual(parseISOish("2026-11-07T17:00:00Z"), { d: "2026-11-07", t: "20:00" });
  assert.deepEqual(parseISOish("2026-11-07T20:00:00+03:00"), { d: "2026-11-07", t: "20:00" });
  assert.deepEqual(parseISOish("2026-11-07"), { d: "2026-11-07", t: "" });
});
t("Fiyat okuma", () => {
  assert.equal(parsePrice("1.250,00 TL"), 1250);
  assert.equal(parsePrice("₺ 777,30"), 777.3);
  assert.equal(parsePrice("1250.5"), 1250.5);
  assert.equal(parsePrice("2.200"), 2200);
  assert.equal(parsePrice("0"), null);
});
t("Aynı etkinlik eşleştirme", () => {
  loadVenues({ "Masterpiece Ankara": { place: "a" }, "Masterpiece Ümitköy": { place: "b" }, "Coffee Up Bahçelievler": { place: "c" } });
  assert.ok(sameEvent({ d: D1, t: "21:00", title: "Redd Konseri", venue: "Jolly Joker Ankara" }, { d: D1, t: "", title: "Redd", venue: "Jolly Joker Ankara" }));
  assert.ok(!sameEvent({ d: D1, t: "19:00", title: "Resim Atölyesi · Gölgelerin Aşkı", venue: "Masterpiece Ankara" }, { d: D1, t: "19:00", title: "Resim Atölyesi · Gölgelerin Aşkı", venue: "Masterpiece Ümitköy" }));
  assert.ok(!sameEvent({ d: D1, t: "", title: "Music Quiz Night", venue: "Coffee Up Bahçelievler" }, { d: D1, t: "", title: "Manifest Quiz Night", venue: "Coffee Up Bahçelievler" }));
  assert.ok(!sameEvent({ d: D1, t: "15:00", title: "Kuşlar", venue: "" }, { d: D1, t: "20:00", title: "Kuşlar", venue: "" }));
});
t("Mekân adı birleştirme", () => {
  loadVenues({ "CSO Ada · Ziraat Bankası Ana Salon": { place: "x", aliases: ["CSO Ada Ankara · Ana Salon"] } });
  assert.equal(canonVenue("CSO Ada Ankara - Ana Salon"), "CSO Ada · Ziraat Bankası Ana Salon");
});
t("Kategori tahmini", () => {
  assert.equal(guessCat({ title: "Harry Potter Quiz Night" }), "atolye");
  assert.equal(guessCat({ title: "Pamuk Prenses", url: "https://x.com/cocuk/pamuk" }), "cocuk");
  assert.equal(guessCat({ title: "Figaro'nun Düğünü · Ankara DOB" }), "sahne");
  assert.equal(guessCat({ title: "Redd", catHint: "konser" }), "konser");
});
t("JSON-LD okuma (çoklu seans, tükendi)", () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"TheaterEvent","name":"Kuşlar","startDate":"${D1}T20:00:00+03:00","location":{"@type":"Place","name":"CSO Ada Ankara - Ana Salon","address":{"addressLocality":"Ankara"}},"offers":[{"@type":"Offer","price":"120","availability":"https://schema.org/SoldOut"}]},{"@type":"TheaterEvent","name":"Kuşlar","startDate":"${D2}T15:00","location":"CSO Ada","offers":{"@type":"AggregateOffer","lowPrice":"100","highPrice":"300"}}]}</script>`;
  const ev = eventsFromLd(html, "https://ornek.com/kuslar");
  assert.equal(ev.length, 2);
  assert.equal(ev[0].status, "tukendi");
  assert.equal(ev[1].price, 100);
  assert.equal(ev[1].catHint, "tiyatro");
});
t("Fiyat: tükenmiş erken bilet en uygun fiyat sayılmaz", () => {
  const html = `<script type="application/ld+json">{"@type":"MusicEvent","name":"Redd","startDate":"${D1}T21:00:00+03:00","location":{"name":"Jolly Joker Ankara"},"offers":[{"@type":"Offer","name":"Erken bilet","price":"855","availability":"https://schema.org/SoldOut"},{"@type":"Offer","name":"Genel","price":"1254","availability":"https://schema.org/InStock"}]}</script>`;
  const ev = eventsFromLd(html, "https://ornek.com/redd");
  assert.equal(ev[0].price, 1254);
  assert.equal(ev[0].status, "");
});
t("Fiyat: sayfadaki rastgele sayı fiyat sanılmaz", () => {
  const ev = eventFromHeuristics(`<html><head><meta property="og:title" content="Gece"></head><body><h1>Gece</h1><p>${trDate(D2)} 21:00</p><p>Salon 250 TL'lik ses sistemiyle yenilendi. 1500 kişilik.</p></body></html>`, "https://x.com/g");
  assert.equal(ev.price, null);
  const ev2 = eventFromHeuristics(`<html><body><h1>Gece</h1><p>${trDate(D2)} 21:00</p><p>Biletler 450 TL'den itibaren</p></body></html>`, "https://x.com/g");
  assert.equal(ev2.price, 450);
});
t("Arka plan JSON'u okuma", () => {
  const ev = eventsFromJson({ data: { items: [{ eventName: "Can Bonomo", sessionDate: `${D2}T21:00:00`, venue: { name: "Jolly Joker Ankara", city: { name: "Ankara" } }, minPrice: 684, slug: "can-bonomo" }] } }, "https://bilet.example/");
  assert.equal(ev.length, 1);
  assert.equal(ev[0].venue, "Jolly Joker Ankara");
  assert.equal(ev[0].city, "Ankara");
  assert.equal(ev[0].url, "https://bilet.example/can-bonomo");
});
t("Elle ekleme tablosu (CSV)", () => {
  const rows = parseManualCsv(`tarih,saat,baslik,mekan,kategori,bilet_linki,fiyat,durum\n${D3},20:00,"Kapıda Ödemeli Caz Gecesi",Sahne X,konser,,150,\n7 Kasım 2026,,Yanlış Etkinlik,,,,,gizle\n`);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].price, 150);
  assert.equal(rows[1].d, "2026-11-07");
  assert.equal(rows[1].status, "gizle");
});

/* ---------- Uçtan uca ---------- */
console.log("\nUçtan uca deneme (yerel sahte siteler)");
const pages = {
  "/a/liste": `<html><body><h1>Ankara etkinlikleri</h1><a href="/a/etkinlik/redd">Redd</a><a href="/a/etkinlik/yeni-oyun">Yeni Oyun</a><a href="/a/etkinlik/sezgisel">Sezgisel</a><a href="/hakkimizda">Hakkımızda</a></body></html>`,
  "/a/etkinlik/redd": ld({ "@type": "MusicEvent", name: "Redd", startDate: `${D1}T21:00:00+03:00`, location: { name: "Jolly Joker Ankara", address: "Kızılırmak Cd. No:14, Çankaya, Ankara" }, offers: { price: "799" } }),
  "/a/etkinlik/yeni-oyun": ld({ "@type": "TheaterEvent", name: "Yepyeni Bir Oyun", startDate: `${D2}T20:30:00+03:00`, location: { name: "Şinasi Sahnesi", address: { addressLocality: "Ankara" } }, offers: { price: "250" }, description: "Denemelik yeni oyun açıklaması." }),
  "/a/etkinlik/sezgisel": `<html><head><meta property="og:title" content="Akustik Gece | Sahte Site"></head><body><h1>Akustik Gece</h1><p>Tarih: ${trDate(D2)} 21:30</p><p>Mekan: Altı Üstü Bar</p><p>Bilet: 300,00 TL</p></body></html>`,
  "/b/liste": `<html><body>bakımda</body></html>`,
};
const server = createServer((req, res) => {
  const p = pages[req.url.split("?")[0]];
  if (req.url.startsWith("/robots.txt")) { res.writeHead(404); return res.end(); }
  res.writeHead(p ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  res.end((p || "yok") + " ".repeat(2100)); // düz istekte "boş sayfa" sanılmasın
}).listen(0);
const port = server.address().port, H = `http://127.0.0.1:${port}`;

const dir = await mkdtemp(join(tmpdir(), "nvny-"));
await mkdir(join(dir, "data"), { recursive: true });
await cp(join(SCRAPER, "../data/venues.json"), join(dir, "data/venues.json"));
const old = (o) => ({ firstSeen: "2026-01-01T00:00:00Z", lastSeen: "2026-01-01T00:00:00Z", ...o });
const prev = { updated: "2026-01-01T00:00:00Z", baseline: "2026-01-01T00:00:00Z", events: [
  old({ d: D1, t: "21:00", title: "Redd", venue: "Jolly Joker Ankara", cat: "konser", genre: "Alternatif rock", price: 855, tickets: [{ site: "SahteA", url: `${H}/a/etkinlik/redd`, price: 855, src: "sahte-a", seen: "2026-01-01T00:00:00Z" }, { site: "Biletinial", url: "https://biletinial.com/x", price: 2200, src: "biletinial", seen: "2026-01-01T00:00:00Z" }] }),
  old({ d: D1, t: "20:00", title: "Bozuk Siteden Etkinlik", venue: "Kült Salon", cat: "sinema", tickets: [{ site: "SahteB", url: `${H}/b/e1`, price: 200, src: "sahte-b", seen: "2026-01-01T00:00:00Z" }] }),
  ...Array.from({ length: 12 }, (_, i) => old({ d: D3, t: "20:00", title: `B Etkinliği ${i}`, venue: "Kült Salon", cat: "sinema", tickets: [{ site: "SahteB", url: `${H}/b/x${i}`, src: "sahte-b", seen: "2026-01-01T00:00:00Z" }] })),
  old({ d: day(-3), t: "20:00", title: "Geçmiş Etkinlik", venue: "Kült Salon", cat: "sinema", tickets: [{ site: "SahteA", url: `${H}/a/gecmis`, src: "sahte-a" }] }),
] };
await writeFile(join(dir, "data/events.json"), JSON.stringify(prev));
await writeFile(join(dir, "data/manual.csv"), `tarih,saat,baslik,mekan,kategori,bilet_linki,fiyat,durum\n${D3},20:00,Kapıda Ödemeli Caz Gecesi,Altı Üstü Bar,konser,,150,\n`);
await writeFile(join(dir, "sources.mjs"), `export default [
  { id: "sahte-a", name: "SahteA", kind: "bilet", home: "${H}", listings: ["${H}/a/liste"], link: /\\/a\\/etkinlik\\//, city: "tr" },
  { id: "sahte-b", name: "SahteB", kind: "bilet", home: "${H}", listings: ["${H}/b/liste"], link: /\\/b\\/e\\//, city: "ankara" },
];`);

const code = await new Promise((ok) => {
  const p = spawn(process.execPath, [join(SCRAPER, "run.mjs")], { stdio: "inherit", env: { ...process.env, NO_BROWSER: "1", SOURCES_FILE: join(dir, "sources.mjs"), OUT_FILE: join(dir, "data/events.json"), DEBUG_DIR: join(dir, "debug"), ROOT_OVERRIDE: dir } });
  p.on("exit", ok);
});
server.close();
const out = JSON.parse(await readFile(join(dir, "data/events.json"), "utf8"));
const find = (title) => out.events.find((e) => e.title === title);
t("çalıştırma hatasız bitti", () => assert.equal(code, 0));
t("yeni etkinlik eklendi ve 'yeni' işaretli", () => { const e = find("Yepyeni Bir Oyun"); assert.ok(e); assert.notEqual(e.firstSeen, prev.baseline); assert.equal(e.cat, "tiyatro"); });
t("fiyatı düşen etkinlik: prevPrice yazıldı, diğer sitenin bileti korundu", () => { const e = find("Redd"); assert.equal(e.prevPrice, 855); assert.equal(e.price, 799); assert.ok(e.tickets.some((x) => x.site === "Biletinial")); assert.equal(e.genre, "Alternatif rock"); });
t("sezgisel sayfa okundu", () => { const e = find("Akustik Gece"); assert.ok(e); assert.equal(e.t, "21:30"); assert.equal(e.tickets[0].price, 300); });
t("bozulan kaynağın eski etkinlikleri korundu", () => { assert.ok(find("Bozuk Siteden Etkinlik")); assert.ok(find("B Etkinliği 3")); });
t("geçmiş tarihli etkinlik silindi", () => assert.ok(!find("Geçmiş Etkinlik")));
t("elle eklenen etkinlik listede", () => { const e = find("Kapıda Ödemeli Caz Gecesi"); assert.ok(e); assert.equal(e.cat, "konser"); });
t("sağlık raporu: SahteA çalışıyor, SahteB düştü", () => { const s = Object.fromEntries(out.sources.map((x) => [x.id, x])); assert.equal(s["sahte-a"].ok, true); assert.equal(s["sahte-b"].ok, false); });

console.log(failed ? `\n${failed} deneme başarısız` : "\nBütün denemeler geçti");
process.exit(failed ? 1 : 0);

function ld(obj) { return `<html><head><title>${obj.name}</title><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...obj })}</script></head><body><h1>${obj.name}</h1></body></html>`; }
function trDate(iso) { const [y, m, d] = iso.split("-").map(Number); return `${d} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][m - 1]} ${y}`; }
