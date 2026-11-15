/* NE VAR NE YOK · site (yeni tasarım, 15.11.2026'dan beri asıl site)
   Yönlendirme: #/ şehir seçimi · #/ankara şehir sayfası · #/ankara/kesfet?k=konser&t=bugun · #/ankara/e/<slug> etkinlik · #/ankara/sinema · #/ankara/film/<id>
   Kurallar (CLAUDE.md): fiyat yalnızca son 36 saatte doğrulandıysa; afiş kaynağından, değiştirilmeden, "Görsel: <kaynak>" ile; tanıtım metni yok (descOf). */
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
// Afiş yüklenince görünür olsun (satır içi onload kaçarsa da: yakalama aşamasında genel dinleyici)
document.addEventListener("load", (ev) => { const t = ev.target; if (t?.tagName === "IMG" && t.classList.contains("p")) t.parentNode?.classList.add("ok"); }, true);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

const IL = "Adana Adıyaman Afyonkarahisar Ağrı Aksaray Amasya Ankara Antalya Ardahan Artvin Aydın Balıkesir Bartın Batman Bayburt Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Düzce Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Iğdır Isparta İstanbul İzmir Kahramanmaraş Karabük Karaman Kars Kastamonu Kayseri Kilis Kırıkkale Kırklareli Kırşehir Kocaeli Konya Kütahya Malatya Manisa Mardin Mersin Muğla Muş Nevşehir Niğde Ordu Osmaniye Rize Sakarya Samsun Şanlıurfa Siirt Sinop Şırnak Sivas Tekirdağ Tokat Trabzon Tunceli Uşak Van Yalova Yozgat Zonguldak".split(" ");
/* Açık iller data/cities.json'dan gelir (her gece "Şehirleri güncelle"): etkinliği ya da filmi olan her il açılır */
let CIX = { ankara: { n: 1 } };
const POP = ["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "adana", "konya", "gaziantep", "mersin", "kocaeli", "kayseri", "samsun", "trabzon", "denizli"];
const rank = (c) => (c.live ? -100 : 0) + (POP.includes(c.id) ? POP.indexOf(c.id) : 50);
const CITIES = IL.map((n) => ({ id: fold(n).replace(/\s+/g, ""), name: n, get live() { const c = CIX[this.id]; return !!(c && (c.n || c.films)); }, get n() { return CIX[this.id]?.n || 0; } }));
const CATS = { konser: "Konser", tiyatro: "Tiyatro", standup: "Stand-up", sahne: "Opera · Bale · Dans", cocuk: "Çocuk & Aile", festival: "Festival", parti: "Parti", atolye: "Atölye & Söyleşi", sinema: "Sinema" };
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], GUNK = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"], AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const SALES = /^(biletix|biletinial|passo|bubilet|biletino|mobilet|sanatçepte|sanatcepte|iticket|bilkent bilet)$/i;
const BIG = /congresium|cso ada|jolly joker|if performance|ankara arena|bilkent|opera|cüneyt gökçer|akm|ankara spor salonu|mebi|holly stone|ccc|kongre/i;
const PRICE_MAX_H = 36;

/* ---------- Tarih yardımcıları (İstanbul saati) ---------- */
// saat biçimleyici bir kez kurulur (her çağrıda kurmak açılışta takılma yapıyordu)
const ISTF = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const nowIST = () => { const p = Object.fromEntries(ISTF.formatToParts(new Date()).map((x) => [x.type, x.value])); return { d: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` }; };
const pd = (s) => new Date(s + "T12:00:00");
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dShort = (s) => { const d = pd(s); return `${GUNK[d.getDay()]} ${d.getDate()} ${AYK[d.getMonth()]}`; };
const dLong = (s) => { const d = pd(s); return `${d.getDate()} ${AY[d.getMonth()]} ${GUN[d.getDay()]}`; };
const rel = (s) => { const t = nowIST().d; return s === t ? "Bugün" : s === addD(t, 1) ? "Yarın" : dShort(s); };
const ago = (iso) => { if (!iso) return ""; const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.round(m / 60)} saat önce` : `${Math.round(m / 1440)} gün önce`; };
const TL = (n) => "₺" + Math.round(n).toLocaleString("tr-TR");

/* ---------- Logo: kullanıcının logosu birebir (brand/logo.png, yazı tipi değiştirilmez) ---------- */
// Mercek cam (kullanıcı, 15.11.2026 23:58): harfler birebir aynı, yalnızca mor mercekte cam ışığı (brand/logo-cam.png, make-assets.py → glass_lens).
// Sayfa açılınca logonun üstünden bir kez ince ışık geçer (yalnızca transform); sonra durur, her sayfa değişiminde tekrar etmez.
let wmShone = false;
const WM = () => { const s = wmShone || store.get("nvny-az") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches ? "" : '<i class="shn" aria-hidden="true"></i>'; wmShone = true;
  return `<span class="wm"><img src="brand/logo-cam.png" alt="Ne Var Ne Yok" width="1301" height="653" decoding="async">${s}</span>`; };
const OS = `<svg viewBox="0 0 537 537" aria-hidden="true"><rect x="261" y="0" width="14" height="537"/><rect x="0" y="261" width="537" height="14"/><path d="M275 104C275 214 318 261 428 261H275Z"/><path d="M261 434C261 320 222 275 99 275H261Z"/></svg>`;
const I = {
  cal: `<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  pin: `<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
  tag: `<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="8.5" r="1.5" fill="currentColor"/></svg>`,
  info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  back: `<svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ext: `<svg class="ic" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  share: `<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M12 3v12M7 8l5-5 5 5M5 14v5h14v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dir: `<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M12 2l9 9-9 9-9-9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 13v-2h5V9l3 3-3 3v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  flt: `<svg class="ic" viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  spark: `<svg class="ic" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor"/></svg>`,
  bell: `<svg class="ic" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  bellOn: `<svg class="ic" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  srch: `<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
};

/* ---------- Veri ---------- */
const DATA = { events: [], venues: {}, films: null, buzz: {}, base: null, ready: false };
const gcEv = (p, t) => { const f = () => { try { window.goatcounter?.count?.({ path: p, title: t || p, event: true }); } catch {} }; window.goatcounter?.count ? f() : setTimeout(f, 3000); };
const jget = (u) => fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
async function boot() {
  const [cx, top] = await Promise.all([jget("data/cities.json"), jget("data/one-cikan.json")]);
  if (cx?.cities) CIX = cx.cities; DATA.top = top?.events || []; DATA.boot = true; DATA.venues = DATA.venues || {};
  // Açılışta yalnızca il listesi ve öne çıkanlar; mekân konumları ve il verisi gerektiğinde (il açılınca) iner — açılış takılmasın.
  const sv = store.get("nvny-city"), first = (standalone && !store.get("nvny-app-ilk")) || !store.get("nvny-intro");
  if (!first && sv && CITIES.find((c) => c.id === sv && c.live)) prefetch(sv);
}
/* Ankara: data/events.json + films.json + buzz.json · diğer iller: data/c/<il>.json + data/c/<il>-films.json */
const cityLoads = {}, pre = {};
function prefetch(city) { if (pre[city] || DATA.city === city) return; const ank = city === "ankara";
  pre[city] = Promise.all([jget(ank ? "data/events.json" : `data/c/${city}.json`), jget(ank ? "data/films.json" : `data/c/${city}-films.json`), ank ? jget("data/buzz.json") : null]); }
function loadCity(city) { return (cityLoads[city] ||= load(city).catch((e) => { delete cityLoads[city]; throw e; })); }
let venP = null;
async function load(city) {
  const ank = city === "ankara";
  if (ank) venP ||= jget("data/venues.json").then((vn) => { if (vn) DATA.venues = vn.venues || vn; }); else venueTr();
  prefetch(city); const [ev, fl, bz] = await pre[city]; delete pre[city];
  DATA.base = ev?.baseline; DATA.updated = ev?.updated; DATA.films = fl; DATA.buzz = bz || {};
  const fresh = (x) => !!(x.price && !x.est && x.seen && x.seen !== DATA.base && (Date.now() - Date.parse(x.seen)) / 36e5 <= PRICE_MAX_H);
  const { d: today, hm } = nowIST();
  const cx = DATA.buzz.cx || {}, bzKey = (t) => fold(t).replace(/\s+/g, "");
  const seenSlug = new Map();
  DATA.events = (ev?.events || []).filter((e) => e.d >= today && !(e.d === today && e.t && e.t < hm && timeDiff(e.t, hm) > 120)).map((e) => {
    const o = { t: "", status: "", ...e };
    o.tickets = (e.tickets || []).map((x) => ({ ...x, price: fresh(x) ? x.price : null, checked: x.seen && x.seen !== DATA.base ? x.seen : null }))
      .sort((a, b) => (a.price == null) - (b.price == null) || (a.price || 0) - (b.price || 0));
    const ps = o.tickets.map((x) => x.price).filter(Boolean); o.price = ps.length ? Math.min(...ps) : null;
    if (!o.status) { const m = cx[bzKey(o.title.split(/ · | \| /)[0])]; if (m) { const lo = addD(o.d, -30), L = m.filter((x) => !x[2] || (x[2] >= lo && x[2] <= o.d)); if (L.length) { o.status = L.some((x) => x[3] !== "ertelendi") ? "iptal" : "ertelendi"; o.stNews = L; } } }
    let s = slugOf(o); const n = (seenSlug.get(s) || 0) + 1; seenSlug.set(s, n); if (n > 1) s += "-" + n; o.slug = s;
    o.score = (BIG.test(o.venue || "") ? 3 : 0) + (o.tickets.length > 1 ? 2 : 0) + (o.price ? 1 : 0) + (o.img ? 2 : 0) + (o.status === "tukendi" ? 2 : 0) + (["konser", "tiyatro", "standup"].includes(o.cat) ? 1 : 0);
    o.isNew = o.firstSeen && (Date.now() - Date.parse(o.firstSeen)) / 864e5 <= 3 && o.firstSeen.slice(0, 10) !== (DATA.base || "").slice(0, 10);
    o.q = fold([o.title, o.venue, o.genre, CATS[o.cat], o.org].join(" "));
    o.free = /ücretsiz/i.test(e.note || "");
    // Fiyatı düşenler: önceki doğrulanmış en düşük fiyat şimdikinden yüksekse ve değişim son 7 günde olduysa (fiyat kuralı: yalnızca doğrulanmış fiyat)
    o.drop = o.price && e.prevPrice > o.price && e.priceChanged && (Date.now() - Date.parse(e.priceChanged)) / 864e5 <= 7 ? Math.round((1 - o.price / e.prevPrice) * 100) : 0;
    return o;
  }).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "99").localeCompare(b.t || "99"));
  DATA.bySlug = new Map(DATA.events.map((e) => [e.slug, e]));
  DATA.city = city; DATA.ready = true;
}
function timeDiff(a, b) { const m = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5); return m(b) - m(a); }
const live = (e) => e.status !== "iptal" && e.status !== "ertelendi";
const vOf = (name) => DATA.city && DATA.city !== "ankara" ? (DATA.vtr?.[DATA.city + "|" + name] || null) : (DATA.venues[name] || Object.entries(DATA.venues).find(([k]) => fold(k) === fold(name))?.[1] || null);
function descOf(e) {
  if (e.manual && e.desc) return e.desc;
  const org = e.org && !SALES.test(e.org.trim()) ? e.org : "";
  const f = [e.dur && `süre ${e.dur}`, e.age && `${String(e.age).replace("+", "")} yaş ve üzeri`, org && `düzenleyen ${org}`].filter(Boolean).join(" · ");
  return `${e.genre || CATS[e.cat] || "Etkinlik"} · ${e.venue}.${f ? " " + f[0].toLocaleUpperCase("tr") + f.slice(1) + "." : ""} Kadro, program ve kurallar için bilet sayfasına göz at.`;
}

/* ---------- Bileşenler ---------- */
function poster(e, { badge = true, lazy = true } = {}) {
  const st = e.status === "tukendi" ? "Tükendi" : e.status === "iptal" ? "İptal edildi" : e.status === "ertelendi" ? "Ertelendi" : "";
  const img = e.img ? `<img class="p" src="${esc(e.img)}" alt="${esc(e.title)} afişi" referrerpolicy="no-referrer" ${lazy ? 'loading="lazy"' : ""} decoding="async" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: ${esc(e.imgBy || "kaynak site")}</span>` : "";
  return `<div class="ph${e.img ? "" : " no"}" data-c="${esc(e.cat || "")}">${img}<div class="tp" lang="tr"><small>${esc(CATS[e.cat] || "Etkinlik")}</small><b>${esc(e.title)}</b><span class="tw"><small>${esc(dShort(e.d))}${e.t ? " · " + esc(e.t) : ""}</small><small>${esc(e.venue || "")}</small><i class="tl2">nevarneyok</i></span></div>${badge && st ? `<span class="bd${e.status === "tukendi" ? "" : " x"}">${st}</span>` : ""}</div>`;
}
/* FİYAT KARŞILAŞTIRMASI (kullanıcı isteği, 15.11.2026: "olabildiğince iyi fiyat karşılaştırması"): aynı etkinliği satan siteler alt alta;
   en düşük yeşil "En düşük" etiketiyle, diğerlerinde fark (₺ ve %), fiyat çubuğu, sitenin kendi fiyat kategorileri; yalnızca doğrulanmış (≤36 sa) fiyatlar. */
// Satış sitelerinin kendi simgeleri (kullanıcı isteği, 15.11.2026): dosya saklanmaz, sitenin kendi adresinden gösterilir (afişler gibi);
// yüklenemezse sitenin renginde baş harf kalır. Bilinmeyen sitede bilet adresinin alan adındaki /favicon.ico denenir.
const SITEI = { Biletinial: "https://b6s54eznn8xq.merlincdn.net/dist/assets/img/favicons/favicon-152.png", Biletix: "https://www.biletix.com/favicon.ico",
  "Sanatçepte": "https://www.sanatcepte.gov.tr/images/fav/apple-icon-76x76.png", iTicket: "https://iticket.com.tr/apple-touch-icon.png",
  Passo: "https://www.passo.com.tr/assets/fav-icons/fav-128px.png", Biletino: "https://biletino.com/assets/favicon/apple-icon-72x72.png",
  "Ankara DOB": "https://www.operabale.gov.tr/favicon.ico", Mobilet: "https://www.mobilet.com/favicon.ico" };
const siteIco = (x) => { if (SITEI[x.site]) return SITEI[x.site]; try { return `https://${new URL(x.url).host}/favicon.ico`; } catch { return ""; } };
const SITEC = { Biletinial: "#e8424f", Biletix: "#0071ce", Passo: "#e30613", Bubilet: "#7b2ff7", "iTicket": "#00b26a", "Sanatçepte": "#c8102e", "Bilkent Bilet": "#003a70", "tiyatrolar.com.tr": "#f59e0b", Mobilet: "#ff6a00", Biletino: "#ff3d00" };
function pcmpHTML(e) {
  const T = e.tickets, P = T.filter((x) => x.price), lo = P.length ? Math.min(...P.map((x) => x.price)) : 0, hi = P.length ? Math.max(...P.map((x) => x.price)) : 0, multi = P.length > 1;
  const row = (x) => { const d = x.price && multi ? x.price - lo : 0, best = multi && x.price === lo;
    const sub = !x.price ? "Fiyat sitede" : best ? "En düşük fiyat" : multi ? `+${TL(d)} · %${Math.round((d / lo) * 100)} daha yüksek` : "Satış sitesinde doğrulandı";
    return `<a class="pr2${best ? " lo" : ""}${x.price ? "" : " na"}" href="${esc(x.url)}" target="_blank" rel="noopener" data-buy="${esc(x.site)}">
      <span class="px-lg" style="--c:${SITEC[x.site] || "#8b5cf6"}">${siteIco(x) ? `<img src="${esc(siteIco(x))}" alt="${esc(x.site)}" referrerpolicy="no-referrer" loading="lazy" onerror="this.parentNode.classList.add('nf');this.remove()">` : ""}<b>${esc((x.site || "?").charAt(0).toLocaleUpperCase("tr"))}</b></span>
      <span class="px-nm"><b>${esc(x.site)}</b><small>${sub}</small>${x.price && multi ? `<span class="px-bar"><i style="width:${Math.max(8, Math.round((x.price / hi) * 100))}%"></i></span>` : ""}</span>
      <span class="px-amt">${x.price ? TL(x.price) : "—"}</span><span class="px-go">${best ? "Al" : "Git"}${I.ext}</span></a>
      ${x.cats?.length && x.price ? `<div class="cats">${x.cats.slice(0, 10).map((c) => `<span${c[2] === false ? ' class="x"' : ""}>${esc(c[0])} <b>${TL(c[1])}</b>${c[3] != null ? ` · ${c[3]} boş` : ""}${c[2] === false ? " · tükendi" : ""}</span>`).join("")}</div>` : ""}`; };
  const head = multi ? `<div class="pch"><div><b>Fiyat karşılaştırması</b><small>${P.length} sitede doğrulanmış fiyat · hizmet bedeli siteye göre değişebilir</small></div>${hi > lo ? `<span class="sv">Fark ${TL(hi - lo)}</span>` : `<span class="sv eq">Hepsinde aynı</span>`}</div>`
    : `<div class="pch"><div><b>${T.length > 1 ? "Satış siteleri" : "Satış sitesi"}</b><small>${P.length ? "Fiyat satış sitesinde doğrulandı" : "Güncel fiyat satış sitesinde"}</small></div></div>`;
  // Neden tek kartta: aynı etkinlik bu sitelerde aynı gün, aynı saat ve benzer adla bulundu (kullanıcıya şeffaflık)
  const why = T.length > 1 ? `<p class="pwhy">Bu etkinlik ${T.length} sitede aynı gün${e.t ? ", aynı saat" : ""} ve benzer adla bulunduğu için tek kartta birleştirildi.</p>` : "";
  return `<section class="pcx">${head}${T.map(row).join("")}${why}</section>`;
}

function card(e, city) {
  const np = e.tickets.filter((x) => x.price).length;
  const pr = e.price ? `<div class="pr">${TL(e.price)}'den${e.drop ? `<i class="dn">↓ %${e.drop}</i>` : np > 1 ? `<i>${np} sitede</i>` : ""}</div>` : e.free ? `<div class="pr">Ücretsiz</div>` : "";
  return `<a class="cd${live(e) ? "" : " off"}" href="#/${city}/e/${encodeURIComponent(e.slug)}">${poster(e)}${e._km != null ? `<span class="km">${I.pin}${kmTxt(e._km)}</span>` : ""}<div class="t">${esc(e.title)}</div><div class="m">${rel(e.d)}${e.t ? " · " + esc(e.t) : ""}</div><div class="m2">${esc(e.venue || "")}</div>${pr}</a>`;
}
function rail(title, sub, list, city, more) {
  if (!list.length) return "";
  return `<section class="rail"><div class="rh"><div><h3>${esc(title)}</h3>${sub ? `<small>${esc(sub)}</small>` : ""}</div>${more ? `<a href="${more}">Tümü →</a>` : ""}</div><div class="rs">${list.map((e) => card(e, city)).join("")}</div></section>`;
}
function uniq(list, n, key = (e) => fold(e.title).slice(0, 26)) { const s = new Set(), out = []; for (const e of list) { const k = key(e); if (s.has(k)) continue; s.add(k); out.push(e); if (out.length >= n) break; } return out; }
const pick = (list, n) => uniq([...list].sort((a, b) => b.score - a.score || a.d.localeCompare(b.d)), n);
function appPromo() {
  return `<section class="appx" data-app><div class="ax"><img class="ax-ic" src="icons/icon-192.png" alt="" width="84" height="84"><div class="ax-k">Uygulama</div>
  <h2>Ne var ne yok,<br>artık cebinde.</h2><p>Bütün Türkiye'nin konserleri, tiyatroları, sinema seansları tek yerde. Takip et; iptal, erteleme ve saat değişikliklerini bildirimle ilk sen öğren.</p>
  <div class="ax-b"><a class="axb glowbtn" href="indir/"><span class="shw"><i></i></span>Uygulamamızı kullan</a><a class="axl" href="indir/">Nasıl indirilir →</a></div>
  <ul class="ax-f"><li><b>81</b>il</li><li><b>🔔</b>bildirim</li><li><b>0₺</b>ücretsiz</li></ul></div></section>`;
}
function footer() {
  return `${appPromo()}<footer class="foot">
  <div class="r"><a href="#/bilgi/hakkinda">Hakkında</a><a href="#/bilgi/kaynaklar">Veri kaynakları</a><a href="#/bilgi/gizlilik">Gizlilik</a><a href="#/bilgi/kosullar">Kullanım koşulları</a><a href="mailto:${esc(window.NVNY_SITE?.contact || "")}">İletişim</a><a href="${esc(window.NVNY_SITE?.instagram || "#")}" target="_blank" rel="noopener">Instagram</a></div>
  <p class="lg">Ne Var Ne Yok bağımsız bir etkinlik rehberidir; bilet satmaz, reklam ve komisyon almaz. Satın alma ve iade, bileti satan sitenin kurallarına tabidir. Afişler etkinliklerin kendi sayfalarından gösterilir; görseller sahiplerine aittir. Kaldırma talepleri: ${esc(window.NVNY_SITE?.contact || "")}</p>
  <div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div></footer>`;
}

/* ---------- Görünümler ---------- */
const V = $("#view"), TOP = $("#top");
function setTop(city) {
  TOP.hidden = !city; if (!city) return;
  if (!$("#home").firstChild) $("#home").innerHTML = WM(); $("#home").href = `#/${city}`;
  $("#cityBtn span").textContent = CITIES.find((c) => c.id === city)?.name || city;
  $("#srchBtn").href = `#/${city}/kesfet`; $("#setBtn").href = `#/${city}/ayarlar`;
  const n = Object.keys(follows()).length, fb = $("#flwBtn"); fb.href = `#/${city}/takip`; fb.querySelector("b").textContent = n || ""; fb.classList.toggle("has", !!n);
}

/* ---------- Hikâye gibi kayan sayfalar (üstte çizgiler; kaydır ya da kenarlara dokun; kendiliğinden ilerler) ---------- */
function stories(items, hrefOf, { cityTag = false } = {}) {
  if (!items.length) return "";
  return `<section class="stp" aria-roledescription="carousel" aria-label="Öne çıkanlar"><div class="sg">${items.map(() => "<i><b></b></i>").join("")}</div>
  <div class="sv">${items.map((e, i) => `<a class="sps" href="${hrefOf(e)}" aria-label="${esc(e.title)}"><img class="bg" src="${esc(e.img)}" alt="" referrerpolicy="no-referrer" decoding="async">
    <div class="po">${poster(e, { badge: false, lazy: false })}</div>
    <div class="tx"><span class="tg">${esc(CATS[e.cat] || "Etkinlik")}${cityTag && e.cityName ? " · " + esc(e.cityName) : ""}</span><h2>${esc(e.title)}</h2><div class="m">${rel(e.d)}${e.t ? " · " + esc(e.t) : ""}${e.venue ? " · " + esc(e.venue) : ""}</div><span class="go">İncele ${I.arr || "→"}</span></div></a>`).join("")}</div>
  <button type="button" class="nv pv" aria-label="Önceki"></button><button type="button" class="nv nx" aria-label="Sonraki"></button></section>`;
}
let stpStop = null;
/* Şehir sayfasının arkasındaki bulanık renk, o an görünen afişe geçer: arka katman yüklenince iki katman yer değiştirir (yalnızca opacity) */
function washTo(src) {
  const w = $(".wash"); if (!w || !src) return; const [a, b] = w.querySelectorAll("img"); if (!b) return;
  const front = a.classList.contains("on") ? a : b, back = front === a ? b : a;
  if (front.getAttribute("src") === src) return;
  const swap = () => { if (back.getAttribute("src") !== src) return; back.classList.add("on"); front.classList.remove("on"); };
  back.onload = swap; back.setAttribute("src", src); if (back.complete && back.naturalWidth) swap();
}
function storyInit() {
  stpStop?.(); const root = $(".stp"); if (!root) return;
  root.querySelectorAll(".ph img.p").forEach((i) => { if (i.complete && i.naturalWidth) i.parentNode.classList.add("ok"); });
  const sv = $(".sv", root), segs = $$(".sg i", root), N = segs.length; let i = 0, alive = true, lock = 0;
  const paint = () => segs.forEach((g, k) => { g.className = k < i ? "done" : ""; });
  const slides = $$(".sps", root);
  const play = () => { paint(); const b = segs[i]; void b.offsetWidth; b.className = "on"; };
  /* Arka plandaki renk kaydırmayla AYNI ANDA değişir (kullanıcı isteği, 22:03): her afişin bulanık rengi ayrı katman;
     katmanın görünürlüğü kayan sayfanın o anki konumundan hesaplanır (parmakla sürüklerken de, kendiliğinden geçerken de). Yalnızca opacity. */
  const W = $$(".wash img"); let wr = 0;
  const wpaint = () => { wr = 0; if (!W.length) return; const p = sv.scrollLeft / (sv.clientWidth || 1);
    for (let k = 0; k < W.length; k++) { const o = Math.max(0, 1 - Math.abs(p - k)); const v = (o * .42).toFixed(3); if (W[k]._o !== v) { W[k].style.opacity = v; W[k]._o = v; } } };
  if (W.length) { sv.addEventListener("scroll", () => { if (!wr) wr = requestAnimationFrame(wpaint); }, { passive: true }); wpaint(); }
  const go = (n, smooth = true) => { i = (n + N) % N; lock = Date.now(); sv.scrollTo({ left: i * sv.clientWidth, behavior: smooth ? "smooth" : "auto" }); play(); };
  segs.forEach((g) => g.querySelector("b").addEventListener("animationend", () => { if (alive && document.body.contains(root)) go(i + 1); }));
  $(".nx", root).addEventListener("click", () => go(i + 1)); $(".pv", root).addEventListener("click", () => go(i - 1));
  let st = 0; sv.addEventListener("scroll", () => { clearTimeout(st); st = setTimeout(() => { if (Date.now() - lock < 600) return; const n = Math.round(sv.scrollLeft / sv.clientWidth); if (n !== i) { i = n; play(); haptic(4); } }, 90); }, { passive: true });
  const hold = (on) => root.classList.toggle("hold", on);
  sv.addEventListener("pointerdown", () => hold(true), { passive: true }); addEventListener("pointerup", () => hold(false), { passive: true }); sv.addEventListener("pointercancel", () => hold(false));
  const vis = () => root.classList.toggle("hold", document.hidden); document.addEventListener("visibilitychange", vis);
  stpStop = () => { alive = false; document.removeEventListener("visibilitychange", vis); };
  play();
}


/* Tekerlek tık sesi (iPhone saat tekerleği gibi): 7 ms'lik zarif bir "çıt"; Android'de 4 ms titreşim. Ses ilk dokunuşta açılır (tarayıcı kuralı). */
/* APPLE GİBİ DOKUNMA SESLERİ (kullanıcı isteği, 15.11.2026: "Apple'daki saat çarkı sesi gibi zarif"; "başka yerlerde de kullanabilirsin").
   Hepsi Web Audio ile anlık üretilir (dosya yok, ağ yok), çok kısa ve kısık; ilk dokunuştan önce çalmaz.
   - tick():   saat/alarm çarkının yumuşak tahta "tık"ı: 2,2 kHz'lik çok kısa çıt + 1,1 kHz'lik gövde, 14 ms'de söner
   - snd.on/off: iOS anahtarının açılış/kapanış "tık"ı (açılış biraz tiz, kapanış pes)
   - snd.sel:  kutucuk, segment ve seçim düğmelerinde daha da hafif bir dokunuş
   - snd.ok:   "Takip et" gibi bir işlem tamamlanınca iki notalı tatlı onay
   Kişiselleştir > "Dokunma sesleri" ile kapatılabilir (nvny-ses = "0"). Android'de eşlik eden kısa titreşim. */
let ACX = null, lastTick = 0, NOISE = null;
const sesOn = () => store.get("nvny-ses") !== "0";
const ac = () => { ACX ||= new (window.AudioContext || window.webkitAudioContext)(); if (ACX.state === "suspended") ACX.resume?.()?.catch?.(() => {}); return ACX; };
let acted = false; // ses motoru ancak ilk dokunuştan sonra kurulur (açılışta kurmak takılma yapıyordu; tarayıcı zaten çaldırmaz)
["pointerdown", "keydown", "touchstart"].forEach((n) => addEventListener(n, () => { acted = true; }, { once: true, passive: true, capture: true }));
function blip({ f = 2200, f2 = 0, body = 0, vol = .1, dur = .014, noise = .5, hp = 2500 } = {}) {
  if (!sesOn() || !acted) return;
  try {
    const A = ac(), t = A.currentTime, out = A.createGain(); out.gain.value = vol; out.connect(A.destination);
    // 1) metalik çıt: süzülmüş çok kısa hışırtı (ilk 3 ms)
    if (noise) { if (!NOISE) { const n = Math.round(A.sampleRate * .004); NOISE = A.createBuffer(1, n, A.sampleRate); const d = NOISE.getChannelData(0); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 4); }
      const s = A.createBufferSource(), h = A.createBiquadFilter(), g = A.createGain(); s.buffer = NOISE; h.type = "highpass"; h.frequency.value = hp; g.gain.value = noise; s.connect(h).connect(g).connect(out); s.start(t); }
    // 2) ton: yüksekten hafifçe aşağı kayan, hızla sönen sinüs (çarkın dişi)
    const o = A.createOscillator(), g = A.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2 || f * .82, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(1, t + .0008); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + .01);
    // 3) gövde: daha pes, daha kısa (tahta hissi)
    if (body) { const b = A.createOscillator(), bg = A.createGain(); b.type = "triangle"; b.frequency.setValueAtTime(body, t); bg.gain.setValueAtTime(.0001, t); bg.gain.linearRampToValueAtTime(.55, t + .0006); bg.gain.exponentialRampToValueAtTime(.0001, t + dur * .7); b.connect(bg).connect(out); b.start(t); b.stop(t + dur); }
  } catch {}
}
const buzz = (ms) => haptic(ms); // Android titreşim, iPhone 18+ sistem tıkı (aşağıda)
function tick() { const t = performance.now(); if (t - lastTick < 32) return; lastTick = t; blip({ f: 2200, f2: 1750, body: 1100, vol: .085, dur: .014, noise: .55, hp: 3000 }); buzz(3); }
const snd = {
  on() { blip({ f: 1650, f2: 1500, body: 820, vol: .09, dur: .022, noise: .35, hp: 2200 }); buzz(5); },
  off() { blip({ f: 1150, f2: 1000, body: 600, vol: .08, dur: .022, noise: .3, hp: 1800 }); buzz(5); },
  sel() { blip({ f: 2500, f2: 2100, body: 0, vol: .05, dur: .01, noise: .4, hp: 3500 }); buzz(2); },
  ok() { blip({ f: 1320, f2: 1300, vol: .07, dur: .07, noise: 0 }); setTimeout(() => blip({ f: 1980, f2: 1960, vol: .06, dur: .11, noise: 0 }), 85); buzz(8); },
};
addEventListener("touchstart", () => { try { ac(); } catch {} }, { once: true, passive: true });
/* APPLE KLAVYESİ VE DOKUNMA SESLERİ (kullanıcı isteği, 15.11.2026 21:35: "her basış ve klavyeyle yazarken saat sesi gibi zarif, profesyonel ses").
   - snd.key: iPhone klavyesinin yumuşak "tık"ı (her harfte perde ±%4 değişir, makine gibi tekdüze olmasın)
   - snd.del: silme tuşu, biraz daha pes ve kuru;  snd.ret: boşluk/onay, tok
   - snd.tap: düğme ve bağlantılara basış; çok kısık. Seçim kutucukları, anahtarlar ve çarkın kendi sesi varsa onlar çalar. */
Object.assign(snd, {
  key() { const r = .96 + Math.random() * .08; blip({ f: 1250 * r, f2: 980 * r, body: 520 * r, vol: .05, dur: .012, noise: .65, hp: 2800 }); },
  del() { blip({ f: 900, f2: 760, body: 420, vol: .05, dur: .013, noise: .55, hp: 2000 }); },
  ret() { blip({ f: 700, f2: 600, body: 330, vol: .055, dur: .016, noise: .5, hp: 1600 }); },
  tap() { blip({ f: 1900, f2: 1500, body: 760, vol: .04, dur: .011, noise: .45, hp: 2400 }); },
});
const TXT = 'input[type="text"],input[type="search"],input:not([type]),input[type="email"],input[type="tel"],input[type="url"],textarea,[contenteditable="true"]';
document.addEventListener("beforeinput", (ev) => { if (!ev.target.matches?.(TXT) || store.get("nvny-klavye") === "0") return; const k = ev.inputType || "";
  if (k.startsWith("delete")) snd.del(); else if (k === "insertLineBreak" || k === "insertParagraph" || ev.data === " ") snd.ret(); else if (k.startsWith("insert")) snd.key(); }, true);
document.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.matches?.(TXT)) snd.ret(); }, true);
document.addEventListener("click", (ev) => { const t = ev.target; if (t.closest?.("#tback, [data-close], .tile, .seg button, .pills button, [data-one], [data-many], [data-p], [data-b], .tabs a, .dpk button, [data-d], #wl li, .tg2, .sw, input, label")) return;
  if (t.closest?.("a, button, [role=button], summary")) snd.tap(); }, true);
// Kontrollerin sesleri tek yerden: iOS anahtarları, kutucuklar, segmentler, seçim düğmeleri, sekme çubuğu
document.addEventListener("change", (ev) => { const i = ev.target; if (i.matches?.('.tg2 input[type="checkbox"], .sw input[type="checkbox"], input[type="checkbox"][role="switch"]')) (i.checked ? snd.on : snd.off)(); }, true);
document.addEventListener("click", (ev) => { const b = ev.target.closest?.(".tile, .seg button, .pills button, [data-one], [data-many], [data-p], [data-b], .tabs a, .dpk button, [data-d]"); if (b) snd.sel(); }, true);
/* Türkçe yönelme eki: Ankara'ya, İstanbul'a, İzmir'e, Çorum'a, Muş'a */
function dat(n) { const w = n.toLocaleLowerCase("tr"), v = [...w].reverse().find((c) => "aeıioöuü".includes(c)) || "a", back = "aıou".includes(v); return ("aeıioöuü".includes(w.slice(-1)) ? "y" : "") + (back ? "a" : "e"); }
function viewCities() {
  setTop(null); document.title = "Ne Var Ne Yok · Şehrinin etkinliklerine göz at";
  const liveC = CITIES.filter((c) => c.live).sort((a, b) => b.n - a.n);
  const T = (DATA.top || []).filter((e) => e.img && CITIES.find((c) => c.id === e.city && c.live)).slice(0, 10);
  const saved = CITIES.find((c) => c.id === store.get("nvny-city") && c.live);
  const ALL = [...CITIES].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const sub = (c) => c.live ? (c.n ? `${c.n.toLocaleString("tr-TR")} etkinlik` : "Sinema seansları") : "Şu an etkinlik yok";
  const wall = [...new Set(T.map((e) => e.img))].slice(0, 9);
  V.innerHTML = `<div class="cs"><div class="cs-h">${WM()}</div>
  <section class="pick">${wall.length ? `<div class="pwall" aria-hidden="true">${wall.concat(wall).slice(0, 9).map((u) => `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" decoding="async">`).join("")}</div>` : ""}
  <div class="glass">
    <h1>Hangi şehirdesin?</h1>
    <label class="cin">${I.pin}<input id="cq" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Yaz ya da aşağıdan seç…" aria-label="Şehir ara"></label>
    <div class="whl"><div class="band" aria-hidden="true"></div><ul id="wl" role="listbox" aria-label="İller" tabindex="0"></ul></div>
    <p class="cmsg" id="cmsg" hidden></p>
    <div class="pact"><button type="button" class="cgo" id="cok">Devam et</button>${saved ? `<a class="cbk" href="#/${saved.id}" data-city="${saved.id}">${esc(saved.name)}'${dat(saved.name)} devam et →</a>` : ""}</div>
  </div></section>
  <div id="csl"></div><div class="cs-ft"><div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div></div></div>`;
  /* Saat tekerleği gibi il seçici: alfabetik, kaydırdıkça ortadaki büyür (yalnızca transform/opacity) */
  const q = $("#cq"), wl = $("#wl"), msg = $("#cmsg"), ok = $("#cok"), IH = 52; let L = ALL, cur = 0, raf = 0, pfT = 0, drawn = false;
  const go = (c) => { if (!c) return; if (c.live) { store.set("nvny-city", c.id); location.hash = `#/${c.id}`; return; }
    msg.hidden = false; msg.innerHTML = `<b>${esc(c.name)}</b> için şu an taradığımız kaynaklarda etkinlik ya da sinema seansı yok; günde iki kez yeniden bakıyoruz. Şunlara göz atabilirsin: ${liveC.slice(0, 4).map((x) => `<a href="#/${x.id}" data-city="${x.id}">${x.name}</a>`).join(", ")}`; };
  const paint = () => {
    raf = 0; const mid = wl.scrollTop + wl.clientHeight / 2, n = Math.round((mid - wl.clientHeight / 2) / IH);
    const lis = wl.children; for (let k = Math.max(0, n - 5); k < Math.min(lis.length, n + 6); k++) {
      const d = Math.abs((k * IH + IH / 2 + (wl.clientHeight - IH) / 2) - mid) / IH, li = lis[k];
      const sd = ((k * IH + IH / 2 + (wl.clientHeight - IH) / 2) - mid) / IH; // işaretli uzaklık (yukarı -, aşağı +)
      li.firstChild.style.transform = `perspective(420px) rotateX(${(-sd * 17).toFixed(1)}deg) scale(${Math.max(.78, 1.22 - d * .17).toFixed(3)})`; li.style.opacity = Math.max(.18, 1 - d * .32).toFixed(2);
    }
    if (n !== cur && lis[n]) { lis[cur]?.classList.remove("on"); cur = Math.max(0, Math.min(n, lis.length - 1)); lis[cur].classList.add("on"); wl.setAttribute("aria-activedescendant", lis[cur].id);
      const c = L[cur]; msg.hidden = true; if (drawn) tick();
      clearTimeout(pfT); if (c?.live && acted) pfT = setTimeout(() => prefetch(c.id), 450); } // kullanıcı çarka dokunmadan veri inmez (açılış akıcı)
  };
  const draw = (list) => { L = list; cur = -1; drawn = false;
    wl.innerHTML = list.map((c, k) => `<li id="w${k}" role="option" class="${c.live ? "" : "soon"}"><b>${esc(c.name)}</b></li>`).join("");
    wl.scrollTop = 0; cur = 0; wl.children[0]?.classList.add("on"); paint(); drawn = true; };
  const to = (k, smooth = true) => wl.scrollTo({ top: k * IH, behavior: smooth ? "smooth" : "auto" });
  wl.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
  wl.addEventListener("click", (ev) => { const li = ev.target.closest("li"); if (!li) return; const k = [...wl.children].indexOf(li); if (k === cur) go(L[k]); else to(k); });
  wl.addEventListener("keydown", (ev) => { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); to(Math.max(0, Math.min(L.length - 1, cur + (ev.key === "ArrowDown" ? 1 : -1)))); } else if (ev.key === "Enter") go(L[cur]); });
  q.addEventListener("input", () => { const v = fold(q.value).trim();
    const list = v ? ALL.filter((c) => fold(c.name).startsWith(v)).concat(ALL.filter((c) => !fold(c.name).startsWith(v) && fold(c.name).includes(v))) : ALL;
    msg.hidden = !!list.length || !v; if (!list.length) msg.textContent = "Bu adla bir il bulamadık."; draw(list); });
  q.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); go(L[cur]); } else if (ev.key === "ArrowDown") { ev.preventDefault(); wl.focus(); to(Math.min(L.length - 1, cur + 1)); } });
  ok.addEventListener("click", () => go(L[cur]));
  V.addEventListener("click", (ev) => { const a = ev.target.closest("[data-city]"); if (a) store.set("nvny-city", a.dataset.city); });
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 120));
  const csl = () => idle(() => { const el = $("#csl"); if (!el) return; el.outerHTML = `${T.length ? `<h2 class="cs-t">Türkiye'de bu hafta öne çıkanlar</h2>${stories(T, (e) => `#/${e.city}/e/${encodeURIComponent(slugOf(e))}`, { cityTag: true })}` : ""}${appPromo()}`; storyInit(); }, { timeout: 900 });
  // tanıtım açıksa arkadaki bölüm tanıtım kapanınca kurulur (açılış akıcı olsun)
  if ($(".intro") || (!store.get("nvny-intro") && !store.get("nvny-city")) || (standalone && !store.get("nvny-app-ilk"))) addEventListener("nvny-intro-done", csl, { once: true }); else csl();
  draw(ALL);
  // açılışta kayıtlı ile (yoksa en kalabalık ile) kendiliğinden gel
  const start = ALL.indexOf(saved || liveC[0]); if (start > 0) to(start, false); paint();
}

function viewCity(city) {
  setTop(city); const cname = CITIES.find((c) => c.id === city)?.name || city; document.title = `${cname} · Ne Var Ne Yok`;
  const { d: today, hm } = nowIST(), E = DATA.events.filter(live), wk = addD(today, 6);
  const todayL = E.filter((e) => e.d === today), weekL = E.filter((e) => e.d <= wk);
  const tonight = todayL.filter((e) => !e.t || e.t >= "17:00");
  const dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7), sun = addD(fri, 2);
  const wkend = E.filter((e) => e.d >= (dow === 6 || dow === 0 ? today : fri) && e.d <= (dow === 0 ? today : sun));
  const featured = pick(E.filter((e) => e.img && e.d <= addD(today, 10)), 8);
  const byCat = (c) => pick(weekL.filter((e) => e.cat === c && e.img), 14).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "").localeCompare(b.t || ""));
  const k = (q) => `#/${city}/kesfet?${q}`;
  V.innerHTML = `<div class="wash" aria-hidden="true">${featured.map((e, k) => `<img src="${esc(e.img)}" alt="" referrerpolicy="no-referrer" decoding="async"${k ? "" : ' style="opacity:.42"'}>`).join("")}</div><section class="city"><h1 style="--L:${[...cname].length}">${esc(cname)}</h1><div id="tdy"></div>${yilHome(city)}
  <button type="button" class="pz" id="pz">${prefs() ? `<span class="dot"></span>Senin için kişiselleştirildi<em>Düzenle</em>` : `${I.spark}Kişiselleştir<em>İlgi alanlarını seç, sana uygun etkinlikler öne çıksın</em>`}</button></section>
  <div class="qk2"><button type="button" id="tnt"><span>🌙</span>Bu akşam ne yapsak?</button><button type="button" id="nrb"><span>📍</span>Yakınımda</button></div>
  ${stories(featured, (e) => `#/${city}/e/${encodeURIComponent(e.slug)}`)}
  <form class="sbar" id="sf"><label class="sin">${I.srch}<input id="q" type="search" placeholder="Ara ya da yaz: cumartesi akşam konser…" enterkeyhint="search"></label><a class="fbtn" href="${k("f=1")}">${I.flt}<span class="fl">Filtrele</span></a></form>
  <div class="qk"><a href="${k("t=bugun")}">Bugün</a><a href="${k("t=yarin")}">Yarın</a><a href="${k("t=haftasonu")}">Hafta sonu</a><a href="#/${city}/sinema">Sinema</a>${Object.keys(CATS).filter((c) => c !== "sinema" && weekL.some((e) => e.cat === c)).map((c) => `<a href="${k("k=" + c)}">${esc(CATS[c])}</a>`).join("")}</div>
  ${notifAsk(city)}
  ${prefs() ? rail("Senin için", "İlgi alanlarına göre bu hafta", uniq([...weekL.filter((e) => e.img)].sort((a, b) => pscore(b) - pscore(a)), 16), city, k("sira=sen&t=hafta")) : ""}
  ${rail("Bu akşam", `${dLong(today)} · ${tonight.length} etkinlik`, uniq(tonight.filter((e) => e.img).sort((a, b) => (a.t || "").localeCompare(b.t || "")), 16), city, k("t=bugun"))}
  ${filmRail(city)}
  ${rail("Hafta sonu", wkend.length + " etkinlik", pick(wkend.filter((e) => e.img), 16), city, k("t=haftasonu"))}
  ${(() => { const L = E.filter((e) => e.img && live(e) && e.tickets.filter((x) => x.price).length > 1).map((e) => { const p = e.tickets.filter((x) => x.price).map((x) => x.price); return [e, Math.max(...p) - Math.min(...p)]; }).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]).map(([e]) => e);
     return L.length >= 3 ? rail("Fiyatları karşılaştır", "Siteler arasında fiyatı farklı olanlar", uniq(L, 16), city, k("cok=1&sira=fiyat")) : ""; })()}
  ${(() => { const L = E.filter((e) => e.drop && e.img).sort((a, b) => b.drop - a.drop); return L.length >= 3 ? rail("Fiyatı düşenler", "Son 7 günde doğrulanmış fiyatı düşenler", uniq(L, 16), city, k("dus=1")) : ""; })()}
  ${(() => { const L = E.filter((e) => e.free && e.img && e.d <= addD(today, 13)); return L.length >= 3 ? rail("Ücretsiz", "Önümüzdeki iki hafta", uniq(L, 16), city, k("ucr=1")) : ""; })()}
  <div id="kac"></div>
  <div id="later"></div>${footer()}`;
  const fav = prefs()?.cats || [], order = ["konser", "tiyatro", "standup", "cocuk", "sahne", "atolye"].sort((a, b) => fav.includes(b) - fav.includes(a));
  const later = () => `${order.map((c) => rail(CATS[c], "Bu hafta", byCat(c), city, k("k=" + c))).join("")}
  ${rail("Festival", "Yaklaşan", pick(E.filter((e) => e.cat === "festival" && e.img), 12), city, k("k=festival"))}
  ${rail("Yeni eklenenler", "Son 3 günde", uniq(E.filter((e) => e.isNew && e.img).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || "")), 16), city, k("yeni=1"))}`;
  { const lt = $("#later"), idle = window.requestIdleCallback || ((f) => setTimeout(f, 120));
    const parts = [...order.map((c) => () => rail(CATS[c], "Bu hafta", byCat(c), city, k("k=" + c))),
      () => rail("Festival", "Yaklaşan", pick(E.filter((e) => e.cat === "festival" && e.img), 12), city, k("k=festival")),
      () => rail("Yeni eklenenler", "Son 3 günde", uniq(E.filter((e) => e.isNew && e.img).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || "")), 16), city, k("yeni=1"))];
    const step = () => { if (!document.body.contains(lt) || !parts.length) return; lt.insertAdjacentHTML("beforebegin", parts.shift()()); idle(step, { timeout: 600 }); };
    idle(step, { timeout: 600 }); }
  $("#sf").addEventListener("submit", (ev) => { ev.preventDefault(); $("#q").blur(); searchGo(city, $("#q").value.trim()); });
  $("#pz").addEventListener("click", () => openPrefs(city, () => viewCity(city)));
  $("#tnt").addEventListener("click", () => tonightSheet(city)); $("#nrb").addEventListener("click", () => nearMe(city));
  kacamak(city);
  todayCard(city, $("#tdy"), todayL.length, tonight.length, DATA.films?.films?.filter((f) => f.s?.[today]?.length).length || 0);
  bindNotifAsk(city);
  storyInit();
}
function filmRail(city) {
  const F = DATA.films?.films || [], today = nowIST().d;
  const L = F.filter((f) => f.img && f.s && f.s[today]?.length).sort((a, b) => (b.s[today]?.length || 0) - (a.s[today]?.length || 0)).slice(0, 14);
  if (!L.length) return "";
  return `<section class="rail"><div class="rh"><div><h3>Vizyonda</h3><small>Bugün ${L.length}+ film · salon salon seanslar</small></div><a href="#/${city}/sinema">Tümü →</a></div><div class="rs">${L.map((f) => `<a class="cd" href="#/${city}/film/${f.id}"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" loading="lazy" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div><div class="t">${esc(f.title)}</div><div class="m">${esc([filmGenre(f) || filmCountry(f), f.dur && f.dur + " dk"].filter(Boolean).join(" · "))}</div><div class="m2">${f.s[today].length} salonda bugün</div></a>`).join("")}</div></section>`;
}

/* ---------- Keşfet + filtre ekranı ----------
   Ekranda yalnızca arama, "Filtrele" ve "Sırala" durur; seçenekler tek, bölümlere ayrılmış filtre ekranında.
   Çoklu seçim: k (kategori), s (saat), il (ilçe) virgülle ayrılır. */
const TIMES = { bugun: "Bugün", yarin: "Yarın", haftasonu: "Hafta sonu", hafta: "Bu hafta", ay: "30 gün" };
const SAAT = { sabah: "Sabah · 14:00 öncesi", ogle: "Öğleden sonra · 14–18", aksam: "Akşam · 18–21", gece: "Gece · 21 sonrası" };
const FIYAT = { 250: "₺250 ve altı", 500: "₺500 ve altı", 750: "₺750 ve altı", 1000: "₺1.000 ve altı", 1e9: "Fiyatı görünenler" };
const KIM = { cocuk: "Aileyle", yetiskin: "18 yaş ve üzeri" };
const SIRA = { "": "Tarihe göre", populer: "Öne çıkanlar", fiyat: "Fiyat (doğrulanmış)", sen: "Senin için", yakin: "Yakınımda" };
const list = (v) => (v ? String(v).split(",").filter(Boolean) : []);
const ilceOf = (e) => { const v = vOf(e.venue); return v?.ilce || ""; };
const ageN = (e) => { const m = String(e.age || "").match(/(\d+)/); return m ? +m[1] : null; };
const slot = (t) => (!t ? "" : t < "14:00" ? "sabah" : t < "18:00" ? "ogle" : t < "21:00" ? "aksam" : "gece");
function applyF(f) {
  const { d: today } = nowIST(), dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7);
  const range = { bugun: [today, today], yarin: [addD(today, 1), addD(today, 1)], haftasonu: [dow === 6 || dow === 0 ? today : fri, dow === 0 ? today : addD(fri, 2)], hafta: [today, addD(today, 6)], ay: [today, addD(today, 30)] }[f.t] || (f.gun ? [f.gun, f.gun] : null);
  const q = fold(f.q || "").trim().split(/\s+/).filter(Boolean), K = list(f.k), Sx = list(f.s), IL = list(f.il);
  let L = DATA.events.filter((e) => (f.iptal ? !live(e) : live(e)) && (!K.length || K.includes(e.cat)) && (!range || (e.d >= range[0] && e.d <= range[1]))
    && (!Sx.length || Sx.includes(slot(e.t))) && (!f.p || (e.price && e.price <= +f.p)) && (!f.m || e.venue === f.m) && (!IL.length || IL.includes(fold(ilceOf(e)).replace(/\s+/g, "")))
    && (!f.c || (f.c === "cocuk" ? e.cat === "cocuk" || (ageN(e) != null && ageN(e) <= 8) : ageN(e) >= 18)) && (!f.yeni || e.isNew) && (!f.cok || e.tickets.filter((x) => x.price).length > 1)
    && (!f.tk || e.status !== "tukendi") && (!f.dus || e.drop) && (!f.ucr || e.free) && q.every((w) => e.q.includes(w)));
  DATA.events.forEach((e) => { e._km = null; });
  if (f.sira === "yakin" && DATA.me) { const me = DATA.me.p; L.forEach((e) => { const v = vOf(e.venue); e._km = v?.lat ? km(me, [v.lat, v.lng]) : null; }); L = [...L].sort((a, b) => (a._km ?? 1e9) - (b._km ?? 1e9) || a.d.localeCompare(b.d)); }
  else if (f.sira === "populer") L = [...L].sort((a, b) => b.score - a.score); else if (f.sira === "fiyat") L = [...L].sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)); else if (f.sira === "sen") L = [...L].sort((a, b) => pscore(b) - pscore(a) || a.d.localeCompare(b.d)); else if (f.dus) L = [...L].sort((a, b) => b.drop - a.drop);
  return L;
}
const ILCELER = () => { if (DATA.city !== "ankara") return []; const m = new Map(); for (const e of DATA.events) { const i = ilceOf(e); if (i && live(e)) m.set(i, (m.get(i) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
function chipsOf(f) {
  const c = [];
  if (f.q) c.push(["q", `“${f.q}”`]); if (f.t) c.push(["t", TIMES[f.t]]); if (f.gun) c.push(["gun", dShort(f.gun)]);
  list(f.k).forEach((k) => c.push(["k:" + k, CATS[k]])); list(f.s).forEach((k) => c.push(["s:" + k, SAAT[k].split(" · ")[0]]));
  if (f.p) c.push(["p", FIYAT[f.p]]); list(f.il).forEach((k) => c.push(["il:" + k, ILCELER().find(([n]) => fold(n).replace(/\s+/g, "") === k)?.[0] || k]));
  if (f.m) c.push(["m", f.m]); if (f.c) c.push(["c", KIM[f.c]]); if (f.yeni) c.push(["yeni", "Yeni eklenenler"]); if (f.cok) c.push(["cok", "Fiyat karşılaştırmalı"]); if (f.tk) c.push(["tk", "Tükenenler gizli"]); if (f.iptal) c.push(["iptal", "İptal / ertelenen"]); list(f.fg).forEach((g) => c.push(["fg:" + g, g])); if (f.dus) c.push(["dus", "Fiyatı düşenler"]); if (f.ucr) c.push(["ucr", "Ücretsiz"]);
  return c;
}
const dropChip = (f, key) => { const nf = { ...f }; const [k, v] = key.split(":"); if (v) { const L = list(nf[k]).filter((x) => x !== v); if (L.length) nf[k] = L.join(","); else delete nf[k]; } else delete nf[k]; return nf; };
const toQ = (f) => Object.entries(f).filter(([k, v]) => v && k !== "f").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
let shown = 60;
function viewKesfet(city, f) {
  setTop(city);
  if (f.sira === "yakin" && !DATA.me) { venueTr().then(() => whereAmI()).then(() => { if (location.hash.includes("sira=yakin")) viewKesfet(city, f); }).catch((err) => geoHelp(city, err?.code)); }
  else if (f.sira === "yakin" && !DATA.vtr && city !== "ankara") { venueTr().then(() => viewKesfet(city, f)); }
  const L = applyF(f), K = list(f.k), title = K.length === 1 ? CATS[K[0]] : f.t ? TIMES[f.t] : f.gun ? dLong(f.gun) : f.yeni ? "Yeni eklenenler" : f.iptal ? "İptal ve ertelenenler" : f.dus ? "Fiyatı düşenler" : f.ucr ? "Ücretsiz" : f.q ? "Arama" : f.sira === "sen" ? "Senin için" : "Keşfet";
  document.title = `${title} · ${CITIES.find((c) => c.id === city)?.name} · Ne Var Ne Yok`;
  const chips = chipsOf(f).filter(([k]) => k !== "q"), go = (nf) => { location.hash = `#/${city}/kesfet?${toQ(nf)}`; };
  V.innerHTML = `<div class="kh"><h1>${esc(title)}</h1><p>${L.length.toLocaleString("tr-TR")} etkinlik · ${esc(CITIES.find((c) => c.id === city)?.name || "")}</p></div>
  <div class="fz"><form class="sbar" id="sf"><label class="sin">${I.srch}<input id="q" type="search" value="${esc(f.q || "")}" placeholder="Ara ya da yaz: cumartesi akşam konser…" enterkeyhint="search"></label>
  <button type="button" class="fbtn${chips.length ? " on" : ""}" id="fo">${I.flt}<span class="fl">Filtrele</span>${chips.length ? `<span class="n">${chips.length}</span>` : ""}</button></form>
  <div class="frow"><div class="act">${chips.map(([k, l]) => `<button type="button" data-x="${esc(k)}">${esc(l)}</button>`).join("")}</div><button type="button" class="srtb" id="srt">${esc(SIRA[f.sira || ""])}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div></div>
  <div class="wrap"><div class="seg vw" style="--n:3;--i:${VWI[f.gor || ""] || 0}"><span class="thumb" aria-hidden="true"></span><button type="button" data-vw="" class="${!f.gor ? "on" : ""}">Liste</button><button type="button" data-vw="harita" class="${f.gor === "harita" ? "on" : ""}">Harita</button><button type="button" data-vw="takvim" class="${f.gor === "takvim" ? "on" : ""}">Takvim</button></div></div>
  ${f.gor === "harita" ? `<div class="kmap"><div class="map" id="kmap"></div><p class="kmn" id="kmn"></p></div>` : f.gor === "takvim" ? calView(city, f, L) : `<div class="grid" id="gr"></div><div id="mr"></div>`}${L.length ? "" : `<div class="empty">Bu seçimle etkinlik bulunamadı.<br>Filtreleri gevşetmeyi dene.</div>`}${footer()}`;
  { const FL = filmsFor(f); if (FL.length && !f.gor) { const box = document.createElement("section"); box.className = "kfl"; box.innerHTML = `<div class="rh"><div><h3>Filmler</h3><small>${FL.length} film · ${esc(f.gun ? dLong(f.gun) : f.t ? TIMES[f.t] : "bu hafta")}</small></div><a href="#/${city}/sinema">Sinema →</a></div><div class="rs">${FL.slice(0, 30).map(({ f: x, n, d }) => `<a class="cd" href="#/${city}/film/${x.id}?gun=${d}"><div class="ph"><img class="p" src="${esc(x.img || "")}" alt="${esc(x.title)} afişi" referrerpolicy="no-referrer" loading="lazy" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(x.title)}</b><small></small></div></div><div class="t">${esc(x.title)}</div><div class="m">${esc([filmGenre(x) || filmCountry(x), x.dur && x.dur + " dk"].filter(Boolean).join(" · "))}</div><div class="m2">${n} seans</div></a>`).join("")}</div>`; $("#gr")?.before(box); } }
  $$("[data-vw]").forEach((b) => b.addEventListener("click", () => { snd.sel?.(); const nf = { ...f }; if (b.dataset.vw) nf.gor = b.dataset.vw; else delete nf.gor; history.replaceState(null, "", `#/${city}/kesfet?${toQ(nf)}`); viewKesfet(city, nf); }));
  $$("[data-cday]").forEach((b) => b.addEventListener("click", () => { const nf = { ...f }; delete nf.gor; delete nf.t; nf.gun = b.dataset.cday; go(nf); }));
  if (f.gor === "harita") mapView(city, L);
  shown = 60; const gr = $("#gr"), mr = $("#mr");
  const paint = () => { if (!gr) return; gr.innerHTML = L.slice(0, shown).map((e) => card(e, city)).join(""); mr.innerHTML = L.length > shown ? `<button class="more" id="more">Daha fazla göster (${(L.length - shown).toLocaleString("tr-TR")})</button>` : ""; $("#more")?.addEventListener("click", () => { shown += 60; paint(); }); };
  paint();
  $("#sf").addEventListener("submit", (ev) => { ev.preventDefault(); $("#q").blur(); const v = $("#q").value.trim(), nf = v ? nlParse(v) : null; if (nf) { haptic(5); go({ ...(f.gor ? { gor: f.gor } : {}), ...nf }); } else go({ ...f, q: v }); });
  $$("[data-x]").forEach((b) => b.addEventListener("click", () => go(dropChip(f, b.dataset.x))));
  $("#fo").addEventListener("click", () => openFilters(city, f));
  $("#srt").addEventListener("click", () => sortMenu(f, go));
  if (f.f) { delete f.f; history.replaceState(null, "", `#/${city}/kesfet?${toQ(f)}`); openFilters(city, f); }
}
function sheet(html, cls = "") {
  const sh = document.createElement("div"); sh.className = "sh " + cls; sh.innerHTML = html; document.body.append(sh); document.body.style.overflow = "hidden";
  requestAnimationFrame(() => sh.classList.add("on")); snd.sheet?.();
  sh.close = () => { sh.classList.remove("on"); document.body.style.overflow = ""; snd.close?.(); setTimeout(() => sh.remove(), 260); };
  sheetDrag(sh);
  sh.addEventListener("click", (ev) => { if (ev.target === sh || ev.target.closest("[data-close]")) sh.close(); });
  return sh;
}
function sortMenu(f, go) {
  const sh = sheet(`<div class="pn" role="dialog" aria-label="Sırala"><div class="hd"><b>Sırala</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2 ml">${Object.entries(SIRA).filter(([k]) => k !== "sen" || prefs()).map(([k, l]) => `<button type="button" class="mi${(f.sira || "") === k ? " on" : ""}" data-v="${k}"><span>${esc(l)}</span></button>`).join("")}</div></div>`, "mn");
  sh.addEventListener("click", (ev) => { const mi = ev.target.closest(".mi"); if (!mi) return; const nf = { ...f }; if (mi.dataset.v) nf.sira = mi.dataset.v; else delete nf.sira; sh.close(); go(nf); });
}
/* Filtre ekranı: bölüm bölüm (akordeon), her bölümün başlığında seçili olanın özeti; altta canlı sayı */
function openFilters(city, f0) {
  const f = { ...f0 }; delete f.f; let open = "tarih";
  const venues = [...new Set(DATA.events.filter(live).map((e) => e.venue).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const { d: today } = nowIST(), days = [...Array(14)].map((_, i) => addD(today, i));
  const one = (key, val, label) => `<button type="button" data-one="${key}" data-v="${esc(val)}" class="${(f[key] || "") === String(val) ? "on" : ""}">${esc(label)}</button>`;
  const many = (key, val, label, n) => `<button type="button" data-many="${key}" data-v="${esc(val)}" class="${list(f[key]).includes(String(val)) ? "on" : ""}">${esc(label)}${n != null ? `<i>${n}</i>` : ""}</button>`;
  const catN = (c) => DATA.events.filter((e) => live(e) && e.cat === c).length;
  const sum = {
    tarih: () => f.t ? TIMES[f.t] : f.gun ? dShort(f.gun) : "Tüm tarihler",
    kategori: () => list(f.k).map((k) => CATS[k]).join(", ") || "Hepsi",
    saat: () => list(f.s).map((k) => SAAT[k].split(" · ")[0]).join(", ") || "Her saat",
    fiyat: () => (f.p ? FIYAT[f.p] : "Hepsi"),
    konum: () => [...list(f.il).map((k) => ILCELER().find(([n]) => fold(n).replace(/\s+/g, "") === k)?.[0] || k), f.m].filter(Boolean).join(", ") || "Bütün şehir",
    kim: () => (f.c ? KIM[f.c] : "Herkes"),
    diger: () => [f.yeni && "Yeni", f.cok && "Karşılaştırmalı", f.tk && "Tükenen yok", f.iptal && "İptal/ertelenen"].filter(Boolean).join(", ") || "—",
  };
  /* Apple uygulaması tarzı: bütün bölümler açık, cam kartlarda; kategori ve saat simgeli kutucuk, "kimler için" segment, diğerleri iOS anahtarı */
  const SIC = { sabah: "🌅", ogle: "☀️", aksam: "🌆", gece: "🌙" };
  const tileM = (key, val, label, ic, sub) => `<button type="button" class="tile${list(f[key]).includes(String(val)) ? " on" : ""}" data-many="${key}" data-v="${esc(val)}"><span class="ti">${ic}</span><span class="tl3">${esc(label)}</span>${sub != null ? `<small class="ts">${esc(sub)}</small>` : ""}<i class="tk" aria-hidden="true">✓</i></button>`;
  const pill = (key, val, label) => `<button type="button" data-one="${key}" data-v="${esc(val)}" class="${(f[key] || "") === String(val) ? "on" : ""}">${esc(label)}</button>`;
  const KS = [["", "Herkes"], ["cocuk", "Aile"], ["yetiskin", "18+"]], ki = Math.max(0, KS.findIndex(([v]) => v === (f.c || "")));
  const IL = ILCELER();
  const body = () => `<div class="pn full flt" role="dialog" aria-label="Filtrele"><div class="hd"><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button><b>Filtrele</b><button type="button" class="lnk" data-reset>Temizle</button></div><div class="bd2 fsx">
    <h4>Ne zaman?</h4><div class="pills">${pill("t", "", "Tümü")}${Object.entries(TIMES).map(([k, l]) => pill("t", k, l)).join("")}</div>
    <div class="dstrip in">${days.map((d) => `<button type="button" data-gun="${d}" class="${f.gun === d && !f.t ? "on" : ""}"><small>${d === today ? "Bugün" : GUNK[pd(d).getDay()]}</small><b>${pd(d).getDate()}</b></button>`).join("")}</div>
    <h4>Kategori <em>birden çok seçebilirsin</em></h4><div class="tiles">${tileM("k", "sinema", "Film", CIC.sinema || "🎬", (DATA.films?.films || []).filter((x) => Object.keys(x.s || {}).length).length + " film vizyonda")}${Object.entries(CATS).filter(([k]) => k !== "sinema").map(([k, l]) => tileM("k", k, l, CIC[k] || "✨", catN(k).toLocaleString("tr-TR") + " etkinlik")).join("")}</div>
    ${list(f.k).includes("sinema") && filmGenres().length ? `<h4>Film türü</h4><div class="grp"><div class="ch">${filmGenres().map((g) => `<button type="button" data-many="fg" data-v="${esc(g)}" class="${list(f.fg).includes(g) ? "on" : ""}">${esc(g)}</button>`).join("")}</div></div>` : ""}
    <h4>Saat</h4><div class="tiles">${Object.entries(SAAT).map(([k, l]) => tileM("s", k, l.split(" · ")[0], SIC[k], l.split(" · ")[1])).join("")}</div>
    <h4>Fiyat <em>yalnızca son 36 saatte doğrulanmış</em></h4><div class="pills">${pill("p", "", "Hepsi")}${Object.entries(FIYAT).map(([k, l]) => pill("p", k, l.replace(" ve altı", "'e kadar").replace("₺1.000'e", "₺1.000'e"))).join("")}</div>
    <h4>Kimler için?</h4><div class="seg" style="--n:${KS.length};--i:${ki}"><span class="thumb" aria-hidden="true"></span>${KS.map(([v, l], k) => `<button type="button" data-one="c" data-v="${v}" data-k="${k}" class="${k === ki ? "on" : ""}">${l}</button>`).join("")}</div>
    ${IL.length ? `<h4>Semt</h4><div class="grp"><div class="ch">${IL.map(([n, c]) => many("il", fold(n).replace(/\s+/g, ""), n, c)).join("")}</div></div>` : ""}
    <h4>Mekân</h4><div class="grp"><label class="sin" style="height:46px">${I.srch}<input id="mq" type="search" placeholder="Mekân ara…"></label><div class="vl">${venues.map((v) => `<button type="button" data-ven="${esc(v)}" class="${f.m === v ? "on" : ""}">${esc(v)}</button>`).join("")}</div></div>
    <h4>Diğer</h4><div class="grp lst"><label class="tg2"><span>✨ Yeni eklenenler<small>Son 3 günde listeye girenler</small></span><input type="checkbox" data-tg="yeni"${f.yeni ? " checked" : ""}></label><label class="tg2"><span>⚖️ Fiyat karşılaştırmalı<small>Birden çok sitede doğrulanmış fiyatla</small></span><input type="checkbox" data-tg="cok"${f.cok ? " checked" : ""}></label><label class="tg2"><span>🎟️ Tükenenleri gizle<small>Bileti kalmayanları gösterme</small></span><input type="checkbox" data-tg="tk"${f.tk ? " checked" : ""}></label><label class="tg2"><span>⚠️ İptal / ertelenen<small>Yalnızca iptal ya da ertelenenleri göster</small></span><input type="checkbox" data-tg="iptal"${f.iptal ? " checked" : ""}></label></div>
  </div><div class="ft"><button type="button" class="ok" data-ok></button></div></div>`;
  const sh = sheet("", "fsheet");
  const count = () => { const n = applyF(f).length; $("[data-ok]", sh).textContent = n ? `${n.toLocaleString("tr-TR")} etkinliği göster` : "Etkinlik yok, seçimi gevşet"; $$("[data-sec]", sh).forEach((x) => { const s2 = $(".fh small", x); if (s2) s2.textContent = sum[x.dataset.sec](); }); };
  const paint = () => { const y = $(".fsx", sh)?.scrollTop || 0; sh.innerHTML = body(); count(); $(".fsx", sh).scrollTop = y; };
  paint();
  sh.addEventListener("click", (ev) => {
    const t = ev.target;
    const tg = t.closest("[data-tog]"); if (tg) { open = open === tg.dataset.tog ? "" : tg.dataset.tog; $$("[data-sec]", sh).forEach((x) => x.classList.toggle("op", x.dataset.sec === open)); return; }
    const o = t.closest("[data-one]"); if (o) { const k = o.dataset.one; const sg = o.closest(".seg"); if (sg) sg.style.setProperty("--i", o.dataset.k); if (o.dataset.v) f[k] = o.dataset.v; else delete f[k]; if (k === "t") delete f.gun; $$(`[data-one="${k}"]`, sh).forEach((b) => b.classList.toggle("on", b === o)); if (k === "t") $$("[data-gun]", sh).forEach((b) => b.classList.remove("on")); count(); return; }
    const m = t.closest("[data-many]"); if (m) { const k = m.dataset.many, v = m.dataset.v, L = list(f[k]); const n = L.includes(v) ? L.filter((x) => x !== v) : [...L, v]; if (n.length) f[k] = n.join(","); else delete f[k]; m.classList.toggle("on"); count(); return; }
    const g = t.closest("[data-gun]"); if (g) { if (f.gun === g.dataset.gun && !f.t) delete f.gun; else { f.gun = g.dataset.gun; delete f.t; } $$("[data-gun]", sh).forEach((b) => b.classList.toggle("on", b.dataset.gun === f.gun)); $$('[data-one="t"]', sh).forEach((b) => b.classList.toggle("on", !b.dataset.v && !f.gun)); count(); return; }
    const vn = t.closest("[data-ven]"); if (vn) { if (f.m === vn.dataset.ven) delete f.m; else f.m = vn.dataset.ven; $$("[data-ven]", sh).forEach((b) => b.classList.toggle("on", b.dataset.ven === f.m)); count(); return; }
    if (t.closest("[data-reset]")) { for (const k of Object.keys(f)) if (k !== "q" && k !== "sira") delete f[k]; paint(); return; }
    if (t.closest("[data-ok]")) { sh.close(); location.hash = `#/${city}/kesfet?${toQ(f)}`; }
  });
  sh.addEventListener("change", (ev) => { const c = ev.target.closest("[data-tg]"); if (c) { if (c.checked) f[c.dataset.tg] = "1"; else delete f[c.dataset.tg]; count(); } });
  sh.addEventListener("input", (ev) => { if (ev.target.id !== "mq") return; const v = fold(ev.target.value); $$("[data-ven]", sh).forEach((b) => { b.hidden = v && !fold(b.textContent).includes(v); }); });
}

/* ---------- Kişiselleştir: ilgi alanları yalnızca bu cihazda saklanır (hesap yok, sunucuya gitmez) ---------- */
const prefs = () => { try { return JSON.parse(store.get("nvny-prefs") || "null"); } catch { return null; } };
const WHEN = { haftaiciaksam: "Hafta içi akşamları", haftasonugunduz: "Hafta sonu gündüz", haftasonuaksam: "Hafta sonu akşam" };
function pscore(e) {
  const P = prefs(); if (!P) return 0; const d = pd(e.d).getDay(), we = d === 0 || d === 6, s = slot(e.t);
  let n = 0;
  if (P.cats?.includes(e.cat)) n += 5;
  if (P.ilce?.length && P.ilce.includes(fold(ilceOf(e)).replace(/\s+/g, ""))) n += 2;
  if (P.when?.length && ((we && (s === "sabah" || s === "ogle") && P.when.includes("haftasonugunduz")) || (we && (s === "aksam" || s === "gece") && P.when.includes("haftasonuaksam")) || (!we && (s === "aksam" || s === "gece") && P.when.includes("haftaiciaksam")))) n += 2;
  if (P.budget && e.price && e.price <= P.budget) n += 1;
  if (P.kids && (e.cat === "cocuk" || (ageN(e) != null && ageN(e) <= 8))) n += 3;
  return n + e.score / 10;
}
const CIC = { konser: "🎤", tiyatro: "🎭", standup: "🎙️", sahne: "🩰", cocuk: "🧸", festival: "🎪", parti: "🪩", atolye: "🎨" };
const WIC = { haftaiciaksam: "🌙", haftasonugunduz: "☀️", haftasonuaksam: "🌆" };
function openPrefs(city, after) {
  const P = prefs() || { cats: [], ilce: [], when: [], budget: 0, kids: false };
  const tile = (k, v, l, ic) => `<button type="button" class="tile${(P[k] || []).includes(v) ? " on" : ""}" data-p="${k}" data-v="${esc(v)}" aria-pressed="${(P[k] || []).includes(v)}"><span class="ti">${ic || "✨"}</span><span class="tl3">${esc(l)}</span><i class="tk" aria-hidden="true">✓</i></button>`;
  const chip = (k, v, l) => `<button type="button" data-p="${k}" data-v="${esc(v)}" class="${(P[k] || []).includes(v) ? "on" : ""}">${esc(l)}</button>`;
  const B = [[0, "Fark etmez"], [300, "₺300"], [600, "₺600"], [1000, "₺1.000"]], bi = Math.max(0, B.findIndex(([v]) => v === (P.budget || 0)));
  const IL = ILCELER(), cname = CITIES.find((c) => c.id === city)?.name || "";
  const sh = sheet(`<div class="pn full prf" role="dialog" aria-label="Kişiselleştir"><div class="hd"><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button><b>Kişiselleştir</b><button type="button" class="lnk" data-clear>Sıfırla</button></div><div class="bd2">
    <p class="pl1">Neleri sevdiğini seç; <b>Senin için</b> rafı ve sıralama buna göre oluşsun. Seçimlerin yalnızca bu telefonda kalır.</p>
    <h4>Neleri seversin?</h4><div class="tiles">${Object.entries(CATS).filter(([k]) => k !== "sinema").map(([k, l]) => tile("cats", k, l, CIC[k])).join("")}</div>
    ${IL.length ? `<h4>${esc(cname)} · Hangi semtler sana yakın?</h4><div class="grp"><div class="ch">${IL.slice(0, 14).map(([n]) => chip("ilce", fold(n).replace(/\s+/g, ""), n)).join("")}</div></div>` : ""}
    <h4>Ne zaman çıkarsın?</h4><div class="tiles t3">${Object.entries(WHEN).map(([k, l]) => tile("when", k, l, WIC[k])).join("")}</div>
    <h4>Bütçe</h4><div class="seg" style="--n:${B.length};--i:${bi}"><span class="thumb" aria-hidden="true"></span>${B.map(([v, l], k) => `<button type="button" data-b="${v}" data-k="${k}" class="${k === bi ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="grp" style="margin-top:22px"><label class="tg2"><span>👨‍👩‍👧 Aileyle gidiyorum<small>Ailece gidilecek etkinlikler öne çıksın</small></span><input type="checkbox" id="kids"${P.kids ? " checked" : ""}></label></div>
    <a class="srow" style="margin-top:22px;border-radius:14px;background:rgba(255,255,255,.06)" href="#/${city}/ayarlar" data-close><span class="sic">⚙️</span><span class="stx">Ses, bildirim ve görünüm<small>Ayarlar'da</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
  </div><div class="ft"><button type="button" class="ok" data-save>Kaydet</button></div></div>`, "fsheet");
  sh.addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-p]"); if (c) { const k = c.dataset.p, v = c.dataset.v; P[k] = (P[k] || []).includes(v) ? P[k].filter((x) => x !== v) : [...(P[k] || []), v]; c.classList.toggle("on"); c.setAttribute("aria-pressed", c.classList.contains("on")); return; }
    const bb = ev.target.closest("[data-b]"); if (bb) { P.budget = +bb.dataset.b; $(".seg", sh).style.setProperty("--i", bb.dataset.k); $$("[data-b]", sh).forEach((x) => x.classList.toggle("on", x === bb)); return; }
    if (ev.target.closest("[data-clear]")) { store.set("nvny-prefs", ""); sh.close(); after?.(); return; }
    if (ev.target.closest("[data-save]")) { P.kids = $("#kids", sh).checked; store.set("nvny-prefs", JSON.stringify(P)); NV.set("prefs", P); sh.close(); after?.(); }
  });
}

/* ---------- Etkinlik sayfası ---------- */
function viewEvent(city, slug) {
  setTop(city); const e = DATA.bySlug.get(slug);
  if (!e) { V.innerHTML = `<div class="empty"><p>Bu etkinlik artık listede değil (tarihi geçmiş ya da kaldırılmış olabilir).</p><p style="margin-top:16px"><a class="more" style="display:inline-flex;align-items:center" href="#/${city}">Şehir sayfasına dön</a></p></div>${footer()}`; return; }
  document.title = `${e.title} · ${dShort(e.d)} · Ne Var Ne Yok`;
  const v = vOf(e.venue), st = e.status === "tukendi" ? "Biletler tükendi" : e.status === "iptal" ? "Bu etkinlik iptal edildi" : e.status === "ertelendi" ? "Bu etkinlik ertelendi" : "";
  const T = e.tickets, best = T.find((x) => x.price);
  const tix = pcmpHTML(e);
  const checked = T.map((x) => x.checked).filter(Boolean).sort().pop();
  const same = uniq(DATA.events.filter((x) => x.venue === e.venue && x !== e && live(x)), 12);
  const sim = pick(DATA.events.filter((x) => x.cat === e.cat && x !== e && x.venue !== e.venue && live(x) && x.d <= addD(e.d, 7) && x.d >= addD(e.d, -3)), 12);
  const gq = encodeURIComponent(`${e.venue} ${CITIES.find((c) => c.id === city)?.name || ""}`);
  // Yol tarifi koordinata değil mekânın kendisine (kullanıcı, 23:47: CerModern'de yolun kenarına götürüyordu); Google mekân kaydıyla girişe götürür
  const dirU = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([e.venue, v?.addr, CITIES.find((c) => c.id === city)?.name].filter(Boolean).join(", "))}${v?.place ? "&destination_place_id=" + v.place : ""}`;
  const mapU = v?.place ? `https://www.google.com/maps/search/?api=1&query=${gq}&query_place_id=${v.place}` : `https://www.google.com/maps/search/?api=1&query=${gq}`;
  V.innerHTML = `<article class="dt">${e.img ? `<div class="bk"><img src="${esc(e.img)}" alt="" referrerpolicy="no-referrer"></div>` : ""}<div class="in">
  <a class="back" href="javascript:history.length>1?history.back():location.assign('#/${city}')">${I.back}Geri</a>
  <div class="dg"><div class="dp">${poster(e, { badge: false, lazy: false })}</div><div>
    <div class="tags"><span>${esc(CATS[e.cat] || "Etkinlik")}</span>${e.genre && e.genre !== CATS[e.cat] ? `<span>${esc(e.genre)}</span>` : ""}${e.age ? `<span>${esc(String(e.age))}</span>` : ""}</div>
    <h1>${esc(e.title)}</h1>
    <div class="meta"><div>${I.cal}<span>${dLong(e.d)}${e.t ? " · " + esc(e.t) : ""}${e.dur ? `<small>Süre ${esc(e.dur)}${e.door ? " · kapı " + esc(e.door) : ""}</small>` : e.door ? `<small>Kapı ${esc(e.door)}</small>` : ""}</span></div>
    <div>${I.pin}<span>${esc(e.venue || "")}${v?.addr ? `<small>${esc(v.addr)}</small>` : ""}${v?.lat && mesafeOn() ? `<small class="dst" id="dst"></small>` : ""}</span></div>
    ${e.price ? `<div>${I.tag}<span>${TL(e.price)}'den başlayan fiyatlarla<small>${T.filter((x) => x.price).length > 1 ? T.filter((x) => x.price).length + " sitede satışta" : "Satış sitesinde doğrulandı"}</small></span></div>` : ""}</div>
    ${st ? `<div class="stb">${st}.${e.stNews ? " Haberlere göre: " + e.stNews.slice(0, 2).map((x) => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${esc((DATA.buzz.names || {})[x[0]] || x[0])} haberi ↗</a>`).join(" ") + " · Bilet sitesinden de kontrol edin." : ""}</div>` : ""}
    ${T.length && live(e) ? `<a class="buy" href="${esc((best || T[0]).url)}" target="_blank" rel="noopener" data-buy="${esc((best || T[0]).site)}">Bilet al · ${esc((best || T[0]).site)}${best ? ` · ${TL(best.price)}` : ""}</a>` : ""}
    ${T.length ? `${tix}<p class="chk">${checked ? `Fiyatlar satış sitelerinde ${ago(checked)} kontrol edildi. ` : ""}Hizmet bedeli ve son fiyat siteye göre değişebilir; satın alma ve iade bileti satan sitenin kurallarına tabidir.</p>` : ""}
    <div class="shr"><button type="button" id="flw" class="flw${isF(e) ? " on" : ""}">${isF(e) ? I.bellOn + "Takip ediliyor" : I.bell + "Takip et"}</button><button type="button" id="cal">${I.cal}Takvime ekle</button><button type="button" id="shr">${I.share}Paylaş</button></div>
    ${aName(e) ? `<button type="button" class="afl${afol()[NV.akey(e.title)] ? " on" : ""}" id="afl"><span>🎤</span><span><b>${esc(aName(e))}</b><small>${afol()[NV.akey(e.title)] ? "Yeni tarihleri takipte ✓" : "Yeni tarihlerini takip et · her ilde"}</small></span></button>` : ""}<div id="oth"></div>
    ${live(e) ? `<p class="flh">Takip edersen fiyatı düştüğünde, iptal, erteleme, saat, tarih ya da yer değişikliğinde ve etkinlikten bir gün önce haber veririz.</p>` : ""}
    <section class="sec"><h3>Bu etkinlik hakkında</h3>${infoBlock(e, city)}<a class="wrong" href="${wrongMail(e, city)}">Bir yanlış mı var? Bize yaz →</a></section>
    <div id="wxb"></div>
    <section class="sec"><h3>Konum</h3><div class="mapc">${v?.lat ? `<div class="map" id="map"></div>` : ""}<div class="ad">${I.pin}<span><b>${esc(e.venue || "")}</b><small>${esc(v?.addr || (v?.ilce ? v.ilce + ", " : "") + (CITIES.find((c) => c.id === city)?.name || ""))}</small></span><button type="button" id="vfl" class="vfl${vfol()[vkey(city, e.venue)] ? " on" : ""}">${vfol()[vkey(city, e.venue)] ? I.bellOn + "Mekân takipte" : I.pin + "Mekânı takip et"}</button></div><div class="bt">${v?.lat ? `<button type="button" class="p" id="rte">${I.dir}Yol tarifi</button>` : `<a class="p" href="${dirU}" target="_blank" rel="noopener">${I.dir}Yol tarifi</a>`}<a href="${mapU}" target="_blank" rel="noopener">${I.ext}Haritada aç</a></div></div></section>
  </div></div></div></article>
  ${same.length ? rail("Aynı mekânda", e.venue, same, city, `#/${city}/kesfet?m=${encodeURIComponent(e.venue)}`) : ""}
  ${sim.length ? rail("Bunlar da ilgini çekebilir", CATS[e.cat] || "", sim, city, `#/${city}/kesfet?k=${e.cat}`) : ""}
  ${footer()}`;
  $("#shr").addEventListener("click", () => shareEv(e, city));
  $("#cal").addEventListener("click", () => calAdd({ ...e, city }));
  $("#vfl").addEventListener("click", (ev) => toggleVenue(e, city, ev.currentTarget));
  $("#flw").addEventListener("click", () => toggleFollow(e, city));
  $("#afl")?.addEventListener("click", (ev) => toggleArtist(e, city, ev.currentTarget));
  otherCities(e, city);
  wxCard(e, city, $("#wxb"));
  if (v?.lat) { mapInit(v.lat, v.lng); $("#rte").addEventListener("click", () => routeSheet(e, v, city, dirU)); const d = $("#dst"); if (d) distFill(v, d); }
}
let leafletP = null;
const leaflet = () => leafletP ||= window.L ? Promise.resolve() : new Promise((res, rej) => { const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.append(c); const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
function mapInit(lat, lng) {
  const el = $("#map"); if (!el) return;
  const run = () => { if (!document.body.contains(el)) return; const L = window.L; const m = L.map(el, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, dragging: !matchMedia("(pointer:coarse)").matches, tap: false }).setView([lat, lng], 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "dk", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları' }).addTo(m);
    L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(m); };
  if (window.L) return run();
  const io = new IntersectionObserver((en) => { if (!en[0].isIntersecting) return; io.disconnect();
    leaflet().then(run).catch(() => { el.remove(); }); }, { rootMargin: "200px" });
  io.observe(el);
}

/* ---------- Sinema ---------- */
function viewSinema(city, day) {
  setTop(city); document.title = `Sinema · ${CITIES.find((c) => c.id === city)?.name} · Ne Var Ne Yok`;
  const F = DATA.films?.films || [], today = nowIST().d, days = [...Array(7)].map((_, i) => addD(today, i)), d = days.includes(day) ? day : today;
  const L = F.filter((f) => f.s && f.s[d]?.length).sort((a, b) => (b.s[d]?.length || 0) - (a.s[d]?.length || 0));
  V.innerHTML = `<div class="kh"><h1>Vizyonda</h1><p>${L.length} film · ${dLong(d)}</p></div>
  <div class="days">${days.map((x) => { const dt = pd(x); return `<button type="button" data-d="${x}" class="${x === d ? "on" : ""}">${x === today ? "Bugün" : GUNK[dt.getDay()]}<b>${dt.getDate()}</b></button>`; }).join("")}</div>
  <div class="grid">${L.map((f) => `<a class="cd" href="#/${city}/film/${f.id}?gun=${d}"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" loading="lazy" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div><div class="t">${esc(f.title)}</div><div class="m">${esc([filmGenre(f) || filmCountry(f), f.dur && f.dur + " dk"].filter(Boolean).join(" · "))}</div><div class="m2">${f.s[d].length} salon</div></a>`).join("")}</div>${L.length ? "" : `<div class="empty">Bu gün için seans bilgisi yok.</div>`}${footer()}`;
  $$("[data-d]").forEach((b) => b.addEventListener("click", () => { location.hash = `#/${city}/sinema?gun=${b.dataset.d}`; }));
}
function viewFilm(city, id, day) {
  setTop(city); const F = DATA.films?.films || [], f = F.find((x) => String(x.id) === String(id)), C = DATA.films?.cinemas || {};
  if (!f) { V.innerHTML = `<div class="empty">Film bulunamadı.</div>${footer()}`; return; }
  document.title = `${f.title} · seanslar · Ne Var Ne Yok`;
  const { d: today, hm } = nowIST(), days = Object.keys(f.s || {}).filter((x) => x >= today).sort(), d = days.includes(day) ? day : days[0];
  const rows = (f.s[d] || []).map(([cid, s]) => { const [times, fmt] = s.split("|"); return { cid, c: C[cid] || { name: "Salon " + cid }, times: times.split(","), fmt }; }).sort((a, b) => a.c.name.localeCompare(b.c.name, "tr"));
  V.innerHTML = `<article class="dt"><div class="bk"><img src="${esc(f.img)}" alt="" referrerpolicy="no-referrer"></div><div class="in">
  <a class="back" href="#/${city}/sinema">${I.back}Sinema</a>
  <div class="dg"><div class="dp"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div></div><div>
  <div class="tags"><span>Sinema</span>${filmGenre(f) ? `<span>${esc(filmGenre(f))}</span>` : ""}${f.dur ? `<span>${f.dur} dk</span>` : ""}${filmCountry(f) ? `<span>${esc(filmCountry(f))}</span>` : ""}${f.year ? `<span>${f.year}</span>` : ""}</div>
  <h1>${esc(f.title)}</h1>
  <div class="meta">${f.release ? `<div>${I.cal}<span>Vizyon tarihi<small>${dLong(f.release)}</small></span></div>` : ""}<div>${I.pin}<span>${rows.length} salonda seans<small>${dLong(d)}</small></span></div></div>
  <div class="days" style="padding:18px 0 0">${days.map((x) => { const dt = pd(x); return `<button type="button" data-d="${x}" class="${x === d ? "on" : ""}">${x === today ? "Bugün" : GUNK[dt.getDay()]}<b>${dt.getDate()}</b></button>`; }).join("")}</div>
  <div class="ss">${rows.map((r) => `<div class="h"><b>${esc(r.c.name)}</b>${r.c.addr ? `<small>${esc(r.c.addr)}</small>` : ""}<div class="tm">${r.times.map((t) => d === today && t < hm ? `<span class="ps">${esc(t)}</span>` : `<button type="button" class="${follows()[sid(f, r.cid, d, t)] ? "on" : ""}" data-st="${esc(t)}" data-cid="${esc(r.cid)}">${esc(t)}</button>`).join("")}${r.fmt ? `<i>${esc(r.fmt)}</i>` : ""}</div></div>`).join("")}</div>
  <div class="shr"><button type="button" id="ffl" class="flw${ffol()[f.id] ? " on" : ""}">${ffol()[f.id] ? I.bellOn + "Film takipte" : I.bell + "Filmi takip et"}</button></div>
  <p class="flh">${rows.length ? "Seans saatine dokun: seansı takip et, takvimine ekle ya da biletini al." : "Bu filmin şehrinde henüz seansı yok. Takip edersen seanslar açılınca haber veririz."}</p>
  <a class="buy" href="${esc(f.url)}" target="_blank" rel="noopener" data-buy="sinemalar.com">Seanslar ve bilet · sinemalar.com</a>
  </div></div></div></article>${footer()}`;
  $$("[data-d]").forEach((b) => b.addEventListener("click", () => { location.hash = `#/${city}/film/${id}?gun=${b.dataset.d}`; }));
  $("#ffl").addEventListener("click", (ev) => toggleFilm(f, city, ev.currentTarget));
  $$("[data-st]").forEach((b) => b.addEventListener("click", () => seansSheet(f, city, d, b.dataset.st, b.dataset.cid, C[b.dataset.cid] || { name: "Salon" }, b)));
}


/* ---------- Takip ve bildirimler (takip.js + sw.js) ----------
   Takip listesi yalnızca bu cihazda (localStorage + service worker'ın okuduğu IndexedDB). Sunucu yok.
   Bildirim: Android'de kurulu uygulamada telefon arada bir sw.js'i uyandırır (periodic sync); uygulama açılınca da
   aynı karşılaştırma yapılır ve değişiklik sayfanın üstünde gösterilir (iPhone dahil her yerde). */
const FKEY = "nvny-takip";
const follows = () => { try { return JSON.parse(store.get(FKEY) || "{}") || {}; } catch { return {}; } };
const fid = (e) => NV.key(e.title) + "|" + e.d + "|" + (e.t || "");
const isF = (e) => !!follows()[fid(e)];
const saveF = (F) => { store.set(FKEY, JSON.stringify(F)); NV.set("follows", F); };
const NOTIF = "Notification" in window && "serviceWorker" in navigator;
const notifOn = () => NOTIF && Notification.permission === "granted";
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = document.documentElement.classList.contains("app");
async function swUp() {
  if (!("serviceWorker" in navigator)) return null;
  try { await navigator.serviceWorker.register("sw.js", { scope: "./" }); const r = await navigator.serviceWorker.ready;
    if (r.periodicSync) { try { const st = await navigator.permissions.query({ name: "periodic-background-sync" }); if (st.state === "granted") await r.periodicSync.register("nvny-takip", { minInterval: 12 * 36e5 }); } catch {} }
    return r; } catch { return null; }
}
async function notify(title, body, url, tag) {
  if (tag && !NV.allow({ tag }, ncfg())) return;
  if (!notifOn()) return false;
  try { const r = await swUp(); await r.showNotification(title, { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url } }); return true; }
  catch { try { new Notification(title, { body, icon: "icons/icon-192.png" }); return true; } catch { return false; } }
}
function toast(html, ms = 5200) {
  let w = $("#tst"); if (!w) { w = document.createElement("div"); w.id = "tst"; w.className = "tst"; document.body.append(w); }
  const t = document.createElement("div"); t.className = "tt"; t.innerHTML = html; w.append(t);
  requestAnimationFrame(() => t.classList.add("on"));
  const kill = () => { t.classList.remove("on"); setTimeout(() => t.remove(), 300); };
  t.addEventListener("click", (ev) => { if (!ev.target.closest("a")) kill(); }); setTimeout(kill, ms);
}
async function askNotif(city) {
  if (!NOTIF) { toast(isIOS && !standalone ? "iPhone'da bildirim için önce uygulamayı ana ekrana ekle: <a href=\"indir/\">nasıl?</a>" : "Bu tarayıcı bildirim göstermiyor. Uygulamayı indirip oradan açabilirsin: <a href=\"indir/\">indir</a>", 8000); return false; }
  if (Notification.permission === "denied") { toast("Bildirimler bu tarayıcıda kapalı. Tarayıcı ayarlarından bu site için izin verebilirsin.", 7000); return false; }
  let p = Notification.permission; if (p !== "granted") { try { p = await Notification.requestPermission(); } catch { p = "denied"; } }
  if (p !== "granted") return false;
  NV.set("prefs", prefs()); NV.set("city", city); NV.set("follows", follows());
  await swUp(); gcEv("bildirim-acildi", "Bildirimler açıldı");
  if (standalone && !store.get("nvny-hosgeldin")) { store.set("nvny-hosgeldin", "1"); notify("HOŞ GELDİNİZZZ 🎉", "Artık şehrinde ne var ne yok hep cebinde 😍 Takip ettiğin etkinlikte bir şey değişirse ilk sen duyarsın, günü gelince de “Hadi, bugün o gün!” diye haber veririz 🎉", `/#/${city}`, "hosgeldin"); }
  else toast("Bildirimler açık 🔔");
  $$(".nask").forEach((x) => x.remove()); $$(".nbox").forEach((x) => { x.outerHTML = notifBox(city); });
  return true;
}
function notifBox(city, inSheet) {
  if (notifOn()) return `<div class="nbox ok">${I.bellOn}<span><b>Bildirimler açık</b><small>Takip ettiğin etkinliklerdeki değişiklikleri ve hatırlatmaları gönderiyoruz; arada bir de güzel etkinlikleri.</small></span></div>`;
  return `<div class="nbox">${I.bell}<span><b>Bildirimleri aç, hiçbir şeyi kaçırma</b><small>Takip ettiğin etkinlikte iptal, saat ya da yer değişikliği olursa, fiyatı düşerse ilk sen öğren; günü gelince de hatırlatalım.</small></span><button type="button" class="nb-go" data-notif>Bildirimleri aç</button></div>`;
}
function notifAsk(city) {
  if (notifOn() || store.get("nvny-nask-x") || (NOTIF && Notification.permission === "denied")) return "";
  return `<div class="nask wrap"><div class="nbox">${I.bell}<span><b>Bildirimleri aç, hiçbir şeyi kaçırma</b><small>Takip ettiğin etkinliklerde bir şey değişirse ilk sen öğren.</small></span><button type="button" class="nb-go" data-notif>Aç</button><button type="button" class="nb-x" data-nx aria-label="Kapat">✕</button></div></div>`;
}
function bindNotifBox(root, city) { root.addEventListener("click", (ev) => { if (ev.target.closest("[data-notif]")) askNotif(city); }); }
function bindNotifAsk(city) {
  const a = $(".nask"); if (!a) return; bindNotifBox(a, city);
  a.querySelector("[data-nx]").addEventListener("click", () => { store.set("nvny-nask-x", "1"); a.remove(); });
}
function toggleFollow(e, city) {
  const F = follows(), id = fid(e), b = $("#flw");
  if (F[id]) { delete F[id]; saveF(F); b.classList.remove("on"); b.innerHTML = I.bell + "Takip et"; toast("Takipten çıkarıldı"); }
  else {
    F[id] = { ...NV.snap(e, e.slug), city }; saveF(F); b.classList.add("on"); b.innerHTML = I.bellOn + "Takip ediliyor"; gcEv("takip-et", "Takip et"); snd.ok();
    if (notifOn()) toast(`Takip ediyorsun. Bir değişiklik olursa haber vereceğiz. <a href="#/${city}/takip">Takip ettiklerim →</a>`);
    else if (!store.get("nvny-nask-f") && !(NOTIF && Notification.permission === "denied")) {
      store.set("nvny-nask-f", "1");
      const sh = sheet(`<div class="pn" role="dialog" aria-label="Bildirimler"><div class="bd2 nsh">${I.bellOn}<h3>Haberdar olmak ister misin?</h3><p>Bu etkinlik iptal olursa, ertelenirse, saati ya da yeri değişirse sana bildirim gönderelim; etkinlikten bir gün önce de hatırlatalım.</p></div><div class="ft"><button type="button" class="rs2" data-close>Şimdi değil</button><button type="button" class="ok" data-ok>Bildirimleri aç</button></div></div>`);
      sh.querySelector("[data-ok]").addEventListener("click", () => { sh.close(); askNotif(city); });
    } else toast(`Takip ediyorsun. <a href="#/${city}/takip">Takip ettiklerim →</a>`);
  }
  setTop(city);
}
function viewTakip(city) {
  setTop(city); document.title = "Takip ettiklerim · Ne Var Ne Yok";
  const F = follows(), today = nowIST().d;
  const rows = Object.entries(F).map(([id, f]) => ({ id, f, e: DATA.bySlug.get(f.slug) || DATA.events.find((x) => NV.key(x.title) === f.tk && x.d === f.d) || null }))
    .filter((r) => r.e || r.f.d >= today).sort((a, b) => a.f.d.localeCompare(b.f.d) || (a.f.t || "").localeCompare(b.f.t || ""));
  V.innerHTML = `<div class="kh"><h1>Takip ettiklerim</h1><p>${rows.length ? rows.length + " etkinlik" : "Henüz takip ettiğin etkinlik yok"}</p></div>
  <div class="wrap" style="margin-top:18px">${notifBox(city)}</div>
  ${rows.length ? `<div class="grid">${rows.map((r) => r.e ? card(r.e, city) : `<div class="cd off"><div class="ph gone"><span>Listede yok</span></div><div class="t">${esc(r.f.title)}</div><div class="m">${dShort(r.f.d)}${r.f.t ? " · " + esc(r.f.t) : ""}</div><div class="m2">${esc(r.f.venue)}</div><button type="button" class="unf" data-unf="${esc(r.id)}">Takipten çıkar</button></div>`).join("")}</div>`
    : `<div class="empty">Bir etkinliğin sayfasında <b>Takip et</b>'e dokun; iptal, erteleme, saat ya da yer değişikliğinde ve bir gün önce haber verelim.<p style="margin-top:18px"><a class="more" style="display:inline-flex;align-items:center" href="#/${city}/kesfet">Etkinliklere göz at</a></p></div>`}
  ${footer()}`;
  bindNotifBox(V, city);
  $$("[data-unf]").forEach((b) => b.addEventListener("click", () => { const F2 = follows(); delete F2[b.dataset.unf]; saveF(F2); viewTakip(city); }));
}

/* Uygulamayı indirip ilk kez açana: "HOŞ GELDİNİZZZ" bildirimi (izin varsa hemen; yoksa önce kısa bir soru) */
function welcomeApp() {
  if (!standalone || store.get("nvny-hosgeldin") || $(".intro")) return; // tanıtım açıksa bitince çağrılır
  const city = store.get("nvny-city") || "ankara";
  if (notifOn()) { store.set("nvny-hosgeldin", "1"); swUp().then(() => notify("HOŞ GELDİNİZZZ 🎉", "Artık şehrinde ne var ne yok hep cebinde 😍 Takip ettiğin etkinlikte bir şey değişirse ilk sen duyarsın, günü gelince de “Hadi, bugün o gün!” diye haber veririz 🎉", `/#/${city}`, "hosgeldin")); return; }
  if (!NOTIF || Notification.permission === "denied" || store.get("nvny-hosgeldin-sor")) return;
  store.set("nvny-hosgeldin-sor", "1");
  setTimeout(() => {
    const sh = sheet(`<div class="pn" role="dialog" aria-label="Hoş geldiniz"><div class="bd2 nsh">${I.bellOn}<h3>Hoş geldiniz!</h3><p>Uygulama hazır. Bildirimleri açarsan takip ettiğin etkinlik iptal olursa, saati ya da yeri değişirse haber verelim; bir gün önce de hatırlatalım.</p></div><div class="ft"><button type="button" class="rs2" data-close>Şimdi değil</button><button type="button" class="ok" data-ok>Bildirimleri aç</button></div></div>`);
    sh.querySelector("[data-ok]").addEventListener("click", () => { sh.close(); askNotif(city); });
  }, 1200);
}
addEventListener("appinstalled", () => { try { localStorage.removeItem("nvny-hosgeldin-sor"); localStorage.removeItem("nvny-app-ilk"); localStorage.removeItem("nvny-hosgeldin"); } catch {} });
/* Uygulama açılınca: takip edilenleri güncel veriyle karşılaştır, değişikliği göster */
function followBoot() {
  const city = DATA.city || store.get("nvny-city") || "ankara";
  NV.set("city", city); NV.set("cityName", CITIES.find((c) => c.id === city)?.name || ""); if (prefs()) NV.set("prefs", prefs());
  if (notifOn()) swUp();
  venueCheck(); watchBoot(city); pastMove();
  const F = follows(); if (!Object.keys(F).length) return;
  const res = NV.check(F, DATA.events, DATA.city || city);
  saveF(res.follows);
  res.msgs.filter((m) => NV.allow(m, ncfg())).slice(0, 3).forEach((m, i) => setTimeout(() => toast(`${I.bellOn}<span><b>${esc(m.title)}</b><small>${esc(m.body)}</small><a href="${esc(m.url.replace(/^\/(yeni\/)?/, ""))}">Göster →</a></span>`, 9000), 900 + i * 400));
  leaveCheck();
  const fb = $("#flwBtn b"); if (fb) { const n = Object.keys(res.follows).length; fb.textContent = n || ""; fb.parentElement.classList.toggle("has", !!n); }
}


/* ---------- Bilgi sayfaları (#/bilgi/<ad>) ---------- */
const C = window.NVNY_SITE?.contact || "";
const PAGES = {
  hakkinda: ["Hakkında", `<p><b>Ne Var Ne Yok</b>, şehrinde yapılacak konser, tiyatro, stand-up, opera, bale, çocuk etkinliği, festival, parti ve atölyeleri bir arada gösteren bağımsız bir etkinlik rehberidir.</p><p>Bilet satmıyoruz. Her etkinlikte, bileti satan sitelerin hepsi fiyatlarıyla yan yana gösterilir; “Bilet al” düğmesi seni doğrudan o sitenin satış sayfasına götürür. Satın alma, iade ve değişiklik işlemleri ilgili bilet sitesinin kurallarına tabidir.</p><p>Reklam almıyoruz, komisyon almıyoruz, kimseden ücret almıyoruz. Bir etkinliğin listede yer alması ya da öne çıkması için ödeme yapılmaz.</p><p>Şu an Ankara açık; diğer şehirler yakında.</p>`],
  kaynaklar: ["Veri kaynakları", `<p>Etkinlikler bilet sitelerinin, kurumların, mekânların ve belediyelerin herkese açık sayfalarından toplanır.</p><p>Hava durumu: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0). Harita: © OpenStreetMap katkıcıları. Uygulama içi yol tarifi: OpenStreetMap verisiyle FOSSGIS yol sunucusu.</p><p>Toplama her sabah yeniden yapılır; öğleden sonra da bilinen etkinliklerin fiyat ve satış durumu bir kez daha kontrol edilir. Bir site o gün okunamazsa son doğrulanmış bilgisi korunur. Tarihi geçen etkinlikler kendiliğinden kaldırılır. Elle eklenen etkinlikler de aynı listeye katılır.</p><p>Gösterilen fiyat, o sitede listelenen en uygun kategoridir. Fiyat, seans ve satış durumu satış sitesinde değişebilir; satın almadan önce bilet sayfasını kontrol et.</p><p>Etkinlik sayfasındaki harita OpenStreetMap'ten gelir (© OpenStreetMap katkıcıları); mekân konumları OpenStreetMap Nominatim ile bulunur. Yol tarifi ve "Haritada aç" Google Haritalar'a bağlanır.</p>`],
  gizlilik: ["Gizlilik", `<p>Bu site hesap açtırmaz, form doldurtmaz ve kişisel veri toplamaz. Çerez ya da reklam takibi kullanmaz.</p><p>Kaç kişinin siteye girdiğini görmek için çerezsiz bir sayaç (GoatCounter) kullanılır: kimliğin, IP adresin ya da cihaz kimliğin saklanmaz; yalnızca girilen sayfa, gelinen site ve tarayıcı türü gibi kimseyi tanımlamayan toplam sayılar tutulur. Uygulamayı indirme, takip etme, bildirimleri açma ve "Bilet al" düğmelerine kaç kez basıldığı da aynı şekilde yalnızca sayı olarak tutulur.</p><p>Seçtiğin şehir, ilgi alanların (Kişiselleştir) ve takip ettiğin etkinlikler yalnızca kendi telefonunda ya da tarayıcında saklanır; sunucuya gönderilmez. Tarayıcı verilerini silerek bunları kaldırabilirsin.</p><p>Bildirimler isteğe bağlıdır ve yalnızca sen izin verirsen açılır. Bildirimler telefonun kendisinde, sitemizin herkese açık etkinlik listesiyle karşılaştırılarak oluşturulur; hiçbir bildirim sunucusu ya da kimlik kullanılmaz, kimin neyi takip ettiğini biz bilmeyiz. Bildirimleri tarayıcı ya da telefon ayarlarından istediğin an kapatabilirsin.</p><p>Etkinlik sayfasındaki harita için tarayıcın OpenStreetMap'ten harita parçalarını indirir; senin konumun gönderilmez. Uzaklık ("Senden 3,4 km") yalnızca telefonunda hesaplanır. Hava durumu için Open-Meteo'ya yalnızca ilin ya da mekânın koordinatı gönderilir, senin konumun değil. Uygulama içinde yol tarifi istersen, yolu hesaplamak için yalnızca başlangıç ve varış noktası OpenStreetMap topluluğunun (FOSSGIS) yol sunucusuna gönderilir; biz saklamayız. Bilet sitelerine ve Google Haritalar'a gittiğinde o sitelerin kendi gizlilik kuralları geçerlidir.</p>`],
  kosullar: ["Kullanım koşulları", `<p>Bu site bilgilendirme amaçlıdır. Etkinlik bilgileri (ad, tarih, saat, mekân, fiyat, satış durumu) herkese açık sayfalardan otomatik toplanır; tanıtım metinleri kopyalanmaz. Afişler kopyalanmaz ve sunucumuzda saklanmaz: yalnızca yayımlandıkları kaynak adresten, değiştirilmeden gösterilir (gömülür) ve her afişin üzerinde kaynağı yazar. Kaynak afişi kaldırdığında bizde de görünmez. Etkinlik tanımları bu bilgilerden site tarafından yazılır. Toplayıcı kendini <i>NeVarNeYokBot</i> olarak tanıtır ve sitelerin robots.txt kurallarına uyar.</p><p>Hak sahipleri bir içeriğin kaldırılmasını <a href="mailto:${C}?subject=Kald%C4%B1rma%20talebi">${C}</a> adresinden isteyebilir; talep en geç 48 saat içinde, afişlerde 24 saat içinde yerine getirilir.</p><p>Etkinlik bilgileri; doğruluğu için özen gösterilir ama tarih, saat, fiyat ve satış durumunda değişiklik olabilir. Kesin bilgi her zaman etkinliğin satıldığı sitededir.</p><p>Bilet satın alma işlemleri bu sitede değil, bağlantı verilen bilet sitelerinde yapılır; o işlemlerden ilgili site sorumludur. Etkinlik adları, afişler ve markalar sahiplerine aittir. Afişi olmayan etkinliklerde görülen görseller site tarafından çizilmiş temsili çizimlerdir.</p>`],
  iletisim: ["İletişim", `<p>Soru, öneri, etkinlik ekleme ya da kaldırma talebi için: <a href="mailto:${C}">${C}</a></p><p>Organizatörsen etkinliğini bize yazabilirsin; tanıtım metnin olduğu gibi gösterilebilir.</p>`],
};
function viewBilgi(k) {
  const city = store.get("nvny-city") || "ankara"; setTop(city); const P = PAGES[k] || PAGES.hakkinda; document.title = `${P[0]} · Ne Var Ne Yok`;
  V.innerHTML = `<div class="kh"><h1>${esc(P[0])}</h1></div><div class="wrap info">${P[1]}</div>${footer()}`;
}


/* Alt sekme çubuğu (iPhone uygulaması gibi): Bugün · Keşfet · Sinema · Takip */
document.addEventListener("click", (ev) => { if (ev.target.closest?.(".tabs a")) { snd.tab(); } }, true);
function tabsUpdate(P) {
  const T = $("#tabs"), city = P[0] && P[0] !== "bilgi" ? P[0] : (P[0] === "bilgi" ? store.get("nvny-city") : null);
  T.hidden = !city; if (!city) return;
  const cur = !P[1] ? "home" : P[1] === "kesfet" ? "kesfet" : P[1] === "sinema" || P[1] === "film" ? "sinema" : P[1] === "takip" ? "takip" : "";
  const href = { home: `#/${city}`, kesfet: `#/${city}/kesfet`, sinema: `#/${city}/sinema`, takip: `#/${city}/takip` };
  $$("a", T).forEach((a) => { a.href = href[a.dataset.t]; a.classList.toggle("on", a.dataset.t === cur); });
  const n = Object.keys(follows()).length, b = $('[data-t="takip"] b', T); b.textContent = n || ""; b.classList.toggle("has", !!n);
}


/* Parlayan indir düğmesi: dokununca mor ışık ekrana yayılır, sonra indirme sayfasına geçilir */
document.addEventListener("click", (ev) => {
  const b = ev.target.closest(".glowbtn"); if (!b) return;
  const r = b.getBoundingClientRect(), f = document.createElement("div"); f.className = "pflash";
  f.style.setProperty("--fx", ((r.left + r.width / 2) / innerWidth * 100).toFixed(1) + "%"); f.style.setProperty("--fy", ((r.top + r.height / 2) / innerHeight * 100).toFixed(1) + "%");
  document.body.append(f); setTimeout(() => f.remove(), 950);
  b.classList.remove("tap"); void b.offsetWidth; b.classList.add("tap");
  if (b.tagName === "A" && b.getAttribute("href")) { ev.preventDefault(); const h = b.href; gcEv("indir-dugmesi", "Uygulamamızı kullan"); setTimeout(() => { location.href = h; }, 320); }
});

/* ---------- Yönlendirme ---------- */
const scrollMem = new Map();
let lastHash = "";
let routed = false;
function route() {
  if (!DATA.boot) return;
  { const P0 = (location.hash.replace(/^#\/?/, "").split("?")[0].split("/")[0]) || "";
    const need = P0 && P0 !== "bilgi" && CITIES.find((c) => c.id === P0 && c.live) && DATA.city !== P0;
    if (need) { const nm = CITIES.find((c) => c.id === P0)?.name || ""; V.innerHTML = `<section class="city sk"><h1 style="--L:${[...nm].length}">${esc(nm)}</h1><div class="st"><span class="skl" style="width:120px"></span><span class="skl" style="width:90px"></span></div></section><div class="skr">${'<div class="skc"></div>'.repeat(3)}</div><div class="skr">${'<div class="skc"></div>'.repeat(3)}</div>`; setTop(P0); loadCity(P0).then(() => { cityLoads[P0] = null; route(); followBoot(); }).catch(() => { V.innerHTML = `<div class="empty">Veriler yüklenemedi. Sayfayı yenile.</div>`; }); return; } }
  scrollMem.set(lastHash, scrollY);
  $$(".sh").forEach((x) => x.remove()); document.body.style.overflow = "";
  const h = location.hash.replace(/^#/, "") || "/", [path, qs] = h.split("?"), P = path.split("/").filter(Boolean), Q = Object.fromEntries(new URLSearchParams(qs || ""));
  // Sekme geçişi iPhone gibi (kullanıcı, 16.11.2026 01:10: "Bugün, Keşfet, Sinema, Planım arası geçişler takılıyor"): sekme kökleri (Bugün, Keşfet, Sinema)
  // ayrılırken olduğu gibi saklanır, dönünce yeniden kurulmadan aynı kaydırma yeriyle gelir. Sekmeler arası kayma yok; yalnızca ayrıntı sayfası sağdan gelir.
  const tabRoot = P.length === 1 || (P.length === 2 && (P[1] === "kesfet" || P[1] === "sinema"));
  const fromTab = TABROOT(lastHash), isTabSwitch = tabRoot && (fromTab || /\/(takip|ayarlar)$/.test(lastHash.split("?")[0])) && P[0] === (lastHash.replace(/^#\/?/, "").split(/[/?]/)[0]);
  if (fromTab && V.dataset.h === lastHash && lastHash !== location.hash) vcSave(lastHash);
  const old = location.hash.match(/^#(e\/.+|hakkinda|kaynaklar|gizlilik|kosullar|iletisim)$/); // eski sitenin ve Google sayfalarının bağlantıları
  if (old) { location.replace(old[1].startsWith("e/") ? `#/ankara/${old[1]}` : `#/bilgi/${old[1]}`); return; }
  const saved = store.get("nvny-city");
  if (P[0] === "bilgi") viewBilgi(P[1]);
  else if (!P.length) { // ilk girişte tanıtım + il seçimi; sonra kayıtlı ille açılır (kullanıcı isteği, 15.11.2026 22:43). İl üstteki düğmeden (#/?sec=1) değişir.
    // uygulama her kurulduğunda ilk açılış sıfırdan: tanıtım + il seçimi (tarayıcıda seçilmiş il kendiliğinden açılmaz; kullanıcı, 23:19)
    const appFirst = standalone && !store.get("nvny-app-ilk");
    if (!Q.sec && !appFirst && saved && CITIES.find((c) => c.id === saved && c.live)) { location.replace(`#/${saved}`); return; }
    viewCities(); if ((!saved && !Q.sec) || appFirst) intro(appFirst); }
  else {
    const city = P[0]; if (!CITIES.find((c) => c.id === city && c.live)) { location.replace("#/"); return; }
    store.set("nvny-city", city);
    if (tabRoot && vcLoad(location.hash, city)) { /* sekme önceki haliyle geri geldi; yeniden kurulmaz */ }
    else if (!P[1]) viewCity(city);
    else if (P[1] === "kesfet") viewKesfet(city, Q);
    else if (P[1] === "e") viewEvent(city, decodeURIComponent(P.slice(2).join("/")));
    else if (P[1] === "sinema") viewSinema(city, Q.gun);
    else if (P[1] === "film") viewFilm(city, P[2], Q.gun);
    else if (P[1] === "takip") viewPlan(city, !!Q.m);
    else if (P[1] === "ayarlar") viewAyarlar(city, P[2]);
    else if (P[1] === "yilim") viewYil(city);
    else viewCity(city);
  }
  V.dataset.h = location.hash;
  // iPhone gibi: ileri sağdan, geri soldan (derinlikli), sekmeler arası anında; kenardan kaydırarak geri dönüldüyse canlandırma yok
  const isRoot = !P.length || P[0] === "bilgi" || (P.length === 1) || (P.length === 2 && ["kesfet", "sinema", "takip"].includes(P[1]) && !qs);
  navTrack(lastHash, location.hash, isRoot);
  if (routed && V.dataset.sw !== "1") { V.classList.remove("go", "gt", "gb"); void V.offsetWidth; V.classList.add(navDir === "push" ? "go" : navDir === "back" ? "gb" : "gt"); }
  V.dataset.sw = ""; routed = true; // ilk sayfa canlandırmasız
  tabsUpdate(P);
  const y = scrollMem.get(location.hash); scrollTo(0, y && history.state !== "new" ? y : 0); lastHash = location.hash;
  try { window.goatcounter?.count?.({ path: "/" + h.split("?")[0].replace(/^\//, "") }); } catch {}
}
/* Sekme önbelleği: en çok 6 görünüm, 10 dakika; veri yenilendiyse ya da il değiştiyse yeniden kurulur */
const VC = new Map();
{ const rs = history.replaceState.bind(history); history.replaceState = (...x) => { V.dataset.h = ""; return rs(...x); }; } // görünüm yerinde değiştiyse saklama
const TABROOT = (hh) => { const P2 = (hh || "").replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean); return P2.length === 1 ? P2[0] !== "bilgi" : P2.length === 2 && (P2[1] === "kesfet" || P2[1] === "sinema"); };
function vcSave(hh) { const f = document.createDocumentFragment(); while (V.firstChild) f.append(V.firstChild); VC.delete(hh); VC.set(hh, { f, t: Date.now(), u: DATA.updated, c: DATA.city, title: document.title }); while (VC.size > 6) VC.delete(VC.keys().next().value); }
function vcLoad(hh, city) { const x = VC.get(hh); VC.delete(hh); if (!x || Date.now() - x.t > 10 * 60e3 || x.u !== DATA.updated || x.c !== city) return false; V.replaceChildren(x.f); document.title = x.title; setTop(city); $$(".stp .sg i.on", V).forEach((b) => { b.className = ""; void b.offsetWidth; b.className = "on"; }); return true; }
addEventListener("hashchange", route);
addEventListener("scroll", () => TOP.classList.toggle("sc", scrollY > 8), { passive: true });
document.addEventListener("click", (ev) => { const b = ev.target.closest("[data-buy]"); if (b) { let h = ""; try { h = new URL(b.href).hostname.replace(/^www\./, ""); } catch {} gcEv("bilet-al/" + (h || "?"), "Bilet al: " + (h || "?")); } }, true);

/* ======================================================================================================
   15.11.2026 22:43 (kullanıcı isteği): açılış tanıtımı + il hatırlama, Planım (kendi takvimimiz), mekânı takip et,
   takvime ekle, paylaşım sayfaları, basılı tutunca önizleme, afişte derinlik, titreşim, gece modu, yazı boyutu,
   "Bu akşam ne yapsak?" ve "Yakınımda".
   ====================================================================================================== */

/* ---------- Dokunsal geri bildirim: Android'de titreşim; iPhone'da (iOS 18+) gizli iOS anahtarı ile sistemin kendi "tık"ı ---------- */
let HX = null;
function haptic(ms = 6) {
  if (store.get("nvny-titre") === "0" || !acted) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    if (!isIOS) return;
    if (!HX) { HX = document.createElement("label"); HX.setAttribute("aria-hidden", "true"); HX.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
      HX.innerHTML = '<input type="checkbox" switch tabindex="-1">'; document.body.append(HX); }
    HX.click();
  } catch {}
}

/* ---------- Görünüm: gece göz yormayan mod ve yazı boyutu (Kişiselleştir > Görünüm) ---------- */
const ZOOMS = [[1, "Normal"], [1.1, "Büyük"], [1.2, "Daha büyük"]];
function applyLook() {
  const h = +nowIST().hm.slice(0, 2);
  const on = store.get("nvny-gece") !== "0" && (h >= 22 || h < 7);
  document.documentElement.classList.toggle("gece", on);
  const z = +(store.get("nvny-yazi") || 1); document.documentElement.style.setProperty("--zm", z);
  document.documentElement.classList.toggle("zm", z > 1);
  document.documentElement.classList.toggle("rm", store.get("nvny-az") === "1");
}
applyLook(); setInterval(applyLook, 5 * 60e3);

/* ---------- Takvime ekle: iPhone ve bilgisayarda takvim dosyası (.ics, Apple Takvim "Ekle" penceresi), Android'de Google Takvim ---------- */
const durMin = (e) => { const m = String(e.dur || "").match(/(\d+)\s*(dk|dakika|min)/i), h = String(e.dur || "").match(/(\d+)\s*(sa|saat)/i); return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) || 120; };
const locD = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
const icsDT = (d, t) => d.replace(/-/g, "") + "T" + t.replace(":", "") + "00";
function icsOf(list) {
  const esc2 = (s) => String(s || "").replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = list.map((e) => {
    const t = e.t || "", st = t ? icsDT(e.d, t) : e.d.replace(/-/g, "");
    let end; if (t) { const d = new Date(`${e.d}T${t}:00`); d.setMinutes(d.getMinutes() + durMin(e)); end = icsDT(locD(d), d.toTimeString().slice(0, 5)); }
    else { end = addD(e.d, 1).replace(/-/g, ""); }
    const url = `${location.origin}/e/${e.city || DATA.city}/${e.slug}/`;
    return ["BEGIN:VEVENT", `UID:${e.slug}@nevarneyok.net.tr`, `DTSTAMP:${now}`, t ? `DTSTART;TZID=Europe/Istanbul:${st}` : `DTSTART;VALUE=DATE:${st}`, t ? `DTEND;TZID=Europe/Istanbul:${end}` : `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc2(e.title)}`, `LOCATION:${esc2(e.venue)}`, `DESCRIPTION:${esc2((CATS[e.cat] || "Etkinlik") + " · Bilet ve fiyatlar: " + url)}`, `URL:${url}`,
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${esc2(e.title)} 2 saat sonra başlıyor`, "END:VALARM", "END:VEVENT"].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ne Var Ne Yok//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:Europe/Istanbul", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0300", "TZNAME:+03", "END:STANDARD", "END:VTIMEZONE", ...ev, "END:VCALENDAR"].join("\r\n");
}
function calAdd(list) {
  list = [].concat(list).filter(Boolean); if (!list.length) return;
  haptic(8); gcEv("takvime-ekle", "Takvime ekle");
  if (/android/i.test(navigator.userAgent) && list.length === 1) {
    const e = list[0], t = e.t || "", d = new Date(`${e.d}T${t || "00:00"}:00`), d2 = new Date(d.getTime() + durMin(e) * 6e4);
    const f = (x) => locD(x).replace(/-/g, "") + "T" + x.toTimeString().slice(0, 8).replace(/:/g, "");
    const dates = t ? `${f(d)}/${f(d2)}` : `${e.d.replace(/-/g, "")}/${addD(e.d, 1).replace(/-/g, "")}`;
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${dates}&ctz=Europe/Istanbul&location=${encodeURIComponent(e.venue || "")}&details=${encodeURIComponent("Bilet ve fiyatlar: " + location.origin + "/e/" + (e.city || DATA.city) + "/" + e.slug + "/")}`, "_blank", "noopener");
    return;
  }
  const ics = icsOf(list);
  if (isIOS) { location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = list.length > 1 ? "ne-var-ne-yok-planim.ics" : (list[0].slug || "etkinlik") + ".ics";
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ---------- Paylaş: etkinliğin kendi paylaşım sayfası (e/<il>/<ad>/; WhatsApp/Instagram önizlemesinde ad, tarih, mekân ve afiş) ---------- */
const shareUrl = (e, city) => `${location.origin}/e/${city}/${e.slug}/`;
/* Paylaş (kullanıcı isteği, 15.11.2026: "paylaşımlar güzel olsun; arkadaşına ya da hikâyesine; afiş olmazsa olmaz"):
   iOS paylaşım sayfası gibi alttan açılan cam panel; üstte hikâye görselinin önizlemesi. Hikâye görseli telefonda çizilir (paylas.js);
   afişini telefona vermeyen sitelerde yayında önceden hazırlanmış görsel (s/<il>/<ad>.jpg) kullanılır. Afiş değiştirilmez, kaynağı yazar. */
let paylasP = null;
const paylasJS = () => paylasP ||= window.NVS ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement("script"); s.src = "paylas.js?v=1"; s.onload = ok; s.onerror = no; document.head.append(s); });
function storyOf(e, city) {
  const ev = { title: e.title, when: `${GUN[pd(e.d).getDay()]}, ${pd(e.d).getDate()} ${AY[pd(e.d).getMonth()]}${e.t ? " · " + e.t : ""}`, venue: e.venue || "", cityName: CITIES.find((c) => c.id === city)?.name || "", cat: e.cat, imgBy: e.imgBy || "", base: "" };
  const toBlob = (cv) => new Promise((ok) => cv.toBlob(ok, "image/jpeg", .9));
  return paylasJS().then(async () => {
    if (e.img) { // 1) afişi sitesi izin veriyorsa telefonda çiz
      try { const im = await NVS.img(e.img, true); const cv = await NVS.story(ev, im); return await toBlob(cv); } catch {}
      try { const r = await fetch(`s/${city}/${encodeURIComponent(e.slug)}.jpg`, { cache: "no-cache" }); if (r.ok) return await r.blob(); } catch {} // 2) önceden hazırlanmış
    }
    return toBlob(await NVS.story(ev, null)); // 3) afişi olmayan etkinlik: kendi tasarımımız
  });
}
async function shareEv(e, city) {
  haptic(6); gcEv("paylas", "Paylaş");
  const u = shareUrl(e, city), text = `${e.title} · ${dShort(e.d)}${e.t ? " " + e.t : ""} · ${e.venue}`, fn = `nevarneyok-${e.slug}.jpg`;
  const sh = sheet(`<div class="pn shp" role="dialog" aria-label="Paylaş"><div class="hd"><b>Paylaş</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2">
    <div class="shv"><div class="shi sk" id="shi"></div><div class="shm"><b>${esc(e.title)}</b><small>${esc(dShort(e.d))}${e.t ? " · " + esc(e.t) : ""}</small><small>${esc(e.venue || "")}</small></div></div>
    <div class="sha"><button type="button" data-a="story"><i>📸</i><span>Hikâyende paylaş</span></button><button type="button" data-a="link"><i>💬</i><span>Arkadaşına gönder</span></button><button type="button" data-a="save"><i>⬇️</i><span>Görseli kaydet</span></button><button type="button" data-a="copy"><i>🔗</i><span>Bağlantıyı kopyala</span></button></div>
    <p class="shn">Arkadaşın bağlantıyı açınca etkinlik doğrudan Ne Var Ne Yok'ta açılır; önizlemede adı, tarihi ve afişi görünür.</p></div></div>`, "mn");
  let blobP = storyOf(e, city).then((b) => { const im = new Image(); im.src = URL.createObjectURL(b); im.alt = ""; const box = sh.querySelector("#shi"); box.classList.remove("sk"); box.append(im); return b; });
  blobP.catch(() => sh.querySelector("#shi")?.classList.add("no"));
  sh.querySelector(".sha").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-a]"); if (!b) return; haptic(5); const a = b.dataset.a;
    try {
      if (a === "link") { if (navigator.share) await navigator.share({ title: e.title, text, url: u }); else { await navigator.clipboard.writeText(u); toast("Bağlantı kopyalandı 🔗"); } gcEv("paylas-link", "Bağlantı paylaşıldı"); }
      else if (a === "copy") { await navigator.clipboard.writeText(u); toast("Bağlantı kopyalandı 🔗 Yapıştırınca afişiyle görünür.", 3500); }
      else { b.classList.add("bz"); const blob = await blobP; b.classList.remove("bz"); const file = new File([blob], fn, { type: "image/jpeg" });
        if (a === "story" && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: e.title, text: u }); gcEv("paylas-hikaye", "Hikâyede paylaşıldı"); }
        else { const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = fn; document.body.append(l); l.click(); l.remove(); toast(a === "story" ? "Görsel kaydedildi 📸 Instagram'da hikâye eklerken galeriden seç." : "Görsel kaydedildi ✓", 4500); } }
    } catch (err) { b.classList.remove("bz"); if (err?.name !== "AbortError") toast("Paylaşım açılamadı, bağlantıyı kopyalamayı dene.", 3500); }
  });
}

/* ---------- Mekânı takip et: o mekâna yeni etkinlik eklenince haber ver ---------- */
const VKEY = "nvny-mekan";
const vfol = () => { try { return JSON.parse(store.get(VKEY) || "{}") || {}; } catch { return {}; } };
const vsave = (V2) => { store.set(VKEY, JSON.stringify(V2)); NV.set("venues", V2); };
const vkey = (city, venue) => city + "|" + venue;
function toggleVenue(e, city, btn) {
  const V2 = vfol(), k = vkey(city, e.venue);
  if (V2[k]) { delete V2[k]; vsave(V2); toast("Mekân takipten çıkarıldı"); }
  else { V2[k] = { name: e.venue, city, since: new Date().toISOString(), seen: DATA.events.filter((x) => x.venue === e.venue).map((x) => x.slug) }; vsave(V2); snd.ok(); gcEv("mekan-takip", "Mekânı takip et");
    toast(`📍 <b>${esc(e.venue)}</b> takipte. Yeni etkinlik eklenince haber veririz. <a href="#/${city}/takip?m=1">Mekânlarım →</a>`); }
  if (btn) { const on = !!V2[k]; btn.classList.toggle("on", on); btn.innerHTML = (on ? I.bellOn : I.pin) + (on ? "Mekân takipte" : "Mekânı takip et"); }
}
function venueCheck() {
  const V2 = vfol(), city = DATA.city; let ch = false; const msgs = [];
  for (const [k, v] of Object.entries(V2)) {
    if (v.city !== city) continue;
    const L = DATA.events.filter((x) => x.venue === v.name && live(x)), seen = new Set(v.seen || []);
    const nw = L.filter((x) => !seen.has(x.slug));
    if (nw.length) { msgs.push([v, nw]); v.seen = [...seen, ...nw.map((x) => x.slug)].slice(-400); ch = true; }
  }
  if (ch) vsave(V2);
  msgs.slice(0, 2).forEach(([v, nw], i) => {
    const e = nw[0], more = nw.length > 1 ? ` ve ${nw.length - 1} etkinlik daha` : "";
    const body = `${e.title} · ${dShort(e.d)}${e.t ? " " + e.t : ""}${more}`;
    setTimeout(() => toast(`📍<span><b>${esc(v.name)}'da yeni etkinlik 🎉</b><small>${esc(body)}</small><a href="#/${city}/e/${encodeURIComponent(e.slug)}">Göster →</a></span>`, 9000), 1400 + i * 500);
    if (notifOn()) swUp().then(() => notify(`${v.name}'da yeni etkinlik 🎉`, body, `/#/${city}/e/${encodeURIComponent(e.slug)}`, "mekan-" + v.name));
  });
}

/* ---------- Basılı tutunca önizleme (iPhone'daki gibi): kart büyür, bilgiler ve kısa yollar ---------- */
let lpT = 0, lpX = 0, lpY = 0, lpFired = false;
function lpEvent(a) {
  const m = (a.getAttribute("href") || a.dataset.href || "").match(/^#\/([^/]+)\/e\/([^?]+)/); if (!m || !DATA.bySlug || m[1] !== DATA.city) return null;
  const e = DATA.bySlug.get(decodeURIComponent(m[2])); return e ? [e, m[1]] : null;
}
document.addEventListener("pointerdown", (ev) => {
  // her yerde basılı tutunca önizleme (kullanıcı, 16.11.2026: kartlar, listeler, Planım, harita listesi, arama, filmler)
  const a = ev.target.closest?.('.cd, .sps, a[href*="/e/"], a[href*="/film/"], [data-href*="/e/"]'); if (!a || ev.button > 0 || a.closest(".pk, .tabs, .top")) return;
  lpFired = false; lpX = ev.clientX; lpY = ev.clientY; clearTimeout(lpT); lpEl = a;
  lpT = setTimeout(() => { const fm = (a.getAttribute("href") || "").match(/^#\/([^/]+)\/film\/(\d+)/);
    if (fm) { const f = DATA.films?.films?.find((x) => String(x.id) === fm[2]); if (!f) return; lpFired = true; haptic(12); filmPeek(f, fm[1], a); return; }
    const r = lpEvent(a); if (!r) return; lpFired = true; haptic(12); snd.pop(); peek(r[0], r[1], a); }, 460);
}, { passive: true });
let lpEl = null;
["pointerup", "pointercancel"].forEach((n) => document.addEventListener(n, () => clearTimeout(lpT), { passive: true, capture: true }));
// parmakla kaydırma başlayınca tarayıcı pointercancel gönderir; ayrıca 9 px'ten fazla kayma iptal eder (kaydırma olaylarına bakılmaz: tıklamada raf hizalanınca yanlışlıkla iptal oluyordu)
document.addEventListener("pointermove", (ev) => { if (Math.abs(ev.clientX - lpX) > 9 || Math.abs(ev.clientY - lpY) > 9) clearTimeout(lpT); }, { passive: true });
document.addEventListener("click", (ev) => { if (lpFired && ev.target.closest?.('.cd, .sps, a[href*="/e/"], a[href*="/film/"]')) { ev.preventDefault(); ev.stopPropagation(); lpFired = false; } }, true);
document.addEventListener("contextmenu", (ev) => { if (ev.target.closest?.('.cd, .sps, a[href*="/e/"], a[href*="/film/"]')) ev.preventDefault(); });
function peek(e, city, from) {
  const href = `#/${city}/e/${encodeURIComponent(e.slug)}`, best = e.tickets.find((x) => x.price) || e.tickets[0];
  const st = e.status === "tukendi" ? "Tükendi" : e.status === "iptal" ? "İptal edildi" : e.status === "ertelendi" ? "Ertelendi" : "";
  const o = document.createElement("div"); o.className = "pk"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", e.title + " önizleme");
  o.innerHTML = `<div class="pk-c"><a class="pk-p" href="${href}">${poster(e, { badge: false, lazy: false })}</a>
    <div class="pk-i"><small>${esc(CATS[e.cat] || "Etkinlik")}${st ? " · " + st : ""}</small><b>${esc(e.title)}</b>
    <span>${dLong(e.d)}${e.t ? " · " + esc(e.t) : ""}</span><span>${esc(e.venue || "")}</span>${e.price ? `<span class="pr">${TL(e.price)}'den${e.tickets.filter((x) => x.price).length > 1 ? " · " + e.tickets.filter((x) => x.price).length + " sitede" : ""}</span>` : ""}</div>
    <div class="pk-m"><a href="${href}" data-pk="open">${I.info}<span>Etkinliği aç</span></a><button type="button" data-pk="flw">${isF(e) ? I.bellOn : I.bell}<span>${isF(e) ? "Takip ediliyor" : "Takip et"}</span></button>
    <button type="button" data-pk="cal">${I.cal}<span>Takvime ekle</span></button><button type="button" data-pk="shr">${I.share}<span>Paylaş</span></button>
    ${best && live(e) ? `<a href="${esc(best.url)}" target="_blank" rel="noopener" data-buy="${esc(best.site)}">${I.ext}<span>Bilet al · ${esc(best.site)}</span></a>` : ""}</div></div>`;
  document.body.append(o); document.body.style.overflow = "hidden";
  const r = from.getBoundingClientRect(), c = $(".pk-c", o), cr = c.getBoundingClientRect();
  c.style.transformOrigin = `${r.left + r.width / 2 - cr.left}px ${r.top + r.height / 2 - cr.top}px`;
  requestAnimationFrame(() => o.classList.add("on"));
  const close = () => { o.classList.remove("on"); document.body.style.overflow = ""; snd.close(); setTimeout(() => o.remove(), 280); };
  o.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-pk]"); if (ev.target === o) return close();
    if (!b) { if (ev.target.closest("a")) close(); return; }
    const k = b.dataset.pk;
    if (k === "open") close();
    else if (k === "flw") { const F = follows(), id = fid(e); if (F[id]) { delete F[id]; toast("Takipten çıkarıldı"); } else { F[id] = { ...NV.snap(e, e.slug), city }; snd.ok(); toast(`Takip ediyorsun. <a href="#/${city}/takip">Planım →</a>`); } saveF(F); setTop(city); tabsUpdate(location.hash.replace(/^#\/?/, "").split("?")[0].split("/")); close(); }
    else if (k === "cal") { calAdd({ ...e, city }); close(); }
    else if (k === "shr") { shareEv(e, city); close(); }
  });
  addEventListener("hashchange", close, { once: true });
}

/* ---------- Afişte derinlik: fareyle ya da telefonu eğerek afiş hafifçe döner, üstünden ışık geçer (yalnızca transform) ---------- */
const TILT = { el: null, rx: 0, ry: 0, tx: 0, ty: 0, raf: 0, base: null };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
function tiltTarget() {
  if (reduced) return null;
  const sv = $(".stp .sv"); if (sv) { const i = Math.round(sv.scrollLeft / (sv.clientWidth || 1)); const s = $$(".sps", sv)[i]; const p = s && $(".po", s); if (p) return p; }
  return $(".dg .dp");
}
function tiltFrame() {
  TILT.raf = 0; const el = TILT.el; if (!el) return;
  TILT.rx += (TILT.tx - TILT.rx) * .14; TILT.ry += (TILT.ty - TILT.ry) * .14;
  el.style.transform = `perspective(900px) rotateX(${TILT.rx.toFixed(2)}deg) rotateY(${TILT.ry.toFixed(2)}deg)`;
  el.style.setProperty("--gx", (50 + TILT.ry * 4).toFixed(1) + "%"); el.style.setProperty("--gy", (50 - TILT.rx * 4).toFixed(1) + "%");
  if (Math.abs(TILT.tx - TILT.rx) > .02 || Math.abs(TILT.ty - TILT.ry) > .02) TILT.raf = requestAnimationFrame(tiltFrame);
}
function tiltTo(rx, ry, el) {
  if (TILT.el && TILT.el !== el) { TILT.el.style.transform = ""; TILT.el.classList.remove("tilt"); }
  TILT.el = el; if (!el) return; el.classList.add("tilt");
  TILT.tx = Math.max(-9, Math.min(9, rx)); TILT.ty = Math.max(-11, Math.min(11, ry)); if (!TILT.raf) TILT.raf = requestAnimationFrame(tiltFrame);
}
document.addEventListener("pointermove", (ev) => {
  if (ev.pointerType !== "mouse") return; const el = ev.target.closest?.(".sps .po, .dg .dp"); if (!el) { if (TILT.el) tiltTo(0, 0, TILT.el); return; }
  const r = el.getBoundingClientRect(); tiltTo(-((ev.clientY - r.top) / r.height - .5) * 14, ((ev.clientX - r.left) / r.width - .5) * 16, el);
}, { passive: true });
if (!reduced && "DeviceOrientationEvent" in window && !DeviceOrientationEvent.requestPermission) {
  addEventListener("deviceorientation", (ev) => {
    if (ev.beta == null) return; if (!TILT.base) TILT.base = [ev.beta, ev.gamma];
    TILT.base[0] += (ev.beta - TILT.base[0]) * .01; TILT.base[1] += (ev.gamma - TILT.base[1]) * .01; // yavaşça yeni duruşa alışır
    const el = tiltTarget(); if (!el) return; const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    tiltTo(-(ev.beta - TILT.base[0]) * .5, (ev.gamma - TILT.base[1]) * .6, el);
  }, { passive: true });
}

/* ---------- Konum ve uzaklık ("Yakınımda") ---------- */
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const kmTxt = (k) => k < 1 ? Math.round(k * 1000 / 50) * 50 + " m" : k < 10 ? k.toFixed(1).replace(".", ",") + " km" : Math.round(k) + " km";
function whereAmI(hi = false) {
  return new Promise((ok, no) => {
    if (DATA.me && !DATA.me.c && Date.now() - DATA.me.t < 10 * 60e3) return ok(DATA.me.p);
    if (!navigator.geolocation) return no({ code: 0 });
    navigator.geolocation.getCurrentPosition((p) => { DATA.me = { p: [p.coords.latitude, p.coords.longitude], t: Date.now() }; locSave(DATA.me.p); ok(DATA.me.p); }, no, { enableHighAccuracy: hi, timeout: hi ? 20000 : 12000, maximumAge: 5 * 60e3 });
  });
}
/* Yakınımda (kullanıcı isteği, 22:57: "izin ver'e tıklasın, bir yere gitmesine gerek kalmasın"):
   dokununca doğrudan sistemin kendi konum izni penceresi açılır (izin sorulmamışsa). İzin önceden kapatılmışsa tarayıcı yeniden sormaya izin vermez;
   o zaman cihaza göre tek satırlık yol + "Tekrar dene" + "Şehir merkezine göre sırala" seçeneği alttan açılan panelde. */
const goNear = (city) => { const h = `#/${city}/kesfet?sira=yakin&t=hafta`; if (location.hash === h) viewKesfet(city, { sira: "yakin", t: "hafta" }); else location.hash = h; };
function cityCenter(city) {
  const P = DATA.events.map((e) => vOf(e.venue)).filter((v) => v?.lat); if (!P.length) return null;
  const a = P.map((v) => v.lat).sort((x, y) => x - y), b = P.map((v) => v.lng).sort((x, y) => x - y); return [a[a.length >> 1], b[b.length >> 1]];
}
async function nearMe(city) {
  haptic(6); // izin penceresi dokunuşun hemen ardından açılsın diye konum önce istenir, mekân dosyası sonra
  if (inApp) { await venueTr(); return geoHelp(city, 1); }
  try { await whereAmI(); await venueTr(); goNear(city); return; }
  catch (err) { geoHelp(city, err?.code); }
}
function dis(u) { /* Dışarıda (Chrome/Safari) aç: önce görünmez çerçeveyle; böylece Instagram'daki sayfa yerinde kalır, geri dönünce beyaz ekran olmaz.
   Uygulama 1,5 sn içinde açılmazsa (çerçeveyi desteklemeyen tarayıcı) doğrudan geçilir. */
  var gone=false,h=function(){if(document.hidden)gone=true};document.addEventListener("visibilitychange",h);addEventListener("blur",function(){gone=true},{once:true});addEventListener("pagehide",function(){gone=true},{once:true});
  try{var f=document.createElement("iframe");f.style.cssText="display:none";f.src=u;document.body.appendChild(f);setTimeout(function(){f.remove()},4000)}catch(e){}
  setTimeout(function(){document.removeEventListener("visibilitychange",h);if(!gone)location.href=u},1500)}
const inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|Twitter|Snapchat|LinkedInApp/i.test(navigator.userAgent);
function geoHelp(city, code) {
  const and = /android/i.test(navigator.userAgent);
  if (inApp) { // Instagram vb. kendi tarayıcısı sitelere konum izni vermez: gerçek tarayıcıda aç (izin penceresi orada çıkar)
    // bağlantıda # olmasın (Instagram'ın tarayıcısı "intent" içinde ikinci # görünce boş sayfada kalıyordu); hedef ?k=yakin&il=… ile açılır
    const u = `${location.host}/?k=yakin&il=${city}`, open = and ? `intent://${u}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent("https://" + u)};end` : `x-safari-https://${u}`;
    const sh = sheet(`<div class="pn" role="dialog" aria-label="Konum"><div class="hd"><b>📍 Yakınındaki etkinlikler</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><p class="pl1">Instagram'ın içindeki tarayıcı sitelere konum izni vermiyor. ${and ? "Chrome'da" : "Safari'de"} açınca izin penceresi hemen çıkar.</p>
      <div class="pl-b"><a class="ok" href="${open}">${and ? "Chrome'da aç" : "Safari'de aç"}</a><a href="#" data-center>Şehir merkezine göre sırala</a></div>
      <p class="pl1" style="margin-top:14px;color:var(--t3);font-size:13px">Açılmazsa sağ üstteki <b>⋮</b> menüsünden <b>Tarayıcıda aç</b>'ı seç.</p>${standalone ? "" : `<a class="gapp" href="indir/"><img src="icons/icon-192.png?v=2" alt="" width="40" height="40"><span><b>Uygulamayı indirirsen daha kolay</b><small>Konum ve bildirimler tek dokunuşla çalışır · ücretsiz</small></span></a>`}</div></div>`, "mn");
    sh.querySelector("[data-center]").addEventListener("click", (ev) => { ev.preventDefault(); const c = cityCenter(city); sh.close(); if (!c) return; DATA.me = { p: c, t: Date.now(), c: 1 }; goNear(city); });
    sh.querySelector(".ok").addEventListener("click", (ev) => { ev.preventDefault(); haptic(6); dis(open); });
    return;
  }
  const how = code === 1
    ? (isIOS ? "iPhone'da <b>Ayarlar › Gizlilik ve Güvenlik › Konum Servisleri</b>'ni aç; sonra <b>Ayarlar › Safari › Konum</b>'u <b>Sor</b> ya da <b>İzin Ver</b> yap."
      : and ? (standalone ? "<b>Ayarlar › Uygulamalar › Ne Var Ne Yok › İzinler › Konum</b>'dan <b>Uygulamayı kullanırken izin ver</b>'i seç." : "Adres çubuğunun solundaki <b>kilit</b> simgesine dokun › <b>İzinler</b> › <b>Konum</b>'u aç.")
      : "Adres çubuğunun solundaki <b>ayar</b> simgesine tıkla › <b>Konum</b>'u <b>İzin ver</b> yap.")
    : "Cihazının konum servisi kapalı ya da konum şu an bulunamıyor. Konumu açıp tekrar dene.";
  const sh = sheet(`<div class="pn" role="dialog" aria-label="Konum"><div class="hd"><b>📍 Yakınındaki etkinlikler</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2"><p class="pl1">${code === 1 ? "Konum izni daha önce kapatılmış; bu yüzden tarayıcı bir daha soramıyor." : "Konumuna şu an ulaşamadık."}</p><p class="pl1">${how}</p><p class="pl1" style="color:var(--t3)">Konumun yalnızca bu cihazda, uzaklığı hesaplamak için kullanılır; hiçbir yere gönderilmez.</p>
    <div class="pl-b"><button type="button" class="ok" data-again>Tekrar dene</button><a href="#" data-center>Şehir merkezine göre sırala</a></div>${standalone ? "" : `<a class="gapp" href="indir/"><img src="icons/icon-192.png?v=2" alt="" width="40" height="40"><span><b>Uygulamayı indirirsen daha kolay</b><small>Konum ve bildirimler tek dokunuşla çalışır · ücretsiz</small></span></a>`}</div></div>`, "mn");
  sh.querySelector("[data-again]").addEventListener("click", async () => { try { await whereAmI(true); sh.close(); goNear(city); } catch (e2) { sh.close(); setTimeout(() => geoHelp(city, e2?.code), 300); } });
  sh.querySelector("[data-center]").addEventListener("click", (ev) => { ev.preventDefault(); const c = cityCenter(city); sh.close();
    if (!c) { toast("Bu ilde mekân konumları henüz toplanıyor; birkaç gün içinde hazır olacak 📍", 7000); return; }
    DATA.me = { p: c, t: Date.now(), c: 1 }; goNear(city); toast("Şehir merkezine göre sıralandı 📍", 4000); });
}
function venueTr() { if (DATA.vtrP) return DATA.vtrP; return (DATA.vtrP = jget("data/venues-tr.json").then((v) => { DATA.vtr = v || {}; })); }

/* ---------- "Bu akşam ne yapsak?" ---------- */
function tonightSheet(city) {
  haptic(6);
  const { d: today, hm } = nowIST(), P = prefs();
  let L = DATA.events.filter((e) => live(e) && e.d === today && e.status !== "tukendi" && (!e.t || e.t >= hm) && (!e.t || e.t >= "16:00"));
  if (P?.budget) L = L.filter((e) => !e.price || e.price <= P.budget);
  L = uniq([...L].sort((a, b) => (P ? pscore(b) - pscore(a) : 0) || b.score - a.score || (a.t || "").localeCompare(b.t || "")), 8).sort((a, b) => (a.t || "99").localeCompare(b.t || "99"));
  const nf = DATA.films?.films?.filter((f) => f.s && f.s[today]?.length).length || 0;
  const row = (e) => `<a class="pl-r" href="#/${city}/e/${encodeURIComponent(e.slug)}" data-close><span class="pl-t">${esc(e.t || "—")}</span><span class="pl-p">${poster(e, { badge: false })}</span><span class="pl-x"><b>${esc(e.title)}</b><small>${esc(e.venue || "")}</small>${e.price ? `<small class="pr">${TL(e.price)}'den</small>` : ""}</span></a>`;
  const sh = sheet(`<div class="pn" role="dialog" aria-label="Bu akşam ne yapsak?"><div class="hd"><b>Bu akşam ne yapsak? 🌙</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2"><p class="pl1">${L.length ? `${P ? "İlgi alanlarına göre" : "Öne çıkanlara göre"} bu akşam için seçtiklerimiz${P?.budget ? ` · ${TL(P.budget)}'ye kadar` : ""}:` : "Bu akşam için başlamamış etkinlik kalmadı gibi. Yarına bir bakalım mı?"}</p>
    <div class="pl-l">${L.map(row).join("")}</div>
    <div class="pl-b"><a class="ok" href="#/${city}/kesfet?t=${L.length ? "bugun" : "yarin"}&s=aksam,gece" data-close>${L.length ? "Bu akşamın hepsini gör" : "Yarına bak"}</a>${nf ? `<a href="#/${city}/sinema" data-close>🍿 Bugün ${nf} film vizyonda</a>` : ""}</div></div></div>`, "mn");
  return sh;
}

/* ---------- Açılış tanıtımı (yalnızca ilk girişte; sonra kayıtlı ille açılır, il üstteki düğmeden değişir) ---------- */
function intro(force) {
  if ((!force && store.get("nvny-intro")) || $(".intro")) return;
  const W = [...new Set((DATA.top || []).map((e) => e.img).filter(Boolean))].slice(0, 12);
  const S = [
    ["81 il · tek uygulama", "Şehrinde ne var<br><em>ne yok, hepsi burada.</em>", "Konserler, tiyatrolar, stand-up'lar, festivaller ve sinema seansları; afiş afiş, gün gün."],
    ["Fiyat karşılaştırma", "Aynı bilet,<br><em>yan yana.</em>", "Bir etkinlik birden çok sitede satılıyorsa siteleri doğrulanmış fiyatlarıyla yan yana görürsün."],
    ["Takip et · Planım", "Planını yap,<br><em>hiçbir şeyi kaçırma.</em>", "Takip ettiklerin Planım'da gün gün durur. Saat, yer ya da bilet durumu değişirse ilk sen duyarsın."],
    ["Son adım", "Hangi<br><em>şehirdesin?</em>", "Şehrini bir kez seç; uygulama hep onunla açılsın. İstediğin an üstten değiştirirsin."],
  ];
  const o = document.createElement("div"); o.className = "intro"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Tanıtım");
  o.innerHTML = `<div class="in-w" aria-hidden="true">${W.concat(W).slice(0, 12).map((u) => `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" decoding="async">`).join("")}</div>
    <button type="button" class="in-x">Geç</button>
    <div class="in-s">${S.map((s, i) => `<section><div class="in-c">${i === 0 ? `<img class="in-ic" src="icons/icon-512.png?v=2" alt="" width="96" height="96">` : `<div class="in-n">${i + 1}/${S.length}</div>`}<small>${s[0]}</small><h2>${s[1]}</h2><p>${s[2]}</p></div></section>`).join("")}</div>
    <div class="in-f"><div class="in-d">${S.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div><button type="button" class="in-go">Devam</button></div>`;
  document.body.append(o); document.body.style.overflow = "hidden"; requestAnimationFrame(() => o.classList.add("on"));
  const sc = $(".in-s", o), dots = $$(".in-d i", o), go = $(".in-go", o); let cur = 0;
  const done = () => { store.set("nvny-intro", "1"); if (standalone) store.set("nvny-app-ilk", "1"); setTimeout(welcomeApp, 900); setTimeout(() => dispatchEvent(new Event("nvny-intro-done")), 450); o.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => o.remove(), 400); setTimeout(() => $("#cq")?.focus({ preventScroll: true }), 420); };
  sc.addEventListener("scroll", () => { const i = Math.round(sc.scrollLeft / sc.clientWidth); if (i !== cur) { cur = i; dots.forEach((d, k) => d.classList.toggle("on", k === i)); go.textContent = i === S.length - 1 ? "Şehrimi seçeyim" : "Devam"; tick(); } }, { passive: true });
  go.addEventListener("click", () => { haptic(6); if (cur >= S.length - 1) return done(); sc.scrollTo({ left: (cur + 1) * sc.clientWidth, behavior: "smooth" }); });
  $(".in-x", o).addEventListener("click", done);
}

/* ---------- Planım: takip ettiklerin kendi takvimimiz gibi (gün gün), mekânlarım ---------- */
function untilTxt(e) {
  const { d: today, hm } = nowIST(), days = Math.round((pd(e.d) - pd(today)) / 864e5);
  if (days < 0) return "Geçti";
  if (days === 0) { if (!e.t) return "Bugün"; const m = timeDiff(hm, e.t); return m <= 0 ? "Başladı" : m < 60 ? `${m} dk sonra` : `${Math.floor(m / 60)} sa ${m % 60 ? (m % 60) + " dk " : ""}sonra`; }
  return days === 1 ? "Yarın" : `${days} gün sonra`;
}
function viewPlan(city, tab) {
  pastMove(); setTop(city); document.title = "Planım · Ne Var Ne Yok";
  const F = follows(), V2 = vfol(), { d: today } = nowIST();
  const rows = Object.entries(F).map(([id, f]) => {
    const c = f.city || city, e = f.kind === "seans" ? null : c === DATA.city ? (DATA.bySlug.get(f.slug) || DATA.events.find((x) => NV.key(x.title) === f.tk && x.d === f.d) || null) : null;
    return { id, f, c, e, d: e?.d || f.d, t: e?.t ?? f.t ?? "" };
  }).filter((r) => r.d >= today).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "99").localeCompare(b.t || "99"));
  const dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7), wkS = dow === 6 || dow === 0 ? today : fri, wkE = dow === 0 ? today : addD(fri, 2);
  const wk = rows.filter((r) => r.d >= wkS && r.d <= wkE);
  const dayH = (d) => d === today ? "Bugün" : d === addD(today, 1) ? "Yarın" : dLong(d);
  const href = (r) => r.f.kind === "seans" ? `#/${r.c}/film/${r.f.film}?gun=${r.d}` : `#/${r.c}/e/${encodeURIComponent(r.e?.slug || r.f.slug)}`;
  const item = (r) => { const e = r.e || { title: r.f.title, venue: r.f.venue, d: r.d, t: r.t, img: r.f.img, cat: r.f.cat, status: r.f.status || "" };
    const st = e.status === "iptal" ? "İptal edildi" : e.status === "ertelendi" ? "Ertelendi" : e.status === "tukendi" ? "Tükendi" : "";
    return `<div class="pl-i${st && st !== "Tükendi" ? " x" : ""}"><span class="pl-t">${esc(r.t || "—")}</span><a class="pl-p" href="${href(r)}">${poster(e, { badge: false })}</a>
      <a class="pl-x" href="${href(r)}"><b>${esc(e.title)}</b><small>${esc(e.venue || "")}${r.c !== city ? " · " + esc(CITIES.find((c) => c.id === r.c)?.name || "") : ""}</small><small class="ut">${st ? `<em>${st}</em>` : esc(untilTxt(e))}</small></a>
      <span class="pl-a"><button type="button" data-cal="${esc(r.id)}" aria-label="Takvime ekle">${I.cal}</button><button type="button" data-unf="${esc(r.id)}" aria-label="Takipten çıkar">✕</button></span></div>`; };
  const days = [...new Set(rows.map((r) => r.d))];
  const next = rows[0];
  const VL = Object.entries(V2).map(([k, v]) => ({ k, v, L: v.city === DATA.city ? DATA.events.filter((x) => x.venue === v.name && live(x)) : null }));
  const plan = rows.length ? `
    ${next ? `<a class="pl-n" href="${href(next)}"><span class="pl-np">${poster(next.e || { title: next.f.title, img: next.f.img, cat: next.f.cat, d: next.d, venue: next.f.venue }, { badge: false })}</span><span class="pl-nx"><small>Sıradaki</small><b>${esc(next.e?.title || next.f.title)}</b><span>${dayH(next.d)}${next.t ? " · " + esc(next.t) : ""}</span><span>${esc(next.e?.venue || next.f.venue || "")}</span><em>${esc(untilTxt({ d: next.d, t: next.t }))}</em>${(() => { const L = leavePlan(next.f, next.e); return L ? `<em class="lv">${L.walk ? "🚶" : "🚗"} ${L.at}'da çık · ~${durTxt(L.mins)}</em>` : ""; })()}</span></a>` : ""}
    ${wk.length ? `<div class="pl-w">🎉 Bu hafta sonu <b>${wk.length} planın</b> var</div>` : ""}
    ${days.map((d) => { const L = rows.filter((r) => r.d === d), we = [0, 6].includes(pd(d).getDay()); return `<section class="pl-d"><h3>${dayH(d)}${we && d !== today && d !== addD(today, 1) ? "" : ""}<small>${GUN[pd(d).getDay()]}${we ? " · hafta sonu" : ""}</small></h3>${L.map(item).join("")}</section>`; }).join("")}
    <button type="button" class="pl-all" id="calAll">${I.cal}Hepsini takvimime ekle</button>`
    : `<div class="empty">Planın şimdilik boş. Bir etkinliğin sayfasında <b>Takip et</b>'e dokun; burada gün gün dursun, değişiklik olursa haber verelim.<p style="margin-top:18px"><a class="more" style="display:inline-flex;align-items:center" href="#/${city}/kesfet">Etkinliklere göz at</a></p></div>`;
  const ven = VL.length ? VL.map(({ k, v, L }) => `<div class="vn"><div class="vn-h"><span>${I.pin}</span><div><b>${esc(v.name)}</b><small>${esc(CITIES.find((c) => c.id === v.city)?.name || "")}${L ? ` · ${L.length} yaklaşan etkinlik` : ""}</small></div><button type="button" data-vx="${esc(k)}">Bırak</button></div>
      ${L && L.length ? `<div class="rs">${uniq(L, 10).map((e) => card(e, v.city)).join("")}</div>` : L ? `<p class="vn-e">Şu an listede etkinlik yok; eklenince haber veririz.</p>` : `<p class="vn-e"><a href="#/${v.city}/takip?m=1">${esc(CITIES.find((c) => c.id === v.city)?.name || "")} sayfasında gör →</a></p>`}</div>`).join("")
    : `<div class="empty">Henüz takip ettiğin mekân yok. Bir etkinliğin sayfasında, Konum bölümündeki <b>Mekânı takip et</b>'e dokun; o mekâna yeni etkinlik eklenince haber verelim.</div>`;
  V.innerHTML = `<div class="kh"><h1>Planım</h1><p>${rows.length} etkinlik · ${VL.length} mekân takipte</p></div>
  <div class="wrap"><div class="seg pl-seg" style="--n:2;--i:${tab ? 1 : 0}"><span class="thumb" aria-hidden="true"></span><button type="button" data-tab="0" class="${tab ? "" : "on"}">Planım</button><button type="button" data-tab="1" class="${tab ? "on" : ""}">Takiplerim</button></div></div>
  ${tab ? "" : `<div class="wrap">${gittiAsk(city)}${yilCard(city)}</div>${recoRail(city)}`}
  <div class="wrap plan">${tab ? ven + followLists(city) : plan}</div>
  <div class="wrap" style="margin-top:22px">${notifBox(city)}</div>${footer()}`;
  bindNotifBox(V, city); gittiBind(city, () => viewPlan(city, tab));
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => { history.replaceState(null, "", `#/${city}/takip${b.dataset.tab === "1" ? "?m=1" : ""}`); viewPlan(city, b.dataset.tab === "1"); }));
  $$("[data-unf]").forEach((b) => b.addEventListener("click", () => { const F2 = follows(); delete F2[b.dataset.unf]; saveF(F2); haptic(6); viewPlan(city, tab); tabsUpdate([city, "takip"]); setTop(city); }));
  $$("[data-cal]").forEach((b) => b.addEventListener("click", () => { const r = rows.find((x) => x.id === b.dataset.cal); if (r) calAdd({ ...(r.e || { title: r.f.title, venue: r.f.venue, d: r.d, t: r.t, cat: r.f.cat, slug: r.f.slug }), city: r.c }); }));
  $("#calAll")?.addEventListener("click", () => calAdd(rows.map((r) => ({ ...(r.e || { title: r.f.title, venue: r.f.venue, d: r.d, t: r.t, cat: r.f.cat, slug: r.f.slug }), city: r.c }))));
  $$("[data-vx]").forEach((b) => b.addEventListener("click", () => { const V3 = vfol(); delete V3[b.dataset.vx]; vsave(V3); haptic(6); viewPlan(city, true); }));
  $$("[data-ax]").forEach((b) => b.addEventListener("click", () => { const A = afol(); delete A[b.dataset.ax]; asave(A); haptic(6); viewPlan(city, true); }));
  $$("[data-fx]").forEach((b) => b.addEventListener("click", () => { const F3 = ffol(); delete F3[b.dataset.fx]; fsave(F3); haptic(6); viewPlan(city, true); }));
}

/* ---------- Simge kısayolları (Android/bilgisayar: simgeye basılı tut) ---------- */
function shortcutBoot() {
  const k = new URLSearchParams(location.search).get("k"); if (!k) return;
  const il = new URLSearchParams(location.search).get("il");
  const city = (() => { const s = il || store.get("nvny-city"); return s && CITIES.find((c) => c.id === s && c.live) ? s : "ankara"; })();
  if (il && CITIES.find((c) => c.id === il && c.live)) { store.set("nvny-city", il); store.set("nvny-intro", "1"); }
  history.replaceState(null, "", location.pathname + ({ aksam: `#/${city}`, sinema: `#/${city}/sinema`, plan: `#/${city}/takip`, yakin: `#/${city}` }[k] || `#/${city}`));
  if (k === "aksam") setTimeout(() => { if (DATA.ready) tonightSheet(city); }, 900);
  if (k === "yakin") setTimeout(() => nearMe(city), 900);
}

/* ---------- Mesafe ve uygulama içi yol tarifi (kullanıcı isteği, 15.11.2026 23:44–23:47) ----------
   "Senden 3,4 km · yürüyerek ~40 dk": konum izni zaten verildiyse kendiliğinden, verilmediyse "Ne kadar uzak?" ile (durduk yere izin sorulmaz).
   Yol tarifi uygulamadan çıkmadan: yürüme ve araba yolu haritamıza çizilir, süre, varış saati ve adım adım tarif; sayfa açıkken mavi nokta seninle ilerler.
   Yol, OpenStreetMap topluluğunun (FOSSGIS) anahtarsız yol sunucusundan hesaplanır; bunun için yalnızca başlangıç ve varış noktası oraya gider, bizde saklanmaz.
   Toplu taşıma, trafik ve sesli navigasyon için "Google Haritalar'da aç" kalır. */
const mesafeOn = () => store.get("nvny-mesafe") !== "0";
const walkMin = (k) => Math.max(1, Math.round(k * 1.25 / 4.8 * 60));
const carMin = (k) => Math.max(2, Math.round(k * 1.35 / 28 * 60 + 2));
const durTxt = (m) => m < 60 ? m + " dk" : Math.floor(m / 60) + " sa" + (m % 60 ? " " + (m % 60) + " dk" : "");
const geoGranted = async () => { try { return (await navigator.permissions.query({ name: "geolocation" })).state === "granted"; } catch { return false; } };
function distLine(k) { return `<b>Senden ${kmTxt(k)}</b> · ${k < 2.5 ? "yürüyerek ~" + durTxt(walkMin(k)) : "arabayla ~" + durTxt(carMin(k))}`; }
async function distFill(v, el) {
  const draw = (p) => { if (!document.body.contains(el)) return; el.innerHTML = distLine(km(p, [v.lat, v.lng])); el.classList.add("on"); };
  if ((DATA.me && !DATA.me.c && Date.now() - DATA.me.t < 10 * 60e3) || await geoGranted()) { whereAmI().then(draw).catch(() => {}); return; }
  if (inApp) return;
  el.innerHTML = `<button type="button" class="dsb">${I.pin}Ne kadar uzak?</button>`;
  el.querySelector("button").addEventListener("click", (ev) => { ev.preventDefault(); haptic(6); el.innerHTML = `<span class="dsw">Konumun bulunuyor…</span>`;
    whereAmI(true).then(draw).catch((err) => { el.innerHTML = ""; geoHelp(DATA.city, err?.code); }); });
}
const RMOD = { left: "sola", right: "sağa", "slight left": "hafif sola", "slight right": "hafif sağa", "sharp left": "keskin sola", "sharp right": "keskin sağa", straight: "düz", uturn: "geri" };
const RROT = { left: -90, right: 90, "slight left": -45, "slight right": 45, "sharp left": -135, "sharp right": 135, straight: 0, uturn: 180 };
const cap1 = (x) => x.charAt(0).toLocaleUpperCase("tr") + x.slice(1);
function stepTxt(s, venue) {
  const m = s.maneuver || {}, t = m.type, md = RMOD[m.modifier] || "", n = s.name ? `<b>${esc(s.name)}</b>` : "";
  if (t === "depart") return n ? `${n} üzerinden yola çık` : "Yola çık";
  if (t === "arrive") return `Vardın 🎉 <b>${esc(venue)}</b>${m.modifier === "left" ? " solunda" : m.modifier === "right" ? " sağında" : ""}`;
  if (t === "roundabout" || t === "rotary" || t === "roundabout turn") return `Döner kavşaktan ${m.exit ? m.exit + ". çıkışı " : ""}al${n ? ", " + n : ""}`;
  if (t === "exit roundabout" || t === "exit rotary") return `Kavşaktan çık${n ? ", " + n : ""}`;
  if (md === "geri") return "Geri dön";
  if (!md || md === "düz") return `Düz devam et${n ? ", " + n : ""}`;
  if (t === "fork") return `Yol ayrımında ${md} git${n ? ", " + n : ""}`;
  if (t === "end of road") return `Yolun sonunda ${md} dön${n ? ", " + n : ""}`;
  if (t === "merge") return `${cap1(md)} katıl${n ? ", " + n : ""}`;
  if (t === "on ramp") return `${cap1(md)} bağlantı yoluna gir${n ? ", " + n : ""}`;
  if (t === "off ramp") return `${cap1(md)} çıkıştan çık${n ? ", " + n : ""}`;
  return `${cap1(md)} dön${n ? ", " + n : ""}`;
}
const mTxt = (m) => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km";
const arrow = (s) => { const m = s.maneuver || {}, r = m.type === "arrive" ? null : m.type === "depart" ? 0 : RROT[m.modifier] ?? 0;
  return r === null ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
    : `<svg viewBox="0 0 24 24" style="transform:rotate(${r}deg)"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
const RCACHE = new Map();
async function routeOf(mode, a, b) {
  const k = mode + a.map((x) => x.toFixed(4)) + b; if (RCACHE.has(k)) return RCACHE.get(k);
  const u = `https://routing.openstreetmap.de/routed-${mode === "car" ? "car" : "foot"}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  const r = await fetch(u); if (!r.ok) throw new Error("rota " + r.status); const j = await r.json(); if (j.code !== "Ok" || !j.routes?.length) throw new Error("rota yok");
  RCACHE.set(k, j.routes[0]); return j.routes[0];
}
function routeSheet(e, v, city, gUrl) {
  haptic(6);
  const sh = sheet(`<div class="pn rtp" role="dialog" aria-label="Yol tarifi"><div class="hd"><span class="rth"><b>Yol tarifi</b><small>${esc(e.venue || "")}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="rtm map" id="rmap"></div>
    <div class="bd2"><div class="rseg" role="tablist"><i></i><button type="button" data-m="foot" role="tab">🚶 Yürüyerek</button><button type="button" data-m="car" role="tab">🚗 Arabayla</button></div>
    <div class="rsum" id="rsum"><span class="sk" style="display:block;height:52px;border-radius:14px"></span></div>
    <ol class="rst" id="rst"></ol>
    <a class="rg" href="${gUrl}" target="_blank" rel="noopener">${I.ext}Google Haritalar'da aç</a>
    <p class="rnote">Yol OpenStreetMap verisiyle hesaplanır; trafik hesaba katılmaz. Toplu taşıma ve sesli yol tarifi için Google Haritalar. Bunun için yalnızca başlangıç ve varış noktası OpenStreetMap'in yol sunucusuna gider, bizde saklanmaz.</p></div></div>`, "mn rt");
  let map = null, line = null, me = null, watch = null, mode = null, from = null, R = null;
  const dest = [v.lat, v.lng], seg = sh.querySelector(".rseg"), sum = sh.querySelector("#rsum"), st = sh.querySelector("#rst");
  const oldClose = sh.close; sh.close = () => { if (watch != null) navigator.geolocation.clearWatch(watch); oldClose(); };
  const setMode = (m) => { mode = m; seg.classList.toggle("r", m === "car"); seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.m === m)); };
  const paint = async () => {
    sum.innerHTML = `<span class="sk" style="display:block;height:52px;border-radius:14px"></span>`; st.innerHTML = "";
    try { R = await routeOf(mode, from, dest); }
    catch { sum.innerHTML = `<div class="rerr">Yol şu an hesaplanamadı. Kuş uçuşu ${kmTxt(km(from, dest))}. <a href="${gUrl}" target="_blank" rel="noopener">Google Haritalar'da aç ↗</a></div>`; return; }
    const min = Math.max(1, Math.round(R.duration / 60)), at = new Date(Date.now() + R.duration * 1000).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
    const late = e.t && e.d === nowIST().d ? (() => { const [h, mm] = e.t.split(":").map(Number), leave = h * 60 + mm - min - 10, n = nowIST().hm.split(":").map(Number), now = n[0] * 60 + n[1]; return leave >= now ? `<small class="go">Tam yetişmek için en geç <b>${String(Math.floor(leave / 60)).padStart(2, "0")}:${String(leave % 60).padStart(2, "0")}</b>'da çık</small>` : now < h * 60 + mm ? `<small class="go late">Başlamasına ${h * 60 + mm - now} dk var, hemen çıkmalısın</small>` : ""; })() : "";
    sum.innerHTML = `<div class="rs1"><b>${durTxt(min)}</b><span>${mTxt(R.distance)} · varış ${at}</span></div>${late}`;
    const S = R.legs[0].steps.filter((s, i, a) => !(s.maneuver.type === "new name" && s.distance < 15 && i < a.length - 1));
    st.innerHTML = S.map((s, i) => `<li data-i="${i}"><i>${arrow(s)}</i><span>${stepTxt(s, e.venue || "")}${s.distance >= 5 && s.maneuver.type !== "arrive" ? `<small>${mTxt(s.distance)}</small>` : ""}</span></li>`).join("");
    st.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => { const s = S[+li.dataset.i]; if (map) map.flyTo([s.maneuver.location[1], s.maneuver.location[0]], 17, { duration: .5 }); haptic(4); }));
    if (map) { line?.remove(); line = window.L.polyline(R.geometry.coordinates.map((c) => [c[1], c[0]]), { color: "#a78bfa", weight: 6, opacity: .95, lineCap: "round", lineJoin: "round", dashArray: mode === "foot" ? "1 10" : null }).addTo(map); map.fitBounds(line.getBounds(), { padding: [34, 34] }); }
  };
  seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.m === mode || !from) return; snd.sel?.(); haptic(4); setMode(b.dataset.m); paint(); }));
  leaflet().then(() => { const L = window.L, el = sh.querySelector("#rmap"); if (!document.body.contains(el)) return;
    map = L.map(el, { zoomControl: false, attributionControl: true, tap: false }).setView(dest, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "dk", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · yol: FOSSGIS' }).addTo(map);
    L.marker(dest, { icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(map);
    if (from) { me = L.marker(from, { icon: L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map); if (R) paint(); }
  }).catch(() => sh.querySelector("#rmap")?.remove());
  whereAmI(true).then((p) => {
    from = p; const k = km(p, dest); setMode(k < 2.5 ? "foot" : "car");
    if (map && !me) me = window.L.marker(p, { icon: window.L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
    paint();
    // sayfa açıkken mavi nokta seninle ilerler; yoldan 80 m'den çok saparsan yol yeniden hesaplanır
    if (navigator.geolocation?.watchPosition) watch = navigator.geolocation.watchPosition((q) => { const np = [q.coords.latitude, q.coords.longitude]; DATA.me = { p: np, t: Date.now() };
      me?.setLatLng(np);
      if (R && km(from, np) > .08) { const C = R.geometry.coordinates, off = Math.min(...C.filter((_, i) => i % 3 === 0).map((c) => km(np, [c[1], c[0]]))); if (off > .08) { from = np; paint(); } }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }).catch((err) => { sh.close(); setTimeout(() => geoHelp(city, err?.code), 280); });
}

/* ---------- Ayarlar (kullanıcı isteği, 15.11.2026 23:46: "ayarlar kısmı olsun; sesi, bildirimleri açıp kapatabilsin") ----------
   iPhone Ayarlar gibi gruplu kartlar. Her şey yalnızca bu telefonda saklanır. Üst çubuktaki dişliden açılır: #/<il>/ayarlar */
const ncfg = () => { try { return JSON.parse(store.get("nvny-ncfg") || "{}") || {}; } catch { return {}; } };
// Bildirim türleri sade beş grupta (kullanıcı, 16.11.2026 01:09: "ayarlarda çok fazla şey var, Apple profesyonelliğinde olsun"); her grup birden çok türü açar/kapatır
const NTYPES = [["degisiklik", "Değişiklikler", ["degisiklik", "satis"]], ["hatirlatma", "Hatırlatmalar", ["hatirlatma", "azkaldi", "yolacik"]], ["fiyat", "Fiyat düşünce", ["fiyat"]], ["yeni", "Yeni tarihler", ["sanatci", "mekan", "film"]], ["oneri", "Öneriler", ["oneri", "nasildi"]]];
const PERM_TXT = { granted: "Açık", denied: "Kapalı", prompt: "Sorulmadı" };
// iOS Ayarlar gibi renkli kare simgeler (beyaz çizim)
const SIC = (bg, d) => `<span class="sic" style="background:${bg}"><svg viewBox="0 0 24 24">${d}</svg></span>`;
const SI = {
  bell: SIC("#ff3b30", '<path d="M6.5 16V11a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z" fill="#fff"/><path d="M10 20a2 2 0 0 0 4 0" fill="#fff"/>'),
  ses: SIC("#ff2d55", '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="#fff"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>'),
  konum: SIC("#0a84ff", '<path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="#fff"/>'),
  gorunum: SIC("#5e5ce6", '<text x="12" y="16.5" text-anchor="middle" font-family="-apple-system,Inter Tight,sans-serif" font-weight="700" font-size="12" fill="#fff">Aa</text>'),
  ilgi: SIC("#8b5cf6", '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" fill="#fff"/><path d="M18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff"/>'),
  ekran: SIC("#30b0c7", '<rect x="5" y="5" width="6" height="6" rx="1.6" fill="#fff"/><rect x="13" y="5" width="6" height="6" rx="1.6" fill="#fff"/><rect x="5" y="13" width="6" height="6" rx="1.6" fill="#fff"/><rect x="13" y="13" width="6" height="6" rx="1.6" fill="#fff" opacity=".55"/>'),
  veri: SIC("#8e8e93", '<rect x="6" y="10.5" width="12" height="9" rx="2" fill="#fff"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#fff" stroke-width="2"/>'),
  yaz: SIC("#34c759", '<rect x="4" y="6" width="16" height="12" rx="2.5" fill="#fff"/><path d="M5 7.5l7 5 7-5" fill="none" stroke="#34c759" stroke-width="1.8" stroke-linejoin="round"/>'),
  bilgi: SIC("#8e8e93", '<circle cx="12" cy="12" r="8" fill="#fff"/><path d="M12 11v5.5" stroke="#8e8e93" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1.3" fill="#8e8e93"/>'),
};
const CHV = `<svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SECT = { bildirimler: "Bildirimler", ses: "Ses ve Titreşim", konum: "Konum", gorunum: "Görünüm", "ana-ekran": "Ana Ekran", veriler: "Verilerim", hakkinda: "Hakkında" };
async function viewAyarlar(city, sec) {
  setTop(city); const C = ncfg(), cname = CITIES.find((c) => c.id === city)?.name || "", nperm = NOTIF ? Notification.permission : "denied", base = `#/${city}/ayarlar`;
  let gperm = "prompt"; try { gperm = (await navigator.permissions.query({ name: "geolocation" })).state; } catch {}
  const row = (href, ic, t, right = "", attrs = "") => `<a class="srow" href="${href}"${attrs}>${ic || ""}<span class="stx">${t}</span>${right ? `<span class="sv">${right}</span>` : ""}${CHV}</a>`;
  const tg = (id, on, t, ic = "", data = "") => `<label class="srow tg">${ic}<span class="stx">${t}</span><input type="checkbox" id="${id}"${on ? " checked" : ""}${data}></label>`;
  const grp = (h, foot = "") => `<div class="sgrp">${h}</div>${foot ? `<p class="sft">${foot}</p>` : ""}`;
  const nOn = !C.off && nperm === "granted", ver = ($('script[src*="app.js"]')?.getAttribute("src") || "").split("v=")[1] || "";
  const head = (t) => `<div class="ayr"><a class="sback" href="${base}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Ayarlar</a><h1 class="stl">${t}</h1>`;
  const and = /android/i.test(navigator.userAgent);
  document.title = `${sec ? SECT[sec] || "Ayarlar" : "Ayarlar"} · Ne Var Ne Yok`;
  let html;
  if (!sec || !SECT[sec]) {
    html = `<div class="ayr"><h1 class="stl">Ayarlar</h1>
      <a class="sme" href="#/?sec=1"><img src="icons/icon-192.png?v=3" alt="" width="60" height="60"><span class="stx"><b>Ne Var Ne Yok</b><small>Şehrim: ${esc(cname)}</small></span>${CHV}</a>
      ${grp(row(`${base}/bildirimler`, SI.bell, "Bildirimler", nOn ? "Açık" : "Kapalı") + row(`${base}/ses`, SI.ses, "Ses ve Titreşim") + row(`${base}/konum`, SI.konum, "Konum", PERM_TXT[gperm] || ""))}
      ${grp(row(`${base}/gorunum`, SI.gorunum, "Görünüm") + row("#", SI.ilgi, "İlgi Alanlarım", prefs() ? "Seçili" : "", " data-prefs"))}
      ${grp(row(`${base}/ana-ekran`, SI.ekran, "Ana Ekran") + row(`${base}/veriler`, SI.veri, "Verilerim"))}
      ${grp(row(`mailto:${esc(window.NVNY_SITE?.contact || "")}?subject=${encodeURIComponent("Ne Var Ne Yok")}`, SI.yaz, "Bize Yaz") + row(`${base}/hakkinda`, SI.bilgi, "Hakkında"))}
      <p class="sft c">Ne Var Ne Yok${ver ? " · " + esc(ver.slice(0, 7)) : ""} · by oneside</p></div>`;
  } else if (sec === "bildirimler") {
    const top = nperm === "granted" ? tg("s-noff", !C.off, "Bildirimlere İzin Ver")
      : `<div class="srow"><span class="stx">Bildirimlere İzin Ver</span>${nperm === "denied" ? `<span class="sv">Kapalı</span>` : `<button type="button" class="spill" data-notif>Aç</button>`}</div>`;
    html = head("Bildirimler") + grp(top, nperm === "denied" ? (isIOS ? "Açmak için iPhone Ayarlar › Bildirimler › Ne Var Ne Yok." : and ? "Açmak için adres çubuğundaki kilit › İzinler › Bildirimler." : "Açmak için tarayıcının site ayarlarını kullan.") : "")
      + `<div class="sgrp nt${nOn ? "" : " dim"}">${NTYPES.map(([k, t, keys]) => tg("n-" + k, keys.some((x) => C[x] !== false), t, "", ` data-nk="${keys.join(",")}"`)).join("")}</div>`
      + `<p class="sft">Yalnızca takip ettiğin etkinlikler, mekânlar, sanatçılar ve filmler için gönderilir.</p></div>`;
  } else if (sec === "ses") {
    html = head("Ses ve Titreşim") + grp(tg("s-ses", sesOn(), "Dokunma Sesleri") + tg("s-klv", store.get("nvny-klavye") !== "0", "Klavye Sesleri") + tg("s-tit", store.get("nvny-titre") !== "0", "Titreşim"), "Çarklardaki tık, düğmelerdeki hafif ses ve yazarken klavye sesi.") + "</div>";
  } else if (sec === "konum") {
    html = head("Konum") + grp(`<div class="srow"><span class="stx">Konum İzni</span>${gperm === "prompt" && !inApp ? `<button type="button" class="spill" data-geo>İzin Ver</button>` : `<span class="sv">${PERM_TXT[gperm] || ""}</span>`}</div>` + tg("s-mes", mesafeOn(), "Uzaklıkları Göster"),
      "Konumun yalnızca bu telefonda, uzaklığı hesaplamak için kullanılır.") + "</div>";
  } else if (sec === "gorunum") {
    const zi = Math.max(0, ZOOMS.findIndex(([z]) => z === +(store.get("nvny-yazi") || 1)));
    html = head("Görünüm") + grp(tg("s-gece", store.get("nvny-gece") !== "0", "Gece Modu"), "22:00–07:00 arası ekran biraz kısılır ve ısınır.")
      + `<h4>Yazı Boyutu</h4>` + grp(`<div class="srow col"><div class="seg" id="zseg" style="--n:3;--i:${zi}"><span class="thumb" aria-hidden="true"></span>${ZOOMS.map(([z, l], k) => `<button type="button" data-z="${z}" data-k="${k}" class="${k === zi ? "on" : ""}">${l}</button>`).join("")}</div></div>`)
      + grp(tg("s-az", store.get("nvny-az") === "1", "Hareketleri Azalt"), "Kayan ve büyüyen geçişler sadeleşir.") + "</div>";
  } else if (sec === "ana-ekran") {
    const sc = [["Bu akşam", "#ff9f0a"], ["Planım", "#ff3b30"], ["Sinema", "#bf5af2"], ["Yakınımda", "#0a84ff"]];
    html = head("Ana Ekran") + `<div class="hsc"><img src="icons/icon-192.png?v=3" alt="" width="64" height="64"><div class="hsm">${sc.map(([t, c]) => `<div><i style="background:${c}"></i><b>${t}</b></div>`).join("")}</div></div>
      <p class="sft">${standalone ? "Ana ekrandaki simgeye basılı tut; bu kısayollar açılır." : "Uygulamayı indirince simgeye basılı tutup bu kısayolları kullanabilirsin."}${and ? " Bir kısayolu sürükleyip ana ekrana ayrı simge olarak da bırakabilirsin." : ""}</p>
      ${standalone ? "" : grp(row("indir/", "", "Uygulamayı İndir"))}</div>`;
  } else if (sec === "veriler") {
    html = head("Verilerim") + grp(`<button type="button" class="srow red" data-wipe="takip"><span class="stx">Takip Listemi Temizle</span><span class="sv">${Object.keys(follows()).length}</span></button><button type="button" class="srow red" data-wipe="prefs"><span class="stx">İlgi Alanlarımı Sıfırla</span></button>`)
      + grp(`<button type="button" class="srow red" data-wipe="hepsi"><span class="stx">Her Şeyi Sıfırla</span></button>`, "Takiplerin, ilgi alanların ve ayarların yalnızca bu telefonda saklanır. Hesap yok, sunucu yok.") + "</div>";
  } else if (sec === "hakkinda") {
    html = head("Hakkında") + grp(`<div class="srow"><span class="stx">Sürüm</span><span class="sv">${esc(ver.slice(0, 7))}</span></div>` + row("#/bilgi/hakkinda", "", "Ne Var Ne Yok Hakkında") + row("#/bilgi/kaynaklar", "", "Veri Kaynakları"))
      + grp(row("#/bilgi/gizlilik", "", "Gizlilik") + row("#/bilgi/kosullar", "", "Kullanım Koşulları") + (window.NVNY_SITE?.instagram ? row(esc(window.NVNY_SITE.instagram), "", "Instagram", "", ' target="_blank" rel="noopener"') : "")) + "</div>";
  }
  V.innerHTML = html; // Ayarlar'da tanıtım ve alt bilgi yok (iPhone Ayarlar gibi sade)
  const set = (k, v) => store.set(k, v ? "1" : "0"), on = (id, f) => $(id)?.addEventListener("change", (ev) => { f(ev.target.checked); snd.sel?.(); });
  on("#s-ses", (v) => { set("nvny-ses", v); if (v) snd.on(); });
  on("#s-klv", (v) => { set("nvny-klavye", v); if (v) snd.key(); });
  on("#s-tit", (v) => { set("nvny-titre", v); haptic(12); });
  on("#s-noff", (v) => { const c = ncfg(); c.off = !v; store.set("nvny-ncfg", JSON.stringify(c)); NV.set("ncfg", c); $(".sgrp.nt")?.classList.toggle("dim", c.off); });
  $$("[data-nk]").forEach((x) => x.addEventListener("change", () => { const c = ncfg(); x.dataset.nk.split(",").forEach((k) => { c[k] = x.checked; }); store.set("nvny-ncfg", JSON.stringify(c)); NV.set("ncfg", c); }));
  on("#s-mes", (v) => set("nvny-mesafe", v));
  on("#s-gece", (v) => { set("nvny-gece", v); applyLook(); });
  on("#s-az", (v) => { set("nvny-az", v); applyLook(); });
  $$("[data-z]").forEach((b) => b.addEventListener("click", () => { store.set("nvny-yazi", b.dataset.z); $("#zseg").style.setProperty("--i", b.dataset.k); $$("[data-z]").forEach((x) => x.classList.toggle("on", x === b)); applyLook(); }));
  $("[data-notif]")?.addEventListener("click", async () => { await askNotif(city); viewAyarlar(city, sec); });
  $("[data-geo]")?.addEventListener("click", () => whereAmI(true).then(() => viewAyarlar(city, sec)).catch((err) => geoHelp(city, err?.code)));
  $("[data-prefs]")?.addEventListener("click", (ev) => { ev.preventDefault(); openPrefs(city, () => viewAyarlar(city, sec)); });
  $$("[data-wipe]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.wipe, q = { takip: "Takip ettiğin bütün etkinlik ve mekânlar silinsin mi?", prefs: "İlgi alanların sıfırlansın mı?", hepsi: "Takiplerin, ilgi alanların ve ayarların silinsin; uygulama ilk günkü gibi açılsın mı?" }[k];
    const sh = sheet(`<div class="pn cfm" role="dialog"><div class="bd2"><p class="cq">${q}</p><div class="cb"><button type="button" data-close>Vazgeç</button><button type="button" class="red" data-yes>Sil</button></div></div></div>`, "mn");
    sh.querySelector("[data-yes]").addEventListener("click", () => {
      if (k !== "prefs") { saveF({}); vsave({}); asave({}); fsave({}); }
      if (k !== "takip") { store.set("nvny-prefs", ""); NV.set("prefs", null); }
      if (k === "hepsi") { try { Object.keys(localStorage).filter((x) => x.startsWith("nvny-")).forEach((x) => localStorage.removeItem(x)); } catch {} NV.set("ncfg", null); NV.set("follows", {}); }
      sh.close(); haptic(10); toast("Temizlendi ✓", 2500); if (k === "hepsi") setTimeout(() => location.replace("#/"), 300); else viewAyarlar(city, sec);
    });
  }));
}

/* ---------- Yeni tarihlerini takip et (sanatçı/oyun), filmi takip et, seansı takip et (kullanıcı isteği, 15.11.2026 23:56) ----------
   Hepsi yalnızca bu telefonda. Yeni tarih 81 ilin dizininden (idx/a.json, share-pages.mjs) bulunur; film seansları ilin film dosyasından. */
const AKEY = "nvny-sanatci", FLKEY = "nvny-film";
const afol = () => { try { return JSON.parse(store.get(AKEY) || "{}") || {}; } catch { return {}; } };
const asave = (A) => { store.set(AKEY, JSON.stringify(A)); NV.set("arts", A); };
const ffol = () => { try { return JSON.parse(store.get(FLKEY) || "{}") || {}; } catch { return {}; } };
const fsave = (F) => { store.set(FLKEY, JSON.stringify(F)); NV.set("films", F); };
const aName = (e) => { if (e.cat === "sinema") return ""; const n = String(e.title || "").split(/\s[-|–:]\s/)[0].replace(/\([^)]*\)/g, "").replace(/\s+(konseri|konserleri)$/i, "").trim(); return NV.akey(n).length >= 3 ? n : ""; };
let aIdxP = null;
const aIdx = () => aIdxP ||= fetch("idx/a.json", { cache: "no-cache" }).then((r) => r.ok ? r.json() : {}).catch(() => { aIdxP = null; return {}; });
const CNAME = () => Object.fromEntries(CITIES.map((c) => [c.id, c.name]));
async function toggleArtist(e, city, btn) {
  const A = afol(), k = NV.akey(e.title), n = aName(e);
  if (A[k]) { delete A[k]; asave(A); btn.classList.remove("on"); btn.querySelector("small").textContent = "Yeni tarihlerini takip et · her ilde"; toast("Takipten çıkarıldı", 2500); return; }
  snd.ok(); haptic(8); A[k] = { name: n, at: Date.now() }; asave(A); btn.classList.add("on"); btn.querySelector("small").textContent = "Yeni tarihleri takipte ✓";
  const idx = await aIdx(), L = NV.ahits(k, idx).filter((x) => x[1] >= nowIST().d); A[k].seen = L.map((x) => x[0] + "/" + x[3]); asave(A); gcEv("sanatci-takip", "Sanatçı takip");
  toast(`🎤 <span><b>${esc(n)}</b><small>Şu an ${L.length} tarihi var. Herhangi bir ilde yeni tarih eklenince ilk sen duyacaksın.${notifOn() ? "" : " Bildirimleri açmayı unutma."}</small></span>`, 6000);
}
async function otherCities(e, city) {
  const box = $("#oth"); if (!box || e.cat === "sinema") return; const k = NV.akey(e.title); if (!k || k.length < 3) return;
  const idx = await aIdx(); if (!document.body.contains(box)) return;
  const t = nowIST().d, L = NV.ahits(k, idx).filter((x) => x[0] !== city && x[1] >= t);
  if (!L.length) return; const by = new Map(); for (const x of L.sort((p, q) => p[1].localeCompare(q[1]))) if (!by.has(x[0])) by.set(x[0], x);
  const N = CNAME(), R = [...by.values()].slice(0, 8);
  box.innerHTML = `<div class="oth"><h4>Başka şehirlerde de</h4>${R.map((x) => `<a href="#/${x[0]}/e/${encodeURIComponent(x[3])}"><b>${esc(N[x[0]] || x[0])}</b><span>${dShort(x[1])}${x[2] ? " · " + esc(x[2]) : ""}</span><small>${esc(x[4])}</small></a>`).join("")}${by.size > 8 ? `<p>+${by.size - 8} ilde daha</p>` : ""}</div>`;
}
function toggleFilm(f, city, btn) {
  const F = ffol();
  if (F[f.id]) { delete F[f.id]; fsave(F); btn.classList.remove("on"); btn.innerHTML = I.bell + "Filmi takip et"; toast("Takipten çıkarıldı", 2500); return; }
  const has = Object.keys(f.s || {}).some((d) => d >= nowIST().d && f.s[d]?.length);
  F[f.id] = { title: f.title, tk: NV.key(f.title), city, img: f.img, had: has, at: Date.now() }; fsave(F); snd.ok(); haptic(8);
  btn.classList.add("on"); btn.innerHTML = I.bellOn + "Film takipte"; gcEv("film-takip", "Film takip");
  toast(`🍿 <span><b>${esc(f.title)}</b><small>${has ? "Takiptesin. Bir seansı takip etmek için saatine dokun; seansından önce hatırlatalım." : "Seansları açılınca ilk sen duyacaksın."}</small></span>`, 6000);
}
const sid = (f, cid, d, t) => `seans|${f.id}|${cid}|${d}|${t}`;
function seansSheet(f, city, d, t, cid, cin, btn) {
  haptic(6); const id = sid(f, cid, d, t), on = !!follows()[id];
  const sh = sheet(`<div class="pn sns" role="dialog" aria-label="Seans"><div class="hd"><span class="rth"><b>${esc(t)}</b><small>${esc(dLong(d))}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2">
    <div class="sn1"><div class="sn-p"><img src="${esc(f.img)}" alt="" referrerpolicy="no-referrer"></div><div><b>${esc(f.title)}</b><small>${esc(cin.name)}</small>${cin.addr ? `<small>${esc(cin.addr)}</small>` : ""}</div></div>
    <div class="sn-b"><button type="button" class="${on ? "on" : ""}" data-fl>${on ? I.bellOn + "Seans takipte" : I.bell + "Bu seansı takip et"}</button><button type="button" data-cal>${I.cal}Takvime ekle</button></div>
    <a class="buy" href="${esc(f.url)}" target="_blank" rel="noopener" data-buy="sinemalar.com">Bilet al · sinemalar.com</a>
    <p class="shn">Takip edersen seans Planım'a girer; bir gün önce ve başlamadan önce hatırlatırız.</p></div></div>`, "mn");
  sh.querySelector("[data-fl]").addEventListener("click", (ev) => { const F = follows(), b = ev.currentTarget;
    if (F[id]) { delete F[id]; saveF(F); b.classList.remove("on"); b.innerHTML = I.bell + "Bu seansı takip et"; btn.classList.remove("on"); }
    else { F[id] = { kind: "seans", film: f.id, title: f.title, tk: NV.key(f.title), vk: NV.key(cin.name), venue: cin.name, d, t, city, img: f.img, cat: "sinema", slug: "", status: "", at: Date.now() }; saveF(F); snd.ok(); haptic(8);
      b.classList.add("on"); b.innerHTML = I.bellOn + "Seans takipte"; btn.classList.add("on"); toast(`🍿 Seans Planım'a eklendi. <a href="#/${city}/takip">Planım →</a>`, 4500); gcEv("seans-takip", "Seans takip"); }
    setTop(city); });
  sh.querySelector("[data-cal]").addEventListener("click", () => calAdd({ title: f.title, venue: cin.name, d, t, dur: f.dur ? f.dur + " dk" : "", cat: "sinema", slug: "", city }));
}
function followLists(city) {
  const A = Object.entries(afol()), F = Object.entries(ffol()), N = CNAME();
  return `${A.length ? `<h3 class="fl-h">Takip ettiğin sanatçı ve oyunlar</h3><div class="sgrp">${A.map(([k, a]) => `<div class="srow nr"><span class="sic">🎤</span><span class="stx">${esc(a.name)}<small>${(a.seen || []).length} yaklaşan tarih · ${[...new Set((a.seen || []).map((s) => N[s.split("/")[0]]).filter(Boolean))].slice(0, 3).join(", ") || "yeni tarih bekleniyor"}</small></span><button type="button" class="spill gh" data-ax="${esc(k)}">Bırak</button></div>`).join("")}</div>` : ""}
  ${F.length ? `<h3 class="fl-h">Takip ettiğin filmler</h3><div class="sgrp">${F.map(([id, f]) => `<a class="srow" href="#/${f.city}/film/${esc(id)}"><span class="sic">🍿</span><span class="stx">${esc(f.title)}<small>${f.had ? "Vizyonda · " + esc(N[f.city] || "") : "Seansları bekleniyor"}</small></span><button type="button" class="spill gh" data-fx="${esc(id)}" onclick="event.preventDefault()">Bırak</button></a>`).join("")}</div>` : ""}
  ${!A.length && !F.length ? `<p class="flh" style="margin-top:20px">Bir etkinliğin sayfasındaki <b>🎤 Yeni tarihlerini takip et</b> ya da bir filmin sayfasındaki <b>Filmi takip et</b> ile buraya ekleyebilirsin.</p>` : ""}`;
}
async function watchBoot(city) {
  const msgs = [], A = afol(), F = ffol(), cfg = ncfg();
  if (Object.keys(F).length && DATA.films?.films) { const r = NV.watchF(F, DATA.films.films, city, CITIES.find((c) => c.id === city)?.name || ""); fsave(r.films); msgs.push(...r.msgs); }
  if (Object.keys(A).length) { const idx = await aIdx(); if (Object.keys(idx).length) { const r = NV.watchA(A, idx, CNAME()); asave(r.arts); msgs.push(...r.msgs); } }
  msgs.filter((m) => NV.allow(m, cfg)).slice(0, 3).forEach((m, i) => { setTimeout(() => toast(`${I.bellOn}<span><b>${esc(m.title)}</b><small>${esc(m.body)}</small><a href="${esc(m.url.replace(/^\//, ""))}">Göster →</a></span>`, 9000), 1400 + i * 500);
    if (notifOn()) swUp().then(() => notify(m.title, m.body, m.url, m.tag)); });
}

/* ---------- Keşfet: harita ve takvim görünümü, hafta sonu kaçamağı (kullanıcı isteği, 15.11.2026 23:56) ---------- */
const VWI = { "": 0, harita: 1, takvim: 2 };
function calView(city, f, L0) {
  const { d: today } = nowIST(), L = f.t || f.gun ? applyF({ ...f, t: "", gun: "" }) : L0, cnt = {};
  for (const e of L) cnt[e.d] = (cnt[e.d] || 0) + 1;
  const dow = (pd(today).getDay() + 6) % 7, start = addD(today, -dow), max = Math.max(1, ...Object.values(cnt));
  const weeks = [...Array(6)].map((_, w) => [...Array(7)].map((_, i) => addD(start, w * 7 + i)));
  let lastM = -1;
  return `<div class="cal">${["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((x) => `<b class="cw">${x}</b>`).join("")}
    ${weeks.flat().map((d) => { const n = cnt[d] || 0, dt = pd(d), m = dt.getMonth(), past = d < today, newM = m !== lastM && dt.getDate() <= 7 ? (lastM = m, true) : (lastM = m, false);
      return `<button type="button" class="kc${past ? " ps" : ""}${d === today ? " td" : ""}${[0, 6].includes(dt.getDay()) ? " we" : ""}"${past || !n ? " disabled" : ` data-cday="${d}"`} style="--a:${n ? (.18 + .62 * n / max).toFixed(2) : 0}"><span class="kd">${dt.getDate()}${newM || d === start ? `<small>${AYK[m]}</small>` : ""}</span>${n ? `<i>${n}</i>` : ""}</button>`; }).join("")}</div>
    <p class="kmn">Bir güne dokun, o günün etkinlikleri açılsın. Renk koyulaştıkça o gün daha çok etkinlik var.</p>`;
}
function mapView(city, L) {
  const el = $("#kmap"); if (!el) return;
  const G = new Map(); let none = 0;
  for (const e of L) { const v = vOf(e.venue); if (!v?.lat) { none++; continue; } const k = v.lat.toFixed(5) + "," + v.lng.toFixed(5); (G.get(k) || G.set(k, { v, name: e.venue, L: [] }).get(k)).L.push(e); }
  $("#kmn").textContent = G.size ? `${G.size} mekânda ${L.length - none} etkinlik${none ? ` · ${none} etkinliğin mekân konumu henüz yok` : ""}` : "Bu seçimdeki mekânların konumları henüz toplanıyor.";
  leaflet().then(() => { if (!document.body.contains(el)) return; const Lf = window.L;
    const m = Lf.map(el, { zoomControl: false, attributionControl: true, tap: false });
    Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "dk", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    const pts = [];
    for (const g of G.values()) { const e0 = g.L.find((e) => e.img) || g.L[0]; pts.push([g.v.lat, g.v.lng]);
      const ic = Lf.divIcon({ className: "", html: `<div class="mp">${e0.img ? `<img src="${esc(e0.img)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc((CATS[e0.cat] || "•").slice(0, 1))}</span>`}${g.L.length > 1 ? `<b>${g.L.length}</b>` : ""}</div>`, iconSize: [46, 58], iconAnchor: [23, 58] });
      Lf.marker([g.v.lat, g.v.lng], { icon: ic }).addTo(m).on("click", () => { haptic(5);
        const sh = sheet(`<div class="pn" role="dialog" aria-label="${esc(g.name)}"><div class="hd"><span class="rth"><b>${esc(g.name)}</b><small>${g.L.length} etkinlik</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2"><div class="mpl">${uniq(g.L, 30, (e) => e.slug).map((e) => `<a href="#/${city}/e/${encodeURIComponent(e.slug)}"><span class="mpi">${poster(e, { badge: false })}</span><span><b>${esc(e.title)}</b><small>${rel(e.d)}${e.t ? " · " + esc(e.t) : ""}</small></span></a>`).join("")}</div></div></div>`, "mn"); }); }
    if (pts.length) m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); else { const c = cityCenter(city); m.setView(c || [39.93, 32.86], 11); }
    if (DATA.me && !DATA.me.c) Lf.marker(DATA.me.p, { icon: Lf.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(m);
  }).catch(() => { el.innerHTML = `<p class="kmn">Harita şu an açılamadı.</p>`; });
}
// 81 ilin merkezi (yaklaşık): hafta sonu kaçamağı için yakın iller
const ILLL = { adana: [37.00, 35.32], adiyaman: [37.76, 38.28], afyonkarahisar: [38.76, 30.54], agri: [39.72, 43.05], amasya: [40.65, 35.83], ankara: [39.93, 32.86], antalya: [36.89, 30.71], artvin: [41.18, 41.82], aydin: [37.85, 27.84], balikesir: [39.65, 27.88], bilecik: [40.14, 29.98], bingol: [38.88, 40.50], bitlis: [38.40, 42.11], bolu: [40.74, 31.61], burdur: [37.72, 30.29], bursa: [40.19, 29.06], canakkale: [40.15, 26.41], cankiri: [40.60, 33.62], corum: [40.55, 34.95], denizli: [37.78, 29.09], diyarbakir: [37.91, 40.24], edirne: [41.68, 26.56], elazig: [38.68, 39.22], erzincan: [39.75, 39.49], erzurum: [39.90, 41.27], eskisehir: [39.78, 30.52], gaziantep: [37.07, 37.38], giresun: [40.91, 38.39], gumushane: [40.46, 39.48], hakkari: [37.58, 43.74], hatay: [36.20, 36.16], isparta: [37.76, 30.55], mersin: [36.81, 34.64], istanbul: [41.01, 28.98], izmir: [38.42, 27.14], kars: [40.60, 43.10], kastamonu: [41.38, 33.78], kayseri: [38.73, 35.49], kirklareli: [41.73, 27.22], kirsehir: [39.15, 34.16], kocaeli: [40.77, 29.92], konya: [37.87, 32.48], kutahya: [39.42, 29.98], malatya: [38.35, 38.31], manisa: [38.61, 27.43], kahramanmaras: [37.58, 36.94], mardin: [37.31, 40.74], mugla: [37.22, 28.36], mus: [38.75, 41.51], nevsehir: [38.62, 34.71], nigde: [37.97, 34.68], ordu: [40.98, 37.88], rize: [41.02, 40.52], sakarya: [40.78, 30.40], samsun: [41.29, 36.33], siirt: [37.93, 41.94], sinop: [42.03, 35.15], sivas: [39.75, 37.02], tekirdag: [40.98, 27.51], tokat: [40.31, 36.55], trabzon: [41.00, 39.72], tunceli: [39.11, 39.55], sanliurfa: [37.16, 38.79], usak: [38.68, 29.41], van: [38.50, 43.38], yozgat: [39.82, 34.81], zonguldak: [41.45, 31.79], aksaray: [38.37, 34.03], bayburt: [40.26, 40.23], karaman: [37.18, 33.22], kirikkale: [39.85, 33.51], batman: [37.88, 41.13], sirnak: [37.52, 42.46], bartin: [41.63, 32.34], ardahan: [41.11, 42.70], igdir: [39.92, 44.04], yalova: [40.65, 29.27], karabuk: [41.20, 32.62], kilis: [36.72, 37.12], osmaniye: [37.07, 36.25], duzce: [40.84, 31.16] };
function slugList(list) { const { d: today, hm } = nowIST(), seen = new Map();
  return list.filter((e) => e.d >= today && !(e.d === today && e.t && e.t < hm && timeDiff(e.t, hm) > 120)).map((e) => { let s = slugOf(e); const n = (seen.get(s) || 0) + 1; seen.set(s, n); if (n > 1) s += "-" + n; return { t: "", status: "", ...e, slug: s, tickets: (e.tickets || []).map((x) => ({ ...x, price: null })) }; }); }
function kacamak(city) {
  const box = $("#kac"), me = ILLL[city]; if (!box || !me) return;
  const io = new IntersectionObserver(async (en) => { if (!en[0].isIntersecting) return; io.disconnect();
    const near = CITIES.filter((c) => c.id !== city && c.live && ILLL[c.id]).map((c) => ({ c, k: km(me, ILLL[c.id]) })).filter((x) => x.k <= 300).sort((a, b) => a.k - b.k).slice(0, 4);
    if (!near.length) return;
    const { d: today } = nowIST(), dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7), s0 = dow === 6 || dow === 0 ? today : fri, s1 = dow === 0 ? today : addD(fri, 2);
    const got = await Promise.all(near.map(({ c, k }) => jget(c.id === "ankara" ? "data/events.json" : `data/c/${c.id}.json`).then((j) => ({ c, k, L: slugList(j?.events || []).filter((e) => e.d >= s0 && e.d <= s1 && e.img && live(e)) })).catch(() => ({ c, k, L: [] }))));
    const pool = got.filter((g) => g.L.length).flatMap((g) => uniq(g.L.sort((a, b) => (b.tickets.length + (BIG.test(b.venue || "") ? 3 : 0)) - (a.tickets.length + (BIG.test(a.venue || "") ? 3 : 0))), 6).map((e) => ({ e, g })));
    if (pool.length < 3 || !document.body.contains(box)) return;
    const mix = []; for (let i = 0; mix.length < pool.length && i < 8; i++) for (const g of got) { const x = pool.filter((p) => p.g === g)[i]; if (x) mix.push(x); }
    const names = got.filter((g) => g.L.length).map((g) => `${g.c.name} ${Math.round(g.k / 10) * 10} km`).join(" · ");
    box.outerHTML = `<section class="rail"><div class="rh"><div><h3>Hafta sonu kaçamağı</h3><small>${esc(names)}</small></div></div><div class="rs">${mix.slice(0, 16).map(({ e, g }) => card({ ...e, venue: `${e.venue} · ${g.c.name}` }, g.c.id)).join("")}</div></section>`;
  }, { rootMargin: "400px" });
  io.observe(box);
}

/* ---------- Konuşur gibi arama (kullanıcı isteği, 15.11.2026 00:03): "cumartesi akşam ücretsiz konser", "yarın çocukla ne yapılır" ----------
   Tamamen telefonda: cümledeki gün, saat, kategori, fiyat, kimler için, semt ve "yakınımda" sözleri filtreye çevrilir; kalan sözcükler ad/mekân araması olur. */
const NLW = { pazar: 0, pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6 };
const NLC = [[/\b(cocuk tiyatro\w*|cocuk oyun\w*)\b/, "cocuk"], [/\b(konser\w*|muzik\w*|canli muzik)\b/, "konser"], [/\b(tiyatro\w*|oyun|oyunu|oyunlar\w*)\b/, "tiyatro"], [/\b(stand ?up\w*|standup\w*|komedi\w*|guldur\w*)\b/, "standup"], [/\b(opera\w*|bale\w*|dans\w*)\b/, "sahne"],
  [/\b(festival\w*|fest)\b/, "festival"], [/\b(parti\w*|dj|gece kulubu)\b/, "parti"], [/\b(atolye\w*|soylesi\w*|workshop|quiz\w*)\b/, "atolye"], [/\b(sinema\w*|film\w*)\b/, "sinema"]];
const NLSTOP = new Set("ne yapsak yapilir yapabilirim var mi neler nerede gidelim gidilir gitsek bir bi icin ile ve da de etkinlik etkinlikler etkinlikleri olan olacak bakalim goster bul istiyorum lazim acaba hangi".split(" "));
function nlParse(q0) {
  let q = " " + fold(q0) + " ", f = {}; const hit = (re) => { if (re.test(q)) { q = q.replace(re, " "); return true; } return false; };
  const { d: today } = nowIST(), dow = pd(today).getDay();
  if (hit(/\bbu ?aksam\b/)) { f.t = "bugun"; f.s = "aksam,gece"; }
  if (hit(/\bbu ?gece\b/)) { f.t = "bugun"; f.s = "gece"; }
  if (hit(/\b(bugun|bu gun)\b/)) f.t = "bugun";
  if (hit(/\byarin\w*\b/)) f.t = "yarin";
  if (hit(/\b(hafta ?sonu\w*|haftasonu\w*)\b/)) f.t = "haftasonu";
  if (hit(/\bbu hafta\w*\b/)) f.t = "hafta";
  if (hit(/\bbu ay\w*\b/)) f.t = "ay";
  for (const [w, n] of Object.entries(NLW)) if (hit(new RegExp("\\b" + w + "(ya|ye|a|e|ki|gunu|aksami|gecesi|sabahi)?\\b"))) { f.gun = addD(today, (n - dow + 7) % 7); delete f.t; }
  { const m = q.match(/\b(\d{1,2})\s*(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/); if (m) { const ay = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"].indexOf(m[2]); let y = +today.slice(0, 4); const ds = (yy) => `${yy}-${String(ay + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`; if (ds(y) < today) y++; f.gun = ds(y); delete f.t; q = q.replace(m[0], " "); } }
  const S = []; if (hit(/\bsabah\w*\b/)) S.push("sabah"); if (hit(/\b(ogle\w*|ogleden sonra|gunduz\w*)\b/)) S.push("ogle"); if (hit(/\baksam\w*\b/)) S.push("aksam"); if (hit(/\bgece\w*\b/)) S.push("gece"); if (S.length) f.s = [...new Set([...(f.s ? f.s.split(",") : []), ...S])].join(",");
  if (hit(/\b(cocuk\w*|aile\w*|minik\w*|bebek\w*)\b/)) f.c = "cocuk";
  if (hit(/\b(18 ?\+|yetiskin\w*)\b/)) f.c = "yetiskin";
  const K = []; for (const [re, c] of NLC) if (hit(re)) K.push(c); if (K.length) f.k = [...new Set(K)].join(",");
  if (hit(/\b(ucretsiz|bedava|free|parasiz)\b/)) f.ucr = 1;
  { const m = q.match(/\b(\d{2,5})\s*(tl|lira|₺)?\s*(alti|altinda|kadar|ya kadar|ye kadar|dan ucuz|den ucuz)\b/); if (m) { const v = +m[1], b = [250, 500, 750, 1000].find((x) => v <= x) || 1000; f.p = b; q = q.replace(m[0], " "); } }
  if (hit(/\b(ucuz\w*|uygun fiyat\w*|ekonomik)\b/)) f.p = f.p || 500;
  if (hit(/\b(yakin\w*|yakinimda|yakinda|etrafimda|civarda)\b/)) f.sira = "yakin";
  if (hit(/\b(yeni eklenen\w*|yeni)\b/)) f.yeni = 1;
  if (hit(/\b(fiyati dusen\w*|indirim\w*)\b/)) f.dus = 1;
  for (const [n] of ILCELER()) { const fn = fold(n); if (fn.length > 3 && q.includes(" " + fn)) { f.il = [...new Set([...(f.il ? f.il.split(",") : []), fn.replace(/\s+/g, "")])].join(","); q = q.replace(new RegExp("\\b" + fn + "\\w*\\b"), " "); } }
  const rest = q.split(/\s+/).filter((w) => w && !NLSTOP.has(w) && w.length > 1);
  const structured = Object.keys(f).length > 0; if (rest.length) f.q = rest.join(" ");
  return structured ? f : null;
}
function searchGo(city, raw, base = {}) {
  const f = raw ? nlParse(raw) : null;
  if (f) { haptic(5); location.hash = `#/${city}/kesfet?${toQ({ ...base, q: "", t: "", gun: "", ...f })}`; return; }
  location.hash = `#/${city}/kesfet?${toQ({ ...base, q: raw })}`;
}

/* ---------- Hava durumu (kullanıcı isteği, 15.11.2026: "Apple kalitesinde, altında bağlantı olmasın") ----------
   Open-Meteo (anahtarsız, ücretsiz; CC BY 4.0, kaynak Kaynaklar sayfasında). İstek yalnızca ilin/mekânın koordinatıyla yapılır, kişinin konumu gitmez. 16 gün. */
const WX = new Map();
const WMO = (c) => c === 0 ? ["☀️", "Açık"] : c <= 2 ? ["🌤️", "Parçalı bulutlu"] : c === 3 ? ["☁️", "Kapalı"] : c <= 48 ? ["🌫️", "Sisli"] : c <= 57 ? ["🌦️", "Çisenti"] : c <= 67 ? ["🌧️", "Yağmurlu"] : c <= 77 ? ["❄️", "Karlı"] : c <= 82 ? ["🌧️", "Sağanak"] : c <= 86 ? ["🌨️", "Kar sağanağı"] : ["⛈️", "Gök gürültülü"];
function wxOf(lat, lng) {
  const k = lat.toFixed(1) + "," + lng.toFixed(1); if (WX.has(k)) return WX.get(k);
  const p = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,weather_code,precipitation_probability&timezone=Europe%2FIstanbul&forecast_days=16`)
    .then((r) => r.ok ? r.json() : null).then((j) => { if (!j?.daily) return null; const D = {}; j.daily.time.forEach((d, i) => { D[d] = { c: j.daily.weather_code[i], hi: Math.round(j.daily.temperature_2m_max[i]), lo: Math.round(j.daily.temperature_2m_min[i]), pp: j.daily.precipitation_probability_max[i] }; });
      const H = {}; (j.hourly?.time || []).forEach((t, i) => { H[t] = { tp: Math.round(j.hourly.temperature_2m[i]), c: j.hourly.weather_code[i], pp: j.hourly.precipitation_probability[i] }; }); return { D, H }; }).catch(() => null);
  WX.set(k, p); return p;
}
async function wxCard(e, city, box) {
  const v = vOf(e.venue), ll = v?.lat ? [v.lat, v.lng] : ILLL[city]; if (!ll || !box) return;
  const w = await wxOf(ll[0], ll[1]); const d = w?.D[e.d]; if (!d || !document.body.contains(box)) return;
  const h = e.t ? w.H[`${e.d}T${e.t.slice(0, 2)}:00`] : null, [ic, tx] = WMO(h ? h.c : d.c), rain = (h ? h.pp : d.pp) || 0;
  box.innerHTML = `<div class="wxc"><small class="wx0">O GÜN HAVA · ${esc(dLong(e.d).toLocaleUpperCase("tr"))}</small><div class="wx1"><span class="wxi">${ic}</span><div><b>${h ? h.tp : d.hi}°</b><small>${esc(tx)}${e.t ? " · saat " + esc(e.t) : ""}</small></div></div><div class="wx2"><span>En yüksek <b>${d.hi}°</b></span><span>En düşük <b>${d.lo}°</b></span><span>Yağış <b>%${rain}</b></span></div>${rain >= 50 ? `<p>☂️ Şemsiyeni unutma.</p>` : d.hi <= 5 ? `<p>🧣 Sıkı giyin, hava soğuk.</p>` : ""}</div>`;
}


/* ---------- Güven: "Bir yanlış mı var?" ve çevrimdışı uyarısı ---------- */
const wrongMail = (e, city) => `mailto:${esc(window.NVNY_SITE?.contact || "")}?subject=${encodeURIComponent("Yanlış bilgi: " + e.title)}&body=${encodeURIComponent(`Etkinlik: ${e.title}\nTarih: ${dLong(e.d)} ${e.t || ""}\nMekân: ${e.venue || ""}\nİl: ${CITIES.find((c) => c.id === city)?.name || city}\nBağlantı: ${location.origin}/e/${city}/${e.slug}/\n\nNe yanlış? (ör. konum, saat, iptal oldu):\n`)}`;
function offlineBoot() {
  const bar = document.createElement("div"); bar.className = "offb"; bar.setAttribute("role", "status"); bar.innerHTML = "📡 Bağlantı yok · son bakılan bilgiler gösteriliyor"; document.body.append(bar);
  const set = () => { bar.classList.toggle("on", !navigator.onLine); if (navigator.onLine && bar.dataset.was === "1") { toast("Bağlantı geri geldi ✓", 2200); } bar.dataset.was = navigator.onLine ? "0" : "1"; };
  addEventListener("online", set); addEventListener("offline", set); set();
}

/* ---------- Yola çıkma vakti (kullanıcı isteği, 15.11.2026 00:03) ----------
   Takip ettiğin etkinlik bugünse: son bilinen konumundan mekâna kuş uçuşu uzaklıkla yaklaşık yol süresi (yürüme ya da araba) hesaplanır,
   başlamadan 10 dk önce orada olacak şekilde "çıkma saati" bulunur. Uygulama açıkken o saat gelince bildirim + kart. Konum telefonda kalır. */
const LOCK = "nvny-loc";
function locSave(p) { try { store.set(LOCK, JSON.stringify([+p[0].toFixed(3), +p[1].toFixed(3), Date.now()])); } catch {} }
function locGet() { if (DATA.me && !DATA.me.c) return DATA.me.p; try { const x = JSON.parse(store.get(LOCK) || "null"); if (x && Date.now() - x[2] < 8 * 36e5) return [x[0], x[1]]; } catch {} return null; }
function leavePlan(f, e) {
  const t = e?.t || f.t, d = e?.d || f.d; if (!t || d !== nowIST().d) return null;
  const v = f.kind === "seans" ? null : vOf(e?.venue || f.venue), me = locGet(); if (!v?.lat || !me) return null;
  const k = km(me, [v.lat, v.lng]), walk = k < 2.5, mins = walk ? walkMin(k) : carMin(k), [h, m] = t.split(":").map(Number), leave = h * 60 + m - mins - 10;
  return { k, walk, mins, leave, at: `${String(Math.floor(leave / 60)).padStart(2, "0")}:${String(((leave % 60) + 60) % 60).padStart(2, "0")}` };
}
let leaveT = null;
function leaveCheck() {
  clearTimeout(leaveT); const F = follows(), n = nowIST().hm.split(":").map(Number), now = n[0] * 60 + n[1]; let next = 1e9, changed = false;
  for (const [id, f] of Object.entries(F)) {
    if (f.g) continue; const e = f.city === DATA.city ? (DATA.bySlug.get(f.slug) || null) : null; const L = leavePlan(f, e); if (!L) continue;
    const start = L.leave + L.mins + 10;
    if (now >= L.leave - 10 && now < start) { f.g = 1; changed = true;
      const m = { tag: "g-" + id, title: `${L.walk ? "🚶" : "🚗"} Yola çıkma vakti!`, body: `${f.title} · ${f.venue} ${L.walk ? "yürüyerek" : "arabayla"} yaklaşık ${durTxt(L.mins)} uzakta. ${now <= L.leave ? L.at + "'da çıkarsan tam yetişirsin." : "Şimdi çıkarsan yetişirsin."}`, url: `/#/${f.city}/e/${encodeURIComponent(f.slug)}` };
      if (NV.allow(m, ncfg())) { toast(`${L.walk ? "🚶" : "🚗"} <span><b>${esc(m.title)}</b><small>${esc(m.body)}</small></span>`, 12000); if (notifOn()) swUp().then(() => notify(m.title, m.body, m.url, m.tag)); } }
    else if (now < L.leave - 10) next = Math.min(next, L.leave - 10 - now);
  }
  if (changed) saveF(F);
  if (next < 360) leaveT = setTimeout(leaveCheck, next * 60e3 + 2000);
}

/* ---------- Gittiklerim ve yıl özeti (kullanıcı isteği: "Spotify Wrapped / YouTube özeti gibi") ----------
   Takip ettiğin etkinliğin tarihi geçince Planım'da "Gittin mi?" sorulur; "Gittim" dediklerin bu telefonda anı olarak saklanır (nvny-gittim).
   #/<il>/yilim: yılın özeti, hikâye gibi kayan sayfalar; sonunda paylaşılabilir görsel. */
const GKEY = "nvny-gittim", GSKEY = "nvny-gitti-sor";
const gittim = () => { try { return JSON.parse(store.get(GKEY) || "[]") || []; } catch { return []; } };
const gsor = () => { try { return JSON.parse(store.get(GSKEY) || "[]") || []; } catch { return []; } };
function pastMove() { // tarihi geçen takipleri "Gittin mi?" listesine al
  const F = follows(), t = nowIST().d, S = gsor(); let ch = false;
  for (const [id, f] of Object.entries(F)) if (f.d < t) { if (f.status !== "iptal" && f.d >= addD(t, -10) && !S.some((x) => x.id === id)) S.push({ id, title: f.title, d: f.d, t: f.t || "", venue: f.venue || "", cat: f.cat || "", city: f.city || "", img: f.img || "", film: f.kind === "seans" }); delete F[id]; ch = true; }
  if (ch) { saveF(F); store.set(GSKEY, JSON.stringify(S.slice(-30))); }
}
function gittiAsk(city) {
  const S = gsor(); if (!S.length) return "";
  return `<section class="gas"><h3>Gittin mi? 🎟️</h3><p>Gittiklerin yıl sonunda özetinde çıkar.</p>${S.slice(-5).reverse().map((x) => `<div class="ga" data-gid="${esc(x.id)}"><span class="ga-p">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer">` : ""}</span><span class="ga-t"><b>${esc(x.title)}</b><small>${esc(dShort(x.d))} · ${esc(x.venue)}</small></span><span class="ga-b"><button type="button" data-go="1">Gittim 🎉</button><button type="button" data-go="0" aria-label="Gitmedim">Gitmedim</button></span></div>`).join("")}</section>`;
}
function gittiBind(city, after) {
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => { const row = b.closest("[data-gid]"), id = row.dataset.gid, S = gsor(), x = S.find((y) => y.id === id); store.set(GSKEY, JSON.stringify(S.filter((y) => y.id !== id)));
    if (b.dataset.go === "1" && x) { const G = gittim(); G.push({ title: x.title, d: x.d, t: x.t, venue: x.venue, cat: x.cat, city: x.city, img: x.img, film: x.film }); store.set(GKEY, JSON.stringify(G.slice(-500))); snd.ok(); haptic(10); toast("Anılarına eklendi 💜 Yıl özetinde göreceksin.", 3500); }
    else haptic(5); after(); }));
}
/* Yıl özeti zamanı (kullanıcı, 16.11.2026): Planım'da her zaman yeri var; 1 Aralık – 1 Ocak arasında ana sayfada da öne çıkar ("aa, özet çıkmış!").
   Aralıkta o yılın, ocakta bir önceki yılın özeti. */
const yilOf = () => { const d = nowIST().d, m = +d.slice(5, 7); return m === 1 ? +d.slice(0, 4) - 1 : +d.slice(0, 4); };
const yilWin = () => { const d = nowIST().d; return d.slice(5, 7) === "12" || d.slice(5) === "01-01"; };
function yilCard(city) {
  const y = String(yilOf()), G = gittim().filter((x) => x.d.startsWith(y)), win = yilWin();
  return `<a class="yil${win ? " dec" : ""}" href="#/${city}/yilim"><span class="yl-e">${I.gift || "🎁"}</span><span><b>${win ? `${y} özetin hazır` : `${y} özetin`}</b><small>${G.length ? `${G.length} etkinlik${win ? " · izle ve paylaş" : " · aralıkta tam özetin çıkacak"}` : "Gittiğin etkinlikler yıl sonunda özetine dönüşür"}</small></span><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`;
}
function yilHome(city) { // ana sayfadaki duyuru (yalnızca 1 Aralık – 1 Ocak)
  if (!yilWin()) return ""; const y = String(yilOf()), G = gittim().filter((x) => x.d.startsWith(y)); if (!G.length) return "";
  return `<a class="yhm" href="#/${city}/yilim"><span class="yhm-g"></span><span class="yhm-t"><small>NE VAR NE YOK</small><b>${y} ÖZETİN ÇIKTI</b><em>${G.length} etkinlik, en sevdiğin mekân, en çok ne izledin… Hadi bak!</em></span><span class="yhm-b">İzle</span></a>`;
}
function viewYil(city) {
  setTop(city); const y = String(yilOf()), G = gittim().filter((x) => x.d.startsWith(y)); document.title = `${y} özetin · Ne Var Ne Yok`;
  if (!G.length) { V.innerHTML = `<div class="kh"><h1>${y} özetin</h1></div><div class="empty">Henüz anın yok. Bir etkinliği takip et; tarihi geçince Planım'da “Gittin mi?” diye soracağız. “Gittim” dediklerin burada yıl özetine dönüşür 🎁<p style="margin-top:18px"><a class="more" style="display:inline-flex" href="#/${city}/kesfet">Etkinliklere göz at</a></p></div>${footer()}`; return; }
  const cnt = (f) => { const m = {}; for (const x of G) { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const cats = cnt((x) => x.film ? "sinema" : x.cat), vens = cnt((x) => x.venue), cits = cnt((x) => x.city), months = [...Array(12)].map((_, i) => G.filter((x) => +x.d.slice(5, 7) === i + 1).length), days = cnt((x) => GUN[pd(x.d).getDay()]);
  const topC = cats[0], topV = vens[0], N = CNAME(), maxM = Math.max(1, ...months), bestM = months.indexOf(Math.max(...months));
  const EM = { konser: "🎸", tiyatro: "🎭", standup: "🎤", sahne: "🩰", cocuk: "🎈", festival: "🎪", parti: "🪩", atolye: "🎨", sinema: "🍿" };
  const S = [
    `<div class="ys" style="--g1:#6d28d9;--g2:#0a0a10"><small>NE VAR NE YOK</small><h2>${y}<br>ÖZETİN</h2><p>Bu yıl neredeydin, neler izledin? Hadi bakalım 💜</p></div>`,
    `<div class="ys" style="--g1:#db2777;--g2:#3b0764"><small>BU YIL</small><h2 class="big">${G.length}</h2><h2>ETKİNLİĞE GİTTİN</h2><div class="ym">${months.map((n, i) => `<i style="--h:${(n / maxM * 100).toFixed(0)}%"><b></b><span>${AYK[i][0]}</span></i>`).join("")}</div><p>En hareketli ayın <b>${AY[bestM]}</b> oldu.</p></div>`,
    topC ? `<div class="ys" style="--g1:#f59e0b;--g2:#7c2d12"><small>EN ÇOK</small><div class="ye">${EM[topC[0]] || "✨"}</div><h2>${esc((CATS[topC[0]] || topC[0]).toLocaleUpperCase("tr"))}</h2><p>${topC[1]} kez · gittiklerinin %${Math.round(topC[1] / G.length * 100)}'i${cats[1] ? `<br>Ardından ${esc(CATS[cats[1][0]] || cats[1][0])} (${cats[1][1]})` : ""}</p></div>` : "",
    topV ? `<div class="ys" style="--g1:#0ea5e9;--g2:#1e1b4b"><small>EN SEVDİĞİN MEKÂN</small><div class="ye">📍</div><h2 class="mid">${esc(topV[0].toLocaleUpperCase("tr"))}</h2><p>${topV[1]} kez oradaydın.${vens.length > 1 ? `<br>Toplam ${vens.length} farklı mekân.` : ""}</p></div>` : "",
    `<div class="ys" style="--g1:#22c55e;--g2:#052e16"><small>${cits.length > 1 ? "YOLLARDAYDIN" : "EN SEVDİĞİN GÜN"}</small><div class="ye">${cits.length > 1 ? "🗺️" : "📅"}</div><h2>${cits.length > 1 ? `${cits.length} ŞEHİR` : esc((days[0]?.[0] || "").toLocaleUpperCase("tr"))}</h2><p>${cits.length > 1 ? cits.slice(0, 4).map(([c, n]) => `${esc(N[c] || c)} ${n}`).join(" · ") : `Etkinliklerinin ${days[0]?.[1] || 0} tanesi ${esc(days[0]?.[0] || "")} günüydü.`}</p></div>`,
    `<div class="ys yf" style="--g1:#8b5cf6;--g2:#0a0a10"><small>${y} · NE VAR NE YOK</small><div class="yp">${G.filter((x) => x.img).slice(-9).map((x) => `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer">`).join("")}</div><h2>${G.length} ETKİNLİK<br>${vens.length} MEKÂN${cits.length > 1 ? `<br>${cits.length} ŞEHİR` : ""}</h2><button type="button" class="yshare" id="ysh">Hikâyende paylaş</button></div>`].filter(Boolean);
  // tam ekran: sayfa geçiş canlandırması (transform) "fixed"i bozmasın diye doğrudan body'ye eklenir; başka sayfaya geçince kalkar
  $$(".yw").forEach((x) => x.remove()); V.innerHTML = ""; const W0 = document.createElement("div"); W0.className = "yw"; W0.id = "yw";
  W0.innerHTML = `<div class="ybar">${S.map(() => `<i><b></b></i>`).join("")}</div><button type="button" class="yx" aria-label="Kapat">✕</button>${S.map((s, i) => `<section class="ysl${i ? "" : " on"}">${s}</section>`).join("")}`;
  document.body.append(W0); addEventListener("hashchange", () => { clearTimeout(tm); W0.remove(); }, { once: true });
  let i = 0, tm = null; const sl = $$(".ysl", W0), bars = $$(".ybar i", W0);
  const show = (k) => { i = Math.max(0, Math.min(S.length - 1, k)); sl.forEach((x, j) => x.classList.toggle("on", j === i)); bars.forEach((b, j) => { b.className = j < i ? "d" : j === i ? "a" : ""; }); clearTimeout(tm); if (i < S.length - 1) tm = setTimeout(() => show(i + 1), 5200); haptic(4); };
  $("#yw").addEventListener("click", (ev) => { if (ev.target.closest(".yx")) { clearTimeout(tm); history.length > 1 ? history.back() : location.assign(`#/${city}/takip`); return; } if (ev.target.closest("#ysh")) return; show(ev.clientX < innerWidth * .3 ? i - 1 : i + 1); });
  $("#ysh").addEventListener("click", () => yilShare(y, G, cats, vens, cits));
  requestAnimationFrame(() => show(0));
}
async function yilShare(y, G, cats, vens, cits) {
  haptic(6); const W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#6d28d9"); g.addColorStop(1, "#0a0a10"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  await paylasJS(); await document.fonts.ready;
  const ims = (await Promise.all(G.filter((x) => x.img).slice(-6).map((x) => NVS.img(x.img, true).catch(() => null)))).filter(Boolean);
  const pw = 300, ph = 430; ims.forEach((im, k) => { const x = 60 + (k % 3) * (pw + 30), yy = 300 + Math.floor(k / 3) * (ph + 30); c.save(); c.beginPath(); c.roundRect ? c.roundRect(x, yy, pw, ph, 24) : c.rect(x, yy, pw, ph); c.clip(); const r = Math.max(pw / im.width, ph / im.height); c.drawImage(im, x + (pw - im.width * r) / 2, yy + (ph - im.height * r) / 2, im.width * r, im.height * r); c.restore(); });
  c.fillStyle = "#fff"; c.textAlign = "center"; c.font = '900 120px "Archivo", sans-serif'; try { c.fontStretch = "condensed"; } catch {}
  let ty = ims.length ? 300 + Math.ceil(ims.length / 3) * (ph + 30) + 90 : 760; c.fillText(`${y} ÖZETİM`, W / 2, ty); ty += 120;
  c.font = '800 54px "Inter Tight", sans-serif'; c.fillText(`${G.length} etkinlik · ${vens.length} mekân${cits.length > 1 ? " · " + cits.length + " şehir" : ""}`, W / 2, ty); ty += 76;
  if (cats[0]) { c.fillStyle = "#e9e3ff"; c.font = '600 44px "Inter Tight", sans-serif'; c.fillText(`En çok: ${CATS[cats[0][0]] || cats[0][0]}`, W / 2, ty); ty += 62; }
  if (vens[0]) { c.fillStyle = "#e9e3ff"; c.fillText(`En sevdiğim mekân: ${vens[0][0]}`.slice(0, 48), W / 2, ty); }
  try { const lg = await NVS.img("brand/logo-cam.png"); const lw = 260; c.drawImage(lg, (W - lw) / 2, 120, lw, lw * lg.height / lg.width); } catch {}
  c.fillStyle = "rgba(255,255,255,.95)"; c.font = '800 34px "Inter Tight", sans-serif'; c.fillText("nevarneyok.net.tr", W / 2, H - 300);
  cv.toBlob(async (b) => { const file = new File([b], `nevarneyok-${y}-ozetim.jpg`, { type: "image/jpeg" });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); gcEv("yil-paylas", "Yıl özeti paylaşıldı"); return; } } catch (err) { if (err?.name === "AbortError") return; }
    const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = file.name; document.body.append(l); l.click(); l.remove(); toast("Görsel kaydedildi 📸", 3000); }, "image/jpeg", .9);
}

/* ---------- Yumuşak açılış (uygulama olarak açılınca): telefonun açılış ekranıyla aynı ışıklı büyüteç, sayfa hazır olunca süzülerek kaybolur ---------- */
function splashOut() { const s = $("#spl"); if (!s) return; requestAnimationFrame(() => requestAnimationFrame(() => { s.classList.add("out"); setTimeout(() => s.remove(), 700); })); }

/* ---------- iPhone gibi gezinme (kullanıcı isteği, 16.11.2026 01:37: "iPhone gibi geri tuşu; sayfa geçişleri daha güzel, akıcı; her harekete Apple gibi ses ve titreşim") ----------
   - Bir sayfanın içine girince üst çubukta logonun yerine "‹ Bugün / ‹ Keşfet / ‹ Planım…" (nereden geldiysen); ana sekmelerde logo.
   - Telefonda ekranın sol kenarından sağa çekince sayfa parmağı izleyerek geri gider (iOS kenar kaydırması).
   - İleri: yeni sayfa sağdan gelir; geri: önceki sayfa soldan hafifçe gelir (iOS'taki derinlik); sekmeler arası anında. */
const NAVS = [];
const TABN = { "": "Bugün", kesfet: "Keşfet", sinema: "Sinema", takip: "Planım", ayarlar: "Ayarlar", yilim: "Özetin" };
function labelOf(hh) {
  const P2 = (hh || "").replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
  if (!P2.length) return "İller"; if (P2[0] === "bilgi") return "Bilgi";
  if (P2[1] === "e") { const e = DATA.bySlug?.get(decodeURIComponent(P2.slice(2).join("/"))); return e ? e.title : "Etkinlik"; }
  if (P2[1] === "film") { const f = DATA.films?.films?.find((x) => String(x.id) === P2[2]); return f ? f.title : "Film"; }
  if (P2[1] === "ayarlar" && P2[2]) return SECT[P2[2]] || "Ayarlar";
  if (P2[1] === "kesfet" && hh.includes("?")) return "Keşfet";
  return TABN[P2[1] || ""] || "Geri";
}
let navDir = "";
function navTrack(prev, next, isRoot) {
  const top = NAVS[NAVS.length - 1];
  if (top && top.h === next) { NAVS.pop(); navDir = "back"; if (isRoot) NAVS.length = 0; }
  else if (isRoot) { NAVS.length = 0; navDir = "tab"; }
  else if (prev && prev !== next) { NAVS.push({ h: prev, l: labelOf(prev) }); navDir = "push"; if (NAVS.length > 30) NAVS.shift(); }
  else navDir = "";
  const tb = $("#tback"), t = NAVS[NAVS.length - 1];
  if (!tb) return;
  TOP.classList.toggle("bk", !!t);
  if (t) { const l = t.l.length > 16 ? t.l.slice(0, 15).trim() + "…" : t.l; tb.querySelector("span").textContent = l; tb.setAttribute("aria-label", "Geri: " + t.l); }
}
function goBack() { const t = NAVS[NAVS.length - 1]; snd.back?.(); haptic(5); if (t && history.length > 1) history.back(); else if (t) location.hash = t.h; }
// sol kenardan kaydırarak geri (yalnızca dokunmatik, yalnızca iç sayfalarda)
(() => {
  let sx = 0, sy = 0, dx = 0, on = false, t0 = 0;
  addEventListener("touchstart", (ev) => { const p = ev.touches[0]; if (ev.touches.length !== 1 || p.clientX > 22 || !NAVS.length || $(".sh, .pk, .yw")) return; on = true; sx = p.clientX; sy = p.clientY; dx = 0; t0 = performance.now(); }, { passive: true });
  addEventListener("touchmove", (ev) => { if (!on) return; const p = ev.touches[0]; dx = Math.max(0, p.clientX - sx); if (dx < 8 && Math.abs(p.clientY - sy) > 12) { on = false; return; }
    V.style.transition = "none"; V.style.transform = `translate3d(${dx}px,0,0)`; V.style.opacity = String(1 - Math.min(.35, dx / innerWidth * .5)); }, { passive: true });
  addEventListener("touchend", () => { if (!on) return; on = false; const v = dx / Math.max(1, performance.now() - t0);
    const done = dx > innerWidth * .33 || v > .5;
    V.style.transition = "transform .28s cubic-bezier(.32,.72,0,1), opacity .28s"; V.style.transform = done ? `translate3d(${innerWidth}px,0,0)` : ""; V.style.opacity = done ? "0" : "";
    setTimeout(() => { if (done) { V.dataset.sw = "1"; goBack(); } V.style.transition = ""; V.style.transform = ""; V.style.opacity = ""; }, done ? 220 : 300); }, { passive: true });
})();
/* Sesler: Apple'daki gibi çok kısık, kısa; her hareketin bir karşılığı var (ayarlardan kapanır) */
Object.assign(snd, {
  push() { blip({ f: 1800, f2: 1400, body: 640, vol: .032, dur: .012, noise: .5, hp: 2600 }); },
  back() { blip({ f: 1400, f2: 1150, body: 520, vol: .03, dur: .012, noise: .5, hp: 2200 }); },
  sheet() { blip({ f: 760, f2: 620, body: 300, vol: .045, dur: .03, noise: .25, hp: 900 }); buzz(4); },
  close() { blip({ f: 620, f2: 520, body: 0, vol: .03, dur: .02, noise: .2, hp: 900 }); },
  pop() { blip({ f: 980, f2: 1240, body: 420, vol: .06, dur: .035, noise: .15, hp: 1200 }); },
  tab() { blip({ f: 2300, f2: 1900, body: 0, vol: .04, dur: .009, noise: .45, hp: 3200 }); buzz(3); },
});

/* Film için basılı tutunca önizleme */
function filmPeek(f, city, from) {
  const today = nowIST().d, n = (f.s?.[today] || []).length, href = `#/${city}/film/${f.id}`, on = !!ffol()[f.id];
  const o = document.createElement("div"); o.className = "pk"; o.setAttribute("role", "dialog");
  o.innerHTML = `<div class="pk-c"><a class="pk-p" href="${href}"><div class="ph ok"><img class="p" src="${esc(f.img || "")}" alt="" referrerpolicy="no-referrer"></div></a>
    <div class="pk-i"><small>Sinema${filmGenre(f) ? " · " + esc(filmGenre(f)) : ""}</small><b>${esc(f.title)}</b><span>${n ? `Bugün ${n} salonda` : "Bugün seansı yok"}${f.dur ? " · " + f.dur + " dk" : ""}</span></div>
    <div class="pk-m"><a href="${href}" data-pk="open">${I.info}<span>Seanslar</span></a><button type="button" data-pk="ffl">${on ? I.bellOn : I.bell}<span>${on ? "Film takipte" : "Filmi takip et"}</span></button></div></div>`;
  document.body.append(o); document.body.style.overflow = "hidden"; snd.pop();
  const r = from.getBoundingClientRect(), c = $(".pk-c", o), cr = c.getBoundingClientRect(); c.style.transformOrigin = `${r.left + r.width / 2 - cr.left}px ${r.top + r.height / 2 - cr.top}px`;
  requestAnimationFrame(() => o.classList.add("on"));
  const close = () => { o.classList.remove("on"); document.body.style.overflow = ""; snd.close(); setTimeout(() => o.remove(), 280); };
  o.addEventListener("click", (ev) => { if (ev.target === o) return close(); const b = ev.target.closest("[data-pk]"); if (!b) return; if (b.dataset.pk === "ffl") { const F = ffol(); if (F[f.id]) delete F[f.id]; else { F[f.id] = { title: f.title, tk: NV.key(f.title), city, img: f.img, had: !!n, at: Date.now() }; snd.ok(); } fsave(F); } close(); });
  addEventListener("hashchange", close, { once: true });
}

/* Filmin türü: sinemalar.com satırına yıl eklenince ülke ve tür bir kaymıştı (16.11.2026); eski kayıtlarda tür yok, ülke "genre"de */
const filmGenre = (f) => (/^\d{4}$/.test(String(f.country || "")) ? "" : f.genre) || "";
const filmCountry = (f) => (/^\d{4}$/.test(String(f.country || "")) ? f.genre : f.country) || "";
/* Alttan açılan panel aşağı çekilince kapanır (iOS sayfası gibi): tutamaçtan ya da panelin üst kısmından, panel en üstteyken */
function sheetDrag(sh) {
  const pn = sh.querySelector(".pn"); if (!pn) return; let y0 = 0, dy = 0, on = false, t0 = 0;
  pn.addEventListener("touchstart", (ev) => { const bd = pn.querySelector(".bd2"); if (bd && bd.scrollTop > 0 && !ev.target.closest(".hd")) return; on = true; y0 = ev.touches[0].clientY; dy = 0; t0 = performance.now(); }, { passive: true });
  pn.addEventListener("touchmove", (ev) => { if (!on) return; dy = Math.max(0, ev.touches[0].clientY - y0); if (dy > 4) { pn.style.transition = "none"; pn.style.transform = `translate3d(0,${dy}px,0)`; } }, { passive: true });
  pn.addEventListener("touchend", () => { if (!on) return; on = false; const v = dy / Math.max(1, performance.now() - t0); pn.style.transition = "transform .32s cubic-bezier(.32,.72,0,1)";
    if (dy > 120 || v > .6) { pn.style.transform = "translate3d(0,100%,0)"; haptic(5); setTimeout(() => sh.close(), 120); } else pn.style.transform = ""; }, { passive: true });
}

/* ---------- Hava durumu, Apple Hava gibi (kullanıcı isteği, 16.11.2026 01:28–01:37) ----------
   Bugün kartında günler yana kayar; dokununca hava paneli: büyük sıcaklık, bugünden sonraki günlere kesintisiz saatlik akış + sıcaklık eğrisi,
   16 günlük tahmin (en yüksek/en düşük iki eğri), hissedilen, rüzgâr, UV, gün doğumu/batımı, nem, görüş, basınç, ay evresi.
   Veri Open-Meteo (anahtarsız; yalnızca ilin koordinatı gider). Simgeler kendi çizimimiz (SVG). */
const WXF = new Map();
function wxFull(lat, lng) {
  const k = lat.toFixed(2) + "," + lng.toFixed(2); if (WXF.has(k)) return WXF.get(k);
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&timezone=Europe%2FIstanbul&forecast_days=16`
    + "&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,is_day"
    + "&hourly=temperature_2m,weather_code,precipitation_probability,is_day,visibility,uv_index"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max";
  const p = fetch(u).then((r) => r.ok ? r.json() : null).catch(() => null); WXF.set(k, p); p.then((j) => { if (!j) WXF.delete(k); }); return p;
}
// Apple tarzı renkli hava simgeleri
function wIcon(c, day = 1, s = 28) {
  const sun = `<circle cx="12" cy="12" r="4.6" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="1.8" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = a * Math.PI / 180; return `<line x1="${12 + Math.cos(r) * 7.4}" y1="${12 + Math.sin(r) * 7.4}" x2="${12 + Math.cos(r) * 9.6}" y2="${12 + Math.sin(r) * 9.6}"/>`; }).join("")}</g>`;
  const moon = `<path d="M15.5 4.5a7.5 7.5 0 1 0 4 12.6A6.2 6.2 0 0 1 15.5 4.5z" fill="#e5e5ea"/>`;
  const cloud = (y = 0, o = 1, x = 0) => `<path transform="translate(${x} ${y})" d="M7 19h10.5a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 19z" fill="#fff" opacity="${o}"/>`;
  const drops = (col = "#64d2ff") => `<g stroke="${col}" stroke-width="1.7" stroke-linecap="round"><line x1="9" y1="20.5" x2="8" y2="23"/><line x1="13" y1="20.5" x2="12" y2="23"/><line x1="17" y1="20.5" x2="16" y2="23"/></g>`;
  const snow = `<g fill="#fff"><circle cx="8.5" cy="21.6" r="1.1"/><circle cx="12.5" cy="22.4" r="1.1"/><circle cx="16.5" cy="21.6" r="1.1"/></g>`;
  let g;
  if (c === 0) g = day ? sun : moon;
  else if (c <= 2) g = `<g transform="translate(-3 -4) scale(.82)">${day ? sun : moon}</g>${cloud(1.5, 1, 1.5)}`;
  else if (c === 3) g = `${cloud(-3, .55, -3)}${cloud(1)}`;
  else if (c <= 48) g = `${cloud(-2)}<g stroke="#d1d1d6" stroke-width="1.6" stroke-linecap="round"><line x1="5" y1="21" x2="19" y2="21"/><line x1="7" y1="23.4" x2="17" y2="23.4"/></g>`;
  else if (c <= 67 || (c >= 80 && c <= 82)) g = `${cloud(-3)}${drops()}`;
  else if (c <= 77 || c === 85 || c === 86) g = `${cloud(-3)}${snow}`;
  else g = `${cloud(-3)}<path d="M13 16.5l-3 4h3l-1.5 3.8" fill="none" stroke="#ffd60a" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<svg class="wic" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${g}</svg>`;
}
const WTX = (c) => WMO(c)[1];
const hm2 = (iso) => iso.slice(11, 16);
function wxBg(c, day) { return !day ? "linear-gradient(180deg,#0b1026,#1c2340 60%,#262c4a)" : c <= 1 ? "linear-gradient(180deg,#2f6fd6,#5b9cf0 60%,#8bbcf5)" : c <= 3 ? "linear-gradient(180deg,#4b5d78,#6f819b 60%,#8e9db3)" : "linear-gradient(180deg,#38465c,#4f5d73 60%,#66738a)"; }
function moonPhase(d = new Date()) { const L = 29.530588853, ph = ((((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % L) + L) % L / L;
  const name = ph < .03 || ph > .97 ? "Yeni ay" : ph < .22 ? "Hilal (büyüyen)" : ph < .28 ? "İlk dördün" : ph < .47 ? "Şişkin ay (büyüyen)" : ph < .53 ? "Dolunay" : ph < .72 ? "Şişkin ay (küçülen)" : ph < .78 ? "Son dördün" : "Hilal (küçülen)";
  const toFull = Math.round(((.5 - ph + 1) % 1) * 29.53); return { ph, name, toFull }; }
function moonSvg(ph) { const r = 28, c = 30, k = Math.cos(2 * Math.PI * ph), rx = Math.abs(k) * r, wax = ph < .5;
  const d = wax ? `M${c},${c - r} A${r},${r} 0 0 1 ${c},${c + r} A${rx},${r} 0 0 ${k > 0 ? 0 : 1} ${c},${c - r}Z` : `M${c},${c - r} A${r},${r} 0 0 0 ${c},${c + r} A${rx},${r} 0 0 ${k > 0 ? 1 : 0} ${c},${c - r}Z`;
  return `<svg class="moon" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="rgba(255,255,255,.12)"/><path d="${d}" fill="#f2f2f7"/></svg>`; }
function smoothPath(pts) { if (pts.length < 2) return ""; let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; } return d; }

async function wxSheet(city) {
  const ll = ILLL[city]; if (!ll) return; const cname = CITIES.find((c) => c.id === city)?.name || "";
  const sh = sheet(`<div class="pn wxp" role="dialog" aria-label="Hava durumu"><div class="hd"><span></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2" id="wxb2"><div class="sk" style="height:60vh;border-radius:20px"></div></div></div>`, "mn wxs");
  const j = await wxFull(ll[0], ll[1]); const box = sh.querySelector("#wxb2"); if (!box) return;
  if (!j?.current) { box.innerHTML = `<p class="kmn">Hava durumu şu an alınamadı.</p>`; return; }
  const C = j.current, D = j.daily, H = j.hourly, nowI = Math.max(0, H.time.findIndex((t) => t >= C.time.slice(0, 13)));
  sh.querySelector(".pn").style.background = wxBg(C.weather_code, C.is_day);
  // saatlik akış: şimdiden itibaren 72 saat, günler arası kesintisiz; gün doğumu/batımı araya girer
  const W = 62, items = [];
  for (let i = nowI; i < Math.min(H.time.length, nowI + 72); i++) {
    const t = H.time[i], d = t.slice(0, 10), di = D.time.indexOf(d);
    if (i > nowI && t.endsWith("T00:00")) items.push({ sep: GUN[pd(d).getDay()] });
    items.push({ t: i === nowI ? "Şimdi" : hm2(t), c: H.weather_code[i], day: H.is_day[i], tp: Math.round(H.temperature_2m[i]), pp: H.precipitation_probability[i] });
    for (const [k, lbl] of [["sunrise", "Gün doğumu"], ["sunset", "Gün batımı"]]) { const s = D[k]?.[di]; if (s && s > t && s < (H.time[i + 1] || "z")) items.push({ sun: k, t: hm2(s), lbl }); }
  }
  const temps = items.filter((x) => x.tp != null).map((x) => x.tp), mx = Math.max(...temps), mn = Math.min(...temps);
  let x = 0; const pts = []; const cols = items.map((it) => { const w = it.sep ? 34 : W, cx = x + w / 2; x += w; if (it.tp != null) pts.push([cx, 10 + (1 - (it.tp - mn) / Math.max(1, mx - mn)) * 40]); return { it, w }; });
  const totalW = x;
  const hourly = `<div class="wxh"><div class="wxhs" style="width:${totalW}px"><svg class="wxcurve" width="${totalW}" height="60" viewBox="0 0 ${totalW} 60"><defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffd60a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd60a" stop-opacity="0"/></linearGradient></defs><path d="${smoothPath(pts)} L${pts[pts.length - 1][0]},60 L${pts[0][0]},60 Z" fill="url(#wg)"/><path d="${smoothPath(pts)}" fill="none" stroke="#ffd60a" stroke-width="2.4" stroke-linecap="round"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" fill="#fff"/></svg>
    <div class="wxrow">${cols.map(({ it, w }) => it.sep ? `<div class="wsep" style="width:${w}px"><span>${esc(it.sep)}</span></div>` : it.sun ? `<div class="wc" style="width:${w}px"><small>${it.t}</small>${it.sun === "sunrise" ? `<svg class="wic" viewBox="0 0 24 24" width="28" height="28"><path d="M4 18h16" stroke="#ffd60a" stroke-width="1.8" stroke-linecap="round"/><path d="M7 18a5 5 0 0 1 10 0" fill="#ffd60a"/><path d="M12 6v4M9.5 8.5 12 6l2.5 2.5" stroke="#ffd60a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>` : `<svg class="wic" viewBox="0 0 24 24" width="28" height="28"><path d="M4 18h16" stroke="#ff9f0a" stroke-width="1.8" stroke-linecap="round"/><path d="M7 18a5 5 0 0 1 10 0" fill="#ff9f0a"/><path d="M12 6v4M9.5 7.5 12 10l2.5-2.5" stroke="#ff9f0a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`}<b class="sm">${it.lbl}</b></div>`
      : `<div class="wc" style="width:${w}px"><small>${it.t}</small>${wIcon(it.c, it.day)}${it.pp >= 30 ? `<i>%${it.pp}</i>` : "<i></i>"}<b>${it.tp}°</b></div>`).join("")}</div></div></div>`;
  // 16 gün: iki eğri (en yüksek sarı, en düşük mavi), dokununca o günün etkinlikleri
  const DW = 74, hi = D.temperature_2m_max.map(Math.round), lo = D.temperature_2m_min.map(Math.round), gmax = Math.max(...hi), gmin = Math.min(...lo), yy = (v) => 14 + (1 - (v - gmin) / Math.max(1, gmax - gmin)) * 70;
  const hp = hi.map((v, i) => [i * DW + DW / 2, yy(v)]), lp = lo.map((v, i) => [i * DW + DW / 2, yy(v)]), today = nowIST().d;
  const cnt = {}; for (const e of DATA.events || []) if (live(e)) cnt[e.d] = (cnt[e.d] || 0) + 1;
  const daily = `<div class="wxh"><div class="wxds" style="width:${D.time.length * DW}px">${D.time.map((d, i) => `<a class="wd" href="#/${city}/kesfet?gun=${d}" style="width:${DW}px"><small>${d === today ? "Bugün" : GUNK[pd(d).getDay()]}</small><small class="dt2">${d.slice(8, 10)}.${d.slice(5, 7)}</small>${wIcon(D.weather_code[i], 1)}<i>${D.precipitation_probability_max[i] >= 30 ? "%" + D.precipitation_probability_max[i] : ""}</i><b>${hi[i]}°</b></a>`).join("")}
    <svg class="wxcurve2" width="${D.time.length * DW}" height="100" viewBox="0 0 ${D.time.length * DW} 100"><path d="${smoothPath(hp)}" fill="none" stroke="#ffd60a" stroke-width="2.4"/><path d="${smoothPath(lp)}" fill="none" stroke="#64d2ff" stroke-width="2.4"/>${hp.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.2" fill="#ffd60a"/>`).join("")}${lp.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.2" fill="#64d2ff"/>`).join("")}</svg>
    <div class="wxlo">${D.time.map((d, i) => `<span style="width:${DW}px">${lo[i]}°${cnt[d] ? `<em>${cnt[d]} etkinlik</em>` : ""}</span>`).join("")}</div></div></div>`;
  // ayrıntı kutucukları
  const di0 = D.time.indexOf(today), sr = D.sunrise[di0], ss = D.sunset[di0], toM = (s) => +s.slice(11, 13) * 60 + +s.slice(14, 16), nm = toM(C.time), frac = Math.max(0, Math.min(1, (nm - toM(sr)) / (toM(ss) - toM(sr))));
  const uv = Math.round(H.uv_index?.[nowI] ?? D.uv_index_max[di0] ?? 0), vis = Math.round((H.visibility?.[nowI] ?? 0) / 1000), mp = moonPhase(), wd = C.wind_direction_10m, bft = Math.min(12, Math.round(Math.pow(C.wind_speed_10m / 3.6 / .836, 2 / 3)));
  const YON = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"][Math.round(wd / 45) % 8];
  const ax = 10 + frac * 140, ay = 58 - Math.sin(frac * Math.PI) * 40;
  const tiles = `<div class="wxt">
    <div class="wt"><small>HİSSEDİLEN</small><b>${Math.round(C.apparent_temperature)}°</b><p>${Math.abs(C.apparent_temperature - C.temperature_2m) < 2 ? "Gerçek sıcaklığa yakın" : C.apparent_temperature < C.temperature_2m ? "Daha soğuk hissettiriyor" : "Daha sıcak hissettiriyor"}</p></div>
    <div class="wt"><small>RÜZGÂR</small><div class="cmp"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="5" stroke-dasharray="1.5 3"/><text x="40" y="12" text-anchor="middle">K</text><text x="72" y="44" text-anchor="middle">D</text><text x="40" y="76" text-anchor="middle">G</text><text x="8" y="44" text-anchor="middle">B</text><g transform="rotate(${wd + 180} 40 40)"><path d="M40 10 L44 22 L36 22Z" fill="#fff"/><line x1="40" y1="20" x2="40" y2="62" stroke="#fff" stroke-width="2.2"/></g><circle cx="40" cy="40" r="14" fill="rgba(0,0,0,.35)"/><text x="40" y="44" text-anchor="middle" class="big">${Math.round(C.wind_speed_10m)}</text></svg></div><p>${YON} yönünden, ${Math.round(C.wind_speed_10m)} km/sa · ${bft} bofor</p></div>
    <div class="wt"><small>UV İNDEKSİ</small><b>${uv}</b><div class="uvb"><i style="left:${Math.min(100, uv / 11 * 100)}%"></i></div><p>${uv <= 2 ? "Düşük" : uv <= 5 ? "Orta" : uv <= 7 ? "Yüksek" : "Çok yüksek"}</p></div>
    <div class="wt"><small>GÜN DOĞUMU</small><b>${hm2(sr)}</b><svg class="arc" viewBox="0 0 160 64"><path d="M10 58 Q80 -22 150 58" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><line x1="0" y1="58" x2="160" y2="58" stroke="rgba(255,255,255,.25)"/><circle cx="${ax}" cy="${ay}" r="5" fill="#ffd60a"/></svg><p>Gün batımı ${hm2(ss)}</p></div>
    <div class="wt"><small>NEM</small><b>%${C.relative_humidity_2m}</b><p>${C.relative_humidity_2m > 80 ? "Nemli" : C.relative_humidity_2m < 35 ? "Kuru" : "Rahat"}</p></div>
    <div class="wt"><small>GÖRÜŞ</small><b>${vis} km</b><p>${vis >= 10 ? "Açık görüş" : vis >= 4 ? "İyi görüş" : "Sınırlı görüş"}</p></div>
    <div class="wt"><small>BASINÇ</small><b>${Math.round(C.surface_pressure)}</b><p>hPa</p></div>
    <div class="wt"><small>AY</small>${moonSvg(mp.ph)}<p>${mp.name}${mp.toFull > 0 && mp.name !== "Dolunay" ? ` · dolunaya ${mp.toFull} gün` : ""}</p></div></div>`;
  box.innerHTML = `<div class="wxt0"><small>${esc(cname)}</small><b>${Math.round(C.temperature_2m)}°</b><span>${esc(WTX(C.weather_code))}</span><span>En yüksek ${hi[di0]}° · En düşük ${lo[di0]}°</span></div>
    <div class="wxg"><h5>Saatlik tahmin</h5>${hourly}</div><div class="wxg"><h5>16 günlük tahmin <em>Bir güne dokun, o günün etkinlikleri açılsın</em></h5>${daily}</div>${tiles}<p class="wxsrc">Veri: Open-Meteo.com</p>`;
}

/* Bugün kartı (kullanıcı, 01:37: "48 32 30 kutuları boş duruyor, başka bir şey öner"): sol üstte tarih, sağda yana kayan günlerin havası
   (dokununca hava paneli), altta "Sıradaki": birazdan başlayacak 3 etkinlik küçük afişleriyle; en altta tek satır sayılar. */
async function todayCard(city, box, n, nT, nF) {
  if (!box) return; const { d: today, hm } = nowIST(), dt = pd(today);
  const L = DATA.events.filter((e) => live(e) && ((e.d === today && e.t && e.t >= hm) || e.d === addD(today, 1))).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "99").localeCompare(b.t || "99"));
  const up = uniq(L.filter((e) => e.img), 3);
  const mins = (e) => { if (e.d !== today || !e.t) return ""; const m = (+e.t.slice(0, 2) * 60 + +e.t.slice(3, 5)) - (+hm.slice(0, 2) * 60 + +hm.slice(3, 5)); return m < 60 ? `${m} dk sonra` : `${Math.floor(m / 60)} sa ${m % 60 ? (m % 60) + " dk " : ""}sonra`; };
  const nextH = up.length ? `<div class="nx"><h6>${up[0].d === today ? "Sıradaki" : "Yarın"}</h6>${up.map((e) => `<a class="nxi" href="#/${city}/e/${encodeURIComponent(e.slug)}"><span class="nxp">${poster(e, { badge: false })}</span><span class="nxt"><b>${esc(e.title)}</b><small>${e.d === today ? `<em>${esc(e.t)}</em> · ${mins(e)}` : `<em>${esc(e.t || "")}</em>`}</small><small>${esc(e.venue || "")}</small></span></a>`).join("")}</div>` : "";
  const line = `<a class="tln" href="#/${city}/kesfet?t=bugun">Bugün <b>${n}</b> etkinlik · akşam <b>${nT}</b>${nF ? ` · <b>${nF}</b> film` : ""}</a>`;
  box.innerHTML = `<div class="tdy"><div class="td1"><small>BUGÜN</small><b>${dt.getDate()} ${AY[dt.getMonth()]}</b><span>${GUN[dt.getDay()]}</span></div><button type="button" class="tdw" id="tdw" aria-label="Hava durumu"><span class="sk" style="display:block;width:120px;height:70px;border-radius:14px"></span></button>${nextH}${line}</div>`;
  const ll = ILLL[city]; if (!ll) return;
  const j = await wxFull(ll[0], ll[1]); const w = $("#tdw", box); if (!w || !j?.daily) { w?.remove(); return; }
  const D = j.daily, cur = j.current;
  w.innerHTML = `<div class="tws">${D.time.slice(0, 7).map((d, i) => `<div class="tw"><span class="twd">${i === 0 ? "Şimdi" : GUNK[pd(d).getDay()] + " " + +d.slice(8, 10)}</span>${wIcon(i === 0 ? cur.weather_code : D.weather_code[i], i === 0 ? cur.is_day : 1, 34)}<b>${Math.round(i === 0 ? cur.temperature_2m : D.temperature_2m_max[i])}°</b><small>${esc(WTX(i === 0 ? cur.weather_code : D.weather_code[i]))}</small><small>${Math.round(D.temperature_2m_max[i])}° / ${Math.round(D.temperature_2m_min[i])}°</small></div>`).join("")}</div><div class="twdots">${D.time.slice(0, 7).map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>`;
  const sc = $(".tws", w), dots = $$(".twdots i", w); let li = 0;
  sc.addEventListener("scroll", () => { const k = Math.round(sc.scrollLeft / sc.clientWidth); if (k !== li) { li = k; dots.forEach((d, i) => d.classList.toggle("on", i === k)); tick(); } }, { passive: true });
  w.addEventListener("click", () => { haptic(6); wxSheet(city); });
}

/* Filmler de filtrelenir (kullanıcı, 16.11.2026: "film de filtrelensin, konusuna göre"): Kategori › Film; gün, saat ve arama filmlere de uygulanır; tür seçilebilir (fg) */
function filmGenres() { const S = new Map(); for (const x of DATA.films?.films || []) for (const g of filmGenre(x).split(/,\s*/).filter(Boolean)) S.set(g, (S.get(g) || 0) + 1); return [...S].sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 16); }
function filmsFor(f) {
  const K = list(f.k); if (!K.includes("sinema") && !(f.q && !K.length)) return [];
  const { d: today, hm } = nowIST(), dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7);
  const R = { bugun: [today, today], yarin: [addD(today, 1), addD(today, 1)], haftasonu: [dow === 6 || dow === 0 ? today : fri, dow === 0 ? today : addD(fri, 2)], hafta: [today, addD(today, 6)], ay: [today, addD(today, 30)] }[f.t] || (f.gun ? [f.gun, f.gun] : [today, addD(today, 6)]);
  const Sx = list(f.s), G = list(f.fg), q = fold(f.q || "").trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const x of DATA.films?.films || []) {
    if (G.length && !G.some((g) => filmGenre(x).includes(g))) continue;
    if (q.length && !q.every((w) => fold(x.title + " " + filmGenre(x)).includes(w))) continue;
    let n = 0, first = "";
    for (const [d, rows] of Object.entries(x.s || {})) { if (d < R[0] || d > R[1]) continue; for (const [, s] of rows) for (const t of s.split("|")[0].split(",")) { if (d === today && t < hm) continue; if (Sx.length && !Sx.includes(slot(t))) continue; n++; if (!first || d < first) first = d; } }
    if (n) out.push({ f: x, n, d: first });
  }
  return out.sort((a, b) => b.n - a.n);
}

/* Etkinlik hakkında bilgi (kullanıcı, 16.11.2026: "o etkinlikle ilgili bilgi de istiyoruz, nedir yani"): hukuk kuralı gereği tanıtım metni kopyalanmaz;
   bilgi olgulardan kurulur ve Apple'ın bilgi listeleri gibi gösterilir: ne, ne zaman, ne kadar sürer, kimler için, kim düzenliyor, başka tarihleri, nerede satışta. */
function infoBlock(e, city) {
  if (e.manual && e.desc) return `<p>${esc(e.desc)}</p>`;
  const org = e.org && !SALES.test(e.org.trim()) ? e.org : "", v = vOf(e.venue), cat = CATS[e.cat] || "Etkinlik", g = e.genre && e.genre !== cat ? e.genre : "";
  const others = DATA.events.filter((x) => x !== e && live(x) && NV.key(x.title) === NV.key(e.title)).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "").localeCompare(b.t || ""));
  const sites = e.tickets.map((x) => x.site), days = e.firstSeen ? Math.floor((Date.now() - Date.parse(e.firstSeen)) / 864e5) : null;
  const cn = CITIES.find((c) => c.id === city)?.name || "", deI = (w) => { const vv = (w.toLocaleLowerCase("tr").match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ["a"])[0]; return w + "'" + (/[fsthçşkp]$/i.test(w) ? "t" : "d") + ("aıou".includes(vv) ? "a" : "e"); };
  const lead = `${g ? g + " · " : ""}${cat}${v?.ilce ? ", " + v.ilce : ""}. ${others.length ? `${deI(cn)} ${others.length + 1} tarihi var.` : `${deI(cn)} tek tarihi var.`}`;
  const row = (k, v2) => v2 ? `<div><dt>${k}</dt><dd>${v2}</dd></div>` : "";
  return `<p class="ilead">${esc(lead)}</p><dl class="kv">
    ${row("Tür", esc(g ? `${cat} · ${g}` : cat))}
    ${row("Tarih", esc(dLong(e.d) + (e.t ? " · " + e.t : "")))}
    ${row("Süre", e.dur ? esc(e.dur) : "")}
    ${row("Kapı açılışı", e.door ? esc(e.door) : "")}
    ${row("Yaş sınırı", e.age ? esc(String(e.age)) : "")}
    ${row("Düzenleyen", org ? esc(org) : "")}
    ${row("Mekân", esc([e.venue, v?.ilce].filter(Boolean).join(" · ")))}
    ${row("Satışta", esc(sites.join(", ")) + (e.price ? ` · ${TL(e.price)}'den` : ""))}
    ${row("Durum", e.status === "tukendi" ? "Biletler tükendi" : e.status === "iptal" ? "İptal edildi" : e.status === "ertelendi" ? "Ertelendi" : e.isNew ? "Yeni eklendi" : "")}
    ${row("Listede", days != null && days > 0 ? `${days} gündür` : days === 0 ? "Bugün eklendi" : "")}
  </dl>${others.length ? `<div class="odt"><b>Diğer tarihler</b><div>${others.slice(0, 8).map((x) => `<a href="#/${city}/e/${encodeURIComponent(x.slug)}">${dShort(x.d)}${x.t ? " · " + esc(x.t) : ""}${x.venue !== e.venue ? `<small>${esc(x.venue)}</small>` : ""}</a>`).join("")}</div></div>` : ""}`;
}

/* Sana önerilerimiz (Planım; kullanıcı isteği, 16.11.2026): takip ettiğin sanatçı ve mekânlar, gittiklerin ve takip ettiklerinin türü ve saatleri, ilgi alanların.
   Her önerinin altında nedeni yazar. Yalnızca telefondaki bilgilerle hesaplanır. */
function recoRail(city) {
  const F = Object.values(follows()), G = gittim(), A = afol(), VF = vfol(), P = prefs() || {}, today = nowIST().d;
  const fk = new Set(F.map((f) => f.tk)), catW = {}, venW = {}, slotW = {};
  for (const x of [...F, ...G]) { if (x.cat) catW[x.cat] = (catW[x.cat] || 0) + 1; if (x.venue) venW[x.venue] = (venW[x.venue] || 0) + 1; if (x.t) slotW[slot(x.t)] = (slotW[slot(x.t)] || 0) + 1; }
  for (const c of P.cats || []) catW[c] = (catW[c] || 0) + 1.5;
  const ref = (c) => [...G, ...F].reverse().find((x) => x.cat === c);
  const venFol = new Set(Object.values(VF).filter((v) => v.city === city).map((v) => v.name));
  const S = [];
  for (const e of DATA.events) {
    if (!live(e) || e.d > addD(today, 21) || fk.has(NV.key(e.title))) continue;
    let s = 0, why = "";
    const ak = NV.akey(e.title); if (ak && A[ak]) { s += 10; why = `Takip ettiğin: ${A[ak].name}`; }
    if (venFol.has(e.venue)) { s += 6; why ||= `Takip ettiğin mekânda`; }
    if (venW[e.venue]) { s += 2 * venW[e.venue]; why ||= `Sevdiğin mekânda: ${e.venue}`; }
    if (catW[e.cat]) { s += catW[e.cat] * 1.6; if (!why) { const r = ref(e.cat); why = r ? `${r.title.length > 22 ? r.title.slice(0, 21) + "…" : r.title} gibi` : `Sevdiğin tür: ${CATS[e.cat] || ""}`; } }
    if (e.t && slotW[slot(e.t)]) s += .6 * slotW[slot(e.t)];
    if (!s) continue; s += (e.img ? 1 : 0) + (e.score || 0) * .3 - (Date.parse(e.d) - Date.parse(today)) / 864e5 * .08;
    S.push([e, s, why]);
  }
  const L = uniq(S.sort((a, b) => b[1] - a[1]).map((x) => x[0]).filter((e) => e.img), 14), W = new Map(S.map((x) => [x[0], x[2]]));
  if (L.length < 3) return "";
  return `<section class="rail reco"><div class="rh"><div><h3>Sana önerilerimiz</h3><small>Takip ettiklerine ve gittiklerine göre</small></div></div><div class="rs">${L.map((e) => card(e, city).replace(/<\/a>$/, `<div class="why">${esc(W.get(e) || "")}</div></a>`)).join("")}</div></section>`;
}

boot().then(() => { offlineBoot(); shortcutBoot(); route(); splashOut(); if (DATA.ready) followBoot(); welcomeApp(); }).catch((err) => { splashOut(); V.innerHTML = `<div class="empty">Veriler yüklenemedi. Sayfayı yenile.</div>`; console.error(err); });
