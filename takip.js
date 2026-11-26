/* Takip ve bildirim ortak kodu: hem sayfa (app.js) hem service worker (sw.js) kullanır.
   Takip edilen etkinliklerin son bilinen hali yalnızca bu cihazda, IndexedDB'de saklanır; sunucu yok.
   Değişiklik bulunursa (iptal, erteleme, tükendi, yeniden satışta, tarih/saat/mekân değişikliği) ve
   etkinlikten bir gün önce / o gün hatırlatma bildirimi üretilir. */
var NV = (function () {
  var fold = function (s) { return String(s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/̇/g, "").replace(/['’‘`´]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/[^a-z0-9 ]+/g, " ").trim(); };
  var key = function (s) { return fold(s).replace(/\s+/g, ""); };
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var dLong = function (s) { var d = new Date(s + "T12:00:00"); return d.getDate() + " " + AY[d.getMonth()] + " " + GUN[d.getDay()]; };
  var today = function () { var p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return p.year + "-" + p.month + "-" + p.day; };
  var addD = function (s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  var ST = { iptal: "iptal edildi", ertelendi: "ertelendi", tukendi: "biletleri tükendi" };
  var STB = { iptal: "Kötü haber 😔 Bu etkinlik iptal edildi. Bilet iadesi için dokun, detaylar orada.", ertelendi: "Bu etkinlik ertelendi 🗓️ Yeni tarih çıkınca hemen yazarız.", tukendi: "Biletler tükendi 😮 Yeniden satışa çıkarsa ilk sana haber veririz." };

  /* --- küçük anahtar-değer deposu (IndexedDB) --- */
  function db() { return new Promise(function (res, rej) { var r = indexedDB.open("nvny", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function get(k) { return db().then(function (d) { return new Promise(function (res) { var t = d.transaction("kv").objectStore("kv").get(k); t.onsuccess = function () { res(t.result); }; t.onerror = function () { res(undefined); }; }); }).catch(function () { return undefined; }); }
  function set(k, v) { return db().then(function (d) { return new Promise(function (res) { var tx = d.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; }); }).catch(function () { return false; }); }

  /* Etkinliğin takip için saklanan hali */
  // En düşük doğrulanmış fiyat (fiyat kuralı: satış sitesinde son 36 saatte görülmüş) ve satan site
  function low(e) { var b = null; (e.tickets || []).forEach(function (x) { if (x.price && !x.est && x.seen && (Date.now() - Date.parse(x.seen)) / 36e5 <= 36 && (!b || x.price < b.price)) b = x; }); return b; }
  var TL = function (n) { return "₺" + Math.round(n).toLocaleString("tr-TR"); };
  function snap(e, slug) { var l = low(e); return { slug: slug, title: e.title, tk: key(e.title), vk: key(e.venue), venue: e.venue || "", d: e.d, t: e.t || "", status: e.status || "", cat: e.cat || "", img: e.img || "", p: l ? l.price : 0, at: Date.now() }; }

  /* Takip listesini güncel veriyle karşılaştır → { msgs, follows } */
  function check(follows, events, city) {
    var t0 = today(), t1 = addD(t0, 1), msgs = [], out = {};
    Object.keys(follows || {}).forEach(function (id) {
      var f = follows[id], e = null, best = 1e9;
      if (f.kind === "seans") { // takip edilen sinema seansı: yalnızca hatırlatma (film listesinde ayrı tutulur)
        if (f.d < t0) return; var su = "/#/" + (f.city || city || "ankara") + "/film/" + f.film + "?gun=" + f.d, sn = Object.assign({}, f);
        if (f.d === t1 && !f.r1) { msgs.push({ tag: "r-" + id, title: "Yarın sinema var 🍿 " + f.title, body: f.venue + ", saat " + f.t + ". Biletin hazır mı?", url: su }); sn.r1 = 1; }
        if (f.d === t0) { var nm2 = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }), dm2 = (+f.t.slice(0, 2) * 60 + +f.t.slice(3, 5)) - (+nm2.slice(0, 2) * 60 + +nm2.slice(3, 5));
          if (dm2 > 0 && dm2 <= 180 && !f.rh) { msgs.push({ tag: "h-" + id, title: "Film " + f.t + "'de başlıyor 🍿", body: f.title + " · " + f.venue + ". Mısırını kap, yola çık 🚀", url: su }); sn.rh = 1; sn.r0 = 1; }
          else if (!f.r0 && dm2 > 180) { msgs.push({ tag: "r-" + id, title: "Bugün sinema günü 🎬 " + f.title, body: f.venue + ", saat " + f.t + ". İyi seyirler!", url: su }); sn.r0 = 1; } }
        out[id] = sn; return;
      }
      if ((f.city || "ankara") !== (city || "ankara")) { out[id] = f; return; } // başka ildeki takip: o ilin verisiyle bakılır
      for (var i = 0; i < events.length; i++) {
        var x = events[i]; if (key(x.title) !== f.tk) continue;
        var dist = Math.abs(new Date(x.d) - new Date(f.d)) / 864e5 + (key(x.venue) === f.vk ? 0 : 3) + (x.d === f.d && (x.t || "") === f.t ? -1 : 0);
        if (dist < best) { best = dist; e = x; }
      }
      if (e && best > 45) e = null;
      var url = "/#/" + (f.city || city || "ankara") + "/e/" + encodeURIComponent(e ? e.slug || f.slug : f.slug), n = Object.assign({}, f);
      if (!e) {
        // etkinlikten bir gün sonra: tatlı bir "nasıldı?" (bir kez), sonra listeden çıkar
        if (f.d === addD(t0, -1) && f.status !== "iptal") msgs.push({ tag: "a-" + id, title: "Dün nasıldı? 🌟", body: f.title + " umarız güzel geçmiştir. Puanını ve birkaç sözünü bırakmak ister misin?", url: "/#/" + (f.city || city || "ankara") + "/e/" + encodeURIComponent(f.slug) + "?degerlendir=1&b=" + encodeURIComponent(f.title || "") + "&g=" + (f.d || "") + "&s=" + encodeURIComponent(f.t || "") + "&m=" + encodeURIComponent(f.venue || "") + "&k=" + encodeURIComponent(f.cat || "") + "&i=" + encodeURIComponent(f.img || "") });
        if (f.d < t0) return; // geçmiş: listeden çıkar
        if (!f.gone) { msgs.push({ tag: "x-" + id, title: f.title, body: "Bu etkinliği artık listede bulamıyoruz 🤔 İptal olmuş ya da satıştan kalkmış olabilir, bilet sitesine bir bakıver.", url: url }); n.gone = 1; }
        out[id] = n; return;
      }
      n.gone = 0; if (e.slug) n.slug = e.slug;
      var st = e.status || "";
      if (st !== f.status) {
        if (ST[st]) msgs.push({ tag: "s-" + id, title: f.title, body: STB[st], url: url });
        else if (f.status === "tukendi") msgs.push({ tag: "y-" + id, title: "Müjde! 🎉 " + f.title, body: "Biletler yeniden satışta. Bu sefer kaçırma, dokun ve yerini ayır!", url: url });
      }
      if (st !== "iptal" && st !== "ertelendi") {
        if (e.d !== f.d) msgs.push({ tag: "d-" + id, title: f.title, body: "Tarih değişti 🗓️ Yeni tarih " + dLong(e.d) + (e.t ? ", saat " + e.t : "") + " (önceden " + dLong(f.d) + " idi). Takvimini güncellemeyi unutma!", url: url });
        else if ((e.t || "") !== f.t && e.t && f.t) msgs.push({ tag: "t-" + id, title: f.title, body: "Saat değişti ⏰ Yeni saat " + e.t + " (önceden " + f.t + " idi).", url: url });
        if (key(e.venue) !== f.vk && e.venue && f.venue) msgs.push({ tag: "v-" + id, title: f.title, body: "Mekân değişti 📍 Yeni yeri: " + e.venue + ". Yol tarifi için dokun.", url: url });
        var t3 = addD(t0, 3), t7 = addD(t0, 7), at = [e.venue, e.t && "saat " + e.t].filter(Boolean).join(", ");
        if (e.d === t7 && !f.r7) { msgs.push({ tag: "r-" + id, title: "Geri sayım başladı ⏳ " + e.title, body: "Tam bir hafta kaldı! " + dLong(e.d) + (at ? ", " + at : "") + ". Takvimine yazdın mı?", url: url }); n.r7 = 1; }
        if (e.d === t3 && !f.r3) { msgs.push({ tag: "r-" + id, title: "3 gün kaldı 🎈 " + e.title, body: dLong(e.d) + (at ? ", " + at : "") + ". Heyecan şimdiden başladı mı?", url: url }); n.r3 = 1; }
        if (e.d === t0 && e.t && !f.rh) { var nowM = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }), dm = (+e.t.slice(0, 2) * 60 + +e.t.slice(3, 5)) - (+nowM.slice(0, 2) * 60 + +nowM.slice(3, 5));
          if (dm > 0 && dm <= 180) { msgs.push({ tag: "h-" + id, title: "Az kaldı! ⏳ " + e.title, body: (dm < 60 ? dm + " dakika" : Math.round(dm / 60) + " saat") + " sonra başlıyor" + (e.venue ? ", " + e.venue : "") + ". Yola çıkma vakti 🚀", url: url }); n.rh = 1; n.r0 = 1; } }
        if (e.d === t1 && !f.r1) { msgs.push({ tag: "r-" + id, title: "Yarın büyük gün ✨ " + e.title, body: [e.venue, e.t && "saat " + e.t].filter(Boolean).join(", ") + ". Biletin hazır mı?", url: url }); n.r1 = 1; }
        if (e.d === t0 && !f.r0 && !n.r0) { msgs.push({ tag: "r-" + id, title: "Bugün görüşüyoruz 🎉 " + e.title, body: [e.venue, e.t && "saat " + e.t].filter(Boolean).join(", ") + ". Şimdiden iyi eğlenceler!", url: url }); n.r0 = 1; }
      }
      // Fiyat düştüyse haber ver (kullanıcı isteği, 15.11.2026: fiyat karşılaştırmasında en iyisi olalım): en az %3 ya da ₺25
      var l = low(e);
      if (l && st !== "iptal" && st !== "ertelendi" && st !== "tukendi") {
        if (f.p && l.price < f.p && (f.p - l.price >= 25 || l.price <= f.p * .97)) msgs.push({ tag: "p-" + id, title: "Fiyatı düştü 💸 " + f.title, body: "Artık " + TL(l.price) + " (önceden " + TL(f.p) + ") · " + l.site + ". Tam zamanı!", url: url });
        n.p = l.price;
      }
      n.d = e.d; n.t = e.t || ""; n.venue = e.venue || ""; n.vk = key(e.venue); n.status = st;
      if (n.d < t0) return;
      out[id] = n;
    });
    return { msgs: msgs, follows: out };
  }

  /* Gün içinde bildirimler (kullanıcı isteği, 16.11.2026 12:11: "arada bildirim göndersin, gün içinde"): her gün beş dilim, her dilimde en çok bir.
     21:30–09:00 arası sessiz. İlgi alanı varsa etkinlik önerisi ona göre. `last` = { d: gün, s: [gönderilen dilimler] }. Ne zaman uyanacağına telefon karar verir (Android). */
  /* Sinemada indirimli günler (26.11.2026, kullanıcı: "halk günleri, indirimler; o günlerde bildir"): data/sinema-indirim.json (zincirin kendi sayfasından, sinema-indirim.mjs).
     names: ildeki salon adları (zincir o ilde yoksa gösterilmez). Kayıt 7 günden eskiyse yok sayılır; fiyat yalnızca 36 saat içinde doğrulandıysa. */
  function indirim(sd, names, d) {
    if (!sd || !sd.zincir) return []; var wd = new Date(d + "T12:00:00").getDay(), out = [], now = Date.now();
    sd.zincir.forEach(function (z) { var age = now - Date.parse(z.dogrulandi); if (!(age >= 0 && age <= 7 * 864e5)) return;
      var re = new RegExp(z.re, "i"); if (names && !names.some(function (n) { return re.test(n); })) return;
      (z.kampanya || []).forEach(function (k) { if (k.gun.indexOf(wd) >= 0 && (!k.bitis || k.bitis >= d)) out.push({ ad: k.ad, zincir: z.ad, id: z.id, re: z.re, url: z.url, tatil: !!k.tatil, fiyat: age <= 36 * 36e5 && k.fiyat ? k.fiyat : null }); }); });
    return out;
  }
  function digest(events, prefs, last, city, disc) {
    var t0 = today(), d = new Date(t0 + "T12:00:00").getDay(), hm = new Date().toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false });
    /* günde beş dilim (17.11.2026 02:19, kullanıcı: "bildirim sayısı az"): sabah, kuşluk, öğle, akşamüstü, gece */
    var slot = hm >= "09:00" && hm < "11:00" ? "sabah" : hm >= "11:00" && hm < "13:00" ? "kusluk" : hm >= "13:00" && hm < "16:00" ? "ogle" : hm >= "16:00" && hm < "19:00" ? "aksam" : hm >= "19:00" && hm < "21:30" ? "gece" : null; if (!slot) return null;
    var L0 = last && typeof last === "object" && last.d === t0 ? last.s || [] : []; if (L0.indexOf(slot) >= 0) return null;
    /* (18.11.2026 11:45, kullanıcı: "gün içinde yaklaşık 5 bildirim; illa etkinlik önermene gerek yok, insanlara iyi şeyler söyle: günün güzel geçsin, umutsuz olma")
       Her dilimde güzel bir söz gider; etkinlik verisi olmasa da gider. Sayı yazılmaz, kahve sözü yok. Etkinlik yalnızca arada bir: öğle iki günde bir, kuşluk ve gece üç günde bir. */
    events = events || []; var ok = function (e) { return e.status !== "iptal" && e.status !== "ertelendi" && e.status !== "tukendi"; }, cats = prefs && prefs.cats && prefs.cats.length ? prefs.cats : null;
    var home = "/#/" + (city || "ankara"), base = home + "/kesfet", dn = Math.round(Date.parse(t0 + "T12:00:00Z") / 864e5);
    var out = function (o) { o.tag = "digest"; o.slot = slot; o.url = o.url || home; return o; }, say = function (A) { var x = A[dn % A.length]; return out({ title: x[0], body: x[1] }); };
    var ev = function (e) { return e.title + (e.t ? " · " + e.t : "") + (e.venue ? " · " + e.venue : ""); }, mine = function (L) { var M = cats ? L.filter(function (e) { return cats.indexOf(e.cat) >= 0; }) : []; return M.length ? M : L; };
    var T = events.filter(function (e) { return e.d === t0 && ok(e) && e.img && (!e.t || e.t >= hm); });
    /* Sözler (19.11.2026, kullanıcı: "Hafta sonu kokusu geldi, biraz daha dayan iyi bir bildirim değil; daha mantıklı olsun"):
       günün saatine ve haftanın gününe uyan, sade ve doğal cümleler; abartı, zorlama espri, "dayan" gibi sıkıntı ima eden söz yok. */
    var we = d === 0 || d === 6;
    if (slot === "sabah" && we) return say([["Günaydın ☀️", "Bugün kendine güzel bir plan yap."], ["İyi hafta sonları 🌤️", "Acele yok, güne yavaş başla."], ["Günaydın 🌿", "Bugün nereye gitsen sana iyi gelir. Fikir lazımsa buradayız."]]);
    if (slot === "sabah") return say([["Günaydın ☀️", "Bugün güzel geçsin. Akşam için bir planın yoksa biz buradayız."], ["Günaydın 🌤️", "Yeni bir gün başladı. Kendine iyi bak."], ["Güzel bir gün dileriz 🌿", "Sakin başla, acele etme."], ["Günaydın 👋", "Bugün şehirde neler olduğunu merak edersen bir dokunuş yeter."], ["Günaydın 🌞", "Güne iyi başlaman dileğiyle."], ["Yeni gün, yeni plan 🗓️", "Bu akşam ne yapacağını henüz bilmiyorsan, birlikte bakarız."]]);
    var dz = function (L) { var by = {}; L.forEach(function (x) { (by[x.ad] = by[x.ad] || []).push(x.zincir); }); return Object.keys(by).map(function (a) { return by[a].filter(function (v, i, A) { return A.indexOf(v) === i; }).join(", ") + ": " + (a === "İndirimli bilet" ? "indirimli bilet" : a); }).join(" · "); };
    var dk = disc && disc.bugun && disc.bugun.length ? disc.bugun : null, dy = disc && disc.yarin && disc.yarin.length ? disc.yarin : null, sn = home + "/sinema";
    var dt = function (L, w) { var h = L.some(function (x) { return x.ad === "Halk Günü"; }) ? "Halk Günü" : L.some(function (x) { return x.ad === "Sinema Günü"; }) ? "Sinema Günü" : "indirimli gün"; return w + " sinemada " + h + " 🎬"; };
    if (slot === "kusluk" && dk) return out({ title: dt(dk, "Bugün"), body: dz(dk) + ". Seanslara göz at 🍿", url: sn });
    if (slot === "aksam" && dy) return out({ title: dt(dy, "Yarın"), body: dz(dy) + ". Film planı için güzel bir gün 🍿", url: sn + "?gun=" + addD(t0, 1) });
    if (slot === "kusluk") { if (dn % 3 === 0) { var Nw = mine(events.filter(function (e) { return e.d >= t0 && ok(e) && e.img && e.firstSeen && e.firstSeen.slice(0, 10) >= addD(t0, -2); })); if (Nw.length) { var f1 = Nw[dn % Nw.length]; return out({ title: "Yeni eklendi 🆕", body: f1.title + " · " + dLong(f1.d) + (f1.venue ? " · " + f1.venue : ""), image: f1.img, url: base + "?yeni=1" }); } }
      if (we) return say([["Güne nasıl başladın? 😊", "Hafta sonunun tadını çıkar."], ["Bugün için bir planın var mı? 🗓️", "Yoksa şehirde neler olduğuna bakmak bir dokunuş uzakta."], ["Keyifli bir gün dileriz 🌤️", "Bugün biraz da kendin için."]]);
      return say([["Kısa bir mola ver 🍃", "Biraz su iç, birkaç dakika kendine ayır."], ["Günün nasıl gidiyor? 😊", "Umarız her şey yolundadır."], ["Biraz nefes al 🌤️", "İşler bekleyebilir, iki dakikalık mola iyi gelir."], ["Selam 👋", "Günün güzel geçsin diye uğradık."], ["İyi çalışmalar 💪", "Öğlene az kaldı."]]); }
    if (slot === "ogle") { var C = mine(T.filter(function (e) { return !e.t || e.t >= "17:00"; })); if (dn % 2 === 0 && C.length) { var pick = C[dn % C.length]; return out({ title: "Bu akşam için bir fikir 🎟️", body: ev(pick), image: pick.img, url: base + "?t=bugun&q=" + encodeURIComponent(pick.title) }); }
      if (we) return say([["Güzel bir öğleden sonra 🌞", "Hava nasıl? Biraz dışarı çıkmak iyi gelebilir."], ["Günün nasıl geçiyor? 😊", "Umarız keyifli bir hafta sonu oluyor."], ["Öğleden sonra için bir fikir mi lazım? 🎟️", "Bugün neler olduğuna bir göz at."]]);
      return say([["Afiyet olsun 🍽️", "Öğle arasını iyi değerlendir."], ["Günün yarısı tamam 🌞", "Öğleden sonran da güzel geçsin."], ["Biraz hava al 🌳", "Kısa bir yürüyüş öğleden sonrayı kolaylaştırır."], ["Günün nasıl devam ediyor? 😊", "Umarız keyfin yerindedir."], ["Kendine zaman ayır 🌿", "Kısa bir mola bile fark yaratır."]]); }
    if (slot === "gece") { var hm2 = (function () { var p = hm.split(":"), m = +p[0] * 60 + +p[1] + 120; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); })(), S2 = mine(T.filter(function (e) { return e.t && e.t <= hm2; }));
      if (dn % 3 === 1 && S2.length) { var s1 = S2[dn % S2.length]; return out({ title: "Birazdan başlıyor 🎭", body: ev(s1), image: s1.img, url: base + "?t=bugun" }); }
      return say([["İyi akşamlar 🌙", "Günün yorgunluğunu at, biraz dinlen."], ["Günün nasıl geçti? 🌙", "Umarız güzel bir gündü."], ["Akşamın tadını çıkar ✨", "Bugünlük bu kadar yeter."], ["Dinlenme vakti 🌌", "Yarın için enerjini topla."], ["İyi geceler şimdiden 🌙", "Yarın yeni bir gün."]]); }
    // akşamüstü: haftanın gününe göre
    var wk = Math.floor(dn / 7), pickD = function (A) { var x = A[wk % A.length]; return out({ title: x[0], body: x[1], url: x[2] }); }, hs = base + "?t=haftasonu";
    if (d === 1) return pickD([["Pazartesi bitiyor 🌆", "Haftanın ilk günü geride kaldı. Akşamın rahat geçsin."], ["Haftaya iyi başladın 🌇", "Bu akşam biraz dinlen, hafta daha uzun."]]);
    if (d === 2) return pickD([["Salı akşamı 🌆", "Hafta içi de güzel bir akşam geçirebilirsin. Bu akşam neler var, bir bak.", base + "?t=bugun"], ["İyi akşamlar 🌇", "Yorucu bir gündüyse akşamı kendine ayır."]]);
    if (d === 3) return pickD([["Haftanın yarısı geride 🌗", "Bu akşam küçük bir mola iyi gelebilir."], ["Çarşamba akşamı 🌆", "Hafta ortası için bir konser ya da film fena olmaz.", base + "?t=bugun"]]);
    if (d === 4) return pickD([["Hafta sonu yaklaşıyor 🗓️", "Plan yapmak için güzel bir zaman. Hafta sonu neler var, bir göz at.", hs], ["Yarın cuma 🌆", "Hafta sonu için aklında bir şey var mı? Fikir lazımsa buradayız.", hs]]);
    if (d === 5) return pickD([["İyi hafta sonları 🎉", "Bu hafta da tamam. Akşamın keyifli geçsin.", base + "?t=bugun"], ["Cuma akşamı 🌆", "Bu akşam dışarı çıkmak istersen şehirde neler olduğunu biliyoruz.", base + "?t=bugun"]]);
    if (d === 6) return pickD([["Cumartesi akşamı 🌆", "Akşam daha yeni başlıyor. Keyfini çıkar.", base + "?t=bugun"], ["İyi cumartesiler 🎈", "Bu akşam için bir plan arıyorsan bakmaya değer.", base + "?t=bugun"]]);
    return pickD([["Pazar akşamı 🌇", "Yeni haftaya dinlenmiş başla. Akşamın sakin geçsin."], ["İyi pazarlar 🌆", "Haftanın son akşamını kendine ayır."]]);
  }
  /* Yeni tarihlerini takip et (sanatçı, oyun, gösteri; kullanıcı isteği, 15.11.2026): etkinliğin adından anahtar ("Duman Konseri" → "duman",
     "Cem Eren Öztürk - Erte" → "cem eren ozturk"). 81 ilin dizini idx/a.json (share-pages.mjs): anahtar → [[il, gün, saat, ad, mekân]].
     Takipten sonra eklenen her yeni tarih "satışa çıktı" bildirimi olur (her ilde). */
  function akey(t) { var x = String(t || "").split(/\s[-|–:]\s/)[0].replace(/\([^)]*\)/g, " "); return fold(x).replace(/\b(konseri|konserleri|konser|canli|live|akustik|ozel|turnesi|tour|20\d\d)\b/g, " ").replace(/\s+/g, " ").trim(); }
  function ahits(fk, idx) { var L = (idx[fk] || []).slice(); if (fk.length >= 6) for (var k in idx) if (k !== fk && k.indexOf(fk + " ") === 0) L = L.concat(idx[k]); return L; }
  var CN = null;
  function watchA(arts, idx, names) {
    var t0 = today(), msgs = [], out = {};
    Object.keys(arts || {}).forEach(function (k) {
      var a = Object.assign({}, arts[k]), seen = {}; (a.seen || []).forEach(function (s) { seen[s] = 1; });
      var L = ahits(k, idx).filter(function (x) { return x[1] >= t0; }), nw = L.filter(function (x) { return !seen[x[0] + "/" + x[3]]; });
      if (a.seen && nw.length) { var x = nw.sort(function (p, q) { return p[1] < q[1] ? -1 : 1; })[0], cn = (names && names[x[0]]) || x[0];
        msgs.push({ tag: "k-" + k, title: "🎤 " + a.name + ": yeni tarih!", body: (nw.length > 1 ? nw.length + " yeni tarih eklendi. İlki " : "") + cn + " · " + dLong(x[1]) + (x[2] ? " · " + x[2] : "") + (x[4] ? " · " + x[4] : "") + ". Biletler satışta 🎟️", url: "/#/" + x[0] + "/e/" + encodeURIComponent(x[3]) }); }
      a.seen = L.map(function (x) { return x[0] + "/" + x[3]; }); out[k] = a;
    });
    return { msgs: msgs, arts: out };
  }
  /* Filmi takip et: film şehrine gelince / seansları açılınca (yakında vizyona girecek filmler dahil) */
  function watchF(fl, films, city, cityName) {
    var t0 = today(), msgs = [], out = {};
    Object.keys(fl || {}).forEach(function (id) { var f = Object.assign({}, fl[id]); if ((f.city || "ankara") !== city) { out[id] = f; return; }
      var m = null; for (var i = 0; i < films.length; i++) if (String(films[i].id) === String(id) || key(films[i].title) === f.tk) { m = films[i]; break; }
      var has = !!(m && m.s && Object.keys(m.s).some(function (d) { return d >= t0 && m.s[d] && m.s[d].length; }));
      if (has && !f.had) msgs.push({ tag: "f-" + id, title: "🍿 " + f.title + " vizyonda!", body: (cityName ? cityName + "'da " : "") + "seanslar açıldı, biletler satışta 🎟️ Saatlere bakmak için dokun.", url: "/#/" + city + "/film/" + (m ? m.id : id) });
      f.had = has; out[id] = f; });
    return { msgs: msgs, films: out };
  }
  /* Ayarlar → Bildirimler (kullanıcı isteği, 15.11.2026 23:46): kişi her türü ayrı ayrı kapatabilir. cfg: { off: true } hepsini kapatır,
     { fiyat: false } yalnızca o türü. Tür, bildirimin etiketinin önekinden anlaşılır. */
  var NK = { s: "degisiklik", d: "degisiklik", t: "degisiklik", v: "degisiklik", x: "degisiklik", r: "hatirlatma", h: "azkaldi", a: "nasildi", p: "fiyat", digest: "oneri", mekan: "mekan", y: "satis", k: "sanatci", f: "film", g: "yolacik", n: "koltuk" };
  function allow(m, cfg) { if (!cfg) return true; if (cfg.off) return false; var tg = String(m && m.tag || ""), p = tg === "digest" ? "digest" : tg.split("-")[0], k = NK[p]; return !k || cfg[k] !== false; }
  /* Kısa paylaşım kodu (16.11.2026): /e/<kod> paylaşım, /d/<kod> davet. Uygulama, sw ve yayındaki sayfa üretici aynı kodu üretir (cyrb53 → 7 karakter). */
  function scode(city, slug) { var str = city + "|" + slug, h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, ch;
    for (i = 0; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var n = 4294967296 * (2097151 & h2) + (h1 >>> 0), B = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", out = ""; for (i = 0; i < 7; i++) { out += B[n % 62]; n = Math.floor(n / 62); } return out; }
  return { scode: scode, fold: fold, key: key, get: get, set: set, snap: snap, check: check, digest: digest, indirim: indirim, today: today, allow: allow, NK: NK, akey: akey, ahits: ahits, watchA: watchA, watchF: watchF };
})();
