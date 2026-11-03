// Pruebas del motor: node tests/engine.test.js
const E = require("../src/engine.js"), S = require("../src/sim.js"), A = require("../src/acciones.js"), V = require("../src/parser.js");
let ok = 0, bad = 0;
const eq = (nom, a, b, tol) => { const pasa = typeof b === "number" ? Math.abs(a - b) <= (tol || 1e-6) : a === b; if (pasa) ok++; else { bad++; console.log("✗", nom, "=", a, "esperaba", b); } };

// 1) envío y recepción
let st = S.estadoDemo(); E.abrirDia(st);
const b0 = E.stockDe(st, "B", "frutilla"), l0 = E.stockDe(st, "L", "frutilla");
const x = E.despachar(st, { de: "B", a: "L", items: [{ p: "frutilla", q: 8 }] });
eq("bodega baja al despachar", E.stockDe(st, "B", "frutilla"), b0 - 8);
eq("local igual hasta recibir", E.stockDe(st, "L", "frutilla"), l0);
eq("en camino", E.enTransito(st, "frutilla", "L"), 8);
E.recibir(st, x.transito.id, {});
eq("local sube al recibir", E.stockDe(st, "L", "frutilla"), l0 + 8);
eq("nada en camino", E.enTransito(st, "frutilla", "L"), 0);
// 2) deshacer
const r = E.deshacer(st, x.mov.id); eq("no se deshace envío ya recibido", r.ok, false);
const recMov = st.movs.find(m => m.tipo === "recepcion"); E.deshacer(st, recMov.id); E.deshacer(st, x.mov.id);
eq("deshacer devuelve a bodega", E.stockDe(st, "B", "frutilla"), b0);
eq("deshacer deja el local igual", E.stockDe(st, "L", "frutilla"), l0);
// 3) venta descuenta receta
st = S.estadoDemo(); E.abrirDia(st);
const vaso = E.stockDe(st, "L", "vaso9"), fr = E.stockDe(st, "L", "frutilla"), cr = E.stockDe(st, "L", "crema_reex");
E.vender(st, { k: "reex|M", n: 3 });
eq("vasos por venta", E.stockDe(st, "L", "vaso9"), vaso - 3);
eq("frutilla por venta", E.stockDe(st, "L", "frutilla"), fr - 0.54, 1e-6);
eq("crema por venta", E.stockDe(st, "L", "crema_reex"), cr - 0.135, 1e-6);
let top = 0; ["oreo", "grageas", "masmelos", "choco_blanco", "coco", "mani", "nuez", "granola"].forEach(p => top += S.STOCK.L[p] - E.stockDe(st, "L", p));
eq("toppings por venta (3 × 28 g)", top, 0.084, 1e-3);
// 4) preparación
const ch = E.stockDe(st, "L", "chantilly"), c2 = E.stockDe(st, "L", "crema_reex");
E.preparar(st, { prep: "crema_reex", tandas: 1, lugar: "L" });
eq("chantilly usada", E.stockDe(st, "L", "chantilly"), ch - 1);
eq("crema producida", E.stockDe(st, "L", "crema_reex"), c2 + 2);
// 5) lotes: sale primero lo más viejo
st = S.estadoDemo(); E.abrirDia(st);
const viejo = st.lotes.B.frutilla[0].f;
const y = E.despachar(st, { de: "B", a: "L", items: [{ p: "frutilla", q: 4 }] });
eq("despacha lote viejo", y.transito.lotes.frutilla[0].f, viejo);
// 6) cuadre sin problemas = 0 diferencias; con problemas los detecta
const limpio = S.simularDia({ tipo: "martes", seed: 7 });
eq("cierre limpio sin faltantes", limpio.res.nFaltantes, 0); eq("cierre limpio sin sobrantes", limpio.res.nSobrantes, 0);
const malo = S.ESCENARIOS[0].correr();
eq("detecta todo lo oculto", malo.verdad.every(v => v.detectado), true);
eq("traslado sin registrar emparejado", malo.res.causas.some(c => /sin registrarlo/.test(c.txt)), true);
// 7) apertura con diferencia
st = S.estadoDemo();
const conteo = { B: Object.assign({}, st.stock.B, { frutilla: st.stock.B.frutilla - 4 }), L: st.stock.L };
const ap = E.abrirDia(st, { conteoInicial: conteo });
eq("ajuste de apertura", ap.cambios.length, 1);
// 8) flujo voz → plan → ejecución
st = S.estadoDemo(); E.abrirDia(st);
let R = V.interpretar("quitar dos cajas de frutilla", { lugar: "B", cat: st.cat });
let plan = A.planificar(st, R, { lugar: "B" });
eq("plan automático", plan.auto, true);
A.ejecutar(st, plan, { via: "voz" });
R = V.interpretar("quitar dos cajas de frutilla", { lugar: "B", cat: st.cat });
plan = A.planificar(st, R, { lugar: "B" });
eq("duplicado pide confirmar", plan.auto, false);
R = V.interpretar("ya llegó", { lugar: "L", cat: st.cat }); plan = A.planificar(st, R, { lugar: "L" });
eq("recepción encuentra envío", plan.tipo, "recepcion");
// 9) todos los escenarios corren sin errores
S.ESCENARIOS.forEach(sc => { try { const z = sc.correr(); eq("escenario " + sc.id, z.pasos.length > 0, true); } catch (e) { bad++; console.log("✗ escenario", sc.id, e.stack); } });
// 10) formato
eq("formato cajas", E.fmtCant(E.P(st, "frutilla"), 9), "2 cajas + 1 kg");
eq("formato unidades", E.fmtCant(E.P(st, "chantilly"), 2), "2 unidades");
eq("formato paquete", E.fmtCant(E.P(st, "vaso12"), 50), "1 paquete");
eq("dinero", E.dinero(1234.5), "$1.234,50");
// 11) corregir y quitar con autorización
st = S.estadoDemo(); E.abrirDia(st);
const vv = E.vender(st, { k: "reex|B", n: 1 });
const frAntes = E.stockDe(st, "L", "frutilla");
let c = A.corregir(st, vv.id, { n: 0 }, { por: "Ayudante del local" });
eq("quitar venta", c.ok, true); eq("venta quitada devuelve frutilla", E.stockDe(st, "L", "frutilla"), frAntes + 0.28, 1e-6);
eq("venta anulada", st.ventas.find(v => v.mov === vv.id).deshecha, true);
const mm = E.merma(st, { lugar: "L", items: [{ p: "frutilla", q: 0.5 }] });
const fr2 = E.stockDe(st, "L", "frutilla");
c = A.corregir(st, mm.id, { frutilla: 0.2 }, { por: "x", autorizo: "Supervisor" });
eq("corregir merma", E.stockDe(st, "L", "frutilla"), fr2 + 0.3, 1e-6);
eq("queda quién autorizó", st.movs.find(m => m.id === mm.id).autorizo, "Supervisor");
const env = E.despachar(st, { de: "B", a: "L", items: [{ p: "frutilla", q: 8 }] });
const bAntes = E.stockDe(st, "B", "frutilla");
c = A.corregir(st, env.mov.id, { frutilla: 4 }, {}); eq("corregir envío pendiente", E.stockDe(st, "B", "frutilla"), bAntes + 4, 1e-6);
const trNuevo = st.transito.filter(t => t.estado === "pendiente").pop(); eq("nuevo envío con 4 kg", trNuevo.items[0].q, 4);
E.recibir(st, trNuevo.id, {});
const recM = st.movs.filter(m => m.tipo === "recepcion").pop(); const lAntes = E.stockDe(st, "L", "frutilla");
c = A.corregir(st, recM.id, { frutilla: 3 }, {}); eq("corregir recepción", E.stockDe(st, "L", "frutilla"), lAntes - 1, 1e-6);
eq("envío con diferencia", st.transito.find(t => t.id === trNuevo.id).estado, "diferencia");
const pre = E.preparar(st, { prep: "crema_reex", tandas: 2, lugar: "L" }); const crAntes = E.stockDe(st, "L", "crema_reex");
A.corregir(st, pre.id, { tandas: 1 }, {}); eq("corregir preparación", E.stockDe(st, "L", "crema_reex"), crAntes - 2, 1e-6);
st.reloj += 5 * 60000; eq("pide PIN después de 2 min", A.requierePin(st, pre), true);
const nuevoM = E.merma(st, { lugar: "L", items: [{ p: "oreo", q: 0.1 }] }); eq("no pide PIN recién hecho", A.requierePin(st, nuevoM), false);
const ped = E.pedir(st, { de: "L", a: "B", items: [{ p: "oreo", q: 1 }] });
E.despachar(st, { de: "B", a: "L", items: ped.items, pedido: ped.id });
eq("no se deshace pedido ya despachado", E.deshacer(st, st.movs.find(m => m.ref === ped.id).id).ok, false);

// 12) V4: lo que no hay no se mueve
{
  const s4 = S.estadoDemo(); E.abrirDia(s4);
  s4.stock.B.frutilla = 4; s4.lotes.B.frutilla = [{ q: 4, f: E.fechaDe(E.ahora(s4)) }];
  const plan = (frase, l, ctx) => A.planificar(s4, V.interpretar(frase, { lugar: l, cat: s4.cat }), Object.assign({ lugar: l }, ctx || {}));
  let pl = plan("quitar tres cajas de frutilla", "B");
  eq("parcial: propone lo que hay", pl.items[0].q, 4); eq("parcial: no se registra solo", pl.auto, false); eq("parcial: avisa", pl.avisos.some(a => a.code === "solo_hay"), true);
  A.ejecutar(s4, pl, { por: "x" });
  eq("bodega queda en cero, no negativo", E.stockDe(s4, "B", "frutilla"), 0);
  pl = plan("quitar una caja de frutilla", "B");
  eq("sin stock: bloquea", !!pl.bloqueo && /No se dispone/.test(pl.bloqueo), true); eq("sin stock: autorizable", pl.forzable, true);
  pl = plan("quitar una caja de frutilla", "B", { sinControlStock: true });
  eq("supervisor puede autorizar", !pl.bloqueo, true);
  s4.stock.L.oreo = 0;
  pl = plan("devolver una funda de oreo a la bodega", "L");
  eq("local sin stock: bloquea", /No se dispone de Oreo en el local/.test(pl.bloqueo || ""), true);
  pl = plan("se dañó una funda de oreo", "L");
  eq("merma sin stock: bloquea", /No se dispone/.test(pl.bloqueo || ""), true);
  s4.stock.P.chantilly = 0.5;
  pl = plan("preparar una tanda de crema", "P");
  eq("preparar sin ingredientes: bloquea", /No se dispone de lo necesario/.test(pl.bloqueo || ""), true);
  s4.stock.P.frutilla = 0;
  pl = plan("necesito dos cajas de frutilla", "L");
  eq("el pedido de frutilla va a producción", pl.a, "P");
  eq("pedido avisa que producción no tiene", pl.avisos.some(a => a.code === "origen_sin_stock"), true);
  // quitar una compra que ya se movió
  const compra = E.comprar(s4, { a: "B", items: [{ p: "durazno", q: 3 }] });
  const durB = E.stockDe(s4, "B", "durazno");
  E.despachar(s4, { de: "B", a: "L", items: [{ p: "durazno", q: durB }] });
  eq("no deja quitar compra ya movida", E.deshacer(s4, compra.id).ok, false);
  eq("forzado sí deja", E.deshacer(s4, compra.id, { forzar: true }).ok, true);
  // corregir un envío a más de lo que hay: no cambia nada
  s4.stock.B.leche = 12;
  const env = E.despachar(s4, { de: "B", a: "L", items: [{ p: "leche", q: 12 }] });
  const antes = JSON.stringify(s4.stock);
  const r = A.corregir(s4, env.mov.id, { leche: 30 }, {});
  eq("corregir a más de lo que hay falla", r.ok, false); eq("y deja todo igual", JSON.stringify(s4.stock), antes);
  eq("corregir a menos sí", A.corregir(s4, env.mov.id, { leche: 6 }, {}).ok, true);
  eq("bodega recupera lo no enviado", E.stockDe(s4, "B", "leche"), 6);
  let neg = 0; ["B", "L"].forEach(l => Object.keys(s4.stock[l]).forEach(p => { if (s4.stock[l][p] < -0.0005 && p !== "durazno") neg++; }));
  eq("ningún negativo (salvo lo forzado)", neg, 0);
}

// 13) V5: la bodega prepara, el local recibe en kilos, se propone cuánto mover
{
  const s5 = S.estadoDemo(); E.abrirDia(s5);
  const plan = (frase, l) => A.planificar(s5, V.interpretar(frase, { lugar: l, cat: s5.cat }), { lugar: l });
  let pl = plan("preparar una tanda de crema", "L");
  eq("la crema se prepara en producción", pl.lugar, "P");
  const cn = E.stockDe(s5, "P", "choco_negro"), cd = E.stockDe(s5, "P", "choco_derretido"), cnB = E.stockDe(s5, "B", "choco_negro");
  A.ejecutar(s5, plan("calentar una olla de chocolate", "P"), { por: "x" });
  eq("calentar chocolate usa cobertura de producción", E.stockDe(s5, "P", "choco_negro"), cn - 2); eq("y deja chocolate derretido en producción", E.stockDe(s5, "P", "choco_derretido"), cd + 2);
  eq("la bodega no se toca al preparar", E.stockDe(s5, "B", "choco_negro"), cnB);
  pl = plan("mueve frutilla, banano y crema", "P");
  eq("lista: tres productos", pl.items.length, 3); eq("lista: con cantidades propuestas", pl.items.every(it => it.q > 0), true); eq("lista: avisa que propuso", pl.avisos.some(a => a.code === "cantidad_propuesta"), true);
  eq("lista: la pregunta", /^¿Deseas mover .*frutilla.*banano.*crema/.test(A.pregunta(s5, pl)), true);
  pl = plan("muéveme todo lo de frutilla", "B");
  eq("todo = todo lo que hay", pl.items[0].q, E.stockDe(s5, "B", "frutilla"));
  A.quitarItem(s5, pl = plan("lleva oreo, grageas y masmelos al local", "B"), 1);
  eq("quitar de la lista", pl.items.map(i => i.p).join(","), "oreo,masmelos");
  pl = plan("lleva dos fundas de leche condensada al local", "B");
  eq("avisa que eso no va al local", pl.avisos.some(a => a.code === "no_va_al_local"), true);
  eq("el local se muestra en kilos", E.fmtEn(E.P(s5, "frutilla"), 8, "L"), "8 kg");
  E.setPeso("lb"); eq("y en libras si la balanza es de libras", E.fmtEn(E.P(s5, "frutilla"), 0.45359, "L"), "1 lb"); E.setPeso("kg");
  const al = E.alertas(s5).filter(a => a.l === "L" && a.p === "crema_reex");
  eq("si al local le falta crema, la pide (no la prepara)", al.every(a => !a.accion || a.accion.tipo === "pedir"), true);
  s5.stock.P.crema_reex = 0.5;
  eq("producción avisa que hay que preparar crema", E.alertas(s5).some(a => a.l === "P" && a.p === "crema_reex" && a.accion && a.accion.tipo === "preparar"), true);
}

// V6: conteos que se deshacen sin borrar el último, correcciones sin NaN, ventas sin cubrir avisan
{
  const s6 = S.estadoDemo(); E.abrirDia(s6);
  const c1 = E.contar(s6, { lugar: "L", p: "tajin", q: 0.2 }), c2 = E.contar(s6, { lugar: "L", p: "tajin", q: 0.3 });
  eq("el conteo guarda la cantidad", c2.q, 0.3);
  E.deshacer(s6, c1.id);
  eq("deshacer un conteo viejo no borra el actual", s6.conteo.L.tajin, 0.3);
  const campos = A.camposCorreccion(s6, c2);
  eq("modificar el conteo actual muestra su valor", campos[0].valor, 0.3);
  const r6 = A.corregir(s6, c2.id, { tajin: "" }, { por: "x" });
  eq("corregir con casilla vacía no deja NaN", s6.conteo.L.tajin, 0.3); eq("y responde bien", r6.ok, true);
  E.deshacer(s6, s6.movs[s6.movs.length - 1].id);
  eq("deshacer el último vuelve a nada (el viejo ya estaba quitado)", s6.conteo.L.tajin === undefined, true);
  s6.stock.L.oreo = 0.005; E.vender(s6, { k: "reex|M", n: 1 });
  const av = E.alertas(s6).find(a => a.l === "L" && a.p === "oreo" && a.nivel === "medio");
  eq("si se vende más de lo registrado, avisa para contar", !!av && av.accion.tipo === "contar", true);
  eq("y el aviso no muestra números negativos", !!av && !/[−-]\d/.test(av.txt), true);
}

console.log(`\n${ok} bien, ${bad} mal`); process.exit(bad ? 1 : 0);
