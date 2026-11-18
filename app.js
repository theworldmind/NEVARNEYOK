/* NE VAR NE YOK · site (yeni tasarım, 15.11.2026'dan beri asıl site)
   Yönlendirme: #/ şehir seçimi · #/ankara şehir sayfası · #/ankara/kesfet?k=konser&t=bugun · #/ankara/e/<slug> etkinlik · #/ankara/sinema · #/ankara/film/<id>
   Kurallar (CLAUDE.md): fiyat yalnızca son 36 saatte doğrulandıysa; afiş kaynağından, değiştirilmeden, "Görsel: <kaynak>" ile; tanıtım metni yok (descOf). */
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
/* Kategori düzeltmesi (kullanıcı, 16.11.2026 23:47: "Konser" filtresinde Taş Boyama, kil çömlek atölyesi çıkıyordu).
   Bilet siteleri atölye, oyun ve tadım etkinliklerini de "müzik" bölümünde satabiliyor. Başlıkta müzik sözü yoksa başlık ve mekân
   etkinliğin gerçek türünü söyler: atölye/kurs/tadım → Atölye, sema → Sahne, tiyatro sahnesindeki oyun → Tiyatro, müze → Atölye. */
const FC_MUS = /konser|concert|senfoni|orkestra|resital|\bkoro|caz|jazz|rock|metal|tribute|akustik|muzik|muzig|music|sarki|turku|fasil|piyano|keman|gitar|tango|\bdj\b|\brap\b|\bband\b|quartet|quintet|\btrio\b|ensemble|filarmoni|candle|\blive\b|solist|vokal|\bezgi|nagme/;
const FC_ATL = /boyama|yapimi|comlek|seramik|boncuk|\bkil\b|ebru sanat|ebru atolye|mozaik|origami|^resim\b|resim atolye|tadim|yemekleri|mutfak|lazanya|workshop|\bkurs|egitimi?\b|seminer|webinar|\bseo\b|deneyim|degustasyon|atolye|soylesi|kitap kulubu|sofrasi/;
const FC_SAH = /\bsema\b|semazen|mevlevi/;
const FC_VT = /\bdt\b|devlet tiyatro|sehir tiyatro|oda tiyatrosu|kucuk tiyatro|kumpanya/, FC_VT2 = /tiyatro/, FC_VA = /muze|museum|atolye|mutfak|deneyim|flight|tatlari|turlar/;
const fixCat = (e, F) => { if (e.cat !== "konser" || e.catLocked) return e.cat; const t = F(e.title), v = F(e.venue).trim(); if (/muzikal/.test(t)) return "tiyatro";
  if (FC_MUS.test(t)) return "konser"; if (FC_ATL.test(t)) return "atolye"; if (FC_SAH.test(t)) return "sahne";
  if (FC_VT.test(v) || (FC_VT2.test(v) && (e.tickets || []).some((x) => /sanat/i.test(x.site || "")))) return "tiyatro"; if (FC_VA.test(v)) return "atolye"; return "konser"; };
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
/* Ağ dayanıklılığı (18.11.2026, kullanıcı: "uygulama bazen açılmıyor; haritada hata veriyor; bir daha olur mu korkuyorum"):
   her istek süre sınırlı (asılı kalan bağlantı uygulamayı açılışta bekletmez), kısa aralıkla yeniden denenir; olmazsa telefonun son indirdiği kopya kullanılır. */
window.NV_JS = 1;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const getTO = (u, opt, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(u, { ...opt, signal: c.signal }).finally(() => clearTimeout(t)); };
const stale = (u, ms = 2500) => getTO(u, { cache: "force-cache" }, ms).then((r) => (r.ok ? r.json() : null)).catch(() => null);
async function netJ(u, tries = 3, first = 8000) { for (let i = 0; i < tries; i++) { try { const r = await getTO(u, { cache: "no-cache" }, i ? 12000 : first); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch {} if (i < tries - 1) await wait(i ? 1500 : 500); } return null; }
const jget = (u) => netJ(u).then((v) => v ?? stale(u));
// açılış ağı beklemez: 2,5 sn içinde gelmezse son kopyayla açılır; hiç kopya yoksa en çok 5 sn beklenir, il listesi arkadan tamamlanır
const quick = (u) => { const n = netJ(u, 1, 5000).then((v) => v ?? stale(u, 1500)); return Promise.race([n, wait(2500).then(() => stale(u, 1500)).then((v) => v ?? n)]); };
const appUp = () => { window.NV_UP = 1; clearTimeout(window.NV_WD); document.getElementById("nvfail")?.remove(); };
const citiesLater = async () => { const c = await jget("data/cities.json"); if (c?.cities) { CIX = c.cities; if (!DATA.ready) route(); } else setTimeout(citiesLater, 8000); };
function loadFail(city) { const h = location.hash; V.innerHTML = `<div class="empty lfail"><b>Şu an ulaşamadık</b><small>Bağlantı gelince kendiliğinden açılacak.</small><button type="button" class="lcb">Tekrar dene</button></div>`; $(".lcb", V).addEventListener("click", () => route());
  const go = () => { removeEventListener("online", go); clearTimeout(t); if (location.hash === h && $(".lfail", V)) route(); }, t = setTimeout(go, 6000); addEventListener("online", go); }
async function boot() {
  const [cx, top] = await Promise.all([quick("data/cities.json"), quick("data/one-cikan.json")]);
  if (!cx?.cities) setTimeout(citiesLater, 1200);
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
  prefetch(city); const [ev, fl, bz] = await pre[city]; delete pre[city]; if (!ev) throw new Error("veri"); // boş liste göstermek yerine yeniden denenir
  DATA.base = ev?.baseline; DATA.updated = ev?.updated; DATA.films = fl; DATA.buzz = bz || {};
  const fresh = (x) => !!(x.price && !x.est && x.seen && x.seen !== DATA.base && (Date.now() - Date.parse(x.seen)) / 36e5 <= PRICE_MAX_H);
  const { d: today, hm } = nowIST();
  const cx = DATA.buzz.cx || {}, bzKey = (t) => fold(t).replace(/\s+/g, "");
  const seenSlug = new Map();
  DATA.events = (ev?.events || []).filter((e) => e.d >= today && !(e.d === today && e.t && e.t < hm && timeDiff(e.t, hm) > 120)).map((e) => {
    const o = { t: "", status: "", ...e }; o.cat = fixCat(o, fold);
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
  return `<div class="ph${e.img ? "" : " no"}" data-c="${esc(e.cat || "")}">${img}<div class="tp" lang="tr"><small>${esc(CATS[e.cat] || "Etkinlik")}</small><b>${esc(e.title)}</b><span class="tpw"><small>${esc(dShort(e.d))}${e.t ? " · " + esc(e.t) : ""}</small><small>${esc(e.venue || "")}</small><i class="tl2">nevarneyok</i></span></div>${badge && st ? `<span class="bd${e.status === "tukendi" ? "" : " x"}">${st}</span>` : ""}</div>`;
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

/* Düğme yazısı (18.11.2026 16:29, kullanıcı: "Bilet al dediği yer genel bir sayfa; gönderdiğimiz yer doğrudan bilet alınacak yer olmalı"):
   "Bilet al" yalnızca etkinliğin kendi satış sayfasına giden bağlantıda yazar. Sitenin ana sayfasına giden bağlantı "Siteye git", haber "Haberi oku",
   biletleri tükenmiş etkinlik "Tükendi". */
const homeUrl = (u) => { try { const x = new URL(u); return (x.pathname === "/" || x.pathname === "") && !x.search; } catch { return false; } };
const buyLbl = (e, t) => t?.src === "haber" ? "Haberi oku" : e.status === "tukendi" ? "Tükendi" : homeUrl(t?.url) || /google\.com\/search/.test(t?.url || "") ? "Siteye git" : "Bilet al";
// "…'a kadar" süren etkinlik (haber keşfi, `until`): "30 Kasım'a kadar" (Türkçe ek, ayın son harfine göre)
const kadarTxt = (d) => { const [, m, g] = d.split("-").map(Number), ay = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][m - 1]; return `${g} ${ay}'${/[aıou][^aeıioöuü]*$/.test(ay) ? "a" : "e"} kadar`; };
function card(e, city) {
  const np = e.tickets.filter((x) => x.price).length;
  const pr = e.price ? `<div class="pr">${TL(e.price)}'den${e.drop ? `<i class="dn">↓ %${e.drop}</i>` : np > 1 ? `<i>${np} sitede</i>` : ""}</div>` : e.free ? `<div class="pr">Ücretsiz</div>` : "";
  return `<a class="cd${live(e) ? "" : " off"}" href="#/${city}/e/${encodeURIComponent(e.slug)}">${poster(e)}${e._km != null ? `<span class="km">${I.pin}${kmTxt(e._km)}</span>` : ""}<div class="t">${esc(e.title)}</div><div class="m">${e.until && e.until > e.d ? kadarTxt(e.until) : rel(e.d)}${e.t ? " · " + esc(e.t) : ""}</div><div class="m2">${esc(e.venue || "")}</div>${pr}</a>`;
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
/* Çark tıkı (kullanıcı, 16.11.2026 10:30: "Apple saat sesi gibi, daha metalik"): iPhone'un saat/alarm çarkındaki gibi çok kısa, parlak, metalik "tık".
   Uyumsuz (metal gibi) üst tonlar 3,2–9,6 kHz'de birkaç milisaniyede söner + dar bantlı çok kısa çıtırtı + neredeyse duyulmayan alçak gövde.
   Her dişte perde çok az değişir (gerçek mekanizma gibi), art arda hızlı çevirince ses biraz kısılır (kulağı yormaz). */
let tickN = 0;
// (11:08) Apple çarkındaki gibi: çok kısa, temiz, hafif tahta-metal "tık" — keskin bir çıt (2 ms) + kısa tınlayan gövde (≈1,9 kHz, 7 ms); sert tiz yok
function tick() { const now = performance.now(); if (now - lastTick < 34) return; const fast = now - lastTick < 90; lastTick = now; buzz(3);
  if (!sesOn() || !acted) return;
  try { const A = ac(), t = A.currentTime, out = A.createGain(), j = 1 + ((tickN++ % 3) - 1) * .008; out.gain.value = fast ? .09 : .13; out.connect(A.destination);
    if (!NOISE) { const n = Math.round(A.sampleRate * .004); NOISE = A.createBuffer(1, n, A.sampleRate); const d = NOISE.getChannelData(0); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 4); }
    const ns = A.createBufferSource(), bp = A.createBiquadFilter(), ng = A.createGain(); ns.buffer = NOISE; bp.type = "bandpass"; bp.frequency.value = 3400 * j; bp.Q.value = .9; ng.gain.setValueAtTime(.9, t); ng.gain.exponentialRampToValueAtTime(.001, t + .0022); ns.connect(bp).connect(ng).connect(out); ns.start(t); ns.stop(t + .004);
    for (const [f, a, d] of [[1900, 1, .007], [3800, .32, .0035], [5600, .12, .002]]) { const o = A.createOscillator(), g = A.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f * j * 1.04, t); o.frequency.exponentialRampToValueAtTime(f * j, t + d);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(a, t + .0003); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(out); o.start(t); o.stop(t + d + .004); }
  } catch {} }
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
  { const sv = CITIES.find((c) => c.id === store.get("nvny-city") && c.live); $(".cback")?.remove();
    if (sv && /[?&]sec=1/.test(location.hash) && !document.querySelector(".intro")) { const b = document.createElement("a"); b.className = "cback"; b.href = `#/${sv.id}`; b.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(sv.name)}`; b.addEventListener("click", () => { snd.back?.(); haptic(5); }); document.body.append(b); addEventListener("hashchange", () => b.remove(), { once: true }); } }
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
  turAt("ana"); setTop(city); const cname = CITIES.find((c) => c.id === city)?.name || city; document.title = `${cname} · Ne Var Ne Yok`;
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
  <div class="qk2"><button type="button" id="tnt">${cgIcon("haftaiciaksam")}Bu akşam ne yapsak?</button><button type="button" id="nrb"><span class="cgi" style="background:#0a84ff"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="#fff"/></svg></span>Yakınımda</button></div>
  ${stories(featured, (e) => `#/${city}/e/${encodeURIComponent(e.slug)}`)}
  <form class="sbar" id="sf"><label class="sin">${I.srch}<input id="q" type="search" placeholder="Ara ya da yaz: cumartesi akşam konser…" enterkeyhint="search"></label><a class="fbtn" href="${k("f=1")}">${I.flt}<span class="fl">Filtrele</span></a></form>
  <div class="qk"><a href="${k("t=bugun")}">Bugün</a><a href="${k("t=yarin")}">Yarın</a><a href="${k("t=haftasonu")}">Hafta sonu</a><a href="#/${city}/sinema">Sinema</a>${Object.keys(CATS).filter((c) => c !== "sinema" && weekL.some((e) => e.cat === c)).map((c) => `<a href="${k("k=" + c)}">${esc(CATS[c])}</a>`).join("")}</div>
  ${notifAsk(city)}
  ${prefs() ? rail("Senin için", "İlgi alanlarına göre bu hafta", uniq([...weekL.filter((e) => e.img)].sort((a, b) => pscore(b) - pscore(a)), 16), city, k("sira=sen&t=hafta")) : ""}
  ${rail("Bu akşam", `${dLong(today)} · ${tonight.length} etkinlik`, uniq(tonight.filter((e) => e.img).sort((a, b) => (a.t || "").localeCompare(b.t || "")), 16), city, k("t=bugun"))}
  <div id="mid"></div>
  <div id="kac"></div>
  <div id="later"></div>${footer()}`;
  const fav = prefs()?.cats || [], order = ["konser", "tiyatro", "standup", "cocuk", "sahne", "atolye"].sort((a, b) => fav.includes(b) - fav.includes(a));
  const later = () => `${order.map((c) => rail(CATS[c], "Bu hafta", byCat(c), city, k("k=" + c))).join("")}
  ${rail("Festival", "Yaklaşan", pick(E.filter((e) => e.cat === "festival" && e.img), 12), city, k("k=festival"))}
  ${rail("Yeni eklenenler", "Son 3 günde", uniq(E.filter((e) => e.isNew && e.img).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || "")), 16), city, k("yeni=1"))}`;
  { const lt = $("#later"), idle = window.requestIdleCallback || ((f) => setTimeout(f, 120));
    // (11:08 akıcılık) ilk ekranda görünmeyen raflar açılıştan sonra, tarayıcı boşaldıkça teker teker eklenir (açılışta tek büyük iş olmasın)
    const md = $("#mid"), mids = [() => filmRail(city), () => rail("Hafta sonu", wkend.length + " etkinlik", pick(wkend.filter((e) => e.img), 16), city, k("t=haftasonu")),
      () => { const L = E.filter((e) => e.img && live(e) && e.tickets.filter((x) => x.price).length > 1).map((e) => { const p = e.tickets.filter((x) => x.price).map((x) => x.price); return [e, Math.max(...p) - Math.min(...p)]; }).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]).map(([e]) => e);
        return L.length >= 3 ? rail("Fiyatları karşılaştır", "Siteler arasında fiyatı farklı olanlar", uniq(L, 16), city, k("cok=1&sira=fiyat")) : ""; },
      () => { const L = E.filter((e) => e.drop && e.img).sort((a, b) => b.drop - a.drop); return L.length >= 3 ? rail("Fiyatı düşenler", "Son 7 günde doğrulanmış fiyatı düşenler", uniq(L, 16), city, k("dus=1")) : ""; },
      () => { const L = E.filter((e) => e.free && e.img && e.d <= addD(today, 13)); return L.length >= 3 ? rail("Ücretsiz", "Önümüzdeki iki hafta", uniq(L, 16), city, k("ucr=1")) : ""; }];
    const parts = [...order.map((c) => () => rail(CATS[c], "Bu hafta", byCat(c), city, k("k=" + c))),
      () => rail("Festival", "Yaklaşan", pick(E.filter((e) => e.cat === "festival" && e.img), 12), city, k("k=festival")),
      () => rail("Yeni eklenenler", "Son 3 günde", uniq(E.filter((e) => e.isNew && e.img).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || "")), 16), city, k("yeni=1"))];
    const step = () => { if (!document.body.contains(lt)) return; if (mids.length) { md.insertAdjacentHTML("beforebegin", mids.shift()()); return idle(step, { timeout: 400 }); } if (!parts.length) return; lt.insertAdjacentHTML("beforebegin", parts.shift()()); idle(step, { timeout: 600 }); };
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
  // Aranan sözcükle BAŞLAYAN adlar önce ("atların" → Atların Dansı, "Tatların…" sonra)
  if (q.length && !f.sira) { const pre = (e) => q.every((w) => (" " + e.q).includes(" " + w)) ? 0 : 1; L = [...L].sort((a, b) => pre(a) - pre(b)); }
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
    <h4>Kategori <em>birden çok seçebilirsin</em></h4><div class="tiles">${tileM("k", "sinema", "Film", CIC.sinema, (DATA.films?.films || []).filter((x) => Object.keys(x.s || {}).length).length + " film vizyonda")}${Object.entries(CATS).filter(([k]) => k !== "sinema").map(([k, l]) => tileM("k", k, l, CIC[k] || "", catN(k).toLocaleString("tr-TR") + " etkinlik")).join("")}</div>
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
// Apple tarzı simgeler (kullanıcı, 16.11.2026: "simgeler Apple profesyonelliğinde olsun"): renkli yuvarlak kare içinde beyaz çizim; emoji yok
const CG = {
  konser: ["#ff375f", "<path d=\"M9 17V6.5l9-2V15\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\" stroke-linejoin=\"round\"/><circle cx=\"7\" cy=\"17\" r=\"2.6\" fill=\"#fff\"/><circle cx=\"16\" cy=\"15\" r=\"2.6\" fill=\"#fff\"/>"],
  tiyatro: ["#bf5af2", "<path d=\"M4.5 5.5c3 1.3 6 1.3 9 0v5.2c0 3-2 5.3-4.5 5.3S4.5 13.7 4.5 10.7z\" fill=\"#fff\"/><path d=\"M11 9.4c2.8 1 5.6 1 8.5-.2v5c0 2.9-1.9 5.3-4.3 5.3-1.6 0-3-1-3.7-2.6\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.8\"/><circle cx=\"7.3\" cy=\"9\" r=\".9\" fill=\"#000\" opacity=\".35\"/><circle cx=\"10.7\" cy=\"9\" r=\".9\" fill=\"#000\" opacity=\".35\"/>"],
  standup: ["#ff9f0a", "<rect x=\"8.5\" y=\"3\" width=\"7\" height=\"11\" rx=\"3.5\" fill=\"#fff\"/><path d=\"M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.9\" stroke-linecap=\"round\"/>"],
  sahne: ["#ff6482", "<circle cx=\"12\" cy=\"5.2\" r=\"2\" fill=\"#fff\"/><path d=\"M12 8v6.5M12 10l-5-2.2M12 10l5-2.2M12 14.5l-3 6M12 14.5l3.5 5.5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\"/>"],
  cocuk: ["#30d158", "<circle cx=\"12\" cy=\"10\" r=\"6.5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M12 16.5v4.5\" stroke=\"#fff\" stroke-width=\"1.6\"/><path d=\"M9.5 7.5a3.4 3.4 0 0 1 2.5-1\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.6\" stroke-linecap=\"round\"/>"],
  festival: ["#64d2ff", "<path d=\"M12 3 4 9.5h16z\" fill=\"#fff\"/><path d=\"M5.5 10.5V20h13v-9.5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M10 20v-5h4v5\" fill=\"#fff\"/>"],
  parti: ["#5e5ce6", "<circle cx=\"12\" cy=\"13\" r=\"6.5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M5.8 11h12.4M5.8 15h12.4M12 6.5c-2.2 2-2.2 11 0 13M12 6.5c2.2 2 2.2 11 0 13\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.3\"/><path d=\"M12 3v3.5\" stroke=\"#fff\" stroke-width=\"1.8\"/>"],
  atolye: ["#ffcc00", "<path d=\"M12 4a8 8 0 1 0 0 16c1.4 0 2-1 1.4-2.1-.7-1.3.1-2.4 1.5-2.4H17a3 3 0 0 0 3-3c0-4.7-3.6-8.5-8-8.5z\" fill=\"#fff\"/><circle cx=\"8\" cy=\"11\" r=\"1.3\" fill=\"#ff9f0a\"/><circle cx=\"11\" cy=\"7.8\" r=\"1.3\" fill=\"#ff375f\"/><circle cx=\"15\" cy=\"8.6\" r=\"1.3\" fill=\"#0a84ff\"/>"],
  sinema: ["#ff453a", "<rect x=\"3.5\" y=\"7\" width=\"12.5\" height=\"10\" rx=\"2\" fill=\"#fff\"/><path d=\"M16 11l4.5-2.6v7.2L16 13z\" fill=\"#fff\"/>"],
  haftaiciaksam: ["#5e5ce6", "<path d=\"M15.5 4.5a7.5 7.5 0 1 0 4 12.6A6.2 6.2 0 0 1 15.5 4.5z\" fill=\"#fff\"/>"],
  haftasonugunduz: ["#ff9f0a", "<circle cx=\"12\" cy=\"12\" r=\"4.4\" fill=\"#fff\"/><g stroke=\"#fff\" stroke-width=\"1.8\" stroke-linecap=\"round\"><path d=\"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4\"/></g>"],
  haftasonuaksam: ["#ff6b35", "<path d=\"M3.5 17h17\" stroke=\"#fff\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M6.5 17a5.5 5.5 0 0 1 11 0z\" fill=\"#fff\"/><path d=\"M5 20.5h14\" stroke=\"#fff\" stroke-width=\"1.6\" stroke-linecap=\"round\" opacity=\".6\"/>"]
};
const cgIcon = (k) => CG[k] ? `<span class="cgi" style="background:${CG[k][0]}"><svg viewBox="0 0 24 24">${CG[k][1]}</svg></span>` : "";
const CIC = Object.fromEntries(Object.keys(CATS).map((k) => [k, cgIcon(k)]));
const WIC = { haftaiciaksam: cgIcon("haftaiciaksam"), haftasonugunduz: cgIcon("haftasonugunduz"), haftasonuaksam: cgIcon("haftasonuaksam") };
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
  // Haritalar uygulamaya yönlendirme yok (kullanıcı, 18.11.2026: "her şey bizim yerimizden"): konum bilinen mekân kendi haritamızda açılır, bilinmeyen haritamızda aranır
  const hereU = v?.lat ? `#/${city}/harita?yer=${v.lat},${v.lng}&ad=${encodeURIComponent(e.venue || "")}&alt=${encodeURIComponent(v.addr || v.ilce || "")}` : `#/${city}/harita?ara=${encodeURIComponent(e.venue || "")}`;
  V.innerHTML = `<article class="dt">${e.img ? `<div class="bk"><img src="${esc(e.img)}" alt="" referrerpolicy="no-referrer"></div>` : ""}<div class="in">
  <a class="back" href="javascript:history.length>1?history.back():location.assign('#/${city}')">${I.back}Geri</a>
  <div class="dg"><div class="dp">${poster(e, { badge: false, lazy: false })}</div><div>
    <div class="tags"><span>${esc(CATS[e.cat] || "Etkinlik")}</span>${e.genre && e.genre !== CATS[e.cat] ? `<span>${esc(e.genre)}</span>` : ""}${e.age ? `<span>${esc(String(e.age))}</span>` : ""}</div>
    <h1>${esc(e.title)}</h1>
    <div class="meta"><div>${I.cal}<span>${e.until && e.until > e.d ? kadarTxt(e.until) : dLong(e.d)}${e.t ? " · " + esc(e.t) : ""}${e.dur ? `<small>Süre ${esc(e.dur)}${e.door ? " · kapı " + esc(e.door) : ""}</small>` : e.door ? `<small>Kapı ${esc(e.door)}</small>` : ""}</span></div>
    <div>${I.pin}<span>${esc(e.venue || "")}${v?.addr ? `<small>${esc(v.addr)}</small>` : ""}${v?.lat && mesafeOn() ? `<small class="dst" id="dst"></small>` : ""}</span></div>
    ${e.price ? `<div>${I.tag}<span>${TL(e.price)}'den başlayan fiyatlarla<small>${T.filter((x) => x.price).length > 1 ? T.filter((x) => x.price).length + " sitede satışta" : "Satış sitesinde doğrulandı"}</small></span></div>` : ""}</div>
    ${st ? `<div class="stb">${st}.${e.stNews ? " Haberlere göre: " + e.stNews.slice(0, 2).map((x) => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${esc((DATA.buzz.names || {})[x[0]] || x[0])} haberi ↗</a>`).join(" ") + " · Bilet sitesinden de kontrol edin." : ""}</div>` : ""}
    ${T.length && live(e) ? `<a class="buy" href="${esc((best || T[0]).url)}" target="_blank" rel="noopener" data-buy="${esc((best || T[0]).site)}">${buyLbl(e, best || T[0])} · ${esc((best || T[0]).site.replace(/ haberi$/, ""))}${best ? ` · ${TL(best.price)}` : ""}</a>` : ""}
    ${T.length ? `${tix}<p class="chk">${checked ? `Fiyatlar satış sitelerinde ${ago(checked)} kontrol edildi. ` : ""}Hizmet bedeli ve son fiyat siteye göre değişebilir; satın alma ve iade bileti satan sitenin kurallarına tabidir.</p>` : ""}
    <div class="shr"><button type="button" id="flw" class="flw${isF(e) ? " on" : ""}">${isF(e) ? I.bellOn + "Takip ediliyor" : I.bell + "Takip et"}</button><button type="button" id="cal">${I.cal}Takvime ekle</button><button type="button" id="inv" class="invb">✉️ Davet et</button><button type="button" id="shr">${I.share}Paylaş</button></div>
    ${aName(e) ? `<button type="button" class="afl${afol()[NV.akey(e.title)] ? " on" : ""}" id="afl">${cgIcon("standup")}<span><b>${esc(aName(e))}</b><small>${afol()[NV.akey(e.title)] ? "Yeni tarihleri takipte ✓" : "Yeni tarihlerini takip et · her ilde"}</small></span></button>` : ""}<div id="oth"></div>
    ${live(e) ? `<p class="flh">Takip edersen fiyatı düştüğünde, iptal, erteleme, saat, tarih ya da yer değişikliğinde ve etkinlikten bir gün önce haber veririz.</p>` : ""}
    <section class="sec"><h3>Bu etkinlik hakkında</h3>${infoBlock(e, city)}<a class="wrong" href="${wrongMail(e, city)}">Bir yanlış mı var? Bize yaz →</a></section>
    <div id="wxb"></div>
    <section class="sec"><h3>Konum</h3><div class="mapc">${v?.lat ? `<div class="map" id="map"></div>` : ""}<div class="ad">${I.pin}<span><b>${esc(e.venue || "")}</b><small>${esc(v?.addr || (v?.ilce ? v.ilce + ", " : "") + (CITIES.find((c) => c.id === city)?.name || ""))}</small></span><button type="button" id="vfl" class="vfl${vfol()[vkey(city, e.venue)] ? " on" : ""}">${vfol()[vkey(city, e.venue)] ? I.bellOn + "Mekân takipte" : I.pin + "Mekânı takip et"}</button></div><div class="bt">${v?.lat ? `<button type="button" class="p" id="rte">${I.dir}Yol tarifi</button>` : `<a class="p" href="${hereU}">${I.dir}Yol tarifi</a>`}<a href="${hereU}">${I.pin}Haritada aç</a></div></div></section>
  </div></div></div></article>
  ${same.length ? rail("Aynı mekânda", e.venue, same, city, `#/${city}/kesfet?m=${encodeURIComponent(e.venue)}`) : ""}
  ${sim.length ? rail("Bunlar da ilgini çekebilir", CATS[e.cat] || "", sim, city, `#/${city}/kesfet?k=${e.cat}`) : ""}
  ${footer()}`;
  $("#shr").addEventListener("click", () => shareEv(e, city));
  $("#inv").addEventListener("click", () => inviteEv(e, city));
  $("#cal").addEventListener("click", () => calAdd({ ...e, city }));
  $("#vfl").addEventListener("click", (ev) => toggleVenue(e, city, ev.currentTarget));
  $("#flw").addEventListener("click", () => toggleFollow(e, city));
  $("#afl")?.addEventListener("click", (ev) => toggleArtist(e, city, ev.currentTarget));
  otherCities(e, city);
  wxCard(e, city, $("#wxb"));
  if (v?.lat) { mapInit(v.lat, v.lng); $("#rte").addEventListener("click", () => routeSheet(e, v, city)); const d = $("#dst"); if (d) distFill(v, d); }
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
  turAt("sinema"); setTop(city); document.title = `Sinema · ${CITIES.find((c) => c.id === city)?.name} · Ne Var Ne Yok`;
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
    if (r.periodicSync) { try { const st = await navigator.permissions.query({ name: "periodic-background-sync" }); if (st.state === "granted") await r.periodicSync.register("nvny-takip", { minInterval: 3 * 36e5 }); /* gün içinde öneriler için daha sık iste; telefon kendi sınırını uygular */ } catch {} }
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
  kaynaklar: ["Veri kaynakları", `<p>Etkinlikler bilet sitelerinin, kurumların, mekânların ve belediyelerin herkese açık sayfalarından toplanır.</p><p>Hava durumu: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0). Harita: © OpenStreetMap katkıcıları. Davet önizlemelerindeki bina yükseklikleri: GlobalBuildingAtlas (Zhu ve ark., 2025; CC BY-NC 4.0, makine öğrenmesiyle tahmin edilmiştir). Uygulama içi yol tarifi: OpenStreetMap verisiyle FOSSGIS yol sunucusu.</p><p>Toplama her sabah yeniden yapılır; öğleden sonra da bilinen etkinliklerin fiyat ve satış durumu bir kez daha kontrol edilir. Bir site o gün okunamazsa son doğrulanmış bilgisi korunur. Tarihi geçen etkinlikler kendiliğinden kaldırılır. Elle eklenen etkinlikler de aynı listeye katılır.</p><p>Gösterilen fiyat, o sitede listelenen en uygun kategoridir. Fiyat, seans ve satış durumu satış sitesinde değişebilir; satın almadan önce bilet sayfasını kontrol et.</p><p>Etkinlik sayfasındaki harita OpenStreetMap'ten gelir (© OpenStreetMap katkıcıları); mekân konumları OpenStreetMap Nominatim ile bulunur. Yol tarifi ve harita uygulamanın içinde açılır. Arazi yüksekliği Terrain Tiles (Mapzen, AWS) verisinden gelir; 3B cepheler temsilîdir. Mekân ve yer adlarının bir kısmı Overture Maps Foundation açık verisinden gelir (CDLA Permissive 2.0).</p>`],
  gizlilik: ["Gizlilik", `<p>Bu site hesap açtırmaz, form doldurtmaz ve kişisel veri toplamaz. Çerez ya da reklam takibi kullanmaz.</p><p>Bir yere Beraber daveti gönderdiğinde, bağlantı önizlemesi için yalnızca o yerin adı, türü ve 3B görseli Cloudflare üzerindeki depomuzda en çok 60 gün tutulur. Davet cümlen, tarih ve saat oraya gönderilmez; ev ve kayıtlı özel yerler için hiçbir şey yüklenmez.</p><p>Kaç kişinin siteye girdiğini görmek için çerezsiz bir sayaç (GoatCounter) kullanılır: kimliğin, IP adresin ya da cihaz kimliğin saklanmaz; yalnızca girilen sayfa, gelinen site ve tarayıcı türü gibi kimseyi tanımlamayan toplam sayılar tutulur. Uygulamayı indirme, takip etme, bildirimleri açma ve "Bilet al" düğmelerine kaç kez basıldığı da aynı şekilde yalnızca sayı olarak tutulur.</p><p>Seçtiğin şehir, ilgi alanların (Kişiselleştir) ve takip ettiğin etkinlikler yalnızca kendi telefonunda ya da tarayıcında saklanır; sunucuya gönderilmez. Tarayıcı verilerini silerek bunları kaldırabilirsin.</p><p>Bildirimler isteğe bağlıdır ve yalnızca sen izin verirsen açılır. Bildirimler telefonun kendisinde, sitemizin herkese açık etkinlik listesiyle karşılaştırılarak oluşturulur; hiçbir bildirim sunucusu ya da kimlik kullanılmaz, kimin neyi takip ettiğini biz bilmeyiz. Bildirimleri tarayıcı ya da telefon ayarlarından istediğin an kapatabilirsin.</p><p>Etkinlik sayfasındaki harita için tarayıcın OpenStreetMap'ten harita parçalarını indirir; senin konumun gönderilmez. Uzaklık ("Senden 3,4 km") yalnızca telefonunda hesaplanır. Hava durumu için Open-Meteo'ya yalnızca ilin ya da mekânın koordinatı gönderilir, senin konumun değil. Haritada bir yer adı aradığında (ör. "Yenimahalle") yalnızca yazdığın ad OpenStreetMap tabanlı Photon arama servisine gönderilir. Uygulama içinde yol tarifi istersen, yolu hesaplamak için yalnızca başlangıç ve varış noktası OpenStreetMap topluluğunun (FOSSGIS) yol sunucusuna gönderilir; biz saklamayız. Bilet sitelerine gittiğinde o sitelerin kendi gizlilik kuralları geçerlidir.</p>`],
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
  const cur = !P[1] ? "home" : P[1] === "kesfet" ? "kesfet" : P[1] === "sinema" || P[1] === "film" ? "sinema" : P[1] === "takip" ? "takip" : P[1] === "harita" ? "harita" : "";
  const href = { home: `#/${city}`, kesfet: `#/${city}/kesfet`, sinema: `#/${city}/sinema`, harita: `#/${city}/harita`, takip: `#/${city}/takip` };
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
    if (need) { const nm = CITIES.find((c) => c.id === P0)?.name || ""; V.innerHTML = `<section class="city sk"><h1 style="--L:${[...nm].length}">${esc(nm)}</h1><div class="st"><span class="skl" style="width:120px"></span><span class="skl" style="width:90px"></span></div></section><div class="skr">${'<div class="skc"></div>'.repeat(3)}</div><div class="skr">${'<div class="skc"></div>'.repeat(3)}</div>`; setTop(P0); loadCity(P0).then(() => { cityLoads[P0] = null; route(); followBoot(); }).catch(() => loadFail(P0)); return; } }
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
    else if (P[1] === "takip") viewPlan(city, Q.d ? 2 : !!Q.m);
    else if (P[1] === "ayarlar") viewAyarlar(city, P[2]);
    else if (P[1] === "yilim") viewYil(city);
    else if (P[1] === "harita") viewHarita(city, Q);
    else viewCity(city);
  }
  V.dataset.h = location.hash;
  // iPhone gibi: ileri sağdan, geri soldan (derinlikli), sekmeler arası anında; kenardan kaydırarak geri dönüldüyse canlandırma yok
  const isRoot = !P.length || P[0] === "bilgi" || (P.length === 1) || (P.length === 2 && ["kesfet", "sinema", "takip", "harita"].includes(P[1]) && !qs);
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
/* ---------- Paylaş ve Davet et (kullanıcı isteği, 16.11.2026 14:51–14:58: "önizleme güzel olsun, bilgi versin; afiş olacak, biz de olacağız; davet düğmesi") ----------
   Kısa bağlantılar: /e/<kod> paylaşım, /d/<kod> davet (NV.scode; sayfaları share-pages.mjs üretir). Mesajlar emojili ve satır satır;
   fiyat yalnızca son 36 saatte doğrulanmışsa yazılır (önizlemede hiç yazılmaz). Davette kişi hazır cümlelerden birini seçer ya da kendisi yazar. */
const SITE = "https://nevarneyok.net.tr";
const shareUrl = (e, city) => `${SITE}/e/${NV.scode(city, e.slug)}`;
// Hazır cümleler bağlantıda kısa kodla gider (?c=g3 / ?c=konser); yalnızca kendi yazılan cümle ?s= ile (bağlantı kısa ve temiz kalsın). Liste davet.js'te de aynı.
const invQ = (e, line) => { const g = INV_G.indexOf(line); return g >= 0 ? "c=g" + g : line === INV_C[e.cat] ? "c=" + e.cat : "s=" + encodeURIComponent(line); };
const inviteUrl = (e, city, line, mk) => `${SITE}/d/${NV.scode(city, e.slug)}${line ? "?" + invQ(e, line) + (mk ? "&k=1" : "") : ""}`;
const CEMO = { konser: "🎶", tiyatro: "🎭", standup: "😂", sahne: "🩰", cocuk: "🎈", festival: "🎉", parti: "🪩", atolye: "🎨", sinema: "🎬" };
const dLongTR = (d) => { const x = pd(d); return `${x.getDate()} ${AY[x.getMonth()]} ${GUN[x.getDay()]}`; };
const kalan = (d) => { const n = Math.round((pd(d) - pd(nowIST().d)) / 864e5); return n <= 0 ? "bugün" : n === 1 ? "yarın" : n < 31 ? `${n} gün sonra` : ""; };
const placeOf = (e, city) => { const v = vOf(e.venue); return [e.venue, v?.ilce, CITIES.find((c) => c.id === city)?.name].filter(Boolean).filter((x, i, A) => A.indexOf(x) === i).join(", "); };
function shareText(e, city, line, mk) { // mk: kalpli mektup (kullanıcı seçerse); normalde sade zarf ✉️
  const ic = mk ? "💌" : "✉️";
  if (line) return `${ic} *${line}*\n*${e.title}* · ${dLongTR(e.d)}${e.t ? " · " + e.t : ""}\n${inviteUrl(e, city, line, mk)}`;
  const k = kalan(e.d), fp = e.tickets?.filter((x) => x.price).map((x) => x.price), pr = fp?.length ? Math.min(...fp) : 0;
  return [line ? `${ic} *${line}*` : "", `${CEMO[e.cat] || "🎟️"} *${e.title}*`, `📅 ${dLongTR(e.d)}${e.t ? " · " + e.t : ""}${k ? ` (${k})` : ""}`, `📍 ${placeOf(e, city)}`,
    !line && pr ? `🎟️ ${TL(pr)}'den${fp.length > 1 ? ` · ${new Set(e.tickets.filter((x) => x.price).map((x) => x.site)).size} sitede` : ""}` : "",
    "", line ? `${ic} Davetin burada: ${inviteUrl(e, city, line, mk)}` : `🔍 Ne Var Ne Yok'ta aç: ${shareUrl(e, city)}`].filter((x, i) => x !== "" || i === 5).join("\n");
}
// Davet cümleleri — değiştirirsen davet.js'teki kopyayı da değiştir (kullanıcıyla 14:57–14:58'de seçildi: ölçülü, sıcak; kategoriye uygun olanlar başta)
const INV_G = ["Beraber gidelim mi?", "Buna gitmeye ne dersin?", "Güzel bir etkinlik buldum, gelir misin?", "Bu tarih için bir planım var, katılır mısın?", "Birlikte gidersek güzel olur", "Bu akşamki plan: burası. Var mısın?", "Hafta sonu için güzel bir fikir", "Gidiyor muyuz?"];
const INV_C = { konser: "Bu konsere beraber gidelim mi?", tiyatro: "Bu oyunu birlikte izleyelim mi?", standup: "Güzel bir gösteri var, gelir misin?", sinema: "Bu filme beraber gidelim mi?", cocuk: "Çocuklarla gidebileceğimiz güzel bir etkinlik", sahne: "Bu gösteriye birlikte gidelim mi?", festival: "Bu festivale beraber gidelim mi?", atolye: "Birlikte gidelim mi, ilgini çekebilir" };
const INV_E = ["✉️", "🎟️", "✨", "🗓️", "🙌", "📍", "🎉", "✅"];
function ogCanvas(e, city, line) { // davet/paylaşım görseli: afiş telefonda çizilir; izin vermeyen sitelerde yayında hazırlanmış görsel
  const ev = { title: e.title, when: `${dLongTR(e.d)}${e.t ? " · " + e.t : ""}`, venue: e.venue || "", cityName: CITIES.find((c) => c.id === city)?.name || "", cat: e.cat, imgBy: e.imgBy || "", base: "" };
  return paylasJS().then(async () => { let im = null; if (e.img) { try { im = await NVS.img(e.img, true); } catch {} }
    if (!im && e.img) { try { const r = await fetch(`s/o/${NV.scode(city, e.slug)}.jpg`, { cache: "no-cache" }); if (r.ok && !line) return await r.blob(); } catch {} }
    const cv = await NVS.og(ev, im, line); return await new Promise((ok) => cv.toBlob(ok, "image/jpeg", .9)); });
}
/* ---------- Beraber: haritadaki her yere "beraber gidelim mi?" daveti (18.11.2026). Sunucu yok: bilgi bağlantının # kısmında gider; gönderilenler ve cevaplar yalnızca telefonda ---------- */
let NVBp = null, YGp = null;
const bjs = () => NVBp ||= window.NVB ? Promise.resolve(window.NVB) : loadJS("/beraber.js?v=14", 15000).then(() => window.NVB).catch((e) => { NVBp = null; throw e; });
const ygIdx = () => YGp ||= jget("/idx/yg.json").then((x) => x || []);
const bdL = () => jsGet("nvny-davetler", []), bdS = (L) => store.set("nvny-davetler", JSON.stringify(L.slice(0, 40)));
const bWhen = (w, h) => [w ? dLongTR(w) : "", h || ""].filter(Boolean).join(" · ");
const bText = (x, url) => `${x.k ? "💌" : "✉️"} *${x.c}*\n*${x.n}*${bWhen(x.w, x.h) ? " · " + bWhen(x.w, x.h) : ""}\n${url}`;
/* Beraber önizlemesi (18.11.2026): telefon yerin 3B görselini o an çizer, gönderirken Cloudflare'daki küçük depoya koyar; WhatsApp davete özel sayfadan adı ve görseli okur. Özel yerler hiç yüklenmez, hata olursa genel davet bağlantısı kullanılır. */
const PVW = "https://nvny-yer.berkaytoruntga.workers.dev", pvQ = (v) => new URLSearchParams({ lat: (+v.a + .0017).toFixed(4), lng: v.o, t: v.t, n: v.n }).toString(), pvWait = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
const adaJ = () => window.NVA ? Promise.resolve() : loadJS("/ada.js?v=24", 20000);
/* Haritadaki "Önizle": seçilen yer ve çevresi haritadan kopup yükselir; Kapat ile yerine oturur */
let adaOn = null;
const adaYv = async (c) => { const cs = new Set(); for (const a of [-.008, .008]) for (const o of [-.01, .01]) cs.add(`${Math.floor((c[1] + a) * 10)}_${Math.floor((c[0] + o) * 10)}`); return (await Promise.all([...cs].map((k) => fetch(`/yv/${k}.json`).then((r) => r.ok ? r.json() : []).catch(() => [])))).flat(); };
const adaPre = () => { bjs().then((B) => Promise.all([adaJ().then(() => window.NVA.three()), mlgl().then(() => B.bina(window.maplibregl)), fetch(B.STYLE)])).catch(() => {}); };
async function adaOpen(map, ll, name) { if (adaOn || !map) return; const box = map.getContainer(), bar = document.createElement("div"); bar.className = "adab wait"; bar.innerHTML = `<b>Önizleme</b><button type="button">Kapat</button>`; const ld = document.createElement("div"); ld.className = "adl"; ld.innerHTML = `<div class="adlc"><small>ÖNİZLEME YÜKLENİYOR</small><b>${esc(name || "")}</b><i></i></div>`; const phase = (p) => ld.querySelector(".adlc i").style.setProperty("--p", p), ldOff = () => { ld.classList.add("off"); setTimeout(() => ld.remove(), 620); }; document.body.append(bar); adaOn = bar; document.body.classList.add("ada-on"); haptic(6); snd.sel?.(); let c = [+ll[1], +ll[0]], A = null, D = null, off = false; const prev = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }, end = () => { bar.remove(); document.body.classList.remove("ada-on"); adaOn = null; map.easeTo({ ...prev, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 1000 }); }, settled = (ms) => new Promise((r) => { const t = setTimeout(r, ms); map.once("idle", () => { clearTimeout(t); r(); }); }), W = () => box.clientWidth || innerWidth, H = () => box.clientHeight || innerHeight; bar.querySelector("button").onclick = () => { if (off) return; off = true; snd.sel?.(); D?.remove(); ldOff(); if (!A) return end(); A.orbit(false); A.settle(1900, () => { A.destroy(); end(); }); map.easeTo({ center: c, zoom: 15.6, pitch: 25, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 2000 }); };
  try { map.easeTo({ center: c, zoom: 14.2, pitch: 40, bearing: -22, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 900 }); const [B, L] = await Promise.all([bjs(), adaYv(c), adaJ()]).then(([b, y]) => [b, y]); await window.NVA.three(); await new Promise((r) => setTimeout(r, 920)); await window.NVA.ready(map, 2200); if (off) return; phase(.36); let P = window.NVA.resolve(map, c, name, L); if (Math.hypot((P.c[0] - c[0]) * 85000, (P.c[1] - c[1]) * 111000) > 45) { c = P.c; map.jumpTo({ center: c }); await window.NVA.ready(map, 1500); if (off) return; P = window.NVA.resolve(map, c, name, L); c = P.c; } await Promise.race([B.heights(map), new Promise((r) => setTimeout(r, 1400))]); if (off) return; phase(.68); A = await window.NVA.create(map, maplibregl, { c, b: P.b, g: P.g, n: name, maxT: B.lite() ? 300 : 700 }); if (off) { A.destroy(); return; } A.addLabels(L); phase(1); setTimeout(() => ld.classList.add("txtoff"), 240); bar.classList.remove("wait"); bar.querySelector("b").textContent = name || "Önizleme"; A.play(W(), H(), 118, () => { ldOff(); if (!off) A.orbit(true); }); D = window.NVA.dial(map, { bottom: 34, tick, onTouch: () => A.orbit(false) }); } catch { if (!off) { off = true; ldOff(); toast("Önizleme şu an açılamadı.", 2600); end(); } } }
async function pvDraw(v, B) {
  const T0 = performance.now(), mk = (n) => { (window.__pvT ||= []).push(n + ":" + Math.round(performance.now() - T0)); }; await mlgl(); const ml = window.maplibregl, W = 720, H = 900, c = [v.o, v.a], g = { type: "Point", coordinates: c }, lite = B.lite(), box = document.createElement("div"); box.setAttribute("aria-hidden", "true"); box.style.cssText = `position:fixed;left:-${W + 300}px;top:0;width:${W}px;height:${H}px;pointer-events:none`; document.body.append(box); let m;
  try {
    const on = (ev, ms, must) => new Promise((ok, no) => { const t = setTimeout(() => must ? no(new Error(ev)) : ok(), ms); m.once(ev, () => { clearTimeout(t); ok(); }); }), J = Promise.all([adaJ().then(() => window.NVA.three()), adaYv(c)]), U = H - 170, [st, hb] = await Promise.all([fetch(B.STYLE).then((r) => r.json()), B.bina(ml)]);
    m = new ml.Map({ container: box, style: hb ? B.useB(B.plain(st, "koyu")) : B.plain(st, "koyu"), center: c, zoom: 14.2, pitch: 0, bearing: 0, attributionControl: false, interactive: false, preserveDrawingBuffer: true, antialias: !lite, fadeDuration: 0, pixelRatio: 1 }); B.attach(m);
    await on("load", 12000, true); mk("yuk"); const [, YL] = await J; mk("kod"); if (!await window.NVA.ready(m, 6500)) throw new Error("karo"); mk("karo"); let P = window.NVA.resolve(m, c, v.n, YL); if (Math.hypot((P.c[0] - c[0]) * 85000, (P.c[1] - c[1]) * 111000) > 45) { m.jumpTo({ center: P.c }); await window.NVA.ready(m, 2200); P = window.NVA.resolve(m, P.c, v.n, YL); } await pvWait(B.heights(m), 1000); const A = await window.NVA.create(m, ml, { c: P.c, b: P.b, g: P.g, n: v.n, still: true, maxT: lite ? 200 : 420 }); mk("kur " + (A.count.ms || "")); A.addLabels(YL); m.jumpTo(A.view(W, H, 170)); await window.NVA.ready(m, 1300); mk("kam"); A.set(1); await on("render", 1500); mk("ciz"); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all([document.fonts.load('900 38px Archivo'), document.fonts.load('500 18px "Inter Tight"')]).catch(() => {}); const logo = new Image(); logo.src = "/brand/logo-cam.png"; await logo.decode().catch(() => {});
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d"); x.drawImage(m.getCanvas(), 0, 0, W, H); const vg = x.createRadialGradient(W / 2, H * .42, H * .3, W / 2, H * .42, H * .78); vg.addColorStop(0, "rgba(6,6,10,0)"); vg.addColorStop(1, "rgba(6,6,10,.4)"); x.fillStyle = vg; x.fillRect(0, 0, W, H);
    const gr = x.createLinearGradient(0, 0, 0, H); [[0, "rgba(10,10,16,0)"], [.68, "rgba(10,10,16,0)"], [.86, "rgba(10,10,16,.86)"], [1, "#0a0a10"]].forEach(([a, b]) => gr.addColorStop(a, b)); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    const L = 26, Y = H - 150, Bw = W - 52, Bh = 106; x.beginPath(); x.roundRect(L, Y, Bw, Bh, 26); x.fillStyle = "rgba(30,30,42,.88)"; x.fill(); x.strokeStyle = "rgba(255,255,255,.14)"; x.stroke();
    let tx = L + 24; if (logo.naturalWidth) { const h = 104 * logo.naturalHeight / logo.naturalWidth; x.drawImage(logo, tx, Y + (Bh - h) / 2, 104, h); tx += 124; x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(tx, Y + 20, 1, Bh - 40); tx += 20; }
    const max = L + Bw - 24 - tx, fit = (t, font) => { x.font = font; let s = t; while (s.length > 1 && x.measureText(s + (s === t ? "" : "…")).width > max) s = s.slice(0, -1); return s === t ? t : s.trimEnd() + "…"; }; try { x.fontStretch = "condensed"; } catch {} const up = v.n.toLocaleUpperCase("tr"); let fs = 38; x.font = `900 ${fs}px Archivo,sans-serif`; while (fs > 26 && x.measureText(up).width > max) { fs -= 2; x.font = `900 ${fs}px Archivo,sans-serif`; }
    x.fillStyle = "#fff"; x.textBaseline = "alphabetic"; x.fillText(fit(up, `900 ${fs}px Archivo,sans-serif`), tx, Y + 52); try { x.fontStretch = "normal"; } catch {} const sub = v.s || B.T[v.t]?.l || "Yer"; x.fillStyle = "rgba(235,235,245,.72)"; x.fillText(fit(sub, '500 18px "Inter Tight",system-ui,sans-serif'), tx, Y + 82); x.fillStyle = "rgba(235,235,245,.5)"; x.font = '500 12px "Inter Tight",system-ui,sans-serif'; x.fillText("© OpenStreetMap · OpenMapTiles · GlobalBuildingAtlas · Terrain Tiles · nevarneyok.net.tr", 30, H - 17);
    const jpg = (k) => new Promise((r) => cv.toBlob(r, "image/jpeg", k)); let b = await jpg(.74); if (b && b.size > 235 * 1024) b = await jpg(.58); if (!b || b.size > 255 * 1024) throw new Error("boyut"); mk("jpg"); return b;
  } finally { try { m?.remove(); } catch {} box.remove(); }
}
async function pvMake(v, B) { const r = await fetch(`${PVW}/var?${pvQ(v)}`, { cache: "no-store" }); if (!r.ok) throw new Error("var"); const j = await r.json(); return j.var ? { id: j.id, has: true } : { id: j.id, blob: await pvDraw(v, B) }; }
const pvPut = (v, blob) => fetch(`${PVW}/yukle?${pvQ(v)}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob }).then((r) => r.ok).catch(() => false);
async function placeInvite(p) {
  haptic(6); snd.sheet?.(); let B; try { B = await bjs(); } catch { toast("Davet şu an açılamadı, tekrar dene.", 3000); return; }
  const ll = p.ll || null, priv = !!p.priv, t = priv ? "ozel" : p.t || B.typeOf(`${p.k || ""} ${p.s || ""} ${p.n || ""}`), T = B.T[t], { d: today } = nowIST(), dow = pd(today).getDay(), sat = addD(today, (6 - dow + 7) % 7 || 7);
  let name = priv ? "Buluşma yeri" : p.n && p.n !== "Seçilen yer" ? p.n : "", w = p.w || "", h = p.h || "", cur = T.c[(Math.random() * T.c.length) | 0], mk = false, base = `/y/t/${t}/`, img = `/yg/t/${t}.jpg`, near = null, pv = null, pvk = "", pvp = null, pvT = 0, pvEnd = false, pvBusy = false;
  if (ll && !priv) { const Y = await ygIdx().catch(() => []); let bs = null, bd = 9; for (const x of Y) { const k = km(ll, [x[1], x[2]]); if (k < bd) { bd = k; bs = x; } } if (bs && bd < .15) { const same = fold(bs[3]) === fold(name) || bd < .03; near = !same; base = same ? `/y/${bs[0]}/` : `/y/${bs[0]}/n/`; img = `/yg/${bs[0]}.jpg`; if (same && !name) name = bs[3]; } }
  const chips = [["", "Zaman belirtme"], [today, "Bugün"], [addD(today, 1), "Yarın"], [sat, "Hafta sonu"]], sh = sheet(`<div class="pn ivp" role="dialog" aria-label="Beraber gidelim mi?"><div class="hd"><span class="rth"><b>Beraber gidelim mi? ✉️</b><small id="bvn"></small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2">
    <div class="ivv"><div class="ivb"><div class="ivc"><div class="ivi sk" id="ivi"></div><div class="ivm"><b id="bvt"></b><small>nevarneyok.net.tr</small></div></div><p class="ivx" id="ivx"></p></div></div>
    ${priv ? `<p class="bvw">Yerin adı gitmez, ama haritadaki konumu bağlantıyı alan kişi görür.</p>` : ""}${!priv && !name ? `<label class="fvi ivw"><span>📍</span><input id="bvy" maxlength="50" placeholder="Yerin adını yaz" enterkeyhint="done"></label>` : ""}
    ${p.lock ? "" : `<h4>Ne zaman?</h4><div class="bvc" id="bvc">${chips.map(([v, l]) => `<button type="button" data-w="${v}" class="${v === w ? "on" : ""}">${l}</button>`).join("")}</div><label class="fvi ivw" id="bvh" ${w ? "" : "hidden"}><span>🕐</span><input id="bvi" type="time" value="${esc(h)}" aria-label="Saat"></label>`}
    <h4>Davet cümlen</h4><div class="ivl" id="ivl">${T.c.map((x, i) => `<button type="button" data-i="${i}" class="${x === cur ? "on" : ""}"><span>${T.e}</span>${esc(x)}</button>`).join("")}</div>
    <div class="seg ivk" id="ivk" style="--n:2;--i:0"><span class="thumb"></span><button type="button" class="on" data-k="0" aria-label="Zarf">✉️</button><button type="button" data-k="1" aria-label="Kalpli zarf">💌</button></div><label class="fvi ivw"><span>✍️</span><input id="ivt" maxlength="70" placeholder="Ya da kendin yaz…" enterkeyhint="done"></label>
    <button type="button" class="ok ivgo" id="ivgo">Davet et ✉️</button><p class="shn">Arkadaşın yeri canlı 3B haritada görür, yol tarifi alır ve cevabını sana gönderir.</p></div></div>`, "mn");
  const q = (s) => sh.querySelector(s), id = Math.random().toString(36).slice(2, 9), x = () => ({ n: B.clean(name, 60) || T.l, s: priv ? "" : B.clean(p.s, 80), t, il: p.il || "", w, h, c: B.clean(cur, 90), k: mk ? 1 : 0, i: id, ...(ll ? { a: +(+ll[0]).toFixed(6), o: +(+ll[1]).toFixed(6) } : {}) }), url = () => (pv ? `${PVW}/y/${pv.id}` : SITE + base) + "#" + B.invite(x());
  const draw = () => { const v = x(); q("#bvn").textContent = v.n; q("#bvt").textContent = `✉️ Beraber gidelim mi? · ${near ? "Yakınında" : v.n}`; q("#ivx").innerHTML = esc(bText(v, url().slice(0, 44) + "…")).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(https:\/\/\S+)/g, "<u>$1</u>").replace(/\n/g, "<br>"); };
  const box = q("#ivi"), im = new Image(); im.alt = ""; im.onload = () => { box.classList.remove("sk"); box.append(im); }; im.onerror = () => { box.classList.remove("sk"); box.textContent = T.e; box.classList.add("bvi"); }; if (priv || !ll || !name) im.src = img; draw();
  const pvGo = () => { clearTimeout(pvT); if (!ll || priv || !B.clean(name, 60)) return; const v = x(), k = fold(v.n); if (k === pvk) return; pvk = k; pv = null; pvEnd = false; pvp = pvMake(v, B).then((r) => { if (pvk !== k) return; pv = r; near = false; if (r.blob) r.up = pvPut(v, r.blob).then((ok) => { r.ok = ok; return ok; }); const u = r.blob ? URL.createObjectURL(r.blob) : `${PVW}/g/${r.id}.jpg`; im.onerror = null; im.src = u; draw(); }).catch((e) => { console.warn("önizleme", e?.message); if (pvk === k) im.src = img; }).finally(() => { if (pvk === k) pvEnd = true; }); }; pvT = setTimeout(pvGo, 40);
  q("#bvy")?.addEventListener("input", (ev) => { name = ev.target.value; pv = null; pvk = ""; clearTimeout(pvT); pvT = setTimeout(pvGo, 900); draw(); }); q("#bvc")?.addEventListener("click", (ev) => { const b = ev.target.closest("[data-w]"); if (!b) return; w = b.dataset.w; if (!w) { h = ""; q("#bvi").value = ""; } q("#bvh").hidden = !w; sh.querySelectorAll("#bvc button").forEach((y) => y.classList.toggle("on", y === b)); snd.sel?.(); haptic(4); draw(); }); q("#bvi")?.addEventListener("input", (ev) => { h = ev.target.value; draw(); });
  q("#ivk").addEventListener("click", (ev) => { const b = ev.target.closest("[data-k]"); if (!b) return; mk = b.dataset.k === "1"; q("#ivk").style.setProperty("--i", mk ? 1 : 0); q("#ivk").querySelectorAll("button").forEach((y) => y.classList.toggle("on", y === b)); q("#ivgo").textContent = mk ? "Davet et 💌" : "Davet et ✉️"; snd.sel?.(); draw(); });
  q("#ivl").addEventListener("click", (ev) => { const b = ev.target.closest("[data-i]"); if (!b) return; cur = T.c[+b.dataset.i]; q("#ivt").value = ""; sh.querySelectorAll("#ivl button").forEach((y) => y.classList.toggle("on", y === b)); snd.sel?.(); draw(); }); q("#ivt").addEventListener("input", (ev) => { const v = ev.target.value.trim(); if (!v) return; cur = v; sh.querySelectorAll("#ivl button").forEach((y) => y.classList.remove("on")); draw(); });
  q("#ivgo").addEventListener("click", async () => { if (!p.lock && !priv && !B.clean(name, 60)) { q("#bvy")?.focus(); toast("Önce yerin adını yaz.", 2200); return; } if (pvBusy) return; haptic(8); pvGo(); const gb = q("#ivgo"), gl = () => mk ? "Davet et 💌" : "Davet et ✉️"; const upd = () => pv && (pv.has || pv.ok === true); if (pv?.blob && !pv.up) pv.up = pvPut(x(), pv.blob).then((ok) => { pv && (pv.ok = ok); return ok; }); if ((pvp && !pv && !pvEnd) || (pv?.blob && pv.ok === undefined)) { pvBusy = true; gb.textContent = "3B önizleme hazırlanıyor…"; gb.style.opacity = ".72"; await pvWait(pvp, 25000); pvEnd = true; if (pv?.up) { const it = pv, ok = await pvWait(it.up, 9000); if (ok !== true && pv === it) pv = null; } pvBusy = false; gb.style.opacity = ""; gb.textContent = gl(); if (navigator.share && !navigator.userActivation?.isActive) { gb.textContent = `Hazır · Gönder ${mk ? "💌" : "✉️"}`; snd.ok(); haptic(8); return; } } if (pv?.blob && !upd()) pv = null; const v = x(), u = url(), text = bText(v, u); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast("Davet kopyalandı ✉️ İstediğin yere yapıştır."); } bdS([{ ...v, id, url: u, at: Date.now(), cv: [] }, ...bdL()]); snd.ok(); gcEv("beraber-gonder", "Yer daveti gönderildi"); sh.close(); } catch (err) { if (err?.name !== "AbortError") toast("Davet açılamadı, tekrar dene.", 3000); } });
}
function bAdd(u, B) { const m = String(u).match(/\/y\/c\/#([\w-]+)/), P = m && B.unpack(m[1]); if (!P?.i) return false; const L = bdL(), it = L.find((x) => x.id === P.i); if (!it) return false; const w = B.clean(P.w, 24) || "Biri"; it.cv = (it.cv || []).filter((x) => x.w !== w); it.cv.push({ w, r: P.r, d: P.zd || "", h: P.zh || "", at: Date.now() }); bdS(L); return true; }
function davetlerHTML(city) { const L = bdL().map((x) => ({ ...x, line: typeof x.c === "string" ? x.c : "", R: Array.isArray(x.cv) ? x.cv : [] })); const RT = { var: "geliyor 🙌", zaman: "başka zaman önerdi", yok: "gelemiyor" };
  return `<div class="bdl">${L.length ? L.map((x, i) => `<article class="bdc"><div><b>${esc(x.n)}</b><small>${esc(bWhen(x.w, x.h) || "Zaman belirtilmedi")}</small></div>${x.R.length ? `<ul>${x.R.map((r) => `<li><b>${esc(r.w)}</b> ${RT[r.r] || "cevap verdi"}${bWhen(r.d, r.h) ? ` · ${esc(bWhen(r.d, r.h))}` : ""}</li>`).join("")}</ul>` : `<p>Henüz cevap gelmedi. Cevap bağlantısına dokununca burada görünür.</p>`}<div class="bda"><button type="button" data-ba="s" data-i="${i}">Son durumu paylaş</button><button type="button" data-ba="r" data-i="${i}">Tekrar gönder</button><button type="button" data-ba="x" data-i="${i}" aria-label="Sil">Sil</button></div></article>`).join("") : `<div class="empty">Henüz davet göndermedin. Haritada bir yere dokun ve <b>Beraber gidelim mi?</b> de.</div>`}</div><label class="fvi ivw bdp"><span>🔗</span><input id="bdi" placeholder="Cevap bağlantısını buraya yapıştır" enterkeyhint="done"></label>`; }
function davetlerBind(city) { const L = () => bdL(), share = async (t) => { try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast("Kopyalandı."); } } catch {} };
  $$("[data-ba]").forEach((b) => b.addEventListener("click", async () => { const A = L(), x = A[+b.dataset.i], B = await bjs(); if (!x) return; const q = { ...x }; delete q.url; delete q.cv; delete q.at; delete q.id; if (b.dataset.ba === "x") { A.splice(+b.dataset.i, 1); bdS(A); viewPlan(city, 2); return; } if (typeof q.c !== "string") q.c = B.T[x.t]?.p || "Beraber gidelim mi?"; if (b.dataset.ba === "r") return share(bText(q, x.url)); const names = (x.cv || []).filter((r) => r.r === "var").map((r) => r.w), u = x.url.split("#")[0] + "#" + B.pack({ ...q, i: x.id, l: names }); share(`${names.length ? "🙌 Gelenler: " + names.join(", ") : "Henüz cevap yok"}\n${bText(q, u)}`); }));
  $("#bdi")?.addEventListener("change", async (ev) => { const B = await bjs(); if (bAdd(ev.target.value, B)) { snd.ok(); viewPlan(city, 2); } else toast("Bu bağlantı bu telefondan gönderilen bir davete ait değil.", 3200); }); }
function bPlanHTML(city) { const { d: today } = nowIST(), A = jsGet("nvny-beraber", []).filter((x) => !x.w || x.w >= today), M = bdL().filter((x) => x.w && x.w >= today && !A.some((y) => y.id === x.id)), L = [...A, ...M].sort((a, b) => (a.w || "9").localeCompare(b.w || "9")).slice(0, 8); return L.length ? `<section class="bpl"><h3>Buluşmalarım</h3>${L.map((x) => `<a href="#/${esc(x.il || city)}/harita${x.a != null ? `?yer=${x.a},${x.o}&ad=${encodeURIComponent(x.n)}` : ""}"><b>${esc(x.n)}</b><small>${esc(bWhen(x.w, x.h) || "Zaman belirtilmedi")}</small></a>`).join("")}</section>` : ""; }
async function inviteEv(e, city) {
  haptic(6); snd.sheet?.(); gcEv("davet", "Davet et");
  const L = [...(INV_C[e.cat] ? [INV_C[e.cat]] : []), ...INV_G], mine = (() => { try { return JSON.parse(store.get("nvny-davet") || "[]"); } catch { return []; } })();
  const all = [...mine.filter((x) => !L.includes(x)).slice(0, 3), ...L]; let cur = all[(Math.random() * Math.min(all.length, 5)) | 0];
  const sh = sheet(`<div class="pn ivp" role="dialog" aria-label="Davet et"><div class="hd"><span class="rth"><b>Davet et ✉️</b><small>${esc(e.title)}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2">
    <div class="ivv"><div class="ivb"><div class="ivc"><div class="ivi sk" id="ivi"></div><div class="ivm"><b>✉️ Beraber gidelim mi? · ${esc(e.title)}</b><small>nevarneyok.net.tr</small></div></div><p class="ivx" id="ivx"></p></div></div>
    <h4>Davet cümlen</h4><div class="ivl" id="ivl">${all.map((x, i) => `<button type="button" data-i="${i}" class="${x === cur ? "on" : ""}"><span>${INV_E[i % INV_E.length]}</span>${esc(x)}</button>`).join("")}</div>
    <div class="seg ivk" id="ivk" style="--n:2;--i:0"><span class="thumb"></span><button type="button" class="on" data-k="0" aria-label="Zarf">✉️</button><button type="button" data-k="1" aria-label="Kalpli zarf">💌</button></div>
    <label class="fvi ivw"><span>✍️</span><input id="ivt" maxlength="70" placeholder="Ya da kendin yaz…" enterkeyhint="done"></label>
    <button type="button" class="ok ivgo" id="ivgo">Davet et ✉️</button>
    <p class="shn">Arkadaşın davetiyeyi açınca afişi, tarihi ve mekânı görür; tek dokunuşla takvimine ekler, biletine ve yol tarifine ulaşır.</p></div></div>`, "mn");
  /* Davet bağlantı olarak gider (kullanıcı, 16.11.2026 15:39: "link atıyoruz; galeriye inen görsel istemiyoruz"): mesaj + /d/<kod> bağlantısı;
     WhatsApp vb. bağlantının önizlemesini (afiş + logo, s/o/<kod>.jpg) kendisi gösterir. Paneldeki kutu bu önizlemenin aynısını gösterir. */
  const box = sh.querySelector("#ivi"), msg = sh.querySelector("#ivx"); let tm = 0;
  fetch(`s/o/${NV.scode(city, e.slug)}.jpg`, { cache: "no-cache" }).then((r) => r.ok && /image/.test(r.headers.get("content-type") || "") ? r.blob() : ogCanvas(e, city, null))
    .then((b) => { box.classList.remove("sk"); const im = new Image(); im.src = URL.createObjectURL(b); im.alt = ""; box.append(im); }).catch(() => box.classList.remove("sk"));
  const draw = () => { msg.innerHTML = esc(shareText(e, city, cur, mk)).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(https:\/\/\S+)/g, '<u>$1</u>').replace(/\n/g, "<br>"); };
  let mk = false; draw();
  sh.querySelector("#ivk").addEventListener("click", (ev) => { const b = ev.target.closest("[data-k]"); if (!b) return; mk = b.dataset.k === "1"; const g = sh.querySelector("#ivk"); g.style.setProperty("--i", mk ? 1 : 0); g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    sh.querySelector("#ivgo").textContent = mk ? "Davet et 💌" : "Davet et ✉️"; sh.querySelector("#ivl button span").textContent = mk ? "💌" : "✉️"; draw(); snd.sel?.(); haptic(4); });
  sh.querySelector("#ivl").addEventListener("click", (ev) => { const b = ev.target.closest("[data-i]"); if (!b) return; cur = all[+b.dataset.i]; sh.querySelectorAll("#ivl button").forEach((x) => x.classList.toggle("on", x === b)); sh.querySelector("#ivt").value = ""; snd.sel?.(); haptic(4); draw(); });
  sh.querySelector("#ivt").addEventListener("input", (ev) => { const v = ev.target.value.trim(); if (!v) return; cur = v; sh.querySelectorAll("#ivl button").forEach((x) => x.classList.remove("on")); clearTimeout(tm); tm = setTimeout(draw, 450); });
  sh.querySelector("#ivgo").addEventListener("click", async (ev) => { const bt = ev.currentTarget; haptic(8); bt.classList.add("bz");
    const typed = sh.querySelector("#ivt").value.trim(); if (typed) store.set("nvny-davet", JSON.stringify([typed, ...mine.filter((x) => x !== typed)].slice(0, 6)));
    const text = shareText(e, city, cur, mk);
    try { if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast(`Davet kopyalandı ${mk ? "💌" : "✉️"} İstediğin yere yapıştır.`); }
      snd.ok(); gcEv("davet-gonder", "Davet gönderildi"); sh.close();
    } catch (err) { if (err?.name !== "AbortError") { try { await navigator.clipboard.writeText(text); toast(`Davet kopyalandı ${mk ? "💌" : "✉️"} İstediğin yere yapıştır.`, 3500); } catch { toast("Davet açılamadı, tekrar dene.", 3000); } } }
    bt.classList.remove("bz"); });
}
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
  const u = shareUrl(e, city), text = shareText(e, city), fn = `nevarneyok-${e.slug}.jpg`;
  const sh = sheet(`<div class="pn shp" role="dialog" aria-label="Paylaş"><div class="hd"><b>Paylaş</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div><div class="bd2">
    <div class="shv"><div class="shi sk" id="shi"></div><div class="shm"><b>${esc(e.title)}</b><small>${esc(dShort(e.d))}${e.t ? " · " + esc(e.t) : ""}</small><small>${esc(e.venue || "")}</small></div></div>
    <div class="sha"><button type="button" class="shinv" data-a="inv">✉️<span><b>Davet et</b><small>Afişli davetiye · "Beraber gidelim mi?"</small></span></button><button type="button" data-a="story"><i style="background:linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16.8" cy="7.2" r="1.1" fill="#fff"/></svg></i><span>Hikâyende paylaş</span></button><button type="button" data-a="link"><i style="background:#30d158"><svg viewBox="0 0 24 24"><path d="M12 4.5c4.7 0 8.5 3 8.5 6.8S16.7 18 12 18c-.9 0-1.8-.1-2.6-.3L5 19.5l1.3-3.4C4.6 14.9 3.5 13.2 3.5 11.3 3.5 7.5 7.3 4.5 12 4.5z" fill="#fff"/></svg></i><span>Arkadaşına gönder</span></button><button type="button" data-a="save"><i style="background:#0a84ff"><svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></i><span>Görseli kaydet</span></button><button type="button" data-a="copy"><i style="background:#8e8e93"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/></svg></i><span>Bağlantıyı kopyala</span></button></div>
    <p class="shn">Arkadaşın bağlantıyı açınca etkinlik doğrudan Ne Var Ne Yok'ta açılır; önizlemede adı, tarihi ve afişi görünür.</p></div></div>`, "mn");
  let blobP = storyOf(e, city).then((b) => { const im = new Image(); im.src = URL.createObjectURL(b); im.alt = ""; const box = sh.querySelector("#shi"); box.classList.remove("sk"); box.append(im); return b; });
  blobP.catch(() => sh.querySelector("#shi")?.classList.add("no"));
  sh.querySelector(".sha").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-a]"); if (!b) return; haptic(5); const a = b.dataset.a;
    try {
      if (a === "link") { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast("Kopyalandı 🔗 İstediğin yere yapıştır."); } gcEv("paylas-link", "Bağlantı paylaşıldı"); }
      else if (a === "copy") { await navigator.clipboard.writeText(text); toast("Kopyalandı 🔗 Yapıştırınca afişiyle görünür.", 3500); }
      else if (a === "inv") { sh.close(); setTimeout(() => inviteEv(e, city), 280); return; }
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
    <button type="button" data-pk="cal">${I.cal}<span>Takvime ekle</span></button><button type="button" data-pk="inv"><span class="pke">✉️</span><span>Davet et</span></button><button type="button" data-pk="shr">${I.share}<span>Paylaş</span></button>
    ${best && live(e) ? `<a href="${esc(best.url)}" target="_blank" rel="noopener" data-buy="${esc(best.site)}">${I.ext}<span>${buyLbl(e, best)} · ${esc(best.site)}</span></a>` : ""}</div></div>`;
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
    else if (k === "inv") { inviteEv(e, city); close(); }
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
/* Konum gelene kadar bekle (18.11.2026, kullanıcı: "konumu açmamı istesin, uygulamadan çıkmadan kabul edeyim, anlık alınsın"; 12:18: "Konumunu aç düğmesi; basınca konum açılsın").
   Android Chrome'da konum kapalıyken "konumu aç" sistem penceresi yalnızca kullanıcının dokunuşuyla başlayan, yeni bir konum isteğinde çıkar: bu yüzden düğme önce açık izlemeyi kapatır,
   süren deneme bitince dokunuşun içinde taze istek yapar. pencere çıkmazsa (hemen reddedildiyse) Android'de konum ayarının kendisi açılmaya çalışılır. Konum kapalıyken Chrome izni "prompt/denied" gösterebildiği için "denied" denemeyi durdurmaz.
   Kapatılan izin penceresi rahatsız etmemek için kendiliğinden tekrar açılmaz. onState: "need" (konum gerekli), "off2" (düğmeye basıldı, açılmadı; ikinci değer: hemen mi reddedildi). */
function locWait(ok, onState) {
  const G = navigator.geolocation; let dead = false, w = null, tm = null, perm = null, st = "", blocked = false, busy = false, tap = false, queued = null, tapT = 0;
  const stop = () => { dead = true; if (w != null) G?.clearWatch(w); clearInterval(tm); removeEventListener("focus", wake); removeEventListener("online", wake); document.removeEventListener("visibilitychange", back); if (perm) perm.onchange = null; };
  const say = (s, x) => { if (!dead && s !== st) { st = s; onState(s, x); } };
  const got = (q) => { if (dead) return; stop(); const p = [q.coords.latitude, q.coords.longitude]; DATA.me = { p, t: Date.now() }; locSave(p); ok(p); };
  const idle = () => { busy = false; if (queued) { const f = queued; queued = null; f(); } };
  const fail = (e) => { const was = tap; tap = false; if (dead) return idle(); if (e?.code === 1 && (!perm || perm.state === "prompt")) blocked = true;
    if (was) { st = ""; say("off2", Date.now() - tapT < 1500); } else if (st !== "off2") say("need"); idle(); };
  const ask = (hi, ms) => { if (busy) return; busy = true; G.getCurrentPosition((q) => { busy = false; queued = null; got(q); }, fail, { enableHighAccuracy: !!hi, timeout: ms, maximumAge: hi ? 0 : 60000 }); };
  const arm = () => { if (w != null) G.clearWatch(w); w = G.watchPosition(got, () => {}, { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }); };
  function wake() { if (!dead && !document.hidden && !blocked && !tap) ask(false, st ? 3000 : 8000); }
  function back() { if (document.hidden) return; if (!perm) blocked = false; wake(); }
  if (!G) { setTimeout(() => say("need")); return { stop() {}, retry() {} }; }
  if (DATA.me && !DATA.me.c && Date.now() - DATA.me.t < 2 * 60e3) { const p = DATA.me.p; setTimeout(() => { if (!dead) { stop(); ok(p); } }); return { stop, retry() {} }; }
  const start = () => { if (dead) return; arm(); ask(false, 8000); tm = setInterval(wake, 4000); addEventListener("focus", wake); addEventListener("online", wake); document.addEventListener("visibilitychange", back); };
  (navigator.permissions?.query ? navigator.permissions.query({ name: "geolocation" }) : Promise.reject()).then((q) => { perm = q; q.onchange = () => { if (dead) return; blocked = false; if (q.state === "granted") { arm(); ask(true, 15000); } }; start(); }).catch(start);
  return { stop, retry() { if (dead || tap) return; tap = true; tapT = Date.now(); blocked = false; if (w != null) { G.clearWatch(w); w = null; } const fire = () => { if (dead) return; ask(true, 20000); arm(); }; if (busy) queued = fire; else fire(); } };
}
const locHow = () => { const and = /android/i.test(navigator.userAgent); return isIOS ? "iPhone'da <b>Ayarlar › Gizlilik ve Güvenlik › Konum Servisleri</b>'ni aç; sonra <b>Ayarlar › Safari › Konum</b>'u <b>Sor</b> ya da <b>İzin Ver</b> yap."
  : and ? (standalone ? "<b>Ayarlar › Uygulamalar › Ne Var Ne Yok › İzinler › Konum</b>'dan <b>Uygulamayı kullanırken izin ver</b>'i seç." : "Adres çubuğunun solundaki <b>kilit</b> simgesine dokun › <b>İzinler</b> › <b>Konum</b>'u aç.")
  : "Adres çubuğunun solundaki <b>ayar</b> simgesine tıkla › <b>Konum</b>'u <b>İzin ver</b> yap."; };
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
      <p class="pl1" style="margin-top:14px;color:var(--t3);font-size:13px">Açılmazsa sağ üstteki <b>⋮</b> menüsünden <b>Tarayıcıda aç</b>'ı seç.</p>${standalone ? "" : `<a class="gapp" href="indir/"><img src="icons/icon-192.png?v=4" alt="" width="40" height="40"><span><b>Uygulamayı indirirsen daha kolay</b><small>Konum ve bildirimler tek dokunuşla çalışır · ücretsiz</small></span></a>`}</div></div>`, "mn");
    sh.querySelector("[data-center]").addEventListener("click", (ev) => { ev.preventDefault(); const c = cityCenter(city); sh.close(); if (!c) return; DATA.me = { p: c, t: Date.now(), c: 1 }; goNear(city); });
    sh.querySelector(".ok").addEventListener("click", (ev) => { ev.preventDefault(); haptic(6); dis(open); });
    return;
  }
  const how = code === 1 ? locHow()
    : "Cihazının konum servisi kapalı ya da konum şu an bulunamıyor. Konumu açıp tekrar dene.";
  const sh = sheet(`<div class="pn" role="dialog" aria-label="Konum"><div class="hd"><b>📍 Yakınındaki etkinlikler</b><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2"><p class="pl1">${code === 1 ? "Konum izni daha önce kapatılmış; bu yüzden tarayıcı bir daha soramıyor." : "Konumuna şu an ulaşamadık."}</p><p class="pl1">${how}</p><p class="pl1" style="color:var(--t3)">Konumun yalnızca bu cihazda, uzaklığı hesaplamak için kullanılır; hiçbir yere gönderilmez.</p>
    <div class="pl-b"><button type="button" class="ok" data-again>Tekrar dene</button><a href="#" data-center>Şehir merkezine göre sırala</a></div>${standalone ? "" : `<a class="gapp" href="indir/"><img src="icons/icon-192.png?v=4" alt="" width="40" height="40"><span><b>Uygulamayı indirirsen daha kolay</b><small>Konum ve bildirimler tek dokunuşla çalışır · ücretsiz</small></span></a>`}</div></div>`, "mn");
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
    <div class="in-s">${S.map((s, i) => `<section><div class="in-c">${i === 0 ? `<img class="in-ic" src="icons/icon-512.png?v=4" alt="" width="96" height="96">` : `<div class="in-n">${i + 1}/${S.length}</div>`}<small>${s[0]}</small><h2>${s[1]}</h2><p>${s[2]}</p></div></section>`).join("")}</div>
    <div class="in-f"><div class="in-d">${S.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div><button type="button" class="in-go">Devam</button></div>`;
  document.body.append(o); document.body.style.overflow = "hidden"; requestAnimationFrame(() => o.classList.add("on"));
  const sc = $(".in-s", o), dots = $$(".in-d i", o), go = $(".in-go", o); let cur = 0;
  const done = () => { store.set("nvny-intro", "1"); if (standalone) store.set("nvny-app-ilk", "1"); setTimeout(welcomeApp, 900); setTimeout(() => dispatchEvent(new Event("nvny-intro-done")), 450); o.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => o.remove(), 400); setTimeout(() => $("#cq")?.focus({ preventScroll: true }), 420); };
  sc.addEventListener("scroll", () => { const i = Math.round(sc.scrollLeft / sc.clientWidth); if (i !== cur) { cur = i; dots.forEach((d, k) => d.classList.toggle("on", k === i)); go.textContent = i === S.length - 1 ? "Şehrimi seçeyim" : "Devam"; tick(); } }, { passive: true });
  go.addEventListener("click", () => { haptic(6); if (cur >= S.length - 1) return done(); sc.scrollTo({ left: (cur + 1) * sc.clientWidth, behavior: "smooth" }); });
  $(".in-x", o).addEventListener("click", done);
}

/* ---------- Bölüm tanıtımları: kurulu uygulamada her bölümün ilk açılışında bir kez ---------- */
const TV = {
  btn: (e, t, x = "") => `<button type="button" class="tvb" ${x}><span>${e}</span><b>${t}</b></button>`,
  msg: (s, x = "") => `<div class="tvg" ${x}><i></i><b>✉️ Beraber gidelim mi?</b><small>${s}</small><u>Dokun, gör, cevap ver</u></div>`,
  roads: `<svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M-5 112 90 74 170 96 305 34M70-5l26 80 22 80M196-5l-22 100 30 60" fill="none" stroke="#4b4a58" stroke-width="7" stroke-linecap="round"/></svg>`,
  dot: (c, t, x, y, a = "") => `<button type="button" class="tvd" style="left:${x}%;top:${y}%" ${a}><i style="background:${c}"></i>${t}</button>`,
  pst: (L, x = "") => `<div class="tvp" ${x}>${L.slice(0, 3).map((u, i) => `<img class="p${i}" src="${esc(u)}" alt="" referrerpolicy="no-referrer" ${i === 1 ? 'data-t="1"' : ""}>`).join("")}</div>`,
};
const TUR = {
  ana: () => { const E = []; for (const e of DATA.top || []) if (e.img && !E.some((x) => x.img === e.img)) E.push(e); const m = E[1] || {}; return [
    { t: "Dene · 1/3", h: "Bir etkinlik<br><em>seç.</em>", a: "Ortadaki afişe dokun.", b: "Etkinlikler burada afiş afiş durur. Dokununca tarih, mekân ve bilet karşına gelir.", v: `${TV.pst(E.map((e) => e.img))}<div class="tvk" data-show="1"><b>${esc(m.title || "Etkinlik")}</b><small>${esc(m.venue || "Mekân ve tarih")}</small></div>` },
    { t: "Dene · 2/3", h: "Kaçırma,<br><em>takip et.</em>", a: "Takip et'e dokun.", b: "Oldu. Etkinlik Planım'a girdi; saat, yer ya da bilet değişirse haber veririz.", v: `<div class="tvc">${TV.btn("🎟️", "Bilet al")}${TV.btn("🔔", "Takip et", 'data-t="1" data-hide="1"')}${TV.btn("✅", "Takipte", 'data-show="1" data-on')}</div>` },
    { t: "Dene · 3/3", h: "Arkadaşını<br><em>çağır.</em>", a: "Davet et'e dokun.", a2: "Şimdi cümleni seç.", b: "İşte bu. Etkinliğin tarihi ve yeri davete kendiliğinden yazılır, arkadaşına mesaj olarak gider.", v: `<div class="tvc">${TV.btn("✉️", "Davet et", 'data-t="1" data-hide="1"')}<div class="tvh" data-show="1" data-hide="2"><button type="button" data-t="2">Beraber gidelim mi?</button><button type="button">Buna ne dersin?</button></div>${TV.msg("Seçtiğin etkinlik · tarih · mekân", 'data-show="2"')}</div>` },
  ]; },
  sinema: () => { const P = [...new Set((DATA.films?.films || []).map((f) => f.img).filter(Boolean))]; return [
    { t: "Dene · 1/2", h: "Filmini<br><em>ve saatini seç.</em>", a: "Ortadaki filme dokun.", a2: "Şimdi 19:45'e dokun.", b: "Seansın seçildi. Buradan takip edebilir, takvimine ekleyebilir, biletine gidebilirsin.", v: `${TV.pst(P, 'data-hide="1"')}<div class="tvh" data-show="1" data-hide="2"><button type="button">14:30</button><button type="button">17:15</button><button type="button" data-t="2">19:45</button><button type="button">22:00</button></div><div class="tvk" data-show="2"><b>19:45 seansı</b><small>Salon ve bilet hazır</small></div>` },
    { t: "Dene · 2/2", h: "O seansa<br><em>birlikte gidin.</em>", a: "Beraber gidelim mi?'ye dokun.", b: "Film, salon ve seans arkadaşına hazır gider. Tek yapacağı cevap vermek.", v: `<div class="tvc">${TV.btn("✉️", "Beraber gidelim mi?", 'data-t="1" data-hide="1"')}${TV.msg("Film · salon · 19:45", 'data-show="1"')}</div>` },
  ]; },
  harita: () => [
    { t: "Dene · 1/5", h: "Her yer<br><em>haritada.</em>", a: "Kütüphaneye dokun.", b: "Etkinlikler, mekânlar, kafeler, kütüphaneler, camiler... Dokunduğun yerin kartı açılır.", v: `<div class="tvn">${TV.roads}${TV.dot("#8b5cf6", "Etkinlik", 8, 14)}${TV.dot("#f97316", "Kafe", 64, 10)}${TV.dot("#38bdf8", "Kütüphane", 44, 50, 'data-t="1"')}<div class="tvk" data-show="1"><b>Kütüphane</b><small>Yol tarifi · Önizle · Davet</small></div></div>` },
    { t: "Dene · 2/5", h: "Ne zaman<br><em>çıkıyorsun?</em>", a: "Bugün'e dokun.", b: "Harita hemen bugüne göre süzüldü. Saat'ten saatini de seçebilirsin.", v: `<div class="tvc"><div class="tvh"><button type="button">Saat</button><button type="button" data-t="1" data-mark="1">Bugün</button><button type="button">Yarın</button></div><div class="tvk st" data-show="1"><b>Yalnızca bugün gösteriliyor</b></div></div>` },
    { t: "Dene · 3/5", h: "Gitmeden<br><em>gör.</em>", a: "Önizle'ye dokun.", b: "Seçtiğin yerin çevresi yavaş yavaş canlanır, sonra kamera oraya yaklaşır.", v: `<div class="tvc"><div class="tvn sm">${TV.roads}<div class="tvl" data-show="1"></div><em class="tvo"></em></div>${TV.btn("✨", "Önizle", 'data-t="1"')}</div>` },
    { t: "Dene · 4/5", h: "Bir yere<br><em>davet et.</em>", a: "Beraber gidelim mi?'ye dokun.", b: "Kafe, park, kütüphane; neresi olursa. Arkadaşın orayı mesajda görür.", v: `<div class="tvc">${TV.btn("✉️", "Beraber gidelim mi?", 'data-t="1" data-hide="1"')}${TV.msg("Seçtiğin yerin adı ve görüntüsü", 'data-show="1"')}</div>` },
    { t: "Dene · 5/5", h: "Kendi yerini<br><em>işaretle.</em>", a: "Haritaya parmağını basılı tut.", a2: "Kaydet'e dokun.", b: "Evin haritada. Okul, iş, ne istersen ekle; yerlerin telefonunda kalır.", v: `<div class="tvn tvq" data-t="1" data-hold>${TV.roads}<em></em><button type="button" class="tvs" data-show="1" data-hide="2" data-t="2">Kaydet</button><div class="tvf" data-show="2"><span>🏠</span><b>Ev</b></div></div>` },
  ],
};
function turAt(k) { const test = new URLSearchParams(location.search).get("tur") === "1"; if (!test && (!standalone || store.get("nvny-tur-" + k))) return; const go = () => setTimeout(() => { if (!test && store.get("nvny-tur-" + k)) return; if ($(".intro")) { addEventListener("nvny-intro-done", go, { once: true }); return; } tour(k); }, 650); go(); }
function tour(k) {
  const S = TUR[k](), o = document.createElement("div"); o.className = "intro tur"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Tanıtım");
  o.innerHTML = `<button type="button" class="in-x">Geç</button><div class="in-s">${S.map((s) => `<section><div class="in-c"><div class="tv">${s.v}</div><small>${s.t}</small><h2>${s.h}</h2><p class="tvi"></p></div></section>`).join("")}</div><div class="in-f"><div class="in-d">${S.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div><button type="button" class="in-go" disabled>Dokunarak dene</button></div>`;
  document.body.append(o); document.body.style.overflow = "hidden"; requestAnimationFrame(() => o.classList.add("on"));
  const sc = $(".in-s", o), dots = $$(".in-d i", o), btn = $(".in-go", o), secs = $$("section", sc); let cur = 0;
  const done = () => { store.set("nvny-tur-" + k, "1"); o.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => o.remove(), 400); };
  const page = (n) => { cur = n; const s = S[n], el = secs[n], tv = $(".tv", el), p = $(".tvi", el), max = Math.max(...$$("[data-t]", tv).map((x) => +x.dataset.t)); let st = 0; sc.scrollTo({ left: n * sc.clientWidth, behavior: n ? "smooth" : "auto" }); dots.forEach((d, i) => d.classList.toggle("on", i === n)); btn.disabled = true; btn.classList.remove("rdy"); btn.textContent = "Dokunarak dene";
    const paint = () => { $$("[data-show]", tv).forEach((x) => x.classList.toggle("in", st >= +x.dataset.show && !(x.dataset.hide && st >= +x.dataset.hide))); $$("[data-hide]:not([data-show])", tv).forEach((x) => x.classList.toggle("out", st >= +x.dataset.hide)); $$("[data-mark]", tv).forEach((x) => x.classList.toggle("on", st >= +x.dataset.mark)); $$("[data-t]", tv).forEach((x) => x.classList.toggle("tvt", +x.dataset.t === st + 1)); p.textContent = st >= max ? s.b : st && s.a2 ? s.a2 : s.a; p.classList.toggle("go", st < max); };
    const step = () => { st++; paint(); haptic(st >= max ? 12 : 6); if (st >= max) { snd.ok?.(); btn.disabled = false; btn.classList.add("rdy"); btn.textContent = n === S.length - 1 ? "Başla" : "Devam et"; } else snd.sel?.(); };
    if (!tv.dataset.b) { tv.dataset.b = "1"; $$("[data-t]", tv).forEach((x) => { const ok = () => +x.dataset.t === st + 1; if ("hold" in x.dataset) { let t = 0; const off = () => { clearTimeout(t); x.classList.remove("hold"); }; x.addEventListener("pointerdown", () => { if (!ok()) return; x.classList.add("hold"); t = setTimeout(() => { off(); step(); }, 620); }); ["pointerup", "pointerleave", "pointercancel"].forEach((e) => x.addEventListener(e, off)); x.addEventListener("contextmenu", (e) => e.preventDefault()); } else x.addEventListener("click", (e) => { e.stopPropagation(); if (ok()) step(); }); }); } paint(); };
  btn.addEventListener("click", () => { if (btn.disabled) return; haptic(6); if (cur >= S.length - 1) return done(); tick(); page(cur + 1); }); $(".in-x", o).addEventListener("click", done); page(0);
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
  <div class="wrap"><div class="seg pl-seg" style="--n:3;--i:${tab === 2 ? 2 : tab ? 1 : 0}"><span class="thumb" aria-hidden="true"></span><button type="button" data-tab="0" class="${tab ? "" : "on"}">Planım</button><button type="button" data-tab="1" class="${tab === true ? "on" : ""}">Takiplerim</button><button type="button" data-tab="2" class="${tab === 2 ? "on" : ""}">Davetlerim</button></div></div>
  ${tab ? "" : `<div class="wrap">${gittiAsk(city)}${yilCard(city)}</div>${recoRail(city)}`}
  <div class="wrap plan">${tab === 2 ? davetlerHTML(city) : tab ? ven + followLists(city) : bPlanHTML(city) + plan}</div>
  <div class="wrap" style="margin-top:22px">${notifBox(city)}</div>${footer()}`;
  bindNotifBox(V, city); gittiBind(city, () => viewPlan(city, tab));
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.tab; history.replaceState(null, "", `#/${city}/takip${k === "1" ? "?m=1" : k === "2" ? "?d=1" : ""}`); viewPlan(city, k === "2" ? 2 : k === "1"); }));
  if (tab === 2) davetlerBind(city);
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
   Başka harita uygulamasına yönlendirme yok. */
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
  const u = `https://routing.openstreetmap.de/routed-${mode === "car" ? "car" : mode === "bike" ? "bike" : "foot"}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  const r = await fetch(u); if (!r.ok) throw new Error("rota " + r.status); const j = await r.json(); if (j.code !== "Ok" || !j.routes?.length) throw new Error("rota yok");
  RCACHE.set(k, j.routes[0]); return j.routes[0];
}
function routeSheet(e, v, city) {
  /* Yol tarifi + navigasyon (kullanıcı isteği, 16.11.2026 02:17: "kişi yürüdükçe orada da ilerlesin; araçla ya da yaya; güzel yapalım").
     Önce özet: süre, mesafe, varış, adım adım tarif. "Başla" ile navigasyon: harita tam ekran, seni izler; üstte sıradaki dönüş ve kalan metre,
     altta kalan süre, mesafe, varış saati; geçtiğin yol solar; dönüşe yaklaşınca titreşim + kısa ses ve istersen Türkçe sesli yönlendirme (telefonun kendi sesi);
     yoldan saparsan yeniden hesaplanır; ekran kapanmaz (izin verirse). Konum yalnızca yol hesaplamak için yol sunucusuna gider. */
  haptic(6);
  const sh = sheet(`<div class="pn rtp" role="dialog" aria-label="Yol tarifi">
    <div class="rtm map" id="rmap"></div>
    <div class="rtop" id="rtop"><div class="hd"><button type="button" class="rbk" data-close aria-label="Geri"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="rth"><small id="rtk">Yol tarifi</small><b id="rtn">${esc(e.venue || "")}</b></span><button type="button" class="rsw" id="rsw" aria-label="Yönü değiştir"><svg viewBox="0 0 24 24"><path d="M8 4v15M4.5 7.5 8 4l3.5 3.5M16 20V5M12.5 16.5 16 20l3.5-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
    <div class="rfr" id="rfr" role="tablist" aria-label="Nereden"></div><div class="rctl"><button type="button" id="r3d" aria-label="3B görünüm">3B</button><button type="button" id="rfit" aria-label="Bütün yolu göster"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="rfx" id="rfx" hidden><label class="fvi"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><input id="rfi" placeholder="Semt, adres ya da yer adı" enterkeyhint="search" autocomplete="off"></label><div class="rfl" id="rfl"></div></div></div>
    <div class="nvt" id="nvt"><i></i><span><b></b><small></small></span></div>
    <div class="nvb" id="nvb"><span><b id="nvm"></b><small id="nvk"></small></span><button type="button" class="nvv" id="nvv" aria-label="Sesli yönlendirme"></button><button type="button" class="nve" id="nve">Bitir</button></div>
    <button type="button" class="nvc" id="nvc" aria-label="Konumuma dön"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="currentColor"/></svg></button>
    <div class="bd2 rcd" id="rcd"><button type="button" class="rgr" id="rgr" aria-label="Ayrıntıları aç"></button><div class="rseg" role="tablist"><i></i><button type="button" data-m="foot" role="tab">Yürüyerek</button><button type="button" data-m="bike" role="tab">Bisikletle</button><button type="button" data-m="car" role="tab">Arabayla</button></div>
    <div class="rsum" id="rsum"><span class="sk" style="display:block;height:52px;border-radius:14px"></span></div>
    <ol class="rst" id="rst"></ol>
    <p class="rnote">Yol OpenStreetMap verisiyle hesaplanır; trafik hesaba katılmaz. Bunun için yalnızca başlangıç ve varış noktası OpenStreetMap'in yol sunucusuna gider, bizde saklanmaz.</p></div></div>`, "mn rt");
  let lw = null, map = null, line = null, done = null, me = null, watch = null, mode = null, from = null, R = null, S = [], nav = false, C = [], cum = [], sIdx = [], ni = 0, lastStep = -1, warned = -1, wl = null, follow = true;
  let voice = store.get("nvny-sesli") !== "0";
  const dest = [v.lat, v.lng], seg = sh.querySelector(".rseg"), sum = sh.querySelector("#rsum"), st = sh.querySelector("#rst");
  /* Yol tarifi doğrudan tam ekran haritada (kullanıcı, 16.11.2026 15:31–15:32: "ayrı panelde küçük kalmayalım, haritada özgürüz; hem yol tarifi hem 3B").
     Apple Haritalar gibi: üstte cam kart (geri, varış, nereden), altta sürüklenen cam kart (kısa: süre + Başla; açık: adım adım tarif).
     Harita her yöne serbest: iki parmakla döndür/eğ, "3B" ile eğik bakış, çerçeve düğmesiyle bütün yol. Kart yalnızca transform ile kayar. */
  const card = $("#rcd", sh), rtop = $("#rtop", sh), wide = () => innerWidth >= 700; let cOpen = false, cTy = 9999, d3 = false;
  const cMini = () => Math.min(card.offsetHeight, st.offsetTop + 14);
  const cSet = (open, anim = true) => { cOpen = open; const H = card.offsetHeight; cTy = open || wide() ? 0 : Math.max(0, H - cMini());
    card.style.transition = anim ? "transform .44s cubic-bezier(.32,.72,0,1)" : "none"; card.style.transform = `translate3d(0,${cTy}px,0)`; card.classList.toggle("open", open || wide());
    sh.style.setProperty("--cb", (wide() ? 0 : H - cTy) + "px"); };
  card.style.transform = "translate3d(0,110%,0)"; requestAnimationFrame(() => requestAnimationFrame(() => cSet(false)));
  { let y0 = 0, dY = 0, dr = false, t0 = 0;
    card.addEventListener("touchstart", (ev) => { if (wide() || (cOpen && card.scrollTop > 0) || ev.target.closest("input,.rseg,.nvs")) return; dr = true; y0 = ev.touches[0].clientY; dY = 0; t0 = performance.now(); }, { passive: true });
    card.addEventListener("touchmove", (ev) => { if (!dr) return; dY = ev.touches[0].clientY - y0; if (cOpen && dY < 0) return; if (Math.abs(dY) > 6) { const ty = Math.min(card.offsetHeight - 40, Math.max(0, cTy + dY)); card.style.transition = "none"; card.style.transform = `translate3d(0,${ty}px,0)`; } }, { passive: true });
    card.addEventListener("touchend", () => { if (!dr) return; dr = false; if (Math.abs(dY) < 7) { cSet(cOpen); return; } const vv = dY / Math.max(1, performance.now() - t0), H = card.offsetHeight;
      const open = vv < -.35 ? true : vv > .35 ? false : cTy + dY < (H - cMini()) / 2; if (open !== cOpen) { haptic(5); snd.sel?.(); } cSet(open); }, { passive: true }); }
  $("#rgr", sh).addEventListener("click", () => { haptic(5); snd.sel?.(); cSet(!cOpen); });
  addEventListener("resize", () => cSet(cOpen, false));
  const oldClose = sh.close; sh.close = () => { lw?.stop(); if (watch != null) navigator.geolocation.clearWatch(watch); try { wl?.release(); speechSynthesis.cancel(); } catch {} oldClose(); };
  const setMode = (m) => { mode = m; seg.style.setProperty("--i", ["foot", "bike", "car"].indexOf(m)); seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.m === m)); };
  /* Yönü değiştir (kullanıcı, 16.11.2026 20:02: "haritada istediğim her yere yol tarifi"): ⇅ ile gidiş ↔ dönüş. Ters yönde "Başla" yok (canlı yol gösterme yalnızca konumundan çıkarken). */
  let rev = false; const srcName = () => src === "me" ? "Konumun" : src === "x" ? xPlace?.n || "Seçilen yer" : F.find((x) => x.id === src)?.n || "";
  const toName = () => rev ? srcName() : e.venue || "";
  const hdr = () => { $("#rtk", sh).textContent = rev ? `${e.venue || ""} → ` : "Yol tarifi"; $("#rtn", sh).textContent = toName(); sh.classList.toggle("fixed", src !== "me" || rev); sh.classList.toggle("rev", rev); };
  const say = (t) => { if (!voice || !("speechSynthesis" in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/<[^>]+>/g, "")); u.lang = "tr-TR"; u.rate = 1.02; speechSynthesis.speak(u); } catch {} };
  const vIcon = () => { $("#nvv", sh).innerHTML = voice ? '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'; };
  const prep = () => { // yol noktaları, birikimli mesafe, her adımın yol üzerindeki yeri
    C = R.geometry.coordinates.map((c) => [c[1], c[0]]); cum = [0]; for (let i = 1; i < C.length; i++) cum.push(cum[i - 1] + km(C[i - 1], C[i]) * 1000);
    let j = 0; sIdx = S.map((s) => { const p = [s.maneuver.location[1], s.maneuver.location[0]]; let b = j, bd = 1e9; for (let i = j; i < C.length; i++) { const d = km(p, C[i]); if (d < bd) { bd = d; b = i; } if (bd < .005 && i > b + 5) break; } j = b; return b; });
    ni = 0; lastStep = -1; warned = -1;
  };
  const paint = async () => {
    sum.innerHTML = `<span class="sk" style="display:block;height:52px;border-radius:14px"></span>`; st.innerHTML = "";
    const A = rev ? dest : from, B = rev ? from : dest; hdr();
    try { R = await routeOf(mode, A, B); }
    catch { sum.innerHTML = `<div class="rerr">Yol şu an hesaplanamadı. Kuş uçuşu ${kmTxt(km(from, dest))}. <button type="button" class="rerb">Tekrar dene</button></div>`; $(".rerb", sum).addEventListener("click", paint); return; }
    S = R.legs[0].steps.filter((s, i, a) => !(s.maneuver.type === "new name" && s.distance < 15 && i < a.length - 1)); prep();
    const min = Math.max(1, Math.round(R.duration / 60)), at = new Date(Date.now() + R.duration * 1000).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
    const late = !rev && e.t && e.d === nowIST().d ? (() => { const [h, mm] = e.t.split(":").map(Number), leave = h * 60 + mm - min - 10, n = nowIST().hm.split(":").map(Number), now = n[0] * 60 + n[1]; return leave >= now ? `<small class="go">Tam yetişmek için en geç <b>${String(Math.floor(leave / 60)).padStart(2, "0")}:${String(leave % 60).padStart(2, "0")}</b>'da çık</small>` : now < h * 60 + mm ? `<small class="go late">Başlamasına ${h * 60 + mm - now} dk var, hemen çıkmalısın</small>` : ""; })() : "";
    sum.innerHTML = `<div class="rs1"><b>${durTxt(min)}</b><span>${mTxt(R.distance)} · varış ${at}</span><button type="button" class="nvs" id="nvs">Başla</button></div>${late}`;
    st.innerHTML = S.map((s, i) => `<li data-i="${i}"><i>${arrow(s)}</i><span>${stepTxt(s, toName())}${s.distance >= 5 && s.maneuver.type !== "arrive" ? `<small>${mTxt(s.distance)}</small>` : ""}</span></li>`).join("");
    st.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => { const s = S[+li.dataset.i]; if (map) map.flyTo({ center: s.maneuver.location, zoom: 17, duration: 600 }); haptic(4); }));
    $("#nvs", sum).addEventListener("click", start);
    cSet(cOpen, false); rDraw(); if (!nav) fitRoute();
    if (nav) update(from, true);
  };
  function update(p, force) { // navigasyon sırasında her konum değişiminde
    if (!R || !C.length) return;
    let b = ni, bd = 1e9; for (let i = Math.max(0, ni - 5); i < Math.min(C.length, ni + 60); i++) { const d = km(p, C[i]); if (d < bd) { bd = d; b = i; } }
    if (b >= ni || force) ni = b;
    const left = Math.max(0, cum[cum.length - 1] - cum[ni] + bd * 1000), k = sIdx.findIndex((x, i) => i > 0 && x > ni), step = k < 0 ? S.length - 1 : k, toTurn = Math.max(0, cum[sIdx[step]] - cum[ni]);
    const s = S[step], tx = stepTxt(s, toName());
    const T = $("#nvt", sh); T.querySelector("i").innerHTML = arrow(s); T.querySelector("b").textContent = s.maneuver.type === "arrive" ? "Varış" : mTxt(toTurn); T.querySelector("small").innerHTML = tx;
    const min = Math.max(1, Math.round(R.duration * (left / Math.max(1, R.distance)) / 60)), at = new Date(Date.now() + min * 60e3).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
    $("#nvm", sh).textContent = durTxt(min); $("#nvk", sh).textContent = `${mTxt(left)} · varış ${at}`;
    rSet(C.slice(0, ni + 1).concat([p]), [p].concat(C.slice(ni + 1)));
    if (step !== lastStep) { lastStep = step; T.classList.remove("pop"); void T.offsetWidth; T.classList.add("pop"); if (!force) { snd.sel?.(); haptic(8); } say(`${mTxt(toTurn)} sonra, ${tx}`); }
    if (toTurn < (mode === "car" ? 120 : mode === "bike" ? 60 : 35) && warned !== step && s.maneuver.type !== "arrive") { warned = step; haptic(25); snd.ok(); say(tx); }
    if (left < 25) { T.querySelector("b").textContent = "Vardın 🎉"; T.querySelector("small").innerHTML = esc(e.venue || ""); if (warned !== -2) { warned = -2; snd.ok(); haptic(40); say("Vardın. İyi eğlenceler!"); } }
    // 3B navigasyon (kullanıcı, 09:22): Apple Haritalar gibi eğik bakış, harita gidiş yönüne döner
    if (follow && mapOk) map.easeTo({ center: [p[1], p[0]], zoom: Math.max(map.getZoom(), mode === "car" ? 16.6 : mode === "bike" ? 17 : 17.6), pitch: 58, bearing: brg(p, C[Math.min(C.length - 1, ni + 4)]), duration: 900 });
  }
  async function start() {
    if (!R || rev || src !== "me") return; nav = true; follow = true; sh.classList.add("nav"); snd.push?.(); haptic(12); vIcon();
    try { wl = await navigator.wakeLock?.request("screen"); } catch {}
    setTimeout(() => { map?.resize(); update(from, true); }, 360);
  }
  function stop() { nav = false; sh.classList.remove("nav"); try { wl?.release(); speechSynthesis.cancel(); } catch {} setTimeout(() => { map?.resize(); fitRoute(); }, 360); haptic(6); }
  $("#nve", sh).addEventListener("click", stop);
  $("#nvv", sh).addEventListener("click", () => { voice = !voice; store.set("nvny-sesli", voice ? "1" : "0"); vIcon(); snd.sel?.(); if (!voice) try { speechSynthesis.cancel(); } catch {} });
  $("#nvc", sh).addEventListener("click", () => { follow = true; sh.classList.remove("free"); if (from && mapOk) { if (nav) update(from, true); else map.easeTo({ center: [from[1], from[0]], zoom: 17, duration: 700 }); } haptic(5); });
  seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.m === mode || !from) return; snd.sel?.(); haptic(4); setMode(b.dataset.m); store.set("nvny-rota-mod", b.dataset.m); paint(); }));
  // harita (MapLibre; 3B binalar, açık/koyu tema haritadaki seçimle aynı)
  let mapOk = false; const LL = (c) => [c[1], c[0]], ln = (P) => ({ type: "Feature", geometry: { type: "LineString", coordinates: P.map(LL) }, properties: {} });
  function rSet(D, Lc) { if (!mapOk) return; map.getSource("rt-d")?.setData(ln(D)); map.getSource("rt-l")?.setData(ln(Lc)); }
  function rDraw() { if (!mapOk) return; rSet([], C); map.setLayoutProperty("rt-f", "visibility", mode === "foot" ? "visible" : "none"); map.setLayoutProperty("rt-c", "visibility", mode === "foot" ? "none" : "visible"); }
  function fitRoute() { if (!mapOk || !C.length) return; const b = C.reduce((b, c) => [[Math.min(b[0][0], c[1]), Math.min(b[0][1], c[0])], [Math.max(b[1][0], c[1]), Math.max(b[1][1], c[0])]], [LL(C[0]), LL(C[0])]);
    const pad = wide() ? { top: 60, bottom: 60, left: card.offsetWidth + 70, right: 70 } : { top: rtop.offsetTop + rtop.offsetHeight + 30, bottom: Math.min(innerHeight * .5, card.offsetHeight - (cTy > 2000 ? card.offsetHeight - cMini() : cTy)) + 30, left: 40, right: 72 };
    map.fitBounds(b, { padding: pad, pitch: d3 ? 55 : 0, bearing: d3 ? map.getBearing() : 0, duration: 700 }); }
  $("#r3d", sh).addEventListener("click", (ev) => { if (!mapOk) return; d3 = !d3; ev.currentTarget.classList.toggle("on", d3); haptic(6); snd.sel?.(); map.easeTo({ pitch: d3 ? 60 : 0, bearing: d3 ? (map.getBearing() || -18) : 0, duration: 750 }); });
  $("#rfit", sh).addEventListener("click", () => { haptic(5); snd.sel?.(); follow = false; fitRoute(); });
  Promise.all([mlgl(), mStyle(mTheme())]).then(([, style]) => { const el = sh.querySelector("#rmap"); if (!document.body.contains(el)) return;
    map = new maplibregl.Map({ container: el, style, center: LL(dest), zoom: 15, maxPitch: 70, attributionControl: { compact: true }, fadeDuration: 150 }); mNvb(map);
    map.on("style.load", () => { const z = { type: "FeatureCollection", features: [] };
      map.addSource("rt-d", { type: "geojson", data: z }); map.addSource("rt-l", { type: "geojson", data: z });
      map.addLayer({ id: "rt-dl", type: "line", source: "rt-d", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#8e8e93", "line-width": 6, "line-opacity": .7 } });
      map.addLayer({ id: "rt-cs", type: "line", source: "rt-l", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#4c1d95", "line-width": 11, "line-opacity": .55 } });
      map.addLayer({ id: "rt-c", type: "line", source: "rt-l", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#a78bfa", "line-width": 7 } });
      map.addLayer({ id: "rt-f", type: "line", source: "rt-l", layout: { "line-cap": "round", "line-join": "round", visibility: "none" }, paint: { "line-color": "#c4b5fd", "line-width": 7, "line-dasharray": [0, 1.9] } });
      mapOk = true; if (C.length) { rDraw(); if (!nav) fitRoute(); } });
    map.on("dragstart", () => { if (nav) { follow = false; sh.classList.add("free"); } });
    new maplibregl.Marker({ element: elOf('<div class="pin"></div>'), anchor: "bottom" }).setLngLat(LL(dest)).addTo(map);
    if (meP) me = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat(LL(meP)).addTo(map);
    if (src === "x" && xPlace) pin(xPlace.ll, '<div class="pin"></div>'); else { const f = F.find((x) => x.id === src); if (f) pin(f.ll, `<span class="fv"><span class="fvp">${favIc(f.n)}</span><b>${esc(f.n)}</b></span>`); }
    if (R) paint();
  }).catch(() => sh.querySelector("#rmap")?.remove());
  /* Nereden? (kullanıcı, 16.11.2026 14:59: "illa konuma gerek yok; okulunu işaretlediyse okuldan, evden ya da başka bir yerden çizelim")
     Konumum · haritada kaydettiğin yerler (Ev, Okul…) · Başka bir yer (semt, adres, yer adı). Kayıtlı ya da aranan yerden çizilen yolda
     navigasyon başlamaz (yalnızca özet ve adım adım tarif); "Başla" yalnızca Konumum seçiliyken. Seçim bu telefonda hatırlanır. */
  const rfr = $("#rfr", sh), rfx = $("#rfx", sh), F = (() => { try { return JSON.parse(store.get("nvny-yerler") || "[]") || []; } catch { return []; } })();
  let src = store.get("nvny-rota-kaynak") || "me", meP = null, srcM = null, xPlace = null, watching = false;
  const pin = (ll, html) => { srcM?.remove(); srcM = null; if (map && html) srcM = new maplibregl.Marker({ element: elOf(html), anchor: "bottom" }).setLngLat([ll[1], ll[0]]).addTo(map); };
  const chips = () => { rfr.innerHTML = `<button type="button" data-s="me" class="${src === "me" ? "on" : ""}"><span class="cgi" style="background:#0a84ff"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="#fff"/></svg></span>Konumum</button>`
      + F.map((f) => `<button type="button" data-s="${f.id}" class="${src === f.id ? "on" : ""}">${favIc(f.n)}${esc(f.n)}</button>`).join("")
      + `<button type="button" data-s="x" class="${src === "x" ? "on" : ""}"><span class="cgi" style="background:rgba(120,120,128,.4)"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" fill="none" stroke="#fff" stroke-width="2.2"/><path d="m15.5 15.5 4 4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></span>${src === "x" && xPlace ? esc(xPlace.n) : "Başka yer"}</button>`;
    rfr.insertAdjacentHTML("afterbegin", `<span class="rfk">${rev ? "Nereye" : "Nereden"}</span>`);
    rfr.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { snd.sel?.(); haptic(4); pick(b.dataset.s, true); })); };
  $("#rsw", sh).addEventListener("click", (ev) => { if (nav) return; rev = !rev; const b = ev.currentTarget; b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin"); snd.sel?.(); haptic(8); chips(); hdr(); if (from) paint(); });
  const go = (p) => { from = p; if (!mode) setMode(km(p, dest) < 2.5 ? "foot" : km(p, dest) < 6 && store.get("nvny-rota-mod") === "bike" ? "bike" : "car"); paint(); };
  const startWatch = () => { if (watching || !navigator.geolocation?.watchPosition) return; watching = true;
    watch = navigator.geolocation.watchPosition((q) => { const np = [q.coords.latitude, q.coords.longitude]; meP = np; DATA.me = { p: np, t: Date.now() }; locSave(np);
      if (map && !me) me = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat([np[1], np[0]]).addTo(map); me?.setLngLat([np[1], np[0]]);
      if (src !== "me" || rev) return;
      if (R && C.length) { let off = 1e9; for (let i = Math.max(0, ni - 3); i < Math.min(C.length, ni + 40); i++) off = Math.min(off, km(np, C[i])); if (off > .06) { from = np; paint(); return; } }
      from = np; if (nav) update(np);
    }, () => {}, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 }); };
  // konum yoksa yol tarifi kapanmaz, başka yere de atlamaz: burada açmasını ister, gelir gelmez yolu çizer
  const locCard = (k, fast) => { from = null; st.innerHTML = ""; const no = k === "off2"; // kullanıcı (13:27): "millete yol gösterme, basınca açılsın": tek cümle, tek düğme
    if (no && fast && /android/i.test(navigator.userAgent)) { try { location.href = "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end"; } catch {} }
    sum.innerHTML = `<div class="lcd"><span class="lci"><svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="#fff"/></svg></span><span class="lct"><b>${no ? "Konum açılmadı" : "Konumun kapalı"}</b><small id="lch">${no ? "Açıldığı an yolu burada çizeriz." : "Aç, yolu hemen çizelim."}</small></span></div><button type="button" class="lcb">Konumunu aç</button>`;
    // 18.11.2026 16:13 (kullanıcı: "konumu aç'a tıkladım, bir şey olmadı"): Chromebook, bilgisayar ve iPhone'da tarayıcı sitenin konumu açmasına izin vermez,
    // bu yüzden düğme hemen reddedildiğinde "bir şey olmuyor" gibi kalıyordu. Yalnızca o durumda, tek satırla cihazın kendi anahtarının yeri yazılır (Android'de ayar ekranı doğrudan açılır).
    if (no && fast && !/android/i.test(navigator.userAgent)) (navigator.permissions?.query ? navigator.permissions.query({ name: "geolocation" }).then((q) => q.state, () => "") : Promise.resolve("")).then((ps) => {
      const ua = navigator.userAgent, den = ps === "denied", h = $("#lch", sum); if (!h) return;
      h.innerHTML = isIOS ? "<b>Ayarlar › Gizlilik › Konum Servisleri</b>'ni aç, sonra tekrar dokun."
        : /CrOS/.test(ua) ? (den ? (standalone ? "Pencerenin <b>⋮</b> menüsü › <b>Uygulama bilgileri</b> › <b>Konum</b>'u aç." : "Adres çubuğundaki <b>simgeye</b> dokun › <b>Konum</b>'u aç.") : "<b>Ayarlar › Güvenlik ve gizlilik › Konum erişimi</b>'ni aç.")
        : den ? (standalone ? "Pencerenin <b>⋮</b> menüsü › <b>Uygulama bilgileri</b> › <b>Konum</b>'u aç." : "Adres çubuğundaki <b>simgeye</b> tıkla › <b>Konum</b>'u aç.")
        : /Mac/.test(ua) ? "<b>Sistem Ayarları › Gizlilik ve Güvenlik › Konum Servisleri</b>'nde tarayıcını aç." : /Windows/.test(ua) ? "<b>Ayarlar › Gizlilik ve güvenlik › Konum</b>'u aç." : "Cihazının konum anahtarını aç.";
      h.insertAdjacentHTML("beforeend", " Açtığın an yolu çizeriz."); });
    $(".lcb", sum).addEventListener("click", (ev) => { const b = ev.currentTarget; b.classList.add("w"); b.textContent = "Konum aranıyor…"; lw?.retry(); snd.sel?.(); haptic(6); }); };
  function pick(s, user) {
    if (nav && s !== "me") return; if (s !== "me") { lw?.stop(); lw = null; } src = s; store.set("nvny-rota-kaynak", s === "x" ? "me" : s); chips(); rfx.hidden = s !== "x" || !!(xPlace && !user); sh.classList.toggle("fixed", s !== "me" || rev);
    if (s === "me") { pin(null); if (meP) { go(meP); return; }
      sum.innerHTML = `<span class="sk" style="display:block;height:52px;border-radius:14px"></span>`;
      lw?.stop(); lw = locWait((p) => { lw = null; meP = p; haptic(8); if (map && !me) me = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat([p[1], p[0]]).addTo(map); if (src === "me") go(p); startWatch(); }, (k, x) => { if (src === "me" && !meP) locCard(k, x); });
      return; }
    if (s === "x") { if (xPlace && !user) { pin(xPlace.ll, '<div class="pin"></div>'); go(xPlace.ll); } else { sum.innerHTML = `<p class="rnote" style="margin:4px 2px">Nereden yola çıkacaksın? Semt, adres ya da yer adı yaz.</p>`; st.innerHTML = ""; setTimeout(() => $("#rfi", sh).focus(), 120); } return; }
    const f = F.find((x) => x.id === s); if (!f) return pick("me"); pin(f.ll, `<span class="fv"><span class="fvp">${favIc(f.n)}</span><b>${esc(f.n)}</b></span>`); go(f.ll);
  }
  let rq = 0; $("#rfi", sh).addEventListener("input", (ev) => { const q = ev.target.value.trim(), my = ++rq, box = $("#rfl", sh); if (q.length < 3) { box.innerHTML = ""; return; }
    setTimeout(() => { if (my !== rq) return; const c = dest; fetch(`https://photon.komoot.io/api/?limit=6&bbox=25.6,35.8,44.9,42.2&lat=${c[0]}&lon=${c[1]}&location_bias_scale=0.3&q=${encodeURIComponent(q)}`).then((r) => r.ok ? r.json() : null).then((j) => { if (my !== rq) return;
      const L = (j?.features || []).filter((f) => (f.properties?.countrycode || "").toUpperCase() === "TR").slice(0, 5);
      box.innerHTML = L.length ? L.map((f, i) => { const p = f.properties; return `<button type="button" data-i="${i}"><b>${esc(p.name || p.street || q)}</b><small>${esc([p.district || p.locality, p.city, p.state].filter(Boolean).join(" · "))}</small></button>`; }).join("") : `<p class="rnote">“${esc(q)}” bulunamadı.</p>`;
      box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { const f = L[+b.dataset.i], [lng, lat] = f.geometry.coordinates; xPlace = { n: f.properties.name || q, ll: [lat, lng] }; snd.sel?.(); haptic(5); $("#rfi", sh).blur(); box.innerHTML = ""; pick("x"); })); }).catch(() => {}); }, 280); });
  chips(); pick(F.some((f) => f.id === src) ? src : "me");
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
      <a class="sme" href="#/?sec=1"><img src="icons/icon-192.png?v=4" alt="" width="60" height="60"><span class="stx"><b>Ne Var Ne Yok</b><small>Şehrim: ${esc(cname)}</small></span>${CHV}</a>
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
    html = head("Ana Ekran") + `<div class="hsc"><img src="icons/icon-192.png?v=4" alt="" width="64" height="64"><div class="hsm">${sc.map(([t, c]) => `<div><i style="background:${c}"></i><b>${t}</b></div>`).join("")}</div></div>
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
    <div class="sn-b"><button type="button" class="${on ? "on" : ""}" data-fl>${on ? I.bellOn + "Seans takipte" : I.bell + "Bu seansı takip et"}</button><button type="button" data-cal>${I.cal}Takvime ekle</button></div><button type="button" class="pcv" data-inv><span>✉️</span><b>Beraber gidelim mi?</b></button>
    <a class="buy" href="${esc(f.url)}" target="_blank" rel="noopener" data-buy="sinemalar.com">Bilet al · sinemalar.com</a>
    <p class="shn">Takip edersen seans Planım'a girer; bir gün önce ve başlamadan önce hatırlatırız.</p></div></div>`, "mn");
  sh.querySelector("[data-inv]").addEventListener("click", () => { sh.close(); const v = vOf(cin.name); setTimeout(() => placeInvite({ n: f.title, s: cin.name, ll: v?.lat ? [v.lat, v.lng] : null, il: city, t: "sinema", w: d, h: t, lock: 1 }), 240); });
  sh.querySelector("[data-fl]").addEventListener("click", (ev) => { const F = follows(), b = ev.currentTarget;
    if (F[id]) { delete F[id]; saveF(F); b.classList.remove("on"); b.innerHTML = I.bell + "Bu seansı takip et"; btn.classList.remove("on"); }
    else { F[id] = { kind: "seans", film: f.id, title: f.title, tk: NV.key(f.title), vk: NV.key(cin.name), venue: cin.name, d, t, city, img: f.img, cat: "sinema", slug: "", status: "", at: Date.now() }; saveF(F); snd.ok(); haptic(8);
      b.classList.add("on"); b.innerHTML = I.bellOn + "Seans takipte"; btn.classList.add("on"); toast(`🍿 Seans Planım'a eklendi. <a href="#/${city}/takip">Planım →</a>`, 4500); gcEv("seans-takip", "Seans takip"); }
    setTop(city); });
  sh.querySelector("[data-cal]").addEventListener("click", () => calAdd({ title: f.title, venue: cin.name, d, t, dur: f.dur ? f.dur + " dk" : "", cat: "sinema", slug: "", city }));
}
function followLists(city) {
  const A = Object.entries(afol()), F = Object.entries(ffol()), N = CNAME();
  return `${A.length ? `<h3 class="fl-h">Takip ettiğin sanatçı ve oyunlar</h3><div class="sgrp">${A.map(([k, a]) => `<div class="srow nr">${cgIcon("standup")}<span class="stx">${esc(a.name)}<small>${(a.seen || []).length} yaklaşan tarih · ${[...new Set((a.seen || []).map((s) => N[s.split("/")[0]]).filter(Boolean))].slice(0, 3).join(", ") || "yeni tarih bekleniyor"}</small></span><button type="button" class="spill gh" data-ax="${esc(k)}">Bırak</button></div>`).join("")}</div>` : ""}
  ${F.length ? `<h3 class="fl-h">Takip ettiğin filmler</h3><div class="sgrp">${F.map(([id, f]) => `<a class="srow" href="#/${f.city}/film/${esc(id)}">${cgIcon("sinema")}<span class="stx">${esc(f.title)}<small>${f.had ? "Vizyonda · " + esc(N[f.city] || "") : "Seansları bekleniyor"}</small></span><button type="button" class="spill gh" data-fx="${esc(id)}" onclick="event.preventDefault()">Bırak</button></a>`).join("")}</div>` : ""}
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
  return `<section class="gas"><h3>Gittin mi?</h3><p>Gittiklerin yıl sonunda özetinde çıkar.</p>${S.slice(-5).reverse().map((x) => `<div class="ga" data-gid="${esc(x.id)}"><span class="ga-p">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer">` : ""}</span><span class="ga-t"><b>${esc(x.title)}</b><small>${esc(dShort(x.d))} · ${esc(x.venue)}</small></span><span class="ga-b"><button type="button" data-go="1">Gittim 🎉</button><button type="button" data-go="0" aria-label="Gitmedim">Gitmedim</button></span></div>`).join("")}</section>`;
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
  return `<a class="yil${win ? " dec" : ""}" href="#/${city}/yilim"><span class="yl-e"><span class="cgi" style="background:linear-gradient(135deg,#ff375f,#bf5af2)"><svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="2" fill="#fff"/><rect x="3" y="7" width="18" height="4" rx="1.5" fill="#fff"/><path d="M12 7v13" stroke="#ff375f" stroke-width="2"/><path d="M12 7c-1.5-3-5-3.5-5-1.2C7 7 9.5 7 12 7c2.5 0 5 0 5-1.2C17 3.5 13.5 4 12 7z" fill="none" stroke="#fff" stroke-width="1.6"/></svg></span></span><span><b>${win ? `${y} özetin hazır` : `${y} özetin`}</b><small>${G.length ? `${G.length} etkinlik${win ? " · izle ve paylaş" : " · aralıkta tam özetin çıkacak"}` : "Gittiğin etkinlikler yıl sonunda özetine dönüşür"}</small></span><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`;
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
const TABN = { "": "Bugün", kesfet: "Keşfet", sinema: "Sinema", harita: "Harita", takip: "Planım", ayarlar: "Ayarlar", yilim: "Özetin" };
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
  const pn = sh.querySelector(".pn"); if (!pn || pn.classList.contains("rtp")) return; // yol tarifi tam ekran harita: kendi kartı sürüklenir let y0 = 0, dy = 0, on = false, t0 = 0;
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
  const sh = sheet(`<div class="pn wxp" role="dialog" aria-label="Hava durumu"><div class="hd"><button type="button" class="sbk" data-close><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Geri</button><span></span></div><div class="bd2" id="wxb2"><div class="sk" style="height:60vh;border-radius:20px"></div></div></div>`, "mn wxs");
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

/* ---------- Harita motoru: MapLibre GL (kullanıcı isteği, 16.11.2026 09:22: "Apple Haritalar mantığında; 3 boyutlu; açık/koyu; uzaktan mor ısı haritası") ----------
   Anahtarsız: OpenFreeMap'in OpenStreetMap haritası (liberty stili). Koyu harita aynı stilin renkleri koyulaştırılarak telefonda üretilir.
   3B binalar stilin kendi bina katmanından (yüksekliği OpenStreetMap'teki kat bilgisi). */
const ML_V = "4.7.1";
let mlP = null;
const loadJS = (src, ms) => new Promise((res, rej) => { const s = document.createElement("script"), t = setTimeout(() => { s.remove(); rej(new Error("süre")); }, ms); s.src = src; s.onload = () => { clearTimeout(t); res(); }; s.onerror = () => { clearTimeout(t); s.remove(); rej(new Error("js")); }; document.head.append(s); });
// harita motoru önce kendi sitemizden (pages.yml vendor/ klasörüne koyar), olmazsa iki ayrı dağıtım ağından: biri kapalıysa harita yine açılır
const mlgl = () => mlP ||= window.maplibregl ? Promise.resolve() : (async () => { for (const b of ["/vendor/maplibre/", `https://unpkg.com/maplibre-gl@${ML_V}/dist/`, `https://cdn.jsdelivr.net/npm/maplibre-gl@${ML_V}/dist/`]) { try { await loadJS(b + "maplibre-gl.js", 15000); if (!window.maplibregl) continue; const c = document.createElement("link"); c.rel = "stylesheet"; c.href = b + "maplibre-gl.css"; document.head.append(c); return; } catch {} } mlP = null; throw new Error("maplibre"); })();
const MAP_URL = window.NVNY_MAPSTYLE || "https://tiles.openfreemap.org/styles/liberty";
const mTheme = () => store.get("nvny-harita-tema") || "koyu";
let MSJ = null; const MST = {};
const mBina = () => Promise.race([mlgl().then(bjs).then((B) => B.bina(maplibregl)).catch(() => false), new Promise((r) => setTimeout(() => r(false), 1300))]);
const mNvb = (map) => { const up = () => bjs().then((B) => B.bina(maplibregl).then((ok) => { if (ok && map.getStyle?.()) B.liveB(map); })).catch(() => {}); map.on("style.load", up); up(); };
const mStyle = (th) => MST[th] ||= Promise.all([MSJ ||= jget(MAP_URL).then((j) => { if (!j) throw new Error("style"); return j; }).catch((e) => { MSJ = null; throw e; }), mBina()])
  .then(([j, ok]) => { const s = JSON.parse(JSON.stringify(j)); if (th === "koyu") darkStyle(s); build3d(s, th); if (ok) window.NVB.useB(s); trNames(s); skyOf(s, th); return s; }).catch((e) => { delete MST[th]; throw e; });
const cvx = document.createElement("canvas").getContext("2d");
const rgbOf = (c) => { if (typeof c !== "string" || c.length > 40) return null; cvx.fillStyle = "#010203"; cvx.fillStyle = c; const v = cvx.fillStyle; if (v === "#010203" && !/^#010203$/i.test(c)) return null;
  if (v[0] === "#") return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1]; const m = v.match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1] : null; };
const toHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let h = 0, s = 0; if (M !== m) { const d = M - m; s = l > .5 ? d / (2 - M - m) : d / (M + m); h = (M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6; } return [h * 360, s, l]; };
const hslS = (h, s, l, a) => `hsla(${Math.round(h)},${Math.round(s * 100)}%,${(Math.min(1, Math.max(0, l)) * 100).toFixed(1)}%,${a})`;
// Apple Haritalar'ın gece görünümü gibi: zemin lacivert-siyah, su koyu mavi, yollar gri, yazılar açık; renklerin tonu korunur
function darkStyle(st) {
  const f = (p) => (c) => { const v = rgbOf(c); if (!v) return c; const [h, s, l] = toHsl(v), a = v[3];
    if (p === "text-color") return hslS(h, s * .45, .64 + l * .28, a);
    if (p === "text-halo-color" || p === "icon-halo-color") return `rgba(11,11,18,${(Math.min(1, a) * .9).toFixed(2)})`;
    if (p === "line-color") return hslS(h, s * .4, .14 + l * .17, a);
    if (p === "fill-extrusion-color") return hslS(250, .1, .15 + (1 - l) * .08, a);
    return hslS(h, s * .38, .055 + (1 - l) * .2, a); };
  const walk = (x, fn) => Array.isArray(x) ? x.map((y) => walk(y, fn)) : typeof x === "string" ? fn(x) : x && typeof x === "object" && x.stops ? { ...x, stops: x.stops.map(([z, v]) => [z, walk(v, fn)]) } : x;
  for (const L of st.layers || []) { const p = L.paint ||= {};
    if (L.type === "background") { p["background-color"] = "#0c0c14"; continue; }
    for (const k of Object.keys(p)) if (/-color$/.test(k)) p[k] = walk(p[k], f(k));
    if (L.type === "symbol" && p["icon-opacity"] == null) p["icon-opacity"] = .7;
    if (L.type === "raster") p["raster-brightness-max"] = .35; }
}
// yer adları Türkçe (OpenStreetMap'teki name:tr, yoksa yerel ad): "Black Sea" değil "Karadeniz"
function trNames(st) { for (const L of st.layers || []) { const tf = L.layout?.["text-field"]; if (!tf) continue; const j = JSON.stringify(tf); if (!/name/.test(j) || /ref|housenumber/.test(j)) continue; L.layout["text-field"] = ["coalesce", ["get", "name:tr"], ["get", "name"]]; } }
// 3B'de ufuk ve gökyüzü (eğince haritanın ucu gökyüzüne yumuşakça kaybolur, Apple Haritalar gibi)
function skyOf(st, th) { st.sky = th === "koyu" ? { "sky-color": "#0b0a16", "horizon-color": "#221a3d", "fog-color": "#0c0c14", "sky-horizon-blend": .6, "horizon-fog-blend": .7, "fog-ground-blend": .55, "atmosphere-blend": 0 }
  : { "sky-color": "#a9cdf5", "horizon-color": "#e8eef8", "fog-color": "#f2f2f4", "sky-horizon-blend": .6, "horizon-fog-blend": .7, "fog-ground-blend": .55, "atmosphere-blend": 0 }; }
function build3d(st, th) {
  const L = st.layers || []; if (L.some((x) => x.type === "fill-extrusion")) return;
  const src = Object.keys(st.sources || {}).find((k) => st.sources[k].type === "vector"); if (!src) return;
  let at = L.length; for (let i = L.length - 1; i >= 0; i--) if (L[i].type !== "symbol") { at = i + 1; break; }
  L.splice(at, 0, { id: "nv-3d", type: "fill-extrusion", source: src, "source-layer": "building", minzoom: 14,
    paint: { "fill-extrusion-color": th === "koyu" ? "#1c1b27" : "#e4e1ea", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 9], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": .88 } });
}
// kategori simgeleri haritaya resim olarak (renkli daire, beyaz çizim, beyaz kenar; 2× keskin)
const mImgs = () => Promise.all(Object.entries(CG).map(([k, [bg, d]]) => new Promise((res) => {
  const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 76; const x = c.getContext("2d");
    x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 8; x.shadowOffsetY = 3; x.beginPath(); x.arc(38, 36, 30, 0, 7); x.fillStyle = "#fff"; x.fill(); x.shadowColor = "transparent";
    x.beginPath(); x.arc(38, 36, 26, 0, 7); x.fillStyle = bg; x.fill(); x.drawImage(im, 21, 19, 34, 34); res([k, x.getImageData(0, 0, 76, 76)]); };
  im.onerror = () => res(null); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="68" height="68">${d}</svg>`); }))).then((a) => a.filter(Boolean));
// cam hap (il etiketleri ve "etkinlik daha" için; içindeki yazıya göre uzar)
const mPill = (fill, edge) => { const c = document.createElement("canvas"); c.width = c.height = 80; const x = c.getContext("2d"); x.beginPath(); x.roundRect(4, 4, 72, 72, 32); x.fillStyle = fill; x.fill(); x.lineWidth = 2; x.strokeStyle = edge; x.stroke(); return x.getImageData(0, 0, 80, 80); };
const mPillOpt = { pixelRatio: 2, stretchX: [[38, 42]], stretchY: [[38, 42]], content: [22, 14, 58, 66] };
const brg = (a, b) => { const r = Math.PI / 180, y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r), x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r); return (Math.atan2(y, x) / r + 360) % 360; };
const circlePoly = (ll, kmR) => { const P = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 2 * Math.PI; P.push([ll[1] + kmR / (111.32 * Math.cos(ll[0] * Math.PI / 180)) * Math.cos(a), ll[0] + kmR / 110.57 * Math.sin(a)]); } return { type: "Feature", geometry: { type: "Polygon", coordinates: [P] }, properties: {} }; };
const elOf = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };

/* ---------- Harita sekmesi: bütün Türkiye, Apple Haritalar gibi (kullanıcı isteği, 16.11.2026 02:17, 08:53, 09:17, 09:22) ----------
   Uzaktan bütün etkinlikler mor ısı haritası (konumu henüz bulunmayanlar ilin merkezinde sayılır) ve il adları + etkinlik sayısı;
   yaklaşınca mekânlar kategori simgesiyle, iyice yaklaşınca afişleriyle. Başlamak üzere olan etkinliğin mekânı nabız gibi atar, tükenenler soluk.
   Filtreler: ne zaman, saat (Apple saat çarkı gibi tık tık; "Tüm gün"), bütçe (yalnızca doğrulanmış fiyat), kategori, tükenenleri gizle.
   3B (binalar, eğik bakış), açık/koyu harita, pusula, "Etrafımda ne var" (15 dk yürüme halkası), kayıtlı yerler (basılı tut → "Ev", "Okul"…),
   son aramalar ("Temizle"ye kadar), harita en son kaldığı yerde açılır. Hepsi yalnızca bu telefonda saklanır. */
const HM0 = { when: "tumu", cats: [], from: "", bud: 0, tk: false };
const HM = (() => { try { return { ...HM0, ...JSON.parse(store.get("nvny-harita") || "{}") }; } catch { return { ...HM0 }; } })();
const hmSave = () => store.set("nvny-harita", JSON.stringify(HM));
const jsGet = (k, d) => { try { return JSON.parse(store.get(k) || "null") ?? d; } catch { return d; } };
const favs = () => jsGet("nvny-yerler", []), favSave = (L) => store.set("nvny-yerler", JSON.stringify(L));
const recents = () => jsGet("nvny-hson", []), recAdd = (r) => { const L = recents().filter((x) => x.k !== r.k || x.l !== r.l); L.unshift(r); store.set("nvny-hson", JSON.stringify(L.slice(0, 8))); };
// kayıtlı yer simgeleri (Apple Haritalar'daki gibi renkli daire, beyaz çizim): yazdığın ada göre kendiliğinden seçilir
const FAVI = [[/^(ev|evim|home)\b|^ev$/, "#0a84ff", '<path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" fill="#fff"/>'],
  [/okul|üni|kampüs|fakülte|lise|kurs|dershane|yurt|yurd/, "#ff9f0a", '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z" fill="#fff"/><path d="M6.5 11.8V16c3.2 2.4 7.8 2.4 11 0v-4.2L12 14.5z" fill="#fff"/>'],
  [/(^|\s)iş(yeri|im)?(\s|$)|ofis|büro|şirket|work|plaza/, "#a2845e", '<rect x="4" y="8" width="16" height="11" rx="2.2" fill="#fff"/><path d="M9 8V6.3c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V8" fill="none" stroke="#fff" stroke-width="1.9"/>'],
  [/spor|gym|fitness|havuz|halı ?saha|antrenman/, "#ff375f", '<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'],
  [/kafe|cafe|kahve|starbucks|çay/, "#ac8e68", '<path d="M5 9h11v5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14z" fill="#fff"/><path d="M16 10.5h1.5a2.3 2.3 0 0 1 0 4.6H16" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M8.5 4.5v2M11.5 4.5v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'],
  [/hastane|doktor|sağlık|eczane|klinik/, "#ff3b30", '<path d="M10 4.5h4v5.5h5.5v4H14v5.5h-4V14H4.5v-4H10z" fill="#fff"/>'],
  [/park|bahçe|orman|göl|sahil|deniz/, "#34c759", '<path d="M12 3.5 6.5 11h3L6 16h12l-3.5-5h3z" fill="#fff"/><path d="M12 16v4.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'],
  [/market|alışveriş|avm|çarşı/, "#ffb800", '<path d="M4 5h2.2l2 10h9.3l1.8-7H7.3" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="9.5" cy="18.8" r="1.6" fill="#fff"/><circle cx="16.5" cy="18.8" r="1.6" fill="#fff"/>'],
  [/sevgil|aşk|kalbim|nişanl|eş(im)?$/, "#ff2d55", '<path d="M12 19.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" fill="#fff"/>'],
  [/anne|baba|annem|babam|aile|dede|nine|teyze|hala|amca|dayı|kardeş|arkadaş/, "#bf5af2", '<circle cx="9" cy="8.5" r="2.8" fill="#fff"/><circle cx="16" cy="9.5" r="2.3" fill="#fff"/><path d="M3.5 19c.4-3.6 2.7-5.6 5.5-5.6s5.1 2 5.5 5.6zM14 13.6c2.9-.6 5.6 1.1 6.3 5.4h-4.6" fill="#fff"/>'],
  [/./, "#8b5cf6", '<path d="M12 4.5l2.3 4.9 5.2.6-3.9 3.6 1.1 5.2L12 16.2l-4.7 2.6 1.1-5.2-3.9-3.6 5.2-.6z" fill="#fff"/>']];
const favIc = (n) => { n = String(n || "").toLocaleLowerCase("tr"); const m = FAVI.find(([r]) => r.test(n)) || FAVI[FAVI.length - 1]; return `<span class="cgi" style="background:${m[1]}"><svg viewBox="0 0 24 24">${m[2]}</svg></span>`; };
let HIDX = null;
// Harita dizini. İnemezse (zayıf çekim, uygulama arkada beklerken bağlantı kopması) sonuç önbelleğe "boş" diye yazılmaz: bir sonraki çağrı yeniden dener.
// (16.11.2026 19:54, kullanıcı ekranı: "0 etkinlik · 0 mekân" — başarısız indirme boş liste gibi gösteriliyordu.)
const hIdx = () => HIDX ||= getTO("/idx/harita.json", { cache: "no-cache" }, 30000).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => stale("/idx/harita.json", 8000))
  .then((j) => { if (!Array.isArray(j?.e) || !j.e.length) throw new Error("bos"); if (j.t) for (const x of j.e) { x[2] = j.t[x[2]]; x[6] = x[6] >= 0 ? j.i[x[6]] : ""; } return j; })
  .catch(() => { HIDX = null; return null; });
const hmRange = (when) => { const { d: today } = nowIST(), dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7);
  return { bugun: [today, today], yarin: [addD(today, 1), addD(today, 1)], haftasonu: [dow === 6 || dow === 0 ? today : fri, dow === 0 ? today : addD(fri, 2)], hafta: [today, addD(today, 6)], ay: [today, addD(today, 30)], tumu: [today, "9999"] }[when] || [today, "9999"]; };
const hmPrice = (x) => x[10] && Date.now() / 36e5 - x[11] <= PRICE_MAX_H ? x[10] : 0; // fiyat kuralı: 36 saatten eski fiyat yok sayılır
// sinema satırında x[14] bütün seans saatleri: bugün son seansı geçmediyse ve seçilen saatten sonra seansı varsa görünür
const hmLast = (x) => x[14] ? x[14].slice(-5) : x[4];
const hmFilter = (IX, F) => { const [a, b] = hmRange(F.when), { d: today, hm } = nowIST();
  return IX.e.filter((x) => x[3] >= a && x[3] <= b && !(x[3] === today && x[4] && hmLast(x) < hm && timeDiff(hmLast(x), hm) > (x[14] ? 0 : 120)) && (!F.cats.length || F.cats.includes(x[5]))
    && (!F.from || (x[4] && hmLast(x) >= F.from)) && (!F.tk || x[9] !== "t") && (!F.bud || (F.bud < 0 ? x[12] : hmPrice(x) && hmPrice(x) <= F.bud))); };
// etkinlik → etkinlik sayfası; film → o günün seanslarıyla film sayfası
const hmHref = (x, c) => x[13] ? `#/${x[7] || c}/film/${x[13]}?gun=${x[3]}` : `#/${x[7] || c}/e/${encodeURIComponent(x[1])}`;
const hmTimes = (x) => { if (!x[14]) return x[4] ? esc(x[4]) + soon(x) : "Saat sitede"; const { d, hm } = nowIST(); const T = x[14].split(" ").filter((t) => x[3] !== d || t >= hm); return (T.length ? T.slice(0, 6).join(" · ") + (T.length > 6 ? " …" : "") : x[14].split(" ").slice(-1)[0]) + " seans"; };
const HMW = [["tumu", "Tümü"], ["bugun", "Bugün"], ["yarin", "Yarın"], ["haftasonu", "Hafta sonu"], ["hafta", "Bu hafta"], ["ay", "Bu ay"]];
const HMB = [[0, "Hepsi"], [-1, "Ücretsiz"], [250, "₺250'ye kadar"], [500, "₺500'e kadar"], [1000, "₺1.000'e kadar"]];
const hmTags = () => [HM.when !== "tumu" && HMW.find((w) => w[0] === HM.when)[1], HM.from && HM.from + " sonrası", HM.bud && HMB.find((b) => b[0] === HM.bud)?.[1], ...HM.cats.map((k) => CATS[k]), HM.tk && "Tükenenler gizli"].filter(Boolean);
const ICO = {
  d3: '<svg viewBox="0 0 24 24"><text x="12" y="16.3" text-anchor="middle" font-family="-apple-system,Inter Tight,sans-serif" font-weight="800" font-size="11.5" fill="currentColor">3B</text></svg>',
  d2: '<svg viewBox="0 0 24 24"><text x="12" y="16.3" text-anchor="middle" font-family="-apple-system,Inter Tight,sans-serif" font-weight="800" font-size="11.5" fill="currentColor">2B</text></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" fill="currentColor"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  me: '<svg viewBox="0 0 24 24"><path d="M19.5 4.5 4.5 11l6.5 2 2 6.5z" fill="currentColor"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M12 3.5 21 12l-9 8.5L3 12z" fill="currentColor"/><path d="M9 14.5V12a1.5 1.5 0 0 1 1.5-1.5H15m-2-2 2 2-2 2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flt: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="7" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="17" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  cmp: '<svg viewBox="0 0 24 24"><path d="M12 3.5 15 12h-6z" fill="#ff453a"/><path d="M12 20.5 9 12h6z" fill="currentColor" opacity=".55"/></svg>',
};
/* Saat çarkı (Apple saat/zamanlayıcı gibi yatay cetvel): çeyrek saatte bir metalik tık + hafif titreşim; büyük saat yazısı.
   Haritanın üstündeki "Saat" düğmesinden ve filtre panelinden aynı çark açılır. */
const TR_STEP = 15, TR_N = 24 * 60 / TR_STEP;
const trHH = (i) => `${String(Math.floor(i * TR_STEP / 60)).padStart(2, "0")}:${String(i * TR_STEP % 60).padStart(2, "0")}`;
/* (kullanıcı, 10:57: "dairesel, Apple usulü; o an gelen saat büyüsün, sonra normale dönsün, tık tık") iPhone'un saat/alarm çarkı gibi iki sütunlu silindir:
   saat (00–23) ve dakika (00·15·30·45). Kaydırınca sayılar silindirin yüzeyinde döner (rotateX), ortaya gelen büyür ve beyazlaşır, uzaklaşanlar
   yatıp küçülür ve solar; ortadaki cam şerit seçimi gösterir; her yeni sayıda metalik tık + titreşim. Yalnızca transform/opacity. */
/* Saat seçici (kullanıcı, 11:08: "sallanmasın, düzgün olsun; gelen büyüsün; tık tık Apple gibi"):
   tarayıcının kaydırmasını kullanmaz (telefonda kaydırma ile çizim arasındaki gecikme sayıları titretiyordu); parmak doğrudan izlenir,
   bütün sayılar aynı karede tek hesapla yerleşir. Düz yatay şerit; ortaya gelen yumuşakça ×1,55 büyür, beyazlaşır ve buzlu cam kapsülde durur,
   uzaklaşanlar küçülüp solar. Bırakınca hızına göre kayar ve en yakın çeyrek saate yaylanarak oturur (Apple gibi). Her yeni saatte tık + titreşim.
   Harita ancak çark durunca yenilenir (çevirirken takılma olmasın). Yalnızca transform/opacity. */
const DW_W = 76, DW_N = 96;
const dwT = (i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String(i % 4 * 15).padStart(2, "0")}`;
const trHTML = () => `<div class="hf-rl"><div class="hw2"><span class="hw2-hl"></span><div class="hw2-c">${Array.from({ length: DW_N }, (_, i) => `<b class="${i % 4 ? "" : "h"}">${dwT(i)}</b>`).join("")}</div></div></div>`;
const trNext = () => { const n = nowIST().hm, m = Math.ceil((+n.slice(0, 2) * 60 + +n.slice(3, 5)) / 60) * 60 % 1440; return `${String(m / 60).padStart(2, "0")}:00`; };
function trBind(root, get, set) {
  const c = root.querySelector(".hw2-c"), B = [...c.querySelectorAll("b")], max = DW_N - 1;
  let p = 0, last = -1, anim = 0, drag = null, vis = new Set();
  const idxOf = (t) => Math.round((+t.slice(0, 2) * 60 + +t.slice(3, 5)) / 15);
  const paint = () => { const lo = Math.max(0, Math.floor(p) - 6), hi = Math.min(max, Math.ceil(p) + 6), now = new Set();
    for (let i = lo; i <= hi; i++) { const b = B[i], d = i - p, a = Math.abs(d), k = Math.max(0, 1 - a); now.add(i);
      b.style.transform = `translate3d(${(d * DW_W).toFixed(2)}px,0,0) scale(${(1 + .45 * k * k * (3 - 2 * k)).toFixed(3)})`; b.style.opacity = (a < 1 ? 1 - a * .35 : Math.max(0, .65 - (a - 1) * .14)).toFixed(3); b.classList.toggle("on", a < .5); }
    for (const i of vis) if (!now.has(i)) B[i].style.opacity = 0; vis = now;
    const r = Math.round(p); if (r !== last) { const first = last < 0; last = r; if (!first && get()) { tick(); set(dwT(r), false); } } };
  const settle = () => { if (get()) set(dwT(Math.round(p)), true); };
  // yay benzeri oturma (Apple'ın kaydırma eğrisi gibi: hızlı başlar, yumuşakça durur)
  const go = (target, ms = 380) => { cancelAnimationFrame(anim); const from = p, t0 = performance.now(), T = Math.max(220, Math.min(900, ms));
    const f = (t) => { const x = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - x, 3); p = from + (target - from) * e; paint(); if (x < 1) anim = requestAnimationFrame(f); else { p = target; paint(); settle(); } }; anim = requestAnimationFrame(f); };
  c.addEventListener("pointerdown", (ev) => { if (!get()) return; cancelAnimationFrame(anim); drag = { x: ev.clientX, y: ev.clientY, p, v: 0, t: performance.now(), lx: ev.clientX, on: false, id: ev.pointerId }; });
  c.addEventListener("pointermove", (ev) => { if (!drag || ev.pointerId !== drag.id) return; const dx = ev.clientX - drag.x;
    if (!drag.on) { if (Math.abs(dx) < 6) return; if (Math.abs(ev.clientY - drag.y) > Math.abs(dx)) { drag = null; return; } drag.on = true; try { c.setPointerCapture(ev.pointerId); } catch {} }
    const now = performance.now(), dt = Math.max(1, now - drag.t); drag.v = .8 * ((drag.lx - ev.clientX) / DW_W / dt) + .2 * drag.v; drag.t = now; drag.lx = ev.clientX;
    let np = drag.p - dx / DW_W; if (np < 0) np = -Math.pow(-np, .6) * .5; if (np > max) np = max + Math.pow(np - max, .6) * .5; p = np; paint(); });
  const up = (ev) => { if (!drag) return; const d = drag; drag = null; if (!d.on) return; const target = Math.max(0, Math.min(max, Math.round(p + d.v * 260)));
    go(target, 260 + Math.abs(target - p) * 45); };
  c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  let wt = 0; c.addEventListener("wheel", (ev) => { if (!get()) return; ev.preventDefault(); cancelAnimationFrame(anim); p = Math.max(0, Math.min(max, p + (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY) / DW_W)); paint(); clearTimeout(wt); wt = setTimeout(() => go(Math.round(p), 220), 120); }, { passive: false });
  B.forEach((b, i) => b.addEventListener("click", () => { if (!get()) { set(dwT(i), true); } go(i, 260 + Math.abs(i - p) * 40); }));
  const to = (t, smooth) => { const i = idxOf(t); if (smooth) go(i); else { cancelAnimationFrame(anim); p = i; last = i; paint(); } };
  return { to, sync: () => { root.querySelector(".hf-rl").classList.toggle("off", !get()); to(get() || "19:00", false); } };
}
function viewHarita(city, Q = {}) {
  turAt("harita"); setTop(city); document.title = `Harita · Ne Var Ne Yok`;
  V.innerHTML = `<div class="hmap${mTheme() === "acik" ? " lt" : ""}" id="hmw"><div class="map" id="hm"></div>
    <div class="hm-top"><form class="hm-q" id="hmq" role="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><input id="hmi" type="search" placeholder="Etkinlik, mekân, il ya da yer ara" autocomplete="off" enterkeyhint="search"><button type="button" class="hm-x" id="hmx" aria-label="Temizle" hidden>✕</button><button type="button" class="hm-f" id="hmf" aria-label="Filtreler">${ICO.flt}<i id="hmfn"></i></button></form>
    <div class="hm-r" id="hmr" hidden></div><div class="hm-t" id="hmt"></div></div>
    <div class="hm-ctl"><button type="button" id="hm3" aria-label="3B görünüm">${ICO.d3}</button><button type="button" id="hmth" aria-label="Açık ya da koyu harita">${mTheme() === "acik" ? ICO.moon : ICO.sun}</button><button type="button" id="hmme" class="bl" aria-label="Etrafımda ne var">${ICO.me}</button></div>
    <button type="button" class="hm-cmp" id="hmc" aria-label="Kuzeye çevir" hidden>${ICO.cmp}</button>
    <div class="hm-tc" id="hmtc" hidden><div class="hm-tch"><span><b>Başlama saati</b><small id="hmtl"></small></span><div class="hm-seg" role="tablist"><i></i><button type="button" data-ta="1">Tüm gün</button><button type="button" data-ta="0">Saat seç</button></div><button type="button" class="hm-tcx" aria-label="Kapat">✕</button></div><div id="hmtr">${trHTML()}</div></div>
    <button type="button" class="hm-n" id="hmn"><span class="sk" style="display:inline-block;width:150px;height:14px;border-radius:7px"></span></button></div>`;
  const el = $("#hm"), wrap = $("#hmw"), N = CNAME(); let map = null, IX = null, retryIx = null, VG = [], UG = new Map(), E = [], pinM = null, meM = null, live = 0, posters = new Map(), favM = [], raf = 0;
  const alive = () => document.body.contains(el);
  const vSheet = (g) => { const today = nowIST().d, S = new Set(g.L), rg = hmRange(HM.when); venueSheetX({ ...g, more: g.vi == null ? [] : IX.e.filter((x) => x[0] === g.vi && !S.has(x) && x[3] >= today && (x[3] < rg[0] || x[3] > rg[1]) && x[3] <= addD(today, 120)) }); };
  const lt = () => mTheme() === "acik";
  /* adı bilinen yerler: yakınlaşınca görünür, dokununca adı hazır yer kartı açılır; yalnızca bakılan bölgenin küçük dosyası iner */
  const YVC = new Map(), YVT = ["kafe", "yemek", "bar", "park", "muze", "sahne", "avm", "gezi", "spor", "sinema", "yer", "kutuphane"], YVL = ["Kafe", "Restoran", "Mekân", "Park", "Müze", "Sahne", "AVM", "Gezilecek yer", "Spor", "Sinema", "Yer", "Kütüphane"], YVR = ["#ff9f0a", "#ff6b4a", "#bf5af2", "#30d158", "#64d2ff", "#ff375f", "#5e5ce6", "#ffd60a", "#32ade6", "#ff2d55", "#98989f", "#5ac8fa"];
  const yvCell = (la, lo) => `${Math.floor(la * 10)}_${Math.floor(lo * 10)}`, yvGet = (c) => { if (!YVC.has(c)) YVC.set(c, fetch(`/yv/${c}.json`).then((r) => r.ok && /json/.test(r.headers.get("content-type") || "") ? r.json() : []).catch(() => [])); return YVC.get(c); };
  const yvAround = async (ll, r) => { const S = new Set(); for (const a of [-r, 0, r]) for (const o of [-r, 0, r]) S.add(yvCell(ll[0] + a, ll[1] + o)); return (await Promise.all([...S].map(yvGet))).flat(); };
  const YVLM = /cami|mescit|kilise|sinagog|t[üu]rbe|an[ıi]t|heykel|m[üu]ze|kale|hastane|[üu]niversite|lise|okul|belediye|valilik|istasyon|gar[ıi]|meydan/i; let yvT = 0, yvQ = 0; const yvSync = () => { clearTimeout(yvT); yvT = setTimeout(async () => { if (!map?.getSource("yv") || map.getZoom() < 14.8) { map?.getSource("yv")?.setData({ type: "FeatureCollection", features: [] }); return; } const q = ++yvQ, c = map.getCenter(), b = map.getBounds(), L = await yvAround([c.lat, c.lng], .1); if (q !== yvQ || !map) return; const pr = (x) => YVLM.test(x[0]) ? 0 : x[3] !== 10 && x[3] > 2 ? 1 : x[3] !== 10 ? 2 : 3, V = L.filter((x) => b.contains([x[2], x[1]])).map((x) => [x, pr(x)]).sort((x, y) => x[1] - y[1]).slice(0, 1600); map.getSource("yv").setData({ type: "FeatureCollection", features: V.map(([x, p]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [x[2], x[1]] }, properties: { n: x[0], k: YVL[x[3]], c: /cami|mescit/i.test(x[0]) ? "#34c58a" : YVR[x[3]], p } })) }); }, 160); };
  // veriyi haritanın anlayacağı biçime çevir (filtre değişince yalnızca kaynaklar yenilenir; katmanlar yerinde kalır)
  const build = () => {
    E = hmFilter(IX, HM); const { d: today, hm } = nowIST(), now = +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
    const byV = new Map(); UG = new Map(); for (const x of E) { if (x[0] >= 0) (byV.get(x[0]) || byV.set(x[0], []).get(x[0])).push(x); else (UG.get(x[7]) || UG.set(x[7], []).get(x[7])).push(x); }
    VG = [...byV].map(([vi, L]) => ({ v: IX.v[vi], L, vi })); const byC = new Map(); live = 0;
    const vf = VG.map((g, i) => { const cc = {}; for (const x of g.L) cc[x[5]] = (cc[x[5]] || 0) + 1; const top = Object.entries(cc).sort((p, q) => q[1] - p[1])[0][0];
      const lv = g.L.some((x) => x[3] === today && x[4] && (() => { const m = +x[4].slice(0, 2) * 60 + +x[4].slice(3, 5) - now; return m <= 180 && m >= -60; })()); if (lv) live++; g.lv = lv;
      byC.set(g.v[2], (byC.get(g.v[2]) || 0) + g.L.length);
      return { type: "Feature", geometry: { type: "Point", coordinates: [g.v[1], g.v[0]] }, properties: { i, n: g.L.length, ic: CG[top] ? "c-" + top : "c-diger", so: g.L.every((x) => x[9] === "t") ? 1 : 0, lv: lv ? 1 : 0, nm: g.v[3] } }; });
    for (const [c, L] of UG) byC.set(c, (byC.get(c) || 0) + L.length);
    const uf = [...UG].filter(([c]) => ILLL[c]).map(([c, L]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [ILLL[c][1], ILLL[c][0]] }, properties: { c, n: L.length, t: `${L.length.toLocaleString("tr-TR")} etkinlik daha` } }));
    const cf = [...byC].filter(([c]) => ILLL[c]).map(([c, n]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [ILLL[c][1], ILLL[c][0]] }, properties: { c, n, me: c === city ? 1 : 0, nm: N[c] || c, t: `${n.toLocaleString("tr-TR")} etkinlik`, k: -(n + (c === city ? 1e6 : 0)) } }));
    const fc = (F) => ({ type: "FeatureCollection", features: F });
    return { hv: fc(vf), hu: fc(uf), hc: fc(cf), hh: fc([...vf, ...uf]) };
  };
  const setData = () => { if (!map || !IX) return; const D = build(); for (const k of Object.keys(D)) map.getSource(k)?.setData(D[k]);
    if (!IX.e.length) { $("#hmn").classList.add("err"); $("#hmn").innerHTML = `<b>Etkinlikler yüklenemedi</b><small> · Tekrar dene</small>`; return; }
    $("#hmn").classList.remove("err"); $("#hmn").innerHTML = `<b>${E.length.toLocaleString("tr-TR")}</b> etkinlik${HM.when === "tumu" ? "" : " · " + HMW.find((w) => w[0] === HM.when)[1].toLowerCase()}<small> · ${VG.length} mekân</small>`;
    // haritanın üstünde her zaman: Tümü · Bugün · Yarın · Hafta sonu… (Apple Haritalar'daki hızlı seçimler gibi) + seçili diğer filtreler
    const tg = hmTags(), ot = tg.filter((t) => t !== hmWhen()), row = $("#hmt"); $("#hmfn").textContent = tg.length || "";
    row.innerHTML = `<button type="button" class="hw hcl${HM.from ? " on" : ""}" data-hclk><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${HM.from ? HM.from + "+" : "Saat"}</button><i class="hsep"></i><div class="hfv" id="hmfv"></div>` + HMW.map(([k, l]) => `<button type="button" class="hw${HM.when === k ? " on" : ""}" data-hw="${k}">${l}</button>`).join("") + (ot.filter((t) => !/ sonrası$/.test(t)).length ? `<i class="hsep"></i>${ot.filter((t) => !/ sonrası$/.test(t)).map((t) => `<span>${esc(t)}</span>`).join("")}<button type="button" id="hmt0">Sıfırla</button>` : "");
    $("[data-hclk]", row).addEventListener("click", () => tcOpen()); favBar();
    const on = row.querySelector(".hw.on:not(.hcl)"); if (on) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
    $$("[data-hw]", row).forEach((b) => b.addEventListener("click", () => { if (HM.when === b.dataset.hw) return; HM.when = b.dataset.hw; hmSave(); snd.sel?.(); haptic(5); setData(); }));
    $$(":scope > span", row).forEach((x) => x.addEventListener("click", () => $("#hmf").click()));
    $("#hmt0")?.addEventListener("click", () => { Object.assign(HM, { ...HM0, when: HM.when, cats: [] }); hmSave(); snd.sel?.(); haptic(5); setData(); });
    posters.forEach((m) => m.remove()); posters.clear(); near(); pulse(); };
  // haritanın üstündeki saat kartı (kullanıcı, 10:45: "saat seçme daha görünür olsun"): Tüm gün / Saat seç + çark; değişiklik anında haritada
  const tc = $("#hmtc"), tcSeg = $(".hm-seg", tc); let tcT = 0;
  const tcUI = () => { $("#hmtl").textContent = HM.from ? `${HM.from} ve sonrası` : "Bütün saatler"; tcSeg.classList.toggle("r", !!HM.from); tcSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", (b.dataset.ta === "1") === !HM.from)); };
  const tcR = trBind(tc, () => HM.from, (v, fin) => { HM.from = v; tcUI(); if (fin) { hmSave(); clearTimeout(tcT); tcT = setTimeout(setData, 30); } });
  const tcOpen = () => { if (!tc.hidden) return tcClose(); tc.hidden = false; wrap.classList.add("tco"); snd.sheet?.(); haptic(6); tcUI(); tcR.sync(); };
  const tcClose = () => { tc.hidden = true; wrap.classList.remove("tco"); snd.close?.(); haptic(4); };
  $(".hm-tcx", tc).addEventListener("click", tcClose);
  tcSeg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const all = b.dataset.ta === "1"; if (all === !HM.from) return; HM.from = all ? "" : trNext(); hmSave(); snd.sel?.(); haptic(5); tcUI(); tcR.sync(); setData(); }));
  // katmanlar (stil her değiştiğinde yeniden eklenir)
  let IMG = null;
  const addLayers = async () => {
    const D = build(); IMG ||= await mImgs(); if (!alive() || !map) return;
    for (const [k, im] of IMG) if (!map.hasImage("c-" + k)) map.addImage("c-" + k, im, { pixelRatio: 2 });
    if (!map.hasImage("c-diger")) map.addImage("c-diger", IMG[0][1], { pixelRatio: 2 });
    if (map.hasImage("pill")) map.removeImage("pill"); map.addImage("pill", lt() ? mPill("rgba(255,255,255,.94)", "rgba(124,58,237,.35)") : mPill("rgba(28,25,42,.9)", "rgba(167,139,250,.55)"), mPillOpt);
    if (!map.hasImage("pill-me")) map.addImage("pill-me", mPill("rgba(124,58,237,.96)", "rgba(255,255,255,.45)"), mPillOpt);
    for (const k of Object.keys(D)) if (!map.getSource(k)) map.addSource(k, { type: "geojson", data: D[k] }); else map.getSource(k).setData(D[k]);
    if (!map.getSource("ring")) map.addSource("ring", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const font = ["Noto Sans Bold"];
    if (!map.getSource("yv")) map.addSource("yv", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "yv-d", type: "circle", source: "yv", minzoom: 15, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 3, 18, 6], "circle-color": ["get", "c"], "circle-stroke-color": lt() ? "#fff" : "#0a0a10", "circle-stroke-width": 1.2 } });
    map.addLayer({ id: "yv-t", type: "symbol", source: "yv", minzoom: 15.4, layout: { "symbol-sort-key": ["get", "p"], "text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 11.5, "text-radial-offset": .75, "text-variable-anchor": ["top", "bottom", "right", "left"], "text-justify": "auto", "text-max-width": 8, "text-optional": true, "text-padding": 3, "text-allow-overlap": false, "text-ignore-placement": false }, paint: { "text-color": lt() ? "#333" : "#d8d8e4", "text-halo-color": lt() ? "#fff" : "#0a0a10", "text-halo-width": 1.3 } });
    yvSync();
    map.addLayer({ id: "heat", type: "heatmap", source: "hh", maxzoom: 12.5, paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "n"], 1, .6, 10, 1, 60, 1.8, 400, 3],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 1, 9, 1.2, 12, 1.4],
      "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(91,33,182,0)", .15, "rgba(109,40,217,.38)", .4, "rgba(139,92,246,.62)", .7, "rgba(167,139,250,.8)", 1, "rgba(221,214,254,.9)"],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 12, 8, 22, 11, 32],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, .9, 10.5, .35, 11.8, 0] } });
    map.addLayer({ id: "ring-f", type: "fill", source: "ring", paint: { "fill-color": "#0a84ff", "fill-opacity": .1 } });
    map.addLayer({ id: "ring-l", type: "line", source: "ring", paint: { "line-color": "#0a84ff", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": .8 } });
    map.addLayer({ id: "ven", type: "symbol", source: "hv", minzoom: 8.5, layout: {
      "icon-image": ["get", "ic"], "icon-size": ["interpolate", ["linear"], ["zoom"], 8.5, .55, 12, .85, 15, 1], "icon-allow-overlap": true, "icon-ignore-placement": true, "symbol-sort-key": ["-", 0, ["get", "n"]],
      "text-field": ["case", [">", ["get", "n"], 1], ["to-string", ["get", "n"]], ""], "text-font": font, "text-size": 10.5, "text-offset": [1.15, -1.05], "text-allow-overlap": true, "text-ignore-placement": true },
      paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0, 9.3, ["case", ["==", ["get", "so"], 1], .45, 1]], "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0, 9.3, 1], "text-color": "#fff", "text-halo-color": "#7c3aed", "text-halo-width": 2.6 } });
    map.addLayer({ id: "ven-n", type: "symbol", source: "hv", minzoom: 12.3, layout: { "text-field": ["get", "nm"], "text-font": font, "text-size": 11.5, "text-offset": [0, 1.75], "text-anchor": "top", "text-max-width": 9, "text-optional": true },
      paint: { "text-color": lt() ? "#1c1c1e" : "#fff", "text-halo-color": lt() ? "rgba(255,255,255,.92)" : "rgba(11,11,18,.9)", "text-halo-width": 1.6, "text-opacity": ["interpolate", ["linear"], ["zoom"], 12.3, 0, 12.9, 1] } });
    map.addLayer({ id: "un", type: "symbol", source: "hu", minzoom: 8.6, maxzoom: 15, layout: { "icon-image": "pill", "icon-text-fit": "both", "icon-text-fit-padding": [3, 9, 3, 9], "text-field": ["get", "t"], "text-font": font, "text-size": 11.5, "text-offset": [0, 2.6], "icon-allow-overlap": true, "text-allow-overlap": true },
      paint: { "text-color": lt() ? "#3a2a6b" : "#fff", "icon-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 0, 9.4, 1], "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 0, 9.4, 1] } });
    map.addLayer({ id: "city", type: "symbol", source: "hc", maxzoom: 9.6, layout: { "icon-image": ["case", ["==", ["get", "me"], 1], "pill-me", "pill"], "icon-text-fit": "both", "icon-text-fit-padding": [4, 11, 4, 11], "symbol-sort-key": ["get", "k"],
      "text-field": ["format", ["get", "nm"], { "font-scale": 1 }, "\n", {}, ["get", "t"], { "font-scale": .78 }], "text-font": font, "text-size": 13.5, "text-line-height": 1.15, "icon-padding": 3 },
      paint: { "text-color": lt() ? ["case", ["==", ["get", "me"], 1], "#fff", "#1c1c1e"] : "#fff", "icon-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 1, 9.5, 0], "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.6, 1, 9.5, 0] } });
    const ptr = (id) => { map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; }); };
    if (!map.__nvb) { map.__nvb = 1; ["ven", "ven-n", "un", "city"].forEach(ptr);
      map.on("click", "ven", (ev) => { const g = VG[ev.features[0].properties.i]; if (g) { recAdd({ k: "v", l: g.v[3], s: N[g.v[2]] || "", c: g.v[2] }); vSheet(g); } });
      map.on("click", "ven-n", (ev) => { const g = VG[ev.features[0].properties.i]; if (g) vSheet(g); });
      map.on("click", "un", (ev) => { const c = ev.features[0].properties.c; if (UG.has(c)) unSheet(c, UG.get(c)); });
      map.on("click", "city", (ev) => { const c = ev.features[0].properties.c; haptic(6); snd.push?.(); goCity(c); }); }
    setData();
  };
  const goCity = (c) => { const pts = VG.filter((g) => g.v[2] === c).map((g) => [g.v[1], g.v[0]]); if (ILLL[c]) pts.push([ILLL[c][1], ILLL[c][0]]);
    if (pts.length > 1) { const b = pts.reduce((b, p) => [[Math.min(b[0][0], p[0]), Math.min(b[0][1], p[1])], [Math.max(b[1][0], p[0]), Math.max(b[1][1], p[1])]], [pts[0], pts[0]]); map.fitBounds(b, { padding: { top: 170, bottom: 140, left: 40, right: 70 }, maxZoom: 12.5, duration: 1100 }); }
    else map.flyTo({ center: pts[0] || [32.86, 39.93], zoom: 11.5, duration: 1100 }); };
  // afişler: iyice yaklaşınca ekrandaki mekânlar, üst üste binmeyecek kadar; simge dönerek afişe dönüşür
  let lastLod = "";
  const near = () => { if (!map) return; const z = map.getZoom(), m = z < 9.4 ? "far" : z >= 14 ? "near" : "mid";
    if (lastLod && m !== lastLod) { tick(); haptic(4); } lastLod = m;
    if (m !== "near") { posters.forEach((mk) => mk.remove()); posters.clear(); return; }
    const b = map.getBounds(), W = el.clientWidth, H = el.clientHeight, kept = [], want = new Set();
    const C = VG.map((g, i) => [g, i]).filter(([g]) => b.contains([g.v[1], g.v[0]])).sort((p, q) => q[0].L.length - p[0].L.length).slice(0, 70);
    for (const [g, i] of C) { const p = map.project([g.v[1], g.v[0]]); if (p.x < -30 || p.y < -40 || p.x > W + 30 || p.y > H + 40) continue; const r = [p.x - 25, p.y - 70, p.x + 25, p.y + 4];
      if (kept.some((k) => r[0] < k[2] && r[2] > k[0] && r[1] < k[3] && r[3] > k[1])) continue; kept.push(r); want.add(i);
      if (!posters.has(i)) { const x0 = g.L.find((x) => x[6]) || g.L[0], cc = CG[x0[5]]?.[0] || "#8b5cf6";
        const e = elOf(`<button type="button" class="mk2${g.L.every((x) => x[9] === "t") ? " so" : ""}" style="--c:${cc}" aria-label="${esc(g.v[3])}"><span>${x0[6] ? `<img src="${esc(x0[6])}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<em>${esc(x0[2].slice(0, 30))}</em></span>${g.L.length > 1 ? `<b>${g.L.length}</b>` : ""}</button>`);
        e.addEventListener("click", (ev) => { ev.stopPropagation(); recAdd({ k: "v", l: g.v[3], s: N[g.v[2]] || "", c: g.v[2] }); vSheet(g); });
        posters.set(i, new maplibregl.Marker({ element: e, anchor: "bottom", offset: [0, 4] }).setLngLat([g.v[1], g.v[0]]).addTo(map)); } }
    for (const [i, mk] of posters) if (!want.has(i)) { mk.remove(); posters.delete(i); } };
  // "canlı" mekânlar: başlamasına 3 saatten az kalan (ya da yeni başlamış) etkinliği olanlar yumuşakça nabız gibi atar
  // (11:08 akıcılık) nabız artık haritayı her karede yeniden çizdirmez: canlı mekânlarda küçük HTML halkalar, CSS ile (yalnızca transform/opacity, ekran kartında)
  let lvM = [];
  const pulse = () => { lvM.forEach((m) => m.remove()); lvM = []; if (!map) return;
    for (const g of VG) if (g.lv && lvM.length < 60) lvM.push(new maplibregl.Marker({ element: elOf('<i class="lvp"></i>'), className: "lvm" }).setLngLat([g.v[1], g.v[0]]).addTo(map)); };
  // haritayı kur; en son kaldığı yer (aynı il seçiliyse) yoksa seçili il
  const cam = HM.cam && HM.cam.city === city ? HM.cam : null;
  Promise.all([mlgl(), hIdx(), mStyle(mTheme())]).then(([, ix, style]) => { if (!alive()) return; IX = ix || { v: [], e: [] };
    // dizin inmediyse sessizce yeniden dene (1,5 / 4 / 10 / 20 sn, bağlantı gelince ve uygulamaya dönünce); gelince harita yerinde dolar
    if (!ix) { let n = 0, busy = false; const retry = () => { if (busy || !alive() || IX.e.length) return; busy = true; hIdx().then((j) => { busy = false; if (j && alive()) { IX = j; setData(); } else if (alive()) setTimeout(retry, [1500, 4000, 10000, 20000, 30000][Math.min(n++, 4)]); }); };
      setTimeout(retry, 1500); addEventListener("online", retry); document.addEventListener("visibilitychange", () => { if (!document.hidden) retry(); }); retryIx = retry; }
    map = new maplibregl.Map({ container: el, style, center: cam ? cam.c : [(ILLL[city] || [39.93, 32.86])[1], (ILLL[city] || [39.93, 32.86])[0]], zoom: cam ? cam.z : 10.5, pitch: cam?.p || 0, bearing: cam?.b || 0,
      minZoom: 4.6, maxZoom: 18.5, maxPitch: 70, maxBounds: [[19, 32], [51, 46]], attributionControl: { compact: true }, dragRotate: true, pitchWithRotate: true, fadeDuration: 180 });
    window.__hm = map; mNvb(map); map.touchZoomRotate.enableRotation();
    map.on("style.load", () => { addLayers(); });
    map.once("load", () => { wrap.classList.toggle("z9", map.getZoom() >= 8.5); if (!cam) goCity(city); drawFavs(); if (DATA.me && !DATA.me.c) meDot(DATA.me.p); if (HM.q) { inp.value = HM.q; clr.hidden = false; } deep(); });
    map.on("moveend", () => { HM.cam = { c: map.getCenter().toArray().map((v) => +v.toFixed(5)), z: +map.getZoom().toFixed(2), p: Math.round(map.getPitch()), b: Math.round(map.getBearing()), city }; hmSave(); near(); yvSync(); });
    map.on("zoom", () => { wrap.classList.toggle("z9", map.getZoom() >= 8.5); favZoom(); const z = map.getZoom(), m = z < 9.4 ? "far" : z >= 14 ? "near" : "mid"; if (m !== lastLod) near(); });
    map.on("rotate", cmp); map.on("pitch", cmp); cmp();
    longPress();
  }).catch(() => { el.innerHTML = `<div class="hm-err"><b>Harita şu an açılamadı</b><small>İnternet bağlantını kontrol edip tekrar dene.</small><button type="button" class="ok" id="hmre">Tekrar dene</button></div>`; $("#hmre")?.addEventListener("click", () => viewHarita(city)); });
  // pusula (döndürünce ya da eğince görünür; dokununca kuzeye ve düze döner) ve 3B
  const cmp = () => { if (!map) return; const b = map.getBearing(), p = map.getPitch(), c = $("#hmc"); c.hidden = Math.abs(b) < 1 && p < 1; c.querySelector("svg").style.transform = `rotate(${-b}deg)`; $("#hm3").innerHTML = p > 10 ? ICO.d2 : ICO.d3; $("#hm3").classList.toggle("on", p > 10); };
  $("#hmc").addEventListener("click", () => { if (!map) return; snd.sel?.(); haptic(5); map.easeTo({ bearing: 0, pitch: 0, duration: 600 }); });
  $("#hm3").addEventListener("click", () => { if (!map) return; snd.sel?.(); haptic(6); const on = map.getPitch() > 10; map.easeTo({ pitch: on ? 0 : 60, bearing: on ? 0 : map.getBearing() || -18, zoom: on ? map.getZoom() : Math.max(map.getZoom(), 15.5), duration: 900 }); });
  $("#hmth").addEventListener("click", () => { if (!map) return; const th = lt() ? "koyu" : "acik"; store.set("nvny-harita-tema", th); snd.sel?.(); haptic(6); wrap.classList.toggle("lt", th === "acik"); $("#hmth").innerHTML = th === "acik" ? ICO.moon : ICO.sun;
    mStyle(th).then((s) => { if (map) map.setStyle(s, { diff: false }); }).catch(() => {}); });
  // benim konumum (mavi nokta) ve "Etrafımda ne var": 15 dakikalık yürüme halkası + en yakın etkinlikler
  const meDot = (p) => { meM?.remove(); meM = new maplibregl.Marker({ element: elOf('<div class="me"></div>') }).setLngLat([p[1], p[0]]).addTo(map); };
  $("#hmme").addEventListener("click", () => { haptic(6); snd.sel?.(); whereAmI(true).then((p) => { if (!map) return; meDot(p); map.getSource("ring")?.setData({ type: "FeatureCollection", features: [circlePoly(p, 1.2)] });
    map.flyTo({ center: [p[1], p[0]], zoom: 14.2, duration: 1000 }); setTimeout(() => nearList(p, "Etrafında", "15 dk yürüme mesafesi mavi halkada"), 1050); }).catch((err) => geoHelp(city, err?.code)); });
  // yakındaki etkinlikler (yer araması, kayıtlı yer, etrafımda)
  const nearList = (ll, name, sub) => {
    const R = []; for (const g of VG) { const d = km(ll, [g.v[0], g.v[1]]); for (const x of g.L) R.push([d, g, x]); } R.sort((p, q) => p[0] - q[0] || p[2][3].localeCompare(q[2][3])); const top = R.slice(0, 40);
    snd.pop?.(); haptic(8);
    sheet(`<div class="pn" role="dialog" aria-label="${esc(name)}"><div class="hd"><span class="rth"><b>${esc(name)}</b><small>${top.length ? `En yakın ${top.length} etkinlik${sub ? " · " + esc(sub) : ""}` : "Yakında etkinlik bulunamadı"}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><div class="mpl">${top.map(([d, g, x]) => `<a href="${hmHref(x, g.v[2])}"><span class="mpi"><span class="mpx" style="--c:${CG[x[5]]?.[0] || "#8b5cf6"}"><svg viewBox="0 0 24 24">${CG[x[5]]?.[1] || ""}</svg>${x[6] ? `<img src="${esc(x[6])}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : ""}</span></span><span><b>${esc(x[2])}</b><small><em class="kmb">${kmTxt(d)}</em> · ${rel(x[3])}${x[4] ? " · " + esc(x[4]) : ""} · ${esc(g.v[3])}</small></span></a>`).join("")}</div>
      ${top.length ? "" : `<p class="kmn">Bu filtrelerle yakınında konumu bilinen etkinlik yok. Filtreleri genişletmeyi dene.</p>`}</div></div>`, "mn"); };
  // aranan yer: harita oraya gider, Apple gibi yer kartı açılır (Yol tarifi, Kaydet, Yakındaki etkinlikler)
  const nearPlace = (ll, name, sub) => { if (!map) return; pinM?.remove(); pinM = new maplibregl.Marker({ element: elOf('<div class="pin drop"></div>'), anchor: "bottom" }).setLngLat([ll[1], ll[0]]).addTo(map);
    map.flyTo({ center: [ll[1], ll[0]], zoom: Math.max(map.getZoom(), 15.5), duration: 1000 }); setTimeout(() => placeCard(ll, { n: name, s: sub || "", keep: true }), 1000); };
  /* Kayıtlı yerler (kullanıcı, 09:22: "GTA gibi; bir yeri seçip okul ya da ev yazabilmeli, değiştirene kadar kalmalı"): haritada bir yere basılı tut → ad ver.
     Haritada kendi simgesiyle durur, aramanın en üstünde çıkar; dokununca yakındaki etkinlikler, adını değiştir, sil. */
  const drawFavs = () => { favM.forEach((m) => m.remove()); favM = []; if (!map) return;
    // Apple Haritalar'daki gibi: renkli daire + uç (tam o noktayı gösterir) + altında adı; uzaklaştıkça küçülüp noktaya döner (favZoom)
    for (const f of favs()) { const e = elOf(`<button type="button" data-fid="${esc(f.id)}" class="fv${f.id === newFav ? " new" : ""}" aria-label="${esc(f.n)}"><span class="fvp">${favIc(f.n)}</span><b>${esc(f.n)}</b></button>`); e.addEventListener("click", (ev) => { ev.stopPropagation(); favSheet(f); });
      favM.push(new maplibregl.Marker({ element: e, anchor: "bottom", offset: [0, 22], className: "fvm" }).setLngLat([f.ll[1], f.ll[0]]).addTo(map)); } newFav = ""; favS = favL = -1; favZoom(); favBar(); };
  let newFav = "", favS = -1, favL = -1;
  /* (18.11.2026, kullanıcı: "kayıtlı yerler sürekli en büyük görünmesin, küçülsün; üstteki sırada sembol olsun, tıklayınca gidilsin")
     Boy yakınlıkla akar: 7'de 12 px nokta, 14'te tam boy; ad 12,5–13,5 arasında belirir. Yalnızca transform/opacity, birkaç işaretin kendi değişkeni. */
  const favZoom = () => { if (!map) return; const z = map.getZoom(), t = Math.min(1, Math.max(0, (z - 7) / 7)), s = +(.3 + .7 * t * t * (3 - 2 * t)).toFixed(3), l = +Math.min(1, Math.max(0, z - 12.5)).toFixed(2);
    if (s === favS && l === favL) return; favS = s; favL = l; for (const m of favM) { const st = m.getElement().style; st.setProperty("--s", s); st.setProperty("--l", l); } };
  // üst sıradaki simgeler: dokununca oraya uçar, varınca işaret hafifçe yaylanır; zaten oradaysan yerin kartı açılır
  const favGo = (f) => { if (!map) return; snd.sel?.(); haptic(6); const c = map.getCenter();
    if (map.getZoom() >= 14.5 && km([c.lat, c.lng], f.ll) < .06) return favSheet(f);
    map.flyTo({ center: [f.ll[1], f.ll[0]], zoom: Math.max(map.getZoom(), 15), duration: 1100 });
    map.once("moveend", () => { const e = favM.map((m) => m.getElement()).find((x) => x.dataset.fid === String(f.id)); if (!e) return; e.classList.remove("arr"); void e.offsetWidth; e.classList.add("arr"); setTimeout(() => e.classList.remove("arr"), 600); }); };
  const favBar = () => { const b = $("#hmfv"); if (!b) return; const F = favs();
    b.innerHTML = F.length ? F.map((f) => `<button type="button" class="hfb" data-fv="${esc(f.id)}" aria-label="${esc(f.n)}" title="${esc(f.n)}">${favIc(f.n)}</button>`).join("") + '<i class="hsep"></i>' : "";
    $$("[data-fv]", b).forEach((x) => x.addEventListener("click", () => { const f = F.find((y) => String(y.id) === x.dataset.fv); if (f) favGo(f); })); };
  const favEdit = (ll, f, pre = "") => { snd.pop?.(); haptic(14);
    const sh = sheet(`<div class="pn fve" role="dialog" aria-label="Yeri kaydet"><div class="hd"><span class="rth"><b>${f ? "Adını değiştir" : "Bu yeri kaydet"}</b><small>${f ? esc(f.n) : "Haritada hep burada durur; değiştirene kadar."}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><label class="fvi">${favIc(f?.n || "")}<input id="fvn" maxlength="28" placeholder="Ev, okul, iş, spor salonu…" value="${esc(f?.n || pre)}" enterkeyhint="done"></label>
      <div class="fvq">${["Ev", "Okul", "İş", "Spor salonu", "Annemler"].map((q) => `<button type="button" data-q="${q}">${favIc(q)}${q}</button>`).join("")}</div>
      <button type="button" class="ok fvs" id="fvs" disabled>Kaydet</button>${f ? "" : `<button type="button" class="fvy" id="fvy">Yakınındaki etkinlikler</button>`}</div></div>`, "mn");
    const inp2 = $("#fvn", sh), ok = $("#fvs", sh), ic = () => { sh.querySelector(".fvi .cgi").outerHTML = favIc(inp2.value.trim()); ok.disabled = !inp2.value.trim(); };
    inp2.addEventListener("input", ic); ic(); setTimeout(() => { if (!f) inp2.focus(); }, 380);
    $$("[data-q]", sh).forEach((b) => b.addEventListener("click", () => { inp2.value = b.dataset.q; ic(); snd.sel?.(); haptic(4); }));
    const save = () => { const n = inp2.value.trim(); if (!n) return; const L = favs(); if (f) { const x = L.find((y) => y.id === f.id); if (x) x.n = n; } else { newFav = Date.now().toString(36); L.push({ id: newFav, n, ll: [+ll[0].toFixed(6), +ll[1].toFixed(6)] }); }
      favSave(L); snd.ok(); haptic(12); pinM?.remove(); sh.close(); drawFavs(); };
    ok.addEventListener("click", save); inp2.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); save(); } });
    $("#fvy", sh)?.addEventListener("click", () => { sh.close(); setTimeout(() => nearList(ll, "Bu noktanın yakınında"), 280); }); };
  const favSheet = (f) => { snd.pop?.(); haptic(8);
    const sh = sheet(`<div class="pn" role="dialog" aria-label="${esc(f.n)}"><div class="hd"><span class="rth" style="display:flex;flex-direction:row;align-items:center;gap:10px;text-align:left">${favIc(f.n)}<span><b>${esc(f.n)}</b><small>Kayıtlı yer${DATA.me && !DATA.me.c ? " · " + kmTxt(km(DATA.me.p, f.ll)) : ""}</small></span></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><button type="button" class="pcr" data-a="t">${ICO.car}<span><b>Yol tarifi</b><small>${esc(f.n)} için</small></span></button><button type="button" class="pcv" data-a="b"><span>✉️</span><b>Beraber gidelim mi?</b></button><div class="fvl"><button type="button" data-a="y">Yakınındaki etkinlikler</button><button type="button" data-a="g">Haritada göster</button><button type="button" data-a="r">Adını değiştir</button><button type="button" data-a="s" class="red">Sil</button></div></div></div>`, "mn");
    sh.querySelector("[data-a=y]").addEventListener("click", () => { sh.close(); setTimeout(() => { map?.flyTo({ center: [f.ll[1], f.ll[0]], zoom: 14, duration: 900 }); setTimeout(() => nearList(f.ll, f.n + " yakınında"), 950); }, 260); });
    sh.querySelector("[data-a=g]").addEventListener("click", () => { sh.close(); map?.flyTo({ center: [f.ll[1], f.ll[0]], zoom: 15.5, duration: 900 }); });
    sh.querySelector("[data-a=t]").addEventListener("click", () => { sh.close(); setTimeout(() => routeTo(f.ll, f.n), 260); });
    sh.querySelector("[data-a=b]").addEventListener("click", () => { sh.close(); setTimeout(() => placeInvite({ n: f.n, ll: f.ll, il: city, priv: true }), 240); });
    sh.querySelector("[data-a=r]").addEventListener("click", () => { sh.close(); setTimeout(() => favEdit(f.ll, f), 280); });
    sh.querySelector("[data-a=s]").addEventListener("click", () => { favSave(favs().filter((x) => x.id !== f.id)); snd.close?.(); haptic(10); sh.close(); drawFavs(); }); };
  /* Her yere yol tarifi (kullanıcı, 16.11.2026 20:02: "haritalardan istediğim her yere yol tarifi yapılabilsin"). Apple Haritalar'daki yer kartı:
     basılı tutulan nokta, haritadaki hazır yerler (kafe, okul, durak…), arama sonuçları ve kayıtlı yerler aynı kartla açılır:
     ad + tür/adres + uzaklık, büyük "Yol tarifi" (konumun biliniyorsa tahmini süreyle), Kaydet, Yakındaki etkinlikler.
     Adresi olmayan nokta için adres Photon'dan (anahtarsız) sorulur; gönderilen yalnızca noktanın koordinatıdır. */
  const routeTo = (ll, n) => routeSheet({ title: n, venue: n }, { lat: ll[0], lng: ll[1] }, city);
  const revGeo = (ll) => fetch(`https://photon.komoot.io/reverse?lat=${ll[0]}&lon=${ll[1]}&limit=1`).then((r) => r.ok ? r.json() : null).then((j) => { const p = j?.features?.[0]?.properties; if (!p) return null;
    const st2 = [p.street, p.housenumber].filter(Boolean).join(" "); return { n: p.name || st2 || p.district || p.locality || "", s: [p.name ? st2 : "", p.district || p.locality, p.city || p.county, p.state].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") }; }).catch(() => null);
  const placeCard = (ll, o = {}) => { snd.pop?.(); haptic(8); adaPre();
    if (!o.keep) { pinM?.remove(); pinM = map ? new maplibregl.Marker({ element: elOf('<div class="pin drop"></div>'), anchor: "bottom" }).setLngLat([ll[1], ll[0]]).addTo(map) : null; }
    const me2 = DATA.me && !DATA.me.c ? DATA.me.p : null, dist = me2 ? km(me2, ll) : null, nm = o.n || "Seçilen yer";
    const sh = sheet(`<div class="pn plc" role="dialog" aria-label="${esc(nm)}"><div class="hd"><span class="rth" style="display:flex;flex-direction:row;align-items:center;gap:11px;text-align:left">${o.ic || '<span class="cgi" style="background:#ff3b30"><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"/><circle cx="12" cy="10" r="2.3" fill="#ff3b30"/></svg></span>'}<span><b id="pcn">${esc(nm)}</b><small id="pcs">${esc(o.s || (o.n ? "" : "Adres bulunuyor…"))}${dist != null ? `${o.s ? " · " : ""}${kmTxt(dist)}` : ""}</small></span></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><button type="button" class="pcr" data-a="t">${ICO.car}<span><b>Yol tarifi</b><small id="pct">${dist != null ? "Süre hesaplanıyor…" : "Nereden gideceğini sen seç"}</small></span></button>
      <div class="pcy" id="pcy" hidden></div><button type="button" class="pcv" data-a="p"><span>✨</span><b>Önizle</b></button><button type="button" class="pcv" data-a="b"><span>✉️</span><b>Beraber gidelim mi?</b></button><div class="pcb"><button type="button" data-a="k">${favIc("")}<span>Kaydet</span></button><button type="button" data-a="y"><span class="cgi" style="background:#8b5cf6"><svg viewBox="0 0 24 24"><path d="M5 9.5h14M5 9.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18V9.5M5 9.5V7a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 7v2.5M9 3.5v4M15 3.5v4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></svg></span><span>Yakındaki etkinlikler</span></button></div></div></div>`, "mn");
    let cur = { n: o.n || "", s: o.s || "" }; const name = () => cur.n || "Seçilen yer";
    if (!o.n) yvAround(ll, .02).then((L) => { const box = $("#pcy", sh); if (!box) return; const N = L.map((x) => [km(ll, [x[1], x[2]]), x]).filter((x) => x[0] < .09).sort((a, b) => a[0] - b[0]).slice(0, 4); if (!N.length) return; box.hidden = false; box.innerHTML = `<h4>Burası mı?</h4>${N.map(([d, x], i) => `<button type="button" data-y="${i}"><b>${esc(x[0])}</b><small>${esc(YVL[x[3]])} · ${Math.round(d * 1000)} m</small></button>`).join("")}`; $$("[data-y]", box).forEach((b) => b.addEventListener("click", () => { const x = N[+b.dataset.y][1]; sh.close(); setTimeout(() => placeCard([x[1], x[2]], { n: x[0], s: YVL[x[3]] }), 200); })); });
    if (!o.n) revGeo(ll).then((r) => { if (!r || !document.body.contains(sh)) { $("#pcs", sh) && ($("#pcs", sh).textContent = `${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}${dist != null ? " · " + kmTxt(dist) : ""}`); return; }
      cur = r; $("#pcn", sh).textContent = name(); $("#pcs", sh).textContent = [r.s, dist != null ? kmTxt(dist) : ""].filter(Boolean).join(" · "); });
    // Apple gibi düğmede tahmini süre: konum biliniyorsa en uygun yolla (2,5 km'ye kadar yürüyerek)
    if (me2) { const m = dist < 2.5 ? "foot" : "car"; routeOf(m, me2, ll).then((R) => { const el2 = $("#pct", sh); if (el2) el2.textContent = `${m === "foot" ? "Yürüyerek" : "Arabayla"} ${durTxt(Math.max(1, Math.round(R.duration / 60)))} · ${mTxt(R.distance)}`; }).catch(() => { const el2 = $("#pct", sh); if (el2) el2.textContent = kmTxt(dist) + " uzaklıkta"; }); }
    const oc = sh.close; let keepPin = false; sh.close = () => { if (!keepPin && o.temp !== false) pinM?.remove(); oc(); };
    $("[data-a=t]", sh).addEventListener("click", () => { snd.push?.(); haptic(10); sh.close(); setTimeout(() => routeTo(ll, name()), 240); });
    $("[data-a=b]", sh).addEventListener("click", () => { sh.close(); setTimeout(() => placeInvite({ n: cur.n, s: cur.s, ll, il: city, k: o.s }), 240); }); $("[data-a=p]", sh).addEventListener("click", () => { sh.close(); setTimeout(() => adaOpen(map, ll, cur.n), 240); });
    $("[data-a=k]", sh).addEventListener("click", () => { keepPin = true; sh.close(); setTimeout(() => favEdit(ll, null, cur.n && !/^\d/.test(cur.n) ? cur.n : ""), 260); });
    $("[data-a=y]", sh).addEventListener("click", () => { sh.close(); setTimeout(() => nearList(ll, name() + " yakınında"), 260); }); };
  // haritadaki hazır yerler (OpenStreetMap: kafe, okul, park, durak…): dokununca yer kartı
  const POIK = { cafe: "Kafe", restaurant: "Restoran", fast_food: "Yemek", bar: "Bar", beer: "Bar", pub: "Bar", ice_cream: "Dondurma", bakery: "Fırın", park: "Park", garden: "Bahçe", playground: "Oyun alanı", school: "Okul", kindergarten: "Anaokulu", college: "Okul", university: "Üniversite", hospital: "Hastane", doctors: "Sağlık", dentist: "Diş hekimi", pharmacy: "Eczane", bus: "Durak", railway: "İstasyon", subway: "Metro", tram: "Tramvay", ferry_terminal: "İskele", aerialway: "Teleferik", airport: "Havalimanı", shop: "Mağaza", grocery: "Market", supermarket: "Market", clothing_store: "Giyim", mall: "AVM", place_of_worship: "İbadet yeri", museum: "Müze", art_gallery: "Galeri", theatre: "Tiyatro", cinema: "Sinema", music: "Müzik", library: "Kütüphane", lodging: "Konaklama", hotel: "Otel", attraction: "Gezilecek yer", monument: "Anıt", castle: "Kale", stadium: "Stadyum", sports: "Spor", swimming: "Havuz", pitch: "Saha", town_hall: "Belediye", police: "Polis", fire_station: "İtfaiye", fuel: "Akaryakıt", parking: "Otopark", bank: "Banka", atm: "ATM", post: "Postane", zoo: "Hayvanat bahçesi", campsite: "Kamp", information: "Bilgi", toilets: "Tuvalet" };
  const poiTap = (ev) => { if (wrap.classList.contains("picking")) return; const b = [[ev.point.x - 10, ev.point.y - 10], [ev.point.x + 10, ev.point.y + 10]], F2 = map.queryRenderedFeatures(b);
    if (F2.some((f) => ["ven", "ven-n", "un", "city"].includes(f.layer.id))) return;
    const yf = F2.find((f) => f.layer.id === "yv-d" || f.layer.id === "yv-t"); if (yf) { const c0 = yf.geometry.coordinates; placeCard([c0[1], c0[0]], { n: yf.properties.n, s: yf.properties.k }); return; }
    const f = F2.find((f) => ["poi", "aerodrome_label"].includes(f.sourceLayer) && (f.properties["name:tr"] || f.properties.name)); if (!f) return;
    const P = f.properties, n = P["name:tr"] || P.name, k = POIK[P.subclass] || POIK[P.class] || "Yer", c = f.geometry.coordinates;
    placeCard([c[1], c[0]], { n, s: k }); };
  const longPress = () => { let t = null, p0 = null; const cv = map.getCanvasContainer();
    const cancel = () => { clearTimeout(t); t = null; };
    let fired = false;
    cv.addEventListener("touchstart", (ev) => { fired = false; if (ev.touches.length !== 1) return cancel(); const r = el.getBoundingClientRect(); p0 = [ev.touches[0].clientX - r.left, ev.touches[0].clientY - r.top]; cancel();
      t = setTimeout(() => { t = null; fired = true; const ll = map.unproject(p0); placeCard([ll.lat, ll.lng]); }, 560); }, { passive: true });
    cv.addEventListener("touchmove", (ev) => { if (!t) return; const r = el.getBoundingClientRect(), q = ev.touches[0]; if (ev.touches.length > 1 || Math.hypot(q.clientX - r.left - p0[0], q.clientY - r.top - p0[1]) > 8) cancel(); }, { passive: true });
    cv.addEventListener("touchend", (ev) => { cancel(); if (fired) { fired = false; ev.preventDefault(); } }); // parmak kalkınca açılan paneli kapatan tıklama olmasın cv.addEventListener("touchcancel", cancel); map.on("movestart", cancel);
    map.on("contextmenu", (ev) => { if (matchMedia("(pointer:coarse)").matches) return; placeCard([ev.lngLat.lat, ev.lngLat.lng]); });
    map.on("click", poiTap); };
  // Filtreler (Apple gibi tek panel; sayı canlı)
  $("#hmf").addEventListener("click", () => { if (!IX) return; snd.sheet?.(); haptic(6); if (!tc.hidden) { tc.hidden = true; wrap.classList.remove("tco"); }
    const T = JSON.parse(JSON.stringify({ ...HM, cam: undefined }));
    const cats = ["sinema", ...Object.keys(CATS).filter((k) => k !== "sinema")].filter((k) => IX.e.some((x) => x[5] === k));
    const sh = sheet(`<div class="pn hmfp" role="dialog" aria-label="Harita filtreleri"><div class="hd"><button type="button" class="hf-rz" id="hf0">Sıfırla</button><span class="rth"><b>Filtreler</b></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
      <div class="bd2"><h4>Saat</h4><div class="hf-c hf-time"><div class="hf-th"><b class="hf-tl" id="hfl"></b><div class="hm-seg" id="hfseg" role="tablist"><i></i><button type="button" data-ta="1">Tüm gün</button><button type="button" data-ta="0">Saat seç</button></div></div>${trHTML()}</div>
      <h4>Ne zaman</h4><div class="hf-w">${HMW.map(([k, l]) => `<button type="button" data-w="${k}">${l}</button>`).join("")}</div>
      <h4>Bütçe</h4><div class="hf-w">${HMB.map(([k, l]) => `<button type="button" data-b="${k}">${l}</button>`).join("")}</div><p class="hf-n">Yalnızca fiyatı satış sitesinde son 36 saatte doğrulanmış etkinlikler.</p>
      <h4>Kategori</h4><div class="hf-k">${cats.map((k) => `<button type="button" data-k="${k}">${cgIcon(k)}<span>${esc(CATS[k])}</span><small data-kn="${k}"></small></button>`).join("")}</div>
      <h4>Diğer</h4><div class="grp lst hf-c"><label class="tg2"><span>Tükenenleri gizle</span><input type="checkbox" id="hft"></label></div>
      <button type="button" class="ok hf-go" id="hfg"></button></div></div>`, "mn hmfs");
    const lab = $("#hfl", sh), seg = $("#hfseg", sh), go = $("#hfg", sh); let cnt = 0;
    const R = trBind($(".hf-time", sh), () => T.from, (v, fin) => { T.from = v; lab.textContent = `${v} ve sonrası`; if (fin) { clearTimeout(cnt); cnt = setTimeout(count, 30); } });
    const ui = () => { $$("[data-w]", sh).forEach((b) => b.classList.toggle("on", b.dataset.w === T.when)); $$("[data-b]", sh).forEach((b) => b.classList.toggle("on", +b.dataset.b === T.bud));
      $$("[data-k]", sh).forEach((b) => b.classList.toggle("on", T.cats.includes(b.dataset.k))); $("#hft", sh).checked = T.tk;
      seg.classList.toggle("r", !!T.from); seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", (b.dataset.ta === "1") === !T.from));
      lab.textContent = T.from ? `${T.from} ve sonrası` : "Bütün saatler"; clearTimeout(cnt); cnt = setTimeout(count, 60); };
    // her değişiklik haritaya hemen yansır (Apple gibi; kapatınca da kalır), düğme yalnızca paneli kapatır
    const count = () => { Object.assign(HM, { when: T.when, cats: [...T.cats], from: T.from, bud: T.bud, tk: T.tk }); hmSave(); setData(); go.textContent = `${E.length.toLocaleString("tr-TR")} etkinliği göster`; go.disabled = !E.length;
      const K = {}; for (const x of hmFilter(IX, { ...T, cats: [] })) K[x[5]] = (K[x[5]] || 0) + 1; $$("[data-kn]", sh).forEach((s) => { s.textContent = K[s.dataset.kn] || ""; }); };
    seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const all = b.dataset.ta === "1"; if (all === !T.from) return; T.from = all ? "" : trNext(); snd.sel?.(); haptic(5); ui(); R.sync(); }));
    $("#hft", sh).addEventListener("change", (ev) => { T.tk = ev.target.checked; haptic(5); ui(); });
    $$("[data-w]", sh).forEach((b) => b.addEventListener("click", () => { T.when = b.dataset.w; snd.sel?.(); haptic(4); ui(); }));
    $$("[data-b]", sh).forEach((b) => b.addEventListener("click", () => { T.bud = +b.dataset.b; snd.sel?.(); haptic(4); ui(); }));
    $$("[data-k]", sh).forEach((b) => b.addEventListener("click", () => { const k = b.dataset.k; T.cats = T.cats.includes(k) ? T.cats.filter((x) => x !== k) : [...T.cats, k]; snd.sel?.(); haptic(4); ui(); }));
    $("#hf0", sh).addEventListener("click", () => { Object.assign(T, { ...HM0, cats: [] }); snd.sel?.(); haptic(5); ui(); R.sync(); });
    go.addEventListener("click", () => { snd.ok(); haptic(10); sh.close(); });
    ui(); R.sync(); });
  $("#hmn").addEventListener("click", () => { if (IX && !IX.e.length) { haptic(5); $("#hmn").innerHTML = `<b>Yeniden deneniyor</b>`; retryIx?.(); return; } $("#hmf").click(); });
  // arama: kayıtlı yerler, son aramalar, il, mekân, etkinlik ve herhangi bir yer adı
  const inp = $("#hmi"), res = $("#hmr"), clr = $("#hmx");
  const ico = { c: '<span class="cgi" style="background:#0a84ff"><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"/><circle cx="12" cy="10" r="2.3" fill="#0a84ff"/></svg></span>', v: '<span class="cgi" style="background:#8e8e93"><svg viewBox="0 0 24 24"><path d="M4 20V10l8-6 8 6v10h-5v-6H9v6z" fill="#fff"/></svg></span>', p: '<span class="cgi" style="background:#ff453a"><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"/><circle cx="12" cy="10" r="2.3" fill="#ff453a"/></svg></span>', r: '<span class="cgi" style="background:rgba(120,120,128,.36)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8v4.3l2.8 1.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></span>' };
  const runRec = (r) => { if (!map) return; done(false);
    if (r.k === "c") { goCity(r.c); return; }
    if (r.k === "f") { const f = favs().find((x) => x.n === r.l); if (f) { map.flyTo({ center: [f.ll[1], f.ll[0]], zoom: Math.max(map.getZoom(), 15), duration: 900 }); setTimeout(() => favSheet(f), 950); } else nearPlace(r.ll, r.l, r.s); return; }
    if (r.k === "p") { nearPlace(r.ll, r.l, r.s); return; }
    const g = VG.find((g) => g.v[3] === (r.k === "v" ? r.l : r.vn) && g.v[2] === r.c);
    if (r.k === "v") { if (g) { map.flyTo({ center: [g.v[1], g.v[0]], zoom: 16, duration: 1000 }); setTimeout(() => vSheet(g), 1050); } else goCity(r.c); return; }
    if (r.k === "e") { location.hash = r.href || `#/${r.c}/e/${encodeURIComponent(r.slug)}`; } };
  const home = () => { const F = favs(), R = recents();
    res.innerHTML = `<div class="hm-fv">${F.map((f, i) => `<button type="button" data-fi="${i}">${favIc(f.n)}<span>${esc(f.n)}</span></button>`).join("")}<button type="button" class="add" data-fa><span class="cgi" style="background:rgba(120,120,128,.36)"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></span><span>Ekle</span></button></div>
      ${R.length ? `<div class="hm-rh"><b>Son aramalar</b><button type="button" id="hmrc">Temizle</button></div>${R.map((r, i) => `<button type="button" data-ri="${i}">${r.k === "e" ? cgIcon(r.cat) || ico.r : ico[r.k] || ico.r}<span><b>${esc(r.l)}</b><small>${esc(r.s || "")}</small></span></button>`).join("")}` : `<p class="hm-0">Haritada bir yere basılı tutarak “Ev”, “Okul” gibi kendi yerlerini kaydedebilirsin.</p>`}`;
    res.hidden = false;
    $$("[data-fi]", res).forEach((b) => b.addEventListener("click", () => { const f = F[+b.dataset.fi]; done(); favSheet(f); }));
    $("[data-fa]", res).addEventListener("click", () => { done(false); const c = map?.getCenter(); if (c) { pinM?.remove(); pinM = new maplibregl.Marker({ element: elOf('<div class="pin"></div>'), anchor: "bottom" }).setLngLat(c).addTo(map); favEdit([c.lat, c.lng]); } });
    $$("[data-ri]", res).forEach((b) => b.addEventListener("click", () => { const r = R[+b.dataset.ri]; recAdd(r); runRec(r); }));
    $("#hmrc", res)?.addEventListener("click", () => { store.set("nvny-hson", "[]"); snd.close?.(); haptic(6); home(); }); };
  const search = () => { const raw = inp.value.trim(), q = fold(raw); clr.hidden = !q; HM.q = raw; hmSave(); if (!IX) return; if (!q) { home(); return; }
    const ws = q.split(/\s+/), hit = (s) => { const f = fold(s); return ws.every((w) => f.includes(w)); };
    const F = favs().filter((f) => hit(f.n)), cities = CITIES.filter((c) => hit(c.name)).slice(0, 3), seenV = new Set(), venues = [], evs = [];
    for (const g of VG) if (hit(g.v[3]) && !seenV.has(g.v[3] + g.v[2])) { seenV.add(g.v[3] + g.v[2]); venues.push(g); if (venues.length >= 4) break; }
    for (const x of E) if (hit(x[2]) && evs.length < 10 && !evs.some((y) => fold(y[2]) === fold(x[2]) && y[7] === x[7])) evs.push(x);
    placeSearch(raw);
    res.innerHTML = `${F.map((f, i) => `<button type="button" data-qf="${i}">${favIc(f.n)}<span><b>${esc(f.n)}</b><small>Kayıtlı yer</small></span></button>`).join("")}<div id="hmpl"></div>${cities.map((c) => `<button type="button" data-qc="${c.id}">${ico.c}<span><b>${esc(c.name)}</b><small>İl</small></span></button>`).join("")}
      ${venues.map((g, i) => `<button type="button" data-qv="${i}">${ico.v}<span><b>${esc(g.v[3])}</b><small>Mekân · ${esc(N[g.v[2]] || "")} · ${g.L.length} etkinlik</small></span></button>`).join("")}
      ${evs.map((x, i) => { const v = x[0] >= 0 ? IX.v[x[0]] : null; return `<button type="button" data-qe="${i}">${cgIcon(x[5]) || '<span class="cgi"></span>'}<span><b>${esc(x[2])}</b><small>${esc(dShort(x[3]))}${x[4] ? " · " + esc(x[4]) : ""} · ${esc(v ? v[3] : x[8])} · ${esc(N[x[7]] || "")}</small></span></button>`; }).join("")}
      ${!F.length && !cities.length && !venues.length && !evs.length ? `<p class="hm-0" id="hm0">Aranıyor…</p>` : ""}`;
    res.hidden = false;
    $$("[data-qf]", res).forEach((b) => b.addEventListener("click", () => { const f = F[+b.dataset.qf]; done(); favSheet(f); }));
    $$("[data-qc]", res).forEach((b) => b.addEventListener("click", () => { const c = b.dataset.qc; recAdd({ k: "c", l: N[c], s: "İl", c }); done(); goCity(c); }));
    $$("[data-qv]", res).forEach((b) => b.addEventListener("click", () => { const g = venues[+b.dataset.qv]; recAdd({ k: "v", l: g.v[3], s: "Mekân · " + (N[g.v[2]] || ""), c: g.v[2] }); done(); map.flyTo({ center: [g.v[1], g.v[0]], zoom: 16, duration: 1000 }); setTimeout(() => vSheet(g), 1050); }));
    $$("[data-qe]", res).forEach((b) => b.addEventListener("click", () => { const x = evs[+b.dataset.qe], v = x[0] >= 0 ? IX.v[x[0]] : null; recAdd({ k: "e", l: x[2], s: `${dShort(x[3])} · ${v ? v[3] : x[8]} · ${N[x[7]] || ""}`, c: x[7], slug: x[1], href: hmHref(x), cat: x[5], vn: v ? v[3] : x[8] }); done();
      const g = v ? VG.find((g) => g.v === v) : { v: [null, null, x[7], x[8], ""], L: (UG.get(x[7]) || []).filter((z) => z[8] === x[8]) };
      if (v) map.flyTo({ center: [v[1], v[0]], zoom: 16, duration: 1000 }); else if (ILLL[x[7]]) map.flyTo({ center: [ILLL[x[7]][1], ILLL[x[7]][0]], zoom: 11.5, duration: 1000 });
      setTimeout(() => g && vSheet(g), 1050); }));
  };
  const done = (snd2 = true) => { inp.blur(); res.hidden = true; if (snd2) { haptic(6); snd.push?.(); } };
  /* Yer araması (kullanıcı, 16.11.2026 09:07): semt, mahalle, ilçe, cadde ya da herhangi bir yer adı OpenStreetMap'te aranır (Photon, anahtarsız);
     seçince harita oraya gider ve en yakın etkinlikler uzaklığa göre sıralanır. Gönderilen yalnızca yazılan yer adıdır. */
  let pq = 0, pickAt = null, autoDeep = false;
  const PTY = { city: "İl / şehir", district: "İlçe / semt", locality: "Mahalle", street: "Cadde / sokak", house: "Adres", county: "İlçe", state: "İl", other: "Yer" };
  /* (16.11.2026 09:59, kullanıcı: "Sıhhiye Erkek Öğrenci Yurdu bizde görünmüyor, her yer görünmeli")
     - yazılan il adı sorgudan çıkarılır, arama o ile (yoksa haritanın baktığı yere) yönlendirilir; sonuçlar önce adı tam tutanlar, sonra yakınlık
     - tam eşleşme yoksa yerin semti/mahallesi de çıkar (ör. "Sıhhiye"), yakındaki etkinlikler oradan
     - "Daha derin ara": OpenStreetMap'in ikinci arama servisi (Nominatim; kuralı gereği yazarken değil, yalnızca dokununca)
     - yine yoksa: haritaya ekle ya da haritada basılı tutup kendin kaydet */
  const GEN = new Set(["yurdu", "yurt", "yurtlari", "ogrenci", "erkek", "kiz", "ozel", "devlet", "okulu", "okul", "lisesi", "universitesi", "fakultesi", "hastanesi", "camii", "cami", "parki", "park", "merkezi", "sitesi", "apartmani", "mahallesi", "mah", "caddesi", "cad", "sokak", "sokagi", "sk", "binasi", "kampusu", "ve", "ile", "subesi", "magazasi", "restoran", "kafe", "cafe", "otel", "oteli", "salonu", "spor", "kurs", "kursu", "dershanesi", "anaokulu", "ilkokulu", "ortaokulu"]);
  const pNorm = (f, src) => { if (src === "n") { const ad = f.address || {}; return { n: f.name || f.display_name.split(",")[0], s: ["Yer", ad.suburb || ad.neighbourhood || ad.quarter, ad.town || ad.city_district || ad.county, ad.province || ad.state].filter(Boolean).join(" · "), ll: [+f.lat, +f.lon] }; }
    const p = f.properties || {}; return { n: p.name || p.street || "", s: [PTY[p.type] || "Yer", p.district || p.locality, p.city !== p.name ? p.city : "", p.state].filter(Boolean).join(" · "), ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]], tp: p.type }; };
  const photon = (q, ll, n = 10) => fetch(`https://photon.komoot.io/api/?limit=${n}&bbox=25.6,35.8,44.9,42.2&lat=${ll[0]}&lon=${ll[1]}&location_bias_scale=0.25&q=${encodeURIComponent(q)}`).then((r) => r.ok ? r.json() : null).then((j) => (j?.features || []).filter((f) => (f.properties?.countrycode || "").toUpperCase() === "TR").map((f) => pNorm(f))).catch(() => []);
  const placeSearch = (raw) => { const my = ++pq; if (raw.length < 3) return;
    const c0 = map ? map.getCenter() : null; let ll = c0 ? [c0.lat, c0.lng] : ILLL[city] || [39.93, 32.86], cityHit = null;
    const W = raw.split(/\s+/).filter((w) => { const f = fold(w.replace(/['’].*$/, "")).trim(); const c = CITIES.find((c) => fold(c.name) === f); if (c && !cityHit) { cityHit = c; return false; } return true; });
    if (cityHit && ILLL[cityHit.id]) ll = ILLL[cityHit.id]; const q = W.join(" ") || raw, sig = W.map((w) => fold(w).trim()).filter((w) => w.length > 1);
    const key = W.filter((w) => { const f = fold(w).trim(); return f.length > 1 && !GEN.has(f); });
    const full = (n) => { const f = fold(n); return sig.every((w) => f.includes(w)); };
    // ad farklı yazılmış olabilir ("Özel Sıhhiye Öğrenci Yurdu" gibi): tam sorgu + çekirdek sorgu ("Sıhhiye Yurdu") + semt aynı anda aranır, kelime örtüşmesine göre sıralanır
    const gen = W.filter((w) => GEN.has(fold(w).trim())), core = key.length && gen.length ? [...key, gen[gen.length - 1]].join(" ") : "";
    const ov = (n) => { const f = fold(n); return sig.filter((w) => f.includes(w)).length / Math.max(1, sig.length); };
    setTimeout(async () => { if (my !== pq) return;
      const [L0, L1, A0] = await Promise.all([photon(q, ll), core && core !== q ? photon(core, ll, 8) : [], key.length && key.length < sig.length ? photon(key.join(" "), ll, 4) : []]); if (my !== pq || res.hidden) return;
      const seen = new Set(), L = [...L0, ...L1].filter((x) => { if (!x.n) return false; const k = fold(x.n) + x.ll.map((v) => v.toFixed(3)); if (seen.has(k)) return false; seen.add(k); return true; })
        .map((x) => [x, (full(x.n) ? 0 : (1 - ov(x.n)) * 1e4) + km(ll, x.ll)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
      const exact = L.some((x) => full(x.n)), area = exact ? [] : A0.filter((x) => ["district", "locality", "city", "county", "street", "other"].includes(x.tp)).slice(0, 1);
      pickAt = area[0]?.ll || (cityHit && ILLL[cityHit.id]) || ll;
      draw([...L.filter((x) => full(x.n)), ...area, ...L.filter((x) => !full(x.n))].slice(0, 7), exact, q);
      if (!exact && autoDeep) $("[data-qd]", res)?.click(); autoDeep = false;
    }, 300);
    const draw = (R, exact, q) => { const box = $("#hmpl", res); if (!box) return; $("#hm0", res)?.remove();
      // tam eşleşme yoksa en üstte: "haritaya ekle" (iğneyi kendin tam yerine koyarsın, hep haritada kalır)
      box.innerHTML = (exact ? "" : `<button type="button" class="hm-add" data-qa>${favIc(q)}<span><b>“${esc(q)}”i haritaya ekle</b><small>İğneyi tam yerine koy, hep haritada kalsın</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`)
        + R.map((x, i) => `<button type="button" data-qp="${i}">${ico.p}<span><b>${esc(x.n)}</b><small>${esc(x.s)} · yakındaki etkinlikler</small></span></button>`).join("")
        + (exact ? "" : `<button type="button" data-qd>${ico.r.replace("rgba(120,120,128,.36)", "#5e5ce6")}<span><b>“${esc(q)}” için daha derin ara</b><small>OpenStreetMap'te ikinci bir aramayla</small></span></button>`);
      $$("[data-qp]", box).forEach((b) => b.addEventListener("click", () => { const x = R[+b.dataset.qp]; recAdd({ k: "p", l: x.n, s: x.s, ll: x.ll }); done(); if (Q.ara) { map?.flyTo({ center: [x.ll[1], x.ll[0]], zoom: 16, duration: 900 }); placeCard(x.ll, { n: x.n, s: x.s }); } else nearPlace(x.ll, x.n, x.s); }));
      $("[data-qa]", box)?.addEventListener("click", () => pick(q, pickAt));
      $("[data-qd]", box)?.addEventListener("click", (ev) => { const bt = ev.currentTarget; bt.querySelector("small").textContent = "Aranıyor…"; haptic(4);
        const c = map ? map.getCenter() : { lat: 39.93, lng: 32.86 };
        fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=tr&accept-language=tr&limit=8&viewbox=${c.lng - .7},${c.lat + .5},${c.lng + .7},${c.lat - .5}&q=${encodeURIComponent(raw)}`).then((r) => r.ok ? r.json() : []).then((j) => {
          const N2 = (j || []).map((f) => pNorm(f, "n")).filter((x) => x.n && !R.some((y) => km(y.ll, x.ll) < .05));
          if (!N2.length) { bt.querySelector("b").textContent = "OpenStreetMap'te başka sonuç yok"; bt.querySelector("small").textContent = "En üstten “haritaya ekle” ile kendin işaretleyebilirsin"; bt.disabled = true; return; }
          const A = [...N2, ...R], ex = A.some((x) => full(x.n)); draw([...A.filter((x) => full(x.n)), ...A.filter((x) => !full(x.n))].slice(0, 10), ex, q); snd.sel?.(); }).catch(() => { bt.querySelector("small").textContent = "Şu an aranamadı, tekrar dene"; }); });
    }; };
  let qt = null; inp.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(search, 120); });
  inp.addEventListener("focus", () => search());
  // Enter: önce bizdeki eşleşme; yoksa yer araması derinleşir (Nominatim yalnızca bu bilinçli aramada çağrılır)
  $("#hmq").addEventListener("submit", (ev) => { ev.preventDefault(); const b = res.querySelector("button[data-qf],button[data-qc],button[data-qv],button[data-qe]"); if (b && !res.hidden) return b.click(); autoDeep = true; search(); });
  /* "Haritaya ekle" (kullanıcı, 10:45: "haritada çıkması lazım yerin"): OpenStreetMap'te olmayan yeri kişi kendisi koyar. Harita semte gider,
     ortada Apple Haritalar'daki gibi iğne durur; harita kaydırılır (iğne kalkar, bırakınca oturur), ad düzenlenebilir, "Buraya kaydet" → kayıtlı yer olarak hep haritada. */
  const pick = (name, ll) => { done(false); pinM?.remove(); $(".hm-pk", wrap)?.remove(); if (!map) return;
    map.flyTo({ center: [ll[1], ll[0]], zoom: 16.4, duration: 1000 }); wrap.classList.add("picking"); snd.pop?.(); haptic(10);
    const ov = elOf(`<div class="hm-pk"><span class="hm-pkp fv"><span class="fvp">${favIc(name)}</span></span><i class="hm-pks"></i>
      <div class="hm-pkc"><b>Nerede?</b><small>Haritayı kaydırıp iğneyi tam yerine getir</small><label class="fvi">${favIc(name)}<input maxlength="28" value="${esc(name)}" aria-label="Yerin adı"></label><div class="hm-pkb"><button type="button" data-x>Vazgeç</button><button type="button" class="ok" data-s>Buraya kaydet</button></div></div></div>`);
    wrap.append(ov); const inp3 = $("input", ov), up = () => { ov.classList.add("mv"); }, dn = () => { if (ov.classList.contains("mv")) { ov.classList.remove("mv"); tick(); } };
    map.on("dragstart", up); map.on("moveend", dn);
    inp3.addEventListener("input", () => { const ic = favIc(inp3.value.trim()); $(".hm-pkp .fvp", ov).innerHTML = ic; $(".fvi .cgi", ov).outerHTML = ic; });
    const end = () => { map.off("dragstart", up); map.off("moveend", dn); ov.classList.add("out"); wrap.classList.remove("picking"); setTimeout(() => ov.remove(), 260); };
    $("[data-x]", ov).addEventListener("click", () => { snd.close?.(); haptic(5); end(); });
    $("[data-s]", ov).addEventListener("click", () => { const n = inp3.value.trim() || name, c = map.getCenter(), L = favs(); newFav = Date.now().toString(36); L.push({ id: newFav, n, ll: [+c.lat.toFixed(6), +c.lng.toFixed(6)] }); favSave(L);
      recAdd({ k: "f", l: n, s: "Kayıtlı yer", ll: [c.lat, c.lng] }); snd.ok(); haptic(14); end(); drawFavs(); }); };
  // uygulama içi bağlantılar: ?yer=enlem,boylam&ad=… (yer kartı; &rota=1 doğrudan yol tarifi), ?ara=… (haritada arama)
  const deep = () => { const y = String(Q.yer || "").split(",").map(Number); if (y.length === 2 && y.every(Number.isFinite)) { map.flyTo({ center: [y[1], y[0]], zoom: 16.2, duration: 900 }); setTimeout(() => { if (!alive()) return; if (Q.rota) routeTo(y, Q.ad || "Seçilen yer"); else placeCard(y, { n: Q.ad || "", s: Q.alt || "" }); }, 950); } else if (Q.ara) { inp.value = Q.ara; autoDeep = true; search(); } };
  clr.addEventListener("click", () => { inp.value = ""; search(); inp.focus(); });
  el.addEventListener("pointerdown", () => { if (!res.hidden) { res.hidden = true; inp.blur(); } });
}
// konumu henüz bulunmayan mekânların etkinlikleri (il içinde tek liste, mekân mekân)
// haritadaki listeler gün gün (Apple Takvim gibi başlıklar); satırda saat, durum ve doğrulanmış fiyat
const hmRows = (L0, c, venue) => { const L = [...L0].sort((a, b) => a[3].localeCompare(b[3]) || (a[4] || "").localeCompare(b[4] || "")); let last = "", out = "";
  for (const x of L) { if (x[3] !== last) { last = x[3]; const r = rel(x[3]); out += `<h5 class="mdh">${esc(r)}${r === "Bugün" || r === "Yarın" ? `<small>${esc(dShort(x[3]))}</small>` : ""}</h5>`; }
    const pr = hmPrice(x), st = x[9] === "t" ? `<em class="mst">Tükendi</em>` : x[9] === "e" ? `<em class="mst">Ertelendi</em>` : "";
    out += `<a href="${hmHref(x, c)}"${x[9] === "t" ? ' class="so"' : ""}><span class="mpi"><span class="mpx" style="--c:${CG[x[5]]?.[0] || "#8b5cf6"}"><svg viewBox="0 0 24 24">${CG[x[5]]?.[1] || ""}</svg>${x[6] ? `<img src="${esc(x[6])}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">` : ""}</span></span><span><b>${esc(x[2])}</b><small>${hmTimes(x)}${venue && x[8] ? " · " + esc(x[8]) : ""}${pr ? " · " + TL(pr) + "'den" : x[12] ? " · Ücretsiz" : ""}</small>${st}</span></a>`; }
  return out; };
const soon = (x) => { const { d, hm } = nowIST(); if (x[3] !== d || !x[4]) return ""; const m = timeDiff(hm, x[4]); return m < -15 ? " · başladı" : m <= 0 ? " · şimdi" : m < 60 ? ` · ${m} dk sonra` : m < 360 ? ` · ${Math.round(m / 60)} sa sonra` : ""; };
const hmWhen = () => HM.when !== "tumu" ? HMW.find((w) => w[0] === HM.when)?.[1] : "";
// konumu henüz bulunmayan mekânların etkinlikleri (il içinde tek liste)
function unSheet(c, L0) {
  snd.pop?.(); haptic(8); const N = CNAME(), w = hmWhen();
  sheet(`<div class="pn" role="dialog" aria-label="${esc(N[c] || c)}"><div class="hd"><span class="rth"><b>${esc(N[c] || c)}</b><small>${w ? esc(w) + " · " : ""}${L0.length} etkinlik · mekân konumları henüz haritada yok</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2"><div class="mpl">${hmRows(L0, c, true)}</div></div></div>`, "mn");
}
// haritadaki mekân: seçili günün etkinlikleri; diğer günler tek dokunuşla; yol tarifi
function venueSheetX(g) {
  snd.pop?.(); haptic(8);
  const [lat, lng, c, name, ilce] = g.v, N = CNAME(), d = lat != null && DATA.me && !DATA.me.c ? km(DATA.me.p, [lat, lng]) : null, w = hmWhen(), more = g.more || [];
  const sh = sheet(`<div class="pn" role="dialog" aria-label="${esc(name)}"><div class="hd"><span class="rth"><b>${esc(name)}</b><small>${esc([ilce, N[c]].filter(Boolean).join(", "))}${d != null ? " · " + kmTxt(d) : ""}</small></span><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button></div>
    <div class="bd2">${w && !["bugun", "yarin"].includes(HM.when) ? `<p class="mwl"><span>${esc(w)}</span>${g.L.length} etkinlik</p>` : ""}<div class="mpl">${hmRows(g.L, c)}</div>
    ${more.length ? `<button type="button" class="mmore" data-m>Başka günlerde ${more.length} etkinlik daha<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="mpl" data-mm hidden></div>` : ""}
    ${lat != null ? `<div class="vsb"><button type="button" class="ok" data-r>${I.dir}Yol tarifi</button></div><button type="button" class="pcv" data-b style="margin-top:8px"><span>✉️</span><b>Beraber gidelim mi?</b></button>` : `<p class="kmn" style="margin:12px 2px 0">Bu mekânın haritadaki yeri henüz bulunmadı; bulununca kendi yerinde görünecek.</p>`}</div></div>`, "mn");
  sh.querySelector("[data-m]")?.addEventListener("click", (ev) => { const m = sh.querySelector("[data-mm]"); m.innerHTML = hmRows(more, c); m.hidden = false; ev.currentTarget.remove(); snd.sel?.(); haptic(5); });
  const L = [...g.L, ...more].sort((a, b) => a[3].localeCompare(b[3]));
  sh.querySelector("[data-b]")?.addEventListener("click", () => { sh.close(); setTimeout(() => placeInvite({ n: name, s: [ilce, N[c]].filter(Boolean).join(", "), ll: [lat, lng], il: c, t: "sahne" }), 240); });
  sh.querySelector("[data-r]")?.addEventListener("click", () => { sh.close(); const v = { lat, lng, ilce }; setTimeout(() => routeSheet({ title: L[0][2], venue: name, d: L[0][3], t: L[0][4] }, v, c), 280); });
}

boot().then(() => { offlineBoot(); shortcutBoot(); route(); appUp(); splashOut(); if (DATA.ready) followBoot(); welcomeApp(); }).catch((err) => { appUp(); splashOut(); loadFail(); console.error(err); });

/* Gün içinde bildirim, uygulamanın kendisinden (kullanıcı, 17.11.2026 02:09: "uygulama göndersin; indirince hoş geldin gelmişti, gün içinde de göndersin").
   Telefonun arka plan uyandırmasına (periodicSync) güvenilemiyor: Chrome yeni uygulamada seyrek, pil tasarrufunda hiç çalıştırmıyor; iPhone'da yok.
   Bu yüzden bildirim işçisine (sw.js → run) uygulama da "bak" der: açılışta, her 20 dakikada bir açık kaldıkça ve uygulamadan çıkarken (arka plana geçince).
   İşçi aynı kurallarla karar verir: takip değişiklikleri/hatırlatmalar ve günde üç dilim öneri (sabah 09–12, öğle 12–16 afişli, akşam 16–21:30), her dilimde en çok bir; gece sessiz. */
(() => {
  if (!NOTIF) return;
  let lastPoke = 0;
  const poke = async (force) => {
    if (!notifOn() || (!force && Date.now() - lastPoke < 4 * 60e3)) return; lastPoke = Date.now();
    try { const r = await swUp(); (navigator.serviceWorker.controller || r?.active)?.postMessage("nvny-check"); } catch {}
  };
  setTimeout(() => poke(true), 6000);
  setInterval(() => { if (!document.hidden) poke(); }, 20 * 60e3);
  document.addEventListener("visibilitychange", () => { if (document.hidden) poke(true); else poke(); });
  addEventListener("pagehide", () => poke(true));
})();
