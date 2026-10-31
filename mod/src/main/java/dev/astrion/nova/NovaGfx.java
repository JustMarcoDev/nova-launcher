package dev.astrion.nova;

import java.awt.*;
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
    static int lastScale = -1, seq;
    static String lastAcc = "";

    /** Cambia el color de acento: las texturas se recrean con el nuevo color. */
    public static void setAccent(int argb) { if (argb != NovaGfxCore.accent) { NovaGfxCore.accent = argb; lastScale = -1; } }
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
        if (s != lastScale || !lastAcc.equals(NovaAcc.key())) {
            lastAcc = NovaAcc.key();
            for (Tex t : CACHE.values()) { try { mc.getTextureManager().destroyTexture(t.id); } catch (Throwable ignored) { } }
            CACHE.clear();
            lastScale = s;
        }
        return s;
    }

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

    public static final int I_USER = 0, I_GEAR = 1, I_CLOSE = 2, I_EARTH = 6, I_NOVA = 8, I_REALMS = 10, I_USERS = 11, I_CHECK = 12, I_PLUS = 13, I_HEAD = 14, I_EDIT = 15, I_SWAP = 16, I_TRASH = 17, I_FOLDER = 18, I_RESIZE = 19, I_SERVER = 20, I_PLAY = 21, I_BOLT = 22, I_MODS = 23;

    public static Tex button(MinecraftClient mc, int w, int h, String label, int icon, int style, boolean hot, boolean enabled) {
        int s = begin(mc);
        String key = "b|" + w + "x" + h + "|" + label + "|" + icon + "|" + style + "|" + hot + "|" + enabled + "|" + NovaGfxCore.accent + (icon == I_HEAD && NovaSkin.head != null ? "|skin" + NovaSkin.ver : "");
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.button(w, h, label, icon, style, hot, enabled, s), s);
    }

    public static Tex swatch(MinecraftClient mc, int d, int rgb, boolean selected, boolean hot) {
        int s = begin(mc);
        String key = "s|" + d + "|" + rgb + "|" + selected + "|" + hot;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.swatch(d, rgb, selected, hot, s), s);
    }

    public static Tex panel(MinecraftClient mc, int w, int h) {
        int s = begin(mc);
        String key = "p|" + w + "x" + h + "|" + NovaGfxCore.accent;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.panel(w, h, s), s);
    }

    public static Tex pill(MinecraftClient mc, String label, int rgb, int icon) {
        int s = begin(mc);
        String key = "q|" + label + "|" + rgb + "|" + icon;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.pill(label, rgb, icon, s), s);
    }

    public static Tex logo(MinecraftClient mc, int d) {
        int s = begin(mc);
        String key = "logo|" + d;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.logo(d, s), s);
    }

    public static Tex tooltip(MinecraftClient mc, String title, String desc) {
        int s = begin(mc);
        String key = "tt|" + title + "|" + desc + "|" + NovaGfxCore.accent;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.tooltip(title, desc, s), s);
    }

    public static Tex text(MinecraftClient mc, String str, float px, int argb, boolean b) {
        int s = begin(mc);
        px *= NovaAcc.text();
        argb = NovaAcc.fg(argb);
        String key = "t|" + str + "|" + px + "|" + argb + "|" + b;
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, NovaGfxCore.text(str, px, argb, b, s), s);
    }

    /** Figura de la skin (de frente), con píxeles nítidos. */
    public static Tex skin(MinecraftClient mc, BufferedImage src, String key) {
        begin(mc);
        Tex c = CACHE.get(key);
        if (c != null) return c;
        return upload(mc, key, src, 1, false);
    }
}
