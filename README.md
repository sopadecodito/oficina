# Nuestra oficina ♥

Una oficina virtual en pixel art para dos personas: cada quien tiene su escritorio (José con dos monitores, ella con su laptop programando), sus estatus, chat escrito, voz de proximidad, regalos que se quedan en el escritorio del otro, inventario, música compartida, silla giratoria, "poke" y un ciclo de día con la hora real.

## Probarlo ya (modo demo)

Sin configurar nada, la página corre en **modo demo**: todo se sincroniza entre pestañas del mismo navegador.

1. En esta carpeta: `python -m http.server 8000` (o usa la extensión Live Server de VS Code).
2. Abre `http://localhost:8000` en **dos pestañas**, entra como José en una y como Ella en la otra, con el mismo código de oficina.

> Abrir `index.html` con doble clic no funciona: el navegador bloquea los módulos JS con `file://`.

## Hacerlo real (Firebase, gratis)

GitHub Pages solo sirve archivos estáticos, así que la sincronización en tiempo real pasa por **Firebase Realtime Database** (el plan gratuito Spark sobra para dos personas).

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** (puedes desactivar Analytics).
2. Menú **Compilación → Realtime Database → Crear base de datos** → elige ubicación → **Comenzar en modo bloqueado**.
3. En la pestaña **Reglas**, pega el contenido de `database.rules.json` y **Publicar**.
4. Ve a **⚙️ Configuración del proyecto → General → Tus apps → `</>` (Web)**, registra la app (sin Hosting) y copia el objeto `firebaseConfig`.
5. Pégalo en `config.js`, en `firebase: { ... }`. Revisa que traiga `databaseURL`; si no viene, cópiala de la página de Realtime Database.
6. En `config.js` cambia `ella: "Ella"` por su nombre.

La config de Firebase no es secreta (siempre viaja al navegador). Lo que protege su oficina es el **código de oficina**: las reglas no permiten listar salas y solo aceptan códigos de 12 caracteres o más. Usa el botón 🎲 para generar uno largo y no lo publiques.

## Publicar en GitHub Pages

1. Crea un repo (por ejemplo `oficina`) y sube **todo el contenido de esta carpeta** a la raíz.
2. En el repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. En 1 o 2 minutos queda en `https://TU-USUARIO.github.io/oficina/`.
4. Entra, elige un código y mándale el link que queda en la barra de direcciones (`...#sala=tu-codigo`). Así a ella se le llena el código solo.

## Cómo se usa

| Qué | Cómo |
|---|---|
| Moverse | WASD / flechas, o clic (o tap en el cel) donde quieras ir |
| Estatus | Botones de "Mi estatus". Se ven sobre tu personaje y en las tarjetas de la derecha, con "desde hace X min" |
| Chat escrito | Panel derecho (Enter para escribir). Los mensajes también salen como globito sobre el personaje |
| Voz de proximidad | **🎤 Activar voz** (los dos). Se escuchan cuando sus personajes están cerca; el volumen baja con la distancia y se corta lejos. El anillo punteado marca tu alcance |
| Pausa automática | Mientras estás en *En llamada* / *En junta* (o ella en *Junta*), tu micrófono se apaga y no oyes la voz del otro, para que nada se cuele en una llamada real. Se desactiva con la casilla |
| Regalos |  **🎁 Llevar regalo** → eliges objeto (incluye Cheetos Flamin' Hot 🔥) y nota opcional → tu personaje lo carga → caminas a su escritorio → **E** (o tocas el aviso). Se queda ahí aunque cierren la página. Clic en un regalo para ver de quién es y su nota |
| Inventario | En tu escritorio, clic en un regalo → **🎒 Guardar**: pasa a tu inventario y ahí se queda para siempre. Desde **🎒 Inventario** lo puedes regresar al escritorio. Si tu escritorio está lleno (6) y te llega otro, el más viejo se guarda solo en tu inventario: nunca se borra nada |
| Silla | Empiezas sentado. **F** o 🪑 para pararte/sentarte (si estás lejos, caminas solo a tu silla). La silla de José es giratoria: sentado, muévete y **ruedas con la silla** por la oficina; **R** o 🔄 para **dar vueltas**. Ella también lo ve |
| Música | **🎵 Mi música**: escribe "Canción — Artista" (y un link si quieres). Aparece en tu tarjeta, con una notita sobre tu personaje y al hacer clic en ti. Con Spotify conectado se actualiza sola (ver abajo) |
| Hora real | La oficina sigue la hora de tu compu: mañana con luz clara, a las 5 pm un atardecer naranja que pinta toda la oficina, y de noche cielo con estrellas y luna mientras se prenden la lámpara, los monitores y la máquina de snacks |
| Ver a alguien | Clic en un personaje: estatus, desde cuándo y qué canción escucha |
| Ausente | Si alguien está en otra pestaña, su personaje muestra "zZ" y su punto se pone amarillo |

## Ver otras horas del día

Agrega `?hora=17` a la dirección (antes del `#`) para ver la oficina a esa hora, por ejemplo `https://TU-USUARIO.github.io/oficina/?hora=17#sala=...`. Con `?rapido` pasa una hora por segundo.

## Spotify automático (opcional)

Sin esto, la música se escribe a mano. Para que se detecte sola:

1. Entra a <https://developer.spotify.com/dashboard> → **Create app**. En **Redirect URIs** pon la dirección exacta de tu página **con la diagonal final**, por ejemplo `https://TU-USUARIO.github.io/oficina/` (y si quieres probar local: `http://127.0.0.1:8000/`). Marca **Web API**.
2. Copia el **Client ID** y pégalo en `spotifyClientId` de `config.js`.
3. En **User Management** de tu app agrega el correo de Spotify de tu novia.
4. Cada quien abre **🎵 Mi música → Conectar Spotify** una vez.

Ojo: desde 2026 las apps de Spotify en modo desarrollo piden que **el dueño de la app tenga Spotify Premium** y permiten hasta 5 usuarios (ustedes dos caben de sobra). Si no tienes Premium, usa la opción manual.

## Personalizar

Todo está en `config.js`: nombres, estatus (emoji, color, si pausan la voz), la lista de regalos, quién tiene silla giratoria y Spotify. Cualquier emoji se convierte solo en pixel art.

## Si la voz se queda en "Conectando…"

Las redes corporativas a veces bloquean las conexiones directas (UDP). La solución es un servidor **TURN**. Por ejemplo, <https://www.metered.ca/stun-turn> tiene plan gratis: crea una cuenta, copia sus credenciales y agrégalas a `iceServers` en `config.js`:

```js
{ urls: "turn:global.relay.metered.ca:443?transport=tcp", username: "…", credential: "…" },
```

El chat, los estatus, los regalos y el poke funcionan aunque la voz no conecte.

## Archivos

```
index.html            estructura de la página
styles.css            estilo pixel
config.js             ← lo que editas
database.rules.json   reglas para Firebase
js/main.js            juego, interfaz, chat, regalos, inventario, poke, silla
js/world.js           mapa, muebles, colisiones, pantallas animadas
js/art.js             personajes, sillas y sprites pixel art
js/daylight.js        ciclo de día/noche con la hora real
js/music.js           Spotify (opcional)
js/voice.js           voz WebRTC 1 a 1
js/net.js             Firebase o modo demo
js/sfx.js             sonidos chiptune
```
