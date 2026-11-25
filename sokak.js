/* Sokak modu (25.11.2026, kullanıcı: "önizleme artık video şeklinde değil, Google Haritalar'daki sokak modu şeklinde olacak").
   1) Panoramax (açık, anahtarsız, CC BY-SA; api.panoramax.xyz): yerin ~150 m çevresindeki en yakın sokak fotoğrafı. 360° ise sürükleyerek
      etrafa bakılır (Three.js küresi; tarayıcı görseli WebGL'e vermezse kayan şerit), düz fotoğrafsa kaydırılır. Oklarla aynı çekim dizisinde
      ileri/geri yürünür; ekrandaki ok yerin yönünü gösterir. Fotoğrafçı, tarih ve lisans yazılır.
   2) Fotoğraf yoksa: kendi haritamızda yaya yüksekliğinde 3B sokak görünümü (bina verimizle), aynı kontroller: sürükle = bak, oklar = yürü.
      Hangisi olduğu açıkça yazılır ("Sokak fotoğrafı" / "3B model"). Video ya da kendiliğinden oynayan bir şey yoktur. */
(function (g) {
  "use strict";
  var API = "https://api.panoramax.xyz/api", UA = {};
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var R = Math.PI / 180, toD = function (r) { return r / R; };
  function dist(a, b) { var x = (b[1] - a[1]) * R * Math.cos((a[0] + b[0]) / 2 * R), y = (b[0] - a[0]) * R; return Math.sqrt(x * x + y * y) * 6371000; }
  function brg(a, b) { var y = Math.sin((b[1] - a[1]) * R) * Math.cos(b[0] * R), x = Math.cos(a[0] * R) * Math.sin(b[0] * R) - Math.sin(a[0] * R) * Math.cos(b[0] * R) * Math.cos((b[1] - a[1]) * R); return (toD(Math.atan2(y, x)) + 360) % 360; }
  function move(p, b, m) { var d = m / 6371000, a1 = p[0] * R, o1 = p[1] * R, t = b * R, a2 = Math.asin(Math.sin(a1) * Math.cos(d) + Math.cos(a1) * Math.sin(d) * Math.cos(t)), o2 = o1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(a1), Math.cos(d) - Math.sin(a1) * Math.sin(a2)); return [a2 / R, o2 / R]; }
  function jx(u, ms) { var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms || 8000); return fetch(u, { signal: c.signal }).then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; }).catch(function () { clearTimeout(t); return null; }); }
  var is360 = function (f) { var o = (f.properties || {})["pers:interior_orientation"] || {}; return +o.field_of_view >= 300 || /equirect/i.test(JSON.stringify((f.properties || {})["geovisio:type"] || "")); };
  var llOf = function (f) { var c = (f.geometry || {}).coordinates || [0, 0]; return [c[1], c[0]]; };
  var img = function (f) { var a = f.assets || {}; return (a.hd || a.sd || a.thumb || {}).href || ""; };
  var lic = function (f) { var p = f.properties || {}; return String(p.license || "CC-BY-SA-4.0").replace(/-/g, " ").replace(/ (\d)/, " $1").replace("CC BY SA", "CC BY-SA"); };
  var who = function (f) { var p = f.properties || {}; return p["geovisio:producer"] || (p.providers && p.providers[0] && p.providers[0].name) || ""; };
  var day = function (f) { var d = ((f.properties || {}).datetime || "").slice(0, 10).split("-"); return d.length === 3 ? d[2] + "." + d[1] + "." + d[0] : ""; };

  /* En yakın fotoğraf: önce 70 m, yoksa 160 m; 360° olan ve yere yakın olan önce */
  function find(ll) {
    var q = function (m) { var d = m / 111000, e = d / Math.cos(ll[0] * R); return jx(API + "/search?bbox=" + [ll[1] - e, ll[0] - d, ll[1] + e, ll[0] + d].map(function (x) { return x.toFixed(6); }).join(",") + "&limit=80"); };
    var pick = function (j) { var F = (j && j.features) || []; if (!F.length) return null; F.sort(function (a, b) { return (dist(ll, llOf(a)) - (is360(a) ? 25 : 0)) - (dist(ll, llOf(b)) - (is360(b) ? 25 : 0)); }); return F[0]; };
    return q(70).then(function (j) { return pick(j) || q(170).then(function (j2) { return pick(j2) || q(400).then(pick); }); });
  }
  function step(f, rel) { var L = (f.links || []).filter(function (l) { return l.rel === rel; })[0]; if (!L || !L.href) return Promise.resolve(null); return jx(L.href); }

  var CSS = ".skv{position:fixed;inset:0;z-index:140;background:#000;opacity:0;transition:opacity .3s ease;touch-action:none;color:#fff}.skv.on{opacity:1}.skv.m3{background:transparent;pointer-events:none}.skv.m3>*{pointer-events:auto}.skv-st{position:absolute;inset:0;overflow:hidden;cursor:grab}.skv-st:active{cursor:grabbing}.skv-st canvas{display:block;width:100%;height:100%}.skv-st.map{background:transparent}.skv-st.ld::after{content:\"\";position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:skr .9s linear infinite}@keyframes skr{to{transform:rotate(1turn)}}.skv-fl{position:absolute;left:50%;top:50%;height:100%;width:auto;max-width:none;translate:-50% -50%;transition:transform .08s linear;user-select:none;-webkit-user-drag:none}.skv-pn{position:absolute;inset:0;background-repeat:repeat-x;background-size:auto 100%}.skv-top{position:absolute;top:calc(env(safe-area-inset-top) + 12px);left:12px;right:12px;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:20px;background:rgba(20,20,28,.55);backdrop-filter:blur(18px) saturate(1.6);-webkit-backdrop-filter:blur(18px) saturate(1.6);border:1px solid rgba(255,255,255,.14)}.skv-x{flex:none;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font:700 16px var(--f,-apple-system,system-ui,sans-serif);border:0}.skv-t{min-width:0;display:flex;flex-direction:column}.skv-t b{font:800 16px var(--f,-apple-system,system-ui,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.skv-t small{font:500 12.5px var(--f,-apple-system,system-ui,sans-serif);color:rgba(235,235,245,.7)}.skv-to{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 86px);translate:-50% 0;display:flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:999px;background:rgba(139,92,246,.85);border:1px solid rgba(255,255,255,.3);font:700 13px var(--f,-apple-system,system-ui,sans-serif);cursor:pointer}.skv-to[hidden]{display:none}.skv-ar{display:inline-block;transition:transform .15s}.skv-bot{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 44px);translate:-50% 0;display:flex;align-items:center;gap:18px;padding:8px;border-radius:999px;background:rgba(20,20,28,.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.14)}.skv-b{width:54px;height:54px;border-radius:50%;border:0;background:#fff;color:#0a0a10;font:900 30px/1 var(--f,-apple-system,system-ui,sans-serif);transition:transform .2s var(--spring-s,ease)}.skv-b:active{transform:scale(.9)}.skv-b:disabled{opacity:.35}.skv-c{position:relative;width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(255,255,255,.4);display:grid;place-items:center}.skv-c i{position:absolute;inset:3px;border-radius:50%;background:conic-gradient(from -8deg,#ff453a 0 16deg,transparent 16deg)}.skv-c b{position:relative;font:800 11px var(--f,-apple-system,system-ui,sans-serif)}.skv-cr{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 12px);text-align:center;font:500 11px var(--f,-apple-system,system-ui,sans-serif);color:rgba(255,255,255,.7);padding:0 16px;margin:0;text-shadow:0 1px 3px #000}.skv-no{position:absolute;inset:0;display:grid;place-items:center;padding:40px;text-align:center;font:500 15px/1.5 var(--f,-apple-system,system-ui,sans-serif);color:rgba(235,235,245,.75)}.skv-ph{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 118px);translate:-50% 0;padding:10px 16px;border-radius:999px;border:0;background:#fff;color:#0a0a10;font:800 13.5px var(--f,-apple-system,system-ui,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.35);white-space:nowrap}.skv-pin{padding:6px 10px;border-radius:12px;background:#8b5cf6;color:#fff;font:800 13px var(--f,-apple-system,system-ui,sans-serif);box-shadow:0 6px 18px rgba(0,0,0,.4);white-space:nowrap}";
  var UI = function (name, sub) {
    if (!document.getElementById("skv-css")) { var stl = document.createElement("style"); stl.id = "skv-css"; stl.textContent = CSS; document.head.append(stl); }
    var el = document.createElement("div"); el.className = "skv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Sokak görünümü: " + name);
    el.innerHTML = '<div class="skv-st"></div><div class="skv-top"><button type="button" class="skv-x" aria-label="Kapat">✕</button><div class="skv-t"><b>' + esc(name) + '</b><small class="skv-s">' + esc(sub || "") + '</small></div></div>'
      + '<div class="skv-to" hidden><span class="skv-ar">➤</span><small></small></div>'
      + '<div class="skv-bot"><button type="button" class="skv-b" data-k="prev" aria-label="Geri yürü">‹</button><div class="skv-c" aria-hidden="true"><i></i><b>K</b></div><button type="button" class="skv-b" data-k="next" aria-label="İleri yürü">›</button></div>'
      + '<p class="skv-cr"></p>';
    document.body.append(el); requestAnimationFrame(function () { el.classList.add("on"); });
    return el;
  };

  /* ---------- 1) Fotoğraf görüntüleyici ---------- */
  function photo(el, f0, place, O) {
    var st = el.querySelector(".skv-st"), cur = null, H = 0, P = 0, fov = 75, T = null, ren = null, cam = null, mesh = null, sc = null, raf = 0, dead = false, flat = null;
    var setCr = function (f) { el.querySelector(".skv-cr").textContent = "Fotoğraf: " + (who(f) ? who(f) + " · " : "") + day(f) + " · " + lic(f) + " · Panoramax"; };
    var toPlace = function () { if (!cur) return; var p = llOf(cur), d = dist(p, place), b = brg(p, place), rel = ((b - H + 540) % 360) - 180, to = el.querySelector(".skv-to");
      to.hidden = d < 6; to.querySelector(".skv-ar").style.transform = "rotate(" + (rel - 90) + "deg)"; to.querySelector("small").textContent = Math.round(d) + " m · " + (O.name || "");
      el.querySelector(".skv-c i").style.transform = "rotate(" + (-H) + "deg)"; };
    var draw = function () { raf = 0; if (dead) return; if (ren && cur) { var az = +((cur.properties || {})["view:azimuth"] || 0), lon = 180 + (H - az), phi = (90 - P) * R, th = lon * R;
        cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(500 * Math.sin(phi) * Math.cos(th), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(th)); ren.render(sc, cam); }
      else if (flat && cur) { var az2 = +((cur.properties || {})["view:azimuth"] || 0), off = ((H - az2 + 540) % 360) - 180, z = 75 / fov;
        if (flat.w) { var pw = flat.pw * z; flat.style.backgroundSize = "auto " + (100 * z) + "%"; flat.style.backgroundPosition = (st.clientWidth / 2 - pw / 2 - off * pw / 360) + "px " + (50 + P * 0.4) + "%"; } // 360°: kesintisiz dönen şerit
        else flat.style.transform = "translateX(" + (-off * 6) + "px) scale(" + z + ")"; }
      toPlace(); };
    var req = function () { if (!raf) raf = requestAnimationFrame(draw); };
    var setup3 = function (THREE) { ren = new THREE.WebGLRenderer({ antialias: true }); ren.setPixelRatio(Math.min(2, g.devicePixelRatio || 1)); ren.setSize(st.clientWidth, st.clientHeight); st.append(ren.domElement);
      cam = new THREE.PerspectiveCamera(fov, st.clientWidth / st.clientHeight, 1, 1100); sc = new THREE.Scene(); var geo = new THREE.SphereGeometry(500, 60, 40); geo.scale(-1, 1, 1);
      mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x222222 })); sc.add(mesh); T = THREE; };
    var load = function (f) {
      cur = f; setCr(f); el.querySelector(".skv-s").textContent = (is360(f) ? "Sokak fotoğrafı · 360°" : "Sokak fotoğrafı") + (day(f) ? " · " + day(f) : "");
      var u = img(f); st.classList.add("ld");
      if (is360(f) && T) { new T.TextureLoader().setCrossOrigin("anonymous").load(u, function (tx) { if (dead) return; if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace; mesh.material.dispose(); mesh.material = new T.MeshBasicMaterial({ map: tx }); st.classList.remove("ld"); req(); },
        undefined, function () { // tarayıcı görseli WebGL'e vermedi: kayan şerit
          ren.domElement.remove(); ren.dispose(); ren = null; showFlat(u, true); });
      } else showFlat(u, is360(f));
      req();
    };
    var showFlat = function (u, wide) {
      if (flat) flat.remove();
      if (wide) { flat = document.createElement("div"); flat.className = "skv-pn"; flat.w = 1; flat.pw = st.clientHeight * 2; st.append(flat);
        var im = new Image(); im.referrerPolicy = "no-referrer"; im.onload = function () { if (dead) return; flat.pw = st.clientHeight * im.naturalWidth / im.naturalHeight; flat.style.backgroundImage = "url('" + u.replace(/'/g, "%27") + "')"; st.classList.remove("ld"); req(); }; im.src = u; }
      else { flat = document.createElement("img"); flat.className = "skv-fl"; flat.alt = ""; flat.referrerPolicy = "no-referrer"; flat.onload = function () { st.classList.remove("ld"); }; flat.src = u; st.append(flat); } };
    // yer yönüne bak
    var face = function () { if (cur) { H = brg(llOf(cur), place); P = 0; } };
    // sürükle = bak; iki parmak / tekerlek = yakınlaş
    var pts = new Map(), last = null, pd = 0;
    st.addEventListener("pointerdown", function (e) { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; if (pts.size === 2) { var a = [...pts.values()]; pd = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); } });
    st.addEventListener("pointermove", function (e) { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { var a = [...pts.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (pd) fov = Math.max(30, Math.min(95, fov * pd / d)); pd = d; req(); return; }
      var k = 0.12 * fov / 75; H = (H - (e.clientX - last[0]) * k + 360) % 360; P = Math.max(-80, Math.min(80, P + (e.clientY - last[1]) * k)); last = [e.clientX, e.clientY]; req(); });
    var up = function (e) { pts.delete(e.pointerId); pd = 0; if (pts.size === 1) last = [...pts.values()][0]; };
    st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    st.addEventListener("wheel", function (e) { e.preventDefault(); fov = Math.max(30, Math.min(95, fov + e.deltaY * 0.05)); req(); }, { passive: false });
    var go = function (rel) { if (!cur) return; O.tick && O.tick(); st.classList.add("ld"); step(cur, rel).then(function (f) { if (dead) return; if (!f) { st.classList.remove("ld"); el.querySelector("[data-k=" + rel + "]").disabled = true; return; } var keepH = H; load(f); H = keepH; el.querySelectorAll(".skv-b").forEach(function (b) { b.disabled = false; }); req(); }); };
    el.querySelector("[data-k=next]").onclick = function () { go("next"); }; el.querySelector("[data-k=prev]").onclick = function () { go("prev"); };
    el.querySelector(".skv-to").onclick = function () { face(); req(); };
    var rs = function () { if (ren) { ren.setSize(st.clientWidth, st.clientHeight); cam.aspect = st.clientWidth / st.clientHeight; cam.updateProjectionMatrix(); } req(); };
    addEventListener("resize", rs);
    var start = function (THREE) { if (THREE) setup3(THREE); load(f0); face(); req(); };
    (O.three ? O.three().then(start, function () { start(null); }) : start(null));
    return function () { dead = true; removeEventListener("resize", rs); if (ren) { ren.dispose(); mesh && mesh.material && mesh.material.map && mesh.material.map.dispose(); } };
  }

  /* ---------- 2) 3B sokak (fotoğraf yoksa): kendi haritamızda yaya yüksekliği ---------- */
  function model(el, map, place, O) {
    var st = el.querySelector(".skv-st"); st.classList.add("map"); el.classList.add("m3");
    el.querySelector(".skv-s").textContent = "3B model · bu yerin sokak fotoğrafı henüz yok";
    el.querySelector(".skv-cr").textContent = "Binalar: OpenStreetMap katkıcıları · GlobalBuildingAtlas · cepheler temsilîdir";
    var prev = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }, mp = map.getMaxPitch ? map.getMaxPitch() : 60;
    try { map.setMaxPitch(85); } catch (e) {}
    var pos = move(place, 200, 45), H = brg(pos, place), dead = false; // yerin 45 m güneybatısından yere bakarak başla
    var cam = function (ms) { map.easeTo({ center: [pos[1], pos[0]], zoom: 18.9, pitch: 82, bearing: H, duration: ms || 0 }); upd(); };
    var upd = function () { var d = dist(pos, place), rel = ((brg(pos, place) - H + 540) % 360) - 180, to = el.querySelector(".skv-to"); to.hidden = d < 8; to.querySelector(".skv-ar").style.transform = "rotate(" + (rel - 90) + "deg)"; to.querySelector("small").textContent = Math.round(d) + " m · " + (O.name || ""); el.querySelector(".skv-c i").style.transform = "rotate(" + (-H) + "deg)"; };
    var mk = new O.maplibregl.Marker({ element: (function () { var d = document.createElement("div"); d.className = "skv-pin"; d.innerHTML = "<b>" + esc(O.name || "") + "</b>"; return d; })(), anchor: "bottom" }).setLngLat([place[1], place[0]]).addTo(map);
    cam(1300);
    var last = null;
    st.addEventListener("pointerdown", function (e) { st.setPointerCapture(e.pointerId); last = [e.clientX, e.clientY]; });
    st.addEventListener("pointermove", function (e) { if (!last) return; H = (H - (e.clientX - last[0]) * 0.18 + 360) % 360; last = [e.clientX, e.clientY]; map.jumpTo({ bearing: H }); upd(); });
    var up = function () { last = null; }; st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    var walk = function (m) { O.tick && O.tick(); pos = move(pos, H, m); cam(650); };
    el.querySelector("[data-k=next]").onclick = function () { walk(18); }; el.querySelector("[data-k=prev]").onclick = function () { walk(-18); };
    el.querySelector(".skv-to").onclick = function () { H = brg(pos, place); cam(600); };
    return function () { if (dead) return; dead = true; mk.remove(); try { map.setMaxPitch(mp); } catch (e) {} map.easeTo(Object.assign({}, prev, { duration: 900 })); };
  }

  /* open({ lat, lng, name, map, maplibregl, three, tick }) */
  g.NVSK = { open: function (O) {
    var place = [+O.lat, +O.lng], el = UI(O.name || "Seçilen yer", "Sokak görünümü aranıyor…"), stop = null, closed = false;
    var close = function () { if (closed) return; closed = true; O.tick && O.tick(); stop && stop(); el.classList.remove("on"); setTimeout(function () { el.remove(); }, 320); O.onClose && O.onClose(); };
    el.querySelector(".skv-x").onclick = close; addEventListener("keydown", function k(e) { if (e.key === "Escape") { removeEventListener("keydown", k); close(); } });
    find(place).then(function (f) { if (closed) return;
      var fd = f ? dist(place, llOf(f)) : 1e9;
      if (fd < 170 || (f && !O.map)) stop = photo(el, f, place, O);
      else if (O.map) { stop = model(el, O.map, place, O); if (f) { // yakında gerçek fotoğraf var: tek dokunuşla geç
        var b = document.createElement("button"); b.type = "button"; b.className = "skv-ph"; b.textContent = "📷 En yakın sokak fotoğrafı " + Math.round(fd) + " m ötede · Aç"; el.append(b);
        b.onclick = function () { b.remove(); stop && stop(); el.classList.remove("m3"); var st = el.querySelector(".skv-st"); st.className = "skv-st"; st.replaceWith(st.cloneNode(false)); stop = photo(el, f, place, O); }; } }
      else { el.querySelector(".skv-s").textContent = "Bu yerin sokak fotoğrafı henüz yok"; el.querySelector(".skv-st").innerHTML = '<p class="skv-no">Panoramax\'ta bu yerin çevresinde açık lisanslı sokak fotoğrafı yok. Haritada açınca 3B sokak modeliyle gezebilirsin.</p>'; }
    });
    return close;
  }, find: find };
})(window);
