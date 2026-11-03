---
name: entrenar-rex
description: Enseñarle a Rex (el asistente de voz de Fruti Reex) las frases que todavía no entiende, a partir de rex/PENDIENTES.md, con pruebas.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(node codigo/tests/*), Bash(python3 rex/entrenar.py), Bash(python3 codigo/build.py*), Bash(git status), Bash(git diff*), Bash(git add*), Bash(git commit*), Bash(git checkout -b*), Bash(git push*)
---
# Entrenar a Rex

1. Lee `rex/PENDIENTES.md` (frases que Rex no entendió, con cuántas veces pasaron) y `AGENTS.md` (las reglas de la voz).
2. Corre `node codigo/tests/correr.js` para ver que todo pasa ANTES de cambiar algo.
3. Toma las 10 frases más repetidas. Para cada una decide qué quiso decir la persona en la bodega (una orden, un sí/no, una llegada,
   un nombre, un aviso…). Si no se puede saber, no la toques.
4. Enséñala en `codigo/src/parser.js` de la forma más general posible (una regla, no la frase exacta) y agrégala a la prueba que
   corresponda en `codigo/tests/` (sí/no → `sino.test.js`; órdenes → `ordenes.test.js`; llegadas → `llegadas.test.js`;
   avisos → `avisos.test.js`; «¿qué hago?» → `listas.test.js`).
5. Corre otra vez `node codigo/tests/correr.js`. TODO tiene que pasar. Nunca borres ni ablandes una prueba para que pase.
6. Revisa que no quede ningún nombre real del personal ni una clave. Haz commit en una rama `rex/entrena-AAAA-MM-DD` y abre un PR
   con la lista de frases que aprendió y las que dejó sin tocar (y por qué).
