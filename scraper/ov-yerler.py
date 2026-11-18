# Overture Places → geo-osm.mjs için Türkiye mekân listesi (ad, enlem, boylam, OSM benzeri tür, adres, ilçe). Foursquare kayıtları alınmaz.
import duckdb, sys, re
src, out = sys.argv[1:3]; con = duckdb.connect(); cols = {r[0] for r in con.execute(f"DESCRIBE SELECT * FROM '{src}'").fetchall()}
cat = "categories.primary" if "categories" in cols else "taxonomy.primary"
K = [(r"movie|cinema", "amenity/cinema"), (r"theat|performing_arts|opera|ballet|comedy_club", "amenity/theatre"), (r"music_venue|concert|jazz|live_music", "amenity/music_venue"), (r"museum", "tourism/museum"), (r"art_gallery|gallery", "tourism/gallery"), (r"shopping_(mall|center)", "shop/mall"), (r"convention|exhibition|conference|event_venue|banquet|wedding_hall", "amenity/conference_centre"), (r"cultural_center|community_center|arts_and_entertainment|arts_center", "amenity/arts_centre"), (r"university|college", "amenity/university"), (r"library", "amenity/library"), (r"night_?club|dance_club", "amenity/nightclub"), (r"\bpub\b|\bbar\b|cocktail|wine_bar|beer", "amenity/bar"), (r"cafe|coffee|tea_room", "amenity/cafe"), (r"restaurant|bistro", "amenity/restaurant"), (r"hotel|resort", "tourism/hotel"), (r"stadium|arena|sports_complex", "leisure/stadium"), (r"\bpark\b|garden", "leisure/park")]
K = [(re.compile(a, re.I), b) for a, b in K]; n = 0
Q = f"""SELECT names."primary", bbox.ymin, bbox.xmin, {cat}, addresses[1].freeform, addresses[1].locality FROM '{src}' WHERE addresses[1].country='TR' AND names."primary" IS NOT NULL AND coalesce(confidence,0)>=.45 AND coalesce(sources[1].dataset,'')<>'Foursquare'"""
clean = lambda s: re.sub(r"[\t\r\n]+", " ", str(s or "")).strip()
with open(out, "w", encoding="utf8") as f:
    for name, la, lo, c, a, l in con.execute(Q).fetchall():
        k = next((b for r, b in K if c and r.search(c)), None)
        if k: f.write("\t".join([clean(name), f"{la:.6f}", f"{lo:.6f}", k, clean(a)[:120], clean(l)[:40]]) + "\n"); n += 1
print("yer:", n)
