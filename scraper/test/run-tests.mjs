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
import { eventsFromLd, eventsFromJson, eventFromHeuristics, fixShiftedTimes } from "../lib/extract.mjs";
import { sameEvent, loadVenues, canonVenue, guessCat } from "../lib/normalize.mjs";
import { parseManualCsv } from "../lib/manual.mjs";
import { fold } from "../lib/util.mjs";
import { cleanTitle, titleKey } from "../lib/normalize.mjs";
import { isJunk } from "../lib/runner.mjs";
import { mergeWithPrevious } from "../lib/merge.mjs";
import * as P from "../sources/parsers.mjs";
import { factsFrom } from "../lib/normalize.mjs";
import { parseRobots, ruleMatch } from "../lib/net.mjs";

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
t("Yerel saati 'Z' ile yazan site: 20:00 seans 23:00 görünmez", () => {
  assert.deepEqual(parseISOish("2026-11-07T20:00:00Z"), { d: "2026-11-07", t: "20:00" });
  assert.deepEqual(parseISOish("2026-11-07T20:30:00+00:00"), { d: "2026-11-07", t: "20:30" });
  assert.deepEqual(parseISOish("2026-11-06T21:00:00Z"), { d: "2026-11-07", t: "" }); // yerel gece yarısı = yalnız tarih
  assert.deepEqual(parseISOish("2026-11-07T20:00:00Z", { exact: true }), { d: "2026-11-07", t: "23:00" });
});
t("Başlık anahtarı: kesme işareti ve bozuk İ", () => {
  assert.equal(titleKey("2000'ler Partisi"), titleKey("2000ler Partisi"));
  assert.equal(fold("Kuli̇s Sanat Ti̇yatrosu").trim(), "kulis sanat tiyatrosu");
  assert.equal(cleanTitle("KAN KARDEŞLER"), "Kan Kardeşler");
  assert.equal(cleanTitle("ŞEBNEM FERAH VE DOB KONSERİ"), "Şebnem Ferah ve DOB Konseri");
  assert.equal(cleanTitle("Duvar | Ankara | Yaşar Kemal KM"), "Duvar");
  assert.equal(cleanTitle("Redd"), "Redd");
});
t("Etkinlik olmayanlar ayıklanır (maç, kombine, haber)", () => {
  assert.ok(isJunk({ title: "MKE Ankaragücü - Akedaş Kahramanmaraş İstiklal Spor", venue: "Eryaman Stadyumu" }));
  assert.ok(isJunk({ title: "MKE Ankaragücü 26/27 Kombine" }));
  assert.ok(isJunk({ title: "37. Ankara Film Festivalinin afişi belli oldu" }));
  assert.ok(isJunk({ title: "Bir haber", via: "heuristic", t: "", venue: "" }));
  assert.ok(!isJunk({ title: "Redd - Aşk Dünyanın Sonu", venue: "IF Performance" }));
});
t("Sanatçepte: süre seans saati sanılmaz, seanslar ayrı ayrı okunur", () => {
  const h = `<h1 itemprop="name">TAV&#x15E;AN</h1><span class="eventAddress">Ankara - K&#xFC;&#xE7;&#xFC;k Tiyatro </span>
    <div>02:35:00 dakika</div><div class="location">K&#xFC;&#xE7;&#xFC;k Tiyatro</div><div class="date-container">
    <button class="seanceSelect">06 Kas&#x131;m 2026 Cuma <span>20:00</span></button>
    <button class="seanceSelect">07 Kas&#x131;m 2026 Cumartesi <span>15:00</span></button></div>`;
  const r = P.sanatcepte(h, "https://x/1");
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].d, r[0].t, r[0].venue, r[0].city, r[0].dur], ["2026-11-06", "20:00", "Küçük Tiyatro", "Ankara", "2 sa 35 dk"]);
  assert.equal(r[1].t, "15:00");
});
t("Bilkent: yalnızca boş koltuğu olan fiyat grubu en düşük fiyat sayılır", () => {
  const h = `<h1>In Memory</h1><div class="time">07 November 2026, 20:00</div><div class="place">Bilkent Concert Hall</div>
    priceGroups: [{"id":1,"price":"840"},{"id":2,"price":"450"}],
    seats: [{"price_group_id":"1","unavailable":"N","hidden":"N","closed":"N"},{"price_group_id":"2","unavailable":"Y","hidden":"N","closed":"N"}],
`;
  const r = P.bilkent(h, "https://x/2");
  assert.deepEqual([r[0].d, r[0].t, r[0].price, r[0].venue], ["2026-11-07", "20:00", 840, "Bilkent Konser Salonu"]);
});
t("Dünkü kayıt: sayfa bugün okunduysa ve seans artık yoksa silinir; ikizler birleşir", () => {
  const now = new Date().toISOString(), old = new Date(Date.now() - 864e5).toISOString();
  const prev = { events: [
    { d: D1, t: "23:00", title: "Beatrice", venue: "Bambu Sahne", cat: "tiyatro", tickets: [{ site: "Biletinial", url: "https://b/beatrice", price: 500, src: "biletinial", seen: old }] },
    { d: D1, t: "21:00", title: "2000'ler Partisi", venue: "Kite", cat: "parti", tickets: [{ site: "Biletix", url: "https://x/2000", price: 300, src: "biletix", seen: old }] },
  ] };
  const fresh = [
    { d: D1, t: "20:00", title: "Beatrice", venue: "Bambu Sahne", cat: "tiyatro", tickets: [{ site: "Biletinial", url: "https://b/beatrice", price: 550, pc: 3, src: "biletinial" }] },
    { d: D1, t: "21:00", title: "2000ler Partisi", venue: "Kite", cat: "parti", tickets: [{ site: "Biletinial", url: "https://b/2000", price: 280, pc: 3, src: "biletinial" }] },
  ];
  const health = { biletinial: { ok: true }, biletix: { ok: true } };
  const out = mergeWithPrevious(prev, fresh, health, { now, readUrls: new Set(["https://b/beatrice"]) });
  const b = out.filter((e) => e.title === "Beatrice");
  assert.equal(b.length, 1); assert.equal(b[0].t, "20:00"); assert.equal(b[0].tickets[0].price, 550);
  const p = out.filter((e) => /2000/.test(e.title));
  assert.equal(p.length, 1); assert.equal(p[0].tickets.length, 2);
});
t("Yapısal saat 3 saat kaymışsa sayfada görünen saat esas alınır", () => {
  const h = "<div>7 Kasım Cumartesi 20:00</div><div>16 Kasım 22:00</div>";
  const r = fixShiftedTimes([{ d: "2026-11-07", t: "23:00" }, { d: "2026-11-17", t: "01:00" }, { d: "2026-11-09", t: "20:30" }], h);
  assert.deepEqual(r.map((e) => e.d + " " + e.t), ["2026-11-07 20:00", "2026-11-16 22:00", "2026-11-09 20:30"]);
  // gerçekten 23:00'te olan gece gösterisi (sayfada 23:00 yazıyor) değişmez
  assert.equal(fixShiftedTimes([{ d: "2026-11-08", t: "23:00" }], "<p>8 Kasım 23:00</p><p>20:00</p>")[0].t, "23:00");
  assert.ok(isJunk({ title: "Fenerbahçe Gelişim - MKE Ankaragücü" }));
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
t("Tanıtım metninden yalnızca olgular: süre ve yaş", () => {
  assert.deepEqual(factsFrom("Oyun 2 saat 20 dakikadır. 12 yaş ve üzeri izleyiciler içindir."), { dur: "2 sa 20 dk", age: "12+" });
  assert.deepEqual(factsFrom("Süre: 90 dk, 18+"), { dur: "1 sa 30 dk", age: "18+" });
  assert.deepEqual(factsFrom("2026 yılının en güzel konseri, 3000 kişilik salonda"), {});
});
t("takvim sayfaları: Erimtan, CerModern, ABB liste kartından okunur", () => {
  const er = P.erimtanList(`<li> <a href="https://erimtanmuseum.org/tr/erken-roma-kameo-camlari"> <time datetime="2026-11-05 15:00">05 Kasım 2026 Perşembe, 15:00</time> <h3>Konferanslar</h3> <h2>Erken Roma Kameo Camları</h2> <span class="h5"><p>Konuşmacı: X</p></span></a></li>`, "https://erimtanmuseum.org/tr/takvim");
  assert.equal(er.length, 1); assert.equal(er[0].title, "Erken Roma Kameo Camları"); assert.equal(er[0].d, "2026-11-05"); assert.equal(er[0].t, "15:00"); assert.ok(!er[0].desc);
  const cer = P.cermodernList(`<div class="event-box"> <a href="https://www.cermodern.org/etkinlikler-entrikali-dolap-komedyasi" title=""> <img src="x.png"> <div class="overlay"> <div class="event-info"> <span class="category">Tiyatro</span> <h3>Entrikalı Dolap Komedyası</h3> <span class="date"> 15 Kasım 2026 <span>-</span> 15 Kasım 2026 </span> </div> </div> </a> </div>
    <div class="event-box"> <a href="https://www.cermodern.org/dizi" title=""> <div class="event-info"> <span class="category"></span> <h3>Atölye Dizisi</h3> <span class="date"> 01 Kasım 2026 <span>-</span> 29 Kasım 2026 </span> </div> </a> </div>`, "https://www.cermodern.org/etkinlikler");
  assert.equal(cer.length, 1, "birkaç güne yayılan dizi alınmaz"); assert.equal(cer[0].d, "2026-11-15"); assert.equal(cer[0].catHint, "tiyatro");
  const abb = P.abbList(`<a href="/etkinlik/anneler-gunu-183" title="Anneler Günü Kadınlar Matinesi" class="event-list-item circle-animate-light"> <span class="category">Konser</span> <div class="info"> <strong>Anneler Günü Kadınlar Matinesi</strong> <div> <i class="fal fa-calendar"></i> <span>10 Mayıs 2027 15:00</span> </div> <div> <i class="fal fa-location-dot"></i> <span>Başkent Sosyal Tesisi Salonu Susuz Mah. Göksu Parkı İçi No:17 Etimesgut/ ANKARA</span> </div> </div> </a>`, "https://www.ankara.bel.tr/etkinlikler");
  assert.equal(abb.length, 1); assert.equal(abb[0].d, "2027-05-10"); assert.equal(abb[0].t, "15:00"); assert.equal(abb[0].venue, "Başkent Sosyal Tesisi Salonu"); assert.equal(abb[0].url, "https://www.ankara.bel.tr/etkinlik/anneler-gunu-183");
});
{
  const fake = async () => ({ status: 200, text: JSON.stringify({ toplamSayfaSayisi: 1, data: [
    { oyunTarihi: "2027-01-08T13:00:00", oyunSaatleri: ["13:00", "16:00"], mudurlukAdi: "ANKARA", sahneAdi: "OPERA SAHNESİ", eserAdi: "KUĞU GÖLÜ", eserKonu: "uzun tanıtım", seoUrl: "kugu-golu-1", seoFullUrl: "https://biletinial.com/opera-bale/kugu-golu" },
    { oyunTarihi: "2027-01-08T20:00:00", oyunSaatleri: ["20:00"], mudurlukAdi: "İZMİR", sahneAdi: "X", eserAdi: "TOSCA", seoUrl: "tosca-88" }] }) });
  const dob = await P.dobCollect({ fetchText: fake });
  t("açık veri: DOB yalnızca Ankara temsilleri, her seans ayrı, satış bağlantısı ayrı", () => {
    assert.equal(dob.length, 2); assert.deepEqual(dob.map((x) => x.t), ["13:00", "16:00"]);
    assert.equal(dob[0].url, "https://www.operabale.gov.tr/eser/kugu-golu-1"); assert.equal(dob[0].buyUrl, "https://biletinial.com/opera-bale/kugu-golu");
    assert.ok(!dob[0].desc, "konu metni alınmaz");
  });
}
{
  const pages = { tiyatro: [{ id: 1, name: "Kontrabas", seoUrl: "kontrabas", saloonName: "Oda Tiyatrosu", saloonCount: 1, minTicketAmount: 450, seances: ["2027-01-10T18:30:00", "2027-01-11T18:30:00"], organizerUrl: "tiyatro", imageUrl: "/x.jpg" },
                           { id: 2, name: "Turne Oyunu", seoUrl: "turne", saloonName: "A", saloonCount: 3, seances: ["2027-01-12T20:00:00"], organizerUrl: "tiyatro" }],
                  sinema: [{ id: 3, name: "Festival - Uyuyan Kadın", seoUrl: "festival-uyuyan-kadin", saloonName: "Büyülü Fener Kızılay Sineması", saloonCount: 0, minTicketAmount: 300, seances: ["2027-01-10T21:15:00", "2027-01-10T23:00:00"], organizerUrl: "sinema" },
                           { id: 4, name: "Vizyon Filmi", seoUrl: "vizyon", saloonName: "X", saloonCount: 5, seances: ["2027-01-10T11:00:00", "2027-01-10T14:00:00", "2027-01-11T12:00:00", "2027-02-20T12:00:00"], organizerUrl: "sinema" }] };
  const fake = async (u) => { const org = u.match(/organizerUrl=([^&]+)/)[1]; return { status: 200, text: JSON.stringify({ hasMore: false, items: pages[org] || [] }) }; };
  const r = await P.biletinialCollect({ fetchText: fake, today: "2027-01-10" });
  t("Biletinial liste verisi: seanslar, festival, vizyon, çok salonlu kayıt detaya", () => {
    const k = r.raws.filter((x) => x.title === "Kontrabas"); assert.equal(k.length, 2); assert.equal(k[0].price, 450); assert.equal(k[0].venue, "Oda Tiyatrosu"); assert.ok(!k[0].image);
    assert.ok(r.detail.includes("https://biletinial.com/tr-tr/tiyatro/turne"));
    const f = r.raws.filter((x) => x.title === "Uyuyan Kadın"); assert.equal(f.length, 2, "festivalin her seansı"); assert.equal(f[0].genre, "Film festivali");
    const v = r.raws.filter((x) => x.title === "Vizyon Filmi"); assert.deepEqual(v.map((x) => x.d + " " + x.t), ["2027-01-10 11:00", "2027-01-11 12:00"]); assert.equal(v[0].venue, "Ankara sinemaları");
  });
}
{
  const A = await import("../audit.mjs");
  t("kapsam denetimi: haber başlığından ad çıkarır, bizde olanı tanır", () => {
    assert.deepEqual(A.candidatesFrom("37. Ankara Film Festivali başladı - Evrensel"), ["37. Ankara Film Festivali"]);
    assert.ok(A.candidatesFrom("Zuhal Olcay “Senaryo Dışı” panelinde - AA").includes("Senaryo Dışı"));
    const ev = [{ title: "Uyuyan Kadın", genre: "Film festivali", venue: "Büyülü Fener Kızılay Sineması" }];
    assert.ok(A.known("37. Ankara Film Festivali", ev)); assert.ok(!A.known("Ankara Caz Festivali", ev));
  });
  t("kapsam denetimi: geçmişe göre düşüş, boş gün ve sessiz mekân", () => {
    const mk = (at, n, v) => ({ at, total: n, bySource: { a: n }, byCat: { tiyatro: n }, byDay: { 1: n, 2: n }, venues: v ? { "Oda Tiyatrosu": 4 } : {}, films: 30 });
    const hist = [mk("2027-01-01", 100, 1), mk("2027-01-02", 100, 1), mk("2027-01-03", 100, 1)];
    const g = A.findGaps(mk("2027-01-04", 40, 0), hist, { sources: { a: { id: "a", name: "A", ok: true, notes: ["x: 151 bağlantı, durum 200, daha fazla düğmesi sınıra ulaştı (liste kesilmiş olabilir)"] } } });
    const k = new Set(g.map((x) => x.k)); for (const want of ["kaynak", "kategori", "gun", "mekan", "kesik"]) assert.ok(k.has(want), want);
  });
}
{
  const F = await import("../films.mjs");
  t("filmler: liste kartı ve Ankara seans sayfası okunur, konu metni alınmaz", () => {
    const list = F.parseList(`<div class="card metadata-card"><img alt="Kuzular Firarda (2026) afişi"><a href="https://www.sinemalar.com/film/292173/shaun-the-sheep-the-beast-of-mossy-bottom" class="poster-link"></a><div class="column gap-4 flex-1"><div class="card-title flex-1"> <a class="link" href="https://www.sinemalar.com/film/292173/shaun-the-sheep-the-beast-of-mossy-bottom"><h2>Kuzular Firarda: Gizemli Canavar</h2></a> </div> <div class="card-info"> 06.11.2026 • 1 saat 31 dakika • İngiltere, ABD • Animasyon, Komedi, Macera </div> <div class="card-info"><b>Vizyon Tarihi:</b> 06 Kasım 2026</div> <div class="card-info card-excerpt"><p>Uzun konu metni</p></div>`);
    assert.equal(list.length, 1); assert.deepEqual({ ...list[0] }, { id: 292173, slug: "shaun-the-sheep-the-beast-of-mossy-bottom", title: "Kuzular Firarda: Gizemli Canavar", release: "2026-11-06", dur: 91, country: "İngiltere, ABD", genre: "Animasyon, Komedi, Macera" });
    const html = `<div class="seance-day" data-day="2026-11-12"> <h2>Bugün</h2> <div class="content-list"> <div class="card metadata-card"> <div class="row"> <div class="column gap-4"> <div class="card-title"> <a class="link" href="https://www.sinemalar.com/sinemasalonu/1119/ankara-optimum-avsar"><h3>Ankara Optimum Avşar</h3></a> </div> <div class="card-info dark">Optimum AVM Eryaman – ANKARA</div> </div> </div> <div class="row"> <div class="column gap-16"> <div class="seance" data-dimension="2D" data-screen-type="" data-language="Türkçe"> <div class="mb-8">2D - Türkçe</div> <div class="chip-container"> <a class="btn secondary vertical disabled" href="x"> <span>11:00</span> <span>Bilet al</span> </a> <a class="btn secondary vertical" href="y" target="_blank"> <span>21:30</span> <span>Bilet al</span> </a> </div> </div> </div> </div> </div> </div> </div>
      <div class="seance-day day-inactive" data-day="2026-11-13"> <div class="card metadata-card"> <a class="link" href="https://www.sinemalar.com/sinemasalonu/1119/ankara-optimum-avsar"><h3>Ankara Optimum Avşar</h3></a> <div class="seance" data-dimension="3D" data-language="Altyazılı"> <a class="btn secondary vertical" href="z"> <span>9:15</span> </a> </div> </div> </div>`;
    const r = F.parseSeances(html);
    assert.equal(r.cinemas[1119].name, "Optimum Avşar");
    const up = F.parseList(`<div class="card metadata-card"><img loading="lazy" alt="Babamın Damadı (2026) afişi" src="x.jpg"> <a href="https://www.sinemalar.com/film/301179/babamin-damadi" class="poster-link"></a> <div class="card-info"><b>Vizyon Tarihi:</b> 13 Kasım 2026</div></div>`);
    assert.deepEqual([up[0].title, up[0].release], ["Babamın Damadı", "2026-11-13"]);
    const up2 = F.parseList(`<h2 class="section-subtitle">20 Kasım 2026</h2><div class="card metadata-card"><img alt="Aşk Tesadüfleri Sever 3 (2026) afişi"><a href="https://www.sinemalar.com/film/287221/ask-tesadufleri-sever-3" class="poster-link"></a></div>`);
    assert.deepEqual([up2[0].title, up2[0].release], ["Aşk Tesadüfleri Sever 3", "2026-11-20"]);
    assert.deepEqual(r.days["2026-11-12"][1119], [[["11:00", "21:30"], "2D Türkçe"]]);
    assert.deepEqual(r.days["2026-11-13"][1119], [[["09:15"], "3D Altyazılı"]]);
  });
}
t("robots.txt: yasaklanan sayfaya girilmez, en uzun kural kazanır", () => {
  const R = parseRobots("User-agent: *\nDisallow: /hesap\nAllow: /hesap/acik\nDisallow: /*?sort=\nCrawl-delay: 2\n\nUser-agent: NeVarNeYokBot\nDisallow: /ozel");
  const ok = (p) => { let b = null; for (const r of R.rules) if (ruleMatch(p, r) && (!b || r.path.length > b.path.length || (r.path.length === b.path.length && r.allow))) b = r; return !b || b.allow; };
  assert.equal(ok("/ozel/1"), false); assert.equal(ok("/hesap"), true, "bize özel grup varsa yalnızca o grup geçerli");
  const G = parseRobots("User-agent: *\nDisallow: /hesap\nAllow: /hesap/acik\nDisallow: /*?sort=\nCrawl-delay: 2");
  const ok2 = (p) => { let b = null; for (const r of G.rules) if (ruleMatch(p, r) && (!b || r.path.length > b.path.length || (r.path.length === b.path.length && r.allow))) b = r; return !b || b.allow; };
  assert.equal(ok2("/etkinlik/x"), true); assert.equal(ok2("/hesap/giris"), false); assert.equal(ok2("/hesap/acik/1"), true); assert.equal(ok2("/liste?sort=1"), false); assert.equal(G.delay, 2);
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
await writeFile(join(dir, "blocklist.txt"), "# deneme\netkinlik: B Etkinliği 5\n");
await writeFile(join(dir, "sources.mjs"), `export default [
  { id: "sahte-a", name: "SahteA", kind: "bilet", home: "${H}", listings: ["${H}/a/liste"], link: /\\/a\\/etkinlik\\//, city: "tr" },
  { id: "sahte-b", name: "SahteB", kind: "bilet", home: "${H}", listings: ["${H}/b/liste"], link: /\\/b\\/e\\//, city: "ankara" },
];`);

const code = await new Promise((ok) => {
  const p = spawn(process.execPath, [join(SCRAPER, "run.mjs")], { stdio: "inherit", env: { ...process.env, NO_BROWSER: "1", BLOCKLIST_FILE: join(dir, "blocklist.txt"), SOURCES_FILE: join(dir, "sources.mjs"), OUT_FILE: join(dir, "data/events.json"), DEBUG_DIR: join(dir, "debug"), ROOT_OVERRIDE: dir } });
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
t("bilet sitelerinin tanıtım metni ve görseli yayımlanmaz", () => assert.ok(out.events.every((e) => e.manual || (!e.desc && !e.image))));
t("engel listesindeki etkinlik çıkarıldı, diğerleri duruyor", () => { assert.ok(!find("B Etkinliği 5")); assert.ok(find("B Etkinliği 4")); });
t("sağlık raporu: SahteA çalışıyor, SahteB düştü", () => { const s = Object.fromEntries(out.sources.map((x) => [x.id, x])); assert.equal(s["sahte-a"].ok, true); assert.equal(s["sahte-b"].ok, false); });

console.log(failed ? `\n${failed} deneme başarısız` : "\nBütün denemeler geçti");
process.exit(failed ? 1 : 0);

function ld(obj) { return `<html><head><title>${obj.name}</title><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...obj })}</script></head><body><h1>${obj.name}</h1></body></html>`; }
function trDate(iso) { const [y, m, d] = iso.split("-").map(Number); return `${d} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][m - 1]} ${y}`; }
