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
const WM = () => `<span class="wm"><img src="brand/logo.png" alt="Ne Var Ne Yok" width="1301" height="653" decoding="async"></span>`;
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
  const pr = e.price ? `<div class="pr">${TL(e.price)}'den${np > 1 ? `<i>${np} sitede</i>` : ""}</div>` : "";
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
  $("#home").innerHTML = WM(); $("#home").href = `#/${city}`;
  $("#cityBtn span").textContent = CITIES.find((c) => c.id === city)?.name || city;
  $("#srchBtn").href = `#/${city}/kesfet`;
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
document.addEventListener("beforeinput", (ev) => { if (!ev.target.matches?.(TXT)) return; const k = ev.inputType || "";
  if (k.startsWith("delete")) snd.del(); else if (k === "insertLineBreak" || k === "insertParagraph" || ev.data === " ") snd.ret(); else if (k.startsWith("insert")) snd.key(); }, true);
document.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.matches?.(TXT)) snd.ret(); }, true);
document.addEventListener("click", (ev) => { const t = ev.target; if (t.closest?.(".tile, .seg button, .pills button, [data-one], [data-many], [data-p], [data-b], .tabs a, .dpk button, [data-d], #wl li, .tg2, .sw, input, label")) return;
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
  V.innerHTML = `<div class="wash" aria-hidden="true">${featured.map((e, k) => `<img src="${esc(e.img)}" alt="" referrerpolicy="no-referrer" decoding="async"${k ? "" : ' style="opacity:.42"'}>`).join("")}</div><section class="city"><h1 style="--L:${[...cname].length}">${esc(cname)}</h1><div class="st"><span><b>${todayL.length}</b> etkinlik bugün</span><span><b>${weekL.length.toLocaleString("tr-TR")}</b> bu hafta</span>${DATA.films?.films?.length ? `<span><b>${DATA.films.films.filter((f) => f.s && Object.keys(f.s).length).length}</b> film vizyonda</span>` : ""}</div>
  <button type="button" class="pz" id="pz">${prefs() ? `<span class="dot"></span>Senin için kişiselleştirildi<em>Düzenle</em>` : `${I.spark}Kişiselleştir<em>İlgi alanlarını seç, sana uygun etkinlikler öne çıksın</em>`}</button></section>
  <div class="qk2"><button type="button" id="tnt"><span>🌙</span>Bu akşam ne yapsak?</button><button type="button" id="nrb"><span>📍</span>Yakınımda</button></div>
  ${stories(featured, (e) => `#/${city}/e/${encodeURIComponent(e.slug)}`)}
  <form class="sbar" id="sf"><label class="sin">${I.srch}<input id="q" type="search" placeholder="Etkinlik, mekân, sanatçı ara…" enterkeyhint="search"></label><a class="fbtn" href="${k("f=1")}">${I.flt}<span class="fl">Filtrele</span></a></form>
  <div class="qk"><a href="${k("t=bugun")}">Bugün</a><a href="${k("t=yarin")}">Yarın</a><a href="${k("t=haftasonu")}">Hafta sonu</a><a href="#/${city}/sinema">Sinema</a>${Object.keys(CATS).filter((c) => c !== "sinema" && weekL.some((e) => e.cat === c)).map((c) => `<a href="${k("k=" + c)}">${esc(CATS[c])}</a>`).join("")}</div>
  ${notifAsk(city)}
  ${prefs() ? rail("Senin için", "İlgi alanlarına göre bu hafta", uniq([...weekL.filter((e) => e.img)].sort((a, b) => pscore(b) - pscore(a)), 16), city, k("sira=sen&t=hafta")) : ""}
  ${rail("Bu akşam", `${dLong(today)} · ${tonight.length} etkinlik`, uniq(tonight.filter((e) => e.img).sort((a, b) => (a.t || "").localeCompare(b.t || "")), 16), city, k("t=bugun"))}
  ${filmRail(city)}
  ${rail("Hafta sonu", wkend.length + " etkinlik", pick(wkend.filter((e) => e.img), 16), city, k("t=haftasonu"))}
  ${(() => { const L = E.filter((e) => e.img && live(e) && e.tickets.filter((x) => x.price).length > 1).map((e) => { const p = e.tickets.filter((x) => x.price).map((x) => x.price); return [e, Math.max(...p) - Math.min(...p)]; }).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]).map(([e]) => e);
     return L.length >= 3 ? rail("Fiyatları karşılaştır", "Siteler arasında fiyatı farklı olanlar", uniq(L, 16), city, k("cok=1&sira=fiyat")) : ""; })()}
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
  $("#sf").addEventListener("submit", (ev) => { ev.preventDefault(); location.hash = `#/${city}/kesfet?q=${encodeURIComponent($("#q").value.trim())}`; });
  $("#pz").addEventListener("click", () => openPrefs(city, () => viewCity(city)));
  $("#tnt").addEventListener("click", () => tonightSheet(city)); $("#nrb").addEventListener("click", () => nearMe(city));
  bindNotifAsk(city);
  storyInit();
}
function filmRail(city) {
  const F = DATA.films?.films || [], today = nowIST().d;
  const L = F.filter((f) => f.img && f.s && f.s[today]?.length).sort((a, b) => (b.s[today]?.length || 0) - (a.s[today]?.length || 0)).slice(0, 14);
  if (!L.length) return "";
  return `<section class="rail"><div class="rh"><div><h3>Vizyonda</h3><small>Bugün ${L.length}+ film · salon salon seanslar</small></div><a href="#/${city}/sinema">Tümü →</a></div><div class="rs">${L.map((f) => `<a class="cd" href="#/${city}/film/${f.id}"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" loading="lazy" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div><div class="t">${esc(f.title)}</div><div class="m">${esc([f.genre, f.dur && f.dur + " dk"].filter(Boolean).join(" · "))}</div><div class="m2">${f.s[today].length} salonda bugün</div></a>`).join("")}</div></section>`;
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
    && (!f.tk || e.status !== "tukendi") && q.every((w) => e.q.includes(w)));
  DATA.events.forEach((e) => { e._km = null; });
  if (f.sira === "yakin" && DATA.me) { const me = DATA.me.p; L.forEach((e) => { const v = vOf(e.venue); e._km = v?.lat ? km(me, [v.lat, v.lng]) : null; }); L = [...L].sort((a, b) => (a._km ?? 1e9) - (b._km ?? 1e9) || a.d.localeCompare(b.d)); }
  else if (f.sira === "populer") L = [...L].sort((a, b) => b.score - a.score); else if (f.sira === "fiyat") L = [...L].sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)); else if (f.sira === "sen") L = [...L].sort((a, b) => pscore(b) - pscore(a) || a.d.localeCompare(b.d));
  return L;
}
const ILCELER = () => { if (DATA.city !== "ankara") return []; const m = new Map(); for (const e of DATA.events) { const i = ilceOf(e); if (i && live(e)) m.set(i, (m.get(i) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
function chipsOf(f) {
  const c = [];
  if (f.q) c.push(["q", `“${f.q}”`]); if (f.t) c.push(["t", TIMES[f.t]]); if (f.gun) c.push(["gun", dShort(f.gun)]);
  list(f.k).forEach((k) => c.push(["k:" + k, CATS[k]])); list(f.s).forEach((k) => c.push(["s:" + k, SAAT[k].split(" · ")[0]]));
  if (f.p) c.push(["p", FIYAT[f.p]]); list(f.il).forEach((k) => c.push(["il:" + k, ILCELER().find(([n]) => fold(n).replace(/\s+/g, "") === k)?.[0] || k]));
  if (f.m) c.push(["m", f.m]); if (f.c) c.push(["c", KIM[f.c]]); if (f.yeni) c.push(["yeni", "Yeni eklenenler"]); if (f.cok) c.push(["cok", "Fiyat karşılaştırmalı"]); if (f.tk) c.push(["tk", "Tükenenler gizli"]); if (f.iptal) c.push(["iptal", "İptal / ertelenen"]);
  return c;
}
const dropChip = (f, key) => { const nf = { ...f }; const [k, v] = key.split(":"); if (v) { const L = list(nf[k]).filter((x) => x !== v); if (L.length) nf[k] = L.join(","); else delete nf[k]; } else delete nf[k]; return nf; };
const toQ = (f) => Object.entries(f).filter(([k, v]) => v && k !== "f").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
let shown = 60;
function viewKesfet(city, f) {
  setTop(city);
  if (f.sira === "yakin" && !DATA.me) { venueTr().then(() => whereAmI()).then(() => { if (location.hash.includes("sira=yakin")) viewKesfet(city, f); }).catch((err) => geoHelp(city, err?.code)); }
  else if (f.sira === "yakin" && !DATA.vtr && city !== "ankara") { venueTr().then(() => viewKesfet(city, f)); }
  const L = applyF(f), K = list(f.k), title = K.length === 1 ? CATS[K[0]] : f.t ? TIMES[f.t] : f.gun ? dLong(f.gun) : f.yeni ? "Yeni eklenenler" : f.iptal ? "İptal ve ertelenenler" : f.q ? "Arama" : f.sira === "sen" ? "Senin için" : "Keşfet";
  document.title = `${title} · ${CITIES.find((c) => c.id === city)?.name} · Ne Var Ne Yok`;
  const chips = chipsOf(f).filter(([k]) => k !== "q"), go = (nf) => { location.hash = `#/${city}/kesfet?${toQ(nf)}`; };
  V.innerHTML = `<div class="kh"><h1>${esc(title)}</h1><p>${L.length.toLocaleString("tr-TR")} etkinlik · ${esc(CITIES.find((c) => c.id === city)?.name || "")}</p></div>
  <div class="fz"><form class="sbar" id="sf"><label class="sin">${I.srch}<input id="q" type="search" value="${esc(f.q || "")}" placeholder="Etkinlik, mekân, sanatçı ara…" enterkeyhint="search"></label>
  <button type="button" class="fbtn${chips.length ? " on" : ""}" id="fo">${I.flt}<span class="fl">Filtrele</span>${chips.length ? `<span class="n">${chips.length}</span>` : ""}</button></form>
  <div class="frow"><div class="act">${chips.map(([k, l]) => `<button type="button" data-x="${esc(k)}">${esc(l)}</button>`).join("")}</div><button type="button" class="srtb" id="srt">${esc(SIRA[f.sira || ""])}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div></div>
  <div class="grid" id="gr"></div><div id="mr"></div>${L.length ? "" : `<div class="empty">Bu seçimle etkinlik bulunamadı.<br>Filtreleri gevşetmeyi dene.</div>`}${footer()}`;
  shown = 60; const gr = $("#gr"), mr = $("#mr");
  const paint = () => { gr.innerHTML = L.slice(0, shown).map((e) => card(e, city)).join(""); mr.innerHTML = L.length > shown ? `<button class="more" id="more">Daha fazla göster (${(L.length - shown).toLocaleString("tr-TR")})</button>` : ""; $("#more")?.addEventListener("click", () => { shown += 60; paint(); }); };
  paint();
  $("#sf").addEventListener("submit", (ev) => { ev.preventDefault(); $("#q").blur(); go({ ...f, q: $("#q").value.trim() }); });
  $$("[data-x]").forEach((b) => b.addEventListener("click", () => go(dropChip(f, b.dataset.x))));
  $("#fo").addEventListener("click", () => openFilters(city, f));
  $("#srt").addEventListener("click", () => sortMenu(f, go));
  if (f.f) { delete f.f; history.replaceState(null, "", `#/${city}/kesfet?${toQ(f)}`); openFilters(city, f); }
}
function sheet(html, cls = "") {
  const sh = document.createElement("div"); sh.className = "sh " + cls; sh.innerHTML = html; document.body.append(sh); document.body.style.overflow = "hidden";
  requestAnimationFrame(() => sh.classList.add("on"));
  sh.close = () => { sh.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => sh.remove(), 260); };
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
    <h4>Kategori <em>birden çok seçebilirsin</em></h4><div class="tiles">${Object.entries(CATS).filter(([k]) => k !== "sinema").map(([k, l]) => tileM("k", k, l, CIC[k] || "✨", catN(k).toLocaleString("tr-TR") + " etkinlik")).join("")}</div>
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
    <h4>Bildirimler</h4>${notifBox(city, true)}
    <h4>Sesler ve titreşim</h4><div class="grp"><label class="tg2"><span>🔈 Dokunma sesleri ve titreşim<small>Çarklarda tık, yazarken klavye sesi, dokununca hafif titreşim</small></span><input type="checkbox" id="ses"${sesOn() ? " checked" : ""}></label></div>
    <h4>Görünüm</h4><div class="grp"><label class="tg2"><span>🌙 Gece göz yormayan mod<small>22:00–07:00 arası ekran biraz kısılır ve ısınır</small></span><input type="checkbox" id="gece"${store.get("nvny-gece") !== "0" ? " checked" : ""}></label></div>
    <p class="pl1" style="margin:16px 0 8px">Yazı boyutu</p><div class="seg" id="zseg" style="--n:3;--i:${Math.max(0, ZOOMS.findIndex(([z]) => z === +(store.get("nvny-yazi") || 1)))}"><span class="thumb" aria-hidden="true"></span>${ZOOMS.map(([z, l], k) => `<button type="button" data-z="${z}" data-k="${k}" class="${z === +(store.get("nvny-yazi") || 1) ? "on" : ""}">${l}</button>`).join("")}</div>
  </div><div class="ft"><button type="button" class="ok" data-save>Kaydet</button></div></div>`, "fsheet");
  sh.addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-p]"); if (c) { const k = c.dataset.p, v = c.dataset.v; P[k] = (P[k] || []).includes(v) ? P[k].filter((x) => x !== v) : [...(P[k] || []), v]; c.classList.toggle("on"); c.setAttribute("aria-pressed", c.classList.contains("on")); return; }
    const bb = ev.target.closest("[data-b]"); if (bb) { P.budget = +bb.dataset.b; $(".seg", sh).style.setProperty("--i", bb.dataset.k); $$("[data-b]", sh).forEach((x) => x.classList.toggle("on", x === bb)); return; }
    if (ev.target.closest("[data-clear]")) { store.set("nvny-prefs", ""); sh.close(); after?.(); return; }
    if (ev.target.closest("[data-save]")) { P.kids = $("#kids", sh).checked; store.set("nvny-prefs", JSON.stringify(P)); NV.set("prefs", P); sh.close(); after?.(); }
  });
  bindNotifBox(sh, city);
  $("#ses", sh).addEventListener("change", (ev) => { store.set("nvny-ses", ev.target.checked ? "1" : "0"); if (ev.target.checked) snd.on(); });
  $("#gece", sh).addEventListener("change", (ev) => { store.set("nvny-gece", ev.target.checked ? "1" : "0"); applyLook(); });
  $$("[data-z]", sh).forEach((b) => b.addEventListener("click", () => { store.set("nvny-yazi", b.dataset.z); $("#zseg", sh).style.setProperty("--i", b.dataset.k); $$("[data-z]", sh).forEach((x) => x.classList.toggle("on", x === b)); applyLook(); }));
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
    ${live(e) ? `<p class="flh">Takip edersen fiyatı düştüğünde, iptal, erteleme, saat, tarih ya da yer değişikliğinde ve etkinlikten bir gün önce haber veririz.</p>` : ""}
    <section class="sec"><h3>Bu etkinlik hakkında</h3><p>${esc(descOf(e))}</p></section>
    <section class="sec"><h3>Konum</h3><div class="mapc">${v?.lat ? `<div class="map" id="map"></div>` : ""}<div class="ad">${I.pin}<span><b>${esc(e.venue || "")}</b><small>${esc(v?.addr || (v?.ilce ? v.ilce + ", " : "") + (CITIES.find((c) => c.id === city)?.name || ""))}</small></span><button type="button" id="vfl" class="vfl${vfol()[vkey(city, e.venue)] ? " on" : ""}">${vfol()[vkey(city, e.venue)] ? I.bellOn + "Mekân takipte" : I.pin + "Mekânı takip et"}</button></div><div class="bt">${v?.lat ? `<button type="button" class="p" id="rte">${I.dir}Yol tarifi</button>` : `<a class="p" href="${dirU}" target="_blank" rel="noopener">${I.dir}Yol tarifi</a>`}<a href="${mapU}" target="_blank" rel="noopener">${I.ext}Haritada aç</a></div></div></section>
  </div></div></div></article>
  ${same.length ? rail("Aynı mekânda", e.venue, same, city, `#/${city}/kesfet?m=${encodeURIComponent(e.venue)}`) : ""}
  ${sim.length ? rail("Bunlar da ilgini çekebilir", CATS[e.cat] || "", sim, city, `#/${city}/kesfet?k=${e.cat}`) : ""}
  ${footer()}`;
  $("#shr").addEventListener("click", () => shareEv(e, city));
  $("#cal").addEventListener("click", () => calAdd({ ...e, city }));
  $("#vfl").addEventListener("click", (ev) => toggleVenue(e, city, ev.currentTarget));
  $("#flw").addEventListener("click", () => toggleFollow(e, city));
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
  <div class="grid">${L.map((f) => `<a class="cd" href="#/${city}/film/${f.id}?gun=${d}"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" loading="lazy" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div><div class="t">${esc(f.title)}</div><div class="m">${esc([f.genre, f.dur && f.dur + " dk"].filter(Boolean).join(" · "))}</div><div class="m2">${f.s[d].length} salon</div></a>`).join("")}</div>${L.length ? "" : `<div class="empty">Bu gün için seans bilgisi yok.</div>`}${footer()}`;
  $$("[data-d]").forEach((b) => b.addEventListener("click", () => { location.hash = `#/${city}/sinema?gun=${b.dataset.d}`; }));
}
function viewFilm(city, id, day) {
  setTop(city); const F = DATA.films?.films || [], f = F.find((x) => String(x.id) === String(id)), C = DATA.films?.cinemas || {};
  if (!f) { V.innerHTML = `<div class="empty">Film bulunamadı.</div>${footer()}`; return; }
  document.title = `${f.title} · seanslar · Ne Var Ne Yok`;
  const { d: today, hm } = nowIST(), days = Object.keys(f.s || {}).filter((x) => x >= today).sort(), d = days.includes(day) ? day : days[0];
  const rows = (f.s[d] || []).map(([cid, s]) => { const [times, fmt] = s.split("|"); return { c: C[cid] || { name: "Salon " + cid }, times: times.split(","), fmt }; }).sort((a, b) => a.c.name.localeCompare(b.c.name, "tr"));
  V.innerHTML = `<article class="dt"><div class="bk"><img src="${esc(f.img)}" alt="" referrerpolicy="no-referrer"></div><div class="in">
  <a class="back" href="#/${city}/sinema">${I.back}Sinema</a>
  <div class="dg"><div class="dp"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div></div><div>
  <div class="tags"><span>Sinema</span>${f.genre ? `<span>${esc(f.genre)}</span>` : ""}${f.dur ? `<span>${f.dur} dk</span>` : ""}</div>
  <h1>${esc(f.title)}</h1>
  <div class="meta">${f.release ? `<div>${I.cal}<span>Vizyon tarihi<small>${dLong(f.release)}</small></span></div>` : ""}<div>${I.pin}<span>${rows.length} salonda seans<small>${dLong(d)}</small></span></div></div>
  <div class="days" style="padding:18px 0 0">${days.map((x) => { const dt = pd(x); return `<button type="button" data-d="${x}" class="${x === d ? "on" : ""}">${x === today ? "Bugün" : GUNK[dt.getDay()]}<b>${dt.getDate()}</b></button>`; }).join("")}</div>
  <div class="ss">${rows.map((r) => `<div class="h"><b>${esc(r.c.name)}</b>${r.c.addr ? `<small>${esc(r.c.addr)}</small>` : ""}<div class="tm">${r.times.map((t) => `<span class="${d === today && t < hm ? "ps" : ""}">${esc(t)}</span>`).join("")}${r.fmt ? `<i>${esc(r.fmt)}</i>` : ""}</div></div>`).join("")}</div>
  <a class="buy" href="${esc(f.url)}" target="_blank" rel="noopener" data-buy="sinemalar.com">Seanslar ve bilet · sinemalar.com</a>
  </div></div></div></article>${footer()}`;
  $$("[data-d]").forEach((b) => b.addEventListener("click", () => { location.hash = `#/${city}/film/${id}?gun=${b.dataset.d}`; }));
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
  venueCheck();
  const F = follows(); if (!Object.keys(F).length) return;
  const res = NV.check(F, DATA.events, DATA.city || city);
  saveF(res.follows);
  res.msgs.slice(0, 3).forEach((m, i) => setTimeout(() => toast(`${I.bellOn}<span><b>${esc(m.title)}</b><small>${esc(m.body)}</small><a href="${esc(m.url.replace(/^\/(yeni\/)?/, ""))}">Göster →</a></span>`, 9000), 900 + i * 400));
  const fb = $("#flwBtn b"); if (fb) { const n = Object.keys(res.follows).length; fb.textContent = n || ""; fb.parentElement.classList.toggle("has", !!n); }
}


/* ---------- Bilgi sayfaları (#/bilgi/<ad>) ---------- */
const C = window.NVNY_SITE?.contact || "";
const PAGES = {
  hakkinda: ["Hakkında", `<p><b>Ne Var Ne Yok</b>, şehrinde yapılacak konser, tiyatro, stand-up, opera, bale, çocuk etkinliği, festival, parti ve atölyeleri bir arada gösteren bağımsız bir etkinlik rehberidir.</p><p>Bilet satmıyoruz. Her etkinlikte, bileti satan sitelerin hepsi fiyatlarıyla yan yana gösterilir; “Bilet al” düğmesi seni doğrudan o sitenin satış sayfasına götürür. Satın alma, iade ve değişiklik işlemleri ilgili bilet sitesinin kurallarına tabidir.</p><p>Reklam almıyoruz, komisyon almıyoruz, kimseden ücret almıyoruz. Bir etkinliğin listede yer alması ya da öne çıkması için ödeme yapılmaz.</p><p>Şu an Ankara açık; diğer şehirler yakında.</p>`],
  kaynaklar: ["Veri kaynakları", `<p>Etkinlikler bilet sitelerinin, kurumların, mekânların ve belediyelerin herkese açık sayfalarından toplanır.</p><p>Toplama her sabah yeniden yapılır; öğleden sonra da bilinen etkinliklerin fiyat ve satış durumu bir kez daha kontrol edilir. Bir site o gün okunamazsa son doğrulanmış bilgisi korunur. Tarihi geçen etkinlikler kendiliğinden kaldırılır. Elle eklenen etkinlikler de aynı listeye katılır.</p><p>Gösterilen fiyat, o sitede listelenen en uygun kategoridir. Fiyat, seans ve satış durumu satış sitesinde değişebilir; satın almadan önce bilet sayfasını kontrol et.</p><p>Etkinlik sayfasındaki harita OpenStreetMap'ten gelir (© OpenStreetMap katkıcıları); mekân konumları OpenStreetMap Nominatim ile bulunur. Yol tarifi ve "Haritada aç" Google Haritalar'a bağlanır.</p>`],
  gizlilik: ["Gizlilik", `<p>Bu site hesap açtırmaz, form doldurtmaz ve kişisel veri toplamaz. Çerez ya da reklam takibi kullanmaz.</p><p>Kaç kişinin siteye girdiğini görmek için çerezsiz bir sayaç (GoatCounter) kullanılır: kimliğin, IP adresin ya da cihaz kimliğin saklanmaz; yalnızca girilen sayfa, gelinen site ve tarayıcı türü gibi kimseyi tanımlamayan toplam sayılar tutulur. Uygulamayı indirme, takip etme, bildirimleri açma ve "Bilet al" düğmelerine kaç kez basıldığı da aynı şekilde yalnızca sayı olarak tutulur.</p><p>Seçtiğin şehir, ilgi alanların (Kişiselleştir) ve takip ettiğin etkinlikler yalnızca kendi telefonunda ya da tarayıcında saklanır; sunucuya gönderilmez. Tarayıcı verilerini silerek bunları kaldırabilirsin.</p><p>Bildirimler isteğe bağlıdır ve yalnızca sen izin verirsen açılır. Bildirimler telefonun kendisinde, sitemizin herkese açık etkinlik listesiyle karşılaştırılarak oluşturulur; hiçbir bildirim sunucusu ya da kimlik kullanılmaz, kimin neyi takip ettiğini biz bilmeyiz. Bildirimleri tarayıcı ya da telefon ayarlarından istediğin an kapatabilirsin.</p><p>Etkinlik sayfasındaki harita için tarayıcın OpenStreetMap'ten harita parçalarını indirir; senin konumun gönderilmez. Uzaklık ("Senden 3,4 km") yalnızca telefonunda hesaplanır. Uygulama içinde yol tarifi istersen, yolu hesaplamak için yalnızca başlangıç ve varış noktası OpenStreetMap topluluğunun (FOSSGIS) yol sunucusuna gönderilir; biz saklamayız. Bilet sitelerine ve Google Haritalar'a gittiğinde o sitelerin kendi gizlilik kuralları geçerlidir.</p>`],
  kosullar: ["Kullanım koşulları", `<p>Bu site bilgilendirme amaçlıdır. Etkinlik bilgileri (ad, tarih, saat, mekân, fiyat, satış durumu) herkese açık sayfalardan otomatik toplanır; tanıtım metinleri kopyalanmaz. Afişler kopyalanmaz ve sunucumuzda saklanmaz: yalnızca yayımlandıkları kaynak adresten, değiştirilmeden gösterilir (gömülür) ve her afişin üzerinde kaynağı yazar. Kaynak afişi kaldırdığında bizde de görünmez. Etkinlik tanımları bu bilgilerden site tarafından yazılır. Toplayıcı kendini <i>NeVarNeYokBot</i> olarak tanıtır ve sitelerin robots.txt kurallarına uyar.</p><p>Hak sahipleri bir içeriğin kaldırılmasını <a href="mailto:${C}?subject=Kald%C4%B1rma%20talebi">${C}</a> adresinden isteyebilir; talep en geç 48 saat içinde, afişlerde 24 saat içinde yerine getirilir.</p><p>Etkinlik bilgileri; doğruluğu için özen gösterilir ama tarih, saat, fiyat ve satış durumunda değişiklik olabilir. Kesin bilgi her zaman etkinliğin satıldığı sitededir.</p><p>Bilet satın alma işlemleri bu sitede değil, bağlantı verilen bilet sitelerinde yapılır; o işlemlerden ilgili site sorumludur. Etkinlik adları, afişler ve markalar sahiplerine aittir. Afişi olmayan etkinliklerde görülen görseller site tarafından çizilmiş temsili çizimlerdir.</p>`],
  iletisim: ["İletişim", `<p>Soru, öneri, etkinlik ekleme ya da kaldırma talebi için: <a href="mailto:${C}">${C}</a></p><p>Organizatörsen etkinliğini bize yazabilirsin; tanıtım metnin olduğu gibi gösterilebilir.</p>`],
};
function viewBilgi(k) {
  const city = store.get("nvny-city") || "ankara"; setTop(city); const P = PAGES[k] || PAGES.hakkinda; document.title = `${P[0]} · Ne Var Ne Yok`;
  V.innerHTML = `<div class="kh"><h1>${esc(P[0])}</h1></div><div class="wrap info">${P[1]}</div>${footer()}`;
}


/* Alt sekme çubuğu (iPhone uygulaması gibi): Bugün · Keşfet · Sinema · Takip */
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
    if (!P[1]) viewCity(city);
    else if (P[1] === "kesfet") viewKesfet(city, Q);
    else if (P[1] === "e") viewEvent(city, decodeURIComponent(P.slice(2).join("/")));
    else if (P[1] === "sinema") viewSinema(city, Q.gun);
    else if (P[1] === "film") viewFilm(city, P[2], Q.gun);
    else if (P[1] === "takip") viewPlan(city, !!Q.m);
    else viewCity(city);
  }
  if (routed) { V.classList.remove("go"); void V.offsetWidth; V.classList.add("go"); } routed = true; // ilk sayfa canlandırmasız
  tabsUpdate(P);
  const y = scrollMem.get(location.hash); scrollTo(0, y && history.state !== "new" ? y : 0); lastHash = location.hash;
  try { window.goatcounter?.count?.({ path: "/" + h.split("?")[0].replace(/^\//, "") }); } catch {}
}
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
  if (!sesOn() || !acted) return;
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
async function shareEv(e, city, btn) {
  haptic(6); gcEv("paylas", "Paylaş");
  const u = shareUrl(e, city), text = `${e.title} · ${dShort(e.d)}${e.t ? " " + e.t : ""} · ${e.venue}`;
  try { if (navigator.share) { await navigator.share({ title: e.title, text, url: u }); return; } await navigator.clipboard.writeText(u); toast("Bağlantı kopyalandı 🔗 Yapıştırınca afişiyle görünür."); } catch {}
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
  const m = (a.getAttribute("href") || "").match(/^#\/([^/]+)\/e\/(.+)$/); if (!m || !DATA.bySlug) return null;
  const e = DATA.bySlug.get(decodeURIComponent(m[2])); return e ? [e, m[1]] : null;
}
document.addEventListener("pointerdown", (ev) => {
  const a = ev.target.closest?.(".cd, .sps"); if (!a || ev.button > 0) return;
  lpFired = false; lpX = ev.clientX; lpY = ev.clientY; clearTimeout(lpT); lpEl = a;
  lpT = setTimeout(() => { const r = lpEvent(a); if (!r) return; lpFired = true; haptic(12); peek(r[0], r[1], a); }, 480);
}, { passive: true });
let lpEl = null;
["pointerup", "pointercancel"].forEach((n) => document.addEventListener(n, () => clearTimeout(lpT), { passive: true, capture: true }));
// parmakla kaydırma başlayınca tarayıcı pointercancel gönderir; ayrıca 9 px'ten fazla kayma iptal eder (kaydırma olaylarına bakılmaz: tıklamada raf hizalanınca yanlışlıkla iptal oluyordu)
document.addEventListener("pointermove", (ev) => { if (Math.abs(ev.clientX - lpX) > 9 || Math.abs(ev.clientY - lpY) > 9) clearTimeout(lpT); }, { passive: true });
document.addEventListener("click", (ev) => { if (lpFired && ev.target.closest?.(".cd, .sps")) { ev.preventDefault(); ev.stopPropagation(); lpFired = false; } }, true);
document.addEventListener("contextmenu", (ev) => { if (ev.target.closest?.(".cd, .sps")) ev.preventDefault(); });
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
  const close = () => { o.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => o.remove(), 280); };
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
    navigator.geolocation.getCurrentPosition((p) => { DATA.me = { p: [p.coords.latitude, p.coords.longitude], t: Date.now() }; ok(DATA.me.p); }, no, { enableHighAccuracy: hi, timeout: hi ? 20000 : 12000, maximumAge: 5 * 60e3 });
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
  setTop(city); document.title = "Planım · Ne Var Ne Yok";
  const F = follows(), V2 = vfol(), { d: today } = nowIST();
  const rows = Object.entries(F).map(([id, f]) => {
    const c = f.city || city, e = c === DATA.city ? (DATA.bySlug.get(f.slug) || DATA.events.find((x) => NV.key(x.title) === f.tk && x.d === f.d) || null) : null;
    return { id, f, c, e, d: e?.d || f.d, t: e?.t ?? f.t ?? "" };
  }).filter((r) => r.d >= today).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "99").localeCompare(b.t || "99"));
  const dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7), wkS = dow === 6 || dow === 0 ? today : fri, wkE = dow === 0 ? today : addD(fri, 2);
  const wk = rows.filter((r) => r.d >= wkS && r.d <= wkE);
  const dayH = (d) => d === today ? "Bugün" : d === addD(today, 1) ? "Yarın" : dLong(d);
  const href = (r) => `#/${r.c}/e/${encodeURIComponent(r.e?.slug || r.f.slug)}`;
  const item = (r) => { const e = r.e || { title: r.f.title, venue: r.f.venue, d: r.d, t: r.t, img: r.f.img, cat: r.f.cat, status: r.f.status || "" };
    const st = e.status === "iptal" ? "İptal edildi" : e.status === "ertelendi" ? "Ertelendi" : e.status === "tukendi" ? "Tükendi" : "";
    return `<div class="pl-i${st && st !== "Tükendi" ? " x" : ""}"><span class="pl-t">${esc(r.t || "—")}</span><a class="pl-p" href="${href(r)}">${poster(e, { badge: false })}</a>
      <a class="pl-x" href="${href(r)}"><b>${esc(e.title)}</b><small>${esc(e.venue || "")}${r.c !== city ? " · " + esc(CITIES.find((c) => c.id === r.c)?.name || "") : ""}</small><small class="ut">${st ? `<em>${st}</em>` : esc(untilTxt(e))}</small></a>
      <span class="pl-a"><button type="button" data-cal="${esc(r.id)}" aria-label="Takvime ekle">${I.cal}</button><button type="button" data-unf="${esc(r.id)}" aria-label="Takipten çıkar">✕</button></span></div>`; };
  const days = [...new Set(rows.map((r) => r.d))];
  const next = rows[0];
  const VL = Object.entries(V2).map(([k, v]) => ({ k, v, L: v.city === DATA.city ? DATA.events.filter((x) => x.venue === v.name && live(x)) : null }));
  const plan = rows.length ? `
    ${next ? `<a class="pl-n" href="${href(next)}"><span class="pl-np">${poster(next.e || { title: next.f.title, img: next.f.img, cat: next.f.cat, d: next.d, venue: next.f.venue }, { badge: false })}</span><span class="pl-nx"><small>Sıradaki</small><b>${esc(next.e?.title || next.f.title)}</b><span>${dayH(next.d)}${next.t ? " · " + esc(next.t) : ""}</span><span>${esc(next.e?.venue || next.f.venue || "")}</span><em>${esc(untilTxt({ d: next.d, t: next.t }))}</em></span></a>` : ""}
    ${wk.length ? `<div class="pl-w">🎉 Bu hafta sonu <b>${wk.length} planın</b> var</div>` : ""}
    ${days.map((d) => { const L = rows.filter((r) => r.d === d), we = [0, 6].includes(pd(d).getDay()); return `<section class="pl-d"><h3>${dayH(d)}${we && d !== today && d !== addD(today, 1) ? "" : ""}<small>${GUN[pd(d).getDay()]}${we ? " · hafta sonu" : ""}</small></h3>${L.map(item).join("")}</section>`; }).join("")}
    <button type="button" class="pl-all" id="calAll">${I.cal}Hepsini takvimime ekle</button>`
    : `<div class="empty">Planın şimdilik boş. Bir etkinliğin sayfasında <b>Takip et</b>'e dokun; burada gün gün dursun, değişiklik olursa haber verelim.<p style="margin-top:18px"><a class="more" style="display:inline-flex;align-items:center" href="#/${city}/kesfet">Etkinliklere göz at</a></p></div>`;
  const ven = VL.length ? VL.map(({ k, v, L }) => `<div class="vn"><div class="vn-h"><span>${I.pin}</span><div><b>${esc(v.name)}</b><small>${esc(CITIES.find((c) => c.id === v.city)?.name || "")}${L ? ` · ${L.length} yaklaşan etkinlik` : ""}</small></div><button type="button" data-vx="${esc(k)}">Bırak</button></div>
      ${L && L.length ? `<div class="rs">${uniq(L, 10).map((e) => card(e, v.city)).join("")}</div>` : L ? `<p class="vn-e">Şu an listede etkinlik yok; eklenince haber veririz.</p>` : `<p class="vn-e"><a href="#/${v.city}/takip?m=1">${esc(CITIES.find((c) => c.id === v.city)?.name || "")} sayfasında gör →</a></p>`}</div>`).join("")
    : `<div class="empty">Henüz takip ettiğin mekân yok. Bir etkinliğin sayfasında, Konum bölümündeki <b>Mekânı takip et</b>'e dokun; o mekâna yeni etkinlik eklenince haber verelim.</div>`;
  V.innerHTML = `<div class="kh"><h1>Planım</h1><p>${rows.length} etkinlik · ${VL.length} mekân takipte</p></div>
  <div class="wrap"><div class="seg pl-seg" style="--n:2;--i:${tab ? 1 : 0}"><span class="thumb" aria-hidden="true"></span><button type="button" data-tab="0" class="${tab ? "" : "on"}">Planım</button><button type="button" data-tab="1" class="${tab ? "on" : ""}">Mekânlarım</button></div></div>
  <div class="wrap plan">${tab ? ven : plan}</div>
  <div class="wrap" style="margin-top:22px">${notifBox(city)}</div>${footer()}`;
  bindNotifBox(V, city);
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => { history.replaceState(null, "", `#/${city}/takip${b.dataset.tab === "1" ? "?m=1" : ""}`); viewPlan(city, b.dataset.tab === "1"); }));
  $$("[data-unf]").forEach((b) => b.addEventListener("click", () => { const F2 = follows(); delete F2[b.dataset.unf]; saveF(F2); haptic(6); viewPlan(city, tab); tabsUpdate([city, "takip"]); setTop(city); }));
  $$("[data-cal]").forEach((b) => b.addEventListener("click", () => { const r = rows.find((x) => x.id === b.dataset.cal); if (r) calAdd({ ...(r.e || { title: r.f.title, venue: r.f.venue, d: r.d, t: r.t, cat: r.f.cat, slug: r.f.slug }), city: r.c }); }));
  $("#calAll")?.addEventListener("click", () => calAdd(rows.map((r) => ({ ...(r.e || { title: r.f.title, venue: r.f.venue, d: r.d, t: r.t, cat: r.f.cat, slug: r.f.slug }), city: r.c }))));
  $$("[data-vx]").forEach((b) => b.addEventListener("click", () => { const V3 = vfol(); delete V3[b.dataset.vx]; vsave(V3); haptic(6); viewPlan(city, true); }));
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

boot().then(() => { shortcutBoot(); route(); if (DATA.ready) followBoot(); welcomeApp(); }).catch((err) => { V.innerHTML = `<div class="empty">Veriler yüklenemedi. Sayfayı yenile.</div>`; console.error(err); });
