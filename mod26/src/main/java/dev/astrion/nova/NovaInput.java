package dev.astrion.nova;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.Minecraft;

/** Teclado y ratón sin GLFW: desde la 26.x el juego usa SDL3 y las teclas son códigos propios de Minecraft (InputConstants). */
public final class NovaInput {
    private NovaInput() { }

    private static final boolean[] DOWN = new boolean[3];
    private static boolean seen;

    /** Lo llama MouseMixin con cada pulsación y cada soltar. */
    public static void mouseEvent(int raw, boolean down) {
        int button = NovaVer.btn(raw);
        if (button >= 0 && button < DOWN.length) { DOWN[button] = down; seen = true; }
    }

    /** Botón del ratón pulsado ahora: 0 izquierdo, 1 derecho, 2 central. */
    static boolean mouse(Minecraft mc, int button) {
        if (seen) return button >= 0 && button < DOWN.length && DOWN[button];
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
