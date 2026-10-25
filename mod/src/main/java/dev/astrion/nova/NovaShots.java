package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.function.Consumer;
import javax.imageio.ImageIO;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.text.Text;
import net.minecraft.text.TranslatableTextContent;
import net.minecraft.util.Util;
import org.lwjgl.glfw.GLFW;

/**
 * Aviso de Nova al guardar una captura (F2): miniatura, «Copiar» y «Abrir carpeta» en la esquina de arriba a la derecha durante 5 s.
 * Los botones se pueden pulsar cuando el ratón está libre (chat, inventario, pausa); mientras el puntero esté encima, el aviso no se va.
 * El mod no copia imágenes ni abre carpetas por su cuenta: escribe marcadores que el launcher entiende ([NOVA:SHOTCOPY:ruta], [NOVA:SHOTOPEN:ruta]).
 */
public final class NovaShots {
    private NovaShots() { }

    static final long SHOW_MS = 5000;
    private static volatile String path = "";
    private static volatile BufferedImage thumb;
    private static volatile long born;
    private static String thumbKey = "";
    private static NovaButton bCopy, bOpen;
    private static boolean wasDown;
    private static long lastNow;

    /** La capa «shot-a/b» envuelve con esto el receptor de mensajes de ScreenshotRecorder: al llegar «captura guardada» se avisa. */
    public static Consumer<Text> wrap(Consumer<Text> inner) {
        if (inner == null) return null;
        return t -> {
            try { inner.accept(t); } finally {
                try { if (t != null && t.getContent() instanceof TranslatableTextContent tc && "screenshot.success".equals(tc.getKey())) saved(); } catch (Throwable ignored) { }
            }
        };
    }

    private static void saved() {
        try {
            MinecraftClient mc = MinecraftClient.getInstance();
            File[] fl = new File(mc.runDirectory, "screenshots").listFiles((d, n) -> n.toLowerCase(java.util.Locale.ROOT).endsWith(".png"));
            if (fl == null || fl.length == 0) return;
            File best = fl[0];
            for (File f : fl) if (f.lastModified() > best.lastModified()) best = f;
            System.out.println("[Nova] captura: " + best.getAbsolutePath());
            BufferedImage th = null;
            try {
                BufferedImage im = ImageIO.read(best);
                if (im != null) {
                    int w = 160, h = Math.max(1, im.getHeight() * w / im.getWidth());
                    th = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
                    java.awt.Graphics2D g = th.createGraphics();
                    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    g.drawImage(im, 0, 0, w, h, null);
                    g.dispose();
                }
            } catch (Throwable ignored) { }
            thumb = th;
            path = best.getAbsolutePath();
            born = Util.getMeasuringTimeMs();
            bCopy = null; bOpen = null;
        } catch (Throwable ignored) { }
    }

    /** Se llama desde el HUD en cada fotograma. */
    static void render(DrawContext c, MinecraftClient mc) {
        final String p = path;
        if (p.isEmpty()) return;
        long now = Util.getMeasuringTimeMs();
        int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        boolean free = !mc.mouse.isCursorLocked();
        double mx = -1, my = -1;
        if (free) {
            try { mx = mc.mouse.getX() * sw / (double) mc.getWindow().getWidth(); my = mc.mouse.getY() * sh / (double) mc.getWindow().getHeight(); } catch (Throwable ignored) { }
        }
        int w = 158, h = 62, x = sw - w - 6, y = 36;
        boolean over = free && mx >= x && mx <= x + w && my >= y && my <= y + h;
        if (over) born += now - lastNow;   // con el puntero encima el aviso espera
        lastNow = now;
        long age = now - born;
        if (age > SHOW_MS) { path = ""; thumb = null; return; }
        float a = Math.min(1f, age / 180f) * Math.min(1f, (SHOW_MS - age) / 300f);
        if (a <= 0f) return;
        int slide = (int) ((1f - Math.min(1f, age / 180f)) * 14);
        x += slide;
        NovaButton.panel(c, x, y, w, h, 6, withAlpha(0xF010102A, a), withAlpha(0xFF4A3C8C, a));
        // miniatura
        int tw = 70, th = 40;
        BufferedImage im = thumb;
        boolean drawn = false;
        if (im != null && NovaGfx.ok) {
            try {
                NovaGfx.Tex t = NovaGfx.skin(mc, im, "shot|" + p);
                th = Math.max(20, Math.min(46, tw * im.getHeight() / im.getWidth()));
                t.drawSized(c, x + 6, y + 6, tw, th, a);
                drawn = true;
            } catch (Throwable e) { NovaGfx.ok = false; }
        }
        if (!drawn) c.fill(x + 6, y + 6, x + 6 + tw, y + 6 + th, withAlpha(0xFF1B1B33, a));
        int tx = x + 6 + tw + 6;
        txt(c, mc, tr("Captura guardada"), tx, y + 8, 7.4f, 0xFFFFFFFF, true, a);
        String fn = new File(p).getName();
        txt(c, mc, fn.length() > 20 ? fn.substring(0, 17) + "…" : fn, tx, y + 21, 5.4f, 0xFF9A9AC0, false, a);
        txt(c, mc, tr("5 s"), tx, y + 31, 5.4f, 0xFF7C7CA0, false, a);
        // botones
        int by = y + 6 + Math.max(th, 40) + 4, bw = (w - 12 - 3) / 2;
        if (bCopy == null) {
            bCopy = new NovaButton(0, 0, bw, 12, Text.literal(tr("Copiar")), -1, NovaButton.NORMAL, b -> System.out.println("[NOVA:SHOTCOPY:" + path + "]"));
            bOpen = new NovaButton(0, 0, bw, 12, Text.literal(tr("Abrir carpeta")), NovaGfx.I_FOLDER, NovaButton.NORMAL, b -> System.out.println("[NOVA:SHOTOPEN:" + path + "]"));
        }
        bCopy.setX(x + 6); bCopy.setY(by); bOpen.setX(x + 6 + bw + 3); bOpen.setY(by);
        int imx = (int) mx, imy = (int) my;
        bCopy.render(c, imx, imy, 0f); bOpen.render(c, imx, imy, 0f);
        boolean down = free && GLFW.glfwGetMouseButton(mc.getWindow().getHandle(), 0) == GLFW.GLFW_PRESS;
        if (down && !wasDown) {
            if (hit(bCopy, mx, my)) { System.out.println("[NOVA:SHOTCOPY:" + path + "]"); born = Math.min(born, now - SHOW_MS + 1200); }
            else if (hit(bOpen, mx, my)) { System.out.println("[NOVA:SHOTOPEN:" + path + "]"); born = Math.min(born, now - SHOW_MS + 1200); }
        }
        wasDown = down;
    }

    private static boolean hit(NovaButton b, double mx, double my) {
        return mx >= b.getX() && mx < b.getX() + b.getWidth() && my >= b.getY() && my < b.getY() + b.getHeight();
    }

    private static int withAlpha(int argb, float a) { return (((int) ((argb >>> 24) * a)) << 24) | (argb & 0xFFFFFF); }

    private static void txt(DrawContext c, MinecraftClient mc, String s, int x, int y, float px, int argb, boolean bold, float a) {
        if (NovaGfx.ok) {
            try { NovaGfx.text(mc, s, px, argb, bold).draw(c, x, y, a); return; } catch (Throwable e) { NovaGfx.ok = false; }
        }
        c.drawText(mc.textRenderer, s, x, y + 1, argb, true);
    }
}
