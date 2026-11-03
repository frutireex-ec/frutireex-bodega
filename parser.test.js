// Pruebas del intérprete de voz: node tests/parser.test.js
const V = require("../src/parser.js");
let ok = 0, bad = 0;
function check(frase, ctx, exp) {
  const r = V.interpretar(frase, Object.assign({ lugar: "B" }, ctx || {}));
  const errs = [];
  for (const k of Object.keys(exp)) {
    if (k === "items") {
      exp.items.forEach((ei, j) => {
        const it = r.items[j] || {};
        Object.keys(ei).forEach(kk => { if (typeof ei[kk] === "number" ? Math.abs((it[kk] || 0) - ei[kk]) > 1e-6 : it[kk] !== ei[kk]) errs.push(`items[${j}].${kk}=${JSON.stringify(it[kk])} esperaba ${JSON.stringify(ei[kk])}`); });
      });
      if (exp.items.length !== r.items.length) errs.push(`items.length=${r.items.length} esperaba ${exp.items.length}`);
    } else if (k === "issue") { if (!r.issues.some(x => x.code === exp.issue)) errs.push(`falta issue ${exp.issue} (hay ${r.issues.map(x => x.code)})`); }
    else if (k === "minConf") { if (r.conf < exp.minConf) errs.push(`conf=${r.conf} < ${exp.minConf}`); }
    else if (k === "maxConf") { if (r.conf > exp.maxConf) errs.push(`conf=${r.conf} > ${exp.maxConf}`); }
    else if (r[k] !== exp[k]) errs.push(`${k}=${JSON.stringify(r[k])} esperaba ${JSON.stringify(exp[k])}`);
  }
  if (errs.length) { bad++; console.log("✗", JSON.stringify(frase), ctx ? JSON.stringify(ctx) : "", "\n   ", errs.join("; "), "\n    →", JSON.stringify({ intent: r.intent, de: r.de, a: r.a, conf: r.conf, items: r.items.map(i => [i.p, i.q, i.tandas]), issues: r.issues.map(i => i.code) })); }
  else ok++;
}

// Traslados básicos y la regla del lugar
check("quitar dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", de: "B", a: "P", listo: true, minConf: 0.85, items: [{ p: "frutilla", q: 8 }] });
check("quitar dos cajas de frutilla", { lugar: "L" }, { intent: "traslado", de: "L", a: "P", items: [{ p: "frutilla", q: 8 }] });
check("Quitar 2 cajas de frutilla de bodega", { lugar: "L" }, { intent: "traslado", de: "B", a: "P" });
check("quitar dos cajas de frutilla del local", { lugar: "B" }, { intent: "traslado", de: "L", a: "P" });
check("quitar dos cajas de bodega", { lugar: "B" }, { intent: "traslado", de: "B", a: "L", issue: "falta_producto", listo: false });
check("quitar dos cajas de bodega", { lugar: "B", ultimoProducto: "frutilla" }, { intent: "traslado", issue: "producto_supuesto", items: [{ p: "frutilla", q: 8 }] });
check("llevar 3 cajas de frutilla al local", { lugar: "B" }, { de: "B", a: "L", items: [{ p: "frutilla", q: 12 }] });
check("manda una lata de durazno a la bodega", { lugar: "B" }, { de: "P", a: "B", items: [{ p: "durazno", q: 3 }] });
check("devolver una caja de frutilla", { lugar: "L" }, { intent: "traslado", de: "L", a: "P", items: [{ p: "frutilla", q: 4 }] });
check("sacar kilo y medio de oreo", { lugar: "B" }, { items: [{ p: "oreo", q: 1.5 }], listo: true });
check("sacar medio kilo de maní", {}, { items: [{ p: "mani", q: 0.5 }] });
check("pasar dos kilos y medio de coco rallado al local", {}, { a: "L", items: [{ p: "coco", q: 2.5 }] });
check("quitar 2,5 kg de nuez", {}, { items: [{ p: "nuez", q: 2.5 }] });
check("quitar una caja de frutilla y dos latas de durazno", {}, { items: [{ p: "frutilla", q: 4 }, { p: "durazno", q: 6 }] });
check("despachar treinta y dos vasos grandes", {}, { items: [{ p: "vaso12", q: 32 }] });
check("mandar una caja de vasos de doce", {}, { items: [{ p: "vaso12", q: 600 }] });
check("mandar 2 paquetes de vasos de 9 onzas", {}, { items: [{ p: "vaso9", q: 100 }] });
check("cien vasos pequeños al local", {}, { intent: "traslado", a: "L", items: [{ p: "vaso9", q: 100 }] });
check("sacar un paquete de tenedores", {}, { items: [{ p: "tenedor", q: 100 }] });
check("lleva 200 cucharas", {}, { items: [{ p: "tenedor", q: 200 }] });
check("pasa dos fundas de chantilly", {}, { items: [{ p: "chantilly", q: 2 }] });
check("quitar una funda de leche en polvo", {}, { items: [{ p: "leche_polvo", q: 1 }] });
check("quitar 6 litros de leche", {}, { items: [{ p: "leche", q: 6 }] });
check("sacar una caja de chocolate blanco", {}, { items: [{ p: "choco_blanco", q: 10 }] });
check("sacar una caja de chocolate", {}, { items: [{ p: "choco_negro", q: 17 }] });
check("frutilla dos cajas", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla", q: 8 }], issue: "verbo_supuesto" });
check("dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", de: "B", a: "P" });
check("un par de cajas de frutilla", {}, { items: [{ p: "frutilla", q: 8 }] });
check("quitar 500 gramos de grageas", {}, { items: [{ p: "grageas", q: 0.5 }] });
check("quitar dos libras de mani", {}, { items: [{ p: "mani", q: 0.907 }] });
check("lleva un racimo de guineo", {}, { items: [{ p: "banano", q: 20 }] });
check("lleva 10 platanos", {}, { items: [{ p: "banano", q: 10 }] });

// Errores típicos del dictado
check("kitar dos kajas de frutiya", {}, { intent: "traslado", items: [{ p: "frutilla", q: 8 }] });
check("quita 2 latas de durasno", {}, { items: [{ p: "durazno", q: 6 }] });
check("saca una funda de chantili", {}, { items: [{ p: "chantilly", q: 1 }] });
check("saca un kilo de o rey o", {}, { items: [{ p: "oreo", q: 1 }] });
check("sacar un paquete de más melos", {}, { items: [{ p: "masmelos", q: 0.45 }] });
check("quitar un frasco de ta jin", {}, { items: [{ p: "tajin", q: 0.42 }] });
check("quitar un frasco de chamoi", {}, { items: [{ p: "chamoy", q: 0.4 }] });
check("quitar dos cajas de fresas", {}, { items: [{ p: "frutilla", q: 8 }] });
check("quitar dos cajas de frutillas por favor", {}, { items: [{ p: "frutilla", q: 8 }] });
check("quitar dos cajas de fruti", {}, { items: [{ p: "frutilla", q: 8 }] });
check("quitar 3 kilos de nueces", {}, { items: [{ p: "nuez", q: 3 }] });
check("quitar 3 kilos de chispitas", {}, { items: [{ p: "grageas", q: 3 }] });
check("quitar vasos", {}, { issue: "ambiguo", listo: false });

// Otras órdenes
check("se dañó medio kilo de frutilla", { lugar: "L" }, { intent: "merma", lugar: "L", items: [{ p: "frutilla", q: 0.5 }], motivo: "Dañado" });
check("botar un kilo de durazno", { lugar: "B" }, { intent: "merma", lugar: "B", items: [{ p: "durazno", q: 1 }] });
check("se cayó una funda de grageas en el local", { lugar: "B" }, { intent: "merma", lugar: "L", motivo: "Se cayó / derrame" });
check("hay 3 cajas de frutilla", { lugar: "B" }, { intent: "conteo", lugar: "B", items: [{ p: "frutilla", q: 12 }] });
check("quedan 2 kilos de oreo", { lugar: "L" }, { intent: "conteo", lugar: "L", items: [{ p: "oreo", q: 2 }] });
check("hay que llevar dos cajas de frutilla al local", { lugar: "B" }, { intent: "traslado", a: "L" });
check("cuánto hay de frutilla", {}, { intent: "consulta", items: [{ p: "frutilla" }] });
check("cuantas cajas de frutilla quedan", {}, { intent: "consulta", items: [{ p: "frutilla" }] });
check("preparar dos tandas de crema", { lugar: "L" }, { intent: "produccion", items: [{ p: "crema_reex", tandas: 2 }] });
check("hacer dulce de fresa", { lugar: "L" }, { intent: "produccion", items: [{ p: "dulce_fresa", tandas: 1 }] });
check("batir una tanda de crema", { lugar: "L" }, { intent: "produccion", items: [{ p: "crema_reex", tandas: 1 }] });
check("necesito 2 cajas de vasos grandes", { lugar: "L" }, { intent: "pedido", de: "L", a: "B", items: [{ p: "vaso12", q: 1200 }] });
check("hace falta oreo", { lugar: "L" }, { intent: "pedido", de: "L", a: "B", items: [{ p: "oreo" }] });
check("pedir una caja de frutilla a bodega", { lugar: "L" }, { intent: "pedido", de: "L", a: "B" });
check("llegaron 5 cajas de frutilla", { lugar: "B" }, { intent: "entrada", a: "B", items: [{ p: "frutilla", q: 20 }] });
check("recibimos 4 cajas de chocolate del proveedor", { lugar: "B" }, { intent: "entrada", items: [{ p: "choco_negro", q: 68 }] });
check("ya llegó", { lugar: "L" }, { intent: "recepcion", a: "L" });
check("recibido", { lugar: "L" }, { intent: "recepcion" });
check("deshacer", {}, { intent: "deshacer" });
check("borra lo último", {}, { intent: "deshacer" });
check("quita lo último", {}, { intent: "deshacer" });
check("sí", {}, { intent: "si" });
check("no cancela", {}, { intent: "no" });
check("vendí dos reex grandes", {}, { intent: "venta", items: [{ venta: "reex|B", n: 2 }] });
check("venta de una godzilla", {}, { intent: "venta", items: [{ venta: "godzilla|U", n: 1 }] });
check("vendí una reexita", {}, { intent: "venta", items: [{ venta: "chill|M", n: 1 }] });
check("quitar cinco kilos de frutilla", {}, { items: [{ p: "frutilla", q: 5 }], listo: true });
check("quitar 2 cajas de algo raro", {}, { issue: "producto_desconocido", listo: false });
check("blablabla", {}, { intent: "desconocido", listo: false });
check("quitar frutilla", {}, { intent: "traslado", items: [{ p: "frutilla" }] }); // V5: sin cantidad se propone cuánto
check("quitar 2 kilos de vasos grandes", {}, { issue: "unidad_rara", listo: false });
check("quitar dos de frutilla", {}, { issue: "unidad_supuesta", items: [{ p: "frutilla", q: 22.68 }] });
check("mandar 2 cajas de crema chantilly", {}, { items: [{ p: "chantilly" }] });
check("mandar 2 recipientes de crema", { lugar: "L" }, { intent: "traslado", issue: "falta_cantidad", listo: false }); // V5: los recipientes se pesan
check("Quitar dos cajas de frutilla.", {}, { intent: "traslado", items: [{ p: "frutilla", q: 8 }] });
check("QUITAR DOS CAJAS DE FRUTILLA", {}, { intent: "traslado", items: [{ p: "frutilla", q: 8 }] });
check("ok quitar dos cajas de frutilla", {}, { intent: "traslado", items: [{ p: "frutilla", q: 8 }] });
check("quitar doce cajas de frutilla", {}, { items: [{ p: "frutilla", q: 48 }] });
check("quitar una cubeta de huevos", {}, { items: [{ p: "huevos", q: 30 }] });
check("quitar media docena de huevos", {}, { items: [{ p: "huevos", q: 6 }] });
check("quitar 2 sacos de mani", {}, { items: [{ p: "mani", q: 22.68 }] });

// Alternativas del dictado: elige la mejor
const best = V.interpretarMejor([{ t: "quitar dos casas de frutilla", c: 0.7 }, { t: "quitar dos cajas de frutilla", c: 0.6 }], { lugar: "B" });
if (best.items[0] && best.items[0].q === 8 && best.listo) ok++; else { bad++; console.log("✗ interpretarMejor", JSON.stringify(best.items), best.issues); }

// ---------- V3: habla natural, como se habla a la carrera ----------
const F8 = [{ p: "frutilla", q: 8 }];
check("eh van dos cajas de frutilla para el local", { lugar: "B" }, { intent: "traslado", de: "B", a: "L", listo: true, minConf: 0.85, items: F8 });
check("o sea mándale dos cajas de frutilla al local", { lugar: "B" }, { intent: "traslado", de: "B", a: "L", minConf: 0.85, items: F8 });
check("digamos que salen dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", minConf: 0.85, items: F8 });
check("eh, prácticamente, quitar dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", minConf: 0.85, items: F8 });
check("va dos cajas de frutilla de bodega", { lugar: "L" }, { intent: "traslado", de: "B", a: "P", items: F8 });
check("va dos cajas de bodega", { lugar: "B" }, { intent: "traslado", issue: "falta_producto", listo: false });
check("ahí te van dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", de: "B", minConf: 0.85, items: F8 });
check("estoy sacando dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", minConf: 0.85, items: F8 });
check("voy a mandar dos cajas de frutilla al local", { lugar: "B" }, { intent: "traslado", a: "L", minConf: 0.85, items: F8 });
check("listo ya salieron dos cajas de frutilla para el local", { lugar: "B" }, { intent: "traslado", a: "L", items: F8 });
check("un pack de vasos grandes al local", { lugar: "B" }, { intent: "traslado", items: [{ p: "vaso12", q: 50 }] });
check("mándales dos cajas de frutilla y un pack de vasos grandes", { lugar: "B" }, { intent: "traslado", minConf: 0.85, items: [{ p: "frutilla", q: 8 }, { p: "vaso12", q: 50 }] });
check("eh quitar dos cajas de frutilla y una de durazno", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla", q: 8 }, { p: "durazno", q: 18 }] });
check("quita una caja de frutilla no perdón dos cajas", { lugar: "B" }, { intent: "traslado", issue: "autocorreccion", items: F8 });
check("manda tres cajas de frutilla mejor dicho dos", { lugar: "B" }, { intent: "traslado", issue: "autocorreccion", items: F8 });
// 1-nov-2026: corregirse entre dos cantidades y cómo se habla de lo que deja el proveedor
check("lleva tres, no, dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", issue: "autocorreccion", items: F8 });
check("lleva tres, digo, dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", issue: "autocorreccion", items: F8 });
check("lleva tres o sea dos cajas de frutilla", { lugar: "B" }, { intent: "traslado", issue: "autocorreccion", items: F8 });
check("lleva dos cajas de frutilla, o sea, al local", { lugar: "B" }, { intent: "traslado", a: "L", items: F8 });
check("el proveedor dejó dos cajas de frutilla", { lugar: "B" }, { intent: "entrada", items: F8 });
check("nos dejaron dos cajas de frutilla", { lugar: "B" }, { intent: "entrada", items: F8 });
check("vino el de la frutilla con dos cajas", { lugar: "B" }, { intent: "entrada", items: F8 });
check("mándame dos cajas de frutilla", { lugar: "L" }, { intent: "pedido", de: "L", a: "P", items: F8 });
check("pásame dos cajas de frutilla", { lugar: "L" }, { intent: "pedido", de: "L", a: "P", items: F8 });
check("necesito que me mandes una lata de durazno", { lugar: "L" }, { intent: "pedido", minConf: 0.85, items: [{ p: "durazno", q: 3 }] });
check("mándame unas tres cajas de frutilla porfa", { lugar: "L" }, { intent: "pedido", items: [{ p: "frutilla", q: 12 }] });
check("se acabó la frutilla", { lugar: "L" }, { intent: "agotado", lugar: "L", items: [{ p: "frutilla" }] });
check("ya no hay frutilla", { lugar: "L" }, { intent: "agotado", items: [{ p: "frutilla" }] });
check("nos quedamos sin vasos grandes", { lugar: "L" }, { intent: "agotado", items: [{ p: "vaso12" }] });
check("eh se me cayó digamos medio kilo de frutilla", { lugar: "L" }, { intent: "merma", lugar: "L", minConf: 0.85, items: [{ p: "frutilla", q: 0.5 }] });
check("bota medio kilo de frutilla que está dañada", { lugar: "L" }, { intent: "merma", items: [{ p: "frutilla", q: 0.5 }] });
check("se pudrió una mano de banano", { lugar: "L" }, { intent: "merma", items: [{ p: "banano", q: 8 }] });
check("quedan como tres kilos de frutilla", { lugar: "L" }, { intent: "conteo", items: [{ p: "frutilla", q: 3 }] });
check("ya me llegó", { lugar: "L" }, { intent: "recepcion" });
check("ya llegaron las dos cajas", { lugar: "L" }, { intent: "recepcion" });
check("listo llegó todo completo", { lugar: "L" }, { intent: "recepcion" });
check("me trajeron seis cajas de frutilla", { lugar: "B" }, { intent: "entrada", items: [{ p: "frutilla", q: 24 }] });
check("vendí dos reex medianos y un big", { lugar: "L" }, { intent: "venta" });
check("ok ya", { lugar: "L" }, { intent: "si" });
check("eh sí", { lugar: "L" }, { intent: "si" });
check("no no espera", { lugar: "L" }, { intent: "no" });
check("eh este mmm", { lugar: "B" }, { intent: "vacio" });
const v2 = V.interpretar("vendí dos reex medianos y un big", { lugar: "L" });
if (v2.items.length === 2 && v2.items[1].venta === "reex|B") ok++; else { bad++; console.log("✗ venta con «y un big»", JSON.stringify(v2.items)); }

// ---------- V5: varias cosas en una orden, «todo», categorías, sí/no ----------
check("mueve frutilla, banano y crema", { lugar: "B" }, { intent: "traslado", de: "B", a: "P", items: [{ p: "frutilla" }, { p: "banano" }, { p: "crema_reex" }] });
check("lleva frutilla banano y crema al local", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla" }, { p: "banano" }, { p: "crema_reex" }] });
check("muéveme todo lo de frutilla, banano y crema", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla", todo: true }, { p: "banano", todo: true }, { p: "crema_reex", todo: true }] });
check("muéveme cinco kilos de frutilla, un racimo de banano y tres kilos de crema", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla", q: 5 }, { p: "banano", q: 20 }, { p: "crema_reex", q: 3 }] });
check("mándale dos kilos de oreo, uno de grageas y medio de maní", { lugar: "B" }, { intent: "traslado", items: [{ p: "oreo", q: 2 }, { p: "grageas", q: 1 }, { p: "mani", q: 0.5 }] });
check("llévate dos paquetes de vasos grandes, dos de pequeños y tres tarros de la godzilla", { lugar: "B" }, { intent: "traslado", items: [{ p: "vaso12", q: 100 }, { p: "vaso9", q: 100 }, { p: "tarro_godzilla", q: 3 }] });
check("lleva una olla de chocolate y cuatro kilos de crema al local", { lugar: "B" }, { intent: "traslado", items: [{ p: "choco_derretido", q: 2 }, { p: "crema_reex", q: 4 }] });
check("mueve dos libras de frutilla", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla", q: 0.907 }] });
check("lleva dos leches condensadas al local", { lugar: "B" }, { intent: "traslado", items: [{ p: "condensada" }] });
check("calentar una olla de chocolate", { lugar: "B" }, { intent: "produccion", items: [{ p: "choco_derretido", tandas: 1 }] });
check("llegaron cinco cajas de chocolate del proveedor", { lugar: "B" }, { intent: "entrada", items: [{ p: "choco_negro", q: 85 }] });
check("lleva dos recipientes de crema", { lugar: "B" }, { intent: "traslado", issue: "falta_cantidad", listo: false });
check("mándame frutilla, crema y una olla de chocolate", { lugar: "L" }, { intent: "pedido", items: [{ p: "frutilla" }, { p: "crema_reex" }, { p: "choco_derretido", q: 2 }] });
check("devuelve todo lo de frutilla", { lugar: "L" }, { intent: "traslado", de: "L", a: "P", items: [{ p: "frutilla", todo: true }] });
check("quitar 2 cajas de algo raro", {}, { issue: "producto_desconocido", listo: false });
check("sí, por favor", { lugar: "L" }, { intent: "si" });
check("sí, dale", { lugar: "L" }, { intent: "si" });
check("si porfa", { lugar: "B" }, { intent: "si" });
check("no, gracias", { lugar: "L" }, { intent: "no" });
check("mejor no", { lugar: "L" }, { intent: "no" });
const tops = V.interpretar("muéveme los toppings", { lugar: "B" });
if (tops.intent === "traslado" && tops.items.length === 7 && tops.items.every(i => i.deCategoria === "top")) ok++; else { bad++; console.log("✗ «muéveme los toppings»", tops.intent, tops.items.map(i => i.p)); }

// V5: grupo de la chili dentro de una lista
check("lleva lo de la chili al local", { lugar: "B" }, { intent: "traslado", de: "B", a: "L", items: [{ p: "tajin" }, { p: "chamoy" }, { p: "gusanitos" }] });
check("manda lo de la chili y vasos pequeños", { lugar: "B" }, { intent: "traslado", items: [{ p: "tajin" }, { p: "chamoy" }, { p: "gusanitos" }, { p: "vaso9" }] });
check("lleva frutilla y los toppings", { lugar: "B" }, { intent: "traslado", items: [{ p: "frutilla" }, { p: "oreo" }, { p: "grageas" }, { p: "masmelos" }, { p: "coco" }, { p: "mani" }, { p: "nuez" }, { p: "granola" }] });

// V6: respuestas cortas («de una», «hágale», «ajá») y abrir/cerrar caja por voz
check("de una", { lugar: "B" }, { intent: "si" });
check("hágale", { lugar: "B" }, { intent: "si" });
check("ajá", { lugar: "B" }, { intent: "si" });
check("nel", { lugar: "B" }, { intent: "no" });
check("abre la caja con veinte dólares", { lugar: "B" }, { intent: "abrir_caja" });
check("cierra la caja", { lugar: "B" }, { intent: "cerrar_caja" });
check("preparamos cinco kilos de crema", { lugar: "B" }, { intent: "produccion", items: [{ p: "crema_reex" }] });
check("procesamos cinco kilos de frutilla", { lugar: "B" }, { intent: "entrada", items: [{ p: "frutilla" }] });

// V6: lo que se cuenta cuando llega un envío (cantidad que llegó y novedad)
{
  const D = [{ p: "durazno", q: 6, emp: "lata" }], F = [{ p: "frutilla", q: 8, emp: "caja" }, { p: "banano", q: 8, emp: "mano" }], F1 = [{ p: "frutilla", q: 16, emp: "caja" }];
  const casos = [
    [D, "llegó una lata de durazno abierta y las demás todavía", { durazno: 3 }, true], [D, "llegó una lata de durazno abierta y las demás bien", { durazno: 6 }, true],
    [D, "llegaron las dos latas pero una está abierta", { durazno: 6 }, true], [D, "una lata llegó abierta", { durazno: 6 }, true],
    [D, "llegó solo una lata", { durazno: 3 }, false], [D, "faltó una lata", { durazno: 3 }, false], [D, "no llegó nada", { durazno: 0 }, false],
    [D, "llegó todo pero una lata golpeada", { durazno: 6 }, true], [D, "vino una lata abollada", { durazno: 6 }, true], [D, "llegó una sola lata y estaba abierta", { durazno: 3 }, true],
    [D, "las dos latas llegaron bien", { durazno: 6 }, false], [D, "solo vino una", { durazno: 3 }, false], [D, "llegó una nomás, la otra todavía", { durazno: 3 }, false],
    [F, "llegó una caja de frutilla de las dos", { frutilla: 4, banano: 8 }, false], [F, "no llegó el banano", { frutilla: 8, banano: 0 }, false],
    [F, "la frutilla llegó aplastada", { frutilla: 8, banano: 8 }, true], [F, "llegaron dos cajas de frutilla y el banano no", { frutilla: 8, banano: 0 }, false],
    [F, "falta una caja de frutilla", { frutilla: 4, banano: 8 }, false], [F, "la frutilla bien pero el banano llegó golpeado", { frutilla: 8, banano: 8 }, true],
    [F, "el banano llegó machucado y la frutilla completa", { frutilla: 8, banano: 8 }, true], [F, "llegó solo la frutilla", { frutilla: 8, banano: 0 }, false],
    [F, "no vino la frutilla", { frutilla: 0, banano: 8 }, false], [F1, "llegaron 3 de 4 cajas", { frutilla: 12 }, false], [F1, "llegaron tres cajas, una mojada", { frutilla: 12 }, true],
    [F1, "llegaron las cuatro cajas pero una venía aplastada", { frutilla: 16 }, true], [F1, "faltaron dos cajas", { frutilla: 8 }, false],
    [F1, "una caja llegó con hongos", { frutilla: 16 }, true], [F1, "llegaron dos cajas nomás", { frutilla: 8 }, false], [F1, "llegaron solo tres cajas y una estaba golpeada", { frutilla: 12 }, true]
  ];
  casos.forEach(([items, frase, esperado, conObs]) => {
    const r = V.analizarLlegada(frase, items, { lugar: "L" });
    const bien = Object.keys(esperado).every(p => Math.abs((r.cant[p] == null ? -1 : r.cant[p]) - esperado[p]) < 1e-6) && !!r.obs === conObs && r.entendido;
    if (bien) ok++; else { bad++; console.log("✗ llegada «" + frase + "»", JSON.stringify(r.cant), "novedad:", !!r.obs, "esperaba", JSON.stringify(esperado), conObs); }
  });
}
// V7: productos del conteo real de bodega
check("lleva un paquete de fundas delivery pequeñas al local", { lugar: "B" }, { items: [{ p: "funda_deliv_peq", q: 2000 }] });
check("manda dos paquetes de fundas delivery medianas", {}, { items: [{ p: "funda_deliv_med", q: 2400 }] });
check("manda 5 fundas godzilla", {}, { items: [{ p: "funda_delivery", q: 5 }] });
check("lleva dos paquetes de fundas para tenedores", {}, { items: [{ p: "funda_tenedor", q: 1000 }] });
check("manda un paquete de fundas de basura grandes", {}, { items: [{ p: "funda_basura_g", q: 10 }] });
check("lleva un paquete de fundas de basura", {}, { items: [{ p: "funda_basura_p", q: 10 }] });
check("lleva un paquete de tenedores blancos", {}, { items: [{ p: "tenedor_blanco", q: 50 }] });
check("pasa 20 domos mini godzilla", {}, { items: [{ p: "domo_mini", q: 20 }] });
check("manda una caja de cloro al local", {}, { items: [{ p: "cloro", q: 3 }] });
check("manda dos rollos de impresora", {}, { items: [{ p: "rollo_impresora", q: 2 }] });
check("lleva 3 rollos de masking", {}, { items: [{ p: "masking", q: 3 }] });
check("lleva un canasto de mora", {}, { items: [{ p: "mora", q: 4.536 }] });
check("lleva un paquete de vasos de 10 onzas", {}, { items: [{ p: "vaso9", q: 50 }] });
check("lleva una fundita de masmelos", {}, { items: [{ p: "masmelos", q: 0.015 }] });
check("lleva un bulto de oreo", {}, { items: [{ p: "oreo", q: 15 }] });
check("lleva dos latas de leche condensada", {}, { items: [{ p: "condensada", q: 2 }] });
check("manda un balde de frutilla", {}, { items: [{ p: "frutilla", q: 11.34 }] });

// V7 · tres lugares: bodega → producción → local
check("lleva dos cajas de leche a producción", { lugar: "B" }, { intent: "traslado", de: "B", a: "P", items: [{ p: "leche", q: 24 }] });
check("manda una caja de chocolate", { lugar: "B" }, { intent: "traslado", de: "B", a: "P", items: [{ p: "choco_negro", q: 17 }] });
check("manda una caja de vasos pequeños", { lugar: "B" }, { intent: "traslado", de: "B", a: "L", items: [{ p: "vaso9", q: 600 }] });
check("manda cuatro kilos de crema al local", { lugar: "P" }, { intent: "traslado", de: "P", a: "L", items: [{ p: "crema_reex", q: 4 }] });
check("manda una olla de chocolate", { lugar: "P" }, { intent: "traslado", de: "P", a: "L", items: [{ p: "choco_derretido", q: 2 }] });
check("lleva tres kilos de frutilla picada", { lugar: "P" }, { intent: "traslado", de: "P", a: "L", items: [{ p: "frutilla", q: 3 }] });
check("preparar dos tandas de crema", { lugar: "P" }, { intent: "produccion", lugar: "P" });
check("preparar dos tandas de crema", { lugar: "B" }, { intent: "produccion", lugar: "P" });
check("necesito dos kilos de crema", { lugar: "L" }, { intent: "pedido", de: "L", a: "P" });
check("necesito un paquete de vasos grandes", { lugar: "L" }, { intent: "pedido", de: "L", a: "B" });
check("necesito una caja de leche", { lugar: "P" }, { intent: "pedido", de: "P", a: "B" });
check("mándame una caja de chocolate de la bodega", { lugar: "P" }, { intent: "pedido", de: "P", a: "B" });
check("lleva dos galones de cloro a producción", { lugar: "B" }, { intent: "traslado", de: "B", a: "P" });
check("hay tres kilos de crema en producción", { lugar: "L" }, { intent: "conteo", lugar: "P" });
check("sin mover", { lugar: "B" }, { intent: "si" });
check("sí mover", { lugar: "B" }, { intent: "si" });
check("sin novedad", { lugar: "L" }, { intent: "si" });
check("mándalo", { lugar: "B" }, { intent: "si" });

// respuestas a la pregunta abierta, dichas de muchas maneras (y como las escribe mal el dictado)
const SI_FRASES = ["sí", "si", "c", "ci", "sí señor", "sí, mándalo", "simón", "sip", "sí claro", "claro", "claro que sí", "por supuesto", "correcto", "afirmativo", "exacto", "ya", "listo", "dale", "de una", "hágale", "ok", "okey", "vale", "bueno", "está bien", "ta bien", "perfecto", "eso es", "así es", "confirmo", "adelante", "procede", "hazlo", "sí, por favor", "obvio", "sí, regístralo", "sí mover", "sin mover", "sí muévelo", "sí llévalo", "ajá", "sí sí", "seguro", "sin problema", "sin novedad", "todo bien", "dale nomás", "ya, dale", "listo, mándalo", "despáchalo", "mándale", "ándale", "ya pues", "así mismo", "sí, muevan", "sí, despacha", "de ley", "yes"];
const NO_FRASES = ["no", "nop", "nel", "no gracias", "mejor no", "cancela", "olvídalo", "déjalo", "espera", "todavía no", "aún no", "no, no", "negativo", "detente", "alto", "anula", "borra eso", "no, cancela", "ninguno", "no quiero", "stop"];
SI_FRASES.forEach(f => { const r = V.siNo(f); if (r && r.r === "si" && r.limpio) ok++; else { bad++; console.log("✗ siNo(" + JSON.stringify(f) + ") debería ser «sí» limpio →", JSON.stringify(r)); } });
NO_FRASES.forEach(f => { const r = V.siNo(f); if (r && r.r === "no") ok++; else { bad++; console.log("✗ siNo(" + JSON.stringify(f) + ") debería ser «no» →", JSON.stringify(r)); } });
// lo que no es respuesta sigue siendo orden
[["ya llegó", "recepcion"], ["recibido", "recepcion"], ["no, mejor tres cajas de frutilla", "traslado"], ["despacha dos cajas de frutilla", "traslado"]].forEach(([f, intent]) => { const R = V.interpretar(f, { lugar: f === "despacha dos cajas de frutilla" || f.startsWith("no,") ? "B" : "L" }); if (R.intent === intent) ok++; else { bad++; console.log("✗", f, "→", R.intent, "esperaba", intent); } });

// 7.1: producción le pide a la bodega (de muchas formas) y despachar pedidos por voz
check("pídele a la bodega tres cajas de frutilla", { lugar: "P" }, { intent: "pedido", de: "P", a: "B", items: [{ p: "frutilla", q: 12 }] });
check("solicita a bodega dos fundas de chantilly", { lugar: "P" }, { intent: "pedido", de: "P", a: "B" });
check("hazle un pedido a la bodega de dos latas de durazno", { lugar: "P" }, { intent: "pedido", de: "P", a: "B" });
check("que me traigan de bodega una caja de leche", { lugar: "P" }, { intent: "pedido", de: "P", a: "B" });
check("bodega mándanos dos cajas de frutilla", { lugar: "P" }, { intent: "pedido", de: "P", a: "B" });
check("despacha el pedido", { lugar: "B" }, { intent: "despachar_pedido" });
check("atiende el pedido de producción", { lugar: "B" }, { intent: "despachar_pedido", pedidoDe: "P" });
check("despacha lo que pidió el local", { lugar: "P" }, { intent: "despachar_pedido", pedidoDe: "L" });
check("manda el pedido del local", { lugar: "B" }, { intent: "despachar_pedido", pedidoDe: "L" });
check("despachar", { lugar: "B" }, { intent: "despachar_pedido" });
check("despacha dos cajas de frutilla al local", { lugar: "B" }, { intent: "traslado", a: "L" });
check("haz un pedido de crema", { lugar: "L" }, { intent: "pedido" });
const SI_71 = ["sí, verdad", "sí, mover de una", "hagámoslo", "está bien", "claro, de una", "sí, claro", "correcto", "mueve de una", "dale, hagámoslo", "sí, despáchalo", "vamos", "sale pues", "obvio que sí", "sí, está correcto", "es correcto", "chévere", "eso mismo", "con gusto", "sí, adelante"];
const NO_71 = ["no mover", "no lo muevas", "no lo mandes", "más tarde", "ahorita no", "no por ahora", "me equivoqué", "está mal", "no es eso", "después", "luego", "error", "no despaches"];
SI_71.forEach(f => { const r = V.siNo(f); if (r && r.r === "si" && r.limpio) ok++; else { bad++; console.log("✗ 7.1 siNo(" + JSON.stringify(f) + ") debería ser «sí» limpio →", JSON.stringify(r)); } });
NO_71.forEach(f => { const r = V.siNo(f); if (r && r.r === "no") ok++; else { bad++; console.log("✗ 7.1 siNo(" + JSON.stringify(f) + ") debería ser «no» →", JSON.stringify(r)); } });
// frases aprendidas en el uso
V.ponerAprendido({ si: ["a la orden"], no: ["ni de broma"] });
[["a la orden", "si"], ["A la orden.", "si"], ["ni de broma", "no"]].forEach(([f, r]) => { const x = V.siNo(f); if (x && x.r === r && x.limpio) ok++; else { bad++; console.log("✗ aprendido", f, JSON.stringify(x)); } });
// Video 1405 (prueba de Codex): una frase mal oída no puede volverse «no» por aprendizaje antiguo o compartido.
const limpio=V.ponerAprendido({ si: ["a la orden", "ayúdame"], no: ["ayuda de rodilla", "ni de broma", "a la orden"] });
for(const f of ["ayuda de rodilla", "ayúdame", "ayúdame con un movimiento", "dos baldes de frutilla", "a la orden"]){
  const r=V.siNo(f);
  if(!r || !r.aprendido) ok++;
  else { bad++; console.log('✗ aprendizaje inseguro',f,JSON.stringify(r)); }
}
if(!limpio.no.includes('ayuda de rodilla')&&!limpio.si.includes('ayúdame')&&limpio.no.includes('ni de broma')) ok++; else { bad++; console.log('✗ depuración',limpio); }
// Video 1406: un nombre aprendido como sí/no se olvida al cargar (y las frases del equipo se quedan)
{ const r=V.ponerAprendido({ si:["Saúl","sale pues","de ley","entendí ayuda de rodilla"], no:["Marcela","María José","ni de broma","Kevin"] }, ["Saúl","Marcela","Tobías"]);
  const esp={si:["sale pues","de ley"],no:["ni de broma"]};
  if (JSON.stringify(r)===JSON.stringify(esp)) ok++; else { bad++; console.log("✗ nombres aprendidos", JSON.stringify(r)); }
  for (const f of ["Saúl","Marcela","María José","Kevin"]) { const x=V.siNo(f); if(!x) ok++; else { bad++; console.log("✗ nombre como sí/no", f, JSON.stringify(x)); } }
  for (const [f,e] of [["sale pues","si"],["de ley","si"],["ni de broma","no"]]) { const x=V.siNo(f); if(x&&x.r===e) ok++; else { bad++; console.log("✗ frase del equipo", f, JSON.stringify(x)); } }
}
V.ponerAprendido(null);

console.log(`\n${ok} bien, ${bad} mal`);
process.exit(bad ? 1 : 0);
