// Pruebas del despacho de pedidos (7.1): node tests/despacho.test.js
const V = require("../src/parser.js"), E = require("../src/engine.js"), A = require("../src/acciones.js"), S = require("../src/sim.js");
let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("✗", m); } };
const nuevo = () => { const st = S.estadoDemo(); E.abrirDia(st, { por: "x" }); return st; };
const plan = (st, l, f) => A.planificar(st, V.interpretar(f, { lugar: l, cat: st.cat }), { lugar: l });
let st = nuevo();
// hay todo
let pe = E.pedir(st, { de: "P", a: "B", items: [{ p: "chantilly", q: 2, emp: "funda" }], por: "x" });
let pl = plan(st, "B", "despacha el pedido");
t(pl.tipo === "traslado" && pl.pedido === pe.id && !pl.bloqueo && !pl.ajustado, "con stock: despacha el pedido completo");
t(/¿Despacho el pedido de producción/.test(A.pregunta(st, pl)), "pregunta «¿Despacho el pedido de producción…?»");
// hay poco: lo que hay, y el resto queda pedido
st.stock.B.chantilly = 1; pl = plan(st, "B", "despacha el pedido de producción");
t(pl.ajustado && pl.items[0].q === 1, "con poco: ofrece lo que hay");
let r = A.ejecutar(st, pl, { por: "x" });
t(r.saldo && r.saldo.items[0].q === 1 && r.saldo.estado === "pendiente", "lo que falta queda como pedido pendiente");
// no hay nada en bodega: hay que comprar
pl = plan(st, "B", "despacha");
t(pl.tipo === "si", "«despacha» solo lo resuelve la pantalla (sí si hay pregunta; despachar si no)");
pl = A.planDespacho(st, r.saldo.id, { lugar: "B" });
t(pl.bloqueo && pl.comprar && /comprar/.test(pl.detalle), "bodega sin producto: dice cuánto comprar y a quién");
// producción sin crema: prepararla primero
st = nuevo(); st.stock.P.crema_reex = 0; pe = E.pedir(st, { de: "L", a: "P", items: [{ p: "crema_reex", q: 3 }], por: "x" });
pl = A.planDespacho(st, pe.id, { lugar: "P" });
t(pl.tipo === "produccion" && pl.despuesDespachar === pe.id && pl.tandas === 2, "producción sin crema: propone preparar 2 tandas");
// sin ingredientes: pedirlos a la bodega
st.stock.P.chantilly = 0; st.stock.P.leche = 0; pl = A.planDespacho(st, pe.id, { lugar: "P" });
t(pl.tipo === "pedido" && pl.a === "B" && pl.items.some(i => i.p === "chantilly"), "sin ingredientes: pide a la bodega lo que falta");
// producción sin fruta: pedirla a la bodega
st = nuevo(); st.stock.P.frutilla = 0; pe = E.pedir(st, { de: "L", a: "P", items: [{ p: "frutilla", q: 4 }], por: "x" });
pl = A.planDespacho(st, pe.id, { lugar: "P" });
t(pl.tipo === "pedido" && pl.a === "B" && pl.paraPedido === pe.id, "producción sin frutilla: la pide a la bodega");
// pedir crema en producción sin decir cuánto: se pregunta «¿Cuántos kilos de crema Reex?» (31-oct-2026)
st = nuevo(); pl = plan(st, "P", "pedir crema reex a bodega");
t(pl.pideCantidad && pl.pideCantidad.p === "crema_reex" && /Cuántos kilos de crema/i.test(pl.pideCantidad.pregunta), "«pedir crema» sin cantidad: pregunta cuántos kilos");
pl = plan(st, "B", "necesito crema para producción");
t(pl.pideCantidad && pl.pideCantidad.l === "P", "«necesito crema para producción» dicho desde la bodega: la pregunta es de producción");
// con la cantidad y sin insumos en producción: pedido a la bodega, nombrado por la receta (sin la lista)
st = nuevo(); Object.keys(st.stock.P).forEach(k => { st.stock.P[k] = 0; });
pl = A.planReceta(st, "crema_reex", 5, "P", "");
t(pl.tipo === "pedido" && pl.a === "B" && pl.directo && pl.receta && pl.receta.q === 5, "5 kg de crema sin insumos: pedido directo a la bodega");
t(/insumos para 5 kg de crema Reex/i.test(pl.resumen) && !/chantilly/i.test(pl.resumen), "el pedido se llama «insumos para 5 kg de crema Reex»: " + pl.resumen);
r = A.ejecutar(st, pl, { por: "x" });
t(r.pedido && r.pedido.items.every(it => it.rec === "crema_reex" && it.recQ === 5), "el pedido guarda para qué son los insumos");
t(/insumos para 5 kg de crema/i.test(A.txtItemsCorto(st, r.pedido.items, "P")), "en la bodega se ve «insumos para 5 kg de crema Reex»");
pl = plan(st, "B", "despacha el pedido de producción");
t(pl.tipo === "traslado" && pl.pedido === r.pedido.id, "la bodega lo despacha con «despacha el pedido»");
const r2 = A.ejecutar(st, pl, { por: "x" });
t(r2.tr && r2.tr.items.every(it => it.rec === "crema_reex") && /insumos para 5 kg/.test(A.txtItemsCorto(st, r2.tr.items, "P")), "lo que viene en camino también dice «insumos para 5 kg de crema Reex»");
E.recibir(st, r2.tr.id, { por: "x" });
pl = A.planReceta(st, "crema_reex", 5, "P", "");
t(pl.tipo === "produccion" && !pl.bloqueo, "con los insumos ya en producción, preparar 5 kg se puede");
const antesCh = E.stockDe(st, "P", "chantilly"); A.ejecutar(st, pl, { por: "x" });
t(Math.abs(E.stockDe(st, "P", "crema_reex") - 5) < 0.01 && E.stockDe(st, "P", "chantilly") < antesCh, "al prepararla sube la crema y se descuentan los insumos");
// con insumos en producción: se prepara directo
st = nuevo(); pl = A.planReceta(st, "choco_derretido", 2, "P", "");
t(pl && (pl.tipo === "produccion" || pl.tipo === "pedido") && pl.directo, "chocolate: se prepara o se piden los insumos, sin otra pregunta");
// deshacer el envío anula el saldo
st = nuevo(); st.stock.B.chantilly = 1; pe = E.pedir(st, { de: "P", a: "B", items: [{ p: "chantilly", q: 3 }], por: "x" });
r = A.ejecutar(st, A.planDespacho(st, pe.id, { lugar: "B" }), { por: "x" });
E.deshacer(st, r.mov.id, {});
t(st.pedidos.find(x => x.id === pe.id).estado === "pendiente" && r.saldo && st.pedidos.find(x => x.id === r.saldo.id).estado === "anulado", "deshacer el envío: el pedido vuelve a pendiente y el saldo se anula");
E.sellar(st); t(E.verificar(st).ok === true, "la bitácora sigue íntegra");
// lo que no se movió queda anotado
const m = E.noMovido(st, { lugar: "B", pedido: pe.id, motivo: "está dañado", que: "Despacho", por: "x", via: "voz" });
t(m.tipo === "no_movido" && /está dañado/.test(m.info) && st.pedidos.find(x => x.id === pe.id).rechazos.length === 1, "«no se movió» queda con el motivo");
t(E.ultimoDeshacible(st, "B") !== m, "«deshacer» no toma la anotación de lo no movido");
// (2-nov-2026, Freddy) «¿por qué el pedido todavía sigue sin despacharse?» en producción: explica qué falta y ofrece lo que hay
st = nuevo(); st.stock.P.frutilla = 11.34; pe = E.pedir(st, { de: "L", a: "P", items: [{ p: "frutilla", q: 34.02, emp: "balde" }], por: "x" });
for (const f of ["por qué el pedido todavía sigue sin despacharse", "por qué sigue esto aquí", "oye Rex por qué no se despacha el pedido", "qué pasa con el pedido", "por qué no han despachado el pedido del local"]) {
  pl = plan(st, "P", f);
  t(pl.tipo === "traslado" && pl.pedido === pe.id && pl.ajustado && /Porque no alcanza: el local pidió 3 baldes( \([^)]*\))? de frutilla/.test(pl.previo || ""), "«" + f + "» en producción explica y ofrece lo que hay: " + (pl.previo || pl.respuesta || pl.bloqueo));
}
// el local pregunta por su pedido
for (const f of ["por qué no llega la frutilla", "dónde está mi pedido", "qué pasó con el pedido", "cuándo llega la frutilla", "todavía no llega la frutilla", "ya salió el pedido"]) {
  pl = plan(st, "L", f);
  t(pl.soloInfo && /Tu pedido de 3 baldes( \([^)]*\))? de frutilla, todavía está en producción sin salir/.test(pl.respuesta) && /solo hay 1 balde/.test(pl.respuesta), "«" + f + "» en el local dice dónde está su pedido: " + pl.respuesta);
}
// cualquier forma de decir que sí, despacha lo que hay
for (const f of ["sí, despachemos", "despachemos rápido", "sí, despachemos rápido", "envía lo que tengas", "manda lo que hay", "mándale lo que se tiene", "despacha lo que haya", "sí, despacha lo que se tiene", "envíale lo que alcance"]) {
  const R = V.interpretar(f, { lugar: "P", cat: st.cat });
  t(R.intent === "despachar_pedido" || R.intent === "si", "«" + f + "» = despachar (" + R.intent + ")");
}
for (const f of ["despachemos", "despachemos rápido", "mándalo de una", "sí, despacha lo que hay", "envía lo que tengas"]) { const s1 = V.siNo(f); t(s1 && s1.r === "si" && s1.limpio, "«" + f + "» solo = sí a «¿Despacho / envío eso?» (" + JSON.stringify(s1) + ")"); }
for (const f of ["manda dos cajas de leche", "envía el pedido al local mañana"]) { const s1 = V.siNo(f); t(!(s1 && s1.r === "si" && s1.limpio), "«" + f + "» no es un sí suelto"); }
for (const f of ["sí, claro, hazlo, no hay problema", "sí, hazlo", "dale", "de una", "sí, mándalo", "sí, envíalo", "claro que sí", "hágale nomás", "sí, por favor"]) {
  const s1 = V.siNo(f); t(s1 && s1.r === "si", "«" + f + "» = sí (" + JSON.stringify(s1) + ")");
}
// lo que no es pregunta: «faltó una caja porque no había más»
t(V.interpretar("faltó una caja porque no había más", { lugar: "P", cat: st.cat }).estado !== "porque", "«porque no había más» no es una pregunta");
// sin pedidos
st = nuevo(); pl = plan(st, "B", "por qué sigue esto aquí"); t(pl.soloInfo && /No hay pedidos pendientes en la bodega/.test(pl.respuesta), "sin pedidos: lo dice");
console.log(`\n${ok} bien, ${bad} mal`);
process.exit(bad ? 1 : 0);
