#!/usr/bin/env node
/* Instagram'a doğrudan paylaşım (Metricool'suz, ücretsiz): Instagram API with Instagram Login.
 *
 * "Instagram'a paylaş" iş akışı (publish.yml) gün içinde 15 dakikada bir çalıştırır.
 * - "sosyal" dalındaki <YYYY-AA-GG>/paylas.json'u okur; saati gelmiş ve henüz paylaşılmamış kayıtları paylaşır.
 * - Instagram API yalnızca JPEG kabul eder: PNG'ler yayin/<tarih>/ altına JPEG olarak çevrilir, dala gönderilir,
 *   Instagram onları commit'e sabitlenmiş raw.githubusercontent.com adresinden çeker.
 * - Paylaşılanlar yayin/<tarih>.json'da tutulur (aynı şey iki kez paylaşılmaz).
 * - 3 saatten fazla geciken hikâye paylaşılmaz (bayatlar); gönderi 5 saate kadar geç de olsa paylaşılır.
 *
 * Ortam: IG_TOKEN (gizli), SOSYAL_DIR (sosyal dalının klonu), GITHUB_REPOSITORY, DRY=1 (paylaşmadan dene),
 *        ONLY=<id> (yalnızca o kaydı, saatine bakmadan paylaş; elle deneme için).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const API = process.env.IG_API || "https://graph.instagram.com/v23.0";
const TOKEN = process.env.IG_TOKEN;
const DIR = process.env.SOSYAL_DIR || "/tmp/sosyal";
const REPO = process.env.GITHUB_REPOSITORY || "theworldmind/NEVARNEYOK";
const DRY = process.env.DRY === "1";
const ONLY = process.env.ONLY || "";
const log = (...a) => console.log(...a);

if (!TOKEN) { log("IG_TOKEN tanımlı değil: GitHub → Settings → Secrets and variables → Actions → IG_TOKEN ekleyin."); process.exit(1); }

/* İstanbul saatine göre bugün ve şimdiki dakika */
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((p) => [p.type, p.value]));
const today = process.env.SOCIAL_DATE || `${parts.year}-${parts.month}-${parts.day}`;
const nowMin = +parts.hour * 60 + +parts.minute;
const mins = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

async function ig(path, params = {}, method = "GET") {
  const u = new URL(API + path);
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  let r;
  if (method === "GET") { for (const [k, v] of body) u.searchParams.set(k, v); r = await fetch(u); }
  else r = await fetch(u, { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${path}: ${j.error?.message || r.status}`);
  return j;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready(id) {
  for (let i = 0; i < 30; i++) {
    const s = await ig(`/${id}`, { fields: "status_code" });
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`hazırlama ${s.status_code}`);
    await sleep(4000);
  }
  throw new Error("hazırlama zaman aşımı");
}

const me = await ig("/me", { fields: "user_id,username" });
const IGID = me.user_id || me.id;
log(`Instagram hesabı: @${me.username} (${IGID})`);

const pj = join(DIR, today, "paylas.json");
if (!existsSync(pj)) { log(`${today} için paylas.json yok; bugün görsel üretilmemiş.`); process.exit(0); }
const plan = JSON.parse(await readFile(pj, "utf8"));
if (plan.date !== today) { log(`paylas.json tarihi ${plan.date}, bugün ${today}; atlandı.`); process.exit(0); }

const stFile = join(DIR, "yayin", `${today}.json`);
const st = existsSync(stFile) ? JSON.parse(await readFile(stFile, "utf8")) : { date: today, done: {} };
const key = (p) => `${p.id}@${p.slot}`;

const due = plan.posts.filter((p) => {
  if (st.done[key(p)]) return false;
  if (ONLY) return p.id === ONLY;
  const late = nowMin - mins(p.slot);
  return late >= 0 && late <= (p.type === "POST" ? 300 : 180);
}).sort((a, b) => a.slot.localeCompare(b.slot));
if (!due.length) { log("Saati gelmiş, paylaşılmamış kayıt yok."); process.exit(0); }
log("Paylaşılacak:", due.map(key).join(", "));

/* PNG → JPEG (Instagram API yalnız JPEG alır), dala gönder, commit'e sabit adres kullan */
const files = [...new Set(due.flatMap((p) => p.files || [p.file]))];
await mkdir(join(DIR, "yayin", today), { recursive: true });
for (const f of files) {
  const out = join(DIR, "yayin", today, f.replace(/\.png$/i, ".jpg"));
  if (!existsSync(out)) execFileSync("convert", [join(DIR, today, f), "-background", "white", "-flatten", "-quality", "92", out]);
}
const git = (...a) => execFileSync("git", ["-C", DIR, ...a], { encoding: "utf8" }).trim();
const push = (msg) => { git("add", "-A", "yayin"); try { git("-c", "user.name=nevarneyok-bot", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-qm", msg); } catch { return; } try { git("push", "-q", "origin", "HEAD:sosyal"); } catch { git("pull", "-q", "--rebase", "origin", "sosyal"); git("push", "-q", "origin", "HEAD:sosyal"); } };
if (!DRY) push(`Instagram JPEG: ${today}`);
const sha = git("rev-parse", "HEAD");
const url = (f) => `https://raw.githubusercontent.com/${REPO}/${sha}/yayin/${today}/${f.replace(/\.png$/i, ".jpg")}`;
if (!DRY) await sleep(5000);

let fail = 0;
for (const p of due) {
  try {
    if (DRY) { log("DENEME (paylaşılmadı):", key(p), (p.files || [p.file]).map(url)[0]); continue; }
    let cid;
    if (p.type === "STORY") {
      cid = (await ig(`/${IGID}/media`, { image_url: url(p.file), media_type: "STORIES" }, "POST")).id;
    } else if ((p.files || []).length > 1) {
      const kids = [];
      for (const f of p.files.slice(0, 10)) kids.push((await ig(`/${IGID}/media`, { image_url: url(f), is_carousel_item: "true" }, "POST")).id);
      for (const k of kids) await ready(k);
      cid = (await ig(`/${IGID}/media`, { media_type: "CAROUSEL", children: kids.join(","), caption: p.caption || "" }, "POST")).id;
    } else {
      cid = (await ig(`/${IGID}/media`, { image_url: url((p.files || [p.file])[0]), caption: p.caption || "" }, "POST")).id;
    }
    await ready(cid);
    const m = await ig(`/${IGID}/media_publish`, { creation_id: cid }, "POST");
    st.done[key(p)] = { media: m.id, at: new Date().toISOString() };
    log("Paylaşıldı:", key(p), m.id);
  } catch (e) { fail++; log("HATA:", key(p), e.message); }
}
if (!DRY) { await writeFile(stFile, JSON.stringify(st, null, 1)); push(`Instagram paylaşıldı: ${today}`); }
if (fail) process.exitCode = 1;
