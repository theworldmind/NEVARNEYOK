// EGO hareket saatleri keşfi (yalnızca günlüğe yazar). Kullanıcı, 19.11.2026: "Ankara'da otobüs/metro tahmini geliş saatlerinden yararlan".
// "Otobüs Nerede?" sayfası her açılışta değişen alan adı + güvenlik belirteci kullanıyor (otomasyona kapalı) → kullanılmaz.
import { fetchText, robotsAllows } from "../lib/net.mjs";
const B = "https://www.ego.gov.tr";
const rb = await fetchText(B + "/robots.txt"); console.log("robots.txt:\n" + rb.text);
const p = await fetchText(B + "/tr/hareketsaatleri"); console.log("sayfa", p.status, p.text.length);
const H = p.text;
const form = H.slice(H.indexOf('action="/HareketSaatleri"') - 200, H.indexOf("</form>", H.indexOf('action="/HareketSaatleri"')) + 7);
for (const s of form.matchAll(/<select[^>]*name="([^"]+)"[^>]*id="([^"]+)"[\s\S]*?<\/select>/g)) { const o = [...s[0].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)/g)]; console.log("SEÇİM", s[1], s[2], o.length, o.slice(0, 4).map((x) => x[1] + "=" + x[2].trim()).join(" | ")); }
for (const i of form.matchAll(/<input[^>]*>/g)) console.log("ALAN", i[0].slice(0, 200));
for (const b of form.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)) console.log("DÜĞME", b[0].replace(/\s+/g, " ").slice(0, 200));
const sc = [...H.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((x) => /hat|Hareket|ajax|fetch|\$\.(post|get)/i.test(x));
for (const x of sc) console.log("BETİK:", x.replace(/\s+/g, " ").slice(0, 1500));
const tok = (H.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || [])[1];
console.log("belirteç var mı:", !!tok);
for (const hat of ["116-1", "413-2"]) {
  for (const path of ["/HareketSaatleri", "/tr/HareketSaatleri"]) {
    if (!(await robotsAllows(B + path)).ok) { console.log("robots izin yok", path); continue; }
    const body = new URLSearchParams({ hat_no1: hat }); if (tok) body.set("__RequestVerificationToken", tok);
    const r = await fetch(B + path, { method: "POST", headers: { "user-agent": "NeVarNeYokBot/1.0 (+https://nevarneyok.net.tr/#/bilgi/hakkinda)", "content-type": "application/x-www-form-urlencoded" }, body, redirect: "follow" });
    const t = await r.text(); console.log("POST", path, hat, r.status, r.url, t.length);
    const tx = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const i = tx.search(/\d{2}:\d{2}/); console.log("  saatler:", (tx.match(/\b\d{2}:\d{2}\b/g) || []).length, tx.slice(Math.max(0, i - 600), i + 900));
    const j = t.indexOf(t.match(/\b\d{2}:\d{2}\b/)?.[0] || "@@"); if (j > 0) console.log("  İŞARETLEME:", t.slice(Math.max(0, j - 1500), j + 600).replace(/\s+/g, " "));
    await new Promise((r) => setTimeout(r, 2500));
    if (t.match(/\b\d{2}:\d{2}\b/g)?.length > 5) break;
  }
}
for (const u of ["/tr/sayfa/2388/ankara-metrosu", "/tr/sayfa/2389/ankaray", "/tr/sayfa/1075/rayli-sistem"]) {
  const r = await fetchText(B + u); const tx = r.text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n").replace(/[ \t]+/g, " ");
  console.log("\n=====", u, r.status); for (const l of tx.split("\n").map((s) => s.trim()).filter((l) => /dakika|sefer|\d{2}[:.]\d{2}|aralı|ilk|son/i.test(l) && l.length < 300).slice(0, 40)) console.log("  ·", l);
}
