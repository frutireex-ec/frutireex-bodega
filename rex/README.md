# Rex — el agente de voz de Fruti Reex

Rex es el asistente de voz de la bodega, producción y el local. Se le habla con «Rex», «oye Rex», «Rexito» o «Jarvis»:
*«Rex, lleva dos baldes de frutilla a producción»* → *«Listo. ¿Quién es el responsable?»* → *«Stalin»*.

Esta carpeta es su **cerebro compartido**: lo que aprende cada equipo se junta aquí y todos los equipos lo usan.

## Cómo aprende (se entrena solo)

1. En cada equipo, Rex aprende en el día a día: si alguien contesta con una frase nueva y enseguida toca «Sí» o «No»,
   esa frase queda aprendida; si está conectada la IA, las frases raras se traducen a órdenes y también quedan.
2. Una vez por semana, en cada equipo: **Catálogo y recetas → Voz y micrófono → «Exportar lo que aprendió Rex»**.
   Se descarga un archivo `rex-aprendizaje-….json`.
3. Ese archivo se sube a la carpeta **`rex/aprendizaje/`** de este repositorio (Add file → Upload files).
4. El repositorio corre solo `entrenar.py` (acción «Entrenar a Rex»): junta todo en **`cerebro.json`** y escribe en
   **`PENDIENTES.md`** lo que Rex todavía no entiende.
5. Al abrir la página, cada equipo lee `cerebro.json` y suma lo aprendido por todos.
6. Con `PENDIENTES.md` se le enseñan reglas nuevas en la siguiente versión (con pruebas, para que no se olvide lo que ya sabe).

## Archivos

| Archivo | Qué es |
|---|---|
| `cerebro.json` | Lo que sabe Rex por todo el equipo: frases de sí y no, y frases que se traducen a órdenes. Lo escribe `entrenar.py`. |
| `aprendizaje/` | Los aportes de cada equipo (archivos exportados desde la página). |
| `PENDIENTES.md` | Frases que Rex no entendió, ordenadas por cuántas veces pasaron. |
| `entrenar.py` | Junta los aportes en el cerebro (gana lo que dice la mayoría; los nombres de las personas no se publican). |
| `CONOCIMIENTO.md` | Cómo funciona el negocio y las reglas de Rex (para cualquier persona o IA que lo siga mejorando). |
| `HOJA-DE-RUTA.md` | De Rex a Jarvis: los pasos para convertirlo en el cerebro central del negocio. |
