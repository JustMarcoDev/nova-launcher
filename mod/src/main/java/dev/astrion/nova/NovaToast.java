package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.MinecraftClient;

/**
 * Avisos del launcher dentro del juego (descarga terminada, actualización lista, copia de seguridad hecha): mismo estilo que el aviso de capturas (NovaShots),
 * abajo a la derecha, 5 s cada uno y de uno en uno. La cola y la lectura de avisos.json están en NovaToasts (mod-common).
 */
final class NovaToast {
    private NovaToast() { }

    /** Se llama desde el HUD en cada fotograma. */
    static void render(DrawContext c, MinecraftClient mc) {
        long now = System.currentTimeMillis();
        NovaToasts.Toast t = NovaToasts.tick(now);
        if (t == null) return;
        long age = NovaToasts.age(now);
        float a = NovaAcc.still() ? 1f : Math.min(1f, age / 180f) * Math.min(1f, (NovaToasts.SHOW_MS - age) / 300f);
        if (a <= 0f) return;
        int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        int w = 190, h = 32, x = sw - w - 6, y = sh - h - 44;
        if (!NovaAcc.still()) x += (int) ((1f - Math.min(1f, age / 180f)) * 14);
        NovaButton.panel(c, x, y, w, h, 6, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        String ico = "update".equals(t.tipo) ? "↑" : "✓";
        String txt = t.texto, sub = "Nova Launcher";
        int cut = txt.indexOf(" · ");
        if (cut > 0) { sub = txt.substring(cut + 3); txt = txt.substring(0, cut); }
        txt = tr(txt);
        if (sub.length() > 34) sub = sub.substring(0, 31) + "…";
        NovaShots.txt(c, mc, ico + " " + txt, x + 9, y + 7, 7.2f, 0xFFFFFFFF, true, a);
        NovaShots.txt(c, mc, sub, x + 9, y + 19, 5.4f, 0xFF9A9AC0, false, a);
        int bar = (int) ((w - 18) * (1f - age / (float) NovaToasts.SHOW_MS));
        c.fill(x + 9, y + h - 4, x + 9 + (w - 18), y + h - 3, NovaShots.withAlpha(0x33FFFFFF, a));
        c.fill(x + 9, y + h - 4, x + 9 + Math.max(0, bar), y + h - 3, NovaShots.withAlpha(NovaSettings.accent | 0xFF000000, a));
    }
}
