// Ninguna frase debe romper la página: el intérprete y el plan reciben miles de frases raras (preguntas, nombres, mezclas, cortadas)
// en los tres lugares y no pueden lanzar errores. node tests/sinchoques.test.js [semilla] [cantidad]
// (30-oct-2026: «qué hizo Saúl hoy» rompía el plan de producción sin producto)
const V = require("../src/parser.js"), E = require("../src/engine.js"), A = require("../src/acciones.js"), S = require("../src/sim.js");
let seed = Number(process.argv[2] || 7); const N = Number(process.argv[3] || 6000);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, pick = a => a[Math.floor(rnd() * a.length)];
const st = S.estadoDemo(); E.abrirDia(st, { por: "x" });
const INI = ["", "qué ", "que ", "quién ", "cuánto ", "cuántas ", "cuándo ", "dónde ", "cómo ", "por qué ", "dime ", "dame ", "me puedes decir ", "oye ", "no, ", "mejor ", "y ", "pero ", "sabes si ", "hay ", "ya ", "eh "];
const VERB = ["hizo", "llevó", "movió", "registró", "preparó", "vendió", "pidió", "mandó", "falta", "queda", "quedan", "hay", "tenemos", "eran", "fueron", "cambia", "corrige", "lleva", "pasa", "prepara", "se dañó", "llegó", "llegaron", "cuenta", "hicimos", "vendimos", ""];
const COSA = ["Saúl", "Marcela", "Andrés", "Julia", "Beatriz", "la frutilla", "leche", "dos baldes", "tres cajas de leche", "todo", "de todo", "crema reex", "chocolate", "el local", "producción", "la bodega", "hoy", "ayer", "esta semana", "los movimientos", "un resumen", "lo de antes", "tres", "medio", "una tanda", "el pedido", "lo que pidió el local", "nada", ""];
const FIN = ["", " hoy", " ayer", " en producción", " al local", " en bodega", " por favor", " Rex", " gracias", "?", " o no", " también"];
let ok = 0, mal = 0; const malas = [];
for (let i = 0; i < N; i++) {
  const f = (pick(INI) + pick(VERB) + " " + pick(COSA) + (rnd() < 0.4 ? " " + pick(COSA) : "") + pick(FIN)).replace(/\s+/g, " ").trim();
  for (const l of ["B", "P", "L"]) {
    try { const R = V.interpretar(f, { lugar: l, cat: st.cat }); A.planificar(st, R, { lugar: l }); ok++; }
    catch (e) { mal++; if (malas.length < 15) malas.push(l + " «" + f + "»: " + e.message); }
  }
}
console.log(ok + " bien, " + mal + " mal");
malas.forEach(x => console.log(" · " + x));
process.exitCode = mal ? 1 : 0;
