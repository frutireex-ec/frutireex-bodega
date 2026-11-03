// Listas limpias (3-nov-2026, Freddy: «que se vayan limpiando: por despachar, por entregar, si llegó distinto…»)
// Motor: quitar un pedido o su saldo; qué pasó con lo que faltó en una llegada (devolver, sigue en camino, se perdió, dejar);
// y deshacer cada cosa. Intérprete: la respuesta a «¿qué hago?» dicha de muchas formas.      node tests/listas.test.js
const E = require("../src/engine.js"), S = require("../src/sim.js"), V = require("../src/parser.js");
let ok = 0, bad = 0;
const eq = (nom, a, b, tol) => { const pasa = typeof b === "number" ? Math.abs(a - b) <= (tol || 1e-6) : a === b; if (pasa) ok++; else { bad++; console.log("✗", nom, "=", a, "esperaba", b); } };
const nuevo = () => { const st = S.estadoDemo(); E.abrirDia(st); st.config.recepcionConfirmada = true; return st; };

// 1) despacho incompleto → saldo → quitarlo (y deshacer lo vuelve a poner)
let st = nuevo();
let pe = E.pedir(st, { de: "L", a: "P", items: [{ p: "frutilla", q: 30 }] });
let d = E.despachar(st, { de: "P", a: "L", items: [{ p: "frutilla", q: 10 }], pedido: pe.id });
eq("1 saldo creado", !!d.saldo, true);
eq("1 saldo = lo que faltó", d.saldo.items[0].q, 20);
const mq = E.quitarPedido(st, d.saldo.id, { por: "Rosa", lugar: "P" });
eq("1 saldo quitado", st.pedidos.find(x => x.id === d.saldo.id).estado, "anulado");
eq("1 queda en la bitácora", mq.tipo, "pedido_quitado");
eq("1 con quién", mq.por, "Rosa");
eq("1 sin tocar el inventario", (mq.deltas || []).length, 0);
eq("1 quitar dos veces no hace nada", E.quitarPedido(st, d.saldo.id, {}), null);
eq("1 deshacer lo vuelve a poner", E.deshacer(st, mq.id).ok, true);
eq("1 pendiente otra vez", st.pedidos.find(x => x.id === d.saldo.id).estado, "pendiente");

// 2) llegada con faltante → devolver al que lo mandó (y deshacer)
st = nuevo();
let b0 = E.stockDe(st, "B", "leche"), l0 = E.stockDe(st, "L", "leche");
let x = E.despachar(st, { de: "B", a: "L", items: [{ p: "leche", q: 12 }] });
E.recibir(st, x.transito.id, { cantidades: { leche: 8 } });
eq("2 diferencia", x.transito.estado, "diferencia");
eq("2 falta 4", E.faltaDe(st, x.transito)[0].q, 4);
let r = E.resolverDiferencia(st, x.transito.id, { accion: "devolver", por: "Andrés" });
eq("2 vuelve a la bodega", E.stockDe(st, "B", "leche"), b0 - 12 + 4);
eq("2 el local tiene lo que llegó", E.stockDe(st, "L", "leche"), l0 + 8);
eq("2 ya no está en rojo", !!x.transito.revisada, true);
eq("2 movimiento devolución", r.mov.tipo, "devolucion");
eq("2 resolver dos veces no hace nada", E.resolverDiferencia(st, x.transito.id, { accion: "devolver" }), null);
eq("2 deshacer la devolución", E.deshacer(st, r.mov.id).ok, true);
eq("2 la bodega vuelve a como estaba", E.stockDe(st, "B", "leche"), b0 - 12);
eq("2 otra vez en rojo", x.transito.revisada, null);
eq("2 el sello cuadra", (E.sellar(st), E.verificar(st).ok), true);

// 3) sigue en camino → queda un envío pendiente con lo que falta; al llegar se suma (sin volver a descontar del que lo mandó)
st = nuevo(); b0 = E.stockDe(st, "B", "leche"); l0 = E.stockDe(st, "L", "leche");
x = E.despachar(st, { de: "B", a: "L", items: [{ p: "leche", q: 12 }] });
E.recibir(st, x.transito.id, { cantidades: { leche: 8 } });
r = E.resolverDiferencia(st, x.transito.id, { accion: "camino", por: "Luis" });
eq("3 envío nuevo pendiente", r.nuevo.estado, "pendiente");
eq("3 con lo que falta", r.nuevo.items[0].q, 4);
eq("3 en camino al local", E.enTransito(st, "leche", "L"), 4);
eq("3 la bodega no vuelve a descontar", E.stockDe(st, "B", "leche"), b0 - 12);
E.recibir(st, r.nuevo.id, {});
eq("3 al llegar el local tiene todo", E.stockDe(st, "L", "leche"), l0 + 12);
eq("3 deshacer «sigue en camino» con lo que ya llegó: no", E.deshacer(st, r.mov.id).ok, false);

// 4) se perdió → anotado, el inventario no cambia
st = nuevo(); b0 = E.stockDe(st, "B", "leche"); l0 = E.stockDe(st, "L", "leche");
x = E.despachar(st, { de: "B", a: "L", items: [{ p: "leche", q: 12 }] });
E.recibir(st, x.transito.id, { cantidades: { leche: 8 } });
r = E.resolverDiferencia(st, x.transito.id, { accion: "perdido", por: "Rosa" });
eq("4 movimiento pérdida", r.mov.tipo, "perdida");
eq("4 bodega igual", E.stockDe(st, "B", "leche"), b0 - 12);
eq("4 local igual", E.stockDe(st, "L", "leche"), l0 + 8);
eq("4 resuelta", x.transito.revisada.accion, "perdido");
// 4b) «no había en la bodega» (el sistema decía que sí): no se devuelve nada, queda anotado en la bodega
st = nuevo(); b0 = E.stockDe(st, "B", "chantilly"); l0 = E.stockDe(st, "P", "chantilly");
x = E.despachar(st, { de: "B", a: "P", items: [{ p: "chantilly", q: 32 }] });
E.recibir(st, x.transito.id, { cantidades: { chantilly: 0 } });
r = E.resolverDiferencia(st, x.transito.id, { accion: "nohabia", por: "Luis" });
eq("4b anotado en la bodega", r.mov.lugar, "B"); eq("4b la bodega queda con 32 menos (lo que no había)", E.stockDe(st, "B", "chantilly"), b0 - 32);
eq("4b producción igual", E.stockDe(st, "P", "chantilly"), l0); eq("4b resuelta", x.transito.revisada.accion, "nohabia");
// 5) dejar así = revisada
st = nuevo(); x = E.despachar(st, { de: "B", a: "L", items: [{ p: "leche", q: 12 }] }); E.recibir(st, x.transito.id, { cantidades: { leche: 8 } });
r = E.resolverDiferencia(st, x.transito.id, { accion: "dejar", por: "Ana" });
eq("5 sin movimiento", r.mov, null); eq("5 revisada", x.transito.revisada.por, "Ana");

// 5b) NO ACEPTAR un envío, en las 6 direcciones: el que recibe no suma, todo vuelve al que lo mandó; deshacer lo deja como estaba
for (const [de, a, p, q] of [["B", "P", "frutilla", 22.68], ["B", "L", "leche", 24], ["P", "L", "durazno", 6], ["P", "B", "azucar", 2], ["L", "P", "leche", 12], ["L", "B", "durazno", 3]]) {
  st = nuevo(); E.stockSet && 0;
  st.stock[de][p] = Math.max(st.stock[de][p] || 0, 100); st.lotes[de][p] = [{ q: st.stock[de][p], f: st.dia }];
  const d0 = E.stockDe(st, de, p), a0 = E.stockDe(st, a, p);
  const pe2 = E.pedir(st, { de: a, a: de, items: [{ p, q }] });
  const x2 = E.despachar(st, { de, a, items: [{ p, q }], pedido: pe2.id });
  eq(de + a + " salió", E.stockDe(st, de, p), d0 - q);
  const m2 = E.rechazarEnvio(st, x2.transito.id, { por: "Ana", motivo: "no llegó" });
  eq(de + a + " rechazo registrado", m2 && m2.tipo, "rechazo");
  eq(de + a + " el que recibe NO suma", E.stockDe(st, a, p), a0);
  eq(de + a + " vuelve al que lo mandó", E.stockDe(st, de, p), d0);
  eq(de + a + " ya no está en camino", E.enTransito(st, p, a), 0);
  eq(de + a + " envío rechazado", x2.transito.estado, "rechazado");
  eq(de + a + " el pedido original queda despachado", st.pedidos.find(y => y.id === pe2.id).estado, "despachado");
  const rp2 = st.pedidos.find(y => y.repone === pe2.id);
  eq(de + a + " lo que no se aceptó se vuelve a pedir aparte", rp2 && rp2.estado === "pendiente" && rp2.items[0].q, q);
  eq(de + a + " … marcado como rechazado", !!(rp2 && rp2.rechazado), true);
  eq(de + a + " no se rechaza dos veces", E.rechazarEnvio(st, x2.transito.id, {}), null);
  eq(de + a + " no se puede recibir algo rechazado", E.recibir(st, x2.transito.id, {}), null);
  E.motivoRechazo(st, x2.transito.id, "las latas venían abiertas");
  eq(de + a + " motivo después", /abiertas/.test(m2.nota), true);
  eq(de + a + " deshacer", E.deshacer(st, m2.id).ok, true);
  eq(de + a + " otra vez en camino", x2.transito.estado, "pendiente");
  eq(de + a + " el que lo mandó vuelve a tener lo que salió", E.stockDe(st, de, p), d0 - q);
  eq(de + a + " el pedido vuelve a despachado", st.pedidos.find(y => y.id === pe2.id).estado, "despachado");
  eq(de + a + " lo que se volvió a pedir se anula", rp2.estado, "anulado");
  eq(de + a + " sello", (E.sellar(st), E.verificar(st).ok), true);
}
// 5c) no llegó NADA: se perdió en el camino / no había (nadie suma ni recupera); el pedido vuelve a pendiente; deshacer
for (const acc of ["perdido", "nohabia"]) {
  st = nuevo(); const pB = E.stockDe(st, "B", "leche"), pP = E.stockDe(st, "P", "leche");
  const pe3 = E.pedir(st, { de: "P", a: "B", items: [{ p: "leche", q: 12 }] });
  const x3 = E.despachar(st, { de: "B", a: "P", items: [{ p: "leche", q: 12 }], pedido: pe3.id });
  const m3 = E.perderEnvio(st, x3.transito.id, { accion: acc, por: "Luis" });
  eq(acc + " anotado", m3.tipo, "perdida"); eq(acc + " lugar", m3.lugar, acc === "nohabia" ? "B" : "P");
  eq(acc + " bodega no recupera", E.stockDe(st, "B", "leche"), pB - 12); eq(acc + " producción no suma", E.stockDe(st, "P", "leche"), pP);
  eq(acc + " ya no está en camino", E.enTransito(st, "leche", "P"), 0); eq(acc + " se vuelve a pedir aparte", (st.pedidos.find(y => y.repone === pe3.id) || {}).estado, "pendiente");
  eq(acc + " deshacer", E.deshacer(st, m3.id).ok, true); eq(acc + " otra vez en camino", x3.transito.estado, "pendiente");
  eq(acc + " pedido despachado otra vez", st.pedidos.find(y => y.id === pe3.id).estado, "despachado");
  eq(acc + " lo que se volvió a pedir se anula", st.pedidos.find(y => y.repone === pe3.id).estado, "anulado");
}
{ st = nuevo(); const ms = E.seguimiento(st, { lugar: "B", titulo: "Se deja pendiente", nota: "llega el proveedor el jueves", por: "Ana" }); eq("seguimiento sin inventario", (ms.deltas || []).length, 0); eq("seguimiento con quién", ms.por, "Ana"); }
// 6) la respuesta a «¿qué hago?» (como la dice la gente y como la escribe Whisper)
const C = {
  diferencia: {
    devolver: ["devuélvelo a la bodega", "Devuélvelo a la bodega.", "regrésalo", "que vuelva a la bodega", "no salió de la bodega", "nunca salió", "se quedó en la bodega", "sigue en la bodega", "está en la bodega todavía", "no lo mandaron", "lo regresamos", "ya, devuélvelo", "oye Rex devuélvelo", "vuelve a la bodega", "no se envió", "súmalo a la bodega otra vez", "ponlo de nuevo en la bodega"],
    nohabia: ["no había en la bodega", "No había.", "no había crema", "no salió porque no había", "ya no había nada", "se había acabado", "estaba en cero en la bodega", "no hay en la bodega", "nunca hubo"],
    camino: ["sigue en camino", "Sigue en camino.", "ya lo traen", "viene después", "todavía viene", "lo traen en el siguiente", "va a llegar más tarde", "está viniendo", "en la camioneta", "hay que esperar", "ya vienen", "llega después"],
    perdido: ["se perdió", "Se perdió.", "se dañó", "se rompieron", "no, se rompió", "se cayó en el camino", "se botó", "lo robaron", "no aparece", "desapareció", "se regó", "se echó a perder", "regístralo como merma", "se pudrió", "a la basura"],
    dejar: ["déjalo así", "déjalo", "ya lo revisamos", "está bien así", "no hagas nada", "así nomás", "déjalo como está", "dejémoslo así", "no lo quites"],
    "null": ["sí", "no", "ok", "Andrés", "gracias Rex", "qué", ""]
  },
  saldo: {
    quitar: ["quítalo", "Quítalos.", "bórralo", "cancélalo", "anúlalo", "ya no hace falta", "ya no", "no lo necesitan", "elimínalo", "sácalo de la lista", "olvídalo", "ya se mandó", "ya lo mandamos", "ya no lo necesitamos", "quita eso"],
    dejar: ["déjalo pendiente", "déjalos", "que quede pendiente", "mantenlo", "para después", "luego lo mando", "mañana", "cuando llegue", "todavía no", "no lo quites", "no lo borres", "guárdalo", "que se quede"],
    "null": ["sí", "no", "Rosa", "gracias", "hola"]
  },
  envio: {
    llego: ["sí llegó", "ya llegó", "llegó", "sí", "llegó todo bien", "llegaron solo dos cajas", "ya está aquí", "ya lo recibimos", "sí, ya llegaron"],
    rechazar: ["no se acepta", "no llegó, no se acepta", "no se acepta porque no llegó", "devuélvelo", "no se envió", "nunca salió de la bodega", "recházalo"],
    esperar: ["todavía no llega", "sigue en camino", "ya mismo llega", "lo esperamos", "espera un rato", "déjalo, ya viene", "aún no"],
    perdido: ["se perdió", "se cayeron en el camino"], nohabia: ["no había en la bodega"],
    "null": ["no llegó", "Andrés", "gracias"]
  },
  nollego: {
    rechazar: ["no se acepta", "devuélvelo a la bodega", "que vuelva", "no se envió", "no se acepta, nunca salió"],
    esperar: ["lo esperamos", "sigue en camino", "todavía no llega", "ya mismo llega"],
    perdido: ["se perdió", "se lo robaron"], nohabia: ["no había", "no había en la bodega"],
    "null": ["sí", "no"]
  },
  pedido: {
    despachar: ["despáchalo", "Despáchalo.", "mándalo", "envíalo", "manda lo que hay", "envía lo que tengas", "llévalo"],
    dejar: ["déjalo", "mándalo después", "luego lo despacho", "cuando haya", "déjalo pendiente", "más tarde"],
    quitar: ["quítalo", "cancélalo", "ya no lo necesitan", "ya lo mandamos", "bórralo"],
  }
};
for (const [tipo, g] of Object.entries(C)) for (const [esp, frases] of Object.entries(g)) for (const f of frases) eq("decisión " + tipo + " «" + f + "»", String(V.decision(f, tipo)), esp);
console.log("listas:", ok, "bien,", bad, "mal");
process.exit(bad ? 1 : 0);
