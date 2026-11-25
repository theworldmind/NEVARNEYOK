# Toplu taşıma hatları (OpenStreetMap, ODbL; kullanıcı, 19.11.2026: "hangi hatların nerelerden geçtiği açık kaynak, saat şart değil"):
# metro, tramvay, banliyö, otobüs, minibüs/dolmuş, vapur, teleferik hatları ve durak sıraları → yh/<enlem>_<boylam>.json (1° karo).
# Karo: {"s": [[ad, enlem, boylam, (durak no)]], "h": [[no, ad, tür, renk, yön(1: tek yön), [durak sırası]]]}. Saat tutulmaz.
import osmium, json, os, math, collections, re
OUT = os.environ.get("OUT", "/tmp/veri") + "/yh"; os.makedirs(OUT, exist_ok=True)
MODES = {"subway": "metro", "light_rail": "hafif", "monorail": "hafif", "tram": "tram", "train": "tren", "bus": "otobus", "trolleybus": "otobus", "minibus": "dolmus", "share_taxi": "dolmus", "ferry": "vapur", "aerialway": "teleferik", "funicular": "teleferik"}
class H(osmium.SimpleHandler):
    def __init__(s): super().__init__(); s.n = {}; s.w = {}; s.r = []; s.fr = []; s.need_n = set(); s.need_w = set()
    def relation(s, r):
        t = r.tags
        if t.get("type") != "route" or t.get("route") not in MODES: return
        M = []
        for m in r.members:
            if m.role.startswith(("stop", "platform")) and m.type in ("n", "w"): M.append((m.type, m.ref, m.role.startswith("stop")))
        if t["route"] == "ferry" and len(M) < 2:  # vapur ilişkilerinin çoğunda iskele üye değil: hat yollarının uçları iskeleye bağlanır
            W = [m.ref for m in r.members if m.type == "w"]
            if W: s.fr.append((t.get("ref") or "", t.get("name") or "", t.get("from") or "", t.get("to") or "", W))
            return
        if len(M) >= 2: s.r.append((t.get("ref") or "", t.get("name") or "", MODES[t["route"]], t.get("colour") or "", t.get("from") or "", t.get("to") or "", t.get("public_transport:version") == "2", M))
H1 = H(); H1.apply_file("/tmp/hat.pbf")
need_n = {ref for R in H1.r for (ty, ref, _) in R[7] if ty == "n"}; need_w = {ref for R in H1.r for (ty, ref, _) in R[7] if ty == "w"}
need_fw = {w for R in H1.fr for w in R[4]}
# durak numarası (EGO, İETT, ESHOT… durak tabelasındaki no): OSM'de ref, local_ref ya da kuruma özel ref:* alanında
def dref(t):
    for k in ("local_ref", "ref", "ref:EGO", "ref:ego", "ref:IETT", "ref:iett", "ref:ESHOT", "ref:eshot", "ref:durak", "ref:stop"):
        v = (t.get(k) or "").strip()
        if v and len(v) <= 12 and re.search(r"\d", v): return v
    return ""
class G(osmium.SimpleHandler):
    def __init__(s): super().__init__(); s.n = {}; s.w = {}; s.term = []; s.fw = {}; s.fway = []
    def node(s, n):
        if n.tags.get("amenity") == "ferry_terminal" and n.location.valid() and (n.tags.get("name:tr") or n.tags.get("name")): s.term.append((n.tags.get("name:tr") or n.tags.get("name"), n.location.lat, n.location.lon))
        if n.id in need_n and n.location.valid(): s.n[n.id] = (n.tags.get("name:tr") or n.tags.get("name") or "", round(n.location.lat, 5), round(n.location.lon, 5), dref(n.tags))
    def way(s, w):
        if w.tags.get("amenity") == "ferry_terminal" and (w.tags.get("name:tr") or w.tags.get("name")):
            P = [(x.lat, x.lon) for x in w.nodes if x.location.valid()]
            if P: s.term.append((w.tags.get("name:tr") or w.tags.get("name"), sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P)))
        if w.tags.get("route") == "ferry" or w.id in need_fw:
            P = [(x.lat, x.lon) for x in w.nodes if x.location.valid()]
            if len(P) >= 2:
                s.fw[w.id] = (P[0], P[-1])
                if w.tags.get("route") == "ferry": s.fway.append((w.tags.get("ref") or "", w.tags.get("name:tr") or w.tags.get("name") or "", P[0], P[-1]))
        if w.id in need_w:
            P = [(x.lat, x.lon) for x in w.nodes if x.location.valid()]
            if P: s.w[w.id] = (w.tags.get("name:tr") or w.tags.get("name") or "", round(sum(p[0] for p in P) / len(P), 5), round(sum(p[1] for p in P) / len(P), 5), dref(w.tags))
G1 = G(); G1.apply_file("/tmp/hat.pbf", locations=True)
# durakları birleştir: aynı ad ve 60 m içinde → tek durak; adsız durak en yakın adlıya (40 m) bağlanır
S, SK, lines = [], {}, []
def sid(nm, a, o, rf=""):
    k = (re.sub(r"\W+", "", nm.lower()), rf, round(a * 1800), round(o * 1400))
    if k not in SK: SK[k] = len(S); S.append([nm, a, o, rf] if rf else [nm, a, o])
    return SK[k]
for ref, name, mode, col, fr, to, v2, M in H1.r:
    seq = []
    pick = [x for x in M if x[2]] or M  # önce "stop" rolü, yoksa "platform"
    for ty, r, _ in pick:
        p = (G1.n if ty == "n" else G1.w).get(r)
        if not p: continue
        i = sid(*p)
        if not seq or seq[-1] != i: seq.append(i)
    if len(seq) < 2: continue
    if mode == "otobus" and (re.fullmatch(r"34[A-Z]{0,2}", ref or "") or re.match(r"metrob[üu]s", name or "", re.I)): mode = "metrobus"  # İstanbul Metrobüs: ayrı yol, hızlı
    lines.append([ref, name or (fr + " – " + to).strip(" –"), mode, col, 1 if v2 else 0, seq])
# vapur: hat yolunun uçları en yakın adlı iskeleye (500 m) bağlanır; iskelesi bulunamayan uç alınmaz
TG = collections.defaultdict(list)
for t in G1.term: TG[(round(t[1] * 50), round(t[2] * 40))].append(t)
def pier(p):
    best, bd = None, 0.5
    for a in (-1, 0, 1):
        for o in (-1, 0, 1):
            for t in TG.get((round(p[0] * 50) + a, round(p[1] * 40) + o), []):
                d = math.hypot((t[1] - p[0]) * 111, (t[2] - p[1]) * 111 * math.cos(math.radians(p[0])))
                if d < bd: best, bd = t, d
    return best
fseen = set(); nf = 0
def fline(ref, name, ends):
    global nf
    seq = []
    for p in ends:
        t = pier(p)
        if not t: continue
        i = sid(t[0], round(t[1], 5), round(t[2], 5))
        if not seq or seq[-1] != i: seq.append(i)
    if len(seq) < 2: return
    k = (ref, tuple(sorted(seq)))
    if k in fseen: return
    fseen.add(k); nf += 1
    lines.append([ref, name or " – ".join(S[i][0] for i in (seq[0], seq[-1])), "vapur", "", 0, seq])
for ref, name, fr, to, W in H1.fr:
    E = [p for w in W if w in G1.fw for p in G1.fw[w]]
    fline(ref, name or (fr + " – " + to).strip(" –"), E)
for ref, name, a, b in G1.fway: fline(ref, name, [a, b])
print("vapur hattı (iskeleden)", nf, "iskele", len(G1.term))
print("durak no olan", sum(1 for x in S if len(x) > 3)); print("hat", len(lines), "durak", len(S), collections.Counter(l[2] for l in lines).most_common())
# ---- Belediyelerin açık GTFS verileri (25.11.2026, kullanıcı: "Ankara dışında iyi hizmet vermiyor; Samsun'da tramvay otobüs, başka illerde de opsiyonlar"):
# Türkiye'deki bütün GTFS kayıtları MobilityDatabase'in açık kataloğundan (anahtarsız) kendiliğinden bulunur; yeni bir belediye veri yayınlayınca kendiliğinden girer.
# Her hat ve yön için en çok duraklı sefer temsilîdir; günlük sefer sayısından ortalama bekleme (aralığın yarısı, 3–60 dk). Aynı karodaki aynı numaralı
# OSM otobüs hattı GTFS varsa bırakılır (GTFS durak sırası daha eksiksiz). Kaynak ve lisans rapora yazılır.
import csv, io, zipfile, urllib.request
def get(u, t=120):
    try: return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr)"}), timeout=t).read()
    except Exception as e: print("  indirilemedi:", u, str(e)[:80]); return None
GT_MODE = {0: "tram", 1: "metro", 2: "tren", 3: "otobus", 4: "vapur", 5: "teleferik", 6: "teleferik", 7: "teleferik", 11: "otobus", 12: "hafif"}
def gmode(rt):
    rt = int(rt or 3)
    if rt in GT_MODE: return GT_MODE[rt]
    return "tren" if 100 <= rt < 200 else "otobus" if 200 <= rt < 300 or 700 <= rt < 800 else "metro" if 400 <= rt < 500 else "tram" if 900 <= rt < 1000 else "vapur" if 1000 <= rt < 1300 else "teleferik" if 1300 <= rt < 1500 else "otobus"
gsrc, glines = [], []
cat = get("https://files.mobilitydatabase.org/feeds_v2.csv") or get("https://bit.ly/catalogs-csv")
feeds = []
if cat:
    for r in csv.DictReader(io.StringIO(cat.decode("utf8", "replace"))):
        if (r.get("location.country_code") or "").upper() == "TR" and (r.get("data_type") or "gtfs") == "gtfs" and (r.get("status") or "") not in ("deprecated", "inactive"):
            feeds.append(r)
# Katalogda olmayan ya da sayfa adresi verilen belediye kayıtları: açık veri portalının (CKAN) kendi listesinden zip bağlantısı çözülür
EXTRA = [("ESHOT", "İzmir", "https://acikveri.bizizmir.com", "toplu-ulasim-gtfs-verileri"), ("İETT", "İstanbul", "https://data.ibb.gov.tr", "iett-gtfs-verisi"), ("Kocaeli BB", "Kocaeli", "https://veri.kocaeli.bel.tr", "toplu-ulasim-verisi")]
def ckan(base, pid):
    j = get(f"{base}/api/3/action/package_show?id={pid}", 90)
    try: R = json.loads(j)["result"]["resources"]
    except Exception: return []
    return [r["url"] for r in R if re.search(r"gtfs|\.zip", (r.get("url") or "") + " " + (r.get("format") or "") + " " + (r.get("name") or ""), re.I) and re.search(r"zip", (r.get("url") or "") + (r.get("format") or ""), re.I)]
have = {(r.get("provider") or "").lower() for r in feeds}
for prov, il, base, pid in EXTRA:
    if any(prov.lower() in h for h in have): continue
    for u in ckan(base, pid)[:3]: feeds.append({"provider": prov, "location.municipality": il, "urls.direct_download": u, "urls.license": f"{base}/dataset/{pid}"})
for r in feeds:  # katalogdaki adres bir veri sayfasıysa (zip değilse) aynı portalın listesinden çöz
    u = r.get("urls.direct_download") or ""
    m = re.match(r"(https?://[^/]+)(?:/\w\w)?/dataset/([\w-]+)/?$", u)
    if m and not r.get("urls.latest"): z = ckan(m.group(1), m.group(2)); r["urls.direct_download"] = z[0] if z else u
feeds = [r for r in feeds if not re.search(r"flixbus|obilet|şehirlerarası|intercity", (r.get("provider") or ""), re.I)]  # şehirlerarası otobüs şehir içi tarife girmez
print("GTFS: Türkiye'de", len(feeds), "kayıt")
for r in feeds:
    url = r.get("urls.latest") or r.get("urls.direct_download")
    z = get(url, 300) if url else None
    if not z and r.get("urls.direct_download") and url != r.get("urls.direct_download"): z = get(r["urls.direct_download"], 300)
    if not z: gsrc.append({"ad": r.get("provider"), "il": r.get("location.municipality") or r.get("location.subdivision_name"), "durum": "indirilemedi"}); continue
    try: Z = zipfile.ZipFile(io.BytesIO(z))
    except Exception: gsrc.append({"ad": r.get("provider"), "durum": "bozuk"}); continue
    names = {n.split("/")[-1]: n for n in Z.namelist()}
    rd = lambda f: csv.DictReader(io.TextIOWrapper(Z.open(names[f]), encoding="utf-8-sig", errors="replace")) if f in names else []
    if not all(f in names for f in ("stops.txt", "routes.txt", "trips.txt", "stop_times.txt")): gsrc.append({"ad": r.get("provider"), "durum": "eksik dosya"}); continue
    ST = {}
    for x in rd("stops.txt"):
        try: ST[x["stop_id"]] = ((x.get("stop_name") or "").strip(), round(float(x["stop_lat"]), 5), round(float(x["stop_lon"]), 5), (x.get("stop_code") or "").strip()[:12])
        except Exception: pass
    RT = {x["route_id"]: ((x.get("route_short_name") or "").strip(), (x.get("route_long_name") or "").strip(), gmode(x.get("route_type")), (x.get("route_color") or "").strip()) for x in rd("routes.txt")}
    TR = {}
    for x in rd("trips.txt"): TR[x["trip_id"]] = (x["route_id"], x.get("direction_id") or "0", x.get("trip_headsign") or "", x.get("service_id") or "")
    seqs = collections.defaultdict(list)
    for x in rd("stop_times.txt"):
        t = x.get("trip_id")
        if t in TR:
            try: seqs[t].append((int(x.get("stop_sequence") or 0), x["stop_id"]))
            except Exception: pass
    # hat+yön: en çok duraklı sefer; sefer sayısı = en kalabalık hizmet gününün seferleri
    best, cnt = {}, collections.Counter()
    for t, L in seqs.items():
        rid, d, hs, sv = TR[t]; k = (rid, d); cnt[(rid, d, sv)] += 1
        if k not in best or len(L) > len(best[k][1]): best[k] = (hs, L)
    n0 = 0
    for (rid, d), (hs, L) in best.items():
        if rid not in RT: continue
        ref, ln, mode, col = RT[rid]; seq = []
        for _, sid0 in sorted(L):
            p = ST.get(sid0)
            if not p: continue
            i = sid(p[0], p[1], p[2], p[3])
            if not seq or seq[-1] != i: seq.append(i)
        if len(seq) < 2: continue
        trips = max([c for (a, b, sv), c in cnt.items() if a == rid and b == d] or [0])
        w = min(60, max(3, round(960 / trips / 2))) if trips else 0
        glines.append([ref or ln[:12], (hs or ln or ref), mode, ("#" + col) if col and not col.startswith("#") else col, 1, seq, w]); n0 += 1
    gsrc.append({"ad": r.get("provider"), "il": r.get("location.municipality") or r.get("location.subdivision_name"), "hat": n0, "lisans": r.get("urls.license") or "", "kaynak": r.get("urls.direct_download") or url})
    print("  GTFS", r.get("provider"), "·", r.get("location.municipality") or r.get("location.subdivision_name"), "·", n0, "hat-yön")
if glines:
    cell = lambda i: f"{math.floor(S[i][1])}_{math.floor(S[i][2])}"
    gk = {(L[0], cell(L[5][0])) for L in glines if L[2] in ("otobus", "dolmus")}
    before = len(lines); lines = [L for L in lines if not (L[2] in ("otobus", "dolmus") and (L[0], cell(L[5][0])) in gk)]
    print("GTFS:", len(glines), "hat-yön eklendi;", before - len(lines), "OSM otobüs hattı GTFS ile değişti")
    lines += glines
json.dump(gsrc, open(f"{OUT}/gtfs.json", "w"), ensure_ascii=False)
# 1° karolara böl: hattın dokunduğu her karoya hattın tamamı (duraklarıyla) yazılır
T = collections.defaultdict(set)
for li, L in enumerate(lines):
    for c in {f"{math.floor(S[i][1])}_{math.floor(S[i][2])}" for i in L[5]}: T[c].add(li)
tot = 0
for c, LI in T.items():
    idx, ss, hh = {}, [], []
    for li in sorted(LI):
        L = lines[li]; q = []
        for i in L[5]:
            if i not in idx: idx[i] = len(ss); ss.append(S[i])
            q.append(idx[i])
        hh.append(L[:5] + [q] + ([L[6]] if len(L) > 6 and L[6] else []))
    b = json.dumps({"s": ss, "h": hh}, ensure_ascii=False, separators=(",", ":")); tot += len(b); open(f"{OUT}/{c}.json", "w", encoding="utf8").write(b)
# şehir şehir kapsam raporu
C = json.load(open(os.path.join(os.path.dirname(__file__), "il-merkez.json"))) if os.path.exists(os.path.join(os.path.dirname(__file__), "il-merkez.json")) else {"ankara": (39.93, 32.86), "istanbul": (41.02, 28.98), "izmir": (38.42, 27.14), "bursa": (40.19, 29.06), "antalya": (36.9, 30.7), "konya": (37.87, 32.49), "kayseri": (38.72, 35.49), "eskisehir": (39.78, 30.52), "gaziantep": (37.07, 37.38), "kocaeli": (40.77, 29.92), "samsun": (41.29, 36.33), "adana": (37.0, 35.32), "mersin": (36.8, 34.63), "trabzon": (41.0, 39.72), "erzurum": (39.9, 41.27), "diyarbakir": (37.91, 40.24)}
rep = {}
for k, (a, o) in C.items():
    near = [L for L in lines if any(abs(S[i][1] - a) < .35 and abs(S[i][2] - o) < .45 for i in L[5][:3] + L[5][-3:])]
    rep[k] = dict(collections.Counter(l[2] for l in near))
print(json.dumps(rep, ensure_ascii=False)); json.dump({"hat": len(lines), "durak": len(S), "karo": len(T), "mb": round(tot / 1e6, 1), "il": rep, "gtfs": gsrc}, open(f"{OUT}/rapor.json", "w"), ensure_ascii=False)
