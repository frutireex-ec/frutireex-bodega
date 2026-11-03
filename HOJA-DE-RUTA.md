# De Rex a Jarvis: el cerebro central de Fruti Reex

| Etapa | Qué hace | Estado |
|---|---|---|
| 1. Rex en la página | Voz en Chrome/Edge para bodega, producción y local; aprende frases en cada equipo. | Listo |
| 2. Cerebro compartido | `rex/cerebro.json` en este repositorio: lo que aprende un equipo lo saben todos; se entrena solo. | Listo |
| 3. Datos compartidos | Una base de datos para que los tres lugares, en equipos distintos, vean el mismo inventario en vivo. | Siguiente |
| 4. Rex con IA | Un servicio pequeño (con la clave guardada en el servidor, no en la página) que use a Claude para entender todo y responder preguntas: «¿cuánto vendimos?», «¿qué hay que comprar?». | Después |
| 5. Jarvis | El mismo cerebro conectado a Contífico, la contabilidad, las tareas del equipo y los avisos: «Jarvis, registra esto», «Jarvis, ¿cómo vamos este mes?». | Futuro |

## La voz de Rex: de hoy a un oído propio (28-oct-2026)

Hoy Rex usa el dictado que trae Chrome/Edge (gratis, sin instalar nada) y un intérprete propio que entiende el español de la
bodega. Esto es lo que se evaluó para que oiga mejor con ruido (radio, música, eco) y qué se necesita para cada paso.

| Opción | Qué mejora | Costo / peso | Qué falta |
|---|---|---|---|
| Micrófono de diadema o direccional (USB) | Lo más barato y lo que más ayuda con ruido: el micrófono queda a 3 cm de la boca. | Un equipo por lugar. | Comprarlo. |
| Edge en lugar de Chrome | Voz natural de Rex (Andrea y Luis, de Ecuador). | Gratis. | Abrir la página en Edge. |
| Whisper en el navegador (transformers.js) | Entiende mejor con ruido y acentos; corre en el propio equipo, sin enviar el audio. | Modelo `tiny` ≈ 120 MB, `base` ≈ 210 MB; mejor con tarjeta gráfica (WebGPU). | Una etapa aparte: cargar el modelo y cortar el audio por frases. |
| Palabra de activación propia (openWakeWord) | «Oye Rex» detectado por un modelo pequeño, sin depender del dictado. | Modelo pequeño que corre en el navegador. | Entrenar un modelo con la frase «oye Rex» (grabaciones de varias personas). |
| Doble palmada (idea del video «Jarvis como Iron Man») | Despertar a Rex sin hablar, útil con mucho ruido. | Gratis. Código propio con Web Audio (sin librerías). | **Hecho como opción apagada** (Catálogo → Voz → «Despertar a Rex también con un doble aplauso»). Falta probarlo con el micrófono real de la bodega y ajustar la sensibilidad. |
| Reconocimiento en el propio equipo (Chrome/Edge 139 o más nuevo) | El texto sale antes porque la voz no viaja a internet. | Chrome descarga el español una sola vez. | **Hecho como opción apagada** (Catálogo → Voz → «Reconocer la voz en este equipo»); si falla, Rex vuelve solo al normal. Falta probarlo en los equipos reales. |
| Servicio con IA (etapa 4) | Entiende frases libres y responde preguntas. | Clave de IA guardada en un servidor. | Crear el servicio. |

Lo que más enseña a Rex son las frases reales del equipo: cada semana, Catálogo → Voz → «Exportar lo que aprendió Rex» y subir
el archivo a `rex/aprendizaje/`. En `PENDIENTES.md` queda lo que todavía no entiende.

## Lo que se hizo para contestar rápido (28-oct-2026, tarde)

- **Un solo micrófono siempre abierto**: pasar de una pregunta de bodega a una de producción ya no cierra y reabre el dictado
  (ahí se perdían las primeras palabras: «sí, claro, de una»).
- **Se puede contestar encima de la voz de Rex** y se calla al instante; el eco de su voz se descuenta.
- **Pantalla silenciosa**: no se muestra lo que Rex oyó (se puede encender en Ajustes); la carita late cuando oye voz.
- **Seguimientos** («uno más», «otro igual», «y también una caja de leche») usan la orden anterior.
- **Entrenamiento**: `tests/entrenamiento.test.js` genera miles de órdenes con las formas de hablar de la gente (sin tildes, relleno,
  «necesito llevar…», «en producción», cifras o palabras). Subió de 82 % a 99,7 %.
- **Diagnóstico** (Catálogo → Voz → «Copiar diagnóstico»): navegador, estado del dictado, contadores y últimos eventos.

### Lo que NO se pudo probar desde la nube (y por qué sigue en la hoja de ruta)
El dictado real de Chrome/Edge no corre en el servidor donde se prueba; se usa un micrófono simulado muy parecido (demora de arranque,
voz lenta, eco, confianza baja). Los modelos de voz que corren en el propio equipo (Vosk en español ≈ 40 MB, Whisper) no se pudieron
descargar desde ese servidor, así que quedan para la etapa de «oído propio»: palabra de activación «Oye Rex» sin depender de Chrome,
y sí/no por gramática cerrada (mucho más rápido y con menos errores que el dictado libre).

## Despertar rápido, cualquier nombre y cierres (28-oct-2026, noche)

Lo que pidió Freddy: que «Oye Rex» sea inmediato, que el responsable pueda ser cualquier nombre que cambie cada día, que solo quede
la carita de Rex (verde si escucha, apagada si no), que se cierre a los 5 s sin hablar, y que se abra con un «ta» y se cierre con
«gracias tío Rex», «listo Rex», «de una Rex»…

- **«Ta» al instante**: «Oye Rex» (también «oye tío Rex», «oye Rex por favor», «hola Rex», «buenas Rex»…) suena el tono apenas se oye,
  sin esperar a que Chrome cierre la frase y sin hablar encima. Es el saludo por defecto; la frase hablada se puede volver a activar en Ajustes.
- **Orden adelantada**: si la orden ya está completa y quieta unos 0,8 s, Rex la toma sin esperar el cierre de la frase del navegador
  (que tarda 1–2 s). Si después llega algo más, lo toma aparte; si el final cambia lo dicho, deshace y toma la frase corregida.
- **Responsable = cualquier nombre**: «Ana es la responsable», «yo, Luis», «Rosa», «Pedro», «fue Marta»… (cualquier nombre, aunque el dictado lo escriba un poco distinto)
  La lista del personal no se publica; cada equipo aprende los nombres que le dicen.
- **Cierres**: «gracias», «gracias tío Rex», «listo Rex», «de una Rex», «chao», «eso es todo»… cierran a Rex sin tomarse como nombre ni como
  orden. Con una pregunta de sí/no abierta, «de una Rex» o «listo Rex» siguen siendo un «sí».
- **Carita sola**: se quitó la barra de mensajes de abajo. Verde = escuchando; apagada = sin comando de voz.
- **Se cierra a los 5 s** de silencio (con su sonido de cierre).
- **Doble aplauso** (opción apagada) y **reconocimiento en el equipo** (opción apagada): ver la tabla de arriba.

### Qué se investigó (repositorios y APIs)
| Proyecto / API | Conclusión |
|---|---|
| openWakeWord (modelos «Hey Jarvis», `krishk2/Hey_jarvis-Wake-word`, `JonesHong/web-asr-core`) | Modelos en inglés y con licencia CC BY-NC-SA 4.0 (no comercial). Para «Oye Rex» en español hay que entrenar uno propio con grabaciones de varias personas. Queda para la etapa «oído propio». |
| Porcupine (Picovoice) | Funciona en el navegador, pero necesita crear una cuenta y una clave (AccessKey); no se hizo por eso. |
| vosk-browser / Whisper en el navegador | Modelos de 40–200 MB que no se pudieron descargar desde el servidor de pruebas. Siguen en la hoja de ruta. |
| `SpeechRecognition.available/install` y `processLocally` (Chrome/Edge 139+) | Implementado como opción apagada. |
| Detección de aplauso | Código propio con Web Audio (AudioWorklet), sin dependencias. |

### Pendiente de probar en la bodega (la nube no tiene micrófono real)
Tiempo real de «Oye Rex» con el Chrome/Edge de cada equipo, el aplauso con el micrófono real y el reconocimiento en el equipo.
Si algo va lento: Catálogo → Voz → «Copiar diagnóstico» y pegarlo en el chat (incluye la medición de cada paso).

## Rex en iPhone (30-oct-2026)

En iPhone todos los navegadores usan el motor de Safari (WebKit). Si la página habla con la voz del navegador mientras el micrófono está
abierto, el micrófono queda sordo sin avisar ([bug 321436 de WebKit](https://bugs.webkit.org/show_bug.cgi?id=321436)); además casi nunca
llega el «final» de la frase. En iPhone Rex contesta con sonidos y en pantalla (sin voz hablada), toma la frase cuando la persona se calla
y se le puede tocar la carita para estrenar un micrófono. Probado con un micrófono simulado del iPhone; falta un iPhone real.

| Siguiente idea | Qué resolvería | Qué hace falta |
|---|---|---|
| Rex con Claude como cerebro (en la misma página) | **Hecho (30-oct, en pruebas)**: preguntas («¿qué hizo Ana hoy?», «¿cuánto hay de todo?») y correcciones («no, eran tres») con herramientas que leen la página; lo que propone se confirma con «sí». | La clave de la API de Anthropic guardada en cada equipo. Falta probarlo con la clave real. |
| Rex por WhatsApp (WhatsApp Business + Claude) | Notas de voz o textos al número de la heladería; funciona en cualquier celular sin pelear con el micrófono del navegador. | Cuenta de WhatsApp Business verificada en Meta (la crea el dueño), un inventario compartido en internet y un agente siempre prendido. |
