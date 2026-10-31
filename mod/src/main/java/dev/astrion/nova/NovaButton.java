package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.util.Util;

/** Botón de Nova: cristal oscuro con borde de acento, esquinas redondeadas y brillo animado. */
public class NovaButton extends NovaButtonBase {
    static final int NORMAL = 0, PRIMARY = 1, DANGER = 2, SELECTED = 3;

    private final int icon;
    private int style;
    /** Color de la muestra (0 = botón normal). */
    int swatch;
    boolean swatchOn;
    /** Texto del globo de ayuda al pasar el cursor (título y descripción de pocas palabras). */
    String tipTitle = "", tipDesc = "";
    /** Si no es null, el botón solo pinta esto (fondo de paneles). Recibe el contexto gráfico. */
    java.util.function.Consumer<Object> paint;
    private float glow;
    private long last = Util.getMeasuringTimeMs();

    public NovaButton(int x, int y, int w, int h, net.minecraft.text.Text label, int icon, int style, PressAction action) {
        super(x, y, w, h, label, action);
        this.icon = icon;
        this.style = style;
    }

    static int mix(int a, int b, float t) {
        int r = 0;
        for (int s = 24; s >= 0; s -= 8) {
            int ca = (a >> s) & 255, cb = (b >> s) & 255;
            r |= ((int) (ca + (cb - ca) * t) & 255) << s;
        }
        return r;
    }

    static int inset(int d, int r) {
        double cy = r - d - 0.5;
        return (int) Math.round(r - Math.sqrt(Math.max(0, r * r - cy * cy)));
    }

    /** Rectángulo redondeado con borde de 1 px; sin solapes para que la transparencia no se duplique. */
    static void panel(DrawContext c, int x, int y, int w, int h, int r, int fill, int border) {
        fill = NovaAcc.solid(fill);
        if (NovaAcc.hc() && (border >>> 24) != 0) border = 0xFFFFFFFF;
        r = Math.min(r, Math.min(w, h) / 2);
        for (int dy = 0; dy < h; dy++) {
            int d = Math.min(dy, h - 1 - dy), i = d < r ? inset(d, r) : 0, ry = y + dy;
            if ((border >>> 24) == 0) { c.fill(x + i, ry, x + w - i, ry + 1, fill); continue; }
            if (d == 0) { c.fill(x + i, ry, x + w - i, ry + 1, border); continue; }
            int pi = (d - 1) < r ? inset(d - 1, r) : 0, bw = Math.max(1, pi - i);
            c.fill(x + i, ry, x + i + bw, ry + 1, border);
            c.fill(x + w - i - bw, ry, x + w - i, ry + 1, border);
            c.fill(x + i + bw, ry, x + w - i - bw, ry + 1, fill);
        }
    }

    public NovaButton tip(String title, String desc) { tipTitle = title; tipDesc = desc; return this; }
    public NovaButton style(int st) { style = st; return this; }
    public NovaButton swatch(int rgb, boolean on) { swatch = rgb; swatchOn = on; return this; }

    // 1.20.x usa renderButton y 1.21 renderWidget: se declaran las dos (sin @Override) y cada versión llama a la suya
    public void renderButton(DrawContext c, int mx, int my, float delta) { renderWidget(c, mx, my, delta); }

    public void renderWidget(DrawContext c, int mx, int my, float delta) {
        if (paint != null) { paint.accept(c); return; }
        long now = Util.getMeasuringTimeMs();
        float dt = Math.min(100, now - last) / 140f;
        last = now;
        boolean hot = this.active && (this.isHovered() || this.isFocused());
        glow = NovaAcc.still() ? (hot ? 1f : 0f) : hot ? Math.min(1f, glow + dt) : Math.max(0f, glow - dt);

        int x = getX(), y = getY(), w = getWidth(), h = getHeight();
        if (swatch != 0 && NovaGfx.ok) {
            try {
                MinecraftClient m = MinecraftClient.getInstance();
                int d = Math.min(w, h);
                NovaGfx.swatch(m, d, swatch, swatchOn, false).draw(c, x - 4, y - 4, 1f);
                if (glow > 0.02f) NovaGfx.swatch(m, d, swatch, swatchOn, true).draw(c, x - 4, y - 4, glow);
                return;
            } catch (Throwable t) {
                NovaGfx.ok = false;
            }
        }
        if (NovaGfx.ok) {
            try {
                MinecraftClient m = MinecraftClient.getInstance();
                String lab = getMessage().getString();
                NovaGfx.Tex n = NovaGfx.button(m, w, h, lab, icon, style, false, active);
                n.draw(c, x - 5, y - 5, 1f);
                if (glow > 0.02f && active) NovaGfx.button(m, w, h, lab, icon, style, true, true).draw(c, x - 5, y - 5, glow);
                return;
            } catch (Throwable t) {
                NovaGfx.ok = false;
            }
        }
        int acc = style == DANGER ? 0xFFFF4D5E : NovaGfxCore.accent;
        if (swatch != 0) { panel(c, x, y, w, h, Math.min(w, h) / 2, 0xFF000000 | swatch, swatchOn ? 0xFFFFFFFF : 0); return; }
        int r = style == PRIMARY ? 8 : Math.min(6, h / 3);
        if (glow > 0.02f) panel(c, x - 2, y - 2, w + 4, h + 4, r + 2, ((int) (0x38 * glow) << 24) | (acc & 0xFFFFFF), 0);
        int baseFill = style == DANGER ? 0xC0200A14 : style == PRIMARY ? 0xC4140F2E : 0xB80E0C20;
        int hotFill = style == DANGER ? 0xD84A1020 : style == PRIMARY ? 0xDC2A1F5C : 0xD01E1844;
        int baseBorder = style == DANGER ? 0xFF5A2030 : style == PRIMARY ? 0xFF4A3C8C : 0xFF332B66;
        if (!active) { baseFill = 0x90100E1C; baseBorder = 0xFF26223E; }
        panel(c, x, y, w, h, r, mix(baseFill, hotFill, glow), mix(baseBorder, 0xFF000000 | (acc & 0xFFFFFF), glow));
        // brillo superior suave
        c.fill(x + r, y + 1, x + w - r, y + 2, mix(0x18FFFFFF, 0x38FFFFFF, glow));

        int col = !active ? 0xFF6A6A80 : style == DANGER ? mix(0xFFFF7A86, 0xFFFFFFFF, glow) : mix(0xFFD8D8F0, 0xFFFFFFFF, glow);
        MinecraftClient mc = MinecraftClient.getInstance();
        int tw = mc.textRenderer.getWidth(getMessage());
        int cx = x + (w - tw) / 2;
        if (tw > 0) c.drawText(mc.textRenderer, getMessage(), cx, y + (h - 8) / 2 + 1, col, style != NORMAL || active);
    }
}
