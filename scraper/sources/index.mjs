// TARANAN KAYNAKLAR
// Yeni kaynak eklemek = bu listeye bir kayıt eklemek. Alanlar:
//   id, name        : kısa kimlik ve sitede görünen ad
//   kind            : "bilet" (bilet satan site) | "kurum" | "mekan" | "toplayici"
//   home            : ana adres (site haritası için)
//   listings        : Ankara etkinliklerinin listelendiği sayfalar
//   link            : etkinlik detay sayfası adreslerini tanıyan kalıp
//   render          : liste sayfası JavaScript ile yükleniyorsa true (gerçek tarayıcı açılır)
//   renderDetail    : detay sayfası da JavaScript ile yükleniyorsa true
//   loadMore        : "daha fazla göster" düğmesinin yazısı
//   sitemap         : site haritasından da etkinlik adresi topla
//   city            : "ankara" (liste zaten Ankara'ya özel) | "tr" (Ankara olanları ayıkla)
//   defaultVenue / defaultCat / forceCat : mekân veya kurum sitelerinde boş kalan alanlar için
//
// ÖNEMLİ: Bu adreslerin bir kısmı sitelerin bugünkü yapısına göre tahmindir; bu sunucudan o sitelere
// bağlanılamadığı için önceden denenemedi. İlk GitHub Actions çalıştırmasından sonra "data/health.json"
// ve "Kaynak sağlık raporu" konusu hangi kaynağın kaç etkinlik getirdiğini gösterir; boş gelenlerin
// listings/link alanları o raporla ve kaydedilen sayfa örnekleriyle (debug artifact) düzeltilir.

import * as P from "./parsers.mjs";

// Aylık takvim sayfası: bu ay (k=0) ve gelecek ay (k=1)
function monthUrl(base, k) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + k); return `${base}?&month=${d.getMonth() + 1}&year=${d.getFullYear()}`; }

export default [
  /* ===================== BİLET SİTELERİ ===================== */
  { id: "biletix", name: "Biletix", kind: "bilet", home: "https://www.biletix.com",
    listings: ["https://www.biletix.com/search/TURKIYE/tr?category_sb=-1&date_sb=-1&city_sb=Ankara"],
    link: /biletix\.com\/(etkinlik|etkinlik-grup)\/[A-Z0-9]+\//i, render: true, renderDetail: true, loadMore: ["Daha fazla", "Daha Fazla Göster"], city: "tr", maxDetail: 220, budgetMin: 24, concurrency: 4 },
  // Liste sayfalarının kendi "daha fazla" isteği bütün kayıtları ve seansları verir (sinema ve festival dahil);
  // birden çok salonlu kayıtlar detay sayfasından okunur
  { id: "biletinial", name: "Biletinial", kind: "bilet", home: "https://biletinial.com", collect: P.biletinialCollect,
    listings: ["https://biletinial.com/tr-tr/sehrineozel/ankara", "https://biletinial.com/tr-tr/tiyatro/ankara", "https://biletinial.com/tr-tr/muzik/ankara", "https://biletinial.com/tr-tr/opera-bale/ankara"],
    link: /biletinial\.com\/tr-tr\/(tiyatro|muzik|opera-bale|etkinlik|stand-up|festival|cocuk-aktiviteleri|egitim)\/[a-z0-9-]+/i, render: true, loadMore: ["Daha fazlasını göster", "Daha Fazla"], city: "tr", maxDetail: 320 },
  { id: "sanatcepte", name: "Sanatçepte", kind: "bilet", home: "https://www.sanatcepte.gov.tr",
    listings: ["https://www.sanatcepte.gov.tr/etkinlik/etkinlikler?search=ankara", "https://www.sanatcepte.gov.tr/etkinlik/etkinlikler"],
    link: /sanatcepte\.gov\.tr\/etkinlik\/etkinlik-detay\/[a-z0-9-]+/i, render: true, loadMore: ["Daha fazla"], city: "tr", maxDetail: 450, concurrency: 5,
    parse: P.sanatcepte, heuristics: false },
  { id: "bubilet", name: "Bubilet", kind: "bilet", home: "https://www.bubilet.com.tr",
    listings: ["https://www.bubilet.com.tr/ankara"],
    link: /bubilet\.com\.tr\/ankara\/(etkinlik|sanatci)\/[a-z0-9-]+/i, render: true, loadMore: ["Daha fazla"], city: "ankara" },
  { id: "passo", name: "Passo", kind: "bilet", home: "https://www.passo.com.tr",
    listings: ["https://www.passo.com.tr/tr/kategori/konser/4615", "https://www.passo.com.tr/tr/arama?city=Ankara"],
    link: /passo\.com\.tr\/tr\/etkinlik\/[a-z0-9-]+\/\d+/i, render: true, renderDetail: true, loadMore: ["Daha Fazla"], city: "tr" },
  { id: "mobilet", name: "Mobilet", kind: "bilet", home: "https://www.mobilet.com",
    listings: ["https://www.mobilet.com/tr/search/?city=ankara"],
    link: /mobilet\.com\/(tr\/)?(event|etkinlik)\/[a-z0-9-]+/i, render: true, renderDetail: true, city: "tr" },
  { id: "iticket", name: "iTicket", kind: "bilet", home: "https://iticket.com.tr",
    listings: ["https://iticket.com.tr/tr/events", "https://iticket.com.tr/en/events/music"],
    link: /iticket\.com\.tr\/(en|tr)\/events\/[a-z-]+\/[a-z0-9-]+/i, render: true, city: "tr" },
  { id: "bugece", name: "BUGECE", kind: "bilet", home: "https://bugece.co",
    listings: ["https://bugece.co/tr/city/ankara"],
    link: /bugece\.co\/(tr\/)?(event|etkinlik|e)\/[a-z0-9-]+/i, render: true, renderDetail: true, city: "tr", defaultCat: "parti" },
  { id: "tiyatrolar", name: "tiyatrolar.com.tr", kind: "bilet", home: "https://tiyatrolar.com.tr",
    listings: ["https://tiyatrolar.com.tr/ankara-tiyatro-oyunlari", "https://tiyatrolar.com.tr/tiyatro-oyunlari?sehir=ankara"],
    link: /tiyatrolar\.com\.tr\/tiyatro(-bilet)?\/[a-z0-9-]+/i, sitemap: true, render: true, city: "tr", defaultCat: "tiyatro" },
  { id: "bilkent", name: "Bilkent Bilet", kind: "bilet", home: "https://ticket.bilkent.edu.tr",
    listings: ["https://ticket.bilkent.edu.tr/"],
    link: /ticket\.bilkent\.edu\.tr\/bilet\/\d+/i, city: "ankara", defaultVenue: "Bilkent Konser Salonu", defaultCat: "konser",
    parse: P.bilkent, heuristics: false },
  { id: "biletino", name: "Biletino", kind: "bilet", home: "https://biletino.com",
    listings: ["https://biletino.com/tr/ankara/"],
    link: /biletino\.com\/(tr\/)?e\/[a-z0-9-]+/i, render: true, city: "tr" },

  /* ===================== KURUMLAR ===================== */
  { id: "devtiyatro", enabled: false, /* yeni sitede seans listesi yok; DT seansları Bakanlığın Sanatçepte sitesinden geliyor (06.11.2026) */ name: "Devlet Tiyatroları", kind: "kurum", home: "https://www.devtiyatro.gov.tr",
    listings: ["https://www.devtiyatro.gov.tr/DevletTiyatro/tr/oyunlar/ankara"],
    link: /devtiyatro\.gov\.tr\/.+\/(oyun|oyundetay|eser)\/[^/?#]+/i, render: true, city: "tr", defaultCat: "tiyatro" },
  // Program sayfasının kendi kullandığı açık liste; Ankara Müdürlüğü'nün temsilleri ayıklanır
  { id: "dob", name: "Ankara DOB", kind: "kurum", home: "https://www.operabale.gov.tr",
    collect: P.dobCollect, listings: [], link: null, city: "ankara", defaultCat: "sahne" },
  { id: "cso", name: "CSO", kind: "kurum", home: "https://www.cso.gov.tr",
    listings: ["https://www.cso.gov.tr/tr/konserler"],
    link: /cso\.gov\.tr\/(tr\/)?(konser|konserler|etkinlik)\/[^?#]+/i, render: true, city: "ankara", defaultVenue: "CSO Ada · Ziraat Bankası Ana Salon", defaultCat: "konser" },
  { id: "abb-tiyatro", name: "ABB Şehir Tiyatroları", kind: "kurum", home: "https://www.ankara.bel.tr",
    listings: ["https://www.ankara.bel.tr/sehir-tiyatrolari"],
    link: /ankara\.bel\.tr\/(sehir-tiyatrolari|oyunlar|tiyatro)\/[^?#]+/i, render: true, city: "ankara", defaultCat: "tiyatro" },
  { id: "abb-kultur", name: "Ankara Büyükşehir Kültür", kind: "kurum", home: "https://www.ankara.bel.tr",
    listings: ["https://www.ankara.bel.tr/etkinlikler"], parseList: P.abbList, link: null, render: true, city: "ankara" }, // ad, tarih, saat ve yer liste kartında
  { id: "cankaya", name: "Çankaya Belediyesi", kind: "kurum", home: "https://www.cankaya.bel.tr",
    listings: ["https://www.cankaya.bel.tr/etkinlikler"],
    link: /cankaya\.bel\.tr\/(etkinlik|etkinlikler)\/[^?#]+/i, render: true, city: "ankara" },
  { id: "yenimahalle", name: "Yenimahalle Belediyesi", kind: "kurum", home: "https://www.yenimahalle.bel.tr",
    listings: ["https://www.yenimahalle.bel.tr/etkinlikler"],
    link: /yenimahalle\.bel\.tr\/(etkinlik|etkinlikler)\/[^?#]+/i, render: true, city: "ankara" },
  { id: "kecioren", name: "Keçiören Belediyesi", kind: "kurum", home: "https://www.kecioren.bel.tr",
    listings: ["https://www.kecioren.bel.tr/etkinlikler"],
    link: /kecioren\.bel\.tr\/(etkinlik|etkinlikler)\/[^?#]+/i, render: true, city: "ankara" },
  { id: "etimesgut", name: "Etimesgut Belediyesi", kind: "kurum", home: "https://www.etimesgut.bel.tr",
    listings: ["https://www.etimesgut.bel.tr/etkinlikler"],
    link: /etimesgut\.bel\.tr\/etkinlik\/[^?#]+/i, render: true, city: "ankara", defaultVenue: "Etimesgut Belediyesi", parse: P.etimesgut, heuristics: false },
  { id: "mamak", name: "Mamak Belediyesi", kind: "kurum", home: "https://www.mamak.bel.tr",
    collect: P.mamakCollect, listings: [], link: null, city: "ankara", defaultVenue: "Mamak" },

  /* ===================== MEKÂNLAR VE FESTİVALLER ===================== */
  { id: "odtu-kkm", name: "ODTÜ KKM", kind: "mekan", home: "https://kkm.metu.edu.tr",
    listings: ["https://kkm.metu.edu.tr/tr/etkinlikler"],
    link: /kkm\.metu\.edu\.tr\/(tr\/)?(etkinlik|event)[^?#]*/i, render: true, city: "ankara", defaultVenue: "ODTÜ Kültür ve Kongre Merkezi" },
  { id: "cermodern", name: "CerModern", kind: "mekan", home: "https://cermodern.org",
    listings: ["https://www.cermodern.org/etkinlikler"], parseList: P.cermodernList, link: null,
    render: true, city: "ankara", defaultVenue: "CerModern", defaultCat: "atolye" },
  { id: "erimtan", name: "Erimtan Müzesi", kind: "mekan", home: "https://erimtanmuseum.org",
    listings: [monthUrl("https://erimtanmuseum.org/tr/takvim", 0), monthUrl("https://erimtanmuseum.org/tr/takvim", 1)], parseList: P.erimtanList, link: null, posterFromPage: true,
    render: true, city: "ankara", defaultVenue: "Erimtan Arkeoloji ve Sanat Müzesi", defaultCat: "atolye" },
  { id: "ankara-caz", enabled: false, /* alan adı artık çözülmüyor (06.11.2026) */ name: "Ankara Caz Festivali", kind: "mekan", home: "https://www.ankarajazzfestival.com",
    listings: ["https://www.ankarajazzfestival.com/program"],
    link: /ankarajazzfestival\.com\/(program|konser|etkinlik)[^?#]*/i, render: true, city: "ankara", defaultCat: "konser" },
  { id: "film-ankara", enabled: false, /* sitede program sayfası yok (404); festival seansları Biletinial listesinden geliyor (12.11.2026) */ name: "Ankara Film Festivali", kind: "mekan", home: "https://www.filmfestankara.org.tr",
    listings: ["https://www.filmfestankara.org.tr/program"],
    // Program yayınlanınca seans sayfaları JSON-LD ile okunur; haber/başvuru sayfaları etkinlik sayılmaz
    link: /filmfestankara\.org\.tr\/(program|gosterim|seans)\/[^?#]+/i, render: true, city: "ankara", forceCat: "sinema", heuristics: false },
  { id: "if", enabled: false, /* Cloudflare bot koruması; korumayı aşmıyoruz (06.11.2026) */ name: "IF Performance Hall", kind: "mekan", home: "https://www.ifperformance.com",
    listings: ["https://www.ifperformance.com/ankara"],
    link: /ifperformance\.com\/[^?#]*(etkinlik|event|konser)[^?#]*/i, render: true, city: "tr" },
  { id: "congresium", enabled: false, /* site GL events tanıtım sayfasına dönüştü, etkinlik listesi yok (06.11.2026) */ name: "Congresium", kind: "mekan", home: "https://www.congresium.com",
    listings: ["https://www.congresium.com/etkinlikler"],
    link: /congresium\.com\/(etkinlik|etkinlikler|event)\/[^?#]+/i, render: true, city: "ankara", defaultVenue: "Congresium Ankara" },
  { id: "jollyjoker", enabled: false, /* /ankara sayfası yok; /kesif yalnızca blog ve galeri (06.11.2026) */ name: "Jolly Joker", kind: "mekan", home: "https://www.jollyjoker.com.tr",
    listings: ["https://www.jollyjoker.com.tr/ankara"],
    link: /jollyjoker\.com\.tr\/[^?#]*(etkinlik|event)[^?#]*/i, render: true, city: "tr", defaultVenue: "Jolly Joker Ankara", defaultCat: "konser" },

  /* ===================== TOPLAYICILAR ===================== */
  { id: "radar", name: "Radar Türkiye", kind: "toplayici", home: "https://www.radarturkiye.com",
    listings: ["https://www.radarturkiye.com/sehir/ankara", "https://www.radarturkiye.com/etkinlikler?sehir=ankara"],
    link: /radarturkiye\.com\/(en\/)?(etkinlik|event)\/[a-z0-9-]+/i, render: true, city: "tr" },
  { id: "ra", name: "Resident Advisor", kind: "toplayici", home: "https://ra.co",
    listings: ["https://ra.co/events/tr/ankara"],
    link: /ra\.co\/events\/\d+/i, render: true, renderDetail: true, city: "tr", defaultCat: "parti" },
  { id: "kultur-ankara", enabled: false, /* alan adı artık çözülmüyor (06.11.2026) */ name: "Kültür Ankara", kind: "toplayici", home: "https://kultur.ankara.bel.tr",
    listings: ["https://kultur.ankara.bel.tr/etkinlikler"],
    link: /kultur\.ankara\.bel\.tr\/(etkinlik|etkinlikler)\/[^?#]+/i, render: true, city: "ankara" },
];
