/* Frutireex · Prototipo bodega V5 — Intérprete de comandos de voz en español (Ecuador).
   Entiende frases como "quitar dos cajas de frutilla", "kilo y medio de oreo al local",
   "se dañó medio kilo de durazno", "hay 3 cajas de frutilla", "deshacer".
   Tolera errores típicos del dictado (frutiya, durasno, chantili, o rey o, más melos…). */
(function (root) {
  "use strict";
  const CAT = root.FRX_CAT || (typeof require !== "undefined" ? require("./catalog.js") : null);

  // ---------- normalización ----------
  function sinTildes(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function normalizar(s) {
    let t = sinTildes(String(s || "").toLowerCase()).replace(/ñ/g, "n");
    t = t.replace(/(\d)\s*[,.]\s*(\d)/g, "$1.$2")          // 2,5 → 2.5
         .replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
         .replace(/(\d)(kg|kilos?|g|gr|lb|l|lt|ml|u)\b/g, "$1 $2")
         .replace(/[¿?¡!;:"“”()]/g, " ")
         .replace(/,/g, " , ")
         .replace(/\s+/g, " ").trim();
    return t;
  }
  // Clave fonética simple para tolerar errores de dictado
  function fon(w) {
    let s = sinTildes(w.toLowerCase()).replace(/ñ/g, "n");
    s = s.replace(/ch/g, "#").replace(/ll/g, "y").replace(/qu/g, "k").replace(/c([ei])/g, "s$1").replace(/z/g, "s")
         .replace(/c/g, "k").replace(/v/g, "b").replace(/h/g, "").replace(/x/g, "ks").replace(/w/g, "u").replace(/y$/, "i")
         .replace(/(.)\1+/g, "$1");
    if (s.length > 3) s = s.replace(/s$/, "");
    return s;
  }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  // ---------- números en palabras ----------
  const UNIDADES = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
    veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
    veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
  const DECENAS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
  const CENTENAS = { cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
    cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
    ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900 };
  // errores típicos del dictado con números
  const ALIAS_NUM = { dose: "doce", dós: "dos", tre: "tres", sinco: "cinco", sies: "seis", nuebe: "nueve", dies: "diez", beinte: "veinte" };

  function esNumTok(t) { t = ALIAS_NUM[t] || t; return /^\d+(\.\d+)?$/.test(t) || /^\d+\/\d+$/.test(t) || t in UNIDADES || t in DECENAS || t in CENTENAS || t === "mil" || t === "medio" || t === "media" || t === "par" || t === "docena"; }

  /* Lee un número desde la posición i. Devuelve {v, n} (valor y cuántas palabras ocupó) o null. */
  function numeroEn(T, i) {
    const tk = k => ALIAS_NUM[T[k]] || T[k];
    let t = tk(i); if (t == null) return null;
    if (/^\d+(\.\d+)?$/.test(t)) {
      let v = parseFloat(t), n = 1;
      if (tk(i + 1) === "y" && (tk(i + 2) === "medio" || tk(i + 2) === "media")) { v += 0.5; n += 2; }
      else if (/^\d+\/\d+$/.test(tk(i + 1) || "")) { const [a, b] = tk(i + 1).split("/"); v += a / b; n++; }
      return { v, n };
    }
    if (/^\d+\/\d+$/.test(t)) { const [a, b] = t.split("/"); return { v: a / b, n: 1 }; }
    if (t === "medio" || t === "media") {
      if (tk(i + 1) === "docena") return { v: 6, n: 2 };
      return { v: 0.5, n: 1 };
    }
    if ((t === "un" || t === "una") && tk(i + 1) === "par") return { v: 2, n: 2 };
    if (t === "par") return { v: 2, n: 1 };
    if ((t === "un" || t === "una") && tk(i + 1) === "cuarto") return { v: 0.25, n: 2 };
    if (t === "tres" && tk(i + 1) === "cuartos") return { v: 0.75, n: 2 };
    if ((t === "un" || t === "una") && tk(i + 1) === "docena") return { v: 12, n: 2 };
    if (t === "docena") return { v: 12, n: 1 };
    let v = 0, n = 0, visto = false, k = i;
    if (tk(k) === "mil") { v = 1000; k++; n++; visto = true; }
    else if ((tk(k) in UNIDADES || tk(k) in DECENAS || tk(k) in CENTENAS) && tk(k + 1) === "mil") {
      const a = numeroEn(T.slice(0, k + 1), k); if (a) { v = a.v * 1000; k += 2; n += 2; visto = true; }
    }
    if (tk(k) in CENTENAS) { v += CENTENAS[tk(k)]; k++; n++; visto = true; }
    if (tk(k) in DECENAS) {
      v += DECENAS[tk(k)]; k++; n++; visto = true;
      if (tk(k) === "y" && tk(k + 1) in UNIDADES && UNIDADES[tk(k + 1)] < 10 && UNIDADES[tk(k + 1)] > 0) { v += UNIDADES[tk(k + 1)]; k += 2; n += 2; }
    } else if (tk(k) in UNIDADES) { v += UNIDADES[tk(k)]; k++; n++; visto = true; }
    if (!visto) return null;
    if (tk(k) === "y" && (tk(k + 1) === "medio" || tk(k + 1) === "media")) { v += 0.5; n += 2; }
    else if (tk(k) === "y" && tk(k + 1) === "un" && tk(k + 2) === "cuarto") { v += 0.25; n += 3; }
    return { v, n };
  }

  // ---------- unidades y empaques ----------
  const UNID = {
    kilo: ["kg", 1], kilos: ["kg", 1], kilogramo: ["kg", 1], kilogramos: ["kg", 1], kg: ["kg", 1], kgs: ["kg", 1], quilo: ["kg", 1], quilos: ["kg", 1],
    gramo: ["kg", 0.001], gramos: ["kg", 0.001], gr: ["kg", 0.001], grs: ["kg", 0.001], g: ["kg", 0.001],
    libra: ["kg", 0.45359], libras: ["kg", 0.45359], lb: ["kg", 0.45359], lbs: ["kg", 0.45359],
    litro: ["L", 1], litros: ["L", 1], l: ["L", 1], lt: ["L", 1], lts: ["L", 1],
    mililitro: ["L", 0.001], mililitros: ["L", 0.001], ml: ["L", 0.001],
    unidad: ["u", 1], unidades: ["u", 1], u: ["u", 1], unid: ["u", 1], piezas: ["u", 1],
    kilito: ["kg", 1], kilitos: ["kg", 1], librita: ["kg", 0.45359], libritas: ["kg", 0.45359]
  };
  const EMPAQ = {
    caja: "caja", cajas: "caja", kaja: "caja", kajas: "caja", gaveta: "caja", gavetas: "caja", cajon: "caja", cajones: "caja",
    balde: "balde", baldes: "balde", lata: "lata", latas: "lata", funda: "funda", fundas: "funda", bolsa: "bolsa", bolsas: "bolsa",
    paquete: "paquete", paquetes: "paquete", paq: "paquete", frasco: "frasco", frascos: "frasco", botella: "botella", botellas: "botella",
    cubeta: "cubeta", cubetas: "cubeta", carton: "cubeta", cartones: "cubeta", racimo: "racimo", racimos: "racimo", mano: "mano", manos: "mano",
    recipiente: "recipiente", recipientes: "recipiente", tarrina: "recipiente", tarrinas: "recipiente",
    taper: "recipiente", tapers: "recipiente", saco: "saco", sacos: "saco", costal: "saco", costales: "saco", quintal: "quintal", quintales: "quintal",
    tanda: "tanda", tandas: "tanda", batida: "tanda", batidas: "tanda", olla: "olla", ollas: "olla", ollita: "olla", ollitas: "olla",
    pack: "paquete", packs: "paquete", paca: "paquete", pacas: "paquete", paquetito: "paquete", paquetitos: "paquete",
    cajita: "caja", cajitas: "caja", latita: "lata", latitas: "lata", fundita: "fundita", funditas: "fundita", canasto: "canasto", canastos: "canasto", canastito: "canasto", canastitos: "canasto", bulto: "bulto", bultos: "bulto", galon: "galon", galones: "galon", rollo: "rollo", rollos: "rollo", frasquito: "frasco", frasquitos: "frasco"
  };
  const SINGULAR = new Set(["kilo", "kilogramo", "kg", "quilo", "gramo", "libra", "litro", "mililitro", "unidad", "caja", "kaja", "gaveta", "cajon", "balde", "lata", "funda",
    "bolsa", "paquete", "frasco", "botella", "cubeta", "carton", "racimo", "mano", "recipiente", "tarrina", "taper", "saco", "costal", "quintal", "tanda", "batida", "olla",
    "pack", "paca", "paquetito", "cajita", "latita", "fundita", "frasquito", "kilito", "librita", "ollita", "canasto", "canastito", "bulto", "galon", "rollo"]);
  // si el producto no tiene ese empaque, se prueba con equivalentes
  const EQUIV = { bolsa: ["funda", "paquete"], funda: ["bolsa", "paquete"], paquete: ["funda", "bolsa", "caja"], caja: ["balde", "paquete"], balde: ["caja"],
    frasco: ["botella"], botella: ["frasco"], recipiente: ["frasco", "lata"], saco: ["bulto", "caja"], bulto: ["saco", "caja"], racimo: ["mano"], mano: ["racimo"],
    fundita: ["funda", "paquete"], canasto: ["caja", "balde"], galon: ["unidad"], rollo: ["unidad"] };

  function unidadEn(T, i) {
    const t = T[i]; if (!t) return null;
    if (UNID[t]) return { tipo: "unidad", base: UNID[t][0], f: UNID[t][1], txt: t, sing: SINGULAR.has(t), n: 1 };
    if (EMPAQ[t]) return { tipo: "empaque", emp: EMPAQ[t], txt: t, sing: SINGULAR.has(t), n: 1 };
    return null;
  }

  // ---------- productos ----------
  const STOP = new Set(["de", "del", "la", "el", "los", "las", "al", "a", "para", "pa", "por", "favor", "porfa", "porfavor", "ya", "ahora", "eh", "este", "esta",
    "mmm", "ok", "okay", "bueno", "que", "se", "me", "nos", "le", "les", "lo", "con", "y", "pues", "no", "mas", "nomas", "porfis", "oye", "ahi", "aqui", "otra", "otro", "vez", "tambien",
    "te", "mi", "mis", "tu", "su", "sus", "ese", "esa", "esos", "esas", "eso", "esto", "estos", "como", "algo", "nada", "solo", "solito", "bien", "mal", "igual", "mismo", "misma",
    "hoy", "manana", "tarde", "noche", "porque", "cuando", "donde", "alla", "aca", "hola", "buenas", "buenos", "dias", "senor", "senora", "cosa", "cosas", "producto", "productos",
    "poco", "poquito", "harto", "bastante", "menos", "quiero", "queria", "quisiera", "puedes", "puede", "podrias", "dame", "deme", "denme", "pon", "ponle", "pongan", "tengo", "tienes", "tiene",
    "mandes", "manden", "mande", "mandas", "mandan", "pases", "pasen", "pasas", "traigas", "traes", "traen", "envies", "envien", "envias", "va", "van", "vaya", "vayan", "fue", "fueron", "ir", "voy", "vamos",
    "unos", "unas", "casi", "aproximadamente", "maso", "listo", "dale", "ya", "completo", "completa", "completito", "entero", "entera", "todito", "toditas", "toditos", "estoy", "estamos", "acabo", "acabamos"]);
  const LUGAR_W = /^(la |el )?(bodega|local|produccion|planta|cocina|tienda)\b/;
  // «pon la frutilla en cinco baldes» es un conteo solo si lo de después EMPIEZA con la cantidad (y lo de antes no: «pon ocho latas de durazno en almibar» es un traslado)
  const LLAMADO_INI = /^(?:, ?)?(?:(?:oye|hey|hola|ok|okey|eh|este|bueno|ya|mira|entonces|listo|a ver|por favor|porfa|pues)(?: , | |, | ,))*(?:(?:tio|tia|amigo|amiga|pana|bro|jefe|broder|hermano)(?: , | |, | ,))?(?:rex|rexito|jarvis|yarvis)(?: , | |, | ,|$)/;
  const CANT_INI = /^(\d|(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|medio|media|cero|nada)\b)/;
  const PRE = [
    // «necesito que lleves dos cajas al local», «quiero que muevan…»: es mover, no pedir
    [/\b(necesito|quiero|quisiera|ocupo) que (lleves|lleven|muevas|muevan|mandes|manden|envies|envien|pases|pasen|subas|suban|despaches|despachen|saques|saquen)\b/g, "lleva"],
    [/\b(ayudame|ayudenme|hazme el favor|haz el favor|porfa|por favor) (a |de )?(llevar|llevando|mover|moviendo|mandar|mandando|enviar|enviando|pasar|pasando|subir|subiendo|despachar|despachando)\b/g, "lleva"],
    // «cambia la frutilla a cinco baldes», «corrige la leche a dos cajas», «deja el azúcar en 3 kilos»: es un conteo
    [/^(cambia|cambiar|corrige|corregir|actualiza|actualizar|ajusta|ajustar|deja|dejar|pon|poner)( el| la| los| las)?( stock| inventario| cantidad| conteo)?( de)?( el| la| los| las)? (.+?) (a|en) (.+)$/, (m, v, a1, a2, a3, a4, prod, prep, cant) => LUGAR_W.test(cant) || !CANT_INI.test(cant) || CANT_INI.test(prod) || cant.split(" ").length > 6 ? m : "hay " + cant + " de " + prod],
    [/\b(vasos?|domos?)( de)? (doce|12)( onzas| oz)?\b/g, "vasodoce"],
    [/\b(vasos?|domos?)( de)? (nueve|9|diez|10)( onzas| oz)?\b/g, "vasonueve"],
    [/\b(de )?(doce|12) (onzas|oz)\b/g, "vasodoce"],
    [/\b(de )?(nueve|9|diez|10) (onzas|oz)\b/g, "vasonueve"],
    [/\bfundas? (de )?(delivery|deliveri|delibery) (pequenas?|pequenos?|chicas?|chiquitas?)\b/g, "fundadeliverypequena"],
    [/\bfundas? (de )?(delivery|deliveri|delibery) (medianas?|medianos?)\b/g, "fundadeliverymediana"],
    [/\bfundas? (de )?basura (grandes?|industriales?)\b|\bfundas? industriales?\b/g, "fundabasuragrande"],
    [/\bfundas? (de )?basura( pequenas?| chicas?| pequenos?)?\b/g, "fundabasurapequena"],
    [/\bfundas? (de |para )?(los )?tenedor(es)?\b|\bfundas? pega y despega\b/g, "fundatenedor"],
    [/\bfundas? (de )?(la )?(delivery |deliveri )?godzilla\b|\bfundas? (de )?(delivery|deliveri|delibery)\b/g, "fundagodzilla"],
    [/\bcrema (de|para) batir\b|\bcrema batida\b/g, "chantilly"], [/\bchocolate de la olla\b/g, "chocolate derretido"], [/\bfundas? para llevar\b/g, "fundagodzilla"],
    [/\bo rey o\b/g, "oreo"], [/\bmas melos\b/g, "masmelos"], [/\bta jin\b/g, "tajin"], [/\bchan till?y\b/g, "chantilly"],
    [/\breexita chill\b|\brexita chill\b|\breexita\b|\brexita\b/g, "chill"], [/\bgodzila\b|\bgodzilla rex\b|\bgodzilla reex\b/g, "godzilla"],
    [/\brecipientes? grandes?\b/g, "tarro"], [/\bpor favor\b/g, " "], [/\bok google\b/g, " "]
  ];
  // relleno del habla: se quita antes de entender ("eh, o sea, digamos que van dos cajas…")
  const RELLENO = /\b(o sea|osea|digamos que|digamos|practicamente|justamente|basicamente|literalmente|la verdad|a ver|mira|miren|oye|oigan|entonces|este|e+h+|e+m+|m+|a+h+|aja|ajam|okey|o key|bro|pana|nano|mijo|mija|jefe|jefa|loco|amigo|amiga|amiguito|amiguita|tio|tia|hermano|hermana|hermanito|broder|brother|compa|compadre|socio|panita|chevere|plis|please|porfis|porfa|por favor|gracias|ahorita|rapidito|urgente|de una vez|tipo|mas o menos|aproximadamente|como que|o sea que|fijate|sabes|ve|verás|veras|che)\b/g;
  function quitarRelleno(t) {
    return t.replace(RELLENO, " ")
      .replace(/\b(como|unos|unas|casi|maso) (?=(\d|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|medio|media|kilo|caja|lata))/g, " ")
      .replace(/\bse (me|nos|le|les|te) /g, "se ")
      .replace(/\b(me|nos) (llego|llegaron)\b/g, "$2")
      .replace(/\s+/g, " ").trim();
  }
  const CATEGORIAS = [["top", /^(toppings?|topings?|topins?|topin|tapings?|toping)$/], ["fruta", /^(fruta|frutas)$/], ["desc", /^(desechables?)$/], ["chill", /^(cosas de chill|lo del chill|chill|chilly|chili|chilli|reexita chill|rexita chill|reexita|rexita)$/], ["prep", /^(preparados?)$/]];
  function categoriaDe(txt) {
    const t = limpiarProd(txt), ult = t.split(" ").pop();
    const c = CATEGORIAS.find(([, re]) => re.test(t)) || CATEGORIAS.find(([, re]) => re.test(ult));
    return c ? c[0] : null;
  }
  let INDICE = null, INDICE_DE = null;
  function limpiarProd(s) { return normalizar(s).split(" ").filter(w => w && !STOP.has(w)).join(" "); }
  function indice(cat) {
    if (INDICE && INDICE_DE === cat) return INDICE;
    const out = [];
    (cat ? cat.orden.map(id => cat.prods[id]) : CAT.PRODUCTOS).forEach(p => {
      const nombres = new Set([p.n, p.id.replace(/_/g, " ")].concat(p.sin || []));
      if (p.id === "vaso12") nombres.add("vasodoce");
      if (p.id === "vaso9") nombres.add("vasonueve");
      const juntos = { funda_deliv_peq: "fundadeliverypequena", funda_deliv_med: "fundadeliverymediana", funda_basura_g: "fundabasuragrande",
        funda_basura_p: "fundabasurapequena", funda_tenedor: "fundatenedor", funda_delivery: "fundagodzilla" };
      if (juntos[p.id]) nombres.add(juntos[p.id]);
      nombres.forEach(nm => {
        const c = limpiarProd(nm.replace(/\(.*?\)/g, " "));
        if (c) out.push({ p: p.id, frase: c, fon: c.split(" ").map(fon).join(" "), largo: c.split(" ").length });
      });
    });
    out.sort((a, b) => b.frase.length - a.frase.length);
    INDICE = out; INDICE_DE = cat;
    return out;
  }
  /* Busca el producto en un texto (ya sin cantidades). Devuelve [{p, score}] ordenado. */
  function buscarProducto(texto, cat) {
    const t = limpiarProd(texto); if (!t) return [];
    const toks = t.split(" "), ft = toks.map(fon).join(" ");
    const res = {};
    const poner = (p, s) => { if (!res[p] || res[p] < s) res[p] = s; };
    const idx = indice(cat);
    // 1) frase exacta contenida (gana la más larga; las palabras usadas ya no cuentan para otra)
    const ftoks = toks.map(fon), usado = toks.map(() => false);
    for (const e of idx) {
      const n = e.largo;
      for (let i = 0; i + n <= toks.length; i++) {
        if (usado.slice(i, i + n).some(Boolean)) continue;
        const txt = toks.slice(i, i + n).join(" "), fn = ftoks.slice(i, i + n).join(" ");
        if (txt === e.frase || fn === e.fon) {
          poner(e.p, (txt === e.frase ? 1 : 0.95) - Math.max(0, toks.length - e.largo) * 0.02);
          for (let k = i; k < i + n; k++) usado[k] = true;
          break;
        }
      }
    }
    // 2) parecido (errores del dictado)
    if (!Object.keys(res).length) {
      for (const e of idx) {
        const n = e.largo;
        for (let i = 0; i + n <= toks.length; i++) {
          const trozo = toks.slice(i, i + n).map(fon).join(" ");
          const d = lev(trozo, e.fon), L = Math.max(trozo.length, e.fon.length);
          if (L >= 4) { const s = 1 - d / L; if (s >= (L <= 4 ? 0.8 : 0.72)) poner(e.p, s * 0.92); }
          // prefijo: "fruti" → frutilla, "choco" → chocolate
          if (n === 1 && trozo.length >= 4 && e.fon.startsWith(trozo)) poner(e.p, 0.8);
        }
      }
    }
    // 3) palabra suelta que es el inicio de varios productos ("vasos" → vaso pequeño o grande)
    if (!Object.keys(res).length) {
      toks.forEach(tk => {
        const f = fon(tk); if (f.length < 3) return;
        idx.forEach(e => { if (e.largo > 1 && e.fon.split(" ")[0] === f) poner(e.p, 0.6); });
      });
    }
    return Object.keys(res).map(p => ({ p, score: Math.round(res[p] * 1000) / 1000 })).sort((a, b) => b.score - a.score);
  }

  // ---------- intenciones ----------
  const VERBOS = [
    ["deshacer", /\b(deshacer|deshaz|deshace|desase|deshago|borra(r)? lo ultimo|elimina(r)? lo ultimo|(borra|borrar|elimina|eliminar|quita|quitar|anula|anular) (el |la )?ultim[oa]( movimiento| registro| orden)?|anula(r)?( lo ultimo)?|me equivoque|cancela(r)? lo ultimo|quita(r)? lo ultimo)\b/],
    ["consulta", /\b(cuant[oa]s?|que tanto|hay suficiente|stock de|inventario de)\b/],
    ["merma", /\b(merma|botar|bota|botalo|botala|botalos|botalas|boten|bote|boto|botamos|botaron|tirar|tira|tire|tiramos|se dano|se danaron|danad[oa]s?|se cayo|se cayeron|cayo|cayeron|se rego|se regaron|derrame|derramo|se pudrio|se pudrieron|podrid[oa]s?|vencid[oa]s?|se vencio|se vencieron|se arruino|se arruinaron|desperdicio|no sirve|no sirven|se echo a perder|se echaron a perder|echad[oa]s? a perder|se malogro|se malograron|malograd[oa]s?|aplastad[oa]s?|se aplasto|se aplastaron|se rompio|se rompieron|rot[oa]s?|botando|tirando)\b/],
    ["produccion", /\b(prepar(ar|e|o|amos|a|en|aron|ado|ada)|bat(ir|i|io|imos|e)|hac(er|emos|e)(?! falta)(?! (un |el |otro )?pedido)|hice|hicimos|hicieron|hizo|haz(?! (un |el |otro )?pedido)|calent(ar|e|o|amos)|calienta|calienten|derret(ir|i|imos)|derrite|derritan|proces(ar|a|e|o|amos|aron|ado|ada|ados|adas)|produc(ir|e|en|imos|ido)|produj(e|o|imos|eron)|elabor(ar|a|e|o|amos|aron)|aument(ar|a|e|o|amos|aron|en)|agreg(ar|a|o|amos|aron|ue|uen)|sum(ar|a|o|amos|aron|e|en))\b/],
    ["recepcion", /\b(recibido|recibi(do|mos)?|ya llego|llego todo|todo llego|si llego|confirmo (que )?llego|llegaron bien|ya llegaron)\b/],
    ["entrada", /\b((nos|me) (dejaron|entregaron|vendieron|llegaron)|(el|la) proveedora? (dejo|entrego|mando|vino|llego)|descarga(mos|ron)|acab(o|amos) de recibir|(vino|llego) el (proveedor|camion|de la|del|de los|de las)|se recibi(o|eron)|recibieron|se ingres(o|aron)|acaba(n)? de (llegar|entrar|ingresar)|ha(n)? llegado|ha(n)? entrado|esta(n)? llegando|recien (llego|llegaron|entro|entraron)|llegada de|ingreso de|registr\w* (el |la )?(ingreso|entrada|llegada)|llegaron|llego|compre|compramos|ingres(ar|a|o|amos|en|aron|e|ado|ados|ada|adas|ando)|entrada|entraron|nos trajeron|me trajeron|trajeron|trajo|trajo el proveedor|del proveedor|recibimos del proveedor)\b/],
    ["agotado", /\b(se acabo|se acabaron|se termino|se terminaron|ya no hay|ya no queda|ya no quedan|no hay|no queda|no quedan|nos quedamos sin|me quede sin|nos quedemos sin|estamos sin|quedamos sin|agotad[oa]s?|se agoto|se agotaron)\b/],
    ["pedido", /\b(pedir|pidiendo|pide|pido|pidan|pidamos|pidele|pidanle|pideles|pidales|pidale|pidiendole|pedirle|pedirles|pidamosle|solicit(ar|a|o|amos|en|ale|ales|arle)|requiero|requerimos|se requiere|necesito|necesitamos|necesitan|necesitaria|necesitariamos|ocupo|ocupamos|nos falta|nos faltan|me falta|me faltan|hace falta|hacen falta|falta|faltan|se necesita|traigan|trae(r)?|traeme|traime|traigame|traiganme|traenos|traiganos|mandenme|mandame|mandeme|mandanos|mandenos|manden mas|envienme|enviame|envianos|envienos|pasame|pasenme|pasanos|(me|nos) (mandas|mandan|mandes|manden|mande|pasas|pasan|pases|pasen|pase|traes|traen|traigas|traigan|traiga|envias|envian|envies|envien|envie)|ha(z|ga|gan|cer|game|ganme|zme|zle|zles|ceme|cerme|cele|gamos|gale)(le|les|lo| le| les| me)? (un |el |otro |nuevo |una )?(pedido|solicitud)|(un |nuevo |otro )?pedido de(?= (un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|media|\d))|queria pedir|quiero pedir|quisiera pedir|me (mandas|mandan|mande|manden|envias|envie|envien|traes|traiga|traigan|pasas|pase|pasen|das|de|den))\b/],
    ["venta", /\b(vend(i|imos|ieron|io)|venta( de)?|registr(ar|a|e|o|ame|emos|en)(?= (?:, )?(?:[a-z0-9]+ ){0,2}?(venta|vaso|vasos|reex|reexs|reexes|split|splits|mix|mixs|mixes|exotica|exoticas|tropical|tropicals|tropicales|chill|chills|reexita|reexitas|godzilla|godzillas)\b)|se vendio|se vendieron|cobre|despache un|salio un|salio una|salieron)\b/],
    ["traslado", /\b(poner|pon|pone|ponga|pongan|ponle|ponles|ponlo|ponla|ponlos|ponlas|quitar|quita|quite|quito|quitamos|quitale|quiten|kitar|kita|kite|sacar|saca|saque|sacamos|sacale|saquen|llevar|lleva|lleve|llevo|llevamos|llevate|llevale|llevales|lleven|mandar|manda|mande|mando|mandamos|mandale|mandales|mandarle|enviar|envia|envie|envio|enviamos|enviale|envialo|pasar|pasa|pase|paso|pasamos|pasale|pasales|pasalo|va|van|vaya|vayan|quitando|sacando|llevando|mandando|enviando|pasando|despachando|devolviendo|regresando|despachar|despacha|despache|despacho|despachamos|bajar|baja|baje|subir|sube|subi|devolver|devuelve|devuelvo|devolvi|devolvemos|regresar|regresa|regreso|regrese|regresamos|retirar|retira|retire|mover|mueve|mueveme|muevanme|muevelo|muevela|muevelos|muevelas|muevan|muevo|movi|movemos|movamos|trasladar|traslada|traslade|salida|sale|salen|salio|salieron)\b/],
    ["conteo", /\b(hay|quedan|queda|tenemos|tengo|conte|contamos|cuento|contar|contado|contando|conteo|existen)\b/]
  ];
  const SI = /^(?:(?:si|sip|simon|afirmativo|dale|ok|okay|okey|listo|confirmo|confirmar|confirma|confirmalo|correcto|eso|eso es|de una|de ley|ya|va|ahi va|vale|claro|perfecto|asi es|esta bien|bien|exacto|registra|registralo|muevelo|muevelos|mandalo|mandalos|envialo|hagale|hazle|senor|senora|gracias|por favor|porfa|porfis)(?: |$))+$/;
  const NO = /^(?:(?:no|cancela|cancelar|cancelo|para|espera|nada|olvidalo|olvida|equivocado|mal|esta mal|no es asi|tampoco|dejalo|deja|borra eso|eso no|mejor no|todavia no|aun no|negativo|gracias|por favor|porfa)(?: |$))+$/;

  function lugarDe(w) { return /bodega|bodeg|vodega/.test(w) ? "B" : /produc|planta|cocina|preparacion/.test(w) ? "P" : /local|tienda|puesto|barra/.test(w) ? "L" : null; }
  /* Por dónde pasa cada producto (ruta del catálogo: bodega → producción → local) y a dónde va si no se dice */
  function rutaP(p) { return (p && p.ruta && p.ruta.length) ? p.ruta : ["B", "L"]; }
  function siguienteDe(p, de) {
    const r = rutaP(p), i = r.indexOf(de);
    if (i >= 0 && i < r.length - 1) return r[i + 1];
    if (i > 0) return r[i - 1];
    if (de === "P") return "L";
    if (de === "L") return r.includes("P") && !r.includes("B") ? "P" : "B";
    return r.includes("P") && !r.includes("L") ? "P" : "L";
  }
  function anteriorDe(p, a) { const r = rutaP(p), i = r.indexOf(a); return i > 0 ? r[i - 1] : a === "L" ? (r.includes("P") ? "P" : "B") : "B"; }
  function unico(arr, porDefecto) { const u = Array.from(new Set(arr)); return { v: u[0] || porDefecto, mixto: u.length > 1 }; }

  // ---------- respuestas afirmativas y negativas a la pregunta («sí mover», «no, cancela») ----------
  const AFIRMA_INI = new Set(["seguro", "despacha", "despachalo", "despachala", "procede", "proceda", "andale", "mandale", "muevan", "sin", "c", "ci", "mandalo", "muevelo", "envialo", "registralo", "hazlo", "dalo", "si", "sip", "simon", "dale", "ok", "okay", "okey", "listo", "claro", "correcto", "confirmo", "confirma", "confirmar", "va", "ya", "vale", "perfecto", "exacto", "bien", "adelante", "bueno", "afirmativo", "esta", "bueno", "sii", "si,", "porfa", "por", "favor"]);
  const NIEGA_INI = new Set(["detente", "alto", "stop", "anula", "anulalo", "borra", "borralo", "ninguno", "ninguna", "nop", "nel", "no", "cancela", "cancelar", "cancelo", "cancelalo", "olvidalo", "olvida", "para", "espera", "mejor", "nada", "deja", "dejalo", "dejala", "negativo", "tampoco"]);
  const RELLENO_CONF = new Set(["mover", "muevelo", "muevela", "mueve", "muevan", "muevas", "movelo", "envia", "enviar", "enviala", "envialo", "envien", "enviarlo", "manda", "mandalo", "mandala", "mandar", "registra", "registralo", "registrala", "registrar", "registren", "anota", "anotalo", "anotar", "hazlo", "hazla", "haz", "hacelo", "hagale", "pasa", "pasalo", "lleva", "llevalo", "llevatelo", "por", "favor", "porfa", "ahora", "ya", "de", "una", "eso", "el", "la", "lo", "ok", "listo", "dale", "gracias", "perfecto", "adelante", "bueno", "bien", "claro", "esta", "bien", "si", "sip", "simon", "todo", "asi", "mismo", "dalo", "damelo", "cancelar", "cancela", "cancelo", "cancelalo", "olvidalo", "olvida", "no", "mejor", "todavia", "aun", "tampoco", "para", "espera", "dejalo", "deja", "nada", "sino", "eso", "ese", "esa", "dejala", "negativo", "despacha", "despachalo", "despachala", "procede", "mandale", "quiero", "quieres", "seguro", "eso", "esto", "ninguno"]);
  /* Devuelve "si", "no" o null. Solo cuenta como respuesta si lo demás es relleno: «sí, mueve», «no, cancela».
     Si después aparece un producto o una cantidad («no, dos cajas»), es una corrección y se interpreta como orden. */
  function respuestaSiNo(t) {
    const w = t.replace(/[,.¡!¿?]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (!w.length || w.length > 8) return null;
    const ini = w[0], resto = w.slice(1);
    if (!resto.every(x => RELLENO_CONF.has(x))) return null;
    if (AFIRMA_INI.has(ini) && !resto.some(x => ["no", "cancela", "cancelar", "cancelo", "cancelalo", "olvidalo", "olvida", "mejor", "nada", "tampoco", "negativo"].includes(x))) return "si";
    if (NIEGA_INI.has(ini)) return "no";
    return null;
  }

  /* Respuesta corta a una pregunta del asistente, dicha como sea: «sí», «de una», «hágale», «ajá», «claro»,
     «no», «nel», «mejor no», «novedad», «hay un problema»…  Devuelve { r: "si"|"no"|"novedad", resto, limpio } o null.
     limpio = no dijo nada más que la respuesta (si dijo «sí, pero una caja abierta», resto = «pero una caja abierta»). */
  const FRASES_SI = [/\btal cual\b/g, /\bta bien\b/g, /\bas[ií] ?mismo\b/g, /\bya pues\b/g, /\bclaro que s[ií]\b/g, /\bde una\b/g, /\bpor supuesto\b/g, /\basi es\b/g, /\besta bien\b/g, /\btodo bien\b/g, /\bde ley\b/g, /\bclaro que si\b/g, /\bahi va\b/g,
    /\bsi senor(a)?\b/g, /\b(si )?llego (todo|completo|bien)\b/g, /\btodo (llego|completo|ok)\b/g, /\bsi llego\b/g, /\bya llego\b/g, /\bcomo no\b/g, /\bno hay problema\b/g,
    /\bsin (ninguna |ningun |ningún )?(novedad|novedades|problema|problemas|inconveniente|inconvenientes|observacion|observaciones|falta|faltantes)\b/g, /\btodo en orden\b/g, /\btodo correcto\b/g, /\bnada que reportar\b/g, /\bno (falta|falto|faltan|faltaron) nada\b/g, /\bno hay (ninguna )?novedad(es)?\b/g, /\bningun(a)? novedad\b/g,
    /\bsi verdad\b/g, /\bhagamoslo\b/g, /\bhagamos(lo)? (de una|ya|nomas)\b/g, /\bvamos (con todo|dale|nomas)\b/g, /\b(muevelo|mueve|mover|mandalo|manda|envialo|despachalo|despacha) de una\b/g, /\bsi (mover|muevelo|mandalo|envialo|despachalo|despacha|registralo|anotalo|pedir|pidelo|pidela|pide|pidan|enviar|envia|envialo|mandar|despachar|preparar|preparalo|preparala|prepara|recibir|recibelo|registrar|hacer|hazlo|correcto|confirmar|confirmo|guardar|guardalo|comprar|compralo|llevar|llevalo)\b/g,
    /\bsin duda\b/g, /\beso mismo\b/g, /\bes correcto\b/g, /\besta correcto\b/g, /\bdale nomas\b/g, /\bhagale nomas\b/g, /\bmuy bien\b/g, /\bsi pues\b/g, /\bpues si\b/g, /\bsi claro\b/g, /\bclaro que s[ií] pues\b/g,
    /\bcon gusto\b/g, /\bsi por favor\b/g, /\bsi se puede\b/g, /\bya mismo\b/g, /\bde una vez\b/g, /\bpor favor si\b/g, /\bsi sí\b/g, /\bsi si\b/g, /\bclaro claro\b/g, /\bok dale\b/g, /\bbueno dale\b/g, /\bdale dale\b/g,
    /\bde acuerdo\b/g, /\bestoy de acuerdo\b/g, /\bokey dokey\b/g, /\bde lujo\b/g, /\btienes razon\b/g, /\bjusto eso\b/g, /\bpor supuesto que si\b/g, /\bsi confirmado\b/g, /\bsi confirmo\b/g, /\bsi de una\b/g, /\bsi senor\b/g, /\bsi mismo\b/g, /\bsi creo\b/g,
    /\bsi esta bien\b/g, /\btodo esta bien\b/g, /\btodo ok\b/g, /\bexactamente\b/g, /\bafirmativo\b/g, /\bpositivo\b/g, /\bque si\b/g];
  const FRASES_NO = [/\bni hablar\b/g, /\bmejor no\b/g, /\btodavia no\b/g, /\baun no\b/g, /\bpara nada\b/g, /\bno llego( todo| completo)?\b/g, /\b(llego|esta|vino) incompleto\b/g, /\bno esta completo\b/g, /\bni modo\b/g,
    /\bno (lo |la |los |las )?(muevas|mandes|envies|registres|despaches|hagas|muevan|manden|envien|registren|despachen|anotes|mueva|mande)\b/g, /\bno (mover|mandar|enviar|despachar|registrar|anotar)\b/g, /\bmas tarde\b/g, /\bahorita no\b/g, /\bahora no\b/g, /\bpor ahora no\b/g, /\bno por ahora\b/g,
    /\bno es (eso|correcto|asi|ese|esa|lo que (pedi|dije|pedimos|dijimos))\b/g, /\bno era (eso|asi|ese|esa)\b/g, /\bte equivocaste\b/g, /\bse equivoco\b/g, /\bnada que ver\b/g, /\bno (corresponde|coincide|cuadra|concuerda)\b/g,
    /\bno (autorizo|apruebo|acepto|aprobado|autorizado|aceptado|confirmo|confirmado|creo|se puede|esta bien|esta correcto|es verdad|era|va)\b/g, /\beso no\b/g, /\bno lo (hagas|hagan|haga)\b/g, /\besta mal\b/g, /\bme equivoque\b/g, /\bde ninguna manera\b/g, /\bni loco\b/g, /\bno quiero\b/g, /\bno gracias\b/g, /\bno no\b/g, /\bespera(te)? un (rato|momento|ratito|segundo)\b/g, /\bno todavia\b/g];
  const FRASES_SI_ANTES = [/\bno hay (ningun )?problema\b/g, /\bno pasa nada\b/g, /\bno paso nada\b/g, /\bno falta nada\b/g, /\bno (falto|faltaron|faltan) nada\b/g, /\bsin (ningun )?problema\b/g, /\bningun problema\b/g, /\bno hay (ninguna )?novedad(es)?\b/g, /\bno hay drama\b/g];
  const FRASES_NOV = [/\bhay (una |un )?(novedad|observacion|problema|detalle|inconveniente)\b/g, /\bpaso algo\b/g, /\bhay algo\b/g, /\btengo (una )?(novedad|observacion)\b/g, /\bexiste (una )?(novedad|observacion)\b/g];
  const SI_INI = new Set(["si", "sip", "sii", "siii", "simon", "dale", "dele", "ok", "okay", "okey", "oki", "okis", "listo", "claro", "correcto", "confirmo", "confirmado", "confirma", "confirmar", "afirmativo",
    "va", "ya", "vale", "perfecto", "exacto", "bueno", "obvio", "hecho", "sale", "chevere", "aja", "aha", "aham", "ajam", "eso", "adelante", "procede", "proceda", "hagale", "hagalo", "hazle", "hazlo", "recibido", "yes", "xsix",
    // el dictado a veces escribe «sí» como «c», «ci» o «sì»; y confirmaciones con el verbo: «mándalo», «muévelo»…
    "c", "ci", "mandalo", "mandala", "muevelo", "muevela", "envialo", "enviala", "registralo", "registrala", "anotalo", "anotala", "pasalo", "llevalo", "confirmalo", "dalo", "damelo", "listos",
    "seguro", "despacha", "despachalo", "despachala", "completo", "completa", "acepto", "aceptado", "aprobado", "apruebo", "autorizado", "autorizo", "justo", "buenisimo", "buenazo", "lujo", "correctisimo", "perfectamente", "dokey", "andale", "mandale", "muevan", "registren", "envien", "procedé",
    "hagamoslo", "hagamos", "vamos", "vamonos", "venga", "obvio", "efectivamente", "verdad", "cierto", "sisi", "sisisi", "genial", "excelente", "super", "bacan", "chevere", "positivo", "okidoki", "okk", "okey", "dalee", "daleee", "ajá", "exactamente", "mueve", "muevalo", "despachen", "envie", "mandelo", "llevelo", "obviamente", "totalmente", "definitivamente", "absolutamente", "procedelo", "procedalo", "procedan", "mhm", "mjm", "uhum", "uju", "ujum", "favor", "porfa", "porfis", "porfavor", "hecho", "sipi", "sipis", "claroo", "claroque", "okeyy", "daleq"]);
  const NO_INI = new Set(["falsa", "equivocacion", "no", "nop", "nel", "negativo", "cancela", "cancelar", "cancelo", "cancelalo", "olvidalo", "olvida", "para", "espera", "nada", "tampoco", "incompleto", "falta", "faltan", "falto", "faltaron", "xnox",
    "dejalo", "dejala", "deja", "detente", "rechazado", "rechazo", "rechaza", "falso", "mentira", "imposible", "equivocaste", "incorrecta", "mal", "alto", "stop", "anula", "anulalo", "anulala", "borra", "borralo", "cancelarlo", "cancelala", "cancelalos", "cancelado", "cancelemos", "anular", "anulemos", "ninguno", "ninguna", "nunca", "jamas", "error", "incorrecto", "equivocado", "equivocada", "nones", "nanay", "despues", "luego", "noo", "nooo", "nop", "nopi", "nain"]);
  const NOV_INI = new Set(["novedad", "novedades", "observacion", "observaciones", "problema", "problemas", "defecto", "inconveniente", "detalle", "xnovx"]);
  // (31-oct, video 1420: «sí, correcto, envíala» se tomaba como duda y Rex repetía la pregunta tres veces)
  const CONFIRMA_RESTO = ["correcto", "correcta", "exacto", "exacta", "enviala", "envialo", "envialas", "envialos", "enviado", "enviada", "envia", "envie", "mandala", "mandalo", "manda", "llevala", "llevalo", "lleva",
    "muevela", "muevelo", "mueve", "pasala", "pasalo", "registralo", "registrala", "registra", "hazlo", "hagalo", "hagale", "dale", "confirmado", "confirmo", "listo", "perfecto", "asi", "eso", "esa", "ese", "es", "esta", "bien", "todo", "nomas",
    "el", "la", "lo", "los", "las", "movimiento", "orden", "ya", "va", "vale", "claro", "de", "una"];
  const RELLENO_RESP = new Set(CONFIRMA_RESTO.concat(["estoy", "estamos", "segurisimo", "segurisima", "alarma", "falsa", "fue", "un", "una", "error", "equivocacion", "mia", "mio", "nada", "olvida", "seguro", "segura", "todo", "correcto", "cancelarlo", "cancelalo", "cancelala", "cancelado", "anulalo", "anulala", "olvidalo", "dejalo", "obviamente", "totalmente", "definitivamente", "absolutamente", "senor", "senora", "jefe", "pana", "bro", "mano", "loco", "pues", "che", "ve", "oye", "rex", "gracias", "por", "favor", "porfa", "porfis", "porfavor", "nomas", "mas",
    "ya", "todo", "bien", "completo", "llego", "llegaron", "mismo", "asi", "que", "de", "una", "un", "eso", "es", "esta", "ahi", "va", "claro", "listo", "dale", "ok", "si", "no", "aja",
    "mover", "moverlo", "moverla", "moverlos", "muevelo", "muevela", "mueve", "movelo", "envia", "envialo", "enviar", "manda", "mandalo", "mandar", "registra", "registralo", "registrala", "registrar", "anota", "anotalo", "hazlo", "hagale", "pasa", "pasalo", "adelante", "senor", "perfecto", "correcto", "gracias",
    "lleva", "llevalo", "confirmo", "confirma", "ahora", "nada", "cancela", "cancelar", "mejor", "todavia", "aun", "tampoco", "espera", "dejalo", "deja", "el", "la", "lo", "le", "hay", "existe", "una", "tengo",
    "xsix", "xnox", "xnovx", "muevan", "despacha", "despachalo", "procede", "mandale", "quiero", "quieres", "recibido", "seguro", "esto", "nomás",
    "verdad", "cierto", "exacto", "obvio", "hagamoslo", "hagamos", "vamos", "vamonos", "venga", "nomas", "pues", "ahorita", "rapido", "rapidito", "entonces", "tranquilo", "chevere", "bacan", "genial", "excelente", "super", "bueno", "ese", "esa", "efectivamente",
    "confirmado", "confirmo", "confirmada", "creo", "vez", "dokey", "lujo", "razon", "tienes", "justo", "acuerdo", "rexito", "jarvis", "asistente", "senorita", "jefa", "patron", "mismo", "nomasito", "porfis",
    "pedir", "pidelo", "pidela", "pide", "pidan", "despachar", "preparar", "preparalo", "preparala", "prepara", "recibir", "recibelo", "guardar", "guardalo", "comprar", "compralo", "llevar", "hacer", "confirmar", "enviarlo", "mandarlo", "mueva", "muevalo", "mandelo", "envie", "envien", "despachen", "despachala", "llevelo", "pasele", "anotelo", "registrelo", "hecho", "listo", "venga", "vale", "okey", "okay", "sale", "andale", "porfavor", "mi", "amigo", "amiga", "hermano", "compa", "nano", "ñaño", "mija", "mijo", "tio", "tia", "amiguito", "amiguita", "hermanito", "hermana", "broder", "brother", "socio", "panita", "manito", "querido", "querida", "crack", "parcero", "causa", "maestro", "master", "compadre", "jefecito", "viejo", "gracias", "please", "plis"]));
  /* Frases que el equipo usa y que se aprendieron en el uso (cuando dijo algo y después tocó «Sí» o «No»). */
  let APRENDIDO = { si: new Set(), no: new Set() };
  const claveFrase = x => normalizar(x).replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  // Lo aprendido antes (y el cerebro compartido) puede traer errores del dictado (videos 1405/1406 de Freddy: «entendí ayuda de rodilla» = no,
  // un nombre = sí). Nunca vale como sí/no: una petición de ayuda, una orden, un lugar, un producto, una cantidad, ni un nombre de persona.
  // (idea y lista de palabras de Codex; aquí además se descartan nombres)
  function fraseAprendible(x, personas) {
    const crudo = String(x || "").trim(), t = claveFrase(crudo), w = t.split(" ").filter(Boolean);
    if (!t) return false;
    if (t === "a la orden") return true;
    if (w.length > 4 || /\d/.test(t)) return false;
    if (/\b(ayuda\w*|auxilio|movimiento\w*|traslado\w*|orden\w*|inventario|bodega|produccion|local|frutilla|durazno|banano|leche|crema|caja\w*|balde\w*|kilo\w*|funda\w*|manda\w*|mueve\w*|lleva\w*|pasa\w*|registra\w*|despacha\w*|recibe\w*|nombre|responsable|llamo|llama|soy)\b/.test(t)) return false;
    // nombres: de la lista del equipo, nombres de pila corrientes, o una sola palabra con mayúscula que no es un sí/no conocido
    const claves = new Set((personas || []).map(n => claveFrase(String(n).replace(/\s*\(.*\)$/, ""))).filter(Boolean));
    for (const n of claves) { if (t === n || t.split(" ").includes(n) || n.split(" ")[0] === w[0] && w.length <= 2) return false; }
    if (w.some(p => COMUNES.has(p)) && !pareceSiNo(crudo)) return false;
    if (w.length === 1 && !pareceSiNo(crudo)) return false;
    return true;
  }
  function ponerAprendido(o, personas) {
    const seguros = r => new Set(((o && o[r]) || []).filter(f => fraseAprendible(f, personas)).map(claveFrase));
    const si = seguros("si"), no = seguros("no");
    for (const k of Array.from(si)) if (no.has(k)) { si.delete(k); no.delete(k); }
    APRENDIDO = { si, no };
    // lo que queda, con la forma escrita original
    const queda = r => { const vistos = new Set(); return ((o && o[r]) || []).filter(f => { const k = claveFrase(f); if (!(r === "si" ? si : no).has(k) || vistos.has(k)) return false; vistos.add(k); return true; }); };
    return { si: queda("si"), no: queda("no") };
  }
  function siNo(frase, opc) {
    let t = normalizar(frase).replace(/[,.!¡¿?]/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return null;
    // «oye Rex, sí», «Jarvis, cancela»: la palabra para llamar al asistente no cuenta
    if (/^(ok|okey|ya|dale|listo|claro|si)\s+(rex|rexito|jarvis)$/.test(t)) return { r: "si", resto: "", limpio: true };   // «ok Rex», «dale Rex»
    t = t.replace(/^((oye|hey|ey|ok|okey|hola|ya)\s+)?(rexito|rexy|rex|reex|reks|recs|frutirex|frutireex|jarvis|yarvis|asistente)\b\s*/, "").trim();
    // «creo que sí», «creería que no», «parece que sí», «me parece que no», «yo diría que sí»
    t = t.replace(/^(yo\s+)?(creo|creeria|pienso|supongo|diria|me parece|parece|segun yo|seguro)\s+que\s+/, "").trim();
    // «o cancelar, cancelarlo», «y no», «mejor cancela»: la conjunción del comienzo no cuenta (video 1419)
    t = t.replace(/^(o|u|y|e|pues|entonces|mejor)\s+(?=(no|nop|cancel\w*|anul\w*|olvidalo|dejalo|si|sip|dale|listo)\b)/, "").trim();
    // (1-nov-2026, video 1446) lo que el parlante de Rex mete en el micrófono junto con la respuesta: «Di sí o no», «¿Estás seguro de este movimiento?»,
    // «¿Lo registro así?». «Sí o no» nunca es una respuesta. (No se quita «… o hay alguna novedad»: sola, esa frase de Rex no debe valer como «sí».)
    t = t.replace(/\b(perdon )?no te entendi\b/g, " ").replace(/\b(di|dime|diga|digame) si o no\b/g, " ").replace(/\bsi o no\b/g, " ")
      .replace(/\b(estas|esta) segur[oa] de este movimiento\b/g, " ").replace(/\b(deseas|quieres) mover\b(?= [a-z0-9]+ (de|del) )/g, " ").replace(/\blo registro asi\b/g, " ")
      .replace(/\s+/g, " ").trim();
    // (3-nov-2026, oído Whisper de la PC) cómo escribe Whisper las respuestas cortas: «sí, te acuerdo», «sí, dé acuerdo», «acuerdo» (se comió el «de»)
    t = t.replace(/\b(te|the|des|del|deh|d) acuerdo\b/g, "de acuerdo").replace(/^(si )?acuerdo$/, "de acuerdo").replace(/^si si\b/, "si").trim();
    t = t.replace(/^(si )?(concuerdos|con acuerdo|con cuerdo|con cuero|concuerda)$/, "$1concuerdo").trim();
    // «no, sí, llegó todo bien», «no sí claro»: en Ecuador «no, sí» es un sí (el «no» del comienzo es muletilla)
    t = t.replace(/^((no|nop)\s+)+(?=(si|sip|claro|correcto|exacto|de acuerdo|asi es)\b)/, "").trim();
    // «no, todo bien», «nada, todo bien», «no, ninguna novedad», «no, no pasó nada»: no hay problema → sí
    t = t.replace(/^((no|nop|nada|ninguna|ninguno)\s+)+(?=(todo bien|todo esta bien|todo correcto|todo en orden|todo perfecto|todo completo|esta todo bien|todo llego|llego todo|llego completo|llego bien|ninguna novedad|sin novedad\w*|ningun problema|no paso nada|no pasa nada|todo normal)\b)/, "").trim();
    // a «¿Llegó todo bien, o hay alguna novedad?»: «nada», «ninguna», «no, ninguna», «no pasó nada» = no hay novedad = llegó bien
    if (opc && opc.llegada && /^((no|nada|ninguna|ninguno)\s*)*(nada|ninguna|ninguno|ninguna novedad|no paso nada|ningun problema)( (todo|ahi|nomas))?$/.test(t)) return { r: "si", resto: "", limpio: true, sinNovedad: true };
    // (2-nov-2026) a «¿Está correcto el pedido, o hay alguna observación?»: «no hay observaciones», «ninguna observación», «sin observaciones»,
    // «sí, el pedido está correcto», «está correcto el pedido», «sí, llegó completo, ninguna observación» = llegó bien (antes «no hay observaciones» era un «no»)
    if (opc && opc.llegada && t && POS_LLEGADA.test(t.replace(/^no (?=(nada|ninguna|ninguno|ningun|sin|cero|no hay|no hubo|no tengo)\b)/, ""))) return { r: "si", resto: "", limpio: true, sinNovedad: true };
    if (!t) return null;
    // (2-nov-2026, Freddy: «sí, despachemos rápido», «sí, despachemos») a «¿Despacho / envío eso?»: despachar es decir que sí
    // (en el iPhone el «sí» del comienzo a veces se pierde al reabrir el micrófono y llega solo «despachemos»)
    if (/^(si |dale |ya |claro |listo |bueno |ok |de una )*(despach(?!ar\b)\w*|enviemos|mandemos|envialo|mandalo|enviala|mandala|envialos|mandalos|envialas|mandalas|enviale|mandale|envia|manda)( (rapido|rapidito|nomas|no mas|ya|de una|ahora|ahorita|eso|lo que (hay|haya|tengas|tenga|tenemos|se tiene|alcance|alcanza)|todo|eso mismo))*( rex| porfa| por favor)?$/.test(t)) return { r: "si", resto: "", limpio: true };
    // (1-nov-2026, Freddy: «cualquier respuesta afirmativa») más formas de decir que sí
    if (/^(si |pues |claro |ya )?(me parece bien|conforme|fijo|de ley|todo normal|en orden|todo en orden|bien|muy bien|okey dokey|concuerdo|estoy de acuerdo|coincido|asi esta bien|esta bien asi|exacto concuerdo|si concuerdo|lo confirmo|confirmadisimo|eso mismo es)( rex| pues| nomas| gracias| contigo)?$/.test(t)) return { r: "si", resto: "", limpio: true };
    if (opc && opc.llegada && /^(si )?(normal|todo normal|sin novedad\w*|todo en orden|en orden|llegaron (todos|todas|completos|completas|bien)( completos| completas| bien)?|llego (todo|completo|bien|correcto|perfecto)( todo)?)( gracias| rex)?$/.test(t)) return { r: "si", resto: "", limpio: true };
    if (!(opc && opc.sinAprendido)) {
      if (APRENDIDO.si.has(t)) return { r: "si", resto: "", limpio: true, aprendido: true };
      if (APRENDIDO.no.has(t)) return { r: "no", resto: "", limpio: true, aprendido: true };
    }
    FRASES_SI_ANTES.forEach(re => { t = t.replace(re, " xsix "); });
    FRASES_NOV.forEach(re => { t = t.replace(re, " xnovx "); });
    FRASES_NO.forEach(re => { t = t.replace(re, " xnox "); });
    FRASES_SI.forEach(re => { t = t.replace(re, " xsix "); });
    let w = t.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (!w.length) return null;
    // «sin mover», «sin, por favor»: el dictado escucha «sin» cuando se dice «sí». Si después solo hay relleno, es un sí.
    { const j = w.findIndex(x => !RELLENO_RESP.has(x) || x === "si" || x === "no");
      if (j >= 0 && w[j] === "sin" && w.slice(j + 1).every(x => RELLENO_RESP.has(x) && !["no", "nada", "cancela", "cancelar", "mejor", "tampoco"].includes(x))) w = w.slice(0, j).concat(["si"], w.slice(j + 1)); }
    // «oye Rex, sí», «bueno sí»: se salta el relleno del comienzo hasta la palabra que responde
    let i = 0; while (i < w.length - 1 && !SI_INI.has(w[i]) && !NO_INI.has(w[i]) && !NOV_INI.has(w[i]) && RELLENO_RESP.has(w[i])) i++;
    const ini = w[i], resto = w.slice(i + 1);
    let r = null;
    if (NOV_INI.has(ini)) r = "novedad";
    else if (NO_INI.has(ini)) r = "no";
    else if (SI_INI.has(ini)) r = resto.some(x => x === "xnox" || x === "no" || x === "cancela" || x === "cancelar") ? "no" : "si";
    if (!r) return null;
    const extra = resto.filter(x => !RELLENO_RESP.has(x));
    if (r === "si" && resto.includes("xnovx")) r = "novedad";
    const crudo = normalizar(frase).split(" ");
    // lo que dijo después de la respuesta, tal como lo dijo (para guardarlo como novedad)
    const k = crudo.findIndex(x => SI_INI.has(x.replace(/[,.]/g, "")) || NO_INI.has(x.replace(/[,.]/g, "")) || NOV_INI.has(x.replace(/[,.]/g, "")));
    const restoTxt = extra.length ? String(frase).trim().split(/\s+/).slice(k >= 0 ? k + 1 : 1).join(" ").replace(/^[,.\s]+/, "").replace(/^(pero|y|que|hay|es que)\s+/i, "").trim() : "";
    return { r, resto: restoTxt, limpio: !extra.length && w.length - i <= 6 };
  }

  // ---------- análisis principal ----------
  /* ctx: { lugar: "B"|"L", cat (catálogo del estado), ultimoProducto, stock(l,p) opcional } */
  const AV_VERBO = /^((oye|ey|hey|ok|okey|hola)( pues| ve| mira)? )?((rex|rexito|reex) )?(por favor )?(avisa|avisale|avisales|avisen|avisar|avise|avisemos|avisarle|avisarles|notifica|notificale|notificales|notificar|notifique|notifiquen|notifiquemos|informa|informale|informales|informar|informe|comunica|comunicale|comunicales|comunicar|anuncia|anunciale|anunciales|anunciar|alerta|alertale|alertales|alertar|dile|diles|digale|digales|cuentale|cuentales|hazle saber|hazles saber|haz saber|hagan saber|que sepan|pon en conocimiento|poner en conocimiento|ponle en conocimiento|ponles en conocimiento|pongan en conocimiento|pon al tanto|ponles al tanto|ponle al tanto|deja (un )?(aviso|recado|mensaje|nota)|dejale (un )?(aviso|recado|mensaje)|manda (un )?(aviso|mensaje|recado)|envia (un )?(aviso|mensaje)|registra (un )?(aviso|novedad|alarma|alerta)|anota (un )?(aviso|novedad|alarma)) /;
  const AV_DEST = /^(a |al |a la |a los |para |para el |para la |para los |con |de |del |de la )?(todos|todo el mundo|todo el equipo|todo el personal|todas las areas|todas|los tres lugares|todos los lugares|toda la gente|la gente|los chicos|el local|local|la produccion|produccion|la bodega|bodega|la cocina|cocina|la planta|planta|la tienda|tienda)( (y|e) (a |al |a la )?(el local|local|la produccion|produccion|la bodega|bodega|la cocina|cocina|la planta|planta|la tienda|tienda))?( (de|del) (la )?(bodega|produccion|local))? /;
  const AV_LUGAR = { local: "L", tienda: "L", produccion: "P", cocina: "P", planta: "P", bodega: "B" };
  const AV_QUEDANDO = /\b(nos (estamos|vamos|esta|estan) (quedando|acabando) sin|nos (estamos|vamos) a quedar sin|nos esta(n)? (acabando|terminando)|se (nos )?esta(n)? (acabando|terminando)|se va(n)? a (acabar|terminar)|ya (casi )?no (hay|queda|quedan|tenemos) (mucho|mucha|muchos|muchas|casi nada)|quedan? (muy )?poc[oa]s?|esta(n)? por (acabarse|terminarse|agotarse)|ya mismo se (acaba|termina|acaban|terminan)|hay (muy )?poc[oa]s?|estamos (cortos|cortas|bajos|bajas) de|ya casi se (acaba|termina))\b/;
  const AV_PREPARANDO = /^(ya )?(estamos|estoy|esta|estan|se esta|se estan|seguimos|sigo|seguimos|ya estamos|ahorita estamos|ahora estamos|en este momento estamos) (preparando|haciendo|elaborando|batiendo|cocinando|terminando|alistando|empacando|licuando|picando|lavando)\b/;
  const AV_LISTO = /\b((ya )?(esta|estan|quedo|quedaron) list[oa]s?|ya (va|van|sale|salen|salio|salieron) (en camino|para (el |la )?(local|bodega|produccion)|al local|a produccion|a la bodega)|(va|van) en camino|esta(n)? (por|a punto de) (terminar|salir|estar)|ya casi (esta|estan|termin\w*|sale|salen|listo|lista))\b/;
  const AV_ALARMA = /\b(hay (un |una )?(problema|inconveniente|emergencia|alarma|fuga|incendio|accidente|daño|dano|derrame|cortocircuito)|se (daño|dano|danaron|rompio|rompieron|quemo|quemaron|apago|apagaron|fue la luz|fue el agua|fue el gas|fue el internet|corto (la luz|el agua|el gas|el internet))|no hay (luz|agua|gas|internet|energia|senal|sistema)|se (fue|corto) (la luz|el agua|el gas|el internet|la energia)|(la |el )?(refri|refrigeradora|refrigerador|congeladora|congelador|frigorifico|nevera|licuadora|batidora|maquina|cocina|horno|balanza|caja registradora|computadora|impresora|vitrina|cuarto frio|camara de frio|freezer|frizer|tablet|telefono|celular) (no (funciona|enfria|congela|prende|sirve|anda|carga)|se (daño|dano|apago|rompio|quemo)|esta (danad[oa]|mal|fallando|rot[oa]|apagad[oa])))\b/;
  /* El aviso dicho por voz, o null. { para: ["L"] | "todos", texto, nivel: normal|alto|alarma, clase: verbo|quedando|preparando|listo|alarma, items } */
  function detectarAviso(frase, t, ctx) {
    const cat = ctx.cat || null;
    const q = t.replace(/[¿?¡!,.;:«»"]/g, " ").replace(/\s+/g, " ").trim();
    if (!q) return null;
    // las palabras tal como se dijeron (con tildes), para el texto del aviso
    const ow = String(frase).replace(/[¿?¡!,.;:«»"]/g, " ").split(/\s+/).filter(Boolean), tw = ow.map(w => normalizar(w));
    const original = msg => { const mw = msg.split(" "); for (let k = 0; k + mw.length <= tw.length; k++) if (mw.every((w, i) => tw[k + i] === w)) return ow.slice(k, k + mw.length).join(" ");
      // (3-nov-2026) si se le agregó una palabra al normalizar («daño la licuadora» → «se dano…»), cada palabra vuelve a como se dijo
      return mw.map(w => { const i = tw.indexOf(w); return i >= 0 ? ow[i] : w; }).join(" "); };
    const prodsDe = x => { try { return buscarProducto(x, cat).filter(y => y.score >= 0.85).slice(0, 2).map(y => ({ p: y.p, q: null })); } catch (e) { return []; } };
    let resto = q.replace(/^((oye|ey|hey|ok|okey|hola)( pues| ve| mira)? )?((rex|rexito|reex) )?(por favor )?/, "").trim(), para = null, clase = null, conVerbo = false;
    if (!resto) return null;
    const mv = resto.match(AV_VERBO);
    if (mv) {
      conVerbo = true; resto = resto.slice(mv[0].length);
      const md = (resto + " ").match(AV_DEST);
      if (md) {
        const dd = (md[2] + " " + (md[6] || "")).split(" ").map(w => AV_LUGAR[w]).filter(Boolean);
        para = /^(todos|todo|todas|los tres|toda|la gente|los chicos)/.test(md[2]) ? "todos" : Array.from(new Set(dd));
        resto = (resto + " ").slice(md[0].length).trim();
      }
      resto = resto.replace(/^(que|de que|lo siguiente|esto|este aviso|esta novedad|sobre|acerca de)\b\s*/, "").replace(/^(que)\b\s*/, "").trim();
      if (!resto) return { para: para || "todos", texto: "", nivel: "normal", clase: "verbo", items: [], pedirTexto: true };
      // «dile a producción que me mande 2 baldes»: es un pedido (con cantidad), no un aviso
      const R2 = interpretar(resto, Object.assign({}, ctx, { sinAviso: true }));
      if (R2 && ["pedido", "traslado", "merma", "entrada", "compra", "produccion"].includes(R2.intent) && (R2.items || []).some(x => x.p && (x.q != null || x.tandas != null)) && !AV_QUEDANDO.test(resto) && !AV_LISTO.test(resto) && !AV_PREPARANDO.test(resto)) return null;
    }
    // «se dañó un kilo de frutilla», «se rompieron 2 cajas de leche»: es una merma de un producto, no una alarma (salvo que se pida avisarlo)
    const deProducto = () => { const R3 = interpretar(resto, Object.assign({}, ctx, { sinAviso: true })); return (R3.items || []).some(x => x.p); };
    if (AV_ALARMA.test(resto) && (conVerbo || !deProducto())) clase = "alarma";
    else if (AV_QUEDANDO.test(resto)) clase = "quedando";
    else if (AV_PREPARANDO.test(resto)) clase = "preparando";
    else if (AV_LISTO.test(resto)) clase = "listo";
    else if (conVerbo) clase = "verbo";
    if (!clase) return null;
    // sin verbo: solo frases que son claramente un aviso (no una orden con cantidad: «se cayó un balde de frutilla» es una merma)
    if (!conVerbo && (clase === "quedando" || clase === "listo" || clase === "preparando") && /^(lleva|llevar|manda|mandar|mueve|mover|pasa|pasar|envia|enviar|trae|traer|saca|sacar|despacha|despachar)\b/.test(resto)) return null;
    const texto0 = original(resto), texto = texto0.charAt(0).toUpperCase() + texto0.slice(1);
    return { para: para || "todos", texto, nivel: clase === "alarma" ? "alarma" : clase === "quedando" ? "alto" : "normal", clase, items: prodsDe(resto) };
  }
  function interpretar(frase, ctx) {
    ctx = ctx || {}; const cat = ctx.cat || null;
    const prods = cat ? cat.prods : Object.fromEntries(CAT.PRODUCTOS.map(p => [p.id, p]));
    let t = normalizar(frase);
    // «un paquete de 5 cajas de durazno» son 5 cajas; «dos cajas de 6 latas» son 12 latas (31-oct: «ingresar el paquete de 5 cajas de latas de durazno»)
    {
      const NUM_W = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, veinticuatro: 24, treinta: 30 };
      const nv = w => /^\d+$/.test(w) ? +w : NUM_W[w];
      const EMPQ = "(cajas?|latas?|fundas?|baldes?|paquetes?|bultos?|sacos?|cubetas?|canastos?|canastas?|frascos?|botellas?|rollos?|unidad(es)?|bolsas?|galon(es)?|racimos?|manos?|kilos?|libras?)";
      const NUMQ = "(\\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|veinticuatro|treinta)";
      t = t.replace(new RegExp("\\b(el|la|un|una|1) (paquete|caja|bulto|lote|bolsa|saco|caja grande) de " + NUMQ + " " + EMPQ + "\\b", "g"), (m, a, c, n, e) => n + " " + e);
      t = t.replace(new RegExp("\\b" + NUMQ + " (paquetes|cajas|bultos|bolsas|sacos|lotes) de " + NUMQ + " " + EMPQ + "\\b", "g"), (m, n1, c, n2, e) => { const a = nv(n1), b = nv(n2); return a && b && c.replace(/s$/, "") !== e.replace(/e?s$/, "") ? (a * b) + " " + (/s$/.test(e) ? e : e + (/[aeiou]$/.test(e) ? "s" : "es")) : m; });
      t = t.replace(/\b(cajas?|paquetes?) de latas de\b/g, "$1 de");   // «5 cajas de latas de durazno» = 5 cajas de durazno
    }
    // «para los chicos de la cocina», «a los muchachos de producción», «a las chicas del local»: es el lugar (no «vasos chicos»)
    t = t.replace(/\b(los|las|a los|a las|pa los|pa las) (chicos|chicas|muchachos|muchachas|panas|manes|companeros|companeras|guambras|chamos|senores|senoras|senoritas|compas|ninos|ninas|de turno) (de|del) (la |el )?(cocina|produccion|planta|bodega|local|tienda)\b/g, (m, a, b, c, d, e) => (a && /^(a|pa)\b/.test(a) ? "a " : "") + e);
    // (3-nov-2026, V8) lo que escribe Whisper (el oído de la PC) cuando se come una letra o junta palabras:
    // «llevados baldes» = lleva dos baldes, «de bodega local» = de bodega al local, «Valdes» = baldes, «bodera» = bodega, «porque el pedido…?» = ¿por qué…?
    t = t.replace(/\b(lleva|manda|pasa|mueve|saca|trae|envia)(dos|tres|cuatro|cinco)\b/g, "$1 $2")
      .replace(/^((?:oye |rex |oye rex )?)(llevados|mandados|pasados|movidos|sacados)(?= (baldes?|cajas?|latas?|fundas?|paquetes?|bultos?|canastos?|cubetas?|unidades|kilos?|litros?|racimos?|manos?|frascos?|botellas?|rollos?)\b)/, (m, a, v) => a + v.replace(/dos$/, "") + " dos")
      .replace(/\b(gelatas|laptas|lattas|platas(?= de (durazno|leche|pina|mango)))\b/g, "latas").replace(/\bperiodo\b/g, "pedido")
      .replace(/^((?:oye |rex |oye rex )?)dano (?=(la|el|los|las|una|un) )/, "$1se dano ")
      .replace(/\b(valdes|valdez|baldez|bales|vales(?= de (frutilla|mora|leche|crema|durazno)))\b/g, "baldes").replace(/\bvalde\b/g, "balde")
      .replace(/\b(bodera|boguera|bodegal|bordega|bodeja|vodega|bodeca|bodegas|bolera)\b/g, "bodega").replace(/\b(producian|produccio|producion|produciones)\b/g, "produccion")
      .replace(/\b(de|del|desde) (la )?(bodega|produccion|local) (el |la )?(local|produccion|bodega)\b/g, (m, d, la, x, el, y) => x === y ? m : d + " " + (la || "") + x + " " + (y === "local" ? "al" : "a") + " " + (y === "bodega" ? "la " : "") + y);
    const crudo = frase;
    const R = { crudo, texto: t, intent: null, lugar: ctx.lugar || "L", de: null, a: null, items: [], issues: [], conf: 1 };
    if (!t) { R.intent = "vacio"; R.conf = 0; return R; }
    // «avisa a la bodega que necesitamos leche»: con el verbo de avisar va antes que las preguntas («que necesitamos» no es «¿qué necesitamos?»)
    if (!ctx.sinAviso && AV_VERBO.test(t.replace(/[¿?¡!,.;:«»"]/g, " ").replace(/\s+/g, " ").trim() + " ")) { const av = detectarAviso(frase, t, ctx); if (av) { R.intent = "aviso"; R.aviso = av; R.items = av.items; R.conf = 1; R.listo = true; return R; } }
    // preguntas al asistente sobre cómo está todo: «qué falta», «qué viene en camino», «cómo vamos», «qué hay que preparar»
    {
      const q = " " + t.replace(/[¿?¡!,.]/g, " ").replace(/\s+/g, " ") + " ";
      const PREGUNTAS = [
        // (2-nov-2026, Freddy) «¿por qué el pedido todavía sigue sin despacharse?», «¿por qué sigue esto aquí?», «¿por qué no llega la frutilla?»,
        // «¿qué pasa con el pedido?», «¿dónde está mi pedido?», «¿ya salió el pedido?»: se explica qué falta (y se ofrece despachar lo que hay)
        // (solo al comienzo de la frase y con «por qué» de pregunta: «faltó una caja porque no había» no es una pregunta)
        ["porque", /^ (y |oye |rex |oye rex |a ver |pero |entonces |disculpa |una pregunta )?(por que (el |los |la |las |mi |mis |nuestro |este |esto |eso |esta |estos )?[a-z ]{0,40}?(no |sigue|siguen|todavia|aun |esta (aqui|ahi|aca)|estan (aqui|ahi|aca)|sin despachar|demora|tarda)|porque (el |los |mi |mis |nuestro |este |ese )(pedido|pedidos|envio|envios|despacho)s? (todavia |aun |sigue|siguen|no )|porque (sigue|siguen|todavia|aun) (esto|eso|el pedido|aqui|ahi|sin despachar)|que (pasa|paso|ocurre|onda) con (el|mi|los|mis|nuestro|ese|este|esos) (pedido|pedidos|envio|envios|despacho)|donde (esta|estan|va|van|quedo|quedaron) (el|mi|los|mis|nuestro|nuestros) (pedido|pedidos|envio|envios)|cuando (llega|llegan|sale|salen|viene|vienen|despachan|mandan|envian) (el|mi|los|mis|la|las|nuestro) |ya (salio|salieron|despacharon|despacho|mandaron|enviaron) (el|mi|los|mis|la|las|nuestro) |todavia no (llega|llegan|sale|salen|despachan|despacha|mandan)|aun no (llega|llegan|sale|salen|despachan))/],
        ["camino", /\b(que (viene|vienen|esta|estan|va|van|hay) en camino|que (hay )?por (recibir|llegar)|que (me |nos )?(va a|van a) llegar|que falta (por )?(recibir|llegar)|envios pendientes|que envios hay|hay algo en camino|viene algo)\b/],
        ["pedidos", /\b(que (me |nos )?(pidieron|pidio|piden|han pedido)|hay (algun )?pedidos?|pedidos pendientes|que hay que despachar|que tengo que despachar|que despacho)\b/],
        ["preparar", /\b(que (hay que|tengo que|toca|debo|debemos) preparar|que preparo|que preparamos|que hay que hacer en produccion)\b/],
        ["faltas", /\b(que (falta|faltan|hace falta|hacen falta|necesito|necesitamos|nos falta)|que hay que (pedir|comprar|reponer)|que (tengo|tenemos) que (pedir|comprar)|que (se )?(acabo|acabaron|esta por acabarse|esta bajo)|que pido|que pedimos|que compro|que compramos|que esta bajo)\b/],
        ["ventas", /\b(como (vamos|va el dia|van las ventas|va la venta)|cuanto (vendimos|llevamos vendido|se vendio|hemos vendido|va de venta)|cuantos vasos (vendimos|llevamos|se vendieron|van)|ventas de hoy|cuanto hay en (la )?caja)\b/],
        ["resumen", /\b(que avisos( hay)?|hay avisos|dame (un |el )?resumen|resumen del dia|como (esta|estamos|va) todo|que novedades hay|que hay de nuevo|estado del dia|como esta (la bodega|el local|produccion))\b/]
      ];
      const ordenDespacho = /\b(despach\w*|atiend\w*|atender|manda\w*|mande|envia\w*|envie|lleva\w*|lleve)\b/.test(q);
      for (const [k, re] of PREGUNTAS) if (re.test(q) && !(ordenDespacho && k === "pedidos")) {
        R.intent = "estado"; R.estado = k; R.conf = 1; R.listo = true;
        // «¿por qué no llega la frutilla?»: de qué producto se pregunta
        if (k === "porque") { const resto = q.replace(/\b(por|que|el|la|los|las|mi|mis|nuestro|este|esto|eso|esta|estos|pedido|pedidos|envio|envios|despacho|no|sigue|siguen|todavia|aun|aqui|ahi|aca|sin|despachar\w*|despacha\w*|llega\w*|sale\w*|salio|salieron|viene\w*|demora|tarda|donde|cuando|ya|pasa|paso|ocurre|onda|con|de|del|al|a|y|oye|rex|ver|pero|entonces|disculpa|una|pregunta|se|han|ha|lo|le|nos|me|mandan|mandaron|envian|enviaron|despacharon|quedo|quedaron|va|van|esta|estan)\b/g, " ").replace(/\s+/g, " ").trim();
          if (resto) R.items = buscarProducto(resto, cat).filter(x => x.score >= 0.85).slice(0, 2).map(x => ({ p: x.p, q: null })); }
        return R;
      }
    }
    // (2-nov-2026, Freddy) avisos entre lugares: «avisa a todos que nos estamos quedando sin leche», «notifica al local que la crema ya va en camino»,
    // «estamos preparando 5 kilos de crema», «se dañó la licuadora». No mueven inventario: se anotan con quién y se anuncian.
    { const av = ctx.sinAviso ? null : detectarAviso(frase, t, ctx); if (av) { R.intent = "aviso"; R.aviso = av; R.items = av.items; R.conf = 1; R.listo = true; return R; } }
    const sinComas = x => x.replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
    if (SI.test(sinComas(t))) { R.intent = "si"; return R; }
    if (NO.test(sinComas(t))) { R.intent = "no"; return R; }
    { const sn = siNo(frase); if (sn && sn.limpio && sn.r !== "novedad" && !/\b(llego|llegaron|recibido|recibi|recibimos|completo)\b/.test(t)) { R.intent = sn.r; return R; } }
    // abrir o cerrar la caja por voz: «abre la caja», «abrir caja con veinte dólares», «cierra la caja»
    {
      const ab = /\b(abr(ir|e|o|amos|an|ime|eme)|apertura( de)?)\s+(la\s+|el\s+)?(caja|dia|turno)\b/.test(t);
      const ce = /\b(cerr(ar|amos|e|o)|cierr(a|o|en|e|ame)|cierre( de)?)\s+(la\s+|el\s+)?(caja|dia|turno)\b/.test(t);
      if (ab || ce) {
        R.intent = ab ? "abrir_caja" : "cerrar_caja";
        const T = t.replace(/\$\s*(\d)/g, "$1").split(" ");
        const k = T.findIndex(w => /^(dolar|dolares|usd|\$)$/.test(w));
        for (let i = (k > 0 ? k - 1 : T.length - 1); i >= 0 && R.fondo == null; i--) {
          // el número que va antes de «dólares» (o el último número de la frase)
          for (let j = i; j >= Math.max(0, i - 3); j--) { const n = numeroEn(T, j); if (n && j + n.n - 1 >= i - 0 && n.v != null) { R.fondo = n.v; break; } }
          if (k > 0) break;
        }
        if (/\bsin (efectivo|plata|dinero|fondo)\b/.test(t)) R.fondo = 0;
        return R;
      }
    }
    t = t.replace(/\b(a|o) , (ver|sea)\b/g, "$1 $2");   // «a, ver…», «o, sea…»: el dictado pone la coma donde la gente hace una pausa
    t = quitarRelleno(t);
    if (!t) { R.intent = "vacio"; R.conf = 0; return R; }
    if (SI.test(sinComas(t))) { R.intent = "si"; return R; }
    if (NO.test(sinComas(t))) { R.intent = "no"; return R; }
    { const sn = respuestaSiNo(sinComas(t)); if (sn) { R.intent = sn; return R; } }
    { const sn = siNo(frase); if (sn && sn.limpio && sn.r !== "novedad" && !/\b(llego|llegaron|recibido|recibi|recibimos|completo)\b/.test(t)) { R.intent = sn.r; return R; } }

    // «rex vendí cinco reex», «oye tío rex, lleva…»: el llamado al asistente no es un producto (Reex y Rex suenan igual)
    { const m = t.match(LLAMADO_INI); if (m) { const resto0 = t.slice(m[0].length); if (resto0 && VERBOS.some(([, re]) => re.test(resto0))) { t = resto0; R.texto = t; } } }
    t = t.replace(/\b(se|me|nos|le|les) , /g, "$1 ");   // «se, acabó»: el dictado a veces pone una coma después de «se»
    { const c = t.replace(/\s+,?\s*de una( vez)?\s*$/, ""); if (c && /[a-z0-9]$/.test(c)) t = c; }   // «…de fundas de una»: «de una» al final es «ya mismo», no una cantidad
    for (const [re, rep] of PRE) t = t.replace(re, rep);
    t = t.replace(/\s+/g, " ").trim();

    // despachar un pedido que está esperando: «despacha el pedido», «atiende el pedido de producción», «manda lo que pidió el local», «despáchalo»
    {
      const desp = /\bdespach\w*\b/.test(t), atiende = /\b(atiend\w*|atender|atendamos)\b/.test(t);
      const pedidoW = /\bpedidos?\b/.test(t), loPedido = /\b(lo|los|las|el|la|eso|esos|esas)\b[a-z ]{0,30}?\bque (me |nos |le |les )?(pidi\w*|piden|pide|han pedido|solicit\w*|esta pidiendo|estan pidiendo)\b/.test(t) || /\bque (pidi\w*|pide|solicit\w*) (la |el )?(bodega|local|produccion|planta|cocina|tienda)\b/.test(t);
      const envio = /\b(manda\w*|mande|envia\w*|envie|lleva\w*|lleve|saca\w*|saque)\b/.test(t);
      const crear = /\b(ha(z|ga|gan|cer|game|ganme)|realiza\w*|crea\w*|nuevo|otro)\b/.test(t);
      const resto0 = t.replace(/\b(despach\w*|atiend\w*|atender|atendamos|manda\w*|mande|envia\w*|envie|lleva\w*|lleve|saca\w*|saque|pedidos?|lo que|me|nos|le|les|pidi\w*|piden|pide|han pedido|solicit\w*|que|esta|estan|pidiendo|el|la|los|las|de|del|a|al|para|ya|ahora|ese|este|esa|esta|ultimo|primer|primero|todo|todos|si|dale|porfa|nomas|rapido)\b/g, " ")
        .replace(/\b(bodega|local|produccion|planta|cocina|tienda)\b/g, " ").replace(/\s+/g, " ").trim();
      const prods0 = resto0 ? buscarProducto(resto0, cat).filter(x => x.score >= 0.85) : [];
      const conNumero = /\d/.test(resto0) || resto0.split(" ").some(w => w in UNIDADES || w === "medio" || w === "media");
      R.verboDespacho = desp || atiende;
      const loQueHay = envio && /\blo que (hay|haya|tengas|tenga|tenemos|tengamos|tengo|se tiene|alcance|alcanza|quede|queda|hubiera)\b/.test(t);
      if (!crear && !conNumero && (((pedidoW || loPedido || loQueHay) && (desp || atiende || envio)) || (desp && !prods0.length))) {
        R.intent = "despachar_pedido";
        const mDe = t.match(/\b(?:de|del|de la|desde)\s+(?:la |el )?(bodega|local|produccion|planta|cocina|tienda)\b/) || t.match(/\b(?:pidi\w*|pide|piden|solicit\w*|pidiendo)\s+(?:la |el )?(bodega|local|produccion|planta|cocina|tienda)\b/);
        R.pedidoDe = mDe ? lugarDe(mDe[1]) : null;
        R.items = prods0.slice(0, 1).map(x => ({ p: x.p, q: null, alternativas: [] }));
        R.conf = 1; R.listo = true;
        return R;
      }
    }

    // intención
    // «necesito llevar», «hay que mover», «tengo que pasar», «puedes mandar»: es un movimiento, no un pedido
    if (/\b(necesito|necesitamos|quiero|queremos|debo|debemos|tengo que|tenemos que|hay que|tienes que|tiene que|tienen que|vamos a|voy a|me toca|nos toca|toca|puedes|puedo|podemos|podrias|podria)\s*,?\s+(llevar|mover|pasar|mandar|enviar|sacar|trasladar|despachar|bajar|subir|devolver|regresar|retirar)\b/.test(t)) R.intent = "traslado";
    else for (const [nom, re] of VERBOS) { if (re.test(t)) { R.intent = nom; break; } }
    if (R.intent === "recepcion" && /proveedor|compr/.test(t)) R.intent = "entrada";
    R.proveedor = /proveedor|compr/.test(t);
    // lugares explícitos
    let m;
    const reDe = /\b(de|desde|del|de la|de el|sale de|salen de)\s+(la |el )?(bodega|local|tienda|puesto|produccion|planta|cocina)\b/g;
    const reA = /\b(a|al|para|para el|para la|hacia|hacia el|hacia la|pa|pal|a la|a el|en el|en la|en)\s+(la |el )?(bodega|local|tienda|puesto|produccion|planta|cocina)\b/g;
    const reEn = /\b(en)\s+(la |el )?(bodega|local|produccion)\b/g;
    let deX = null, aX = null, enX = null, paraX = null, aSolo = null;   // paraX: «para producción» (para quién es); aSolo: «a la bodega» (a quién se le pide)
    // a quién se le habla al pedir: «producción, mándame…», «que la bodega me mande…», «bodega, envíanos…» (31-oct, pedidos en todos los sentidos)
    let vocX = null;
    { const mv = t.match(/^(?:oye |rex |por favor )*(?:que )?(?:la |el )?(bodega|produccion|local)\b[\s,.:;]+(?:(?:por favor|porfa)[\s,]+)?(?:me |nos )?(mandame|mandanos|mandenme|enviame|envianos|envienme|traeme|traenos|traiganme|pasame|pasanos|pasenme|dame|danos|denme|despachame|mande|manden|envie|envien|traiga|traigan|pase|pasen|de|den|mandas|envias|traes|pasas|das)\b/);
      if (mv) vocX = lugarDe(mv[1]); }
    while ((m = reDe.exec(t))) deX = lugarDe(m[3]);
    while ((m = reA.exec(t))) { if (m[1] === "en" || m[1] === "en el" || m[1] === "en la") enX = lugarDe(m[3]); else { aX = lugarDe(m[3]); if (/^(para|pa|pal)\b/.test(m[1])) paraX = aX; else aSolo = aX; } }
    while ((m = reEn.exec(t))) enX = lugarDe(m[3]);
    t = t.replace(reDe, " ").replace(reA, " ").replace(reEn, " ").replace(/\b(bodega|local|produccion)\b/g, " ").replace(/\s+/g, " ").trim();

    // quitar los verbos para leer cantidades y productos
    let resto = t;
    for (const [, re] of VERBOS) resto = resto.replace(new RegExp(re.source, "g"), " ");
    resto = resto.replace(/\b(del proveedor|proveedor|ahorita|rapido|urgente|de una vez|porfa|por favor|nomas)\b/g, " ").replace(/\s+/g, " ").trim();
    R.motivo = R.intent === "merma" ? (/(cay|reg|derram)/.test(t) ? "Se cayó / derrame" : /(venc)/.test(t) ? "Vencido" : /(pudr|podrid)/.test(t) ? "Podrido" : /(dan|arruin|no sirve)/.test(t) ? "Dañado" : "Merma") : null;

    if (R.intent === "deshacer") { R.conf = 1; return R; }

    // ---------- venta (menú) ----------
    if (R.intent === "venta") {
      const toks = resto.split(" ");
      const menu = (cat ? cat.menu : CAT.MENU);
      let i = 0, ultimo = null;
      while (i < toks.length) {
        const nm = numeroEn(toks, i); let n = 1;
        if (nm) { n = nm.v; i += nm.n; }
        const w = toks[i] || "";
        if (ultimo && nm && /^(big|grande|grandes|bic|vig|midium|mediano|medianos|mediana|pequeno|pequenos|chico|chicos)$/.test(w) && ultimo.tam.B) {
          const tam = /^(big|grande|grandes|bic|vig)$/.test(w) ? "B" : "M";
          R.items.push({ venta: ultimo.id + "|" + tam, n, txt: n + " × " + ultimo.n + (tam === "B" ? " Big" : " Midium") }); i++; continue;
        }
        const sg = fon(w).replace(/(es|s)$/, "");   // «exóticas», «mixes», «splits»
        const item = menu.find(x => { const f0 = fon(sinTildes(x.n.toLowerCase().split(" ")[0])); return f0 === fon(w) || f0 === sg || f0.replace(/(es|s)$/, "") === sg; }) || menu.find(x => (x.id === "chill" && /^chil/.test(w)) || (x.id === "godzilla" && /^godzil/.test(w)));
        if (item) {
          if (item.id === "godzilla" && /^re+(x|ks|cs)/.test(toks[i + 1] || "")) i++;   // «godzilla reex»
          else if (item.id === "chill" && /^chil/.test(toks[i + 1] || "")) i++;   // «reexita chill», «chill chills»
          const sig = (toks[i + 1] || "") + " " + (toks[i + 2] || "");
          let tam = item.tam.U ? "U" : item.tam.M && !item.tam.B ? "M" : /\b(big|grande|grandes|bic|vig)\b/.test(sig) ? "B" : "M";
          R.items.push({ venta: item.id + "|" + tam, n, txt: n + " × " + item.n + (tam === "B" ? " Big" : tam === "M" && item.tam.B ? " Midium" : "") });
          ultimo = item;
        }
        i++;
      }
      if (R.items.length) { R.lugar = "L"; return R; }
      const otra = VERBOS.slice(VERBOS.findIndex(v => v[0] === "venta") + 1).find(([, re]) => re.test(t));
      if (!otra || !resto) { R.issues.push({ code: "falta_producto", msg: "No entendí qué se vendió. Di el vaso: Reex, Split, Mix, Exótica, Tropical, Reexita Chill o Godzilla Reex (por ejemplo: «registra una Reex mediana»)." }); R.conf = 0.3; R.lugar = "L"; return R; }
      R.intent = otra[0];
    }

    // ---------- leer cantidades y productos ----------
    const T = resto.split(" ").filter(Boolean);
    // «fundas pequeñas», «funda mediana»: la palabra es una unidad (funda) y a la vez el comienzo del nombre de un producto
    const prodConUnidad = (i) => {
      const u = unidadEn(T, i); if (!u || u.tipo !== "empaque") return false;
      for (let k = Math.min(4, T.length - i); k >= 2; k--) {
        const frase = T.slice(i, i + k); if (frase.some(w => esNumTok(w) || STOP.has(w) || w === "de")) continue;
        const c = buscarProducto(frase.join(" "), cat);
        if (c.length && c[0].score >= 0.9 && (!c[1] || c[0].score - c[1].score >= 0.05)) {
          const pr = prods[c[0].p]; const nombres = [pr.n].concat(pr.sin || []).map(x => normalizar(String(x)));
          if (nombres.some(n => n.startsWith(frase.join(" ")))) return true;
        }
      }
      return false;
    };
    const brutos = []; let cur = null, todo = false;
    const cerrar = () => { if (cur && (cur.ptoks.length || cur.q != null || cur.unidad)) brutos.push(cur); cur = null; };
    const nuevo = () => ({ q: null, unidad: null, ptoks: [], todo });
    for (let i = 0; i < T.length;) {
      const tok = T[i];
      if (/^(todo|toda|todos|todas)$/.test(tok)) { todo = true; if (cur && !cur.ptoks.length && cur.q == null) cur.todo = true; i++; continue; }
      // una lista de productos: se separa en la coma o en «y» cuando ya se nombró un producto
      if ((tok === "," || tok === "y" || tok === "e" || tok === "tambien" || tok === "mas" || tok === "con") && cur && cur.ptoks.length && (buscarProducto(cur.ptoks.join(" "), cat).length || categoriaDe(cur.ptoks.join(" ")))) { cerrar(); i++; continue; }
      if (tok === ",") { i++; continue; }
      const nm = esNumTok(tok) ? numeroEn(T, i) : null;
      if (nm && !(["un", "una", "uno"].includes(tok) && cur && cur.ptoks.length && !unidadEn(T, i + 1) && !esNumTok(T[i + 1] || "") && T[i + 1] !== "de")) {
        if (cur && (cur.ptoks.length || cur.q != null)) cerrar();
        cur = cur || nuevo();
        cur.q = nm.v; cur.todo = false; todo = false; i += nm.n;
        if (T[i] === "de" && unidadEn(T, i + 1)) i++;
        else if (T[i] === "de") cur.elidida = true; // «uno de grageas», «dos de pequeños»: la unidad es la de antes
        const u = prodConUnidad(i) ? null : unidadEn(T, i);
        if (u) {
          cur.unidad = u; i += u.n;
          if (T[i] === "y" && (T[i + 1] === "medio" || T[i + 1] === "media")) { cur.q += 0.5; i += 2; }
          else if (T[i] === "y" && T[i + 1] === "un" && T[i + 2] === "cuarto") { cur.q += 0.25; i += 3; }
        }
        continue;
      }
      const u = prodConUnidad(i) ? null : unidadEn(T, i);
      if (u) {
        if (cur && cur.unidad == null && !cur.ptoks.length) { cur.unidad = u; i += u.n; continue; }
        // «6 paquetes de fundas», «3 cajas de galones de cloro»: la segunda unidad es de lo que está hecho el paquete, no otra cantidad
        if (cur && cur.unidad && cur.q != null && !cur.ptoks.length && !cur.inner && T[i - 1] === "de" && u.tipo === "empaque" && u.emp !== cur.unidad.emp) {
          cur.inner = u.n; for (let k = 0; k < u.n; k++) cur.ptoks.push(T[i + k]); i += u.n; continue;
        }
        if (cur && cur.unidad && cur.q != null && !cur.ptoks.length && T[i - 1] === "de" && u.tipo === "empaque" && u.emp === cur.unidad.emp && u.sing === false) { i += u.n; continue; }   // «galones de galones de cloro»
        if (cur && (cur.ptoks.length || cur.unidad)) cerrar();
        cur = { q: u.sing ? 1 : null, unidad: u, ptoks: [], qImplicita: true, todo };
        i += u.n;
        if (T[i] === "y" && (T[i + 1] === "medio" || T[i + 1] === "media")) { cur.q = (cur.q || 1) + 0.5; cur.qImplicita = false; i += 2; }
        continue;
      }
      if (tok === "y" && T[i + 1] && (esNumTok(T[i + 1]) || unidadEn(T, i + 1))) { i++; continue; }
      if (STOP.has(tok)) { i++; continue; }
      if (!cur) cur = nuevo();
      if (cur.ptoks.length && !STOP.has(tok)) {
        const a = buscarProducto(cur.ptoks.join(" "), cat), b = buscarProducto(tok, cat), j = buscarProducto(cur.ptoks.concat(tok).join(" "), cat);
        if (a.length && a[0].score >= 0.9 && b.length && b[0].score >= 0.9 && a[0].p !== b[0].p && j.length >= 2 && j[1].score >= 0.85) { cerrar(); cur = nuevo(); }
      }
      cur.ptoks.push(tok); i++;
    }
    cerrar();
    // si el producto vino antes de la cantidad: "frutilla dos cajas"
    for (let k = 0; k + 1 < brutos.length; k++) {
      const a = brutos[k], b = brutos[k + 1];
      if (a.ptoks.length && a.q == null && !a.unidad && !b.ptoks.length && (b.q != null || b.unidad)) { b.ptoks = a.ptoks; a.borrar = true; }
    }
    // cantidades en dos partes: "3 cajas y 2 kilos de frutilla"
    for (let k = brutos.length - 2; k >= 0; k--) {
      const a = brutos[k], b = brutos[k + 1];
      if (!a.borrar && !b.borrar && !a.ptoks.length && a.q != null && a.unidad && b.ptoks.length && b.q != null && b.unidad) {
        b.extra = [{ q: a.q, unidad: a.unidad }].concat(a.extra || []).concat(b.extra || []); a.borrar = true;
      }
    }
    let piezas = brutos.filter(x => !x.borrar);
    if (piezas.length > 1) {
      const ruido = piezas.filter(pz => pz.q == null && !pz.unidad && pz.ptoks.length && !buscarProducto(pz.ptoks.join(" "), cat).length && !categoriaDe(pz.ptoks.join(" ")));
      if (ruido.length && ruido.length < piezas.length) { piezas = piezas.filter(pz => !ruido.includes(pz)); R.ignorado = ruido.map(pz => pz.ptoks.join(" ")); R.conf -= 0.05; }
    }

    // ---------- resolver cada pieza ----------
    let unidadAnterior = null;
    piezas.forEach(pz => { if (pz.unidad) unidadAnterior = pz.unidad; else if (pz.q != null && pz.elidida && unidadAnterior && piezas.length > 1) { pz.unidad = unidadAnterior; pz.unidadHeredada = true; } });
    piezas.forEach(pz => {
      if (pz.inner && pz.ptoks.length > pz.inner) { const resto2 = pz.ptoks.slice(pz.inner), c2 = buscarProducto(resto2.join(" "), cat); if (c2.length && c2[0].score >= 0.9) pz.ptoks = resto2; }
    });
    piezas.forEach(pz => {
      const catId = !pz.q && pz.ptoks.length ? categoriaDe(pz.ptoks.join(" ")) : null;
      if (catId) {
        Object.values(prods).filter(p => p.cat === catId && !(p.prep && R.intent === "entrada")).forEach(p => R.items.push({ p: p.id, q: null, todo: pz.todo, deCategoria: catId, alternativas: [] }));
        R.categoria = catId; return;
      }
      const it = { q: null, cant: pz.q, unidadTxt: pz.unidad ? pz.unidad.txt : null, alternativas: [], todo: !!pz.todo && pz.q == null };
      let cand = buscarProducto(pz.ptoks.join(" "), cat);
      // "crema" sola → Crema Reex; "chocolate" solo → cobertura
      if (!cand.length && !pz.ptoks.length) {
        // sin producto: usa el último o pide elegir
        if (pz.unidad && pz.unidad.tipo === "empaque") it.alternativas = Object.values(prods).filter(p => (p.e || []).some(e => e[0] === pz.unidad.emp)).map(p => p.id);
        if (ctx.ultimoProducto && (!it.alternativas.length || it.alternativas.includes(ctx.ultimoProducto))) {
          it.p = ctx.ultimoProducto; it.supuesto = true;
          R.issues.push({ code: "producto_supuesto", msg: "No dijiste el producto; uso el último: " + prods[it.p].n + "." });
          R.conf -= 0.35;
        } else {
          // «10 fundas», «10 de fundas»: sin decir de qué, «fundas» son las del catálogo con ese nombre (las de delivery); se cuentan en paquetes
          const fx = pz.unidad && pz.unidad.tipo === "empaque" && pz.unidad.emp === "funda" && pz.unidad.txt === "fundas" ? buscarProducto("fundas", cat) : [];
          if (fx.length && fx[0].score >= 0.9 && (!fx[1] || fx[0].score - fx[1].score >= 0.05) && (prods[fx[0].p].e || []).some(x => x[0] === "paquete")) {
            it.p = fx[0].p; it.score = fx[0].score; it.alternativas = [];
            pz.unidad = { tipo: "empaque", emp: "paquete", txt: "paquetes", sing: false, n: 1 };
            R.issues.push({ code: "unidad_supuesta", msg: "Entendí " + (pz.q != null ? pz.q : 1) + " paquetes de " + prods[it.p].n + "." }); R.conf -= 0.2;
          } else {
            R.issues.push({ code: "falta_producto", msg: "No dijiste qué producto." + (it.alternativas.length ? " ¿Cuál es?" : "") });
            R.conf -= 0.6;
          }
        }
      } else if (!cand.length) {
        R.issues.push({ code: "producto_desconocido", msg: "No reconozco \"" + pz.ptoks.join(" ") + "\"." });
        R.conf -= 0.6; it.desconocido = pz.ptoks.join(" ");
      } else {
        it.p = cand[0].p; it.score = cand[0].score;
        it.alternativas = cand.slice(1, 4).filter(c => c.score >= cand[0].score - 0.12).map(c => c.p);
        if (cand[0].score < 0.9) { R.conf -= (0.9 - cand[0].score) * 1.2 + 0.08; R.issues.push({ code: "producto_parecido", msg: "Entendí \"" + pz.ptoks.join(" ") + "\" como " + prods[it.p].n + "." }); }
        if (it.alternativas.length && cand[0].score - (cand[1] ? cand[1].score : 0) < 0.05) { R.conf -= 0.2; R.issues.push({ code: "ambiguo", msg: "¿" + [it.p].concat(it.alternativas).map(p => prods[p].n).join(" o ") + "?" }); }
      }
      // «una caja de chocolate»: el chocolate en caja es la cobertura, no el derretido
      if (it.p && pz.unidad && pz.unidad.tipo === "empaque") {
        const p0 = prods[it.p];
        if (p0.compraComo && !(p0.e || []).some(x => x[0] === pz.unidad.emp) && (prods[p0.compraComo].e || []).some(x => x[0] === pz.unidad.emp)) it.p = p0.compraComo;
      }
      // cantidad → unidad base
      const p = it.p ? prods[it.p] : null;
      // «cinco unidades de chantilly»: si el producto viene en «unidad», es ese empaque
      if (p && pz.unidad && pz.unidad.tipo === "unidad" && pz.unidad.base === "u" && p.u !== "u" && (p.e || []).some(x => x[0] === "unidad")) pz.unidad = { tipo: "empaque", emp: "unidad", txt: pz.unidad.txt, n: 1 };
      if (p) {
        const prepDe = (cat && cat.preps ? cat.preps : CAT.PREPARACIONES)[it.p];
        if (R.intent === "produccion" && p.prep && prepDe && pz.q != null && pz.unidad && pz.unidad.tipo === "unidad" && pz.unidad.base === p.u && prepDe.sale > 0) {
          // en kilos (o libras, gramos): se calcula cuántas tandas son
          it.q = Math.round(pz.q * pz.unidad.f * 1000) / 1000; it.tandas = Math.round(it.q / prepDe.sale * 1000) / 1000; it.enPeso = true;
        } else if (R.intent === "produccion" && p.prep) {
          it.tandas = pz.q != null && (!pz.unidad || pz.unidad.emp === "tanda" || pz.unidad.emp === "olla") ? pz.q : 1;
          if (pz.q == null) R.issues.push({ code: "cantidad_supuesta", msg: "Uso 1 tanda." });
        } else if (pz.unidad && pz.unidad.tipo === "unidad") {
          if (pz.unidad.base !== p.u) {
            if (p.u === "u" || pz.unidad.base === "u") {
              const e = (p.e || [])[0];
              R.issues.push({ code: "unidad_rara", msg: p.n + " se cuenta en " + (p.u === "u" ? "unidades" : p.u) + (e ? " o " + e[0] + "s" : "") + "." });
              R.conf -= 0.4; it.q = null;
            } else { R.issues.push({ code: "unidad_rara", msg: "Unidad no compatible con " + p.n + "." }); R.conf -= 0.4; }
          } else it.q = (pz.q != null ? pz.q : 1) * pz.unidad.f;
          it.unidad = p.u;
        } else if (pz.unidad && pz.unidad.tipo === "empaque") {
          let e = (p.e || []).find(x => x[0] === pz.unidad.emp);
          if (!e) { for (const alt of (EQUIV[pz.unidad.emp] || [])) { e = (p.e || []).find(x => x[0] === alt); if (e) break; } if (e) R.conf -= 0.1; }
          if (!e && pz.unidad.emp === "tanda" && prods[it.p].prep) { R.intent = "produccion"; it.tandas = pz.q || 1; }
          else if (!e && ["recipiente", "olla", "balde"].includes(pz.unidad.emp) && p.u === "kg" && R.intent !== "produccion") { R.issues.push({ code: "falta_cantidad", msg: "¿Cuántos kilos (o libras) de " + (p.f || p.n.toLowerCase()) + "? Los " + pz.unidad.emp + "s se pesan." }); R.conf -= 0.4; }
          else if (!e) { e = (p.e || [])[0]; R.issues.push({ code: "empaque_raro", msg: p.n + " no viene en " + pz.unidad.emp + (e ? "; uso " + e[0] : "") + "." }); R.conf -= 0.35; }
          if (e && !R.issues.some(x => x.code === "falta_cantidad" && /se pesan/.test(x.msg))) { it.q = (pz.q != null ? pz.q : 1) * e[1]; it.emp = e[0]; it.unidad = e[0]; }
        } else if (pz.q != null) {
          // sin unidad: unidades si se cuenta por unidad; si no, el empaque principal
          if (p.u === "u") { it.q = pz.q; it.unidad = "u"; }
          else {
            const e = (p.e || [])[0];
            if (e && e[1] > 1 && pz.q <= 20) { it.q = pz.q * e[1]; it.emp = e[0]; it.unidad = e[0]; R.issues.push({ code: "unidad_supuesta", msg: "Entendí " + pz.q + " " + (pz.q === 1 ? e[0] : e[0] + "s") + "." }); R.conf -= 0.2; }
            else { it.q = pz.q; it.unidad = p.u; R.issues.push({ code: "unidad_supuesta", msg: "Entendí " + pz.q + " " + p.u + "." }); R.conf -= 0.2; }
          }
        } else if (R.intent !== "consulta" && R.intent !== "pedido" && R.intent !== "agotado" && R.intent !== "entrada" && R.intent !== "recepcion" && R.intent !== "traslado" && R.intent) {
          R.issues.push({ code: "falta_cantidad", msg: "¿Cuánto?" }); R.conf -= 0.5;
        }
        if (it.q != null && pz.extra) {
          pz.extra.forEach(x => {
            if (x.unidad.tipo === "unidad" && x.unidad.base === p.u) it.q += x.q * x.unidad.f;
            else if (x.unidad.tipo === "empaque") { const e = (p.e || []).find(y => y[0] === x.unidad.emp) || (p.e || [])[0]; if (e) it.q += x.q * e[1]; }
          });
          it.unidad = p.u;
        }
        if (it.q != null) it.q = Math.round(it.q * 1000) / 1000;
      }
      R.items.push(it);
    });

    if ((R.intent === "entrada" || R.intent === "recepcion") && !R.proveedor && R.items.length && R.items.every(it => !it.p && !it.desconocido)) {
      const suelto = piezas.find(pz => pz.q != null || pz.unidad);
      R.cantidadSuelta = suelto ? { q: suelto.q != null ? suelto.q : 1, emp: suelto.unidad && suelto.unidad.tipo === "empaque" ? suelto.unidad.emp : null, base: suelto.unidad && suelto.unidad.tipo === "unidad" ? suelto.unidad : null } : null;
      R.items = []; R.issues = R.issues.filter(x => x.code !== "falta_producto" && x.code !== "producto_supuesto"); R.conf = Math.min(R.conf + 0.6, 0.8);
      R.intent = "recepcion";
    }
    if (R.intent === "entrada" && !R.items.length && !R.proveedor) R.intent = "recepcion";
    if (R.intent === "entrada" && R.proveedor) R.items.forEach(it => { const pr = it.p && prods[it.p]; if (pr && pr.compraComo) { const otro = prods[pr.compraComo]; it.p = otro.id; if (it.emp) { const e = (otro.e || []).find(x => x[0] === it.emp) || (otro.e || [])[0]; if (e && it.cant != null) it.q = it.cant * e[1]; } } });
    if (!R.items.length && R.intent !== "recepcion" && R.intent !== "consulta") {
      if (!R.intent) { R.intent = "desconocido"; R.conf = 0; R.issues.push({ code: "no_entendi", msg: "No entendí la orden." }); return R; }
      if (R.intent !== "produccion") { R.issues.push({ code: "falta_producto", msg: "No dijiste qué producto." }); R.conf -= 0.6; }
    }

    // ---------- intención por defecto y dirección ----------
    if (!R.intent) {
      if (R.items.length && R.items.every(x => x.p)) { R.intent = "traslado"; R.conf -= 0.2; R.issues.push({ code: "verbo_supuesto", msg: "No dijiste qué hacer; entendí que sale de " + CAT.LUGARES[deX || ctx.lugar || "L"].art + "." }); }
      else { R.intent = "desconocido"; R.conf = Math.min(R.conf, 0.2); }
    }
    if (R.intent === "produccion") {
      const it = R.items.find(x => x.p && prods[x.p].prep);
      const verboAumento = /\b(proces\w*|produc\w*|produj\w*|aument\w*|agreg\w*|sum(ar|a|o|amos|aron|e|en)|hicieron|hizo|elabor\w*)\b/.test(t);
      const aumentos = R.items.filter(x => x.p && !prods[x.p].prep && x.q != null);
      if (!it && verboAumento && aumentos.length) {
        R.intent = "entrada"; R.aumento = true; R.proveedor = true; R.items = aumentos;
        R.issues = R.issues.filter(x => x.code !== "cantidad_supuesta");
        R.lugar = enX || ctx.lugar || "B"; R.a = R.lugar; R.de = null;
      } else if (!it) {
        // "hacer crema" → crema reex
        if (/crema/.test(t)) R.items = [{ p: "crema_reex", tandas: 1 }];
        else if (/dulce|almibar/.test(t)) R.items = [{ p: "dulce_fresa", tandas: 1 }];
        else { R.issues.push({ code: "no_preparable", msg: "Solo se preparan crema Reex y dulce de fresa." }); R.conf -= 0.6; }
      } else R.items = [it];
      R.lugar = enX || "P"; R.de = R.a = R.lugar;   // se prepara en producción
    }
    const L0 = ctx.lugar || "L";
    if (R.intent === "traslado") {
      const devolver = /\b(devolver|devuelve|devuelvo|devolvi|devolvemos|regresar|regresa|regreso|regrese|regresamos)\b/.test(t);
      if (!aX && enX && enX !== (deX || L0)) aX = enX;   // «pon cuatro cajas de la bodega en producción»: es el destino
      if (deX && aX && deX === aX) { R.issues.push({ code: "direccion", msg: "El origen y el destino son el mismo lugar." }); R.conf -= 0.5; }
      const its = R.items.filter(x => x.p && prods[x.p]).map(x => prods[x.p]);
      if (deX && aX) { R.de = deX; R.a = aX; }
      else if (aX) {
        R.a = aX;
        if (aX !== L0) R.de = L0;
        else { const o = unico(its.map(p => { const x = anteriorDe(p, aX); return x !== aX ? x : siguienteDe(p, aX); }), aX === "B" ? "L" : "B"); R.de = o.v; }
        if (R.de === R.a) R.de = R.a === "B" ? "L" : "B";
      }
      else {
        R.de = deX || L0;
        // sin destino dicho: cada producto sigue su recorrido (materia prima → producción; lo que no se prepara → local)
        const d = devolver ? unico(its.map(p => anteriorDe(p, R.de)), R.de === "B" ? "L" : "B") : unico(its.map(p => siguienteDe(p, R.de)), R.de === "B" ? "L" : R.de === "P" ? "L" : "B");
        R.a = d.v; R.aAuto = true; if (d.mixto) R.mixto = true;
        if (R.a === R.de) R.a = R.de === "B" ? "L" : "B";
      }
    } else if (R.intent === "pedido") {
      const its = R.items.filter(x => x.p && prods[x.p]).map(x => prods[x.p]);
      if (vocX && !deX && !aX && vocX !== (paraX || enX || L0)) aX = vocX;   // «producción, mándame…»: se le pide a producción
      R.de = paraX || enX || L0;
      // «necesito crema para producción, pídela a la bodega»: pide producción y despacha la bodega
      if (paraX && aSolo && aSolo !== paraX) aX = aSolo;
      else if (paraX && !deX) aX = null;
      if (aX && aX === R.de && !deX) R.de = aX;            // «mándame … al local» dicho en el local
      // la bodega no pide lo que se prepara: «necesito crema» o «pide crema a la bodega» es para producción, donde se hace
      if (R.de === "B" && !paraX && !enX && its.length && its.every(p => p.prep && (p.hecho || "P") === "P")) { R.de = "P"; if (aX === "P") aX = null; }
      const prov = unico(its.map(p => anteriorDe(p, R.de)), R.de === "B" ? "L" : "B");
      R.a = deX || (aX && aX !== R.de ? aX : null) || prov.v;
      if (R.a === R.de) R.a = R.de === "B" ? "L" : "B";
      if (!deX && !(aX && aX !== R.de)) { R.aAuto = true; if (prov.mixto) R.mixto = true; }
    } else if (R.intent === "merma" || R.intent === "conteo" || R.intent === "consulta" || R.intent === "agotado") {
      R.lugar = enX || deX || aX || L0;
    } else if (R.intent === "entrada") {
      R.a = aX || enX || L0; R.aDicho = !!(aX || enX);   // sin decir dónde: si no hay un envío en camino, la entrada del proveedor va a la bodega (acciones)
    } else if (R.intent === "recepcion") {
      R.a = enX || aX || L0;
    }
    if (R.intent === "conteo" && R.items.some(x => x.q == null)) R.issues.push({ code: "falta_cantidad", msg: "¿Cuánto contaste?" });
    R.conf = Math.max(0, Math.min(1, Math.round(R.conf * 100) / 100));
    R.listo = R.conf >= 0.5 && !R.issues.some(x => x.code === "ambiguo") && !R.issues.some(x => ["falta_producto", "producto_desconocido", "falta_cantidad", "no_entendi", "direccion", "unidad_rara", "no_preparable"].includes(x.code))
      && R.items.every(x => x.p && (x.q != null || x.tandas != null || R.intent === "consulta" || R.intent === "pedido" || R.intent === "agotado" || R.intent === "traslado"));
    return R;
  }

  /* «quita una caja de frutilla, no perdón, dos cajas»: vale lo que se dijo después de corregirse */
  const CORRIGE = /\b(?:no )?(?:perdon|perdona|mejor dicho|corrijo|no no|digo no|me corrijo|quise decir)\b/;
  // (1-nov-2026) «lleva dos, no, tres baldes», «dos baldes, digo, tres»: un «no» o un «digo» entre dos cantidades también es corregirse
  const NUM_C = "(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|medio|media|\\d+(?:[.,]\\d+)?)";
  const CORRIGE_NUM = new RegExp("(?<=\\b" + NUM_C + "(?: [a-z]+)? ,? ?)(?:no|digo|o sea|osea)(?= ,? ?" + NUM_C + "\\b)");
  function interpretarConCorreccion(frase, ctx) {
    const t = normalizar(frase);
    const m = t.match(CORRIGE) || t.match(CORRIGE_NUM);
    if (!m || m.index === 0) return interpretar(frase, ctx);
    const antes = t.slice(0, m.index).trim(), despues = t.slice(m.index + m[0].length).trim();
    if (!despues) return interpretar(antes, ctx);
    const ctx0 = Object.assign({}, ctx || {}, { ultimoProducto: null });
    const Ra = interpretar(antes, ctx0), Rd = interpretar(despues, ctx0);
    let nueva = despues;
    const verbo = (() => { const x = quitarRelleno(antes); for (const [nom, re] of VERBOS) { const k = x.match(re); if (k) return { nom, txt: k[0] }; } return null; })();
    const tieneVerbo = VERBOS.some(([, re]) => re.test(quitarRelleno(despues)));
    const prodA = Ra.items.find(it => it.p);
    const prodD = Rd.items.some(it => it.p && !it.supuesto);
    const td = quitarRelleno(despues).split(" ");
    const tieneNum = td.some(w => esNumTok(w)), tieneUni = td.some((w, k) => unidadEn(td, k));
    if (tieneNum && !tieneUni && prodA && prodA.unidadTxt && !prodD) nueva += " " + (prodA.cant === 1 || !/s$/.test(prodA.unidadTxt) ? prodA.unidadTxt : prodA.unidadTxt);
    if (!tieneNum && prodD && prodA && prodA.cant != null) nueva = prodA.cant + " " + (prodA.unidadTxt || "") + " " + nueva;
    if (!prodD && prodA) { const P0 = (ctx && ctx.cat ? ctx.cat.prods : Object.fromEntries(CAT.PRODUCTOS.map(p => [p.id, p])))[prodA.p]; nueva += " de " + (P0.f || P0.n.toLowerCase()); }
    if (!tieneVerbo && verbo) nueva = verbo.txt + " " + nueva;
    const lugares = antes.match(/\b(de|del|al|a la|para el|para la) (bodega|local)\b/g);
    if (lugares && !/\b(bodega|local)\b/.test(despues)) nueva += " " + lugares.join(" ");
    const R = interpretar(nueva, ctx);
    R.crudo = frase; R.corregido = nueva;
    R.issues.push({ code: "autocorreccion", msg: "Te corregiste: uso lo último que dijiste (" + nueva + ")." });
    R.conf = Math.max(0, Math.round((R.conf - 0.1) * 100) / 100);
    return R;
  }

  /* Varias alternativas del dictado: se queda con la mejor interpretación. */
  function interpretarMejor(alts, ctx) {
    const lista = (alts || []).filter(a => a && a.t);
    if (!lista.length) return interpretarConCorreccion("", ctx);
    let mejor = null;
    lista.forEach((a, k) => {
      const r = interpretarConCorreccion(a.t, ctx);
      const asr = a.c != null && a.c > 0 ? a.c : (k === 0 ? 0.9 : 0.8);
      r.puntaje = r.conf * (0.6 + 0.4 * asr) - k * 0.03 + (r.listo ? 0.2 : 0);
      r.asr = asr;
      if (!mejor || r.puntaje > mejor.puntaje) mejor = r;
    });
    mejor.alternativasDictado = lista.map(a => a.t);
    // si el dictado dudó, bajar un poco la confianza
    if (mejor.asr < 0.6) { mejor.conf = Math.max(0, Math.round((mejor.conf - 0.15) * 100) / 100); mejor.issues.push({ code: "dictado_dudoso", msg: "El micrófono no estaba seguro de lo que escuchó." }); }
    return mejor;
  }

  /* ===== Lo que la persona cuenta cuando llega un envío =====
     «llegó una lata de durazno abierta y las demás todavía», «faltó una caja», «no llegó el banano»,
     «llegaron las dos pero una está golpeada», «llegaron 3 de 4 cajas»…
     items: lo que salió [{p, q, emp}]. Devuelve { cant: {p: q recibida}, obs, cambios, entendido }.
     Regla: lo que describe un estado (abierta, golpeada, dañada…) es una NOVEDAD y no cambia la cantidad,
     salvo que diga que faltan («solo», «faltó», «no llegó», «las demás todavía»). */
  // (31-oct, video 1433: «la frutilla llegó pequeña», «muy grande», «estaba regada», «la lata golpeada», «las Oreo vinieron en un frasco pequeño»)
  const POS_CL = "(si|sip|claro|correcto|exacto|perfecto|listo|todo bien|todo correcto|todo en orden|todo completo|todo perfecto|esta todo bien|en orden|normal|todo normal|" +
    "(el pedido )?(esta|llego|vino|llegaron|vinieron) (todo |todos |todas )?(correcto|correctos|completo|completos|completa|bien|perfecto)( el pedido)?|(esta )?correcto el pedido|" +
    "el pedido (esta |llego |vino )?(todo )?(correcto|completo|bien|perfecto)|(no hay|no tengo|no hubo|sin|cero|ninguna|ningun|ninguno) (ninguna |ningun |alguna )?" +
    "(observacion|observaciones|novedad|novedades|problema|problemas|inconveniente|inconvenientes)|nada|ninguna|ninguno|gracias|rex)";
  const POS_LLEGADA = new RegExp("^" + POS_CL + "( " + POS_CL + ")*$");
  const COND_LLEGADA = new RegExp("\\b(" + 'abiert[oa]s?|rot[oa]s?|golpead[oa]s?|aplastad[oa]s?|danad[oa]s?|mojad[oa]s?|derramad[oa]s?|regad[oa]s?|vencid[oa]s?|caducad[oa]s?|podrid[oa]s?|mal estado|malograd[oa]s?|suci[oa]s?|derretid[oa]s?|rajad[oa]s?|abollad[oa]s?|destapad[oa]s?|sin tapa|hinchad[oa]s?|reventad[oa]s?|madur[oa]s?|aguad[oa]s?|calientes?|manchad[oa]s?|picad[oa]s?|hongos?|huele mal|mal olor|fe[oa]s?|mal[oa]s?|chancad[oa]s?|machucad[oa]s?|estropead[oa]s?|huec[oa]s?|huequit[oa]s?|agujer[oa]s?|perforad[oa]s?|fisurad[oa]s?|fisuras?|rajaduras?|gote(a|ando)|chorre(a|ando)|bota(ndo)? (liquido|agua|jugo)|pinchad[oa]s?|cortad[oa]s?|descongelad[oa]s?|tibi[oa]s?' + "|" + 'pequen[oa]s?|pequenit[oa]s?|chiquit[oa]s?|chic[oa]s?|menudit[oa]s?|enanas?|grandes?|grandot[oa]s?|enormes?|gigantes?|verdes?|biches?|tiern[oa]s?|bland(it)?[oa]s?|duras?|duros|arrugad[oa]s?|marchit[oa]s?|sec[oa]s?|pasad[oa]s?|fermentad[oa]s?|acid[oa]s?|agri[oa]s?|desabrid[oa]s?|sin sabor|congelad[oa]s?|frias?|frios?|deformad[oa]s?|abombad[oa]s?|inflad[oa]s?|raspad[oa]s?|magullad[oa]s?|lastimad[oa]s?|chafad[oa]s?|aplanad[oa]s?|desarmad[oa]s?|desbaratad[oa]s?|quebrad[oa]s?|partid[oa]s?|despedazad[oa]s?|hech[oa]s? (pure|papilla|polvo|nada)|en mal estado|por vencer|fecha vencida|sin etiqueta|mal sellad[oa]s?|sin sello|desellad[oa]s?|humed[oa]s?|humedad|mojadit[oa]s?|feisim[oa]s?|horribles?|rar[oa]s?|extran[oa]s?|mitad vaci[oa]|medi[oa] vaci[oa]|a medias|a la mitad|incomplet[oa]s?|regadit[oa]s?|tirad[oa]s?|(se|se le|se les) (rompio|rompieron|rego|regaron|derramo|derramaron|abrio|abrieron|dano|danaron|aplasto|aplastaron|mojo|mojaron|derritio|derritieron|golpeo|golpearon|cayo|cayeron|revento|reventaron|maltrato|maltrataron|machuco|machucaron|chanco|chancaron|pudrio|pudrieron|paso|pasaron)|(en|un|una|otr[oa]) (frasco|envase|tarro|funda|bolsa|caja|paquete|presentacion|marca|tamano)s? (pequen\\\\w*|chiquit\\\\w*|grande\\\\w*|distint\\\\w*|diferente\\\\w*|otr\\\\w*|rot\\\\w*|abiert\\\\w*)|(otro|otra|distinto|distinta|diferente) (tamano|marca|presentacion|envase|empaque|calibre|color|sabor|funda|caja|bolsa|frasco|tarro|paquete)|(en|con) (otr[oa]s?|distint[oa]s?|diferentes?) (frasco|envase|tarro|funda|bolsa|caja|paquete|presentacion|marca|empaque)s?' + ")\\b");
  function analizarLlegada(frase, items, ctx) {
    ctx = ctx || {};
    const prods = ctx.cat ? ctx.cat.prods : Object.fromEntries(CAT.PRODUCTOS.map(p => [p.id, p]));
    // (2-nov-2026) «no hay ninguna novedad con las latas, excepto que…», «sin problema con la frutilla»: eso no dice que algo no llegó
    const t = normalizar(frase).replace(/[,.;]/g, " , ").replace(/\b(?:(?:no hay|no tengo|no existe|sin|no hubo) (?:ninguna |ningun |alguna |algun )?|(?:ninguna|ningun|cero|nada de) )(?:novedad|novedades|problema|problemas|inconveniente|inconvenientes|observacion|observaciones)(?: (?:con|en) (?:el|la|los|las|lo) [a-z]+(?: (?!excepto|salvo|solo|pero|aunque|sin|y\b|e\b)[a-z]+)?)?\b/g, " todo bien , ").replace(/\s+/g, " ").trim();
    const ids = items.map(it => it.p);
    const enviado = Object.fromEntries(items.map(it => [it.p, it.q]));
    const cant = Object.assign({}, enviado), mencion = {};
    let obs = false, entendido = false;
    const unoSolo = items.length === 1 ? items[0].p : null;
    // la unidad de un número suelto: la que dijo, o el empaque del envío, o el principal del producto
    const factor = (p, emp) => { const pr = prods[p]; const e = emp ? (pr.e || []).find(x => x[0] === emp) : null; if (e) return e[1];
      const it = items.find(x => x.p === p); const e2 = it && it.emp ? (pr.e || []).find(x => x[0] === it.emp) : null; if (e2) return e2[1];
      const e0 = (pr.e || [])[0]; return e0 && pr.u !== "u" ? e0[1] : 1; };
    // productos que se nombran en un pedazo de la frase
    const productosEn = cl => {
      const R = interpretar("llegaron " + cl, { lugar: ctx.lugar || "L", cat: ctx.cat });
      const its = (R.items || []).filter(x => x.p && ids.includes(x.p));
      if (its.length) return its.map(x => ({ p: x.p, q: x.q, emp: x.emp }));
      if (unoSolo) { const cs = R.cantidadSuelta; return [{ p: unoSolo, q: cs && cs.q != null ? cs.q * (cs.emp ? factor(unoSolo, cs.emp) : cs.base ? cs.base.f : factor(unoSolo)) : null, emp: cs && cs.emp }]; }
      return [];
    };
    const numero = w => { const T = [w]; const n = numeroEn(T, 0); return n ? n.v : null; };
    const nombresProd = Array.from(new Set(ids.flatMap(p => [prods[p].n].concat(prods[p].sin || [])).map(x => normalizar(String(x)).replace(/[()]/g, " ").replace(/\s+/g, " ").trim()).filter(x => x.includes(" ") || x.length > 3))).sort((a, b) => b.length - a.length);
    const nombresFuera = cl => { let x = " " + cl + " "; nombresProd.forEach(nm => { x = x.split(" " + nm + " ").join(" producto "); }); return x.trim(); };
    // se parte en pedazos: «… y …», «… pero …», «… , …»
    const pedazos = t.split(/\s*(?:,|\by\b|\bpero\b|\bmas\b|\bademas\b|\bsino\b|\baunque\b|\bexcepto(?: que)?\b|\bsalvo(?: que)?\b|\bsolo que\b|\bsin embargo\b|\bnada mas que\b)\s*/).map(x => x.trim()).filter(Boolean);
    let restoMal = false, restoBien = false; const soloEstos = new Set(), novedades = [];
    pedazos.forEach(cl => {
      // «no llegó (todo) bien», «no vino en buen estado»: es una queja de cómo llegó, no que no llegó (31-oct, video 1433)
      if (/\bno (llego|llegaron|vino|vinieron|esta|estaba|estan|estaban) (todo |toda |muy |tan |del todo )?(bien|en buen estado|como (debia|debe|deberia|era|esperabamos)|perfect[oa]s?|bonit[oa]s?|buen[oa]s?)\b/.test(cl)) {
        obs = true; entendido = true;
        const resto = cl.replace(/^.*?\bno (llego|llegaron|vino|vinieron|esta|estaba|estan|estaban) (todo |toda |muy |tan |del todo )?(bien|en buen estado|como (debia|debe|deberia|era|esperabamos)|perfect[oa]s?|bonit[oa]s?|buen[oa]s?)\b\s*/, "").trim();
        if (resto.split(" ").length >= 2) novedades.push(resto);
        return;
      }
      const sinVerbo = cl.replace(/^(ya |si |no |solo |solamente )*(llego|llegaron|vino|vinieron|entro|entraron|recibimos|recibi)\s+/, "");
      // «las demás todavía», «las otras no llegan», «el resto falta»
      if (/\b(las|los|el|lo) (demas|otras|otros|resto)\b/.test(cl)) {
        if (/\b(todavia|no|faltan?|aun|pendientes?|despues|luego)\b/.test(cl) && !/\b(bien|buen[oa]s?|complet[oa]s?|cerrad[oa]s?|ok|perfect[oa]s?|normales?|sanas?)\b/.test(cl)) restoMal = true;
        else restoBien = true;
        entendido = true; return;
      }
      if (/\b(todo|todas|todos|complet[oa]s?)\b/.test(cl) && !/\bno\b/.test(cl)) { restoBien = true; entendido = true; }
      // el nombre del producto no cuenta como estado («nuez picada», «vasos pequeños», «leche en polvo»)
      const cond = COND_LLEGADA.test(nombresFuera(cl));
      const falta = /\bfalt(a|o|aron|an|ando)\b/.test(cl);
      const noLlego = /\bno (llego|llegaron|vino|vinieron|hay|entro)\b/.test(cl) || /\b(no llego|no vino) nada\b/.test(cl) || /^(el|la|los|las) [a-z ]+ no$/.test(cl);
      const nada = /\b(nada|ninguna|ninguno)\b/.test(cl) && !cond;
      const solo = /\b(solo|sola|solos|solas|solamente|nomas|no mas|apenas|unicamente)\b/.test(cl);
      const deY = cl.match(/\b(\S+) de (?:las |los )?(\S+)\b/);
      let ps = productosEn(sinVerbo.replace(/\b(solo|sola|solos|solas|solamente|nomas|apenas|unicamente)\b/g, " ").replace(/\b(falt(a|o|aron|an|ando)|no)\b/g, " "));
      if (nada && !ps.length) { ids.forEach(p => { cant[p] = 0; }); entendido = true; return; }
      // «llegó la mitad», «solo la mitad del durazno», «llegó un cuarto», «tres cuartos»
      { const fr = /\b(la mitad|mitad)\b/.test(cl) ? 0.5 : /\btres cuartos\b/.test(cl) ? 0.75 : /\b(un cuarto|la cuarta parte)\b/.test(cl) ? 0.25 : /\b(la tercera parte|un tercio)\b/.test(cl) ? 1 / 3 : /\b(dos tercios)\b/.test(cl) ? 2 / 3 : null;
        if (fr != null && !cond && ps.every(x => x.q == null || !/\d|\b(un|una|dos|tres)\b/.test(sinVerbo.replace(/\b(la mitad|mitad|tres cuartos|un cuarto|la cuarta parte|la tercera parte|un tercio|dos tercios)\b/g, "")))) {
          const ps2 = ps.length && !unoSolo ? ps : ids.map(p => ({ p }));
          ps2.forEach(x => { cant[x.p] = Math.round(enviado[x.p] * (falta ? 1 - fr : fr) * 1000) / 1000; }); entendido = true; return; } }
      if (nada) ps.forEach(x => { cant[x.p] = 0; });
      if (cond) { obs = true; entendido = true; novedades.push(cl.replace(/^(y|e|pero|aunque|solo que|lo que pasa es que|el problema es que|eso si|eso)\s+/, "").trim()); ps.forEach(x => { if (x.q != null) mencion[x.p] = x.q; }); }
      // «llegaron 3 de 4 cajas» / «una caja de las dos»
      if (deY && numero(deY[1]) != null && numero(deY[2]) != null && !cond) {
        const p = ps.length ? ps[0].p : unoSolo;
        if (p) { const f = factor(p, (ps[0] || {}).emp); cant[p] = numero(deY[1]) * f; entendido = true; return; }
      }
      // «llegó solo la frutilla»: lo demás no llegó
      if (solo && !cond && !falta && !noLlego && ps.length && ps.every(x => x.q == null) && !unoSolo) { ps.forEach(x => soloEstos.add(x.p)); entendido = true; }
      ps.forEach(x => {
        if (noLlego || (nada && x.q == null)) { cant[x.p] = 0; entendido = true; return; }
        if (falta) { cant[x.p] = x.q != null ? Math.max(0, Math.round((enviado[x.p] - x.q) * 1000) / 1000) : 0; entendido = true; return; }
        if (cond) return;   // describe un estado: la cantidad no cambia
        if (x.q != null) { cant[x.p] = x.q; entendido = true; if (!solo) mencion[x.p] = x.q; }
      });
    });
    if (soloEstos.size) ids.forEach(p => { if (!soloEstos.has(p)) cant[p] = 0; });
    // «… y las demás todavía»: solo llegó lo que se nombró
    if (restoMal) ids.forEach(p => { cant[p] = mencion[p] != null ? mencion[p] : (cant[p] !== enviado[p] ? cant[p] : 0); });
    Object.keys(cant).forEach(p => { cant[p] = Math.max(0, Math.min(cant[p], Math.max(cant[p], 0))); });
    const cambios = ids.filter(p => Math.abs(cant[p] - enviado[p]) > 0.0005);
    // la novedad en limpio: solo lo que cuenta cómo llegó («la frutilla llegó pequeña»), sin «sí, llegó bien, pero…»
    // (con las tildes de lo que se dijo: se busca el mismo pedazo en la frase original)
    // (se compara palabra por palabra con la frase original, cada una en minúsculas y sin tildes)
    const ow = String(frase).replace(/[,.;]/g, " , ").replace(/\s+/g, " ").trim().split(" "), tw = ow.map(w => normalizar(w));
    const original = cl => { const cw = cl.split(" "); for (let i = 0; i + cw.length <= tw.length; i++) if (cw.every((w, k) => tw[i + k] === w)) return ow.slice(i, i + cw.length).join(" ").toLowerCase(); return cl; };
    // (2-nov-2026) la novedad dicha a medias («está muy pequeña», «muy maduro», «un poco aplastada») lleva el nombre del producto: «la frutilla está muy pequeña»
    const nombreDe = p => { const n0 = String((prods[p] || {}).n || p).toLowerCase(), w0 = n0.split(" ")[0]; return (/as$/.test(w0) ? "las " : /s$/.test(w0) ? "los " : /a$|ión$|ez$|ud$|ad$|^(leche|miel|sal|carne|crema)$/.test(w0) ? "la " : "el ") + n0; };
    // de quién se habla: el producto como lo dijo («el durazno», «los huevos»), o el único que se envió
    const dicho = (() => { const vistos = new Set(); let txt = null;
      ids.forEach(p => [prods[p].n].concat(prods[p].sin || []).map(x => normalizar(String(x)).replace(/[()]/g, " ").replace(/\s+/g, " ").trim()).filter(x => x.length > 2).sort((a, b) => b.length - a.length).some(nm => {
        const m = tw.join(" ").match(new RegExp("\\b(el|la|los|las) " + nm.replace(/[.*+?^${}|[\]\\]/g, "\\$&") + "\\b")); if (m) { vistos.add(p); txt = original(m[0]); return true; } return false; }));
      return vistos.size === 1 ? txt : null; })();
    const sujeto = dicho || (unoSolo ? nombreDe(unoSolo) : null);
    const VERBO = /(^|\s)(esta|está|estan|están|estaba|estaban|llego|llegó|llegaron|vino|vinieron|viene|vienen|tiene|tienen|tenia|tenía|hay|habia|había|es|son|era|eran|se|falta|faltan|falto|faltó|faltaron|parece|parecen|huele|gotea|chorrea|bota)(?=\s|$)/i;
    const conSujeto = x => {
      let y = x.replace(/^(todo|todos|todas)\s+(llego|llegó|llegaron|vino|vinieron|esta|está|estan|están)?\s*(bien|completo|completos|correcto)?\s*/i, "").replace(/^(llego|llegó|llegaron|vino|vinieron)\s+(bien|completo|completa|completos|completas|correcto)\s*/i, "").trim();
      if (!y) return x;
      if (!sujeto) return y;
      const plural = /^(los|las)\s/i.test(sujeto), esta = plural ? "están " : "está ";
      // «está muy pequeña», «muy maduro», «llegó golpeada» → con el producto delante
      if (/^(esta|está|estan|están|llego|llegó|llegaron|vino|vinieron)(?=\s|$)/i.test(y)) return sujeto + " " + y;
      if (/^(muy|un poco|algo|bastante|demasiado|medio|super|súper)(?=\s|$)/i.test(y)) return sujeto + " " + esta + y;
      // solo el estado, sin verbo ni producto («aunque mojados», «aunque vencido», «en otra funda»)
      if (!VERBO.test(y) && !/^(el|la|los|las|un|una|unos|unas)\s/i.test(y)) return sujeto + " " + esta + y;
      return y;
    };
    const limpia = Array.from(new Set(novedades.filter(Boolean).map(original).map(conSujeto))).join("; ");
    // «no llegó todo bien» sin decir qué: es una queja sin detalle (la pantalla pregunta «¿Qué pasó?»)
    return { cant, obs: obs ? (limpia ? limpia.charAt(0).toUpperCase() + limpia.slice(1) : String(frase).trim()) : "", generico: obs && !limpia && !cambios.length, cambios, entendido: entendido || obs, completo: !cambios.length };
  }

  /* ===== Seguimientos de la orden anterior =====
     «lo mismo de durazno», «y también tres de leche», «otro igual», «uno más», «de nuevo»: se completan con la orden de antes
     (mismo tipo de movimiento, mismo origen y destino) y se devuelve una frase completa que el intérprete ya entiende.
     ultima = { intent, de, a, items: [{ p, cant, unidadTxt }] }; ctx.nombreDe(id) da el nombre del producto. null = no es un seguimiento. */
  const LUGN = { B: "bodega", P: "producción", L: "local" };
  function seguir(frase, ultima, ctx) {
    ctx = ctx || {};
    if (!ultima || !ultima.items || !ultima.items.length || !["traslado", "pedido", "merma", "entrada", "conteo"].includes(ultima.intent)) return null;
    const n = normalizar(frase).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();
    if (!n || n.split(" ").length > 12) return null;
    const nom = ctx.nombreDe || (id => id), ult = ultima.items[0];
    const armar = items => {
      const it = items.map(x => ((x.cant != null ? x.cant + " " + (x.unidadTxt || "") : "") + " de " + nom(x.p)).replace(/\s+/g, " ").trim().replace(/^de /, "")).join(" y ");
      const L = x => LUGN[x] || "";
      if (ultima.intent === "traslado") return "mueve " + it + " de " + L(ultima.de) + " a " + L(ultima.a);
      if (ultima.intent === "pedido") return "necesito " + it;
      if (ultima.intent === "merma") return "se dañaron " + it;
      if (ultima.intent === "entrada") return "ingresaron " + it;
      return "hay " + it;
    };
    // repetir la orden entera
    if (/^(y )?(otro|otra) igual$|^(lo mismo|igual|lo mismo otra vez|de nuevo|otra vez|una vez mas|repite (la orden|el movimiento|el pedido|eso|lo anterior|lo mismo)|repitelo|repitela|haz lo mismo|hazlo de nuevo)$/.test(n)) return armar(ultima.items);
    // una más
    if (/^(y )?(uno|una|otro|otra|un) mas$/.test(n)) return armar([{ p: ult.p, cant: 1, unidadTxt: ult.unidadTxt }]);
    let m = n.match(/^(?:y )?(?:tambien |ademas |aparte )?(?:lo mismo|igual|otro igual|otra igual|el mismo|la misma)(?: pero)?(?: de| con| para| en)? (.+)$/), resto = m && m[1], mismo = !!m;
    if (!resto) { m = n.match(/^(?:y tambien|y ademas|tambien|ademas|aparte|y) (.+)$/); resto = m && m[1]; }
    if (!resto) return null;
    // lo que sigue tiene que ser solo productos y cantidades (sin verbo ni lugar): si trae su propia orden, no es un seguimiento
    const R = interpretar(resto, { lugar: ctx.lugar || "B", cat: ctx.cat });
    if (!(R.issues || []).some(i => i.code === "verbo_supuesto") || !(R.items || []).some(x => x.p)) return null;
    const items = R.items.filter(x => x.p).map(x => {
      const dijoCant = x.cant != null;
      return { p: x.p, cant: dijoCant ? x.cant : ult.cant, unidadTxt: dijoCant ? (x.unidadTxt || x.emp || x.unidad || ult.unidadTxt) : (ult.unidadTxt || x.emp || x.unidad) };
    });
    return armar(items);
  }

  // ---------- el responsable: cualquier nombre, dicho de muchas formas ----------
  /* «Ana», «Ana es la responsable», «yo, Ana», «soy Rosa», «fue Marta», «lo hizo Luis», «hoy es Pedro»,
     «Ana y Rosa». Los nombres cambian de un día a otro: se reconocen los de la lista (con apodos y dictado aproximado)
     y cualquier otro nombre corto que no sea una orden, un producto ni una muletilla se acepta como nombre nuevo. */
  const NO_NOMBRE = new Set(("sin si no nada nadie ninguno ninguna todos todas alguien eh em este pues bueno ya ok okey oke listo claro ah mira hola buenas buenos dias tardes noches dime rex reex jarvis " +
    "oye hey ey ola asistente rexito bien perfecto gracias porfa favor vale dale ahi aqui aca alla ahora ahorita luego despues antes ayer hoy manana siempre nunca tambien ademas aparte igual mismo misma mas menos " +
    "otro otra otros otras uno una unos unas dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince veinte treinta cuarenta cincuenta cien mil medio media " +
    "lleva llevar llevo llevale mueve mover muevo pon poner dame dar pasa pasar saca sacar manda mandar envia enviar trae traer hay habia tiene tengo necesito necesita quiero quieres puedo puedes puede hacer hace hizo hice hago registra registro registrar " +
    "cancela cancelar deshacer deshaz repite repetir salta saltar anula anular borra borrar nuevo nueva responsable encargado encargada supervisor administrador ayudante persona nombre quien que como cuando donde cuanto cual porque " +
    "para por con sobre entre desde hasta hacia de del al la las el los lo le les se me te nos mi tu su y e o u pero sino ni bodega produccion local tienda cocina fabrica casa " +
    "caja cajas balde baldes kilo kilos libra libras litro litros lata latas funda fundas paquete paquetes unidad unidades tanda tandas galon galones rollo rollos frasco frascos bolsa bolsas " +
    "yo usted ustedes nosotros nosotras ella ellos ellas eso esto esa ese esta aquel todo tampoco solo sola mal mejor peor error equivocado equivocada correcto correcta frutilla durazno leche crema " +
    "supuesto ejemplo cierto verdad obvio obvia seguro segura positivo negativo incorrecto exacto exacta exactamente efectivamente adelante procede confirmo confirmado aprobado autorizado acepto afirmativo sip simon nop nel aja uhum mhm anotado anotada enseguida quizas quiza mmm mm hmm hm ultima enciende prende ya mismo acuerdo bien hecho hechos listos listas nomas ahi mismo entonces digo osea mejor primero tercero ultimo fijate atencion atento sabes hazme vez ver veamos vamos vamo sale jefe jefa patron patrona senor senora senorita amigo amiga tio tia hermano hermana compa compadre bro mijo mija nano nana pana mano socio panita manito querido querida crack parcero causa maestro master broder brother amiguito amiguita hermanito jefecito viejo " +
    "separa revisa anota compra prepara cuenta apunta cambia corrige corrija arregla agrega suma resta quita elimina descarga carga recibe recibir ingresa ingresar entra entrar sale salir cuadra cuadrar pide pedir despacha despachar " +
    "fue es era soy fui estoy esta estuvo toca toco cargo llamo llama llamaron dicen repetime oiga escucha escuchame espera espere momento un minuto minutito segundito muchas muchisimas muchisima mucha mil rapido lento mucho poco bastante ayuda ayudame cierra cerrar abre abrir apaga apagar prende prender").split(/\s+/));
  // nombres de pila corrientes: si lo que se dijo es uno de ellos, es otra persona aunque se parezca a alguien de la lista (Martha no es María, Marta no es Martín)
  const COMUNES = new Set(("ana maria marta martha mara carmen rosa laura lucia paula sara sofia elena isabel julia teresa patricia monica silvia andrea claudia diana gloria sandra veronica natalia cristina alicia beatriz irene ines pilar rocio lorena gabriela daniela valentina camila fernanda alejandra paola karina karen katherine kimberly yadira mishell anahi belen cecilia estefania flor genesis hilda ivonne jimena noemi olga rebeca lola pili chela tatiana shirley stefanny ruth elsa mercedes fanny lourdes narcisa jhoana wendy pamela maribel anabel dolores sonia luz paz eva nancy mayra jessica gissela johana ximena lizeth dayana nicole joselyn nury tania lady rosita anita " +
    "jose luis carlos jorge miguel pedro pablo diego david daniel mario marco marcos mateo sebastian emilio rommel byron washington segundo galo hernan oswaldo patricio rodrigo santiago victor fausto klever nelson ramiro alfredo jaime ivan raul paul jhon cristian lenin marlon ariel edison fabricio xavier danny kevin wilson darwin bryan josue alan italo wilmer jhonny yuri ismael rafael esteban alejandro gonzalo cesar henry freddy marcelo giovanni martin mauricio manuel mariano fernando francisco gabriel gustavo hugo javier joaquin leonardo lucas nicolas oscar ricardo roberto samuel sergio").split(/\s+/));
  const REF_YO = /^(yo|yo mismo|yo misma|soy yo|fui yo|fue yo|yo fui|yo soy|el mismo|la misma|lo mismo|igual|el de siempre|la de siempre|mismo|misma|anterior|el anterior|la anterior|el mismo de antes|la misma de antes|mismo de antes|misma de antes|el de antes|la de antes|el de ayer|la de ayer|me toca a mi|me toco a mi|a mi me toco|a mi me toca|me tocaba a mi|mi)$/;
  const ACCION = "hizo|hice|hace|hago|lleva|llevo|llevaba|recibio|recibi|recibe|registra|registro|registre|despacho|despache|preparo|prepare|mando|mande|envio|envie|movio|movi|cargo|cargue|trajo|traje|anoto|anote|apunto|apunte|paso|pase|saco|saque|puso|pongo|hizo|dio|di";
  const PREFIJOS = [
    /^(eh|em|este|pues|bueno|bueno pues|ya|ok|okey|oke|listo|claro|ah|a ver|mira|hola|buenas|buenos dias|buenas tardes|buenas noches|dime|rex|oye|oye rex|bien|perfecto|vale|dale|entonces|o sea|digo)(?= |$)/,
    /^(el|la) (responsable|encargado|encargada)( de hoy)? (es|fue|sera|seria|esta|estaba|va a ser|de hoy es|soy|fui|estoy)(?= |$)/,
    /^(los|las) (responsables|encargados|encargadas)( de hoy)? (son|fueron|seran)(?= |$)/,
    /^(la persona|el nombre|la persona responsable|la persona encargada)( de hoy)? (es|fue|sera)(?= |$)/,
    /^(responsable|encargado|encargada)( de hoy)?( es| fue| sera)?(?= |$)/,
    new RegExp("^(lo|la) (" + ACCION + ")( fue| es| lo hizo)?(?= |$)"),
    // «hizo Rosa», «llevó Ana» (el dictado a veces se come el «lo» del comienzo)
    new RegExp("^(" + ACCION + ")( fue| es)?(?= |$)"),
    /^(quien lo (hizo|hace|hice|movio|llevo|lleva|registro|despacho|mando|envio|recibio) (fue|es|soy|fui|era)|quien (fue|es|era|seria))(?= |$)/,
    /^(mi nombre es|mi nombre|me llamo|yo me llamo|el se llamo|ella se llamo|se llamo|el se llama|ella se llama|se llama|le llamo|le dicen|soy|fui|yo soy|yo fui|yo estoy|yo|estoy)(?= |$)/,
    /^(fue|fueron|son|seran|hoy es|hoy esta|hoy estoy|hoy toca|hoy toco|hoy le toca a|hoy le toco a|le toca a|le toco a|me toco a|me toca a|toca a|toco a|esta hoy|estamos|aqui|aca|habla|con|de parte de|por|a cargo de|a cargo|el turno de|turno de|turno|hoy|esta|toca|toco|tocaba|es)(?= |$)/,
    /^(el|la|don|dona|senor|senora|senorita|ing|ingeniero|ingeniera|lic|licenciado|licenciada|doctor|doctora|dr|dra|profe|seño|sr|sra)(?= |$)/
  ];
  const SUFIJOS = [
    /(?:^| )(son|fueron|seran|eran) (los|las) (responsables|encargados|encargadas)( de hoy)?$/,
    /(?:^| )(es|fue|era|sera|seria|esta|estuvo|va a ser) (el|la) (responsable|encargado|encargada)( de hoy)?$/,
    new RegExp("(?:^| )(es|fue|era|soy|fui) (quien|el que|la que|el|la)? ?(lo|la) (" + ACCION + ")$"),
    new RegExp("(?:^| )(quien|el que|la que) (lo|la) (" + ACCION + ")$"),
    new RegExp("(?:^| )(lo|la) (" + ACCION + ")$"),
    /(?:^| )(al habla|presente|aqui|aca|por aqui|por aca)$/,
    new RegExp("(?:^| )(quien lo (" + ACCION + ") (fue|es))$"),
    /(?:^| )(el|la)? ?(responsable|encargado|encargada)( de hoy)?$/,
    /(?:^| )(es|fue|era|soy|fui|estoy|estuvo|esta)$/,
    /(?:^| )(por favor|porfa|por fa|pues|nomas|no mas|gracias|ya|listo|ok|okey|nada mas|no mas|de una|eso|eso es|asi|asi es|hoy|ahorita|ahora)$/,
    /(?:^| )(el|la)$/
  ];
  /* El nombre dentro de una frase larga o con ruido (31-oct-2026, video de Freddy):
       «Luis, el responsable se llama Luis», «se llama Luis», «Luis el responsable, sí, ya me están…», «fue María José la que lo llevó».
       1) alguien de la lista nombrado en cualquier parte; 2) «se llama / me llamo / es / soy / fue + Nombre»; 3) una sola palabra con mayúscula
       (el dictado escribe los nombres con mayúscula) junto a una pista («responsable», «llama», «nombre»…) o repetida. Nunca si la frase es una orden. */
  const NO_ES_NOMBRE_MAY = new Set(["Rex", "Reex", "Jarvis", "Bodega", "Producción", "Produccion", "Local", "Sí", "Si", "No", "Ya", "Listo", "Bueno", "Claro", "Ok", "Okey", "Oye", "Hola", "El", "La", "Los", "Las", "Un", "Una", "Eso", "Esto", "Ese", "Esa", "Yo", "Él", "Ella", "Es", "Fue", "Soy", "Se", "Me", "Mi", "Lo", "Le", "Que", "Qué", "Quién", "Quien", "Como", "Cómo", "Pero", "Y", "Ahora", "Ahorita", "Dale", "Vale", "Perfecto", "Gracias", "Nada", "Nadie", "Todo", "Todos", "Responsable", "Encargado", "Encargada", "Nombre", "Hoy", "Ayer", "Mañana", "Bien", "Mira", "Entonces", "Pues", "Este", "Esta", "Aquí", "Acá", "Allá", "Tío", "Tía", "Don", "Doña", "Señor", "Señora", "Uno", "Dos", "Tres", "Lleva", "Llevó", "Manda", "Pasa", "Mueve", "Necesito", "Quiero", "Ayúdame", "Ayuda", "Llegó", "Llegaron", "Cancela", "Deshaz", "Así", "Asi", "Verdad", "Cierto", "Correcto", "Exacto", "Seguro", "Todavía", "Tampoco", "También", "Siempre", "Nunca", "Mejor", "Peor", "Rápido", "Despacio", "Dónde", "Cuándo", "Cuánto", "Por", "Para", "Con", "Sin", "De", "Del", "Al", "En"]);
  // verbos con «lo/la» pegado («Mándalo», «Pásalo», «Envíala»): no son nombres de personas
  const VERBO_NO_NOMBRE = /^(mand|envi|llev|pas|muev|mov|traj|trae|despach|recib|entreg|sac|hag|hac|dej|registr|anot|confirm|cancel|pon|pid|ped|prepar|guard|cuent|cont|revis|ayud|esper|escuch|dig|dim|repit|corrig)\w*(lo|la|los|las|le|les|me)$|^(mand|envi|llev|pas|muev|mov|traj|despach|recib|entreg|registr|anot|confirm|cancel|prepar)(a|o|e|i|ar|as|amos|an|aste|ado|ada|ando|en|es|io|ie|iste|ido|ida|imos)$/;
  function nombrePartido(t, claves) {
    const w = t.split(" "), cand = new Set();
    for (const x of claves) {
      if (x.k.includes(" ") || x.k.length < 5) continue;
      const formas = [x.k].concat(/^s[^aeiou]/.test(x.k) ? ["e" + x.k] : []);
      for (let i = 0; i < w.length; i++) for (let n = 1; n <= 3 && i + n <= w.length; n++) {
        if (n === 1 && w[i] === x.k) continue;
        const j = w.slice(i, i + n).join("");
        if (j.length < 5) continue;
        // una sola palabra: solo si es el comienzo del nombre («esteb» de «esteban»); juntando palabras, también con una letra de diferencia
        if (formas.some(f => j === f || (n >= 2 && f.length >= 6 && Math.abs(j.length - f.length) <= 1 && lev(j, f) <= 1) || (j.length >= f.length * 0.7 && f.startsWith(j) && !(n === 1 && COMUNES.has(j))))) cand.add(x.nombre);
      }
    }
    return cand.size === 1 ? Array.from(cand)[0] : null;
  }
  function nombreEnFrase(crudo, conocidos, ctx) {
    const t = normalizar(crudo).replace(/[^a-zñ ]/g, " ").replace(/\s+/g, " ").trim(); if (!t) return null;
    { const sn = siNo(crudo, { sinAprendido: true }); if (sn && sn.limpio && (sn.r === "si" || sn.r === "no")) return null; }
    // si la frase es una orden (con producto), no es la respuesta del nombre
    try { const R = interpretar(crudo, { lugar: ctx.lugar || "B", cat: ctx.cat }); if ((R.items || []).some(x => x.p)) return null; } catch (e) {}
    // 1) alguien de la lista, en cualquier parte de la frase (el más largo primero: «María José» antes que «María»)
    const claves = []; conocidos.forEach(c => c.claves.forEach(k => { if (k && k.length >= 3) claves.push({ k, nombre: c.nombre }); }));
    claves.sort((a, b) => b.k.length - a.k.length);
    const vistos = new Set(); claves.forEach(x => { if (new RegExp("(^| )" + x.k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)").test(t)) vistos.add(x.nombre); });
    // 1b) el dictado partió el nombre en palabras comunes: «Esteban» dicho rápido → «es te van», «esteban» partido (31-oct, video 1420:
    //     «quién lo recibe es tal»). Se juntan 1 a 3 palabras seguidas y se comparan con cada nombre de la lista (y con «e» + nombre si empieza con s + consonante)
    if (!vistos.size) { const pt = nombrePartido(t, claves); if (pt) vistos.add(pt); }
    if (vistos.size === 1) return { nombre: Array.from(vistos)[0], lista: [{ nombre: Array.from(vistos)[0], nuevo: false }], ultimo: false };
    if (vistos.size > 1) return null;
    // 2) «se llama Luis», «me llamo Luis», «el responsable es Luis», «fue Luis»
    const toks = String(crudo).split(/\s+/).map(w => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "")).filter(Boolean);
    const okNom = w => /^\p{L}{3,}$/u.test(w) && !NO_NOMBRE.has(normalizar(w)) && !NO_ES_NOMBRE_MAY.has(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    for (let i = toks.length - 2; i >= 0; i--) {
      const a = normalizar(toks[i]);
      // pista fuerte («se llama», «nombre») o débil («es», «fue», «soy»: solo si el dictado lo escribió con mayúscula)
      if ((/^(llama|llamo|llamado|llamada|llaman|nombre)$/.test(a) || (/^(es|soy|fue|son)$/.test(a) && /^\p{Lu}/u.test(toks[i + 1]))) && okNom(toks[i + 1])) {
        const dos = toks[i + 2] && okNom(toks[i + 2]) && /^\p{Lu}/u.test(toks[i + 2]) ? " " + cap(toks[i + 2]) : "";
        return { nombre: cap(toks[i + 1]) + dos, lista: [{ nombre: cap(toks[i + 1]) + dos, nuevo: true }], ultimo: false };
      }
    }
    // 3) una palabra con mayúscula que se repite, o junto a una pista
    if (/\b(bodega|produccion|planta|cocina|local|tienda)\b/.test(t)) return null;   // «mándalo a producción» es una orden, no un nombre
    const may = toks.filter(w => /^\p{Lu}\p{Ll}{2,}$/u.test(w) && okNom(w) && !VERBO_NO_NOMBRE.test(normalizar(w)));
    const distintas = Array.from(new Set(may.map(normalizar)));
    // (31-oct, video 1420: «lo mandó de acá Luis» con el nombre todavía fuera de la lista del equipo)
    const pista = /\b(responsable|llama|llamo|nombre|recib\w*|hizo|hice|llev\w*|encargad[oa]|soy|fue|mand\w*|envi\w*|despach\w*|traj\w*|trae|entreg\w*|movi\w*|paso|saco|aca|aqui|yo)\b/.test(t);
    if (distintas.length === 1 && (pista || may.length > 1)) { const w = cap(may[0]); return { nombre: w, lista: [{ nombre: w, nuevo: true }], ultimo: false }; }
    return null;
  }
  let EMPATE = null;   // el último nombre dictado que quedó igual de cerca de dos personas (la pantalla pregunta cuál)
  function nombreResponsable(txt, conocidos, ctx) {
    EMPATE = null;
    const r = nombreResponsable0(txt, conocidos, ctx);
    // «es tal» → nombre nuevo «Tal»; pero si juntando las palabras sale alguien de la lista («es te ban» = Esteban), es esa persona
    if (r && !r.ultimo && (r.lista || []).length && r.lista.every(x => x.nuevo)) {
      try {
        const claves = []; (conocidos || []).forEach(c => (c.claves || []).forEach(k => { if (k) claves.push({ k, nombre: c.nombre }); }));
        const pt = nombrePartido(normalizar(String(txt || "")).replace(/[^a-zñ ]/g, " ").replace(/\s+/g, " ").trim(), claves);
        if (pt) { EMPATE = null; return { nombre: pt, lista: [{ nombre: pt, nuevo: false }], ultimo: false }; }
      } catch (e) {}
    }
    if (r) { EMPATE = null; return r; }
    try { const r2 = nombreEnFrase(String(txt || ""), conocidos || [], ctx || {}); if (r2) EMPATE = null; return r2; } catch (e) { return null; }
  }
  function nombreResponsable0(txt, conocidos, ctx) {
    ctx = ctx || {}; conocidos = conocidos || [];
    const crudo = String(txt || "").trim(); if (!crudo) return null;
    const toks = crudo.split(/\s+/).map(w => ({ raw: w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""), coma: /[,;]$/.test(w) })).filter(x => x.raw);
    if (!toks.length || toks.length > 10) return null;
    toks.forEach(x => { x.n = normalizar(x.raw).replace(/[^a-z]/g, ""); });
    const juntas = () => toks.map(x => x.n).join(" ");
    const quitaIni = re => { const m = re.exec(juntas()); if (!m || !m[0].trim()) return false; toks.splice(0, m[0].trim().split(" ").length); return true; };
    const quitaFin = re => { const m = re.exec(juntas()); if (!m || !m[0].trim()) return false; const k = m[0].trim().split(" ").length; toks.splice(toks.length - k, k); return true; };
    // 1) muletillas del comienzo, y «yo / el mismo / el de siempre»
    let explicito = false;
    for (let g = 0; g < 4 && toks.length && quitaIni(PREFIJOS[0]); g++);
    if (toks.length && REF_YO.test(juntas())) return { nombre: null, lista: [], ultimo: true };
    // 2) lo que rodea al nombre
    const SOY_YO = { nombre: null, lista: [], ultimo: true };
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      let cambio = false;
      for (let i = 1; i < PREFIJOS.length && toks.length; i++) if (quitaIni(PREFIJOS[i])) { cambio = explicito = true; if (toks.length && REF_YO.test(juntas())) return SOY_YO; }
      for (let i = 0; i < SUFIJOS.length && toks.length; i++) if (quitaFin(SUFIJOS[i])) { cambio = true; if (i < 8) explicito = true; if (toks.length && REF_YO.test(juntas())) return SOY_YO; }
      for (let g = 0; g < 3 && toks.length && quitaIni(PREFIJOS[0]); g++) cambio = true;
      if (!cambio) break;
    }
    if (!toks.length) return null;
    if (REF_YO.test(juntas())) return SOY_YO;
    { const sn = siNo(toks.map(x => x.raw).join(" "), { sinAprendido: true }); if (sn && sn.limpio && (sn.r === "si" || sn.r === "no")) return null; }
    // 3) uno o varios nombres: «Ana y Rosa», «Ana, Rosa y Luis»
    const partes = [[]];
    toks.forEach((x, i) => {
      if (/^(y|e|con)$/.test(x.n) && partes[partes.length - 1].length && i < toks.length - 1) { partes.push([]); return; }
      partes[partes.length - 1].push(x);
      if (x.coma && i < toks.length - 1) partes.push([]);
    });
    if (partes.length > 3 || partes.some(p => !p.length || p.length > 3)) return null;
    const res = [];
    for (const parte of partes) {
      const pal = parte.map(x => x.n), j = pal.join(" ");
      let hallado = null;
      // los de la lista: nombre completo, primer nombre, o apodo
      let entero = false;
      for (const c of conocidos) if (c.claves.some(k => k === j)) { hallado = c.nombre; entero = true; break; }
      if (!hallado) for (const c of conocidos) if (c.claves.some(k => pal[0] === k || (k.includes(" ") && (j + " ").startsWith(k + " ")))) { hallado = c.nombre; break; }
      // dos nombres de la lista dichos seguidos («Ana Rosa»)
      if (hallado && !entero && pal.length === 2) { const c2 = conocidos.find(c => c.claves.includes(pal[1])); if (c2 && c2.nombre !== hallado) { res.push({ nombre: hallado, nuevo: false }, { nombre: c2.nombre, nuevo: false }); continue; } }
      // dictado aproximado: el nombre mal escrito se acerca al más parecido de la lista
      if (!hallado && pal[0].length >= 3 && !NO_NOMBRE.has(pal[0])) {
        let mejor = null, md = 9, empatados = new Set();
        for (const c of conocidos) for (const k of c.claves) {
          const kf = k.split(" ")[0], a = pal[0], lim = kf.length >= 6 ? 2 : kf.length >= 4 ? 1 : 0;
          if (a !== kf && COMUNES.has(a) && fon(a) !== fon(kf)) continue;
          let d = lev(a, kf); if (d > lim) d = 9;
          if (a.length >= 3 && kf.length >= 3 && fon(a) === fon(kf)) d = Math.min(d, 0.5);
          else if (a.length >= 5 && kf.length >= 4 && lev(fon(a), fon(kf)) <= 1) d = Math.min(d, 1.5);      // «Luiz» por «Luis»
          if (a.length >= 4 && kf.startsWith(a)) d = Math.min(d, 2);
          // María y Mario, Daniel y Daniela son personas distintas: no se confunden
          if (d > 0 && /[ao]$/.test(a) && /[ao]$/.test(kf) && a.slice(0, -1) === kf.slice(0, -1)) d = 9;
          if (d > 0 && (a + "a" === kf || a + "o" === kf || kf + "a" === a || kf + "o" === a)) d = 9;
          if (d < md) { md = d; mejor = c.nombre; empatados = new Set([c.nombre]); }
          else if (d === md && d < 9) empatados.add(c.nombre);
        }
        if (empatados.size > 1) { EMPATE = Array.from(empatados).sort(); return null; } // no adjudicar a la primera persona por orden de catálogo: la pantalla pregunta «¿Rosa o Rosana?»
        if (mejor && md < 9) hallado = mejor;
      }
      if (hallado) { res.push({ nombre: hallado, nuevo: false }); continue; }
      // un nombre nuevo: hoy puede estar alguien que ayer no estaba
      if (pal.length > (explicito ? 3 : 2)) return null;
      if (!parte.every(x => /^[\p{L}]{2,}$/u.test(x.raw)) || pal[0].length < 3) return null;
      if (pal.some(w => NO_NOMBRE.has(w) || VERBO_NO_NOMBRE.test(w)) || pal.some(w => /^(m+|hm+|mh+|ah+|eh+|uh+|oh+|ey+|ay+)$/.test(w))) return null;
      const R = interpretar(parte.map(x => x.raw).join(" "), { lugar: ctx.lugar || "B", cat: ctx.cat });
      if ((R.items || []).some(x => x.p) || R.listo) return null;
      res.push({ nombre: parte.map(x => x.raw.charAt(0).toUpperCase() + x.raw.slice(1).toLowerCase()).join(" "), nuevo: true });
    }
    const lista = res.filter((x, i) => res.findIndex(y => y.nombre === x.nombre) === i);
    return { nombre: lista.map(x => x.nombre).join(" y "), lista, ultimo: false };
  }

  /* ¿Esta frase puede ser un «sí» o un «no» dicho a la manera de alguien? Solo eso se aprende de los toques Sí/No
     (31-oct-2026: se habían aprendido «entendí ayuda de rodilla» = no y nombres como «Luis», que después bloqueaban la respuesta del nombre). */
  const MARCA_SINO = /(^| )(si|sii+|sip|simon|sale|salen|dale|listo|lista|vale|ok|okey|oki|okay|claro|bueno|buena|de una|hagale|hagamos|hazlo|va|ya|correcto|exacto|afirmativo|confirmo|confirmado|perfecto|chevere|bacan|eso|asi es|obvio|seguro|por supuesto|no|nop|nel|nunca|nada|cancela|cancelar|tampoco|negativo|todavia|aun no|espera|mejor no|para nada|ni)( |$)/;
  function pareceSiNo(frase) { const k = claveFrase(frase); return !!k && k.split(" ").length <= 4 && MARCA_SINO.test(k); }
  /* (3-nov-2026, Freddy: «oye, todavía tengo esto aquí, ¿qué hago? ¿Lo quito, lo pongo así o no?») la respuesta a «¿qué hago?» dicha como habla la gente.
       tipo "diferencia" (faltó algo en una llegada) → devolver | camino | perdido | dejar
       tipo "saldo" (quedó pendiente lo que no alcanzó) → dejar | quitar
       tipo "pedido" (un pedido que espera hace rato) → despachar | dejar | quitar
     null si no se entiende (se vuelve a preguntar). Un «sí» o un «no» solos no deciden nada. */
  function decision(frase, tipo) {
    let t = normalizar(String(frase || "")).replace(/[,.;:!¡¿?]/g, " ").replace(/\s+/g, " ").trim();
    t = t.replace(/^((oye|hey|ok|okey|pues|bueno|mira|este|eh|ah|a ver|haber)\s+)*((rex|rexito|reex)\s+)?/, "").replace(/\s+(rex|por favor|porfa|nomas|no mas|pues)$/g, "").trim();
    if (!t) return null;
    // «no lo quites», «no lo borres», «no lo canceles»: es dejarlo
    const noQuita = /\bno (lo |la |los |las |le |les )?(quit|borr|cancel|anul|elimin|sac)\w*/.test(t);
    if (tipo === "diferencia") {
      // (3-nov-2026, Freddy: «bodega envió 32 kilos de chantilly… no se recibió nada porque no había») el sistema decía que había y no había
      if (/\b(no habia|ya no habia|no habia nada|no teniamos|no existia|no quedaba|ya se habia acabado|se habia acabado|estaba en cero|no hay (en|alla en) (la |el )?(bodega|produccion|planta|local)|nunca hubo|no hubo)\b/.test(t)) return "nohabia";
      if (/\b(se perdio|se perdieron|perdid[oa]s?|se dano|se danaron|danad[oa]s?|se rompio|se rompieron|rot[oa]s?|se cayo|se cayeron|se boto|se botaron|botad[oa]s?|merma|robaron|se lo robaron|se los robaron|no aparece|no aparecen|desaparec\w*|se extravi\w*|extraviad[oa]s?|se rego|se regaron|se derramo|se echo a perder|se pudrio|no sirve|no servia|a la basura)\b/.test(t)) return "perdido";
      if (/\b(sigue en camino|siguen en camino|en camino|viene despues|vienen despues|todavia viene|todavia vienen|aun viene|aun vienen|ya viene|ya vienen|ya lo traen|ya los traen|lo traen|los traen|las traen|la traen|va a llegar|van a llegar|llega despues|llegan despues|por llegar|despues llega|luego llega|despues lo traigo|lo traigo|los traigo|lo traemos|esta viniendo|estan viniendo|en el carro|en la camioneta|en el siguiente|en el proximo|viene en el otro|se queda pendiente|que llegue despues|esperamos|hay que esperar)\b/.test(t)) return "camino";
      if (/\b(devuel\w*|regres\w*|retorn\w*|vuelv\w*|que vuelva|nunca salio|no (salio|salieron|se envio|se enviaron|se mando|se mandaron|lo mandaron|los mandaron|lo enviaron|los enviaron|lo despacharon|lo pusieron|lo cargaron|lo subieron|se cargo)|se quedo|se quedaron|sigue (en|alla)|siguen (en|alla)|esta (en|alla) (la |el )?(bodega|produccion|planta|local)|estan (en|alla) (la |el )?(bodega|produccion|planta|local)|ponlo de nuevo|ponlos de nuevo|sumalo|sumalos|que se sume)\b/.test(t)) return "devolver";
      if (noQuita || /^asi$|^(dejalo|dejala|dejalos|dejalas|deja|dejemos|dejemoslo|dejemosla|dejarlo)( (asi|nomas|como esta|como estan|ahi|tal cual|pendiente|nada mas))*$|\b(dejalo asi|dejala asi|dejalos asi|deja asi|dejemos asi|ya lo revisamos|ya revisamos|lo revisamos|ya se reviso|esta bien asi|asi esta bien|no hagas nada|no hay que hacer nada|nada que hacer|asi nomas|tal cual)\b/.test(t)) return "dejar";
      return null;
    }
    if (tipo === "saldo" || tipo === "pedido") {
      if (noQuita) return "dejar";
      if (/\b(quit\w*|borr\w*|cancel\w*|anul\w*|elimin\w*|sac\w* de la lista|ya no (hace falta|hacen falta|lo necesit\w*|los necesit\w*|necesit\w*|quier\w*|va|van|hay que|se necesita)|no hace falta|no hacen falta|no lo necesit\w*|no los necesit\w*|ya no|olvid\w*|ya fue|ya se mando|ya lo mande|ya lo mandamos|ya se envio|ya lo llevaron|ya lo llevamos|ya se hizo|ya esta (atendido|hecho|resuelto))\b/.test(t)) return "quitar";
      if (/\b(despues|luego|mas tarde|manana|ahorita no|todavia no|cuando (haya|llegue|lleguen|tengamos|se pueda|alcance)|apenas (haya|llegue))\b/.test(t)) return "dejar";
      if (tipo === "pedido" && /\b(despach\w*|envi\w*|mand\w*|llev\w*|pasa\w*|lo que (hay|haya|tengas|alcance))\b/.test(t)) return "despachar";
      if (/\b(dej\w*|pendiente|pendientes|que quede|que queden|que se quede|que se queden|mant\w*|guard\w*|sigue|siguen|asi esta bien|esta bien asi)\b/.test(t)) return "dejar";
      return null;
    }
    return null;
  }
  const API = { decision, empateNombre: () => EMPATE, pareceSiNo, fraseAprendible, normalizar, fon, lev, numeroEn, buscarProducto, interpretar: interpretarConCorreccion, interpretarSimple: interpretar, interpretarMejor, seguir, siNo, analizarLlegada, ponerAprendido, claveFrase, nombreResponsable, olvidarIndice: () => { INDICE = null; INDICE_DE = null; } };
  root.FRX_VOZ = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
