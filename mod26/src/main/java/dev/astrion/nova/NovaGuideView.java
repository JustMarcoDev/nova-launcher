package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;

/**
 * Guía de primera vez: lo que toca Minecraft (oscurecer la pantalla dejando un hueco, marco, tarjeta con texto y los botones «Siguiente» y «Saltar»).
 * El estado y los textos están en NovaGuide (mod-common). Lo llama NovaTitleScreen mientras la guía está activa.
 */
final class NovaGuideView {
    private NovaGuideView() { }

    private static NovaButton bNext, bSkip;
    private static int builtFor = -1;

    /** Rectángulo {x, y, ancho, alto} que une los botones del paso actual, o null si no se encuentran. */
    private static int[] target(java.util.List<?> children) {
        int x0 = Integer.MAX_VALUE, y0 = Integer.MAX_VALUE, x1 = Integer.MIN_VALUE, y1 = Integer.MIN_VALUE;
        for (String key : NovaGuide.TARGETS[NovaGuide.step()]) {
            String want = tr(key);
            for (Object o : children) {
                if (!(o instanceof NovaButton) || !((NovaButton) o).visible) continue;
                NovaButton b = (NovaButton) o;
                if (!want.equals(b.tipTitle)) continue;
                x0 = Math.min(x0, b.getX()); y0 = Math.min(y0, b.getY());
                x1 = Math.max(x1, b.getX() + b.getWidth()); y1 = Math.max(y1, b.getY() + b.getHeight());
            }
        }
        return x0 == Integer.MAX_VALUE ? null : new int[] { x0, y0, x1 - x0, y1 - y0 };
    }

    private static void txt(GuiGraphicsExtractor c, Minecraft mc, String s, int x, int y, float px, int argb, boolean bold) {
        NovaShots.txt(c, mc, s, x, y, px, argb, bold, 1f);
    }

    static void render(GuiGraphicsExtractor c, Minecraft mc, java.util.List<?> children, int sw, int sh, int mx, int my, float delta) {
        if (!NovaGuide.active()) return;
        float a = NovaGuide.alpha();
        int[] t = target(children);
        int dim = NovaShots.withAlpha(0xC0020208, a);
        int ac = NovaSettings.accent | 0xFF000000;
        if (t == null) c.fill(0, 0, sw, sh, dim);
        else {
            int pad = 3, x0 = t[0] - pad, y0 = t[1] - pad, x1 = t[0] + t[2] + pad, y1 = t[1] + t[3] + pad;
            c.fill(0, 0, sw, y0, dim); c.fill(0, y1, sw, sh, dim); c.fill(0, y0, x0, y1, dim); c.fill(x1, y0, sw, y1, dim);
            int fc = NovaShots.withAlpha(ac, a);
            c.fill(x0 - 1, y0 - 1, x1 + 1, y0, fc); c.fill(x0 - 1, y1, x1 + 1, y1 + 1, fc);
            c.fill(x0 - 1, y0, x0, y1, fc); c.fill(x1, y0, x1 + 1, y1, fc);
        }
        // tarjeta
        int cw = Math.min(200, sw - 12);
        java.util.List<String> lines = NovaGuide.wrap(NovaGuide.text(), Math.max(16, (int) (cw / (3.4f * NovaAcc.text()))));
        int lh = Math.round(8.5f * NovaAcc.text()), ch = 12 + 12 + lines.size() * lh + 6 + 14 + 8;
        int[] p = NovaGuide.card(t, sw, sh, cw, ch);
        NovaButton.panel(c, p[0], p[1], cw, ch, 6, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        txt(c, mc, NovaGuide.title(), p[0] + 9, p[1] + 8, 7.6f, 0xFFFFFFFF, true);
        txt(c, mc, NovaGuide.counter(), p[0] + cw - 9 - 28, p[1] + 9, 5.4f, 0xFF9A9AC0, false);
        int ty = p[1] + 24;
        for (String l : lines) { txt(c, mc, l, p[0] + 9, ty, 5.8f, 0xFFDADAF0, false); ty += lh; }
        // botones
        if (builtFor != NovaGuide.step() || bNext == null) {
            builtFor = NovaGuide.step();
            bNext = new NovaButton(0, 0, 60, 14, Component.literal(NovaGuide.last() ? tr("Entendido") : tr("Siguiente")), -1, NovaButton.PRIMARY, b -> { });
            bSkip = new NovaButton(0, 0, 46, 14, Component.literal(tr("Saltar")), -1, NovaButton.NORMAL, b -> { });
        }
        int by = p[1] + ch - 14 - 7;
        bNext.setX(p[0] + cw - 9 - 60); bNext.setY(by);
        bSkip.setX(p[0] + cw - 9 - 60 - 4 - 46); bSkip.setY(by);
        for (NovaButton b : new NovaButton[] { bSkip, bNext }) { b.extractRenderState(c, mx, my, delta); }
    }

    private static boolean hit(NovaButton b, double mx, double my) {
        return b != null && mx >= b.getX() && mx < b.getX() + b.getWidth() && my >= b.getY() && my < b.getY() + b.getHeight();
    }

    /** Un clic con la guía abierta: solo valen «Siguiente» y «Saltar»; lo demás queda bloqueado. */
    static boolean click(double mx, double my) {
        if (hit(bNext, mx, my)) NovaGuide.next();
        else if (hit(bSkip, mx, my)) NovaGuide.skip();
        return true;
    }

    /** Teclas con la guía abierta: Intro, espacio y flecha derecha avanzan; Esc la salta. */
    static boolean key(int key) {
        if (key == 256) NovaGuide.skip();
        else if (key == 257 || key == 335 || key == 32 || key == 262) NovaGuide.next();
        return true;
    }
}
