# Guía detallada de Nova Launcher

Documentación de funcionamiento y publicación (el resumen está en el [README](README.md); lo que cambió en cada versión, en el [CHANGELOG](CHANGELOG.md)).

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
4. Abre `main/discord.js`, busca la línea `const DISCORD_CLIENT_ID = '';` y pega el número entre las comillas.
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
- **Estructura del proceso principal.** `main.js` solo carga los módulos de `main/`, cada uno con una parte del trabajo: `base` (rutas, archivos, ajustes), `red`, `errores`, `descargas`, `instancias`, `cuentas`, `skins`, `servidores`, `mundos`, `mods`, `cargadores` (Fabric/Forge/NeoForge), `mod-nova` (menú de Nova, fondos y actualización del mod), `juego` (lanzar Minecraft), `actualizaciones` (del launcher), `discord`, `sistema` (iconos, bandeja, capturas, diagnóstico), `ventana` y `limpieza`. `main/compartido.js` tiene `R` (lo que un módulo ofrece a otros: cada uno hace `Object.assign(R, {…})` al final) y `S` (variables que cambian y usan varios módulos, como la ventana). Un módulo solo puede usar valores —no funciones— de los que se cargan antes (el orden está en `main.js`); las funciones de módulos posteriores se llaman a través de `R`. Cada archivo empieza con lo que importa de los demás.
- **Estructura de la interfaz.** `index.html` solo tiene el esqueleto; los estilos están en `css/style.css` y el código en `js/` (un archivo por pestaña o función). Se cargan en el orden que marca `index.html`.
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

## Regla de versiones: mod y launcher van juntos

Cada vez que cambia el mod (`mod/`) se publica una versión nueva del launcher: mientras dure la fase de pruebas, una beta más (`0.2.15-beta.14`, `beta.15`… `beta.22`) hasta cerrar la `0.2.15`. La versión del mod se lee de `package.json`, así que siempre coincide con la del launcher. El launcher se actualiza solo y el usuario recibe el mod nuevo con él.

## Firma de lo que se descarga (desde la 0.2.16-beta.13)

`nova-menu.json`, `fondos.json` y `nova-config.json` se firman con **ed25519** en `release.yml` y cada `.sig` se sube junto a su archivo. El launcher comprueba la firma (`main/firma.js`) antes de usar el archivo; si falla, lo ignora y usa la copia incluida o la anterior.

**Cambiar la clave:**
1. `node scripts/firmar.js generar clave.pem` crea un par: la privada queda en ese archivo y la pública sale por pantalla.
2. Guarda la privada en el secreto `NOVA_SIGN_KEY` de GitHub (Settings → Secrets and variables → Actions).
3. Pega la pública en `PUBLIC_KEY` de `main/firma.js` y publica una versión nueva.

Los instaladores ya repartidos solo aceptan archivos firmados con la clave que llevaban: cambia la clave solo junto con una versión nueva y no pierdas la privada. Sin el secreto el flujo avisa y no firma nada.
