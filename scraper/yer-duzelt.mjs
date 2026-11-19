// Kullanıcı kararı (19.11.2026): Beşevler'deki Hacı Bayram Veli yerleşkesi haritada "ANKARA HACI BAYRAM VELİ ÜNİVERSİTESİ HUKUK FAKÜLTESİ / GAZİ HUKUK" diye geçer.
import { readFileSync as R, writeFileSync as W, existsSync as X } from "node:fs";
const F = "yv/399_328.json", P = [[32.819795, 39.943323], [32.817453, 39.942848], [32.8177, 39.941746], [32.818193, 39.941592], [32.818684, 39.941336], [32.820147, 39.942229]];
const inP = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const NAME = "ANKARA HACI BAYRAM VELİ ÜNİVERSİTESİ HUKUK FAKÜLTESİ / GAZİ HUKUK";
const bad = (a) => { const l = String(a[0] || "").toLocaleLowerCase("tr"); return (/hac[ıi] ?bayram ?vel[iı]/.test(l) && /(iktisad|iibf|idari bilim|a blok|hukuk|beşevler|besevler|emniyet)/.test(l)) || (inP(a[2], a[1]) && /(bayram|iktisad|iibf|a blok|edebiyat|hukuk|fakülte|üniversite)/.test(l)); };
let n = 0; for (const f of ["yv/399_328.json", "yv/399_327.json", "yv/399_329.json", "yv/398_328.json", "yv/400_328.json"]) { if (!X(f)) continue; const L = JSON.parse(R(f, "utf8")), K = L.filter((a) => !bad(a)); n += L.length - K.length; if (f === F) K.unshift([NAME, 39.9423, 32.8188, 10]); W(f, JSON.stringify(K)); }
console.log("Hukuk Fakültesi düzeltmesi:", n, "eski kayıt kaldırıldı");
