# GlobalBuildingAtlas bina yüksekliklerinden küçük yükseklik karoları (z14, gri PNG, 1 birim = 1 m). Veri: Zhu ve ark. 2025, CC BY-NC 4.0 / ODbL.
import gzip, hashlib, json, math, os, struct, subprocess, sys, time, zlib, ijson
KAR = os.environ.get("KAROLAR", "europe/e025_n45_e030_n40 europe/e030_n45_e035_n40 europe/e035_n45_e040_n40 europe/e040_n45_e045_n40 africa/e025_n40_e030_n35 africa/e030_n40_e035_n35 africa/e035_n40_e040_n35 africa/e040_n40_e045_n35").split(); OUT = os.environ.get("OUT", "/tmp/gba"); TMP = "/tmp/gv"; os.makedirs(TMP, exist_ok=True); S = 256; R = {"karolar": KAR, "ayri": {}}; t0 = time.time(); D = {}
n = 2 ** 14 * S
key = lambda s: int.from_bytes(hashlib.blake2b(s.encode(), digest_size=7).digest(), "little")
def px(lo, la): return (lo + 180) / 360 * n, (1 - math.log(math.tan(math.pi / 4 + la * math.pi / 360)) / math.pi) / 2 * n
def ll(x, y): return x / 20037508.342789 * 180, math.degrees(2 * math.atan(math.exp(y / 20037508.342789 * math.pi)) - math.pi / 2)
X0, Y0 = [v / S for v in px(25.5, 42.5)]; X1, Y1 = [v / S for v in px(45, 35.5)]; bina = 0
for T in KAR:
    U = {"lod": f"https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/LoD1/{T}.json", "pol": f"https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/Polygon/{T}.geojson", "odb": f"https://huggingface.co/datasets/zhu-xlab/GBA.ODbLPolygon/resolve/main/{T}.geojson"}
    for k, u in U.items(): subprocess.run(["curl", "-fsSL", "--retry", "5", "-A", "NeVarNeYokBot/1.0", "-o", f"{TMP}/{k}", u], check=True)
    H = {}
    with open(f"{TMP}/lod", "rb") as f:
        for k, v in ijson.kvitems(f, "", use_float=True):
            h = v.get("height")
            if h is not None and h > 0: H[key(k)] = min(255, round(h))
    os.remove(f"{TMP}/lod"); G = {}; N = 0
    for k in ("pol", "odb"):
        with open(f"{TMP}/{k}", "rb") as f:
            for ft in ijson.items(f, "features.item", use_float=True):
                p = ft["properties"]; h = H.get(key(f'{p.get("source", "")}{p.get("id", "")}{p.get("region", "")}'))
                if not h: continue
                g = ft["geometry"]["coordinates"]; Q = g[0] if ft["geometry"]["type"] == "Polygon" else g[0][0]; P = [px(*(ll(*q[:2]) if abs(q[0]) > 180 or abs(q[1]) > 90 else q[:2])) for q in Q]; x0, x1, y0, y1 = int(min(a for a, _ in P)), int(max(a for a, _ in P)), int(min(b for _, b in P)), int(max(b for _, b in P))
                if x1 / S < X0 or x0 / S > X1 or y1 / S < Y0 or y0 / S > Y1: continue
                N += 1
                if x1 - x0 > 40 or y1 - y0 > 40: x0, x1, y0, y1 = (x0 + x1) // 2 - 20, (x0 + x1) // 2 + 20, (y0 + y1) // 2 - 20, (y0 + y1) // 2 + 20
                for y in range(y0, y1 + 1):
                    for x in range(x0, x1 + 1):
                        c = (x // S, y // S); b = G.get(c)
                        if b is None: b = G[c] = bytearray(S * S)
                        i = (y % S) * S + x % S
                        if b[i] < h: b[i] = h
        os.remove(f"{TMP}/{k}")
    for c, b in G.items():
        if c in D: o = zlib.decompress(D[c]); b = bytes(max(p, q) for p, q in zip(b, o))
        D[c] = zlib.compress(bytes(b), 6)
    del G, H; bina += N; R["ayri"][T] = N; print(T, N, len(D), int(time.time() - t0), flush=True)
def png(b, w):
    raw = b"".join(b"\0" + bytes(b[y * w:(y + 1) * w]) for y in range(w)); ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, w, 8, 0, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b"")
C = {}
for (x, y), z in D.items(): C.setdefault((x >> 3, y >> 3), []).append((x & 7, y & 7, z))
tot = 0
for (X, Y), L in C.items():
    b = bytearray(2048 * 2048)
    for x, y, z in L:
        d = zlib.decompress(z)
        for r in range(S): b[(y * S + r) * 2048 + x * S:(y * S + r) * 2048 + x * S + S] = d[r * S:(r + 1) * S]
    os.makedirs(f"{OUT}/11/{X}", exist_ok=True); d = png(b, 2048); open(f"{OUT}/11/{X}/{Y}.png", "wb").write(d); tot += len(d)
R.update(bina=bina, z14=len(D), dosya=len(C), mb=round(tot / 1e6, 1), sure_dk=round((time.time() - t0) / 60)); json.dump(R, open(f"{OUT}/rapor.json", "w"), indent=1); open(f"{OUT}/LISANS.txt", "w").write("Bina yükseklikleri: GlobalBuildingAtlas (Zhu ve ark., ESSD 2025), CC BY-NC 4.0; ODbL poligonlar: OpenStreetMap/Microsoft katkıları. Biçim: z11 2048×2048 gri PNG, piksel = metre (en yakın tam sayı).\n"); print(R)
