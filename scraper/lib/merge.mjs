// Ham kayıtları birleştirir ve dünkü veriyle karşılaştırır:
//  - aynı etkinlik farklı sitelerde → tek kart, bilet siteleri yan yana
//  - yeni eklenen (firstSeen), fiyatı değişen (prevPrice), durumu değişen
//  - bir site bozulduysa o sitenin eski kayıtları korunur (site boşalmaz)
import { cleanTitle, canonVenue, guessCat, sameEvent, siteNameOf } from "./normalize.mjs";
import { todayIST } from "./util.mjs";

const KEEP_FIELDS = ["desc", "age", "dur", "genre", "org", "door", "note"];
const STALE_TICKET_DAYS = 10; // bir bilet bağlantısı bu kadar gün görülmezse düşer
const DROP_SHOW_DAYS = 7;     // "fiyatı düştü" rozeti kaç gün kalsın

export function rawToEvent(r, src) {
  const title = cleanTitle(r.title);
  const venue = canonVenue(r.venue) || src.defaultVenue || "Çeşitli mekânlar";
  const tUrl = r.buyUrl && siteNameOf(r.buyUrl) !== src.name && src.kind !== "bilet" ? r.buyUrl : r.url;
  const site = src.kind === "bilet" ? src.name : siteNameOf(tUrl, src.name);
  const ev = {
    d: r.d, t: r.t || "", title, venue,
    cat: src.forceCat || guessCat({ title, desc: r.desc, url: r.url, catHint: r.catHint || src.defaultCat || "", genre: r.genre }),
    tickets: [{ site, url: tUrl, ...(r.price ? { price: r.price, pc: r.pc || 1 } : {}), src: src.id }],
  };
  if (r.desc) ev.desc = r.desc;
  if (r.status) ev.status = r.status;
  if (r.org) ev.org = r.org;
  if (r.free && !r.price) ev.note = "Ücretsiz";
  for (const k of ["age", "dur", "genre", "door"]) if (r[k]) ev[k] = r[k];
  return ev;
}

function addTicket(ev, tk) {
  const same = ev.tickets.find((x) => x.site === tk.site);
  if (!same) { ev.tickets.push(tk); return; }
  // eski kayıtla yeni kayıt çakışırsa: en son görülen bilgi kazanır (eski fiyat asla yeniyi ezmez)
  if (tk.seen && same.seen && tk.seen !== same.seen) {
    if (tk.seen > same.seen) Object.assign(same, { url: tk.url, price: tk.price, pc: tk.pc, seen: tk.seen, src: tk.src });
    if (!same.price) delete same.price; if (!same.pc) delete same.pc;
    return;
  }
  // aynı siteden iki fiyat: önce güvenilirlik (yapısal veri > arka plan JSON > metin), eşitse küçük olan
  const a = tk.pc || 0, b = same.pc || 0;
  if (tk.price && (!same.price || a > b || (a === b && tk.price < same.price))) { same.price = tk.price; same.pc = tk.pc; same.url = tk.url; }
}
function absorb(into, ev) {
  for (const tk of ev.tickets) addTicket(into, tk);
  if (!into.t && ev.t) into.t = ev.t;
  if (ev.firstSeen && (!into.firstSeen || ev.firstSeen < into.firstSeen)) into.firstSeen = ev.firstSeen;
  if (ev.lastSeen && (!into.lastSeen || ev.lastSeen > into.lastSeen)) into.lastSeen = ev.lastSeen;
  if (ev.catLocked && !into.catLocked) { into.cat = ev.cat; into.catLocked = true; }
  if ((into.venue === "Çeşitli mekânlar" || !into.venue) && ev.venue && ev.venue !== "Çeşitli mekânlar") into.venue = ev.venue;
  for (const k of KEEP_FIELDS) if (!into[k] && ev[k]) into[k] = ev[k];
  if ((!into.desc || into.desc.length < (ev.desc || "").length / 2) && ev.desc) into.desc = ev.desc;
  if (ev.status === "iptal" || ev.status === "ertelendi") into.status = ev.status;
  else if (ev.status === "tukendi" && !into.tickets.some((x) => x.price && x.site !== ev.tickets[0].site)) into.status = into.status || "tukendi";
}

// Aynı gün + benzer başlık + uyumlu saat → tek etkinlik
export function dedupe(list) {
  const byDay = new Map();
  for (const e of list) { if (!byDay.has(e.d)) byDay.set(e.d, []); byDay.get(e.d).push(e); }
  const out = [];
  for (const day of byDay.values()) {
    const kept = [];
    for (const e of day) {
      const m = kept.find((k) => sameEvent(k, e));
      if (m) absorb(m, e); else kept.push({ ...e, tickets: [...e.tickets] });
    }
    out.push(...kept);
  }
  return out;
}

const minReal = (e) => { const p = e.tickets.filter((x) => x.price && !x.est).map((x) => x.price); return p.length ? Math.min(...p) : null; };

/**
 * prev: dünkü events.json, fresh: bugün toplananlar (dedupe edilmiş), health: {srcId:{ok,count,prevCount}}
 * Döner: birleşik etkinlik listesi
 */
export function mergeWithPrevious(prev, fresh, health, { now = new Date().toISOString(), refresh = false, readUrls = new Set() } = {}) {
  const today = todayIST();
  const prevEvents = (prev?.events || []).filter((e) => e.d >= today);
  const degraded = new Set(Object.entries(health).filter(([, h]) => !h.ok).map(([k]) => k));
  const ran = new Set(Object.keys(health));
  const result = [];
  const used = new Set();
  // Bilet sayfası bugün başarıyla okunduysa ve bu seans orada yoksa → seans kalkmış (ya da dünkü kayıt hatalıydı): tutma
  const reread = (tk) => tk.url && readUrls.has(tk.url) && !degraded.has(tk.src);

  for (const ev of fresh) {
    const old = prevEvents.find((p, i) => !used.has(i) && sameEvent(p, ev) && (used.add(i), true));
    if (!old) { result.push({ ...ev, firstSeen: now, lastSeen: now }); continue; }
    const m = { ...old, ...ev, firstSeen: old.firstSeen || now, lastSeen: now };
    for (const k of KEEP_FIELDS) if (!ev[k] && old[k]) m[k] = old[k];
    if (old.cat && old.catLocked) m.cat = old.cat;
    if (!ev.status && !old.manual) delete m.status; // dün tükenmişti, bugün yeniden satışta olabilir
    if (old.title.length > ev.title.length && ev.title.length < 6) m.title = old.title;
    // bugün görülmeyen ama siteleri bozuk olan / bugün çalışmayan sitelerden gelen biletleri koru
    for (const tk of old.tickets || []) {
      if (m.tickets.some((x) => x.site === tk.site)) continue;
      const age = tk.seen ? (Date.parse(now) - Date.parse(tk.seen)) / 864e5 : 0;
      if (tk.src === "elle") { m.tickets.push(tk); continue; }
      if (reread(tk)) continue;
      if (degraded.has(tk.src) || !ran.has(tk.src) || refresh || age < STALE_TICKET_DAYS) m.tickets.push(tk);
    }
    // fiyat değişimi
    const was = old.price ?? minReal(old), is = minReal(m);
    if (was && is && is !== was) { m.prevPrice = was; m.priceChanged = now; }
    else if (old.prevPrice && old.priceChanged && (Date.parse(now) - Date.parse(old.priceChanged)) / 864e5 < DROP_SHOW_DAYS) { m.prevPrice = old.prevPrice; m.priceChanged = old.priceChanged; }
    else { delete m.prevPrice; delete m.priceChanged; }
    result.push(m);
  }

  // bugün hiç görülmeyen eski etkinlikler
  prevEvents.forEach((old, i) => {
    if (used.has(i)) return;
    const tickets = (old.tickets || []).filter((tk) => {
      if (tk.src === "elle") return true;
      if (reread(tk)) return false;
      if (degraded.has(tk.src) || !ran.has(tk.src) || refresh) return true; // kaynak bozuk/çalışmadı → koru
      const age = tk.seen ? (Date.parse(now) - Date.parse(tk.seen)) / 864e5 : 0;
      return age < STALE_TICKET_DAYS; // kısa süreli kayıpta hemen silme
    });
    if (tickets.length) result.push({ ...old, tickets });
  });

  // son dokunuşlar: eski + yeni kayıtların ikizlerini birleştir (ör. "2000'ler" / "2000ler", saat düzeltmesi öncesi kalanlar)
  for (const e of result) e.tickets.forEach((tk) => { if (!tk.seen) tk.seen = now; }); // bugün toplananlar (ve eski kayıtsızlar)
  const merged = dedupe(result.map((e) => ({ ...e, tickets: (e.tickets || []).map((t) => ({ ...t })) })));
  result.length = 0; result.push(...merged);
  for (const e of result) {
    const p = minReal(e);
    if (p) e.price = p; else delete e.price;
  }
  return result.sort((a, b) => (a.d + (a.t || "99") + a.title).localeCompare(b.d + (b.t || "99") + b.title));
}

// Elle eklenen / gizlenen etkinlikler (Google Sheets veya data/manual.csv)
export function applyManual(events, rows, now) {
  const out = [...events];
  for (const r of rows) {
    if (!r.d || !r.title) continue;
    const ev = {
      d: r.d, t: r.t || "", title: cleanTitle(r.title), venue: canonVenue(r.venue) || "Çeşitli mekânlar",
      cat: r.cat || guessCat({ title: r.title, desc: r.desc }), manual: true, catLocked: !!r.cat,
      tickets: r.url ? [{ site: r.site || siteNameOf(r.url, "Bilet"), url: r.url, ...(r.price ? { price: r.price } : {}), src: "elle", seen: now }] : [],
    };
    for (const k of ["desc", "age", "dur", "genre", "org", "note", "status"]) if (r[k]) ev[k] = r[k];
    const i = out.findIndex((x) => sameEvent(x, ev));
    if (r.status === "gizle") { if (i >= 0) out.splice(i, 1); continue; }
    if (i >= 0) {
      const x = out[i];
      for (const k of ["title", "venue", "t", "desc", "age", "dur", "genre", "org", "note", "status"]) if (r[k === "title" ? "title" : k]) x[k] = ev[k];
      if (r.cat) { x.cat = r.cat; x.catLocked = true; }
      for (const tk of ev.tickets) { const j = x.tickets.findIndex((y) => y.site === tk.site); if (j >= 0) x.tickets[j] = tk; else x.tickets.push(tk); }
    } else {
      if (!ev.tickets.length) ev.tickets = [{ site: "Web'de ara", url: "https://www.google.com/search?q=" + encodeURIComponent(`${ev.title} ${ev.venue} Ankara`), src: "elle", seen: now }];
      out.push({ ...ev, firstSeen: now, lastSeen: now });
    }
  }
  return out;
}
