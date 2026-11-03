# Rex se entrena solo (cómo funciona este repositorio)

Este repositorio publica la página de Fruti Reex (GitHub Pages: `index.html`) y guarda el **cerebro compartido** de Rex.

## El ciclo, sin costo
1. Cada equipo exporta lo que aprendió Rex (Catálogo → Voz → «Exportar lo que aprendió Rex») y lo sube a `rex/aprendizaje/`.
2. La acción **«Entrenar a Rex»** (`.github/workflows/rex.yml`) corre sola cada 30 minutos (y cada vez que se sube algo):
   - junta los aportes en `rex/cerebro.json` (la página lo lee al abrir: aprende sin cambiar el HTML) y escribe `rex/PENDIENTES.md`;
   - corre **todas** las pruebas de `codigo/tests` y escribe `rex/RESULTADOS.md` y la curva de aprendizaje `rex/curva.json`;
   - si cambió el código (`codigo/`) y **todas** las pruebas pasan, vuelve a armar `index.html` y `version.json`: la página se actualiza sola.
     Si una prueba falla, la página NO se toca.
3. Para que Rex entienda frases nuevas de verdad, alguien (una persona o un agente: Claude Code, Codex) sigue la receta
   `.claude/skills/entrenar-rex/SKILL.md`: toma `rex/PENDIENTES.md`, enseña cada frase en `codigo/src/parser.js` y la agrega a una prueba.
   La acción `rex-agente.yml` lo hace sola con Claude **si** el dueño agregó el secreto `CLAUDE_CODE_OAUTH_TOKEN` (usa su suscripción de Claude).

## Reglas que no se rompen
- Nunca nombres reales del personal ni claves (API, GitHub) en ningún archivo: el repositorio es público. Usa nombres de ejemplo (Ana, Rosa, Luis, Saúl, Marcela).
- Nunca se borra ni se baja una prueba para que pase: se arregla el intérprete.
- `rex/cerebro.json` y `rex/aprendizaje/` los escribe la acción; no se editan a mano.


---

# Guía completa del proyecto (la misma que usa el equipo de desarrollo)

# Fruti Reex · Bodega → Producción → Local (guía para agentes de IA)

Este archivo es para cualquier asistente que siga el proyecto (Claude Code, GitHub Copilot, Antigravity…).
Léelo completo antes de cambiar algo. Hay una copia con el mismo contenido en `CLAUDE.md`.

## Qué es
Prototipo de inventario para Fruti Reex (heladería en Guayllabamba, Ecuador). Tres lugares:
**Bodega (B) → Producción (P) → Local (L)**. Todo se maneja **con la voz**: el equipo está lavando fruta,
cargando cajas o haciendo crema, así que la voz tiene que funcionar sin tocar la pantalla.
Es una sola página HTML (sin servidor). Versión actual: **8** (3-nov-2026: el dueño preguntó si convenía una V8 «para entrar a producción»;
se hizo por el oído propio de Rex). La clave de localStorage sigue siendo `frx-bodega-v7` (así se conserva el inventario real) y
INICIAR.bat usa el mismo puerto 8765. No se crean carpetas de versión nuevas sin que el dueño lo pida.

## Archivos
- `src/catalog.js`  productos, empaques, recorrido (ruta B→P→L), recetas, personas por rol.
- `src/parser.js`   intérprete de voz en español de Ecuador: órdenes, sí/no (miles de formas), llegadas
                    («no llegó nada», «llegó la mitad», «una caja abierta»), despachos («envía lo que pide el local»).
- `src/engine.js`   motor: stock, movimientos, envíos (tránsito), pedidos, recepción, cuadre.
- `src/acciones.js` arma el plan de cada orden (qué se mueve, si hay, qué pedir o preparar si no hay).
- `src/ui.js`       pantalla, micrófono (un solo SpeechRecognition con modos orden/respuesta/motivo/vigilia),
                    voz del asistente (cola de avisos), responsable, Excel, asistente con IA, 3D en Operar.
- `src/vista3d.js`  la casa en 3D (Three.js 0.149 incluido en el archivo).
- `src/styles.css`, `src/index.html`, `assets/`.
- `build.py`        arma `dist/Frutireex-Bodega-V7.html` (todo en un archivo).
- `tools/privado.py` cifra la página (AES-256-GCM) para publicarla en GitHub Pages con contraseña.
- `tests/*.test.js` pruebas de node del intérprete y del motor.

## Reglas de la voz (lo más importante)
1. Cada frase se interpreta **en el contexto del lugar donde se dijo**: primero la pregunta abierta allí;
   si no hay, lo que espera en ese lugar (lo que viene en camino → llegada; un pedido → despacho);
   recién después, como orden nueva. Ver `contextoLugar()` en ui.js.
2. Nunca se habla encima de alguien que está dictando: los avisos esperan (`avisoEspera`, `siguienteVoz`).
3. Lo que el asistente dice no se toma como respuesta (`esEco`).
4. Después de cada movimiento se pregunta **«¿Quién es el responsable?»** y el nombre queda en el
   movimiento (Movimientos, Excel «Movimientos» y «Bitácora de voz»). Si la orden ya trae el nombre
   («Saúl, lleva…») no se pregunta. Nombres y apodos en Catálogo → Ajustes: `Marcela (Marce)`.
5. Si no se entiende una respuesta, la pregunta no se borra: se vuelve a preguntar. Desde el 31-oct-2026 ya NO se aprende la frase al tocar Sí/No
   (`st.aprendido` solo guarda lo que ya había, depurado con `V.fraseAprendible`).
6. Asistente con IA (opcional): si el intérprete local no entiende, `intentarIA()` le pasa la frase y el
   contexto a la API de Anthropic y recibe JSON `{tipo, texto}`; lo que traduce bien queda en `st.reescritas`.
   **La clave se guarda solo en localStorage del navegador** (`frx-bodega-v7-ia-clave`). Nunca la pongas en
   el código, en el estado, en el respaldo ni en el Excel.
7. El resultado («Movimiento correcto») sale arriba como franja que se desvanece; las preguntas sí quedan.
8. **Rex** (solo su carita fija abajo, sin barra ni texto: verde = escucha, apagada = sin voz, naranja que parpadea = el navegador no deja oír o hablar; `pintarRex`, `Rex`): un solo asistente con un solo micrófono para los tres lugares.
   Palabras para llamarlo: Rex, oye Rex, Rexito, Jarvis… (`despierta`). Las respuestas no necesitan «Rex»
   y se envían al lugar con la pregunta más reciente (`lugarConPregunta`). Un lugar al comienzo
   («Rex, producción: …») es desde dónde se habla (`lugarAlComienzo`). Lo que empieza con «Rex» durante una
   pregunta es una orden nueva. «Oye, …» sin «Rex» cuenta solo si lo que sigue es una orden clara (`despiertaOye`).
   Rex **arranca solo** al abrir la página (si el navegador no deja, el primer toque en la pantalla lo enciende) y
   solo se pausa desde Catálogo → Ajustes («Rex escucha siempre»). Tocar su carita = decirle «Oye Rex».
   **Ventana tipo Siri** (`#rexSiri`, `pintarSiri`): se abre con «Oye Rex», contesta «Sí, aquí estoy. ¿En qué te puedo
   ayudar?» (`saludoRex`, editable en Ajustes), muestra lo que oye y lo que dice, y se cierra sola a los 5 s sin voz.
   En esa conversación las preguntas se dicen en voz alta y se escucha la respuesta cuando Rex termina de hablar.
   El navegador no deja hablar hasta que alguien toque la página una vez (`vozActiva`).
   **Conversación** (`charlaRex`, `esOrdenClara`): después de «Oye Rex» se habla como con una persona. «Ayúdame con un movimiento en
   bodega» → «Sí, claro, en la bodega. ¿Qué necesitas realizar?» (y las órdenes siguientes son de ese lugar: `Rex.ctxLugar`);
   «qué puedo decir» → ejemplos del lugar; «repite»; «gracias»/«eso es todo» cierra. Lo que ya es una orden clara (producto +
   acción) NO pasa por ahí: la entiende el parser. Si la frase no se entiende, en una conversación Rex dice «No te entendí.
   ¿Puedes repetir la orden?» y vuelve a escuchar (máx. 2 veces seguidas). Dentro de la conversación (6 s) no hace falta repetir
   «Rex» (`enSesion`). «Oye Rex» se busca en cada frase y en el medio de ella (`despiertaEn`, sirve con radio de fondo) y se atiende
   apenas se oye, sin esperar el cierre de la frase (`tPre`; el «oye Rex» que llega tarde no corta el saludo: `Rex.tWake`).
   Ruido: `st.config.ambienteRuidoso` y la confianza baja del dictado (`R.srConf`, `confBaja`) apagan el modo rápido y se pregunta «¿sí o no?».
   Si el navegador no deja hablar (`TTS.bloqueada`) el dock muestra «Toca aquí una vez para que Rex te hable» (`data-rex-activar`).
   Versión: cada armado lleva un sello (`BUILD.id`); `version.json` se publica junto a `index.html` y la página avisa «Hay una versión nueva».
   **Contestar rápido, sin huecos (28-oct-2026, «7.1 en pruebas»)**: Rex usa SIEMPRE el mismo micrófono abierto. Si una pregunta es de otro
   lugar (la llegada en producción) el reconocedor solo cambia de lugar (`r._lugar`, `volverAManos`); cerrarlo y reabrirlo pierde las primeras palabras.
   Se puede contestar **encima de la voz de Rex** (`interrumpe`, `parteTuya` quita el eco, `atenderBarge`): «sí claro / de una / vamos / hazlo», el nombre del
   responsable o una orden nueva.
   Si el parlante de Rex se mete en el micrófono, su eco se descarta: lo que repite 4 o más palabras seguidas de lo último que dijo (`dichosRex`, `ecoLargo`, `sinEcoLargo`),
   pero solo mientras habla o hasta 3,5 s después (una orden que repites más tarde es tuya); un «sí» corto y claro nunca se recorta. Las frases cortas que Rex dice solo («Dime.», «Con gusto.», «De nada.», «A la orden.»: `ECO_CORTAS`, `ecoCorto`) tampoco se toman como respuesta ni como interrupción mientras suenan o justo después. Dentro de la conversación una orden o un seguimiento sin decir «Rex» no se confunde con la respuesta de otro lugar (`ordenEnSesion`).
   **Seguimientos** (`V.seguir`, `marcaSeguir`): «uno más», «otro igual», «lo mismo de durazno», «y también una caja de leche» repiten o suman a la última orden
   (`Rex.ultimaOrden`) y no avisan «es igual a lo que registraste». **Pantalla silenciosa**: no se muestra lo que Rex oyó (`mostrarTranscripcion`, Ajustes, apagado
   por defecto); solo «Escuchando…», la carita late con la voz (`.voz`). Diagnóstico: Catálogo → Voz → «Copiar diagnóstico» (`Oido.diag`, `vozLogTexto`).
   **Abrir y cerrar a Rex (28-oct-2026, noche)**: «Oye Rex» abre con un «ta» (`Sonido.ta`, `saludoModo()`: «ta» = solo el sonido y queda escuchando; «dime»; «frase» = la frase de Ajustes)
   y se atiende apenas aparece en el texto parcial (`tPre` 70 ms), sin esperar a que el navegador cierre la frase. Se abre también con apodos y cortesías: «oye tío Rex», «oye Rex por favor», «Rex amigo», «hola Rex por favor»
   (`VOCATIVOS`, `NOMBRES_REX`, `sinCortesia`, `RELLENO_INI`). Se cierra a los **8 s** de silencio después de que se le dijo algo (`SESION_MS = 8000` desde el 31-oct-2026; antes 5 s) con el sonido `Sonido.cierra`, y con las despedidas
   «gracias tío Rex», «gracias Rex», «listo Rex», «de una Rex», «perfecto», «chao Rex», «eso es todo»… (`cierreRex`, `GRACIAS`, `DESPEDIDAS`, `ACK_FRASES`). Con una pregunta de **sí o no** abierta, «de una / listo / dale» son un «sí» y no cierran;
   con la pregunta **del responsable** abierta, «gracias Rex» o «listo Rex» cierran la ventana y la pregunta queda abierta (`despedirRex`; un «vale» o «bien» solos pueden ser el nombre de alguien y no cierran).
   **Orden adelantada** (`st.config.ordenAdelantada`, activa por defecto): si lo que se va oyendo ya es una orden completa y lleva 800 ms sin cambiar, se toma sin esperar el final de Chrome (1–2 s); si el final trae más, eso se toma aparte; si
   el final dice otra cosa, se corrige (`adelantar`, `ADEL_MS`). Lo ya tomado se descuenta con `comparaAdel`/`soloLoNuevo` (el final se compara con la orden adelantada ANTES de quitar el eco de Rex, y solo la cola o la frase corregida se procesa: `adelDirecto`). **Doble aplauso** (`src/aplauso.js` + módulo `Aplauso` de ui.js; apagado por defecto, Ajustes → Voz): AudioWorklet que mide volumen y «chispa» cada 10 ms, sin guardar audio.
   **Reconocimiento en el equipo** (`Oido.local`, `st.config.reconocerLocal`, apagado por defecto, Chrome/Edge 139+): `SpeechRecognition.available/install` + `processLocally`; si falla vuelve solo al normal.
   **iPhone y iPad (30-oct-2026)**: todos sus navegadores usan WebKit. Ahí, si la página habla (`speechSynthesis`) con el micrófono abierto, el micrófono queda SORDO sin avisar
   (bug 321436 de WebKit, iOS 26) y casi nunca llega el «final» de la frase. Por eso (`IOS`, `modoIphone()`, `callaPorIphone()`; Ajustes → Voz «Modo iPhone» y «En iPhone, que Rex también hable»):
   Rex no habla en iPhone (contesta con `Sonido` —Web Audio, que no estorba— y en pantalla; lo de una conversación sale en `toast`), el oído junta el texto que crece, le quita lo ya tomado
   y toma la frase cuando la persona se queda callada (`r._consumir`, envoltura de `r.onresult` en `crear()`), tocar la carita estrena un micrófono, y no se recicla la escucha cada minuto.
   Una despedida a Rex («perfecto Rex») con una pregunta de llegada abierta en OTRO lugar cierra a Rex (no confirma la llegada), y en iPhone un «sí» suelto no contesta preguntas de otro lugar.
   Pruebas: micrófono simulado del iPhone `mockios.js` (sordo si la página habla), `ios91.py` y la campaña `campios.py` (también con `IOSFIN=1`). La ventana de Rex (`#rexSiri`) viene escondida (`st.config.ventanaRex`): solo la carita.
   **Rex piensa con Claude (30-oct-2026, `Mente`)**: con la clave de la API en el equipo (`IA.clave()`, solo localStorage) y `st.config.cerebroClaude` (activo por defecto),
   dentro de una conversación con Rex las PREGUNTAS (personas, días, historial, «de todo») y lo que el intérprete no entiende o una corrección («no, eran tres baldes») van a Claude
   (`Mente.quiere`, `Mente.pensar`, modelo `IA.modelo()`, por defecto claude-haiku-5-5) con herramientas que leen ESTA página: `ver_inventario`, `ver_movimientos`, `ver_pendientes`,
   `deshacer_ultimo` y `registrar` (que pasa por `ordenTexto(..., {ia:true})`: lo que propone Claude se confirma con «¿sí o no?» y la herramienta devuelve lo que de verdad cambió).
   Las órdenes claras, los seguimientos y las consultas simples («¿cuánta frutilla queda?», «¿qué falta?») siguen en el intérprete local (sin internet). Si Claude no responde, sigue la página.
   Si Claude registró algo, habla la página (no Claude). Prueba: `tests/navegador/mente92.py` (API de Anthropic simulada; `IOS=1` en iPhone). `tests/sinchoques.test.js`: miles de frases raras no rompen el plan.
   **31-oct-2026 (videos de Freddy en PC)**: lo que se prepara (crema, chocolate, dulce) se pide POR CANTIDAD de lo preparado, no por la receta.
   «Necesito crema (para producción)» sin cantidad → `A.planificar` devuelve `pideCantidad` (`pedirCantidad` en acciones.js) y la pantalla pregunta «¿Cuántos kilos de crema Reex?»
   en el lugar donde se prepara (`cantPend`, `preguntarCantidad`, `responderCantidad`, `cantidadDicha`: un número solo son kilos). Con la cantidad, `A.planReceta`: si hay insumos
   se prepara; si no, `pedirLoQueFalta` arma el pedido a la bodega con los insumos marcados `rec`/`recQ` (`E.copiaItem` los conserva en pedido, envío y saldo) y
   `txtItemsCorto` lo nombra «insumos para 5 kg de crema Reex». `plan.directo` lo registra sin «¿sí o no?». Al recibirlo en producción queda en `st.porPreparar`
   («Ya está» o «ya está la crema» → `prepararReceta`, descuenta los insumos). El parser: «necesito crema para producción, pídela a la bodega» → pide producción (`paraX`, `aSolo`).
   Eco: Chrome escribe en cifras lo que Rex dijo con letras (`enCifra` en `tokNorm`/`palabras`) y pega trozos de dos frases suyas (`ecoLargo`: trozos de 3 que cubren el 80 %);
   `Oido.pareceEco` (8 s) se revisa antes de tomar algo como nombre nuevo u orden en la pregunta del responsable; un nombre que no se entiende se repregunta UNA vez («¿Cómo se llama?»).
   Responsable repetido: si en ese lugar se dijo un nombre hace < 15 min (`respUltT`, `st.config.repetirResponsable`), no se pregunta («A nombre de Saúl»; «Otro responsable» lo cambia).
   «¿Por qué?» (motivo) solo cuando se deja sin atender el pedido de otro lugar. Pruebas: `r94.py` y `r94b.py` (eco y «Saúl»), `r95.py` (crema por kilos, también `IOS=1`), `r96.py` (responsable repetido;
   las pruebas viejas lo apagan en h80 salvo `REPETIR=1`). Se tomó de la revisión de Codex: empates de nombres (`empatados`) y la guardia de `responsableDicho`.
   **31-oct-2026 tarde (videos IMG_1405/1406 y paquete V2 de Codex)**: ya NO se aprende solo ninguna frase al tocar «Sí» o «Cancelar» (así se colaron
   «entendí ayuda de rodilla» = no y nombres como «sí»). `V.ponerAprendido(o, personas())` devuelve la lista depurada (`V.fraseAprendible`: fuera ayuda, órdenes,
   lugares, productos, cantidades, nombres del equipo o de `COMUNES`, palabras sueltas que no son sí/no, y lo que esté en sí y en no a la vez) y `limpiarAprendido()` la guarda al abrir,
   al cargar un respaldo y al mezclar el cerebro. `nombreResponsable` usa `siNo(..., {sinAprendido:true})` y `nombreEnFrase` para frases con ruido («Saúl el responsable sí ya me están»).
   Hablar como con una persona (`procesarOrden` en `crear()`): una frase a medias (`faltaEnOrden`: termina en «de/a/una/tres…», o tiene verbo sin producto «bodega, lleva…»)
   se guarda (`holdTxt`) y se espera lo que sigue (`HOLD_MS` 1,7 s, se alarga mientras sigue llegando texto; 1,4 s si la orden está completa pero sin «a dónde»); si no llega,
   Rex pregunta solo lo que falta (`preguntaFalta`: «¿Cuánto de frutilla?», «¿A dónde llevo…?», «Dime, ¿qué llevo?») y la respuesta completa la orden (`Rex.borrador`, `armarBorrador`).
   Lo que sigue se junta con lo guardado salvo que empiece de nuevo con su verbo o con «oye Rex». No esperan: los seguimientos («uno más», «lo mismo de durazno»: `marcaSeguir`/`seguimiento`),
   «ya está la crema», ni lo que no es un comienzo de orden (`PAL_COMIENZO`: «despacha», «quiero ver el inventario»). En `armarBorrador`, «tres fundas» es el empaque del producto que faltaba, no otro producto.
   Un nombre igual de cerca de dos personas (`V.empateNombre()`, regla de empate de Codex) → Rex pregunta «¿Dorian o Tobías?» una vez (`respons[l].empate`). `SESION_MS` = 8 s. Un aviso (envío que llega) no le quita el micrófono a quien
   contesta el responsable (también en iPhone, donde Rex no habla: el aviso espera a que se cierre la conversación con Rex). No se tomó de Codex: apagar el modo rápido por defecto (Freddy pidió menos preguntas; se apaga en Ajustes).
   Pruebas: `tests/movimientos.test.js` (las 6 direcciones, 8 372 frases), `tests/navegador/camp97.py` (Chrome, `ECO=1`, `IOS=1`; `RUTA=PB`, `ESTILO=pedazos` para forzar).
   **31-oct-2026 noche (videos IMG_1419/1420)**: los avisos a OTRO lugar (llegada «Atención producción, viene…», «Bodega pide…») esperan con `conCalma()`/`ocupadoParaAvisos()`
   a que no haya preguntas abiertas (`pend`, `respons`, `motivo`, `cantPend`), ni conversación con Rex, ni alguien hablando (máx. 3 min): antes la llegada se preguntaba al instante
   y se quedaba con el «confirmar»/«sí»/nombre que era para la bodega («Recepción confirmada» sola). `corregirCantidad()` (+ `aceptaRespuesta`): con «¿Deseas mover…?» abierto,
   «solo un balde», «solo mover un balde», «mejor tres», «sí pero solo uno» cambian la cantidad y se vuelve a planificar (antes sumaba otro balde). Parser: `CONFIRMA_RESTO`
   («sí, correcto, envíala» limpio), «cancelarlo», «cancelar el movimiento»; pedidos «hazme un pedido de…», «pedido de dos…», y a quién se le habla `vocX`
   («producción, mándame…», «que la bodega me mande…»; `lugarAlComienzo` ya no lo toma como el lugar que habla). Nombres fuera de la lista (la página pública trae solo
   «Supervisor»): pistas «mandó/envió/trajo/de acá» y `VERBO_NO_NOMBRE` («Mándalo» no es un nombre). «oye Rex» escrito «ayer Rick», «vaya red», «hoy Rix» (`esOye`, `suenaRex`, `RELLENO_INI`).
   Voz de Rex: velocidad 1,0 (antes 1,15; `migrar` la baja una vez, `vozMig1031`). Pruebas: `tests/pedidos.test.js` (6 sentidos, 2 464 frases), `tests/corregir.test.js`,
   `tests/despertar.test.js`, `tests/navegador/r98.py` (también `IOS=1`).
   Además (misma noche): el responsable se pregunta SIEMPRE (`st.config.repetirResponsable` apagado de fábrica: `=== true`); «o cancelar, cancelarlo» (conjunción al comienzo en `siNo`);
   `nombrePartido`: cuando Chrome parte el nombre («es tal», «estal» = una persona de la lista que empieza con «s» + consonante), se reconoce; una sola palabra solo como comienzo del nombre.
   Para lenguaje libre de verdad: «Rex piensa con Claude» (`Mente`, `intentarIA`) con la clave de la API en cada equipo; sin clave solo está el intérprete local.
   **31-oct-2026, 22:30 (video IMG_1433)**: la llegada se cuenta con palabras. `V.analizarLlegada` entiende el ESTADO de lo que llegó (`COND_LLEGADA` ampliado: tamaño
   «pequeña/grande», madurez, golpes, «se regó», envase distinto «en un frasco pequeño / en otra funda»; los nombres de producto no cuentan: `nombresFuera`), «no llegó (todo) bien»
   es una queja (no «no llegó»; sin detalle → `generico` y se pregunta «¿Qué pasó?»), «lo demás está bien», y devuelve la novedad en limpio y con tildes («La frutilla llegó pequeña»).
   La pregunta suena más natural («Atención local: Producción te envió…. ¿Llegó todo bien, o me cuentas qué pasó?») y la confirmación es «¿Lo registro así?».
   Una llegada contada con el micrófono de otro lugar («…muy pequeña en el local») va a esa llegada (`procesar`, y `faltaEnOrden` no la retiene como orden a medias).
   Entradas a la bodega: «acaban de llegar», «se recibieron», «registra el ingreso de…», «recibimos …» sin nada en camino (→ compra), «un paquete de 5 cajas» = 5 cajas,
   «2 cajas de 6 latas» = 12 latas. «Oye Rex» escrito «hoy el ex», «y el rex», «oyerex». En los otros lugares la pantalla dice que Rex escucha los tres (`pintarManos`).
   Pruebas: `tests/llegadas.test.js` (12 000 llegadas al azar), `tests/entradas.test.js` (10 000 entradas), `tests/navegador/r99.py` (también `IOS=1`).
   **1-nov-2026 (madrugada, pedidos de Freddy por escrito)**: «Oye Rex» contesta SIEMPRE «Sí, ¿en qué te puedo ayudar?» (`SALUDO_PROPIO`, `saludoModo()` = «frase» de fábrica;
   `migrar` → `mig1101` pasa el «ta» y el saludo viejo a la frase y apaga el modo rápido UNA vez). Movimiento por voz: la pregunta es corta, «¿Estás seguro de este movimiento?
   Di sí o no.» (`corta` en `proponer`; la tarjeta muestra el detalle); «sí, seguro», «no, es una falsa alarma», «es un error», «o cancelar» (`NO_INI`, `RELLENO_RESP`).
   El responsable tiene tiempo: el modo motivo espera 25 s, `esperarTexto` 30 s, y lo que es solo relleno («eh…», «el responsable es…», «se llama…»: `RELLENO_NOMBRE`)
   NO se toma como nombre: se descarta (no se le pega al nombre: «sí… Rosa» = Rosa) y se espera el nombre; el eco de Rex («¿Quién lo recibió?») no cuenta como relleno (`api.pareceEco`). Entradas: la pregunta es «¿Entraron 5 canastos de mora a la bodega? ¿Está correcto?»;
   «no, corregir, entraron solo 3 canastos» corrige (`corregirCantidad` acepta compras; en `onresult` una corrección espera el final y un «no» suelto espera 1,1 s),
   y si entró menos de lo dicho, después de registrar Rex pregunta «¿Qué pasó con lo que falta? Cuéntame la observación.» (`correccionEntrada`, queda en `mov.nota`)
   y luego «¿Quién lo recibió?». Una entrada que no dice a dónde va a la bodega (`R.aDicho`, rama en `planificar`). La llegada: «Atención local: Producción te envió X.
   ¿Llegó todo bien, o hay alguna novedad?». Más formas de «oye Rex» (`DESPIERTA_OYE`: equis, reyes, reis, wrex, trex, reex…; `RELLENO_INI`: oh, uy, ah, ajá).
   La regla «de la bodega al local se pasa por producción» queda sin usar por ahora: B→L se mueve directo. Prueba: `tests/navegador/r100.py` (también `IOS=1`).
   Segunda parte (misma madrugada): «oye Rex» en medio de una pregunta o dentro de la conversación también dice la frase (antes «Dime.»: `saludoRex`, `charlaRex`);
   «oye pues Rex», «oye ve Rex», «oye re ex», «holle rex», «yo Rex» (`PUENTE_REX`, `oyeAntes`); «ex» solo, si el micrófono se acaba de reabrir (`diag.tReinicio` < 1,6 s: se perdió «oye R…»);
   al cerrarse la escucha de manos libres se reabre enseguida (`setTimeout(guardia, 20)` en `onend`; antes hasta 250 ms de hueco). «En producción entraron 3 baldes…»: el lugar del
   comienzo es a dónde entró (`lugarAlComienzo` + `LUG[x].a`). Parser: corregirse entre dos cantidades («dos, no, tres», «dos, digo, tres», «dos o sea tres»: `CORRIGE_NUM`)
   y el proveedor dicho como en la bodega («el proveedor dejó», «nos dejaron», «nos entregaron», «vino el de la mora con…», «descargamos»). Prueba: `tests/navegador/r101.py`
   (parte D: 16 «oye Rex» a tiempos al azar con el micrófono que se cierra solo a los 8 s sin voz; parte E: modo rápido y «sí… Rosa»). En h80, `&lento` deja el modo rápido apagado.
   **Paquete V3 de Codex (1-nov-2026, tarde)**: su código de la página ya estaba aquí (no aprender al tocar Sí/No, «se llamó Saúl», modo rápido apagado); se tomó además que lo dicho por voz
   o propuesto por Claude nunca se registra solo con el contador (`plan.auto = false` en `mostrarPlan` si `via === "voz"` o `extra.ia`). Lo nuevo de V3 (voz en vivo con WhisperLive,
   `/voz-stream`, `iniciar_whisperlive_local.py`) va SOLO en el laboratorio (`laboratorio-voz`), no en la página publicada.
   **2-nov-2026 (video IMG_1446: «sí, de acuerdo» no valía y la llegada entró en bucle)**: la causa era el eco: Rex se oía a sí mismo (su «Di sí o no» pegado a la respuesta,
   y sus ejemplos «faltó una caja, o una lata llegó abierta» tomados como la novedad, una y otra vez). Arreglos: `V.siNo` quita «di sí o no», «sí o no», «no te entendí»,
   «¿estás seguro de este movimiento?», «lo registro así»; «no, sí…» es sí (Ecuador); «no/nada + todo bien / ninguna novedad / no pasó nada» es sí; con `{llegada:true}`
   «nada», «ninguna», «no pasó nada», «normal» = llegó bien; «me parece bien», «conforme», «fijo», «ok Rex». `ecoDeRex()` (top de ui.js; usa `Oido.dichoReciente`,
   `Oido.colaDeRex`, `Oido.pareceEco(txt, ms)`) descarta: 4+ palabras seguidas tal cual las dijo Rex en 10 s, el final de una frase suya que no era pregunta («nada» de «De nada.»),
   y lo que se parece a su voz (6 s) si no empieza como contesta una persona (`INI_RESPUESTA`). Se aplica en `aceptaRespuesta`, `respondeYa`, el camino «sin Rex» de vigilia,
   cada trozo final en modo respuesta/motivo, y `seguirCharla`; `ecoExacto()` en `procesarOrden` (sus ejemplos de «qué puedo decir» no son órdenes). Un trozo de eco descartado
   ya no cancela el temporizador de lo que dijiste (respuesta/motivo: `(hayFinal || buf.trim())`). Los avisos de llegada ya no dicen ejemplos en voz alta. Frenos: `charla.vueltas`
   (más de 4 preguntas sin «sí»/«no» claro → deja la pregunta en pantalla) y `plan.reps` (más de 2 «No te entendí» → no insiste). «No» que todavía sigue espera 1,2 s en la llegada
   (1,1 s en movimiento); en la llegada, mientras la persona sigue hablando, 0,9 s. En la llegada, decir que llegó bien con cualquier palabra («no, sí, llegó todo bien», «llegó
   completo», «sin novedad») registra completo en cualquier paso, si no cuenta ningún problema. `corregirCantidad` devuelve «=…» si repite la MISMA cantidad («sí, mueve los dos
   baldes» = sí). Asistente (de los repos tipo Jarvis): «qué hora es», «qué día es hoy», «cállate/silencio» (`ch.callar` → `callarVoz`), «espera/un momento» (30 s),
   «habla más despacio/rápido» (`vozVelocidad` ±0,1), «ve a dormir/ya no te necesito». Pruebas: `tests/navegador/r102.py` (con eco real y eco TARDÍO y mal escrito: `__ecoRetraso`,
   `__ecoTxt`; el armado anterior fallaba 7), `tests/sino.test.js`, `tests/corregir.test.js`. Repos revisados: `docs/REPOSITORIOS-JARVIS-REVISADOS.md`; probar con agent-browser:
   `tools/rex_agent_browser.sh`.
   **2-nov-2026, mañana**: `IA.opciones()` → con Haiku/Sonnet 5.x las llamadas a Claude van con `thinking: {type: "disabled"}` y `output_config: {effort: "low"}` (Haiku 5.5 piensa
   por defecto y eso cuenta dentro de `max_tokens`: con 200/500 la respuesta podía quedar cortada); `max_tokens` 400 (traducir) y 800 (Mente). El proxy del laboratorio deja pasar solo esos valores.
   Simulación masiva: `/home/claude/masivo/correr.sh` (≈1 millón de frases: llegadas, entradas, entrenamiento, frases raras). Investigación para el agente: `docs/INVESTIGACION-AGENTE-REX.md`.
   **2-nov-2026, 9:00 (pedidos de Freddy)**: (a) Rex **termina** cada frase antes de decir otra: `TTS.fin` marca cuándo terminó; `siguienteVoz` deja ≥650 ms de pausa;
   lo que va con `{entero: true}` («Anotado: Nombre.») no se corta con un aviso (el aviso se pone en cola) y `ocupadoParaAvisos` espera 1,5 s después de que Rex calla.
   (b) La llegada se anuncia «Atención producción: llegaron 2 baldes de frutilla de la bodega. ¿Está correcto el pedido, o hay alguna observación?» (voz, tarjeta y repregunta).
   (c) Se espera **2 s callado** (2,6 s si la frase quedó en coma) antes de tomar un «sí / llegó bien» en la llegada, porque puede seguir «…aunque el plátano está muy maduro» (iPhone igual: `quietoMs` 2000).
   (d) `fraseConfirmar(tr, propuesta)`: «El pedido llegó completo, pero con esta observación: la frutilla está muy pequeña. ¿Lo registro así?» (no «¿correcto?»: el eco de «correcto» valdría como sí).
   (e) `analizarLlegada`: «aunque / excepto (que) / salvo (que) / solo que / sin embargo» parten la frase; «no hay (ninguna) novedad con las latas», «ninguna novedad», «sin problema con…» = todo bien;
   la novedad dicha a medias lleva el producto (como lo dijo: «el durazno está hinchado», «los huevos están mojados»). (f) `mismaFrase` compara la frase entera (antes solo la 1.ª palabra:
   en el iPhone «sí, exacto, concuerdo» se ignoraba por venir tras «sí, la frutilla llegó bien…»). (g) «concuerdo», «estoy de acuerdo», «coincido», «lo confirmo» = sí.
   (h) `siNo(…, {llegada:true})` con `POS_LLEGADA`: «no hay observaciones», «ninguna observación», «sí, el pedido está correcto», «sí, llegó completo, ninguna observación» = sí limpio
   (antes «no hay observaciones» era un «no»); el camino rápido de la escucha usa la misma opción en la llegada. (i) La escucha de una respuesta no se corta si llegó texto hace <2,5 s
   (`tOido`, hasta 4 prórrogas de 3 s). (j) «sí, todo correcto, aunque el durazno está un poco mojado» ya no se lee como «llevar durazno» (lo que cuenta un estado no escapa como orden).
   (k) `novedadTardia`: «llegó todo bien» … (Rex ya registró y pregunta quién) … «aunque una funda está mojada» → se agrega como observación de esa llegada y repite «¿Quién lo recibió?».
   Pruebas: `tests/navegador/r103.py` (un día completo: entradas, corrección, 5 llegadas con novedades, eco; Chrome e `IOS=1`) y `r104.py SEMILLA N` (días al azar por todas las rutas).
   «2 cajas de plátano» = 2 racimos (el banano no tiene «caja» en el catálogo).
   **2-nov-2026, 22:21 (pedidos de Freddy)**: (a) **Avisos por voz** (`detectarAviso` en parser → intent `aviso`; `registrarAviso` en ui; `E.avisar` → mov `tipo:"aviso"`
   sin deltas, con `para`, `nivel` normal|alto|alarma, `vistos` por lugar, listo para sincronizar): «avisa/notifica/pon en conocimiento a todos que…», «estamos preparando…»,
   «la crema ya va en camino», «se dañó la licuadora»; sin «¿sí o no?», Rex lo anuncia y pregunta «¿Quién avisa?»; «avisa a todos» solo → «¿Qué les aviso?».
   Se ven en «Avisos» de cada lugar (botón «Visto») y en el bloque nuevo **«Hoy en los tres lugares»** (`bitacoraHTML`). (b) **Alertas de stock** (`revisarStock`,
   500 ms después de cada `guardar`): bajo el mínimo o agotado → «Atención a todos: se acabó la leche en la bodega» una vez, mov aviso `via:"sistema"`, por «Rex».
   (c) **«¿Por qué no se despacha?»** (`estado:"porque"` + `A.planPorQue`): en el lugar del pedido explica «Porque no alcanza: el local pidió…» y pregunta
   «¿Envío eso?» (planDespacho); al que pidió le dice dónde está; dicho en otro micrófono se contesta por el lugar del pedido. «envía lo que tengas», «manda lo que hay»,
   «sí, despachemos» = despachar. (d) **Responsable sin lista**: la tarjeta ya no muestra los nombres; «Dorias» (parecido a dos) se anota tal cual, sin «¿Dorian o Tobías?».
   (e) **Más rápido**: orden adelantada 550 ms (antes 800), nombre conocido se toma a los 380 ms de quedarse quieto (`tNom`) y con el final a los 120 ms, llegada
   1,4 s (antes 2 s; lo que se agregue tarde lo toma `novedadTardia`), pausa entre frases 450 ms. Medir: `tests/navegador/tiempos105.py`.
   (f) **Aprende de las correcciones** (`aprenderDeCorreccion`): frase no entendida + la misma idea dicha bien ≤40 s después (mismo producto o número) → `st.reescritas`.
   (g) «oye Rex» con más formas («ojo Rex», «hoy es Rex», «oye que Rex», «oye rei»). (h) «los chicos de la cocina» = producción.
   Pruebas: `tests/avisos.test.js` (miles de frases), `tests/despacho.test.js`, `tests/navegador/r106.py`. Investigación: `docs/RUIDO-Y-APRENDIZAJE.md`.
   **3-nov-2026, V8 (pedidos de Freddy: «que detecte la voz como tú», listas limpias, autoentrenamiento)**:
   (a) **Oído propio de Rex en la PC** (`oido/`): `servidor_oido.py` (WebSocket ws://127.0.0.1:8973/oido; detector de voz Silero con 0,5 s de audio antes
   de cada frase y umbral 0,4) + Whisper small int8 de sherpa-onnx, corrido con `whisper_pista.py` (onnxruntime) para darle una **PISTA**: el texto que
   espera Rex (nombres en la pregunta del responsable, «sí, de acuerdo» en un sí/no, productos en una orden). Banco de 150 audios: sin pista 93,
   con pista de la pregunta 111. Filtros: `prob_silencio` ≥ 0,55 = ruido (la voz real da < 0,45); copia de la pista solo si además suena a ruido.
   En la página, `OidoPC` imita SpeechRecognition (mismos eventos); `pistaOido()` arma la pista; si el oído no está prendido, sigue el dictado de
   Chrome solo. Con Whisper el texto llega al FINAL de la frase: `_ocupado()` + `vencio()` esperan (hasta 18 s) mientras alguien habla o se escribe.
   Instalar: `INSTALAR-OIDO.bat` → `oido/instalar_oido.py` (venv, pip gratis, modelos de Hugging Face o GitHub); `INICIAR.bat` lo prende solo.
   Prueba acústica de punta a punta: `tests/navegador/oido107.py` (micrófono falso de Chromium con voces Piper, ruido real de la bodega, la voz real
   de Freddy y audio saturado; corre SIN `PYTHONPATH=.`: sitecustomize.py bloquea el WebSocket).
   (b) **Listas limpias** (`decide[l]`, `preguntarDecision`, `V.decision`, `E.quitarPedido`, `E.resolverDiferencia`): llegada con faltante →
   «¿Qué hago con lo que falta: lo devuelvo a la bodega, sigue en camino, o se perdió?»; despacho incompleto → «Queda pendiente … ¿Lo dejo pendiente o lo
   quito?»; después el responsable. «Quita el pedido del local», botones «Quitar» y los de la franja roja; un pedido de > 30 min o una diferencia de
   > 10 min se recuerdan UNA vez (`recordarPendientes`). Movimientos nuevos: `pedido_quitado`, `devolucion`, `sigue_en_camino`, `perdida` (se deshacen).
   Pruebas: `tests/listas.test.js`, `tests/navegador/r107.py` (también `IOS=1`).
   (c) **Stock**: `ejecutar` vuelve a revisar el inventario justo antes de mover («No puedo hacer el movimiento: en la bodega no hay chantilly»).
   (d) Volumen: `st.config.vozVolumen` (1 = máximo del navegador); «habla más fuerte» explica cómo subirlo en Windows (pestaña Comunicaciones).
   (e) **Autoentrenamiento gratis**: `tools/repo_entrenamiento.py SALIDA` arma lo que va al repositorio público (código sin nombres, pruebas de node,
   `.github/workflows/rex.yml` cada 30 min: junta aportes, corre `tests/correr.js`, y si cambió el código y todo pasa, rearma index.html;
   `rex-agente.yml` opcional con Claude y la suscripción del dueño; receta `.claude/skills/entrenar-rex/SKILL.md`).
   **Nombres**: el responsable puede ser cualquiera y cambiar cada día (`V.nombreResponsable`: nombres nuevos se aprenden; `COMUNES` evita confundir a Martha con María). Medir tiempos reales: Ajustes → «Copiar diagnóstico» (`diag.lat`).
9. **Modo rápido** (`st.config.modoRapido`): orden clara por voz → se registra sin «¿sí o no?» y se pregunta el
   responsable; «no/cancela» en ese momento la deshace (`deshacerRapido`).
10. Antes de entregar corre las baterías: `tests/sino.test.js`, `tests/ordenes.test.js`, `tests/seguir.test.js`, `tests/entrenamiento.test.js` y `tests/entrenamiento2.test.js` (decenas de miles de órdenes generadas de todas las clases: deben dar 100 %), `tests/nombres.test.js`, `tests/movimientos.test.js`, `tests/pedidos.test.js`, `tests/esperar.test.js`, `tests/corregir.test.js`, `tests/despertar.test.js`, `tests/aplauso.test.js` y las conversaciones
    simuladas con Rex (micrófono simulado con eco), incluida la de la ventana tipo Siri. Una falla de voz se arregla con una prueba que la repita.

## La voz de Rex
Rex usa la voz más natural del navegador (`puntajeVoz`). Las voces naturales (Andrea y Luis, de Ecuador) vienen gratis en
**Microsoft Edge**; en Chrome solo hay voces más robóticas. Para los equipos de la tienda, usar Edge.

## Colores
Bodega verde, **Producción rosado**, **Local naranja**.

## Cómo probar
- `node tests/parser.test.js`, `node tests/engine.test.js`, `node tests/despacho.test.js` , `node tests/sino.test.js`, `node tests/ordenes.test.js`, `node tests/seguir.test.js` (todo debe dar 0 mal) `node tests/nombres.test.js`, `node tests/aplauso.test.js`, `node tests/entrenamiento.test.js [semilla] [cantidad]` y `node tests/entrenamiento2.test.js [semilla] [cantidad]` (los dos últimos deben dar 100 %; prueba varias semillas).
- Pruebas de navegador con Playwright y micrófono simulado: abrir `dist/...html?datos=prueba` (datos de
  ejemplo). `&sinresp` apaga la pregunta del responsable y `&sin3d` oculta el 3D de Operar y `&lento` apaga el modo rápido (para pruebas viejas).
- Antes de entregar: armar con `python3 build.py`, probar, y revisar que no haya errores en la consola.

## Publicar (página web, sin contraseña desde el 28-oct-2026)
`python3 build.py --preprod=CARPETA` (sin nombres del personal; cada equipo los aprende) y se suben `index.html`,
`robots.txt`, la carpeta `rex/` y `.github/workflows/rex.yml` al repositorio `frutireex-ec/frutireex-bodega` (GitHub Pages).
Antes se cifraba con `tools/privado.py`; el dueño pidió quitar la contraseña.

## Rex: el cerebro compartido (carpeta `rex/` del repositorio)
- `rex/cerebro.json`: lo que aprendió todo el equipo (sí/no, traducciones). La página lo lee al abrir (`cargarCerebro`).
- `rex/aprendizaje/*.json`: aportes que cada equipo exporta (Catálogo → Voz → «Exportar lo que aprendió Rex»).
- `rex/entrenar.py` (lo corre solo la acción «Entrenar a Rex»): junta los aportes por mayoría y escribe `PENDIENTES.md`.
- Para seguir entrenando a Rex: toma las frases de `PENDIENTES.md`, agrégalas al intérprete (`src/parser.js`) y a las
  pruebas (`tests/sino.test.js`, `tests/ordenes.test.js`), arma y publica. Nunca publiques nombres del personal ni claves. `build.py --preprod` se detiene solo si el código (comentarios incluidos) trae nombres del personal o una clave `sk-ant-…`: usa nombres de ejemplo genéricos (Ana, Rosa, Luis) en los comentarios del código de la página (src/).

## No hacer
- No modificar la web de la marca (`frutireex-web`) salvo que el dueño lo pida (31-oct-2026 pidió el modo Halloween y actualizar «Nuestros clientes»; ese repositorio es aparte).
- No poner claves (Contífico, Anthropic) ni datos privados en el código. Contífico se conecta en el
  proyecto aparte «Frutireex Contabilidad» cuando llegue la clave.
- No crear carpetas de versión nuevas (V9…) sin que el dueño lo pida; los cambios van en V8.
