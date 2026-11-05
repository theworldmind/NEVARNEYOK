# Ne Var Ne Yok? Ankara

Ankara'daki konser, tiyatro, stand-up, opera-bale, çocuk etkinliği, festival, parti ve atölyeleri tek yerde toplayan site. Bilet sitelerinin fiyatları yan yana, etkinlik saatindeki hava tahminiyle.

Site kendi kendine güncellenir: GitHub her sabah 32 kaynağı tarar, veriyi birleştirir, siteyi yeniden yayınlar ve günün Instagram görsellerini hazırlar. Senin yapman gereken düzenli bir iş yok.

---

## Klasörde ne var

| Dosya / klasör | Ne işe yarar |
|---|---|
| `index.html` | Sitenin kendisi (görünüm). Üstündeki `NVNY_SITE` satırına iletişim bilgilerini yazacaksın. |
| `app.js` | Sitenin çalışan kodu (filtreler, gökyüzü, biletler, hava). |
| `data/events.json` | Etkinlik listesi. **Elle düzenlemene gerek yok**, sistem her gün yeniler. |
| `data/venues.json` | Mekânların adresleri, haritadaki yerleri ve farklı yazılışları. |
| `data/manual.csv` | Elle eklemek istediğin etkinlikler (aşağıda anlatılıyor). |
| `data/health.json` | Hangi kaynağın çalıştığını gösteren rapor (sistem yazar). |
| `scraper/` | Toplayıcı: kaynak listesi, tarama, birleştirme, sayfa ve görsel üretimi. |
| `scraper/sources/index.mjs` | **Taranan 32 kaynağın listesi.** Yeni kaynak buraya eklenir. |
| `.github/workflows/` | Zamanlayıcı: her sabah ve öğleden sonra kendiliğinden çalışan işler. |
| `icons/`, `assets/`, `manifest.webmanifest` | Simge, paylaşım görseli ve ek sayfaların stili. |

Her çalışmada ayrıca şunlar **üretilir** (depoya kaydedilmez, doğrudan yayına gider):
`etkinlik/…` (her etkinliğe ayrı sayfa), `mekan/…`, `kategori/…`, `bu-hafta-sonu/`, `bugun/`, `sitemap.xml`, `feed.xml` ve Instagram seti `paylas/`.

---

## Kurulum (bir kerelik, yaklaşık 15 dakika)

### 1. Depoyu aç
1. github.com'da oturum aç → sağ üstte **+** → **New repository**.
2. Ad: örneğin `nevarneyok`. **Public** (herkese açık) seç. Ücretsiz Actions dakikaları için bu önemli.
3. **Create repository**.

### 2. Dosyaları yükle
1. Yeni depoda **uploading an existing file** bağlantısına tıkla.
2. Bu klasörün **içindeki her şeyi** (`.github` klasörü dahil) sürükleyip bırak.
   - `.github` gizli bir klasördür; bilgisayarında görünmüyorsa gizli dosyaları göster (Mac: Finder'da `Cmd + Shift + .`).
3. Aşağıda **Commit changes**.

### 3. Yayını aç
1. Depoda **Settings → Pages**.
2. **Source** kısmında **GitHub Actions** seç. (Branch değil.)

### 4. İlk taramayı başlat
1. Depoda **Actions** sekmesi. "Workflows aren't being run…" uyarısı çıkarsa **I understand, enable them**.
2. Soldan **Etkinlikleri güncelle** → sağda **Run workflow** → **Run workflow**.
3. İlk çalışma 20–40 dakika sürebilir. Bitince site `https://KULLANICIADIN.github.io/nevarneyok/` adresinde yayında olur.

Bundan sonra her gün **06:30**'da tam tarama, **16:00**'da fiyat ve durum tazelemesi kendiliğinden yapılır.

### 5. İletişim ve Instagram bilgileri
`index.html` dosyasını GitHub'da aç → kalem simgesi → şu satırı bul ve doldur:

```js
window.NVNY_SITE={contact:"merhaba@ornek.com",instagram:"nevarneyokankara",repo:"KULLANICIADIN/nevarneyok"};
```

- `contact`: e-posta (boş bırakılabilir)
- `instagram`: kullanıcı adı, `@` olmadan
- `repo`: "Bize yaz" bağlantısı GitHub'daki öneri sayfasına gider

**Commit changes** de; site birkaç dakika içinde yeniden yayınlanır.

---

## Alan adı bağlama (isteğe bağlı)

1. Alan adını al (örneğin `nevarneyokankara.com.tr`).
2. GitHub'da **Settings → Pages → Custom domain** kutusuna alan adını yaz → **Save**.
3. Alan adını aldığın firmanın DNS panelinde:
   - `www` için **CNAME** kaydı → `KULLANICIADIN.github.io`
   - Çıplak alan adı (`@`) için **A** kayıtları: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
4. Birkaç saat içinde bağlanır. Sonra aynı sayfada **Enforce HTTPS** kutusunu işaretle.
5. **Settings → Secrets and variables → Actions → Variables** → **New repository variable**:
   - Ad: `SITE_URL`, değer: `https://nevarneyokankara.com.tr`

   Bu, Google için site haritasının ve Instagram görsellerindeki adresin doğru çıkmasını sağlar.

---

## Günlük kullanım

### Instagram paylaşımı
Her sabah sistem günün paylaşım setini hazırlar: **`siteadresin/paylas/`**

- Pazartesi: "Bu hafta Ankara'da"
- Perşembe ve Cuma: "Hafta sonu Ankara'da"
- Diğer günler: "Bugün Ankara'da" (bugün az etkinlik varsa "Yarın")
- Son iki günde 3'ten fazla yeni etkinlik eklendiyse ek olarak "Yeni satışa çıktı"

Her set için kare gönderi (1080×1350), dikey hikâye (1080×1920) ve etiketleriyle hazır açıklama metni var. Telefondan sayfayı aç → görseli indir → **Metni kopyala** → Instagram'da paylaş.

Bu sayfa arama motorlarına kapalıdır ama adresi bilen herkes açabilir; adresi yalnızca paylaşımı yapacak kişiye ver.

Paylaşımı başkası yapacaksa şifreni verme: Meta Business Suite'ten ona kendi hesabıyla yetki tanımla.

### Elle etkinlik ekleme, düzeltme, gizleme
Toplayıcının bulamadığı bir etkinlik (ör. kapıda ödemeli küçük bir konser) ya da yanlış toplanmış bir kayıt için iki yol var.

**Kolay yol — Google E-Tablolar:**
1. Yeni bir tablo aç, ilk satıra şu başlıkları yaz:
   `tarih, saat, baslik, mekan, kategori, aciklama, bilet_sitesi, bilet_linki, fiyat, durum, yas, sure, tur, not`
2. **Dosya → Paylaş → Web'de yayınla** → sayfayı seç, biçim **Virgülle ayrılmış değerler (.csv)** → **Yayınla** → çıkan bağlantıyı kopyala.
3. GitHub'da **Settings → Secrets and variables → Actions → Variables** → `SHEET_CSV_URL` adıyla bu bağlantıyı ekle.

Sistem her çalışmada tabloyu okur.

**Diğer yol:** `data/manual.csv` dosyasını GitHub'da düzenle (aynı sütunlar).

Sütunlar:
- `tarih`: `2026-11-21` ya da `21 Kasım 2026`
- `kategori`: konser, tiyatro, standup, opera, bale, cocuk, festival, parti, atolye, sinema
- `durum`:
  - boş bırakılabilir
  - `tukendi`, `ertelendi` ya da `iptal`
  - `gizle`: o tarihteki aynı adlı etkinliği siteden kaldırır. Yanlış toplanan bir kaydı silmek için kullanılır.

Aynı gün ve aynı adla girilen satır, toplanmış etkinliğin bilgilerini düzeltir; örneğin yanlış kategoriyi `kategori` sütunuyla değiştirebilirsin.

### Bir şey bozulursa
- **Kaynak sağlık raporu:** Bir kaynak iki gün üst üste veri getirmezse depoda bu başlıkla bir **Issue** açılır ve GitHub sana e-posta gönderir. Raporda hangi kaynağın kaç etkinlik getirdiği yazar. Kaynaklar düzelince konu kendiliğinden kapanır.
- **Site boşalmaz:** Bir kaynak bozulursa o kaynağın dünkü etkinlikleri korunur. Toplam sayı yarıdan fazla düşerse o günün verisi hiç yazılmaz.
- **Tarama tamamen çökerse:** Site dünkü veriyle yayında kalır.

---

## Kaynakları düzeltme ve ekleme

Kaynak listesi `scraper/sources/index.mjs` dosyasında. Her kaynak birkaç satırdır: liste sayfasının adresi, etkinlik bağlantılarını tanıyan kalıp, sayfa JavaScript ile yükleniyorsa `render: true`.

**Önemli:** Bu sürüm hazırlanırken bilet sitelerine bu ortamdan bağlanılamadı. Bu yüzden liste adreslerinin bir kısmı sitelerin bilinen yapısına göre tahmindir. İlk tam taramadan sonra sağlık raporu hangilerinin çalıştığını gösterecek.

Toplayıcı, sitelerin yapısı değişse de ayakta kalmak için üç yol dener:
1. Google için gömülen standart etkinlik verisi (schema.org)
2. Sayfanın arka planda çektiği veriler
3. Sayfadaki tarih, saat ve fiyat yazılarını okuma

Boş gelen bir kaynağı düzeltmek için:
1. **Actions** → son "Etkinlikleri güncelle" çalışması → en altta **debug-…** dosyasını indir. İçinde o kaynağın liste sayfası, sitenin o gün gösterdiği haliyle kaydedilmiştir.
2. `listings` adresini ya da `link` kalıbını düzelt.
3. Yalnızca o kaynağı denemek için **Run workflow** ekranındaki "Yalnızca bu kaynaklar" kutusuna kimliğini yaz (örneğin `bubilet`).

Bu sohbeti sürdürüyorsan debug dosyasını bana gönder; düzeltmeyi ben yazayım.

---

## Bilgisayarında denemek (isteğe bağlı)

Node.js 20 veya üstü gerekir.

```bash
cd scraper
npm install
npx playwright install chromium
node test/run-tests.mjs          # denemeler
node run.mjs --only=biletinial   # tek kaynakla tarama
node build-pages.mjs             # Google sayfaları
node social.mjs                  # Instagram görselleri
cd .. && python3 -m http.server  # siteyi http://localhost:8000 adresinde aç
```

`index.html` dosyasını çift tıklayarak açarsan etkinlikler yüklenmez; tarayıcılar yerel dosyadan veri okumaya izin vermez. Bunun için yukarıdaki yerel sunucuyu kullan.

---

## Maliyet

| Kalem | Maliyet |
|---|---|
| GitHub Pages ve GitHub Actions (herkese açık depo) | Ücretsiz |
| Hava durumu (Open-Meteo) | Ücretsiz |
| Alan adı | Yılda yaklaşık 360 TL (.com.tr) ile 1.150 TL (.com) arası |

**Not:** GitHub, 60 gün boyunca hiç hareket olmayan depolarda zamanlanmış işleri durdurabilir. Sistem her gün veri kaydettiği için normalde bu olmaz; olursa **Actions** sekmesinden yeniden etkinleştirmen yeterli.
