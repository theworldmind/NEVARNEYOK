/* NE VAR NE YOK logosu (brand/make-logo.py üretir; elle değiştirme).
   NVLOGO(id) → .logo içine konacak <span class="wm">…</span>. Boyut: .logo{--u} (1 birim = büyük harf yüksekliğinin %1'i).
   Parçalar: 1. satır "NE VAR"; 2. satır "NE Y" + O (halka .sr-ring, cam .sr-glass) + "K". Renk currentColor (beyaz). */
(function (g) {
  var P = {"l1": "M-8.9e-16 100H29.9V63.5C29.9 59.5 29.9 51.6 29.5 42.6C34.5 51.3 39.3 59 42.3 63.5L66.6 100H97.1V0H67.2V36.6C67.2 41.4 67.3 49.5 67.6 57.7C63.4 50.5 59 43 56.5 39.3L30.4 0H-8.9e-16ZM101.7 100H184.6V76.4H131.6V61.5H180.5V38.7H131.6V23.6H184.6V0H101.7ZM231.3 100H270.9L305.7 0H273.2L261.4 38.8C257.8 50.5 254.5 62.1 251.2 73.8C247.9 62.1 244.4 50.5 240.7 38.8L228.3 0H195.4ZM293.3 100H325.9L331.2 83.6H366.9L372 100H405.7L369.4 0H329.2ZM338.1 62.1 338.4 61.2C342.2 49.1 345.8 37.4 349.3 25.3C352.8 37.4 356.3 49.1 360 61.2L360.3 62.1ZM409.8 100H439.6V68.7H453L469 100H500.1L480.5 62.7C490.9 56.9 496.8 47.3 496.8 34.9C496.8 13.5 480.8 0 455.2 0H409.8ZM439.6 47.1V22.7H453C462 22.7 467.6 27.6 467.6 34.9C467.6 42.2 462 47.1 453 47.1Z", "w1": 500.09, "ny": "M-8.9e-16 100H29.9V63.5C29.9 59.5 29.9 51.6 29.5 42.6C34.5 51.3 39.3 59 42.3 63.5L66.6 100H97.1V0H67.2V36.6C67.2 41.4 67.3 49.5 67.6 57.7C63.4 50.5 59 43 56.5 39.3L30.4 0H-8.9e-16ZM101.7 100H184.6V76.4H131.6V61.5H180.5V38.7H131.6V23.6H184.6V0H101.7ZM235.2 100H264.1V65.9L302.8 0H268.8L254.4 28.1C252.8 31.2 251.2 34.4 249.8 37.6C248.2 34.4 246.6 31.2 244.9 28.1L229.5 0H195.4L235.2 65.9Z", "wny": 302.79, "k": "M-8.9e-16 100H29.9V76.8L42.9 61.9L67.3 100H101.5L62.1 43L99.5 0H64.9L43.7 25.7C39.1 31.3 34.5 36.8 29.9 42.3V0H-8.9e-16Z", "wk": 101.47, "O": 104.6, "gyo": 3.0999999999999996, "gok": 4.6, "lg": 15.7, "ring": "<circle cx=\"52.3\" cy=\"52.3\" r=\"41.84\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"21.52\"/><path d=\"M84.7 84.7L111.4 111.4\" stroke=\"currentColor\" stroke-width=\"19.9\" stroke-linecap=\"round\"/>", "glass": "<circle cx=\"52.3\" cy=\"52.3\" r=\"31.38\" fill=\"#8b5cf6\"/>"};
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
