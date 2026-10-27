package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.CloudStatus;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Options;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Util;

/**
 * «Modo FPS»: baja de golpe lo que más pesa (partículas, nubes, sombras de entidades, distancias y animaciones de bloques)
 * y guarda las opciones de antes para devolverlas con «Restaurar». Los valores guardados se quedan en menu.json.
 */
public final class NovaFps {
    private NovaFps() { }

    static final int VIEW = 8, SIM = 6;

    static boolean on() { return NovaSettings.fpsOn; }

    static void enable(Minecraft mc) {
        try {
            NovaSettings.load();
            if (NovaSettings.fpsOn || mc == null || mc.options == null) return;
            Options o = mc.options;
            NovaSettings.fpsParticles = NovaOpt.particles(o);
            NovaSettings.fpsClouds = o.cloudStatus().get().name();
            NovaSettings.fpsShadows = o.entityShadows().get();
            NovaSettings.fpsView = o.renderDistance().get();
            NovaSettings.fpsSim = o.simulationDistance().get();
            NovaSettings.fpsOn = true;
            apply(o);
            NovaSettings.save();
        } catch (Throwable ignored) { }
    }

    private static void apply(Options o) {
        NovaOpt.setParticles(o, "MINIMAL");
        o.cloudStatus().set(CloudStatus.OFF);
        o.entityShadows().set(false);
        // «distancia 8 / 6» como tope: si ya tenías menos, no se sube
        o.renderDistance().set(Math.min(VIEW, NovaSettings.fpsView));
        o.simulationDistance().set(Math.min(SIM, NovaSettings.fpsSim));
        o.save();
    }

    static void restore(Minecraft mc) {
        try {
            NovaSettings.load();
            if (!NovaSettings.fpsOn || mc == null || mc.options == null) return;
            Options o = mc.options;
            if (!NovaSettings.fpsParticles.isEmpty()) NovaOpt.setParticles(o, NovaSettings.fpsParticles);
            try { o.cloudStatus().set(CloudStatus.valueOf(NovaSettings.fpsClouds)); } catch (Throwable ignored) { }
            o.entityShadows().set(NovaSettings.fpsShadows);
            if (NovaSettings.fpsView > 0) o.renderDistance().set(NovaSettings.fpsView);
            if (NovaSettings.fpsSim > 0) o.simulationDistance().set(NovaSettings.fpsSim);
            o.save();
            NovaSettings.fpsOn = false;
            NovaSettings.save();
        } catch (Throwable ignored) { }
    }

    /** Las animaciones de bloques (agua, lava, fuego…) se actualizan a la mitad de ritmo; lo llama SpriteAtlasMixin. */
    private static int tick;
    public static boolean skipAnimTick() { return NovaSettings.fpsOn && (++tick & 1) == 1; }

    // ---- aviso «Va lento, ¿activar Modo FPS?» ----
    // Con la partida en marcha (sin menús abiertos), si la media de FPS de los últimos 10 s se queda por debajo de 40 durante 2 minutos seguidos,
    // se ofrece el Modo FPS una sola vez por sesión. «No volver a preguntar» se guarda en NovaSettings.

    static final int LOW_FPS = Integer.getInteger("nova.fpsask.fps", 40), WINDOW_S = 10;
    static final long LOW_MS = Long.getLong("nova.fpsask.ms", 120000L), SHOW_MS = 15000;
    private static final int[] ring = new int[WINDOW_S];
    private static int ringN, frames;
    private static long lastNs, secMs, lowMs;
    private static boolean asked;
    private static volatile long born, doneAt;   // born: cuándo salió el aviso; doneAt: cuándo se pulsó «Activar»
    private static NovaButton bYes, bNo;
    private static boolean wasDown;
    private static long lastNow;

    /** Desde el HUD en cada fotograma: vigila los FPS y, si toca, dibuja el aviso. */
    static void frame(GuiGraphicsExtractor c, Minecraft mc) {
        try {
            NovaSettings.load();
            if (born == 0 && doneAt == 0) { watch(mc); return; }
            draw(c, mc);
        } catch (Throwable ignored) { }
    }

    private static void watch(Minecraft mc) {
        if (asked || NovaSettings.fpsNoAsk || NovaSettings.fpsOn) return;
        long now = System.nanoTime();
        long dt = lastNs == 0 ? 0 : Math.min(500, (now - lastNs) / 1_000_000L);
        lastNs = now;
        if (NovaGui.screen(mc) != null || mc.level == null) { frames = 0; secMs = 0; return; }   // en menús no cuenta (ni suma ni resta)
        frames++;
        secMs += dt;
        if (secMs < 1000) return;
        ring[ringN++ % WINDOW_S] = (int) (frames * 1000L / Math.max(1, secMs));
        frames = 0; secMs = 0;
        boolean low = false;
        if (ringN >= WINDOW_S) {
            int sum = 0;
            for (int v : ring) sum += v;
            low = sum / WINDOW_S < LOW_FPS;
        }
        lowMs = low ? lowMs + 1000 : 0;
        if (lowMs >= LOW_MS) { asked = true; born = Util.getMillis(); lastNow = born; bYes = null; bNo = null; wasDown = NovaInput.mouse(mc, 0); }
    }

    private static void draw(GuiGraphicsExtractor c, Minecraft mc) {
        long now = Util.getMillis();
        int sw = c.guiWidth(), sh = c.guiHeight();
        boolean free = !mc.mouseHandler.isMouseGrabbed();
        double mx = -1, my = -1;
        if (free) {
            try { mx = mc.mouseHandler.xpos() * sw / (double) mc.getWindow().getScreenWidth(); my = mc.mouseHandler.ypos() * sh / (double) mc.getWindow().getScreenHeight(); } catch (Throwable ignored) { }
        }
        int w = 196, h = 64, x = sw - w - 6, y = 36;
        boolean over = free && mx >= x && mx <= x + w && my >= y && my <= y + h;
        if (doneAt == 0 && over) born += now - lastNow;   // con el puntero encima el aviso espera
        lastNow = now;
        long age = doneAt != 0 ? now - doneAt : now - born, life = doneAt != 0 ? 1800 : SHOW_MS;
        if (age > life) { born = 0; doneAt = 0; return; }
        float a = Math.min(1f, age / 180f) * Math.min(1f, (life - age) / 300f);
        if (a <= 0f) return;
        x += (int) ((1f - Math.min(1f, age / 180f)) * 14);
        NovaButton.panel(c, x, y, w, h, 6, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        if (doneAt != 0) {
            NovaShots.txt(c, mc, "✓ " + tr("Modo FPS activado"), x + 10, y + h / 2 - 5, 7.2f, 0xFFFFFFFF, true, a);
            return;
        }
        NovaShots.txt(c, mc, tr("Va lento, ¿activar Modo FPS?"), x + 8, y + 8, 7.2f, 0xFFFFFFFF, true, a);
        NovaShots.txt(c, mc, tr("Baja partículas, nubes y distancias para ir más fluido"), x + 8, y + 21, 5.2f, 0xFF9A9AC0, false, a);
        int by = y + 33, bw = (w - 16 - 3) / 2;
        if (bYes == null) {
            bYes = new NovaButton(0, 0, bw, 13, Component.literal(tr("Activar")), NovaGfx.I_BOLT, NovaButton.PRIMARY, b -> { });
            bNo = new NovaButton(0, 0, bw, 13, Component.literal(tr("No volver a preguntar")), -1, NovaButton.NORMAL, b -> { });
        }
        bYes.setX(x + 8); bYes.setY(by); bNo.setX(x + 8 + bw + 3); bNo.setY(by);
        int imx = (int) mx, imy = (int) my;
        bYes.extractRenderState(c, imx, imy, 0f); bNo.extractRenderState(c, imx, imy, 0f);
        if (free) {
            int bar = (int) ((w - 16) * (1f - age / (float) SHOW_MS));
            c.fill(x + 8, y + h - 8, x + 8 + (w - 16), y + h - 6, NovaShots.withAlpha(0x33FFFFFF, a));
            c.fill(x + 8, y + h - 8, x + 8 + Math.max(0, bar), y + h - 6, NovaShots.withAlpha(NovaSettings.accent | 0xFF000000, a));
        } else {
            NovaShots.txt(c, mc, tr("Abre el chat para usar los botones"), x + 8, y + h - 12, 5.2f, 0xFF7C7CA0, false, a);
        }
        boolean down = free && NovaInput.mouse(mc, 0);
        if (down && !wasDown) {
            if (NovaShots.hit(bYes, mx, my)) { enable(mc); doneAt = now; }
            else if (NovaShots.hit(bNo, mx, my)) { NovaSettings.fpsNoAsk = true; NovaSettings.save(); born = now - SHOW_MS + 150; }
        }
        wasDown = down;
    }
}
