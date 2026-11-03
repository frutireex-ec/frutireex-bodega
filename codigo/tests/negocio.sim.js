// Simulación del negocio (3-nov-2026, Freddy: «siquiera 1 millón de simulaciones de todo lo que es negocio… que no quede nada en lista»)
// Días enteros al azar, en el motor: compras al proveedor (llega completo, llega a medias, no llega, llega tarde), pedidos y envíos en las
// 6 direcciones, despachos completos y a medias (saldo), llegadas completas, a medias, que NO se aceptan, que se pierden, que no había,
// que se demoran (stand-by), ventas en el local, preparaciones en producción, mermas y «deshacer».
// Lo que se revisa después de CADA operación:
//   · ningún inventario queda negativo
//   · lo físico cuadra: inventario + en camino + lo que falta revisar = lo que el simulador calcula por su cuenta
//   · «no se acepta»: el que recibe no suma NADA y al que lo mandó le vuelve exactamente lo que salió (con sus lotes)
//   · un pedido nunca queda pedido dos veces (pedido + saldo + envíos ≤ lo que se pidió)
//   · los lotes de lo perecible suman lo mismo que el inventario
// Y al final de cada día: se resuelve todo lo que quedó y las listas quedan VACÍAS en los tres lugares; la cadena de movimientos se sella y verifica.
//        node tests/negocio.sim.js [semilla] [operaciones]        (por defecto 1 000 000 de operaciones)
const E = require("../src/engine.js"), S = require("../src/sim.js");
let semilla = +process.argv[2] || 20261103; const N = +process.argv[3] || 1000000;
const rnd = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
const una = a => a[Math.floor(rnd() * a.length)];
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const L3 = ["B", "P", "L"], RUTAS = [["B", "P"], ["B", "L"], ["P", "L"], ["P", "B"], ["L", "P"], ["L", "B"]];
const EPS = 0.002;
let fallas = 0; const malos = []; const cuenta = {};
const conteo = k => { cuenta[k] = (cuenta[k] || 0) + 1; };
const falla = (msg) => { fallas++; if (malos.length < 40) malos.push(msg); };

function correrMundo(nOps, mundo) {
  const st = S.estadoDemo(); E.abrirDia(st);
  st.reloj = st.reloj || Date.now();
  const prods = st.cat.orden.filter(p => !st.cat.preps[p]);
  const esperado = {}; const efecto = {};   // esperado[p] = total físico que el simulador calcula; efecto[movId] = lo que ese movimiento cambió en lo físico
  const fisico = p => L3.reduce((a, l) => a + E.stockDe(st, l, p), 0) + st.transito.filter(t => t.estado === "pendiente").reduce((a, t) => a + t.items.filter(i => i.p === p).reduce((b, i) => b + i.q, 0), 0)
    + st.transito.filter(t => t.estado === "diferencia" && !t.revisada).reduce((a, t) => a + E.faltaDe(st, t).filter(i => i.p === p).reduce((b, i) => b + i.q, 0), 0);
  st.cat.orden.forEach(p => { esperado[p] = fisico(p); });
  const recepDe = tr => { for (let i = st.movs.length - 1; i >= 0; i--) { const m = st.movs[i]; if (m.tipo === "recepcion" && m.ref === tr.id && !m.deshecho) return m; } return null; };
  const anotaFalta = (tr, res, acc, falta) => { if (!["perdido", "nohabia", "dejar"].includes(acc)) return; const c = {}; falta.forEach(i => { c[i.p] = (c[i.p] || 0) - i.q; }); if (acc === "dejar") { const rm = recepDe(tr); Object.keys(c).forEach(p => { esperado[p] = (esperado[p] || 0) + c[p]; }); if (rm) { const e = efecto[rm.id] || (efecto[rm.id] = {}); Object.keys(c).forEach(p => { e[p] = (e[p] || 0) + c[p]; }); } } else anota(res.mov, c); };
  const anota = (mov, cambios) => { if (!cambios) return; Object.keys(cambios).forEach(p => { esperado[p] = (esperado[p] || 0) + cambios[p]; }); if (mov) efecto[mov.id] = cambios; };
  const lotesIni = {};
  L3.forEach(l => st.cat.orden.forEach(p => { const pr = E.P(st, p); if (pr && pr.per) lotesIni[l + p] = (st.lotes[l][p] || []).reduce((a, x) => a + x.q, 0) - E.stockDe(st, l, p); }));
  const proveedor = [];   // compras que el proveedor tiene que traer: { items, hora, estado }
  const pedidoRaiz = pe => { let x = pe; while (x && (x.saldoDe || x.repone)) x = st.pedidos.find(y => y.id === (x.saldoDe || x.repone)); return x || pe; };
  const pedido0 = {};     // lo pedido al comienzo de cada cadena (pedido + saldos)

  function revisar(que) {
    // 1) nada negativo
    for (const l of L3) for (const p of st.cat.orden) { const q = E.stockDe(st, l, p); if (q < -EPS) { falla(mundo + " · " + que + ": inventario negativo " + l + " " + p + " = " + q); return false; } }
    // 2) lo físico cuadra
    for (const p of st.cat.orden) { const f = fisico(p); if (Math.abs(f - esperado[p]) > EPS * 5) { falla(mundo + " · " + que + ": no cuadra " + p + ": hay " + f.toFixed(3) + " y debería " + esperado[p].toFixed(3)); esperado[p] = f; return false; } }
    // 3) un pedido no se pide dos veces
    const porRaiz = {};
    st.pedidos.forEach(pe => {
      const r = pedidoRaiz(pe).id; const m = porRaiz[r] || (porRaiz[r] = {});
      if (pe.estado === "pendiente") pe.items.forEach(it => { m[it.p] = (m[it.p] || 0) + it.q; });
      st.transito.filter(t => t.pedido === pe.id && ["pendiente", "recibido", "diferencia"].includes(t.estado)).forEach(t => t.items.forEach(it => { m[it.p] = (m[it.p] || 0) + it.q; }));
    });
    for (const r of Object.keys(porRaiz)) for (const p of Object.keys(porRaiz[r])) if (pedido0[r] && porRaiz[r][p] > (pedido0[r][p] || 0) + EPS) { falla(mundo + " · " + que + ": el pedido " + r + " quedó pedido de más: " + p + " " + porRaiz[r][p] + " de " + pedido0[r][p]); return false; }
    // 4) lotes
    for (const l of L3) for (const p of st.cat.orden) { const pr = E.P(st, p); if (!pr || !pr.per) continue; const s = E.stockDe(st, l, p); if (s < EPS) continue; const lo = (st.lotes[l][p] || []).reduce((a, x) => a + x.q, 0) - s; if (lo > Math.max(0, lotesIni[l + p] || 0) + 0.01) { falla(mundo + " · " + que + ": lotes " + l + " " + p + " suman " + (lo + s).toFixed(3) + " y hay " + s); return false; } }
    return true;
  }
  const haySt = (l, items) => items.every(it => E.stockDe(st, l, it.p) + 1e-9 >= it.q);
  const itemsAl = (l, max) => {
    const conStock = prods.filter(p => E.stockDe(st, l, p) > 0.01); if (!conStock.length) return null;
    const n = entre(1, Math.min(max || 3, conStock.length)), usados = new Set(), out = [];
    while (out.length < n) { const p = una(conStock); if (usados.has(p)) { if (usados.size >= conStock.length) break; continue; } usados.add(p); const hay = E.stockDe(st, l, p); out.push({ p, q: E.r3(Math.max(0.001, Math.min(hay, hay * (0.05 + rnd() * 0.5)))) }); }
    return out;
  };
  const cualquiera = () => { const n = entre(1, 3), out = [], usados = new Set(); while (out.length < n) { const p = una(prods); if (usados.has(p)) continue; usados.add(p); out.push({ p, q: entre(1, 8) * (rnd() < 0.3 ? 0.5 : 1) }); } return out; };

  // resolver una llegada (lo que diría la persona que recibe)
  function llegada(tr, forzar) {
    const r = rnd(), its = tr.items.map(i => ({ p: i.p, q: i.q }));
    if (!forzar && r < 0.12) { conteo("llegada demorada (stand-by)"); tr.esperas = (tr.esperas || 0) + 1; E.seguimiento(st, { lugar: tr.a, ref: tr.id, titulo: "Lo seguimos esperando", nota: "Todavía no llega", por: "Sim" }); return; }
    if (r < 0.50) { conteo("llegó completo"); const m = E.recibir(st, tr.id, { por: "Sim" }); if (!m) falla(mundo + ": no se pudo recibir " + tr.id); return; }
    if (r < 0.66) {
      // «no se acepta…»: el que recibe NO suma y todo vuelve al que lo mandó
      conteo("no se acepta (vuelve)");
      const antesA = its.map(i => E.stockDe(st, tr.a, i.p)), antesDe = its.map(i => E.stockDe(st, tr.de, i.p));
      const m = E.rechazarEnvio(st, tr.id, { motivo: una(["No llegó completo", "Venía abierta una caja", "No se envió el producto", "Llegó en mal estado", null]), por: "Sim" });
      if (!m) { falla(mundo + ": rechazarEnvio devolvió null"); return; }
      its.forEach((i, k) => {
        // (si el mismo producto va dos veces en el envío, se compara la suma)
        const vuelve = its.filter(x => x.p === i.p).reduce((a, x) => a + x.q, 0);
        if (tr.a !== tr.de && Math.abs(E.stockDe(st, tr.a, i.p) - antesA[k]) > EPS) falla(mundo + ": NO SE ACEPTÓ pero " + tr.a + " sumó " + i.p);
        if (Math.abs(E.stockDe(st, tr.de, i.p) - antesDe[k] - vuelve) > EPS) falla(mundo + ": NO SE ACEPTÓ y a " + tr.de + " no le volvió exacto " + i.p + " (" + (E.stockDe(st, tr.de, i.p) - antesDe[k]) + " de " + vuelve + ")");
      });
      if (tr.estado !== "rechazado") falla(mundo + ": el envío rechazado quedó " + tr.estado);
      anota(m, {});
      return;
    }
    if (r < 0.74) {
      const acc = rnd() < 0.7 ? "perdido" : "nohabia"; conteo("no llegó: " + (acc === "perdido" ? "se perdió" : "no había"));
      const m = E.perderEnvio(st, tr.id, { accion: acc, por: "Sim" });
      if (!m) { falla(mundo + ": perderEnvio devolvió null"); return; }
      const c = {}; its.forEach(i => { c[i.p] = (c[i.p] || 0) - i.q; }); anota(m, c); return;
    }
    // llegó a medias (o nada de un producto) → diferencia → qué se hace con lo que falta
    conteo("llegó a medias");
    const cant = {}; tr.items.forEach(i => { cant[i.p] = E.r3(rnd() < 0.3 ? 0 : i.q * rnd()); });
    if (tr.items.every(i => Math.abs(cant[i.p] - i.q) < 0.0005)) cant[tr.items[0].p] = 0;
    // (si un producto va dos veces, recibir toma la cantidad por producto: se arma igual que en la página)
    const m = E.recibir(st, tr.id, { cantidades: cant, por: "Sim", observacion: rnd() < 0.5 ? "Una caja venía golpeada" : null });
    if (!m) { falla(mundo + ": recibir a medias devolvió null"); return; }
    if (tr.estado === "diferencia") {
      const falta = E.faltaDe(st, tr);
      if (forzar || rnd() < 0.85) {
        const acc = una(["devolver", "devolver", "camino", "perdido", "nohabia", "dejar"]); conteo("faltante: " + acc);
        const res = E.resolverDiferencia(st, tr.id, { accion: acc, por: "Sim" });
        if (!res) { falla(mundo + ": resolverDiferencia devolvió null"); return; }
        anotaFalta(tr, res, acc, falta);
      } else conteo("faltante sin revisar (queda en rojo)");
    }
  }

  for (let i = 0; i < nOps; i++) {
    st.reloj += entre(1, 6) * 60000;
    const r = rnd();
    let que = "";
    if (r < 0.06) {
      // el dueño encarga al proveedor; llega más tarde
      que = "encargo al proveedor"; proveedor.push({ items: cualquiera(), hora: st.reloj + entre(10, 120) * 60000, a: rnd() < 0.85 ? "B" : una(["P", "L"]) });
    } else if (r < 0.10) {
      // el proveedor: llega completo, a medias, no llega (aviso), o se demora
      const x = proveedor.find(y => y.hora <= st.reloj);
      if (x) {
        const k = rnd();
        if (k < 0.55) { que = "proveedor llegó completo"; conteo(que); const c = {}; x.items.forEach(it => { c[it.p] = (c[it.p] || 0) + it.q; }); anota(E.comprar(st, { a: x.a, items: x.items, por: "Sim" }), c); proveedor.splice(proveedor.indexOf(x), 1); }
        else if (k < 0.75) { que = "proveedor llegó a medias"; conteo(que); const its = x.items.map(it => ({ p: it.p, q: E.r3(it.q * (0.3 + rnd() * 0.6)) })); const c = {}; its.forEach(it => { c[it.p] = (c[it.p] || 0) + it.q; }); const m = E.comprar(st, { a: x.a, items: its, por: "Sim" }); m.nota = "Entró menos de lo dicho: el proveedor trajo solo una parte"; anota(m, c); proveedor.splice(proveedor.indexOf(x), 1); }
        else if (k < 0.88) { que = "proveedor no llegó"; conteo(que); E.avisar(st, { lugar: "B", texto: "El proveedor no llegó", nivel: "alto", por: "Sim" }); proveedor.splice(proveedor.indexOf(x), 1); }
        else { que = "proveedor se demora"; conteo(que); x.hora = st.reloj + entre(15, 90) * 60000; }
      }
    } else if (r < 0.22) {
      // un pedido en cualquiera de las 6 direcciones (de = quien pide, a = quien despacha)
      const [aa, de] = una(RUTAS); que = "pedido " + de + "→" + aa;
      const pe = E.pedir(st, { de, a: aa, items: cualquiera(), por: "Sim" });
      pedido0[pe.id] = {}; pe.items.forEach(it => { pedido0[pe.id][it.p] = (pedido0[pe.id][it.p] || 0) + it.q; }); conteo("pedido");
    } else if (r < 0.36) {
      // despachar un pedido pendiente con lo que haya (completo o a medias → saldo)
      const pe = una(st.pedidos.filter(x => x.estado === "pendiente")) ;
      if (pe) {
        const its = pe.items.map(it => ({ p: it.p, q: E.r3(Math.min(it.q, Math.max(0, E.stockDe(st, pe.a, it.p)))) })).filter(x => x.q > 0.0005);
        if (its.length) {
          que = "despacho de pedido"; conteo(its.every((x, k) => Math.abs(x.q - pe.items.filter(y => y.p === x.p).reduce((a, y) => a + y.q, 0)) < 0.0005) ? "despacho completo" : "despacho a medias (saldo)");
          const x = E.despachar(st, { de: pe.a, a: pe.de, items: its, pedido: pe.id, por: "Sim" }); anota(x.mov, {});
          if (x.saldo) { const rz = pedidoRaiz(x.saldo).id; void rz; }
        } else if (rnd() < 0.5) { que = "pedido sin stock: se quita"; conteo(que); E.quitarPedido(st, pe.id, { por: "Sim", motivo: "No hay" }); }
        else { que = "pedido sin stock: se deja"; conteo(que); pe.decidido = st.reloj; E.seguimiento(st, { lugar: pe.a, ref: pe.id, nota: "Se queda: no hay todavía", por: "Sim" }); }
      }
    } else if (r < 0.46) {
      // un envío directo (sin pedido) en cualquiera de las 6 direcciones
      const [de, a] = una(RUTAS); const its = itemsAl(de);
      if (its) { que = "envío " + de + "→" + a; conteo("envío directo"); anota(E.despachar(st, { de, a, items: its, por: "Sim" }).mov, {}); }
    } else if (r < 0.62) {
      // alguien contesta una llegada (o se queda en stand-by)
      const tr = una(st.transito.filter(x => x.estado === "pendiente"));
      if (tr) { que = "llegada " + tr.de + "→" + tr.a; llegada(tr, false); }
    } else if (r < 0.66) {
      // una diferencia que quedó en rojo se resuelve más tarde
      const tr = una(st.transito.filter(x => x.estado === "diferencia" && !x.revisada));
      if (tr) { que = "revisar faltante"; const falta = E.faltaDe(st, tr), acc = una(["devolver", "camino", "perdido", "nohabia", "dejar"]); conteo("faltante (tarde): " + acc); const res = E.resolverDiferencia(st, tr.id, { accion: acc, por: "Sim" }); if (res) anotaFalta(tr, res, acc, falta); }
    } else if (r < 0.80) {
      // ventas en el local (solo si alcanza: la página no vende lo que no hay)
      const k = una(Object.keys(st.cat.recetas)), n = entre(1, 3), cons = E.consumoReceta(st, k, n);
      if (cons.length && haySt("L", cons)) { que = "venta"; conteo("venta"); const c = {}; cons.forEach(it => { c[it.p] = (c[it.p] || 0) - it.q; }); anota(E.vender(st, { k, n, por: "Sim" }), c); }
    } else if (r < 0.85) {
      // preparar en producción (crema, chocolate, dulce)
      const prep = una(Object.keys(st.cat.preps)), lp = E.P(st, prep).hecho || "P", n = entre(1, 2);
      if (!E.faltaParaPreparar(st, prep, n, lp).length) { que = "preparar " + prep; conteo("preparación"); const pr = st.cat.preps[prep], c = {}; Object.keys(pr.usa).forEach(p => { c[p] = (c[p] || 0) - pr.usa[p] * n; }); c[prep] = (c[prep] || 0) + pr.sale * n; anota(E.preparar(st, { prep, tandas: n, lugar: lp, por: "Sim" }), c); }
    } else if (r < 0.88) {
      const l = una(L3), its = itemsAl(l, 1);
      if (its) { que = "merma"; conteo("merma"); const c = {}; its.forEach(i => { c[i.p] = (c[i.p] || 0) - i.q; }); anota(E.merma(st, { lugar: l, items: its, motivo: "Dañado", por: "Sim" }), c); }
    } else if (r < 0.91) {
      // «Rex, deshaz lo último»
      const m = E.ultimoDeshacible(st, rnd() < 0.5 ? una(L3) : null);
      if (m) { const res = E.deshacer(st, m.id, { por: "Sim" }); que = "deshacer " + m.tipo; if (res.ok) { conteo("deshacer " + m.tipo); const c = efecto[m.id]; if (c) Object.keys(c).forEach(p => { esperado[p] -= c[p]; }); } else conteo("deshacer rechazado (" + (res.sinStock ? "ya se usó" : "no se puede") + ")"); }
    } else if (r < 0.94) {
      // un saldo o pedido que se decide quitar
      const pe = una(st.pedidos.filter(x => x.estado === "pendiente"));
      if (pe) { que = "quitar pedido"; conteo("pedido quitado"); E.quitarPedido(st, pe.id, { por: "Sim", motivo: "Ya no hace falta" }); }
    } else {
      // «otra vez»: un pedido que volvió (no se aceptó / se perdió) se vuelve a despachar si hay
      const pe = una(st.pedidos.filter(x => x.estado === "pendiente" && x.rechazado));
      if (pe) {
        const its = pe.items.map(it => ({ p: it.p, q: E.r3(Math.min(it.q, Math.max(0, E.stockDe(st, pe.a, it.p)))) })).filter(x => x.q > 0.0005);
        if (its.length) { que = "despachar otra vez el pedido que volvió"; conteo(que); anota(E.despachar(st, { de: pe.a, a: pe.de, items: its, pedido: pe.id, por: "Sim" }).mov, {}); }
      }
    }
    if (que && !revisar(que)) break;
  }
  // fin del día: TODO se resuelve y las listas quedan vacías
  for (let vuelta = 0; vuelta < 20000; vuelta++) {
    const tr = st.transito.find(x => x.estado === "pendiente"); if (tr) { llegada(tr, true); if (!revisar("cierre: llegada")) break; continue; }
    const td = st.transito.find(x => x.estado === "diferencia" && !x.revisada); if (td) { const falta = E.faltaDe(st, td), acc = una(["devolver", "perdido", "nohabia", "dejar"]); const res = E.resolverDiferencia(st, td.id, { accion: acc, por: "Sim" }); if (res) anotaFalta(td, res, acc, falta); if (!revisar("cierre: faltante")) break; continue; }
    const pe = st.pedidos.find(x => x.estado === "pendiente");
    if (pe) {
      const its = pe.items.map(it => ({ p: it.p, q: E.r3(Math.min(it.q, Math.max(0, E.stockDe(st, pe.a, it.p)))) })).filter(x => x.q > 0.0005);
      if (its.length && rnd() < 0.6) anota(E.despachar(st, { de: pe.a, a: pe.de, items: its, pedido: pe.id, por: "Sim", saldo: false }).mov, {});
      else E.quitarPedido(st, pe.id, { por: "Sim", motivo: "Cierre del día" });
      if (!revisar("cierre: pedido")) break; continue;
    }
    break;
  }
  const quedan = { camino: st.transito.filter(x => x.estado === "pendiente").length, rojo: st.transito.filter(x => x.estado === "diferencia" && !x.revisada).length, pedidos: st.pedidos.filter(x => x.estado === "pendiente").length };
  if (quedan.camino || quedan.rojo || quedan.pedidos) falla(mundo + ": al cerrar quedó algo en lista: " + JSON.stringify(quedan));
  E.sellar(st); const v = E.verificar(st); if (!v || v.ok === false) falla(mundo + ": la cadena de movimientos no verifica: " + JSON.stringify(v).slice(0, 120));
  // cerrar el día no se cae
  try { E.cerrarDia(st, { por: "Sim" }); } catch (e) { falla(mundo + ": cerrarDia se cayó: " + e.message); }
  return st.movs.length;
}

const t0 = Date.now(); let hechas = 0, mundos = 0, movs = 0;
while (hechas < N && fallas < 40) { const n = Math.min(400, N - hechas); movs += correrMundo(n, "día " + (mundos + 1)); hechas += n; mundos++; }
console.log(malos.join("\n"));
console.log(Object.keys(cuenta).sort().map(k => "  " + k + ": " + cuenta[k]).join("\n"));
console.log("negocio: " + hechas + " operaciones en " + mundos + " días (" + movs + " movimientos), " + fallas + " fallas · " + ((Date.now() - t0) / 1000).toFixed(1) + " s");
process.exit(fallas ? 1 : 0);
