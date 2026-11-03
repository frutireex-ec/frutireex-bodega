// Frases a medias (31-oct-2026, «se corta de golpe y no me deja hablar»): cuáles esperan lo que sigue y qué se pregunta.
// Se prueban las funciones de ui.js (faltaEnOrden, preguntaFalta, armarBorrador) fuera del navegador.   node tests/esperar.test.js
const fs = require("fs"), path = require("path"), raiz = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(raiz, "src/ui.js"), "utf8");
const V = require("../src/parser.js"), E = require("../src/engine.js"), S = require("../src/sim.js"), st = S.estadoDemo();
const a = src.indexOf("  const MOV_BORR ="), b = src.indexOf("  function charlaRex(");
const P = id => E.P(st, id), unaDe = x => x[0];
const F = new Function("V", "st", "E", "P", "unaDe", src.slice(a, b) + "; return { faltaEnOrden, preguntaFalta, armarBorrador, sinArranque };")(V, st, E, P, unaDe);
let ok = 0, mal = 0; const t = (c, m) => { if (c) ok++; else { mal++; console.log("✗", m); } };
const espera = ["bodega, lleva", "bodega, necesito", "necesito llevar una", "manda 3", "manda tres cubetas", "oye rex lleva", "producción, mueve", "devuelve desde el local", "lleva dos baldes de frutilla de", "hay que llevar"];
for (const f of espera) { const r = F.faltaEnOrden(f, "B"); t(r && r.sigue, "debía esperar: «" + f + "» → " + JSON.stringify(r)); }
const sinProd = ["bodega, lleva", "bodega, necesito", "manda 3", "manda tres cubetas", "devuelve desde el local"];
for (const f of sinProd) { const r = F.faltaEnOrden(f, "B"); t(r && r.sinProd, "sin producto: «" + f + "» → " + JSON.stringify(r)); }
const no = ["despacha", "despacha el pedido de producción", "quiero ver el inventario", "necesito saber cuánto hay", "registra", "anota", "lleva dos baldes de frutilla a producción", "sí", "no", "cancela", "lleva todo al local", "gracias rex"];
for (const f of no) { const r = F.faltaEnOrden(f, "B"); t(!r || (!r.sinProd && f !== "despacha" && !/^(si|no|cancela|gracias rex|despacha)$/.test(V.normalizar(f))) , "no debía esperar ni preguntar: «" + f + "» → " + JSON.stringify(r)); }
// «ya está la crema» avisa que se preparó: no espera ni pregunta (r95)
for (const x of ["ya está la crema", "ya está el chocolate", "la crema ya está", "quedó listo el chocolate", "ya terminamos la crema"]) t(!F.faltaEnOrden(x, "P"), "«" + x + "» no espera: " + JSON.stringify(F.faltaEnOrden(x, "P")));
// completa pero sin «a dónde»: espera poquito
t((F.faltaEnOrden("producción, mueve un paquete de trapos", "P") || {}).suave, "sin destino: espera corta");
// sin cantidad: pregunta «¿Cuánto de …?» y la respuesta completa la orden
let f = F.faltaEnOrden("lleva frutilla a producción", "B");
t(f && f.cant && !f.dest && /Cuánto/.test(F.preguntaFalta(f)), "sin cantidad: «¿Cuánto de frutilla?» → " + JSON.stringify(f));
let comb = F.armarBorrador(Object.assign({ txt: "lleva frutilla a producción", l: "B", t: Date.now() }, f), "dos baldes");
let R = V.interpretar(comb, { lugar: "B", cat: st.cat });
t(R.intent === "traslado" && R.a === "P" && R.items[0].p === "frutilla" && Math.abs(R.items[0].q - 22.68) < 0.01, "«dos baldes» completa: " + comb);
f = F.faltaEnOrden("bodega, necesito", "B");
t(/necesitas/.test(F.preguntaFalta(f)), "«bodega, necesito» → «¿qué necesitas?»");
comb = F.armarBorrador(Object.assign({ txt: "bodega, lleva", l: "B", t: Date.now() }, F.faltaEnOrden("bodega, lleva", "B")), "dos baldes de frutilla a producción");
t(comb === "bodega, lleva dos baldes de frutilla a producción", "lo que sigue se junta: " + comb);
// «tres fundas» (empaque de la granola) no es otro producto (campaña con eco, 31-oct)
f = F.faltaEnOrden("por favor lleva granola desde la bodega al local", "B");
comb = F.armarBorrador(Object.assign({ txt: "por favor lleva granola desde la bodega al local", l: "B", t: Date.now() }, f), "tres fundas");
R = comb && V.interpretar(comb, { lugar: "B", cat: st.cat });
t(R && R.items.length === 1 && R.items[0].p === "granola" && R.items[0].q === 3 && R.a === "L", "«tres fundas» completa la granola: " + comb);
comb = F.armarBorrador(Object.assign({ txt: "lleva leche a producción", l: "B", t: Date.now() }, F.faltaEnOrden("lleva leche a producción", "B")), "dos cajas");
R = comb && V.interpretar(comb, { lugar: "B", cat: st.cat });
t(R && R.items[0].p === "leche" && R.items[0].q === 24, "«dos cajas» completa la leche: " + comb);
t(F.armarBorrador(Object.assign({ txt: "lleva frutilla a producción", l: "B", t: 0 }, F.faltaEnOrden("lleva frutilla a producción", "B")), "dos cajas de leche") === null, "otro producto es otra orden");
t(F.armarBorrador(Object.assign({ txt: "lleva frutilla a producción", l: "B", t: 0 }, F.faltaEnOrden("lleva frutilla a producción", "B")), "sí") === null, "un «sí» no completa la orden");
t(F.sinArranque("ayúdame con un movimiento de frutilla a producción") === "lleva frutilla a producción", "«ayúdame con un movimiento de…» → «lleva…»");
console.log(`\n${ok} bien, ${mal} mal`); process.exitCode = mal ? 1 : 0;
