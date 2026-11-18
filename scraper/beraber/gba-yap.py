# GlobalBuildingAtlas bina yüksekliklerinden küçük yükseklik karoları (z14, gri PNG, 1 birim = 1 m). Veri: Zhu ve ark. 2025, CC BY-NC 4.0 / ODbL.
import gzip, hashlib, json, math, os, struct, subprocess, sys, time, zlib, ijson
T = os.environ.get("KARO", "africa/e030_n40_e035_n35"); OUT = os.environ.get("OUT", "/tmp/gba"); TMP = "/tmp/gv"; os.makedirs(TMP, exist_ok=True); Z = 14; S = 256; KEEP = [float(x) for x in os.environ.get("ALAN", "32.2,39.6,33.3,40.2").split(",")]; R = {"karo": T}; t0 = time.time()
U = {"lod": f"https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/LoD1/{T}.json", "pol": f"https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/Polygon/{T}.geojson", "odb": f"https://huggingface.co/datasets/zhu-xlab/GBA.ODbLPolygon/resolve/main/{T}.geojson"}
for k, u in U.items():
    subprocess.run(["curl", "-fsSL", "--retry", "5", "-A", "NeVarNeYokBot/1.0", "-o", f"{TMP}/{k}", u], check=True); R[k + "_mb"] = round(os.path.getsize(f"{TMP}/{k}") / 1e6); print(k, R[k + "_mb"], "MB", int(time.time() - t0), flush=True)
key = lambda s: int.from_bytes(hashlib.blake2b(s.encode(), digest_size=7).digest(), "little")
H = {}
with open(f"{TMP}/lod", "rb") as f:
    for k, v in ijson.kvitems(f, "", use_float=True):
        h = v.get("height")
        if h is not None and h > 0: H[key(k)] = min(255, round(h))
os.remove(f"{TMP}/lod"); R["yukseklikli"] = len(H); print("yükseklik", len(H), int(time.time() - t0), flush=True)
G, N, miss, hist = {}, 0, 0, [0] * 12
n = 2 ** Z * S
def px(lo, la): return (lo + 180) / 360 * n, (1 - math.log(math.tan(math.pi / 4 + la * math.pi / 360)) / math.pi) / 2 * n
def ll(x, y): return x / 20037508.342789 * 180, math.degrees(2 * math.atan(math.exp(y / 20037508.342789 * math.pi)) - math.pi / 2)
for k in ("pol", "odb"):
    with open(f"{TMP}/{k}", "rb") as f:
        for ft in ijson.items(f, "features.item", use_float=True):
            p = ft["properties"]; h = H.get(key(f'{p.get("source", "")}{p.get("id", "")}{p.get("region", "")}'))
            if not h: miss += 1; continue
            g = ft["geometry"]["coordinates"]; Q = g[0] if ft["geometry"]["type"] == "Polygon" else g[0][0]; P = [px(*(ll(*q[:2]) if abs(q[0]) > 180 or abs(q[1]) > 90 else q[:2])) for q in Q]; x0, x1, y0, y1 = int(min(a for a, _ in P)), int(max(a for a, _ in P)), int(min(b for _, b in P)), int(max(b for _, b in P)); N += 1; hist[min(11, h // 6)] += 1
            if x1 - x0 > 40 or y1 - y0 > 40: x0, x1, y0, y1 = (x0 + x1) // 2 - 20, (x0 + x1) // 2 + 20, (y0 + y1) // 2 - 20, (y0 + y1) // 2 + 20
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    c = (x // S, y // S); b = G.get(c)
                    if b is None: b = G[c] = bytearray(S * S)
                    i = (y % S) * S + x % S
                    if b[i] < h: b[i] = h
    os.remove(f"{TMP}/{k}"); print(k, N, miss, len(G), int(time.time() - t0), flush=True)
def png(b, w):
    raw = b"".join(b"\0" + bytes(b[y * w:(y + 1) * w]) for y in range(w)); ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, w, 8, 0, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b"")
def half(b): return bytearray(max(b[y * S + x], b[y * S + x + 1], b[(y + 1) * S + x], b[(y + 1) * S + x + 1]) for y in range(0, S, 2) for x in range(0, S, 2))
s256 = s128 = kept = 0; x0, y0 = [int(v / S) for v in px(KEEP[0], KEEP[3])]; x1, y1 = [int(v / S) for v in px(KEEP[2], KEEP[1])]
for (x, y), b in G.items():
    d = png(b, S); s256 += len(d); s128 += len(png(half(b), S // 2))
    if x0 <= x <= x1 and y0 <= y <= y1:
        os.makedirs(f"{OUT}/h/{Z}/{x}", exist_ok=True); open(f"{OUT}/h/{Z}/{x}/{y}.png", "wb").write(d); kept += 1
R.update(bina=N, eslesmeyen=miss, karo=len(G), mb256=round(s256 / 1e6, 1), mb128=round(s128 / 1e6, 1), yazilan=kept, dagilim_6m=hist, sure_dk=round((time.time() - t0) / 60)); json.dump(R, open(f"{OUT}/rapor.json", "w"), indent=1); open(f"{OUT}/LISANS.txt", "w").write("Bina yükseklikleri: GlobalBuildingAtlas (Zhu ve ark., ESSD 2025), CC BY-NC 4.0; ODbL poligonlar: OpenStreetMap/Microsoft katkıları. Biçim: z14 gri PNG, piksel = metre.\n"); print(R)
