package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

/** Botón de Nova: panel oscuro translúcido con esquinas suaves, brillo de acento al pasar el ratón y animación. */
public class NovaButton extends ButtonWidget {
    static final int ACCENT = 0xFF8B6CFF;
    static final Identifier ICONS = Identifier.tryParse("nova:textures/gui/icons.png");

    private final int icon;       // índice en la tira de iconos, -1 = sin icono
    private final boolean primary;
    private float glow;           // 0..1
    private long last = Util.getMeasuringTimeMs();

    public NovaButton(int x, int y, int w, int h, Text label, int icon, boolean primary, PressAction action) {
        super(x, y, w, h, label, action, DEFAULT_NARRATION_SUPPLIER);
        this.icon = icon;
        this.primary = primary;
    }

    static int mix(int a, int b, float t) {
        int r = 0;
        for (int s = 24; s >= 0; s -= 8) {
            int ca = (a >> s) & 255, cb = (b >> s) & 255;
            r |= ((int) (ca + (cb - ca) * t) & 255) << s;
        }
        return r;
    }

    /** Rectángulo con esquinas redondeadas (radio 2) sin solapar para no duplicar la transparencia. */
    static void panel(DrawContext c, int x, int y, int w, int h, int col) {
        c.fill(x + 2, y, x + w - 2, y + h, col);
        c.fill(x + 1, y + 1, x + 2, y + h - 1, col);
        c.fill(x + w - 2, y + 1, x + w - 1, y + h - 1, col);
        c.fill(x, y + 2, x + 1, y + h - 2, col);
        c.fill(x + w - 1, y + 2, x + w, y + h - 2, col);
    }

    static void icon(DrawContext c, int idx, int x, int y, int size, int argb) {
        float a = ((argb >> 24) & 255) / 255f;
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(((argb >> 16) & 255) / 255f, ((argb >> 8) & 255) / 255f, (argb & 255) / 255f, a);
        c.drawTexture(ICONS, x, y, size, size, idx * 32, 0, 32, 32, 256, 32);
        c.setShaderColor(1f, 1f, 1f, 1f);
    }

    // 1.20.x usa renderButton y 1.21 renderWidget: se declaran las dos (sin @Override) y cada versión llama a la suya
    public void renderButton(DrawContext c, int mx, int my, float delta) { renderWidget(c, mx, my, delta); }

    public void renderWidget(DrawContext c, int mx, int my, float delta) {
        long now = Util.getMeasuringTimeMs();
        float dt = Math.min(100, now - last) / 120f;
        last = now;
        boolean hot = this.active && (this.isHovered() || this.isFocused());
        glow = hot ? Math.min(1f, glow + dt) : Math.max(0f, glow - dt);

        int x = getX(), y = getY(), w = getWidth(), h = getHeight();
        int base = primary ? 0xC0181430 : 0xB0101018;
        int hover = primary ? 0xD02A2054 : 0xC01C1B2E;
        panel(c, x, y, w, h, mix(base, hover, glow));
        // línea de acento inferior que crece desde el centro
        int lw = (int) ((w - 8) * (primary ? 0.35f + 0.65f * glow : glow));
        if (lw > 0) c.fill(x + (w - lw) / 2, y + h - 1, x + (w + lw) / 2, y + h, mix(0x00000000 | (ACCENT & 0xFFFFFF), ACCENT, 1f) | 0xFF000000);
        if (primary) c.fill(x + 2, y, x + w - 2, y + 1, mix(0x40FFFFFF, 0x90B49CFF, glow));

        int col = active ? mix(0xFFD8D8E4, 0xFFFFFFFF, glow) : 0xFF777788;
        MinecraftClient mc = MinecraftClient.getInstance();
        int tw = mc.textRenderer.getWidth(getMessage());
        int isz = icon >= 0 ? 10 : 0;
        int gap = icon >= 0 && tw > 0 ? 5 : 0;
        int cx = x + (w - (isz + gap + tw)) / 2;
        int ty = y + (h - 8) / 2 + 1 - (int) (glow * 0);
        if (icon >= 0) icon(c, icon, cx, y + (h - isz) / 2, isz, col);
        if (tw > 0) c.drawText(mc.textRenderer, getMessage(), cx + isz + gap, ty, col, true);
    }
}
