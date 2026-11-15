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
src = Image.open(f'{H}/nevarneyok-simge.png').convert('RGB')
for f, w in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('icon-maskable-512.png', 512)]:
    src.resize((w, w), Image.LANCZOS).save(f'{R}/icons/{f}', optimize=True)
og = Image.new('RGB', (1200, 630), (11, 10, 16)); L = lg.resize((680, int(680 * lg.height / lg.width)), Image.LANCZOS)
og.paste(L, ((1200 - L.width) // 2, (630 - L.height) // 2), L); og.save(f'{R}/icons/og.png', optimize=True)
print('ok')
