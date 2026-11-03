// «No se acepta» (3-nov-2026, Freddy: «no se acepta el pedido porque no llegó, no está completo… devolver, no se registra, no se recibe…»)
// Miles de frases al azar en las 6 direcciones: Rex tiene que reconocer que NO se acepta lo que llegó, y por qué. Y lo que sí se acepta
// (o es una novedad que se registra) no se puede confundir con un rechazo.        node tests/rechazos.test.js [semilla] [cantidad]
const V = require("../src/parser.js");
let semilla = +process.argv[2] || 7; const N = +process.argv[3] || 6000;
const rnd = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
const una = a => a[Math.floor(rnd() * a.length)];
const LUG = { B: ["la bodega", "bodega"], P: ["producción", "la cocina"], L: ["el local", "la tienda"] };
const RUTAS = [["B", "P"], ["B", "L"], ["P", "L"], ["P", "B"], ["L", "P"], ["L", "B"]];
const PROD = [["banano", "racimos", "racimo", "m"], ["frutilla", "baldes", "balde", "m"], ["durazno", "latas", "lata", "f"], ["leche", "cajas", "caja", "f"], ["leche en polvo", "fundas", "funda", "f"], ["chantilly", "fundas", "funda", "f"], ["mora", "canastos", "canasto", "m"], ["azúcar", "sacos", "saco", "m"]];
const NUM = ["dos", "tres", "cuatro", "2", "3", "5"];
const REJ = ["no se acepta", "no se acepta el pedido", "no acepto", "no lo acepto", "no aceptamos el envío", "no se acepta el envío", "rechazo el pedido", "se rechaza",
  "rechazado", "no se recibe", "no lo recibo", "no recibimos esto", "no se registra", "devuélvelo", "que se devuelva", "devuélvelo a {de}", "regrésalo a {de}",
  "no se acepta, que regrese a {de}", "no, no se acepta", "eso no lo acepto", "no lo quiero, devuélvanlo", "lo rechazamos"];
const MOT = {
  no_llego: ["no llegó", "no llegó nada", "no ha llegado", "nunca llegó", "las {n} {emps} de {p} no llegaron", "no vino nada", "no se recibió nada"],
  incompleto: ["no está completo", "llegó incompleto", "faltó una {emp}", "solo llegó la mitad", "llegaron solo {n} {emps}", "faltan {n} {emps}"],
  mal_estado: ["venía abierta una {emp}", "el {p} está podrido", "llegaron golpeadas", "está dañado", "las {emps} vinieron mojadas", "venía en mal estado"],
  no_enviado: ["no se envió el producto", "no lo mandaron", "nunca salió de {de}", "no se despachó"]
};
const CANCEL = ["cancela el pedido porque {m}", "anula el envío porque {m}", "cancelar porque {m}", "cancélalo porque {m}"];
let ok = 0, mal = 0; const malos = [];
const llena = (x, r, pr) => x.replace("{de}", una(LUG[r[0]])).replace("{n}", una(NUM)).replace("{emps}", pr[1]).replace("{emp}", pr[2]).replace("{p}", pr[0]);
for (let i = 0; i < N; i++) {
  const r = una(RUTAS), pr = una(PROD), causa = una(Object.keys(MOT)), m = llena(una(MOT[causa]), r, pr);
  const forma = rnd();
  let f, conCausa = true;
  if (forma < 0.45) f = llena(una(REJ), r, pr) + una([" porque ", " porque ", ", ", " ya que "]) + m;
  else if (forma < 0.65) f = m + una([", no se acepta", ". No se acepta el pedido", ", así que no lo acepto", ", devuélvelo", ", no se recibe", ", se rechaza"]);
  else if (forma < 0.8) f = llena(una(CANCEL), r, pr).replace("{m}", m);
  else { f = llena(una(REJ), r, pr); conCausa = false; }
  f = una(["", "", "oye Rex ", "mira, ", "no, ", "bueno, "]) + f + una(["", "", " en " + una(LUG[r[1]]), " por favor"]);
  const x = V.rechazoLlegada(f);
  const bien = !!x && (!conCausa || x.causa === causa || (x.causa !== "otro" && causa === "no_llego" && x.causa === "no_enviado"));
  if (bien) ok++; else { mal++; if (malos.length < 25) malos.push("✗ «" + f + "» → " + JSON.stringify(x) + (conCausa ? " (esperaba " + causa + ")" : "")); }
}
// lo que NO es un rechazo
const ACEPTA = ["sí se acepta", "se acepta", "lo acepto", "sí, llegó todo bien", "llegó completo", "no hay ninguna novedad", "se acepta aunque venía abierta una caja",
  "sí, recibido", "todo bien", "no, todo bien", "faltó una caja", "llegaron solo dos cajas", "no llegó nada", "la frutilla llegó pequeña", "sí, de acuerdo", "no",
  "no hay observaciones", "sí, el pedido está correcto", "aceptado", "se recibe con observación, una lata golpeada", "llegó bien aunque el banano está muy maduro",
  "Andrés", "gracias Rex", "oye Rex lleva dos baldes de frutilla a producción", "devuélveme la llamada"];
for (const f of ACEPTA) { const x = V.rechazoLlegada(f); if (!x) ok++; else { mal++; malos.push("✗ no es rechazo: «" + f + "» → " + JSON.stringify(x)); } }
console.log(malos.join("\n"));
console.log("rechazos: " + ok + "/" + (ok + mal) + " bien, " + mal + " mal");
process.exit(mal ? 1 : 0);
