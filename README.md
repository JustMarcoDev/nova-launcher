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

La pestaña **Servidores** (Alt + 4) muestra servidores conocidos con jugadores en línea y un botón **Unirse**: abre Minecraft en la versión adecuada y entra solo al servidor. La lista está en `index.html` (constante `SERVERS`); puedes añadir o quitar los que quieras.

## Nova Network y Nova Pack (desde la 0.2.10)

- `novapack/pack.json` define el modpack propio del launcher: versión de Minecraft, loader, mods (por «slug» de Modrinth), jars propios y el servidor.
- Cuando subes cambios a GitHub (repo público), todos los launchers descargan el manifiesto nuevo y actualizan el pack con un clic.
- Pon la dirección de tu servidor en `server.host` de `pack.json`. Mientras esté vacío, el botón de unirse aparece desactivado.
- Archivos de configuración propios: `novapack/overrides/`.
- Opciones para tener un servidor barato o gratis: `docs/NOVA-SERVER.md`.

## Ventajas exclusivas (preparación)

Cosméticos y extras dentro del juego. Solo hay diseño y un catálogo vacío (`novapack/cosmetics.json`); el plan está en `docs/VENTAJAS.md`.

## Instancias, mods y copias de seguridad (desde la 0.2.11)

- **Instancias → Opciones:** nombre, icono, color, RAM y Java propios, versión de Fabric/Forge/NeoForge, duplicar, abrir carpeta, exportar y borrar.
- **Gestor de mods:** botón «Mods» de cada instancia. Muestra el nombre real de cada mod (vía Modrinth), permite activarlo o desactivarlo, borrarlo, añadir un `.jar` y actualizarlo.
- **Exportar / importar:** `.mrpack` (Modrinth, ligero) o `.zip` (todo dentro, solo para Nova Launcher). El botón «Importar» de la pestaña Instancias abre ambos.
- **Copias de los mundos:** se guardan solas en `%APPDATA%\.nova\backups` antes de actualizar mods o el Nova Pack (máximo 10 minutos entre copias automáticas). Se pueden crear a mano y restaurar desde Opciones → Copias de seguridad. Ajustes → Juego controla cuántas se conservan.
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
- **Beta:** si la versión de `package.json` lleva guion (por ejemplo `0.2.13-beta.1`), el flujo la publica como *pre-release*. Solo la reciben los launchers con Ajustes → Rendimiento → Canal de actualizaciones = **Beta**. Los de **Estable** la ignoran. Para una beta sin entrada propia se usa la de la versión sin el sufijo.
- **Volver a la versión anterior:** Ajustes → Acerca de → Volver a una versión anterior. Lista las releases de GitHub más antiguas que la instalada y ejecuta su instalador. Para que no se actualice sola otra vez, desactiva «Buscar actualizaciones al abrir»; vuelve a activarlo en Ajustes → Rendimiento cuando quieras.

## Aviso legal

Nova Launcher es un proyecto independiente de **Astrion Studio**. © 2026 Astrion Studio. No está afiliado, aprobado ni patrocinado por Mojang Studios ni por Microsoft. Minecraft es una marca registrada de Mojang Studios.

## ¿Qué es el historial de actualizaciones?

Es una lista (en inglés, *changelog*) con todo lo que cambia en cada versión del launcher, para saber de un vistazo qué se ha **añadido**, qué se ha **mejorado** y qué se ha **quitado**. Cada vez que se publique una versión nueva hay que añadir una entrada al principio de la lista de abajo. La misma lista aparece dentro de la app, en **Ajustes → Acerca de**.

## Historial de actualizaciones

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

