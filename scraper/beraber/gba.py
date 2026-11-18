# GlobalBuildingAtlas keşfi: Türkiye'yi kapsayan karolar ve boyutları (veri indirmez). Lisans: CC BY-NC 4.0 / ODbL.
import json, os, urllib.request as U
OUT = os.environ.get("OUT", "/tmp/gba"); os.makedirs(OUT, exist_ok=True)
def get(u):
    with U.urlopen(U.Request(u, headers={"User-Agent": "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr)"}), timeout=120) as r: return r.read()
def tree(repo, path=""):
    out, u = [], f"https://huggingface.co/api/datasets/{repo}/tree/main/{path}?limit=1000"
    while u:
        with U.urlopen(U.Request(u, headers={"User-Agent": "NeVarNeYokBot/1.0"}), timeout=120) as r:
            out += json.load(r); l = r.headers.get("Link", ""); u = l.split(";")[0].strip("<> ") if 'rel="next"' in l else None
    return out
R = {}
for repo in ["zhu-xlab/GBA.LoD1", "zhu-xlab/GBA.ODbLPolygon"]:
    R[repo] = [[x["type"], x["path"], x.get("size", 0)] for x in tree(repo)][:40]
g = json.loads(get("https://huggingface.co/datasets/zhu-xlab/GBA.LoD1/resolve/main/representative/lod1.geojson")); R["crs"] = g.get("crs"); R["ilk"] = g["features"][0]; hits = []
def box(f):
    P = []
    def w(c):
        if isinstance(c[0], (int, float)): P.append(c)
        else: [w(x) for x in c]
    w(f["geometry"]["coordinates"]); return min(p[0] for p in P), min(p[1] for p in P), max(p[0] for p in P), max(p[1] for p in P)
import math
def m(lo, la): return lo * 20037508.34 / 180, math.log(math.tan((90 + la) * math.pi / 360)) * 20037508.34 / math.pi
b0 = box(g["features"][0]); merc = abs(b0[0]) > 180 or abs(b0[1]) > 90; (x0, y0), (x1, y1) = (m(25.5, 35.5), m(45, 42.5)) if merc else ((25.5, 35.5), (45, 42.5))
for f in g["features"]:
    b = box(f)
    if b[0] < x1 and b[2] > x0 and b[1] < y1 and b[3] > y0: hits.append({"p": f["properties"], "b": b})
R["turkiye"] = hits; R["adet"] = len(g["features"]); json.dump(R, open(f"{OUT}/kesif.json", "w"), ensure_ascii=False, indent=1); print(json.dumps(R, ensure_ascii=False)[:3000])
