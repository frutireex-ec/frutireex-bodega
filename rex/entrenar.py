#!/usr/bin/env python3
"""Entrena a Rex con lo que aprendió todo el equipo.

Lee todos los archivos rex/aprendizaje/*.json (los que se exportan desde la página: Catálogo → Voz →
«Exportar lo que aprendió Rex») y arma rex/cerebro.json, que todos los equipos leen al abrir la página.
  - Una frase cuenta como «sí» o «no» según lo que dijo la mayoría de los equipos (si hay empate, no se usa).
  - Las frases que la IA tradujo a una orden se juntan (gana la traducción más repetida).
  - Lo que Rex no entendió se resume en rex/PENDIENTES.md, para enseñarle esas frases en la próxima versión.
  - Los nombres de las personas NO se publican (cada equipo los aprende solo).
Uso: python3 rex/entrenar.py
"""
import json, glob, os, re, unicodedata, collections, datetime
AQUI = os.path.dirname(os.path.abspath(__file__))
def clave(x):
    x = unicodedata.normalize("NFD", str(x).lower())
    x = "".join(c for c in x if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[,.;:!¡¿?]", " ", x)).strip()
votos = collections.defaultdict(collections.Counter)   # frase → {si: n, no: n}
textos = {}
trad = collections.defaultdict(collections.Counter)
noent = collections.Counter(); ejemplos = {}
archivos = sorted(glob.glob(os.path.join(AQUI, "aprendizaje", "*.json")))
for a in archivos:
    try:
        d = json.load(open(a, encoding="utf-8"))
    except Exception as e:
        print("no se pudo leer", a, e); continue
    if d.get("tipo") != "rex-aprendizaje": continue
    for r in ("si", "no"):
        for f in (d.get("aprendido") or {}).get(r, []) or []:
            k = clave(f)
            if k and len(k) <= 60: votos[k][r] += 1; textos.setdefault(k, f.strip())
    for f, t in (d.get("reescritas") or {}).items():
        if isinstance(t, str) and len(f) <= 120: trad[clave(f)][t.strip()] += 1
    for x in d.get("noEntendidas") or []:
        k = clave(x.get("frase", ""))
        if k: noent[k] += 1; ejemplos.setdefault(k, x.get("frase", ""))
si = sorted(textos[k] for k, v in votos.items() if v["si"] > v["no"])
no = sorted(textos[k] for k, v in votos.items() if v["no"] > v["si"])
reescritas = {k: c.most_common(1)[0][0] for k, c in trad.items()}
hoy = datetime.date.today().isoformat()
cerebro = {"tipo": "rex-cerebro", "version": hoy + " · " + str(len(archivos)) + " aportes", "aprendido": {"si": si, "no": no}, "reescritas": reescritas}
json.dump(cerebro, open(os.path.join(AQUI, "cerebro.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
with open(os.path.join(AQUI, "PENDIENTES.md"), "w", encoding="utf-8") as f:
    f.write("# Lo que Rex todavía no entiende\n\nSe arma solo con lo que exporta cada equipo. Sirve para enseñarle estas frases en la próxima versión\n(se agregan al intérprete y a sus pruebas).\n\n")
    f.write("Actualizado: " + hoy + " · " + str(len(archivos)) + " aportes\n\n| Veces | Frase |\n|---:|---|\n")
    for k, n in noent.most_common(200): f.write("| " + str(n) + " | " + ejemplos[k].replace("|", "/") + " |\n")
print("cerebro.json:", len(si), "sí,", len(no), "no,", len(reescritas), "traducciones ·", len(noent), "frases pendientes")
