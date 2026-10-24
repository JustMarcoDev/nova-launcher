// =====================================================================================
// NOVA LAUNCHER · proceso principal (Electron)
// -------------------------------------------------------------------------------------
// Aquí solo se cargan los módulos de main/. Cada uno se ocupa de una parte y se puede
// leer por separado; la interfaz (index.html + js/) les pide cosas por IPC (ver preload.js).
//   base         rutas, archivos (guardado seguro), ajustes, instancia única
//   red          fetch, get/post, ejecutar comandos, comprobar conexión
//   errores      informes de errores
//   descargas    descargas con reanudación y huella, cola con pausa, descompresión
//   instancias   opciones, copias de seguridad, exportar/importar
//   cuentas      cuentas Microsoft y offline
//   skins        biblioteca de skins y skin local para el mod
//   servidores   ping, servers.dat
//   mundos       mundos de cada instancia
//   mods         gestor de mods, modpacks, shaders, revisión antes de jugar, arrastrar y soltar
//   cargadores   Fabric, Forge, NeoForge
//   mod-nova     menú de Nova dentro del juego (mod, fondos, actualización del mod)
//   juego        lanzar Minecraft (Java, versiones, ajustes, cierre)
//   actualizaciones  actualizar el launcher (canal beta, versiones anteriores)
//   discord      Discord Rich Presence
//   sistema      iconos, accesos directos, bandeja, capturas, diagnóstico
//   ventana      ventana, caché de imágenes, arranque, ajustes
//   limpieza     limpieza de espacio
// El orden importa un poco: un módulo solo puede usar valores (no funciones) de los que se cargan antes.
// compartido.js tiene R (lo que unos módulos ofrecen a otros) y S (variables que cambian: ventana, actualizador…).
// =====================================================================================
require('./main/base');
require('./main/red');
require('./main/errores');
require('./main/descargas');
require('./main/instancias');
require('./main/cuentas');
require('./main/skins');
require('./main/servidores');
require('./main/mundos');
require('./main/mods');
require('./main/cargadores');
require('./main/mod-nova');
require('./main/juego');
require('./main/actualizaciones');
require('./main/discord');
require('./main/sistema');
require('./main/ventana');
require('./main/limpieza');
