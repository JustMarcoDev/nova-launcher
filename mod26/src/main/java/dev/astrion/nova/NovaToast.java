package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.Minecraft;

/**
 * Avisos del launcher dentro del juego (descarga terminada, actualización lista, copia de seguridad hecha y logros): tarjeta con placa de icono del color
 * de cada tipo de aviso, de uno en uno y 5 s cada uno. Los avisos normales salen abajo a la derecha; los logros ("logro" y "platino") salen arriba a la derecha,
 * como los logros de Minecraft, deslizándose desde el borde con un pequeño rebote. La cola y la lectura de avisos.json están en NovaToasts (mod-common).
 */
final class NovaToast {
    private NovaToast() { }

    private static final int GOLD = 0xFFFFC83A, ICE = 0xFF4FD8FF;

    /** Color e icono de cada tipo de aviso. */
    private static int tint(String tipo) {
        switch (tipo == null ? "" : tipo) {
            case "download": return 0xFF4DA3FF;
            case "update": return 0xFF4CD97B;
            case "backup": return 0xFF2FD3C0;
            default: return NovaSettings.accent | 0xFF000000;
        }
    }
    private static int icon(String tipo) {
        switch (tipo == null ? "" : tipo) {
            case "download": return NovaGfx.I_DOWNLOAD;
            case "update": return NovaGfx.I_UPDATE;
            case "backup": return NovaGfx.I_SHIELD;
            default: return NovaGfx.I_BELL;
        }
    }

    /** Fondo de la tarjeta (textura con sombra y placa de icono; si no hay gráficos, el panel liso de siempre). */
    private static void card(GuiGraphicsExtractor c, Minecraft mc, int x, int y, int w, int h, int tint, int icon, float a) {
        if (NovaGfx.ok) {
            try { NovaGfx.toast(mc, w, h, tint, icon).draw(c, x - 6, y - 6, a); return; } catch (Throwable e) { NovaGfx.ok = false; }
        }
        NovaButton.panel(c, x, y, w, h, 6, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(tint, a));
    }

    /** Se llama desde el HUD en cada fotograma. */
    static void render(GuiGraphicsExtractor c, Minecraft mc) {
        long now = System.currentTimeMillis();
        NovaToasts.Toast t = NovaToasts.tick(now);
        if (t == null) return;
        long age = NovaToasts.age(now);
        boolean plat = "platino".equals(t.tipo);
        if (plat || "logro".equals(t.tipo)) { logro(c, mc, t, age, plat); return; }
        float a = NovaAcc.still() ? 1f : NovaEase.smooth(age / 180f) * NovaEase.smooth((NovaToasts.SHOW_MS - age) / 300f);
        if (a <= 0f) return;
        int sw = c.guiWidth(), sh = c.guiHeight();
        int w = 202, h = 36, x = sw - w - 8, y = sh - h - 44;
        if (!NovaAcc.still()) x += (int) ((1f - NovaEase.outCubic(age / 260f)) * 24);
        int tint = tint(t.tipo);
        card(c, mc, x, y, w, h, tint, icon(t.tipo), a);
        String txt = t.texto, sub = "Nova Launcher";
        int cut = txt.indexOf(" · ");
        if (cut > 0) { sub = txt.substring(cut + 3); txt = txt.substring(0, cut); }
        txt = tr(txt);
        if (txt.length() > 28) txt = txt.substring(0, 27) + "…";
        if (sub.length() > 36) sub = sub.substring(0, 35) + "…";
        int tx = x + 38;
        NovaShots.txt(c, mc, txt, tx, y + 8, 7.2f, 0xFFFFFFFF, true, a);
        NovaShots.txt(c, mc, sub, tx, y + 19, 5.4f, 0xFFA6A6CC, false, a);
        int len = w - 38 - 10, bar = (int) (len * (1f - age / (float) NovaToasts.SHOW_MS));
        c.fill(tx, y + h - 6, tx + len, y + h - 5, NovaShots.withAlpha(0x2EFFFFFF, a));
        c.fill(tx, y + h - 6, tx + Math.max(0, bar), y + h - 5, NovaShots.withAlpha(tint, a));
    }

    /** Logro conseguido (texto "Nombre · descripción"): entra deslizándose con rebote desde la derecha y sale igual, como el aviso de logros de Minecraft. */
    private static void logro(GuiGraphicsExtractor c, Minecraft mc, NovaToasts.Toast t, long age, boolean plat) {
        boolean still = NovaAcc.still();
        float in = still ? 1f : Math.min(1f, age / 480f), out = still ? 1f : Math.min(1f, (NovaToasts.SHOW_MS - age) / 380f);
        float a = still ? 1f : NovaEase.smooth(in * 3f) * NovaEase.smooth(out * 1.5f);
        if (a <= 0f) return;
        int sw = c.guiWidth();
        int w = 226, h = 44, x = sw - w - 8, y = 8;
        if (!still) x += (int) ((1f - NovaEase.outBack(in)) * (w + 14) + (1f - NovaEase.outCubic(out)) * (w + 14));
        int tint = plat ? ICE : GOLD;
        card(c, mc, x, y, w, h, tint, plat ? NovaGfx.I_TROPHY : NovaGfx.I_STAR, a);
        String txt = t.texto, sub = "";
        int cut = txt.indexOf(" · ");
        if (cut > 0) { sub = txt.substring(cut + 3); txt = txt.substring(0, cut); }
        if (txt.length() > 27) txt = txt.substring(0, 26) + "…";
        if (sub.length() > 38) sub = sub.substring(0, 37) + "…";
        int tx = x + 40;
        NovaShots.txt(c, mc, tr(plat ? "¡Platino conseguido!" : "Logro conseguido"), tx, y + 6, 5.4f, tint, true, a);
        NovaShots.txt(c, mc, txt, tx, y + 15, 7.6f, 0xFFFFFFFF, true, a);
        if (!sub.isEmpty()) NovaShots.txt(c, mc, sub, tx, y + 28, 5.4f, 0xFFA6A6CC, false, a);
        if (!still && (plat || age < 900)) {   // destello que cruza el aviso (siempre en el platino; una vez al entrar en los logros)
            float p = plat ? (age % 1600) / 1600f : age / 900f;
            int sx = x + 38 + (int) ((w - 50) * p);
            c.fill(sx, y + 3, sx + 5, y + h - 3, NovaShots.withAlpha(0x2EFFFFFF, a));
        }
    }
}
