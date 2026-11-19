# Wikidata (CC0): Türkiye'de koordinatı ve Türkçe adı olan yerler → /tmp/wd.json [[ad, enlem, boylam]]. 1°×1° karolar, kendini tanıtan kimlik, karo başına 1 sn ara.
import json, time, urllib.request, urllib.parse
UA = "NeVarNeYokBot/1.0 (https://nevarneyok.net.tr; contact.openmind.vision@gmail.com)"
Q = """SELECT ?l ?c WHERE { SERVICE wikibase:box { ?i wdt:P625 ?c . bd:serviceParam wikibase:cornerSouthWest "Point(%s %s)"^^geo:wktLiteral . bd:serviceParam wikibase:cornerNorthEast "Point(%s %s)"^^geo:wktLiteral . } ?i wdt:P17 wd:Q43 . ?i rdfs:label ?l FILTER(lang(?l)="tr") }"""
out, bad = [], 0
for x in range(25, 45):
    for y in range(35, 43):
        for k in range(3):
            try:
                u = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(Q % (x, y, x + 1, y + 1))
                j = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"}), timeout=90))
                for b in j["results"]["bindings"]:
                    p = b["c"]["value"].replace("Point(", "").replace(")", "").split()
                    if len(p) == 2: out.append([b["l"]["value"], round(float(p[1]), 6), round(float(p[0]), 6)])
                break
            except Exception as e:
                if k == 2: bad += 1; print("karo", x, y, e)
                time.sleep(5)
        time.sleep(1)
json.dump(out, open("/tmp/wd.json", "w", encoding="utf8"), ensure_ascii=False); print("Wikidata", len(out), "hatalı karo", bad)
