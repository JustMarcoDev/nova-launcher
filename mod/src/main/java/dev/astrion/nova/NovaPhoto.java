package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
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
            if (NovaPhotoCore.active && mc.currentScreen == null) {
                if (NovaPhotoCore.edgeGrid(GLFW.glfwGetKey(mc.getWindow().getHandle(), NovaMc.keyGrid()) == GLFW.GLFW_PRESS)) { NovaPhotoCore.grid = !NovaPhotoCore.grid; NovaToasts.push(NovaPhotoCore.gridText(NovaPhotoCore.grid)); }
                if (NovaPhotoCore.edgeHand(GLFW.glfwGetKey(mc.getWindow().getHandle(), NovaMc.keyHand()) == GLFW.GLFW_PRESS)) { NovaPhotoCore.hideHand = !NovaPhotoCore.hideHand; NovaToasts.push(NovaPhotoCore.handText(NovaPhotoCore.hideHand)); }
            }
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


    /** Lo llama el HUD en cada fotograma: dibuja la cuadrícula de tercios (también con el HUD escondido). */
    static void overlay(DrawContext c, MinecraftClient mc) {
        try {
            if (!NovaPhotoCore.active || !NovaPhotoCore.grid) return;
            int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight(), fw = mc.getWindow().getFramebufferWidth(), fh = mc.getWindow().getFramebufferHeight();
            int[][] t = NovaPhotoCore.thirds(sw, sh);
            int col = 0x99FFFFFF;
            for (int x : t[0]) c.fill(x, 0, x + 1, sh, col);
            for (int y : t[1]) c.fill(0, y, sw, y + 1, col);
            NovaPhotoCore.gridDrawn(fw, fh, sw, sh, System.currentTimeMillis());
        } catch (Throwable ignored) { }
    }

    /** Lo consulta HandMixin: true si la mano no debe dibujarse. */
    public static boolean handHidden() { return NovaPhotoCore.handHidden(); }

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
