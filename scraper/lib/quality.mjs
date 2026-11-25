// Veri kalitesi (19.11.2026, kullanıcı belgesi: "test kayıtları ve bozuk mekân bilgileri yayından kalkmalı; yanlış adrese davet her şeyi sıfırlar").
import { fold } from "./util.mjs";
const US = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";
const FOREIGN = new RegExp(`\\b(USA|U\\.S\\.A\\.?|United States|Canada|United Kingdom|Deutschland|Germany)\\b|,\\s*(${US})(\\s+\\d{5}(-\\d{4})?)?\\s*(,|$)`);
export const isTestEvent = (e) => { const t = fold(e.title || "").trim(), v = fold(e.venue || "").trim();
  return /^(test|deneme|demo|dummy|sample|asdf+|qwerty|x{3,})( ?\d+)?$/.test(t) || /\btest webbox\b|\bwebbox deneme\b|\bkampanyasi test$/.test(t) || /^(ilgili urunler|tarihiebrusanattasarimi venue|incele|detaylar?|bilet al|satin al)$/.test(v)
    || /^(tum )?(etkinlikleri?|biletleri?) (kesfet|gor|incele|listele)$|^(daha fazla|tumunu gor|hepsini gor)$/.test(t); }; // site düğmeleri etkinlik sanılmasın (25.11.2026: biletimGO "Etkinlikleri Keşfet" / "İncele")
export const isOnlineVenue = (v) => /^online\b|\bonline etkinlik|\bcurrently online\b|\bzoom\b|\bstreamyard\b|\bwebinar\b|^cevrim ?ici/.test(fold(v || "").trim());
export const isForeignVenue = (e) => FOREIGN.test([e.venue, e.address].filter(Boolean).join(" "));
export const badEvent = (e) => !e.manual && (isTestEvent(e) || isOnlineVenue(e.venue) || isForeignVenue(e));
// Mekân adına karışan tarih yazısı, adres ve ülke ayıklanır; yalnızca adres olan kayda dokunulmaz
export function cleanVenueText(name) {
  let v = String(name || "").replace(/\s+/g, " ").trim(); if (!v) return "";
  v = v.replace(/\s*(?:📅|🗓️?|⏰|📍).*$/u, "").replace(/\s*\b(Tarih ve saatler?|Tarih ve saat)\s*:.*$/i, "").replace(/\s*\([^()]*\b(Turkey|Türkiye|Province)\b[^()]*\)\s*$/i, "").replace(/,?\s*(Turkey|Türkiye)\s*$/i, "").trim();
  const P = v.split(/\s*,\s*/); if (P.length > 1 && P[0].length >= 4 && !/\b(mah(alle(si)?)?\.?|sok(ak|\.)?|sk\.?|cad(de(si)?)?\.?|cd\.?|bulvar[ıi]?|blv\.?|no\s*[:.]?\s*\d)/i.test(P[0]) && /\bno\s*[:.]?\s*\d|\/\/|\b(mah(alle(si)?)?|cd|cad(de(si)?)?|sk|sok(ak)?|blv|bulvar[ıi]?)\b\.?/i.test(P.slice(1).join(" "))) v = P[0];
  return v.replace(/[\s,;:·-]+$/, "").trim();
}
