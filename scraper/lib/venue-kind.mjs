// Yanlış iğne olmasın (18.11.2026): adı tutsa bile türü etkinlik mekânına uymayan sonuç alınmaz.
// "Trump Sahne" bir çamaşırhaneye, "Mavi Sahne" bir giyim mağazasına, "Kale Sahne" bir parka düşüyordu. Yanlış konumdansa konumsuz.
const fold = (s) => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[c]));
const SHOP_OK = new Set(["mall", "department_store", "craft"]);
const NEVER = new Set(["amenity/pharmacy", "amenity/bank", "amenity/atm", "amenity/clinic", "amenity/doctors", "amenity/dentist", "amenity/fuel", "amenity/parking", "amenity/post_office", "amenity/car_rental", "amenity/bus_station",
  "building/apartments", "building/house", "building/residential", "building/garage", "building/industrial", "building/warehouse", "building/detached"]);
const NEEDS = { "leisure/park": /park|bahce|amfi|acik ?hava|meydan/, "leisure/garden": /park|bahce|amfi|acik ?hava/, "amenity/school": /okul|kolej|lise|egitim/, "amenity/kindergarten": /okul|kres/, "amenity/college": /okul|kolej|lise|egitim/,
  "building/school": /okul|kolej|lise|egitim/, "amenity/hospital": /hastane/, "amenity/place_of_worship": /cami|kilise|sinagog|katedral|tekke|mevlev/, "amenity/ferry_terminal": /iskele|vapur|terminal/, "shop/coffee": /coffee|kahve|cafe|kafe/ };
export function kindOk(name, kind) { const k = String(kind || ""), i = k.indexOf("/"); if (i < 0) return true; const a = k.slice(0, i), b = k.slice(i + 1), n = fold(name);
  if (/^leisure\/(stadium|sports_centre|sports_hall)$/.test(k) && /opera|salon|sahne|tiyatro|sinema|cinema|kultur|konser/.test(n)) return false; // "Türk Telekom Opera Salonu" bir stada düşmesin
  if (/^amenity\/(restaurant|cafe|fast_food)$/.test(k) && /sahne|salon|tiyatro|sinema|cinema|kultur|kongre|opera|konser|avm|cine/.test(n)) return false; // "Salihli Luna AVM Cinens" bir lokantaya düşmesin
  if (NEEDS[k]) return NEEDS[k].test(n); if (NEVER.has(k)) return false; if (a === "shop") return SHOP_OK.has(b); if (a === "office") return b === "government"; if (["man_made", "aeroway", "highway", "railway"].includes(a)) return false; return true; }
