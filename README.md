# Nova Launcher

Launcher de Minecraft para Windows 11: Vanilla, Fabric, Forge y NeoForge, todas las versiones oficiales (alpha, beta, snapshot y release), instancias automáticas, mods de Modrinth y CurseForge, Java automático y actualizaciones automáticas.

## Cómo conseguir la app

1. Sube este proyecto a GitHub (repositorio público `nova-launcher`).
2. En la pestaña **Actions**, ejecuta **Crear version** (Run workflow).
3. Descarga `Nova Launcher Setup x.x.x.exe` desde **Releases** e instálalo (puedes elegir la carpeta).

Alternativas: `Crear-Instalador.bat` (genera el instalador en tu PC) o `Abrir-Launcher.bat` (abre el launcher sin instalar).

## Cómo publicar una actualización

1. Cambia los archivos del proyecto.
2. Sube el número de `"version"` en `package.json`. Sin este paso los launchers ya instalados no detectan la actualización.
3. `git add .`, `git commit -m "vX.Y.Z"` y `git push`.
4. En **Actions**, ejecuta de nuevo **Crear version**.
5. Los launchers instalados la descargan solos y se instala al cerrarlos. También puedes pulsar **Ajustes → Acerca de → Buscar actualizaciones**.

## Actualizar desde el propio launcher (desde la 0.2.5)

Cuando publiques una versión nueva en GitHub, el launcher la detecta solo:

1. Aparece un aviso en la portada y un botón **Actualizar** en la barra superior.
2. Pulsa **Descargar** (o se descarga sola si tienes activado «Descargar actualizaciones automáticamente» en Ajustes).
3. Cuando termine, pulsa **Reiniciar e instalar**. Tus mundos, mods, instancias y ajustes se conservan.

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

## ¿Qué es el historial de actualizaciones?

Es una lista (en inglés, *changelog*) con todo lo que cambia en cada versión del launcher, para saber de un vistazo qué se ha **añadido**, qué se ha **mejorado** y qué se ha **quitado**. Cada vez que se publique una versión nueva hay que añadir una entrada al principio de la lista de abajo. La misma lista aparece dentro de la app, en **Ajustes → Acerca de**.

## Historial de actualizaciones

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

