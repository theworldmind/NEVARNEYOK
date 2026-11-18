/* Beraber: yer daveti ortak kodu (uygulama, davet sayfası ve yayında görsel üretimi aynı dosyayı kullanır).
   Sunucu yok: davetin bilgisi bağlantının # kısmında taşınır, sunucuya gitmez. */
(function (g) {
  var u8 = function (s) { return new TextEncoder().encode(s); }, str = function (b) { return new TextDecoder().decode(b); };
  function pack(o) { var b = u8(JSON.stringify(o)), s = ""; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unpack(t) { try { var s = atob(String(t).replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/")), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); var o = JSON.parse(str(b)); return o && typeof o === "object" ? o : null; } catch (e) { return null; } }
  // bağlantıyla gelen yazı: düz, kısa, bağlantı içermez (sitemizin adıyla kötü içerik gösterilemesin)
  function clean(s, n) { return String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/https?:\/\/\S+|www\.\S+|\b\S+\.(com|net|org|tr|io|me|ly)\b\S*/gi, "").replace(/\s+/g, " ").trim().slice(0, n || 70); }
  var T = {
    kafe: { l: "Kafe", e: "☕", p: "Kafede buluşalım mı?", c: ["Burada oturalım mı?", "Burada buluşalım mı?", "Biraz sohbet edelim mi?", "Burası nasıl, gidelim mi?"] },
    yemek: { l: "Restoran", e: "🍽️", p: "Yemeğe gidelim mi?", c: ["Burada bir şeyler yiyelim mi?", "Yemeğe burada buluşalım mı?", "Burayı deneyelim mi?", "Burası nasıl, gidelim mi?"] },
    bar: { l: "Mekân", e: "🥂", p: "Akşam çıkalım mı?", c: ["Akşam burada buluşalım mı?", "Burası nasıl, gidelim mi?", "Burada görüşelim mi?"] },
    park: { l: "Park", e: "🌳", p: "Parkta buluşalım mı?", c: ["Burada biraz yürüyelim mi?", "Parkta buluşalım mı?", "Hava güzelse burada görüşelim mi?", "Biraz nefes alalım mı?"] },
    muze: { l: "Müze", e: "🏛️", p: "Beraber gezelim mi?", c: ["Burayı beraber gezelim mi?", "Buraya gidelim mi?", "Burayı görmek ister misin?"] },
    sahne: { l: "Sahne", e: "🎭", p: "Beraber gidelim mi?", c: ["Burada buluşalım mı?", "Buraya gidelim mi?", "Burası nasıl, gidelim mi?"] },
    avm: { l: "AVM", e: "🛍️", p: "AVM'de buluşalım mı?", c: ["Burada buluşalım mı?", "Biraz gezelim mi?", "Burada görüşelim mi?"] },
    gezi: { l: "Gezilecek yer", e: "📸", p: "Buraya gidelim mi?", c: ["Burayı beraber gezelim mi?", "Buraya gidelim mi?", "Burayı görmek ister misin?"] },
    spor: { l: "Spor", e: "🏃", p: "Beraber gidelim mi?", c: ["Burada buluşalım mı?", "Beraber gidelim mi?", "Biraz hareket edelim mi?"] },
    sinema: { l: "Sinema", e: "🎬", p: "Filme gidelim mi?", c: ["Bu filme beraber gidelim mi?", "Bu seansa gidelim mi?", "Film izleyelim mi?"] },
    yer: { l: "Yer", e: "📍", p: "Beraber gidelim mi?", c: ["Beraber gidelim mi?", "Burada buluşalım mı?", "Buraya gidelim mi?", "Burası nasıl, gidelim mi?"] },
    ozel: { l: "Buluşma", e: "✉️", p: "Beraber gidelim mi?", c: ["Burada buluşalım mı?", "Beraber gidelim mi?"] }
  };
  function typeOf(s) { var x = String(s || "").toLocaleLowerCase("tr");
    return /cafe|kafe|coffee|kahve|tea_|çay|pastane|bakery|fırın|dondurma|ice_cream/.test(x) ? "kafe" : /restoran|restaurant|fast_food|yemek|food|kebab|pizza|burger|lokanta|bistro/.test(x) ? "yemek" : /\bbar\b|pub|nightclub|gece/.test(x) ? "bar" : /park|garden|bahçe|bahce/.test(x) ? "park" : /museum|müze|muze|gallery|galeri/.test(x) ? "muze" : /theatre|tiyatro|arts_centre|sahne|kültür|kultur|konser|music_venue|cinema|sinema/.test(x) ? (/cinema|sinema/.test(x) ? "sinema" : "sahne") : /mall|avm|alışveriş/.test(x) ? "avm" : /attraction|monument|castle|memorial|historic|anıt|kale|gezi|viewpoint/.test(x) ? "gezi" : /sport|spor|stadium|fitness|gym/.test(x) ? "spor" : "yer"; }
  // 3B görünüm: koyu ama çevresi okunur; özne en parlak (kullanıcı, 18.11.2026: "çevre derinlik katıyor")
  function mapStyle(j) { var road = function (l) { return l["source-layer"] === "transportation"; };
    j.layers = j.layers.filter(function (l) { return ["symbol", "raster"].indexOf(l.type) < 0 && l["source-layer"] !== "boundary" && l.id !== "building"; }).map(function (l) { var P = l.paint = Object.assign({}, l.paint || {}), id = l.id;
      if (l.type === "background") P["background-color"] = "#191924";
      else if (l.type === "fill") { P["fill-color"] = /water/.test(id) ? "#1b3552" : /park|wood|grass|landcover/.test(id) ? "#1f3a2d" : "#1c1c28"; P["fill-opacity"] = 1; delete P["fill-pattern"]; delete P["fill-outline-color"]; }
      else if (l.type === "line") { P["line-color"] = /water/.test(id) ? "#1b3552" : road(l) ? (/casing/.test(id) ? "#14141d" : /motorway|trunk|primary/.test(id) ? "#74748c" : /path|track|pedestrian|service/.test(id) ? "#44445a" : "#5a5a70") : "#26263a"; delete P["line-pattern"]; }
      else if (l.type === "fill-extrusion") { P["fill-extrusion-color"] = ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 3, "#474758", 18, "#565669", 60, "#6b6b80"]; P["fill-extrusion-opacity"] = 1; P["fill-extrusion-vertical-gradient"] = true; }
      return l; });
    j.light = { anchor: "viewport", color: "#ffffff", intensity: .42, position: [1.2, 205, 38] }; return j; }
  function rings(gm) { return gm && gm.type === "Polygon" ? [gm.coordinates] : gm && gm.type === "MultiPolygon" ? gm.coordinates : []; }
  function inR(p, R) { var k = false; for (var i = 0, n = R.length - 1; i < R.length; n = i++) { var a = R[i][0], b = R[i][1], x = R[n][0], y = R[n][1]; if ((b > p[1]) !== (y > p[1]) && p[0] < ((x - a) * (p[1] - b)) / (y - b) + a) k = !k; } return k; }
  function cen(R) { var a = 0, b = 0; R.forEach(function (q) { a += q[0]; b += q[1]; }); return [a / R.length, b / R.length]; }
  function bounds(ml, A, c) { var B = new ml.LngLatBounds(c, c); A.forEach(function (P) { P[0].forEach(function (q) { B.extend(q); }); }); return B; }
  var PITCH = 58, BEAR = -24;
  function camera(m, ml, gm, c, pad) { var A = rings(gm); if (A.length) { var B = bounds(ml, A, A[0][0][0]), cm = m.cameraForBounds(B, { padding: pad || { top: 150, bottom: 350, left: 110, right: 110 }, pitch: PITCH, bearing: BEAR }); return { center: cm.center, zoom: Math.max(15, Math.min(17.4, cm.zoom)), pitch: PITCH, bearing: BEAR }; } return { center: c, zoom: 17.2, pitch: PITCH, bearing: BEAR }; }
  // özneyi boyar: alanın kendisi + içindeki/üstündeki bina. Dönen: iğnenin konacağı nokta ve özne yüksekliği
  function focus(m, ml, gm, c) { var A = rings(gm), area = A.length > 0, inA = function (p) { return A.some(function (P) { return inR(p, P[0]); }); }, B = area ? bounds(ml, A, A[0][0][0]) : null, ctr = area ? B.getCenter().toArray() : c, big = area && (B.getNorth() - B.getSouth() > .0009 || B.getEast() - B.getWest() > .0012);
    var F = m.querySourceFeatures("openmaptiles", { sourceLayer: "building" }), Parts = []; F.forEach(function (f) { (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(function (P) { Parts.push({ c: P, p: f.properties }); }); });
    var H = Parts.filter(function (x) { var Q = x.c[0]; return area ? Q.filter(inA).length / Q.length >= .5 || inR(ctr, Q) : inR(c, Q); }), bl = (m.getStyle().layers.filter(function (l) { return l.type === "fill-extrusion"; })[0] || {}).id;
    var grow = function (x) { var o = cen(x.c[0]); return { type: "Polygon", coordinates: x.c.map(function (Q) { return Q.map(function (q) { return [o[0] + (q[0] - o[0]) * 1.02, o[1] + (q[1] - o[1]) * 1.02]; }); }) }; };
    if (area) { m.addSource("nvs", { type: "geojson", data: gm }); m.addLayer({ id: "nvsf", type: "fill", source: "nvs", paint: { "fill-color": "#fff", "fill-opacity": big ? .13 : .3 } }, bl); m.addLayer({ id: "nvsl", type: "line", source: "nvs", paint: { "line-color": "#fff", "line-width": 2.4, "line-opacity": .92 } }, bl); }
    var SF = H.length ? H.map(function (x) { return { type: "Feature", geometry: grow(x), properties: { h: (+x.p.render_height || 10) + .4, b: +x.p.render_min_height || 0 } }; }) : area && !big ? [{ type: "Feature", geometry: gm, properties: { h: 12, b: 0 } }] : [];
    if (SF.length) { m.addSource("nvh", { type: "geojson", data: { type: "FeatureCollection", features: SF } }); m.addLayer({ id: "nvhb", type: "fill-extrusion", source: "nvh", paint: { "fill-extrusion-color": "#f6f5fc", "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": ["get", "b"], "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": false } }); }
    var main = H.length && !big ? H.slice().sort(function (a, b) { return (+b.p.render_height || 0) - (+a.p.render_height || 0); })[0] : null; return { pc: main ? cen(main.c[0]) : ctr, top: main ? +main.p.render_height || 10 : SF.length ? 12 : 0, subject: H.length, big: !!big, buildings: F.length }; }
  g.NVB = { pack: pack, unpack: unpack, clean: clean, T: T, typeOf: typeOf, mapStyle: mapStyle, camera: camera, focus: focus, MLV: "4.7.1", STYLE: "https://tiles.openfreemap.org/styles/liberty" };
})(typeof window !== "undefined" ? window : globalThis);
