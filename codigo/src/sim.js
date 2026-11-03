/* Frutireex · Prototipo bodega V7 — Simulación de días y escenarios reales (bodega → producción → local).
   Cada escenario arma un estado de prueba, lo hace "vivir" con frases de voz y ventas,
   y deja escrito qué pasó de verdad (incluido lo que nadie registró) para ver si el sistema lo detecta. */
(function (root) {
  "use strict";
  const E = root.FRX_ENG || require("./engine.js");
  const V = root.FRX_VOZ || require("./parser.js");
  const A = root.FRX_ACC || require("./acciones.js");
  const CAT = root.FRX_CAT || require("./catalog.js");

  function rng(seed) { let s = (seed >>> 0) || 7; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function pick(r, pares) { const tot = pares.reduce((a, x) => a + x[1], 0); let x = r() * tot; for (const p of pares) { x -= p[1]; if (x <= 0) return p[0]; } return pares[pares.length - 1][0]; }

  const STOCK = {
    B: { frutilla: 24, durazno: 12, banano: 40, chantilly: 8, leche: 24, leche_polvo: 3, condensada: 12, azucar_imp: 10, azucar: 5, vainilla: 1.5, huevos: 30,
      choco_negro: 10, choco_blanco: 10, oreo: 8, grageas: 4, masmelos: 3, coco: 4, mani: 5, nuez: 3, granola: 2, tajin: 1.2, chamoy: 2.85, gusanitos: 2,
      vaso9: 1800, vaso12: 1200, tapa: 4800, bandeja: 30, tarro_godzilla: 20, tenedor: 2000, servilleta: 1800, funda_delivery: 150,
      mora: 0, domo_mini: 250, tenedor_blanco: 3250, funda_tenedor: 10000, funda_deliv_peq: 8000, funda_deliv_med: 7200,
      masking: 107, rollo_impresora: 18, trapos: 80, funda_basura_g: 130, funda_basura_p: 150, cloro: 12 },
    // Producción: lo preparado, la fruta ya lavada y picada, y la materia prima que tiene a mano para preparar
    P: { crema_reex: 4, choco_derretido: 2, dulce_fresa: 1,
      frutilla: 8, durazno: 3, banano: 10, chantilly: 2, leche: 6, leche_polvo: 0.5, condensada: 2, azucar_imp: 2, azucar: 1, vainilla: 0.5, huevos: 6, choco_negro: 4,
      trapos: 5, cloro: 1, funda_basura_p: 10 },
    L: { frutilla: 6, durazno: 3, banano: 14,
      crema_reex: 2.5, dulce_fresa: 1, choco_derretido: 3, choco_blanco: 0.8, oreo: 0.8, grageas: 0.5, masmelos: 0.4, coco: 0.5, mani: 0.4, nuez: 0.3, granola: 0.3,
      tajin: 0.15, chamoy: 0.3, gusanitos: 0.2, vaso9: 200, vaso12: 150, tapa: 300, bandeja: 6, tarro_godzilla: 4, tenedor: 300, servilleta: 300, funda_delivery: 30,
      mora: 0, domo_mini: 20, tenedor_blanco: 200, funda_tenedor: 300, funda_deliv_peq: 300, funda_deliv_med: 200,
      masking: 3, rollo_impresora: 3, trapos: 10, funda_basura_g: 20, funda_basura_p: 20, cloro: 2 }
  };
  function fechaBase() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function hhmm(base, h, m) { const d = new Date(base); d.setHours(h, m || 0, 0, 0); return d.getTime(); }
  function addDias(f, n) { const d = new Date(f + "T12:00:00"); d.setDate(d.getDate() + n); return E.fechaDe(d.getTime()); }

  /* Estado de demostración: bodega y local con stock realista. */
  function estadoDemo(opc) {
    opc = opc || {};
    const base = opc.base || fechaBase();
    const t = hhmm(base, 12, 20);
    const st = E.crearEstado({ t, reloj: t });
    const hoy = E.fechaDe(t), ayer = addDias(hoy, -1);
    const lotes = { B: { frutilla: [{ q: 12, f: ayer }, { q: 12, f: hoy }], banano: [{ q: 40, f: ayer }] }, P: { frutilla: [{ q: 8, f: hoy }] }, L: { frutilla: [{ q: 6, f: ayer }], banano: [{ q: 12, f: ayer }] } };
    // cargar stock
    E.LUGS.forEach(l => Object.keys(STOCK[l]).forEach(p => { st.stock[l][p] = STOCK[l][p]; const pr = E.P(st, p); if (pr.per) st.lotes[l][p] = (lotes[l][p] || [{ q: STOCK[l][p], f: hoy }]).map(x => Object.assign({}, x)); }));
    if (opc.ajustar) opc.ajustar(st, hoy);
    return st;
  }

  /* Estado real para empezar a trabajar: la bodega con el conteo del equipo (CAT.INVENTARIO_BODEGA);
     el local queda con cantidades de prueba hasta que se dicte su conteo (st.localProvisional).
     Producción arranca vacía hasta que se cuente (st.produccionSinContar). */
  function estadoReal(opc) {
    opc = opc || {};
    const t = opc.t || Date.now();
    const B = Object.assign({}, CAT.INVENTARIO_BODEGA.B), L = Object.assign({}, STOCK.L);
    const P = Object.assign({}, CAT.INVENTARIO_BODEGA.P || {});
    CAT.PRODUCTOS.forEach(p => { if (!(p.id in L)) L[p.id] = 0; if (!(p.id in B)) B[p.id] = 0; if (!(p.id in P)) P[p.id] = 0; });
    const st = E.crearEstado({ t, stock: { B, P, L } });
    st.localProvisional = true;
    st.produccionSinContar = !Object.keys(CAT.INVENTARIO_BODEGA.P || {}).length;
    st.inventarioFecha = CAT.INVENTARIO_BODEGA.fecha;
    return st;
  }

  const QUIEN = { B: "Encargado de bodega", P: "Encargado de producción", L: "Ayudante del local" };
  // ---------- narrador ----------
  function narrador(st) {
    const pasos = [];
    const H = () => E.horaDe(E.ahora(st));
    return {
      pasos,
      a(h, m) { const d = new Date(st.reloj); d.setHours(h, m || 0, 0, 0); if (d.getTime() > st.reloj) st.reloj = d.getTime(); },
      fijar(h, m) { const d = new Date(st.reloj); d.setHours(h, m || 0, 0, 0); st.reloj = d.getTime(); },
      mas(min) { st.reloj += min * 60000; },
      nota(txt, tipo, quien) { pasos.push({ h: H(), txt, tipo: tipo || "sistema", quien }); },
      /* Dice una frase como lo haría alguien en ese lugar: se interpreta, se planifica y se ejecuta (o no). */
      voz(lugar, frase, opc) {
        opc = opc || {};
        const R = opc.alts ? V.interpretarMejor(opc.alts.map((x, i) => ({ t: x, c: i === 0 ? 0.62 : 0.55 })), { lugar, cat: st.cat, ultimoProducto: st._ultimoProducto })
          : V.interpretar(frase, { lugar, cat: st.cat, ultimoProducto: st._ultimoProducto });
        const plan = A.planificar(st, R, { lugar });
        if (opc.tr && plan.tipo === "recepcion") { const tr = st.transito.find(y => y.id === opc.tr); if (tr) { plan.tr = tr.id; plan.cantidades = {}; tr.items.forEach(y => { plan.cantidades[y.p] = y.q; }); plan.resumen = "Recibir envío de " + E.horaDe(tr.t) + " en " + CAT.LUGARES[tr.a].nombre; plan.avisos = []; plan.auto = true; } }
        const quien = CAT.LUGARES[lugar].nombre;
        const dicho = opc.alts ? opc.alts.join(" / ") : frase;
        const paso = { h: H(), quien, tipo: "voz", frase: dicho, conf: R.conf, entendido: plan.bloqueo && !plan.sinStock ? "No queda claro" : (plan.resumen || plan.respuesta || R.intent),
          avisos: plan.avisos.map(a => a.msg), auto: plan.auto };
        pasos.push(paso);
        if (plan.bloqueo) { paso.resultado = (plan.sinStock ? "" : "Repite la orden: ") + plan.bloqueo + (plan.sinStock && plan.detalle ? " " + plan.detalle : "") + " (no se registró nada)"; paso.estado = "bloqueado"; return { R, plan, r: null }; }
        if (plan.soloInfo) { paso.resultado = plan.respuesta; paso.estado = "info"; return { R, plan, r: null }; }
        if (plan.tipo === "si" || plan.tipo === "no") { paso.entendido = plan.tipo === "si" ? "Una respuesta («sí»)" : "Una respuesta («no»)"; paso.resultado = "No había ninguna pregunta pendiente: no se registró nada."; paso.estado = "info"; return { R, plan, r: null }; }
        const confirma = opc.confirmar !== undefined ? opc.confirmar : true;
        if (!plan.auto && !confirma) { paso.resultado = "Pidió confirmar y la persona canceló."; paso.estado = "cancelado"; return { R, plan, r: null }; }
        if (opc.ajustar) opc.ajustar(plan);
        const r = A.ejecutar(st, plan, { por: opc.por || QUIEN[lugar], via: opc.via || "voz", frase: dicho, conf: R.conf });
        paso.resultado = (plan.auto ? "" : "Confirmado con «sí». ") + (r.ok ? "Movimiento correcto: " : "") + r.msg; paso.estado = r.ok ? "ok" : "error";
        return { R, plan, r };
      },
      alertas(filtro) {
        const al = E.alertas(st).filter(filtro || (() => true));
        al.forEach(x => pasos.push({ h: H(), tipo: "alerta", nivel: x.nivel, quien: x.l ? CAT.LUGARES[x.l].nombre : "", txt: x.txt }));
        return al;
      },
      oculto(txt) { pasos.push({ h: H(), tipo: "oculto", txt }); }
    };
  }

  // ---------- ventas ----------
  const HORAS = [[13, 30, 0.08], [14, 30, 0.10], [15, 30, 0.16], [16, 30, 0.22], [17, 30, 0.24], [18, 30, 0.20]];
  function plantillaVentas(r, total, mezcla) {
    const ventas = [];
    HORAS.forEach(([h, m, w]) => {
      const n = Math.round(total * w);
      for (let i = 0; i < n; i++) ventas.push({ t: [h, m + Math.floor(r() * 60)], k: pick(r, mezcla) });
    });
    ventas.sort((a, b) => (a.t[0] * 60 + a.t[1]) - (b.t[0] * 60 + b.t[1]));
    return ventas;
  }

  /* Reposición que haría el equipo: si algo se acaba en el local, lo piden por voz (todo junto) y bodega lo despacha. */
  const FRASE_PEDIDO = { frutilla: "ocho kilos de frutilla", durazno: "tres kilos de durazno", banano: "un racimo de guineo",
    crema_reex: "cuatro kilos de crema", choco_derretido: "una olla de chocolate", dulce_fresa: "un frasco de dulce de fresa", tarro_godzilla: "un paquete de tarros godzilla",
    vaso9: "dos paquetes de vasos pequeños", vaso12: "dos paquetes de vasos grandes", tapa: "dos paquetes de tapas",
    oreo: "dos fundas de oreo", grageas: "un kilo de grageas", masmelos: "dos paquetes de masmelos", coco: "un kilo de coco",
    choco_blanco: "un kilo de chocolate blanco",
    tenedor: "un paquete de tenedores", servilleta: "un paquete de servilletas", mani: "un kilo de maní", nuez: "un kilo de nuez",
    granola: "un kilo de granola", gusanitos: "una caja de gusanitos", chamoy: "un frasco de chamoy",
    tajin: "un frasco de tajín", bandeja: "un paquete de bandejas", funda_delivery: "un paquete de fundas de delivery" };
  const FRASE_PREPARAR = { crema_reex: "preparar una tanda de crema", choco_derretido: "calentar una olla de chocolate", dulce_fresa: "hacer una tanda de dulce de fresa" };
  /* La bodega le manda a producción lo que le falta (materia prima o fruta) y producción lo confirma con un toque. */
  function abastecerProduccion(st, N, faltas, motivo) {
    const items = [];
    faltas.forEach(f => {
      const p = E.P(st, f.p), e = (p.e || []).find(x => x[0] === p.comp) || (p.e || [])[0];
      let q = Math.max(0, f.nec - f.hay);
      if (e && e[1] > 0) q = Math.max(1, Math.ceil(q / e[1] - 1e-9)) * e[1];   // se manda en empaques completos
      q = Math.min(E.r3(q), Math.max(0, E.stockDe(st, "B", f.p)));
      if (q > 0.0005) items.push({ p: f.p, q });
    });
    if (!items.length) return false;
    const x = E.despachar(st, { de: "B", a: "P", items, por: QUIEN.B, via: "toque" });
    N.nota("Producción no tiene suficiente para " + motivo + ": la bodega le manda " + A.txtItemsCorto(st, items, "P") + ".", "sistema", "Bodega");
    N.mas(4);
    E.recibir(st, x.transito.id, { por: QUIEN.P, via: "toque" });
    N.nota("Producción confirma que llegó (queda la huella bodega → producción).", "sistema", "Producción");
    return true;
  }
  /* Producción prepara lo que haga falta (crema, chocolate, dulce); si le falta materia prima, se la pide a la bodega. */
  function prepararSiFalta(st, N, ctl, pid, necesita) {
    const pr = st.cat.preps[pid]; if (!pr) return;
    let vueltas = 0;
    while (E.stockDe(st, "P", pid) + 0.0005 < necesita && vueltas < 4) {
      let f = E.faltaParaPreparar(st, pid, 1, "P");
      if (f.length) { if (!abastecerProduccion(st, N, f, "preparar " + E.nf(E.P(st, pid)))) return; f = E.faltaParaPreparar(st, pid, 1, "P"); if (f.length) return; }
      N.voz("P", FRASE_PREPARAR[pid]); vueltas++;
    }
  }
  const juntar = arr => arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " y " + arr[arr.length - 1];

  function reponer(st, N, ctl, oculto) {
    const al = E.alertas(st).filter(x => x.l === "L" && (x.nivel === "critico" || x.nivel === "alto") && x.accion);
    const pedir = [];
    // lo que la gente ve en la refrigeradora aunque el sistema diga otra cosa
    if (oculto) Object.keys(oculto.L).forEach(p => {
      const pr = E.P(st, p); if (pr.prep || !pr.min.L) return;
      const camino = st.transito.filter(tr => tr.estado === "pendiente" && tr.a === "L" && !(ctl.perdidos || []).includes(tr.id)).reduce((q, tr) => q + tr.items.filter(it => it.p === p).reduce((a, it) => a + it.q, 0), 0);
      const real = E.stockDe(st, "L", p) + oculto.L[p] + camino;
      const umbral = pr.min.L;
      const yaPedido = st.pedidos.some(pe => pe.estado === "pendiente" && pe.de === "L" && pe.items.some(it => it.p === p));
      if (real < umbral && !yaPedido && !al.some(x => x.p === p) && (!ctl.pidiendo[p] || st.reloj - ctl.pidiendo[p] > 30 * 60000)) { ctl.pidiendo[p] = st.reloj; pedir.push(p); }
    });
    al.forEach(x => {
      if (x.accion.tipo !== "pedir" || x.yaPedido) return;
      const p = x.p; if (ctl.pidiendo[p] && st.reloj - ctl.pidiendo[p] < 30 * 60000) return;
      ctl.pidiendo[p] = st.reloj; if (!pedir.includes(p)) pedir.push(p);
    });
    if (pedir.length) N.voz("L", "necesito " + juntar(pedir.map(p => FRASE_PEDIDO[p] || E.nf(E.P(st, p)))));
    despacharPendientes(st, N, ctl);
    // producción mantiene su mínimo de crema, chocolate y dulce
    E.alertas(st).filter(x => x.l === "P" && x.accion && x.accion.tipo === "preparar").forEach(x => {
      const p = E.P(st, x.p); if (ctl.preparando[x.p] && st.reloj - ctl.preparando[x.p] < 40 * 60000) return;
      ctl.preparando[x.p] = st.reloj; prepararSiFalta(st, N, ctl, x.p, p.min.P || 1);
    });
  }
  function despacharPendientes(st, N, ctl) {
    st.pedidos.filter(pe => pe.estado === "pendiente" && (pe.a === "B" || pe.a === "P")).forEach(pe => {
      const de = pe.a;
      if (de === "P") {
        // si piden crema, chocolate o dulce, producción lo prepara primero
        pe.items.forEach(it => { if (E.P(st, it.p).prep) prepararSiFalta(st, N, ctl, it.p, it.q); });
        // fruta: si producción no tiene suficiente lavada y picada, la bodega le manda
        const faltas = pe.items.filter(it => !E.P(st, it.p).prep && E.stockDe(st, "P", it.p) + 0.0005 < it.q && E.stockDe(st, "B", it.p) > 0.0005)
          .map(it => ({ p: it.p, nec: it.q, hay: Math.max(0, E.stockDe(st, "P", it.p)) }));
        if (faltas.length) abastecerProduccion(st, N, faltas, "el pedido del local");
      }
      // quien despacha ve el pedido en su pantalla y lo manda con un toque (solo lo que hay)
      const items = pe.items.map(it => ({ p: it.p, q: Math.min(it.q, Math.max(0, E.stockDe(st, de, it.p))) })).filter(it => it.q > 0.0005);
      if (!items.length) return;
      const x = E.despachar(st, { de, a: pe.de, items, pedido: pe.id, por: QUIEN[de], via: "toque" });
      N.nota(CAT.LUGARES[de].nombre + " ve el pedido en su pantalla y lo despacha con un toque: " + A.txtItemsCorto(st, items, pe.de) + ".", "sistema", CAT.LUGARES[de].nombre);
      ctl.porRecibir.push({ tr: x.transito.id, t: st.reloj + 8 * 60000 });
    });
  }
  function recibirLlegados(st, N, ctl, noConfirmar) {
    ctl.porRecibir = ctl.porRecibir.filter(x => {
      if (st.reloj < x.t) return true;
      if (noConfirmar && noConfirmar(x.tr)) return false;
      const tr = st.transito.find(y => y.id === x.tr);
      if (tr && tr.estado === "pendiente") N.voz(tr.a, "ya llegó", { tr: x.tr });
      return false;
    });
  }

  /* Un día completo. problemas: {porciones, mermaOculta, vasosSinVenta, trasladoSinRegistro, envioPerdido} */
  function simularDia(opc) {
    opc = opc || {};
    const r = rng(opc.seed || 42);
    const st = estadoDemo();
    const N = narrador(st);
    const prob = Object.assign({ porciones: 0, mermaOculta: 0, vasosSinVenta: 0, trasladoSinRegistro: false, envioPerdido: false }, opc.problemas || {});
    const oculto = { B: {}, P: {}, L: {} }; const ocu = (l, p, q) => { oculto[l][p] = E.r3((oculto[l][p] || 0) + q); };
    const verdad = [];
    const ctl = { pidiendo: {}, preparando: {}, porRecibir: [] };

    N.a(12, 30); E.abrirDia(st, { por: "Administrador" }); N.nota("Apertura del día. El sistema guarda cuánto hay en bodega, en producción y en el local.", "sistema");
    N.a(12, 32); N.voz("B", "llegaron " + (opc.tipo === "martes" ? "cuatro" : "seis") + " cajas de frutilla del proveedor");
    N.voz("B", "llegaron " + (opc.tipo === "martes" ? "un racimo" : "dos racimos") + " de guineo");
    N.a(12, 34); N.voz("B", "llevar " + (opc.tipo === "martes" ? "dos cajas" : "tres cajas") + " de frutilla y un racimo de guineo a producción");
    N.a(12, 38); N.voz("P", "ya llegó");
    N.a(12, 40); N.voz("P", "preparar dos tandas de crema"); N.voz("P", "calentar una olla de chocolate");
    N.a(12, 46);
    N.voz("P", "llevar ocho kilos de frutilla, cuatro kilos de crema y una olla de chocolate al local");
    N.voz("B", "llevar un paquete de vasos grandes al local");
    N.a(12, 52); N.voz("L", "ya llegaron los vasos grandes"); N.voz("L", "ya llegó");
    if (prob.trasladoSinRegistro) {
      N.a(13, 10); ocu("B", "oreo", -1); ocu("L", "oreo", +1);
      N.oculto("Alguien lleva 1 funda de Oreo de la bodega al local sin decir nada.");
      verdad.push({ txt: "1 funda de Oreo salió de bodega sin registrarse", p: "oreo", l: "B" });
    }
    const total = opc.vasos || (opc.tipo === "martes" ? 70 : 170);
    const ventas = plantillaVentas(r, total, st.cat.mezcla);
    let i = 0, ultimaRevision = 0, mermaHecha = false, ocultaHecha = false, perdidoHecho = false;
    const factor = 1 + (prob.porciones || 0);
    N.nota("Abre el local (13:30). Las ventas llegan desde la caja (Contífico) y el sistema descuenta los ingredientes según la receta.", "sistema");
    while (i < ventas.length) {
      const v = ventas[i];
      const tv = hhmm(new Date(st.reloj), v.t[0], v.t[1]);
      if (tv > st.reloj) st.reloj = tv;
      E.vender(st, { k: v.k, n: 1, por: "Caja", via: "contifico" });
      if (factor !== 1) {
        const rec = st.cat.recetas[v.k];
        ["frutilla", "durazno", "banano"].forEach(p => { if (rec[p]) ocu("L", p, -E.r3(rec[p] * (factor - 1))); });
        if (rec.toppings) E.toppingsDe(st.cat).forEach(([tp, w]) => ocu("L", tp, -E.r3(rec.toppings * w * (factor - 1) * 1.2)));
      }
      i++;
      if (st.reloj - ultimaRevision >= 3 * 60000) {
        ultimaRevision = st.reloj;
        recibirLlegados(st, N, ctl, prob.envioPerdido && !perdidoHecho ? (trId) => {
          const tr = st.transito.find(y => y.id === trId);
          if (tr && tr.items.some(it => it.p === "frutilla")) {
            perdidoHecho = true; (ctl.perdidos = ctl.perdidos || []).push(trId);
            N.oculto("El envío de frutilla de las " + E.horaDe(tr.t) + " nunca se confirma en el local (se quedó en el camino o nadie lo registró).");
            verdad.push({ txt: "Un envío de frutilla quedó sin confirmar", p: "frutilla", l: "L", transito: true });
            ocu("L", "frutilla", 0);
            return true;
          } return false;
        } : null);
        reponer(st, N, ctl, oculto);
      }
      if (!mermaHecha && v.t[0] >= 17 && v.t[1] >= 40) {
        mermaHecha = true; N.voz("L", "se cayó medio kilo de durazno");
      }
      if (prob.mermaOculta && !ocultaHecha && v.t[0] >= 18) {
        ocultaHecha = true; ocu("L", "frutilla", -prob.mermaOculta);
        N.oculto("Se dañan " + E.num(prob.mermaOculta) + " kg de frutilla y se botan sin registrarlo.");
        verdad.push({ txt: E.num(prob.mermaOculta) + " kg de frutilla dañada no registrada", p: "frutilla", l: "L" });
      }
    }
    if (factor !== 1) verdad.push({ txt: "Porciones " + Math.round(prob.porciones * 100) + "% más grandes que la receta (fruta y toppings)", p: "frutilla", l: "L" });
    if (prob.vasosSinVenta) {
      ocu("L", "vaso9", -Math.ceil(prob.vasosSinVenta * 0.6)); ocu("L", "vaso12", -Math.floor(prob.vasosSinVenta * 0.4));
      N.oculto(prob.vasosSinVenta + " vasos se usan sin venta registrada (muestras, regalos o ventas no cobradas).");
      verdad.push({ txt: prob.vasosSinVenta + " vasos usados sin venta registrada", p: "vaso9", l: "L" });
    }
    // cierre: devolver sobrantes perecibles a la bodega
    N.a(19, 35);
    recibirLlegados(st, N, Object.assign(ctl, { porRecibir: ctl.porRecibir.map(x => Object.assign(x, { t: 0 })) }), prob.envioPerdido ? (trId) => { const tr = st.transito.find(y => y.id === trId); return tr && tr.items.some(it => it.p === "frutilla"); } : null);
    const fr = E.stockDe(st, "L", "frutilla") + (oculto.L.frutilla || 0);
    if (fr > 6) {
      const kilos = Math.floor(fr - 2);
      if (kilos > 0) { N.voz("L", "devolver " + kilos + " kilos de frutilla a la bodega"); N.mas(5); N.voz("B", "ya llegó"); }
    }
    // conteo físico de cierre (lo que hay de verdad)
    N.a(19, 45);
    N.nota("Conteo físico de cierre en bodega, producción y local. Algunos productos se cuentan por voz (\"hay 3 cajas de frutilla\").", "sistema");
    let porVoz = 0;
    E.LUGS.forEach(l => st.cat.orden.forEach(pid => {
      const sis = E.stockDe(st, l, pid); if (!sis && !oculto[l][pid]) return;
      let real = E.r3(sis + (oculto[l][pid] || 0));
      const p = E.P(st, pid);
      if (p.u !== "u") real = Math.max(0, Math.round(real * 20) / 20); else real = Math.max(0, Math.round(real));
      if (pid === "frutilla" && porVoz < 3) { porVoz++; const e = p.e[0]; const k = Math.floor(real / e[1] + 1e-9), resto = E.r3(real - k * e[1]);
        N.voz(l, l !== "B" ? "hay " + E.num(real).replace(",", ".") + " kilos de frutilla" : "hay " + k + " " + E.plural(e[0], k) + (resto > 0 ? " y " + E.num(resto).replace(",", ".") + " kilos" : "") + " de frutilla");
        if (Math.abs((st.conteo[l][pid] || 0) - real) > 0.01) E.contar(st, { lugar: l, p: pid, q: real, por: "Conteo", via: "toque" });
      } else E.contar(st, { lugar: l, p: pid, q: real, por: "Conteo", via: "toque" });
    }));
    const res = E.cuadre(st);
    // ¿qué detectó el sistema?
    verdad.forEach(v => {
      const f = res.filas.find(x => x.l === v.l && x.p === v.p);
      v.detectado = v.transito ? res.transito.length > 0 : !!(f && (f.estado === "faltante" || f.estado === "sobrante"));
      v.como = v.transito ? "Aparece como envío sin confirmar" : f ? (f.estado === "faltante" ? "Faltante de " + E.fmtCantLargo(E.P(st, v.p), -f.dif) + " (" + E.dinero(-f.valor) + ")" : f.estado === "sobrante" ? "Sobrante" : "Dentro de la tolerancia") : "—";
    });
    N.nota("Cuadre del día: " + res.ventas + " ventas, " + E.dinero(res.ingresos) + " vendidos. Faltantes por " + E.dinero(-res.faltante$) + ".", "resultado");
    return { st, pasos: N.pasos, verdad, res };
  }

  // ---------- escenarios cortos ----------
  function abierto(ajustar, h) {
    const st = estadoDemo({ ajustar });
    const N = narrador(st);
    if ((h || 15) < 12) N.fijar(h, 0);
    E.abrirDia(st, { por: "Administrador" });
    N.a(h || 15, 0);
    return { st, N };
  }

  const ESCENARIOS = [
    { id: "dia", titulo: "Sábado lleno, con problemas reales", destino: "cierre",
      resumen: "Un día completo de 170 vasos. Pasan cosas que nadie registra: porciones grandes, fruta dañada que se bota, una funda que se llevan sin avisar, vasos que se van sin venta y un envío que nunca se confirma.",
      correr: () => simularDia({ tipo: "sabado", problemas: { porciones: 0.08, mermaOculta: 0.8, vasosSinVenta: 9, trasladoSinRegistro: true, envioPerdido: true } }) },
    { id: "dia_limpio", titulo: "Martes tranquilo, todo bien registrado", destino: "cierre",
      resumen: "70 vasos, todo se registra como debe. Sirve para ver cómo se ve un cierre que cuadra.",
      correr: () => simularDia({ tipo: "martes", seed: 7 }) },
    { id: "se_acaba", titulo: "Se acaba la frutilla en el local", destino: "operar",
      resumen: "Hora pico con poca frutilla. El sistema avisa antes de que se acabe, el local pide por voz y producción (que tiene la frutilla lavada y picada) la manda.",
      correr: () => {
        const { st, N } = abierto((s) => { s.stock.L.frutilla = 4.5; s.lotes.L.frutilla = [{ q: 4.5, f: E.fechaDe(s.reloj) }]; }, 16);
        N.nota("16:00, hora pico. En el local hay 4,5 kg de frutilla (mínimo: 3 kg).", "sistema");
        let avisado = false;
        for (let k = 0; k < 12; k++) {
          N.mas(4); E.vender(st, { k: k % 3 ? "reex|M" : "reex|B", n: 1, por: "Caja", via: "contifico" });
          if (!avisado && E.alertas(st).some(a => a.p === "frutilla" && a.l === "L")) {
            avisado = true; N.nota("Van " + (k + 1) + " ventas desde las 16:00.", "sistema");
            N.alertas(a => a.p === "frutilla" && a.l === "L");
            N.voz("L", "necesito ocho kilos de frutilla");
            N.mas(3); N.nota("Producción ve el pedido en su pantalla.", "sistema", "Producción");
            N.voz("P", "llevar ocho kilos de frutilla al local");
            N.mas(6); N.voz("L", "ya llegó");
          }
        }
        N.nota("En el local quedan " + E.fmtCantLargo(E.P(st, "frutilla"), E.stockDe(st, "L", "frutilla")) + ". Nunca se quedó sin frutilla.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "bodega_baja", titulo: "La bodega se queda corta y hay que comprar", destino: "inventario",
      resumen: "Vasos grandes y Oreo bajan del mínimo de bodega. El sistema calcula para cuántos días alcanza, sugiere cuánto comprar y a quién, y registra la compra por voz.",
      correr: () => {
        const { st, N } = abierto((s) => { s.stock.B.vaso12 = 240; s.stock.B.oreo = 1.2; s.stock.B.chantilly = 2; }, 10);
        N.nota("10:00. Revisión de la bodega antes de abrir.", "sistema");
        N.alertas(a => a.l === "B");
        N.mas(90); N.nota("Llega el proveedor de vasos (está en Guayllabamba: entrega en 1 día).", "sistema");
        N.voz("B", "llegaron dos cajas de vasos grandes");
        N.voz("B", "llegaron 5 fundas de oreo del proveedor");
        N.alertas(a => a.l === "B" && (a.p === "vaso12" || a.p === "oreo"));
        N.nota("Las alertas de vasos grandes y Oreo desaparecen. Chantilly sigue pendiente: el proveedor de chantilly demora 7 días, por eso el aviso es más urgente.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "no_llego", titulo: "Un envío que no llegó completo", destino: "operar",
      resumen: "Producción despacha 8 kilos de frutilla y 3 de durazno. Pasan 30 minutos sin confirmación; cuando el local revisa, solo llegaron 4 kilos de frutilla.",
      correr: () => {
        const { st, N } = abierto(null, 14);
        N.voz("P", "llevar ocho kilos de frutilla y tres kilos de durazno al local");
        N.mas(25); N.alertas(a => /no confirma/.test(a.txt));
        N.mas(10); N.voz("L", "llegaron cuatro kilos de frutilla y tres kilos de durazno");
        N.nota("Queda registrado: salieron 8 kg de frutilla y llegaron 4 kg. Esos 4 kg ($" + E.num(4 * E.P(st, "frutilla").c, 2) + ") aparecen en el cierre como perdidos en el camino.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "voz", titulo: "La voz se equivoca (y el sistema no)", destino: "movimientos",
      resumen: "Frases dichas a la carrera, con ruido o incompletas. Cómo responde el sistema a cada una para no perder ni duplicar mercadería.",
      correr: () => {
        const { st, N } = abierto(null, 16);
        N.voz("B", "kitar dos kajas de frutiya");
        N.mas(0.1); N.voz("B", "quitar dos cajas de frutilla", { confirmar: false });
        N.mas(2); N.voz("B", "quitar dos cajas");
        N.mas(1); N.voz("B", "quitar doce cajas de frutilla", { confirmar: false });
        N.mas(1);
        N.voz("B", "mandar vasos");
        N.voz("B", "quitar dos kilos de vasos grandes");
        N.voz("B", "", { alts: ["quitar dos casas de durazno", "quitar dos latas de durazno"] });
        N.voz("B", "eh mmm bueno este");
        N.voz("L", "se dañó medio kilo de frutilla");
        N.voz("L", "deshacer");
        N.voz("L", "cuánto hay de frutilla");
        N.nota("Ninguna frase dudosa movió mercadería sin confirmación. Lo repetido, lo exagerado y lo incompleto se detiene antes de registrarse.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "habla", titulo: "Hablando normal, como en el local", destino: "movimientos",
      resumen: "Frases con «eh», «o sea», «digamos», correcciones a mitad de frase y órdenes incompletas. El sistema contesta «movimiento correcto» o «repite la orden».",
      correr: () => {
        const { st, N } = abierto(null, 15);
        N.voz("B", "eh van dos cajas de frutilla para el local");
        N.mas(4); N.voz("L", "ya me llegó");
        N.mas(3); N.voz("L", "o sea se me cayó digamos medio kilo de frutilla");
        N.mas(2); N.voz("L", "oye bodega pásame un pack de vasos grandes");
        N.mas(1); N.voz("B", "ahí te va el pack de vasos grandes");
        N.mas(2); N.voz("B", "quita una lata de durazno no perdón dos latas");
        N.mas(1); N.voz("B", "va dos cajas de bodega");
        N.mas(1); N.voz("L", "eh este mmm");
        N.mas(5); N.voz("L", "ya no hay oreo");
        N.mas(3); N.voz("L", "vendí dos reex medianos y un big");
        N.nota("Las muletillas no confunden al sistema. Cuando falta algo (qué producto, cuánto), no registra nada y pide repetir la orden; cuando alguien se corrige, vale lo último que dijo, y pregunta antes de registrar.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "vencer", titulo: "Frutilla vieja en la bodega", destino: "inventario",
      resumen: "Hay frutilla de hace 3 días. El sistema la marca, despacha primero lo más viejo y avisa qué revisar o registrar como merma.",
      correr: () => {
        const { st, N } = abierto((s, hoy) => { s.stock.B.frutilla = 20; s.lotes.B.frutilla = [{ q: 4, f: addDias(hoy, -3) }, { q: 8, f: addDias(hoy, -2) }, { q: 8, f: hoy }]; }, 12);
        N.alertas(a => a.p === "frutilla");
        N.voz("B", "botar una caja de frutilla");
        N.voz("B", "llevar ocho kilos de frutilla al local");
        N.mas(6); N.voz("L", "ya llegó");
        const lotes = (st.lotes.L.frutilla || []).map(lo => E.num(lo.q) + " kg del " + lo.f.slice(8) + "/" + lo.f.slice(5, 7)).join(", ");
        N.nota("Al local llegó primero la frutilla más vieja que aún sirve. Lotes en el local: " + lotes + ". En bodega queda la más fresca.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "noche", titulo: "Algo cambió durante la noche", destino: "movimientos",
      resumen: "Al abrir, el conteo de la bodega no coincide con lo que quedó al cerrar: falta una caja de frutilla y un paquete de vasos.",
      correr: () => {
        const st = estadoDemo(); const N = narrador(st); N.a(12, 30);
        const conteo = { B: Object.assign({}, st.stock.B, { frutilla: st.stock.B.frutilla - 4, vaso9: st.stock.B.vaso9 - 50 }), P: Object.assign({}, st.stock.P), L: Object.assign({}, st.stock.L) };
        N.nota("Conteo rápido de apertura en bodega.", "sistema");
        const r = E.abrirDia(st, { conteoInicial: conteo, por: "Administrador" });
        r.cambios.forEach(c => N.nota("Diferencia al abrir " + CAT.LUGARES[c.l].en + ": " + E.nf(E.P(st, c.p)) + " " + E.fmtCantLargo(E.P(st, c.p), c.q) + ".", "alerta"));
        N.nota("Se registra un ajuste de apertura con hora y responsable. Si se repite, apunta a un problema de cuidado nocturno.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "sin_stock", titulo: "Mover más de lo que hay", destino: "operar",
      resumen: "En bodega queda una sola caja de frutilla y en el local poca Oreo. Piden más de lo que hay: el sistema ofrece mover solo lo que hay y, cuando ya no queda, responde «no se dispone».",
      correr: () => {
        const { st, N } = abierto((s, hoy) => { s.stock.B.frutilla = 4; s.lotes.B.frutilla = [{ q: 4, f: hoy }]; s.stock.L.oreo = 0.3; }, 14);
        N.voz("B", "quitar tres cajas de frutilla");
        N.mas(1); N.voz("B", "quitar otra caja de frutilla");
        N.mas(2); N.voz("L", "devolver una funda de oreo a la bodega");
        N.mas(1); N.voz("L", "devolver una funda de oreo a la bodega");
        N.mas(1); N.voz("B", "llegaron cinco cajas de frutilla del proveedor");
        N.voz("B", "quitar dos cajas de frutilla");
        N.nota("Nunca quedó un número negativo: lo que no está, no se puede mover. Si de verdad hay mercadería que el sistema no tiene, se registra la compra o lo autoriza el supervisor.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "crema", titulo: "La crema se prepara en producción y falta chantilly", destino: "operar",
      resumen: "El local se queda con poca crema y la pide a producción. Ahí no alcanza la chantilly: el sistema no deja registrar, la bodega le manda chantilly, producción confirma, prepara y la lleva al local.",
      correr: () => {
        const { st, N } = abierto((s) => { s.stock.L.crema_reex = 0.6; s.stock.P.crema_reex = 0; s.stock.P.chantilly = 1; }, 15);
        N.alertas(a => a.p === "crema_reex");
        N.voz("L", "necesito cuatro kilos de crema");
        N.voz("P", "preparar dos tandas de crema", { confirmar: false });
        N.voz("P", "necesito dos fundas de chantilly");
        N.mas(2); N.nota("La bodega ve el pedido de producción en su pantalla.", "sistema", "Bodega");
        N.voz("B", "llevar dos fundas de chantilly a producción");
        N.mas(4); N.voz("P", "ya llegó");
        N.voz("P", "preparar dos tandas de crema");
        N.voz("P", "llevar cuatro kilos de crema al local");
        N.mas(5); N.voz("L", "ya llegó");
        N.nota("Crema Reex en el local: " + E.fmtEn(E.P(st, "crema_reex"), E.stockDe(st, "L", "crema_reex"), "L") + ". La chantilly salió de la bodega, entró a producción y lo que se usó para la crema se descontó de producción automáticamente.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "produccion", titulo: "De la bodega al local, pasando por producción", destino: "movimientos",
      resumen: "Un recorrido completo con huella en cada paso: llega fruta a la bodega, pasa a producción para lavarla y picarla, producción prepara crema y dulce de fresa, y todo llega al local. Los vasos van directo de la bodega al local.",
      correr: () => {
        const { st, N } = abierto((s) => { s.stock.P.frutilla = 0; s.lotes.P.frutilla = []; }, 11);
        N.voz("B", "llegaron cuatro cajas de frutilla del proveedor");
        N.voz("B", "llevar cuatro cajas de frutilla, una funda de chantilly y una caja de leche a producción");
        N.mas(5); N.voz("P", "ya llegó");
        N.nota("Producción lava y pica la frutilla.", "sistema", "Producción");
        N.mas(30); N.voz("P", "preparar dos tandas de crema"); N.voz("P", "hacer una tanda de dulce de fresa");
        N.voz("P", "llevar diez kilos de frutilla, cuatro kilos de crema y un frasco de dulce de fresa al local");
        N.voz("B", "llevar dos paquetes de vasos pequeños al local");
        N.mas(8); N.voz("L", "ya llegó"); N.voz("L", "ya llegó");
        N.voz("L", "cuánto hay de frutilla");
        N.nota("Cada paso quedó con hora y responsable: bodega → producción (fruta y materia prima), producción → local (fruta lista y preparados) y bodega → local (vasos). En el kárdex de cada lugar se ve de dónde vino y a dónde fue.", "resultado");
        return { st, pasos: N.pasos };
      } },
    { id: "sobrantes", titulo: "Devolver sobrantes al cierre", destino: "inventario",
      resumen: "Al final del día sobra frutilla en el local. Se devuelve a la bodega por voz y la bodega confirma; así mañana se usa primero.",
      correr: () => {
        const { st, N } = abierto((s) => { s.stock.L.frutilla = 9.5; s.lotes.L.frutilla = [{ q: 9.5, f: E.fechaDe(s.reloj) }]; }, 19);
        N.a(19, 35);
        N.nota("19:35. Quedan 9,5 kg de frutilla en el local.", "sistema");
        N.voz("L", "devolver seis kilos de frutilla a la bodega");
        N.mas(5); N.voz("B", "ya llegó");
        N.nota("Bodega: " + E.fmtCantLargo(E.P(st, "frutilla"), E.stockDe(st, "B", "frutilla")) + ". Local: " + E.fmtCantLargo(E.P(st, "frutilla"), E.stockDe(st, "L", "frutilla")) + ".", "resultado");
        return { st, pasos: N.pasos };
      } }
  ];

  const API = { estadoDemo, estadoReal, simularDia, ESCENARIOS, STOCK, rng, narrador };
  root.FRX_SIM = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
