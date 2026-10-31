package dev.astrion.nova;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

/**
 * Aviso de capturas (lógica común): localizar la última captura, hacer la miniatura, llevar el tiempo del aviso y los datos que se enseñan.
 * El dibujo (panel, miniatura, botones) lo hace NovaShots en cada proyecto.
 */
final class NovaShotsCore {
    private NovaShotsCore() { }

    static final long SHOW_MS = 5000;
    private static volatile String path = "";
    private static volatile BufferedImage thumb;
    private static volatile long born;
    private static volatile int shotW, shotH;
    private static volatile long shotBytes, copiedAt;
    private static long lastNow;
    static boolean wasDown;

    static String path() { return path; }
    static BufferedImage thumb() { return thumb; }
    static long born() { return born; }
    static void born(long v) { born = v; }
    static long copiedAt() { return copiedAt; }
    static void copiedAt(long v) { copiedAt = v; }

    /** Se ha guardado una captura: busca la más reciente en «screenshots» y prepara la miniatura. now = reloj del juego en ms. */
    static void saved(File gameDir, long now) {
        try {
            File[] fl = new File(gameDir, "screenshots").listFiles((d, n) -> n.toLowerCase(java.util.Locale.ROOT).endsWith(".png"));
            if (fl == null || fl.length == 0) return;
            File best = fl[0];
            for (File f : fl) if (f.lastModified() > best.lastModified()) best = f;
            NovaMark.say("SHOTNEW", best.getAbsolutePath());
            BufferedImage th = null;
            try {
                BufferedImage im = ImageIO.read(best);
                if (im != null) {
                    shotW = im.getWidth(); shotH = im.getHeight();
                    int w = 200, h = Math.max(1, im.getHeight() * w / im.getWidth());
                    th = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
                    java.awt.Graphics2D g = th.createGraphics();
                    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    g.drawImage(im, 0, 0, w, h, null);
                    g.dispose();
                }
            } catch (Throwable ignored) { }
            thumb = th;
            shotBytes = best.length(); copiedAt = 0;
            path = best.getAbsolutePath();
            born = now;
        } catch (Throwable ignored) { }
    }

    /** Avanza el reloj del aviso (con el puntero encima espera) y devuelve su edad en ms; -1 si ya terminó (y se limpia). */
    static long age(long now, boolean over) {
        if (over) born += now - lastNow;
        lastNow = now;
        long age = now - born;
        if (age > SHOW_MS) { path = ""; thumb = null; return -1; }
        return age;
    }

    /** Opacidad del aviso según su edad (sin fundidos con «reducir movimiento»). */
    static float alpha(long age) {
        return NovaAcc.still() ? 1f : Math.min(1f, age / 180f) * Math.min(1f, (SHOW_MS - age) / 300f);
    }

    /** Desplazamiento de entrada desde la derecha en píxeles. */
    static int slide(long age) { return NovaAcc.still() ? 0 : (int) ((1f - Math.min(1f, age / 180f)) * 14); }

    static String fileLabel() {
        String fn = new File(path).getName();
        return fn.length() > 22 ? fn.substring(0, 19) + "…" : fn;
    }

    static String info() {
        long kb = shotBytes / 1024;
        return (shotW > 0 ? shotW + "×" + shotH + "  ·  " : "") + (kb >= 1024 ? String.format(java.util.Locale.ROOT, "%.1f MB", kb / 1024.0) : kb + " KB");
    }

    /** Altura de la miniatura dibujada para un ancho tw (entre 24 y 50). */
    static int thumbH(int tw, BufferedImage im) { return Math.max(24, Math.min(50, tw * im.getHeight() / im.getWidth())); }

    static boolean copied(long now) { return copiedAt > 0 && now - copiedAt < 1800; }

    static int withAlpha(int argb, float a) { return (((int) ((argb >>> 24) * a)) << 24) | (argb & 0xFFFFFF); }

    static boolean inside(double mx, double my, int x, int y, int w, int h) { return mx >= x && mx < x + w && my >= y && my < y + h; }

    /** Pulsación en este fotograma (flanco de bajada). */
    static boolean press(boolean down) { boolean r = down && !wasDown; wasDown = down; return r; }
}
