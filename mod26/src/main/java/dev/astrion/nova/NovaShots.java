package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.function.Consumer;
import javax.imageio.ImageIO;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.util.Util;

/**
 * Aviso de Nova al guardar una captura (F2): miniatura, datos y los botones «Copiar», «Abrir» y «Carpeta» en la esquina de arriba a la derecha durante 5 s.
 * Los botones se pueden pulsar cuando el ratón está libre (chat, inventario, pausa); mientras el puntero esté encima, el aviso no se va.
 * El mod no copia imágenes ni abre carpetas por su cuenta: escribe marcadores que el launcher entiende (con el código secreto de la partida: SHOTCOPY, SHOTVIEW, SHOTOPEN).
 */
public final class NovaShots {
    private NovaShots() { }

    static final long SHOW_MS = 5000;
    private static volatile String path = "";
    private static volatile BufferedImage thumb;
    private static volatile long born;
    private static NovaButton bCopy, bView, bDir;
    private static volatile int shotW, shotH;
    private static volatile long shotBytes, copiedAt;
    private static boolean wasDown;
    private static long lastNow;

    /** La capa «shot-a/b» envuelve con esto el receptor de mensajes de ScreenshotRecorder: al llegar «captura guardada» se avisa. */
    public static Consumer<Component> wrap(Consumer<Component> inner) {
        if (inner == null) return null;
        return t -> {
            try { inner.accept(t); } finally {
                try { if (t != null && t.getContents() instanceof TranslatableContents tc && "screenshot.success".equals(tc.getKey())) saved(); } catch (Throwable ignored) { }
            }
        };
    }

    private static void saved() {
        try {
            Minecraft mc = Minecraft.getInstance();
            File[] fl = new File(mc.gameDirectory, "screenshots").listFiles((d, n) -> n.toLowerCase(java.util.Locale.ROOT).endsWith(".png"));
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
            born = Util.getMillis();
            bCopy = null; bView = null; bDir = null;
        } catch (Throwable ignored) { }
    }

    /** Se llama desde el HUD en cada fotograma. */
    static void render(GuiGraphicsExtractor c, Minecraft mc) {
        final String p = path;
        if (p.isEmpty()) return;
        long now = Util.getMillis();
        int sw = c.guiWidth(), sh = c.guiHeight();
        boolean free = !mc.mouseHandler.isMouseGrabbed();
        double mx = -1, my = -1;
        if (free) {
            try { mx = mc.mouseHandler.xpos() * sw / (double) mc.getWindow().getScreenWidth(); my = mc.mouseHandler.ypos() * sh / (double) mc.getWindow().getScreenHeight(); } catch (Throwable ignored) { }
        }
        int w = 196, h = 84, x = sw - w - 6, y = 36;
        boolean over = free && mx >= x && mx <= x + w && my >= y && my <= y + h;
        if (over) born += now - lastNow;   // con el puntero encima el aviso espera
        lastNow = now;
        long age = now - born;
        if (age > SHOW_MS) { path = ""; thumb = null; return; }
        float a = Math.min(1f, age / 180f) * Math.min(1f, (SHOW_MS - age) / 300f);
        if (a <= 0f) return;
        x += (int) ((1f - Math.min(1f, age / 180f)) * 14);
        NovaButton.panel(c, x, y, w, h, 6, withAlpha(0xF010102A, a), withAlpha(0xFF4A3C8C, a));
        // miniatura con marco
        int tw = 78, th = 44;
        BufferedImage im = thumb;
        boolean drawn = false;
        if (im != null && NovaGfx.ok) {
            try {
                NovaGfx.Tex t = NovaGfx.skin(mc, im, "shot|" + p);
                th = Math.max(24, Math.min(50, tw * im.getHeight() / im.getWidth()));
                t.drawSized(c, x + 7, y + 7, tw, th, a);
                drawn = true;
            } catch (Throwable e) { NovaGfx.ok = false; }
        }
        if (!drawn) c.fill(x + 7, y + 7, x + 7 + tw, y + 7 + th, withAlpha(0xFF1B1B33, a));
        c.fill(x + 6, y + 6, x + 8 + tw, y + 7, withAlpha(0x66FFFFFF, a)); c.fill(x + 6, y + 7 + th, x + 8 + tw, y + 8 + th, withAlpha(0x66FFFFFF, a));
        c.fill(x + 6, y + 7, x + 7, y + 7 + th, withAlpha(0x66FFFFFF, a)); c.fill(x + 7 + tw, y + 7, x + 8 + tw, y + 7 + th, withAlpha(0x66FFFFFF, a));
        int tx = x + 7 + tw + 8;
        txt(c, mc, "✓ " + tr("Captura guardada"), tx, y + 8, 7.2f, 0xFFFFFFFF, true, a);
        String fn = new File(p).getName();
        txt(c, mc, fn.length() > 22 ? fn.substring(0, 19) + "…" : fn, tx, y + 21, 5.4f, 0xFF9A9AC0, false, a);
        long kb = shotBytes / 1024;
        String info = (shotW > 0 ? shotW + "×" + shotH + "  ·  " : "") + (kb >= 1024 ? String.format(java.util.Locale.ROOT, "%.1f MB", kb / 1024.0) : kb + " KB");
        txt(c, mc, info, tx, y + 31, 5.4f, 0xFF7C7CA0, false, a);
        // cerrar (X)
        int cx0 = x + w - 13, cy0 = y + 4;
        boolean hotX = free && mx >= cx0 && mx < cx0 + 10 && my >= cy0 && my < cy0 + 10;
        txt(c, mc, "×", cx0 + 2, cy0 - 1, 9f, hotX ? 0xFFFFFFFF : 0xFF9A9AC0, true, a);
        // botones: Copiar · Abrir · Carpeta
        int by = y + 7 + Math.max(th, 44) + 6, bw = (w - 14 - 2 * 3) / 3;
        boolean copied = copiedAt > 0 && now - copiedAt < 1800;
        if (bCopy == null) {
            bCopy = new NovaButton(0, 0, bw, 13, Component.literal(tr("Copiar")), -1, NovaButton.NORMAL, b -> { });
            bView = new NovaButton(0, 0, bw, 13, Component.literal(tr("Abrir")), -1, NovaButton.NORMAL, b -> { });
            bDir = new NovaButton(0, 0, bw, 13, Component.literal(tr("Carpeta")), NovaGfx.I_FOLDER, NovaButton.NORMAL, b -> { });
        }
        bCopy.setMessage(Component.literal(copied ? "✓ " + tr("¡Copiada!") : tr("Copiar")));
        bCopy.setX(x + 7); bCopy.setY(by); bView.setX(x + 7 + bw + 3); bView.setY(by); bDir.setX(x + 7 + 2 * (bw + 3)); bDir.setY(by);
        int imx = (int) mx, imy = (int) my;
        bCopy.extractRenderState(c, imx, imy, 0f); bView.extractRenderState(c, imx, imy, 0f); bDir.extractRenderState(c, imx, imy, 0f);
        // barra de tiempo restante, o la pista de cómo pulsar los botones
        if (free) {
            int bar = (int) ((w - 14) * (1f - age / (float) SHOW_MS));
            c.fill(x + 7, y + h - 6, x + 7 + (w - 14), y + h - 4, withAlpha(0x33FFFFFF, a));
            c.fill(x + 7, y + h - 6, x + 7 + Math.max(0, bar), y + h - 4, withAlpha(NovaSettings.accent | 0xFF000000, a));
        } else {
            txt(c, mc, tr("Abre el chat para usar los botones"), x + 7, y + h - 10, 5.2f, 0xFF7C7CA0, false, a);
        }
        boolean down = free && NovaInput.mouse(mc, 0);
        if (down && !wasDown) {
            if (hotX) { born = now - SHOW_MS + 150; }
            else if (hit(bCopy, mx, my)) { NovaMark.say("SHOTCOPY", p); copiedAt = now; born = Math.max(born, now - SHOW_MS + 2600); }
            else if (hit(bView, mx, my)) { NovaMark.say("SHOTVIEW", p); born = Math.min(born, now - SHOW_MS + 900); }
            else if (hit(bDir, mx, my)) { NovaMark.say("SHOTOPEN", p); born = Math.min(born, now - SHOW_MS + 900); }
        }
        wasDown = down;
    }

    static boolean hit(NovaButton b, double mx, double my) {
        return mx >= b.getX() && mx < b.getX() + b.getWidth() && my >= b.getY() && my < b.getY() + b.getHeight();
    }

    static int withAlpha(int argb, float a) { return (((int) ((argb >>> 24) * a)) << 24) | (argb & 0xFFFFFF); }

    static void txt(GuiGraphicsExtractor c, Minecraft mc, String s, int x, int y, float px, int argb, boolean bold, float a) {
        if (NovaGfx.ok) {
            try { NovaGfx.text(mc, s, px, argb, bold).draw(c, x, y, a); return; } catch (Throwable e) { NovaGfx.ok = false; }
        }
        c.text(mc.font, s, x, y + 1, argb, true);
    }
}
