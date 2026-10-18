package dev.astrion.nova;

import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;

/** Gráficos suaves (Java2D, con antialiasing) subidos como texturas: nada de píxeles estilo Minecraft. */
public final class NovaGfx {
    public static boolean ok = true;
    static final Map<String, Tex> CACHE = new HashMap<>();
    static Font bold, reg;
    static BufferedImage icons;
    static int lastScale = -1, seq;

    public static final class Tex {
        final Identifier id; final int pw, ph, gw, gh;
        Tex(Identifier id, int pw, int ph, int sc) { this.id = id; this.pw = pw; this.ph = ph; this.gw = pw / sc; this.gh = ph / sc; }
        public int w() { return gw; }
        public int h() { return gh; }
        public void draw(DrawContext c, int x, int y, float alpha) {
            if (alpha <= 0.003f) return;
            com.mojang.blaze3d.systems.RenderSystem.enableBlend();
            c.setShaderColor(1f, 1f, 1f, Math.min(1f, alpha));
            c.drawTexture(id, x, y, gw, gh, 0, 0, pw, ph, pw, ph);
            c.setShaderColor(1f, 1f, 1f, 1f);
        }
    }

    static int sc(MinecraftClient mc) { return Math.max(1, (int) Math.round(mc.getWindow().getScaleFactor())); }

    /** Si cambia la escala de la interfaz se descartan las texturas para recrearlas nítidas. */
    static int begin(MinecraftClient mc) {
        int s = sc(mc);
        if (s != lastScale) {
            for (Tex t : CACHE.values()) { try { mc.getTextureManager().destroyTexture(t.id); } catch (Throwable ignored) { } }
            CACHE.clear();
            lastScale = s;
        }
        return s;
    }

    /** Si el texto lleva caracteres que la fuente recortada no tiene (nombres con otros alfabetos), usa la fuente del sistema. */
    static Font fontFor(String str, boolean b, float px) {
        Font f = font(b, px);
        return f.canDisplayUpTo(str) == -1 ? f : new Font(Font.SANS_SERIF, b ? Font.BOLD : Font.PLAIN, Math.round(px));
    }

    static Font font(boolean b, float px) {
        try {
            if (bold == null) {
                System.setProperty("java.awt.headless", System.getProperty("java.awt.headless", "true"));
                try (InputStream in = NovaGfx.class.getResourceAsStream("/assets/nova/fonts/ui-bold.ttf")) { bold = Font.createFont(Font.TRUETYPE_FONT, in); }
                try (InputStream in = NovaGfx.class.getResourceAsStream("/assets/nova/fonts/ui.ttf")) { reg = Font.createFont(Font.TRUETYPE_FONT, in); }
            }
            return (b ? bold : reg).deriveFont(px);
        } catch (Throwable e) {
            return new Font(Font.SANS_SERIF, b ? Font.BOLD : Font.PLAIN, Math.round(px));
        }
    }

    static Graphics2D g2(BufferedImage im) {
        Graphics2D g = im.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        return g;
    }

    static Color col(int argb) { return new Color(argb, true); }
    static Color a(int argb, float k) { return new Color((argb >> 16) & 255, (argb >> 8) & 255, argb & 255, Math.max(0, Math.min(255, Math.round(((argb >>> 24) & 255) * k)))); }

    static Tex upload(MinecraftClient mc, String key, BufferedImage im, int sc) {
        int w = im.getWidth(), h = im.getHeight();
        NativeImage ni = new NativeImage(NativeImage.Format.RGBA, w, h, false);
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int p = im.getRGB(x, y);   // ARGB no premultiplicado
            ni.setColor(x, y, (p & 0xFF00FF00) | ((p >> 16) & 255) | ((p & 255) << 16));   // -> ABGR
        }
        NativeImageBackedTexture t = new NativeImageBackedTexture(ni);
        try { t.setFilter(true, false); } catch (Throwable ignored) { }
        Identifier id = Identifier.tryParse("nova:gfx/g" + (seq++));
        mc.getTextureManager().registerTexture(id, t);
        Tex r = new Tex(id, w, h, sc);
        CACHE.put(key, r);
        return r;
    }

    static BufferedImage icons() {
        if (icons == null) {
            try (InputStream in = NovaGfx.class.getResourceAsStream("/assets/nova/textures/gui/icons.png")) { icons = javax.imageio.ImageIO.read(in); }
            catch (Exception e) { icons = new BufferedImage(384, 32, BufferedImage.TYPE_INT_ARGB); }
        }
        return icons;
    }

    /** Dibuja un icono del strip (32 px por casilla) teñido y suavizado. */
    static void icon(Graphics2D g, int idx, double x, double y, double size, int argb) {
        int n = Math.max(2, (int) Math.ceil(size));
        BufferedImage t = new BufferedImage(n, n, BufferedImage.TYPE_INT_ARGB);
        Graphics2D q = g2(t);
        // reducción en dos pasos para que quede suave
        q.drawImage(icons().getSubimage(idx * 32, 0, 32, 32), 0, 0, n, n, null);
        q.setComposite(AlphaComposite.SrcIn);
        q.setColor(col(argb));
        q.fillRect(0, 0, n, n);
        q.dispose();
        g.drawImage(t, (int) Math.round(x), (int) Math.round(y), null);
    }

    public static Tex button(MinecraftClient mc, int w, int h, String label, int icon, int style, boolean hot, boolean enabled) {
        int s = begin(mc);
        String key = "b|" + w + "x" + h + "|" + label + "|" + icon + "|" + style + "|" + hot + "|" + enabled;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        int m = 5;   // margen para el brillo exterior
        int W = (w + 2 * m) * s, H = (h + 2 * m) * s;
        BufferedImage im = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        boolean danger = style == NovaButton.DANGER, primary = style == NovaButton.PRIMARY;
        int acc = danger ? 0xFFFF4D5E : 0xFF8B6CFF;
        double bx = m * s, by = m * s, bw = w * s, bh = h * s;
        double rr = Math.min(3.5 * s, bh / 2);   // cuadrado con esquinas redondeadas
        if (hot && enabled) {   // resplandor suave de acento
            for (int i = 4 * s; i >= 1; i -= Math.max(1, s / 2)) {
                float k = 1f - (float) i / (4 * s);
                g.setColor(a(acc, 0.11f * k * k));
                g.fill(new RoundRectangle2D.Double(bx - i, by - i, bw + 2 * i, bh + 2 * i, 2 * rr + i, 2 * rr + i));
            }
        }
        Shape box = new RoundRectangle2D.Double(bx, by, bw, bh, 2 * rr, 2 * rr);
        int f1, f2, b1, b2;   // relleno arriba/abajo y borde arriba/abajo
        if (!enabled) { f1 = 0x50141428; f2 = 0x500A0A18; b1 = 0x30FFFFFF; b2 = 0x14FFFFFF; }
        else if (danger) { f1 = hot ? 0xD8601A2C : 0xB0301020; f2 = hot ? 0xD8381020 : 0xB0180810; b1 = hot ? 0xFFFF8A96 : 0x80FF7A86; b2 = hot ? 0xFFFF4D5E : 0x40FF4D5E; }
        else if (primary) { f1 = hot ? 0xE0463A9C : 0xC02C2472; f2 = hot ? 0xE0281F66 : 0xC0161040; b1 = hot ? 0xFFC8B8FF : 0x90A794FF; b2 = hot ? 0xFF8B6CFF : 0x508B6CFF; }
        else { f1 = hot ? 0xD83A3086 : 0xA02A2260; f2 = hot ? 0xD8201A58 : 0xA0100E28; b1 = hot ? 0xFFC8B8FF : 0x60FFFFFF; b2 = hot ? 0xFF8B6CFF : 0x28FFFFFF; }
        g.setPaint(new GradientPaint(0, (float) by, col(f1), 0, (float) (by + bh), col(f2)));
        g.fill(box);
        // reflejo sutil en la mitad superior
        Shape old = g.getClip();
        g.setClip(box);
        g.setPaint(new GradientPaint(0, (float) by, new Color(255, 255, 255, enabled ? (hot ? 34 : 20) : 8), 0, (float) (by + bh * 0.5), new Color(255, 255, 255, 0)));
        g.fill(new Rectangle2D.Double(bx, by, bw, bh * 0.5));
        g.setClip(old);
        float sw = Math.max(1f, s * 0.7f);
        g.setStroke(new BasicStroke(sw));
        g.setPaint(new GradientPaint(0, (float) by, col(b1), 0, (float) (by + bh), col(b2)));
        double o = sw / 2;
        g.draw(new RoundRectangle2D.Double(bx + o, by + o, bw - 2 * o, bh - 2 * o, 2 * rr - sw, 2 * rr - sw));

        int txt = !enabled ? 0xFF9A9AB8 : danger ? (hot ? 0xFFFFFFFF : 0xFFFF9AA4) : (hot ? 0xFFFFFFFF : 0xFFE2E2F6);
        double fpx = Math.max(6.5, Math.min(h * 0.44, 8.2)) * s;
        Font f = fontFor(label, true, (float) fpx);
        g.setFont(f);
        FontMetrics fm = g.getFontMetrics();
        double tw = label.isEmpty() ? 0 : fm.getStringBounds(label, g).getWidth();
        double isz = icon >= 0 ? (label.isEmpty() ? Math.min(h * 0.58, 10.5) : 8) * s : 0;
        double gap = icon >= 0 && tw > 0 ? 4 * s : 0;
        double x0 = bx + (bw - (isz + gap + tw)) / 2;
        if (icon >= 0) icon(g, icon, x0, by + (bh - isz) / 2, isz, txt);
        if (tw > 0) {
            g.setColor(col(txt));
            g.drawString(label, (float) (x0 + isz + gap), (float) (by + (bh - fm.getHeight()) / 2 + fm.getAscent()));
        }
        g.dispose();
        return upload(mc, key, im, s);
    }

    public static Tex text(MinecraftClient mc, String str, float px, int argb, boolean b) {
        int s = begin(mc);
        String key = "t|" + str + "|" + px + "|" + argb + "|" + b;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        BufferedImage probe = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        Graphics2D pg = g2(probe);
        pg.setFont(fontFor(str, b, px * s));
        FontMetrics fm = pg.getFontMetrics();
        double tw = fm.getStringBounds(str, pg).getWidth();
        pg.dispose();
        int gw = (int) Math.ceil(tw / s) + 2, gh = (int) Math.ceil(fm.getHeight() / (double) s) + 1;
        BufferedImage im = new BufferedImage(gw * s, gh * s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        g.setFont(fontFor(str, b, px * s));
        g.setColor(col(argb));
        g.drawString(str, s, fm.getAscent());
        g.dispose();
        return upload(mc, key, im, s);
    }
}
