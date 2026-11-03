// «solo un balde», «no, solo mover un balde», «mejor dos cajas» mientras Rex pregunta «¿Deseas mover…?» (31-oct-2026, video 1419).   node tests/corregir.test.js
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/ui.js"), "utf8");
const V = require("../src/parser.js"), E = require("../src/engine.js"), A = require("../src/acciones.js"), S = require("../src/sim.js"), C = require("../src/catalog.js");
const st = S.estadoDemo(); E.abrirDia(st, { por: "x" });
const a = src.indexOf("  function corregirCantidad("), b = src.indexOf("  // una respuesta que no se entendió no borra la pregunta");
const pend = { B: null, P: null, L: null }, LUG = (C.LUGARES || globalThis.FRX_CAT.LUGARES), P = id => E.P(st, id);
const f = new Function("V", "E", "P", "LUG", "st", "pend", src.slice(a, b) + "; return corregirCantidad;")(V, E, P, LUG, st, pend);
let ok = 0, mal = 0; const t = (c, m) => { if (c) ok++; else { mal++; console.log("✗", m); } };
const plan = (l, frase) => A.planificar(st, V.interpretar(frase, { lugar: l, cat: st.cat }), { lugar: l });
pend.B = plan("B", "lleva dos baldes de frutilla a producción");
for (const [frase, q] of [["solo un balde", 11.34], ["solo mover un balde", 11.34], ["no, solo mover un balde", 11.34], ["sí pero solo uno", 11.34], ["mejor tres baldes", 34.02], ["eran tres", 34.02], ["no, que sean tres baldes de frutilla", 34.02], ["solo 5 kilos", 5]]) {
  const nuevo = f("B", frase, V.interpretar(frase, { lugar: "B", cat: st.cat }));
  const R = nuevo && V.interpretar(nuevo, { lugar: "B", cat: st.cat });
  t(R && R.intent === "traslado" && R.de === "B" && R.a === "P" && R.items.length === 1 && R.items[0].p === "frutilla" && Math.abs(R.items[0].q - q) < 0.01, "«" + frase + "» → " + nuevo + " → " + JSON.stringify(R && R.items));
}
for (const frase of ["sí", "no", "dos cajas de leche", "llévalo al local", "cancelar el movimiento", "quién es"]) t(!f("B", frase, V.interpretar(frase, { lugar: "B", cat: st.cat })), "«" + frase + "» no es corregir la cantidad");
// 2-nov-2026: repetir la MISMA cantidad («sí, mueve los dos baldes») es confirmar, no corregir → marca «=»
for (const frase of ["sí, mueve los dos baldes", "sí, lleva los dos baldes", "mueve los dos baldes"]) { const r = f("B", frase, V.interpretar(frase, { lugar: "B", cat: st.cat })); t(typeof r === "string" && r[0] === "=", "«" + frase + "» es confirmar (misma cantidad): " + r); }
// entradas (1-nov-2026): «¿Entraron 5 canastos de mora a la bodega?» → «no, corregir, entraron solo 3 canastos»
pend.B = plan("B", "entraron 5 canastos de mora a bodega");
t(pend.B.tipo === "compra" && Math.abs(pend.B.items[0].q - 5 * 4.536) < 0.01, "la entrada de 5 canastos de mora se planifica: " + pend.B.tipo);
t(/^¿Entraron 5 canastos .* de mora a la bodega\? ¿Está correcto\?$/.test(A.pregunta(st, pend.B)), "pregunta «¿Entraron 5 canastos de mora a la bodega? ¿Está correcto?»: " + A.pregunta(st, pend.B));
for (const [frase, q] of [["no, corregir, entraron solo 3 canastos", 3 * 4.536], ["no, solo 3", 3 * 4.536], ["solo entraron tres canastos", 3 * 4.536], ["no, fueron 4", 4 * 4.536], ["corrige, llegaron dos canastos", 2 * 4.536]]) {
  const nuevo = f("B", frase, V.interpretar(frase, { lugar: "B", cat: st.cat }));
  const R = nuevo && V.interpretar(nuevo, { lugar: "B", cat: st.cat }), pl2 = R && A.planificar(st, R, { lugar: "B" });
  t(pl2 && pl2.tipo === "compra" && (pl2.a || R.a) === "B" && pl2.items.length === 1 && pl2.items[0].p === "mora" && Math.abs(pl2.items[0].q - q) < 0.01, "entrada «" + frase + "» → " + nuevo + " → " + JSON.stringify(pl2 && pl2.items));
}
console.log(`\n${ok} bien, ${mal} mal`); process.exitCode = mal ? 1 : 0;
