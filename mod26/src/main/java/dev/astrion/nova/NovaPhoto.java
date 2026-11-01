package dev.astrion.nova;

import net.minecraft.client.Minecraft;

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
