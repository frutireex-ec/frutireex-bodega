// Lo que ENTRA a la bodega (del proveedor), dicho de muchas formas (31-oct-2026, Freddy: «registrar en bodega el ingreso de 5 o 10 baldes de frutilla»,
// «ingresar el paquete de 5 cajas de latas de durazno»). La bodega es el inventario: de ahí se reparte a producción y al local.
// node tests/entradas.test.js [semilla] [cantidad]
const V = require("../src/parser.js"), E = require("../src/engine.js"), A = require("../src/acciones.js"), S = require("../src/sim.js");
let semilla = +(process.argv[2] || 21); const N = +(process.argv[3] || 10000);
const rnd = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };
const uno = a => a[Math.floor(rnd() * a.length)];
const base = S.estadoDemo(); E.abrirDia(base, { por: "x" });
const PRODS = base.cat.prods;
const DICHO = { frutilla: ["frutilla", "frutillas", "fresa"], durazno: ["durazno", "latas de durazno"], banano: ["banano", "plátano"], mora: ["mora"], chantilly: ["chantilly", "crema chantilly"], leche: ["leche"],
  leche_polvo: ["leche en polvo"], condensada: ["leche condensada", "condensada"], azucar: ["azúcar"], huevos: ["huevos"], choco_negro: ["cobertura"], oreo: ["oreo", "galletas oreo"], granola: ["granola"],
  coco: ["coco"], nuez: ["nuez"], tapa: ["tapas"], servilleta: ["servilletas"], vaso9: ["vasos pequeños"], masking: ["masking"], trapos: ["trapos"], cloro: ["cloro"], grageas: ["grageas"] };
const NUM = [[1, null], [2, "dos"], [3, "tres"], [4, "cuatro"], [5, "cinco"], [6, "seis"], [8, "ocho"], [10, "diez"], [12, "doce"], [15, "quince"], [20, "veinte"], [5, "5"], [10, "10"], [24, "24"]];
const plural = e => /[aeiou]$/.test(e) ? e + "s" : e.replace(/ón$/, "on") + "es";
const fem = e => /(a|dad)$/.test(e);
const VERBOS = ["llegaron {c}", "acaban de llegar {c}", "ingresaron {c}", "ingresa {c}", "ingresar {c}", "registra el ingreso de {c}", "registrar en bodega el ingreso de {c}", "entraron {c}",
  "recibimos {c}", "compramos {c}", "llegó el proveedor con {c}", "nos trajeron {c}", "han llegado {c}", "en bodega ingresaron {c}", "registra la entrada de {c}", "llegaron {c} a la bodega",
  "llegaron {c} del proveedor", "bodega, llegaron {c}", "ingresar el paquete de {c}", "se recibieron {c}",
  // 1-nov-2026: como se habla en la bodega
  "el proveedor dejó {c}", "nos dejaron {c}", "nos entregaron {c}", "llegó el camión con {c}", "descargamos {c}", "acabo de recibir {c}", "nos llegaron {c}", "la proveedora dejó {c}",
  "entraron {c} a bodega", "oye entraron {c}", "registra {c} que llegaron", "llegó el proveedor con {c}"];
let ok = 0, mal = 0; const fallos = [], porVerbo = {};
const ids = Object.keys(DICHO).filter(id => PRODS[id] && (PRODS[id].e || []).length);
for (let i = 0; i < N; i++) {
  const id = uno(ids), p = PRODS[id], [emp, fac] = p.e[0];
  const [n, w] = uno(NUM); const cant = (n === 1 ? (fem(emp) ? "una" : "un") : w) + " " + (n === 1 ? emp : plural(emp)) + " de " + uno(DICHO[id]);
  const plantilla = uno(VERBOS); let frase = plantilla.replace("{c}", cant);
  if (plantilla.startsWith("ingresar el paquete de") && n === 1) frase = "ingresar el paquete de " + cant;
  const st = S.estadoDemo(); E.abrirDia(st, { por: "x" });
  let err = null, R, pl;
  try {
    R = V.interpretar(frase, { lugar: "B", cat: st.cat });
    pl = A.planificar(st, R, { lugar: "B" });
    const its = (pl.items || []).filter(x => x.p);
    if (pl.tipo !== "compra") err = "tipo " + pl.tipo + (pl.bloqueo ? " (" + pl.bloqueo + ")" : "") + " / " + R.intent;
    else if ((pl.a || R.a) !== "B") err = "entra a " + (pl.a || R.a);
    else if (its.length !== 1 || its[0].p !== id) err = "producto " + its.map(x => x.p).join(",");
    else if (Math.abs(its[0].q - n * fac) > 0.01) err = "cantidad " + its[0].q + " (esperaba " + n * fac + ")";
  } catch (e) { err = "EXC " + e.message; }
  const k = plantilla.replace(" {c}", "").replace("{c} ", "");
  porVerbo[k] = porVerbo[k] || [0, 0];
  if (err) { mal++; porVerbo[k][1]++; if (fallos.length < 50) fallos.push("✗ «" + frase + "» " + err); } else { ok++; porVerbo[k][0]++; }
}
for (const [k, v] of Object.entries(porVerbo)) if (v[1]) console.log(k.padEnd(40), v[0], "bien", v[1], "mal");
fallos.slice(0, 40).forEach(f => console.log(f));
console.log(`\nentradas: ${ok}/${ok + mal} bien, ${mal} mal`);
process.exitCode = mal ? 1 : 0;
