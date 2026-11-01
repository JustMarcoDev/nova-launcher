package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.awt.image.BufferedImage;

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

    static void exit() { active = false; fov = base; grid = false; hideHand = false; }

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

    // ---- cuadrícula de tercios y mano oculta (solo dentro del Modo foto) ----
    // La cuadrícula se dibuja en el HUD y F2 guarda el último fotograma, así que al guardarse la captura se borra del PNG
    // (cada línea se rellena interpolando los píxeles de sus dos lados): en la captura no aparece ni la cuadrícula ni nada del modo.

    static volatile boolean grid, hideHand;
    private static boolean wasGrid, wasHand;
    private static volatile int[] gx = new int[0], gy = new int[0];
    private static volatile int gThick = 1, gW, gH;
    private static volatile long gAt;

    static boolean edgeGrid(boolean down) { boolean r = down && !wasGrid; wasGrid = down; return r; }
    static boolean edgeHand(boolean down) { boolean r = down && !wasHand; wasHand = down; return r; }

    /** La mano no se dibuja mientras el Modo foto la tiene oculta (lo consulta HandMixin). */
    static boolean handHidden() { return active && hideHand; }

    /** Posiciones (en píxeles de pantalla) de las dos líneas verticales y las dos horizontales de los tercios para un fotograma de w×h. */
    static int[][] thirds(int w, int h) { return new int[][] { { w / 3, w * 2 / 3 }, { h / 3, h * 2 / 3 } }; }

    /** El HUD acaba de dibujar la cuadrícula (líneas de 1 unidad de la interfaz sobre sw×sh): apunta dónde cae en el fotograma de fw×fh píxeles. */
    static void gridDrawn(int fw, int fh, int sw, int sh, long now) {
        int[][] t = thirds(sw, sh);
        int[] xs = new int[t[0].length], ys = new int[t[1].length];
        for (int i = 0; i < xs.length; i++) xs[i] = (int) Math.round(t[0][i] * fw / (double) sw);
        for (int i = 0; i < ys.length; i++) ys[i] = (int) Math.round(t[1][i] * fh / (double) sh);
        gx = xs; gy = ys; gThick = Math.max(1, Math.round(fw / (float) sw)); gW = fw; gH = fh; gAt = now;
    }

    /** Quita la cuadrícula de una captura recién guardada, si se dibujó hace menos de 2 s y la imagen tiene el tamaño del fotograma. */
    static boolean eraseGrid(BufferedImage im, long now) {
        if (im == null || gAt == 0 || now - gAt > 2000 || im.getWidth() != gW || im.getHeight() != gH) return false;
        int t = gThick;
        for (int x0 : gx) fillCols(im, x0, t);
        for (int y0 : gy) fillRows(im, y0, t);
        return true;
    }

    private static void fillCols(BufferedImage im, int x0, int t) {
        int a = x0 - 1, b = x0 + t;
        if (a < 0 || b >= im.getWidth()) return;
        for (int y = 0; y < im.getHeight(); y++) {
            int pa = im.getRGB(a, y), pb = im.getRGB(b, y);
            for (int i = 0; i < t; i++) im.setRGB(x0 + i, y, mix(pa, pb, (i + 1) / (double) (t + 1)));
        }
    }

    private static void fillRows(BufferedImage im, int y0, int t) {
        int a = y0 - 1, b = y0 + t;
        if (a < 0 || b >= im.getHeight()) return;
        for (int x = 0; x < im.getWidth(); x++) {
            int pa = im.getRGB(x, a), pb = im.getRGB(x, b);
            for (int i = 0; i < t; i++) im.setRGB(x, y0 + i, mix(pa, pb, (i + 1) / (double) (t + 1)));
        }
    }

    static int mix(int p, int q, double f) {
        int r = 0;
        for (int sh = 0; sh <= 24; sh += 8) r |= (int) Math.round(((p >>> sh) & 255) * (1 - f) + ((q >>> sh) & 255) * f) << sh;
        return r;
    }

    static String gridText(boolean on) { return tr("Cuadrícula") + ": " + (on ? tr("Sí") : tr("No")); }
    static String handText(boolean hidden) { return hidden ? tr("Mano oculta") : tr("Mano visible"); }

    static String onText() { return tr("Modo foto") + " · " + tr("rueda: zoom, F2: captura") + " · " + tr("G: cuadrícula, H: mano"); }
    static String offText() { return tr("Modo foto") + " " + tr("desactivado"); }
    static String shotText() { return tr("Modo foto: esta versión hace la captura a resolución normal"); }
}
