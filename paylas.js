/* NE VAR NE YOK · paylaşım görselleri (kullanıcı isteği, 15.11.2026: "paylaşımlar güzel olsun, hikâyede afiş olmazsa olmaz, Apple kalitesinde").
   Tek kod iki yerde çalışır: telefonda (app.js "Hikâyende paylaş") ve yayında (scraper/share-pages.mjs, afişini telefona vermeyen siteler için
   görseli önceden hazırlar). Afiş DEĞİŞTİRİLMEZ: kırpılmadan, oranıyla, köşeleri yuvarlatılmış çerçevede ve altında "Görsel: <kaynak>".
   NVS.story(ev) → 1080×1920 hikâye, NVS.card(ev) → 1200×630 bağlantı önizlemesi (afişi olmayan etkinlik için).
   ev: { title, when, venue, city, cat, img, imgBy, base } (base: sitenin kökü, logo için) */
var NVS = (function () {
  var COL = { konser: "#8b5cf6", tiyatro: "#e0446a", standup: "#f59e0b", sahne: "#d4a373", cocuk: "#22c55e", festival: "#06b6d4", parti: "#ec4899", atolye: "#84cc16", sinema: "#ef4444" };
  var fontsP = null;
  function fonts() {
    if (fontsP) return fontsP;
    fontsP = Promise.all([document.fonts.load('900 80px "Archivo", "Arial Narrow", sans-serif').catch(function () {}), document.fonts.load('600 40px "Inter Tight"').catch(function () {})]).then(function () { return true; });
    return fontsP;
  }
  function img(src, cors) { return new Promise(function (ok, no) { var i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.referrerPolicy = "no-referrer"; i.decoding = "async"; i.onload = function () { ok(i); }; i.onerror = no; i.src = src; }); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, maxW, maxL) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) { var t = cur ? cur + " " + words[i] : words[i]; if (c.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = words[i]; } }
    if (cur) lines.push(cur);
    if (lines.length > maxL) { lines = lines.slice(0, maxL); var l = lines[maxL - 1]; while (c.measureText(l + "…").width > maxW && l.length > 1) l = l.slice(0, -1); lines[maxL - 1] = l.replace(/\s+$/, "") + "…"; }
    return lines;
  }
  // ucuz ve her tarayıcıda çalışan bulanıklık: küçük çiz, büyüt (Safari'de canvas filter yok)
  function wash(c, im, W, H, dark) {
    var s = document.createElement("canvas"), k = 28; s.width = Math.max(2, Math.round(W / k)); s.height = Math.max(2, Math.round(H / k));
    var sc = s.getContext("2d"), r = Math.max(s.width / im.width, s.height / im.height), w = im.width * r, h = im.height * r; sc.drawImage(im, (s.width - w) / 2, (s.height - h) / 2, w, h);
    var s2 = document.createElement("canvas"); s2.width = Math.max(2, s.width >> 1); s2.height = Math.max(2, s.height >> 1); s2.getContext("2d").drawImage(s, 0, 0, s2.width, s2.height);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(s2, -W * .08, -H * .08, W * 1.16, H * 1.16);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(10,10,16," + dark[0] + ")"); g.addColorStop(.5, "rgba(10,10,16," + dark[1] + ")"); g.addColorStop(1, "rgba(10,10,16," + dark[2] + ")"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function glow(c, W, H, col, x, y, r, a) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function pill(c, x, y, text, font, bg, fg, padX, h, align) {
    c.font = font; var w = c.measureText(text).width + padX * 2, x0 = align === "c" ? x - w / 2 : x;
    rr(c, x0, y, w, h, h / 2); c.fillStyle = bg; c.fill(); c.fillStyle = fg; c.textBaseline = "middle"; c.textAlign = "left"; c.fillText(text, x0 + padX, y + h / 2 + 1); return w;
  }
  var CATN = { konser: "KONSER", tiyatro: "TİYATRO", standup: "STAND-UP", sahne: "OPERA · BALE · DANS", cocuk: "ÇOCUK & AİLE", festival: "FESTİVAL", parti: "PARTİ", atolye: "ATÖLYE & SÖYLEŞİ", sinema: "SİNEMA" };
  function up(s) { return String(s || "").toLocaleUpperCase("tr"); }
  /* Hikâye 1080×1920: üstte logo, ortada afiş (değiştirilmeden), altta ad, tarih, mekân; Instagram'ın üst/alt alanları (250 px) boş */
  function story(ev, poster) {
    var W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d"), col = COL[ev.cat] || "#8b5cf6";
    return Promise.all([fonts(), img((ev.base || "") + "brand/logo-cam.png").catch(function () { return null; })]).then(function (r) {
      var logo = r[1]; c.fillStyle = "#0a0a10"; c.fillRect(0, 0, W, H);
      if (poster) wash(c, poster, W, H, [.55, .62, .9]); else { glow(c, W, H, col, W * .2, H * .2, W * 1.1, .55); glow(c, W, H, "#8b5cf6", W * .9, H * .75, W, .35); }
      if (logo) { var lw = 250, lh = lw * logo.height / logo.width; c.drawImage(logo, (W - lw) / 2, 262, lw, lh); }
      var top = 430, fs = 92, tl, lh2, textH, ph = 0, pw = 0;
      c.fillStyle = "#fff";
      // metin bloğunu ölç; afiş kalan alana sığdırılır (kırpılmaz), sığmazsa yazı biraz küçülür
      for (var tries = 0; tries < 4; tries++) {
        c.font = '900 ' + fs + 'px "Archivo", "Arial Narrow", sans-serif'; try { c.fontStretch = "condensed"; } catch (e) {}
        tl = wrap(c, up(ev.title), W - 150, 3); lh2 = Math.round(fs * .96);
        c.font = '500 34px "Inter Tight", sans-serif'; var vn = wrap(c, [ev.venue, ev.cityName].filter(Boolean).join(" · "), W - 160, 2).length;
        textH = 76 + tl.length * lh2 + 18 + 54 + vn * 44;
        var avail = H - 250 - 96 - 40 - top - textH - 70;
        if (!poster) break;
        var ar = poster.height / poster.width; ph = Math.min(avail, 800 * ar, 1000); pw = ph / ar;
        if (ph >= 520 || fs <= 68) break; fs -= 8;
      }
      var y = top;
      if (poster) {
        var px = (W - pw) / 2; c.save(); c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 80; c.shadowOffsetY = 34; rr(c, px, y, pw, ph, 34); c.fillStyle = "#000"; c.fill(); c.restore();
        c.save(); rr(c, px, y, pw, ph, 34); c.clip(); c.drawImage(poster, px, y, pw, ph); c.restore();
        c.save(); rr(c, px + .5, y + .5, pw - 1, ph - 1, 34); c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 2; c.stroke(); c.restore();
        if (ev.imgBy) { c.font = '500 24px "Inter Tight", sans-serif'; c.fillStyle = "rgba(255,255,255,.55)"; c.textAlign = "right"; c.textBaseline = "top"; c.fillText("Görsel: " + ev.imgBy, px + pw, y + ph + 14); c.textAlign = "left"; }
        y += ph + 70;
      } else y = Math.max(y + 120, (H - 250 - 140 - textH + top) / 2);
      pill(c, W / 2, y, CATN[ev.cat] || "ETKİNLİK", '800 26px "Inter Tight", sans-serif', hexA(col, .9), "#fff", 24, 52, "c"); y += 76;
      c.font = '900 ' + fs + 'px "Archivo", "Arial Narrow", sans-serif'; try { c.fontStretch = "condensed"; } catch (e) {} c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "top";
      for (var i = 0; i < tl.length; i++) { c.fillText(tl[i], W / 2, y); y += lh2; }
      try { c.fontStretch = "normal"; } catch (e) {}
      y += 18; c.font = '700 40px "Inter Tight", sans-serif'; c.fillStyle = "#e9e3ff"; c.fillText(ev.when || "", W / 2, y); y += 54;
      c.font = '500 34px "Inter Tight", sans-serif'; c.fillStyle = "rgba(235,235,245,.72)"; var vl = wrap(c, [ev.venue, ev.cityName].filter(Boolean).join(" · "), W - 160, 2); for (var j = 0; j < vl.length; j++) { c.fillText(vl[j], W / 2, y); y += 44; }
      // alt: site adresi (Instagram'ın alt alanının üstünde)
      pill(c, W / 2, H - 250 - 96, "nevarneyok.net.tr", '800 32px "Inter Tight", sans-serif', "rgba(255,255,255,.95)", "#0a0a10", 34, 70, "c");
      return cv;
    });
  }
  /* Bağlantı önizlemesi 1200×630 (afişi olmayan etkinlik): sol tarafta büyük ad, sağda logo */
  function card(ev) {
    var W = 1200, H = 630, cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d"), col = COL[ev.cat] || "#8b5cf6";
    return Promise.all([fonts(), img((ev.base || "") + "brand/logo-cam.png").catch(function () { return null; })]).then(function (r) {
      c.fillStyle = "#0a0a10"; c.fillRect(0, 0, W, H); glow(c, W, H, col, 120, 80, 900, .6); glow(c, W, H, "#8b5cf6", 1150, 620, 700, .35);
      var y = 70; pill(c, 70, y, CATN[ev.cat] || "ETKİNLİK", '800 22px "Inter Tight", sans-serif', hexA(col, .9), "#fff", 20, 44, "l"); y += 74;
      c.font = '900 84px "Archivo", "Arial Narrow", sans-serif'; try { c.fontStretch = "condensed"; } catch (e) {} c.fillStyle = "#fff"; c.textAlign = "left"; c.textBaseline = "top";
      var tl = wrap(c, up(ev.title), 820, 3); for (var i = 0; i < tl.length; i++) { c.fillText(tl[i], 70, y); y += 82; } try { c.fontStretch = "normal"; } catch (e) {}
      y += 16; c.font = '700 34px "Inter Tight", sans-serif'; c.fillStyle = "#e9e3ff"; c.fillText(ev.when || "", 70, y); y += 48;
      c.font = '500 28px "Inter Tight", sans-serif'; c.fillStyle = "rgba(235,235,245,.72)"; c.fillText(wrap(c, [ev.venue, ev.cityName].filter(Boolean).join(" · "), 820, 1)[0] || "", 70, y);
      if (r[1]) { var lw = 220, lh = lw * r[1].height / r[1].width; c.drawImage(r[1], W - lw - 60, H - lh - 56, lw, lh); }
      return cv;
    });
  }
  return { story: story, card: card, img: img };
})();
