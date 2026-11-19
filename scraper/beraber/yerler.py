# Beraber: Türkiye yer verisi. Haritadaki adlar, yer araması ve davet için yv/<hücre>.json, görsel üretimi için onem.json. Yalnızca ad, konum ve tür tutulur.
# Kaynaklar (19.11.2026, kullanıcı: "yer adı verilerini güçlendir, yer adlarını arttır, kaynak bul"): OpenStreetMap (ODbL; dükkân, ofis, sağlık, okul/yurt binaları dahil),
# Overture Places (CDLA/Apache; Meta, Microsoft ve Foursquare kayıtları), Wikidata (CC0), GeoNames (CC BY 4.0). Hepsi anahtarsız, açık lisanslı.
import duckdb, json, re, os, math, collections
OUT = os.environ.get("OUT", "/tmp/veri"); os.makedirs(OUT + "/yv", exist_ok=True)
TY = ["kafe", "yemek", "bar", "park", "muze", "sahne", "avm", "gezi", "spor", "sinema", "yer", "kutuphane"]; TI = {t: i for i, t in enumerate(TY)}
TL = {"kafe": "Kafe", "yemek": "Restoran", "bar": "Mekân", "park": "Park", "muze": "Müze", "sahne": "Sahne", "avm": "AVM", "gezi": "Gezilecek yer", "spor": "Spor", "sinema": "Sinema", "yer": "Yer", "kutuphane": "Kütüphane"}
LIB = re.compile(r"k[üu]t[üu]phane|library|bibliothek", re.I)
OV = [(r"librar", "kutuphane"), (r"movie|cinema", "sinema"), (r"theat|performing_arts|opera|ballet|comedy_club|music_venue|concert|cultural_center|arts_center|arts_and_entertainment", "sahne"), (r"museum|art_gallery", "muze"), (r"shopping_(mall|center)", "avm"), (r"night_?club|\bpub\b|\bbar\b|cocktail|wine_bar", "bar"), (r"cafe|coffee|tea_room|bakery|dessert|ice_cream|patisserie", "kafe"), (r"restaurant|bistro|food|kebab|pizza|burger", "yemek"), (r"historic|landmark|monument|tourist_attraction|castle", "gezi"), (r"\bpark\b|garden|national_park", "park"), (r"stadium|gym|fitness|sports", "spor"), (r"hotel|resort|university|college|school|education|kindergarten|hospital|clinic|mosque|church|synagogue|religious|place_of_worship|government|city_hall|town_hall|courthouse|post_office|community|public_service|train_station|metro_station|bus_station|airport|ferry", "yer")]; OV = [(re.compile(a, re.I), b) for a, b in OV]
OM = {"amenity": {"cafe": "kafe", "ice_cream": "kafe", "restaurant": "yemek", "fast_food": "yemek", "bar": "bar", "pub": "bar", "nightclub": "bar", "theatre": "sahne", "arts_centre": "sahne", "cinema": "sinema", "library": "kutuphane", "public_bookcase": "kutuphane", "place_of_worship": "yer", "kindergarten": "yer", "courthouse": "yer", "post_office": "yer", "bus_station": "yer", "university": "yer", "college": "yer", "school": "yer", "hospital": "yer", "townhall": "yer", "conference_centre": "sahne", "events_venue": "sahne", "community_centre": "sahne", "ferry_terminal": "yer"}, "tourism": {"museum": "muze", "gallery": "muze", "attraction": "gezi", "viewpoint": "gezi", "hotel": "yer", "zoo": "gezi", "aquarium": "gezi", "theme_park": "gezi"}, "leisure": {"park": "park", "garden": "park", "nature_reserve": "park", "stadium": "spor", "sports_centre": "spor", "fitness_centre": "spor", "marina": "gezi"}, "shop": {"mall": "avm", "bakery": "kafe", "pastry": "kafe", "coffee": "kafe", "department_store": "avm"}, "historic": {"monument": "gezi", "castle": "gezi", "memorial": "gezi", "ruins": "gezi", "archaeological_site": "gezi", "mosque": "gezi"}, "amenity_w": {"place_of_worship": "gezi"}}
OJ = set("yes|no|parking|parking_entrance|parking_space|bicycle_parking|motorcycle_parking|bench|waste_basket|waste_disposal|recycling|toilets|atm|vending_machine|drinking_water|shelter|telephone|post_box|charging_station|clock|grit_bin|hunting_stand|picnic_table|bbq|table|lounger|water_point|hydrant|letter_box|ticket_validator|street_lamp|house|residential|apartments|detached|semidetached_house|terrace|garage|garages|shed|hut|roof|construction|ruins|industrial|warehouse|farm_auxiliary|greenhouse|barn|stable|cabin|bungalow|static_caravan|transformer_tower|service|vacant|pitch|track|slipway|common|outdoor_seating".split("|"))
TM = str.maketrans("çğıöşüâîûİI", "cgiosuaiuii")
fold = lambda s: re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower().translate(TM).replace("̇", "")).strip()
BAD = set("coffee shop|cafe|kafe|restaurant|restoran|bar|pub|park|parki|lokanta|kahve|kahvehane|cay bahcesi|market|bakkal|otopark|wc|tuvalet|cocuk parki|oyun parki".split("|"))
def good(n):
    f = fold(n)
    return 3 <= len(n) <= 60 and len(f) >= 3 and f not in BAD and not n.startswith(("_", "@", "#")) and "http" not in n.lower() and not re.search(r"\d{6,}|[_]{1}\w+_", n)
def bbox(g):
    w, e, s, n = 99, 0, 99, 0
    def go(a):
        nonlocal w, e, s, n
        if isinstance(a[0], (int, float)): w, e, s, n = min(w, a[0]), max(e, a[0]), min(s, a[1]), max(n, a[1])
        else:
            for x in a: go(x)
    go(g["coordinates"]); return w, e, s, n
def simp(g):
    if g["type"] == "MultiPolygon": g = {"type": "Polygon", "coordinates": max(g["coordinates"], key=lambda p: len(p[0]))}
    if g["type"] != "Polygon": return None
    R = g["coordinates"][0]; k = max(1, len(R) // 48); Q = R[::k]; Q = Q + [Q[0]] if Q[-1] != Q[0] else Q
    return {"type": "Polygon", "coordinates": [[[round(x, 6), round(y, 6)] for x, y in Q]]}
P, imp = [], []
for line in open("/tmp/poi.seq", encoding="utf8"):
    try: f = json.loads(line.lstrip("\x1e"))
    except Exception: continue
    p = f.get("properties") or {}; g = f.get("geometry"); n = (p.get("name:tr") or p.get("name") or "").strip()
    if not n or not g or not good(n): continue
    t, kd = None, ""
    for k, m in OM.items():
        if p.get(k) in m: t, kd = m[p[k]], k + "/" + p[k]; break
    if LIB.search(n): t, kd = "kutuphane", kd or "ad/kutuphane"
    if not t:
        for k in ("shop", "office", "healthcare", "craft", "club", "tourism", "leisure", "amenity", "historic", "building"):
            v = p.get(k)
            if v and v not in OJ: t, kd = "yer", k + "/" + v; break
    if not t: continue
    w, e, s, nn = bbox(g); a, o = (s + nn) / 2, (w + e) / 2; P.append((n, a, o, t, 3)); area = (nn - s) * (e - w) * 9.4e9
    sc = (40 if p.get("wikidata") else 0) + (30 if p.get("wikimedia_commons") or p.get("image") else 0) + {"avm": 28, "muze": 30, "sahne": 26, "sinema": 18, "kutuphane": 16, "gezi": 22, "park": 12, "spor": 8}.get(t, 0) + (min(20, math.log10(area + 1) * 4) if g["type"] != "Point" else 0)
    if t in ("kafe", "yemek", "bar") and not p.get("wikidata"): sc -= 8
    if sc >= 18: imp.append({"n": n, "a": round(a, 6), "o": round(o, 6), "t": t, "s": " · ".join(x for x in [TL[t], p.get("addr:district") or p.get("addr:city") or ""] if x), "g": simp(g), "wd": p.get("wikidata") or "", "cm": p.get("wikimedia_commons") or "", "sc": round(sc, 1)})
print("OSM", len(P), len(imp))
con = duckdb.connect(); cols = {r[0] for r in con.execute("DESCRIBE SELECT * FROM '/tmp/ov.parquet'").fetchall()}; cat = "categories.primary" if "categories" in cols else "taxonomy.primary"
nov = 0; OVJ = re.compile(r"parking|atm|bus_stop|taxi|charging|toilet|vending|real_estate_agent|home_service|contractor|plumb|electrician|locksmith|structure_and_geography|road|highway|bridge", re.I)
for n, a, o, c, cf in con.execute(f"""SELECT names."primary", bbox.ymin, bbox.xmin, {cat}, coalesce(confidence,0) FROM '/tmp/ov.parquet' WHERE addresses[1].country='TR' AND names."primary" IS NOT NULL AND (coalesce(confidence,0)>=(CASE WHEN coalesce(sources[1].dataset,'')='Foursquare' THEN .7 ELSE .45 END) OR coalesce({cat},'') ILIKE '%librar%' OR names."primary" ILIKE '%tüphane%' OR names."primary" ILIKE '%tuphane%') AND coalesce(operating_status,'open')='open'""").fetchall():
    t = next((b for r, b in OV if c and r.search(c)), None) or ("yer" if c and not OVJ.search(c) else None); n = re.sub(r"\s+", " ", n).strip(); t = "kutuphane" if LIB.search(n) else (None if t == "kutuphane" and cf < .8 else t)
    if t and good(n): P.append((n, a, o, t, 1)); nov += 1
print("Overture", nov)
nwd = 0
if os.path.exists("/tmp/wd.json"):
    for n, a, o in json.load(open("/tmp/wd.json", encoding="utf8")):
        n = re.sub(r"\s+", " ", n).strip()
        if good(n) and not re.search(r"^Q\d+$", n): P.append((n, a, o, "kutuphane" if LIB.search(n) else "yer", 2)); nwd += 1
ngn = 0; GNC = set("S L T H V U".split())
if os.path.exists("/tmp/TR.txt"):
    for line in open("/tmp/TR.txt", encoding="utf8"):
        f = line.rstrip("\n").split("\t")
        if len(f) < 8 or not (f[6] in GNC or f[7] in ("PPLX", "PPLL")): continue
        n = f[1].strip()
        if good(n): P.append((n, float(f[4]), float(f[5]), "yer", 0)); ngn += 1
print("Wikidata", nwd, "GeoNames", ngn)
# yakın ve aynı adlı kayıtlar teke iner; OSM önce
P.sort(key=lambda x: -x[4]); seen = {}; out = collections.defaultdict(list); nk = 0
for n, a, o, t, s in P:
    k = (fold(n), round(a * 700), round(o * 550))
    if k in seen: continue
    seen[k] = 1; out[f"{math.floor(a * 10)}_{math.floor(o * 10)}"].append((s * 2 + (t != "yer"), [n, round(a, 5), round(o, 5), TI[t]])); nk += 1
# Yoğun hücrelerde harita yazıları için en önemli 12.000 yer yv/<hücre>.json'da; geri kalanı yalnızca aramanın indirdiği yv/ek/<hücre>.json'da (telefon az veri indirsin)
tot = 0; CAP = 12000; os.makedirs(OUT + "/yv/ek", exist_ok=True); nek = 0
for c, L in out.items():
    L.sort(key=lambda x: -x[0]); A, B = [x[1] for x in L[:CAP]], [x[1] for x in L[CAP:]]
    b = json.dumps(A, ensure_ascii=False, separators=(",", ":")); tot += len(b.encode()); open(f"{OUT}/yv/{c}.json", "w", encoding="utf8").write(b)
    if B: b = json.dumps(B, ensure_ascii=False, separators=(",", ":")); tot += len(b.encode()); open(f"{OUT}/yv/ek/{c}.json", "w", encoding="utf8").write(b); nek += 1
print("ek hücre", nek)
# bizim mekânlar görsel listesinin başına
V = []
for f, tr in (("data/venues-tr.json", 1), ("data/venues.json", 0)):
    for k, x in json.load(open(f, encoding="utf8")).items():
        if isinstance(x, dict) and x.get("lat"): il, n = k.split("|", 1) if tr else ("ankara", k); V.append({"n": n, "a": x["lat"], "o": x["lng"], "t": "sahne", "il": il, "s": " · ".join(y for y in ["Sahne", x.get("ilce") or ""] if y), "g": None, "wd": "", "cm": "", "sc": 60})
imp.sort(key=lambda x: -x["sc"]); L = V + imp; L2, S = [], set()
for x in L:
    k = (fold(x["n"]), round(x["a"] * 500), round(x["o"] * 400))
    if k not in S: S.add(k); L2.append(x)
json.dump(L2[:9000], open(f"{OUT}/onem.json", "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
json.dump({"tipler": TY, "etiket": TL, "yer": nk, "hucre": len(out), "mb": round(tot / 1e6, 1), "onem": len(L2), "kaynak": {"osm": len(P) - nov - nwd - ngn, "overture": nov, "wikidata": nwd, "geonames": ngn}}, open(f"{OUT}/yv/ozet.json", "w", encoding="utf8"), ensure_ascii=False); print(nk, len(out), round(tot / 1e6, 1), len(L2))
