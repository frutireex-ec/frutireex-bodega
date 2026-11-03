/* Frutireex · Rex — detector de doble aplauso (para despertar a Rex sin hablar).
   Solo mira el volumen del micrófono (cada 10 ms) y qué tan «chispeante» es el sonido; no entiende palabras y no guarda ni envía audio.
   Un aplauso es un golpe seco: sube de golpe, es de sonido agudo (no un golpe grave, no una voz) y se apaga en menos de ~120 ms,
   sin que sigan sonidos después (una voz sigue con la vocal). Dos aplausos seguidos, con una pausa de entre 0,13 y 0,75 s y sin otros
   golpes justo antes (un martillazo repetido no cuenta), despiertan a Rex.
   Este archivo es de la página y también se prueba con node (tests/aplauso.test.js). */
(function (root) {
  "use strict";

  /* Medidas de un bloque de audio de 10 ms: volumen (rms) y «agudez» (hf = energía de la diferencia entre muestras / energía total:
     ~1 en ruido blanco, ~0,02 en un tono grave o un golpe sordo, 0,05–0,2 en una voz). */
  function rasgos(x) {
    let s2 = 0, d2 = 0, prev = x.length ? x[0] : 0;
    for (let i = 0; i < x.length; i++) { const v = x[i]; s2 += v * v; const d = v - prev; d2 += d * d; prev = v; }
    return { rms: Math.sqrt(s2 / (x.length || 1)), hf: s2 > 1e-12 ? d2 / (2 * s2) : 0 };
  }

  const SENS = {   // cuánto debe sobresalir un aplauso: volumen mínimo de un bloque de 10 ms y cuántas veces el ruido de fondo
    alta: { abs: 0.015, mult: 4 },
    media: { abs: 0.03, mult: 6 },
    baja: { abs: 0.07, mult: 10 }
  };

  /* Detector. frame(rms, hf, t_ms) → true en el instante en que se completa el segundo aplauso. */
  function crear(op) {
    op = Object.assign({ sens: "media", subida: 4, hfMin: 0.28, durMax: 10, n50Max: 4, calma: 6, gapMin: 130, gapMax: 750, aislado: 800, refractario: 2200, ratioMin: 0.2, ratioMax: 5 }, op || {});
    const S = SENS[op.sens] || SENS.media, ABS = op.abs != null ? op.abs : S.abs, MULT = op.mult != null ? op.mult : S.mult;
    let fondo = 0.004, h = [0, 0, 0, 0], r = null, ev = [], hasta = 0, bloqueo = false;
    const api = {
      get fondo() { return fondo; },
      reiniciar() { ev = []; r = null; bloqueo = false; hasta = 0; },
      frame(rms, hf, t) {
        const pre = (h[0] + h[1] + h[2]) / 3;   // los 30 ms de antes
        let sale = false;
        if (r) {
          r.n++; r.v.push(rms); if (rms > r.pico) r.pico = rms;
          if (r.n <= 4) { r.hfSum += hf; r.hfN++; }
          if (r.fase === "baja") {   // ya bajó: tiene que seguir bajo unos 60 ms (una voz seguiría con la vocal)
            if (rms > r.pico * 0.4) { r = null; bloqueo = true; }
            else if (--r.faltan <= 0) {
              const hfm = r.hfSum / Math.max(1, r.hfN), n50 = r.v.filter(x => x >= r.pico * 0.5).length, e = { t: r.t0, pico: r.pico, n: r.n, hf: hfm, n50 }; if (op.log) op.log(e);
              r = null;
              if (hfm >= op.hfMin && n50 <= op.n50Max) sale = nuevo(e);   // agudo y seco: no una voz, no un golpe grave, no un siseo largo
            }
          } else if (rms < r.pico * 0.3) { if (r.n - 1 <= op.durMax) { r.fase = "baja"; r.faltan = op.calma; } else { r = null; bloqueo = true; } }
          else if (r.n > op.durMax + 8) { r = null; bloqueo = true; }   // dura demasiado: no es un aplauso
        } else {
          if (bloqueo) { if (rms < Math.max(ABS * 0.6, fondo * 2.5)) bloqueo = false; }
          else if (rms > Math.max(ABS, fondo * MULT) * (ev.length && t - ev[ev.length - 1].t <= op.gapMax + 120 ? 0.65 : 1) && rms > Math.max(pre, 0.0005) * op.subida && t >= hasta) r = { t0: t, pico: rms, n: 1, v: [rms], hfSum: hf, hfN: 1, fase: "sube", faltan: 0 };
        }
        // el ruido de fondo se va acomodando lento; los golpes no lo suben
        if (!r) fondo = Math.max(0.0015, fondo + (Math.min(rms, fondo * 4) - fondo) * 0.007);
        h = [h[1], h[2], h[3], rms];
        return sale;
      }
    };
    function nuevo(e) {
      ev = ev.filter(x => e.t - x.t < 3000);
      const ult = ev[ev.length - 1];
      if (ult) {
        const gap = e.t - ult.t, antes = ev[ev.length - 2], rat = e.pico / Math.max(ult.pico, 1e-6);
        const aislado = !antes || ult.t - antes.t > op.aislado;
        if (gap >= op.gapMin && gap <= op.gapMax && rat >= op.ratioMin && rat <= op.ratioMax && aislado) { ev = []; hasta = e.t + op.refractario; return true; }
      }
      ev.push(e); return false;
    }
    return api;
  }

  const API = { rasgos, crear, SENS };
  root.FRX_APLAUSO = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
