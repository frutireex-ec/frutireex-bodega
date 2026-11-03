// Cómo llegó un envío, contado con palabras de la gente (31-oct-2026, video 1433: «la frutilla llegó pequeña pero lo demás está bien»).
// Miles de frases al azar con cada producto: todo bien con una novedad, solo la novedad, «no llegó todo bien…», faltó, no llegó, la mitad, y mezclas.
// node tests/llegadas.test.js [semilla] [cantidad]
const V = require("../src/parser.js"), S = require("../src/sim.js");
const st = S.estadoDemo(), PRODS = st.cat.prods;
let semilla = +(process.argv[2] || 11); const N = +(process.argv[3] || 12000);
const rnd = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };
const uno = a => a[Math.floor(rnd() * a.length)];
// cómo se nombra cada producto y si es femenino / plural
const NOM = { frutilla: ["la frutilla", "f"], durazno: ["el durazno", "m"], banano: ["el banano", "m"], mora: ["la mora", "f"], chantilly: ["el chantilly", "m"], leche: ["la leche", "f"],
  condensada: ["la leche condensada", "f"], huevos: ["los huevos", "mp"], oreo: ["las oreo", "fp"], granola: ["la granola", "f"], tapa: ["las tapas", "fp"], servilleta: ["las servilletas", "fp"],
  masking: ["el masking", "m"], trapos: ["los trapos", "mp"], coco: ["el coco", "m"], nuez: ["la nuez", "f"], choco_negro: ["la cobertura", "f"], azucar: ["el azúcar", "m"], vaso9: ["los vasos pequeños", "mp"] };
const EMPG = { balde: "m", caja: "f", lata: "f", funda: "f", bulto: "m", saco: "m", paquete: "m", unidad: "f", canasto: "m", cubeta: "f", frasco: "m", botella: "f", rollo: "m", racimo: "m", mano: "f", litro: "m", bolsa: "f", quintal: "m", olla: "f" };
const flex = (adj, g) => { // «pequeño» → pequeña / pequeños / pequeñas
  if (!/o$/.test(adj)) return /p$/.test(g) && !/s$/.test(adj) ? adj + (/[aeiou]$/.test(adj) ? "s" : "es") : adj;
  const b = adj.slice(0, -1); return g === "f" ? b + "a" : g === "mp" ? b + "os" : g === "fp" ? b + "as" : adj; };
const COND = { fruta: ["pequeño", "muy pequeño", "chiquito", "grande", "muy grande", "maduro", "muy maduro", "verde", "aplastado", "golpeado", "podrido", "aguado", "blando", "feo", "machucado", "en mal estado", "con hongos", "magullado"],
  lata: ["golpeado", "abollado", "roto", "hinchado", "abierto", "vencido", "por vencer", "sin etiqueta"],
  base: ["derramado", "vencido", "abierto", "caliente", "regado", "a la mitad", "mojado", "en mal estado", "roto"],
  top: ["regado", "húmedo", "abierto", "roto", "en un frasco pequeño", "en otra presentación", "en otra funda", "mojado", "incompleto"],
  desc: ["mojado", "roto", "abierto", "sucio", "aplastado", "incompleto", "de otro tamaño", "en otra presentación"] };
const condDe = id => { const p = PRODS[id]; if (id === "durazno" || id === "condensada") return COND.lata; if (p.cat === "fruta") return COND.fruta; if (["base", "choco"].includes(p.cat)) return COND.base; if (["top", "chill"].includes(p.cat)) return COND.top; return COND.desc; };
const VERBO = ["llegó", "vino", "está", "estaba", "llegaron", "vinieron"];
const ids = Object.keys(NOM).filter(id => PRODS[id] && (PRODS[id].e || []).length);
let ok = 0, mal = 0; const fallos = [], porTipo = {};
function check(tipo, frase, items, esp) {
  porTipo[tipo] = porTipo[tipo] || [0, 0];
  const r = V.analizarLlegada(frase, items, { lugar: "L", cat: st.cat });
  let err = null;
  if (!r.entendido) err = "no entendió";
  else if (esp.obs && !r.obs) err = "sin novedad";
  else if (!esp.obs && r.obs) err = "novedad de más: " + r.obs;
  else for (const it of items) { const q = esp.cant[it.p] != null ? esp.cant[it.p] : it.q; if (Math.abs((r.cant[it.p] == null ? -1 : r.cant[it.p]) - q) > 0.01) { err = it.p + " " + r.cant[it.p] + " (esperaba " + q + ")"; break; } }
  if (err) { mal++; porTipo[tipo][1]++; if (fallos.length < 60) fallos.push("✗ [" + tipo + "] «" + frase + "» " + err); } else { ok++; porTipo[tipo][0]++; }
}
for (let i = 0; i < N; i++) {
  const a = uno(ids); let b = uno(ids); if (b === a) b = null;
  const mk = id => { const e = PRODS[id].e[0]; const n = uno([1, 2, 3]); return { p: id, q: Math.round(n * e[1] * 1000) / 1000, emp: e[0], n }; };
  const items = [mk(a)].concat(b && rnd() < 0.35 ? [mk(b)] : []);
  const A = items[0], [nomA, gA] = NOM[A.p], condA = uno(condDe(A.p)), condAflex = /^(en|de|con|sin|por|a la|muy) /.test(condA) ? condA.replace(/^muy (\S+)/, (m, x) => "muy " + flex(x, gA)) : flex(condA, gA);
  const verbo = /p$/.test(gA) ? uno(["llegaron", "vinieron", "están", "estaban"]) : uno(["llegó", "vino", "está", "estaba"]);
  const empA = A.emp, gE = EMPG[empA] || "m", un = gE === "f" ? "una" : "un", condE = /^(en|de|con|sin|por|a la|muy) /.test(condA) ? condA : flex(condA, gE);
  const tipo = uno(["bien+novedad", "novedad", "no-bien+novedad", "envase", "falto", "nollego", "mitad", "mezcla", "aunque", "excepto"]);
  // 2-nov-2026 (Freddy): «sí, la frutilla llegó bien, aunque está muy pequeña», «llegó bien aunque el plátano está muy maduro»,
  // «no hay ninguna novedad con las latas, excepto que el empaque de las cajas está aplastado»: completo + la observación, con el nombre del producto
  if (tipo === "aunque") {
    const est = /p$/.test(gA) ? "están" : "está";
    const f = uno(["sí, " + nomA + " " + (/p$/.test(gA) ? "llegaron" : "llegó") + " bien, aunque " + est + " " + condAflex, "llegó bien, aunque " + nomA + " " + est + " " + condAflex,
      "sí, llegó todo bien, aunque " + nomA + " " + est + " " + condAflex, "todo correcto, aunque " + nomA + " " + verbo + " " + condAflex, nomA + " " + (/p$/.test(gA) ? "llegaron" : "llegó") + " bien aunque " + condAflex]);
    const r = V.analizarLlegada(f, items, { lugar: "L", cat: st.cat });
    const sujeto = nomA.split(" ").slice(1).join(" ").split(" ")[0];
    const okObs = r.obs && V.normalizar(r.obs).includes(V.normalizar(sujeto)) && V.normalizar(r.obs).includes(V.normalizar(condAflex.split(" ").slice(-1)[0])) && !/\b(aunque|llego bien|todo bien)\b/.test(V.normalizar(r.obs));
    porTipo[tipo] = porTipo[tipo] || [0, 0];
    if (r.entendido && !r.cambios.length && okObs) { ok++; porTipo[tipo][0]++; } else { mal++; porTipo[tipo][1]++; if (fallos.length < 60) fallos.push("✗ [aunque] «" + f + "» → " + JSON.stringify({ obs: r.obs, cambios: r.cambios })); }
    continue;
  }
  if (tipo === "excepto") {
    const env = uno(["el empaque de las cajas está aplastado", "las cajas están aplastadas", "el cartón está roto", "una caja vino golpeada", "el empaque vino dañado", "las fundas están rotas"]);
    const f = uno(["no hay ninguna novedad con " + nomA + ", excepto que " + env, "no hay novedad, excepto que " + env, "sin novedad con " + nomA + ", solo que " + env, "todo bien, salvo que " + env, "ninguna novedad, excepto que " + env]);
    const r = V.analizarLlegada(f, items, { lugar: "L", cat: st.cat });
    porTipo[tipo] = porTipo[tipo] || [0, 0];
    if (r.entendido && !r.cambios.length && r.obs && V.normalizar(r.obs).startsWith(V.normalizar(env).split(" ")[0]) && !/\b(excepto|salvo|solo que|novedad)\b/.test(V.normalizar(r.obs))) { ok++; porTipo[tipo][0]++; }
    else { mal++; porTipo[tipo][1]++; if (fallos.length < 60) fallos.push("✗ [excepto] «" + f + "» → " + JSON.stringify({ obs: r.obs, cambios: r.cambios })); }
    continue;
  }
  if (tipo === "bien+novedad") check(tipo, uno(["sí llegó todo bien, pero ", "llegó todo, pero ", "todo bien, solo que ", "sí llegó, pero ", "llegó completo pero "]) + nomA + " " + verbo + " " + condAflex + uno(["", ", lo demás está bien", ", lo demás todo bien"]), items, { obs: true, cant: {} });
  else if (tipo === "novedad") check(tipo, nomA + " " + verbo + " " + condAflex + uno(["", ", pero lo demás está muy bien", " pero de ahí todo bien"]), items, { obs: true, cant: {} });
  else if (tipo === "no-bien+novedad") check(tipo, uno(["no llegó todo bien, ", "no llegó bien, ", "no vino en buen estado, ", "no llegó como debía, "]) + nomA + " " + verbo + " " + condAflex, items, { obs: true, cant: {} });
  else if (tipo === "envase") check(tipo, un + " " + empA + " " + uno(["de " + PRODS[A.p].n.toLowerCase() + " ", ""]) + uno(["llegó", "vino", "estaba"]) + " " + condE, items, { obs: true, cant: {} });
  else if (tipo === "falto") { const e = PRODS[A.p].e[0]; check(tipo, uno(["faltó ", "falta ", "faltaron "]) + (A.n === 1 ? un : "uno") .replace("uno", un) + " " + empA + " de " + PRODS[A.p].n.toLowerCase(), items, { obs: false, cant: { [A.p]: Math.max(0, Math.round((A.q - e[1]) * 1000) / 1000) } }); }
  else if (tipo === "nollego") { if (items.length < 2) { i--; continue; } check(tipo, uno(["no llegó ", "no vino ", "no llegaron "]) + nomA.replace(/^(el|la|los|las) /, (m) => m), items, { obs: false, cant: { [A.p]: 0 } }); }
  else if (tipo === "mitad") { if (items.length > 1) { i--; continue; } check(tipo, uno(["llegó la mitad", "solo llegó la mitad", "vino la mitad"]), items, { obs: false, cant: { [A.p]: Math.round(A.q * 0.5 * 1000) / 1000 } }); }
  else if (tipo === "mezcla") { if (items.length < 2) { i--; continue; } const B = items[1], e = PRODS[B.p].e[0], gB = EMPG[B.emp] || "m";
    check(tipo, un + " " + empA + " de " + PRODS[A.p].n.toLowerCase() + " " + uno(["vino", "llegó"]) + " " + condE + " y faltó " + (gB === "f" ? "una" : "un") + " " + B.emp + " de " + PRODS[B.p].n.toLowerCase(), items, { obs: true, cant: { [B.p]: Math.max(0, Math.round((B.q - e[1]) * 1000) / 1000) } }); }
}
for (const [k, v] of Object.entries(porTipo)) console.log(k.padEnd(16), String(v[0]).padStart(6), "bien", String(v[1]).padStart(5), "mal");
fallos.slice(0, 40).forEach(f => console.log(f));
console.log(`\nllegadas: ${ok}/${ok + mal} bien, ${mal} mal`);
process.exitCode = mal ? 1 : 0;
