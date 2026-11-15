# NE VAR NE YOK logosunu (kullanıcının tasarımı, son hali 15.11.2026: düz mor cam, düz koyu zemin) vektöre çevirir.
# Ayrıca brand/mark.svg: yalnızca büyüteç (uygulama simgesi).
# Yazı: Inter Display Black, %107 genişlik, sıkı aralık; YOK'taki O: beyaz halka + beyaz sap + mor cam küre.
# Çıktılar: brand/logo.svg (tek parça), brand/logo.js (sitelerde parça parça kullanılan HTML: NVLOGO(id)).
# Çalıştırma: python3 brand/make-logo.py  (fontTools ve sistemdeki InterDisplay-Black.otf gerekir)
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
import json, os
H = os.path.dirname(os.path.abspath(__file__))
f = TTFont("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf")
gs = f.getGlyphSet(); cmap = f.getBestCmap(); S = 100 / f['OS/2'].sCapHeight; SX = 1.07
def glyph(ch, x):
    g = gs[cmap[ord(ch)]]; bp = BoundsPen(gs); g.draw(bp); xmin, _, xmax, _ = bp.bounds
    pen = SVGPathPen(gs); g.draw(TransformPen(pen, (S * SX, 0, 0, -S, x - xmin * S * SX, 100)))
    return pen.getCommands(), (xmax - xmin) * S * SX
GAP, WORD, KERN = 4.6, 15.4, {"VA": -17, "AR": -0.5}
def word(t):
    x = 0; out = []; prev = None
    for ch in t:
        if ch == " ": x += WORD - GAP; prev = None; continue
        if prev: x += GAP + KERN.get(prev + ch, 0)
        d, w = glyph(ch, x); out.append(d); x += w; prev = ch
    return "".join(out), round(x, 2)
def rnd(d):  # yolları kısalt
    import re
    return re.sub(r"\d+\.\d+", lambda m: ("%.1f" % float(m.group())).rstrip("0").rstrip("."), d)
L1, w1 = word("NE VAR"); NY, wny = word("NE Y"); K, wk = word("K"); L1, NY, K = rnd(L1), rnd(NY), rnd(K)
O = 104.6; c = O / 2; R = c; ball = R * 0.6; GYO, GOK, LG = GAP - 1.5, GAP, 15.7
ring = f'<circle cx="{c}" cy="{c}" r="{(R+ball)/2:.2f}" fill="none" stroke="currentColor" stroke-width="{R-ball+.6:.2f}"/><path d="M{c+R*.62:.1f} {c+R*.62:.1f}L{c+R*1.13:.1f} {c+R*1.13:.1f}" stroke="currentColor" stroke-width="{R*.38:.1f}" stroke-linecap="round"/>'
def glass(i):  # düz mor cam (yeni logo, 15.11.2026: parıltı ve gölge yok)
    return f'<circle cx="{c}" cy="{c}" r="{ball:.2f}" fill="#8b5cf6"/>'
# Tek parça SVG (beyaz)
W = max(w1, wny + GYO + O + GOK + wk); Ht = 100 + LG + O + 14
ox = wny + GYO; oy = 100 + LG
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 {W+8:.1f} {Ht+8:.1f}" role="img" aria-label="Ne Var Ne Yok" color="#fff">'
       f'<path fill="currentColor" d="{L1}"/><g transform="translate(0 {oy})"><path fill="currentColor" d="{NY}"/>'
       f'<g transform="translate({ox:.2f} 0)">{ring}{glass("nvg")}</g><path fill="currentColor" transform="translate({ox+O+GOK:.2f} 0)" d="{K}"/></g></svg>')
open(os.path.join(H, "logo.svg"), "w").write(svg)
mark = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 {O*1.13+8:.1f} {O*1.13+8:.1f}" role="img" aria-label="Ne Var Ne Yok" color="#fff">{ring}{glass("m")}</svg>'
open(os.path.join(H, "mark.svg"), "w").write(mark)
P = dict(l1=L1, w1=w1, ny=NY, wny=wny, k=K, wk=wk, O=O, gyo=GYO, gok=GOK, lg=LG, ring=ring, glass=glass("__ID__"))
js = """/* NE VAR NE YOK logosu (brand/make-logo.py üretir; elle değiştirme).
   NVLOGO(id) → .logo içine konacak <span class="wm">…</span>. Boyut: .logo{--u} (1 birim = büyük harf yüksekliğinin %1'i).
   Parçalar: 1. satır "NE VAR"; 2. satır "NE Y" + O (halka .sr-ring, cam .sr-glass) + "K". Renk currentColor (beyaz). */
(function (g) {
  var P = __P__;
  var sv = function (w, d) { return '<svg class="lw" viewBox="0 0 ' + w + ' 100" style="width:calc(var(--u) * ' + w + ')" aria-hidden="true"><path fill="currentColor" d="' + d + '"/></svg>'; };
  function NVLOGO(id) {
    id = id || "nv" + Math.random().toString(36).slice(2, 7);
    var ob = '<svg viewBox="0 0 ' + P.O + ' ' + P.O + '" ';
    return '<span class="wm nvl"><span>' + sv(P.w1, P.l1) + '</span><span>' + sv(P.wny, P.ny) +
      '<span class="O" aria-hidden="true">' + ob + 'class="sr-ring">' + P.ring + '</svg>' + ob + 'class="sr-glass">' + P.glass.split("__ID__").join(id) + '</svg></span>' +
      sv(P.wk, P.k) + '</span></span>';
  }
  NVLOGO.css = ".nvl{font-size:inherit!important;display:flex!important;flex-direction:column;gap:calc(var(--u) * " + P.lg + ")!important;line-height:0}" +
    ".nvl>span{display:flex!important;align-items:flex-start}.nvl .lw{display:block;height:calc(var(--u) * 100);overflow:visible;flex:none}" +
    ".nvl .O{position:relative!important;display:block!important;flex:none;width:calc(var(--u) * " + P.O + ")!important;height:calc(var(--u) * " + P.O + ")!important;margin:0 calc(var(--u) * " + P.gok + ") 0 calc(var(--u) * " + P.gyo + ")!important;vertical-align:top}" +
    ".nvl .O svg{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;overflow:visible}";
  g.NVLOGO = NVLOGO;
  if (typeof module !== "undefined" && module.exports) module.exports = NVLOGO;
})(typeof window !== "undefined" ? window : globalThis);
""".replace("__P__", json.dumps(P, ensure_ascii=False))
open(os.path.join(H, "logo.js"), "w").write(js)
print("ok", round(W, 1), round(Ht, 1), len(js))
