package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

/** Modo foto: la lógica sin nada de Minecraft (la tecla, el campo de visión con la rueda, la sensibilidad y los avisos). Lo conecta NovaPhoto de cada rama. */
final class NovaPhotoCore {
    private NovaPhotoCore() { }

    static final int FOV_MIN = 30, FOV_MAX = 110, FOV_STEP = 2;
    static final double SENS = 0.25;

    static volatile boolean active;
    private static boolean wasKey;
    private static int fov = 70, base = 70;

    /** Flanco de subida de la tecla (un solo cambio por pulsación). */
    static boolean edge(boolean down) {
        boolean r = down && !wasKey;
        wasKey = down;
        return r;
    }

    static void enter(int currentFov) {
        base = Math.max(1, currentFov);
        fov = clamp(base);
        active = true;
    }

    static void exit() { active = false; fov = base; }

    static int clamp(int f) { return Math.max(FOV_MIN, Math.min(FOV_MAX, f)); }

    /** Una vuelta de rueda: hacia arriba acerca (menos campo de visión). Devuelve true si el modo se queda con ella. */
    static boolean wheel(double dy) {
        if (!active || dy == 0) return false;
        fov = clamp(fov - (int) Math.signum(dy) * FOV_STEP);
        return true;
    }

    static int fov() { return fov; }

    /** Por cuánto se multiplica el campo de visión del mundo (1 sin modo foto). */
    static double mul() { return active ? fov / (double) base : 1.0; }

    static double sens(double orig) { return orig * SENS; }

    static String onText() { return tr("Modo foto") + " · " + tr("rueda: zoom, F2: captura"); }
    static String offText() { return tr("Modo foto") + " " + tr("desactivado"); }
    static String shotText() { return tr("Modo foto: esta versión hace la captura a resolución normal"); }
}
