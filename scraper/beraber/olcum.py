# Beraber daveti, Aşama 0: Türkiye'de adı bilinen yerlerin ölçümü (siteye girmez; çıktı "beraber-olcum" dalına yazılır).
# Overture Places ile OpenStreetMap karşılaştırılır. OSM'de kayıtlı yerin Overture'da bulunma oranı, gerçek kapsamın yaklaşık göstergesidir.
import duckdb, json, math, re, gzip, random, os, sys, collections, difflib, unicodedata
OUT = os.environ.get("OUT", "/tmp/olcum"); os.makedirs(OUT, exist_ok=True)
con = duckdb.connect(); cols = {r[0]: r[1] for r in con.execute("DESCRIBE SELECT * FROM '/tmp/ov.parquet'").fetchall()}; print({k: v[:90] for k, v in cols.items()})
cat = "categories.primary" if "categories" in cols else "taxonomy.primary" if "taxonomy" in cols else "basic_category" if "basic_category" in cols else "NULL"
st = "operating_status" if "operating_status" in cols else "NULL"
R = con.execute(f"""SELECT names."primary", {cat}, confidence, addresses[1].country, addresses[1].region, addresses[1].locality, bbox.ymin, bbox.xmin, sources[1].dataset, {st} FROM '/tmp/ov.parquet' WHERE names."primary" IS NOT NULL""").fetchall()
tr = [r for r in R if r[3] == "TR" or (r[3] is None and 36 < r[6] < 42 and 26.5 < r[7] < 44.5)]; print(len(R), len(tr))
TRMAP = str.maketrans("çğıöşüâîûİI", "cgiosuaiuii")
def fold(s): return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower().translate(TRMAP).replace("̇", "")).strip()
GEN = set("cafe kafe coffee kahve kahvesi restaurant restoran lokanta lokantasi bar pub park parki muze muzesi the ve ankara istanbul izmir sube subesi".split())
def toks(s): return {w for w in fold(s).split() if len(w) > 2 and w not in GEN}
def sim(a, b):
    fa, fb = fold(a), fold(b)
    if not fa or not fb: return False
    if fa == fb or (len(fa) > 4 and fa in fb) or (len(fb) > 4 and fb in fa): return True
    A, B = toks(a), toks(b)
    if A and B and len(A & B) / min(len(A), len(B)) >= .67: return True
    return difflib.SequenceMatcher(None, fa, fb).ratio() >= .78
C = .004
idx = collections.defaultdict(list)
for r in tr: idx[(int(r[6] / C), int(r[7] / C))].append(r)
def dist(a, o, b, p): return math.hypot((a - b) * 111320, (o - p) * 111320 * math.cos(math.radians(a)))
def near(a, o, n, m, minc=0):
    i, j = int(a / C), int(o / C); s = max(1, math.ceil(m / 440))
    for x in range(i - s, i + s + 1):
        for y in range(j - s - 1, j + s + 2):
            for r in idx.get((x, y), ()):
                if (r[2] or 0) >= minc and dist(a, o, r[6], r[7]) <= m and sim(n, r[0]): return r
    return None
def first(g):
    c = g.get("coordinates")
    while c and isinstance(c[0], list): c = c[0]
    return c
K = {"amenity": {"cafe": "kafe", "restaurant": "restoran", "fast_food": "restoran", "bar": "bar", "pub": "bar", "nightclub": "bar", "theatre": "kultur", "arts_centre": "kultur", "cinema": "kultur"}, "tourism": {"museum": "kultur", "gallery": "kultur", "attraction": "gezi", "hotel": "otel"}, "leisure": {"park": "park", "garden": "park"}, "shop": {"mall": "avm"}, "historic": {"monument": "gezi", "castle": "gezi", "memorial": "gezi"}}
osm = []; named = collections.Counter()
for line in open("/tmp/poi.seq", encoding="utf8"):
    try: f = json.loads(line.lstrip("\x1e"))
    except Exception: continue
    p = f.get("properties") or {}; n = p.get("name:tr") or p.get("name")
    if not n: continue
    c = first(f.get("geometry") or {})
    if not c: continue
    named[next((k for k in ("amenity", "tourism", "leisure", "shop", "historic", "office", "craft") if k in p), "?")] += 1
    for k, d in K.items():
        if p.get(k) in d: osm.append((n, c[1], c[0], d[p[k]])); break
REG = {"Ankara merkez": (39.80, 32.60, 40.05, 33.00), "Istanbul": (40.82, 28.55, 41.20, 29.45), "Izmir merkez": (38.30, 26.95, 38.55, 27.30), "Bursa merkez": (40.15, 28.90, 40.28, 29.20), "Kayseri merkez": (38.65, 35.38, 38.80, 35.60), "Kirsehir merkez": (39.10, 34.10, 39.19, 34.21), "Safranbolu": (41.21, 32.66, 41.28, 32.73), "Beypazari": (40.14, 31.89, 40.19, 31.95), "Ardahan merkez": (41.09, 42.67, 41.13, 42.73), "Hakkari merkez": (37.55, 43.71, 37.60, 43.77)}
inb = lambda a, o, b: b[0] <= a <= b[2] and b[1] <= o <= b[3]
rep = {"overture_tr_adli": len(tr), "guven": {}, "osm_adli_yer": sum(named.values()), "osm_tur": named.most_common(), "bolge": {}}
for t in (.3, .5, .7, .9): rep["guven"][str(t)] = sum(1 for r in tr if (r[2] or 0) >= t)
rep["kaynak"] = collections.Counter(r[8] for r in tr).most_common(); rep["durum"] = collections.Counter(r[9] for r in tr).most_common(6); rep["kategori"] = collections.Counter(r[1] for r in tr).most_common(45); rep["il_alani"] = collections.Counter(r[4] for r in tr).most_common(90)
EAT = re.compile(r"cafe|coffee|tea|restaurant|food|bakery|bar|pub|kebab|pizza|burger|dessert|patisserie|bistro", re.I)
for name, b in REG.items():
    O = [x for x in osm if inb(x[1], x[2], b)]; V = [r for r in tr if inb(r[6], r[7], b)]; row = {"overture_toplam": len(V), "overture_g50": sum(1 for r in V if (r[2] or 0) >= .5), "overture_yeme_icme_g50": sum(1 for r in V if (r[2] or 0) >= .5 and EAT.search(r[1] or "")), "tur": {}}
    for k in sorted({x[3] for x in O}):
        L = [x for x in O if x[3] == k]; m = 400 if k in ("park", "gezi", "avm") else 150; row["tur"][k] = {"osm": len(L), "overturede": sum(1 for x in L if near(x[1], x[2], x[0], m)), "overturede_g50": sum(1 for x in L if near(x[1], x[2], x[0], m, .5))}
    rep["bolge"][name] = row; print(name, json.dumps(row, ensure_ascii=False))
ven = []
for f, tr_ in (("data/venues-tr.json", 1), ("data/venues.json", 0)):
    for k, v in json.load(open(f, encoding="utf8")).items():
        if isinstance(v, dict) and v.get("lat"): ven.append((k.split("|", 1)[1] if tr_ else k, v["lat"], v["lng"]))
hit = sum(1 for v in ven if near(v[1], v[2], v[0], 300)); osmv = collections.defaultdict(list)
rep["bizim_mekanlar"] = {"konumlu": len(ven), "overturede": hit}
L = [r for r in tr if (r[2] or 0) >= .5]; blob = json.dumps([[r[0], round(r[6], 5), round(r[7], 5), (r[1] or "")[:18]] for r in L], ensure_ascii=False, separators=(",", ":")).encode(); rep["veri_boyutu_g50"] = {"kayit": len(L), "mb": round(len(blob) / 1e6, 1), "gzip_mb": round(len(gzip.compress(blob, 6)) / 1e6, 1)}
random.seed(7)
def samp(a, o, m, n): S = [r for r in tr if (r[2] or 0) >= .5 and re.search(r"cafe|coffee|tea", r[1] or "", re.I) and dist(a, o, r[6], r[7]) <= m]; random.shuffle(S); return [[r[0], round(r[2], 2)] for r in S[:n]], len(S)
rep["ornek_tunali_kafe"], rep["tunali_kafe_sayisi"] = samp(39.9059, 32.8612, 700, 30); rep["ornek_kizilay_kafe"], rep["kizilay_kafe_sayisi"] = samp(39.9208, 32.8541, 600, 20)
rep["bina"] = json.load(open("/tmp/bina.json")) if os.path.exists("/tmp/bina.json") else None
json.dump(rep, open(f"{OUT}/olcum.json", "w", encoding="utf8"), ensure_ascii=False, indent=1); print("tamam")
