// «Oye Rex» como lo escribe el dictado (31-oct-2026, video 1420: «ayer Rick», «vaya red»): node tests/despertar.test.js
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/ui.js"), "utf8");
const V = require("../src/parser.js");
const a1 = src.indexOf("  const VOCATIVOS = new Set("), b1 = src.indexOf("\n", src.indexOf("  function sinCortesia(")) ;
let finSin = src.indexOf("\n  }\n", src.indexOf("  function sinCortesia(")) + 4;
const a2 = src.indexOf("    const RELLENO_INI = new Set("), b2 = src.indexOf("    function crear(l0) {");
const codigo = src.slice(a1, finSin) + "\n" + src.slice(a2, b2) + "; return { despierta, despiertaEn };";
const st = { config: {} }, Rex = {}, manos = "B", diag = { tReinicio: 0 };
const F = new Function("V", "st", "Rex", "manos", "esOrdenClara", "hablar", "unaDe", "saludoModo", "SALUDO_PROPIO", "SESION_MS", "diag", codigo)(V, st, Rex, manos, () => false, () => {}, x => x[0], () => "ta", "", 8000, diag);
let ok = 0, mal = 0; const t = (c, m) => { if (c) ok++; else { mal++; console.log("✗", m); } };
const si = ["oh rex", "o rex", "oye equis", "oye reyes", "uy rex lleva", "ah rex", "y el rex", "hoy el ex", "oye el Rex", "o yerex", "oyerex", "hoy el ex mueve un balde", "oye Rex", "Oye Rex lleva dos baldes de frutilla a producción", "ayer Rick", "ayer riggs mueve un balde", "vaya red", "hoy Rix", "oye Rick lleva", "olle rex", "ya, oye Rex", "Rex", "oye tío Rex", "hey Rex", "oye Recs", "oye rey", "Jarvis",
  // 1-nov-2026 (madrugada): más formas
  "oye pues Rex", "oye pues res", "oye ve Rex", "oye mira rec", "holle rex", "o ye rex", "oye re x", "oye re ex lleva dos baldes", "oye lex", "oye brex", "yo Rex", "e Rex", "joe rex", "boye res", "ya, oye pues Rex", "radio de fondo y oye pues Rex lleva un balde"];
// 2-nov-2026 (Freddy a 10-20 cm del micrófono: «no me detecta muy bien cuando digo oye Rex»): más formas como lo escribe el dictado
si.push("ojo rex", "hoy es rex", "oye rei", "oye flex", "oye que rex", "oye res", "oye rest", "oyeres", "olle res", "oye ress", "oye rexs", "oye rx", "oye ricks", "oye wrecks", "oye trex", "oye, este, rex", "oye la rex");
for (const f of si) t(F.despiertaEn(f), "debía despertar: «" + f + "»");
for (const f of ["ojo con la frutilla", "hoy es lunes", "oye reloj", "que rex", "oye ratón", "hoy salió todo bien"]) t(!F.despiertaEn(f), "no debía despertar: «" + f + "»");
const no = ["ex", "o sea que", "oh no", "x", "equis cajas", "hoy hay x", "el ex novio", "y el examen", "lerex", "ayer recibimos dos cajas", "vaya a la bodega", "hoy hay mucha frutilla", "la red está lenta", "ricos los helados", "ayer llegó la leche", "rico", "rey de la casa", "oye, cuánto hay",
  "yo recibí dos cajas", "yo red", "oye pues cuánto hay", "hoy a ver qué llegó", "ayer ya recibimos", "e res", "lex", "oye ve a la bodega", "hoy pues revisa", "ye"];
for (const f of no) t(!F.despiertaEn(f), "no debía despertar: «" + f + "»");
t((F.despiertaEn("ayer riggs mueve un balde de frutilla") || {}).resto === "mueve un balde de frutilla", "lo que sigue al llamado queda como orden");
t((F.despiertaEn("oye pues Rex mueve un balde de frutilla") || {}).resto === "mueve un balde de frutilla", "«oye pues Rex»: lo que sigue queda como orden");
t((F.despiertaEn("oye re ex lleva dos baldes") || {}).resto === "lleva dos baldes", "«oye re ex»: lo que sigue queda como orden");
// recién reabierto el micrófono (se perdió «oye R…»): «ex» solo despierta; más tarde no
diag.tReinicio = Date.now(); t(F.despiertaEn("ex"), "«ex» justo después de reabrir el micrófono despierta"); t((F.despiertaEn("ex lleva dos baldes de frutilla") || {}).resto === "lleva dos baldes de frutilla", "«ex lleva…» justo después de reabrir");
diag.tReinicio = Date.now() - 5000; t(!F.despiertaEn("ex"), "«ex» a los 5 s de abierto no despierta");
console.log(`\n${ok} bien, ${mal} mal`); process.exitCode = mal ? 1 : 0;
