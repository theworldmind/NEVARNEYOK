# Logo ve simgeler KULLANICININ DOSYALARINDAN birebir üretilir (yeniden çizilmez, yazı tipi değiştirilmez):
#   brand/nevarneyok-logo.png  → brand/logo.png (saydam zemin, kırpılmış)   · sitede ve reklam görsellerinde
#   brand/nevarneyok-simge.png → brand/mark.png (saydam) ve icons/icon-*.png, apple-touch-icon.png (birebir küçültme)
#   icons/og.png: logo, düz koyu zemin (#0b0a10) ortasında
# Çalıştırma: python3 brand/make-assets.py   (Pillow, numpy)
from PIL import Image
import numpy as np, os
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(H)
def cut(src, dst, pad=6):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
    bg = np.median(np.concatenate([im[:20].reshape(-1, 3), im[-20:].reshape(-1, 3)]), axis=0)
    W, P = np.array([255., 255, 255]), np.array([139., 92, 246]); d = im - bg
    def proj(fg):
        v = fg - bg; a = np.clip((d @ v) / (v @ v), 0, 1); return a, np.linalg.norm(d - a[..., None] * v, axis=-1)
    aw, rw = proj(W); ap, rp = proj(P); a = np.where(rw <= rp, aw, ap); a[np.linalg.norm(d, axis=-1) < 6] = 0
    col = np.clip(np.where(a[..., None] > .01, bg + d / np.maximum(a[..., None], 1e-3), 0), 0, 255)
    ys, xs = np.where(a > .02)
    out = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), 'RGBA').crop((xs.min() - pad, ys.min() - pad, xs.max() + pad + 1, ys.max() + pad + 1))
    out.save(dst, optimize=True); return out
lg = cut(f'{H}/nevarneyok-logo.png', f'{H}/logo.png'); cut(f'{H}/nevarneyok-simge.png', f'{H}/mark.png')
# UYGULAMA SİMGESİ, APPLE KALİTESİNDE (kullanıcı isteği, 15.11.2026: "Apple'da göründüğü gibi kaliteli, camsı").
# Büyüteç (mark.png) BİREBİR, yeri ve boyu kullanıcının simgesindeki gibi (%21,4 / %56). Yalnızca ışık eklenir:
# koyu mor degrade zemin + merceğin arkasında yumuşak mor ışık + üstte ince parlaklık; büyütecin altına yumuşak gölge;
# mor camın sol üstüne cam parlaması, alt kenarına hafif derinlik. "any" simgeler kenar boşluklu yuvarlatılmış kare (masaüstü
# ve Android rıhtımında gerçek uygulama simgesi gibi), apple-touch ve maskable tam kare (sistem kendisi keser).
from PIL import ImageFilter
def glass_icon(S=1024, fade=False):
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float64) / S
    top, bot = np.array([38., 28, 70]), np.array([9., 8, 15])
    t = np.clip(yy * 1.05, 0, 1)[..., None]; img = top * (1 - t) ** 1.6 + bot * (1 - (1 - t) ** 1.6)
    cx, cy = .476, .476  # merceğin merkezi (kullanıcının simgesinde)
    g = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * .2 ** 2)))[..., None]
    img = img + np.array([139., 92, 246]) * .42 * g
    img = img + 255 * np.clip(.07 * (1 - yy / .5), 0, None)[..., None]          # üstte ince parlaklık
    if fade:  # yalnızca zemin kenarlara doğru uygulamanın zeminine erir; büyüteç ve gölgesi olduğu gibi üstüne konur
        r = np.sqrt((xx - .476) ** 2 + (yy - .476) ** 2); k = np.clip((r - .24) / .22, 0, 1)[..., None] ** 1.3
        img = img * (1 - k) + np.array([10., 10, 16]) * k
    base = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')
    mk = Image.open(f'{H}/mark.png').convert('RGBA'); w = round(S * 1223 / 2160); mk = mk.resize((w, w), Image.LANCZOS)
    pos = round(S * (462 - 6) / 2160)
    a = np.asarray(mk).astype(np.float64); al = a[..., 3] / 255
    sh = Image.new('L', (S, S)); sh.paste(Image.fromarray((al * 255).astype(np.uint8)), (pos, pos + round(S * .025)))
    sh = sh.filter(ImageFilter.GaussianBlur(S * .03)); shadow = Image.new('RGBA', (S, S), (4, 2, 12, 0)); shadow.putalpha(sh.point(lambda v: int(v * .7)))
    base = Image.alpha_composite(base, shadow)
    # mor cam: parlama + derinlik (yalnızca mor bölgede)
    rgb = a[..., :3]; pur = al * np.clip(1 - np.linalg.norm(rgb - [139, 92, 246], axis=-1) / 90, 0, 1)
    my, mx = np.mgrid[0:w, 0:w].astype(np.float64) / w
    spec = np.exp(-(((mx - .36) ** 2) / (2 * .16 ** 2) + ((my - .33) ** 2) / (2 * .12 ** 2)))
    deep = np.clip((my - .45) / .45, 0, 1) * np.clip((mx + my - .9) / .9, 0, 1)
    rgb = rgb + (255 - rgb) * (pur * spec * .42)[..., None] - rgb * (pur * deep * .3)[..., None]
    wht = al * np.clip(1 - np.linalg.norm(a[..., :3] - 255, axis=-1) / 60, 0, 1)   # beyaz halka: alta doğru çok hafif lavanta
    rgb = rgb - (wht * my * 22)[..., None] * np.array([1, 1.15, .4])
    mk = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a[..., 3]]).astype(np.uint8), 'RGBA')
    base.alpha_composite(mk, (pos, pos))
    return base
def squircle(img, margin=.06, n=5):
    S = img.width; yy, xx = np.mgrid[0:S * 4, 0:S * 4].astype(np.float64) / (S * 4)
    r = .5 - margin; m = (np.abs((xx - .5) / r) ** n + np.abs((yy - .5) / r) ** n) <= 1
    M = Image.fromarray((m * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    inner = img.resize((round(S * (1 - 2 * margin)),) * 2, Image.LANCZOS); out = Image.new('RGBA', (S, S)); out.paste(inner, (round(S * margin),) * 2)
    hl = Image.new('RGBA', (S, S), (255, 255, 255, 0)); edge = np.asarray(M).astype(np.float64) - np.asarray(M.filter(ImageFilter.MinFilter(3))).astype(np.float64)
    hl.putalpha(Image.fromarray(np.clip(edge * .22 * np.clip(1.2 - yy[::4, ::4] * 2, .25, 1), 0, 255).astype(np.uint8)))
    out = Image.alpha_composite(out, hl); out.putalpha(Image.fromarray(np.minimum(np.asarray(out)[..., 3], np.asarray(M)))); return out
G = glass_icon(); Q = squircle(G)
# Maskable (açılış ekranı ve Android ana ekranı): telefon açılışta bu simgeyi kare olarak gösterebiliyor (kullanıcı, 23:19: "açılış kötü").
# Kenarlar uygulamanın zemin rengine (#0a0a10) yumuşakça erir; açılışta köşeli kare görünmez, yalnızca ışıklı büyüteç kalır.
M = glass_icon(fade=True)
for f, w, im in [('icon-512.png', 512, Q), ('icon-192.png', 192, Q), ('apple-touch-icon.png', 180, G), ('icon-maskable-512.png', 512, M)]:
    o = im.resize((w, w), Image.LANCZOS); (o if im is Q else o.convert('RGB')).save(f'{R}/icons/{f}', optimize=True)
og = Image.new('RGB', (1200, 630), (11, 10, 16)); L = lg.resize((680, int(680 * lg.height / lg.width)), Image.LANCZOS)
og.paste(L, ((1200 - L.width) // 2, (630 - L.height) // 2), L); og.save(f'{R}/icons/og.png', optimize=True)
print('ok')

# Ana sayfadaki logo: mercek cam (kullanıcı isteği, 15.11.2026 23:58: "logomuz dahi Apple kalitesinde camsı olacak").
# Harfler ve büyütecin biçimi BİREBİR aynı (logo.png); yalnızca mor merceğe ışık eklenir: üstte lavanta parlama, sol üstte yay biçiminde
# cam yansıması, altta derinlik, kenarda ince iç ışık. Çıktı brand/logo-cam.png (sitedeki WM() bunu kullanır).
def glass_lens(src):
    a = np.asarray(src).astype(np.float64); rgb = a[..., :3].copy(); al = a[..., 3] / 255
    pur = al * np.clip(1 - np.linalg.norm(rgb - [139, 92, 246], axis=-1) / 70, 0, 1)
    ys, xs = np.where(pur > .5); cx, cy, r = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, (xs.max() - xs.min()) / 2
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float64); u, v = (xx - cx) / r, (yy - cy) / r; d = np.sqrt(u ** 2 + v ** 2)
    top = np.clip(-v * .5 + .5, 0, 1)                                                   # yukarı doğru aydınlık
    base = np.array([139., 92, 246]); light = np.array([196., 170, 255]); deep = np.array([76., 40, 168])
    col = deep[None, None] * (1 - top[..., None]) ** 1.4 + base[None, None] * 0 + light[None, None] * top[..., None] ** 1.6
    col = col * .55 + base[None, None] * .45
    arc = np.exp(-((d - .70) ** 2) / (2 * .07 ** 2)) * np.clip((-u - v) / 1.2, 0, 1) ** 1.5    # sol üstte yay yansıma
    glint = np.exp(-(((u + .38) ** 2) + ((v + .42) ** 2)) / (2 * .10 ** 2))                 # küçük parıltı
    rim = np.clip((d - .86) / .14, 0, 1) ** 2 * (.35 + .65 * np.clip(v, 0, 1))              # altta kenar ışığı (camın kırılması)
    shade = np.clip((u + v) / 1.4, 0, 1) ** 1.5 * .28                                     # sağ altta derinlik
    col = col * (1 - shade[..., None]) + (255 - col) * (arc * .55 + glint * .85 + rim * .25)[..., None]
    out = rgb * (1 - pur[..., None]) + col * pur[..., None]
    return Image.fromarray(np.dstack([np.clip(out, 0, 255), a[..., 3]]).astype(np.uint8), 'RGBA')
glass_lens(Image.open(f'{H}/logo.png').convert('RGBA')).save(f'{H}/logo-cam.png', optimize=True)
print('logo-cam ok')
