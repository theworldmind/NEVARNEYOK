# Bütün Türkiye bina tabanları: GlobalBuildingAtlas'tan z14 vektör karoları (MVT, katman "b", alan h = metre), z11 paketleri hâlinde gzip.
# Paket: [u16 adet] + adet×[u8 x, u8 y, u32 uzunluk] + karolar. Veri: Zhu ve ark. 2025, CC BY-NC 4.0 / ODbL.
import gzip, hashlib, json, math, os, struct, subprocess, time, collections, ijson
KAR = os.environ.get("KAROLAR", "europe/e025_n45_e030_n40 europe/e030_n45_e035_n40 europe/e035_n45_e040_n40 europe/e040_n45_e045_n40 africa/e025_n40_e030_n35 africa/e030_n40_e035_n35 africa/e035_n40_e040_n35 africa/e040_n40_e045_n35").split(); OUT = os.environ.get("OUT", "/tmp/bina"); TMP = "/tmp/gb"; P = TMP + "/p"; os.makedirs(P, exist_ok=True); os.makedirs(OUT, exist_ok=True); t0 = time.time(); EX = 2048; N = 2 ** 14; R = {"ayri": {}}
key = lambda s: int.from_bytes(hashlib.blake2b(s.encode(), digest_size=7).digest(), "little")
def ll(x, y): return x / 20037508.342789 * 180, math.degrees(2 * math.atan(math.exp(y / 20037508.342789 * math.pi)) - math.pi / 2)
def tp(lo, la): return (lo + 180) / 360 * N, (1 - math.log(math.tan(math.pi / 4 + la * math.pi / 360)) / math.pi) / 2 * N
def vi(n, o):
    while n > 127: o.append(n & 127 | 128); n >>= 7
    o.append(n)
zz = lambda n: (n << 1) ^ (n >> 31)
X0, Y0 = tp(25.5, 42.5); X1, Y1 = tp(45, 35.5)
def geom(Q, tx, ty):
    A = []
    for x, y in Q:
        q = (round((x - tx) * EX), round((y - ty) * EX))
        if not A or A[-1] != q: A.append(q)
    if len(A) > 1 and A[0] == A[-1]: A.pop()
    B = []
    for i, p in enumerate(A):
        a, c = A[i - 1], A[(i + 1) % len(A)]
        if (p[0] - a[0]) * (c[1] - p[1]) != (p[1] - a[1]) * (c[0] - p[0]): B.append(p)
    if len(B) < 3: return None
    if sum(B[i - 1][0] * p[1] - p[0] * B[i - 1][1] for i, p in enumerate(B)) < 0: B.reverse()
    o = bytearray(); vi(9, o); x, y = B[0]; vi(zz(x), o); vi(zz(y), o); vi(2 | (len(B) - 1) << 3, o)
    for p in B[1:]: vi(zz(p[0] - x), o); vi(zz(p[1] - y), o); x, y = p
    vi(15, o); return bytes(o)
tot = 0
for T in KAR:
    for k, u in {"lod": f"https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/LoD1/{T}.json", "pol": f"https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/Polygon/{T}.geojson", "odb": f"https://huggingface.co/datasets/zhu-xlab/GBA.ODbLPolygon/resolve/main/{T}.geojson"}.items(): subprocess.run(["curl", "-fsSL", "--retry", "5", "-A", "NeVarNeYokBot/1.0", "-o", f"{TMP}/{k}", u], check=True)
    H = {}
    with open(f"{TMP}/lod", "rb") as f:
        for k, v in ijson.kvitems(f, "", use_float=True):
            h = v.get("height")
            if h is not None and h > 0: H[key(k)] = min(255, round(h))
    os.remove(f"{TMP}/lod"); G = collections.defaultdict(bytearray); n = 0
    for k in ("pol", "odb"):
        with open(f"{TMP}/{k}", "rb") as f:
            for ft in ijson.items(f, "features.item", use_float=True):
                g = ft["geometry"]["coordinates"]; Q0 = g[0] if ft["geometry"]["type"] == "Polygon" else g[0][0]; q0 = Q0[0]; merc = abs(q0[0]) > 180 or abs(q0[1]) > 90; Q = [tp(*(ll(*q[:2]) if merc else q[:2])) for q in Q0]; cx = sum(a for a, _ in Q) / len(Q); cy = sum(b for _, b in Q) / len(Q)
                if not (X0 <= cx <= X1 and Y0 <= cy <= Y1): continue
                tx, ty = int(cx), int(cy); e = geom(Q, tx, ty)
                if not e or len(e) > 65000: continue
                p = ft["properties"]; h = H.get(key(f'{p.get("source", "")}{p.get("id", "")}{p.get("region", "")}'), 0); b = G[(tx >> 3, ty >> 3)]; b += struct.pack("<BBBH", tx & 7, ty & 7, h, len(e)); b += e; n += 1
        os.remove(f"{TMP}/{k}")
    for (X, Y), b in G.items():
        with open(f"{P}/{X}_{Y}", "ab") as f: f.write(b)
    del G, H; tot += n; R["ayri"][T] = n; print(T, n, int(time.time() - t0), flush=True)
def fld(no, data, o): vi(no << 3 | 2, o); vi(len(data), o); o += data
def tile(F):
    V = sorted({h for h, _ in F}); ix = {h: i for i, h in enumerate(V)}; L = bytearray(); fld(1, b"b", L)
    for h, e in F:
        t = bytearray(); vi(0, t); vi(ix[h], t); m = bytearray(); fld(2, t, m); m += b"\x18\x03"; fld(4, e, m); fld(2, m, L)
    fld(3, b"h", L)
    for h in V: v = bytearray(); v.append(5 << 3); vi(h, v); fld(4, v, L)
    L.append(5 << 3); vi(EX, L); L.append(15 << 3); L.append(2); o = bytearray(); fld(3, L, o); return bytes(o)
mb = kar = 0
for name in os.listdir(P):
    X, Y = name.split("_"); d = open(f"{P}/{name}", "rb").read(); os.remove(f"{P}/{name}"); T = collections.defaultdict(list); i = 0
    while i < len(d):
        a, b, h, l = struct.unpack_from("<BBBH", d, i); i += 5; T[(a, b)].append((h, d[i:i + l])); i += l
    head = bytearray(struct.pack("<H", len(T))); body = bytearray()
    for (a, b), F in sorted(T.items()): m = tile(F); head += struct.pack("<BBI", a, b, len(m)); body += m; kar += 1
    os.makedirs(f"{OUT}/11/{X}", exist_ok=True); z = gzip.compress(bytes(head + body), 9, mtime=0); open(f"{OUT}/11/{X}/{Y}.bin", "wb").write(z); mb += len(z)
R.update(bina=tot, karo=kar, mb=round(mb / 1e6, 1), sure_dk=round((time.time() - t0) / 60)); json.dump(R, open(f"{OUT}/rapor.json", "w"), indent=1); open(f"{OUT}/LISANS.txt", "w").write("Bina tabanları ve yükseklikleri: GlobalBuildingAtlas (Zhu ve ark., ESSD 2025), CC BY-NC 4.0; ODbL poligonlar: OpenStreetMap/Microsoft katkıları.\n"); print(R)
