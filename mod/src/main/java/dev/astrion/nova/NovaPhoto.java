package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import org.lwjgl.glfw.GLFW;

/** Modo foto (capa de esta rama): con la tecla se esconde el HUD, baja la sensibilidad al 25 % y la rueda cambia el campo de visión (30–110). Al salir todo vuelve a como estaba. */
public final class NovaPhoto {
    private NovaPhoto() { }

    private static Double sensOrig;
    private static Boolean hudOrig;

    /** Cada fotograma con el jugador en el mundo. */
    static void tick(MinecraftClient mc) {
        try {
            boolean down = NovaHud.photoKey > 0 && mc.currentScreen == null
                    && GLFW.glfwGetKey(mc.getWindow().getHandle(), NovaHud.photoKey) == GLFW.GLFW_PRESS;
            if (NovaPhotoCore.edge(down)) { if (NovaPhotoCore.active) leave(mc, true); else enter(mc); }
        } catch (Throwable ignored) { }
    }

    private static void enter(MinecraftClient mc) {
        sensOrig = mc.options.getMouseSensitivity().getValue();
        hudOrig = mc.options.hudHidden;
        NovaPhotoCore.enter(mc.options.getFov().getValue());
        mc.options.getMouseSensitivity().setValue(NovaPhotoCore.sens(sensOrig));
        mc.options.hudHidden = true;
        NovaToasts.push(NovaPhotoCore.onText());
    }

    /** Sale del modo foto y devuelve HUD, sensibilidad y campo de visión. */
    public static void leave(MinecraftClient mc, boolean say) {
        if (!NovaPhotoCore.active) return;
        NovaPhotoCore.exit();
        try { if (sensOrig != null) mc.options.getMouseSensitivity().setValue(sensOrig); } catch (Throwable ignored) { }
        try { if (hudOrig != null) mc.options.hudHidden = hudOrig; } catch (Throwable ignored) { }
        sensOrig = null; hudOrig = null;
        if (say) NovaToasts.push(NovaPhotoCore.offText());
    }

    /** Lo llama MouseMixin: true si la rueda es del modo foto (no cambia de casilla). */
    public static boolean scroll(double dy) {
        try { return MinecraftClient.getInstance().currentScreen == null && NovaPhotoCore.wheel(dy); } catch (Throwable t) { return false; }
    }

    /** Al guardarse una captura (NovaShots): en modo foto avisa de que es a resolución normal. */
    static void shotSaved() {
        if (NovaPhotoCore.active) NovaToasts.push(NovaPhotoCore.shotText());
    }

    /** Multiplicador del campo de visión (lo usa zoomMul). */
    static double mul() { return NovaPhotoCore.mul(); }
}
