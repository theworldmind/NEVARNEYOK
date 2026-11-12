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
| `scraper/social.mjs` | Günün Instagram görselleri (`paylas/` ve `sosyal` dalında `YYYY-AA-GG/`). Site yerelde açılıp temayla (`nvny-tema`) ve sitedeki `ticket()` ile yatay bilet olarak çizilir; fiyat kutusu ve açıklama gizlenir. Günde iki tek görselli 4:5 gönderi (`<set>-1.png`, sayfada 7-8 bilet): "Bugün Ankara'da" (10:00, Gün) ve "Bu akşam Ankara'da" (15:00, Gün batımı; birinci setteki etkinlikler tekrar edilmez). Hikâyede aynı görsel paylaşılır, ayrı hikâye görseli üretilmez. Metricool'a günlük zamanlanmış görev planlar. Elle yeniden üretmek için `social.yml`. |
| `scraper/audit.mjs` | **Kapsam denetimi: "neyi kaçırıyoruz?"** Her tam taramadan sonra çalışır. Kendi verisini son 14 taramayla karşılaştırır (kaynak, kategori, gün ve mekân bazında düşüş ya da boşluk). Kesilen listeleri yakalar ("daha fazla" sınırı). Haber akışlarında (Google Haberler, AA, TRT) Ankara etkinlik adlarını arar ve bizde olmayanları listeler. 3+ taramadır boş kaynaklara kendiliğinden keşif (`probe.mjs`) yapar. Geçmiş `data/coverage.json` dosyasında tutulur. Rapor GitHub'da **"Kapsam raporu"** konusuna yazılır. **Kullanıcının fark ettiği bir eksik, önce bu denetime bir kural olarak eklenir, sonra düzeltilir;** aynı tür eksik bir daha kullanıcıya kalmaz. |
| `data/health.json` | Kaynak sağlığı. `data/manual.csv` elle eklenen etkinlikleri, `data/venues.json` mekânları tutar. |

Bozulmaması gereken kurallar:
- **Fiyat kuralı:** Bir fiyat yalnızca toplayıcı onu satış sitesinde son 36 saat içinde doğruladıysa (`priceFresh`, `PRICE_MAX_H`) gösterilir. Tahmini ya da başka siteden kopyalanmış fiyat gösterilmez; doğrulanmamışsa "Fiyat sitede" / "fiyat sitede" yazar. Kullanıcı açıkça istemedikçe değiştirme.
- **Rozetler ve filtreler:** `isNew` ve `dropOf` rozetleri (Yeni / Fiyatı %… düştü) ve "Yeni eklenenler" filtresi kalır.
- **Site ayarları:** `window.NVNY_SITE` (iletişim, Instagram, repo) `index.html` içinde durur.
- **Service worker yok:** `app.js` eskilerini kaldırır. `sw.js` ekleme.
- **Giriş ekranı sırası:** `afterIntro()` / `introDone()` ile giriş ekranı bitene kadar ağır işler bekletilir.
- Bot korumalı sitelerin (Bubilet, Passo, Biletino, Mobilet) korumasını aşmaya çalışma. API anahtarı gerektiren hiçbir şey ekleme. Yasal ortaklık önerme.

## 2b. Hukuki kurallar (risk en aza indirildi; bozma)
- **Yalnızca olgular.** Kaynaklardan ad, tarih, saat, mekân, fiyat, satış durumu, süre, yaş, tür ve düzenleyen alınır.
  - **Tanıtım metni (`desc`), afiş ve görsel yayımlanmaz ve saklanmaz.** `run.mjs` içindeki `strip()` bunları siler. Metinden yalnızca süre ve yaş ayıklanır (`factsFrom`).
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
- **Yeni bir animasyon eklemeden önce ve sonra ölç.**
  1. Siteyi `python3 -m http.server` ile yerelde aç.
  2. Playwright ile CPU'yu 4 kat yavaşlat (`Emulation.setCPUThrottlingRate`).
  3. 50 ms'yi aşan uzun görevleri ve 34 ms'yi aşan kareleri say.
  4. Giriş, sayfaya geçiş ve kaydırma sırasında sıfır hedeflenir.
