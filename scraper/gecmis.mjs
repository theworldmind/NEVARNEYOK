// Geçmiş arşivi (25.11.2026, kullanıcı: "geçmiş filmleri, afişleri, geçmiş etkinlikleri hemen siliyorsun; hocamın gittikleri yokmuş").
// Günü gelen her etkinlik ve her film seansı, listeden düşmeden önce aylık arşive yazılır; arşivden hiçbir şey silinmez.
//   data/gecmis/<il>/<yyyy-aa>.json → { e: [[gün, saat, ad, mekân, kategori, afiş, afişKaynağı, bağlantı, durum, festival]],
//                                      f: [[gün, filmNo, filmAdı, salon, "12:00,15:00", afiş]] }
//   data/gecmis/index.json → { <il>: ["2026-11", ...] }
// Yalnızca olgular (ad, gün, saat, mekân, afiş adresi); tanıtım metni yoktur.
// Kullanım: node gecmis.mjs --il=ankara  |  node gecmis.mjs --diger (Ankara dışındaki 80 il)  |  node gecmis.mjs --git (geçmiş commit'lerden doldurur, bir kez)
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const G = join(ROOT, "data/gecmis");
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}`)) || "").split("=")[1] ?? (process.argv.includes(`--${k}`) ? true : undefined);
const todayIST = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
const T = arg("bugun") || todayIST();
const rj = async (p, d) => { try { return JSON.parse(await readFile(p, "utf8")); } catch { return d; } };

const cache = new Map(); // "<il>/<ay>" → { e: Map, f: Map }
async function bucket(il, ay) {
  const k = `${il}/${ay}`; if (cache.has(k)) return cache.get(k);
  const o = await rj(join(G, il, `${ay}.json`), { e: [], f: [] });
  const b = { e: new Map((o.e || []).map((x) => [ekey(x), x])), f: new Map((o.f || []).map((x) => [fkey(x), x])), dirty: false };
  cache.set(k, b); return b;
}
const low = (s) => String(s || "").toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
const ekey = (x) => `${x[0]}|${x[1]}|${low(x[2])}|${low(x[3])}`;
const fkey = (x) => `${x[0]}|${x[1]}|${low(x[3])}`;

async function addEvents(il, list, upto = T) {
  let n = 0;
  for (const e of list || []) {
    if (!e?.d || !e.title || e.d > upto) continue;
    const tk = (e.tickets || [])[0] || {};
    const row = [e.d, e.t || "", e.title, e.venue || "", e.cat || "", e.img || "", e.imgBy || "", e.url || tk.url || "", e.status || "", e.fest || ""];
    const b = await bucket(il, e.d.slice(0, 7)), k = ekey(row), old = b.e.get(k);
    if (!old) { b.e.set(k, row); b.dirty = true; n++; continue; }
    // eksik alanları sonradan gelen bilgiyle tamamla (afiş, durum, festival); var olanı silme
    let ch = false; for (const i of [4, 5, 6, 7, 8, 9]) if (!old[i] && row[i]) { old[i] = row[i]; ch = true; }
    if (row[8] && row[8] !== old[8] && /iptal|ertelendi/.test(row[8])) { old[8] = row[8]; ch = true; }
    if (ch) b.dirty = true;
  }
  return n;
}
async function addFilms(il, fl, upto = T) {
  let n = 0; const C = fl?.cinemas || {};
  for (const f of fl?.films || []) {
    const S = f.s && !Array.isArray(f.s) ? f.s : {};
    for (const [d, rows] of Object.entries(S)) {
      if (d > upto) continue;
      for (const r of rows || []) {
        const salon = C[r[0]]?.name || String(r[0]); const times = String(r[1] || "").split("|")[0];
        const row = [d, f.id, f.title, salon, times, f.img || ""];
        const b = await bucket(il, d.slice(0, 7)), k = fkey(row), old = b.f.get(k);
        if (!old) { b.f.set(k, row); b.dirty = true; n++; }
        else if (times && times !== old[4]) { const all = [...new Set([...old[4].split(","), ...times.split(",")].filter(Boolean))].sort(); if (all.join(",") !== old[4]) { old[4] = all.join(","); b.dirty = true; } }
      }
    }
  }
  return n;
}
async function flush() {
  let files = 0; const idx = await rj(join(G, "index.json"), {});
  for (const [k, b] of cache) {
    const [il, ay] = k.split("/");
    if (!idx[il]) idx[il] = []; if (!idx[il].includes(ay)) { idx[il].push(ay); idx[il].sort(); }
    if (!b.dirty) continue;
    await mkdir(join(G, il), { recursive: true });
    const e = [...b.e.values()].sort((a, c) => (a[0] + a[1]).localeCompare(c[0] + c[1]) || a[2].localeCompare(c[2], "tr"));
    const f = [...b.f.values()].sort((a, c) => a[0].localeCompare(c[0]) || String(a[2]).localeCompare(String(c[2]), "tr"));
    await writeFile(join(G, il, `${ay}.json`), JSON.stringify({ e, f })); files++;
  }
  await mkdir(G, { recursive: true }); await writeFile(join(G, "index.json"), JSON.stringify(idx));
  return files;
}

const CIT = async () => (await import("./lib/cities.mjs")).CITIES.map((c) => c.id);

if (arg("git")) {
  // Geçmiş commit'lerdeki her günün verisinden doldurur: o gün listede olan, o güne kadar olmuş her şey arşive girer.
  const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 30 });
  const show = (h, p) => { try { return JSON.parse(git("show", `${h}:${p}`)); } catch { return null; } };
  const ids = await CIT();
  const files = ["data/events.json", "data/films.json", ...ids.filter((i) => i !== "ankara").flatMap((i) => [`data/c/${i}.json`, `data/c/${i}-films.json`])];
  let ne = 0, nf = 0;
  for (const p of files) {
    const il = p.includes("/c/") ? p.split("/").pop().replace(/(-films)?\.json$/, "") : "ankara";
    const log = git("log", "--format=%h %cI", "--", p).trim().split("\n").filter(Boolean);
    for (const l of log) {
      const [h, iso] = l.split(" "); const day = new Date(Date.parse(iso) + 3 * 36e5).toISOString().slice(0, 10);
      const j = show(h, p); if (!j) continue;
      if (p.endsWith("films.json")) nf += await addFilms(il, j, day); else ne += await addEvents(il, j.events || j, day);
    }
  }
  console.log(`Geçmiş (git): ${ne} etkinlik, ${nf} film seansı · ${await flush()} dosya`);
} else {
  const ids = arg("il") ? String(arg("il")).split(",") : arg("diger") ? (await CIT()).filter((i) => i !== "ankara") : ["ankara"];
  let ne = 0, nf = 0;
  for (const il of ids) {
    const ev = il === "ankara" ? await rj(join(ROOT, "data/events.json"), {}) : await rj(join(ROOT, `data/c/${il}.json`), {});
    const fl = il === "ankara" ? await rj(join(ROOT, "data/films.json"), {}) : await rj(join(ROOT, `data/c/${il}-films.json`), {});
    ne += await addEvents(il, ev.events || []); nf += await addFilms(il, fl);
  }
  console.log(`Geçmiş arşivi: ${ids.length} il · yeni ${ne} etkinlik, ${nf} film seansı · ${await flush()} dosya yazıldı`);
}
