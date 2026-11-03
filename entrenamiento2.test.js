// Entrenamiento 2 del intérprete: todas las clases de órdenes (entrada, merma, pedido, conteo, agotado, consulta, venta, producción) en
// bodega, producción y local, con relleno, «Rex», apodos, sin tildes… node tests/entrenamiento2.test.js [semilla] [cantidad por clase] [fallas a mostrar]
// Debe dar 100 %: lo que falla es una frase que la gente puede decir y el intérprete no entiende.
const path = require("path"); const V = require(path.join(__dirname, "../src/parser.js")), C = require(path.join(__dirname, "../src/catalog.js"));
let seed = Number(process.argv[2] || 7); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; const pick = a => a[Math.floor(rnd() * a.length)];
const N = Number(process.argv[3] || 1500);
const NUM = { 1: ["un", "una", "uno", "1"], 2: ["dos", "2"], 3: ["tres", "3"], 4: ["cuatro", "4"], 5: ["cinco", "5"], 6: ["seis", "6"], 8: ["ocho", "8"], 10: ["diez", "10"] };
const PRE = ["", "", "", "", "eh ", "este ", "pues ", "rex ", "oye rex ", "jarvis ", "bueno ", "ya ", "a ver ", "por favor ", "listo ", "entonces ", "okey ", "tío rex ", "oye tío ", "rex por favor ", "mira "];
const POST = ["", "", "", "", " por favor", " porfa", " gracias", " ahorita", " ya", " pues", " rápido", " nomás", " de una", " tío", " amigo", " gracias tío", " hermano", " socio", " compa", " jefe", " pana", " bro", " gracias hermano", " por favor tío", " gracias amigo", " mi pana", " jefa"];
const LUG = { B: ["", "en bodega ", "aquí en bodega "], P: ["", "en producción "], L: ["", "en el local ", "aquí en el local "] };
const prodsDe = l => C.PRODUCTOS.filter(p => p.e && p.e.length && p.sin && p.sin.length && !p.prep && (p.en || []).includes(l));
const plural = (u, q) => q === 1 ? u : (/[aeiou]$/.test(u) ? u + "s" : u + "es");
const UBASE = { kg: "kilos", L: "litros" };
function nombreDe(p) { let n = pick([p.sin[0], pick(p.sin), p.n.toLowerCase()]); if (/\(/.test(n)) n = p.sin[0]; return /\(/.test(n) ? null : n; }
function cantidad(p, nombre) {   // «tres cajas de X», «tres de X», «cinco kilos de X»
  const q = pick(Object.keys(NUM).map(Number)), qtxt = pick(NUM[q]);
  const usaEmp = rnd() < 0.7, emp = pick(p.e), base = UBASE[p.u];
  const empaquePrimero = /^(cajas?|fundas?|bultos?|sacos?|paquetes?|frascos?|botellas?|rollos?|latas?) /.test(nombre);   // «kilos de cajas de chocolate» no se dice
  if (usaEmp && !new RegExp("\\b" + emp[0] + "s?\\b").test(nombre)) return { q, txt: qtxt + " " + plural(emp[0], q) + " de " + nombre };
  if (base && !empaquePrimero && rnd() < 0.5 && q > 1) return { q, txt: qtxt + " " + base + " de " + nombre };
  return { q, txt: qtxt + " de " + nombre };
}
const quitaTildes = f => f.normalize("NFD").replace(/[̀-ͯ]/g, "");
function adorna(f) {
  f = (pick(PRE) + f + pick(POST)).replace(/\s+/g, " ").trim();
  if (rnd() < 0.3) f = quitaTildes(f);
  if (rnd() < 0.12 && !/^(no|ya no|hay|ni)\b/.test(f)) f = f.replace(/^(\S+)/, "$1,");
  return f;
}
const clases = {}; const fallas = [];
function prueba(clase, frase, lugar, espera, chequeo) {
  const c = clases[clase] = clases[clase] || { ok: 0, mal: 0 };
  let R; try { R = V.interpretar(frase, { lugar }); } catch (e) { R = { intent: "ERROR:" + e.message, items: [], issues: [] }; }
  let bien = false; try { bien = !!chequeo(R); } catch (e) { bien = false; }
  if (bien) c.ok++; else { c.mal++; fallas.push({ clase, frase, lugar, espera, got: [R.intent, R.listo, JSON.stringify((R.items || []).map(x => x.venta ? [x.venta, x.n] : [x.p, x.cant == null ? x.tandas : x.cant])), (R.issues || []).map(i => i.code).join(",")].join(" ") }); }
}
const uno = (R, id, q, tipo) => R.intent === tipo && R.listo && (R.items || []).length === 1 && R.items[0].p === id && Number(R.items[0].cant) === q;

for (let i = 0; i < N; i++) {
  // ENTRADA (solo se compra en bodega)
  { const p = pick(prodsDe("B")), nom = nombreDe(p); if (nom) { const c = cantidad(p, nom);
    const v = pick([["llegaron", 1], ["ingresaron", 0], ["entraron", 0], ["compramos", 0], ["compré", 0], ["nos trajeron", 0], ["me trajeron", 1], ["recibimos", 1], ["llegó", 1]]);
    const prov = v[1] || rnd() < 0.5 ? " del proveedor" : "";
    prueba("entrada", adorna(v[0] + " " + c.txt + prov), "B", [p.id, c.q], R => uno(R, p.id, c.q, "entrada")); } }
  // MERMA en cualquier lugar
  { const l = pick(["B", "P", "L"]), p = pick(prodsDe(l)), nom = nombreDe(p); if (nom) { const c = cantidad(p, nom);
    const v = pick(["se dañaron", "se cayeron", "se botaron", "botamos", "se vencieron", "se pudrieron", "se regaron", "se rompieron", "tiramos", "botó"]);
    prueba("merma", adorna(v + " " + c.txt), l, [p.id, c.q], R => uno(R, p.id, c.q, "merma")); } }
  // PEDIDO
  { const l = pick(["B", "P", "L"]), p = pick(prodsDe(l)), nom = nombreDe(p); if (nom) { const c = cantidad(p, nom);
    const v = pick(["necesito", "necesitamos", "me faltan", "nos faltan", "pide", "pídele", "mándame", "tráeme", "hay que pedir", "ocupo"]);
    prueba("pedido", adorna(v + " " + c.txt), l, [p.id, c.q], R => uno(R, p.id, c.q, "pedido")); } }
  // CONTEO
  { const l = pick(["B", "P", "L"]), p = pick(prodsDe(l)), nom = nombreDe(p); if (nom) { const c = cantidad(p, nom);
    const v = pick(["hay", "quedan", "tenemos", "tengo", "contamos", "me quedan", "nos quedan"]);
    prueba("conteo", adorna(v + " " + c.txt), l, [p.id, c.q], R => uno(R, p.id, c.q, "conteo")); } }
  // AGOTADO
  { const l = pick(["B", "P", "L"]), p = pick(prodsDe(l)), nom = nombreDe(p); if (nom) {
    const v = pick(["se acabó", "se acabaron", "ya no hay", "no queda", "nos quedamos sin", "se terminó", "se agotó"]);
    prueba("agotado", adorna(v + " " + nom), l, [p.id], R => R.intent === "agotado" && (R.items || []).length >= 1 && R.items[0].p === p.id); } }
  // CONSULTA
  { const l = pick(["B", "P", "L"]), p = pick(prodsDe(l)), nom = nombreDe(p); if (nom) {
    const v = pick(["cuánto hay de", "cuántos hay de", "cuánto queda de", "cuánta hay de", "cuántas hay de"]);
    prueba("consulta", adorna(v + " " + nom), l, [p.id], R => R.intent === "consulta" && (R.items || []).length >= 1 && R.items[0].p === p.id); } }
  // VENTA en el local
  { const m = pick(C.MENU), q = pick([1, 2, 3, 4, 5]), qtxt = pick(NUM[q] || [String(q)]);
    const tam = m.tam.U ? "U" : (m.tam.B && rnd() < 0.5) ? "B" : "M";
    const tx = tam === "U" ? "" : tam === "B" ? pick([" big", " grande"]) : pick([" mediana", " midium", ""]);
    const nom = m.n.toLowerCase();
    const v = pick(["registra", "vendí", "vendimos", "se vendieron", "salieron", "registra venta de", "vendí"]);
    const plur = q > 1 && tam !== "U" && rnd() < 0.3 ? "s" : "";
    prueba("venta", adorna(v + " " + qtxt + " " + nom + plur + tx), "L", [m.id + "|" + tam, q], R => R.intent === "venta" && (R.items || []).length === 1 && R.items[0].venta === m.id + "|" + tam && Number(R.items[0].n) === q); }
  // PRODUCCIÓN (se prepara en producción)
  { const k = pick([["crema_reex", ["crema", "crema reex", "la crema"]], ["dulce_fresa", ["dulce de fresa", "dulce", "dulce de frutilla"]], ["choco_derretido", ["chocolate derretido", "chocolate"]]]);
    const q = pick([1, 2, 3, 4]), qtxt = pick(NUM[q]);
    const v = pick(["prepara", "preparé", "preparamos", "hice", "hicimos", "haz", "hacer", "batí", "voy a preparar"]);
    prueba("producción", adorna(v + " " + qtxt + " " + (q === 1 ? "tanda" : "tandas") + " de " + pick(k[1])), "P", [k[0], q], R => R.intent === "produccion" && (R.items || []).length === 1 && R.items[0].p === k[0] && Number(R.items[0].tandas) === q); }
  // TRASLADO con origen y destino distintos (P→L y B→L, B→P) con «de» y sin tildes
  { const desde = pick(["B", "P"]), a = desde === "B" ? pick(["P", "L"]) : "L", p = pick(prodsDe(desde).filter(x => (x.en || []).includes(a))), nom = p && nombreDe(p);
    if (nom) { const c = cantidad(p, nom); const v = pick(["lleva", "pasa", "manda", "mueve", "envía", "saca", "sube", "baja", "despacha", "pon"]);
      const dest = pick({ P: ["a producción", "para producción", "hacia producción"], L: ["al local", "para el local", "a la tienda", "hacia el local"] }[a]);
      prueba("traslado", adorna(v + " " + c.txt + " " + dest), desde, [p.id, c.q, a], R => uno(R, p.id, c.q, "traslado") && R.a === a && R.de === desde); } }
}
let totOk = 0, totMal = 0;
Object.entries(clases).forEach(([k, c]) => { totOk += c.ok; totMal += c.mal; console.log(k.padEnd(12), c.ok + "/" + (c.ok + c.mal), (100 * c.ok / (c.ok + c.mal)).toFixed(1) + " %"); });
console.log("TOTAL", totOk + "/" + (totOk + totMal), (100 * totOk / (totOk + totMal)).toFixed(2) + " %,", totMal, "mal");
const por = {}; fallas.forEach(f => { por[f.clase] = (por[f.clase] || 0) + 1; });
fallas.slice(0, Number(process.argv[4] || 30)).forEach(f => console.log(" ·", "[" + f.clase + "/" + f.lugar + "]", f.frase, "| esperaba", f.espera.join(" "), "| dio", f.got));
process.exitCode = totMal === 0 ? 0 : 1;
