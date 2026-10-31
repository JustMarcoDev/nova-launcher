# Nova Launcher

Launcher de Minecraft para Windows 11 de **Astrion Studio**: Vanilla, Fabric, Forge y NeoForge, todas las versiones oficiales, instancias automáticas, mods de Modrinth y CurseForge, Java automático y actualizaciones automáticas. Incluye el **menú de Nova**, un mod de Fabric para Minecraft 1.20 a 26.3 con HUD editable, perfiles por servidor, skins y Modo FPS.

## Descargar

Desde la web: https://justmarcodev.github.io/nova-launcher-web/ · o desde [Releases](https://github.com/JustMarcoDev/nova-launcher/releases) (`Nova Launcher Setup x.x.x.exe`). También `Crear-Instalador.bat` (genera el instalador en tu PC) y `Abrir-Launcher.bat` (abre el launcher sin instalar).

## Funciones principales

- Instancias, mundos, copias de seguridad (también programadas) y mods con actualización.
- Cuentas Microsoft y sin conexión, skins y capas, servidores con perfil.
- Menú de Nova en el juego: HUD, avisos del launcher, presencia, Modo FPS y prueba de rendimiento por instancia.
- Actualizaciones automáticas del launcher y del mod, con archivos firmados e interruptores a distancia.

## Publicar una versión

1. Cambia el código y sube `"version"` en `package.json` (mod y launcher van juntos).
2. Añade su entrada al principio de [CHANGELOG.md](CHANGELOG.md); el flujo la copia a las notas de la release. `npm test` comprueba que existe.
3. `git commit` y `git push`; en **Actions**, ejecuta **Crear version**. El robot de pruebas abre las 24 versiones del mod antes de compilar el instalador.

Detalles (firma, certificado, fondos, beta, secretos): [docs/GUIA.md](docs/GUIA.md).

## Estructura del proyecto

- `main.js` y `main/`: proceso principal de Electron (un módulo por tarea; `main/compartido.js` tiene `R` y `S`).
- `js/`, `css/`, `index.html`, `lang/`: interfaz y traducciones.
- `mod/` (Minecraft 1.20–1.21.11, nombres Yarn) y `mod26/` (26.1–26.3, nombres Mojang): el menú de Nova; `mod-common/` es el código que comparten.
- `servidor/`: worker de Cloudflare (presencia, informes, recuento). `scripts/`: publicación, firma y robot. `tests/`: revisión del código.

## Aviso legal

Nova Launcher es un proyecto independiente de **Astrion Studio**. © 2026 Astrion Studio. No está afiliado, aprobado ni patrocinado por Mojang Studios ni por Microsoft. Minecraft es una marca registrada de Mojang Studios.

## Historial

Todos los cambios, versión a versión, en [CHANGELOG.md](CHANGELOG.md).
