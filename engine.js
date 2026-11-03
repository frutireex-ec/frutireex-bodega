/* Frutireex · Prototipo bodega V5 — Motor de inventario Bodega ⇄ Local.
   Todo movimiento se guarda como una lista de cambios (deltas) por lugar, así se puede deshacer
   y el cierre del día se reconstruye desde la apertura. */
(function (root) {
  "use strict";
  const CAT = root.FRX_CAT || (typeof require !== "undefined" ? require("./catalog.js") : null);

  // ---------- utilidades ----------
  const r3 = n => Math.round((+n + Number.EPSILON) * 1000) / 1000;
  const r2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
  const clone = o => JSON.parse(JSON.stringify(o));
  const otro = l => (l === "B" ? "L" : "B");
  // Tres lugares, en el orden del recorrido: Bodega → Producción → Local
  const LUGS = ["B", "P", "L"];
  const pad = n => String(n).padStart(2, "0");
  /* Fecha y hora de Ecuador (America/Guayaquil, UTC-5), sin importar la zona de la computadora */
  const ZONA_EC = "America/Guayaquil";
  const fmtFecha = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_EC, year: "numeric", month: "2-digit", day: "2-digit" });
  const fmtHora = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_EC, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const fechaDe = t => fmtFecha.format(new Date(t));
  const horaSeg = t => fmtHora.format(new Date(t));
  const horaDe = t => horaSeg(t).slice(0, 5);
  /* 1:05:09 (horas, minutos, segundos) */
  const duracion = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 3600) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60); };
  const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

  function num(n, dec) {
    if (dec === undefined) dec = Math.abs(n) >= 100 || Number.isInteger(r3(n)) ? 0 : (Math.abs(n) < 1 ? 2 : 1);
    let s = (+n).toFixed(dec);
    if (dec > 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    const [e, d] = s.split(".");
    const miles = e.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return d ? miles + "," + d : miles;
  }
  function dinero(n) {
    const s = Math.abs(+n || 0).toFixed(2).split(".");
    return (n < -0.004 ? "−" : "") + "$" + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1];
  }
  function plural(w, n) {
    if (Math.abs(n - 1) < 1e-9) return w;
    if (/[aeiouáéó]$/i.test(w)) return w + "s";
    if (/z$/.test(w)) return w.slice(0, -1) + "ces";
    return w + "es";
  }
  const U_TXT = { kg: "kg", L: "L", u: "u" };

  // ---------- catálogo dentro del estado (editable) ----------
  function catalogoBase() {
    const prods = {};
    CAT.PRODUCTOS.forEach(p => { prods[p.id] = clone(p); });
    const cat = { prods, orden: CAT.PRODUCTOS.map(p => p.id), recetas: clone(CAT.RECETAS),
      preps: clone(CAT.PREPARACIONES), menu: clone(CAT.MENU), mezcla: clone(CAT.MEZCLA), tol: clone(CAT.TOLERANCIA) };
    costearPreparados(cat);
    return cat;
  }
  function costearPreparados(cat) {
    Object.keys(cat.preps).forEach(id => {
      const pr = cat.preps[id]; let c = 0;
      Object.keys(pr.usa).forEach(p => { c += pr.usa[p] * (cat.prods[p] ? cat.prods[p].c : 0); });
      if (cat.prods[id]) cat.prods[id].c = r2(c / pr.sale);
    });
  }
  function toppingsDe(cat) {
    const ts = cat.orden.map(id => cat.prods[id]).filter(p => p.top);
    const tot = ts.reduce((a, p) => a + p.top, 0);
    return ts.map(p => [p.id, p.top / tot]);
  }

  // ---------- formatos de cantidad ----------
  function empaque(p, nombre) { return (p.e || []).find(e => e[0] === nombre); }
  let PESO = "kg";
  function setPeso(u) { PESO = u === "lb" ? "lb" : "kg"; }
  function fmtBase(p, q) {
    const a = Math.abs(q), sg = q < 0 ? "−" : "";
    if (p.u === "kg" && PESO === "lb" && a >= 0.1) return sg + num(a / 0.45359) + " lb";
    // menos de 100 g o 100 ml: en gramos/ml, que se lee mejor que «0,004 kg»
    if ((p.u === "kg" || p.u === "L") && a > 0 && a < 0.1) return sg + Math.max(1, Math.round(a * 1000)) + (p.u === "kg" ? " g" : " ml");
    return sg + num(a) + " " + U_TXT[p.u];
  }
  function fmtCant(p, q) {
    q = r3(q); const a = Math.abs(q), sg = q < 0 ? "−" : "";
    for (const e of (p.e || [])) {
      if (!(e[1] > 0) || a + 1e-9 < e[1]) continue;
      // un empaque de 1 kg o 1 L que no es el principal se muestra en kg/L («3 kg», no «3 fundas»)
      if (e[1] === 1 && p.u !== "u" && (e !== p.e[0] || Math.abs(a - Math.round(a)) > 1e-6)) continue;
      const k = Math.floor(a / e[1] + 1e-9), resto = r3(a - k * e[1]);
      let s = sg + num(k, 0) + " " + plural(e[0], k);
      if (resto > 0.0005) s += " + " + fmtBase(p, resto);
      return s;
    }
    return fmtBase(p, q);
  }
  const CAP = x => x.charAt(0).toUpperCase() + x.slice(1);
  const nf = p => (p.f || p.n.toLowerCase());
  function lista(arr) { return arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " y " + arr[arr.length - 1]; }
  // en el local, fruta y preparados se cuentan en kilos (se llevan en recipientes y se pesan)
  // en producción y en el local, la fruta y lo preparado se cuentan en kilos (van en recipientes y se pesan)
  function fmtEn(p, q, l) { return l !== "B" && p.verL ? fmtBase(p, q) : fmtCant(p, q); }
  function fmtCantLargo(p, q) {
    const a = fmtCant(p, q), b = fmtBase(p, q);
    return a === b ? a : a + " (" + b + ")";
  }

  // ---------- estado ----------
  function crearEstado(opc) {
    opc = opc || {};
    const t = opc.t || Date.now();
    const st = {
      v: 1, cat: catalogoBase(), reloj: opc.reloj || null, seq: 1,
      dia: fechaDe(t), abierto: false, tApertura: null,
      stock: { B: {}, P: {}, L: {} }, lotes: { B: {}, P: {}, L: {} },
      transito: [], pedidos: [], movs: [], ventas: [],
      apertura: { B: {}, P: {}, L: {} }, conteo: { B: {}, P: {}, L: {} }, historial: [], alertasVistas: {},
      config: configBase()
    };
    if (opc.stock) cargarStock(st, opc.stock, opc.lotes, t);
    return st;
  }
  function configBase() {
    return { recepcionConfirmada: true, autoConfirmarSeg: 0, escucharRespuesta: true, unidadPeso: "kg", hablar: true, minutosTransito: 20, minutosPedido: 10, minutosViaje: 5, ventasDiaEstimadas: 110,
      pinSupervisor: null, minutosSinPin: 2 }; // el PIN no viene escrito: el supervisor lo crea la primera vez
  }
  function ahora(st) { return st.reloj != null ? st.reloj : Date.now(); }
  /* Estados guardados antes de que existiera producción: se les agrega el lugar vacío */
  function asegurarLugares(st) {
    ["stock", "lotes", "apertura", "conteo"].forEach(k => { st[k] = st[k] || {}; LUGS.forEach(l => { st[k][l] = st[k][l] || {}; }); });
    return st;
  }
  /* Por dónde pasa un producto (ruta del catálogo) y a dónde va si no se dice */
  function rutaDe(p) { return (p && p.ruta && p.ruta.length) ? p.ruta : ["B", "L"]; }
  function destino(st, pid, de) {
    const r = rutaDe(P(st, pid)), i = r.indexOf(de);
    if (i >= 0 && i < r.length - 1) return r[i + 1];   // sigue su recorrido
    if (i > 0) return r[i - 1];                         // ya está al final: vuelve al lugar anterior
    if (de === "P") return "L";
    if (de === "L") return r.includes("P") && !r.includes("B") ? "P" : "B";
    return r.includes("P") && !r.includes("L") ? "P" : "L";
  }
  function origen(st, pid, a) {
    const r = rutaDe(P(st, pid)), i = r.indexOf(a);
    if (i > 0) return r[i - 1];
    if (a === "L") return r.includes("P") ? "P" : "B";
    return "B";
  }
  function id(st, pre) { return pre + (st.seq++); }
  function P(st, pid) { return st.cat.prods[pid]; }
  function stockDe(st, l, p) { return r3(st.stock[l][p] || 0); }
  function enTransito(st, p, a) {
    let q = 0;
    st.transito.forEach(tr => { if (tr.estado === "pendiente" && (!a || tr.a === a)) tr.items.forEach(it => { if (it.p === p) q += it.q; }); });
    return r3(q);
  }

  function cargarStock(st, stock, lotes, t) {
    LUGS.forEach(l => {
      Object.keys(stock[l] || {}).forEach(p => {
        st.stock[l][p] = r3(stock[l][p]);
        const pr = P(st, p);
        if (pr && pr.per) {
          const ls = lotes && lotes[l] && lotes[l][p];
          st.lotes[l][p] = ls ? clone(ls) : [{ q: r3(stock[l][p]), f: fechaDe(t) }];
        }
      });
    });
  }

  // ---------- lotes (perecibles, primero en entrar primero en salir) ----------
  function sacarLotes(st, l, p, q, fechaHoy) {
    const pr = P(st, p); if (!pr || !pr.per) return null;
    const ls = st.lotes[l][p] || (st.lotes[l][p] = []);
    ls.sort((a, b) => (a.f < b.f ? -1 : 1));
    const sacados = []; let falta = q;
    while (falta > 0.0005 && ls.length) {
      const lo = ls[0], tom = Math.min(lo.q, falta);
      sacados.push({ q: r3(tom), f: lo.f }); lo.q = r3(lo.q - tom); falta = r3(falta - tom);
      if (lo.q <= 0.0005) ls.shift();
    }
    if (falta > 0.0005) sacados.push({ q: r3(falta), f: fechaHoy, sinLote: true });
    return sacados;
  }
  function ponerLotes(st, l, p, q, lotes, fechaHoy) {
    const pr = P(st, p); if (!pr || !pr.per) return;
    const ls = st.lotes[l][p] || (st.lotes[l][p] = []);
    if (lotes && lotes.length) {
      let tot = 0;
      lotes.forEach(lo => { if (!lo.sinLote) { ls.push({ q: lo.q, f: lo.f }); tot += lo.q; } });
      if (q - tot > 0.0005) ls.push({ q: r3(q - tot), f: fechaHoy });
    } else ls.push({ q: r3(q), f: fechaHoy });
    // juntar lotes del mismo día
    const m = {}; ls.forEach(lo => { m[lo.f] = r3((m[lo.f] || 0) + lo.q); });
    st.lotes[l][p] = Object.keys(m).sort().map(f => ({ q: m[f], f }));
  }

  // ---------- aplicar / deshacer ----------
  /* mov: { tipo, deltas:[{l,p,q,lotes?}], por, via, frase, conf, ref, nota, titulo } */
  function aplicar(st, mov) {
    const t = mov.t || ahora(st), hoy = fechaDe(t);
    mov.id = mov.id || id(st, "M");
    mov.t = t; mov.deshecho = false;
    (mov.deltas || []).forEach(d => {
      d.q = r3(d.q);
      if (d.q < 0) { const s = sacarLotes(st, d.l, d.p, -d.q, hoy); if (s) d.lotesSacados = s; }
      else if (d.q > 0) ponerLotes(st, d.l, d.p, d.q, d.lotes, hoy);
      st.stock[d.l][d.p] = r3((st.stock[d.l][d.p] || 0) + d.q);
    });
    st.movs.push(mov);
    return mov;
  }
  function revertirDeltas(st, mov) {
    const hoy = fechaDe(ahora(st));
    (mov.deltas || []).slice().reverse().forEach(d => {
      st.stock[d.l][d.p] = r3((st.stock[d.l][d.p] || 0) - d.q);
      if (d.q < 0 && d.lotesSacados) ponerLotes(st, d.l, d.p, -d.q, d.lotesSacados, hoy);
      else if (d.q > 0) sacarLotes(st, d.l, d.p, d.q, hoy);
    });
  }
  function deshacer(st, movId, meta) {
    meta = meta || {};
    const mov = st.movs.find(m => m.id === movId);
    if (!mov) return { ok: false, msg: "No encontré ese movimiento." };
    if (mov.deshecho) return { ok: false, msg: "Ese movimiento ya estaba deshecho." };
    if (mov.tipo === "envio") {
      const tr = st.transito.find(x => x.id === mov.ref);
      if (tr && tr.estado !== "pendiente") return { ok: false, msg: "Ese envío ya fue recibido " + CAT.LUGARES[tr.a].en + ". Deshaz primero la recepción." };
      if (tr) tr.estado = "anulado";
      if (tr && tr.pedido) { const pe = st.pedidos.find(x => x.id === tr.pedido); if (pe) pe.estado = "pendiente"; }
      if (tr && tr.saldo) { const sa = st.pedidos.find(x => x.id === tr.saldo); if (sa && sa.estado === "pendiente") { sa.estado = "anulado"; const ms = st.movs.find(x => x.tipo === "pedido" && x.ref === sa.id && !x.deshecho); if (ms) { ms.deshecho = true; ms.tDeshecho = ahora(st); } } }
    }
    if (mov.tipo === "recepcion") {
      const tr = st.transito.find(x => x.id === mov.ref);
      if (tr) { tr.estado = "pendiente"; tr.recibido = null; tr.tRec = null; }
    }
    if (mov.tipo === "venta") { const v = st.ventas.find(x => x.mov === mov.id); if (v) v.deshecha = true; }
    // (3-nov-2026) listas limpias: deshacer «pedido quitado» lo vuelve a poner; deshacer lo que se decidió de un faltante lo vuelve a dejar en rojo
    if (mov.tipo === "pedido_quitado") { const pe = st.pedidos.find(x => x.id === mov.ref); if (pe && pe.estado === "anulado") { pe.estado = "pendiente"; pe.quitado = null; } }
    if (mov.tipo === "pedido") {
      const pe = st.pedidos.find(x => x.id === mov.ref);
      if (pe && pe.estado === "despachado") return { ok: false, msg: "Ese pedido ya salió " + CAT.LUGARES[pe.a].de + ". Deshaz primero el envío." };
      if (pe) pe.estado = "anulado";
    }
    if (!meta.forzar) {
      const neg = (mov.deltas || []).filter(d => d.q > 0 && stockDe(st, d.l, d.p) - d.q < -0.0005);
      if (neg.length) {
        const d = neg[0], p = P(st, d.p);
        return { ok: false, sinStock: true, msg: "No se puede quitar: parte de " + nf(p) + " ya se usó o se movió (" + CAT.LUGARES[d.l].en + " quedan " + fmtCant(p, stockDe(st, d.l, d.p)) + "). Quita primero lo que se registró después." };
      }
    }
    // (después de revisar que se puede: si lo devuelto ya se usó, no se toca nada)
    if (mov.tipo === "devolucion" || mov.tipo === "perdida" || mov.tipo === "sigue_en_camino") {
      const tr = st.transito.find(x => x.id === mov.ref);
      if (mov.tipo === "sigue_en_camino" && mov.nuevo) { const nv = st.transito.find(x => x.id === mov.nuevo); if (nv && nv.estado !== "pendiente") return { ok: false, msg: "Lo que seguía en camino ya llegó. Deshaz primero esa recepción." }; if (nv) nv.estado = "anulado"; }
      if (tr) tr.revisada = null;
    }
    if (mov.tipo === "conteo") {
      // si hay un conteo posterior del mismo producto, ese sigue valiendo: solo se arregla la cadena
      const despues = st.movs.find(m => m !== mov && m.tipo === "conteo" && !m.deshecho && m.lugar === mov.lugar && m.p === mov.p && st.movs.indexOf(m) > st.movs.indexOf(mov));
      if (despues) despues.previo = mov.previo;
      else { const prev = mov.previo; if (prev === undefined || prev === null) delete st.conteo[mov.lugar][mov.p]; else st.conteo[mov.lugar][mov.p] = prev; }
    }
    revertirDeltas(st, mov);
    mov.deshecho = true; mov.tDeshecho = ahora(st); mov.deshechoPor = meta.por || null; mov.autorizo = meta.autorizo || null;
    return { ok: true, msg: "Deshecho: " + (mov.titulo || mov.tipo) + (meta.autorizo ? " (autorizó " + meta.autorizo + ")" : "") };
  }
  function ultimoDeshacible(st, lugar) {
    for (let i = st.movs.length - 1; i >= 0; i--) {
      const m = st.movs[i];
      if (!m.deshecho && m.tipo !== "ajuste_cierre" && m.tipo !== "apertura" && m.tipo !== "cierre" && m.tipo !== "no_movido" && m.tipo !== "aviso" && m.via !== "sistema" && (!lugar || m.lugar === lugar)) return m;
    }
    return null;
  }

  // ---------- operaciones ----------
  function itemsTexto(st, items) { return lista(items.map(it => fmtCant(P(st, it.p), it.q) + " de " + nf(P(st, it.p)))); }

  /* Un producto de un pedido o envío. Los insumos de una receta llevan para qué son (rec: «crema_reex», recQ: kilos que se van a preparar):
     así el pedido se nombra «insumos para 5 kg de crema Reex» y no con la lista de la receta. */
  function copiaItem(x) { const y = { p: x.p, q: r3(x.q) }; if (x.emp) y.emp = x.emp; if (x.rec) { y.rec = x.rec; y.recQ = x.recQ; } return y; }
  function despachar(st, o) {
    const de = o.de, a = o.a || destino(st, (o.items[0] || {}).p, o.de);
    const tr = { id: id(st, "T"), de, a, items: o.items.map(copiaItem), t: ahora(st), por: o.por, estado: "pendiente", pedido: o.pedido || null };
    const mov = aplicar(st, {
      tipo: "envio", lugar: de, de, a, ref: tr.id, por: o.por, via: o.via, frase: o.frase, conf: o.conf,
      titulo: "Envío " + CAT.LUGARES[de].nombre + " → " + CAT.LUGARES[a].nombre,
      deltas: tr.items.map(it => ({ l: de, p: it.p, q: -it.q }))
    });
    tr.lotes = {}; mov.deltas.forEach(d => { if (d.lotesSacados) tr.lotes[d.p] = d.lotesSacados; });
    st.transito.push(tr);
    let saldo = null;
    if (o.pedido) {
      const pe = st.pedidos.find(x => x.id === o.pedido);
      if (pe) {
        pe.estado = "despachado"; pe.envio = tr.id;
        // si salió menos de lo pedido, lo que falta queda como pedido pendiente (no se pierde)
        const falta = pe.items.map(it => { const sale = tr.items.filter(x => x.p === it.p).reduce((a, x) => a + x.q, 0); return Object.assign({}, it, { q: r3(it.q - sale) }); }).filter(x => x.q > 0.0005);
        if (falta.length && o.saldo !== false) {
          saldo = { id: id(st, "P"), de: pe.de, a: pe.a, items: falta.map(copiaItem), t: ahora(st), por: pe.por, estado: "pendiente", saldoDe: pe.id };
          st.pedidos.push(saldo); tr.saldo = saldo.id;
          aplicar(st, { tipo: "pedido", lugar: pe.de, de: pe.de, a: pe.a, ref: saldo.id, por: o.por, via: "sistema", deltas: [],
            titulo: "Saldo del pedido de " + CAT.LUGARES[pe.de].nombre + " a " + CAT.LUGARES[pe.a].nombre, info: itemsTexto(st, saldo.items) + " (no alcanzó al despachar)" });
        }
      }
    }
    let rec = null;
    if (!st.config.recepcionConfirmada || o.recibirYa) rec = recibir(st, tr.id, { por: o.por, via: "auto" });
    return { mov, transito: tr, recepcion: rec, saldo };
  }
  function recibir(st, trId, o) {
    o = o || {};
    const tr = st.transito.find(x => x.id === trId);
    if (!tr || tr.estado !== "pendiente") return null;
    if (o.observacion) tr.observacion = o.observacion;
    const cant = {}; tr.items.forEach(it => { cant[it.p] = o.cantidades && o.cantidades[it.p] != null ? r3(o.cantidades[it.p]) : it.q; });
    const mov = aplicar(st, {
      tipo: "recepcion", lugar: tr.a, de: tr.de, a: tr.a, ref: tr.id, por: o.por, via: o.via || "toque", frase: o.frase,
      titulo: "Recibido en " + CAT.LUGARES[tr.a].nombre,
      deltas: tr.items.map(it => ({ l: tr.a, p: it.p, q: cant[it.p], lotes: tr.lotes && tr.lotes[it.p] }))
    });
    const dif = tr.items.filter(it => Math.abs(cant[it.p] - it.q) > 0.0005);
    tr.estado = dif.length ? "diferencia" : "recibido";
    tr.recibido = cant; tr.tRec = ahora(st);
    if (dif.length) mov.nota = "Llegó distinto: " + dif.map(it => P(st, it.p).n + " " + fmtCant(P(st, it.p), cant[it.p]) + " de " + fmtCant(P(st, it.p), it.q)).join("; ");
    if (o.observacion) mov.nota = (mov.nota ? mov.nota + " · " : "") + "Observación: " + o.observacion;
    return mov;
  }
  /* Equivalencias para que siempre se vean las dos medidas: cajas y kilos (o latas y kilos, cajas y litros…).
     Se usa el empaque principal del producto (el primero del catálogo), si no es de 1 kg o 1 L. */
  function empEquiv(p) { if (!p || p.u === "u") return null; const e = (p.e || [])[0]; return e && e[1] > 0 && Math.abs(e[1] - 1) > 1e-9 ? e : null; }
  function cuantosEmp(p, q, emp) {
    const e = emp ? empaque(p, emp) : empEquiv(p);
    if (!e || !(e[1] > 0) || q == null) return "";
    const n = r3(Math.abs(q) / e[1]);
    if (n < 0.005 && Math.abs(q) > 0) return "";   // menos de una centésima de empaque: no se dice «0 cajas»
    return Math.abs(n - 1) < 1e-9 ? "1 " + e[0] : num(n, Number.isInteger(n) ? 0 : 2) + " " + plural(e[0], n);
  }
  /* «20 kg» → « (5 cajas)». Vacío si el producto no tiene un empaque para comparar. */
  function enCajas(p, q) { const c = cuantosEmp(p, q); return c ? " (" + c + ")" : ""; }
  /* Las dos medidas juntas: con el empaque que se dijo primero («2 cajas (8 kg)»), o en kilos primero («10 kg (2,5 cajas)») */
  function fmtComo(p, q, emp) {
    if (q == null) return "";
    const e = emp ? empaque(p, emp) : null;
    if (e && e[1] > 0) { const c = cuantosEmp(p, q, emp), b = fmtBase(p, q); return c === b ? c : c + " (" + b + ")"; }
    if (empEquiv(p)) return fmtBase(p, q) + enCajas(p, q);
    return fmtCantLargo(p, q);
  }
  /* Para los estantes y la hoja: «5 cajas · 20 kg» */
  function fmtDoble(p, q) { const c = cuantosEmp(p, q); return c ? c + " · " + fmtBase(p, q) : fmtCantLargo(p, q); }
  /* Marca una diferencia de envío como revisada por alguien (queda en la bitácora) */
  function marcarDifRevisada(st, trId, o) {
    o = o || {};
    const tr = st.transito.find(x => x.id === trId);
    if (!tr || tr.estado !== "diferencia" || tr.revisada) return null;
    tr.revisada = { por: o.por || "Sin nombre", t: ahora(st) };
    const m = st.movs.find(x => x.tipo === "recepcion" && x.ref === tr.id && !x.deshecho);
    if (m) m.nota = (m.nota ? m.nota + " · " : "") + "Revisada por " + tr.revisada.por + " a las " + horaSeg(tr.revisada.t);
    return m || null;
  }
  /* (3-nov-2026, Freddy: «que se vayan limpiando las listas… ¿lo quito, lo dejo así?») quitar un pedido pendiente (o el saldo que quedó de él).
     No toca el inventario; queda en la bitácora quién lo quitó y por qué. Deshacerlo lo vuelve a poner pendiente. */
  function quitarPedido(st, peId, o) {
    o = o || {};
    const pe = st.pedidos.find(x => x.id === peId);
    if (!pe || pe.estado !== "pendiente") return null;
    pe.estado = "anulado"; pe.quitado = { por: o.por || null, t: ahora(st), motivo: o.motivo || null };
    return aplicar(st, { tipo: "pedido_quitado", lugar: o.lugar || pe.a, de: pe.de, a: pe.a, ref: pe.id, por: o.por, via: o.via, frase: o.frase, deltas: [],
      titulo: (pe.saldoDe ? "Saldo quitado" : "Pedido quitado") + " (" + CAT.LUGARES[pe.de].nombre + " → " + CAT.LUGARES[pe.a].nombre + ")",
      info: itemsTexto(st, pe.items) + (o.motivo ? " · " + o.motivo : ""), nota: o.motivo || null });
  }
  /* Lo que faltó en una llegada (lo que salió menos lo que llegó) */
  function faltaDe(st, tr) {
    if (!tr) return [];
    return tr.items.map(it => { const rec = tr.recibido && tr.recibido[it.p] != null ? tr.recibido[it.p] : it.q; const y = { p: it.p, q: r3(it.q - rec) }; if (it.emp) y.emp = it.emp; return y; }).filter(x => x.q > 0.0005);
  }
  /* Qué pasó con lo que faltó en una llegada (diferencia en rojo):
       «devolver»: nunca salió o volvió → se suma otra vez al lugar que lo mandó
       «camino»:   viene después → queda un envío pendiente con lo que falta (sin volver a descontar: ya salió)
       «perdido»:  se perdió o se dañó en el camino → queda anotado (el inventario ya no lo tenía)
       «dejar»:    se deja así (revisada)
     Cualquiera de las cuatro quita la diferencia de la franja roja. */
  function resolverDiferencia(st, trId, o) {
    o = o || {};
    const tr = st.transito.find(x => x.id === trId);
    if (!tr || tr.estado !== "diferencia" || tr.revisada) return null;
    const falta = faltaDe(st, tr), acc = o.accion, L = CAT.LUGARES;
    const base = { de: tr.de, a: tr.a, ref: tr.id, por: o.por, via: o.via, frase: o.frase };
    let mov = null, nuevo = null;
    if (acc === "devolver" && falta.length) {
      mov = aplicar(st, Object.assign({}, base, { tipo: "devolucion", lugar: tr.de, de: tr.a, a: tr.de, titulo: "Vuelve " + L[tr.de].a + " lo que no llegó " + L[tr.a].a,
        deltas: falta.map(x => ({ l: tr.de, p: x.p, q: x.q, lotes: tr.lotes && tr.lotes[x.p] })), info: itemsTexto(st, falta) }));
    } else if (acc === "camino" && falta.length) {
      nuevo = { id: id(st, "T"), de: tr.de, a: tr.a, items: falta.map(copiaItem), t: ahora(st), por: o.por, estado: "pendiente", pedido: null, restoDe: tr.id, lotes: tr.lotes || {} };
      st.transito.push(nuevo);
      mov = aplicar(st, Object.assign({}, base, { tipo: "sigue_en_camino", lugar: tr.a, titulo: "Sigue en camino " + L[tr.de].de + " " + L[tr.a].a, deltas: [], info: itemsTexto(st, falta) }));
      mov.nuevo = nuevo.id;
    } else if (acc === "nohabia" && falta.length) {
      // salió en el sistema pero nunca hubo: el inventario del que lo mandó tenía de más. Ya se descontó al despachar, así que queda corregido; se anota.
      mov = aplicar(st, Object.assign({}, base, { tipo: "perdida", lugar: tr.de, titulo: "No había " + L[tr.de].en + " (el sistema decía que sí)", deltas: [], info: itemsTexto(st, falta),
        nota: "No había " + L[tr.de].en + ": el inventario del sistema tenía de más. Conviene contar " + L[tr.de].art + "." }));
    } else if (acc === "perdido" && falta.length) {
      mov = aplicar(st, Object.assign({}, base, { tipo: "perdida", lugar: tr.a, titulo: "Se perdió en el camino " + L[tr.de].de + " " + L[tr.a].a, deltas: [], info: itemsTexto(st, falta), nota: o.motivo || "Se perdió o se dañó en el camino" }));
    }
    tr.revisada = { por: o.por || "Sin nombre", t: ahora(st), accion: acc, mov: mov ? mov.id : null, nuevo: nuevo ? nuevo.id : null };
    const m = st.movs.find(x => x.tipo === "recepcion" && x.ref === tr.id && !x.deshecho);
    const qTxt = { nohabia: "no había " + L[tr.de].en, devolver: "lo que faltó volvió " + L[tr.de].a, camino: "lo que faltó sigue en camino", perdido: "lo que faltó se perdió en el camino", dejar: "se dejó así" }[acc] || "revisada";
    if (m) m.nota = (m.nota ? m.nota + " · " : "") + "Resuelta: " + qTxt + (o.por ? " (" + o.por + ")" : "");
    return { mov, nuevo, falta, tr };
  }
  function comprar(st, o) {
    const a = o.a || "B";
    return aplicar(st, { tipo: "compra", lugar: a, de: "prov", a, por: o.por, via: o.via, frase: o.frase, conf: o.conf, nota: o.prov,
      titulo: o.titulo || "Compra a proveedor → " + CAT.LUGARES[a].nombre,
      deltas: o.items.map(it => ({ l: a, p: it.p, q: it.q })) });
  }
  function merma(st, o) {
    return aplicar(st, { tipo: "merma", lugar: o.lugar, de: o.lugar, a: "merma", por: o.por, via: o.via, frase: o.frase, conf: o.conf,
      nota: o.motivo || "Dañado", titulo: "Merma en " + CAT.LUGARES[o.lugar].nombre,
      deltas: o.items.map(it => ({ l: o.lugar, p: it.p, q: -it.q })) });
  }
  function consumoReceta(st, k, n, factor) {
    const rec = st.cat.recetas[k]; if (!rec) return [];
    const out = {};
    Object.keys(rec).forEach(p => {
      if (p === "toppings") toppingsDe(st.cat).forEach(([tp, w]) => { out[tp] = (out[tp] || 0) + rec[p] * w * n; });
      else out[p] = (out[p] || 0) + rec[p] * n * (factor && factor[p] ? factor[p] : 1);
    });
    return Object.keys(out).map(p => ({ p, q: r3(out[p]) }));
  }
  function vender(st, o) {
    const [prod, tam] = o.k.split("|"), n = o.n || 1;
    const m = st.cat.menu.find(x => x.id === prod);
    const precio = m ? (m.tam[tam] || 0) * n : 0;
    const items = consumoReceta(st, o.k, n);
    const mov = aplicar(st, { tipo: "venta", lugar: "L", de: "L", a: "cliente", por: o.por, via: o.via || "toque", frase: o.frase,
      titulo: "Venta " + n + " × " + (m ? m.n : prod) + (tam === "M" ? " Midium" : tam === "B" ? " Big" : ""),
      deltas: items.map(it => ({ l: "L", p: it.p, q: -it.q })), precio });
    st.ventas.push({ id: id(st, "V"), mov: mov.id, t: mov.t, k: o.k, n, precio, via: o.via });
    return mov;
  }
  function preparar(st, o) {
    const pr = st.cat.preps[o.prep]; const n = o.tandas || 1, l = o.lugar || P(st, o.prep).hecho || "P";
    const deltas = Object.keys(pr.usa).map(p => ({ l, p, q: -pr.usa[p] * n }));
    deltas.push({ l, p: o.prep, q: pr.sale * n });
    return aplicar(st, { tipo: "produccion", lugar: l, de: l, a: l, por: o.por, via: o.via, frase: o.frase, conf: o.conf,
      titulo: "Preparación: " + num(n, Number.isInteger(n) ? 0 : 2) + " " + plural(pr.tanda, n) + " de " + nf(P(st, o.prep)) + " (" + fmtBase(P(st, o.prep), pr.sale * n) + ")", deltas });
  }
  function faltaParaPreparar(st, prep, tandas, l) {
    const pr = st.cat.preps[prep]; const f = [];
    Object.keys(pr.usa).forEach(p => { const nec = pr.usa[p] * tandas, hay = stockDe(st, l || P(st, prep).hecho || "P", p); if (hay + 0.0005 < nec) f.push({ p, nec: r3(nec), hay }); });
    return f;
  }
  function pedir(st, o) {
    const de = o.de, a = o.a || origen(st, (o.items[0] || {}).p, o.de); // de = quien pide, a = quien debe despachar
    const pe = { id: id(st, "P"), de, a, items: o.items.map(copiaItem), t: ahora(st), por: o.por, estado: "pendiente" };
    st.pedidos.push(pe);
    aplicar(st, { tipo: "pedido", lugar: de, de, a, ref: pe.id, por: o.por, via: o.via, frase: o.frase, conf: o.conf, deltas: [],
      titulo: "Pedido de " + CAT.LUGARES[de].nombre + " a " + CAT.LUGARES[a].nombre, info: itemsTexto(st, pe.items) });
    return pe;
  }
  /* Lo que se decidió NO mover (y por qué): queda en la bitácora, sin tocar el inventario */
  function noMovido(st, o) {
    const pe = o.pedido ? st.pedidos.find(x => x.id === o.pedido) : null;
    if (pe) (pe.rechazos = pe.rechazos || []).push({ t: ahora(st), por: o.por || null, motivo: o.motivo || null });
    return aplicar(st, { tipo: "no_movido", lugar: o.lugar, de: o.de || o.lugar, a: o.a || null, ref: o.pedido || null, por: o.por, via: o.via, frase: o.frase, deltas: [],
      titulo: "No se movió" + (pe ? " (pedido " + CAT.LUGARES[pe.de].de + ")" : ""), info: (o.que ? o.que + " · " : "") + "Motivo: " + (o.motivo || "no lo dijo"), nota: o.motivo || null });
  }
  /* (2-nov-2026, Freddy) Aviso entre lugares, dicho por voz o puesto por Rex: «nos estamos quedando sin leche», «la crema ya va en camino», «se dañó la licuadora».
     No toca el inventario; queda en la bitácora con quién, desde dónde, para quién y a qué hora. `vistos` guarda en qué lugar ya lo vieron
     (listo para sincronizar entre equipos más adelante: cada aviso tiene su id y su hora). */
  function avisar(st, o) {
    const para = Array.isArray(o.para) && o.para.length ? o.para.filter(x => CAT.LUGARES[x]) : LUGS.slice();
    const a = para.length >= LUGS.length ? "todos" : para.map(x => CAT.LUGARES[x].nombre).join(" y ");
    return aplicar(st, { tipo: "aviso", lugar: o.lugar, de: o.lugar, a: para.length === 1 ? para[0] : null, para, nivel: o.nivel || "normal", clase: o.clase || null, p: o.p || null,
      por: o.por || null, via: o.via || "voz", frase: o.frase, deltas: [], vistos: {},
      titulo: (o.nivel === "alarma" ? "Alarma" : o.via === "sistema" ? "Alerta de stock" : "Aviso") + " " + (o.lugar ? CAT.LUGARES[o.lugar].de : "") + " para " + a, info: o.texto || "", nota: o.texto || null });
  }
  function contar(st, o) {
    const previo = st.conteo[o.lugar][o.p];
    st.conteo[o.lugar][o.p] = r3(o.q);
    return aplicar(st, { tipo: "conteo", lugar: o.lugar, p: o.p, q: r3(o.q), previo: previo === undefined ? null : previo, por: o.por, via: o.via, frase: o.frase, deltas: [],
      titulo: "Conteo en " + CAT.LUGARES[o.lugar].nombre, info: P(st, o.p).n + ": " + fmtCantLargo(P(st, o.p), o.q) });
  }

  // ---------- día: apertura y cierre ----------
  function abrirDia(st, o) {
    o = o || {};
    const t = ahora(st);
    st.dia = fechaDe(t); st.abierto = true; st.tApertura = t; st.tCierre = null;
    const fondo = o.fondo != null && isFinite(o.fondo) && o.fondo >= 0 ? r2(o.fondo) : null;
    st.caja = { fondo, t, por: o.por || null };
    st.ventas = st.ventas.filter(v => fechaDe(v.t) === st.dia);
    st.conteo = { B: {}, P: {}, L: {} };
    const cambios = [];
    if (o.conteoInicial) {
      LUGS.forEach(l => Object.keys(o.conteoInicial[l] || {}).forEach(p => {
        const dif = r3(o.conteoInicial[l][p] - stockDe(st, l, p));
        if (Math.abs(dif) > 0.0005) cambios.push({ l, p, q: dif });
      }));
      if (cambios.length) aplicar(st, { tipo: "ajuste_apertura", lugar: "B", por: o.por, via: "conteo", deltas: cambios,
        titulo: "Ajuste de apertura (cambió durante la noche)" });
    }
    asegurarLugares(st);
    st.apertura = clone(st.stock);
    aplicar(st, { tipo: "apertura", lugar: "B", por: o.por, via: "sistema", deltas: [], titulo: "Apertura de caja " + st.dia,
      nota: fondo != null ? "Efectivo inicial en caja: " + dinero(fondo) : "Sin efectivo inicial anotado" });
    return { cambios };
  }

  function resumenMovimientos(st, desde) {
    // entradas y salidas por lugar/producto desde la apertura
    const R = { B: {}, P: {}, L: {} };
    const get = (l, p) => (R[l] = R[l] || {})[p] || (R[l][p] = { compras: 0, recibido: 0, producido: 0, enviado: 0, vendido: 0, merma: 0, usadoPrep: 0, ajustes: 0 });
    st.movs.forEach(m => {
      if (m.deshecho || m.t < desde) return;
      (m.deltas || []).forEach(d => {
        const x = get(d.l, d.p);
        if (m.tipo === "compra") x.compras += d.q;
        else if (m.tipo === "recepcion") x.recibido += d.q;
        else if (m.tipo === "envio") x.enviado -= d.q;
        else if (m.tipo === "venta") x.vendido -= d.q;
        else if (m.tipo === "merma") x.merma -= d.q;
        else if (m.tipo === "produccion") { if (d.q > 0) x.producido += d.q; else x.usadoPrep -= d.q; }
        else if (m.tipo === "ajuste_apertura" || m.tipo === "ajuste") x.ajustes += d.q;
      });
    });
    return R;
  }

  function cuadre(st) {
    asegurarLugares(st);
    const desde = st.tApertura || 0;
    const R = resumenMovimientos(st, desde);
    const filas = [];
    LUGS.forEach(l => {
      st.cat.orden.forEach(pid => {
        const p = P(st, pid);
        const ini = r3(st.apertura[l][pid] || 0), sis = stockDe(st, l, pid);
        const mv = R[l][pid] || { compras: 0, recibido: 0, producido: 0, enviado: 0, vendido: 0, merma: 0, usadoPrep: 0, ajustes: 0 };
        const tieneAlgo = ini || sis || Object.values(mv).some(v => Math.abs(v) > 0.0005) || st.conteo[l][pid] != null;
        if (!tieneAlgo) return;
        const contado = st.conteo[l][pid];
        const fila = { l, p: pid, ini, sis, mv, contado: contado == null ? null : r3(contado) };
        if (contado == null) { fila.estado = "sin_contar"; fila.dif = null; }
        else {
          const dif = r3(contado - sis);
          const tol = st.cat.tol[p.u] || { pct: 0.03, min: 0.1 };
          const lim = Math.max(tol.min, Math.abs(sis) * tol.pct);
          fila.dif = dif; fila.valor = r2(dif * (p.c || 0));
          fila.estado = Math.abs(dif) <= 0.0005 ? "ok" : Math.abs(dif) <= lim ? "tolerado" : dif < 0 ? "faltante" : "sobrante";
        }
        filas.push(fila);
      });
    });
    const val = f => (f.valor || 0);
    const faltantes = filas.filter(f => f.estado === "faltante"), sobrantes = filas.filter(f => f.estado === "sobrante");
    const ventasDia = st.ventas.filter(v => !v.deshecha && v.t >= desde);
    const vasos = ventasDia.reduce((a, v) => a + v.n * (v.k.endsWith("|U") ? 0 : 1), 0);
    const ingresos = r2(ventasDia.reduce((a, v) => a + v.precio, 0));
    let costoVentas = 0, mermas = 0;
    st.movs.forEach(m => {
      if (m.deshecho || m.t < desde) return;
      if (m.tipo === "venta") m.deltas.forEach(d => { costoVentas += -d.q * (P(st, d.p).c || 0); });
      if (m.tipo === "merma") m.deltas.forEach(d => { mermas += -d.q * (P(st, d.p).c || 0); });
    });
    const pendientes = st.transito.filter(tr => tr.estado === "pendiente");
    const valTransito = r2(pendientes.reduce((a, tr) => a + tr.items.reduce((b, it) => b + it.q * (P(st, it.p).c || 0), 0), 0));
    const res = {
      dia: st.dia, filas, ventas: ventasDia.length, vasos, ingresos, costoVentas: r2(costoVentas), mermas: r2(mermas),
      faltante$: r2(faltantes.reduce((a, f) => a + val(f), 0)), sobrante$: r2(sobrantes.reduce((a, f) => a + val(f), 0)),
      nFaltantes: faltantes.length, nSobrantes: sobrantes.length, sinContar: filas.filter(f => f.estado === "sin_contar").length,
      transito: pendientes, valTransito, pedidosPend: st.pedidos.filter(x => x.estado === "pendiente"),
      conAjusteApertura: st.movs.some(m => m.tipo === "ajuste_apertura" && !m.deshecho && m.t >= desde)
    };
    res.causas = causas(st, res);
    res.rendimiento = rendimiento(st, res);
    return res;
  }

  function rendimiento(st, res) {
    // cuánta fruta se usó de verdad por cada vaso (según el conteo) frente a la receta
    const out = [];
    ["frutilla", "durazno", "banano"].forEach(pid => {
      const f = res.filas.find(x => x.l === "L" && x.p === pid);
      if (!f || f.contado == null || !f.mv.vendido) return;
      const real = f.mv.vendido - f.dif; // lo que realmente salió por ventas, si la diferencia fue a los vasos
      out.push({ p: pid, receta: r3(f.mv.vendido), real: r3(real), pct: f.mv.vendido ? r3(real / f.mv.vendido - 1) : 0 });
    });
    return out;
  }

  function causas(st, res) {
    const c = [];
    const fl = (l, p) => res.filas.find(f => f.l === l && f.p === p);
    const fruta = ["frutilla", "durazno", "banano"];
    fruta.forEach(pid => {
      const f = fl("L", pid); const p = P(st, pid);
      if (f && f.estado === "faltante") {
        const pct = f.mv.vendido ? Math.round(-f.dif / f.mv.vendido * 100) : 0;
        c.push({ nivel: "alto", p: pid, l: "L", txt: "Falta " + fmtCantLargo(p, -f.dif) + " de " + nf(p) + " en el local" +
          (pct ? " (" + pct + "% más de lo que pide la receta)" : "") + ". Lo más común: porciones más grandes que la receta o fruta dañada que no se registró como merma." });
      }
    });
    ["vaso9", "vaso12", "bandeja"].forEach(pid => {
      const f = fl("L", pid); const p = P(st, pid);
      if (f && f.estado === "faltante") c.push({ nivel: "alto", p: pid, l: "L", txt: num(-f.dif, 0) + " " + nf(p) + " salieron sin venta registrada. Revisa: ventas no cobradas, vasos regalados o de muestra, o vasos dañados." });
      if (f && f.estado === "sobrante") c.push({ nivel: "medio", p: pid, l: "L", txt: "Sobran " + num(f.dif, 0) + " " + nf(p) + ": hay ventas registradas que no usaron vaso (¿venta duplicada en caja?) o un conteo equivocado." });
    });
    // traslado sin registrar: falta en un lugar lo mismo que sobra en el otro
    const pareados = new Set();
    res.filas.forEach(f => {
      if (f.estado !== "faltante" || f.l !== "B" && f.l !== "L") return;
      const g = fl(otro(f.l), f.p);
      // se acepta hasta un 25 % de diferencia: en el lugar que recibe, parte ya se pudo usar
      if (g && g.estado === "sobrante" && Math.abs(g.dif + f.dif) <= Math.max(0.15, Math.abs(f.dif) * 0.25)) {
        const p = P(st, f.p); pareados.add(f.l + f.p); pareados.add(g.l + g.p);
        c.push({ nivel: "alto", p: f.p, l: f.l, txt: "Falta " + fmtCantLargo(p, -f.dif) + " de " + nf(p) + " " + CAT.LUGARES[f.l].en + " y sobra lo mismo " + CAT.LUGARES[g.l].en +
          ": se movió " + CAT.LUGARES[f.l].de + " " + CAT.LUGARES[g.l].a + " sin registrarlo. No es pérdida, pero hay que registrar siempre los traslados." });
      }
    });
    res.filas.forEach(f => {
      const p = P(st, f.p);
      if (pareados.has(f.l + f.p)) return;
      if (fruta.includes(f.p) && f.l === "L") return;
      if (["vaso9", "vaso12", "bandeja"].includes(f.p) && f.l === "L") return;
      if (f.estado === "faltante") {
        const e = (p.e || [])[0];
        const esEmpaque = e && e[1] > 1 && Math.abs(Math.abs(f.dif) / e[1] - Math.round(Math.abs(f.dif) / e[1])) < 0.05 && Math.abs(f.dif) >= e[1] * 0.95;
        if (esEmpaque) c.push({ nivel: "alto", p: f.p, l: f.l, txt: "" + CAP(CAT.LUGARES[f.l].en) + " falta justo " + fmtCant(p, -f.dif) + " de " + nf(p) + ". Parece un traslado que no se registró (o se llevó sin decirlo)." });
        else if (p.cat === "top" && f.l === "L") c.push({ nivel: "medio", p: f.p, l: f.l, txt: "Se usó más " + nf(p) + " de lo esperado (" + fmtBase(p, -f.dif) + "). Puede ser porción generosa en la barra." });
        else c.push({ nivel: "medio", p: f.p, l: f.l, txt: "Falta " + fmtCantLargo(p, -f.dif) + " de " + nf(p) + " " + CAT.LUGARES[f.l].en + (p.c > 0 ? " (" + dinero(-f.valor) + ")" : "") + "." });
      }
      // sin costo cargado (versión publicada) el aviso se decide por la cantidad, no por los dólares
      if (f.estado === "sobrante" && (Math.abs(f.valor) >= 0.5 || !(p.c > 0))) c.push({ nivel: "medio", p: f.p, l: f.l, txt: "Sobra " + fmtCantLargo(p, f.dif) + " de " + nf(p) + " " + CAT.LUGARES[f.l].en + ". Revisa si se contó bien o si algo llegó sin registrarse." });
    });
    res.transito.forEach(tr => c.unshift({ nivel: "alto", l: tr.a, txt: "Envío de las " + horaDe(tr.t) + " " + CAT.LUGARES[tr.de].de + " " + CAT.LUGARES[tr.a].a + " sin confirmar: " + itemsTexto(st, tr.items) + ". Confirma si llegó; si no, es mercadería perdida en el camino." }));
    st.transito.filter(tr => tr.estado === "diferencia" && !tr.revisada).forEach(tr => {
      const m = st.movs.find(x => x.tipo === "recepcion" && x.ref === tr.id && !x.deshecho);
      c.unshift({ nivel: "alto", l: tr.a, txt: "El envío de las " + horaDe(tr.t) + " llegó incompleto. " + (m && m.nota ? m.nota : "") });
    });
    if (res.conAjusteApertura) c.unshift({ nivel: "alto", txt: "Al abrir, el conteo no coincidió con el cierre anterior: algo cambió durante la noche. Revisa el ajuste de apertura en Movimientos." });
    return c;
  }

  function cerrarDia(st, o) {
    o = o || {};
    const res = cuadre(st);
    const deltas = [];
    res.filas.forEach(f => { if (f.contado != null && Math.abs(f.dif) > 0.0005) deltas.push({ l: f.l, p: f.p, q: f.dif }); });
    if (deltas.length) aplicar(st, { tipo: "ajuste_cierre", lugar: "B", por: o.por, via: "conteo", deltas, titulo: "Ajuste de cierre (inventario = conteo físico)" });
    // dinero: lo que debería haber en efectivo = efectivo inicial + ventas registradas − cobros con tarjeta o transferencia
    const caja = cuadreCaja(st, res, o);
    const tC = ahora(st);
    aplicar(st, { tipo: "cierre", lugar: "B", por: o.por, autorizo: o.autorizo || null, via: o.via || "sistema", deltas: [], titulo: "Cierre de caja " + res.dia,
      nota: caja.efectivo != null ? "Efectivo contado " + dinero(caja.efectivo) + "; esperado " + dinero(caja.esperado) + " (inicial " + dinero(caja.fondo) + " + ventas " + dinero(caja.ventas) +
        (caja.otros ? " − tarjeta/transferencia " + dinero(caja.otros) : "") + "); " + (Math.abs(caja.dif) < 0.005 ? "cuadra" : (caja.dif < 0 ? "falta " : "sobra ") + dinero(Math.abs(caja.dif))) : "Sin conteo de efectivo" });
    st.historial.push({ dia: res.dia, ventas: res.ventas, vasos: res.vasos, ingresos: res.ingresos, costoVentas: res.costoVentas, mermas: res.mermas,
      faltante: res.faltante$, sobrante: res.sobrante$, nFaltantes: res.nFaltantes, transito: res.valTransito, t: tC, caja,
      apertura: { t: st.tApertura, por: st.caja && st.caja.por || null }, cierre: { t: tC, por: o.por || null, autorizo: o.autorizo || null } });
    st.abierto = false; st.tCierre = tC; st.cajaCierre = caja; st.cierreInfo = { t: tC, por: o.por || null, autorizo: o.autorizo || null };
    return res;
  }

  /* Cuadre del dinero al cerrar: o.efectivo (contado) y o.otros (tarjeta/transferencia) son opcionales */
  function cuadreCaja(st, res, o) {
    o = o || {}; res = res || cuadre(st);
    const fondo = st.caja && st.caja.fondo != null ? st.caja.fondo : 0;
    const otros = o.otros != null && isFinite(o.otros) ? r2(o.otros) : 0;
    const esperado = r2(fondo + res.ingresos - otros);
    const efectivo = o.efectivo != null && isFinite(o.efectivo) ? r2(o.efectivo) : null;
    return { fondo, ventas: res.ingresos, otros, esperado, efectivo, dif: efectivo != null ? r2(efectivo - esperado) : null };
  }

  /* Kárdex: cada entrada y salida de un producto en un lugar, con el saldo después de cada movimiento.
     El saldo se reconstruye desde lo que hay ahora hacia atrás, así siempre termina en el inventario actual. */
  function kardex(st, l, pid, desde) {
    desde = desde || 0;
    let total = 0;
    st.movs.forEach(m => { if (!m.deshecho) (m.deltas || []).forEach(d => { if (d.l === l && d.p === pid) total += d.q; }); });
    let saldo = r3(stockDe(st, l, pid) - total), inicial = null;
    const filas = [];
    st.movs.forEach(m => {
      const ds = (m.deltas || []).filter(d => d.l === l && d.p === pid);
      const esConteo = m.tipo === "conteo" && m.lugar === l && m.p === pid;
      if (!ds.length && !esConteo) return;
      if (m.t < desde) { if (!m.deshecho) saldo = r3(saldo + ds.reduce((a, d) => a + d.q, 0)); return; }
      if (inicial == null) inicial = saldo;
      const q = r3(ds.reduce((a, d) => a + d.q, 0));
      if (!m.deshecho) saldo = r3(saldo + q);
      filas.push({ id: m.id, t: m.t, tipo: m.tipo, titulo: m.titulo, entra: q > 0 ? q : 0, sale: q < 0 ? -q : 0, saldo: m.deshecho ? null : saldo,
        por: m.por, via: m.via, frase: m.frase, nota: m.nota, ref: m.ref, deshecho: !!m.deshecho, contado: esConteo ? m.q : null });
    });
    return { inicial: inicial == null ? saldo : inicial, filas, final: r3(stockDe(st, l, pid)) };
  }

  /* Huella de la bitácora: cada movimiento lleva un código calculado con el anterior.
     Si alguien cambia los datos guardados por fuera del sistema, la cadena ya no coincide y se avisa. */
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); }
  function huellaMov(m, prev) {
    return fnv(prev + "|" + [m.id, m.t, m.tipo, m.lugar || "", m.de || "", m.a || "", m.ref || "", m.por || "", m.via || "", m.frase || "", m.deshecho ? 1 : 0,
      JSON.stringify((m.deltas || []).map(d => [d.l, d.p, r3(d.q)]))].join("|"));
  }
  // producción entra en la huella solo cuando tiene algo (así los datos guardados antes siguen coincidiendo)
  const huellaStock = st => fnv(JSON.stringify(LUGS.filter(l => l !== "P" || Object.keys((st.stock || {}).P || {}).length).map(l => Object.keys(st.stock[l] || {}).sort().map(p => [p, r3(st.stock[l][p])]))));
  function sellar(st) { let prev = "0"; st.movs.forEach(m => { m.h = huellaMov(m, prev); prev = m.h; }); st.sello = { movs: prev, stock: huellaStock(st), n: st.movs.length }; }
  function verificar(st) {
    if (!st.sello) return { ok: null, n: st.movs.length };
    let prev = "0";
    for (const m of st.movs) { if (m.h == null) return { ok: false, en: m.id, que: "un movimiento sin huella" }; const h = huellaMov(m, prev); if (h !== m.h) return { ok: false, en: m.id, que: "el movimiento " + m.id + " (" + (m.titulo || m.tipo) + ")" }; prev = h; }
    if (st.movs.length !== st.sello.n || prev !== st.sello.movs) return { ok: false, que: "la cantidad de movimientos (se borró o agregó alguno)" };
    if (huellaStock(st) !== st.sello.stock) return { ok: false, que: "el inventario guardado (no coincide con los movimientos)" };
    return { ok: true, n: st.movs.length };
  }

  // ---------- consumo esperado y alertas ----------
  function consumoDiario(st, pid) {
    // consumo esperado por día según la mezcla de ventas y las ventas estimadas del día
    const tot = st.cat.mezcla.reduce((a, x) => a + x[1], 0), V = st.config.ventasDiaEstimadas;
    let q = 0;
    st.cat.mezcla.forEach(([k, w]) => { consumoReceta(st, k, V * w / tot).forEach(it => { if (it.p === pid) q += it.q; }); });
    Object.keys(st.cat.preps).forEach(prep => {
      const pr = st.cat.preps[prep]; const usoPrep = consumoDiarioSimple(st, prep, V, tot);
      if (pr.usa[pid]) q += usoPrep / pr.sale * pr.usa[pid];
    });
    return r3(q);
  }
  function consumoDiarioSimple(st, pid, V, tot) {
    let q = 0; st.cat.mezcla.forEach(([k, w]) => { consumoReceta(st, k, V * w / tot).forEach(it => { if (it.p === pid) q += it.q; }); }); return q;
  }

  function alertas(st) {
    const A = [], t = ahora(st), hoy = fechaDe(t);
    st.cat.orden.forEach(pid => {
      const p = P(st, pid);
      const sL = stockDe(st, "L", pid), sB = stockDe(st, "B", pid), cam = enTransito(st, pid, "L");
      // Local
      if (p.min.L > 0) {
        const pedPend = st.pedidos.some(pe => pe.estado === "pendiente" && pe.de === "L" && pe.items.some(it => it.p === pid));
        if (sL <= 0.0005 && cam <= 0) A.push({ nivel: "critico", l: "L", p: pid, txt: "Se acabó " + nf(p) + " en el local", accion: { tipo: "pedir", p: pid, q: sugerido(st, pid, "L") }, yaPedido: pedPend });
        else if (sL + cam < p.min.L) A.push({ nivel: "alto", l: "L", p: pid, txt: "Local con poco " + nf(p) + ": quedan " + fmtEn(p, sL, "L") + " (mínimo " + fmtBase(p, p.min.L) + ")" + (cam ? "; " + fmtEn(p, cam, "L") + " en camino" : ""), accion: { tipo: "pedir", p: pid, q: sugerido(st, pid, "L") }, yaPedido: pedPend });
        if (sL < -0.0005) A.push({ nivel: "medio", l: "L", p: pid, txt: "Se vendió " + fmtBase(p, -sL) + " más de " + nf(p) + " de lo que el sistema tenía en el local: falta registrar una entrada o hay que contar.", accion: { tipo: "contar", p: pid, l: "L" } });
      }
      // Producción: lo preparado se prepara allí; la materia prima que usa se pide a la bodega
      const lp = p.hecho || "B", sP = stockDe(st, lp, pid);
      if (p.prep) {
        const pedL = st.pedidos.filter(pe => pe.estado === "pendiente" && pe.a === lp).reduce((q, pe) => q + pe.items.filter(it => it.p === pid).reduce((a, it) => a + it.q, 0), 0);
        if (sP < Math.max(p.min[lp] || 0, pedL) - 0.0005) A.push({ nivel: pedL > sP ? "alto" : "medio", l: lp, p: pid, txt: (pedL > sP ? "Piden " + nf(p) + ": " : "Hay que preparar " + nf(p) + ": ") + CAT.LUGARES[lp].en + " hay " + fmtCantLargo(p, sP) + (pedL > sP ? " y piden " + fmtCantLargo(p, pedL) + ". Hay que preparar." : " (mínimo " + fmtBase(p, p.min[lp] || 0) + ")."), accion: { tipo: "preparar", prep: pid } });
      }
      if (!p.prep && (p.min.P || 0) > 0 && rutaDe(p).includes("P")) {
        const sPr = stockDe(st, "P", pid), camP = enTransito(st, pid, "P");
        const pedP = st.pedidos.some(pe => pe.estado === "pendiente" && pe.de === "P" && pe.items.some(it => it.p === pid));
        if (sPr + camP < p.min.P) A.push({ nivel: sPr <= 0.0005 && camP <= 0 ? "alto" : "medio", l: "P", p: pid, txt: "Producción con poco " + nf(p) + ": quedan " + fmtEn(p, sPr, "P") + " (mínimo " + fmtBase(p, p.min.P) + ")" + (camP ? "; " + fmtEn(p, camP, "P") + " en camino" : ""), accion: { tipo: "pedir", p: pid, q: sugerido(st, pid, "P"), de: "P" }, yaPedido: pedP });
      }
      if (!p.prep && p.min.B > 0) {
        const dia = consumoDiario(st, pid), cubre = dia > 0 ? (sB + sL + stockDe(st, "P", pid)) / dia : null;
        if (sB <= 0.0005) A.push({ nivel: "critico", l: "B", p: pid, txt: "No queda " + nf(p) + " en bodega", accion: { tipo: "comprar", p: pid, q: compraSugerida(st, pid) }, cubre });
        else if (sB < p.min.B) A.push({ nivel: (cubre != null && cubre < (p.dem || 1) + 1) ? "alto" : "medio", l: "B", p: pid,
          txt: "Comprar " + nf(p) + ": en bodega quedan " + fmtCantLargo(p, sB) + (cubre != null ? ", alcanza para " + num(cubre, 1) + " días" : "") + (p.prov ? ". " + p.prov + " demora " + p.dem + " " + plural("día", p.dem) : ""),
          accion: { tipo: "comprar", p: pid, q: compraSugerida(st, pid) }, cubre });
        if (sB < -0.0005) A.push({ nivel: "medio", l: "B", p: pid, txt: "El sistema marca " + fmtBase(p, sB) + " de " + nf(p) + " en bodega: falta registrar una compra o hay que contar.", accion: { tipo: "contar", p: pid, l: "B" } });
      }
      // Perecibles: lotes viejos
      if (p.per) LUGS.forEach(l => {
        ((st.lotes[l] || {})[pid] || []).forEach(lo => {
          if (lo.q <= 0.0005) return;
          const edad = diasEntre(lo.f, hoy);
          if (edad >= p.per) A.push({ nivel: "alto", l, p: pid, txt: fmtCantLargo(p, lo.q) + " de " + nf(p) + " " + CAT.LUGARES[l].en + " tiene " + edad + " días: revisa si sirve o regístralo como merma.", accion: { tipo: "merma", p: pid, l, q: lo.q } });
          else if (edad === p.per - 1 && edad > 0) A.push({ nivel: "medio", l, p: pid, txt: "Usa primero " + fmtCant(p, lo.q) + " de " + nf(p) + " del " + lo.f.slice(8) + "/" + lo.f.slice(5, 7) + " (" + edad + (edad === 1 ? " día" : " días") + ") " + CAT.LUGARES[l].en + ".", accion: l === "B" ? { tipo: "despachar_lote", p: pid } : null });
        });
      });
    });
    st.transito.filter(tr => tr.estado === "pendiente").forEach(tr => {
      const min = Math.round((t - tr.t) / 60000);
      if (min >= st.config.minutosTransito) A.push({ nivel: "alto", l: tr.a, txt: "Hace " + min + " min salió " + CAT.LUGARES[tr.de].de + ": " + itemsTexto(st, tr.items) + ". " + CAT.LUGARES[tr.a].nombre + " todavía no confirma que llegó.", accion: { tipo: "recibir", tr: tr.id } });
    });
    st.pedidos.filter(pe => pe.estado === "pendiente").forEach(pe => {
      const min = Math.round((t - pe.t) / 60000);
      if (min >= st.config.minutosPedido) A.push({ nivel: "alto", l: pe.a, txt: CAT.LUGARES[pe.de].nombre + " pidió " + itemsTexto(st, pe.items) + " hace " + min + " min y aún no sale.", accion: { tipo: "despachar_pedido", pe: pe.id } });
    });
    const orden = { critico: 0, alto: 1, medio: 2, info: 3 };
    A.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
    return A;
  }
  function sugerido(st, pid, l) {
    const p = P(st, pid); const e = (p.e || [])[0];
    const objetivo = Math.max((p.min[l] || 0) * 2, consumoDiario(st, pid) * 0.6);
    let q = objetivo - stockDe(st, l, pid) - enTransito(st, pid, l);
    if (q <= 0) q = p.min[l] || 0;
    if (l !== "B" && p.verL) q = Math.max(1, Math.ceil(q - 0.15));
    else if (e && e[1] > 0 && e[1] <= Math.max(q * 1.6, 1)) q = Math.max(1, Math.ceil(q / e[1] - 0.15)) * e[1];
    return r3(l !== "B" && p.verL ? q : Math.max(q, e && e[1] <= q * 2 ? e[1] : q));
  }
  function compraSugerida(st, pid, o) {
    const p = P(st, pid); const e = empaque(p, p.comp) || (p.e || [])[0];
    const dia = consumoDiario(st, pid);
    // lo perecible se compra para pocos días; lo demás, para la demora del proveedor + 5 días
    const dias = p.per ? Math.min(p.per, (p.dem || 1) + 2) : (p.dem || 1) + 5;
    let q = Math.max(p.min.B * 2, dia * dias) - (o && o.sinStock ? 0 : stockDe(st, "B", pid));
    if (q <= 0) q = p.min.B;
    if (e) q = Math.max(1, Math.ceil(q / e[1])) * e[1];
    return r3(q);
  }

  // ---------- valor del inventario ----------
  function valorInventario(st, l) {
    let v = 0; st.cat.orden.forEach(pid => { v += Math.max(0, stockDe(st, l, pid)) * (P(st, pid).c || 0); }); return r2(v);
  }

  const API = { r3, r2, num, dinero, plural, fechaDe, horaDe, horaSeg, duracion, diasEntre, otro, LUGS, rutaDe, destino, origen, asegurarLugares, clone, U_TXT,
    crearEstado, configBase, catalogoBase, costearPreparados, ahora, P, stockDe, enTransito, fmtCant, fmtCantLargo, fmtBase, empaque,
    aplicar, deshacer, ultimoDeshacible, despachar, recibir, comprar, merma, vender, preparar, faltaParaPreparar, pedir, contar, noMovido, avisar,
    abrirDia, cuadre, cerrarDia, horaSeg, duracion, cuadreCaja, kardex, sellar, verificar, enCajas, cuantosEmp, empEquiv, fmtComo, fmtDoble, marcarDifRevisada, quitarPedido, faltaDe, resolverDiferencia, fmtEn, setPeso, alertas, consumoDiario, consumoReceta, sugerido, compraSugerida, valorInventario, itemsTexto, toppingsDe, nf, lista, CAP };
  root.FRX_ENG = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
