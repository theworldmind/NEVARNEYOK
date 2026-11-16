// ANKARA DIŞINDAKİ İLLER (CITY=<il> node run.mjs) ve BÜTÜN TÜRKİYE LİSTELERİ (CITY=tr).
// Ankara kendi geniş kaynak listesiyle (index.mjs) taranır. Diğer illerde şehir seçmeye izin veren bilet siteleri kullanılır.
// Bot korumalı siteler (Bubilet, Passo, Biletino, Mobilet; Resident Advisor 403 veriyor) taranmaz.
// Bütün Türkiye'yi tek listede veren kamu kaynakları (Sanatçepte: Devlet Tiyatroları; DOB) 81 kez değil, bir kez (CITY=tr) taranır;
// her etkinlik adresindeki ile göre dağıtılır (sehirler-birlestir.mjs).
import * as P from "./parsers.mjs";
import { cityById } from "../lib/cities.mjs";

const CITY = process.env.CITY || "ankara";
const C = cityById(CITY);

const TR = [
  { id: "sanatcepte", name: "Sanatçepte", kind: "bilet", home: "https://www.sanatcepte.gov.tr",
    listings: ["https://www.sanatcepte.gov.tr/etkinlik/etkinlikler"],
    link: /sanatcepte\.gov\.tr\/etkinlik\/etkinlik-detay\/[a-z0-9-]+/i, render: true, loadMore: ["Daha fazla"], city: "tr", maxDetail: 1600, concurrency: 5,
    parse: P.sanatcepte, heuristics: false, budgetMin: 150 },
  { id: "dob", name: "DOB", kind: "kurum", home: "https://www.operabale.gov.tr",
    collect: P.dobCollect, listings: [], link: null, city: "tr", defaultCat: "sahne" },
  // Bütün Türkiye'yi listeleyen bilet siteleri (15.11.2026, kullanıcı: "daha çok siteden veri al"): kayıt mekân/adresinden iline dağıtılır
  { id: "tiyatrolar", name: "tiyatrolar.com.tr", kind: "bilet", home: "https://tiyatrolar.com.tr",
    // eski /tiyatro-oyunlari sayfası kaldırıldı (404); oyunlar ana sayfada ve "sahnedekiler" listelerinde (keşif 15.11.2026)
    listings: ["https://tiyatrolar.com.tr/", ...[1, 2, 3, 4].map((t) => `https://tiyatrolar.com.tr/sahnedekiler/?tip=${t}`)],
    link: /tiyatrolar\.com\.tr\/tiyatro(-bilet)?\/[a-z0-9-]+/i, sitemap: true, render: true, city: "tr", defaultCat: "tiyatro", maxDetail: 1500, concurrency: 5, budgetMin: 150 },
  { id: "iticket", name: "iTicket", kind: "bilet", home: "https://iticket.com.tr",
    // site yeni adreslere geçti (/etkinlikler/<tür>/<il>/<ad>); bütün etkinlikler sayfa sayfa (keşif 15.11.2026)
    listings: [...Array.from({ length: 25 }, (_, i) => `https://iticket.com.tr/etkinlikler/tumu?page=${i + 1}`)],
    link: /iticket\.com\.tr\/(etkinlikler\/[a-z-]+\/[a-z-]+\/[a-z0-9-]+|(en|tr)\/events\/[a-z-]+\/[a-z-]+\/[a-z0-9-]+)/i, render: true, city: "tr", maxDetail: 900, concurrency: 5, budgetMin: 120 },
  // Biletix: sitenin kendi arama dizini bütün Türkiye listesini verir (liste sayfası yalnızca ~70 kayıt gösteriyordu); fiyat için yakın tarihlilerin detayı
  { id: "biletix", name: "Biletix", kind: "bilet", home: "https://www.biletix.com", collect: P.biletixCollect, listings: [],
    link: /biletix\.com\/(etkinlik|etkinlik-grup)\/[A-Z0-9]+\//i, render: true, renderDetail: true,
    city: "tr", maxDetail: 3200, budgetMin: 165, concurrency: 7 },
];

// (16.11.2026, kullanıcı: "bugün bütün Türkiye'de bu kadar mı etkinlik?") büyük illerde daha çok sayfa; tiyatro ve müziğin yanında stand-up, çocuk, opera-bale, festival, eğitim/atölye listeleri de
const BIG = { istanbul: [1600, 110], izmir: [700, 60], antalya: [500, 45], bursa: [500, 45], kocaeli: [420, 40], eskisehir: [420, 40], adana: [380, 35], konya: [380, 35], mersin: [380, 35], gaziantep: [380, 35] };
const [MD, BM] = BIG[C.id] || [320, 30];
const ONE = [
  { id: "biletinial", name: "Biletinial", kind: "bilet", home: "https://biletinial.com", collect: P.biletinialCollect,
    cityUrl: C.id, cityName: C.name,
    listings: ["tiyatro", "muzik", "stand-up", "cocuk-aktiviteleri", "opera-bale", "festival", "egitim", "etkinlik"].map((k) => `https://biletinial.com/tr-tr/${k}/${C.id}`),
    link: /biletinial\.com\/tr-tr\/(tiyatro|muzik|opera-bale|etkinlik|stand-up|festival|cocuk-aktiviteleri|egitim)\/[a-z0-9-]+/i, render: true,
    loadMore: ["Daha fazlasını göster", "Daha Fazla"], city: C.id, maxDetail: MD, budgetMin: BM },
];
// İstanbul: kurumların kendi siteleri (kaynak önceliği: kurum → mekân → bilet)
if (CITY === "istanbul") ONE.push(
  { id: "iksv", name: "İKSV", kind: "kurum", home: "https://www.iksv.org", collect: P.iksvCollect, listings: [], link: null, city: "istanbul" },
  { id: "zorlupsm", name: "Zorlu PSM", kind: "mekan", home: "https://www.zorlupsm.com", listings: ["https://www.zorlupsm.com/etkinlikler"],
    link: /zorlupsm\.com\/etkinlikler\/(?!tiyatro$|konser$|muzik$|hediye)[a-z0-9-]+$/i, render: true, scrolls: 6, city: "istanbul", defaultVenue: "Zorlu PSM", maxDetail: 220, budgetMin: 25 },
  { id: "ibbst", name: "İBB Şehir Tiyatroları", kind: "kurum", home: "https://sehirtiyatrolari.ibb.istanbul", listings: ["https://sehirtiyatrolari.ibb.istanbul/oyunlar"],
    link: /sehirtiyatrolari\.ibb\.istanbul\/oyun\/[a-z0-9-]+$/i, render: true, scrolls: 4, city: "istanbul", defaultCat: "tiyatro", maxDetail: 160, budgetMin: 25 });

// İle özel resmî kaynaklar (belediyelerin kendi bilet siteleri)
if (CITY === "izmir") ONE.push({ id: "izmirks", name: "İzmir Kültürsanat", kind: "kurum", home: "https://kultursanat.izmir.bel.tr", collect: P.izmirKsCollect, listings: [], link: null, city: "izmir" });

export default CITY === "tr" ? TR : ONE;
