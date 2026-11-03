// Pedidos entre los tres lugares en todos los sentidos, dichos de muchas formas (31-oct-2026, pedido de Freddy):   node tests/pedidos.test.js
const V = require("../src/parser.js"), E = require("../src/engine.js"), A = require("../src/acciones.js"), S = require("../src/sim.js");
let ok = 0, mal = 0; const fallos = [], porRuta = {};
const LUGS = ["B", "P", "L"], NOM = { B: "bodega", P: "producción", L: "local" };
const A_ = { B: ["a la bodega", "a bodega"], P: ["a producción", "a la producción"], L: ["al local"] };
const DE = { B: ["de la bodega", "de bodega"], P: ["de producción"], L: ["del local"] };
const SUJ = { B: ["bodega", "la bodega"], P: ["producción"], L: ["el local", "local"] };
const DICHO = { frutilla: "frutilla", durazno: "durazno", leche: "leche", condensada: "leche condensada", chantilly: "chantilly", tapa: "tapas", servilleta: "servilletas", oreo: "oreo", masking: "masking", trapos: "trapos", granola: "granola", mora: "mora" };
const plural = e => /[aeiou]$/.test(e) ? e + "s" : e.replace(/ón$/, "on") + "es", fem = e => /(a|dad)$/.test(e);
let sem = 11; const rnd = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; }, uno = a => a[Math.floor(rnd() * a.length)];
const FORMAS = [
  (c, s) => "pide " + c + " " + uno(A_[s]), (c, s) => "pídele " + uno(A_[s]) + " " + c, (c, s) => "necesito " + c + " " + uno(DE[s]), (c, s) => uno(SUJ[s]) + ", mándame " + c,
  (c, s) => "hazme un pedido de " + c + " " + uno(A_[s]), (c, s) => "haz un pedido de " + c + " " + uno(A_[s]), (c, s) => "quiero pedir " + c + " " + uno(A_[s]), (c, s) => "hay que pedir " + c + " " + uno(A_[s]),
  (c, s) => "que " + uno(SUJ[s]) + " me mande " + c, (c, s) => "pide " + uno(A_[s]) + " " + c, (c, s) => "solicita " + c + " " + uno(A_[s]), (c, s) => "necesitamos " + c + " " + uno(DE[s]),
  (c, s) => "por favor pide " + c + " " + uno(A_[s]), (c, s) => "pedido de " + c + " " + uno(A_[s])];
function nuevo() { const st = S.estadoDemo(); E.abrirDia(st, { por: "x" }); return st; }
for (const de of LUGS) for (const a of LUGS) {
  if (de === a) continue; const k = de + " pide a " + a; porRuta[k] = { ok: 0, mal: 0 };
  const st0 = nuevo();
  const prods = Object.keys(DICHO).filter(id => { const p = st0.cat.prods[id]; return p && (p.en || LUGS).includes(de) && (p.en || LUGS).includes(a) && (p.e || []).length; });
  for (const id of prods) {
    const p = st0.cat.prods[id], [emp, fac] = p.e[0];
    for (const [n, w] of [[1, null], [2, "dos"], [3, "tres"], [2, "2"]]) {
      const c = (n === 1 ? (fem(emp) ? "una" : "un") : w) + " " + (n === 1 ? emp : plural(emp)) + " de " + DICHO[id], q = Math.round(n * fac * 1000) / 1000;
      for (const forma of FORMAS) {
        const frase = forma(c, a), st = nuevo(); let err = null;
        try {
          const R = V.interpretar(frase, { lugar: de, cat: st.cat }), pl = A.planificar(st, R, { lugar: de });
          if (pl.tipo !== "pedido") err = "tipo " + pl.tipo + (pl.bloqueo ? " (" + pl.bloqueo + ")" : "");
          else if (pl.de !== de) err = "lo pide " + pl.de;
          else if (pl.items.length !== 1 || pl.items[0].p !== id) err = "productos " + pl.items.map(x => x.p).join(",");
          else if ((pl.items[0].a || pl.a) !== a) err = "a " + (pl.items[0].a || pl.a);
          else if (Math.abs(pl.items[0].q - q) > 0.01) err = "cantidad " + pl.items[0].q + " (esperaba " + q + ")";
        } catch (e) { err = "EXC " + e.message; }
        if (err) { mal++; porRuta[k].mal++; fallos.push("✗ [" + NOM[de] + "] «" + frase + "» " + id + ": " + err); } else { ok++; porRuta[k].ok++; }
      }
    }
  }
}
for (const [k, v] of Object.entries(porRuta)) console.log(k.padEnd(18), String(v.ok).padStart(5), "bien", String(v.mal).padStart(4), "mal");
fallos.slice(0, Number(process.env.VER || 40)).forEach(f => console.log(f));
console.log(`\npedidos: ${ok}/${ok + mal} bien, ${mal} mal`); process.exitCode = mal ? 1 : 0;
