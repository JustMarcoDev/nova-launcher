package dev.astrion.nova;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.Minecraft;

/** Teclado y ratón sin GLFW: desde la 26.x el juego usa SDL3 y las teclas son códigos propios de Minecraft (InputConstants). */
final class NovaInput {
    private NovaInput() { }

    /** Botón del ratón pulsado ahora: 0 izquierdo, 1 derecho, 2 central. */
    static boolean mouse(Minecraft mc, int button) {
        try {
            return button == 0 ? mc.mouseHandler.isLeftPressed() : button == 1 ? mc.mouseHandler.isRightPressed() : button == 2 && mc.mouseHandler.isMiddlePressed();
        } catch (Throwable t) { return false; }
    }

    static boolean key(int key) {
        try { return NovaVer.keyDown(key); } catch (Throwable t) { return false; }
    }

    /** Nombre de una tecla tal como la escribe el juego en sus opciones de controles. */
    static String keyName(int key) {
        try { return NovaVer.keyName(key); } catch (Throwable t) { return ""; }
    }
}
