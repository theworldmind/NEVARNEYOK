// Ham kayıtları sitenin biçimine çevirir: mekân adı, kategori, bilet sitesi adı, eşleştirme anahtarı
import { fold, clean, hostOf } from "./util.mjs";

/* ---------- Bilet sitesi adları (alan adından) ---------- */
export const SITE_NAMES = {
  "biletix.com": "Biletix", "biletinial.com": "Biletinial", "sanatcepte.gov.tr": "Sanatçepte", "bubilet.com.tr": "Bubilet",
  "passo.com.tr": "Passo", "mobilet.com": "Mobilet", "iticket.com.tr": "iTicket", "bugece.co": "BUGECE", "tiyatrolar.com.tr": "tiyatrolar.com.tr",
  "ticket.bilkent.edu.tr": "Bilkent Bilet", "biletino.com": "Biletino", "devtiyatro.gov.tr": "Devlet Tiyatroları", "operabale.gov.tr": "Ankara DOB",
  "cso.gov.tr": "CSO", "ra.co": "Resident Advisor", "radarturkiye.com": "Radar Türkiye", "kultursanat.ankara.bel.tr": "ABB Kültür",
};
export function siteNameOf(url, fallback = "") {
  const h = hostOf(url);
  for (const [k, v] of Object.entries(SITE_NAMES)) if (h === k || h.endsWith("." + k)) return v;
  return fallback || h;
}

/* ---------- Mekân ---------- */
let VEN = null; // {canonical: {aliases}}
let VKEYS = [];
const vkey = (s) => fold(s).replace(/\b(ankara|salonu?|sahnesi|sahne|merkezi|kultur|ve|sanat|the|hall|performance)\b/g, " ").replace(/\s+/g, " ").trim();
export function loadVenues(venues) {
  VEN = venues || {};
  VKEYS = [];
  for (const [name, v] of Object.entries(VEN)) {
    VKEYS.push([fold(name).trim(), name, 1]);
    for (const a of v.aliases || []) VKEYS.push([fold(a).trim(), name, 1]);
    VKEYS.push([vkey(name), name, 0]);
  }
}
const tokens = (s) => new Set(s.split(" ").filter((w) => w.length > 1));
function jacc(a, b) { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); }
export function canonVenue(name) {
  const raw = clean(name).replace(/\s*[-–|,]\s*Ankara$/i, "").replace(/\s+-\s+/g, " · ");
  if (!raw) return "";
  if (!VEN) return raw;
  const f = fold(raw).trim(), k = vkey(raw);
  for (const [key, canon, exact] of VKEYS) if (exact && key === f) return canon;
  let best = null, bs = 0;
  for (const [key, canon, exact] of VKEYS) {
    if (exact) continue;
    const s = jacc(k, key) + (key && (k.includes(key) || key.includes(k)) ? 0.25 : 0);
    if (s > bs) { bs = s; best = canon; }
  }
  return bs >= 0.72 ? best : raw;
}
export const knownVenue = (name) => !!(VEN && VEN[name]);

/* ---------- Kategori ---------- */
// Sıra önemli: önce özel durumlar (çocuk, quiz, stand-up), sonra sahne türleri, en son müzik
const CAT_RULES = [
  ["cocuk", /\b(cocuk|çocuk|aile|masal|kukla|bebek tiyatrosu|minik|kids?|babyconcert)/],
  ["atolye", /\b(quiz|trivia|bilgi yarismasi|atolye|atölye|workshop|soylesi|söyleşi|panel|kitap kulubu|seminer|resim atolyesi|heykel)/],
  ["sinema", /\b(film gosterimi|gosterim|sinema|screening|psinema)\b/],
  ["standup", /\b(stand ?up|komedyen|tek kisilik gosteri|dogaclama|talk show|show)\b/],
  ["festival", /\b(festival|fest\b|ofest)/],
  ["sahne", /\b(opera|bale|ballet|dans tiyatrosu|modern dans|flamenko|dob\b|fındıkkıran|findikkiran|coppelia|carmen)/],
  ["tiyatro", /\b(tiyatro|oyun|oyunu|muzikal|müzikal|dt\b|sahneleme|perde)/],
  ["parti", /\b(parti|party|disko|dj\b|gece\b|karaoke|night)\b/],
  ["konser", /\b(konser|concert|senfoni|orkestra|resital|koro|caz|jazz|rock|metal|tribute|akustik|canli muzik|şarkılar|sarkilar)/],
];
const URL_CAT = [
  ["cocuk", /cocuk|kids|aile/], ["sahne", /opera-?bale|opera|bale|dans/], ["standup", /stand-?up|komedi|gosteri/],
  ["tiyatro", /tiyatro|theatre|theater/], ["festival", /festival/], ["sinema", /sinema|film/], ["konser", /muzik|konser|music|concert/],
  ["parti", /parti|party|gece-?hayati|nightlife/], ["atolye", /atolye|workshop|egitim|soylesi/],
];
export function guessCat({ title = "", desc = "", url = "", catHint = "", genre = "" }) {
  const t = fold(title + " " + genre);
  for (const [c, re] of CAT_RULES.slice(0, 4)) if (re.test(t)) return c; // başlık en güçlü işaret
  if (catHint) return catHint;
  const path = (() => { try { return fold(new URL(url).pathname.replace(/[/_-]+/g, " ")); } catch { return ""; } })();
  for (const [c, re] of URL_CAT) if (re.test(path)) return c;
  const all = fold(title + " " + genre + " " + desc);
  for (const [c, re] of CAT_RULES) if (re.test(all)) return c;
  return "konser";
}

/* ---------- Başlık ve eşleştirme anahtarı ---------- */
// TAMAMI BÜYÜK HARF başlıklar → "Kan Kardeşler" (kısaltmalar korunur)
const KEEP_UP = new Set(["DOB", "DT", "CSO", "ABB", "ODTÜ", "AKM", "ATO", "BSO", "TRT", "DJ", "MKE", "KKM", "ASM", "KM", "AŞ", "TV", "USA", "UK", "AC/DC", "ABBA", "BTS", "MFÖ", "TNT", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "TBMM", "ODTU", "METU", "TOBB", "ETÜ", "TED", "IF", "JJ"]);
const SMALL = new Set(["ve", "ile", "ya", "da", "de", "mi", "mı", "için", "of", "and", "the", "in", "on", "a"]);
export function fixCaps(t) {
  const letters = t.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4 || letters !== letters.toLocaleUpperCase("tr")) return t;
  return t.split(/(\s+|[-–—/(),:&"“”]+)/).map((w, i) => {
    if (!/\p{L}/u.test(w)) return w;
    const core = w.replace(/['’].*$/, "");
    if (KEEP_UP.has(core)) return w;
    const low = w.toLocaleLowerCase("tr");
    if (i > 0 && SMALL.has(low)) return low;
    return low.charAt(0).toLocaleUpperCase("tr") + low.slice(1);
  }).join("");
}
export function cleanTitle(t) {
  return fixCaps(clean(t))
    .replace(/\s*[|]\s*(biletix|biletinial|bubilet|passo|mobilet|iticket|bugece|sanatçepte|sanatcepte).*$/i, "")
    .replace(/\s+(bileti|biletleri|bilet al)$/i, "")
    .replace(/\s*[|]\s*ankara(\s*[|].*)?$/i, "")   // Passo: "Duvar | Ankara | Yaşar Kemal KM"
    .replace(/\s*[-–]\s*ankara( dob| devlet opera ve balesi| dt| devlet tiyatrosu)?$/i, "")
    .replace(/\s*\(\s*ankara\s*\)\s*/i, " ")
    .replace(/\s+/g, " ").trim();
}
const STOP = /\b(konseri|konser|tiyatro|oyunu|ankara|dob|dt|stand|up|gosterisi|show|biletleri|bileti|bilet|etkinligi|the|ile|ve|ozel|live|canli|performansi)\b/g;
export const titleKey = (t) => fold(t).replace(STOP, " ").replace(/\s+/g, " ").trim();
// Ayırt edici olmayan kelimeler: "Music Quiz Night" ile "Manifest Quiz Night" aynı etkinlik sayılmasın
const GENERIC = /\b(quiz|night|gecesi|gece|parti|partisi|party|turkce|pop|rock|90|80|70|2000|ler|lar|muzik|music|atolyesi|atolye|resim|heykel|film|gosterimi|cocuk|tiyatrosu|festival|senfoni|orkestra|koro|korosu|trivia|bilgi|yarismasi|genel|kultur|hits|tribute)\b/g;
const distinct = (k) => k.replace(GENERIC, " ").replace(/\s+/g, " ").trim();
const VAGUE = /^(cesitli mekanlar|)$/;
export function sameVenueish(a, b) {
  const fa = fold(a || "").trim(), fb = fold(b || "").trim();
  if (VAGUE.test(fa) || VAGUE.test(fb) || fa === fb) return true;
  if (VEN && VEN[a] && VEN[b]) return false; // ikisi de tanınan ama farklı mekânlar (ör. iki şube)
  return jacc(vkey(a), vkey(b)) >= 0.34 || vkey(a).includes(vkey(b)) || vkey(b).includes(vkey(a));
}
export function sameEvent(a, b) {
  if (a.d !== b.d) return false;
  if (a.t && b.t && a.t !== b.t) return false;
  if (!sameVenueish(a.venue, b.venue)) return false; // aynı gün aynı adlı ama farklı şubede iki ayrı etkinlik olabilir
  const ka = titleKey(a.title), kb = titleKey(b.title);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const da = distinct(ka), db = distinct(kb);
  if (!da || !db) return false;
  const sim = jacc(da, db) + ((da.includes(db) || db.includes(da)) && Math.min(da.length, db.length) >= 4 ? 0.3 : 0);
  const sameVenue = a.venue && b.venue && a.venue === b.venue;
  return sim >= (sameVenue ? 0.55 : 0.75);
}

const ANKARA_RE = /ankara|çankaya|cankaya|yenimahalle|keçiören|kecioren|etimesgut|mamak|sincan|gölbaşı|golbasi|altındağ|altindag|pursaklar|kızılay|kizilay|bilkent|ümitköy|umitkoy|çayyolu|cayyolu|kavaklıdere|kavaklidere|ulus|söğütözü|sogutozu/i;
export const looksAnkara = (r) => ANKARA_RE.test([r.venue, r.address, r.city, r.url].join(" ")) || knownVenue(r.venue);

/* Tanıtım metinleri yayımlanmaz. Metinden yalnızca olgular (süre, yaş sınırı) ayıklanır; metnin kendisi saklanmaz. */
export function factsFrom(text = "") {
  const s = String(text).toLocaleLowerCase("tr"), out = {};
  let m = s.match(/(\d{1,2})\s*saat\s*(?:ve\s*)?(\d{1,2})\s*(?:dk|dakika)/);
  if (m) out.dur = `${+m[1]} sa ${+m[2]} dk`;
  else if ((m = s.match(/(\d{2,3})\s*(?:dk|dakika)/)) && +m[1] >= 20 && +m[1] <= 300) { const n = +m[1]; out.dur = n >= 60 ? `${Math.floor(n / 60)} sa${n % 60 ? ` ${n % 60} dk` : ""}` : `${n} dk`; }
  else if ((m = s.match(/(\d)\s*saat\b/)) && +m[1] <= 6) out.dur = `${+m[1]} sa`;
  m = s.match(/(\d{1,2})\s*(?:\+|yaş\s*(?:ve\s*)?(?:üzeri|üstü|ve üstü|sınırı))/) || s.match(/(\d{1,2})\s*yaş\s*altı(?:ndaki)?\s*(?:izleyici|seyirci)[^.]*(?:alınmaz|giremez)/);
  if (m && +m[1] >= 3 && +m[1] <= 21) out.age = `${+m[1]}+`;
  return out;
}
