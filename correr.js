#!/usr/bin/env node
// Corre TODAS las pruebas de node de esta carpeta (*.test.js) y dice cuáles pasan (3-nov-2026, para que Rex se entrene solo en GitHub).
//   node correr.js [--informe RESULTADOS.md] [--curva curva.json]
// Sale con error si alguna prueba falla (así la acción no vuelve a armar la página con algo roto).
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const aqui = __dirname, args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const pruebas = fs.readdirSync(aqui).filter(n => n.endsWith(".test.js")).sort();
const filas = []; let fallan = 0;
for (const n of pruebas) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(aqui, n)], { cwd: aqui, encoding: "utf8", timeout: 10 * 60000, maxBuffer: 64 << 20 });
  const out = (r.stdout || "") + (r.stderr || "");
  const lineas = out.trim().split("\n").filter(Boolean);
  // «X bien, Y mal», «N/M bien, K mal», «NO mal: 0 / 113», «… 0 mal»
  let bien = 0, mal = 0;
  for (const l of lineas) {
    let m;
    if ((m = l.match(/(\d+)\s*\/\s*(\d+)\s+bien,?\s+(\d+)\s+mal/))) { bien += +m[1]; mal += +m[3]; }
    else if ((m = l.match(/(\d+)\s+bien,?\s+(\d+)\s+mal/))) { bien += +m[1]; mal += +m[2]; }
    else if ((m = l.match(/\bmal:\s*(\d+)\s*\/\s*(\d+)/i))) { mal += +m[1]; bien += +m[2] - +m[1]; }
    else if ((m = l.match(/tomadas como s[ií]:\s*(\d+)/i))) { mal += +m[1]; }
  }
  const ok = r.status === 0 && mal === 0 && !r.error;
  if (!ok) fallan++;
  filas.push({ prueba: n.replace(".test.js", ""), ok, bien, mal, seg: Math.round((Date.now() - t0) / 100) / 10, ultima: (lineas[lineas.length - 1] || "").slice(0, 160) });
  console.log((ok ? "OK    " : "FALLA ") + n.padEnd(26) + " " + (lineas[lineas.length - 1] || "(sin salida)").slice(0, 120));
  if (!ok) console.log(lineas.filter(l => /✗|MAL|Error|error/.test(l)).slice(0, 12).map(l => "        " + l.slice(0, 200)).join("\n"));
}
const tot = filas.reduce((a, f) => ({ bien: a.bien + f.bien, mal: a.mal + f.mal }), { bien: 0, mal: 0 });
console.log("\n" + (filas.length - fallan) + " de " + filas.length + " pruebas pasan · " + tot.bien + " casos bien, " + tot.mal + " mal");
const ahora = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
const inf = opt("--informe");
if (inf) {
  const h = ["# Resultados de las pruebas de Rex", "", "Actualizado: " + ahora + " · " + (filas.length - fallan) + " de " + filas.length + " pruebas pasan · " + tot.bien + " casos bien, " + tot.mal + " mal", "",
    "| Prueba | | Casos bien | Mal | Segundos |", "|---|---|---:|---:|---:|"].concat(filas.map(f => "| " + f.prueba + " | " + (f.ok ? "✅" : "❌") + " | " + f.bien + " | " + f.mal + " | " + f.seg + " |"));
  fs.mkdirSync(path.dirname(path.resolve(inf)), { recursive: true }); fs.writeFileSync(inf, h.join("\n") + "\n");
}
const cur = opt("--curva");
if (cur) {
  let c = []; try { c = JSON.parse(fs.readFileSync(cur, "utf8")); } catch (e) {}
  c.push({ t: ahora, pasan: filas.length - fallan, de: filas.length, bien: tot.bien, mal: tot.mal, por: Object.fromEntries(filas.map(f => [f.prueba, f.ok ? 1 : 0])) });
  fs.writeFileSync(cur, JSON.stringify(c.slice(-2000)));
}
process.exit(fallan ? 1 : 0);
