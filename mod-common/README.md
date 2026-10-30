# mod-common

Código del menú de Nova que usan a la vez `mod/` (Yarn, 1.20–1.21.11) y `mod26/` (nombres de Mojang, 26.x). Se añade como `srcDir` en los dos `build.gradle`, así que se compila junto con cada proyecto.

Reglas: sin `import net.minecraft…` (si hace falta algo de Minecraft, se pide a una clase de cada proyecto: `NovaGfx`, `NovaInput`, `NovaCompat`…), Java 17 como máximo, y un archivo solo vive aquí **o** en un proyecto, nunca en los dos.
