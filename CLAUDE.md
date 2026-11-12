# Ne Var Ne Yok? — çalışma kuralları

Kullanıcıyla her zaman Türkçe konuş.

## 1. Bu depo tek gerçek kaynaktır
- Herhangi bir değişiklikten önce `git pull` yap ve dokunacağın dosyaları baştan oku. Sistemin şu anki mantığı doğru kabul edilir. Yeni bir şey eklerken bu mantığa uy.
- Dışarıda hazırlanmış bir paketi (zip, tek dosya HTML, eski Python toplayıcı) bu deponun üzerine **asla** yazma. Başka bir yerde yapılmış bir tasarım veya kod değişikliği, bu depodaki `index.html` / `app.js` içine elle ya da üç yönlü birleştirmeyle taşınır.
- Değişikliği `main`e gönderince **Siteyi yayınla** iş akışı siteyi kendiliğinden yayınlar (nevarneyok.net.tr). Gönderdikten sonra işin başarıyla bittiğini kontrol et (`gh run list` / `gh run watch`).

## 2. Sistem nasıl çalışır (korunacak)
| Parça | Görev |
|---|---|
| `index.html` | Görünüm (CSS + işaretleme). En altta veri yükleyici: `data/events.json` ve `data/venues.json` dosyalarını `no-store` ile çeker, sonra `app.js?v=…` dosyasını ekler. |
| `app.js` | Bütün çalışan kod. |
| `scraper/run.mjs` | 32 kaynak (`scraper/sources/index.mjs`). Her sabah 06:30 tam tarama, 16:00'da yalnızca fiyat ve durum tazeleme (`update.yml`). |
| `scraper/sources/` | Kaynak türleri: detay sayfası (`link`), takvim sayfası (`parseList`: ad, tarih, saat, yer liste sayfasında), kurumun kendi sitesinin kullandığı açık veri (`collect`: DOB, Mamak). Kapanan kaynaklar `enabled: false` ve gerekçesiyle durur. |
| `probe.yml` / `scraper/probe.mjs` | **Kaynak keşfi.** Bir sayfanın bağlantı kalıplarını, JSON isteklerini ve tarih satırlarını yalnızca iş akışı günlüğüne yazar. Yeni kaynak eklemeden ya da bozulanı onarmadan önce bununla bak (bu çalışma alanı sitelere doğrudan bağlanamaz). |
| `scraper/build-pages.mjs` | Etkinlik, mekân ve kategori sayfaları, sitemap ve feed üretir. `app.js?v=` sürümünü kendiliğinden günceller, **elle değiştirme**. |
| `scraper/social.mjs` | **Instagram (her sabah, tam taramada).** Görseller site yerelde açılarak çizilir; **etkinliklerin herkese açık afişleri** değiştirilmeden, "Görsel: <kaynak>" ile yer alır (kullanıcı kararı, 13.11.2026; sanatçı fotoğrafı/video yok; kaldırma talebi 24 saatte). Görsellerde fiyat, "fiyatı düştü", "haberlerde" yazılmaz (kullanıcı isteği). **Kaydırmalı gönderiler** (1. sayfa temalı kapak + her sayfada tek etkinlik büyük bilet; en çok 8): 10:00 "Bugün Ankara'da" (konser/tiyatro/sinema dışı; gökyüzü ve silüet), 12:30 "Bugün sinemada" (kadife perde, ışıklı tabela, logolu mısır kutuları, film şeridi; bilette seans saatleri), 15:00 "Bu akşam konser" (sahne ışıkları, neon, ses dalgası), 17:00 "Bu akşam tiyatro" (kadife perde, altın sırma). Her gönderinin kapağı ve ilk iki bileti hikâye olur (+1/+2/+3 dk, 9:16, üst/alt 250 px boş). Ayrıca siteden telefon görünümünde hikâyeler: 09:00 günaydın, 11:30 afiş duvarı, 14:00 açık bilet, 16:30 sinema perdesi, 19:30 konser sahnesi, 21:30 yarın. Her görselde "nevarneyok.net.tr · Bağlantı profilde". Çıktı `paylas/paylas.json` → `posts: [{id, slot, type: POST (files: [...]) / STORY (file)}]`; `sosyal` dalında `YYYY-AA-GG/`. "NVNY günlük Instagram paylaşımı" zamanlanmış görevi (08:11) her kaydı Metricool'a kendi saatine planlar. Elle yeniden üretmek için `social.yml`. |
| `scraper/films.mjs` | **Vizyondaki filmler.** sinemalar.com'un vizyondaki ve yakında listelerinden, her filmin Ankara seans sayfasından 7 günlük seansları okur → `data/films.json` (film: ad, vizyon tarihi, süre, ülke, tür; salon; saat; biçim). Konu metni alınmaz; afişin yalnızca adresi tutulur. Kaynak boş dönerse dünkü veri korunur. Her taramada (tam ve tazele) çalışır. |
| `scraper/audit.mjs` | **Kapsam denetimi: "neyi kaçırıyoruz?"** Her tam taramadan sonra çalışır. Kendi verisini son 14 taramayla karşılaştırır (kaynak, kategori, gün ve mekân bazında düşüş ya da boşluk). Kesilen listeleri yakalar ("daha fazla" sınırı). Haber akışlarında (Google Haberler, AA, TRT) Ankara etkinlik adlarını arar ve bizde olmayanları listeler. 3+ taramadır boş kaynaklara kendiliğinden keşif (`probe.mjs`) yapar. Geçmiş `data/coverage.json` dosyasında tutulur. Rapor GitHub'da **"Kapsam raporu"** konusuna yazılır. **Kullanıcının fark ettiği bir eksik, önce bu denetime bir kural olarak eklenir, sonra düzeltilir;** aynı tür eksik bir daha kullanıcıya kalmaz. |
| `scraper/buzz.mjs` | **İlgi takibi.** Kültür-sanat ve sinema haber akışlarını (TRT, AA, Hürriyet, Habertürk, Sabah, Cumhuriyet, Sözcü, Evrensel, Yeni Ankara, Beyazperde, Box Office Türkiye; `FEEDS`) ve Box Office Türkiye hafta sonu tablosunu okur → `data/buzz.json`. Haber metni yalnızca bellekte, ad geçiyor mu diye okunur; **saklanan yalnızca site, tarih ve haber bağlantısı** ile gişe sırası/seyirci. Kısa ya da genel adlar "Ankara" ya da mekân adı olmadan eşleşmez. 21 gün tutulur. Her taramada çalışır. Kapsam denetimi de aynı akışları kullanır. |
| `data/health.json` | Kaynak sağlığı. `data/manual.csv` elle eklenen etkinlikleri, `data/venues.json` mekânları tutar. |

Bozulmaması gereken kurallar:
- **Fiyat kuralı:** Bir fiyat yalnızca toplayıcı onu satış sitesinde son 36 saat içinde doğruladıysa (`priceFresh`, `PRICE_MAX_H`) gösterilir. Tahmini ya da başka siteden kopyalanmış fiyat gösterilmez; doğrulanmamışsa "Fiyat sitede" / "fiyat sitede" yazar. Kullanıcı açıkça istemedikçe değiştirme.
- **Yoğun ilgi (★) puanı** (`app.js`, 3 ve üzeri yıldız): tükenen seans 3; haberlerde 2 (iki ya da daha fazla sitede 3, bilette "… haberi ↗" bağlantısı); en düşük fiyatın yükselmesi 2; sonradan ek seans açılması 2; 8+ seans 2, 4+ seans 1; büyük salon 2; birden çok sitede fiyatlı satış 1. Filmlerde: hafta sonu gişede ilk 5 ya da iki sitede haber (`fHot`); sinema biletinde gişe sırası, seyirci ve haber bağlantıları.
- **Fiyat karşılaştırması:** Bilette iki ya da daha fazla sitede doğrulanmış fiyat varsa çubuklu karşılaştırma (`pcmpHTML`): en düşük ve farklar. Kartta en düşük fiyat yeşil. Yalnızca fiyat kuralına uyan fiyatlar kullanılır.
- **Fiyat seçenekleri** (`cats`, bilette `catsHTML`): sitenin kendi sayfasında adı ve fiyatı açıkça yazan kategoriler [ad, fiyat, satışta, boş koltuk]. Kaynaklar: yapısal verideki adlı teklifler (JSON-LD `offers`, `extract.mjs`) ve Bilkent fiyat grupları (boş koltuk sayısıyla). Fiyatla aynı taramada gelir, fiyat gösterilmiyorsa gösterilmez. Biletinial kategorileri yalnızca koltuk seçiminde verdiği için alınmaz.
- **Rozetler ve filtreler:** `isNew` ve `dropOf` rozetleri (Yeni / Fiyatı %… düştü) ve "Yeni eklenenler" filtresi kalır.
- **Site ayarları:** `window.NVNY_SITE` (iletişim, Instagram, repo) `index.html` içinde durur.
- **Service worker yok:** `app.js` eskilerini kaldırır. `sw.js` ekleme.
- **Giriş ekranı sırası:** `afterIntro()` / `introDone()` ile giriş ekranı bitene kadar ağır işler bekletilir.
- Bot korumalı sitelerin (Bubilet, Passo, Biletino, Mobilet) korumasını aşmaya çalışma. API anahtarı gerektiren hiçbir şey ekleme. Yasal ortaklık önerme.

## 2b. Hukuki kurallar (risk en aza indirildi; bozma)
- **Yalnızca olgular.** Kaynaklardan ad, tarih, saat, mekân, fiyat, satış durumu, süre, yaş, tür ve düzenleyen alınır.
  - **Tanıtım metni (`desc`) yayımlanmaz ve saklanmaz.** `run.mjs` içindeki `strip()` siler. Metinden yalnızca süre ve yaş ayıklanır (`factsFrom`).
  - **Afişler gömülür, kopyalanmaz (kullanıcı kararı, 12.11.2026).** Toplayıcı yalnızca afişin kaynaktaki adresini tutar (`img`, `imgBy`); dosya indirilmez, sunucumuzda saklanmaz, değiştirilmez. Sitede `<img referrerpolicy="no-referrer">` ile kaynağından gösterilir (`pstHTML` / `pstWire`), üzerinde "Görsel: <kaynak>" yazar; yüklenemezse kendi çizimimiz kalır. Öncelik: kurum ve mekânın kendi afişi, sonra bilet sitesi. Aynı görsel 4'ten fazla farklı etkinlikte geçiyorsa site logosu sayılır, gösterilmez. Instagram görsellerinde (`social.mjs`) etkinliğin herkese açık afişi değiştirilmeden ve kaynağıyla kullanılır (kullanıcı kararı, 13.11.2026). Afiş kaldırma talebi 24 saat içinde `blocklist.txt` ile yerine getirilir. Sanatçı fotoğrafı ayrıca aranmaz; yalnızca etkinliğin kendi sayfasındaki görsel kullanılır.
  - Etkinlik tanımını olgulardan kendimiz kurarız: `app.js` ve `build-pages.mjs` içindeki `descOf()`.
  - Organizatörün kendi gönderdiği metin (elle eklenen, `manual`) gösterilebilir.
- **Başkasının metnini başka kelimelerle yeniden yazma.** Bu da "işleme" sayılır. Olgulardan bağımsız cümle kur.
- **Açık kimlik ve robots.txt.**
  - Toplayıcı kendini `NeVarNeYokBot` diye tanıtır (`lib/net.mjs`).
  - Her sitenin robots.txt kuralına ve Crawl-delay değerine uyar.
  - Otomasyonu gizleyen ayarlar ve bot korumasını aşan yöntemler eklenmez.
- **Kaldırma talebi.**
  - Gelen talepler `data/blocklist.txt` dosyasına bir satır olarak eklenir; biçimler: `site:`, `mekan:`, `etkinlik:`, `duzenleyen:`. Bir sonraki taramada içerik siteden kalkar.
  - Talep en geç 48 saat içinde yerine getirilir.
  - İletişim adresi: contact.openmind.vision@gmail.com (`NVNY_SITE.contact`).
- **İddialar.**
  - "Bütün etkinlikler", "en ucuz" gibi doğrulanamayan iddialar kullanılmaz. Slogan: "Ankara'nın etkinliklerine göz at."
  - Site reklam ve komisyon almaz. Para kazanma eklenecekse önce bir avukata danışılmalı.
- **Kaynak önceliği.** Kamu kurumları, mekânların kendi siteleri ve organizatörün kendi gönderdiği etkinlikler önce gelir. Ticari bilet siteleri öncelikle "Bilet al" bağlantısı olarak kullanılır. Uygulama: `run.mjs` birleştirmeden önce kaynakları `kurum → mekan → toplayici → bilet` sırasına dizer; ad, saat ve mekân ilk gelenden alınır, bilet siteleri bağlantı ve fiyat ekler.


## 3. Marka ve tasarım kararları (kullanıcının onayladıkları)
- **Logo:** "NE VAR NE YOK" beyaz. YOK'taki O, **canlı cam mercek** (C tasarımı). Sapı nar rengi `#FF3B6B`. Camın rengi zaman dilimine göre değişir (`--g1..3`, `data-period`). **Soru işareti yok.** Sap yanında nokta yok.
- **Dört tema:** Sabah, Gün, Gün batımı, Gece.
  - Otomatik mod güneşin Ankara'daki konumuna göre seçer (`themeSun`). Sabah ve Gün açık sayfa, Gün batımı ve Gece koyu sayfa.
  - Ayarlar panelinden elle seçilebilir (`nvny-tema`). Giriş ekranı, mercek ve sayfa her zaman aynı temada olmalı.
- **Gökyüzü ve silüet:** Hero'daki tuval çizimi (`buildLayer`) kullanılır.
  - Anıtkabir diğer yapılarla aynı renkte, sarı değil. Şehir ekran boyunca geniş.
  - Sayfada **tek** Türk bayrağı var; sağdaki Ankara Kalesi'nin burcunda dalgalanır.
  - Işın, deniz ya da yansıma yok.
  - ANKARA yazısı beyaz ve parıltısız.
  - Gece ayı o günün gerçek evresiyle çizilir.
- **Bilet kartları:** Biletler **dikey cam kartlardır** (`card()`). "İncele" kartı büyütüp yatay bilete (`ticket()`) çevirir. "Geri dön" kartı yerine indirir (`openTicket` / `closeTicket`).
- **Afiş önce (kullanıcı kararı, 12.11.2026):** Kartın, biletin ve ayrıntı sayfasının görsel alanını afiş **tamamen** kaplar (`.vc-ph` 830/1200). Oranı farklı afiş kırpılmaz, sığdırılır (`pst-fit`); oran sınıftan okunur, düzen ölçülmez (`pstWire`). Afişin üstünde sembol, tarih, rozet ya da damga yok: tarih ve hava afişin altındaki satırdadır (`.vc-when`), rozetler `.vc-bd`. Eski kategori sembolleri kaldırıldı, geri getirme. Afişi olmayan etkinlikte kategori renginde yazı afişi çıkar (`tposHTML`, `lang="tr"`). Toplayıcı, afişi eksik etkinliği aynı ad (ve mekân) ile afişi olan kayıttan tamamlar; hâlâ eksikse etkinliğin kendi bilet sayfasındaki paylaşım görselini (og:image) okur (tam taramada 220, tazelemede 80 sayfa; bot korumalı sitelere girilmez; görseli olmayan sayfa 7 gün yeniden denenmez, `imgTried`). Kapsam denetimi afişsiz etkinlikleri kaynak kaynak raporlar (`afis`).
- **Kategori sahneleri:** Konser, tiyatro, stand-up, sahne, çocuk, festival, parti ve atölye seçilince listenin başında o alana özgü bir sahne çıkar (`STAGE`, `catStage`, `.cs-*`): bugün / bu hafta / mekân sayıları. Yalnızca `transform` ve `opacity` ile canlanır.
- **Kategori temaları:** Konser (neon, ses dalgası), tiyatro (kadife, altın sırma), stand-up (tuğla duvar), opera-bale-dans (fildişi, altın çizgi, zarif yazı), çocuk (konfeti), festival (bayrak süsü), parti (disko), atölye (çizgili defter). Kart `.vc.th.th-<kategori>`, bilet `.tkw.th`; renkler `--tb/--tx/--tm/--ta` değişkenleriyle. Desenler durağandır; afişin üstüne konmaz. Tekrarlanan ince çizgili desen ve bulanık gölge kullanma (kaydırmada takılma yapıyor).
- **Afiş duvarı:** "Afiş duvarı" düğmesi (`openWall`) seçili filtrelerdeki afişleri **gün gün** gösterir (afişler küçülmesin diye): gün sekmeleri, sağa-sola kaydırma ve ok tuşlarıyla gün değişir; telefonda iki sütun. Afişe dokununca bilet açılır. Sinema lobisi gibi her temada koyu.
- **Özel günler** (`sdayOf`, `sdayBanner`, `sdayDraw`): yılbaşı (ışık dizileri, kar, 31 Aralık gecesi havai fişek), 23 Nisan (uçurtmalar), 19 Mayıs, 30 Ağustos, 13 Ekim (Ankara'nın başkent oluşu), 29 Ekim (gece havai fişek), dini bayramlar (şerit), 18 Mart ve 10 Kasım (yalnızca sade anma şeridi, süs yok). Süsler gökyüzüyle dakikada bir çizilir. Dini bayram tarihleri yıllık elle eklenir (`R` tablosu). Deneme: `?gun=2026-12-31T22:00`.
- **Sinema (öncelikli bölüm):** Kategori çiplerinde "Sinema" en başta, film şeridi görünümlü (`.chip.cinec`). Seçilince sahne açılır: kırmızı kadife perde (yalnızca `transform` ile açılır), ışıklı tabela, perdede "Vizyonda", iki yanda üstünde NE VAR NE YOK logosu olan patlamış mısır kutuları (`#pop-box`). Altında gün sekmeleri, salon seçimi ve film kartları (`fcard`, film şeridi kenarlı koyu kart). "Seanslar" sinema biletini açar (`openFilm`): günler, salonlar, biçim ve saatler; geçmiş saatler soluk; koçanda mısır kutusu ve "Bilet al". Sinema kategorisindeki etkinliklerin kartı ve bileti de sinema temalıdır (`.vc.cine`, `.tkw.cine`). Ana listede "Bugün vizyonda" şeridi (`fRail`) ve aramada "Filmlerde" sonuçları vardır.
- **Üst çubuk ve kategoriler:** Arama çubuğunun yanında **Filtreler** ve **Ayarlar** düğmeleri durur. Kategoriler kendi renklerindedir. "★ Yoğun ilgi" altın renktedir.
- **Giriş ekranı:** "hoş geldinizzzz" yazısında ilk z beyaz, diğer z'ler nar rengi; yazı Bricolage, altı çizgisiz. "İlerle" düğmesi yok, dokun/tıkla ipucu var.
- **Marka kapsamı:** Marka yalnız Ankara'ya özgü değil, ileride başka şehirlere yayılacak.

## 4. Akıcılık kuralları (takılma, donma olmasın)
- Gökyüzü dakikada bir çizilir (`paintBg`). Her karede yalnızca küçük bayrak tuvali ve yağış varsa yağmur tuvali çizilir (`fxFrame`).
- Tuvalde `filter: blur` yok. Bulutlar düşük çözünürlüklü hazır görseldir.
- Kartlarda `backdrop-filter` yok; cam görünümü yarı saydam gradyanla verilir. `backdrop-filter` yalnızca küçük, sabit panellerde kullanılır.
- Kayan veya büyüyen her şey yalnızca `transform` ve `opacity` ile canlandırılır. SVG'nin **içindeki** parçaları canlandırma; dış `<svg>` ya da HTML öğesini canlandır. Bunlar ekran kartında çalışır.
- Kalıtılan renk değişkenlerine (`--sky*`, `--g*`) sürekli geçiş verme; yalnızca tema değiştirilirken (`html.tswitch`) geçiş olur.
- Kartlar parça parça eklenir (`render(sync)`). Arama gecikmeli çalışır.
- **Girişten sayfaya geçiş:** Giriş bitince bekleyen işler (`afterIntro`) sayfanın giriş canlandırmaları bittikten sonra, tarayıcı boşaldıkça teker teker çalışır. Hava verisi gelince kartlar yeniden kurulmaz; yalnızca hava rozetleri yerinde değişir (`wxRefresh`). Şehir katmanı yalnızca gece/gündüz düzeyi, tema ya da boyut değişince yeniden çizilir; `--sky*` değişkenleri yalnızca değer değişince yazılır.
- **Yeni bir animasyon eklemeden önce ve sonra ölç.**
  1. Siteyi `python3 -m http.server` ile yerelde aç.
  2. Playwright ile CPU'yu 4 kat yavaşlat (`Emulation.setCPUThrottlingRate`).
  3. 50 ms'yi aşan uzun görevleri ve 34 ms'yi aşan kareleri say.
  4. Giriş, sayfaya geçiş ve kaydırma sırasında sıfır hedeflenir.
