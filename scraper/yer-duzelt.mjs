// Kullanıcı kararı (19.11.2026): Beşevler'deki Hacı Bayram Veli yerleşkesi haritada yalnızca "HUKUK FAKÜLTESİ" diye geçer.
import { readFileSync as R, writeFileSync as W, existsSync as X } from "node:fs";
const F = "yv/399_328.json", P = [[32.819795, 39.943323], [32.817453, 39.942848], [32.8177, 39.941746], [32.818193, 39.941592], [32.818684, 39.941336], [32.820147, 39.942229]];
const inP = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
if (X(F)) { const L = JSON.parse(R(F, "utf8")); const K = L.filter((a) => !(inP(a[2], a[1]) && /bayram|iktisad|i̇?ibf|a blok|edebiyat|hukuk/i.test(a[0]))); K.unshift(["HUKUK FAKÜLTESİ", 39.9423, 32.8188, 10]); W(F, JSON.stringify(K)); console.log("Hukuk Fakültesi:", L.length, "→", K.length); }
