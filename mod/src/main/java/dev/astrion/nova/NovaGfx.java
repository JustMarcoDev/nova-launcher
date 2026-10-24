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
    static int lastScale = -1, seq;
    static int accent = 0xFF8B6CFF;

    /** Cambia el color de acento: las texturas se recrean con el nuevo color. */
    public static void setAccent(int argb) { if (argb != accent) { accent = argb; lastScale = -1; } }
    static int shade(int argb, float k, int alpha) {
        return (alpha << 24) | (Math.min(255, Math.round(((argb >> 16) & 255) * k)) << 16) | (Math.min(255, Math.round(((argb >> 8) & 255) * k)) << 8) | Math.min(255, Math.round((argb & 255) * k));
    }

    /** Mezcla dos colores: k = cuánto del segundo (0 → solo el primero, 1 → solo el segundo). */
    static int mix(int a, int b, float k) {
        int r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k), gg = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k), bl = Math.round((a & 255) * (1 - k) + (b & 255) * k);
        return 0xFF000000 | (r << 16) | (gg << 8) | bl;
    }

    public static final class Tex {
        final Identifier id; final int pw, ph, gw, gh;
        Tex(Identifier id, int pw, int ph, int sc) { this.id = id; this.pw = pw; this.ph = ph; this.gw = pw / sc; this.gh = ph / sc; }
        public int w() { return gw; }
        public int h() { return gh; }
        public void draw(DrawContext c, int x, int y, float alpha) {
            if (alpha <= 0.003f) return;
            NovaCompat.blit(c, id, x, y, gw, gh, 0, 0, pw, ph, pw, ph, Math.min(1f, alpha));
        }
        /** Dibuja la textura a otro tamaño (en píxeles de interfaz). */
        public void drawSized(DrawContext c, int x, int y, int w, int h, float alpha) {
            NovaCompat.blit(c, id, x, y, w, h, 0, 0, pw, ph, pw, ph, Math.min(1f, alpha));
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

    static Tex upload(MinecraftClient mc, String key, BufferedImage im, int sc) { return upload(mc, key, im, sc, true); }

    static Tex upload(MinecraftClient mc, String key, BufferedImage im, int sc, boolean smooth) {
        int w = im.getWidth(), h = im.getHeight();
        NativeImage ni = new NativeImage(NativeImage.Format.RGBA, w, h, false);
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int p = im.getRGB(x, y);   // ARGB no premultiplicado
            NovaCompat.setPixel(ni, x, y, p);
        }
        NativeImageBackedTexture t = NovaCompat.newTex(ni);
        if (smooth) { try { NovaCompat.smooth(t); } catch (Throwable ignored) { } }
        Identifier id = Identifier.tryParse("nova:gfx/g" + (seq++));
        mc.getTextureManager().registerTexture(id, t);
        Tex r = new Tex(id, w, h, sc);
        CACHE.put(key, r);
        return r;
    }

    public static final int I_USER = 0, I_GEAR = 1, I_CLOSE = 2, I_EARTH = 6, I_NOVA = 8, I_LOCK = 9, I_REALMS = 10, I_USERS = 11, I_CHECK = 12, I_PLUS = 13, I_HEAD = 14, I_EDIT = 15, I_SWAP = 16, I_TRASH = 17, I_FOLDER = 18, I_RESIZE = 19;

    static void person(Graphics2D g, double cx, double top, double s) {
        g.fill(new Ellipse2D.Double(cx - 0.17 * s, top, 0.34 * s, 0.34 * s));
        Area body = new Area(new Ellipse2D.Double(cx - 0.36 * s, top + 0.40 * s, 0.72 * s, 0.9 * s));
        body.intersect(new Area(new Rectangle2D.Double(cx - s, top, 2 * s, 0.86 * s)));
        g.fill(body);
    }

    /** Iconos vectoriales (nada de imágenes): se dibujan suaves a cualquier tamaño. */
    static void icon(Graphics2D g, int idx, double x, double y, double size, int argb) {
        int n = Math.max(2, (int) Math.ceil(size));
        BufferedImage t = new BufferedImage(n, n, BufferedImage.TYPE_INT_ARGB);
        Graphics2D q = g2(t);
        q.scale(n, n);
        q.setColor(col(argb));
        switch (idx) {
            case I_USER: person(q, 0.5, 0.1, 0.8); break;
            case I_USERS: {
                person(q, 0.3, 0.2, 0.62);
                q.setComposite(AlphaComposite.Clear);   // pequeño hueco para que se distingan las dos siluetas
                q.setStroke(new BasicStroke(0.07f));
                Area f = new Area(new Ellipse2D.Double(0.68 - 0.17 * 0.78, 0.08, 0.34 * 0.78, 0.34 * 0.78));
                Area fb = new Area(new Ellipse2D.Double(0.68 - 0.36 * 0.78, 0.08 + 0.40 * 0.78, 0.72 * 0.78, 0.9 * 0.78));
                fb.intersect(new Area(new Rectangle2D.Double(-1, 0, 3, 0.08 + 0.86 * 0.78)));
                f.add(fb);
                q.fill(f); q.draw(f);
                q.setComposite(AlphaComposite.SrcOver);
                q.setColor(col(argb));
                person(q, 0.68, 0.08, 0.78);
                break;
            }
            case I_GEAR: {
                Area a = new Area(new Ellipse2D.Double(0.23, 0.23, 0.54, 0.54));
                for (int i = 0; i < 8; i++) a.add(new Area(AffineTransform.getRotateInstance(i * Math.PI / 4, 0.5, 0.5).createTransformedShape(new RoundRectangle2D.Double(0.5 - 0.075, 0.07, 0.15, 0.22, 0.05, 0.05))));
                a.subtract(new Area(new Ellipse2D.Double(0.5 - 0.13, 0.5 - 0.13, 0.26, 0.26)));
                q.fill(a);
                break;
            }
            case I_LOCK: {
                q.fill(new RoundRectangle2D.Double(0.2, 0.46, 0.6, 0.42, 0.12, 0.12));
                q.setStroke(new BasicStroke(0.09f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Arc2D.Double(0.32, 0.13, 0.36, 0.40, 0, 180, Arc2D.OPEN));
                q.draw(new Line2D.Double(0.32, 0.33, 0.32, 0.48));
                q.draw(new Line2D.Double(0.68, 0.33, 0.68, 0.48));
                break;
            }
            case I_CLOSE: {
                q.setStroke(new BasicStroke(0.13f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Line2D.Double(0.27, 0.27, 0.73, 0.73));
                q.draw(new Line2D.Double(0.73, 0.27, 0.27, 0.73));
                break;
            }
            case I_CHECK: {
                q.setStroke(new BasicStroke(0.14f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                Path2D p = new Path2D.Double();
                p.moveTo(0.22, 0.54); p.lineTo(0.43, 0.74); p.lineTo(0.78, 0.28);
                q.draw(p);
                break;
            }
            case I_PLUS: {
                q.setStroke(new BasicStroke(0.14f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Line2D.Double(0.5, 0.2, 0.5, 0.8));
                q.draw(new Line2D.Double(0.2, 0.5, 0.8, 0.5));
                break;
            }
            case I_REALMS: {   // cubo (un mundo)
                int al = (argb >>> 24);
                Path2D top = new Path2D.Double(), left = new Path2D.Double(), right = new Path2D.Double();
                top.moveTo(0.5, 0.08); top.lineTo(0.88, 0.29); top.lineTo(0.5, 0.5); top.lineTo(0.12, 0.29); top.closePath();
                left.moveTo(0.12, 0.34); left.lineTo(0.48, 0.55); left.lineTo(0.48, 0.94); left.lineTo(0.12, 0.73); left.closePath();
                right.moveTo(0.88, 0.34); right.lineTo(0.52, 0.55); right.lineTo(0.52, 0.94); right.lineTo(0.88, 0.73); right.closePath();
                q.setColor(a(argb, 1f)); q.fill(top);
                q.setColor(a(argb, 0.55f)); q.fill(left);
                q.setColor(a(argb, 0.8f)); q.fill(right);
                break;
            }
            case I_NOVA: {   // agujero negro (tipo «Gargantúa»): sombra oscura, anillo grueso de luz y una fina banda de materia que lo cruza
                q.setStroke(new BasicStroke(0.13f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Ellipse2D.Double(0.5 - 0.3, 0.5 - 0.3, 0.6, 0.6));                  // anillo de fotones
                AffineTransform tilt = AffineTransform.getRotateInstance(-0.2, 0.5, 0.5);
                q.fill(tilt.createTransformedShape(new Ellipse2D.Double(0.01, 0.5 - 0.045, 0.98, 0.09)));   // banda que atraviesa el agujero
                break;
            }
            case I_EARTH: {   // idiomas: icono de «traducir» (un carácter chino y una A sobre dos placas que se solapan)
                RoundRectangle2D back = new RoundRectangle2D.Double(0.06, 0.06, 0.56, 0.56, 0.12, 0.12);
                RoundRectangle2D front = new RoundRectangle2D.Double(0.38, 0.38, 0.56, 0.56, 0.12, 0.12);
                q.fill(back);
                q.setComposite(AlphaComposite.Clear);                      // hueco entre las dos placas
                q.fill(new RoundRectangle2D.Double(0.33, 0.33, 0.66, 0.66, 0.17, 0.17));
                q.setStroke(new BasicStroke(0.055f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Line2D.Double(0.17, 0.25, 0.50, 0.25));        // 文: raya de arriba
                q.draw(new Line2D.Double(0.34, 0.15, 0.34, 0.25));        //     punto
                q.draw(new Line2D.Double(0.27, 0.30, 0.43, 0.50));        //     cruce
                q.draw(new Line2D.Double(0.41, 0.30, 0.25, 0.50));
                q.setComposite(AlphaComposite.SrcOver);
                q.fill(front);
                q.setComposite(AlphaComposite.Clear);
                q.setStroke(new BasicStroke(0.06f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                Path2D aa = new Path2D.Double();                           // A
                aa.moveTo(0.55, 0.82); aa.lineTo(0.66, 0.52); aa.lineTo(0.77, 0.82);
                q.draw(aa);
                q.draw(new Line2D.Double(0.59, 0.72, 0.73, 0.72));
                q.setComposite(AlphaComposite.SrcOver);
                break;
            }
            case I_EDIT: {
                AffineTransform t0 = AffineTransform.getRotateInstance(0.7854, 0.5, 0.5);
                Path2D p = new Path2D.Double();
                p.append(new RoundRectangle2D.Double(0.41, 0.12, 0.18, 0.5, 0.05, 0.05), false);
                Path2D tip = new Path2D.Double();
                tip.moveTo(0.41, 0.68); tip.lineTo(0.59, 0.68); tip.lineTo(0.5, 0.86); tip.closePath();
                p.append(tip, false);
                q.fill(t0.createTransformedShape(p));
                break;
            }
            case I_SWAP: {
                q.setStroke(new BasicStroke(0.085f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Line2D.Double(0.18, 0.34, 0.8, 0.34));
                Path2D h1 = new Path2D.Double(); h1.moveTo(0.64, 0.18); h1.lineTo(0.82, 0.34); h1.lineTo(0.64, 0.5); q.draw(h1);
                q.draw(new Line2D.Double(0.82, 0.68, 0.2, 0.68));
                Path2D h2 = new Path2D.Double(); h2.moveTo(0.36, 0.52); h2.lineTo(0.18, 0.68); h2.lineTo(0.36, 0.84); q.draw(h2);
                break;
            }
            case I_TRASH: {
                q.setStroke(new BasicStroke(0.085f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Line2D.Double(0.2, 0.27, 0.8, 0.27));
                q.draw(new Line2D.Double(0.4, 0.17, 0.6, 0.17));
                Path2D b2 = new Path2D.Double(); b2.moveTo(0.27, 0.37); b2.lineTo(0.32, 0.84); b2.lineTo(0.68, 0.84); b2.lineTo(0.73, 0.37); q.draw(b2);
                break;
            }
            case I_FOLDER: {
                Path2D f = new Path2D.Double();
                f.moveTo(0.1, 0.24); f.lineTo(0.4, 0.24); f.lineTo(0.5, 0.36); f.lineTo(0.9, 0.36); f.lineTo(0.9, 0.8); f.lineTo(0.1, 0.8); f.closePath();
                q.setStroke(new BasicStroke(0.085f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(f);
                break;
            }
            case I_RESIZE: {   // flecha doble en diagonal (cambiar tamaño)
                q.setStroke(new BasicStroke(0.09f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                q.draw(new Line2D.Double(0.28, 0.28, 0.72, 0.72));
                Path2D a1 = new Path2D.Double(); a1.moveTo(0.26, 0.5); a1.lineTo(0.26, 0.26); a1.lineTo(0.5, 0.26);
                Path2D a2 = new Path2D.Double(); a2.moveTo(0.74, 0.5); a2.lineTo(0.74, 0.74); a2.lineTo(0.5, 0.74);
                q.draw(a1); q.draw(a2);
                break;
            }
            case I_HEAD: {
                java.awt.image.BufferedImage h = NovaSkin.head;
                if (h == null) { person(q, 0.5, 0.1, 0.8); break; }
                q.scale(1.0 / n, 1.0 / n);
                q.setClip(new RoundRectangle2D.Double(0, 0, n, n, n * 0.28, n * 0.28));
                q.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
                q.drawImage(h, 0, 0, n, n, null);
                break;
            }
            default: break;
        }
        q.dispose();
        g.drawImage(t, (int) Math.round(x), (int) Math.round(y), null);
    }

    public static Tex button(MinecraftClient mc, int w, int h, String label, int icon, int style, boolean hot, boolean enabled) {
        int s = begin(mc);
        String key = "b|" + w + "x" + h + "|" + label + "|" + icon + "|" + style + "|" + hot + "|" + enabled + "|" + accent + (icon == I_HEAD && NovaSkin.head != null ? "|skin" + NovaSkin.ver : "");
        Tex c = CACHE.get(key);
        if (c != null) return c;
        int m = 5;   // margen para el brillo exterior
        int W = (w + 2 * m) * s, H = (h + 2 * m) * s;
        BufferedImage im = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        boolean danger = style == NovaButton.DANGER, primary = style == NovaButton.PRIMARY || style == NovaButton.SELECTED;
        int acc = danger ? 0xFFFF4D5E : accent;
        double bx = m * s, by = m * s, bw = w * s, bh = h * s;
        double rr = Math.min(3.2 * s, bh / 2);   // cuadrado con esquinas redondeadas
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
        else if (primary) {
            f1 = shade(acc, hot ? 0.46f : 0.34f, hot ? 0xE0 : 0xC0); f2 = shade(acc, hot ? 0.24f : 0.15f, hot ? 0xE0 : 0xC0);
            b1 = style == NovaButton.SELECTED ? shade(acc, 1.15f, 0xFF) : shade(acc, hot ? 1.3f : 1.1f, hot ? 0xFF : 0x90); b2 = shade(acc, 1f, hot || style == NovaButton.SELECTED ? 0xFF : 0x50);
        }
        else { f1 = shade(acc, hot ? 0.40f : 0.28f, hot ? 0xD8 : 0xA0); f2 = shade(acc, hot ? 0.21f : 0.12f, hot ? 0xD8 : 0xA0); b1 = hot ? shade(acc, 1.3f, 0xFF) : 0x60FFFFFF; b2 = hot ? shade(acc, 1f, 0xFF) : 0x28FFFFFF; }
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

        int txt = !enabled ? 0xFF9A9AB8 : danger ? (hot ? 0xFFFFFFFF : 0xFFFF9AA4) : (hot || style == NovaButton.SELECTED ? 0xFFFFFFFF : 0xFFE2E2F6);
        double fpx = Math.max(6.2, Math.min(h * 0.42, 7.4)) * s;
        Font f = fontFor(label, false, (float) fpx);
        g.setFont(f);
        FontMetrics fm = g.getFontMetrics();
        double tw = label.isEmpty() ? 0 : fm.getStringBounds(label, g).getWidth();
        double isz = icon >= 0 ? (label.isEmpty() ? Math.min(h * 0.62, 10.5) : Math.min(h * 0.58, 8.5)) * s : 0;
        double gap = icon >= 0 && tw > 0 ? 3.5 * s : 0;
        double x0 = bx + (bw - (isz + gap + tw)) / 2;
        // los iconos son siempre blancos: no cambian con el color de acento elegido en los ajustes
        if (icon >= 0) icon(g, icon, x0, by + (bh - isz) / 2, isz, txt);
        if (tw > 0) {
            g.setColor(col(txt));
            g.drawString(label, (float) (x0 + isz + gap), (float) (by + (bh - fm.getHeight()) / 2 + fm.getAscent()));
        }
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Muestra de color (círculo) para elegir el color de los botones. */
    public static Tex swatch(MinecraftClient mc, int d, int rgb, boolean selected, boolean hot) {
        int s = begin(mc);
        String key = "s|" + d + "|" + rgb + "|" + selected + "|" + hot;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        int m = 4;
        int W = (d + 2 * m) * s;
        BufferedImage im = new BufferedImage(W, W, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        double cx = W / 2.0, r = d * s / 2.0 - (selected ? 1.6 * s : 0.4 * s);
        if (hot || selected) {
            for (int i = 3 * s; i >= 1; i -= Math.max(1, s / 2)) {
                float k = 1f - (float) i / (3 * s);
                g.setColor(a(rgb, (selected ? 0.20f : 0.14f) * k * k));
                g.fill(new Ellipse2D.Double(cx - d * s / 2.0 - i, cx - d * s / 2.0 - i, d * s + 2 * i, d * s + 2 * i));
            }
        }
        g.setPaint(new GradientPaint(0, (float) (cx - r), col(shade(rgb, 1.15f, 255)), 0, (float) (cx + r), col(shade(rgb, 0.7f, 255))));
        g.fill(new Ellipse2D.Double(cx - r, cx - r, 2 * r, 2 * r));
        if (selected) {
            g.setStroke(new BasicStroke(Math.max(1f, 0.8f * s)));
            g.setColor(new Color(255, 255, 255, 235));
            double R = d * s / 2.0 - 0.5 * s;
            g.draw(new Ellipse2D.Double(cx - R, cx - R, 2 * R, 2 * R));
        }
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Fondo de un panel (cristal oscuro con borde de acento y sombra suave). */
    public static Tex panel(MinecraftClient mc, int w, int h) {
        int s = begin(mc);
        String key = "p|" + w + "x" + h + "|" + accent;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        int m = 8;
        BufferedImage im = new BufferedImage((w + 2 * m) * s, (h + 2 * m) * s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        double bx = m * s, by = m * s, bw = w * s, bh = h * s, rr = 6 * s;
        for (int i = m * s - 1; i >= 1; i -= Math.max(1, s / 2)) {
            float k = 1f - (float) i / (m * s);
            g.setColor(new Color(0, 0, 0, Math.round(70 * k * k)));
            g.fill(new RoundRectangle2D.Double(bx - i, by - i + 2 * s, bw + 2 * i, bh + 2 * i, 2 * rr + i, 2 * rr + i));
        }
        Shape box = new RoundRectangle2D.Double(bx, by, bw, bh, 2 * rr, 2 * rr);
        g.setPaint(new GradientPaint(0, (float) by, col(shade(accent, 0.20f, 0xF0)), 0, (float) (by + bh), col(shade(accent, 0.07f, 0xF2))));
        g.fill(box);
        Shape old = g.getClip();
        g.setClip(box);
        g.setPaint(new GradientPaint(0, (float) by, new Color(255, 255, 255, 26), 0, (float) (by + bh * 0.35), new Color(255, 255, 255, 0)));
        g.fill(new Rectangle2D.Double(bx, by, bw, bh * 0.35));
        g.setClip(old);
        float sw = Math.max(1f, s * 0.7f);
        g.setStroke(new BasicStroke(sw));
        g.setPaint(new GradientPaint(0, (float) by, col(shade(accent, 1.2f, 0xB0)), 0, (float) (by + bh), col(shade(accent, 0.8f, 0x40))));
        g.draw(new RoundRectangle2D.Double(bx + sw / 2, by + sw / 2, bw - sw, bh - sw, 2 * rr - sw, 2 * rr - sw));
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Etiqueta redondeada pequeña (p. ej. «Premium»). */
    public static Tex pill(MinecraftClient mc, String label, int rgb, int icon) {
        int s = begin(mc);
        String key = "q|" + label + "|" + rgb + "|" + icon;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        float px = 6.3f * s;
        BufferedImage probe = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        Graphics2D pg = g2(probe);
        pg.setFont(fontFor(label, true, px));
        FontMetrics fm = pg.getFontMetrics();
        double tw = fm.getStringBounds(label, pg).getWidth();
        pg.dispose();
        double isz = icon >= 0 ? 7 * s : 0, pad = 5 * s, gap = icon >= 0 ? 2.5 * s : 0;
        int W = (int) Math.ceil(tw + isz + gap + 2 * pad) + 2, H = 12 * s;
        BufferedImage im = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        float sw = Math.max(1f, 0.7f * s);
        Shape box = new RoundRectangle2D.Double(sw / 2, sw / 2, W - sw, H - sw, H - sw, H - sw);
        g.setColor(a(0xFF000000 | rgb, 0.20f));
        g.fill(box);
        g.setStroke(new BasicStroke(sw));
        g.setColor(a(0xFF000000 | rgb, 0.85f));
        g.draw(box);
        double x0 = pad;
        if (icon >= 0) { icon(g, icon, x0, (H - isz) / 2, isz, 0xFF000000 | rgb); x0 += isz + gap; }
        g.setFont(fontFor(label, true, px));
        g.setColor(col(0xFF000000 | rgb));
        g.drawString(label, (float) x0, (float) ((H - fm.getHeight()) / 2.0 + fm.getAscent()));
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Logo de Nova (el agujero negro) cuadrado de d píxeles de interfaz; para la lista de jugadores. */
    public static Tex logo(MinecraftClient mc, int d) {
        int s = begin(mc);
        String key = "logo|" + d;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        BufferedImage im = new BufferedImage(d * s, d * s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        icon(g, I_NOVA, 0, 0, d * s, 0xFFFFFFFF);
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Globo de ayuda: título y descripción corta. */
    public static Tex tooltip(MinecraftClient mc, String title, String desc) {
        int s = begin(mc);
        String key = "tt|" + title + "|" + desc + "|" + accent;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        float p1 = 6.8f * s, p2 = 6.0f * s;
        BufferedImage probe = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        Graphics2D pg = g2(probe);
        pg.setFont(fontFor(title, true, p1));
        FontMetrics f1 = pg.getFontMetrics();
        double w1 = f1.getStringBounds(title, pg).getWidth();
        pg.setFont(fontFor(desc, false, p2));
        FontMetrics f2 = pg.getFontMetrics();
        double w2 = desc.isEmpty() ? 0 : f2.getStringBounds(desc, pg).getWidth();
        pg.dispose();
        int m = 5, pad = 5 * s;
        double cw = Math.max(w1, w2), ch = f1.getHeight() + (desc.isEmpty() ? 0 : f2.getHeight() + 1 * s);
        int bw = (int) Math.ceil(cw + 2 * pad), bh = (int) Math.ceil(ch + 2 * 3.5 * s);
        BufferedImage im = new BufferedImage(bw + 2 * m * s, bh + 2 * m * s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = g2(im);
        double bx = m * s, by = m * s, rr = 3.2 * s;
        for (int i = m * s - 1; i >= 1; i -= Math.max(1, s / 2)) {
            float k = 1f - (float) i / (m * s);
            g.setColor(new Color(0, 0, 0, Math.round(60 * k * k)));
            g.fill(new RoundRectangle2D.Double(bx - i, by - i + s, bw + 2 * i, bh + 2 * i, 2 * rr + i, 2 * rr + i));
        }
        Shape box = new RoundRectangle2D.Double(bx, by, bw, bh, 2 * rr, 2 * rr);
        g.setPaint(new GradientPaint(0, (float) by, col(shade(accent, 0.22f, 0xF4)), 0, (float) (by + bh), col(shade(accent, 0.09f, 0xF4))));
        g.fill(box);
        float sw = Math.max(1f, 0.7f * s);
        g.setStroke(new BasicStroke(sw));
        g.setColor(col(shade(accent, 1.1f, 0xB0)));
        g.draw(new RoundRectangle2D.Double(bx + sw / 2, by + sw / 2, bw - sw, bh - sw, 2 * rr - sw, 2 * rr - sw));
        g.setFont(fontFor(title, true, p1));
        g.setColor(col(0xFFFFFFFF));
        double ty = by + 3.5 * s;
        g.drawString(title, (float) (bx + pad), (float) (ty + f1.getAscent()));
        if (!desc.isEmpty()) {
            g.setFont(fontFor(desc, false, p2));
            g.setColor(col(0xFFB8B8D8));
            g.drawString(desc, (float) (bx + pad), (float) (ty + f1.getHeight() + 1 * s + f2.getAscent()));
        }
        g.dispose();
        return upload(mc, key, im, s);
    }

    /** Figura de la skin (de frente), con píxeles nítidos. */
    public static Tex skin(MinecraftClient mc, BufferedImage src, String key) {
        begin(mc);
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, src, 1, false);
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
