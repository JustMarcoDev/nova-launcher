package dev.astrion.nova;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/** Modo foto (capa de esta rama): con la tecla se esconde el HUD, baja la sensibilidad al 25 % y la rueda cambia el campo de visión (30–110). Al salir todo vuelve a como estaba. */
public final class NovaPhoto {
    private NovaPhoto() { }

    private static Double sensOrig;
    private static Boolean hudOrig;

    /** Cada fotograma con el jugador en el mundo. */
    static void tick(Minecraft mc) {
        try {
            boolean down = NovaHud.photoKey > 0 && NovaGui.screen(mc) == null
                    && NovaInput.key(NovaHud.photoKey);
            if (NovaPhotoCore.edge(down)) { if (NovaPhotoCore.active) leave(mc, true); else enter(mc); }
            if (NovaPhotoCore.active && NovaGui.screen(mc) == null) {
                if (NovaPhotoCore.edgeGrid(NovaInput.key(NovaMc.keyGrid()))) { NovaPhotoCore.grid = !NovaPhotoCore.grid; NovaToasts.push(NovaPhotoCore.gridText(NovaPhotoCore.grid)); }
                if (NovaPhotoCore.edgeHand(NovaInput.key(NovaMc.keyHand()))) { NovaPhotoCore.hideHand = !NovaPhotoCore.hideHand; NovaToasts.push(NovaPhotoCore.handText(NovaPhotoCore.hideHand)); }
            }
        } catch (Throwable ignored) { }
    }

    private static void enter(Minecraft mc) {
        sensOrig = mc.options.sensitivity().get();
        hudOrig = NovaGui.hidden(mc);
        NovaPhotoCore.enter(mc.options.fov().get());
        mc.options.sensitivity().set(NovaPhotoCore.sens(sensOrig));
        NovaGui.setHidden(mc, true);
        NovaToasts.push(NovaPhotoCore.onText());
    }

    /** Sale del modo foto y devuelve HUD, sensibilidad y campo de visión. */
    public static void leave(Minecraft mc, boolean say) {
        if (!NovaPhotoCore.active) return;
        NovaPhotoCore.exit();
        try { if (sensOrig != null) mc.options.sensitivity().set(sensOrig); } catch (Throwable ignored) { }
        try { if (hudOrig != null) NovaGui.setHidden(mc, hudOrig); } catch (Throwable ignored) { }
        sensOrig = null; hudOrig = null;
        if (say) NovaToasts.push(NovaPhotoCore.offText());
    }


    /** Lo llama el HUD en cada fotograma: dibuja la cuadrícula de tercios (también con el HUD escondido). */
    static void overlay(GuiGraphicsExtractor c, Minecraft mc) {
        try {
            if (!NovaPhotoCore.active || !NovaPhotoCore.grid) return;
            int sw = c.guiWidth(), sh = c.guiHeight(), fw = mc.getWindow().getWidth(), fh = mc.getWindow().getHeight();
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
        try { return NovaGui.screen(Minecraft.getInstance()) == null && NovaPhotoCore.wheel(dy); } catch (Throwable t) { return false; }
    }

    /** Al guardarse una captura (NovaShots): en modo foto avisa de que es a resolución normal. */
    static void shotSaved() {
        if (NovaPhotoCore.active) NovaToasts.push(NovaPhotoCore.shotText());
    }

    /** Multiplicador del campo de visión (lo usa zoomMul). */
    static double mul() { return NovaPhotoCore.mul(); }
}
