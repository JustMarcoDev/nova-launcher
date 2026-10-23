# Nova Launcher

Launcher de Minecraft para Windows 11: Vanilla, Fabric, Forge y NeoForge, todas las versiones oficiales (alpha, beta, snapshot y release), instancias automáticas, mods de Modrinth y CurseForge, Java automático y actualizaciones automáticas.

## Cómo conseguir la app

1. Sube este proyecto a GitHub (repositorio público `nova-launcher`).
2. En la pestaña **Actions**, ejecuta **Crear version** (Run workflow).
3. Descarga `Nova Launcher Setup x.x.x.exe` desde **Releases** e instálalo (puedes elegir la carpeta).

Alternativas: `Crear-Instalador.bat` (genera el instalador en tu PC) o `Abrir-Launcher.bat` (abre el launcher sin instalar).

## Cómo publicar una actualización

1. Cambia los archivos del proyecto.
2. Sube el número de `"version"` en `package.json` y añade su entrada al «Historial de actualizaciones» de este README (el flujo la copia a las notas de la release). Sin subir el número los launchers ya instalados no detectan la actualización.
3. `git add .`, `git commit -m "vX.Y.Z"` y `git push`.
4. En **Actions**, ejecuta de nuevo **Crear version**.
5. Los launchers instalados la descargan solos y se instala al cerrarlos. También puedes pulsar **Ajustes → Acerca de → Buscar actualizaciones**.

## Sobre los números de versión

Las versiones de Windows y de GitHub solo admiten tres números (`0.2.8`), no cuatro (`0.2.7.1`). Por eso este arreglo es la **0.2.8** y la gran actualización pasa a ser la **0.3.0**.

## Actualizar desde el propio launcher (desde la 0.2.5)

Cuando publiques una versión nueva en GitHub, el launcher la detecta solo:

1. Aparece un aviso en la portada y un botón **Actualizar** en la barra superior.
2. Pulsa **Descargar** (o se descarga sola si tienes activado «Descargar actualizaciones automáticamente» en Ajustes).
3. Cuando termine, el launcher avisa con una cuenta atrás de 10 segundos y se reinicia solo (puedes pulsar **Cancelar**). Tus mundos, mods, instancias y ajustes se conservan.

También puedes comprobarlo a mano en **Ajustes → Acerca de → Buscar actualizaciones**.

## Redes sociales del creador

La pestaña **Redes** está vacía de momento. Para activar una red, abre `index.html`, busca `const SOC=[` y pon el enlace en `u:""` (por ejemplo `u:"https://www.youtube.com/@tucanal"`).

## Discord: que todos vean «Nova Launcher» como actividad (desde la 0.2.7)

Con Discord y el launcher abiertos a la vez, el perfil muestra **Nova Launcher** con el logo, la versión del launcher y, al jugar, la versión de Minecraft y el tiempo de partida (como pasa con Valorant). Para que funcione en **todos los PCs** sin que nadie configure nada, hay que hacer esto **una sola vez**:

1. Entra en https://discord.com/developers/applications con tu cuenta y pulsa **New Application**.
2. Ponle el nombre **Nova Launcher** (es el nombre que verán tus amigos en «Jugando a…»).
3. En **General Information** copia el **Application ID**.
4. Abre `main.js`, busca la línea `const DISCORD_CLIENT_ID = '';` y pega el número entre las comillas.
5. En el mismo sitio de Discord Developers: **Rich Presence → Art Assets → Add Image(s)**, sube el archivo `assets/discord-logo.png` (viene en el proyecto) y ponle el nombre `logo`. Discord puede tardar unos minutos en mostrarlo.
6. Publica la versión como siempre (`git add .`, `git commit`, `git push`, Actions).

Mientras tanto, para probarlo en tu PC sin publicar, pega el número en **Ajustes → Cuenta → ID de aplicación de Discord**.

## Servidores populares (desde la 0.2.10)

La pestaña **Servidores** (Alt + 4) muestra servidores conocidos con jugadores en línea y un botón **Unirse**: abre Minecraft en la versión adecuada y entra solo al servidor. La lista está en `js/servidores.js` (constante `SERVERS`); puedes añadir o quitar los que quieras.

## Instancias, mods y copias de seguridad (desde la 0.2.11)

- **Instancias → Opciones:** nombre, icono, color, RAM y Java propios, versión de Fabric/Forge/NeoForge, duplicar, abrir carpeta, exportar y borrar.
- **Gestor de mods:** botón «Mods» de cada instancia. Muestra el nombre real de cada mod (vía Modrinth), permite activarlo o desactivarlo, borrarlo, añadir un `.jar` y actualizarlo.
- **Exportar / importar:** `.mrpack` (Modrinth, ligero) o `.zip` (todo dentro, solo para Nova Launcher). El botón «Importar» de la pestaña Instancias abre ambos.
- **Copias de los mundos:** se guardan solas en `%APPDATA%\.nova\backups` antes de actualizar mods (máximo 10 minutos entre copias automáticas). Se pueden crear a mano y restaurar desde Opciones → Copias de seguridad. Ajustes → Juego controla cuántas se conservan.
- **Si Minecraft falla:** aparece una ventana con las últimas líneas del registro y la causa probable. Cada partida se guarda en `%APPDATA%\.nova\logs` (las 20 últimas).
- **Descargas:** los mods y modpacks se verifican con su huella (SHA) y se reintentan hasta 3 veces; los modpacks bajan 6–8 archivos a la vez.

## Cuentas, consola y comodidad (desde la 0.2.12)

- **Varias cuentas:** pulsa tu nombre en la barra superior para cambiar entre cuentas Microsoft y offline, añadir o quitar. También en Ajustes → Cuenta. Los tokens de Microsoft se guardan solo en tu PC.
- **Tiempo jugado:** cada instancia muestra las horas jugadas y la última vez que se abrió; el total sale en la tarjeta Estado.
- **Capturas:** botón «Capturas» de cada instancia (o el de arriba de la pestaña Instancias para ver todas). Abrir, copiar al portapapeles y borrar (van a la papelera).
- **Consola** (`Alt + 6`): salida del juego con errores en rojo y avisos en amarillo, buscador, copiar y guardar en archivo.
- **Bandeja y avisos:** al minimizar, Nova Launcher se queda junto al reloj. Avisa cuando termina una descarga, hay una actualización lista o Minecraft se cierra por un error. Se pueden apagar en Ajustes → Juego.
- **Novedades:** la primera vez que abres una versión nueva sale la ventana con lo que trae. También en Ajustes → Acerca de → Novedades.
- **Mundos:** Instancias → Opciones → Mundos. Lista los mundos, copia uno a otra instancia e importa mapas `.zip`.
- **Tus servidores:** pestaña Servidores → Mis servidores. Se muestran con ping y jugadores y se añaden también a la lista de servidores de Minecraft (sin borrar los que ya tengas).
- **Shaders:** al instalar un shader en una instancia sin Iris, el launcher ofrece instalar Iris y Sodium (Oculus y Embeddium en Forge), crear una instancia Fabric preparada o instalar solo el shader.
- **Asistente de bienvenida** (primer inicio, o Ajustes → Acerca de): cuenta, RAM recomendada, color/tema y primera versión.
- **Buscador `Ctrl + K`:** versiones, instancias, ajustes y mods de Modrinth.
- **Importar desde otros launchers:** `.minecraft` oficial, CurseForge y Prism/MultiMC (Instancias → Otros launchers). Copia mundos, mods, configuración, texturas y shaders; lo original no se toca. Las instancias con Quilt no se pueden importar.
- **Ajustes en un archivo:** Ajustes → Acerca de → Guardar mis ajustes. Exporta e importa colores, tipografía, agujero negro y accesibilidad.

## Publicar con notas automáticas, canal Beta y volver atrás (desde la 0.2.12)

- **Notas de la release:** el flujo **Crear version** (`.github/workflows/release.yml`) copia a la página de la versión la entrada de ese número en «Historial de actualizaciones» de este README (la saca `scripts/release-notes.js`). Por eso hay que escribir la entrada **antes** de ejecutar el flujo.
- **Beta:** si la versión de `package.json` lleva guion (por ejemplo `0.2.14-beta.1`), el flujo la publica como *pre-release*. Solo la reciben los launchers con Ajustes → Rendimiento → Canal de actualizaciones = **Beta**. Los de **Estable** la ignoran. Para una beta sin entrada propia se usa la de la versión sin el sufijo.
- **Volver a la versión anterior:** Ajustes → Acerca de → Volver a una versión anterior. Lista las releases de GitHub más antiguas que la instalada y ejecuta su instalador. Para que no se actualice sola otra vez, desactiva «Buscar actualizaciones al abrir»; vuelve a activarlo en Ajustes → Rendimiento cuando quieras.

## Instalar para todos los usuarios o solo para ti (desde la 0.2.15-beta.13)

El instalador pregunta cómo instalar:
- **Solo para mí** (`%LOCALAPPDATA%\Programs\Nova Launcher`): no pide permisos de administrador, ni al instalar ni al actualizar.
- **Para todos los usuarios del equipo** (`Archivos de programa`): pide permisos de administrador al instalar y también al actualizar (aviso de Windows, UAC), porque la carpeta es del sistema.

Las actualizaciones automáticas respetan el modo con el que instalaste. (De la beta.7 a la beta.12 el instalador instalaba siempre «solo para mí»; esas instalaciones siguen igual y no piden administrador.)

## Actualizar el menú de Nova sin sacar una versión nueva del launcher (desde la 0.2.15)

Cada release sube, junto al instalador, los `nova-menu-<mc>.jar` y un `nova-menu.json` con la versión, el enlace y el sha256 de cada uno (lo genera `scripts/nova-menu-json.js` dentro de «Crear version»).
Antes de lanzar Minecraft con el menú de Nova, el launcher mira ese JSON (caché de 6 horas; si no hay conexión no espera y usa lo último que sabe). Si hay un menú más nuevo que el que trae el launcher, lo descarga, comprueba el sha256 y lo usa. Si la descarga o la huella fallan, se usa el `.jar` incluido en `assets/mods/`. **Nunca se lanza un jar sin verificar.**
Con el canal Beta se mira la release más nueva (beta o estable); con Estable, la última estable. `mod/min-launcher.txt` indica la versión mínima del launcher que admite el jar nuevo (los launchers más antiguos lo ignoran).

## Probar versiones beta con otras personas

1. Publica la versión con guion en `package.json` (por ejemplo `0.2.14-beta.1`) y ejecuta **Crear version**. Queda como *pre-release* en GitHub.
2. Quien quiera probarla entra en **Ajustes → Rendimiento → Canal de actualizaciones** y elige **Beta**; después pulsa **Acerca de → Buscar actualizaciones**. También puede descargar el instalador directamente desde la página de la release.
3. Quien siga en **Estable** no ve las betas. Cuando publiques una versión normal (`0.2.14`), los de Beta la reciben igual.
4. Si el repositorio es público, cualquiera puede activar Beta. Para que solo entren personas concretas, repartes tú el aviso (Discord, grupo…) y no lo anuncias fuera. El launcher no tiene lista de invitados.

## Revisión automática, idiomas y archivos (desde la 0.2.13)

- **Revisión antes de publicar.** «Crear version» ahora ejecuta `npm test` (sintaxis, archivos enlazados, canales entre la app y la interfaz, versión, notas y traducciones, y una prueba de la interfaz en un navegador simulado) y `npm run smoke` (abre la app de verdad y mira que cargue sin errores). Si algo falla, el instalador no se sube. El flujo «Revision» hace lo mismo en cada `git push`, sin publicar nada.
- **Estructura.** `index.html` solo tiene el esqueleto; los estilos están en `css/style.css` y el código en `js/` (un archivo por pestaña o función). Se cargan en el orden que marca `index.html`.
- **Idiomas.** El español es la base. Hay seis: `es` (España), `es-419` (Latinoamérica, solo cambia las palabras distintas), `en`, `fr`, `de`, `it` y `pt`. Las traducciones están escritas con IA y no las ha revisado nadie nativo: si ves algo raro, corrígelo en su archivo de `lang/`. Cada idioma es un archivo en `lang/` (mira `lang/en.js`): la clave es el texto en español y el valor su traducción; `{1}`, `{2}`… son partes variables. Para añadir uno, copia `lang/en.js`, cambia `en` por su código, traduce y enlázalo en `index.html` antes de `js/idioma.js`. Lo que no esté traducido se ve en español.
- **Descargas.** El cuadro de pausa, cancelar y límite controla lo que descarga el propio launcher (Java, mods, modpacks, instaladores). Los archivos del juego que baja Minecraft por su cuenta no pasan por él.

## Firma del instalador (evitar el aviso de Windows)

Windows SmartScreen avisa de cualquier instalador **sin firma digital** de un editor poco conocido; el aviso desaparece con un **certificado de firma de código**, no con cambios en el programa. Sin él, cada versión nueva vuelve a empezar de cero y avisa.

1. Consigue un certificado de firma de código (por ejemplo Certum «Open Source Code Signing», SSL.com, Sectigo o DigiCert; desde 2024 los EV ya no quitan el aviso al instante: todos, EV y normales, lo quitan al ganar reputación con versiones firmadas seguidas). Azure Artifact Signing (unos 10 €/mes) solo está disponible para particulares en EE. UU. y Canadá, y para empresas en EE. UU., Canadá, la UE y el Reino Unido.
2. Pasa el `.pfx` a base64 (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.pfx")) | Set-Clipboard`).
3. En GitHub: Settings → Secrets and variables → Actions → New repository secret: `WIN_CSC_LINK` (el base64) y `WIN_CSC_KEY_PASSWORD` (la contraseña).
4. Ejecuta «Crear version»: el workflow firma el instalador solo y muestra la firma en el log. Sin los secretos publica sin firmar y lo avisa.

Mientras tanto, a quien le salga el aviso: **Más información → Ejecutar de todas formas**. Si Windows Defender lo marca como virus, se puede enviar el archivo como falso positivo en https://www.microsoft.com/wdsi/filesubmission.

## Fondos y recursos pesados (desde la 0.2.15-beta.12)

Para que el repositorio y el instalador pesen menos, estos archivos **no van en git**:

| Archivo | Dónde vive | Cómo llega al usuario |
|---|---|---|
| `assets/nova-bg.nvb` (agujero negro) | release fija **«recursos»** de GitHub | `Crear version` lo descarga antes de compilar y va dentro del instalador |
| `assets/nova-earth.nvb`, `assets/nova-nebulosa.nvb` | release **«recursos»** | **no** van en el instalador: el launcher los descarga cuando el usuario los elige (en el juego, o en Ajustes → Juego → «Fondos del menú de Nova») |
| `assets/mods/nova-menu-<mc>.jar` | se compilan en `Crear version` | van en el instalador y se publican en `nova-menu.json` |

La release «recursos» tiene un `fondos.json` con la URL, el tamaño y el **sha256** de cada fondo. El launcher lo lee, descarga el archivo mostrando el progreso, comprueba el sha256 y solo entonces lo usa. Sin conexión (o si algo falla) sigue con el agujero negro.

**Subir un fondo nuevo** (necesita la CLI `gh` con sesión iniciada): convierte el vídeo a `.nvb` (`node -e "require('./nvb').convert('video.mp4','assets/nova-nuevo.nvb',{}).then(()=>console.log('listo'))"`) y ejecuta `node scripts/recursos.js subir assets/nova-nuevo.nvb`. Sube el archivo a «recursos» y actualiza `fondos.json` solo. Para que aparezca en el juego hay que añadirlo también al mod (`NovaBgs.java`) y a `NOVA_REMOTE_BG` de `main.js`. También se puede subir desde GitHub: Actions → «Subir recursos» sube todos los `assets/*.nvb` que haya en el repositorio (solo sirve la primera vez, mientras los archivos aún estén en git).

**Compilar en local** (`Crear-Instalador.bat` o `npm run dist`): antes se ejecuta solo `npm run recursos`, que descarga `nova-bg.nvb` y los `.jar` del menú de Nova de la última release (`node scripts/recursos.js bajar nova-bg.nvb` y `node scripts/recursos.js mods`). Lo que ya esté en `assets/` no se pisa.

## HUD, logo de Nova en la lista de jugadores y skins (desde la 0.2.15-beta.12)

**HUD tipo Lunar (menú de Nova en el juego).** FPS, CPS (izquierdo/derecho), coordenadas con dirección, teclas (W A S D, espacio y clics) y zoom con una tecla (`C` por defecto; mantenla pulsada). Cada elemento se activa por separado y se arrastra desde **Editar HUD** (en el menú de pausa y en el panel de Nova del menú principal). Se guarda en los ajustes de Nova y funciona en las 19 versiones. Se dibuja con un mixin al final del HUD de Minecraft (capas `hud-f`/`hud-t`) y el zoom con otro sobre `GameRenderer.getFov` (capas `fov-d`/`fov-f`).

**Logo de Nova junto al nombre (TAB).** Quien juegue con una cuenta **premium** y active «Mostrar que uso Nova» sale con el logo en la lista de jugadores de los demás usuarios de Nova. Necesita un pequeño servidor de presencia (Cloudflare Worker, gratis): está en `servidor/` con sus instrucciones de despliegue. Hasta que lo despliegues y pongas su URL en el campo `novaPresence` de `package.json` (o en la variable de entorno `NOVA_PRESENCE`) el mod no hace nada. La identidad se comprueba con Mojang (`joinServer` + `hasJoined`), así que nadie puede hacerse pasar por otro. Si el servidor no responde, simplemente no se muestra nada.

**Pestaña Skin.** Vista 3D (skinview3d), subir un `.png` de 64×64, modelo clásico o fino y una lista de skins guardadas. Con cuenta **Microsoft** cambia la skin y la capa de tu cuenta con la API de Mojang (la sesión cifrada de la cuenta, nunca sale del PC). Con cuenta **offline** la skin se aplica solo en tu juego (el launcher pasa `-Dnova.skin`/`-Dnova.skinlocal` al mod): los demás jugadores no la ven, es una limitación de Minecraft sin cuenta oficial. Atajo `Alt + 9`.

## Aviso legal

Nova Launcher es un proyecto independiente de **Astrion Studio**. © 2026 Astrion Studio. No está afiliado, aprobado ni patrocinado por Mojang Studios ni por Microsoft. Minecraft es una marca registrada de Mojang Studios.

## ¿Qué es el historial de actualizaciones?

Es una lista (en inglés, *changelog*) con todo lo que cambia en cada versión del launcher, para saber de un vistazo qué se ha **añadido**, qué se ha **mejorado** y qué se ha **quitado**. Cada vez que se publique una versión nueva hay que añadir una entrada al principio de la lista de abajo. La misma lista aparece dentro de la app, en **Ajustes → Acerca de**.

## Regla de versiones: mod y launcher van juntos

Cada vez que cambia el mod (`mod/`) se publica una versión nueva del launcher: mientras dure la fase de pruebas, una beta más (`0.2.15-beta.14`, `beta.15`…). La versión del mod se lee de `package.json`, así que siempre coincide con la del launcher. El launcher se actualiza solo y el usuario recibe el mod nuevo con él.

## Historial de actualizaciones

### 0.2.15-beta.14 — Zoom más suave y HUD ajustable

- **Zoom más satisfactorio**: entra y sale con una curva suave (ya no es rígido) y la cámara se mueve en proporción al zoom, así no se escapa al girar. Se quita la «cámara cinematográfica» que usaba antes. La sensibilidad se restaura al soltar la tecla o abrir un menú.
- **Botón X** en cada elemento del HUD (en «Editar HUD») para desactivarlo; se vuelve a activar con los botones de arriba.
- **Coordenadas más legibles**: X, Y y Z con colores propios, números grandes, dirección y ejes debajo y fondo más oscuro.
- **Se pueden agrandar y achicar**: arrastra la esquina de abajo a la derecha de cada elemento (50 %–300 %); se guarda el tamaño.
- La versión del mod ahora es siempre la del launcher.

### 0.2.15-beta.13 — Instalador para todos o solo para ti, y skins mejoradas

- **Instalador**: vuelve la pregunta «para todos los usuarios / solo para mí». Si se instala para todos, actualizar pide permisos de administrador (UAC); si es solo para tu usuario, no pide nada. Se quita `build/installer.nsh`, que forzaba la instalación por usuario.
- **Skins guardadas en una carpeta del launcher**: al subir un `.png` se guarda solo (ya no hace falta «Guardar en mi lista») y hay un botón «Abrir carpeta de skins».
- **Barra de la skin seleccionada**: «Editar nombre», «Cambiar PNG» y un botón rojo «Eliminar skin»; además cada tarjeta lleva una × roja siempre visible.
- **Arreglo: la skin no salía en singleplayer ni con cuenta Microsoft**. Ahora el launcher escribe `skin-local.png/json` y el mod los lee cada segundo, así que la skin cambia al instante, sin reiniciar y con cualquier tipo de cuenta. Con Microsoft además se sube a Mojang para que la vean los demás. Requiere el mod de Nova (Nova/Fabric 1.20–1.21.11).

### 0.2.15-beta.12 — Fondos fuera del instalador, HUD, logo en TAB y skins

- **Fondos fuera del instalador**: Earth y Nebulosa ya no van dentro del instalador; se descargan de la release fija «recursos» (con `fondos.json`: URL + sha256) la primera vez que los eliges, con barra de progreso y comprobación sha256. Sin internet se queda el agujero negro. El instalador solo lleva `nova-bg.nvb`.
- **Repositorio más ligero**: `assets/*.nvb` y `assets/mods/*.jar` ya no están en git (`.gitignore`); la CI los descarga de «recursos» y de la última release. `scripts/recursos.js` baja/sube recursos. Ver «Fondos y recursos pesados».
- **HUD tipo Lunar** en el menú de Nova: FPS, CPS, coordenadas, teclas y zoom, cada uno activable y arrastrable desde **Editar HUD**. Las 19 versiones.
- **Logo de Nova en la lista de jugadores** (solo premium, con servidor de presencia en `servidor/`; opción «Mostrar que uso Nova»).
- **Pestaña Skin** en el launcher: vista 3D, subir `.png`, clásica/fina, lista guardada; en Microsoft cambia skin y capa; en offline la aplica el mod al jugador local.
- Nota: el servidor de presencia hay que desplegarlo una vez en tu cuenta de Cloudflare (no puede hacerlo el launcher).

### 0.2.15-beta.11 — Botón de actualizar e icono

- **Botón «Reiniciar e instalar»** (aviso de arriba, ventanita de la actualización y icono junto al agujero negro): no hacía nada en la app instalada porque sus acciones estaban en `js/vista-previa.js`, que no se incluye en el instalador. Ahora se enlazan en `js/actualizaciones.js` y `tests/ui.js` lo comprueba.
- **Icono de Nova Launcher** en la barra de tareas: la ventana usa `assets/nova.ico` (multi-tamaño) y los accesos directos del escritorio y del menú Inicio se actualizan con ese icono.
- Traducido el texto «La versión X ya está descargada…» del aviso de actualización.
- Windows SmartScreen («Windows protegió su PC»): se debe a que el instalador no está firmado. Se quita firmando el instalador con un certificado de firma de código (ver «Firma del instalador»).

### 0.2.15-beta.10 — Desinstalar desde Ajustes y botón de actualizar

- **Ajustes → Desinstalación**: botón para desinstalar Nova Launcher. Abre el desinstalador del propio programa y pregunta si quieres borrar también tus instancias, mundos y ajustes (por defecto se conservan).
- **Botón de actualizar** (arriba, junto al agujero negro, y el de Ajustes): ahora muestra «Instalando…» y un aviso al pulsarlo. Si `quitAndInstall` no cierra el launcher en 8 s, se lanza a mano el instalador ya descargado y se cierra la app; si sigue sin pasar nada, avisa de cómo terminar a mano.
- Nota: quien venga de una instalación «para todos los usuarios» (Program Files, hasta la beta.5/6) debe desinstalarla una vez a mano e instalar la nueva; desde ahí las actualizaciones son silenciosas.

### 0.2.15-beta.9 — Menú de Nova en Minecraft 1.20 a 1.21.11

- **19 versiones** con menú de Nova (título + pausa), para Nova y para Fabric: 1.20, 1.20.1–1.20.6, 1.21, 1.21.1–1.21.11 (solo versiones estables). La lista está en `mod/versions.txt` y en `NOVA_MC` de `main.js` (`tests/check.js` comprueba que coinciden).
- **Capas de compatibilidad** (`mod/src/compat/<capa>`): `mod/versions.txt` indica por versión qué capas se compilan (`-Players=…`): API de dibujo (`legacy` 1.20–1.21.1 · `rl` 1.21.2–1.21.4 · `rl5` 1.21.5 · `gui` 1.21.6–1.21.10 · `gui11` 1.21.11), entrada de ratón y teclado (`in-old` hasta 1.21.8 · `in-new` desde 1.21.9) y base del botón (`btn-old` · `btn-new` en 1.21.11). Para añadir una versión nueva: línea en `versions.txt`, `node scripts/add-fabric.js <versión> [loader]` y la versión en `NOVA_MC`.
- **Fabric incluido** en `assets/fabric` para las 19 versiones (loader 0.16.14 hasta 1.21.5 y 0.19.5 desde 1.21.6).
- El workflow «Crear version» compila las 19 y publica sus jars en `nova-menu.json` (tardará más que antes).

### 0.2.15-beta.8 — Filtro de versiones, Fabric API y redes

- **Filtro por versión de Minecraft** en la lista de versiones del asistente de instalación (por defecto, la versión elegida en el launcher si el mod la tiene) y en la lista de versiones de los modpacks.
- **Shaders y texturas** usan el mismo asistente que los mods: versión + filtro de Minecraft y, después, una instancia compatible o una nueva. Los shaders siguen pasando por la comprobación de Iris. Los modpacks crean su propia instancia, así que solo llevan el filtro.
- **Fabric API automática**: al crear o lanzar una instancia Fabric por primera vez se descarga la Fabric API de su versión de Minecraft (Modrinth, con comprobación de huella) si no la tiene. Se hace una sola vez por instancia: si la borras, no se vuelve a poner. No se aplica a modpacks importados.
- **Redes**: enlaces a GitHub (`JustMarcoDev`), Twitch (`justmarcodrt`) e Instagram (`justmarcodev`).

### 0.2.15-beta.7 — Instalar mods con asistente

- **Asistente de instalación de mods**: al pulsar Instalar se abre un panel para elegir el cargador (Fabric, Forge, NeoForge) y la versión del mod (con su versión de Minecraft); con «Siguiente» se elige una instancia compatible o se crea una nueva (nombre y versión de Minecraft). Se instala exactamente el archivo elegido (con comprobación de huella en Modrinth) y sus dependencias obligatorias para esa instancia. Solo para mods; shaders y texturas siguen como antes.
- **Borrar instancia** desde la lista de instancias (con confirmación).
- **Sin permisos de administrador al actualizar**: el instalador ignora una instalación antigua «para todos los usuarios» (clave de HKLM) y siempre instala en modo usuario (`build/installer.nsh`, macro `customInit`). Si el launcher sigue instalado en Archivos de programa, la actualización crea la copia nueva en tu carpeta de usuario; la antigua se puede desinstalar desde Windows.
- **Arreglo**: el botón «Continuar» ya no se dibuja encima del menú de Lanzar juego.

### 0.2.15-beta.6 — Menú de pausa de Nova y fondos más ligeros

- **Menú de pausa de Nova**: sustituye al de Minecraft en 1.20.1, 1.21.1 y 1.21.4 (un jugador y multijugador, sin «Abrir a LAN»). Botones: Volver al juego, Ajustes, Logros, Estadísticas, Abrir launcher y Guardar y salir / Desconectar. El fondo es el juego oscurecido (en 1.20.1 solo oscurecido, sin desenfoque).
- **Fondos de vídeo más ligeros**: el launcher genera 1080p y 720p; el mod usa 720p si la pantalla mide menos de 1080 px o con `-Dnova.lowpower=true` (lo envía el modo de bajos recursos). Los fondos se pausan y liberan texturas fuera del menú de título y decodifican bajo demanda.
- **Más versiones del mod**: Minecraft 1.21.4 (capa de compatibilidad `mod/src/compat`). `mod/versions.txt` admite una tercera columna (`legacy`/`rl`) y `release.yml` compila cada versión.

### 0.2.15-beta.5 — Instalación sin administrador y menú de Nova actualizable

- El instalador ya no pide permisos de administrador (siempre en `%LOCALAPPDATA%\Programs\Nova Launcher`) y las actualizaciones no muestran UAC. Quien lo instaló «para todos» debe desinstalar y reinstalar una vez; los datos de `.nova` se conservan.
- El menú de Nova (el mod) se puede actualizar sin sacar una versión nueva del launcher: cada release sube los `.jar` y un `nova-menu.json` con sha256; el launcher lo comprueba, descarga el jar más nuevo, verifica la huella y, si algo falla, usa el incluido.

### 0.2.15-beta.4 — Limpieza del código

- Revisión completa del código con un analizador: quitadas funciones, variables y accesos internos que nadie usaba (`serversDat`, `rc`, `acc:list`, `srv:sync` y algunas variables sueltas). Sin errores de variables sin definir en `main.js` ni en la interfaz. El CSS y los iconos del mod no tenían nada sin uso.

### 0.2.15-beta.3 — El canal Beta también recibe las estables

- Arreglado: con el canal Beta solo llegaban las betas. Ahora el launcher mira todas las versiones publicadas y se actualiza a la de número más alto (beta o estable), así que cuando sale la estable también se actualiza a ella.

### 0.2.15-beta.2 — Modo bajo consumo

- Nuevo ajuste «Modo bajo consumo» (Ajustes → Rendimiento) para PCs con poca RAM; objetivo: menos de 1 GB. Se activa solo en PCs con 8 GB o menos y aplica el perfil económico una vez.
- El launcher libera memoria al minimizarlo o al pasar un rato sin foco; límite de memoria para la interfaz; menos procesos de Chromium.
- Quitado el fondo «Espacio oscuro» del menú de Nova (si lo tenías elegido, pasa al agujero negro).

### 0.2.15-beta.1 — Fondo Earth

- Mod: nuevo fondo animado integrado «Earth» (vídeo en bucle, 1080p, 15 fps).

### 0.2.15-beta.1 — Fondo Earth

- Mod: nuevo fondo animado integrado «Earth» (la Tierra desde el espacio, en bucle, a velocidad 0,5, 1080p, 15 fps).

### 0.2.14 — Menú de Nova en el juego, fondos propios y perfil

- Menú de Nova dentro de Minecraft (1.21.1 y 1.20.1): perfil, fondos animados (Agujero negro, Nebulosa y Espacio oscuro), color de los botones y botón «Confirmar cambios». Los textos siguen el idioma del juego.
- Fondos propios: arrastra fotos o vídeos a la carpeta y aparecen solos, con nombre editable y botones para cambiarlos o eliminarlos.
- Botón «Añadir cuenta» (sin conexión o Microsoft); al entrar por primera vez hay que crear un perfil.
- Idiomas nuevos, portugués de Brasil y de Portugal, e informes de errores de descarga.
- Mejoras: arranque más rápido, guardado seguro, Modo juego, descargas que continúan y CSS reorganizado.
- Instalador preparado para firma de código (si Windows avisa: Más información → Ejecutar de todos modos).

### 0.2.14-beta.22 — Fondo Nebulosa

- Mod: nuevo fondo animado integrado «Nebulosa» (vídeo en bucle, 1080p, 15 fps, igual que el agujero negro).

### 0.2.14-beta.21 — Perfil obligatorio

- Launcher: al entrar por primera vez hay que crear un perfil (offline o Microsoft).
- Mod: nuevo icono de idiomas (estilo traductor) e iconos siempre blancos.

### 0.2.14-beta.20 — Menú de Nova con confirmación e idiomas

- **Añadido:** botón «Confirmar cambios» en el menú de Nova (los cambios de fondo y color solo se guardan al confirmar); los textos del mod siguen el idioma del juego (es, en, fr, de, it, pt).
- **Mejorado:** icono de la Tierra con continentes y nuevo agujero negro, en blanco con toque del color de acento; CSS reorganizado y comentado.
- **Arreglado:** un clic en el menú de Nova ya no activa el botón que hay debajo.

### 0.2.14-beta.19 — Fondos propios y cuentas más fáciles

- **Añadido:** botón «Añadir cuenta» sobre Ajustes; carpeta de fondos (arrastra fotos/vídeos y aparecen en el menú de Nova); nombre editable, cambiar y eliminar por fondo.
- **Mejorado:** menú de Nova centrado y por encima de los títulos; botón de usuario más pequeño; icono del mundo en blanco; nuevo icono de Nova.
- **Arreglado:** error `EPERM: operation not permitted, rename` (reintentos y copia de respaldo cuando el antivirus bloquea el archivo).

### 0.2.14-beta.18 — Menú de Nova renovado dentro del juego

- Añadido: panel de perfil con tu skin, tu nombre y si la cuenta es Premium o no; panel de Nova para cambiar el fondo, el color de los botones y añadir tu propia foto o vídeo (el launcher lo convierte); ayuda con título y descripción corta en cada botón.
- Iconos nuevos: persona (Un jugador), dos personas (Multijugador), planeta Tierra (Idioma) y cubo (Realms).
- Mejorado: botones del inicio más pequeños y centrados con la tipografía Poppins; botón de cerrar más pequeño; el aviso de abajo indica que Nova no está afiliado, respaldado ni distribuido por Mojang o Microsoft.
- Arreglado: con el juego abierto las animaciones del launcher ya no se cortan.

### 0.2.14-beta.17 — Interfaz visible al jugar y instalador preparado para firma

- Arreglado: al abrir Minecraft el launcher se quedaba solo con el fondo (interfaz invisible). El Modo juego pausaba las animaciones de entrada y los paneles se quedaban transparentes; ahora las animaciones terminan al instante.
- El instalador sale con los datos del programa (nombre, versión, empresa) y, si hay un certificado de código configurado, firmado. Si Windows muestra «Windows protegió su PC»: **Más información → Ejecutar de todas formas**.

### 0.2.14-beta.16 — Vídeo en 1080p y ajustes más simples

- Vídeo de fondo del menú del juego en 1920×1080 (15 fps, unos 30 MB), con el logo y los botones un poco más abajo.
- Arreglado: el launcher se congelaba al abrir el juego con la consola abierta (se repintaban miles de líneas); ahora solo se añaden las nuevas.
- Ajustes más cortos: quitados «ID de aplicación de Discord» (se usa uno fijo), «Argumentos JVM», «Volver a mostrar el launcher al cerrar el juego» (siempre reaparece), «Icono junto al reloj de Windows» (al minimizar se minimiza, no se cierra) y «Mostrar el saludo» (siempre se muestra).

### 0.2.14-beta.15 — Vídeo de fondo, modo seguro y mod más ligero

- El menú de Nova usa un vídeo de agujero negro en bucle como fondo (quitados el agujero negro y las estrellas anteriores).
- Botones más pequeños y cuidados; textos de abajo más pequeños; el menú usa el logo del propio Minecraft.
- Modo seguro: «Jugar sin el menú de Nova» por instancia, o Mayús al pulsar Jugar.
- Licencias de terceros: `THIRD-PARTY-NOTICES.txt` y enlace en Ajustes → Acerca de.
- El mod pesa unos 80 KB (fuentes recortadas, sin imágenes grandes) y «Crear version» lo compila desde `mod/` (versiones en `mod/versions.txt`).

### 0.2.14-beta.14 — Logo oficial, menú minimalista y más rendimiento

- Menú del juego con el logo de Minecraft Java Edition y botones minimalistas, centrados, cuadrados con esquinas redondeadas.
- Al salir de Singleplayer vuelve el menú de Nova (antes salía el normal).
- Ajuste «Optimizar el juego»: argumentos de Java (G1 afinado) para menos tirones.
- El launcher reduce su consumo mientras el juego está en segundo plano.

### 0.2.14-beta.13 — Menú de Nova rediseñado y consola al jugar

- Menú dentro del juego rediseñado: textos, iconos y botones más pequeños y redondos, con tipografía suave (sin estilo pixelado).
- Agujero negro nuevo, más detallado y más grande.
- Ajuste «Abrir la consola al jugar»: se abre la pestaña Consola al lanzar el juego.
- Quitado el mini panel de consola que aparecía abajo a la derecha.

### 0.2.14-beta.12 — Fabric incluido y diagnóstico del menú

**Mejorado**
- Fabric va incluido en el instalador (Minecraft 1.21.1 y 1.20.1): el menú de Nova arranca sin descargar nada de Fabric, también con bloqueos de red
- Los fallos de conexión indican con qué servidor no se pudo conectar, en lugar de «fetch failed»
- La consola del juego explica si el menú de Nova está activo o por qué no (versión no compatible, Forge/NeoForge…)

### 0.2.14-beta.11 — Menú de Nova rediseñado y versión Nova

**Añadido**
- Pantalla de título de Nova rediseñada: logo de Minecraft Java Edition, agujero negro de fondo, botones Singleplayer y Multiplayer redondos con toque espacial, perfil de Nova Launcher arriba a la izquierda, X roja para cerrar el juego, versión abajo a la izquierda y logo de Nova Launcher abajo a la derecha
- Fila de cinco botones: A (ajustes de Minecraft), L (idioma), N (candado, reservado), C (Minecraft Realms) y M (abre los ajustes del launcher desde el juego)
- «Vanilla» pasa a llamarse «Nova»: la misma versión de Minecraft con el menú y las mejoras de Nova (internamente sigue usando Fabric)

### 0.2.14-beta.10 — Menú de Nova dentro del juego

**Añadido**
- Menú de Nova dentro del juego: un mod de Fabric incluido de fábrica que sustituye la pantalla de título de Minecraft por la de Nova (fondo espacial con agujero negro, logo, botones propios, tarjetas y barra de iconos). Es obligatorio y no se puede quitar. Las instancias Vanilla se lanzan con Fabric por debajo para poder cargarlo; si Fabric no se puede preparar, se juega en vanilla normal. De momento solo en Minecraft 1.21.1 y 1.20.1; Forge y NeoForge no lo llevan

### 0.2.14-beta.9 — Idioma en el asistente, color y versiones

**Añadido**
- Paso de idioma en el asistente de bienvenida cuando se repite desde Ajustes (el selector del primer arranque ya existía)

**Mejorado**
- El color del launcher y el color personalizado ya coinciden: Ajustes se actualiza al cambiar el color desde el asistente, y el color personalizado se aplica mientras lo eliges
- La lista de versiones empieza filtrada por Release
- Arreglado el error «Cannot find latest.yml» al buscar actualizaciones: cada versión (también las beta) publica ahora latest.yml y el flujo lo comprueba antes de publicar

**Quitado**
- X, Discord y TikTok de la zona de redes del creador

### 0.2.14-beta.8 — Guardado seguro, caché de imágenes limitada y instalador más ligero

**Añadido**
- Caché de imágenes como apartado de la Limpieza de espacio (Ajustes → Juego), con su tamaño

**Mejorado**
- Los archivos de ajustes, instancias y ventana se guardan de forma segura: se escriben en un archivo temporal y se conserva una copia .bak; si uno se estropea, el launcher recupera la copia al abrir
- La caché de imágenes se limpia sola al arrancar, en segundo plano: borra lo que lleva más de 30 días sin usarse y, si pasa de 100 MB, lo más antiguo hasta bajar de 80 MB
- El instalador pesa menos: el código se minifica al compilar, la compresión es máxima y se quita un logo que la app no usa
- El icono de la bandeja de Windows se ve nítido con cualquier escalado de pantalla (tray.ico con 5 tamaños)
- El código de la vista previa del navegador va aparte (js/vista-previa.js) y no entra en el launcher instalado

### 0.2.14-beta.7 — Modo juego, mods revisados y descargas que continúan

**Añadido**
- Modo juego (Ajustes → Rendimiento, activado por defecto): al lanzar Minecraft el launcher para por completo las animaciones y se esconde en la bandeja (o se minimiza si la bandeja está desactivada); al cerrar el juego vuelve a aparecer
- Revisión de mods antes de jugar (Ajustes → Juego, activada por defecto): avisa de mods de otro cargador o de otra versión de Minecraft, de mods incompatibles entre sí y de dependencias obligatorias que faltan. Puedes jugar igualmente, desactivar los problemáticos, instalar lo que falta o cancelar

**Mejorado**
- Las descargas que se cortan continúan desde donde se quedaron en vez de empezar de cero (archivo .part), con hasta 3 reintentos (1, 3 y 8 s) y comprobación de la huella al final
- La Limpieza de espacio también borra las descargas a medias de más de 2 días
- El launcher arranca más rápido: Mods, Instancias, Ajustes, Servidores, Redes y Consola se cargan la primera vez que se abren
- Con varias instancias abiertas, el launcher solo reaparece al cerrar la última

### 0.2.14-beta.6 — Seguridad y fiabilidad

**Añadido**
- Botón «Reportar un error» en la ventana de error de descarga y en el Diagnóstico: abre una incidencia nueva en GitHub con el informe pegado
- Tiempo restante en las descargas (por ejemplo «faltan 1 min 20 s»)
- Una prueba en tests/ avisa de los textos sin traducir en cada idioma antes de publicar

**Mejorado**
- Las sesiones de Microsoft se guardan cifradas (safeStorage); las antiguas se cifran solas al arrancar
- El launcher recuerda el tamaño y la posición de la ventana, también si estaba maximizada
- Las imágenes de Modrinth se guardan en el PC: cargan al instante y sin conexión

### 0.2.14-beta.5 — Publicación más fiable

**Mejorado**
- Incluye todo lo de la 0.2.14-beta.4 (idioma bajo demanda, disco sin bloqueos y Electron 44)
- La publicación de versiones ya no se atasca si queda una release a medias de un intento anterior

### 0.2.14-beta.4 — Optimización: arranque más rápido y sin congelaciones

**Mejorado**
- Solo se carga el idioma elegido en vez de los ocho: el launcher abre antes y gasta menos memoria
- La limpieza de espacio, las copias de seguridad, el borrado de instancias y la instalación o exportación de modpacks ya no congelan la ventana con muchas carpetas o mundos grandes
- El asistente de bienvenida, la limpieza de espacio y el buscador (Ctrl + K) se cargan la primera vez que se usan
- Electron actualizado de la versión 33 a la 44 (parches de seguridad y un Chromium más reciente)

### 0.2.14-beta.3 — Portugués de Brasil y de Portugal, e informes de errores de descarga

**Añadido**
- Português (Brasil) con su bandera; Português (Portugal) pasa a tener la bandera de Portugal
- Cuando falla la descarga de un mod o modpack se guarda un informe con la causa (Ajustes → Juego → Informes de errores) y la ventana de error ya dice el motivo

**Mejorado**
- Instalar modpacks: el error indica en qué paso falla, la descompresión tiene alternativa con PowerShell y se informa de los archivos que no se descargan

### 0.2.14-beta.2 — Banderas en la selección de idioma

**Añadido**
- Cada idioma lleva su bandera (dibujada en el propio launcher, porque Windows no muestra los emojis de bandera) en el selector del primer arranque y en Ajustes → Interfaz

### 0.2.14-beta.1 — Idiomas, preparación en segundo plano, limpieza de espacio e instancias en lista

**Añadido**
- Seis idiomas: español (España), español (Latinoamérica), English (US), français, Deutsch, italiano y português; la primera vez que se abre el launcher aparece un selector (viene marcado el idioma del sistema) y después se cambia en Ajustes → Interfaz
- Preparar antes de jugar: al elegir una versión en la portada se descarga en segundo plano lo que falte (Java, librerías y cargador); al pulsar Lanzar el juego se abre casi al instante (se puede desactivar en Ajustes → Rendimiento)
- Limpieza de espacio (Ajustes → Juego): detecta versiones y librerías que ninguna instancia usa, copias de seguridad antiguas y registros viejos, y los borra con un clic indicando cuánto espacio se libera
- Instancias: favoritas fijadas arriba (★), etiquetas («Survival», «Pruebas»), nota por instancia y orden por nombre, último uso o tiempo jugado

**Mejorado**
- Las instancias se muestran en lista en vez de en recuadros, con búsqueda y filtro por etiqueta
- La limpieza es prudente: no toca nada de lo que usa alguna instancia, nada con menos de 2 días y se niega a borrar mientras Minecraft está abierto

### 0.2.13 — Sin conexión, descargas, diagnóstico, arrastrar y soltar e inglés

**Añadido**
- Botón «Continuar» en la portada: abre Minecraft y entra directo al último mundo jugado (desde la 1.20)
- Arrastrar y soltar sobre la ventana un .jar, .mrpack o .zip (mundo, shader o texturas): el launcher pregunta qué es y en qué instancia instalarlo
- «Tarjeta gráfica» por instancia, para obligar a usar la potente en portátiles con dos (Windows), y ajustes de Java ya preparados: Rendimiento y Pocos tirones
- Botón Diagnóstico (Ajustes → Juego): revisa conexión, RAM, Java, disco, cuenta, mods y la última partida, y copia un informe
- Descargas con pausa, cancelar y límite de velocidad (cuadro abajo a la izquierda y ajuste en Rendimiento)
- Inglés, con selector en Ajustes → Interfaz; los idiomas son archivos en la carpeta lang
- Revisión automática antes de publicar: comprueba el código y que la app arranca; si falla, no se sube nada

**Mejorado**
- Jugar sin internet: el launcher recuerda qué Java necesita cada versión y, sin conexión, usa el ya instalado; una sesión de Microsoft que no se puede renovar ya no bloquea (se juega como offline)
- El código de la interfaz está partido en archivos (estilos y una pestaña por archivo)

### 0.2.13-beta.1 — Arreglos de la 0.2.12 y limpieza

**Mejorado**
- La mini consola de la esquina se cierra sola cuando se cierra Minecraft; ahora tiene un aspecto de cristal y sin barra horizontal
- Barras de desplazamiento nuevas en todo el launcher: finas, redondeadas y del color elegido
- Los colores del launcher en Ajustes → Apariencia están al final de la fila, como el resto de ajustes
- El agujero negro sigue moviéndose aunque la ventana no tenga el foco (más despacio, a 15 FPS) y mientras juegas (hasta 30 FPS)
- El menú de versión de la portada se ve nítido, sin el texto difuminado

**Quitado**
- Nova Network y Nova Pack (tarjeta de Servidores, instalación del pack y sus archivos)
- El cuadro «Ventajas exclusivas de Nova»

### 0.2.12 — Cuentas, consola, mundos y más comodidad

**Añadido**
- Varias cuentas (Microsoft y offline) con cambio rápido desde tu nombre en la barra superior
- Tiempo jugado y última vez abierta de cada instancia
- Galería de capturas de pantalla: abrir, copiar y borrar
- Pestaña Consola con colores para errores y avisos, buscador y botones para copiar o guardar
- Icono junto al reloj de Windows y avisos cuando termina una descarga, hay una actualización lista o Minecraft se cierra por un error
- Ventana «Novedades de esta versión», que sale la primera vez que abres una versión nueva
- Canal Beta (Ajustes → Rendimiento) y botón para volver a una versión anterior (Ajustes → Acerca de)
- Mundos de cada instancia: ver, copiar a otra instancia e importar mapas .zip
- Tus propios servidores en la pestaña Servidores, con ping y jugadores; también se guardan en la lista del juego
- Shaders que funcionan siempre: si falta Iris, el launcher lo instala junto a Sodium o crea una instancia Fabric preparada
- Asistente de bienvenida de 4 pasos (cuenta, RAM, tema y primera versión)
- Buscador global con Ctrl + K (versiones, mods, instancias y ajustes)
- Importar desde el launcher oficial, CurseForge y Prism
- Guardar y cargar la personalización en un archivo
- Notas automáticas en GitHub: el flujo «Crear version» copia la entrada del historial a la página de la versión

**Mejorado**
- Los servidores populares también muestran el ping
- Los atajos Alt + 1…8 incluyen la Consola

**Quitado**
- El campo «Nombre de usuario» suelto de Ajustes: ahora los nombres offline se gestionan en Cuentas

### 0.2.11 — Más estabilidad, gestor de mods y copias de seguridad

**Añadido**
- Aviso cuando Minecraft se cierra por un error, con las últimas líneas del registro y la causa probable (falta de RAM, Java equivocado, mod incompatible…); el registro de cada partida se guarda en un archivo
- Gestor de mods de cada instancia: ver, activar o desactivar, borrar, añadir un .jar y actualizar (uno a uno o todos)
- Opciones por instancia: renombrar, duplicar, icono y color, abrir su carpeta, RAM y Java propios y elegir la versión de Fabric, Forge o NeoForge
- Exportar e importar instancias en .mrpack (Modrinth) o .zip
- Copias de seguridad de los mundos: automáticas antes de actualizar mods o el Nova Pack, con botón de restaurar
- Al instalar un modpack puedes elegir su versión; la compatible con tu Minecraft sale primero y recomendada

**Mejorado**
- Los archivos descargados se comprueban con su huella y se reintentan si llegan mal
- Los modpacks y el Nova Pack se descargan 6–8 archivos a la vez
- Un modpack instalado ya no se confunde con la instancia normal de la misma versión
- Corregido el repositorio de actualizaciones en `package.json` (ahora `JustMarcoDev`)

### 0.2.10 — Servidores, Nova Pack y vuelta al tamaño de la 0.2.8

**Añadido**
- Pestaña Servidores con los más populares, jugadores en línea y botón «Unirse» que abre Minecraft y entra automáticamente
- Nova Network: tarjeta con el modpack propio del launcher (Nova Pack), actualizable desde GitHub sin sacar versión nueva
- Preparación de ventajas exclusivas (cosméticos): `docs/VENTAJAS.md` y `novapack/cosmetics.json`
- Guía para montar el servidor: `docs/NOVA-SERVER.md`
- Atajo Alt + 4 para Servidores

**Mejorado**
- En pantalla completa (1920×1080) el launcher se ve como en la 0.2.8, sin estirarse
- Al unirse a un servidor se crea o reutiliza una instancia Vanilla de la versión correcta

**Quitado**
- Escalado automático de la 0.2.9
- Sistema de amigos (de momento, por el coste del servidor) y `docs/AMIGOS.md`

### 0.2.9 — Más espacio en la portada, pantalla completa, mods y Astrion Studio

**Añadido**
- Pantalla de carga con «Un proyecto dirigido por Astrion Studio», el copyright y el aviso de que Nova Launcher no tiene relación con Mojang ni con Microsoft (también en Ajustes → Acerca de)
- Escalado automático según la resolución: en pantallas grandes (hasta 1920x1080 o más) el launcher se agranda proporcionalmente para que nada se vea pequeño ni estirado

**Mejorado**
- Portada con más espacio: el agujero negro es más grande y está más separado del botón de lanzar
- Pantalla completa: texto más nítido y proporcionado, y el launcher se recalcula al maximizar, restaurar o cambiar a pantalla completa
- Nuevo icono de Mods: una pieza de puzle
- Página de Mods: las tarjetas ya no se solapan, todas tienen la misma altura, las etiquetas de cargador (Fabric, Forge…) pasan a una línea propia y se muestra la versión estable más reciente en vez de un snapshot

**Quitado**
- Nada en esta versión

### 0.2.8 — Arreglos de la portada, actualización automática y más accesibilidad

**Añadido**
- Actualización 100% automática: al terminar la descarga el launcher avisa con una cuenta atrás de 10 segundos y se reinicia solo (con botones «Instalar ya» y «Cancelar»); si estás jugando, espera a que cierres Minecraft
- Ajustes de actualización: instalar automáticamente y mostrar o no la ventana de aviso
- Accesibilidad: filtros para daltonismo (protanopia, deuteranopia, tritanopia) y escala de grises, modo dislexia, etiquetas de texto en la barra lateral, botones y casillas más grandes, paneles sólidos, espaciado entre palabras y atajos de teclado
- Lectores de pantalla: nombres accesibles en la barra lateral y estado del launcher anunciado en voz alta
- Rendimiento: perfiles de un clic (Máxima calidad, Equilibrado y Ahorro), aceleración por hardware opcional, número de versiones mostradas, botón para limpiar la caché y cálculo del espacio usado
- Aviso en las novedades de la próxima gran actualización (0.3.0)

**Mejorado**
- Portada con más espacio: el agujero negro y el botón de lanzar respiran más
- El menú del botón de lanzar queda siempre por encima, se ve entero y se abre hacia arriba si abajo no cabe; se cierra solo con un clic fuera o con Esc

**Quitado**
- Nada en esta versión

### 0.2.7 — Discord para todos, mods y modpacks, aviso de actualización

**Añadido**
- Discord: al tener Discord y el launcher abiertos a la vez, tu perfil muestra «Nova Launcher» con el logo, la versión del launcher y, al jugar, la versión de Minecraft con el tiempo de partida; se conecta solo aunque abras Discord después
- Botón «Descargar Nova Launcher» en la actividad de Discord para que tus amigos lo instalen
- Mods y Modpacks: pestañas para Mods, Modpacks, Shaders y Texturas, orden por descargas, seguidos, nuevos o actualizados, 20 categorías, botón «Cargar más» y contador de resultados
- Los mods instalan solos sus dependencias obligatorias (por ejemplo Fabric API)
- Los modpacks de Modrinth ya no se limitan a la versión elegida en la portada: se muestran todos y se crea una instancia propia
- Shaders y texturas se guardan en la carpeta correcta de la instancia
- Aviso «1 actualización pendiente» en la pantalla principal, ventana emergente al abrir, punto rojo en el menú y botón «Actualizar ahora» que descarga e instala de una vez
- Acceso directo del escritorio: se crea al actualizar si no existía y hay un botón en Ajustes → Acerca de para crearlo cuando quieras
- Icono propio (el logo de la app) para el .exe, el instalador y el acceso directo

**Mejorado**
- El launcher busca actualizaciones nada más abrir y cada vez que vuelves a la ventana
- Búsqueda de mods con tarjetas más completas: autor, descargas, seguidores, categorías y versiones

**Quitado**
- Nada en esta versión

### 0.2.6 — Discord, logos oficiales y botón de lanzar nuevo

**Añadido**
- Integración con Discord: tu perfil muestra «Jugando a Minecraft 1.21.1» (con la versión, el cargador y el tiempo) y «En el launcher» cuando estás en el launcher
- Ajustes de Discord: activar o desactivar, ID de aplicación y estado de la conexión en directo
- El instalador crea el acceso directo en el escritorio (también al actualizar desde el launcher)

**Mejorado**
- Botón de lanzar rediseñado: cristal oscuro con borde del color de acento, icono de play con brillo y flecha de versiones mejor integrada
- Redes: logos oficiales (YouTube, Twitch, TikTok, Instagram, X, Discord y GitHub) con animación de entrada, flotado suave y efecto al pasar el ratón; siguen en «Próximamente»
- Ajustes de apariencia: las opciones con muchas casillas (como el tema de fondo) pasan a una segunda línea y ya no se comprimen

**Quitado**
- Nada en esta versión

### 0.2.5 — Actualizar desde el propio launcher, portada nueva y redes

**Añadido**
- Actualización desde el launcher: aviso en la portada y en la barra superior, botón «Descargar», barra de progreso y botón «Reiniciar e instalar»
- Tus mundos, mods, instancias y ajustes se conservan al actualizar (viven fuera de la carpeta de instalación)
- Ajuste «Descargar actualizaciones automáticamente» (si lo apagas, tú decides cuándo descargar)
- Sección «Redes» con las redes sociales del creador (por ahora vacías, listas para añadir los enlaces)

**Mejorado**
- Botón de lanzar rediseñado: icono de play, texto más claro y flecha de versiones como segmento propio con animación
- Portada compacta: las novedades se ven sin tener que bajar
- Acerca de: muestra el estado de la actualización en directo
- Texto de los ajustes de actualización más claro

**Quitado**
- Nada en esta versión

### 0.2.4 — Ajustes, versiones y agujero negro (incluye todas las correcciones)

**Añadido**
- Ajustes por apartados: Cuenta, Juego, Apariencia, Fondo, Interfaz, Accesibilidad, Rendimiento y Acerca de
- Detección de la RAM del PC: el deslizador tiene como tope tu memoria total y recomienda el 50%
- Colores del launcher (9) y color personalizado libre; 8 temas de fondo
- Personalización del agujero negro: color, tamaño, velocidad, inclinación, cantidad de estrellas, lente gravitacional, resplandor y mostrarlo o no en otras pestañas
- Interfaz a tu gusto: redondeo de esquinas, transparencia y desenfoque de los paneles, densidad, ancho de la barra lateral, y mostrar u ocultar saludo, skin, novedades, instancias y estado
- 26 tipografías, más una casilla para escribir cualquier fuente instalada; tamaño de texto, negrita, espaciado de letras e interlineado
- Accesibilidad: alto contraste, resaltar el foco del teclado y reducir animaciones
- Rendimiento: calidad del fondo, límite de FPS, ahorro mientras juegas y pausa cuando la ventana no tiene el foco
- Porcentaje de carga (0% a 100%) en la animación de entrada
- Todas las versiones oficiales de Minecraft (release, snapshot, beta y alpha) con filtro «Todas», contador, búsqueda y botón «Recargar lista»
- Copia local de la lista de versiones para que aparezcan también sin conexión
- Compatibilidad de Fabric, Forge y NeoForge leída de sus listas oficiales (incluida la numeración nueva de NeoForge)
- Botón «Buscar actualizaciones», interruptor de actualización automática y versión real instalada en la tarjeta Estado
- Opciones de juego: volver a mostrar el launcher al cerrar Minecraft y mostrar u ocultar el registro del juego
- Botón para restablecer la personalización y este historial dentro de la app

**Mejorado**
- Agujero negro: disco con anillos y gas, arco de luz sobre la sombra, anillo de fotones y estrellas deformadas por la gravedad
- Animación de entrada: ondas de luz, letras que aparecen una a una y barra de carga
- Icono de ajustes: ahora es un engranaje
- Optimización: fondo dibujado con imágenes precalculadas, 30 o 60 FPS a elegir, pausa si el launcher está minimizado, sin foco o con Minecraft abierto
- Optimización: listas largas de versiones con renderizado diferido, búsqueda con retardo y selector de la portada que no se reconstruye sin necesidad
- Optimización: ventana sin parpadeo blanco al abrir y una sola instancia del launcher a la vez
- Iconos de los ajustes rediseñados

**Quitado**
- Nada en esta versión

### 0.2.3 — Agujero negro e intro

**Añadido**
- Agujero negro animado como fondo de todo el launcher
- Animación de entrada con logo
- Animaciones de entrada y de aparición de paneles
- Logo del launcher (opción A: Horizonte)

**Mejorado**
- Botón de lanzar con brillo y efecto al pasar el ratón
- Barra de progreso más suave
- Paneles con efecto cristal

**Quitado**
- Astronauta y cohete de la portada

### 0.2.2 — Rediseño de la portada

**Añadido**
- Portada inspirada en Lunar Client con botón grande de lanzar
- Instancias automáticas: se crean solas al jugar una versión
- Iconos propios en lugar de emojis
- Color de acento a elegir
- Novedades oficiales de Mojang en la portada
- Indicador de instancias en ejecución y skin en la barra superior

**Mejorado**
- Diseño general mucho más pulido

**Quitado**
- Crear instancias a mano como paso obligatorio

### 0.2.0 — Instalador y cuentas

**Añadido**
- Instalador de Windows con carpeta de instalación a elegir
- Inicio de sesión con Microsoft además del modo offline
- Descarga automática del Java correcto para cada versión
- Instancias separadas con sus propios mundos y mods
- Mods de Modrinth y CurseForge, y modpacks de Modrinth
- Actualizaciones automáticas desde GitHub Releases

**Mejorado**
- Nada en esta versión

**Quitado**
- Nada en esta versión

### 0.1.0 — Primera versión

**Añadido**
- Lanzamiento de Minecraft Vanilla, Fabric, Forge y NeoForge
- Lista de versiones de Mojang
- Búsqueda e instalación de mods de Modrinth
- Ajustes básicos: usuario, RAM, Java, resolución y argumentos JVM

**Mejorado**
- Nada en esta versión

**Quitado**
- Nada en esta versión

