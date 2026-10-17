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
        double rr = Math.min(4.5 * s, bh / 2);   // cuadrado con esquinas suavemente redondeadas
        if (hot && enabled) {
            for (int i = 4 * s; i >= 1; i -= Math.max(1, s / 2)) {
                float k = 1f - (float) i / (4 * s);
                g.setColor(a(acc, 0.09f * k * k));
                g.fill(new RoundRectangle2D.Double(bx - i, by - i, bw + 2 * i, bh + 2 * i, 2 * rr + i, 2 * rr + i));
            }
        }
        Shape box = new RoundRectangle2D.Double(bx, by, bw, bh, 2 * rr, 2 * rr);
        int fill, brd;
        if (!enabled) { fill = 0x70101020; brd = 0x40FFFFFF; }
        else if (danger) { fill = hot ? 0xD8401622 : 0xA8160A12; brd = hot ? 0xFFFF6A78 : 0x70FF6A78; }
        else if (primary) { fill = hot ? 0xDC2A2260 : 0xB8120F2C; brd = hot ? 0xFFB49CFF : 0x808B6CFF; }
        else { fill = hot ? 0xD4221C54 : 0xA80E0C20; brd = hot ? 0xFFB49CFF : 0x66FFFFFF; }
        g.setColor(col(fill));
        g.fill(box);
        float sw = Math.max(1f, s * 0.75f);
        g.setStroke(new BasicStroke(sw));
        g.setColor(col(brd));
        double o = sw / 2;
        g.draw(new RoundRectangle2D.Double(bx + o, by + o, bw - 2 * o, bh - 2 * o, 2 * rr - sw, 2 * rr - sw));

        int txt = !enabled ? 0xFF9A9AB8 : danger ? (hot ? 0xFFFFFFFF : 0xFFFF9AA4) : (hot ? 0xFFFFFFFF : 0xFFE2E2F6);
        double fpx = Math.max(7, Math.min(h * 0.46, 9.5)) * s;
        Font f = font(true, (float) fpx);
        g.setFont(f);
        FontMetrics fm = g.getFontMetrics();
        double tw = label.isEmpty() ? 0 : fm.getStringBounds(label, g).getWidth();
        double isz = icon >= 0 ? (label.isEmpty() ? Math.min(h * 0.56, 12) : 9) * s : 0;
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
        pg.setFont(font(b, px * s));
        FontMetrics fm = pg.getFontMetrics();
        double tw = fm.getStringBounds(str, pg).getWidth();
        pg.dispose();
        int gw = (int) Math.ceil(tw / s) + 2, gh = (int) Math.ceil(fm.getHeight() / (double) s) + 1;
        BufferedImage im = new BufferedImage(gw * s, gh * s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        g.setFont(font(b, px * s));
        g.setColor(col(argb));
        g.drawString(str, s, fm.getAscent());
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Palabra «MINECRAFT» con degradado suave y sombra, más «JAVA EDITION» debajo. */
    public static Tex wordmark(MinecraftClient mc, String sub) {
        int s = begin(mc);
        String key = "w|" + sub;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        int gw = 180, gh = 44;
        BufferedImage im = new BufferedImage(gw * s, gh * s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        String word = "MINECRAFT";
        Font f = font(true, 30f * s);
        g.setFont(f);
        // espaciado entre letras
        double track = 2.2 * s;
        FontMetrics fm = g.getFontMetrics();
        double total = 0;
        for (char ch : word.toCharArray()) total += fm.charWidth(ch) + track;
        total -= track;
        double x = (gw * s - total) / 2, base = 31 * s;
        // resplandor
        BufferedImage glow = new BufferedImage(im.getWidth(), im.getHeight(), BufferedImage.TYPE_INT_ARGB);
        for (int yy = 0; yy < glow.getHeight(); yy++) for (int xx0 = 0; xx0 < glow.getWidth(); xx0++) glow.setRGB(xx0, yy, 0x008B6CFF);
        Graphics2D gg = g2(glow);
        gg.setFont(f);
        double xx = x;
        for (char ch : word.toCharArray()) { gg.setColor(new Color(139, 108, 255, 150)); gg.drawString(String.valueOf(ch), (float) xx, (float) base); xx += fm.charWidth(ch) + track; }
        gg.dispose();
        g.drawImage(blur(glow, 5 * s), 0, 0, null);
        g.drawImage(blur(glow, 2 * s), 0, 0, null);
        // sombra + relleno degradado
        xx = x;
        for (char ch : word.toCharArray()) {
            String t = String.valueOf(ch);
            g.setColor(new Color(0, 0, 10, 140));
            g.drawString(t, (float) xx + s, (float) base + s * 1.2f);
            g.setPaint(new GradientPaint(0, (float) (base - 22 * s), new Color(255, 255, 255), 0, (float) base, new Color(190, 176, 255)));
            g.drawString(t, (float) xx, (float) base);
            xx += fm.charWidth(ch) + track;
        }
        // subtítulo
        Font f2 = font(true, 8.5f * s);
        g.setFont(f2);
        FontMetrics fm2 = g.getFontMetrics();
        double tr2 = 4.2 * s, t2 = 0;
        for (char ch : sub.toCharArray()) t2 += fm2.charWidth(ch) + tr2;
        t2 -= tr2;
        double x2 = (gw * s - t2) / 2;
        g.setColor(new Color(255, 255, 255, 40));
        g.fill(new Rectangle2D.Double(x2 - 22 * s, 38.2 * s, 18 * s, Math.max(1, s * 0.7)));
        g.fill(new Rectangle2D.Double(x2 + t2 + 4 * s, 38.2 * s, 18 * s, Math.max(1, s * 0.7)));
        double x3 = x2;
        g.setColor(new Color(0, 0, 10, 170));
        for (char ch : sub.toCharArray()) { g.drawString(String.valueOf(ch), (float) x3 + s * 0.8f, (float) (42 * s) + s * 0.8f); x3 += fm2.charWidth(ch) + tr2; }
        g.setColor(new Color(236, 230, 255, 255));
        for (char ch : sub.toCharArray()) { g.drawString(String.valueOf(ch), (float) x2, (float) (42 * s)); x2 += fm2.charWidth(ch) + tr2; }
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Logo de Minecraft Java Edition (imagen aportada) reducido con calidad al tamaño exacto en píxeles. */
    public static Tex logo(MinecraftClient mc, int gw) {
        int s = begin(mc);
        String key = "l|" + gw;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        BufferedImage src;
        try (InputStream in = NovaGfx.class.getResourceAsStream("/assets/nova/textures/gui/logo.png")) { src = javax.imageio.ImageIO.read(in); }
        catch (Exception e) { throw new IllegalStateException(e); }
        int tw = gw * s, th = Math.max(1, Math.round(src.getHeight() * (float) tw / src.getWidth()));
        BufferedImage cur = src;
        while (cur.getWidth() / 2 >= tw) {   // reducción por pasos para evitar dientes de sierra
            BufferedImage n = new BufferedImage(cur.getWidth() / 2, cur.getHeight() / 2, BufferedImage.TYPE_INT_ARGB);
            Graphics2D q = g2(n);
            q.drawImage(cur, 0, 0, n.getWidth(), n.getHeight(), null);
            q.dispose();
            cur = n;
        }
        int pad = 6 * s;
        BufferedImage im = new BufferedImage(tw + 2 * pad, th + 2 * pad, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        BufferedImage fin = new BufferedImage(tw, th, BufferedImage.TYPE_INT_ARGB);
        Graphics2D q = g2(fin);
        q.drawImage(cur, 0, 0, tw, th, null);
        q.dispose();
        // halo suave detrás para que se lea sobre el agujero negro
        BufferedImage halo = new BufferedImage(im.getWidth(), im.getHeight(), BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < fin.getHeight(); y++) for (int x = 0; x < fin.getWidth(); x++) {
            int al = (fin.getRGB(x, y) >>> 24) * 150 / 255;
            halo.setRGB(x + pad, y + pad, (al << 24) | 0x05050F);
        }
        g.drawImage(blur(halo, Math.max(1, 3 * s)), 0, 0, null);
        g.drawImage(fin, pad, pad, null);
        g.dispose();
        return upload(mc, key, im, s);
    }

    static BufferedImage blur(BufferedImage src, int r) {
        int w = src.getWidth(), h = src.getHeight();
        int[] p = src.getRGB(0, 0, w, h, null, 0, w);
        for (int pass = 0; pass < 2; pass++) p = once(p, w, h, r);
        BufferedImage o = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        o.setRGB(0, 0, w, h, p, 0, w);
        return o;
    }

    private static int[] once(int[] p, int w, int h, int r) {
        int[] t = new int[p.length], u = new int[p.length];
        box(p, t, w, h, r);
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) u[x * h + y] = t[y * w + x];
        box(u, t, h, w, r);
        int[] o = new int[p.length];
        for (int y = 0; y < w; y++) for (int x = 0; x < h; x++) o[x * w + y] = t[y * h + x];
        return o;
    }

    private static void box(int[] in, int[] out, int w, int h, int r) {
        int d = 2 * r + 1;
        for (int y = 0; y < h; y++) {
            long sa = 0, sr = 0, sg = 0, sb = 0;
            for (int i = -r; i <= r; i++) { int p = in[y * w + Math.max(0, Math.min(w - 1, i))]; sa += p >>> 24; sr += (p >> 16) & 255; sg += (p >> 8) & 255; sb += p & 255; }
            for (int x = 0; x < w; x++) {
                out[y * w + x] = (int) (sa / d) << 24 | (int) (sr / d) << 16 | (int) (sg / d) << 8 | (int) (sb / d);
                int p1 = in[y * w + Math.min(w - 1, x + r + 1)], p0 = in[y * w + Math.max(0, x - r)];
                sa += (p1 >>> 24) - (p0 >>> 24); sr += ((p1 >> 16) & 255) - ((p0 >> 16) & 255);
                sg += ((p1 >> 8) & 255) - ((p0 >> 8) & 255); sb += (p1 & 255) - (p0 & 255);
            }
        }
    }
}
