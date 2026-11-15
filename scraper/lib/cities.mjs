// TÜRKİYE'NİN 81 İLİ: kimlik (adreslerde ve dosya adlarında), görünen ad ve etkinliğin o ilde olduğunu anlamak için kalıp.
// Büyük şehirlerde ilçe ve bilinen semt/mekân adları da kalıba eklenir (bilet siteleri çoğu zaman yalnızca semt yazar).
const IL = "Adana Adıyaman Afyonkarahisar Ağrı Aksaray Amasya Ankara Antalya Ardahan Artvin Aydın Balıkesir Bartın Batman Bayburt Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Düzce Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Iğdır Isparta İstanbul İzmir Kahramanmaraş Karabük Karaman Kars Kastamonu Kayseri Kırıkkale Kırklareli Kırşehir Kilis Kocaeli Konya Kütahya Malatya Manisa Mardin Mersin Muğla Muş Nevşehir Niğde Ordu Osmaniye Rize Sakarya Samsun Siirt Sinop Sivas Şanlıurfa Şırnak Tekirdağ Tokat Trabzon Tunceli Uşak Van Yalova Yozgat Zonguldak".split(" ");
export const fold = (s) => String(s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a");
export const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, "");
// ilçe / semt / bilinen mekân (katlanmış yazımla)
const EXTRA = {
  istanbul: "kadikoy besiktas sisli beyoglu uskudar bakirkoy sariyer atasehir maltepe kartal pendik umraniye beylikduzu esenyurt avcilar bahcelievler zeytinburnu fatih eyup kagithane levent maslak harbiye taksim nisantasi bostanci caddebostan florya bomontiada zorlu volkswagen_arena cemal_resit_rey uniq kucukciftlik parkorman",
  izmir: "konak karsiyaka bornova alsancak buca cigli bayrakli gaziemir balcova narlidere guzelbahce urla cesme seferihisar torbali menemen ahmed_adnan_saygun kulturpark",
  antalya: "muratpasa konyaalti kepez alanya manavgat kalkan belek aspendos",
  bursa: "nilufer osmangazi yildirim mudanya inegol gemlik merinos",
  eskisehir: "tepebasi odunpazari",
  adana: "seyhan cukurova yuregir ceyhan",
  konya: "selcuklu meram karatay",
  gaziantep: "sahinbey sehitkamil",
  mersin: "yenisehir mezitli toroslar tarsus silifke erdemli",
  kocaeli: "izmit gebze golcuk derince korfez kartepe",
  kayseri: "melikgazi kocasinan talas",
  samsun: "atakum ilkadim canik",
  mugla: "bodrum fethiye marmaris datca dalaman milas ortaca koycegiz gocek turgutreis",
  aydin: "kusadasi didim efeler soke nazilli",
  tekirdag: "corlu suleymanpasa cerkezkoy",
  sakarya: "adapazari serdivan",
  hatay: "antakya iskenderun",
  balikesir: "ayvalik edremit bandirma",
  canakkale: "assos bozcaada gokceada",
  nevsehir: "kapadokya urgup goreme avanos",
  denizli: "pamukkale merkezefendi",
};
const PATTERN = (id, name) => new RegExp("\\b(" + [fold(name), ...(EXTRA[id] || "").split(" ").filter(Boolean).map((w) => w.replace(/_/g, " "))]
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
export const CITIES = IL.map((name) => { const id = slug(name); return { id, name, re: PATTERN(id, name) }; });
export const cityById = (id) => CITIES.find((c) => c.id === id) || CITIES.find((c) => c.id === "ankara");
// metnin geçtiği ili bul (ilk eşleşen; il adı ilçe adından önce gelir)
export function cityOfText(s) {
  const f = fold(s);
  for (const c of CITIES) if (new RegExp("\\b" + fold(c.name) + "\\b").test(f)) return c.id;
  for (const c of CITIES) if (EXTRA[c.id] && c.re.test(f)) return c.id;
  return "";
}
