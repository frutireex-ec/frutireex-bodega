/* Frutireex · Prototipo bodega V7.1 — Vista 3D: la casa Frutireex (bodega, producción y el local).
   Usa Three.js (MIT), que va incrustado en la página para que funcione sin internet.
   Dos formas de ver cada lugar, como un tablero de bodega:
   - «Empaques»: cada producto en su estante, dibujado con sus cajas, bultos, latas, baldes, frascos…
   - «Estado»: cada espacio es un casillero que se llena según cuánto hay y se pinta según el mínimo
     (bien · cerca del mínimo · bajo el mínimo · sin stock), con ícono y texto en la etiqueta.
   Y «Los tres»: bodega, producción y local juntos, con lo que va en camino entre ellos.
   Al pasar el cursor (o tocar) se ve cuánto hay en empaques, kilos y libras, litros o unidades. */
(function (root) {
  "use strict";

  // ---------- medidas (metros de la escena) ----------
  const SLOT_W = 0.9, SLOT_D = 0.62, NIVEL_H = 0.85, BASE_Y = 0.32, POSTE = 0.06, ALTO_PILA = 0.6;
  const LB = 0.45359;
  const LUGS3 = ["B", "P", "L"];

  const COLOR = {
    frutilla: 0xE8344E, durazno: 0xF59B3D, banano: 0xF4C430, mora: 0x5A1F52,
    chantilly: 0xF6F3EA, leche: 0x5AA7E0, leche_polvo: 0x8FC6EE, condensada: 0x3E7CC4, azucar_imp: 0xEDE6D8, azucar: 0xE9D8B4,
    vainilla: 0x8B5A2B, huevos: 0xF3DDBD, crema_reex: 0xFFB3D6, choco_derretido: 0x6B3A1F, dulce_fresa: 0xC81D3A,
    choco_negro: 0x6B3A1F, choco_blanco: 0xF3E6C8, oreo: 0x3B2A2A, grageas: 0xE53935, masmelos: 0xF8BBD9, coco: 0xF4F1EA,
    mani: 0xE8C48A, nuez: 0xB88452, granola: 0xE2B464, tajin: 0xE4572E, chamoy: 0xA3122A, gusanitos: 0x66BB6A,
    vaso9: 0xDCEFF7, vaso12: 0xC9E4F0, tapa: 0xE9F4F9, bandeja: 0xE7B84A, domo_mini: 0xDCEFF7, tarro_godzilla: 0xE2F0F6,
    tenedor: 0xD8A866, tenedor_blanco: 0xF4F4F0, funda_tenedor: 0xDDEEF6, servilleta: 0xFFF3F8,
    funda_delivery: 0xC89B62, funda_deliv_peq: 0xF2F2EC, funda_deliv_med: 0xE8E8E0,
    masking: 0xF1E3B5, rollo_impresora: 0xF4F4F0, trapos: 0xF9D44A, funda_basura_g: 0x2B2F2D, funda_basura_p: 0x3A3F3C, cloro: 0xF4F4F0
  };
  const hex = n => "#" + ("000000" + (n >>> 0).toString(16)).slice(-6);

  // forma de cada empaque
  const FORMA_DE = { caja: "caja", paquete: "paquete", bulto: "bulto", saco: "bulto", funda: "bolsa", fundita: "bolsa", unidad: "bolsa",
    lata: "lata", balde: "balde", frasco: "frasco", botella: "frasco", canasto: "canasto", rollo: "rollo", galon: "galon", olla: "olla",
    racimo: "racimo", mano: "racimo", cubeta: "paquete", recipiente: "tina", tina: "tina", tanda: "tina", litro: "frasco", quintal: "bulto" };
  const DIM = {
    caja: { t: "box", s: [0.27, 0.2, 0.24] }, paquete: { t: "box", s: [0.26, 0.09, 0.2] }, bulto: { t: "box", s: [0.34, 0.13, 0.25], suave: 1 },
    bolsa: { t: "box", s: [0.18, 0.08, 0.14], suave: 1 }, galon: { t: "box", s: [0.13, 0.22, 0.13] }, racimo: { t: "box", s: [0.28, 0.12, 0.18], suave: 1 },
    lata: { t: "cyl", r: 0.075, h: 0.16 }, balde: { t: "cyl", r: 0.12, r2: 0.1, h: 0.2 }, frasco: { t: "cyl", r: 0.045, h: 0.13 },
    canasto: { t: "cyl", r: 0.13, r2: 0.11, h: 0.1 }, rollo: { t: "cyl", r: 0.065, h: 0.05 }, olla: { t: "cyl", r: 0.11, h: 0.12 },
    tina: { t: "cyl", r: 0.12, r2: 0.11, h: 0.11 }
  };

  /* Colores de estado (fijos: nunca se usan para otra cosa). Siempre van con ícono y texto. */
  const ESTADO = {
    ok: { color: "#0CA30C", icono: "●", txt: "Bien" },
    cerca: { color: "#FAB219", icono: "▲", txt: "Cerca del mínimo" },
    bajo: { color: "#EC835A", icono: "▼", txt: "Bajo el mínimo" },
    cero: { color: "#D03B3B", icono: "✕", txt: "Sin stock" },
    diario: { color: "#8C8B85", icono: "↻", txt: "Se pide a diario" }
  };

  function empaquePrincipal(p) {
    if (p.e && p.e.length && p.e[0][1] > 0) return { n: p.e[0][0], q: p.e[0][1] };
    if (p.prep) return { n: "tina", q: 2 };
    if (p.u === "u") return { n: "paquete", q: 50 };
    return { n: "funda", q: 1 };
  }

  /* ---------- textos (se usan también en la ficha, el tablero y las pruebas) ---------- */
  function equivalencias(E, p, q) {
    if (p.u === "kg") return E.num(q) + " kg · " + E.num(q / LB) + " lb";
    if (p.u === "L") return E.num(q) + " litros";
    return E.num(q, 0) + (Math.abs(q - 1) < 1e-9 ? " unidad" : " unidades");
  }
  function cantidad(E, p, q, l) { return E.fmtEn ? E.fmtEn(p, q, l) : E.fmtCant(p, q); }
  /* Estado de un producto en un lugar: ok, cerca (menos del doble del mínimo), bajo, cero o diario */
  function estadoDe(st, E, p, l) {
    const q = E.stockDe(st, l, p.id), min = (p.min && p.min[l]) || 0;
    let cls;
    if (q <= 0.0005) cls = p.diario && (l === "B" || !min) ? "diario" : "cero";
    else if (min && q < min) cls = "bajo";
    else if (min && q < min * 2) cls = "cerca";
    else cls = "ok";
    const e = ESTADO[cls];
    return { cls, txt: cls === "bajo" ? "Bajo el mínimo (" + E.fmtBase(p, min) + ")" : e.txt, icono: e.icono, color: e.color };
  }
  /* Qué tan lleno está un espacio (0 a 1): contra cuatro veces el mínimo, o contra lo que había al abrir */
  function llenado(st, E, p, l) {
    const q = Math.max(0, E.stockDe(st, l, p.id)), min = (p.min && p.min[l]) || 0;
    const ref = min > 0 ? min * 4 : Math.max(((st.apertura || {})[l] || {})[p.id] || 0, q, 1e-9);
    return Math.max(0, Math.min(1, q / ref));
  }
  const usaLugar = (st, E, p, l) => !p.en || p.en.indexOf(l) >= 0 || Math.abs(E.stockDe(st, l, p.id)) > 0.0005;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }

  /* Ficha de un producto en un lugar: HTML seguro. */
  function ficha(st, E, C, pid, l) {
    const p = st.cat.prods[pid]; if (!p) return "";
    const LUG = C.LUGARES, otros = (E.LUGS || LUGS3).filter(x => x !== l && usaLugar(st, E, p, x));
    const q = E.stockDe(st, l, pid);
    const emp = empaquePrincipal(p), es = estadoDe(st, E, p, l);
    const camino = E.enTransito(st, pid, l);
    let h = '<b class="v3f-n">' + esc(p.n) + "</b>";
    h += '<div class="v3f-q"><span>' + esc(LUG[l].nombre) + "</span><strong>" + esc(cantidad(E, p, q, l)) + "</strong></div>";
    if (q > 0) h += '<div class="v3f-eq">' + esc(equivalencias(E, p, q)) + "</div>";
    if (p.e && p.e.length) h += '<div class="v3f-emp">Cada ' + esc(emp.n === "galon" ? "galón" : emp.n) + ": " + esc(E.fmtBase(p, emp.q)) + (p.u === "kg" && emp.q >= 0.2 ? " (" + esc(E.num(emp.q / LB)) + " lb)" : "") + "</div>";
    if (q > 0 && p.c) h += '<div class="v3f-emp">Valor: ' + esc(E.dinero(q * p.c)) + "</div>";
    if (camino > 0) h += '<div class="v3f-cam">En camino: ' + esc(cantidad(E, p, camino, l)) + "</div>";
    otros.forEach(o => { h += '<div class="v3f-otro">' + esc(LUG[o].nombre) + ": " + esc(cantidad(E, p, E.stockDe(st, o, pid), o)) + "</div>"; });
    h += '<div class="v3f-est ' + es.cls + '"><span aria-hidden="true">' + es.icono + "</span> " + esc(es.txt) + "</div>";
    if (p.diario && C.PEDIDO_FRUTA && C.PEDIDO_FRUTA[pid]) h += '<div class="v3f-nota">' + esc(C.PEDIDO_FRUTA[pid]) + "</div>";
    return h;
  }

  /* Tablero: cifras del lugar (o de los tres) para las tarjetas, el gráfico por categoría y la lista de «atender primero». */
  function resumen(st, E, C, l) {
    const lugs = l === "T" ? (E.LUGS || LUGS3) : [l];
    const out = { lugares: {}, porCat: [], atender: [] };
    const cats = {};
    lugs.forEach(x => {
      const r = { productos: 0, valor: 0, cerca: 0, bajo: 0, cero: 0, camino: 0 };
      st.cat.orden.forEach(id => {
        const p = st.cat.prods[id]; if (!p || !usaLugar(st, E, p, x)) return;
        r.productos++;
        const q = Math.max(0, E.stockDe(st, x, id)), v = q * (p.c || 0); r.valor += v;
        const es = estadoDe(st, E, p, x);
        if (es.cls === "cerca") r.cerca++; else if (es.cls === "bajo") r.bajo++; else if (es.cls === "cero") r.cero++;
        const c = cats[p.cat] || (cats[p.cat] = { cid: p.cat, valor: 0, productos: 0, alertas: 0 });
        c.valor += v; c.productos++; if (es.cls === "bajo" || es.cls === "cero") c.alertas++;
        if (es.cls === "bajo" || es.cls === "cero") out.atender.push({ pid: id, l: x, cls: es.cls, icono: es.icono, txt: es.txt, nombre: p.n, q, cant: cantidad(E, p, Math.max(0, q), x), orden: es.cls === "cero" ? 0 : 1 });
      });
      r.camino = st.transito.filter(tr => tr.estado === "pendiente" && tr.a === x).length;
      r.valor = Math.round(r.valor * 100) / 100;
      out.lugares[x] = r;
    });
    out.porCat = (C.CATS || []).filter(([cid]) => cats[cid]).map(([cid, n]) => Object.assign({ nombre: n }, cats[cid], { valor: Math.round(cats[cid].valor * 100) / 100 })).sort((a, b) => b.valor - a.valor);
    out.atender.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
    const cero = { productos: 0, valor: 0, cerca: 0, bajo: 0, cero: 0, camino: 0 };
    out.total = lugs.reduce((a, x) => { Object.keys(cero).forEach(k => { a[k] += out.lugares[x][k]; }); return a; }, Object.assign({}, cero));
    out.total.valor = Math.round(out.total.valor * 100) / 100;
    return out;
  }

  /* ---------- estanterías: qué producto va en qué lugar de la escena ---------- */
  const NOMBRE_GRUPO = { L: { top: "Barra de toppings", prep: "Crema y chocolate" }, P: { prep: "Preparados aquí", fruta: "Fruta lavada y picada", base: "Materia prima", choco: "Cobertura" }, B: { fruta: "Fruta" } };
  function distribuir(st, C, l) {
    const E = root.FRX_ENG;
    const ids = st.cat.orden.filter(id => { const p = st.cat.prods[id]; return p && (E ? usaLugar(st, E, p, l) : (!p.en || p.en.indexOf(l) >= 0)); });
    const grupos = [];
    C.CATS.forEach(([cid, cn]) => {
      const ps = ids.filter(id => st.cat.prods[id].cat === cid);
      if (!ps.length) return;
      const w = Math.min(6, Math.max(2, Math.ceil(ps.length / 3))), niveles = Math.ceil(ps.length / w);
      const nombre = (NOMBRE_GRUPO[l] || {})[cid] || cn;
      grupos.push({ cid, nombre, ids: ps, w, niveles, largo: w * SLOT_W + 2 * POSTE });
    });
    // se reparten en tres paredes (izquierda, fondo, derecha) según el largo de cada estantería
    const HUECO = 0.55, total = grupos.reduce((a, g) => a + g.largo + HUECO, 0);
    let acum = 0;
    grupos.forEach(g => { const centro = acum + (g.largo + HUECO) / 2; g.pared = centro < total * 0.28 ? "izq" : centro < total * 0.72 ? "fondo" : "der"; acum += g.largo + HUECO; });
    if (!grupos.some(g => g.pared === "fondo") && grupos.length) grupos[Math.floor(grupos.length / 2)].pared = "fondo";
    const largoDe = pared => grupos.filter(g => g.pared === pared).reduce((a, g) => a + g.largo + HUECO, 0) - (grupos.some(g => g.pared === pared) ? HUECO : 0);
    const prof = SLOT_D + 0.1;
    const ancho = Math.max(8, largoDe("fondo") + 2 * (prof + 1.1));
    const fondo = Math.max(7, Math.max(largoDe("izq"), largoDe("der")) + prof + 3.2);
    const hx = ancho / 2, hz = fondo / 2;
    let x = -largoDe("fondo") / 2;
    grupos.filter(g => g.pared === "fondo").forEach(g => { g.pos = [x + g.largo / 2, -hz + prof / 2]; g.rot = 0; x += g.largo + HUECO; });
    let z = -hz + prof + 0.9;
    grupos.filter(g => g.pared === "izq").forEach(g => { g.pos = [-hx + prof / 2, z + g.largo / 2]; g.rot = Math.PI / 2; z += g.largo + HUECO; });
    z = -hz + prof + 0.9;
    grupos.filter(g => g.pared === "der").forEach(g => { g.pos = [hx - prof / 2, z + g.largo / 2]; g.rot = -Math.PI / 2; z += g.largo + HUECO; });
    return { grupos, ancho, fondo };
  }

  /* Cuántos empaques se dibujan y a qué escala para que entren en el espacio. */
  function acomodo(forma, n) {
    const d = DIM[forma] || DIM.caja;
    const dx = d.t === "box" ? d.s[0] : 2 * d.r, dy = d.t === "box" ? d.s[1] : d.h, dz = d.t === "box" ? d.s[2] : 2 * d.r;
    const cuenta = Math.ceil(n - 1e-9);
    let mejor = null;
    // pocos empaques se dibujan más grandes (se leen mejor); muchos se achican hasta que entren
    for (const s of [1.7, 1.5, 1.3, 1.15, 1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
      const cols = Math.max(1, Math.floor((SLOT_W - 0.06) / (dx * s + 0.02))), filas = Math.max(1, Math.floor((SLOT_D - 0.06) / (dz * s + 0.02)));
      const capas = Math.max(1, Math.floor(ALTO_PILA / (dy * s + 0.006)));
      mejor = { s, cols, filas, capas, cap: cols * filas * capas, dx: dx * s, dy: dy * s, dz: dz * s };
      if (mejor.cap >= cuenta) break;
    }
    return mejor;
  }

  // preferencias de quien mira (calidad de imagen y qué ver)
  function leerPref(k, def) { try { const v = root.localStorage && root.localStorage.getItem("frx-3d-" + k); return v == null ? def : v; } catch (e) { return def; } }
  function guardarPref(k, v) { try { root.localStorage.setItem("frx-3d-" + k, v); } catch (e) {} }

  /* ======================================================================================
     La casa Frutireex: bodega, producción y el local como tres cuartos de una misma casa
     (vista de casa de muñecas, como en Los Sims), con gente que trabaja y lleva las cajas.
     - 360°: se gira arrastrando, se acerca con la rueda o con dos dedos, se mueve con clic derecho.
     - Los nombres (cuarto, estante y producto) son etiquetas de la página: siempre del mismo tamaño
       y legibles, estén cerca o lejos; si se pisan, se muestra primero lo que hay que atender.
     - Cada empaque lleva el dibujo de su producto (fresas, moras, crema…) y encima flota el ícono.
     - Debajo de cada producto, una base del color de su estado (bien, cerca, bajo, sin stock).
     - Lo que va en camino lo lleva una persona por el pasillo, al ritmo real del viaje.
     ====================================================================================== */
  const SALA_ANCHO = 9.6, SALA_FONDO = 8.2, PARED_H = 2.5, PASO_Z = 3.15;
  const SALA_X = { B: -10.6, P: 0, L: 10.6 };
  const SALA_COLOR = { B: 0x0A6343, P: 0xFF8CC6, L: 0xF2A541 };
  const SALA_TINTA = { B: "#CEE85D", P: "#02301F", L: "#02301F" };
  const SALA_NOMBRE = { B: "Bodega", P: "Producción", L: "Local" };
  const ROPA = { B: 0x1E8C5A, P: 0xFFFFFF, L: 0xE0559A };
  const MUEBLE = { B: "estante", P: "mesa", L: "vitrina" };

  function crear(contenedor, op) {
    const T = root.THREE, E = root.FRX_ENG, C = root.FRX_CAT, ICO = root.FRX_ICONOS;
    op = op || {};
    const fichaEl = op.ficha || null;
    const tactil = root.matchMedia && root.matchMedia("(pointer:coarse)").matches;
    const sinMovimiento = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let calidad = op.calidad || leerPref("calidad", tactil ? "normal" : "alta");
    const vacio = { ok: false, actualizar() {}, lugar() {}, modo() { return "todo"; }, filtro() { return "todo"; }, calidad() { return calidad; }, visible() {}, accion() {}, resaltar() {}, ponerZoom() {}, zoomPct() { return 0; }, elegirProducto() {}, dondeEsta() { return null; }, productos() { return []; }, enCamino() { return []; }, info() { return {}; }, destruir() {} };
    let renderer = null;
    try {
      if (!T) throw new Error("sin Three");
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "default", preserveDrawingBuffer: !!op.capturable });
    } catch (e) {
      contenedor.innerHTML = '<div class="v3-sin">Este equipo no puede dibujar la vista 3D. Lo que hay en cada lugar está en la pestaña Inventario.</div>';
      return vacio;
    }
    if (T.ColorManagement && "legacyMode" in T.ColorManagement) T.ColorManagement.legacyMode = false;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0xDCEFE6, 1);
    const lienzo = renderer.domElement;
    lienzo.className = "v3-canvas"; lienzo.setAttribute("role", "img");
    lienzo.setAttribute("aria-label", "Casa en 3D con la bodega, producción y el local");
    contenedor.appendChild(lienzo);
    // capa de etiquetas (HTML encima del dibujo)
    const capa = document.createElement("div"); capa.className = "v3-capa"; capa.setAttribute("aria-hidden", "true");
    contenedor.appendChild(capa);

    if (op.controles !== false) {
      const pad = document.createElement("div"); pad.className = "v3-pad"; pad.setAttribute("role", "group"); pad.setAttribute("aria-label", "Mover la vista");
      pad.innerHTML = '<button type="button" data-p="panArr" class="p-ar" aria-label="Mover hacia el fondo" title="Hacia el fondo">▲</button><button type="button" data-p="panIzq" class="p-iz" aria-label="Mover a la izquierda" title="Izquierda">◀</button>' +
        '<button type="button" data-p="inicio" class="p-in" aria-label="Volver a la vista inicial" title="Volver al inicio">⌂</button><button type="button" data-p="panDer" class="p-de" aria-label="Mover a la derecha" title="Derecha">▶</button><button type="button" data-p="panAba" class="p-ab" aria-label="Mover hacia adelante" title="Hacia adelante">▼</button>' +
        '<button type="button" data-p="mas" class="p-ma" aria-label="Acercar" title="Acercar">＋</button><button type="button" data-p="menos" class="p-me" aria-label="Alejar" title="Alejar">−</button><button type="button" data-p="izq" class="p-gi" aria-label="Girar a la izquierda" title="Girar">⟲</button><button type="button" data-p="der" class="p-gd" aria-label="Girar a la derecha" title="Girar">⟳</button>';
      pad.addEventListener("click", ev => { const b = ev.target.closest("[data-p]"); if (b && api && api.accion) api.accion(b.dataset.p); });
      let rep0 = null; pad.addEventListener("pointerdown", ev => { const b = ev.target.closest("[data-p]"); if (!b || !/^pan|mas|menos/.test(b.dataset.p)) return; clearInterval(rep0); rep0 = setInterval(() => api && api.accion(b.dataset.p), 180); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(e => pad.addEventListener(e, () => clearInterval(rep0)));
      contenedor.appendChild(pad);
      const ayuda = document.createElement("div"); ayuda.className = "v3-tip"; ayuda.textContent = tactil ? "Un dedo: mover · dos dedos: acercar y girar · toca un producto" : "Arrastra: mover · rueda: acercar · clic derecho: girar · clic en un producto: ver";
      contenedor.appendChild(ayuda); setTimeout(() => ayuda.classList.add("sale"), 7000);
    }
    let api = null;
    const escena = new T.Scene();
    escena.fog = new T.Fog(0xDCEFE6, 45, 110);
    const camara = new T.PerspectiveCamera(36, 1, 0.1, 260);
    escena.add(new T.HemisphereLight(0xFFFBF2, 0x8E9A7C, 0.8));
    const sol = new T.DirectionalLight(0xFFF3DF, 1.25); sol.position.set(-12, 22, 14); escena.add(sol); escena.add(sol.target);
    const relleno = new T.DirectionalLight(0xE6F0FF, 0.38); relleno.position.set(14, 9, 10); escena.add(relleno);
    escena.add(new T.AmbientLight(0xFFFFFF, 0.16));

    // ---------- recursos compartidos ----------
    const GEOS = {}, MATS = {}, TEXS = {}, ICONOS = {};
    function aplicarCalidad() {
      const alta = calidad === "alta";
      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, alta ? 2 : 1.25));
      renderer.shadowMap.enabled = alta; renderer.shadowMap.type = T.PCFSoftShadowMap;
      sol.castShadow = alta;
      if (alta) {
        sol.shadow.mapSize.set(4096, 4096); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03;
        const c = sol.shadow.camera; c.left = -30; c.right = 30; c.top = 16; c.bottom = -16; c.near = 1; c.far = 70; c.updateProjectionMatrix();
      }
      Object.keys(MATS).forEach(k => { const m = MATS[k]; (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); });
    }
    function estandar(color, o) { return new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, o || {})); }
    function mat(color, o) { const k = color + "|" + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = estandar(color, o)); }
    function textura(ancho, alto, dibujar, clave) {
      if (clave && TEXS[clave]) return TEXS[clave];
      const c = document.createElement("canvas"); c.width = ancho; c.height = alto;
      dibujar(c.getContext("2d"), ancho, alto);
      const t = new T.CanvasTexture(c); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4); t.encoding = T.sRGBEncoding;
      t.userData = { canvas: c, dibujar };
      if (clave) TEXS[clave] = t;
      return t;
    }
    function ruido(ctx, w, h, n, colores, semilla) {
      let s = semilla || 7; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < n; i++) { ctx.fillStyle = colores[i % colores.length]; ctx.globalAlpha = 0.05 + r() * 0.07; ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
      ctx.globalAlpha = 1;
    }
    function recortar(ctx, txt, max) {
      if (ctx.measureText(txt).width <= max) return txt;
      while (txt.length > 2 && ctx.measureText(txt + "…").width > max) txt = txt.slice(0, -1);
      return txt + "…";
    }
    const FUENTE = '"Outfit","Segoe UI",system-ui,sans-serif';
    const corto = p => String(p.n || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
    const ICO_HTML = {};
    const icoH = pid => ICO_HTML[pid] || (ICO_HTML[pid] = '<span class="v3i">' + (ICO && ICO.icono ? ICO.icono(pid, "v3i-s") : "") + "</span>");

    /* El dibujo del producto (los mismos íconos de la página) como imagen para pintarlo en las cajas */
    function iconoImg(pid, listo) {
      const k = pid;
      if (ICONOS[k]) { if (ICONOS[k].ok) listo(ICONOS[k].img); else ICONOS[k].cola.push(listo); return; }
      const reg = ICONOS[k] = { ok: false, img: new Image(), cola: [listo] };
      let svg = ICO && ICO.icono ? ICO.icono(pid, "x") : '<svg viewBox="0 0 48 48"></svg>';
      svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" ');
      reg.img.onload = () => { reg.ok = true; reg.cola.splice(0).forEach(f => { try { f(reg.img); } catch (e) {} }); };
      reg.img.onerror = () => { reg.cola.length = 0; };
      reg.img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }
    function conIcono(tex, pid, pintar) {
      iconoImg(pid, img => { const c = tex.userData.canvas; pintar(c.getContext("2d"), c.width, c.height, img); tex.needsUpdate = true; pedirDibujo(); });
    }
    // caja de cartón con la etiqueta del producto y su dibujo grande al frente
    function matCaja(p) {
      const k = "caja|" + p.id; if (MATS[k]) return MATS[k];
      const lado = textura(256, 192, (ctx, w, h) => { ctx.fillStyle = "#C79A62"; ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, 900, ["#8A6338", "#E3BE8A"], 11); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(0, h * 0.42, w, h * 0.16); }, "carton-lado");
      const tapa = textura(256, 256, (ctx, w, h) => { ctx.fillStyle = "#CDA06A"; ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, 1100, ["#8A6338", "#E8C694"], 5); ctx.fillStyle = "rgba(240,235,220,.55)"; ctx.fillRect(w / 2 - 22, 0, 44, h); }, "carton-tapa");
      const frente = textura(256, 192, (ctx, w, h) => {
        ctx.fillStyle = "#C79A62"; ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, 900, ["#8A6338", "#E3BE8A"], 17);
        ctx.fillStyle = "#FBF8F1"; ctx.fillRect(16, 16, w - 32, h - 32);
        ctx.fillStyle = hex(COLOR[p.id] != null ? COLOR[p.id] : 0x0A6343); ctx.fillRect(16, h - 52, w - 32, 36);
        ctx.fillStyle = "#FFFFFF"; ctx.font = "700 22px " + FUENTE; ctx.textBaseline = "middle"; ctx.textAlign = "center";
        ctx.fillText(recortar(ctx, corto(p), w - 44), w / 2, h - 34);
      }, "caja-frente|" + p.id);
      conIcono(frente, p.id, (ctx, w, h, img) => ctx.drawImage(img, w / 2 - 60, 20, 120, 120));
      const mL = estandar(0xFFFFFF, { map: lado, roughness: 0.92 }), mT = estandar(0xFFFFFF, { map: tapa, roughness: 0.9 }), mF = estandar(0xFFFFFF, { map: frente, roughness: 0.88 });
      return (MATS[k] = [mF, mF, mT, mT, mF, mL]);
    }
    // bolsa, bulto, paquete: del color del producto, con su dibujo en una etiqueta blanca
    function matBolsa(p, forma) {
      const k = "bolsa|" + p.id + "|" + forma; if (MATS[k]) return MATS[k];
      const base = COLOR[p.id] != null ? COLOR[p.id] : 0xC8955A, saco = forma === "bulto";
      const frente = textura(256, 160, (ctx, w, h) => {
        ctx.fillStyle = hex(base); ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, saco ? 1400 : 300, saco ? ["#000000", "#FFFFFF"] : ["#FFFFFF"], 23);
        ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 64, 64, 0, 0, Math.PI * 2); ctx.fill();
      }, "bolsa-frente|" + p.id + "|" + saco);
      conIcono(frente, p.id, (ctx, w, h, img) => ctx.drawImage(img, w / 2 - 54, h / 2 - 54, 108, 108));
      const liso = estandar(base, { roughness: saco ? 0.95 : 0.55 });
      const mF = estandar(0xFFFFFF, { map: frente, roughness: saco ? 0.95 : 0.55 });
      return (MATS[k] = [liso, liso, liso, liso, mF, liso]);
    }
    // latas, baldes, frascos, ollas: etiqueta alrededor con el dibujo repetido
    function matCilindro(p, forma) {
      const k = "cil|" + p.id + "|" + forma; if (MATS[k]) return MATS[k];
      const col = COLOR[p.id] != null ? COLOR[p.id] : 0xC8955A, metal = forma === "lata" || forma === "olla";
      const lado = textura(512, 128, (ctx, w, h) => {
        ctx.fillStyle = metal ? "#C9CCCB" : "#F2EFE6"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = hex(col); ctx.fillRect(0, h * 0.14, w, h * 0.72);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.ellipse(64 + i * 128, h / 2, 44, 44, 0, 0, Math.PI * 2); ctx.fill(); }
      }, "cil-lado|" + p.id + "|" + forma);
      conIcono(lado, p.id, (ctx, w, h, img) => { for (let i = 0; i < 4; i++) ctx.drawImage(img, 64 + i * 128 - 40, h / 2 - 40, 80, 80); });
      const mL = estandar(0xFFFFFF, { map: lado, roughness: metal ? 0.35 : 0.6, metalness: metal ? 0.45 : 0 });
      const mT = mat(metal ? 0xB8BCBB : 0xEDEAE2, { roughness: metal ? 0.3 : 0.5, metalness: metal ? 0.6 : 0 });
      return (MATS[k] = [mL, mT, mT]);
    }
    function materialDe(p, forma) {
      const d = DIM[forma] || DIM.caja;
      if (forma === "caja") return matCaja(p);
      if (d.t === "box") return matBolsa(p, forma);
      return matCilindro(p, forma);
    }
    function geo(forma) {
      if (GEOS[forma]) return GEOS[forma];
      const d = DIM[forma] || DIM.caja; let g;
      if (d.t === "box") g = new T.BoxGeometry(1, 1, 1);
      else g = new T.CylinderGeometry(1, d.r2 ? d.r2 / d.r : 1, 1, forma === "rollo" ? 18 : 26);
      return (GEOS[forma] = g);
    }
    // el ícono que flota encima de cada producto (siempre mira a la cámara)
    function matSprite(pid) {
      const k = "spr|" + pid; if (MATS[k]) return MATS[k];
      const t = textura(256, 256, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = "rgba(255,255,255,.97)"; ctx.beginPath(); ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#02301F"; ctx.lineWidth = 9; ctx.stroke(); }, "spr|" + pid);
      conIcono(t, pid, (ctx, w, h, img) => ctx.drawImage(img, 34, 34, w - 68, h - 68));
      return (MATS[k] = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    }
    const geoCaja = new T.BoxGeometry(1, 1, 1), geoPlano = new T.PlaneGeometry(1, 1), geoCil = new T.CylinderGeometry(1, 1, 1, 20), geoEsfera = new T.SphereGeometry(1, 20, 14);
    const geoBordes = new T.EdgesGeometry(geoCaja);
    const matHit = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const matFantasma = new T.MeshBasicMaterial({ color: 0x8C8B85, transparent: true, opacity: 0.14, depthWrite: false });
    const matVacio = new T.MeshBasicMaterial({ color: 0xD03B3B, transparent: true, opacity: 0.16, depthWrite: false });
    const matBordeVacio = new T.LineBasicMaterial({ color: 0xD03B3B, transparent: true, opacity: 0.7 });
    const matEstado = {};
    function colorEstado(cls) {
      if (matEstado[cls]) return matEstado[cls];
      const c = new T.Color(ESTADO[cls].color);
      return (matEstado[cls] = estandar(c.getHex(), { roughness: 0.5, emissive: c.getHex(), emissiveIntensity: cls === "ok" ? 0.05 : 0.25 }));
    }

    // ---------- la casa (lo fijo) ----------
    function piso(clave, ancho, fondo, dibujar, repetir) {
      const base = textura(512, 512, dibujar, "piso|" + clave);
      const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(ancho / repetir, fondo / repetir);
      const m = new T.Mesh(new T.PlaneGeometry(ancho, fondo), estandar(0xFFFFFF, { map: t, roughness: 0.7, metalness: 0.03 }));
      m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
      return m;
    }
    const PISOS = {
      B: (ctx, w, h) => { ctx.fillStyle = "#C9C3B1"; ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, 2600, ["#8F8875", "#EEE9DC"], 3); ctx.strokeStyle = "rgba(110,104,86,.35)"; ctx.lineWidth = 3; ctx.strokeRect(0, 0, w, h); },
      P: (ctx, w, h) => { ctx.fillStyle = "#F4F2EC"; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "#D4D0C4"; ctx.lineWidth = 6; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke(); } ruido(ctx, w, h, 600, ["#B9B4A6"], 9); },
      L: (ctx, w, h) => { const tablas = 6; for (let i = 0; i < tablas; i++) { ctx.fillStyle = ["#C8935A", "#BD8650", "#D29E66"][i % 3]; ctx.fillRect(0, i * h / tablas, w, h / tablas); ctx.fillStyle = "rgba(80,45,15,.35)"; ctx.fillRect(0, (i + 1) * h / tablas - 3, w, 3); ctx.fillRect(((i * 197) % w), i * h / tablas, 3, h / tablas); } ruido(ctx, w, h, 1800, ["#6E4421", "#F0C48E"], 13); },
      afuera: (ctx, w, h) => { ctx.fillStyle = "#BFD9A8"; ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, 3000, ["#6E9A52", "#E3F1D2"], 21); },
      pasillo: (ctx, w, h) => { ctx.fillStyle = "#E7DCC4"; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "#CFC1A3"; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8); ruido(ctx, w, h, 900, ["#A99878"], 31); }
    };
    function letreroPared(l) {
      return textura(1024, 192, (ctx, w, h) => {
        ctx.fillStyle = hex(SALA_COLOR[l]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = SALA_TINTA[l]; ctx.textBaseline = "middle"; ctx.textAlign = "center";
        ctx.font = '400 104px "Zilla Rounded","Arial Black",sans-serif'; ctx.fillText(SALA_NOMBRE[l], w / 2, h / 2 + 4);
      }, "pared|" + l);
    }
    const casa = new T.Group(); escena.add(casa);
    const afuera = piso("afuera", 80, 50, PISOS.afuera, 6); afuera.position.y = -0.02; casa.add(afuera);
    const pasillo = piso("pasillo", SALA_X.L - SALA_X.B + SALA_ANCHO + 3, 2.1, PISOS.pasillo, 2.1); pasillo.position.set(0, 0.004, PASO_Z); casa.add(pasillo);
    const matPared = mat(0xF3EEE2, { roughness: 0.95 }), matZocalo = mat(0xD8CFBD, { roughness: 0.9 });
    function paredes(l) {
      const g = new T.Group(), x0 = SALA_X[l], hx = SALA_ANCHO / 2, hz = SALA_FONDO / 2;
      const fondo = new T.Mesh(geoCaja, matPared); fondo.scale.set(SALA_ANCHO + 0.3, PARED_H, 0.18); fondo.position.set(0, PARED_H / 2, -hz - 0.09); fondo.receiveShadow = true; g.add(fondo);
      const franja = new T.Mesh(geoPlano, new T.MeshBasicMaterial({ map: letreroPared(l), toneMapped: false })); franja.scale.set(4.2, 0.79, 1); franja.position.set(0, PARED_H - 0.5, -hz + 0.005); g.add(franja);
      const borde = new T.Mesh(geoCaja, mat(SALA_COLOR[l], { roughness: 0.8 })); borde.scale.set(SALA_ANCHO + 0.3, 0.14, 0.2); borde.position.set(0, PARED_H + 0.07, -hz - 0.09); g.add(borde);
      // paredes de los lados (bajas adelante para que se vea adentro) con una puerta hacia el pasillo
      [-1, 1].forEach(lado => {
        const seg = (z1, z2, h) => { const m = new T.Mesh(geoCaja, matPared); m.scale.set(0.18, h, z2 - z1); m.position.set(lado * (hx + 0.09), h / 2, (z1 + z2) / 2); m.castShadow = calidad === "alta"; m.receiveShadow = true; g.add(m);
          const tope = new T.Mesh(geoCaja, mat(SALA_COLOR[l], { roughness: 0.8 })); tope.scale.set(0.2, 0.08, z2 - z1); tope.position.set(lado * (hx + 0.09), h + 0.04, (z1 + z2) / 2); g.add(tope); };
        seg(-hz - 0.18, 1.0, PARED_H * 0.62); seg(1.0, PASO_Z - 0.95, 0.9); if (hz - (PASO_Z + 0.95) > 0.2) seg(PASO_Z + 0.95, hz, 0.5);
      });
      const zocalo = new T.Mesh(geoCaja, matZocalo); zocalo.scale.set(SALA_ANCHO, 0.14, 0.05); zocalo.position.set(0, 0.07, -hz + 0.03); g.add(zocalo);
      const p = piso(l, SALA_ANCHO, SALA_FONDO, PISOS[l], l === "L" ? 2.4 : 2); p.position.y = 0.008; g.add(p);
      g.position.x = x0;
      return g;
    }
    LUGS3.forEach(l => casa.add(paredes(l)));
    // muebles fijos de cada cuarto (adorno): cocina en producción, caja y mesas en el local, montacargas en bodega
    function muebleFijo(l) {
      const g = new T.Group(); g.position.x = SALA_X[l];
      const acero = mat(0xC4CBCC, { roughness: 0.35, metalness: 0.6 }), oscuro = mat(0x33403A, { roughness: 0.6, metalness: 0.2 });
      const caja = (m, sx, sy, sz, x, y, z) => { const o = new T.Mesh(geoCaja, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
      if (l === "P") {
        caja(acero, 1.4, 0.9, 0.7, 2.6, 0.45, 1.35);                                    // cocina
        [-0.3, 0.3].forEach(dx => { const h = new T.Mesh(geoCil, oscuro); h.scale.set(0.18, 0.02, 0.18); h.position.set(2.6 + dx, 0.91, 1.35); g.add(h); });
        const olla = new T.Mesh(geoCil, mat(0x9AA3A5, { roughness: 0.3, metalness: 0.7 })); olla.scale.set(0.2, 0.22, 0.2); olla.position.set(2.3, 1.03, 1.35); olla.castShadow = true; g.add(olla); g.userData.olla = olla;
        caja(mat(0xEDEFEF, { roughness: 0.4, metalness: 0.3 }), 0.9, 1.9, 0.75, 3.95, 0.95, -0.6);   // refrigeradora
      } else if (l === "L") {
        const madera = mat(0x8A5A33, { roughness: 0.7 }), vidrio = new T.MeshStandardMaterial({ color: 0xDFF3FF, transparent: true, opacity: 0.35, roughness: 0.1 });
        caja(madera, 3.2, 0.95, 0.7, -0.6, 0.475, 1.65); caja(mat(0xFFF6FA, { roughness: 0.6 }), 3.25, 0.06, 0.75, -0.6, 0.98, 1.65);   // mostrador
        const v = caja(vidrio, 1.4, 0.4, 0.6, -1.25, 1.21, 1.65); v.castShadow = false;
        caja(oscuro, 0.4, 0.28, 0.32, 0.6, 1.15, 1.6);                                       // caja registradora
        [[2.9, 2.0], [3.9, 1.0]].forEach(([x, z]) => { const m = new T.Mesh(geoCil, mat(0xFFFFFF, { roughness: 0.5 })); m.scale.set(0.42, 0.04, 0.42); m.position.set(x, 0.74, z); m.castShadow = true; g.add(m); const pata = new T.Mesh(geoCil, oscuro); pata.scale.set(0.04, 0.72, 0.04); pata.position.set(x, 0.36, z); g.add(pata); });
      } else {
        caja(mat(0xF2C230, { roughness: 0.5, metalness: 0.2 }), 0.8, 0.12, 1.1, 3.4, 0.08, 1.6);                // pallet
        caja(mat(0xB8864E, { roughness: 0.9 }), 0.7, 0.5, 0.5, 3.4, 0.4, 1.6);
      }
      return g;
    }
    LUGS3.forEach(l => casa.add(muebleFijo(l)));

    // ---------- detalles que le dan vida (lámparas, plantas, letreros, la vitrina con helado, la camioneta) ----------
    function detalles() {
      const g = new T.Group(), alta = calidad === "alta";
      const o = (geo0, m, sx, sy, sz, x, y, z, sombra) => { const k = new T.Mesh(geo0, m); k.scale.set(sx, sy, sz); k.position.set(x, y, z); if (sombra !== false) { k.castShadow = true; k.receiveShadow = true; } g.add(k); return k; };
      const luz = new T.MeshStandardMaterial({ color: 0xFFF4D6, emissive: 0xFFE6A8, emissiveIntensity: 1.2, roughness: 0.4 });
      const negro = mat(0x22302A, { roughness: 0.6 }), maceta = mat(0xB5653A, { roughness: 0.85 }), hoja = mat(0x3E8E4E, { roughness: 0.8 }), hoja2 = mat(0x5DAE5B, { roughness: 0.8 });
      const hz = SALA_FONDO / 2, hx = SALA_ANCHO / 2;
      LUGS3.forEach(l => {
        const x0 = SALA_X[l];
        // lámparas colgantes sobre el centro del cuarto
        // apliques de luz en la pared del fondo
        [-3.2, 3.2].forEach(dx => { o(geoCaja, mat(SALA_COLOR[l], { roughness: 0.6 }), 0.5, 0.12, 0.12, x0 + dx, PARED_H - 0.35, -hz + 0.06, false); o(geoCaja, luz, 0.42, 0.05, 0.08, x0 + dx, PARED_H - 0.42, -hz + 0.08, false); });
        if (alta) { const pl = new T.PointLight(0xFFE9C2, 0.32, 9, 2); pl.position.set(x0, PARED_H - 0.4, 0.4); g.add(pl); }
        // plantas en las esquinas del frente
        [-1, 1].forEach(lado => { const px = x0 + lado * (hx - 0.45), pz = hz - 0.45; o(geoCil, maceta, 0.2, 0.36, 0.2, px, 0.18, pz); o(geoEsfera, hoja, 0.34, 0.42, 0.34, px, 0.66, pz); o(geoEsfera, hoja2, 0.24, 0.3, 0.24, px + 0.12, 0.92, pz - 0.05); });
        // tapete de entrada
        o(geoCaja, mat(SALA_COLOR[l], { roughness: 0.95 }), 1.5, 0.012, 0.8, x0 + (l === "B" ? 2.2 : l === "L" ? -2.2 : 0), 0.012, hz - 0.5, false);
      });
      // local: helado de colores en la vitrina, bancos en la barra y menú
      { const x0 = SALA_X.L; ["#F6A6C1", "#7A4A2B", "#FFF3D6", "#C8E86A", "#E2463B", "#8B5CC4"].forEach((c, i) => { o(geoCil, mat(new T.Color(c).getHex(), { roughness: 0.55 }), 0.1, 0.12, 0.1, x0 - 1.8 + i * 0.22, 1.08, 1.6); });
        [-1.6, -0.6, 0.4].forEach(dx => { o(geoCil, negro, 0.03, 0.62, 0.03, x0 + dx, 0.31, 2.35); o(geoCil, mat(0xFF8CC6, { roughness: 0.6 }), 0.18, 0.06, 0.18, x0 + dx, 0.64, 2.35); });
        const menu = textura(512, 320, (ctx, w, h) => { ctx.fillStyle = "#02301F"; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "#CEE85D"; ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20); ctx.fillStyle = "#CEE85D"; ctx.font = '400 54px "Zilla Rounded","Arial Black",sans-serif'; ctx.textAlign = "center"; ctx.fillText("Fruti Reex", w / 2, 78); ctx.fillStyle = "#FFFFFF"; ctx.font = "600 30px " + FUENTE; ["Reex Midium · $3,00", "Reex Big · $3,50", "Split · $3,00", "Reexita Chill"].forEach((t, i) => ctx.fillText(t, w / 2, 140 + i * 44)); }, "menu-local");
        const mm = new T.Mesh(geoPlano, new T.MeshBasicMaterial({ map: menu, toneMapped: false })); mm.scale.set(1.6, 1.0, 1); mm.position.set(x0 + 2.4, PARED_H - 0.75, -hz + 0.02); g.add(mm); }
      // producción: mesa de trabajo con frutillas, licuadora y lavadero
      { const x0 = SALA_X.P, acero = mat(0xC4CBCC, { roughness: 0.3, metalness: 0.65 });
        o(geoCaja, acero, 1.6, 0.06, 0.7, x0 - 2.5, 0.9, 1.4); [-0.7, 0.7].forEach(dx => [-0.3, 0.3].forEach(dz => o(geoCaja, acero, 0.05, 0.9, 0.05, x0 - 2.5 + dx, 0.45, 1.4 + dz)));
        o(geoCaja, mat(0xF2EDE3, { roughness: 0.7 }), 0.6, 0.03, 0.4, x0 - 2.8, 0.945, 1.4);
        const roja = mat(0xD8253A, { roughness: 0.5 }); for (let i = 0; i < 12; i++) o(geoEsfera, roja, 0.045, 0.05, 0.045, x0 - 3.0 + (i % 4) * 0.12, 0.99, 1.3 + Math.floor(i / 4) * 0.1);
        o(geoCil, mat(0x2D3E50, { roughness: 0.5 }), 0.1, 0.12, 0.1, x0 - 1.95, 0.99, 1.4); o(geoCil, new T.MeshStandardMaterial({ color: 0xF6C9D6, transparent: true, opacity: 0.75, roughness: 0.15 }), 0.09, 0.3, 0.09, x0 - 1.95, 1.2, 1.4);
        o(geoCaja, acero, 0.9, 0.9, 0.6, x0 + 1.25, 0.45, 1.4); o(geoCaja, mat(0x8FA3A8, { roughness: 0.2, metalness: 0.8 }), 0.6, 0.04, 0.4, x0 + 1.25, 0.91, 1.4, false);
        o(geoCil, acero, 0.02, 0.35, 0.02, x0 + 1.25, 1.1, 1.18); }
      // bodega: carretilla y torre de cajas
      { const x0 = SALA_X.B, rojo = mat(0xC9372C, { roughness: 0.5, metalness: 0.3 }), carton = mat(0xC79A62, { roughness: 0.9 });
        o(geoCaja, rojo, 0.05, 1.2, 0.05, x0 + 2.25, 0.6, 2.6); o(geoCaja, rojo, 0.05, 1.2, 0.05, x0 + 2.65, 0.6, 2.6); o(geoCaja, rojo, 0.5, 0.04, 0.4, x0 + 2.45, 0.05, 2.75);
        [-1, 1].forEach(s2 => o(geoCil, negro, 0.1, 0.06, 0.1, x0 + 2.45 + s2 * 0.28, 0.1, 2.55).rotation.set(0, 0, Math.PI / 2));
        for (let i = 0; i < 5; i++) o(geoCaja, carton, 0.55, 0.38, 0.45, x0 - 3.3 + (i % 2) * 0.58, 0.19 + Math.floor(i / 2) * 0.39, 2.4); }
      // afuera: camioneta de reparto junto a la bodega, árboles y vereda frente al local
      { const xb = SALA_X.B - SALA_ANCHO / 2 - 2.6, blanco = mat(0xF4F4F0, { roughness: 0.45, metalness: 0.2 }), verde = mat(0x0A6343, { roughness: 0.5 });
        o(geoCaja, blanco, 1.7, 1.3, 3.6, xb, 0.95, 1.2); o(geoCaja, blanco, 1.7, 0.9, 1.3, xb, 0.75, 3.6); o(geoCaja, mat(0x9CC7DD, { roughness: 0.1, metalness: 0.3 }), 1.5, 0.4, 0.05, xb, 1.05, 4.26);
        o(geoCaja, verde, 1.72, 0.3, 3.62, xb, 1.15, 1.2, false);
        [[-1, 0.2], [1, 0.2], [-1, 3.6], [1, 3.6]].forEach(([s2, z]) => { const r = o(geoCil, negro, 0.34, 0.24, 0.34, xb + s2 * 0.85, 0.34, z); r.rotation.z = Math.PI / 2; });
        const tronco = mat(0x7A5230, { roughness: 0.9 }), copa = mat(0x4E9A4A, { roughness: 0.85 });
        [[SALA_X.L + SALA_ANCHO / 2 + 2.2, -2], [SALA_X.L + SALA_ANCHO / 2 + 2.6, 2.6], [SALA_X.B - SALA_ANCHO / 2 - 2.4, -3.2], [0, -SALA_FONDO / 2 - 2.4], [SALA_X.L, -SALA_FONDO / 2 - 2.6]].forEach(([x, z], i) => { o(geoCil, tronco, 0.14, 1.4, 0.14, x, 0.7, z); o(geoEsfera, copa, 0.95, 1.1, 0.95, x, 1.9, z); o(geoEsfera, mat(0x63B65A, { roughness: 0.85 }), 0.6, 0.7, 0.6, x + 0.35, 2.3, z + 0.2); void i; });
        o(geoCaja, mat(0xD9D3C4, { roughness: 0.9 }), SALA_X.L - SALA_X.B + SALA_ANCHO + 8, 0.06, 1.6, 0, 0.0, SALA_FONDO / 2 + 1.0, false); }
      return g;
    }
    casa.add(detalles());
    // cielo suave detrás de la casa
    escena.background = textura(16, 256, (ctx, w, h) => { const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#BFE3F2"); gr.addColorStop(0.55, "#E4F2EC"); gr.addColorStop(1, "#F1EDE2"); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }, "cielo");

    // ---------- estado de la vista ----------
    let lugar = op.lugar || "T", filtro = leerPref("filtro", "todo"), firma = "", espacios = [], visibleYa = true, resaltado = null;
    let contenido = null, etiquetas = [], personas = [], carga = [];
    const objetivo = new T.Vector3(0, 0.9, 0);
    const VISTA = { T: { x: 0, z: 0.6, r: 26.5, phi: 0.9, theta: 0 }, B: { x: SALA_X.B, z: 0, r: 15.5, phi: 0.82, theta: 0 }, P: { x: SALA_X.P, z: 0, r: 15.5, phi: 0.82, theta: 0 }, L: { x: SALA_X.L, z: 0, r: 15.5, phi: 0.82, theta: 0 } };
    const cam = { theta: 0, phi: 0.93, r: 31 }, meta = { theta: 0, phi: 0.93, r: 31, x: 0, y: 0.9, z: 0.4 };
    let encima = null, elegido = null, pulso = 0;
    const R_MIN = 3, R_MAX = 52;
    const marcoEncima = new T.LineSegments(geoBordes, new T.LineBasicMaterial({ color: 0x8DB22A }));
    const marcoElegido = new T.LineSegments(geoBordes, new T.LineBasicMaterial({ color: 0xE24D1A }));
    marcoEncima.visible = marcoElegido.visible = false;
    escena.add(marcoEncima, marcoElegido);
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3a = new T.Vector3(), s3 = new T.Vector3(), eY = new T.Euler();

    /* Empaques de un producto: una sola malla con todas las copias */
    function pilaEmpaques(p, q, ancho, prof, alto) {
      const pila = new T.Group();
      const emp = empaquePrincipal(p), forma = FORMA_DE[emp.n] || "caja", d = DIM[forma] || DIM.caja;
      const n = q > 0 ? q / emp.q : 0;
      if (n <= 0) {
        const v = new T.Mesh(geoCaja, matVacio); v.scale.set(ancho - 0.12, Math.min(0.3, alto * 0.5), prof - 0.12); v.position.y = v.scale.y / 2 + 0.01; v.raycast = () => {}; pila.add(v);
        const b = new T.LineSegments(geoBordes, matBordeVacio); b.scale.copy(v.scale); b.position.copy(v.position); b.raycast = () => {}; pila.add(b);
        return pila;
      }
      const a = acomodo(forma, n);
      const llenos = Math.floor(n + 1e-9), parte = n - llenos;
      const total = Math.min(a.cap, llenos + (parte > 0.02 ? 1 : 0));
      const anchoUsado = a.cols * (a.dx + 0.02) - 0.02, x0 = -anchoUsado / 2 + a.dx / 2;
      const z0 = prof / 2 - 0.05 - a.dz / 2;
      const inst = new T.InstancedMesh(geo(forma), materialDe(p, forma), Math.max(1, total));
      inst.castShadow = true; inst.receiveShadow = true; inst.raycast = () => {};
      for (let i = 0; i < total; i++) {
        const capaN = Math.floor(i / (a.cols * a.filas)), en = i % (a.cols * a.filas), fila = Math.floor(en / a.cols), col = en % a.cols;
        const esParte = i === total - 1 && parte > 0.02 && total === llenos + 1;
        const h = a.dy * (esParte ? Math.max(0.18, parte) : 1);
        if (d.t === "box") s3.set(a.dx * (d.suave ? 0.96 : 1), h, a.dz); else s3.set(d.r * a.s, h, d.r * a.s);
        v3a.set(x0 + col * (a.dx + 0.02), capaN * (a.dy + 0.006) + h / 2 + 0.03, z0 - fila * (a.dz + 0.02));
        eY.set(0, d.suave ? ((i * 37) % 7 - 3) * 0.02 : 0, 0); q4.setFromEuler(eY);
        m4.compose(v3a, q4, s3); inst.setMatrixAt(i, m4);
      }
      inst.count = total; inst.instanceMatrix.needsUpdate = true;
      pila.add(inst);
      pila.userData.alto = a.capas * (a.dy + 0.006);
      pila.userData.altoReal = Math.ceil(total / (a.cols * a.filas)) * (a.dy + 0.006);
      return pila;
    }

    /* Muebles de un cuarto: estantes (bodega), mesas de acero (producción), vitrinas (local) */
    function armarMueble(g, tipo, ancho, niveles, prof, nivelH) {
      const m = new T.Group();
      const postes = { estante: mat(0x0B4A32, { roughness: 0.45, metalness: 0.35 }), mesa: mat(0xB9C1C3, { roughness: 0.3, metalness: 0.65 }), vitrina: mat(0xFFFFFF, { roughness: 0.55 }) }[tipo];
      const tabla = { estante: mat(0xE98A2B, { roughness: 0.5, metalness: 0.25 }), mesa: mat(0xD6DCDD, { roughness: 0.25, metalness: 0.7 }), vitrina: mat(0xF6E7EF, { roughness: 0.6 }) }[tipo];
      const altoTotal = niveles * nivelH + 0.12;
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => { const pt = new T.Mesh(geoCaja, postes); pt.scale.set(0.06, altoTotal, 0.06); pt.position.set(sx * (ancho / 2 - 0.03), altoTotal / 2, sz * (prof / 2 - 0.03)); pt.castShadow = true; m.add(pt); }));
      for (let i = 0; i < niveles; i++) {
        const y = 0.1 + i * nivelH;
        const t = new T.Mesh(geoCaja, tabla); t.scale.set(ancho, 0.05, prof); t.position.set(0, y, 0); t.castShadow = true; t.receiveShadow = true; m.add(t);
      }
      if (tipo === "vitrina") { const fondo = new T.Mesh(geoCaja, mat(0xFFD1E8, { roughness: 0.8 })); fondo.scale.set(ancho, altoTotal, 0.03); fondo.position.set(0, altoTotal / 2, -prof / 2); m.add(fondo); }
      g.add(m);
      return m;
    }

    /* Lo que va en cada cuarto: categorías en muebles contra el fondo y los lados (deja libre el frente para caminar) */
    function distribuirSala(st, l) {
      const ids = st.cat.orden.filter(id => { const p = st.cat.prods[id]; return p && usaLugar(st, E, p, l); });
      const grupos = [];
      (C.CATS || []).forEach(([cid, cn]) => {
        const ps = ids.filter(id => st.cat.prods[id].cat === cid); if (!ps.length) return;
        grupos.push({ cid, nombre: (NOMBRE_GRUPO[l] || {})[cid] || cn, ids: ps });
      });
      const tipo = MUEBLE[l], nivelH = tipo === "mesa" ? 0.72 : tipo === "estante" ? 0.56 : 0.6, maxNiv = tipo === "mesa" ? 3 : tipo === "estante" ? 4 : 3;
      const hx = SALA_ANCHO / 2, hz = SALA_FONDO / 2;
      // paredes disponibles: fondo (ancho completo), izquierda y derecha (hasta antes de la puerta)
      const paredes = [{ k: "fondo", largo: SALA_ANCHO - 0.4 }, { k: "izq", largo: hz + 0.4 }, { k: "der", largo: hz + 0.4 }, { k: "isla", largo: SALA_ANCHO - 3.6 }];
      const slotW = 0.74, prof = 0.55;
      // cuántas columnas por grupo: que todos entren en los tres lados
      // se prueba con más niveles hasta que todo entre en las paredes (y, si hace falta, en una isla al centro)
      let niveles = 1, cabe = false;
      const acomodar = nv => {
        grupos.forEach(g => { g.cols = Math.max(1, Math.ceil(g.ids.length / nv)); g.niveles = Math.ceil(g.ids.length / g.cols); g.largo = g.cols * slotW + 0.1; });
        let pi = 0, usado = 0, ok = true;
        grupos.forEach(g => {
          while (pi < paredes.length && usado + g.largo > paredes[pi].largo + 0.01) { if (usado === 0 && g.largo > paredes[pi].largo) break; pi++; usado = 0; }
          if (pi >= paredes.length) { ok = false; pi = paredes.length - 1; }
          if (g.largo > paredes[pi].largo + 0.01) ok = false;
          g.pared = paredes[pi].k; usado += g.largo + 0.25;
        });
        return ok;
      };
      for (niveles = 1; niveles <= maxNiv; niveles++) { if (acomodar(niveles)) { cabe = true; break; } }
      if (!cabe) acomodar(maxNiv);
      ["fondo", "izq", "der", "isla"].forEach(k => {
        const gs = grupos.filter(g => g.pared === k); if (!gs.length) return;
        const largo = gs.reduce((a, g) => a + g.largo, 0) + (gs.length - 1) * 0.25;
        let s = k === "fondo" || k === "isla" ? -largo / 2 : -hz + prof + 0.55;
        gs.forEach(g => {
          const c = s + g.largo / 2;
          if (k === "fondo") { g.pos = [c, -hz + prof / 2 + 0.05]; g.rot = 0; }
          else if (k === "isla") { g.pos = [c, -0.35]; g.rot = 0; }
          else if (k === "izq") { g.pos = [-hx + prof / 2 + 0.05, c]; g.rot = Math.PI / 2; }
          else { g.pos = [hx - prof / 2 - 0.05, c]; g.rot = -Math.PI / 2; }
          s += g.largo + 0.25;
        });
      });
      return { grupos, tipo, nivelH, slotW, prof };
    }

    function etiquetaHTML(cls, html) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; d.hidden = true; capa.appendChild(d); return d; }

    function armarSala(st, l) {
      const g = new T.Group(); g.position.x = SALA_X[l];
      const D = distribuirSala(st, l);
      D.grupos.forEach(gr => {
        const mg = new T.Group(); mg.position.set(gr.pos[0], 0, gr.pos[1]); mg.rotation.y = gr.rot; g.add(mg);
        armarMueble(mg, D.tipo, gr.largo, gr.niveles, D.prof, D.nivelH);
        // cartel de la categoría (etiqueta de la página: siempre legible)
        const cartel = etiquetaHTML("v3-cartel s-" + l, esc(gr.nombre));
        etiquetas.push({ el: cartel, tipo: "cartel", l, pos: new T.Vector3(SALA_X[l] + gr.pos[0], gr.niveles * D.nivelH + 0.45, gr.pos[1]), prioridad: 2 });
        gr.ids.forEach((pid, k) => {
          const p = st.cat.prods[pid], col = Math.floor(k / gr.niveles), niv = k % gr.niveles;
          const x = -gr.largo / 2 + 0.05 + D.slotW / 2 + col * D.slotW, y = 0.125 + niv * D.nivelH;
          const q = Math.max(0, E.stockDe(st, l, pid)), es = estadoDe(st, E, p, l);
          const esp = { pid, l, cid: gr.cid, q, cls: es.cls, grupo: mg, x, y };
          const base = new T.Mesh(geoCaja, colorEstado(es.cls)); base.scale.set(D.slotW - 0.08, 0.025, D.prof - 0.08); base.position.set(x, y + 0.012, 0); base.receiveShadow = true; base.raycast = () => {}; mg.add(base); esp.base = base;
          const pila = pilaEmpaques(p, q, D.slotW, D.prof, D.nivelH - 0.12);
          pila.position.set(x, y + 0.025, 0); mg.add(pila); esp.pila = pila;
          const altoPila = Math.min(D.nivelH - 0.1, pila.userData.altoReal || 0.12);
          // el ícono del producto flota encima
          const spr = new T.Sprite(matSprite(pid)); spr.scale.set(0.4, 0.4, 1); spr.position.set(x, y + Math.max(0.2, altoPila) + 0.2, 0.08); spr.raycast = () => {}; mg.add(spr); esp.sprite = spr;
          // para tocarlo o pasar el mouse
          const hit = new T.Mesh(geoCaja, matHit); hit.scale.set(D.slotW - 0.04, D.nivelH - 0.06, D.prof); hit.position.set(x, y + (D.nivelH - 0.06) / 2, 0); hit.userData.esp = esp; mg.add(hit); esp.hit = hit;
          // ficha corta: nombre y cantidad (se muestra cuando se mira el cuarto de cerca, o siempre si hay que atenderlo)
          const chip = etiquetaHTML("v3-chip " + es.cls, icoH(pid) + '<i class="ic ' + es.cls + '">' + es.icono + "</i><b>" + esc(corto(p)) + "</b><span>" + esc(q > 0.0005 ? cantidad(E, p, q, l) : "nada") + "</span>");
          esp.chip = { el: chip, tipo: "chip", l, esp, pos: new T.Vector3(), prioridad: es.cls === "cero" ? 5 : es.cls === "bajo" ? 4 : es.cls === "cerca" ? 3 : 1 };
          etiquetas.push(esp.chip);
          espacios.push(esp);
        });
      });
      // nombre grande del cuarto, flotando sobre la pared
      const t = etiquetaHTML("v3-sala s-" + l, SALA_NOMBRE[l]);
      etiquetas.push({ el: t, tipo: "sala", l, pos: new T.Vector3(SALA_X[l], PARED_H + 0.75, -SALA_FONDO / 2), prioridad: 9 });
      // tablero del cuarto: por recibir y por despachar
      const tb = etiquetaHTML("v3-tablero s-" + l, "");
      etiquetas.push({ el: tb, tipo: "tablero", l, pos: new T.Vector3(SALA_X[l], PARED_H + 0.2, SALA_FONDO / 2 - 0.4), prioridad: 8.5 });
      return g;
    }

    // ---------- gente ----------
    const PIEL = [0xE6B48A, 0xC68A5C, 0x9B6440, 0xF0C7A0];
    function crearPersona(ropa, o) {
      o = o || {};
      const g = new T.Group(), piel = mat(PIEL[o.piel || 0], { roughness: 0.7 }), tela = mat(ropa, { roughness: 0.85 }), pantalon = mat(o.pantalon || 0x2D3E50, { roughness: 0.85 }), pelo = mat(o.pelo || 0x2B1D14, { roughness: 0.9 });
      const parte = (geo0, m, sx, sy, sz, x, y, z, padre) => { const x0 = new T.Mesh(geo0, m); x0.scale.set(sx, sy, sz); x0.position.set(x, y, z); x0.castShadow = true; (padre || g).add(x0); return x0; };
      const cadera = new T.Group(); cadera.position.y = 0.5; g.add(cadera);
      const piernaI = new T.Group(), piernaD = new T.Group(); piernaI.position.set(-0.08, 0, 0); piernaD.position.set(0.08, 0, 0); cadera.add(piernaI, piernaD);
      parte(geoCil, pantalon, 0.065, 0.48, 0.065, 0, -0.24, 0, piernaI); parte(geoCil, pantalon, 0.065, 0.48, 0.065, 0, -0.24, 0, piernaD);
      parte(geoCaja, mat(0x2A2A2A), 0.11, 0.06, 0.18, 0, -0.49, 0.03, piernaI); parte(geoCaja, mat(0x2A2A2A), 0.11, 0.06, 0.18, 0, -0.49, 0.03, piernaD);
      const torso = parte(geoCil, tela, 0.17, 0.46, 0.13, 0, 0.74, 0);
      if (o.mandil) parte(geoCaja, mat(o.mandil, { roughness: 0.8 }), 0.26, 0.42, 0.02, 0, 0.66, 0.13);
      const brazoI = new T.Group(), brazoD = new T.Group(); brazoI.position.set(-0.22, 0.94, 0); brazoD.position.set(0.22, 0.94, 0); g.add(brazoI, brazoD);
      parte(geoCil, tela, 0.05, 0.4, 0.05, 0, -0.18, 0, brazoI); parte(geoCil, tela, 0.05, 0.4, 0.05, 0, -0.18, 0, brazoD);
      parte(geoEsfera, piel, 0.05, 0.05, 0.05, 0, -0.4, 0, brazoI); parte(geoEsfera, piel, 0.05, 0.05, 0.05, 0, -0.4, 0, brazoD);
      const cabeza = parte(geoEsfera, piel, 0.17, 0.18, 0.17, 0, 1.17, 0);
      parte(geoEsfera, pelo, 0.175, 0.12, 0.175, 0, 1.25, -0.02);
      [-0.06, 0.06].forEach(dx => parte(geoEsfera, mat(0x1A1A1A), 0.018, 0.022, 0.018, dx, 1.19, 0.155));
      if (o.gorro) { parte(geoCil, mat(0xFFFFFF, { roughness: 0.7 }), 0.15, 0.16, 0.15, 0, 1.4, 0); parte(geoEsfera, mat(0xFFFFFF, { roughness: 0.7 }), 0.17, 0.08, 0.17, 0, 1.48, 0); }
      if (o.gorra) { parte(geoCil, mat(o.gorra), 0.18, 0.06, 0.18, 0, 1.33, 0); parte(geoCaja, mat(o.gorra), 0.2, 0.02, 0.14, 0, 1.31, 0.14); }
      // lo que lleva en las manos (una caja con el dibujo del producto)
      const bulto = new T.Group(); bulto.position.set(0, 0.86, 0.26); bulto.visible = false; g.add(bulto);
      g.scale.setScalar(o.escala || 1);
      return { g, cadera, piernaI, piernaD, brazoI, brazoD, torso, cabeza, bulto, fase: Math.random() * 6, vel: 0 };
    }
    function animarPersona(pr, dt, t) {
      const camina = pr.vel > 0.05;
      const a = camina ? Math.sin(t * 9 + pr.fase) * 0.55 : 0;
      pr.piernaI.rotation.x = a; pr.piernaD.rotation.x = -a;
      if (pr.bulto.visible) { pr.brazoI.rotation.x = -1.25; pr.brazoD.rotation.x = -1.25; }
      else if (pr.revolver) { pr.brazoD.rotation.x = -1.1 + Math.sin(t * 6) * 0.25; pr.brazoD.rotation.z = Math.sin(t * 6) * 0.3; pr.brazoI.rotation.x = 0; }
      else { pr.brazoI.rotation.x = -a * 0.8; pr.brazoD.rotation.x = a * 0.8; pr.brazoD.rotation.z = 0; }
      pr.g.position.y = camina ? Math.abs(Math.sin(t * 9 + pr.fase)) * 0.035 : Math.sin(t * 2 + pr.fase) * 0.006;
      pr.cabeza.rotation.y = camina ? 0 : Math.sin(t * 0.7 + pr.fase) * 0.35;
    }
    function caminarHacia(pr, dest, dt, vel) {
      const dx = dest.x - pr.g.position.x, dz = dest.z - pr.g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { pr.vel = 0; return true; }
      const paso = Math.min(d, (vel || 1.1) * dt);
      pr.g.position.x += dx / d * paso; pr.g.position.z += dz / d * paso; pr.vel = vel || 1.1;
      const ang = Math.atan2(dx, dz); let dif = ang - pr.g.rotation.y; while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
      pr.g.rotation.y += dif * Math.min(1, dt * 8);
      return false;
    }
    // un trabajador por cuarto, que va de un estante a otro
    const trabajadores = {};
    const INFO_TRAB = { B: { o: { gorra: 0x0A6343, piel: 1 }, nombre: "Bodega" }, P: { o: { gorro: true, mandil: 0xFF8CC6, piel: 0 }, nombre: "Producción" }, L: { o: { mandil: 0xFFFFFF, piel: 2, pelo: 0x4A2A14 }, nombre: "Local" } };
    LUGS3.forEach(l => {
      const pr = crearPersona(ROPA[l], INFO_TRAB[l].o); pr.l = l; pr.g.position.set(SALA_X[l] + (l === "L" ? -0.6 : 0), 0, l === "L" ? 0.9 : 0.6); escena.add(pr.g);
      pr.destino = null; pr.espera = 1 + Math.random() * 2;
      const burbuja = etiquetaHTML("v3-burbuja", ""); burbuja.hidden = true;
      pr.etq = { el: burbuja, tipo: "burbuja", l, pos: new T.Vector3(), prioridad: 8, persona: pr };
      trabajadores[l] = pr; personas.push(pr);
    });
    // un cliente que entra al local, espera en el mostrador y se va
    const cliente = crearPersona(0x3D7DD8, { piel: 3, pantalon: 0x4B4B4B, pelo: 0x6B3E1F, escala: 0.97 });
    cliente.g.position.set(SALA_X.L + 7, 0, PASO_Z); cliente.fase = 2; cliente.ciclo = 0; escena.add(cliente.g); personas.push(cliente);

    function puntosDe(l) {
      const lista = espacios.filter(e => e.l === l);
      return lista.map(e => { const w = new T.Vector3(e.x, 0, 0.75); e.grupo.localToWorld(w); w.y = 0; return { pos: w, esp: e }; });
    }
    function moverTrabajador(pr, dt, t) {
      const st = op.estado(), l = pr.l;
      // si hay un pedido para despachar aquí, va al producto pedido y se le ve un aviso
      const pe = st.pedidos.filter(x => x.estado === "pendiente" && x.a === l).sort((a, b) => a.t - b.t)[0];
      const llega = st.transito.find(x => x.estado === "pendiente" && x.a === l && E.ahora(st) - x.t >= (st.config.minutosViaje || 5) * 60000);
      pr.revolver = false;
      if (pe) pr.etq.html = '<b>Pedido ' + esc(C.LUGARES[pe.de].de) + "</b>" + pe.items.slice(0, 3).map(it => '<span class="v3-it">' + icoH(it.p) + esc(corto(st.cat.prods[it.p])) + "</span>").join("");
      else if (llega) pr.etq.html = "<b>¡Llegó algo!</b>Confirma si llegó bien";
      else pr.etq.html = "";
      if (!pr.destino || pr.llego) {
        pr.espera -= dt;
        if (pr.espera > 0) { pr.vel = 0; if (l === "P" && pr.enCocina) pr.revolver = true; return; }
        const ps = puntosDe(l);
        const pedidoPunto = pe ? ps.find(x => pe.items.some(it => it.p === x.esp.pid)) : null;
        let d;
        if (pedidoPunto && Math.random() < 0.7) d = pedidoPunto.pos.clone();
        else if (l === "P" && Math.random() < 0.35) { d = new T.Vector3(SALA_X.P + 2.6, 0, 1.95); pr.enCocina = true; }
        else if (l === "L" && Math.random() < 0.5) { d = new T.Vector3(SALA_X.L - 0.6 + (Math.random() - 0.5) * 1.6, 0, 1.0); pr.enCocina = false; }
        else if (ps.length) { d = ps[Math.floor(Math.random() * ps.length)].pos.clone(); pr.enCocina = false; }
        else d = new T.Vector3(SALA_X[l], 0, 0.6);
        pr.destino = d; pr.llego = false; pr.espera = 1.5 + Math.random() * 3.5;
      }
      if (caminarHacia(pr, pr.destino, dt, 1.0)) { pr.llego = true; if (l === "P" && pr.enCocina) pr.g.rotation.y = Math.PI; else if (!(l === "L" && pr.g.position.z > 0.6 && pr.g.position.z < 1.2)) pr.g.rotation.y = Math.PI; else pr.g.rotation.y = 0; }
    }
    function moverCliente(pr, dt) {
      const xL = SALA_X.L;
      const pasos = [new T.Vector3(xL + 7, 0, PASO_Z), new T.Vector3(xL + 4.4, 0, PASO_Z), new T.Vector3(xL - 0.6, 0, 2.55), new T.Vector3(xL - 0.6, 0, 2.55), new T.Vector3(xL + 4.4, 0, PASO_Z), new T.Vector3(xL + 7, 0, PASO_Z)];
      if (pr.esperaC > 0) { pr.esperaC -= dt; pr.vel = 0; if (pr.ciclo === 3) pr.g.rotation.y = Math.PI; return; }
      if (caminarHacia(pr, pasos[pr.ciclo], dt, 0.9)) {
        pr.ciclo = (pr.ciclo + 1) % pasos.length;
        if (pr.ciclo === 3) pr.esperaC = 6; else if (pr.ciclo === 0) { pr.esperaC = 14; pr.g.position.copy(pasos[0]); }
      }
    }
    // lo que va en camino: una persona lo lleva por el pasillo al ritmo del viaje
    function puerta(l, haciaX) { return new T.Vector3(SALA_X[l] + (haciaX > SALA_X[l] ? 1 : -1) * 2.2, 0, PASO_Z); }
    function sincronizarCarga(st) {
      const pendientes = st.transito.filter(tr => tr.estado === "pendiente" && SALA_X[tr.de] != null && SALA_X[tr.a] != null);
      carga = carga.filter(c => {
        if (pendientes.some(tr => tr.id === c.tr.id)) return true;
        escena.remove(c.pr.g); capa.contains(c.etq.el) && capa.removeChild(c.etq.el); personas.splice(personas.indexOf(c.pr), 1); etiquetas.splice(etiquetas.indexOf(c.etq), 1); return false;
      });
      pendientes.forEach(tr => {
        if (carga.some(c => c.tr.id === tr.id)) return;
        const pr = crearPersona(ROPA[tr.de], Object.assign({}, INFO_TRAB[tr.de].o, { piel: (carga.length + 1) % 4 }));
        const cajita = new T.Mesh(geoCaja, matCaja(st.cat.prods[tr.items[0].p])); cajita.scale.set(0.34, 0.26, 0.28); cajita.castShadow = true; pr.bulto.add(cajita); pr.bulto.visible = true;
        escena.add(pr.g); personas.push(pr);
        const el = etiquetaHTML("v3-viaje", "");
        const c = { tr, pr, etq: { el, tipo: "viaje", l: tr.a, pos: new T.Vector3(), prioridad: 7 } };
        etiquetas.push(c.etq); carga.push(c);
        const a = puerta(tr.de, SALA_X[tr.a]); pr.g.position.copy(a);
      });
    }
    function tableroHTML(st, l) {
      const fila = (it, lugar) => '<li>' + icoH(it.p) + "<span>" + esc(cantidad(E, st.cat.prods[it.p], it.q, lugar)) + " " + esc(corto(st.cat.prods[it.p])) + "</span></li>";
      const llegan = st.transito.filter(x => x.estado === "pendiente" && x.a === l), pide = st.pedidos.filter(x => x.estado === "pendiente" && x.a === l);
      let h = "";
      if (llegan.length) h += '<div class="tb-g llega"><b>Por recibir</b><ul>' + llegan.slice(0, 3).map(tr => tr.items.slice(0, 2).map(it => fila(it, l)).join("") + '<li class="tb-de">' + esc(C.LUGARES[tr.de].de) + "</li>").join("") + "</ul></div>";
      if (pide.length) h += '<div class="tb-g pide"><b>Por despachar</b><ul>' + pide.slice(0, 3).map(pe => pe.items.slice(0, 2).map(it => fila(it, pe.de)).join("") + '<li class="tb-de">pedido ' + esc(C.LUGARES[pe.de].de) + "</li>").join("") + "</ul></div>";
      return h;
    }
    let tTablero = 0;
    function moverCarga(dt) {
      tTablero -= dt;
      if (tTablero <= 0) { tTablero = 1; const st0 = op.estado(); etiquetas.forEach(e => { if (e.tipo === "tablero") e.html = tableroHTML(st0, e.l); }); }
      const st = op.estado(), viaje = (st.config.minutosViaje || 5) * 60000;
      carga.forEach(c => {
        const tr = st.transito.find(x => x.id === c.tr.id) || c.tr;
        const pct = Math.max(0, Math.min(1, (E.ahora(st) - tr.t) / viaje));
        const a = puerta(tr.de, SALA_X[tr.a]), b = puerta(tr.a, SALA_X[tr.de]);
        const dest = new T.Vector3().lerpVectors(a, b, pct); dest.z += (carga.indexOf(c) % 3 - 1) * 0.55;
        if (pct >= 1) dest.set(b.x, 0, PASO_Z - 0.9);
        caminarHacia(c.pr, dest, dt, pct >= 1 ? 1.2 : 2.5);
        if (pct >= 1 && c.pr.vel === 0) c.pr.g.rotation.y = Math.PI;
        const nombres = E.lista ? E.lista(tr.items.map(it => corto(st.cat.prods[it.p])).slice(0, 2)) : "";
        const ics = tr.items.slice(0, 3).map(it => icoH(it.p)).join("");
        c.etq.html = pct >= 1 ? "<b>Llegó " + esc(C.LUGARES[tr.a].a) + "</b>" + ics + esc(nombres) + " · ¿llegó bien?" : "<b>" + esc(C.LUGARES[tr.de].nombre + " → " + C.LUGARES[tr.a].nombre) + "</b>" + ics + esc(nombres) + " · " + Math.max(1, Math.ceil((1 - pct) * viaje / 60000)) + " min";
      });
    }

    // ---------- armar / actualizar lo que cambia ----------
    function firmaDe(st) {
      return [st.cat.orden.length, LUGS3.map(l => st.cat.orden.map(id => Math.round((st.stock[l] || {})[id] * 1000 || 0)).join(",")).join("|"),
        LUGS3.map(l => st.cat.orden.map(id => ((st.cat.prods[id].min || {})[l] || 0)).join(",")).join("|"), resaltado || "", filtro].join("#");
    }
    function armar() {
      const st = op.estado(); firma = firmaDe(st);
      if (contenido) { escena.remove(contenido); contenido.traverse(o => { if (o.isInstancedMesh && o.dispose) o.dispose(); }); }
      etiquetas.filter(e => e.tipo === "chip" || e.tipo === "cartel" || e.tipo === "sala" || e.tipo === "tablero").forEach(e => { if (e.el.parentNode) e.el.parentNode.removeChild(e.el); });
      etiquetas = etiquetas.filter(e => !(e.tipo === "chip" || e.tipo === "cartel" || e.tipo === "sala" || e.tipo === "tablero"));
      tTablero = 0;
      espacios = []; encima = null;
      contenido = new T.Group();
      LUGS3.forEach(l => contenido.add(armarSala(st, l)));
      escena.add(contenido);
      contenido.updateMatrixWorld(true);
      espacios.forEach(e => aplicarFiltro(e));
      if (elegido) { const n = espacios.find(e => e.pid === elegido.pid && e.l === elegido.l); elegido = n || null; }
      sincronizarCarga(st);
      etiquetas.forEach(e => { if (e.persona) return; if (!capa.contains(e.el)) capa.appendChild(e.el); });
      LUGS3.forEach(l => { const pr = trabajadores[l]; if (pr && !etiquetas.includes(pr.etq)) etiquetas.push(pr.etq); if (pr && !capa.contains(pr.etq.el)) capa.appendChild(pr.etq.el); });
      ordenarEtiquetas = true;
      pedirDibujo();
    }
    function aplicarFiltro(e) {
      const atenuar = (resaltado && e.cid !== resaltado) || (filtro === "falta" && (e.cls === "ok" || e.cls === "cerca" || e.cls === "diario"));
      e.pila.visible = !atenuar; e.sprite.visible = !atenuar;
      e.atenuado = atenuar;
      if (atenuar && !e.fantasma) { const g = new T.Mesh(geoCaja, matFantasma); g.scale.set(0.7, 0.3, 0.45); g.position.set(e.x, e.y + 0.18, 0); g.raycast = () => {}; e.grupo.add(g); e.fantasma = g; }
      if (e.fantasma) e.fantasma.visible = atenuar;
    }

    // ---------- cámara ----------
    function irA(l, inst) {
      const v = VISTA[l] || VISTA.T;
      meta.x = v.x; meta.y = 0.9; meta.z = v.z; meta.r = v.r * ajusteAncho(); meta.phi = v.phi; meta.theta = v.theta;
      if (inst) { objetivo.set(meta.x, meta.y, meta.z); cam.r = meta.r; cam.phi = meta.phi; cam.theta = meta.theta; }
      pedirDibujo();
    }
    // en pantallas angostas se aleja un poco para que entre todo
    function ajusteAncho() { const w = lienzo.clientWidth || 800, h = lienzo.clientHeight || 500; const asp = w / h; return asp < 1.3 ? Math.min(lugar === "T" ? 1.85 : 1.6, 1.3 / asp * (lugar === "T" ? 0.95 : 0.85)) : asp > 1.75 ? Math.max(0.74, 1.75 / asp) : 1; }
    function zoomPct() { return Math.round((1 - (Math.log(cam.r) - Math.log(R_MIN)) / (Math.log(R_MAX) - Math.log(R_MIN))) * 100); }
    function ponerZoom(pct) { const f = 1 - Math.max(0, Math.min(100, pct)) / 100; meta.r = Math.exp(Math.log(R_MIN) + f * (Math.log(R_MAX) - Math.log(R_MIN))); pedirDibujo(); }
    function actualizarCamara(dt) {
      const k = sinMovimiento ? 1 : Math.min(1, dt * 7);
      objetivo.x += (meta.x - objetivo.x) * k; objetivo.y += (meta.y - objetivo.y) * k; objetivo.z += (meta.z - objetivo.z) * k;
      cam.r += (meta.r - cam.r) * k; cam.phi += (meta.phi - cam.phi) * k;
      let dth = meta.theta - cam.theta; cam.theta += dth * k;
      const sp = Math.sin(cam.phi);
      camara.position.set(objetivo.x + cam.r * sp * Math.sin(cam.theta), objetivo.y + cam.r * Math.cos(cam.phi), objetivo.z + cam.r * sp * Math.cos(cam.theta));
      camara.lookAt(objetivo);
      const mov = Math.abs(meta.r - cam.r) + Math.abs(dth) + Math.abs(meta.phi - cam.phi) + Math.abs(meta.x - objetivo.x) + Math.abs(meta.z - objetivo.z);
      if (op.alZoom) op.alZoom(zoomPct());
      return mov > 0.001;
    }

    // ---------- etiquetas en la pantalla ----------
    let ordenarEtiquetas = true, tEtiq = 0;
    const vp = new T.Vector3();
    function colocarEtiquetas() {
      const w = lienzo.clientWidth, h = lienzo.clientHeight; if (!w || !h) return;
      const cerca = cam.r < 19;   // mirando un cuarto de cerca
      const salaVista = LUGS3.reduce((a, l) => Math.abs(SALA_X[l] - objetivo.x) < Math.abs(SALA_X[a] - objetivo.x) ? l : a, "P");
      const ocupado = [];
      const choca = (x, y, ww, hh) => ocupado.some(o => x < o.x + o.w && x + ww > o.x && y < o.y + o.h && y + hh > o.y);
      const lista = etiquetas.slice().sort((a, b) => b.prioridad - a.prioridad);
      let n = 0;
      lista.forEach(e => {
        if (e.tipo === "chip") { const es = e.esp; e.pos.set(es.x, es.y + Math.max(0.22, Math.min(0.5, (es.pila.userData.altoReal || 0.15))) + 0.42, 0.1); es.grupo.localToWorld(e.pos); }
        if (e.tipo === "burbuja") { e.pos.copy(e.persona.g.position); e.pos.y += 1.75; }
        if (e.tipo === "viaje") { const c = carga.find(x => x.etq === e); if (c) { e.pos.copy(c.pr.g.position); e.pos.y += 1.85; } }
        if ((e.tipo === "burbuja" || e.tipo === "viaje" || e.tipo === "tablero") && e.html !== e.htmlPuesto) { e.el.innerHTML = e.html || ""; e.htmlPuesto = e.html; }
        let mostrar = true;
        if (e.tipo === "chip") mostrar = !e.esp.atenuado && (cerca ? e.l === salaVista : e.prioridad >= 4);
        if (e.tipo === "cartel" && cerca && e.l !== salaVista) mostrar = false;
        if ((e.tipo === "burbuja" || e.tipo === "viaje" || e.tipo === "tablero") && !e.html) mostrar = false;
        if (e.tipo === "tablero" && cerca && e.l !== salaVista) mostrar = false;
        if (e.tipo === "cartel" && !cerca && cam.r > 34) mostrar = false;
        if (mostrar) {
          vp.copy(e.pos).project(camara);
          if (vp.z > 1 || vp.x < -1.1 || vp.x > 1.1 || vp.y < -1.1 || vp.y > 1.1) mostrar = false;
          else {
            const x = (vp.x + 1) / 2 * w, y = (1 - vp.y) / 2 * h;
            if (!e.ancho || e.htmlMedido !== e.el.innerHTML.length) { const oculto = e.el.hidden; e.el.hidden = false; e.ancho = e.el.offsetWidth || 90; e.alto = e.el.offsetHeight || 24; e.htmlMedido = e.el.innerHTML.length; e.el.hidden = oculto; }
            const ew = e.ancho, eh = e.alto;
            const bx = x - ew / 2, by = y - eh;
            if (e.tipo !== "sala" && choca(bx, by, ew, eh)) mostrar = false;
            else { ocupado.push({ x: bx - 3, y: by - 2, w: ew + 6, h: eh + 4 }); e.el.style.transform = "translate(" + Math.round(bx) + "px," + Math.round(by) + "px)"; }
          }
        }
        if (e.el.hidden === mostrar) e.el.hidden = !mostrar;
        if (mostrar) n++;
      });
      ultimasVisibles = n;
    }
    let ultimasVisibles = 0;

    // ---------- tocar, pasar el cursor ----------
    const ray = new T.Raycaster(), mouse = new T.Vector2();
    function espacioEn(cx, cy) {
      const r = lienzo.getBoundingClientRect();
      mouse.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camara);
      const hits = ray.intersectObjects(espacios.map(e => e.hit), false);
      return hits.length ? hits[0].object.userData.esp : null;
    }
    function marcar(marco, esp) {
      if (!esp) { marco.visible = false; return; }
      marco.visible = true;
      const w = new T.Vector3(esp.x, esp.y + 0.28, 0); esp.grupo.localToWorld(w);
      marco.position.copy(w); marco.rotation.y = esp.grupo.rotation.y; marco.scale.set(0.76, 0.56, 0.55);
    }
    function mostrarFicha(esp, cx, cy) {
      if (!fichaEl) return;
      if (!esp) { fichaEl.hidden = true; return; }
      fichaEl.innerHTML = ficha(op.estado(), E, C, esp.pid, esp.l) + (op.conAtajo ? '<button type="button" class="b peq v3f-atajo" data-atajo="' + esc(esp.pid) + '" data-atajo-l="' + esp.l + '">Mover o pedir</button>' : "");
      fichaEl.hidden = false;
      const r = contenedor.getBoundingClientRect(), fw = fichaEl.offsetWidth || 220, fh = fichaEl.offsetHeight || 140;
      let x = cx - r.left + 16, y = cy - r.top + 16;
      if (x + fw > r.width - 8) x = cx - r.left - fw - 16; if (y + fh > r.height - 8) y = Math.max(8, cy - r.top - fh - 16);
      fichaEl.style.left = Math.max(8, x) + "px"; fichaEl.style.top = Math.max(8, y) + "px";
    }
    let arrastre = null, toques = new Map(), pinza = null, movido = 0;
    lienzo.addEventListener("contextmenu", ev => ev.preventDefault());
    lienzo.addEventListener("pointerdown", ev => {
      lienzo.setPointerCapture && lienzo.setPointerCapture(ev.pointerId);
      toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (toques.size === 2) { const [a, b] = Array.from(toques.values()); pinza = { d: Math.hypot(a.x - b.x, a.y - b.y), r: meta.r, ang: Math.atan2(b.y - a.y, b.x - a.x), theta: meta.theta }; arrastre = null; return; }
      arrastre = { x: ev.clientX, y: ev.clientY, mover: !(ev.button === 2 || ev.shiftKey || ev.ctrlKey || ev.altKey), theta: meta.theta, phi: meta.phi, ox: meta.x, oz: meta.z };
      movido = 0;
    });
    lienzo.addEventListener("pointermove", ev => {
      if (toques.has(ev.pointerId)) toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinza && toques.size === 2) { const [a, b] = Array.from(toques.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); meta.r = Math.max(R_MIN, Math.min(R_MAX, pinza.r * pinza.d / Math.max(20, d))); meta.theta = pinza.theta - (Math.atan2(b.y - a.y, b.x - a.x) - pinza.ang); pedirDibujo(); return; }
      if (arrastre) {
        const dx = ev.clientX - arrastre.x, dy = ev.clientY - arrastre.y; movido = Math.max(movido, Math.abs(dx) + Math.abs(dy));
        if (arrastre.mover) {
          const f = cam.r / Math.max(300, lienzo.clientHeight) * 1.2, c = Math.cos(cam.theta), s = Math.sin(cam.theta);
          meta.x = Math.max(-22, Math.min(22, arrastre.ox - (dx * c + dy * s) * f)); meta.z = Math.max(-6, Math.min(8, arrastre.oz - (-dx * s + dy * c) * f));
        } else { meta.theta = arrastre.theta - dx * 0.006; meta.phi = Math.max(0.18, Math.min(1.42, arrastre.phi - dy * 0.005)); }
        pedirDibujo();
        if (movido > 4 && fichaEl && !tactil) fichaEl.hidden = true;
        return;
      }
      if (ev.pointerType === "mouse") { const esp = espacioEn(ev.clientX, ev.clientY); if (esp !== encima) { encima = esp; marcar(marcoEncima, esp); lienzo.style.cursor = esp ? "pointer" : "grab"; pedirDibujo(); } mostrarFicha(esp || (elegido && null), ev.clientX, ev.clientY); }
    });
    const soltar = ev => {
      toques.delete(ev.pointerId); if (toques.size < 2) pinza = null;
      if (arrastre && movido < 6) { const esp = espacioEn(ev.clientX, ev.clientY); elegido = esp; marcar(marcoElegido, esp); mostrarFicha(esp, ev.clientX, ev.clientY); pedirDibujo(); }
      arrastre = null;
    };
    lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
    lienzo.addEventListener("pointerleave", () => { if (!arrastre) { encima = null; marcar(marcoEncima, null); if (!elegido && fichaEl) fichaEl.hidden = true; pedirDibujo(); } });
    lienzo.addEventListener("wheel", ev => {
      ev.preventDefault();
      const f = Math.exp(Math.max(-0.5, Math.min(0.5, ev.deltaY * 0.0015)));
      const antes = meta.r; meta.r = Math.max(R_MIN, Math.min(R_MAX, meta.r * f));
      // se acerca hacia donde apunta el cursor
      if (meta.r < antes) {
        const r = lienzo.getBoundingClientRect(); mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(mouse, camara); const pl = new T.Plane(new T.Vector3(0, 1, 0), -0.9), pt = new T.Vector3();
        if (ray.ray.intersectPlane(pl, pt)) { const k = 1 - meta.r / antes; meta.x += (pt.x - meta.x) * k; meta.z = Math.max(-6, Math.min(8, meta.z + (pt.z - meta.z) * k)); }
      }
      pedirDibujo();
    }, { passive: false });
    lienzo.addEventListener("dblclick", ev => { const esp = espacioEn(ev.clientX, ev.clientY); if (esp) enfocar(esp); });
    lienzo.tabIndex = 0;
    lienzo.addEventListener("keydown", ev => {
      const k = ev.key; let usado = true;
      if (k === "ArrowLeft") mover(-1, 0); else if (k === "ArrowRight") mover(1, 0);
      else if (k === "ArrowUp") mover(0, -1); else if (k === "ArrowDown") mover(0, 1);
      else if (k === "q" || k === "Q") meta.theta += 0.25; else if (k === "e" || k === "E") meta.theta -= 0.25;
      else if (k === "Home" || k === "h" || k === "H") irA(lugar);
      else if (k === "+" || k === "=") meta.r = Math.max(R_MIN, meta.r * 0.88); else if (k === "-") meta.r = Math.min(R_MAX, meta.r * 1.12);
      else usado = false;
      if (usado) { ev.preventDefault(); pedirDibujo(); }
    });
    // mover la vista a los lados o hacia adelante/atrás (según hacia dónde mira la cámara)
    function mover(dx, dz) {
      const paso = Math.max(0.8, cam.r * 0.14), c = Math.cos(cam.theta), s2 = Math.sin(cam.theta);
      meta.x = Math.max(-24, Math.min(24, meta.x + (dx * c + dz * s2) * paso)); meta.z = Math.max(-7, Math.min(9, meta.z + (-dx * s2 + dz * c) * paso)); pedirDibujo();
    }
    function enfocar(esp) {
      const w = new T.Vector3(esp.x, esp.y + 0.3, 0); esp.grupo.localToWorld(w);
      meta.x = w.x; meta.y = Math.max(0.6, w.y); meta.z = w.z + 0.3; meta.r = 4.2;
      // se mira de frente al estante
      meta.theta = esp.grupo.rotation.y; meta.phi = 1.05;
      elegido = esp; marcar(marcoElegido, esp); pulso = 1.2; pedirDibujo();
    }

    // ---------- dibujo ----------
    let pedido = false, ultimo = 0, reloj = 0, animando = false;
    function pedirDibujo() { if (!pedido && visibleYa) { pedido = true; requestAnimationFrame(cuadro); } }
    function medir() {
      const w = contenedor.clientWidth || 800, h = contenedor.clientHeight || 520;
      if (lienzo.width !== Math.round(w * renderer.getPixelRatio()) || lienzo.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); lienzo.style.width = w + "px"; lienzo.style.height = h + "px"; camara.aspect = w / h; camara.updateProjectionMatrix(); ordenarEtiquetas = true; }
    }
    function cuadro(t) {
      pedido = false; if (!visibleYa) return;
      const dt = Math.min(0.05, ultimo ? (t - ultimo) / 1000 : 0.016); ultimo = t; reloj += dt;
      medir();
      const mueve = actualizarCamara(dt);
      if (!sinMovimiento) {
        LUGS3.forEach(l => moverTrabajador(trabajadores[l], dt, reloj));
        moverCliente(cliente, dt); moverCarga(dt);
        personas.forEach(pr => animarPersona(pr, dt, reloj));
      } else { moverCarga(10); }
      const olla = contenido && escena.getObjectByName ? null : null; void olla;
      // los íconos que flotan crecen un poco al alejarse (para distinguir las frutas desde lejos)
      const esc3 = Math.max(0.4, Math.min(0.8, cam.r * 0.027));
      if (Math.abs(esc3 - (api.escIcono || 0)) > 0.01) { api.escIcono = esc3; espacios.forEach(e => e.sprite.scale.set(esc3, esc3, 1)); }
      if (pulso > 0) { pulso -= dt; marcoElegido.material.color.setHSL(0.05, 0.85, 0.45 + Math.sin(reloj * 10) * 0.12); }
      renderer.render(escena, camara);
      tEtiq += dt;
      if (mueve || ordenarEtiquetas || tEtiq > 0.05) { colocarEtiquetas(); ordenarEtiquetas = false; tEtiq = 0; }
      animando = !sinMovimiento || mueve;
      if (animando) pedirDibujo();
    }
    function onResize() { ordenarEtiquetas = true; pedirDibujo(); }
    root.addEventListener("resize", onResize);
    const ro = root.ResizeObserver ? new ResizeObserver(onResize) : null; if (ro) ro.observe(contenedor);

    aplicarCalidad();
    armar();
    irA(lugar, true);
    pedirDibujo();

    api = {
      ok: true,
      actualizar() { const st = op.estado(); if (firmaDe(st) !== firma) armar(); else sincronizarCarga(st); etiquetas.forEach(e => { if (e.tipo === "tablero") e.html = tableroHTML(st, e.l); }); ordenarEtiquetas = true; pedirDibujo(); },
      lugar(l) { if (l == null) return lugar; if (l !== lugar) { lugar = l; elegido = null; marcar(marcoElegido, null); if (fichaEl) fichaEl.hidden = true; irA(l); } else irA(l); return lugar; },
      filtro(f) { if (f == null) return filtro; filtro = f === "falta" ? "falta" : "todo"; guardarPref("filtro", filtro); espacios.forEach(aplicarFiltro); ordenarEtiquetas = true; pedirDibujo(); return filtro; },
      modo(m) { return api.filtro(m === "estado" ? "falta" : m === "empaques" ? "todo" : m); },
      calidad(c) { if (c == null) return calidad; calidad = c === "normal" ? "normal" : "alta"; guardarPref("calidad", calidad); aplicarCalidad(); pedirDibujo(); return calidad; },
      visible(v) { visibleYa = !!v; if (visibleYa) { ultimo = 0; pedirDibujo(); } },
      accion(a) {
        if (a === "izq") meta.theta += Math.PI / 4; else if (a === "der") meta.theta -= Math.PI / 4;
        else if (a === "arriba") { meta.phi = meta.phi < 0.4 ? VISTA.T.phi : 0.2; }
        else if (a === "todo" || a === "inicio") irA(lugar);
        else if (a === "panIzq") mover(-1, 0); else if (a === "panDer") mover(1, 0); else if (a === "panArr") mover(0, -1); else if (a === "panAba") mover(0, 1);
        else if (a === "mas") meta.r = Math.max(R_MIN, meta.r * 0.8); else if (a === "menos") meta.r = Math.min(R_MAX, meta.r * 1.25);
        pedirDibujo();
      },
      resaltar(cid) { resaltado = cid || null; espacios.forEach(aplicarFiltro); ordenarEtiquetas = true; pedirDibujo(); },
      get resaltado() { return resaltado; },
      ponerZoom, zoomPct,
      // marca un producto (sin mover la cámara): se usa cuando se registra algo por voz
      destacar(pid, l) { const esp = espacios.find(e => e.pid === pid && (!l || e.l === l)); if (!esp) return false; marcar(marcoElegido, esp); pulso = 2.2; pedirDibujo(); setTimeout(() => { if (!elegido || elegido !== esp) { marcar(marcoElegido, elegido || null); pedirDibujo(); } }, 2600); return true; },
      elegirProducto(pid, l) {
        const cand = espacios.filter(e => e.pid === pid && (!l || e.l === l));
        const esp = cand.sort((a, b) => (b.q > 0) - (a.q > 0))[0]; if (!esp) return false;
        if (lugar !== "T" && lugar !== esp.l) { lugar = esp.l; if (op.alLugar) op.alLugar(lugar); }
        enfocar(esp);
        setTimeout(() => { const s = api.dondeEsta(esp.pid, esp.l); if (s) { const r = lienzo.getBoundingClientRect(); mostrarFicha(esp, r.left + s.x, r.top + s.y); } }, 700);
        return true;
      },
      dondeEsta(pid, l) {
        const esp = espacios.find(e => e.pid === pid && (!l || e.l === l)); if (!esp) return null;
        const w = new T.Vector3(esp.x, esp.y + 0.25, 0); esp.grupo.localToWorld(w); w.project(camara);
        return { x: (w.x + 1) / 2 * lienzo.clientWidth, y: (1 - w.y) / 2 * lienzo.clientHeight, l: esp.l };
      },
      productos() { return espacios.map(e => ({ pid: e.pid, l: e.l, cls: e.cls, q: e.q })); },
      enCamino() { return carga.map(c => ({ tr: c.tr.id, de: c.tr.de, a: c.tr.a, x: c.pr.g.position.x })); },
      info() { const tbs = etiquetas.filter(e => e.tipo === "tablero").map(e => e.l + ":" + (tableroHTML(op.estado(), e.l) || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()); return { lugar, filtro, espacios: espacios.length, personas: personas.length, enCamino: carga.length, etiquetas: ultimasVisibles, radio: Math.round(cam.r * 10) / 10, zoom: zoomPct(), salas: LUGS3.length, calidad, tableros: tbs }; },
      destruir() {
        visibleYa = false; root.removeEventListener("resize", onResize); if (ro) ro.disconnect();
        try { renderer.dispose(); } catch (e) {}
        if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo); if (capa.parentNode) capa.parentNode.removeChild(capa);
      }
    };
    return api;
  }

  const API = { crear, ficha, resumen, distribuir, acomodo, empaquePrincipal, equivalencias, estadoDe, llenado, ESTADO };
  root.FRX_3D = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
