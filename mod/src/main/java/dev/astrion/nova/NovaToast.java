package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.MinecraftClient;

/**
 * Avisos del launcher dentro del juego (descarga terminada, actualización lista, copia de seguridad hecha y logros): mismo estilo que el aviso de capturas
 * (NovaShots), de uno en uno y 5 s cada uno. Los avisos normales salen abajo a la derecha; los logros ("logro" y "platino") salen arriba a la derecha,
 * como los logros de Minecraft, deslizándose desde el borde con un pequeño rebote. La cola y la lectura de avisos.json están en NovaToasts (mod-common).
 */
final class NovaToast {
    private NovaToast() { }

    /** Se llama desde el HUD en cada fotograma. */
    static void render(DrawContext c, MinecraftClient mc) {
        long now = System.currentTimeMillis();
        NovaToasts.Toast t = NovaToasts.tick(now);
        if (t == null) return;
        long age = NovaToasts.age(now);
        boolean plat = "platino".equals(t.tipo);
        if (plat || "logro".equals(t.tipo)) { logro(c, mc, t, age, plat); return; }
        float a = NovaAcc.still() ? 1f : NovaEase.smooth(age / 180f) * NovaEase.smooth((NovaToasts.SHOW_MS - age) / 300f);
        if (a <= 0f) return;
        int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        int w = 190, h = 32, x = sw - w - 6, y = sh - h - 44;
        if (!NovaAcc.still()) x += (int) ((1f - NovaEase.outCubic(age / 260f)) * 22);
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

    /** Logro conseguido (texto "Nombre · descripción"): entra deslizándose con rebote desde la derecha y sale igual, como el aviso de logros de Minecraft. */
    private static void logro(DrawContext c, MinecraftClient mc, NovaToasts.Toast t, long age, boolean plat) {
        boolean still = NovaAcc.still();
        float in = still ? 1f : Math.min(1f, age / 480f), out = still ? 1f : Math.min(1f, (NovaToasts.SHOW_MS - age) / 380f);
        float a = still ? 1f : NovaEase.smooth(in * 3f) * NovaEase.smooth(out * 1.5f);
        if (a <= 0f) return;
        int sw = c.getScaledWindowWidth();
        int w = 214, h = 38, x = sw - w - 6, y = 6;
        if (!still) x += (int) ((1f - NovaEase.outBack(in)) * (w + 12) + (1f - NovaEase.outCubic(out)) * (w + 12));
        int gold = plat ? 0xFF7FE3FF : 0xFFFFD84A;
        long beat = still ? 0 : (age / 260) & 1;
        int border = plat ? (beat == 0 ? 0xFF7FE3FF : 0xFFFFFFFF) : 0xFF8C6A1E;
        NovaButton.panel(c, x, y, w, h, 6, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(border, a));
        NovaButton.panel(c, x + 6, y + 7, 24, 24, 5, NovaShots.withAlpha(0xFF1C1838, a), NovaShots.withAlpha(gold, a));
        NovaShots.txt(c, mc, plat ? "✦" : "★", x + 13, y + 13, 11f, gold, true, a);
        String txt = t.texto, sub = "";
        int cut = txt.indexOf(" · ");
        if (cut > 0) { sub = txt.substring(cut + 3); txt = txt.substring(0, cut); }
        if (txt.length() > 26) txt = txt.substring(0, 25) + "…";
        if (sub.length() > 36) sub = sub.substring(0, 35) + "…";
        NovaShots.txt(c, mc, tr(plat ? "¡Platino conseguido!" : "Logro conseguido"), x + 37, y + 5, 5.4f, gold, true, a);
        NovaShots.txt(c, mc, txt, x + 37, y + 14, 7.2f, 0xFFFFFFFF, true, a);
        if (!sub.isEmpty()) NovaShots.txt(c, mc, sub, x + 37, y + 26, 5.4f, 0xFF9A9AC0, false, a);
        if (plat && !still) {   // destello que cruza el aviso
            int sx = x + 36 + (int) ((w - 48) * ((age % 1400) / 1400f));
            c.fill(sx, y + 2, sx + 6, y + h - 2, NovaShots.withAlpha(0x30FFFFFF, a));
        }
    }
}
