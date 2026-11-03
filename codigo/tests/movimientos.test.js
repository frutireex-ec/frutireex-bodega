// Todos los movimientos entre los tres lugares (31-oct-2026, pedido de Freddy): bodega↔producción, bodega↔local, producción↔local,
// con cada producto que va en esos dos lugares, dicho de muchas formas y desde cualquier lugar. Se interpreta, se planifica, se registra
// y se revisa el stock y el envío en camino.   node tests/movimientos.test.js
const V = require("../src/parser.js"), E = require("../src/engine.js"), A = require("../src/acciones.js"), S = require("../src/sim.js");
let ok = 0, mal = 0; const fallos = [], porRuta = {};
const LUGS = ["B", "P", "L"];
const NOM = { B: "bodega", P: "producción", L: "local" };
const DE = { B: ["de la bodega", "desde la bodega", "de bodega"], P: ["de producción", "desde producción", "de la producción"], L: ["del local", "desde el local"] };
const A_ = { B: ["a la bodega", "para la bodega", "a bodega"], P: ["a producción", "para producción", "a la producción"], L: ["al local", "para el local"] };
// cómo se dice cada producto (lo que diría el equipo)
const DICHO = { frutilla: "frutilla", durazno: "durazno", banano: "banano", mora: "mora", chantilly: "chantilly", leche: "leche", leche_polvo: "leche en polvo", condensada: "leche condensada",
  azucar_imp: "azúcar impalpable", azucar: "azúcar", vainilla: "vainilla", huevos: "huevos", choco_negro: "cobertura", choco_blanco: "chocolate blanco", oreo: "oreo", grageas: "grageas",
  masmelos: "masmelos", coco: "coco", mani: "maní", nuez: "nuez", granola: "granola", tajin: "tajín", chamoy: "chamoy", gusanitos: "gusanitos", vaso9: "vasos pequeños", vaso12: "vasos grandes",
  tapa: "tapas", bandeja: "bandejas", tarro_godzilla: "tarros", tenedor: "cucharas", tenedor_blanco: "tenedores blancos", funda_tenedor: "fundas para tenedores", servilleta: "servilletas",
  funda_delivery: "fundas de delivery", funda_deliv_peq: "fundas delivery pequeñas", funda_deliv_med: "fundas delivery medianas", masking: "masking", rollo_impresora: "rollos de impresora",
  trapos: "trapos", funda_basura_g: "fundas de basura grandes", funda_basura_p: "fundas de basura pequeñas", cloro: "cloro" };
const plural = e => /[aeiou]$/.test(e) ? e + "s" : e.replace(/ón$/, "on") + "es";
const femenino = e => /(a|dad)$/.test(e);
const NUMS = [[1, null], [2, "dos"], [3, "tres"], [4, "cuatro"], [5, "cinco"], [2, "2"], [3, "3"]];
const VERBOS = ["lleva", "pasa", "manda", "mueve", "envía", "llévate", "por favor lleva", "necesito llevar", "mándale", "pásale"];
let semilla = 7; const rnd = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };
const uno = a => a[Math.floor(rnd() * a.length)];
function nuevo() {
  const st = S.estadoDemo(); E.abrirDia(st, { por: "x" });
  for (const l of LUGS) for (const id of Object.keys(st.cat.prods)) { st.stock[l][id] = 1e6; st.lotes[l][id] = [{ q: 1e6, f: st.dia || E.fechaDe(Date.now()) }]; }
  return st;
}
function caso(de, a, id, frase, lugar, qEsp) {
  const k = de + "→" + a; porRuta[k] = porRuta[k] || { ok: 0, mal: 0 };
  const st = nuevo();
  let R, pl, r, err = null;
  try {
    R = V.interpretar(frase, { lugar, cat: st.cat });
    pl = A.planificar(st, R, { lugar });
    if (pl.tipo !== "traslado") err = "tipo " + pl.tipo + (pl.bloqueo ? " (" + pl.bloqueo + ")" : "");
    else if (pl.de !== de) err = "sale de " + pl.de;
    else if (!pl.items.length || pl.items.some(x => (x.a || pl.a) !== a)) err = "va a " + pl.items.map(x => x.a || pl.a).join(",");
    else if (pl.items.length !== 1 || pl.items[0].p !== id) err = "productos " + pl.items.map(x => x.p).join(",");
    else if (Math.abs(pl.items[0].q - qEsp) > 0.01) err = "cantidad " + pl.items[0].q + " (esperaba " + qEsp + ")";
    else if (pl.bloqueo) err = "bloqueo: " + pl.bloqueo;
    if (!err) {
      const antes = E.stockDe(st, de, id), nTr = st.transito.length;
      r = A.ejecutar(st, pl, { por: "Ana", via: "voz", frase });
      if (!r.ok) err = "no se registró: " + r.msg;
      else {
        const despues = E.stockDe(st, de, id);
        if (Math.abs(antes - despues - qEsp) > 0.01) err = "stock " + NOM[de] + " bajó " + (antes - despues);
        else if (st.transito.length !== nTr + 1 && !(a === "B" || r.recepcion)) err = "no quedó en camino";
        else { const tr = st.transito[st.transito.length - 1]; if (tr && (tr.de !== de || tr.a !== a)) err = "en camino " + tr.de + "→" + tr.a; }
      }
    }
  } catch (e) { err = "EXC " + e.message; }
  if (err) { mal++; porRuta[k].mal++; if (fallos.length < 120) fallos.push("✗ [" + NOM[lugar] + "] «" + frase + "» " + k + " " + id + ": " + err); }
  else { ok++; porRuta[k].ok++; }
}
for (const de of LUGS) for (const a of LUGS) {
  if (de === a) continue;
  const prods = Object.keys(DICHO).filter(id => { const p = S.estadoDemo().cat.prods[id]; return p && (p.en || LUGS).includes(de) && (p.en || LUGS).includes(a) && (p.e || []).length; });
  for (const id of prods) {
    const p = S.estadoDemo().cat.prods[id];
    for (const [emp, fac] of p.e.slice(0, 2)) {
      for (const [n, dicho] of NUMS) {
        const qtxt = n === 1 ? (femenino(emp) ? "una" : "un") : dicho, u = n === 1 ? emp : plural(emp);
        const cant = qtxt + " " + u + " de " + DICHO[id], qEsp = Math.round(n * fac * 1000) / 1000;
        const v = uno(VERBOS), d = uno(DE[de]), dest = uno(A_[a]);
        // 1) completa, dicha desde cualquiera de los tres lugares
        for (const lugar of LUGS) caso(de, a, id, v + " " + cant + " " + d + " " + dest, lugar, qEsp);
        // 2) sin decir de dónde, dicha en el lugar de origen
        caso(de, a, id, uno(VERBOS) + " " + cant + " " + dest, de, qEsp);
        // 3) el destino primero: «mándale a producción dos baldes de frutilla»
        caso(de, a, id, uno(["mándale", "envía", "lleva"]) + " " + dest + " " + cant, de, qEsp);
        // 4) «devuelve / regresa» cuando vuelve a la bodega o del local a producción
        if (a === "B" || (de === "L" && a === "P")) caso(de, a, id, uno(["devuelve", "regresa"]) + " " + cant + " " + d + " " + dest, uno(LUGS), qEsp);
        // 5) con el lugar al comienzo, como en manos libres: «producción, mueve…» (el lugar que habla es el que se nombra)
        caso(de, a, id, NOM[de] + ", " + uno(VERBOS) + " " + cant + " " + dest, de, qEsp);
      }
    }
  }
}
for (const [k, v] of Object.entries(porRuta)) console.log(k.padEnd(5), String(v.ok).padStart(5), "bien", String(v.mal).padStart(4), "mal");
fallos.slice(0, 60).forEach(f => console.log(f));
console.log(`\nmovimientos: ${ok}/${ok + mal} bien, ${mal} mal`);
process.exitCode = mal ? 1 : 0;
