/* NE VAR NE YOK · yeni tasarım (önizleme: /yeni/)
   Yönlendirme: #/ şehir seçimi · #/ankara şehir sayfası · #/ankara/kesfet?k=konser&t=bugun · #/ankara/e/<slug> etkinlik · #/ankara/sinema · #/ankara/film/<id>
   Kurallar (CLAUDE.md): fiyat yalnızca son 36 saatte doğrulandıysa; afiş kaynağından, değiştirilmeden, "Görsel: <kaynak>" ile; tanıtım metni yok (descOf). */
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = (s) => (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ");
const slugOf = (e) => e.d + "-" + fold(e.title).trim().replace(/\s+/g, "-").slice(0, 48);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

const IL = "Adana Adıyaman Afyonkarahisar Ağrı Aksaray Amasya Ankara Antalya Ardahan Artvin Aydın Balıkesir Bartın Batman Bayburt Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Düzce Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Iğdır Isparta İstanbul İzmir Kahramanmaraş Karabük Karaman Kars Kastamonu Kayseri Kilis Kırıkkale Kırklareli Kırşehir Kocaeli Konya Kütahya Malatya Manisa Mardin Mersin Muğla Muş Nevşehir Niğde Ordu Osmaniye Rize Sakarya Samsun Şanlıurfa Siirt Sinop Şırnak Sivas Tekirdağ Tokat Trabzon Tunceli Uşak Van Yalova Yozgat Zonguldak".split(" ");
const LIVE = new Set(["ankara"]);
const POP = ["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "adana", "konya", "gaziantep", "mersin", "kocaeli", "kayseri", "samsun", "trabzon", "denizli"];
const rank = (c) => (c.live ? -100 : 0) + (POP.includes(c.id) ? POP.indexOf(c.id) : 50);
const CITIES = IL.map((n) => ({ id: fold(n).replace(/\s+/g, ""), name: n, live: LIVE.has(fold(n).replace(/\s+/g, "")) }));
const CATS = { konser: "Konser", tiyatro: "Tiyatro", standup: "Stand-up", sahne: "Opera · Bale · Dans", cocuk: "Çocuk & Aile", festival: "Festival", parti: "Parti", atolye: "Atölye & Söyleşi", sinema: "Sinema" };
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], GUNK = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"], AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const SALES = /^(biletix|biletinial|passo|bubilet|biletino|mobilet|sanatçepte|sanatcepte|iticket|bilkent bilet)$/i;
const BIG = /congresium|cso ada|jolly joker|if performance|ankara arena|bilkent|opera|cüneyt gökçer|akm|ankara spor salonu|mebi|holly stone|ccc|kongre/i;
const PRICE_MAX_H = 36;

/* ---------- Tarih yardımcıları (İstanbul saati) ---------- */
const nowIST = () => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value])); return { d: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` }; };
const pd = (s) => new Date(s + "T12:00:00");
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dShort = (s) => { const d = pd(s); return `${GUNK[d.getDay()]} ${d.getDate()} ${AYK[d.getMonth()]}`; };
const dLong = (s) => { const d = pd(s); return `${d.getDate()} ${AY[d.getMonth()]} ${GUN[d.getDay()]}`; };
const rel = (s) => { const t = nowIST().d; return s === t ? "Bugün" : s === addD(t, 1) ? "Yarın" : dShort(s); };
const ago = (iso) => { if (!iso) return ""; const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.round(m / 60)} saat önce` : `${Math.round(m / 1440)} gün önce`; };
const TL = (n) => "₺" + Math.round(n).toLocaleString("tr-TR");

/* ---------- Logo: brand/logo.js (NVLOGO); renkler sabit (mor cam) ---------- */
const WM = () => `<span class="wm" role="img" aria-label="Ne Var Ne Yok">${NVLOGO()}</span>`;
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
async function load() {
  const j = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [ev, vn, fl, bz] = await Promise.all([j("../data/events.json"), j("../data/venues.json"), j("../data/films.json"), j("../data/buzz.json")]);
  DATA.base = ev?.baseline; DATA.updated = ev?.updated; DATA.venues = vn?.venues || vn || {}; DATA.films = fl; DATA.buzz = bz || {};
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
  DATA.ready = true;
}
function timeDiff(a, b) { const m = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5); return m(b) - m(a); }
const live = (e) => e.status !== "iptal" && e.status !== "ertelendi";
const vOf = (name) => DATA.venues[name] || Object.entries(DATA.venues).find(([k]) => fold(k) === fold(name))?.[1] || null;
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
  return `<div class="ph${e.img ? "" : " no"}">${img}<div class="tp"><small>${esc(CATS[e.cat] || "Etkinlik")}</small><b>${esc(e.title)}</b><small>${esc(e.venue || "")}</small></div>${badge && st ? `<span class="bd${e.status === "tukendi" ? "" : " x"}">${st}</span>` : ""}</div>`;
}
function card(e, city) {
  const pr = e.price ? `<div class="pr">${TL(e.price)}'den</div>` : "";
  return `<a class="cd${live(e) ? "" : " off"}" href="#/${city}/e/${encodeURIComponent(e.slug)}">${poster(e)}<div class="t">${esc(e.title)}</div><div class="m">${rel(e.d)}${e.t ? " · " + esc(e.t) : ""}</div><div class="m2">${esc(e.venue || "")}</div>${pr}</a>`;
}
function rail(title, sub, list, city, more) {
  if (!list.length) return "";
  return `<section class="rail"><div class="rh"><div><h3>${esc(title)}</h3>${sub ? `<small>${esc(sub)}</small>` : ""}</div>${more ? `<a href="${more}">Tümü →</a>` : ""}</div><div class="rs">${list.map((e) => card(e, city)).join("")}</div></section>`;
}
function uniq(list, n, key = (e) => fold(e.title).slice(0, 26)) { const s = new Set(), out = []; for (const e of list) { const k = key(e); if (s.has(k)) continue; s.add(k); out.push(e); if (out.length >= n) break; } return out; }
const pick = (list, n) => uniq([...list].sort((a, b) => b.score - a.score || a.d.localeCompare(b.d)), n);
function footer() {
  return `<footer class="foot"><a class="dlb" href="../indir/" data-app><span class="tl">${WM()}</span><span><b>Uygulamamızı indirin</b><small>Android · iPhone · ücretsiz</small></span><span class="go2">İndir</span></a>
  <div class="r"><a href="../#hakkinda">Hakkında</a><a href="../#kaynaklar">Veri kaynakları</a><a href="../#gizlilik">Gizlilik</a><a href="../#kosullar">Kullanım koşulları</a><a href="mailto:${esc(window.NVNY_SITE?.contact || "")}">İletişim</a><a href="${esc(window.NVNY_SITE?.instagram || "#")}" target="_blank" rel="noopener">Instagram</a></div>
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

function viewCities() {
  setTop(null); document.title = "Ne Var Ne Yok · Hangi şehirdesin?";
  const n = DATA.events.filter((e) => e.d <= addD(nowIST().d, 6) && live(e)).length, liveC = CITIES.filter((c) => c.live);
  V.innerHTML = `<div class="cs">${WM()}<h1>Hangi şehirdesin?</h1><p class="lead">Şehrini yaz, o şehirde bugün ve bu hafta ne var ne yok gör.</p>
  <div class="cpick"><label class="cin">${I.pin}<input id="cq" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Şehrini yaz…" aria-label="Şehir ara" role="combobox" aria-expanded="false" aria-controls="cl"></label><ul class="cl" id="cl" role="listbox" hidden></ul><p class="cmsg" id="cmsg" hidden></p></div>
  <p class="cnow">Şu an açık: ${liveC.map((c) => `<a href="#/${c.id}" data-city="${c.id}">${c.name}</a>`).join(", ")} <span>· diğer şehirler yakında</span></p>
  <div class="cs-ft"><a class="dlb" href="../indir/" data-app><span class="tl">${WM()}</span><span><b>Uygulamamızı indirin</b><small>Android · iPhone · ücretsiz</small></span><span class="go2">İndir</span></a><div class="os"><span>by</span>${OS}<em>one<b>side</b></em></div></div></div>`;
  const q = $("#cq"), ul = $("#cl"), msg = $("#cmsg"); let sel = 0, L = [];
  const choose = (c) => { if (!c) return; if (c.live) { store.set("nvny-city", c.id); location.hash = `#/${c.id}`; return; } q.value = c.name; ul.hidden = true; q.setAttribute("aria-expanded", "false"); msg.hidden = false; msg.innerHTML = `<b>${esc(c.name)}</b> yakında geliyor. Şimdilik ${liveC.map((x) => `<a href="#/${x.id}" data-city="${x.id}">${x.name}</a>`).join(", ")} etkinliklerine göz atabilirsin.`; };
  const draw = () => {
    const v = fold(q.value).trim(); msg.hidden = true;
    L = v ? CITIES.filter((c) => fold(c.name).startsWith(v)).sort((a, b) => rank(a) - rank(b)).concat(CITIES.filter((c) => !fold(c.name).startsWith(v) && fold(c.name).includes(v))).slice(0, 7) : liveC;
    sel = 0; ul.hidden = !L.length; q.setAttribute("aria-expanded", String(!!L.length));
    ul.innerHTML = L.length ? L.map((c, i) => `<li role="option" data-i="${i}" class="${i === sel ? "on" : ""}${c.live ? "" : " soon"}"><b>${esc(c.name)}</b><small>${c.live ? `Bu hafta ${n.toLocaleString("tr-TR")} etkinlik` : "Yakında"}</small></li>`).join("") : "";
    if (v && !L.length) { msg.hidden = false; msg.textContent = "Bu adla bir il bulamadık."; }
  };
  q.addEventListener("input", draw); q.addEventListener("focus", draw);
  q.addEventListener("keydown", (ev) => { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); sel = (sel + (ev.key === "ArrowDown" ? 1 : L.length - 1)) % (L.length || 1); $$("li", ul).forEach((li, i) => li.classList.toggle("on", i === sel)); } else if (ev.key === "Enter") { ev.preventDefault(); choose(L[sel]); } });
  ul.addEventListener("pointerdown", (ev) => { const li = ev.target.closest("li"); if (li) { ev.preventDefault(); choose(L[+li.dataset.i]); } });
  document.addEventListener("pointerdown", function off(ev) { if (!document.body.contains(q)) return document.removeEventListener("pointerdown", off); if (!ev.target.closest(".cpick")) ul.hidden = true; });
  $$("[data-city]").forEach((x) => x.addEventListener("click", () => store.set("nvny-city", x.dataset.city)));
  if (!matchMedia("(pointer:coarse)").matches) q.focus();
}

let heroTimer = 0;
function viewCity(city) {
  setTop(city); const cname = CITIES.find((c) => c.id === city)?.name || city; document.title = `${cname} · Ne Var Ne Yok`;
  const { d: today, hm } = nowIST(), E = DATA.events.filter(live), wk = addD(today, 6);
  const todayL = E.filter((e) => e.d === today), weekL = E.filter((e) => e.d <= wk);
  const tonight = todayL.filter((e) => !e.t || e.t >= "17:00");
  const dow = pd(today).getDay(), fri = addD(today, (5 - dow + 7) % 7), sun = addD(fri, 2);
  const wkend = E.filter((e) => e.d >= (dow === 6 || dow === 0 ? today : fri) && e.d <= (dow === 0 ? today : sun));
  const featured = pick(E.filter((e) => e.img && e.d <= addD(today, 10)), 6);
  const byCat = (c) => pick(weekL.filter((e) => e.cat === c && e.img), 14).sort((a, b) => a.d.localeCompare(b.d) || (a.t || "").localeCompare(b.t || ""));
  const k = (q) => `#/${city}/kesfet?${q}`;
  V.innerHTML = `<section class="city"><div class="k">Şehrin gündemi</div><h1>${esc(cname)}</h1><div class="st"><span><b>${todayL.length}</b> etkinlik bugün</span><span><b>${weekL.length.toLocaleString("tr-TR")}</b> bu hafta</span>${DATA.films?.films?.length ? `<span><b>${DATA.films.films.filter((f) => f.s && Object.keys(f.s).length).length}</b> film vizyonda</span>` : ""}</div>
  <button type="button" class="pz" id="pz">${prefs() ? `<span class="dot"></span>Senin için kişiselleştirildi<em>Düzenle</em>` : `${I.spark}Kişiselleştir<em>İlgi alanlarını seç, sana uygun etkinlikler öne çıksın</em>`}</button></section>
  ${featured.length ? `<section class="hero"><div class="hs" id="hs">${featured.map((e, i) => `<a class="sl" href="#/${city}/e/${encodeURIComponent(e.slug)}"><img class="bg" src="${esc(e.img)}" alt="" referrerpolicy="no-referrer" ${i ? 'loading="lazy"' : ""}><div class="in"><div class="po">${poster(e, { badge: false, lazy: i > 0 })}</div><div class="tx"><span class="tg">${esc(CATS[e.cat] || "Etkinlik")}</span><h2>${esc(e.title)}</h2><div class="m">${dLong(e.d)}${e.t ? " · " + esc(e.t) : ""}<br>${esc(e.venue || "")}</div><span class="go">Detayları gör →</span></div></div></a>`).join("")}</div><div class="dots" id="dots">${featured.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div></section>` : ""}
  <form class="sbar" id="sf"><label class="sin">${I.srch}<input id="q" type="search" placeholder="Etkinlik, mekân, sanatçı ara…" enterkeyhint="search"></label><a class="fbtn" href="${k("f=1")}">${I.flt}<span class="fl">Filtrele</span></a></form>
  <div class="qk"><a href="${k("t=bugun")}">Bugün</a><a href="${k("t=yarin")}">Yarın</a><a href="${k("t=haftasonu")}">Hafta sonu</a><a href="#/${city}/sinema">Sinema</a>${Object.keys(CATS).filter((c) => c !== "sinema" && weekL.some((e) => e.cat === c)).map((c) => `<a href="${k("k=" + c)}">${esc(CATS[c])}</a>`).join("")}</div>
  ${notifAsk(city)}
  ${prefs() ? rail("Senin için", "İlgi alanlarına göre bu hafta", uniq([...weekL.filter((e) => e.img)].sort((a, b) => pscore(b) - pscore(a)), 16), city, k("sira=sen&t=hafta")) : ""}
  ${rail("Bu akşam", `${dLong(today)} · ${tonight.length} etkinlik`, uniq(tonight.filter((e) => e.img).sort((a, b) => (a.t || "").localeCompare(b.t || "")), 16), city, k("t=bugun"))}
  ${filmRail(city)}
  ${rail("Hafta sonu", wkend.length + " etkinlik", pick(wkend.filter((e) => e.img), 16), city, k("t=haftasonu"))}
  <div id="later"></div>${footer()}`;
  const fav = prefs()?.cats || [], order = ["konser", "tiyatro", "standup", "cocuk", "sahne", "atolye"].sort((a, b) => fav.includes(b) - fav.includes(a));
  const later = () => `${order.map((c) => rail(CATS[c], "Bu hafta", byCat(c), city, k("k=" + c))).join("")}
  ${rail("Festival", "Yaklaşan", pick(E.filter((e) => e.cat === "festival" && e.img), 12), city, k("k=festival"))}
  ${rail("Yeni eklenenler", "Son 3 günde", uniq(E.filter((e) => e.isNew && e.img).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || "")), 16), city, k("yeni=1"))}`;
  const lt = $("#later"); (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(() => { if (document.body.contains(lt)) lt.outerHTML = later(); }, { timeout: 1200 });
  $("#sf").addEventListener("submit", (ev) => { ev.preventDefault(); location.hash = `#/${city}/kesfet?q=${encodeURIComponent($("#q").value.trim())}`; });
  $("#pz").addEventListener("click", () => openPrefs(city, () => viewCity(city)));
  bindNotifAsk(city);
  heroInit();
}
function filmRail(city) {
  const F = DATA.films?.films || [], today = nowIST().d;
  const L = F.filter((f) => f.img && f.s && f.s[today]?.length).sort((a, b) => (b.s[today]?.length || 0) - (a.s[today]?.length || 0)).slice(0, 14);
  if (!L.length) return "";
  return `<section class="rail"><div class="rh"><div><h3>Vizyonda</h3><small>Bugün ${L.length}+ film · salon salon seanslar</small></div><a href="#/${city}/sinema">Tümü →</a></div><div class="rs">${L.map((f) => `<a class="cd" href="#/${city}/film/${f.id}"><div class="ph"><img class="p" src="${esc(f.img)}" alt="${esc(f.title)} afişi" referrerpolicy="no-referrer" loading="lazy" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('no')"><span class="cr">Görsel: sinemalar.com</span><div class="tp"><small>Sinema</small><b>${esc(f.title)}</b><small></small></div></div><div class="t">${esc(f.title)}</div><div class="m">${esc([f.genre, f.dur && f.dur + " dk"].filter(Boolean).join(" · "))}</div><div class="m2">${f.s[today].length} salonda bugün</div></a>`).join("")}</div></section>`;
}
function heroInit() {
  clearInterval(heroTimer); const hs = $("#hs"); if (!hs) return; const dots = $$("#dots i"); let i = 0, hold = 0;
  const go = (n) => { i = (n + dots.length) % dots.length; hs.scrollTo({ left: hs.children[i].offsetLeft - hs.offsetLeft - (parseInt(getComputedStyle(hs).paddingLeft) || 0), behavior: "smooth" }); };
  hs.addEventListener("scroll", () => { const w = hs.children[0].getBoundingClientRect().width + 12; const n = Math.round(hs.scrollLeft / w); if (n !== i && dots[n]) { dots[i]?.classList.remove("on"); i = n; dots[i].classList.add("on"); } }, { passive: true });
  ["pointerdown", "touchstart"].forEach((t) => hs.addEventListener(t, () => (hold = Date.now()), { passive: true }));
  heroTimer = setInterval(() => { if (document.hidden || Date.now() - hold < 8000 || !document.body.contains(hs)) return; dots[i]?.classList.remove("on"); go(i + 1); dots[i]?.classList.add("on"); }, 6000);
}

/* ---------- Keşfet + filtre ekranı ----------
   Ekranda yalnızca arama, "Filtrele" ve "Sırala" durur; seçenekler tek, bölümlere ayrılmış filtre ekranında.
   Çoklu seçim: k (kategori), s (saat), il (ilçe) virgülle ayrılır. */
const TIMES = { bugun: "Bugün", yarin: "Yarın", haftasonu: "Hafta sonu", hafta: "Bu hafta", ay: "30 gün" };
const SAAT = { sabah: "Sabah · 14:00 öncesi", ogle: "Öğleden sonra · 14–18", aksam: "Akşam · 18–21", gece: "Gece · 21 sonrası" };
const FIYAT = { 250: "₺250 ve altı", 500: "₺500 ve altı", 750: "₺750 ve altı", 1000: "₺1.000 ve altı", 1e9: "Fiyatı görünenler" };
const KIM = { cocuk: "Çocuklarla gidilir", yetiskin: "18 yaş ve üzeri" };
const SIRA = { "": "Tarihe göre", populer: "Öne çıkanlar", fiyat: "Fiyat (doğrulanmış)", sen: "Senin için" };
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
  if (f.sira === "populer") L = [...L].sort((a, b) => b.score - a.score); else if (f.sira === "fiyat") L = [...L].sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)); else if (f.sira === "sen") L = [...L].sort((a, b) => pscore(b) - pscore(a) || a.d.localeCompare(b.d));
  return L;
}
const ILCELER = () => { const m = new Map(); for (const e of DATA.events) { const i = ilceOf(e); if (i && live(e)) m.set(i, (m.get(i) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
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
  const sec = (id, title, body) => `<section class="fs${open === id ? " op" : ""}" data-sec="${id}"><button type="button" class="fh" data-tog="${id}"><span><b>${title}</b><small>${esc(sum[id]())}</small></span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button><div class="fb">${body}</div></section>`;
  const body = () => `<div class="pn full" role="dialog" aria-label="Filtrele"><div class="hd"><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button><b>Filtrele</b><button type="button" class="lnk" data-reset>Temizle</button></div><div class="bd2 fsx">
    ${sec("tarih", "Tarih", `<div class="ch">${one("t", "", "Tüm tarihler")}${Object.entries(TIMES).map(([k, l]) => one("t", k, l)).join("")}</div><div class="dstrip in">${days.map((d) => `<button type="button" data-gun="${d}" class="${f.gun === d && !f.t ? "on" : ""}"><small>${d === today ? "Bugün" : GUNK[pd(d).getDay()]}</small><b>${pd(d).getDate()}</b></button>`).join("")}</div>`)}
    ${sec("kategori", "Kategori", `<div class="ch">${Object.entries(CATS).filter(([k]) => k !== "sinema").map(([k, l]) => many("k", k, l, catN(k))).join("")}</div><p class="chk">Birden çok seçebilirsin.</p>`)}
    ${sec("saat", "Saat", `<div class="ch col">${Object.entries(SAAT).map(([k, l]) => many("s", k, l)).join("")}</div>`)}
    ${sec("fiyat", "Fiyat", `<div class="ch">${one("p", "", "Hepsi")}${Object.entries(FIYAT).map(([k, l]) => one("p", k, l)).join("")}</div><p class="chk">Yalnızca satış sitesinde son 36 saatte doğrulanmış fiyatlar.</p>`)}
    ${sec("konum", "Konum", `<h5>İlçe</h5><div class="ch">${ILCELER().map(([n, c]) => many("il", fold(n).replace(/\s+/g, ""), n, c)).join("")}</div><h5>Mekân</h5><label class="sin" style="height:46px">${I.srch}<input id="mq" type="search" placeholder="Mekân ara…"></label><div class="vl">${venues.map((v) => `<button type="button" data-ven="${esc(v)}" class="${f.m === v ? "on" : ""}">${esc(v)}</button>`).join("")}</div>`)}
    ${sec("kim", "Kimler için", `<div class="ch">${one("c", "", "Herkes")}${Object.entries(KIM).map(([k, l]) => one("c", k, l)).join("")}</div>`)}
    ${sec("diger", "Diğer", `<label class="tg2"><span>Yeni eklenenler<small>Son 3 günde listeye girenler</small></span><input type="checkbox" data-tg="yeni"${f.yeni ? " checked" : ""}></label><label class="tg2"><span>Fiyat karşılaştırmalı<small>Birden çok sitede doğrulanmış fiyatla satışta</small></span><input type="checkbox" data-tg="cok"${f.cok ? " checked" : ""}></label><label class="tg2"><span>Tükenenleri gizle<small>Bileti kalmayanları gösterme</small></span><input type="checkbox" data-tg="tk"${f.tk ? " checked" : ""}></label><label class="tg2"><span>İptal ve ertelenenler<small>Yalnızca iptal ya da ertelenenleri göster</small></span><input type="checkbox" data-tg="iptal"${f.iptal ? " checked" : ""}></label>`)}
  </div><div class="ft"><button type="button" class="ok" data-ok></button></div></div>`;
  const sh = sheet("", "fsheet");
  const count = () => { const n = applyF(f).length; $("[data-ok]", sh).textContent = n ? `${n.toLocaleString("tr-TR")} etkinliği göster` : "Etkinlik yok, seçimi gevşet"; $$("[data-sec]", sh).forEach((x) => { const s2 = $(".fh small", x); if (s2) s2.textContent = sum[x.dataset.sec](); }); };
  const paint = () => { const y = $(".fsx", sh)?.scrollTop || 0; sh.innerHTML = body(); count(); $(".fsx", sh).scrollTop = y; };
  paint();
  sh.addEventListener("click", (ev) => {
    const t = ev.target;
    const tg = t.closest("[data-tog]"); if (tg) { open = open === tg.dataset.tog ? "" : tg.dataset.tog; $$("[data-sec]", sh).forEach((x) => x.classList.toggle("op", x.dataset.sec === open)); return; }
    const o = t.closest("[data-one]"); if (o) { const k = o.dataset.one; if (o.dataset.v) f[k] = o.dataset.v; else delete f[k]; if (k === "t") delete f.gun; $$(`[data-one="${k}"]`, sh).forEach((b) => b.classList.toggle("on", b === o)); if (k === "t") $$("[data-gun]", sh).forEach((b) => b.classList.remove("on")); count(); return; }
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
function openPrefs(city, after) {
  const P = prefs() || { cats: [], ilce: [], when: [], budget: 0, kids: false };
  const chip = (k, v, l) => `<button type="button" data-p="${k}" data-v="${esc(v)}" class="${(P[k] || []).includes(v) ? "on" : ""}">${esc(l)}</button>`;
  const sh = sheet(`<div class="pn full" role="dialog" aria-label="Kişiselleştir"><div class="hd"><button type="button" class="ibtn" data-close aria-label="Kapat">✕</button><b>Kişiselleştir</b><button type="button" class="lnk" data-clear>Sıfırla</button></div><div class="bd2">
    <p class="pl1">Neleri sevdiğini seç; ana sayfada <b>Senin için</b> rafı ve sıralama buna göre oluşsun. Seçimlerin yalnızca bu telefonda saklanır, hiçbir yere gönderilmez.</p>
    <h4>Neleri seversin?</h4><div class="ch">${Object.entries(CATS).filter(([k]) => k !== "sinema").map(([k, l]) => chip("cats", k, l)).join("")}</div>
    <h4>Hangi semtler sana yakın?</h4><div class="ch">${ILCELER().map(([n]) => chip("ilce", fold(n).replace(/\s+/g, ""), n)).join("")}</div>
    <h4>Ne zaman çıkarsın?</h4><div class="ch">${Object.entries(WHEN).map(([k, l]) => chip("when", k, l)).join("")}</div>
    <h4>Bütçe</h4><div class="ch">${[[0, "Fark etmez"], [300, "₺300'e kadar"], [600, "₺600'e kadar"], [1000, "₺1.000'e kadar"]].map(([v, l]) => `<button type="button" data-b="${v}" class="${(P.budget || 0) === v ? "on" : ""}">${l}</button>`).join("")}</div>
    <label class="tg2" style="margin-top:14px"><span>Çocuklarla da gidiyorum<small>Çocuk ve aile etkinlikleri öne çıksın</small></span><input type="checkbox" id="kids"${P.kids ? " checked" : ""}></label>
    <h4>Bildirimler</h4>${notifBox(city, true)}
  </div><div class="ft"><button type="button" class="ok" data-save>Kaydet</button></div></div>`, "fsheet");
  sh.addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-p]"); if (c) { const k = c.dataset.p, v = c.dataset.v; P[k] = (P[k] || []).includes(v) ? P[k].filter((x) => x !== v) : [...(P[k] || []), v]; c.classList.toggle("on"); return; }
    const bb = ev.target.closest("[data-b]"); if (bb) { P.budget = +bb.dataset.b; $$("[data-b]", sh).forEach((x) => x.classList.toggle("on", x === bb)); return; }
    if (ev.target.closest("[data-clear]")) { store.set("nvny-prefs", ""); sh.close(); after?.(); return; }
    if (ev.target.closest("[data-save]")) { P.kids = $("#kids", sh).checked; store.set("nvny-prefs", JSON.stringify(P)); NV.set("prefs", P); sh.close(); after?.(); }
  });
  bindNotifBox(sh, city);
}

/* ---------- Etkinlik sayfası ---------- */
function viewEvent(city, slug) {
  setTop(city); const e = DATA.bySlug.get(slug);
  if (!e) { V.innerHTML = `<div class="empty"><p>Bu etkinlik artık listede değil (tarihi geçmiş ya da kaldırılmış olabilir).</p><p style="margin-top:16px"><a class="more" style="display:inline-flex;align-items:center" href="#/${city}">Şehir sayfasına dön</a></p></div>${footer()}`; return; }
  document.title = `${e.title} · ${dShort(e.d)} · Ne Var Ne Yok`;
  const v = vOf(e.venue), st = e.status === "tukendi" ? "Biletler tükendi" : e.status === "iptal" ? "Bu etkinlik iptal edildi" : e.status === "ertelendi" ? "Bu etkinlik ertelendi" : "";
  const T = e.tickets, best = T.find((x) => x.price);
  const tix = T.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener" data-buy="${esc(x.site)}"><span class="s">${esc(x.site)}</span>${x.price ? `<span class="p${best && x === best && T.filter((y) => y.price).length > 1 ? " best" : ""}">${TL(x.price)}</span>` : `<span class="p na">Fiyat sitede</span>`}<span class="ar">${I.ext}</span></a>${x.cats?.length && x.price ? `<div class="cats">${x.cats.slice(0, 8).map((c) => `<span>${esc(c[0])} · ${TL(c[1])}${c[3] != null ? ` · ${c[3]} boş` : ""}${c[2] === false ? " · tükendi" : ""}</span>`).join("")}</div>` : ""}`).join("");
  const checked = T.map((x) => x.checked).filter(Boolean).sort().pop();
  const same = uniq(DATA.events.filter((x) => x.venue === e.venue && x !== e && live(x)), 12);
  const sim = pick(DATA.events.filter((x) => x.cat === e.cat && x !== e && x.venue !== e.venue && live(x) && x.d <= addD(e.d, 7) && x.d >= addD(e.d, -3)), 12);
  const gq = encodeURIComponent(`${e.venue} Ankara`);
  const dirU = v?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}${v.place ? "&destination_place_id=" + v.place : ""}` : `https://www.google.com/maps/dir/?api=1&destination=${gq}`;
  const mapU = v?.place ? `https://www.google.com/maps/search/?api=1&query=${gq}&query_place_id=${v.place}` : `https://www.google.com/maps/search/?api=1&query=${gq}`;
  V.innerHTML = `<article class="dt">${e.img ? `<div class="bk"><img src="${esc(e.img)}" alt="" referrerpolicy="no-referrer"></div>` : ""}<div class="in">
  <a class="back" href="javascript:history.length>1?history.back():location.assign('#/${city}')">${I.back}Geri</a>
  <div class="dg"><div class="dp">${poster(e, { badge: false, lazy: false })}</div><div>
    <div class="tags"><span>${esc(CATS[e.cat] || "Etkinlik")}</span>${e.genre && e.genre !== CATS[e.cat] ? `<span>${esc(e.genre)}</span>` : ""}${e.age ? `<span>${esc(String(e.age))}</span>` : ""}</div>
    <h1>${esc(e.title)}</h1>
    <div class="meta"><div>${I.cal}<span>${dLong(e.d)}${e.t ? " · " + esc(e.t) : ""}${e.dur ? `<small>Süre ${esc(e.dur)}${e.door ? " · kapı " + esc(e.door) : ""}</small>` : e.door ? `<small>Kapı ${esc(e.door)}</small>` : ""}</span></div>
    <div>${I.pin}<span>${esc(e.venue || "")}${v?.addr ? `<small>${esc(v.addr)}</small>` : ""}</span></div>
    ${e.price ? `<div>${I.tag}<span>${TL(e.price)}'den başlayan fiyatlarla<small>${T.filter((x) => x.price).length > 1 ? T.filter((x) => x.price).length + " sitede satışta" : "Satış sitesinde doğrulandı"}</small></span></div>` : ""}</div>
    ${st ? `<div class="stb">${st}.${e.stNews ? " Haberlere göre: " + e.stNews.slice(0, 2).map((x) => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${esc((DATA.buzz.names || {})[x[0]] || x[0])} haberi ↗</a>`).join(" ") + " · Bilet sitesinden de kontrol edin." : ""}</div>` : ""}
    ${T.length && live(e) ? `<a class="buy" href="${esc((best || T[0]).url)}" target="_blank" rel="noopener" data-buy="${esc((best || T[0]).site)}">Bilet al · ${esc((best || T[0]).site)}</a>` : ""}
    ${T.length ? `<div class="tix">${tix}</div><p class="chk">${checked ? `Fiyatlar ${ago(checked)} kontrol edildi. ` : ""}Satın alma ve iade, bileti satan sitenin kurallarına tabidir.</p>` : ""}
    <div class="shr"><button type="button" id="flw" class="flw${isF(e) ? " on" : ""}">${isF(e) ? I.bellOn + "Takip ediliyor" : I.bell + "Takip et"}</button><button type="button" id="shr">${I.share}Paylaş</button></div>
    ${live(e) ? `<p class="flh">Takip edersen iptal, erteleme, saat, tarih ya da yer değişikliğinde ve etkinlikten bir gün önce haber veririz.</p>` : ""}
    <section class="sec"><h3>Bu etkinlik hakkında</h3><p>${esc(descOf(e))}</p></section>
    <section class="sec"><h3>Konum</h3><div class="mapc">${v?.lat ? `<div class="map" id="map"></div>` : ""}<div class="ad">${I.pin}<span><b>${esc(e.venue || "")}</b><small>${esc(v?.addr || (v?.ilce ? v.ilce + ", Ankara" : "Ankara"))}</small></span></div><div class="bt"><a class="p" href="${dirU}" target="_blank" rel="noopener">${I.dir}Yol tarifi</a><a href="${mapU}" target="_blank" rel="noopener">${I.ext}Haritada aç</a></div></div></section>
  </div></div></div></article>
  ${same.length ? rail("Aynı mekânda", e.venue, same, city, `#/${city}/kesfet?m=${encodeURIComponent(e.venue)}`) : ""}
  ${sim.length ? rail("Bunlar da ilgini çekebilir", CATS[e.cat] || "", sim, city, `#/${city}/kesfet?k=${e.cat}`) : ""}
  ${footer()}`;
  $("#shr").addEventListener("click", async () => { const u = location.href; try { if (navigator.share) await navigator.share({ title: e.title, text: `${e.title} · ${dLong(e.d)} · ${e.venue}`, url: u }); else { await navigator.clipboard.writeText(u); $("#shr").lastChild.textContent = "Bağlantı kopyalandı"; } } catch {} });
  $("#flw").addEventListener("click", () => toggleFollow(e, city));
  if (v?.lat) mapInit(v.lat, v.lng);
}
let leafletP = null;
function mapInit(lat, lng) {
  const el = $("#map"); if (!el) return;
  const run = () => { if (!document.body.contains(el)) return; const L = window.L; const m = L.map(el, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, dragging: !matchMedia("(pointer:coarse)").matches, tap: false }).setView([lat, lng], 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "dk", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları' }).addTo(m);
    L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(m); };
  if (window.L) return run();
  const io = new IntersectionObserver((en) => { if (!en[0].isIntersecting) return; io.disconnect();
    leafletP ||= new Promise((res, rej) => { const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.append(c); const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
    leafletP.then(run).catch(() => { el.remove(); }); }, { rootMargin: "200px" });
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
  try { const r = await swUp(); await r.showNotification(title, { body, tag, icon: "../icons/icon-192.png", badge: "../icons/icon-192.png", data: { url } }); return true; }
  catch { try { new Notification(title, { body, icon: "../icons/icon-192.png" }); return true; } catch { return false; } }
}
function toast(html, ms = 5200) {
  let w = $("#tst"); if (!w) { w = document.createElement("div"); w.id = "tst"; w.className = "tst"; document.body.append(w); }
  const t = document.createElement("div"); t.className = "tt"; t.innerHTML = html; w.append(t);
  requestAnimationFrame(() => t.classList.add("on"));
  const kill = () => { t.classList.remove("on"); setTimeout(() => t.remove(), 300); };
  t.addEventListener("click", (ev) => { if (!ev.target.closest("a")) kill(); }); setTimeout(kill, ms);
}
async function askNotif(city) {
  if (!NOTIF) { toast(isIOS && !standalone ? "iPhone'da bildirim için önce uygulamayı ana ekrana ekle: <a href=\"../indir/\">nasıl?</a>" : "Bu tarayıcı bildirim göstermiyor. Uygulamayı indirip oradan açabilirsin: <a href=\"../indir/\">indir</a>", 8000); return false; }
  if (Notification.permission === "denied") { toast("Bildirimler bu tarayıcıda kapalı. Tarayıcı ayarlarından bu site için izin verebilirsin.", 7000); return false; }
  let p = Notification.permission; if (p !== "granted") { try { p = await Notification.requestPermission(); } catch { p = "denied"; } }
  if (p !== "granted") return false;
  NV.set("prefs", prefs()); NV.set("city", city); NV.set("follows", follows());
  await swUp(); gcEv("bildirim-acildi", "Bildirimler açıldı");
  if (!store.get("nvny-hosgeldin")) { store.set("nvny-hosgeldin", "1"); notify("HOŞ GELDİN! 👋", "Bildirimler açık. Takip ettiğin etkinlik iptal olursa, saati ya da yeri değişirse ilk sen öğren; bir gün önce de hatırlatalım. Arada bir güzel etkinlikleri de haber vereceğiz.", `/yeni/#/${city}`, "hosgeldin"); }
  else toast("Bildirimler açık 🔔");
  $$(".nask").forEach((x) => x.remove()); $$(".nbox").forEach((x) => { x.outerHTML = notifBox(city); });
  return true;
}
function notifBox(city, inSheet) {
  if (notifOn()) return `<div class="nbox ok">${I.bellOn}<span><b>Bildirimler açık</b><small>Takip ettiğin etkinliklerdeki değişiklikleri ve hatırlatmaları gönderiyoruz; arada bir de güzel etkinlikleri.</small></span></div>`;
  return `<div class="nbox">${I.bell}<span><b>Bildirimleri aç, etkinliklerden haberdar ol</b><small>Takip ettiğin etkinlik iptal olursa, saati ya da yeri değişirse haber verelim; bir gün önce de hatırlatalım.</small></span><button type="button" class="nb-go" data-notif>Bildirimleri aç</button></div>`;
}
function notifAsk(city) {
  if (notifOn() || store.get("nvny-nask-x") || (NOTIF && Notification.permission === "denied")) return "";
  return `<div class="nask wrap"><div class="nbox">${I.bell}<span><b>Bildirimleri aç, etkinliklerden haberdar ol</b><small>Takip ettiğin etkinliklerde değişiklik olursa ilk sen öğren.</small></span><button type="button" class="nb-go" data-notif>Aç</button><button type="button" class="nb-x" data-nx aria-label="Kapat">✕</button></div></div>`;
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
    F[id] = NV.snap(e, e.slug); saveF(F); b.classList.add("on"); b.innerHTML = I.bellOn + "Takip ediliyor"; gcEv("takip-et", "Takip et");
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
/* Uygulama açılınca: takip edilenleri güncel veriyle karşılaştır, değişikliği göster */
function followBoot() {
  const city = store.get("nvny-city") || "ankara";
  NV.set("city", city); if (prefs()) NV.set("prefs", prefs());
  if (notifOn()) swUp();
  const F = follows(); if (!Object.keys(F).length) return;
  const res = NV.check(F, DATA.events, city);
  saveF(res.follows);
  res.msgs.slice(0, 3).forEach((m, i) => setTimeout(() => toast(`${I.bellOn}<span><b>${esc(m.title)}</b><small>${esc(m.body)}</small><a href="${esc(m.url.replace("/yeni/", ""))}">Göster →</a></span>`, 9000), 900 + i * 400));
  const fb = $("#flwBtn b"); if (fb) { const n = Object.keys(res.follows).length; fb.textContent = n || ""; fb.parentElement.classList.toggle("has", !!n); }
}

/* ---------- Yönlendirme ---------- */
const scrollMem = new Map();
let lastHash = "";
function route() {
  if (!DATA.ready) return;
  scrollMem.set(lastHash, scrollY);
  $$(".sh").forEach((x) => x.remove()); document.body.style.overflow = "";
  const h = location.hash.replace(/^#/, "") || "/", [path, qs] = h.split("?"), P = path.split("/").filter(Boolean), Q = Object.fromEntries(new URLSearchParams(qs || ""));
  const saved = store.get("nvny-city");
  if (!P.length) { if (saved && !Q.sec && CITIES.find((c) => c.id === saved && c.live)) { location.replace(`#/${saved}`); return; } viewCities(); }
  else {
    const city = P[0]; if (!CITIES.find((c) => c.id === city && c.live)) { location.replace("#/"); return; }
    store.set("nvny-city", city);
    if (!P[1]) viewCity(city);
    else if (P[1] === "kesfet") viewKesfet(city, Q);
    else if (P[1] === "e") viewEvent(city, decodeURIComponent(P.slice(2).join("/")));
    else if (P[1] === "sinema") viewSinema(city, Q.gun);
    else if (P[1] === "film") viewFilm(city, P[2], Q.gun);
    else if (P[1] === "takip") viewTakip(city);
    else viewCity(city);
  }
  V.style.animation = "none"; void V.offsetWidth; V.style.animation = "";
  const y = scrollMem.get(location.hash); scrollTo(0, y && history.state !== "new" ? y : 0); lastHash = location.hash;
  try { window.goatcounter?.count?.({ path: "/yeni/" + h.split("?")[0].replace(/^\//, "") }); } catch {}
}
addEventListener("hashchange", route);
addEventListener("scroll", () => TOP.classList.toggle("sc", scrollY > 8), { passive: true });
document.addEventListener("click", (ev) => { const b = ev.target.closest("[data-buy]"); if (b) { let h = ""; try { h = new URL(b.href).hostname.replace(/^www\./, ""); } catch {} gcEv("bilet-al/" + (h || "?"), "Bilet al: " + (h || "?")); } }, true);
load().then(() => { route(); followBoot(); }).catch((err) => { V.innerHTML = `<div class="empty">Veriler yüklenemedi. Sayfayı yenile.</div>`; console.error(err); });
