package dev.astrion.nova;

import java.awt.image.BufferedImage;
import java.io.File;

/** Skin del jugador (la descarga el launcher en -Dnova.skin): figura de frente y cabeza, sin depender de la versión del juego. */
final class NovaSkin {
    private static boolean tried;
    private static BufferedImage skin;
    static BufferedImage body, head;   // body: 16x32 (1 px por píxel de skin), head: 8x8
    static boolean slim;

    static void load() {
        if (tried) return;
        tried = true;
        try {
            String p = System.getProperty("nova.skin", "");
            if (p.isEmpty()) return;
            File f = new File(p);
            if (!f.isFile()) return;
            BufferedImage s = javax.imageio.ImageIO.read(f);
            if (s == null || s.getWidth() != 64 || (s.getHeight() != 64 && s.getHeight() != 32)) return;
            skin = s;
            build();
        } catch (Throwable e) {
            skin = null; body = null; head = null;
        }
    }

    static int px(int x, int y) { return skin.getRGB(x, y); }

    /** Copia una región de la skin a la figura (con transparencia). flip = espejo horizontal. */
    static void put(BufferedImage dst, int sx, int sy, int w, int h, int dx, int dy, boolean flip) {
        for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) {
            int c = px(sx + (flip ? w - 1 - i : i), sy + j);
            int a = c >>> 24;
            if (a == 0) continue;
            int o = dst.getRGB(dx + i, dy + j);
            if (a == 255 || (o >>> 24) == 0) { dst.setRGB(dx + i, dy + j, a == 255 ? c : c); continue; }
            float k = a / 255f;
            int r = Math.round(((c >> 16) & 255) * k + ((o >> 16) & 255) * (1 - k)), g = Math.round(((c >> 8) & 255) * k + ((o >> 8) & 255) * (1 - k)), b = Math.round((c & 255) * k + (o & 255) * (1 - k));
            dst.setRGB(dx + i, dy + j, 0xFF000000 | (r << 16) | (g << 8) | b);
        }
    }

    static void build() {
        boolean modern = skin.getHeight() == 64;
        slim = modern && (px(47, 20) >>> 24) == 0 && (px(47, 26) >>> 24) == 0;
        int aw = slim ? 3 : 4;
        BufferedImage b = new BufferedImage(16, 32, BufferedImage.TYPE_INT_ARGB);
        // piernas, cuerpo, brazos (primero la capa base y luego la de encima)
        put(b, 4, 20, 4, 12, 4, 20, false);                                   // pierna derecha
        if (modern) put(b, 20, 52, 4, 12, 8, 20, false); else put(b, 4, 20, 4, 12, 8, 20, true);   // pierna izquierda
        put(b, 20, 20, 8, 12, 4, 8, false);                                   // cuerpo
        put(b, 44, 20, aw, 12, 4 - aw, 8, false);                             // brazo derecho
        if (modern) put(b, 36, 52, aw, 12, 12, 8, false); else put(b, 44, 20, 4, 12, 12, 8, true);   // brazo izquierdo
        put(b, 8, 8, 8, 8, 4, 0, false);                                      // cabeza
        if (modern) {
            put(b, 4, 36, 4, 12, 4, 20, false); put(b, 4, 52, 4, 12, 8, 20, false);   // pantalón
            put(b, 20, 36, 8, 12, 4, 8, false);                                        // chaqueta
            put(b, 44, 36, aw, 12, 4 - aw, 8, false); put(b, 52, 52, aw, 12, 12, 8, false);   // mangas
        }
        put(b, 40, 8, 8, 8, 4, 0, false);                                     // capa de la cabeza
        body = b;
        BufferedImage h = new BufferedImage(8, 8, BufferedImage.TYPE_INT_ARGB);
        put(h, 8, 8, 8, 8, 0, 0, false);
        put(h, 40, 8, 8, 8, 0, 0, false);
        head = h;
    }
}
