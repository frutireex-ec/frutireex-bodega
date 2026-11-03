/* Frutireex · Prototipo bodega V5 — De la frase entendida a la acción en el inventario.
   planificar(): revisa lo entendido y arma la tarjeta de confirmación (con avisos).
   ejecutar(): hace el movimiento. Lo usan la pantalla y la simulación. */
(function (root) {
  "use strict";
  const E = root.FRX_ENG || require("./engine.js");
  const CAT = root.FRX_CAT || require("./catalog.js");
  const LUG = CAT.LUGARES;

  function txtItems(st, items) { return E.lista(items.map(it => E.fmtCantLargo(E.P(st, it.p), it.q) + " de " + E.nf(E.P(st, it.p)))); }
  /* Si todos son insumos de una receta, ¿para qué son? → { p: "crema_reex", q: 5 } */
  function recetaDe(items) { const r = items && items.length && items[0].rec; return r && items.every(it => it.rec === r) ? { p: r, q: items[0].recQ } : null; }
  function txtReceta(st, rc) { const p = E.P(st, rc.p); return "insumos para " + (rc.q > 0 ? E.fmtBase(p, rc.q) + " de " : "") + E.nf(p); }
  function txtItemsCorto(st, items, l) {
    { const rc = recetaDe(items); if (rc) return txtReceta(st, rc); }
    return E.lista(items.map(it => {
      const p = E.P(st, it.p), nom = E.nf(p);
      // Si dijo el empaque («dos cajas de frutilla»), se repite en ese empaque y se agregan los kilos: «2 cajas (8 kg)».
      // Si dijo kilos, se agregan las cajas: «10 kg (2,5 cajas)». Así bodega y local ven las dos medidas.
      const emp = it.emp && (p.e || []).find(x => x[0] === it.emp);
      if (emp && emp[1] > 0 && it.q != null) return E.fmtComo(p, it.q, emp[0]) + " de " + nom;
      if (E.empEquiv(p) && it.q != null) return E.fmtComo(p, it.q) + " de " + nom;
      const c = E.fmtEn(p, it.q, l);
      // «6 bananos», «3 tarros Godzilla» en vez de «6 u de banano»
      if (/^[\d.,]+ u$/.test(c)) { const n = parseFloat(c.replace(/\./g, "").replace(",", ".")), pal = nom.split(" "); if (n !== 1 && !/s$/.test(pal[0])) pal[0] = E.plural(pal[0], n); return c.replace(/ u$/, "") + " " + pal.join(" "); }
      return c + " de " + nom;
    }));
  }
  function ruta(plan) { return LUG[plan.de].nombre + " → " + (plan.grupos && plan.grupos.length > 1 ? plan.grupos.map(g => LUG[g.a].nombre).join(" y ") : LUG[plan.a].nombre); }
  /* Reparte los productos de un envío según su destino (cada destino es un envío aparte, con su propia confirmación) */
  function agrupar(st, plan) {
    const por = {};
    plan.items.forEach(it => { const a = it.a || plan.a; (por[a] = por[a] || []).push(it); });
    const orden = ["P", "L", "B"].filter(a => por[a]);
    plan.grupos = orden.map(a => ({ a, items: por[a] }));
    if (plan.grupos.length) plan.a = plan.grupos[0].a;
    if (plan.grupos.length < 2) plan.grupos = null;
  }
  function agruparPedido(st, plan) { agrupar(st, plan); }
  function resumenTraslado(st, plan, items) {
    if (plan.grupos && plan.grupos.length > 1) return plan.grupos.map(g => txtItemsCorto(st, g.items.filter(it => items.includes(it)), g.a) + " → " + LUG[g.a].nombre).join("; ") + " (desde " + LUG[plan.de].art + ")";
    return txtItemsCorto(st, items, plan.a) + ": " + LUG[plan.de].nombre + " → " + LUG[plan.a].nombre;
  }
  /* Rehace el resumen (por ejemplo, después de quitar un producto de la lista) */
  function resumir(st, plan) {
    if (plan.tipo === "traslado") plan.resumen = txtItemsCorto(st, plan.items, "L") + ": " + ruta(plan);
    else if (plan.tipo === "pedido") plan.resumen = (plan.agotado ? "Se acabó " + LUG[plan.de].en + ". " : "") + "Pedido de " + LUG[plan.de].nombre + " a " + LUG[plan.a].nombre + ": " + txtItemsCorto(st, plan.items, "L");
    else if (plan.tipo === "merma") plan.resumen = "Merma en " + LUG[plan.lugar].nombre + ": " + txtItemsCorto(st, plan.items, plan.lugar) + " (" + (plan.motivo || "Merma").toLowerCase() + ")";
    return plan;
  }
  function quitarItem(st, plan, i) { plan.items.splice(i, 1); plan.avisos = plan.avisos.filter(a => a.code !== "duplicado"); return resumir(st, plan); }
  /* La pregunta que se hace en voz alta antes de registrar */
  function pregunta(st, plan) {
    const t = plan.tipo, its = () => txtItemsCorto(st, plan.items, "L");
    if (t === "traslado" && plan.pedido) { const pe = st.pedidos.find(x => x.id === plan.pedido); if (pe) return "¿Despacho " + (plan.ajustado ? "lo que hay del" : "el") + " pedido " + LUG[pe.de].de + ": " + its() + "?"; }
    if (t === "traslado") return "¿Deseas mover " + its() + " " + LUG[plan.de].de + " " + LUG[plan.a].a + "?";
    if (t === "pedido") return "¿Envío el pedido a " + LUG[plan.a].corto + ": " + its() + "?";
    if (t === "merma") return "¿Registro la merma de " + txtItemsCorto(st, plan.items, plan.lugar) + " " + LUG[plan.lugar].en + "?";
    // (1-nov-2026, Freddy: «que me confirme si entraron los 5») — se puede contestar «sí, todo correcto» o «no, entraron solo 3»
    if (t === "compra") return plan.aumento ? "¿Sumo " + txtItemsCorto(st, plan.items) + " " + LUG[plan.a].en + "?" : "¿Entraron " + txtItemsCorto(st, plan.items) + " " + LUG[plan.a].a + "? ¿Está correcto?";
    if (t === "recepcion") return "¿Confirmas que llegó " + (plan.detalle || "el envío") + "?";
    if (t === "conteo") return "¿Anoto el conteo: " + txtItemsCorto(st, plan.items, plan.lugar) + "?";
    if (t === "produccion") return "¿Registro " + plan.resumen.replace(/^Preparar/, "la preparación de").replace(/ \(salen.*$/, "").replace(/ \([\d.,]+ (tandas?|ollas?)\)$/, "") + "?";
    if (t === "venta") return "¿Registro la " + plan.resumen.toLowerCase() + "?";
    if (t === "deshacer") return "¿" + plan.resumen.replace(/^Deshacer/, "Deshago") + "?";
    return "¿Confirmas? " + plan.resumen;
  }

  function consulta(st, pid) {
    const p = E.P(st, pid);
    const cam = E.enTransito(st, pid);
    const dia = E.consumoDiario(st, pid);
    const ruta = E.rutaDe(p);
    // se nombran los lugares por donde pasa el producto (y cualquier otro donde haya algo)
    const lugs = E.LUGS.filter(l => ruta.includes(l) || E.stockDe(st, l, pid) > 0.0005);
    let tot = cam;
    const partes = lugs.map(l => { const q = E.stockDe(st, l, pid); tot += Math.max(0, q); return LUG[l].en + " " + (q > 0.0005 ? E.fmtCantLargo(p, q) : "nada"); });
    let s = p.n + ": " + partes.join("; ") + (cam ? "; en camino " + E.fmtCant(p, cam) : "") + ".";
    if (dia > 0) s += " Alcanza para unos " + E.num(tot / dia, 1) + " días.";
    return s;
  }

  /* Respuestas del asistente a «qué falta», «qué viene en camino», «qué me pidieron», «qué hay que preparar»,
     «cómo vamos» y «dame un resumen», para el lugar donde se pregunta. Cortas, para decirlas en voz alta. */
  function estadoLugar(st, que, l) {
    const al = E.alertas(st), aqui = LUG[l], hace = t => Math.max(0, Math.round((E.ahora(st) - t) / 60000));
    const maxN = (arr, n) => arr.length > n ? arr.slice(0, n).concat([(arr.length - n) + " más"]) : arr;
    const nombre = p => E.nf(E.P(st, p));
    if (que === "faltas") {
      const mias = al.filter(a => a.l === l && a.accion && ["pedir", "comprar", "preparar"].includes(a.accion.tipo) && !a.yaPedido);
      const pedidas = al.filter(a => a.l === l && a.yaPedido).map(a => nombre(a.p));
      if (!mias.length) return "No falta nada " + aqui.en + "." + (pedidas.length ? " Ya está pedido: " + E.lista(maxN(pedidas, 4)) + "." : "");
      const comprar = mias.filter(a => a.accion.tipo === "comprar").map(a => nombre(a.p) + (a.cubre != null ? " (alcanza " + E.num(a.cubre, 1) + " días)" : ""));
      const pedir = mias.filter(a => a.accion.tipo === "pedir").map(a => nombre(a.p) + " (quedan " + E.fmtEn(E.P(st, a.p), Math.max(0, E.stockDe(st, l, a.p)), l) + ")");
      const prep = mias.filter(a => a.accion.tipo === "preparar").map(a => nombre(a.p));
      const partes = [];
      if (pedir.length) partes.push("Hay que pedir " + E.lista(maxN(pedir, 4)) + ".");
      if (comprar.length) partes.push("Hay que comprar " + E.lista(maxN(comprar, 4)) + ".");
      if (prep.length) partes.push("Hay que preparar " + E.lista(prep) + ".");
      if (pedidas.length) partes.push("Ya está pedido: " + E.lista(maxN(pedidas, 3)) + ".");
      const txt = partes.join(" ");
      return E.CAP(aqui.en) + " " + txt.charAt(0).toLowerCase() + txt.slice(1);
    }
    if (que === "camino") {
      const vienen = st.transito.filter(tr => tr.estado === "pendiente" && tr.a === l);
      const salen = st.transito.filter(tr => tr.estado === "pendiente" && tr.de === l);
      if (!vienen.length && !salen.length) return "No hay nada en camino " + aqui.a + " ni desde " + aqui.art + ".";
      const txt = [];
      if (vienen.length) txt.push((vienen.length === 1 ? "Viene un envío " : "Vienen " + vienen.length + " envíos ") + aqui.a + ": " + vienen.map(tr => LUG[tr.de].de + ", " + txtItemsCorto(st, tr.items, l) + " (salió hace " + hace(tr.t) + " min)").join("; ") + ".");
      if (salen.length) txt.push("Salió " + aqui.de + " y aún no confirman: " + salen.map(tr => txtItemsCorto(st, tr.items, tr.a) + " " + LUG[tr.a].a).join("; ") + ".");
      return txt.join(" ");
    }
    if (que === "pedidos") {
      const atender = st.pedidos.filter(pe => pe.estado === "pendiente" && pe.a === l);
      const mios = st.pedidos.filter(pe => pe.estado === "pendiente" && pe.de === l);
      if (!atender.length && !mios.length) return "No hay pedidos pendientes " + aqui.en + ".";
      const txt = [];
      if (atender.length) txt.push("Por despachar: " + atender.map(pe => "pedido " + LUG[pe.de].de + ", " + txtItemsCorto(st, pe.items, pe.de) + " (hace " + hace(pe.t) + " min)").join("; ") + ".");
      if (mios.length) txt.push("Pediste y todavía no sale: " + mios.map(pe => txtItemsCorto(st, pe.items, l) + " " + LUG[pe.a].a).join("; ") + ".");
      return txt.join(" ");
    }
    if (que === "preparar") {
      const prep = al.filter(a => a.accion && a.accion.tipo === "preparar");
      if (!prep.length) return "No hace falta preparar nada por ahora. En producción hay " + E.lista(Object.keys(st.cat.preps).map(id => E.fmtEn(E.P(st, id), Math.max(0, E.stockDe(st, "P", id)), "P") + " de " + nombre(id))) + ".";
      return "Hay que preparar " + E.lista(prep.map(a => { const f = E.faltaParaPreparar(st, a.p, 1, "P"); return nombre(a.p) + (f.length ? " (falta " + E.lista(f.map(x => nombre(x.p))) + ": pídelo a la bodega)" : ""); })) + ".";
    }
    if (que === "ventas") {
      const desde = st.tApertura || 0, vs = st.ventas.filter(v => !v.deshecha && v.t >= desde);
      if (!vs.length) return st.abierto ? "Todavía no hay ventas hoy." : "La caja está cerrada.";
      const vasos = vs.reduce((a, v) => a + v.n, 0), total = vs.reduce((a, v) => a + v.precio, 0), cuenta = {};
      vs.forEach(v => { cuenta[v.k] = (cuenta[v.k] || 0) + v.n; });
      const top = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])[0], [pid, tam] = top.split("|"), m = st.cat.menu.find(x => x.id === pid);
      return "Hoy van " + vasos + (vasos === 1 ? " vaso" : " vasos") + ", " + E.dinero(total) + ". Lo que más sale: " + (m ? m.n : pid) + (tam === "B" ? " Big" : tam === "M" && m && m.tam.B ? " Midium" : "") + " (" + cuenta[top] + ").";
    }
    // resumen
    const mias = al.filter(a => a.l === l), crit = mias.filter(a => a.nivel === "critico").length, altos = mias.filter(a => a.nivel === "alto").length;
    const vienen = st.transito.filter(tr => tr.estado === "pendiente" && tr.a === l).length, atender = st.pedidos.filter(pe => pe.estado === "pendiente" && pe.a === l).length;
    const partes = [];
    partes.push(mias.length ? mias.length + (mias.length === 1 ? " aviso" : " avisos") + (crit ? ", " + crit + (crit === 1 ? " crítico" : " críticos") : "") + (altos ? ", " + altos + " para atender" : "") : "sin avisos");
    if (vienen) partes.push(vienen + (vienen === 1 ? " envío por recibir" : " envíos por recibir"));
    if (atender) partes.push(atender + (atender === 1 ? " pedido por despachar" : " pedidos por despachar"));
    const primero = mias[0] ? " Lo primero: " + mias[0].txt + "." : "";
    return E.CAP(aqui.en) + ": " + E.lista(partes) + "." + primero;
  }
  /* ¿Hay suficiente en el lugar? Si no hay nada, bloquea («No se dispone…»).
     Si hay menos de lo pedido, propone mover lo que hay y pregunta. ctx.sinControlStock lo salta (autoriza el supervisor). */
  function controlarStock(st, plan, l, items, aviso, verbo) {
    const nada = [], poco = [];
    const supuesto = (plan.R.issues || []).some(x => x.code === "producto_supuesto");
    items.forEach(it => { if (it.q == null) return; const hay = E.stockDe(st, l, it.p); if (hay <= 0.0005) nada.push(it); else if (hay + 0.0005 < it.q) poco.push({ it, hay }); });
    if (!nada.length && !poco.length) return true;
    const nom = it => E.nf(E.P(st, it.p));
    plan.sinStock = { lugar: l, nada: nada.map(it => ({ p: it.p, q: it.q })), poco: poco.map(x => ({ p: x.it.p, q: x.it.q, hay: x.hay })) };
    if (supuesto && (nada.length || poco.length)) {
      // el producto no se dijo: mejor pedir que repita que adivinar con algo que no hay
      plan.bloqueo = "No dijiste qué producto. Repite la orden diciendo qué mover (por ejemplo: «quitar dos cajas de frutilla»).";
      plan.sinStock = null; return false;
    }
    if (nada.length === items.filter(it => it.q != null).length) {
      plan.bloqueo = "No se dispone de " + E.lista(nada.map(nom)) + " " + LUG[l].en + ".";
      plan.detalle = "El sistema tiene 0." + (l === "B" ? " Si llegó del proveedor, regístralo primero: «llegaron … del proveedor»." : " Pídelo " + LUG[E.origen(st, nada[0].p, l)].a + " o revisa el conteo.");
      plan.forzable = true;
      return false;
    }
    // mover solo lo que hay
    const quitar = new Set(nada.map(it => it.p));
    plan.items = items.filter(it => !quitar.has(it.p));
    poco.forEach(x => { x.it.pedido = x.it.q; x.it.q = x.hay; });
    const partes = poco.map(x => "solo hay " + E.fmtComo(E.P(st, x.it.p), x.hay) + " de " + nom(x.it) + " (pediste " + E.fmtComo(E.P(st, x.it.p), x.it.pedido, x.it.emp) + ")")
      .concat(nada.map(it => "no se dispone de " + nom(it)));
    aviso("solo_hay", E.CAP(LUG[l].en) + " " + partes.join("; ") + ". " + E.CAP(verbo) + " solo lo que hay.", true);
    plan.ajustado = true;
    plan.avisos = plan.avisos.filter(a => a.code !== "cantidad_inusual");
    return true;
  }

  /* R: resultado de FRX_VOZ.interpretar. ctx: {lugar, por}. Devuelve un plan. */
  function planificar(st, R, ctx) {
    ctx = ctx || {}; const lugar = ctx.lugar || R.lugar || "L";
    const plan = { R, lugar, tipo: R.intent, items: [], avisos: [], bloqueo: null, resumen: "", detalle: "", respuesta: null, sinControlStock: !!ctx.sinControlStock };
    const aviso = (code, msg, confirmar) => plan.avisos.push({ code, msg, confirmar: confirmar !== false });
    (R.issues || []).forEach(x => { if (!["verbo_supuesto", "unidad_supuesta", "producto_supuesto", "producto_parecido", "cantidad_supuesta", "dictado_dudoso", "ambiguo", "autocorreccion"].includes(x.code)) return; aviso(x.code, x.msg, true); });

    const items = (R.items || []).filter(it => it.p).map(it => Object.assign({ p: it.p, q: it.q, tandas: it.tandas, alternativas: it.alternativas || [], emp: it.emp || null, enPeso: !!it.enPeso }, it.rec ? { rec: it.rec, recQ: it.recQ } : {}));
    plan.items = items;

    switch (R.intent) {
      case "si": case "no": plan.tipo = R.intent; return plan;
      case "vacio": case "desconocido":
        plan.bloqueo = "No entendí la orden. Prueba: \"quitar dos cajas de frutilla\"."; return plan;
      case "deshacer": {
        const m = E.ultimoDeshacible(st, lugar) || E.ultimoDeshacible(st);
        if (!m) { plan.bloqueo = "No hay nada para deshacer."; return plan; }
        plan.mov = m.id; plan.requierePin = requierePin(st, m); plan.resumen = "Deshacer: " + (m.titulo || m.tipo); plan.detalle = m.info || (m.deltas || []).slice(0, 4).map(d => E.fmtCant(E.P(st, d.p), Math.abs(d.q)) + " " + E.nf(E.P(st, d.p))).join(", ");
        return plan;
      }
      case "estado": {
        if (R.estado === "porque") return planPorQue(st, R, plan, Object.assign({}, ctx, { lugar }));
        plan.respuesta = estadoLugar(st, R.estado, lugar || "L");
        plan.resumen = "Pregunta"; plan.soloInfo = true; return plan;
      }
      case "consulta": {
        if (!items.length) { plan.bloqueo = "¿De qué producto quieres saber?"; return plan; }
        plan.respuesta = items.map(it => consulta(st, it.p)).join(" ");
        plan.resumen = "Consulta"; plan.soloInfo = true; return plan;
      }
    }
    // problemas que impiden seguir
    const bloqueantes = (R.issues || []).filter(x => ["falta_producto", "producto_desconocido", "falta_cantidad", "no_entendi", "direccion", "unidad_rara", "no_preparable"].includes(x.code));
    if (bloqueantes.length) { plan.bloqueo = Array.from(new Set((R.issues || []).filter(x => x.code === "ambiguo").map(x => x.msg).concat(bloqueantes.map(x => x.msg)))).join(" "); plan.faltaElegir = (R.items || []).some(it => !it.p && it.alternativas && it.alternativas.length) ? (R.items.find(it => !it.p && it.alternativas.length).alternativas) : null; }
    if ((R.items || []).some(it => it.p && it.alternativas && it.alternativas.length && R.issues.some(x => x.code === "ambiguo"))) plan.opciones = [items[0].p].concat(items[0].alternativas);

    switch (R.intent) {
      case "despachar_pedido": {
        // «despacha el pedido»: el pedido más antiguo que espera aquí (o el del lugar o producto que se nombró)
        const l = lugar;
        let pend = st.pedidos.filter(pe => pe.estado === "pendiente" && pe.a === l).sort((a, b) => a.t - b.t);
        if (R.pedidoDe) pend = pend.filter(pe => pe.de === R.pedidoDe);
        const conProd = items.length ? pend.filter(pe => items.every(it => pe.items.some(y => y.p === it.p))) : pend;
        if (conProd.length) pend = conProd;
        if (!pend.length) {
          const otros = st.pedidos.filter(pe => pe.estado === "pendiente" && pe.de === l);
          plan.soloInfo = true; plan.resumen = "Pedidos";
          plan.respuesta = "No hay pedidos " + (R.pedidoDe ? LUG[R.pedidoDe].de + " " : "") + "por despachar " + LUG[l].en + "." + (otros.length ? " Lo que pediste " + LUG[l].en + " todavía no sale: " + otros.map(pe => txtItemsCorto(st, pe.items, l) + " " + LUG[pe.a].a).join("; ") + "." : "");
          return plan;
        }
        const pd = planDespacho(st, pend[0].id, ctx);
        if (pend.length > 1) pd.avisos.push({ code: "mas_pedidos", msg: "Hay " + pend.length + " pedidos por despachar " + LUG[l].en + "; este es el más antiguo.", confirmar: false });
        return pd;
      }
      case "traslado": {
        // «despacha la crema»: si hay un pedido esperando con eso, se despacha ese pedido
        if (R.verboDespacho && !ctx.pedido && items.length && items.every(it => it.q == null)) {
          const pe = st.pedidos.filter(x => x.estado === "pendiente" && x.a === R.de && items.every(it => x.items.some(y => y.p === it.p))).sort((a, b) => a.t - b.t)[0];
          if (pe) return planDespacho(st, pe.id, ctx);
        }
        plan.de = R.de; plan.a = R.a;
        // sin destino dicho, cada producto va a donde sigue su recorrido (materia prima → producción; lo demás → local)
        items.forEach(it => { it.a = R.aAuto ? E.destino(st, it.p, R.de) : R.a; if (it.a === R.de) it.a = R.a; });
        const propuestos = [];
        items.forEach(it => {
          if (it.q != null) return;
          const hay = E.stockDe(st, R.de, it.p), R0 = (R.items || []).find(x => x.p === it.p) || {};
          if (R0.todo || R.de === "L") { it.q = Math.max(0, hay); it.propuesto = "todo"; }
          else { it.q = E.sugerido(st, it.p, R.a); it.propuesto = "sugerido"; }
          propuestos.push(it);
        });
        // de una categoría («los toppings») solo va lo que hay
        if (R.categoria) {
          const hayAlgo = items.filter(it => E.stockDe(st, R.de, it.p) > 0.0005); items.splice(0, items.length, ...hayAlgo); plan.items = items;
          if (!items.length) { const cn = ((CAT.CATS || []).find(c => c[0] === R.categoria) || [, "eso"])[1].toLowerCase(); plan.bloqueo = "No hay " + cn + " " + LUG[R.de].en + " para mover."; plan.sinStock = { lugar: R.de, nada: [], poco: [] }; break; }
        }
        items.forEach(it => inusual(st, it, R.de, aviso));
        items.forEach(it => { const pr = E.P(st, it.p); if (pr.en && !pr.en.includes(it.a)) aviso("no_va_al_local", E.CAP(LUG[it.a].en) + " normalmente no se usa " + E.nf(pr) + (pr.cat === "base" || pr.id === "choco_negro" ? " (es materia prima: con eso se prepara en producción)" : pr.prep ? " (se prepara en producción)" : "") + ". ¿Seguro que lo mandas?", true); });
        agrupar(st, plan);
        plan.resumen = resumenTraslado(st, plan, items.filter(it => it.q != null));
        if (!plan.bloqueo && !ctx.sinControlStock && !controlarStock(st, plan, R.de, items, aviso, "envío")) break;
        if (propuestos.length) aviso("cantidad_propuesta", (propuestos.every(it => it.propuesto === "todo") ? "No dijiste cuánto: propongo todo lo que hay " + LUG[R.de].en + "." : "No dijiste cuánto: propongo lo que " + LUG[(items[0] || plan.items[0] || {}).a || R.a || "L"].art + " necesita para el día.") + " Puedes quitar productos de la lista o decir otra cantidad.", true);
        agrupar(st, plan);
        plan.resumen = resumenTraslado(st, plan, plan.items);
        // si atiende un pedido pendiente del otro lugar, se enlaza
        const pe = ctx.pedido ? st.pedidos.find(x => x.id === ctx.pedido && x.estado === "pendiente") : st.pedidos.find(x => x.estado === "pendiente" && x.de === R.a && x.a === R.de && plan.items.length && plan.items.every(it => x.items.some(y => y.p === it.p)));
        if (pe) { plan.pedido = pe.id; plan.detalle = "Atiende el pedido " + LUG[pe.de].de + " de las " + E.horaDe(pe.t) + "."; }
        duplicado(st, plan, aviso);
        break;
      }
      case "agotado": {
        // «se acabó la frutilla»: en el local se convierte en pedido a bodega; en bodega, dice cuánto comprar
        const l = R.lugar || lugar;
        if (!items.length) { plan.bloqueo = plan.bloqueo || "¿Qué se acabó? Di, por ejemplo: «se acabó la frutilla»."; break; }
        if (l === "B") {
          plan.soloInfo = true; plan.resumen = "Se acabó en bodega";
          plan.respuesta = items.map(it => {
            const p = E.P(st, it.p), q = E.compraSugerida(st, it.p, { sinStock: true });
            return E.CAP(E.nf(p)) + " en bodega: el sistema tiene " + E.fmtCantLargo(p, E.stockDe(st, "B", it.p)) + ". Hay que comprar " + E.fmtCant(p, q) + (p.prov ? " a " + p.prov + (p.dem ? " (tarda " + p.dem + (p.dem === 1 ? " día" : " días") + ")" : "") : "") + ". Cuando llegue, di «llegaron " + E.fmtCant(p, q) + " de " + E.nf(p) + " del proveedor».";
          }).join(" ");
          break;
        }
        { const aqui = seHaceAqui(st, items, l, true); if (aqui) return aqui; }
        plan.tipo = "pedido"; plan.de = l; plan.a = E.origen(st, items[0].p, l); plan.agotado = true;
        items.forEach(it => {
          const p = E.P(st, it.p), e = (p.e || [])[0];
          let q = Math.max((p.min[l] || 0) * 2, E.consumoDiario(st, it.p) * 0.6) - E.enTransito(st, it.p, l);
          if (q <= 0) q = p.min[l] || (e ? e[1] : 1);
          if (e && e[1] > 0 && e[1] <= Math.max(q * 1.6, 1)) q = Math.max(1, Math.ceil(q / e[1] - 0.15)) * e[1];
          it.q = E.r3(q); it.sugerido = true;
          const hay = E.stockDe(st, l, it.p);
          if (hay > 0.0005) aviso("agotado_con_stock", "El sistema todavía tenía " + E.fmtCantLargo(p, hay) + " de " + E.nf(p) + " " + LUG[l].en + ". Si de verdad se acabó, puede haber merma o porciones más grandes sin registrar.", false);
          it.a = E.origen(st, it.p, l);
        });
        agruparPedido(st, plan);
        plan.resumen = "Se acabó " + LUG[l].en + ". Pedido a " + Array.from(new Set(items.map(it => LUG[it.a].nombre))).join(" y ") + ": " + txtItemsCorto(st, items, l);
        avisoOrigen(st, plan.a, items, aviso);
        aviso("cantidad_sugerida", "Propongo lo que hace falta para el día; puedes corregir la cantidad.", true);
        duplicado(st, plan, aviso);
        break;
      }
      case "pedido": {
        { const aqui = seHaceAqui(st, items, R.de); if (aqui) return aqui; }
        plan.de = R.de; plan.a = R.a;
        items.forEach(it => { if (it.q == null) { it.q = E.sugerido(st, it.p, R.de); it.sugerido = true; } it.a = R.aAuto ? E.origen(st, it.p, R.de) : R.a; if (it.a === R.de) it.a = R.a; });
        agruparPedido(st, plan);
        plan.resumen = plan.grupos && plan.grupos.length > 1 ? "Pedido de " + LUG[R.de].nombre + ": " + plan.grupos.map(g => txtItemsCorto(st, g.items, R.de) + " a " + LUG[g.a].nombre).join("; ") : "Pedido de " + LUG[R.de].nombre + " a " + LUG[plan.a].nombre + ": " + txtItemsCorto(st, items, R.de);
        items.forEach(it => { const pr = E.P(st, it.p); if (pr.en && !pr.en.includes(R.de)) aviso("no_va_al_local", E.CAP(LUG[R.de].en) + " normalmente no se usa " + E.nf(pr) + ". ¿Seguro que lo pides?", true); });
        if (items.some(it => it.sugerido)) aviso("cantidad_sugerida", "No dijiste cuánto; propongo lo que falta para el día.", true);
        avisoOrigen(st, R.a, items, aviso);
        duplicado(st, plan, aviso);
        break;
      }
      case "entrada": {
        plan.a = R.a;
        // en el local, lo que "llegó" casi siempre es un envío de la bodega
        const tr = R.proveedor ? null : st.transito.filter(x => x.estado === "pendiente" && x.a === R.a).find(x => items.length && items.every(it => x.items.some(y => y.p === it.p)));
        if (tr) {
          plan.tipo = "recepcion"; plan.tr = tr.id;
          plan.cantidades = {}; tr.items.forEach(y => { const dicho = items.find(it => it.p === y.p); plan.cantidades[y.p] = dicho && dicho.q != null ? dicho.q : y.q; });
          const dif = tr.items.filter(y => Math.abs(plan.cantidades[y.p] - y.q) > 0.0005);
          plan.resumen = "Recibir envío de " + E.horaDe(tr.t) + " en " + LUG[R.a].nombre;
          plan.detalle = tr.items.map(y => E.P(st, y.p).n + ": " + E.fmtCant(E.P(st, y.p), plan.cantidades[y.p]) + (Math.abs(plan.cantidades[y.p] - y.q) > 0.0005 ? " (salieron " + E.fmtCant(E.P(st, y.p), y.q) + ")" : "")).join(" · ");
          if (dif.length) aviso("llego_distinto", "Llegó distinto a lo que salió " + LUG[tr.de].de + ". Se registra la diferencia.", true);
        } else if (R.a !== "B" && !R.aDicho && items.every(it => it.q != null)) {
          // (1-nov-2026, Freddy: «cuando digo que ingresa es del proveedor: automáticamente a la bodega») — sin un envío en camino aquí y sin decir el lugar
          return planificar(st, Object.assign({}, R, { a: "B", aDicho: true, proveedor: true }), Object.assign({}, ctx, { lugar: "B" }));
        } else if (items.some(it => it.q == null)) {
          plan.bloqueo = "¿Cuánto llegó? Di, por ejemplo: «llegaron seis cajas de " + E.nf(E.P(st, items.find(it => it.q == null).p)) + " del proveedor».";
        } else {
          plan.tipo = "compra"; plan.aumento = !!R.aumento;
          plan.resumen = (plan.aumento ? "Aumento en " : "Entrada de proveedor a ") + LUG[R.a].nombre + ": " + txtItemsCorto(st, items);
          if (plan.aumento) items.forEach(it => { const pp = E.P(st, it.p), hay = Math.max(0, E.stockDe(st, R.a, it.p)); aviso("suma_aumento", E.CAP(E.nf(pp)) + ": " + LUG[R.a].en + " hay " + E.fmtDoble(pp, hay) + "; quedarán " + E.fmtDoble(pp, E.r3(hay + it.q)) + ".", false); });
          if (R.a !== "B") aviso("compra_local", "Se registra como compra directa " + LUG[R.a].a + " (no hay un envío pendiente con eso).", true);
          items.forEach(it => inusual(st, it, null, aviso, true));
          duplicado(st, plan, aviso);
        }
        break;
      }
      case "recepcion": {
        plan.a = R.a;
        const pend = st.transito.filter(x => x.estado === "pendiente" && x.a === R.a).sort((a, b) => a.t - b.t);
        // «recibimos 2 cajas de tapas» sin nada en camino: es una entrada (del proveedor), no la recepción de un envío (31-oct)
        if (!pend.length && items.length && items.every(it => it.q != null)) return planificar(st, Object.assign({}, R, { intent: "entrada", proveedor: true }), ctx);
        if (!pend.length) { plan.bloqueo = "No hay envíos pendientes para " + LUG[R.a].art + "."; break; }
        const tr = items.length ? pend.find(x => items.every(it => x.items.some(y => y.p === it.p))) || pend[0] : pend[0];
        plan.tr = tr.id; plan.cantidades = {};
        tr.items.forEach(y => { const dicho = items.find(it => it.p === y.p); plan.cantidades[y.p] = dicho && dicho.q != null ? dicho.q : y.q; });
        if (R.cantidadSuelta) {
          // «ya llegaron las dos cajas»: se aplica al producto del envío que viene en ese empaque
          const cs = R.cantidadSuelta;
          const cand = tr.items.filter(y => { const p = E.P(st, y.p); return cs.emp ? (p.e || []).some(e => e[0] === cs.emp) : cs.base ? p.u === cs.base.base : true; });
          if (cand.length === 1) {
            const y = cand[0], p = E.P(st, y.p), e = cs.emp ? (p.e || []).find(x => x[0] === cs.emp) : null;
            plan.cantidades[y.p] = E.r3(cs.q * (e ? e[1] : cs.base ? cs.base.f : 1));
            if (Math.abs(plan.cantidades[y.p] - y.q) > 0.0005) aviso("llego_distinto", "Llegó distinto a lo que salió " + LUG[tr.de].de + " (" + E.nf(p) + ": salieron " + E.fmtCant(p, y.q) + "). Se registra la diferencia.", true);
          } else aviso("cantidad_suelta", "Dijiste una cantidad sin producto; se confirma el envío completo. Si llegó distinto, usa «Llegó distinto».", true);
        }
        plan.resumen = "Recibir envío de " + E.horaDe(tr.t) + " en " + LUG[R.a].nombre;
        plan.detalle = txtItemsCorto(st, tr.items.map(y => ({ p: y.p, q: plan.cantidades[y.p] })));
        if (pend.length > 1) plan.detalle += " (hay " + pend.length + " envíos pendientes)";
        break;
      }
      case "merma": {
        plan.lugar = R.lugar; plan.motivo = R.motivo;
        items.forEach(it => inusual(st, it, R.lugar, aviso));
        plan.resumen = "Merma en " + LUG[R.lugar].nombre + ": " + txtItemsCorto(st, items.filter(it => it.q != null));
        if (!plan.bloqueo && !ctx.sinControlStock && !controlarStock(st, plan, R.lugar, items, aviso, "registro")) break;
        plan.resumen = "Merma en " + LUG[R.lugar].nombre + ": " + txtItemsCorto(st, plan.items) + " (" + (R.motivo || "Merma").toLowerCase() + ")";
        duplicado(st, plan, aviso);
        break;
      }
      case "conteo": {
        plan.lugar = R.lugar;
        plan.resumen = "Conteo en " + LUG[R.lugar].nombre + ": " + txtItemsCorto(st, items);
        plan.detalle = items.filter(it => it.q != null).map(it => "Sistema: " + E.fmtCantLargo(E.P(st, it.p), E.stockDe(st, R.lugar, it.p))).join(" · ");
        break;
      }
      case "produccion": {
        { const pr0 = items[0] && E.P(st, items[0].p); plan.lugar = (pr0 && pr0.hecho) || R.lugar || lugar; if (pr0 && lugar !== plan.lugar) aviso("se_prepara_en", E.CAP(E.nf(pr0)) + " se prepara " + LUG[plan.lugar].en + ": se registra allá.", false); }
        const it = items[0];
        if (!it) break;
        const pr = st.cat.preps[it.p];
        if (!pr) { plan.bloqueo = "Eso no se prepara."; break; }
        plan.prep = it.p; plan.tandas = it.tandas || 1;
        { const pp = E.P(st, it.p), sale = E.r3(pr.sale * plan.tandas), hay = E.stockDe(st, plan.lugar, it.p);
          const nT = E.num(plan.tandas, Number.isInteger(plan.tandas) ? 0 : 2) + " " + E.plural(pr.tanda, plan.tandas);
          plan.resumen = it.enPeso ? "Preparar " + E.fmtBase(pp, sale) + " de " + E.nf(pp) + " en " + LUG[plan.lugar].nombre + " (" + nT + ")"
            : "Preparar " + nT + " de " + E.nf(pp) + " en " + LUG[plan.lugar].nombre + " (salen " + E.fmtBase(pp, sale) + ")";
          // lo que había más lo nuevo: «hay 5 kg, quedarán 10 kg»
          plan.antes = Math.max(0, hay); plan.despues = E.r3(Math.max(0, hay) + sale);
          aviso("suma_prep", E.CAP(LUG[plan.lugar].en) + " hay " + E.fmtBase(pp, plan.antes) + "; con esto quedarán " + E.fmtBase(pp, plan.despues) + ".", false); }
        plan.detalle = "Usa: " + Object.keys(pr.usa).map(p => E.fmtCant(E.P(st, p), pr.usa[p] * plan.tandas) + " " + E.nf(E.P(st, p))).join(", ");
        const f = E.faltaParaPreparar(st, it.p, plan.tandas, plan.lugar);
        if (f.length && !ctx.sinControlStock) {
          plan.bloqueo = "No se dispone de lo necesario " + LUG[plan.lugar].en + " para preparar.";
          plan.detalle = "Falta " + f.map(x => E.nf(E.P(st, x.p)) + " (hay " + E.fmtCant(E.P(st, x.p), x.hay) + ", se necesita " + E.fmtCant(E.P(st, x.p), x.nec) + ")").join(", ") + ".";
          plan.sinStock = { lugar: plan.lugar, nada: f.map(x => ({ p: x.p, q: E.r3(x.nec - x.hay) })), poco: [] };
          plan.forzable = true; plan.pedirFalta = f.map(x => ({ p: x.p, q: E.r3(x.nec - x.hay) }));
          break;
        }
        duplicado(st, plan, aviso);
        break;
      }
      case "venta": {
        plan.ventas = (R.items || []).filter(x => x.venta);
        plan.resumen = "Venta: " + plan.ventas.map(x => x.txt).join(", ");
        { const f = faltaParaVender(st, plan.ventas.map(v => ({ k: v.venta, n: v.n }))); if (f.length) aviso("venta_sin_stock", "El sistema no tiene suficiente " + E.lista(f.map(p => E.nf(E.P(st, p)))) + " en el local para esta venta. Se registra igual (ya se vendió); revisa el inventario.", false); }
        if (!plan.ventas.length) plan.bloqueo = "No entendí qué se vendió.";
        break;
      }
    }
    plan.auto = !plan.bloqueo && !plan.soloInfo && !plan.ajustado && R.conf >= 0.85 && plan.avisos.filter(a => a.confirmar).length === 0;
    return plan;
  }

  /* Lo preparado no se pide a otro lugar si se hace aquí mismo («necesito crema» en producción): se propone prepararlo. */
  function seHaceAqui(st, items, l, agotado) {
    const its = items.filter(it => { const p = E.P(st, it.p); return p && p.prep && (p.hecho || "P") === l; });
    if (!its.length || its.length !== items.length) return null;
    const it = its[0], p = E.P(st, it.p), pr = st.cat.preps[it.p];
    if (!pr) return null;
    // «necesito crema» sin decir cuánto: se pregunta «¿Cuántos kilos de crema Reex?» (no se inventa una cantidad)
    if (it.q == null && !it.tandas) return pedirCantidad(st, it.p, l, agotado);
    const q = it.q != null ? it.q : it.tandas * pr.sale;
    return planReceta(st, it.p, q, l, agotado ? "Se acabó " + E.nf(p) + " " + LUG[l].en + "." : "");
  }
  /* La pantalla pregunta la cantidad y, con la respuesta, llama a planReceta */
  function pedirCantidad(st, pid, l, agotado) {
    const p = E.P(st, pid), unidad = p.u === "L" ? "litros" : p.u === "u" ? "unidades" : "kilos";
    const preg = "¿Cuántos " + unidad + " de " + E.nf(p) + "?";
    return { R: { conf: 1, issues: [] }, lugar: l, tipo: "cantidad", items: [], avisos: [], soloInfo: true, resumen: preg, respuesta: preg, detalle: "",
      pideCantidad: { p: pid, l, agotado: !!agotado, unidad, pregunta: preg } };
  }
  /* «Necesito 5 kilos de crema» en producción (donde se prepara):
       hay los insumos aquí  → se prepara (descuenta los insumos de la receta)
       faltan insumos        → pedido a la bodega: «insumos para 5 kg de crema Reex» (sin leer la receta) */
  function planReceta(st, pid, kg, l, antes) {
    const p = E.P(st, pid), pr = st.cat.preps[pid];
    if (!pr || !(kg > 0)) return null;
    const tandas = E.r3(kg / pr.sale);
    const plan = planificar(st, { crudo: "", intent: "produccion", lugar: l, de: l, a: l, items: [{ p: pid, tandas, enPeso: true }], issues: [], conf: 1, listo: true }, { lugar: l });
    plan.previo = (antes ? antes + " " : "") + E.CAP(E.nf(p)) + " se prepara " + LUG[l].en + ".";
    if (plan.bloqueo && plan.pedirFalta) return pedirLoQueFalta(st, plan, l, antes);
    plan.directo = true;
    return plan;
  }
  /* Para preparar falta materia prima: se arma el pedido a la bodega (redondeado al empaque) */
  function pedirLoQueFalta(st, planProd, l, previo) {
    const pr0 = st.cat.preps[planProd.prep], kg = E.r3((pr0 ? pr0.sale : 1) * (planProd.tandas || 1));
    const items = planProd.pedirFalta.map(x => { const pr = E.P(st, x.p), e = (pr.e || [])[0]; return { p: x.p, q: e && e[1] >= 1 ? Math.ceil(x.q / e[1] - 1e-9) * e[1] : x.q, emp: e && e[1] >= 1 ? e[0] : null, rec: planProd.prep, recQ: kg }; });
    const plan = planificar(st, { crudo: "", intent: "pedido", lugar: l, de: l, a: "B", items, issues: [], conf: 1, listo: true }, { lugar: l });
    plan.previo = (previo ? previo + " " : "") + "Para preparar " + E.fmtBase(E.P(st, planProd.prep), kg) + " de " + E.nf(E.P(st, planProd.prep)) + " " + LUG[l].en + " se piden los insumos a la bodega.";
    plan.paraPreparar = planProd.prep; plan.receta = { p: planProd.prep, q: kg }; plan.directo = true;
    plan.detalle = "La bodega manda: " + txtItems(st, items) + ".";
    return plan;
  }
  /* (2-nov-2026, Freddy) «¿Por qué el pedido todavía sigue sin despacharse?», «¿por qué sigue esto aquí?», «¿por qué no llega la frutilla?»:
     - aquí hay un pedido por despachar → se explica qué falta (o que nadie lo despachó) y se pregunta «¿Despacho lo que hay…?» (planDespacho)
     - lo pedí yo → dónde está: en camino (desde hace cuánto) o todavía sin salir (y por qué: lo que hay allá) */
  function planPorQue(st, R, plan, ctx) {
    const l = ctx.lugar || "L", ahora = E.ahora(st), hace = t => Math.max(0, Math.round((ahora - t) / 60000));
    const prodIds = (R.items || []).filter(x => x.p).map(x => x.p);
    const conP = arr => { if (!prodIds.length) return arr; const f = arr.filter(x => x.items.some(it => prodIds.includes(it.p))); return f.length ? f : arr; };
    const minTxt = n => n <= 0 ? "recién" : "hace " + n + (n === 1 ? " minuto" : " minutos");
    const atender = conP(st.pedidos.filter(pe => pe.estado === "pendiente" && pe.a === l)).sort((a, b) => a.t - b.t);
    const vienenTodos = st.transito.filter(tr => tr.estado === "pendiente" && tr.a === l);
    const vienen = prodIds.length ? vienenTodos.filter(tr => tr.items.some(it => prodIds.includes(it.p))) : vienenTodos;
    const mios = conP(st.pedidos.filter(pe => pe.estado === "pendiente" && pe.de === l)).sort((a, b) => a.t - b.t);
    // lo pregunta quien lo pidió (o nombra lo que viene en camino): se le cuenta dónde está
    if ((vienen.length || mios.length) && (!atender.length || (prodIds.length && !atender.some(pe => pe.items.some(it => prodIds.includes(it.p)))))) {
      const partes = [];
      vienen.forEach(tr => partes.push("Ya salió " + txtItemsCorto(st, tr.items, l) + " " + LUG[tr.de].de + ", " + minTxt(hace(tr.t)) + ". Cuando llegue, confírmalo."));
      mios.forEach(pe => {
        const alla = pe.items.map(it => ({ it, p: E.P(st, it.p), hay: Math.max(0, E.stockDe(st, pe.a, it.p)), bod: pe.a !== "B" ? Math.max(0, E.stockDe(st, "B", it.p)) : 0 }));
        const faltan = alla.filter(x => x.hay + 0.0005 < x.it.q), n = hace(pe.t);
        partes.push((vienen.length ? "Lo que falta, " : "Tu pedido de ") + txtItemsCorto(st, pe.items, l) + ", todavía está " + LUG[pe.a].en + " sin salir" + (n > 0 ? " (lo pediste hace " + n + (n === 1 ? " minuto" : " minutos") + ")" : "") + ". " +
          (faltan.length ? "Allá " + E.lista(faltan.map(x => (x.hay > 0.0005 ? "solo hay " + E.fmtComo(x.p, x.hay, x.it.emp) + " de " + E.nf(x.p) : "no hay " + E.nf(x.p)) + (x.bod > 0.0005 ? "; la bodega tiene " + E.fmtComo(x.p, x.bod, x.it.emp) : ""))) + "." : "Allá sí hay: falta que lo despachen."));
      });
      plan.respuesta = partes.join(" "); plan.resumen = "Pedidos"; plan.soloInfo = true; return plan;
    }
    if (atender.length) {
      const pe = atender[0], pd = planDespacho(st, pe.id, ctx), quien = LUG[pe.de].art;
      const estado = pe.items.map(it => ({ it, p: E.P(st, it.p), hay: Math.max(0, E.stockDe(st, l, it.p)) }));
      const faltan = estado.filter(x => x.hay + 0.0005 < x.it.q);
      const por = faltan.length
        ? "Porque no alcanza: " + quien + " pidió " + E.lista(faltan.map(x => E.fmtComo(x.p, x.it.q, x.it.emp) + " de " + E.nf(x.p))) + "."
        : "Porque todavía nadie lo despacha: " + quien + " lo pidió " + minTxt(hace(pe.t)) + " y aquí sí hay.";
      pd.previo = pd.previo ? por + " " + pd.previo : por;
      if (atender.length > 1) pd.avisos.push({ code: "mas_pedidos", msg: "Hay " + atender.length + " pedidos por despachar " + LUG[l].en + "; este es el más antiguo.", confirmar: false });
      return pd;
    }
    plan.respuesta = "No hay pedidos pendientes " + LUG[l].en + " ni nada en camino " + LUG[l].a + "."; plan.resumen = "Pedidos"; plan.soloInfo = true; return plan;
  }
  /* Despachar un pedido: revisa lo que hay en el lugar que despacha y arma lo que corresponde.
       hay todo o algo → se envía (lo que no alcanza queda pedido)
       no hay y es algo que se prepara aquí → se propone prepararlo (y después se despacha)
       no hay en producción → se propone pedirlo a la bodega
       no hay en la bodega → se dice cuánto comprar y a quién (el pedido sigue esperando) */
  function planDespacho(st, peId, ctx) {
    ctx = ctx || {};
    const pe = st.pedidos.find(x => x.id === peId);
    if (!pe || pe.estado !== "pendiente") return { R: { conf: 1, issues: [] }, tipo: "traslado", lugar: ctx.lugar || "B", items: [], avisos: [], bloqueo: "Ese pedido ya no está pendiente.", resumen: "", detalle: "" };
    const l = pe.a, quien = LUG[pe.de].de, txtPedido = "el pedido " + quien + " (" + txtItemsCorto(st, pe.items, pe.de) + ")";
    const estado = pe.items.map(it => ({ it, p: E.P(st, it.p), hay: Math.max(0, E.stockDe(st, l, it.p)) }));
    const conAlgo = estado.filter(x => x.hay > 0.0005);
    if (conAlgo.length) {
      const R = { crudo: "", intent: "traslado", lugar: l, de: l, a: pe.de, items: pe.items.map(it => Object.assign({}, it)), issues: [], conf: 1, listo: true };
      const plan = planificar(st, R, Object.assign({}, ctx, { lugar: l, pedido: pe.id }));
      plan.despacho = pe.id;
      const faltan = estado.filter(x => x.hay + 0.0005 < x.it.q);
      if (faltan.length) plan.avisos.push({ code: "saldo", msg: "Lo que falta queda pedido " + LUG[l].en + ": " + E.lista(faltan.map(x => E.fmtComo(x.p, E.r3(x.it.q - x.hay), x.it.emp) + " de " + E.nf(x.p))) + ".", confirmar: false });
      else plan.detalle = "Atiende " + txtPedido.replace(/ \(.*\)$/, "") + " de las " + E.horaDe(pe.t) + ". " + E.CAP(LUG[l].en) + " hay " + E.lista(estado.map(x => E.fmtComo(x.p, x.hay) + " de " + E.nf(x.p))) + ".";
      return plan;
    }
    const previo = E.CAP(LUG[l].en) + " no hay " + E.lista(estado.map(x => E.nf(x.p))) + " para " + txtPedido + ".";
    const preps = estado.filter(x => x.p.prep && (x.p.hecho || "P") === l);
    if (preps.length) {
      const x = preps[0], pr = st.cat.preps[x.p.id];
      const tandas = Math.max(1, Math.ceil(x.it.q / pr.sale - 1e-9));
      const plan = planificar(st, { crudo: "", intent: "produccion", lugar: l, de: l, a: l, items: [{ p: x.p.id, tandas }], issues: [], conf: 1, listo: true }, Object.assign({}, ctx, { lugar: l }));
      plan.previo = previo + " Primero hay que prepararlo.";
      plan.despuesDespachar = pe.id;
      if (plan.bloqueo && plan.pedirFalta) { const p2 = pedirLoQueFalta(st, plan, l, plan.previo); p2.paraPedido = pe.id; return p2; }
      return plan;
    }
    if (l !== "B") {
      const items = estado.map(x => ({ p: x.p.id, q: x.it.q, emp: x.it.emp || null }));
      const plan = planificar(st, { crudo: "", intent: "pedido", lugar: l, de: l, a: "B", items, issues: [], conf: 1, listo: true }, { lugar: l });
      plan.previo = previo + " Se lo pido a la bodega.";
      plan.paraPedido = pe.id;
      return plan;
    }
    // la bodega no tiene: hay que comprar (el pedido sigue esperando)
    const plan = { R: { conf: 1, issues: [] }, lugar: l, tipo: "traslado", items: [], avisos: [], resumen: "", detalle: "", sinStock: { lugar: l, nada: pe.items.map(it => ({ p: it.p, q: it.q })), poco: [] }, despacho: pe.id };
    plan.bloqueo = previo;
    plan.comprar = estado.map(x => ({ p: x.p.id, q: E.compraSugerida(st, x.p.id, { sinStock: true }) }));
    plan.detalle = "Hay que comprar " + E.lista(estado.map(x => { const q = E.compraSugerida(st, x.p.id, { sinStock: true }); return E.fmtCant(x.p, q) + " de " + E.nf(x.p) + (x.p.prov ? " a " + x.p.prov + (x.p.dem ? " (tarda " + x.p.dem + (x.p.dem === 1 ? " día)" : " días)") : "") : ""); })) + ". El pedido " + quien + " queda esperando.";
    return plan;
  }
  function avisoOrigen(st, l, items, aviso) {
    items.forEach(it => {
      const lo = it.a || l;
      const p = E.P(st, it.p), hay = E.stockDe(st, lo, it.p);
      // si producción no tiene, se dice cuánto hay en la bodega para que se lo manden
      const enB = lo !== "B" ? E.stockDe(st, "B", it.p) : 0;
      const pista = enB > 0.0005 ? " La bodega tiene " + E.fmtComo(p, enB) + ": que le mande a " + LUG[lo].corto + "." : "";
      if (hay <= 0.0005) aviso("origen_sin_stock", E.CAP(LUG[lo].en) + " tampoco hay " + E.nf(p) + (lo === "B" && p.prov ? ": hay que comprar a " + p.prov + (p.dem ? " (tarda " + p.dem + (p.dem === 1 ? " día)" : " días)") : "") : "") + "." + pista, false);
      else if (it.q != null && hay + 0.0005 < it.q) aviso("origen_poco", E.CAP(LUG[lo].en) + " solo hay " + E.fmtComo(p, hay) + " de " + E.nf(p) + "." + pista, false);
    });
  }
  /* Productos que no alcanzan en el local para unas ventas */
  function faltaParaVender(st, ventas) {
    const nec = {};
    ventas.forEach(v => E.consumoReceta(st, v.k, v.n).forEach(x => { nec[x.p] = (nec[x.p] || 0) + x.q; }));
    return Object.keys(nec).filter(p => E.stockDe(st, "L", p) + 0.0005 < nec[p]);
  }
  function inusual(st, it, l, aviso, compra) {
    if (it.q == null) return;
    const p = E.P(st, it.p), e = (p.e || [])[0];
    const dia = E.consumoDiario(st, it.p);
    const tope = compra ? Math.max(E.compraSugerida(st, it.p) * 3, e ? e[1] * 12 : 0, p.min.B * 4)
      : Math.max(e ? e[1] * 4 : 0, dia * 2, l ? E.stockDe(st, l, it.p) * 1.05 : 0, p.min.B * 1.5);
    if (tope > 0 && it.q > tope) aviso("cantidad_inusual", "¿Seguro " + E.fmtCantLargo(p, it.q) + " de " + E.nf(p) + "? Es más de lo normal (¿dijiste \"doce\" en vez de \"dos\"?).", true);
  }
  function duplicado(st, plan, aviso) {
    const t = E.ahora(st);
    const firma = plan.tipo + "|" + (plan.de || plan.lugar || plan.a) + "|" + plan.items.map(it => it.p + ":" + (it.q != null ? it.q : it.tandas)).join(",");
    const prev = st._ultimaFirma;
    if (prev && prev.f === firma && t - prev.t < 25000) aviso("duplicado", "Es igual a lo que registraste hace " + Math.max(1, Math.round((t - prev.t) / 1000)) + " s. ¿Es otro movimiento?", true);
    plan.firma = firma;
  }

  /* Ejecuta el plan. meta: {por, via, frase, conf}. Devuelve {ok, msg, decir} */
  function ejecutar(st, plan, meta) {
    meta = meta || {};
    const base = { por: meta.por, via: meta.via || "voz", frase: meta.frase, conf: meta.conf };
    if (plan.bloqueo) return { ok: false, msg: plan.bloqueo, decir: plan.bloqueo };
    if (plan.soloInfo) return { ok: true, msg: plan.respuesta, decir: plan.respuesta, info: true };
    let r = { ok: true };
    switch (plan.tipo) {
      case "traslado": {
        const grupos = plan.grupos && plan.grupos.length ? plan.grupos : [{ a: plan.a, items: plan.items }];
        // (3-nov-2026, Freddy: «no se puede hacer envíos de algo que no hay en bodega») al momento de mover se revisa otra vez lo que hay
        // (el plan pudo armarse antes, o el inventario cambió mientras se confirmaba). Solo el supervisor lo salta (sinControlStock).
        if (!plan.sinControlStock && !meta.sinControlStock && plan.de) {
          const pedido = {}; grupos.forEach(g => (g.items || []).forEach(it => { pedido[it.p] = (pedido[it.p] || 0) + (+it.q || 0); }));
          const faltan = Object.keys(pedido).filter(p => E.stockDe(st, plan.de, p) + 0.0005 < pedido[p]);
          if (faltan.length) {
            const msg = "No puedo hacer el movimiento: " + LUG[plan.de].en + " " + E.lista(faltan.map(p => { const pr = E.P(st, p), hay = Math.max(0, E.stockDe(st, plan.de, p)); return hay > 0.0005 ? "solo hay " + E.fmtComo(pr, hay) + " de " + E.nf(pr) : "no hay " + E.nf(pr); })) + ".";
            return { ok: false, msg, decir: msg };
          }
        }
        const partes = [];
        grupos.forEach((g, i) => {
          const x = E.despachar(st, Object.assign({ de: plan.de, a: g.a, items: g.items, pedido: i === 0 ? plan.pedido : null }, base));
          if (i === 0) { r.mov = x.mov; r.tr = x.transito; if (x.saldo) r.saldo = x.saldo; } else (r.otros = r.otros || []).push(x.mov);
          partes.push(txtItemsCorto(st, g.items, g.a) + " " + LUG[g.a].a + (x.recepcion ? " (recibido automáticamente)" : ""));
        });
        r.msg = E.CAP(E.lista(partes)) + ", desde " + LUG[plan.de].art + "." + (r.saldo ? " Queda pedido: " + txtItemsCorto(st, r.saldo.items, r.saldo.de) + "." : ""); r.decir = E.lista(partes) + ", desde " + LUG[plan.de].art + (r.saldo ? ". Lo que falta queda pedido" : "");
        break;
      }
      case "pedido": {
        const grupos = plan.grupos && plan.grupos.length ? plan.grupos : [{ a: plan.a, items: plan.items }];
        const partes = [];
        grupos.forEach((g, i) => {
          const pe = E.pedir(st, Object.assign({ de: plan.de, a: g.a, items: g.items }, base));
          if (i === 0) r.pedido = pe;
          partes.push(LUG[g.a].a + ": " + txtItemsCorto(st, g.items, plan.de));
        });
        r.msg = "Pedido enviado " + partes.join("; ") + "."; r.decir = "pedido enviado " + partes.join("; ");
        break;
      }
      case "recepcion": {
        r.mov = E.recibir(st, plan.tr, Object.assign({ cantidades: plan.cantidades }, base));
        r.ok = !!r.mov; r.msg = r.mov ? "Llegó " + LUG[r.mov.a].a + ": " + txtItemsCorto(st, (r.mov.deltas || []).map(d => ({ p: d.p, q: d.q })), r.mov.a) + "." + (r.mov.nota ? " " + r.mov.nota : "") : "Ese envío ya no está pendiente."; r.decir = r.ok ? "llegó " + LUG[r.mov.a].a + ": " + txtItemsCorto(st, (r.mov.deltas || []).map(d => ({ p: d.p, q: d.q })), r.mov.a) : r.msg;
        break;
      }
      case "compra": {
        r.mov = E.comprar(st, Object.assign({ a: plan.a, items: plan.items.map(it => ({ p: it.p, q: it.q })) }, plan.aumento ? { prov: "Aumento en " + LUG[plan.a].nombre + " (producción o proceso)", titulo: "Aumento en " + LUG[plan.a].nombre } : {}, base));
        const ahoraHay = plan.items.map(it => E.nf(E.P(st, it.p)) + ": ahora hay " + E.fmtDoble(E.P(st, it.p), E.stockDe(st, plan.a, it.p))).join("; ");
        r.msg = (plan.aumento ? "Sumado " + LUG[plan.a].en + ": " : "Entrada registrada en " + LUG[plan.a].corto + ": ") + txtItemsCorto(st, plan.items) + ". " + ahoraHay + ".";
        r.decir = (plan.aumento ? "sumado " + LUG[plan.a].a + ": " : "entrada del proveedor " + LUG[plan.a].a + ": ") + txtItemsCorto(st, plan.items);
        break;
      }
      case "merma": {
        r.mov = E.merma(st, Object.assign({ lugar: plan.lugar, items: plan.items.map(it => ({ p: it.p, q: it.q })), motivo: plan.motivo }, base));
        r.msg = "Merma registrada en " + LUG[plan.lugar].corto + ": " + txtItemsCorto(st, plan.items) + "."; r.decir = "merma " + LUG[plan.lugar].en + ": " + txtItemsCorto(st, plan.items);
        break;
      }
      case "conteo": {
        plan.items.forEach(it => { r.mov = E.contar(st, Object.assign({ lugar: plan.lugar, p: it.p, q: it.q }, base)); });
        r.msg = "Conteo anotado en " + LUG[plan.lugar].corto + ": " + txtItemsCorto(st, plan.items) + "."; r.decir = "conteo anotado: " + txtItemsCorto(st, plan.items);
        break;
      }
      case "produccion": {
        r.mov = E.preparar(st, Object.assign({ prep: plan.prep, tandas: plan.tandas, lugar: plan.lugar }, base));
        { const tn = (st.cat.preps[plan.prep] || {}).tanda || "tanda", donde = LUG[plan.lugar].en;
          const pp = E.P(st, plan.prep), pr = st.cat.preps[plan.prep], hecho = E.fmtBase(pp, pr.sale * plan.tandas), ahora = E.fmtBase(pp, E.stockDe(st, plan.lugar, plan.prep));
          const nT = E.num(plan.tandas, Number.isInteger(plan.tandas) ? 0 : 2) + " " + E.plural(tn, plan.tandas);
          r.msg = "Preparación registrada " + donde + ": " + hecho + " de " + E.nf(pp) + " (" + nT + "). Ahora hay " + ahora + " " + donde + ".";
          r.decir = "preparación de " + hecho + " de " + E.nf(pp) + ". Ahora hay " + ahora + " " + donde; }
        break;
      }
      case "venta": {
        plan.ventas.forEach(v => { r.mov = E.vender(st, Object.assign({ k: v.venta, n: v.n }, base)); });
        r.msg = "Venta registrada: " + plan.ventas.map(v => v.txt).join(", ") + "."; r.decir = "venta registrada";
        break;
      }
      case "deshacer": {
        const x = E.deshacer(st, plan.mov, { por: meta.por, autorizo: meta.autorizo }); r.ok = x.ok; r.msg = x.msg; r.decir = x.ok ? "deshecho" : x.msg;
        break;
      }
      default: return { ok: false, msg: "No hay nada que hacer.", decir: "" };
    }
    if (r.ok && plan.firma) st._ultimaFirma = { f: plan.firma, t: E.ahora(st) };
    if (r.ok && plan.items && plan.items[0]) st._ultimoProducto = plan.items[plan.items.length - 1].p;
    return r;
  }

  // ---------- quitar y corregir con autorización ----------
  /* Dentro de los primeros minutos, quien registró puede corregir sin PIN. Después hace falta el supervisor. */
  function requierePin(st, mov) {
    if (!mov) return false;
    const lim = (st.config.minutosSinPin != null ? st.config.minutosSinPin : 2) * 60000;
    return E.ahora(st) - mov.t > lim;
  }
  const CORREGIBLES = ["venta", "envio", "recepcion", "compra", "merma", "produccion", "pedido", "conteo"];
  /* Qué se puede cambiar de un registro: lista de {k, nombre, valor, unidad} */
  function camposCorreccion(st, m) {
    if (!m || m.deshecho || !CORREGIBLES.includes(m.tipo)) return null;
    const P = id => E.P(st, id), U = id => E.U_TXT[P(id).u];
    switch (m.tipo) {
      case "venta": { const v = st.ventas.find(x => x.mov === m.id); return v ? [{ k: "n", nombre: "Cantidad vendida", valor: v.n, unidad: "vasos", entero: true }] : null; }
      case "envio": { const tr = st.transito.find(x => x.id === m.ref); if (!tr || tr.estado !== "pendiente") return null; return tr.items.map(it => ({ k: it.p, nombre: P(it.p).n, valor: it.q, unidad: U(it.p) })); }
      case "recepcion": { const tr = st.transito.find(x => x.id === m.ref); if (!tr) return null; return tr.items.map(it => ({ k: it.p, nombre: P(it.p).n + " (salieron " + E.fmtCantLargo(P(it.p), it.q) + ")", valor: tr.recibido ? tr.recibido[it.p] : it.q, unidad: U(it.p) })); }
      case "compra": return m.deltas.map(d => ({ k: d.p, nombre: P(d.p).n, valor: d.q, unidad: U(d.p) }));
      case "merma": return m.deltas.map(d => ({ k: d.p, nombre: P(d.p).n, valor: -d.q, unidad: U(d.p) }));
      case "produccion": { const d = m.deltas.find(x => x.q > 0); const pr = d && st.cat.preps[d.p]; return pr ? [{ k: "tandas", nombre: "Tandas de " + E.nf(P(d.p)), valor: E.r3(d.q / pr.sale), unidad: "tandas" }] : null; }
      case "pedido": { const pe = st.pedidos.find(x => x.id === m.ref); if (!pe || pe.estado !== "pendiente") return null; return pe.items.map(it => ({ k: it.p, nombre: P(it.p).n, valor: it.q, unidad: U(it.p) })); }
      case "conteo": { const v = m.q != null ? m.q : st.conteo[m.lugar][m.p]; return [{ k: m.p, nombre: P(m.p).n + " contado", valor: v != null && isFinite(v) ? v : 0, unidad: U(m.p) }]; }
    }
    return null;
  }
  /* cambios: {clave: nuevoValor}. meta: {por, autorizo} */
  function corregir(st, movId, cambios, meta) {
    meta = meta || {};
    const m = st.movs.find(x => x.id === movId);
    if (!m || m.deshecho) return { ok: false, msg: "Ese registro ya no se puede corregir." };
    const campos = camposCorreccion(st, m);
    if (!campos) return { ok: false, msg: m.tipo === "envio" ? "Ese envío ya fue recibido: corrige la recepción." : "Ese registro no se puede corregir; puedes deshacerlo." };
    const val = k => { const c = campos.find(x => x.k === k); const v = cambios[k]; const x = v == null || v === "" || isNaN(+v) ? (c ? c.valor : 0) : Math.max(0, +v); return isFinite(x) ? x : 0; };
    const base = { por: meta.por, via: "correccion", frase: m.frase };
    let nuevo = null;
    const desh = () => E.deshacer(st, m.id, Object.assign({}, meta, { forzar: true }));
    const antes = JSON.stringify(st), stockAntes = E.clone(st.stock);
    switch (m.tipo) {
      case "venta": {
        const v = st.ventas.find(x => x.mov === m.id); const n = Math.round(val("n"));
        const r = desh(); if (!r.ok) return r;
        if (n > 0) nuevo = E.vender(st, Object.assign({ k: v.k, n }, base));
        break;
      }
      case "envio": {
        const tr = st.transito.find(x => x.id === m.ref);
        const items = tr.items.map(it => ({ p: it.p, q: E.r3(val(it.p)) })).filter(it => it.q > 0);
        const r = desh(); if (!r.ok) return r;
        if (items.length) nuevo = E.despachar(st, Object.assign({ de: tr.de, a: tr.a, items, pedido: tr.pedido }, base)).mov;
        break;
      }
      case "recepcion": {
        const tr = st.transito.find(x => x.id === m.ref); const cant = {};
        tr.items.forEach(it => { cant[it.p] = E.r3(val(it.p)); });
        const r = desh(); if (!r.ok) return r;
        nuevo = E.recibir(st, tr.id, Object.assign({ cantidades: cant }, base));
        break;
      }
      case "compra": case "merma": {
        const items = m.deltas.map(d => ({ p: d.p, q: E.r3(val(d.p)) })).filter(it => it.q > 0);
        const r = desh(); if (!r.ok) return r;
        if (items.length) nuevo = m.tipo === "compra" ? E.comprar(st, Object.assign({ a: m.a, items, prov: m.nota }, base)) : E.merma(st, Object.assign({ lugar: m.lugar, items, motivo: m.nota }, base));
        break;
      }
      case "produccion": {
        const d = m.deltas.find(x => x.q > 0); const t = E.r3(val("tandas"));
        const r = desh(); if (!r.ok) return r;
        if (t > 0) nuevo = E.preparar(st, Object.assign({ prep: d.p, tandas: t, lugar: m.lugar }, base));
        break;
      }
      case "pedido": {
        const pe = st.pedidos.find(x => x.id === m.ref);
        const items = pe.items.map(it => ({ p: it.p, q: E.r3(val(it.p)) })).filter(it => it.q > 0);
        const r = desh(); if (!r.ok) return r;
        if (items.length) { E.pedir(st, Object.assign({ de: pe.de, a: pe.a, items }, base)); nuevo = st.movs[st.movs.length - 1]; }
        break;
      }
      case "conteo": {
        const q = E.r3(val(m.p));
        const r = desh(); if (!r.ok) return r;
        nuevo = E.contar(st, Object.assign({ lugar: m.lugar, p: m.p, q }, base));
        break;
      }
    }
    if (m.tipo !== "venta" && !meta.sinControlStock) {
      // si la corrección deja algo en negativo (o peor que antes), se deshace todo
      for (const l of E.LUGS) for (const p of Object.keys(st.stock[l] || {})) {
        const a = stockAntes[l][p] || 0, d = st.stock[l][p] || 0;
        if (d < -0.0005 && d < a - 0.0005) {
          const o = JSON.parse(antes); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, o);
          const pr = E.P(st, p);
          return { ok: false, sinStock: true, msg: "No alcanza: " + LUG[l].en + " solo hay " + E.fmtCant(pr, Math.max(0, a)) + " de " + E.nf(pr) + "." };
        }
      }
    }
    if (nuevo) { nuevo.corrige = m.id; nuevo.autorizo = meta.autorizo || null; nuevo.titulo = (nuevo.titulo || "") + " (corregido)"; m.corregidoPor = nuevo.id; }
    return { ok: true, msg: nuevo ? "Corregido: " + (nuevo.titulo || "") + (meta.autorizo ? " · autorizó " + meta.autorizo : "") : "Quitado: " + (m.titulo || m.tipo) + (meta.autorizo ? " · autorizó " + meta.autorizo : ""), mov: nuevo };
  }

  const API = { estadoLugar, planificar, planDespacho, planReceta, pedirLoQueFalta, recetaDe, txtReceta, ejecutar, consulta, txtItems, txtItemsCorto, requierePin, camposCorreccion, corregir, faltaParaVender, quitarItem, pregunta, resumir };
  root.FRX_ACC = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
