package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

/** Botón de Nova: cristal oscuro con borde de acento, esquinas redondeadas y brillo animado. */
public class NovaButton extends ButtonWidget {
    static final int ACCENT = 0xFF8B6CFF;
    static final Identifier ICONS = Identifier.tryParse("nova:textures/gui/icons.png");
    static final int NORMAL = 0, PRIMARY = 1, DANGER = 2;
    public static final int I_USER = 0, I_GEAR = 1, I_CLOSE = 2, I_GLOBE = 6, I_NOVA = 8, I_LOCK = 9, I_SQUARE = 10;

    private final int icon;
    private final int style;
    private float glow;
    private long last = Util.getMeasuringTimeMs();

    public NovaButton(int x, int y, int w, int h, Text label, int icon, int style, PressAction action) {
        super(x, y, w, h, label, action, DEFAULT_NARRATION_SUPPLIER);
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

    static void icon(DrawContext c, int idx, int x, int y, int size, int argb) {
        float a = ((argb >> 24) & 255) / 255f;
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(((argb >> 16) & 255) / 255f, ((argb >> 8) & 255) / 255f, (argb & 255) / 255f, a);
        c.drawTexture(ICONS, x, y, size, size, idx * 32, 0, 32, 32, 384, 32);
        c.setShaderColor(1f, 1f, 1f, 1f);
    }

    // 1.20.x usa renderButton y 1.21 renderWidget: se declaran las dos (sin @Override) y cada versión llama a la suya
    public void renderButton(DrawContext c, int mx, int my, float delta) { renderWidget(c, mx, my, delta); }

    public void renderWidget(DrawContext c, int mx, int my, float delta) {
        long now = Util.getMeasuringTimeMs();
        float dt = Math.min(100, now - last) / 140f;
        last = now;
        boolean hot = this.active && (this.isHovered() || this.isFocused());
        glow = hot ? Math.min(1f, glow + dt) : Math.max(0f, glow - dt);

        int x = getX(), y = getY(), w = getWidth(), h = getHeight();
        int acc = style == DANGER ? 0xFFFF4D5E : ACCENT;
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
        int isz = icon >= 0 ? (tw == 0 ? Math.min(12, h - 8) : 10) : 0;
        int gap = icon >= 0 && tw > 0 ? 5 : 0;
        int cx = x + (w - (isz + gap + tw)) / 2;
        if (icon >= 0) icon(c, icon, cx, y + (h - isz) / 2, isz, col);
        if (tw > 0) c.drawText(mc.textRenderer, getMessage(), cx + isz + gap, y + (h - 8) / 2 + 1, col, style != NORMAL || active);
    }
}
