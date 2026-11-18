// Kaynak sayfalarının yapısal verisindeki (JSON-LD) mekân adresi ve koordinatı (18.11.2026). Yalnızca olgu.
// Güvenlik: adres o ili göstermeli; aynı nokta 3+ farklı mekânda geçiyorsa il/şehir merkezi sayılır, koordinat alınmaz. Yanlış konumdansa konumsuz.
import { cityOfText } from "./cities.mjs";
export const inTR = (a, o) => a > 35.7 && a < 42.3 && o > 25.5 && o < 44.9;
export function geoOf(g) { const a = +g?.lat, o = +g?.lng; if (!Number.isFinite(a) || !Number.isFinite(o) || !inTR(a, o)) return null; if (Math.abs(a * 1e3 - Math.round(a * 1e3)) < 1e-6 && Math.abs(o * 1e3 - Math.round(o * 1e3)) < 1e-6) return null; return [+a.toFixed(6), +o.toFixed(6)]; }
export const addrOk = (a, il) => { const s = String(a || "").trim(); return s.length >= 12 && /\d|cad|sok|mah|bulv/i.test(s) && cityOfText(s) === il; };
const top = (m) => Object.entries(m).sort((x, y) => y[1] - x[1])[0]?.[0] || "";
export function vlocAdd(V, il, e) { if (!e.venue || (!e.vg && !e.va)) return; const x = (V[il + "|" + e.venue] ||= { g: {}, a: {} }); if (e.vg) { const k = e.vg.join(","); x.g[k] = (x.g[k] || 0) + 1; } if (e.va) x.a[e.va] = (x.a[e.va] || 0) + 1; }
export function vlocFinal(V) { const out = {}, spots = {}; for (const [k, x] of Object.entries(V)) { const il = k.slice(0, k.indexOf("|")), a = top(x.a), g = top(x.g); if (!addrOk(a, il)) continue; out[k] = { a, ...(g ? { g: g.split(",").map(Number) } : {}) }; if (g) { const s = out[k].g.map((n) => n.toFixed(3)).join(","); (spots[s] ||= new Set()).add(k.slice(k.indexOf("|") + 1)); } }
  for (const x of Object.values(out)) if (x.g && spots[x.g.map((n) => n.toFixed(3)).join(",")].size >= 3) delete x.g; return out; }
