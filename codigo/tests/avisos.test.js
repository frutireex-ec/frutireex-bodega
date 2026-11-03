// Avisos entre lugares (2-nov-2026, Freddy): miles de formas de decir «avisa a todos que…», «notifica al local que…», «estamos preparando…»,
// «se nos está acabando…», «se dañó la licuadora», y lo que NO es un aviso (órdenes con cantidad, mermas, preguntas).
// node tests/avisos.test.js [semilla] [cantidad]
const V = require("../src/parser.js"), S = require("../src/sim.js");
const st = S.estadoDemo();
let semilla = +(process.argv[2] || 7); const N = +(process.argv[3] || 6000);
const rnd = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };
const uno = a => a[Math.floor(rnd() * a.length)];
const LL = ["oye Rex ", "Rex, ", "oye Rex por favor ", "", "ey Rex ", "oye pues Rex "];
const VERBOS = ["avisa", "avísale", "avísales", "notifica", "notifícale", "notificar", "informa", "infórmales", "comunica", "dile", "diles", "pon en conocimiento", "poner en conocimiento", "hazles saber", "pon al tanto", "anuncia", "deja un aviso", "manda un mensaje", "alerta"];
const DEST = [["a todos", "todos"], ["a todo el equipo", "todos"], ["a todo el mundo", "todos"], ["al local", ["L"]], ["a producción", ["P"]], ["a la bodega", ["B"]], ["a la cocina", ["P"]],
  ["al local y a producción", ["L", "P"]], ["a producción y a la bodega", ["P", "B"]], ["", "todos"], ["de todos", "todos"], ["para todos", "todos"], ["para el local", ["L"]]];
const PROD = ["la leche", "la frutilla", "la crema", "el azúcar", "los huevos", "las tapas", "la granola", "el chantilly", "las servilletas", "el durazno"];
const MSG = [p => "nos estamos quedando sin " + p.replace(/^(la|el|los|las) /, ""), p => p + " ya va en camino", p => p + " ya está lista", p => "se está acabando " + p,
  p => "estamos preparando " + p.replace(/^(la|el|los|las) /, ""), () => "llegó el proveedor", () => "mañana cerramos más temprano", () => "se dañó la licuadora", () => "no hay luz en el local",
  p => "necesitamos " + p.replace(/^(la|el|los|las) /, ""), () => "hoy viene el supervisor", p => "ya casi no queda " + p.replace(/^(la|el|los|las) /, ""), () => "la refri no enfría"];
const SOLO = [["nos estamos quedando sin leche", "alto"], ["se nos está acabando la frutilla", "alto"], ["estamos preparando 5 kilos de crema", "normal"], ["se está preparando crema", "normal"],
  ["la crema ya está lista", "normal"], ["la crema ya va en camino", "normal"], ["ya casi está la crema", "normal"], ["la crema está por terminar", "normal"], ["se dañó la licuadora", "alarma"],
  ["no hay luz", "alarma"], ["la refri no enfría", "alarma"], ["se fue el agua", "alarma"], ["hay una fuga de gas", "alarma"], ["la congeladora no congela", "alarma"], ["quedan pocas tapas", "alto"],
  ["estamos cortos de servilletas", "alto"], ["ya mismo se acaba la granola", "alto"], ["la leche está por acabarse", "alto"], ["ya no queda mucha frutilla", "alto"]];
// lo que no es un aviso: órdenes con cantidad, mermas, preguntas, sí/no
const NO_AVISO = ["lleva dos baldes de frutilla a producción", "dile a producción que me mande 2 baldes de frutilla", "se cayó un balde de frutilla", "se dañaron 2 cajas de leche",
  "rex en producción se dañó un kilo de frutilla", "qué avisos hay", "qué falta", "sí", "no", "necesito 3 baldes de frutilla", "preparamos 2 tandas de crema", "vamos a preparar 5 kilos de crema",
  "entraron 10 baldes de frutilla", "hay 3 cajas de leche", "por qué el pedido todavía sigue sin despacharse", "lleva la crema que ya está lista al local", "manda 2 cajas de leche al local"];
let ok = 0, mal = 0; const fallos = [];
const falla = (f, m) => { mal++; if (fallos.length < 40) fallos.push("✗ «" + f + "» → " + m); };
for (let i = 0; i < N; i++) {
  const [d, para] = uno(DEST), p = uno(PROD), m = uno(MSG)(p), f = uno(LL) + uno(VERBOS) + (d ? " " + d : "") + uno([" que ", " de que ", ", ", " "]) + m;
  const R = V.interpretar(f, { lugar: uno(["B", "P", "L"]), cat: st.cat });
  if (R.intent !== "aviso") { falla(f, R.intent); continue; }
  const pOk = para === "todos" ? R.aviso.para === "todos" : JSON.stringify(Array.isArray(R.aviso.para) ? R.aviso.para.slice().sort() : R.aviso.para) === JSON.stringify(para.slice().sort());
  const tOk = V.normalizar(R.aviso.texto).replace(/[,.]/g, "") === V.normalizar(m).replace(/[,.]/g, "");
  if (pOk && tOk) ok++; else falla(f, JSON.stringify({ para: R.aviso.para, texto: R.aviso.texto }));
}
for (const [f, nivel] of SOLO) for (const ll of LL) { const R = V.interpretar(ll + f, { lugar: "P", cat: st.cat }); if (R.intent === "aviso" && R.aviso.nivel === nivel) ok++; else falla(ll + f, R.intent + " " + (R.aviso && R.aviso.nivel)); }
for (const f of NO_AVISO) for (const ll of LL) { const R = V.interpretar(ll + f, { lugar: "B", cat: st.cat }); if (R.intent !== "aviso") ok++; else falla(ll + f, "aviso (no debía): " + JSON.stringify(R.aviso)); }
fallos.forEach(x => console.log(x));
console.log("\navisos: " + ok + "/" + (ok + mal) + " bien, " + mal + " mal");
process.exit(mal ? 1 : 0);
