---
name: entrenar-rex
description: Enseñarle a Rex (el asistente de voz de Fruti Reex) las frases que todavía no entiende, a partir de rex/PENDIENTES.md, con pruebas.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(node codigo/tests/*), Bash(python3 rex/entrenar.py), Bash(python3 rex/anonimizar.py*), Bash(python3 codigo/build.py*), Bash(git status), Bash(git diff*), Bash(git add*), Bash(git commit*), Bash(git push*), Bash(git pull*)
---
# Entrenar a Rex (también la corre sola, todos los días, la tarea programada)

1. Lee `rex/PENDIENTES.md` (frases que Rex no entendió, con cuántas veces pasaron) y `AGENTS.md` (las reglas de la voz).
2. Corre `node codigo/tests/correr.js`: todo tiene que pasar ANTES de cambiar algo. Si algo ya falla, no toques nada y avisa.
3. Toma hasta 15 frases, las más repetidas. Para cada una decide qué quiso decir la persona en la bodega (una orden, un sí/no, una llegada,
   un aviso, una respuesta a «¿qué hago?»…). Si no se puede saber con seguridad, déjala (y di por qué). «[nombre]» es el nombre de alguien.
4. Enséñala SOLO en `codigo/src/parser.js`, de la forma más general posible (una regla, no la frase exacta), y agrégala a la prueba que
   corresponda en `codigo/tests/` (sí/no → `sino.test.js`; órdenes → `ordenes.test.js`; llegadas → `llegadas.test.js`; avisos → `avisos.test.js`;
   «¿qué hago?» → `listas.test.js`; lo que escribe el oído → `whisper.test.js`). No toques `ui.js` ni el resto de la página: eso lo cambia una persona.
5. Corre otra vez `node codigo/tests/correr.js`. TODO tiene que pasar. Nunca borres ni ablandes una prueba para que pase. Si no logras que pase, deshaz tu cambio.
6. Revisa que no quede ningún nombre real ni una clave (`git diff`). Sube a `main` con un mensaje que diga qué frases aprendió;
   la acción «Entrenar a Rex» vuelve a probar todo y publica la página sola.
