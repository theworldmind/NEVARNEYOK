# Yer verisi teşhisi: açık kaynaklarda ne var, biz neyi eliyoruz? Yalnızca günlüğe yazar.
# Kullanım (beraber-veri.yml is=tani): Q="sıhhiye.*yurd|sihhiye.*yurd" BB="32.80,39.89,32.92,39.96" python yer-tani.py
import duckdb, json, os, re, collections, subprocess, urllib.request
Q = re.compile(os.environ.get("Q", "sıhhiye.*yurd|sihhiye.*yurd|sıhhıye.*yurd"), re.I)
w, s, e, n = map(float, os.environ.get("BB", "32.80,39.89,32.92,39.96").split(","))
con = duckdb.connect()
cols = {r[0] for r in con.execute("DESCRIBE SELECT * FROM '/tmp/ov.parquet'").fetchall()}
cat = "categories.primary" if "categories" in cols else "taxonomy.primary"
print("== OVERTURE")
print("Türkiye toplam:", con.execute("SELECT count(*) FROM '/tmp/ov.parquet' WHERE addresses[1].country='TR'").fetchone()[0])
for r in con.execute("SELECT coalesce(sources[1].dataset,'?') d, count(*), round(avg(confidence),2), sum(CASE WHEN confidence>=.45 THEN 1 ELSE 0 END), sum(CASE WHEN confidence>=.7 THEN 1 ELSE 0 END) FROM '/tmp/ov.parquet' WHERE addresses[1].country='TR' GROUP BY 1 ORDER BY 2 DESC").fetchall():
    print("  kaynak", r)
for r in con.execute("SELECT floor(confidence*10)/10 c, count(*) FROM '/tmp/ov.parquet' WHERE addresses[1].country='TR' GROUP BY 1 ORDER BY 1").fetchall():
    print("  güven", r)
print("Ülke alanı boş/başka ama Türkiye kutusunda:", con.execute("SELECT count(*) FROM '/tmp/ov.parquet' WHERE coalesce(addresses[1].country,'')<>'TR'").fetchone()[0])
print("-- bölgede (BB) toplam:", con.execute(f"SELECT count(*) FROM '/tmp/ov.parquet' WHERE bbox.xmin BETWEEN {w} AND {e} AND bbox.ymin BETWEEN {s} AND {n}").fetchone()[0])
print("-- bölgede adında yurt geçen (hepsi):")
for r in con.execute(f"""SELECT names."primary", round(confidence,2), {cat}, sources[1].dataset, addresses[1].freeform, operating_status FROM '/tmp/ov.parquet' WHERE bbox.xmin BETWEEN {w} AND {e} AND bbox.ymin BETWEEN {s} AND {n} AND (names."primary" ILIKE '%yurd%' OR names."primary" ILIKE '%yurt%') ORDER BY 2""").fetchall():
    print("  ", r)
print("-- aranan (bütün Türkiye):")
rows = con.execute(f"""SELECT names."primary", round(confidence,2), {cat}, sources[1].dataset, addresses[1].freeform, bbox.ymin, bbox.xmin, operating_status FROM '/tmp/ov.parquet' WHERE regexp_matches(lower(names."primary"), '{Q.pattern.lower()}')""").fetchall()
for r in rows[:60]: print("  ", r)
print("  eşleşen:", len(rows))
print("== OSM")
c = collections.Counter(); hit = []; named = 0; addr = 0; kinds = collections.Counter()
for line in open("/tmp/named.seq", encoding="utf8"):
    try: f = json.loads(line.lstrip("\x1e"))
    except Exception: continue
    p = f.get("properties") or {}
    if p.get("addr:housenumber"): addr += 1
    nm = p.get("name:tr") or p.get("name") or ""
    if not nm: continue
    named += 1
    k = next((k + "=" + str(p[k]) for k in ("amenity", "shop", "office", "tourism", "leisure", "healthcare", "craft", "club", "historic", "building", "landuse", "place", "highway", "railway", "natural", "man_made", "public_transport") if p.get(k)), "diğer")
    kinds[k.split("=")[0]] += 1
    if Q.search(nm): hit.append((nm, k, p.get("addr:street"), p.get("addr:housenumber")))
print("adlı nesne:", named, "· kapı numaralı adres:", addr)
print("türlere göre:", kinds.most_common(20))
for h in hit[:40]: print("  ", h)
print("  eşleşen:", len(hit))
print("== FOURSQUARE OS PLACES erişimi (anahtarsız mı?)")
for u in ["https://fsq-os-places-us-east-1.s3.amazonaws.com/robots.txt", "https://fsq-os-places-us-east-1.s3.amazonaws.com/?list-type=2&prefix=release/&max-keys=20", "https://huggingface.co/robots.txt", "https://huggingface.co/api/datasets/foursquare/fsq-os-places"]:
    try:
        b = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr)"}), timeout=30).read().decode("utf8", "replace")
        print(u, "→", b[:900].replace("\n", " "))
    except Exception as x: print(u, "→ HATA", str(x)[:200])
