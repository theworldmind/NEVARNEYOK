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
  function snap(e, slug) { var l = low(e); return { slug: slug, title: e.title, tk: key(e.title), vk: key(e.venue), venue: e.venue || "", d: e.d, t: e.t || "", status: e.status || "", cat: e.cat || "", p: l ? l.price : 0, at: Date.now() }; }

  /* Takip listesini güncel veriyle karşılaştır → { msgs, follows } */
  function check(follows, events, city) {
    var t0 = today(), t1 = addD(t0, 1), msgs = [], out = {};
    Object.keys(follows || {}).forEach(function (id) {
      var f = follows[id], e = null, best = 1e9;
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
        if (f.d === addD(t0, -1) && f.status !== "iptal") msgs.push({ tag: "a-" + id, title: "Dün nasıldı? 🌟", body: f.title + " umarız harikaydı! Bir sonraki plan için benzerlerine göz atmak ister misin?", url: "/#/" + (f.city || city || "ankara") + "/kesfet" + (f.cat ? "?k=" + f.cat : "") });
        if (f.d < t0) return; // geçmiş: listeden çıkar
        if (!f.gone) { msgs.push({ tag: "x-" + id, title: f.title, body: "Bu etkinliği artık listede bulamıyoruz 🤔 İptal olmuş ya da satıştan kalkmış olabilir, bilet sitesine bir bakıver.", url: url }); n.gone = 1; }
        out[id] = n; return;
      }
      n.gone = 0; if (e.slug) n.slug = e.slug;
      var st = e.status || "";
      if (st !== f.status) {
        if (ST[st]) msgs.push({ tag: "s-" + id, title: f.title, body: STB[st], url: url });
        else if (f.status === "tukendi") msgs.push({ tag: "s-" + id, title: "Müjde! 🎉 " + f.title, body: "Biletler yeniden satışta. Bu sefer kaçırma, dokun ve yerini ayır!", url: url });
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

  /* Haftanın her günü en çok bir tatlı öneri (kullanıcı isteği, 15.11.2026: "bildirim sayımız az olmasın, samimi ve cana yakın olsun").
     Pazartesi haftanın planı, Çarşamba bu akşam, Perşembe-Cuma hafta sonu, Cumartesi bugün, Pazar pazar keyfi; ilgi alanı varsa ona göre. */
  function digest(events, prefs, last, city, cityName) {
    var t0 = today(), d = new Date(t0 + "T12:00:00").getDay();
    if (last && new Date(last).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }) === t0) return null; // bugün zaten yazdık
    var ok = function (e) { return e.status !== "iptal" && e.status !== "ertelendi"; }, cats = prefs && prefs.cats && prefs.cats.length ? prefs.cats : null;
    var mineOf = function (L) { return cats ? L.filter(function (e) { return cats.indexOf(e.cat) >= 0; }).length : 0; };
    var nm = cityName ? (function (w) { var v = (w.toLocaleLowerCase("tr").match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ["a"])[0]; return w + "'" + (/[fsthçşkp]$/i.test(w) ? "t" : "d") + ("aıou".indexOf(v) >= 0 ? "a" : "e"); })(cityName) : "Şehrinde", base = "/#/" + (city || "ankara") + "/kesfet", n = function (x) { return x.toLocaleString("tr-TR"); };
    var range = function (a, b) { return events.filter(function (e) { return e.d >= a && e.d <= b && ok(e); }); };
    if (d === 1) { var W = range(t0, addD(t0, 6)), m1 = mineOf(W); if (!W.length) return null;
      return { tag: "digest", title: "Yeni hafta, yeni planlar 🗓️", body: nm + " bu hafta " + n(W.length) + " etkinlik var" + (m1 ? "; " + m1 + " tanesi tam senin tarzın 😍" : ". Takvimini şimdiden doldur!"), url: base + "?t=hafta" + (m1 ? "&sira=sen" : "") }; }
    if (d === 3) { var T = range(t0, t0), m3 = mineOf(T); if (!T.length) return null;
      return { tag: "digest", title: "Hafta ortası molası ☕", body: "Bu akşam " + nm + " " + n(T.length) + " etkinlik var" + (m3 ? ", " + m3 + " tanesi sana göre." : ".") + " Haftanın yorgunluğunu atmaya ne dersin? 🌙", url: base + "?t=bugun" + (m3 ? "&sira=sen" : "") }; }
    if (d === 4 || d === 5) { var fri = addD(t0, (5 - d + 7) % 7), L = range(fri, addD(fri, 2)), m5 = mineOf(L); if (!L.length) return null;
      return { tag: "digest", title: "Hafta sonu planın hazır mı? 🌟", body: nm + " bu hafta sonu " + n(L.length) + " etkinlik var" + (m5 ? "; " + m5 + " tanesi tam sana göre ✨" : ". Bir göz atmak için dokun."), url: base + "?t=haftasonu" + (m5 ? "&sira=sen" : "") }; }
    if (d === 6) { var S = range(t0, t0), m6 = mineOf(S); if (!S.length) return null;
      return { tag: "digest", title: "Bugün ne yapsak? ☀️", body: "Cumartesi keyfi için " + nm + " bugün " + n(S.length) + " etkinlik var" + (m6 ? ", " + m6 + " tanesi tam senlik 🎯" : "") + ". Hadi bir bak!", url: base + "?t=bugun" + (m6 ? "&sira=sen" : "") }; }
    if (d === 0) { var P = range(t0, t0), kids = prefs && prefs.kids, mk = kids ? P.filter(function (e) { return e.cat === "cocuk"; }).length : 0; if (!P.length) return null;
      return { tag: "digest", title: "Pazar keyfi 🎈", body: (mk ? "Aileyle gidebileceğin " + mk + " etkinlik dahil, " : "") + nm + " bugün " + n(P.length) + " etkinlik var. Güzel bir pazar geçir! 💜", url: base + "?t=bugun" + (mk ? "&c=cocuk" : "") }; }
    return null; // salı: dinlen 🙂
  }
  return { fold: fold, key: key, get: get, set: set, snap: snap, check: check, digest: digest, today: today };
})();
