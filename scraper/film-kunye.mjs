// Film künyesi (25.11.2026, kullanıcı: "profesyonel siteler gibi"): film arşivindeki (data/filmler.json) her filmin özgün adı, yönetmeni,
// başlıca oyuncuları, yılı ve süresi filmin sinemalar.com sayfasından (JSON-LD Movie + başlık) bir kez okunur. Konu metni alınmaz.
// Her çalışmada en çok KUNYE_MAX film (varsayılan 150); okunanlar bir daha okunmaz (kAt). Kullanım: node film-kunye.mjs
import { join } from "node:path";
import { ROOT, log, readJSON, writeJSON, clean, decodeEntities } from "./lib/util.mjs";
import { fetchText } from "./lib/net.mjs";

const P = join(ROOT, "data/filmler.json"), MAX = +(process.env.KUNYE_MAX || 150);
const A = await readJSON(P, { films: [] }), T = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
const txt = (s) => clean(decodeEntities(String(s || "").replace(/<[^>]+>/g, " ")));
const names = (x) => [].concat(x || []).map((p) => (typeof p === "string" ? p : p?.name) || "").map(txt).filter(Boolean);
const todo = (A.films || []).filter((f) => f.id && /^\d+$/.test(String(f.id)) && !f.kAt).sort((a, b) => (b.last || "").localeCompare(a.last || "")).slice(0, MAX);
let ok = 0;
for (const f of todo) {
  const slug = (String(f.url || "").match(/\/(?:seans|film)\/\d+\/([a-z0-9-]+)/) || [])[1] || "x";
  const r = await fetchText(`https://www.sinemalar.com/film/${f.id}/${slug}`, { retries: 1 });
  f.kAt = T; if (r.status !== 200 || !r.text) continue;
  const h = r.text, tm = txt((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).match(/^(.*?)\s*\((.+?),\s*((?:18|19|20)\d\d)\)/);
  let mv = null; for (const m of h.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { const j = JSON.parse(m[1]); for (const x of [].concat(j["@graph"] || j)) if (/Movie/.test(x?.["@type"])) mv = x; } catch {} }
  const o = tm && tm[2] && tm[2].toLocaleLowerCase("tr") !== String(f.title).toLocaleLowerCase("tr") ? tm[2].trim() : "";
  const dir = names(mv?.director).slice(0, 3).join(", ") || txt((h.match(/<b>Yönetmen:<\/b>([\s\S]*?)<\/div>/i) || [])[1]);
  const cast = names(mv?.actor).slice(0, 5);
  const dur = String(mv?.duration || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  Object.assign(f, { ...(o ? { o } : {}), ...(dir ? { dir: dir.slice(0, 100) } : {}), ...(cast.length ? { cast } : {}), ...(tm?.[3] && !f.year ? { year: +tm[3] } : {}), ...(dur && !f.dur && (+dur[1] || +dur[2]) ? { dur: (+dur[1] || 0) * 60 + (+dur[2] || 0) } : {}) });
  if (o || dir) ok++;
}
await writeJSON(P, A, true);
log(`Film künyesi: ${todo.length} film okundu, ${ok} filmde özgün ad/yönetmen bulundu; künyesi olan ${(A.films || []).filter((f) => f.dir || f.o).length}/${(A.films || []).length}`);
