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
    listings: ["https://tiyatrolar.com.tr/tiyatro-oyunlari"],
    link: /tiyatrolar\.com\.tr\/tiyatro(-bilet)?\/[a-z0-9-]+/i, sitemap: true, render: true, city: "tr", defaultCat: "tiyatro", maxDetail: 1500, concurrency: 5, budgetMin: 150 },
  { id: "iticket", name: "iTicket", kind: "bilet", home: "https://iticket.com.tr",
    listings: ["https://iticket.com.tr/tr/events", "https://iticket.com.tr/en/events/music"],
    link: /iticket\.com\.tr\/(en|tr)\/events\/[a-z-]+\/[a-z0-9-]+/i, render: true, city: "tr", maxDetail: 400, budgetMin: 60 },
  { id: "biletix", name: "Biletix", kind: "bilet", home: "https://www.biletix.com",
    listings: ["https://www.biletix.com/search/TURKIYE/tr?category_sb=-1&date_sb=-1"],
    link: /biletix\.com\/(etkinlik|etkinlik-grup)\/[A-Z0-9]+\//i, render: true, renderDetail: true, loadMore: ["Daha fazla", "Daha Fazla Göster"],
    city: "tr", maxDetail: 900, budgetMin: 150, concurrency: 4 },
];

const ONE = [
  { id: "biletinial", name: "Biletinial", kind: "bilet", home: "https://biletinial.com", collect: P.biletinialCollect,
    cityUrl: C.id, cityName: C.name,
    listings: [`https://biletinial.com/tr-tr/tiyatro/${C.id}`, `https://biletinial.com/tr-tr/muzik/${C.id}`],
    link: /biletinial\.com\/tr-tr\/(tiyatro|muzik|opera-bale|etkinlik|stand-up|festival|cocuk-aktiviteleri|egitim)\/[a-z0-9-]+/i, render: true,
    loadMore: ["Daha fazlasını göster", "Daha Fazla"], city: C.id, maxDetail: 320, budgetMin: 30 },
];

export default CITY === "tr" ? TR : ONE;
