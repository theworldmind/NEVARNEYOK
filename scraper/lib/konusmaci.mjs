// Tanınmış konuşmacı listesi (kullanıcı, 19.11.2026: Celal Şengör'ün Ankara etkinliği kaçmıştı).
import { readFileSync } from "node:fs";
import { fold } from "./util.mjs";
export const SPEAKERS = readFileSync(new URL("../konusmacilar.txt", import.meta.url), "utf8").split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
const clean = (s) => " " + fold(s).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim() + " ";
const RX = SPEAKERS.map((s) => [s, new RegExp(" " + fold(s) + "[a-z]{0,5} ")]);   // ek alabilir: "Şengör'ün", "Şengör'le"
export const speakerIn = (text) => { const t = clean(text); return (RX.find(([, r]) => r.test(t)) || [""])[0]; };
