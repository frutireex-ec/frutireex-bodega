// Lo que escribe Whisper (el oído de Rex en la PC, 3-nov-2026): frases tal como salieron del servidor y del banco de voces,
// y lo que Rex tiene que entender.      node tests/whisper.test.js
const V = require("../src/parser.js"), S = require("../src/sim.js");
const st = S.estadoDemo(); let ok = 0, bad = 0;
const quitaRex = x => x.replace(/^\s*(oye|hoy|oyer|poyer|puelle|voy a)?[,\s]*(rex)?[,.\s]*/i, "");
const orden = (f, lugar, intent, p, q, a) => {
  const R = V.interpretar(quitaRex(f), { lugar: lugar || "B", cat: st.cat }); const it = (R.items || [])[0] || {};
  const bien = R.intent === intent && (!p || it.p === p) && (q == null || Math.abs((it.q || 0) - q) < 0.01) && (!a || R.a === a);
  if (bien) ok++; else { bad++; console.log("✗", f, "→", R.intent, JSON.stringify((R.items || []).map(x => [x.p, x.q])), R.a, "esperaba", intent, p, q, a); }
};
const sino = (f, r, opc) => { const x = V.siNo(f, opc); if (x && x.r === r) ok++; else { bad++; console.log("✗ sí/no", f, "→", JSON.stringify(x), "esperaba", r); } };
orden("Oye Rex, llevados valdes de frutilla de bodera producción.", "B", "traslado", "frutilla", 22.68, "P");
orden("Puelle Rex, llevados baldes de frutilla de bolera producción.", "B", "traslado", "frutilla", 22.68, "P");
orden("Lleva dos baldes de frutilla de bodera producción.", "B", "traslado", "frutilla", 22.68, "P");
orden("Oye Rex, lleva dos baldes de frutilla de bodega a producción.", "B", "traslado", "frutilla", 22.68, "P");
orden("Mover, dos baldes más de frutilla de producción a local.", "P", "traslado", "frutilla", 22.68, "L");
orden("Oye Rex, manda tres gelatas de durazno de bodega al local.", "B", "traslado", "durazno", 9, "L");
orden("Oye Rex, manda tres láptas de durazno de bodega al local.", "B", "traslado", "durazno", 9, "L");
orden("Oye Rex, entraron 10 baldes de frutilla.", "B", "entrada", "frutilla", 113.4);
orden("Poyer Rex, entraron 10 baldes de frutilla.", "B", "entrada", "frutilla", 113.4);
orden("Oye Rex, avisa a todos que nos estamos quedando sin leche.", "B", "aviso");
orden("Oye Rex, daño la licuadora.", "B", "aviso");
orden("Porque el período todavía sigue sin despacharse.", "P", "estado");
sino("Sí, de acuerdo.", "si"); sino("Si, de acuerdo.", "si"); sino("Sí, te acuerdo.", "si"); sino("acuerdo.", "si");
sino("Sí, correcto.", "si"); sino("Concuerdos", "si"); sino("Con acuerdo.", "si"); sino("Concuerdo.", "si"); sino("Sí.", "si"); sino("No.", "no");
sino("Llegó todo bien.", "si", { llegada: true }); sino("No hay ninguna novedad.", "si", { llegada: true });
{ const R = V.interpretar("Porque el período todavía sigue sin despacharse.", { lugar: "P", cat: st.cat }); if (R.estado === "porque") ok++; else { bad++; console.log("✗ «período» → pedido:", R.intent, R.estado); } }
{ const R = V.interpretar("daño la licuadora.", { lugar: "B", cat: st.cat }); if (R.aviso && R.aviso.nivel === "alarma" && /daño/.test(R.aviso.texto)) ok++; else { bad++; console.log("✗ «daño la licuadora»:", JSON.stringify(R.aviso)); } }
console.log("whisper:", ok, "bien,", bad, "mal");
process.exit(bad ? 1 : 0);
