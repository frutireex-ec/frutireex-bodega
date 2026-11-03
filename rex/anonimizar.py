#!/usr/bin/env python3
"""Quita los nombres de lo que aprendió Rex en una PC, ANTES de que llegue a este repositorio (que es público).

  python3 rex/anonimizar.py SALIDA ARCHIVO.json [ARCHIVO.json …]

Entrada: los archivos que el oído de Rex guarda en la PC (V8\\aprendizaje-rex\\rex-aprendizaje-DIA-EQUIPO.json): traen las frases
tal como se dijeron y la lista de personas del equipo. Salida: el mismo aporte con cada nombre cambiado por «[nombre]», sin la lista de
personas, sin frases que son solo un nombre, y con el equipo como una huella. Si al final queda algo que parece un nombre del
personal (huellas sha1, como en codigo/build.py), NO escribe nada.
"""
import hashlib, json, os, re, sys, unicodedata

HUELLAS = set(['2bc6038c3dfca09b', '378301bab2fe5f93', '592012c2ab36e973', '5f399373de38236d', '77f140b8b13ed27b', '7d45a16ca4a3b95b', '8f80b44968ea7b99', '9001f936c1857070', '914210f6350c14d7', 'a32bbb6381bae13d', 'b41592c80b79de22', 'bb4af54d4692022d', 'bf920d631e535afe', 'd0ded527a97bc880', 'e48356a61762e155', 'e7cd70ffc1b0e846', 'f3c34ef97e0846e1', 'f74b6decaf92a954', 'fcd1eee40b824e08'])


def clave(w):
    w = unicodedata.normalize("NFD", str(w).lower()); return "".join(c for c in w if unicodedata.category(c) != "Mn")


def huella(w): return hashlib.sha1(clave(w).encode()).hexdigest()[:16]


SINO = set("si no sip nop claro listo dale ok okey correcto exacto bueno ya vale perfecto gracias rex oye nada ninguna todo bien".split())


def limpiador(personas):
    palabras = set()
    for p in personas or []:
        for w in re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", str(p)):
            if len(w) >= 3 and clave(w) not in ("supervisor", "encargado", "encargada", "ayudante", "administrador"): palabras.add(clave(w))
    def limpia(txt):
        def cambia(m):
            w = m.group(0)
            return "[nombre]" if clave(w) in palabras or huella(w) in HUELLAS else w
        t = re.sub(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", cambia, str(txt or ""))
        return re.sub(r"(\[nombre\][\s,]*){2,}", "[nombre] ", t).strip()
    return limpia


def solo_nombre(txt):
    """«Andrés.», «María José»: frases que son solo un nombre (aunque no esté en la lista) no se publican"""
    t = re.sub(r"[^\wÁÉÍÓÚÜÑáéíóúüñ\[\] ]", " ", str(txt)).split()
    if not t or all(w == "[nombre]" for w in t): return True
    return len(t) <= 2 and all(w[:1].isupper() for w in t) and not any(clave(w) in SINO for w in t)


def anonimizar(d):
    limpia = limpiador(d.get("personas"))
    def frases(lista):
        out = []
        for x in lista or []:
            f = limpia(x.get("frase", ""))
            if f and not solo_nombre(f): out.append({"lugar": x.get("lugar"), "frase": f})
        return out
    ap = d.get("aprendido") or {}
    return {"tipo": "rex-aprendizaje", "version": 2, "dia": str(d.get("dia") or d.get("fecha") or "")[:10],
            "equipo": "pc-" + hashlib.sha1(str(d.get("equipo") or "").encode()).hexdigest()[:6],
            "aprendido": {"si": [limpia(x) for x in ap.get("si", []) if "[nombre]" not in limpia(x)],
                          "no": [limpia(x) for x in ap.get("no", []) if "[nombre]" not in limpia(x)]},
            "reescritas": {limpia(k): limpia(v) for k, v in (d.get("reescritas") or {}).items() if isinstance(v, str)},
            "noEntendidas": frases(d.get("noEntendidas")), "ordenes": frases(d.get("ordenes"))}


def main():
    salida, archivos = sys.argv[1], sys.argv[2:]
    os.makedirs(salida, exist_ok=True)
    for a in archivos:
        d = json.load(open(a, encoding="utf-8"))
        if d.get("tipo") != "rex-aprendizaje": print("no es un aporte de Rex:", a); continue
        out = anonimizar(d)
        texto = json.dumps(out, ensure_ascii=False, indent=1)
        quedan = [w for w in set(re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", texto)) if huella(w) in HUELLAS]
        if quedan: raise SystemExit("NO se publica %s: todavía lleva un nombre del personal" % a)
        nombre = "%s-%s.json" % (out["dia"] or "sin-dia", out["equipo"])
        open(os.path.join(salida, nombre), "w", encoding="utf-8").write(texto + "\n")
        print("listo:", nombre, "·", len(out["noEntendidas"]), "no entendidas ·", len(out["ordenes"]), "entendidas")


if __name__ == "__main__":
    main()
