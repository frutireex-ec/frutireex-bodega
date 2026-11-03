// Detector de doble aplauso: señales sintéticas (aplausos, voces con consonantes explosivas, golpes graves, martillazos, música, avisos de Rex).
// node tests/aplauso.test.js  → todo debe dar 0 mal
const AP = require("../src/aplauso.js");
const SR = 48000, N10 = SR / 100;
let semilla = 12345;
const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 * 2 - 1; };   // ruido blanco -1..1

function seno(buf, f, ini, dur, amp, att) {   // tono con subida y bajada suaves
  const a = Math.round(ini * SR), n = Math.round(dur * SR);
  for (let i = 0; i < n && a + i < buf.length; i++) { const t = i / SR, env = Math.min(1, t / (att || 0.01)) * Math.exp(-t / (dur / 2.5)); buf[a + i] += amp * env * Math.sin(2 * Math.PI * f * t); }
}
function ruidoFondo(buf, amp) { for (let i = 0; i < buf.length; i++) buf[i] += amp * rnd(); }
function aplauso(buf, ini, amp, tau) {   // golpe seco: ruido que se apaga rápido, con la mitad grave recortada (filtro de 1 polo)
  const a = Math.round(ini * SR), n = Math.round(0.15 * SR); let z = 0;
  for (let i = 0; i < n && a + i < buf.length; i++) { const t = i / SR, x = rnd(); const hp = x - z; z += 0.2 * (x - z); buf[a + i] += amp * hp * Math.exp(-t / (tau || 0.012)); }
}
function golpeGrave(buf, ini, amp) {   // un golpe sordo (mesa, caja): 60–140 Hz que se apaga en 40 ms
  const a = Math.round(ini * SR), n = Math.round(0.2 * SR);
  for (let i = 0; i < n && a + i < buf.length; i++) { const t = i / SR; buf[a + i] += amp * Math.exp(-t / 0.03) * (Math.sin(2 * Math.PI * 90 * t) + 0.5 * Math.sin(2 * Math.PI * 140 * t)); }
}
function golpeMetal(buf, ini, amp) {   // metal que suena: agudo, pero se apaga lento (0,3 s)
  const a = Math.round(ini * SR), n = Math.round(0.6 * SR);
  for (let i = 0; i < n && a + i < buf.length; i++) { const t = i / SR; buf[a + i] += amp * Math.exp(-t / 0.18) * (Math.sin(2 * Math.PI * 2900 * t) + 0.6 * Math.sin(2 * Math.PI * 4100 * t)); }
}
function vocal(buf, ini, dur, amp, f0) {   // vocal: armónicos de f0 con formantes, sube en 20 ms y baja despacio
  const a = Math.round(ini * SR), n = Math.round(dur * SR);
  for (let i = 0; i < n && a + i < buf.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.05); let v = 0;
    for (let k = 1; k <= 14; k++) { const fk = k * f0, g = Math.exp(-Math.pow((fk - 700) / 500, 2)) + 0.5 * Math.exp(-Math.pow((fk - 1700) / 600, 2)) + 0.15 * Math.exp(-Math.pow((fk - 3000) / 900, 2)); v += g * Math.sin(2 * Math.PI * fk * t) / k; }
    buf[a + i] += amp * env * v;
  }
}
function explosiva(buf, ini, amp) {   // «t», «p», «k»: 15 ms de ruido agudo antes de la vocal
  const a = Math.round(ini * SR), n = Math.round(0.015 * SR); let z = 0;
  for (let i = 0; i < n && a + i < buf.length; i++) { const x = rnd(); buf[a + i] += amp * (x - z) * (1 - i / n); z += 0.2 * (x - z); }
}
function silaba(buf, ini, amp, f0) { explosiva(buf, ini, amp * 0.9); vocal(buf, ini + 0.015, 0.16, amp, f0 || 140); }
function fricativa(buf, ini, dur, amp) { const a = Math.round(ini * SR), n = Math.round(dur * SR); let z = 0; for (let i = 0; i < n && a + i < buf.length; i++) { const x = rnd(); const env = Math.min(1, i / (0.02 * SR)) * Math.min(1, (n - i) / (0.03 * SR)); buf[a + i] += amp * env * (x - z); z += 0.2 * (x - z); } }
function musica(buf, amp) { for (let i = 0; i < buf.length; i++) { const t = i / SR; buf[i] += amp * (0.5 * Math.sin(2 * Math.PI * 220 * t) + 0.3 * Math.sin(2 * Math.PI * 440 * t * (1 + 0.01 * Math.sin(t))) + 0.2 * Math.sin(2 * Math.PI * 880 * t) + 0.1 * rnd()); } }
function ta(buf, ini) { const a = Math.round(ini * SR), n = Math.round(0.13 * SR); for (let i = 0; i < n && a + i < buf.length; i++) { const t = i / SR; buf[a + i] += 0.24 * Math.min(1, t / 0.02) * Math.exp(-t / 0.05) * (Math.sin(2 * Math.PI * 1047 * t) + 0.3 * Math.sin(2 * Math.PI * 2093 * t)); } }

// corre el detector sobre una señal; devuelve los instantes (ms) en que despertó
function correr(buf, sens) {
  const d = AP.crear({ sens: sens || "media" }), out = [];
  for (let b = 0; b + N10 <= buf.length; b += N10) { const f = AP.rasgos(buf.subarray(b, b + N10)); if (d.frame(f.rms, f.hf, b / SR * 1000)) out.push(Math.round(b / SR * 1000)); }
  return out;
}
const señal = (seg, fondo) => { const b = new Float32Array(Math.round(seg * SR)); if (fondo) ruidoFondo(b, fondo); return b; };

let bien = 0, mal = 0;
const prueba = (nombre, buf, esperado, sens) => {
  const r = correr(buf, sens), ok = esperado ? r.length >= 1 : r.length === 0;
  if (ok) bien++; else { mal++; console.log("MAL:", nombre, "→ despertó", JSON.stringify(r), "esperaba", esperado ? "sí" : "no"); }
};

// ---- debe despertar ----
const dobles = [[0.15, 0.4], [0.25, 0.4], [0.3, 0.3], [0.35, 0.5], [0.45, 0.6], [0.6, 0.2], [0.7, 0.8], [0.2, 1.0]];
for (const fondo of [0.0005, 0.002, 0.006, 0.015])
  for (const amp of [1.6, 2.5, 5])
    for (const [gap, x] of dobles) {
      const b = señal(3, fondo); aplauso(b, 1.0, amp * 0.1 / 1.0 * 1.0); aplauso(b, 1.0 + gap, amp * 0.1 * (0.7 + x * 0.4));
      // el volumen mínimo para que cuente se prueba aparte; aquí el aplauso es claramente más fuerte que el fondo
      if (amp * 0.1 / Math.max(fondo, 1e-4) >= 20) prueba(`doble aplauso fondo=${fondo} amp=${amp} pausa=${gap}`, b, true);
    }
// aplausos con distinta dureza (tau 6 a 25 ms)
for (const tau of [0.006, 0.01, 0.015, 0.02, 0.025]) { const b = señal(3, 0.004); aplauso(b, 1, 0.4, tau); aplauso(b, 1.35, 0.35, tau); prueba(`doble aplauso tau=${tau}`, b, true); }
// tres aplausos seguidos: despierta con los dos primeros
{ const b = señal(3, 0.004); aplauso(b, 1, 0.4); aplauso(b, 1.3, 0.4); aplauso(b, 1.6, 0.4); prueba("tres aplausos", b, true); }
// con radio de fondo
{ for (const m of [0.01, 0.03]) { const b = señal(3, 0.004); musica(b, m); aplauso(b, 1, 0.5); aplauso(b, 1.35, 0.5); prueba("doble aplauso con música " + m, b, true); } }
// aplauso con una persona hablando antes y después (entre palabras)
{ const b = señal(5, 0.004); silaba(b, 0.2, 0.1); silaba(b, 0.5, 0.1); aplauso(b, 2.0, 0.5); aplauso(b, 2.35, 0.5); silaba(b, 3.2, 0.1); prueba("doble aplauso entre palabras", b, true); }
// sensibilidad baja: un aplauso suave no cuenta, uno fuerte sí
{ const b = señal(3, 0.002); aplauso(b, 1, 0.12); aplauso(b, 1.35, 0.12); prueba("sensibilidad alta oye un aplauso suave", b, true, "alta"); prueba("sensibilidad baja ignora un aplauso suave", b, false, "baja"); }
{ const b = señal(3, 0.002); aplauso(b, 1, 0.8); aplauso(b, 1.35, 0.8); prueba("sensibilidad baja oye un aplauso fuerte", b, true, "baja"); }

// ---- NO debe despertar ----
{ const b = señal(3, 0.004); aplauso(b, 1, 0.5); prueba("un solo aplauso", b, false); }
{ const b = señal(3, 0.004); aplauso(b, 1, 0.5); aplauso(b, 1.06, 0.5); prueba("dos golpes casi juntos (60 ms)", b, false); }
{ const b = señal(4, 0.004); aplauso(b, 1, 0.5); aplauso(b, 2.1, 0.5); prueba("dos aplausos con 1,1 s de pausa", b, false); }
{ const b = señal(5, 0.004); [0.8, 1.4, 2.0, 2.6, 3.2].forEach(t => aplauso(b, t, 0.4)); prueba("aplausos seguidos cada 0,6 s (tren) — el primer par sí cuenta", b, true); }
{ const b = señal(5, 0.004); [1.0, 1.3, 1.6, 1.9, 2.2].forEach(t => golpeGrave(b, t, 0.5)); prueba("golpes graves (mesa, caja)", b, false); }
{ const b = señal(4, 0.004); golpeMetal(b, 1, 0.5); golpeMetal(b, 1.4, 0.5); prueba("metal que suena", b, false); }
{ const b = señal(5, 0.004); silaba(b, 0.3, 0.15); silaba(b, 0.65, 0.15); silaba(b, 1.0, 0.15); silaba(b, 1.4, 0.2, 180); prueba("«ta ta ta ta» hablado", b, false); }
{ for (const amp of [0.1, 0.25, 0.4]) { const b = señal(6, 0.004); let t = 0.3; for (let i = 0; i < 12; i++) { silaba(b, t, amp, 110 + (i * 37) % 90); t += 0.22 + 0.05 * ((i * 7) % 4); } prueba("frase hablada fuerte amp=" + amp, b, false); } }
{ const b = señal(5, 0.004); fricativa(b, 0.5, 0.3, 0.2); fricativa(b, 1.2, 0.25, 0.2); silaba(b, 2, 0.2); prueba("«s s» fricativas", b, false); }
{ const b = señal(5, 0.004); ta(b, 1.0); ta(b, 1.5); ta(b, 2.0); prueba("el «ta» de Rex", b, false); }
{ const b = señal(5, 0.004); for (let t = 0.5; t < 4.5; t += 0.5) ta(b, t); prueba("avisos de Rex seguidos", b, false); }
{ const b = señal(8, 0.006); musica(b, 0.15); prueba("música sola, fuerte", b, false); }
{ const b = señal(6, 0.03); prueba("ruido de fondo fuerte, sin aplausos", b, false); }
{ const b = señal(6, 0.0003); prueba("silencio", b, false); }
{ const b = señal(6, 0.004); for (let t = 0.5; t < 5; t += 0.5) aplauso(b, t, 0.3, 0.004); prueba("martilleo regular de clavos (golpes cortos cada 0,5 s) — el primer par cuenta como aplauso", b, true); }
{ const b = señal(6, 0.004); for (let t = 0.5; t < 5; t += 0.5) golpeGrave(b, t, 0.6); prueba("martillazos graves regulares", b, false); }
// mucho tiempo sin eventos: el detector sigue vivo
{ const b = señal(40, 0.004); musica(b, 0.02); aplauso(b, 38, 0.5); aplauso(b, 38.35, 0.5); prueba("después de mucho rato sigue oyendo", b, true); }
// refractario: un doble aplauso seguido de otro enseguida despierta una sola vez
{ const b = señal(4, 0.004); aplauso(b, 1, 0.5); aplauso(b, 1.35, 0.5); aplauso(b, 1.7, 0.5); aplauso(b, 2.05, 0.5); const r = correr(b); if (r.length === 1) bien++; else { mal++; console.log("MAL: despertó", r.length, "veces seguidas"); } }
// latencia: despierta casi en el segundo aplauso (menos de 120 ms después)
{ const b = señal(3, 0.004); aplauso(b, 1, 0.5); aplauso(b, 1.35, 0.5); const r = correr(b); if (r.length === 1 && r[0] - 1350 < 160) bien++; else { mal++; console.log("MAL: tardó", r, "ms (segundo aplauso en 1350)"); } }


// ---- al azar: 150 frases habladas (sílabas con y sin consonante explosiva, vocales, fricativas, a distintos volúmenes) no despiertan nunca ----
{
  let falsos = 0;
  for (let q = 0; q < 150; q++) {
    const b = señal(5, [0.001, 0.004, 0.012][q % 3]); let t = 0.2 + Math.abs(rnd()) * 0.3; const amp = 0.05 + Math.abs(rnd()) * 0.4, f0 = 90 + Math.abs(rnd()) * 160;
    while (t < 4.3) {
      const k = Math.abs(rnd());
      if (k < 0.55) silaba(b, t, amp * (0.6 + Math.abs(rnd()) * 0.6), f0 * (0.9 + Math.abs(rnd()) * 0.3));
      else if (k < 0.8) vocal(b, t, 0.12 + Math.abs(rnd()) * 0.2, amp, f0);
      else fricativa(b, t, 0.1 + Math.abs(rnd()) * 0.15, amp * 0.5);
      t += 0.18 + Math.abs(rnd()) * 0.35;
    }
    if (correr(b).length) falsos++;
  }
  if (falsos === 0) bien++; else { mal++; console.log("MAL: voz hablada despertó a Rex en", falsos, "de 150 frases"); }
}
// ---- al azar: 150 dobles aplausos con distinta fuerza, pausa y fondo despiertan siempre ----
{
  let perdidos = 0;
  for (let q = 0; q < 150; q++) {
    const fondo = [0.001, 0.004, 0.012][q % 3], b = señal(3.5, fondo), amp = 0.3 + Math.abs(rnd()) * 0.7, gap = 0.16 + Math.abs(rnd()) * 0.55, t0 = 0.8 + Math.abs(rnd()) * 1.2, tau = 0.006 + Math.abs(rnd()) * 0.018;
    if (q % 4 === 0) musica(b, 0.01 + Math.abs(rnd()) * 0.02);
    aplauso(b, t0, amp, tau); aplauso(b, t0 + gap, amp * (0.6 + Math.abs(rnd()) * 0.8), tau);
    if (!correr(b).length) perdidos++;
  }
  if (perdidos <= 3) bien++; else { mal++; console.log("MAL: no despertó en", perdidos, "de 150 dobles aplausos"); }
}

console.log(bien + " bien, " + mal + " mal");
process.exit(mal ? 1 : 0);
