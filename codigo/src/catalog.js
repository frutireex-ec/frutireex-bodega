/* Frutireex · Prototipo bodega V7 — Catálogo, recetas, supuestos e inventario real de bodega.
   Fuentes: INVENTARIO REEX.xlsx (2026), CONTABILIDAD REEX.xlsx (proveedores y compras),
   FRUTILLINAS.xlsx, menu .pdf (enero 2026), Manual Operativo Frutireex.
   Todo valor marcado con s:1 es un SUPUESTO que hay que confirmar con el equipo. */
(function (root) {
  "use strict";

  // Lugares
  const LUGARES = {
    B: { id: "B", nombre: "Bodega", corto: "bodega", art: "la bodega", de: "de la bodega", a: "a la bodega", en: "en la bodega" },
    P: { id: "P", nombre: "Producción", corto: "producción", art: "producción", de: "de producción", a: "a producción", en: "en producción" },
    L: { id: "L", nombre: "Local", corto: "local", art: "el local", de: "del local", a: "al local", en: "en el local" }
  };
  // Orden del recorrido: la materia prima sale de la bodega, se prepara en producción y se vende en el local
  const ORDEN_LUGARES = ["B", "P", "L"];

  // Categorías (orden de visualización)
  const CATS = [
    ["fruta", "Fruta"],
    ["base", "Crema y bases"],
    ["prep", "Preparados en producción"],
    ["choco", "Chocolate"],
    ["top", "Toppings"],
    ["chill", "Reexita Chill"],
    ["desc", "Desechables"],
    ["limpieza", "Limpieza y suministros"]
  ];

  /* Producto:
     id, n (nombre), cat, u (unidad base: kg | L | u), e (empaques [nombre, cuánto trae en unidad base]),
     c (costo por unidad base, USD), min {B, L} (mínimo en unidad base), per (días que dura si es perecible),
     prov (proveedor), dem (días de demora del proveedor), comp (empaque en que se compra),
     sin (otras formas de llamarlo), s (1 = dato supuesto por confirmar),
     en (dónde se guarda: B bodega, L local; si no se dice, en los dos),
     hecho (dónde se prepara), verL (en el local se cuenta en kilos, no en cajas) */
  const PRODUCTOS = [
    // ---------- Fruta ----------
    { id: "frutilla", n: "Frutilla", cat: "fruta", u: "kg", e: [["balde", 11.34], ["caja", 4], ["funda", 1]], c: 2.25, verL: 1,
      min: { B: 0, L: 3 }, per: 3, prov: "Productor de Guayllabamba", dem: 1, comp: "balde", diario: 1,
      sin: ["fresa", "fresas", "frutillas", "frutiya", "frutiyas", "fruti", "frutilla picada", "fresita", "fresitas"], s: 1 },
    { id: "durazno", n: "Durazno en almíbar", f: "durazno", cat: "fruta", u: "kg", e: [["caja", 18], ["lata", 3]], c: 2.28, verL: 1,
      min: { B: 6, L: 1.5 }, per: 4, prov: "Facundo", dem: 7, comp: "lata",
      sin: ["durazno", "duraznos", "durasno", "durasnos", "melocoton", "melocotones", "durazno en almibar"] },
    { id: "banano", n: "Banano", cat: "fruta", u: "u", e: [["racimo", 20], ["mano", 8]], c: 0.10,
      min: { B: 0, L: 10 }, per: 4, prov: "Mercado de Guayllabamba", dem: 1, comp: "caja", diario: 1,
      sin: ["banano", "bananos", "platano", "platanos", "plátano", "plátanos", "guineo", "guineos", "banana", "bananas"], s: 1 },
    { id: "mora", n: "Mora", cat: "fruta", u: "kg", e: [["canasto", 4.536]], c: 0, verL: 1,
      min: { B: 0, L: 0 }, per: 5, prov: "", dem: 2, comp: "canasto", s: 1,
      sin: ["mora", "moras", "canasto de mora", "canastos de mora"] },

    // ---------- Crema y bases ----------
    { id: "chantilly", n: "Crema chantilly", f: "chantilly", cat: "base", u: "kg", e: [["unidad", 1], ["funda", 1]], c: 3.60,
      min: { B: 5, L: 0 }, en: ["B"], per: 10, prov: "Ludafa", dem: 7, comp: "funda",
      sin: ["chantilly", "chantili", "chantilli", "chanti", "crema chantilly", "crema para batir", "crema de batir", "chantillí"] },
    { id: "leche", n: "Leche", cat: "base", u: "L", e: [["caja", 12], ["funda", 1], ["litro", 1]], c: 0.79,
      min: { B: 24, L: 0 }, en: ["B"], per: 5, prov: "Distribuidor de lácteos", dem: 2, comp: "caja",
      sin: ["leche", "leches", "leche entera"] },
    { id: "leche_polvo", n: "Leche en polvo", cat: "base", u: "kg", e: [["funda", 1]], c: 8.65,
      min: { B: 2, L: 0 }, en: ["B"], prov: "Insudheco", dem: 3, comp: "funda",
      sin: ["leche en polvo", "leche polvo", "polvo de leche"] },
    { id: "condensada", n: "Leche condensada", cat: "base", u: "kg", e: [["caja", 12], ["lata", 1], ["funda", 1]], c: 3.90,
      min: { B: 6, L: 0 }, en: ["B"], prov: "Dimconfrut", dem: 7, comp: "caja",
      sin: ["leche condensada", "condensada", "lechera"] },
    { id: "azucar_imp", n: "Azúcar impalpable", cat: "base", u: "kg", e: [["funda", 5], ["bolsa", 1]], c: 2.41,
      min: { B: 5, L: 0 }, en: ["B"], prov: "Granel Market", dem: 2, comp: "funda",
      sin: ["azucar impalpable", "impalpable", "azucar glass", "azucar en polvo", "azucar flor"] },
    { id: "azucar", n: "Azúcar blanca", cat: "base", u: "kg", e: [["funda", 1], ["quintal", 45.36]], c: 1.32,
      min: { B: 4, L: 0 }, en: ["B"], prov: "Tienda de Guayllabamba", dem: 1, comp: "funda",
      sin: ["azucar", "azucar blanca", "azucar normal"], s: 1 },
    { id: "vainilla", n: "Esencia de vainilla", cat: "base", u: "L", e: [["frasco", 0.5]], c: 6.30,
      min: { B: 1, L: 0 }, en: ["B"], prov: "Insudheco", dem: 3, comp: "frasco",
      sin: ["vainilla", "esencia", "esencia de vainilla"] },
    { id: "huevos", n: "Huevos", cat: "base", u: "u", e: [["cubeta", 30]], c: 0.13,
      min: { B: 30, L: 0 }, en: ["B"], per: 15, prov: "Tienda de Guayllabamba", dem: 1, comp: "cubeta",
      sin: ["huevo", "huevos", "cubeta de huevos"], s: 1 },

    // ---------- Preparados en la bodega (van al local en recipientes y ollas) ----------
    { id: "crema_reex", n: "Crema Reex", f: "crema Reex", cat: "prep", u: "kg", e: [], c: 0, prep: 1, hecho: "P", verL: 1,
      min: { B: 2, L: 1 }, per: 2, sin: ["crema reex", "crema", "la crema", "crema de la casa", "crema rex"] },
    { id: "choco_derretido", n: "Chocolate derretido", f: "chocolate", cat: "prep", u: "kg", e: [["olla", 2]], c: 0, prep: 1, hecho: "P", compraComo: "choco_negro",
      min: { B: 0, L: 1 }, per: 1, s: 1, sin: ["chocolate", "chocolate derretido", "chocolate caliente", "olla de chocolate", "ollas de chocolate", "choco", "chocolate de la olla"] },
    { id: "dulce_fresa", n: "Dulce de fresa", cat: "prep", u: "kg", e: [["frasco", 1]], c: 0, prep: 1, hecho: "P",
      min: { B: 0, L: 0.5 }, per: 4, sin: ["dulce de fresa", "dulce", "almibar de fresa", "salsa de fresa", "mermelada"] },

    // ---------- Chocolate ----------
    { id: "choco_negro", n: "Cobertura de chocolate", f: "cobertura", cat: "choco", u: "kg", e: [["caja", 17]], c: 4.96,
      min: { B: 6, L: 0 }, prov: "Eduexpress", dem: 7, comp: "caja", en: ["B"],
      sin: ["cobertura", "cobertura de chocolate", "chocolate negro", "coberchoc", "chocolate de cobertura", "chocolate semiamargo", "chocolate en barra", "barra de chocolate", "cajas de chocolate"] },
    { id: "choco_blanco", n: "Chocolate blanco", cat: "choco", u: "kg", e: [["caja", 10], ["funda", 1]], c: 4.82,
      min: { B: 3, L: 0.5 }, prov: "Eduexpress", dem: 7, comp: "caja", top: 12,
      sin: ["chocolate blanco", "gotas blancas", "gotitas blancas", "chocolate blanco en gotas", "blanco"] },

    // ---------- Toppings (la barra tiene 8) ----------
    { id: "oreo", n: "Oreo triturada", f: "Oreo", cat: "top", u: "kg", e: [["bulto", 15], ["saco", 15], ["funda", 1]], c: 8.67,
      min: { B: 3, L: 0.5 }, prov: "Insudheco", dem: 3, comp: "funda", top: 30,
      sin: ["oreo", "oreos", "galleta oreo", "galleta", "o rey o", "oreó"] },
    { id: "grageas", n: "Granulado de colores", f: "granulado", cat: "top", u: "kg", e: [["caja", 25], ["funda", 1]], c: 6.68,
      min: { B: 2, L: 0.3 }, prov: "Los Paisa", dem: 1, comp: "funda", top: 15,
      sin: ["grageas", "gragea", "chispas", "chispitas", "sprinkles", "granulado", "granillo", "confites", "chispas de colores"] },
    { id: "masmelos", n: "Mini masmelos", f: "masmelos", cat: "top", u: "kg", e: [["caja", 2.25], ["funda", 0.45], ["paquete", 0.45], ["fundita", 0.015]], c: 10.90,
      min: { B: 1.5, L: 0.25 }, prov: "Colombina", dem: 3, comp: "caja", top: 14,
      sin: ["masmelos", "masmelo", "marshmallows", "malvaviscos", "más melos", "mas melos", "bombones"] },
    { id: "coco", n: "Coco rallado", f: "coco", cat: "top", u: "kg", e: [["bulto", 11.34], ["saco", 11.34], ["funda", 1]], c: 5.76,
      min: { B: 2, L: 0.3 }, prov: "Reinoso", dem: 1, comp: "funda", top: 10,
      sin: ["coco", "coco rallado", "coco rayado"] },
    { id: "mani", n: "Maní picado", f: "maní", cat: "top", u: "kg", e: [["bulto", 11.34], ["saco", 11.34], ["funda", 1]], c: 1.87,
      min: { B: 2, L: 0.3 }, prov: "Insudheco", dem: 3, comp: "funda", top: 8,
      sin: ["mani", "manies", "manis", "mani picado", "cacahuate"] },
    { id: "nuez", n: "Nuez picada", f: "nuez", cat: "top", u: "kg", e: [["caja", 10], ["funda", 1]], c: 7.20,
      min: { B: 1.5, L: 0.25 }, prov: "Insudheco", dem: 3, comp: "funda", top: 6,
      sin: ["nuez", "nueces", "nues", "nuez picada"] },
    { id: "granola", n: "Granola", cat: "top", u: "kg", e: [["funda", 1]], c: 4.60,
      min: { B: 1, L: 0.2 }, prov: "Insudheco", dem: 3, comp: "funda", top: 5,
      sin: ["granola"] },

    // ---------- Reexita Chill ----------
    { id: "tajin", n: "Tajín en polvo", f: "tajín", cat: "chill", u: "kg", e: [["frasco", 0.42]], c: 25.03,
      min: { B: 0.8, L: 0.1 }, prov: "Proglobal", dem: 3, comp: "frasco",
      sin: ["tajin", "ta jin", "tahin", "tajín"] },
    { id: "chamoy", n: "Chamoy líquido", f: "chamoy", cat: "chill", u: "L", e: [["botella", 0.4], ["frasco", 0.4]], c: 12.02,
      min: { B: 1.9, L: 0.2 }, prov: "Proglobal", dem: 3, comp: "frasco",
      sin: ["chamoy", "chamoi", "chamollo", "salsa chamoy"] },
    { id: "gusanitos", n: "Gusanitos de gomita", f: "gusanitos", cat: "chill", u: "kg", e: [["caja", 2.5], ["funda", 0.5], ["fundita", 0.5]], c: 6.34,
      min: { B: 1, L: 0.15 }, prov: "Colombina", dem: 3, comp: "caja",
      sin: ["gusanitos", "gusanito", "gusanos", "gomitas", "gomitas de gusanito", "gusanitos de gomita"] },

    // ---------- Desechables ----------
    { id: "vaso9", n: "Vaso domo 10 oz (Medium)", f: "vasos Medium", cat: "desc", u: "u", e: [["caja", 600], ["paquete", 50]], c: 0.0645,
      min: { B: 600, L: 100 }, prov: "Yanchatipan (Guayllabamba)", dem: 1, comp: "caja",
      sin: ["vaso pequeño", "vasos pequeños", "vaso pequeno", "vasos pequenos", "vaso midium", "vasos midium", "vaso de nueve", "vasos de nueve", "domo 9", "domo nueve", "domo 10", "domo diez", "vaso de diez", "vasos de diez", "vaso de 10 onzas", "vasos de 10 onzas", "vaso medium", "vasos de la medium", "vaso chico", "vasos chicos", "vaso mediano", "vasos medianos", "pequenos", "pequeños", "chicos", "medianos", "de la midium", "de la medium", "vasos medium"] },
    { id: "vaso12", n: "Vaso domo 12 oz (Big)", f: "vasos Big", cat: "desc", u: "u", e: [["caja", 600], ["paquete", 50]], c: 0.0721,
      min: { B: 600, L: 100 }, prov: "Yanchatipan (Guayllabamba)", dem: 1, comp: "caja",
      sin: ["vaso grande", "vasos grandes", "vaso big", "vasos big", "vaso de doce", "vasos de doce", "domo 12", "domo doce", "grandes", "de la big", "vasos de la big"] },
    { id: "tapa", n: "Tapa domo", f: "tapas", cat: "desc", u: "u", e: [["caja", 2400], ["paquete", 50]], c: 0.029,
      min: { B: 600, L: 150 }, prov: "Printopac", dem: 3, comp: "caja",
      sin: ["tapa", "tapas", "tapa domo", "tapas domo"] },
    { id: "bandeja", n: "Domo pastelera grande (Godzilla)", f: "domos Godzilla", cat: "desc", u: "u", e: [["paquete", 10]], c: 0.47,
      min: { B: 20, L: 5 }, prov: "Printopac", dem: 3, comp: "paquete",
      sin: ["bandeja", "bandejas", "domo pastelera", "domos pasteleros", "domo pastelera grande", "domos grandes", "bandeja godzilla", "bandejas godzilla", "domo godzilla", "domos godzilla", "pastelera"] },
    { id: "domo_mini", n: "Domo pastelera pequeña (Mini Godzilla)", f: "domos Mini Godzilla", cat: "desc", u: "u", e: [], c: 0,
      min: { B: 50, L: 10 }, prov: "Printopac", dem: 3, comp: "u", s: 1,
      sin: ["domo pequeño", "domos pequeños", "domo pequeno", "domos pequenos", "domo pastelera pequeña", "domos pasteleros pequeños", "domo mini", "domos mini", "mini godzilla", "domo de la mini godzilla", "domos de la mini godzilla"] },
    { id: "tarro_godzilla", n: "Tarro Godzilla (recipiente grande)", f: "tarros Godzilla", cat: "desc", u: "u", e: [["paquete", 10]], c: 0.85,
      min: { B: 10, L: 3 }, prov: "Printopac", dem: 3, comp: "paquete", s: 1,
      sin: ["tarro", "tarros", "tarro godzilla", "tarros godzilla", "tarro de la godzilla", "tarro grande", "tarros grandes", "envase godzilla", "envases godzilla"] },
    { id: "tenedor", n: "Tenedor de madera", f: "tenedores de madera", cat: "desc", u: "u", e: [["caja", 5000], ["paquete", 100]], c: 0.025,
      min: { B: 500, L: 100 }, prov: "San Francisco", dem: 1, comp: "paquete",
      sin: ["cuchara", "cucharas", "cucharita", "cucharitas", "cuchara de madera", "cucharas de madera", "tenedor", "tenedores", "cubierto", "cubiertos", "tenedor de madera", "tenedores de madera"] },
    { id: "tenedor_blanco", n: "Tenedor blanco", f: "tenedores blancos", cat: "desc", u: "u", e: [["paquete", 50]], c: 0,
      min: { B: 500, L: 100 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["tenedor blanco", "tenedores blancos", "tenedor plastico", "tenedores plasticos", "tenedor de plastico", "tenedores de plastico"] },
    { id: "funda_tenedor", n: "Fundas para tenedores", f: "fundas para tenedores", cat: "desc", u: "u", e: [["paquete", 500]], c: 0,
      min: { B: 500, L: 100 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["funda de tenedor", "fundas de tenedor", "fundas de tenedores", "fundas para tenedores", "funda para tenedor", "pega y despega", "fundas pega y despega"] },
    { id: "servilleta", n: "Servilletas", f: "servilletas", cat: "desc", u: "u", e: [["paquete", 300]], c: 0.0033,
      min: { B: 900, L: 150 }, prov: "San Francisco", dem: 1, comp: "paquete",
      sin: ["servilleta", "servilletas"] },
    { id: "funda_delivery", n: "Funda delivery Godzilla", f: "fundas delivery Godzilla", cat: "desc", u: "u", e: [["paquete", 50]], c: 0.038,
      min: { B: 50, L: 20 }, prov: "San Francisco", dem: 1, comp: "paquete",
      sin: ["funda de delivery", "fundas de delivery", "fundas delivery", "funda delivery", "fundas para llevar", "fundas", "funda godzilla", "fundas godzilla", "fundas de la godzilla", "funda delivery godzilla", "fundas delivery godzilla"] },
    { id: "funda_deliv_peq", n: "Funda delivery pequeña", f: "fundas delivery pequeñas", cat: "desc", u: "u", e: [["paquete", 2000]], c: 0,
      min: { B: 500, L: 100 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["funda delivery pequeña", "fundas delivery pequeñas", "fundas pequeñas", "funda pequeña", "fundas de delivery pequeñas", "fundas delivery pequenas", "fundas pequenas"] },
    { id: "funda_deliv_med", n: "Funda delivery mediana", f: "fundas delivery medianas", cat: "desc", u: "u", e: [["paquete", 1200]], c: 0,
      min: { B: 500, L: 100 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["funda delivery mediana", "fundas delivery medianas", "fundas medianas", "funda mediana", "fundas de delivery medianas"] },

    // ---------- Limpieza y suministros ----------
    { id: "masking", n: "Masking", f: "masking", cat: "limpieza", u: "u", e: [["rollo", 1]], c: 0, min: { B: 10, L: 2 }, prov: "", dem: 1, comp: "rollo", s: 1,
      sin: ["masking", "maskin", "cinta masking", "rollo de masking", "rollos de masking", "cinta"] },
    { id: "rollo_impresora", n: "Rollos de impresora", f: "rollos de impresora", cat: "limpieza", u: "u", e: [["rollo", 1]], c: 0, min: { B: 4, L: 2 }, prov: "", dem: 1, comp: "rollo", s: 1,
      sin: ["impresora", "papel impresora", "rollo de impresora", "rollos de impresora", "papel de impresora", "rollo de papel", "rollos de papel", "papel", "papeles", "papel termico"] },
    { id: "trapos", n: "Trapos de limpieza", f: "trapos", cat: "limpieza", u: "u", e: [["paquete", 5]], c: 0, min: { B: 10, L: 5 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["trapo", "trapos", "trapos de limpieza", "trapo de limpieza", "paño", "paños", "wypall"] },
    { id: "funda_basura_g", n: "Fundas de basura grandes", f: "fundas de basura grandes", cat: "limpieza", u: "u", e: [["paquete", 10]], c: 0, min: { B: 20, L: 10 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["funda de basura grande", "fundas de basura grandes", "fundas industriales", "funda industrial", "fundas de basura industriales"] },
    { id: "funda_basura_p", n: "Fundas de basura pequeñas", f: "fundas de basura pequeñas", cat: "limpieza", u: "u", e: [["paquete", 10]], c: 0, min: { B: 20, L: 10 }, prov: "", dem: 1, comp: "paquete", s: 1,
      sin: ["funda de basura pequeña", "fundas de basura pequeñas", "fundas de basura", "funda de basura", "fundas de basura pequenas"] },
    { id: "cloro", n: "Cloro (galón)", f: "cloro", cat: "limpieza", u: "u", e: [["caja", 3], ["galon", 1]], c: 0, min: { B: 3, L: 1 }, prov: "", dem: 1, comp: "caja", s: 1,
      sin: ["cloro", "cloros", "galon de cloro", "galones de cloro", "clorox", "lejia"] }
  ];

  /* Tres lugares (dato del equipo, 24 oct 2026): Bodega → Producción → Local.
     En producción (un lugar aparte) se hace la crema Reex, el chocolate derretido, el dulce de fresa y se lava y pica la fruta.
     Lo que no se prepara (vasos, tapas, toppings, desechables) va directo de la bodega al local.
     ruta = por dónde pasa el producto, en orden; en = dónde se guarda. */
  const PARA_PRODUCCION = ["chantilly", "leche", "leche_polvo", "condensada", "azucar_imp", "azucar", "vainilla", "huevos", "choco_negro"];
  const FRUTA_PRODUCCION = ["frutilla", "durazno", "banano", "mora"];
  // Mínimos sugeridos en producción (SUPUESTOS para confirmar): lo que conviene tener a mano para preparar
  const MIN_PRODUCCION = { chantilly: 2, leche: 6, condensada: 2, choco_negro: 4, azucar_imp: 2, leche_polvo: 0.5, vainilla: 0.5 };
  PRODUCTOS.forEach(p => {
    if (p.prep) { p.hecho = "P"; p.ruta = ["P", "L"]; p.en = ["P", "L"]; }
    else if (FRUTA_PRODUCCION.includes(p.id)) { p.ruta = ["B", "P", "L"]; p.en = ["B", "P", "L"]; }
    else if (PARA_PRODUCCION.includes(p.id)) { p.ruta = ["B", "P"]; p.en = ["B", "P"]; }
    else if (p.cat === "limpieza") { p.ruta = ["B", "L"]; p.en = ["B", "P", "L"]; }
    else { p.ruta = ["B", "L"]; p.en = ["B", "L"]; }
    p.min = Object.assign({ B: 0, P: 0, L: 0 }, p.min || {});
    p.min.P = MIN_PRODUCCION[p.id] || 0;
    // lo preparado se guarda en producción: su mínimo de "bodega" pasa a ser el de producción
    if (p.prep) { p.min.P = p.min.B || 0; p.min.B = 0; }
  });

  // Menú 2026 (menu .pdf de enero 2026) — precio de venta
  const MENU = [
    { id: "reex", n: "Reex", tam: { M: 3.00, B: 3.50 } },
    { id: "split", n: "Split", tam: { M: 3.00, B: 3.50 } },
    { id: "mix", n: "Mix", tam: { M: 3.50, B: 4.00 } },
    { id: "exotica", n: "Exótica", tam: { M: 4.00, B: 5.00 } },
    { id: "tropical", n: "Tropical", tam: { M: 4.50, B: 5.50 } },
    { id: "chill", n: "Reexita Chill", tam: { M: 3.50 } },
    { id: "godzilla", n: "Godzilla Reex", tam: { U: 25.50 } }
  ];

  /* Recetas por vaso (unidad base del producto: kg, L o u). SUPUESTOS a confirmar con el equipo.
     "toppings" = gramos totales de toppings (se reparte según la popularidad de la barra). */
  const BASE_M = { choco_derretido: 0.028, crema_reex: 0.045, dulce_fresa: 0.012, vaso9: 1, tapa: 1, tenedor: 1, servilleta: 1 };
  const BASE_B = { choco_derretido: 0.040, crema_reex: 0.065, dulce_fresa: 0.018, vaso12: 1, tapa: 1, tenedor: 1, servilleta: 1 };
  const RECETAS = {
    "reex|M":     Object.assign({ frutilla: 0.180, toppings: 0.028 }, BASE_M),
    "reex|B":     Object.assign({ frutilla: 0.280, toppings: 0.040 }, BASE_B),
    "split|M":    Object.assign({ banano: 1.0, toppings: 0.028 }, BASE_M),
    "split|B":    Object.assign({ banano: 1.5, toppings: 0.040 }, BASE_B),
    "mix|M":      Object.assign({ frutilla: 0.090, banano: 0.5, toppings: 0.028 }, BASE_M),
    "mix|B":      Object.assign({ frutilla: 0.140, banano: 0.8, toppings: 0.040 }, BASE_B),
    "exotica|M":  Object.assign({ frutilla: 0.090, durazno: 0.090, toppings: 0.028 }, BASE_M),
    "exotica|B":  Object.assign({ frutilla: 0.140, durazno: 0.140, toppings: 0.040 }, BASE_B),
    "tropical|M": Object.assign({ durazno: 0.180, toppings: 0.028 }, BASE_M),
    "tropical|B": Object.assign({ durazno: 0.280, toppings: 0.040 }, BASE_B),
    "chill|M":    { frutilla: 0.180, chamoy: 0.025, tajin: 0.006, gusanitos: 0.020, vaso9: 1, tapa: 1, tenedor: 1, servilleta: 1 },
    "godzilla|U": { frutilla: 0.600, banano: 2, durazno: 0.300, choco_derretido: 0.200, crema_reex: 0.250, dulce_fresa: 0.050,
                    toppings: 0.125, bandeja: 1, tarro_godzilla: 1, tenedor: 4, servilleta: 4, funda_delivery: 1 }
  };

  /* Preparaciones: se hacen en la bodega y se llevan al local. Rinden "sale" con lo que "usa". SUPUESTOS. */
  const PREPARACIONES = {
    choco_derretido: { n: "Chocolate derretido", tanda: "olla", sale: 2.0, usa: { choco_negro: 2.0 } },
    crema_reex: { n: "Crema Reex", tanda: "tanda", sale: 2.0,
      usa: { chantilly: 1.0, leche: 0.6, leche_polvo: 0.15, azucar_imp: 0.20, condensada: 0.25, vainilla: 0.01 } },
    dulce_fresa: { n: "Dulce de fresa", tanda: "tanda", sale: 1.2,
      usa: { frutilla: 1.0, azucar: 0.6 } }
  };

  // Mezcla de ventas usada por la simulación (participación de cada vaso). SUPUESTO a partir de lo que más se pide.
  const MEZCLA = [
    ["reex|M", 26], ["reex|B", 18], ["mix|M", 8], ["mix|B", 7], ["exotica|M", 6], ["exotica|B", 6],
    ["split|M", 5], ["split|B", 3], ["tropical|M", 4], ["tropical|B", 4], ["chill|M", 7], ["godzilla|U", 1.2]
  ];

  // Tolerancia del cuadre: se acepta esta diferencia sin marcarla como faltante
  const TOLERANCIA = { kg: { pct: 0.04, min: 0.15 }, L: { pct: 0.04, min: 0.1 }, u: { pct: 0.01, min: 2 } };

  const PERSONAS = ["Encargado de bodega", "Encargado de producción", "Ayudante del local", "Supervisor", "Administrador"];

  /* Conteo real de la bodega dictado por el equipo el 23 de octubre de 2026 (unidad base de cada producto).
     La frutilla y el plátano no se guardan: entran y salen el mismo día. */
  const INVENTARIO_BODEGA = {
    fecha: "2026-10-23",
    B: { frutilla: 0, durazno: 144, banano: 0, mora: 0,
      chantilly: 38, leche: 84, leche_polvo: 0.5, condensada: 24, azucar_imp: 20.5, azucar: 0, vainilla: 6.5, huevos: 0,
      crema_reex: 0, choco_derretido: 0, dulce_fresa: 0,
      choco_negro: 323, choco_blanco: 60,
      oreo: 75, grageas: 26, masmelos: 18, coco: 0, mani: 0, nuez: 60, granola: 0,
      tajin: 3.36, chamoy: 4, gusanitos: 7.5,
      vaso9: 2400, vaso12: 2400, tapa: 4800, bandeja: 75, domo_mini: 250, tarro_godzilla: 0,
      tenedor: 5000, tenedor_blanco: 3250, funda_tenedor: 10000, servilleta: 3600,
      funda_delivery: 1050, funda_deliv_peq: 8000, funda_deliv_med: 7200,
      masking: 107, rollo_impresora: 18, trapos: 80, funda_basura_g: 130, funda_basura_p: 150, cloro: 12 },
    P: {}   // producción todavía no se ha contado: empieza vacía y se llena con lo que le manda la bodega
  };
  /* Ritmo de pedido de la fruta que no se guarda (dato del equipo). */
  const PEDIDO_FRUTA = {
    frutilla: "De lunes a viernes entran y salen de 1 a 3 baldes al día; sábado y domingo se piden de 6 a 7 baldes.",
    banano: "Se pide lunes, miércoles o viernes: lunes 1 caja, miércoles 1 caja, viernes 2 a 3 cajas.",
    mora: "Se pide cada 15 días, en canastos de unas 10 libras."
  };

  const API = { LUGARES, ORDEN_LUGARES, CATS, PRODUCTOS, MENU, RECETAS, PREPARACIONES, MEZCLA, TOLERANCIA, PERSONAS, INVENTARIO_BODEGA, PEDIDO_FRUTA };
  root.FRX_CAT = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
