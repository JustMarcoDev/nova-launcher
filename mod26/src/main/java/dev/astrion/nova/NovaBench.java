package dev.astrion.nova;

import java.util.Arrays;
import net.minecraft.client.Minecraft;

/**
 * Prueba de rendimiento (-Dnova.bench=true, solo la usa el launcher con su instancia oculta «Nova Benchmark»).
 * Con el mundo de semilla fija ya abierto: espera unos segundos a que carguen los chunks, mueve la cámara por un recorrido fijo durante 30 s
 * (una vuelta completa mirando alrededor, con la cabeza subiendo y bajando), mide FPS medio, el 1 % más bajo y la RAM usada,
 * escribe [NOVA:<código>:BENCH:<json>] y cierra el juego.
 */
final class NovaBench {
    private NovaBench() { }

    static final boolean ON = Boolean.getBoolean("nova.bench");
    static final int WARM_S = Integer.getInteger("nova.bench.warm", 20), RUN_S = Integer.getInteger("nova.bench.secs", 30);

    private static int state;   // 0 esperando al mundo · 1 calentando · 2 midiendo · 3 terminado
    private static long t0, last;
    private static int n;
    private static long[] dts = new long[60000];
    private static long ramMax, ramAllocMax;
    private static float yaw0, pitch0;

    private static String q(double v) { return Double.toString(Math.round(v * 10.0) / 10.0); }

    /** Se llama en cada fotograma desde el HUD. */
    static void frame(Minecraft mc) {
        if (!ON || state == 3) return;
        try {
            long now = System.nanoTime();
            if (mc.level == null || mc.player == null || NovaGui.screen(mc) != null) { if (state == 0) last = now; return; }
            if (state == 0) { state = 1; t0 = now; last = now; yaw0 = mc.player.getYRot(); pitch0 = 12f; System.out.println("[NOVA-BENCH] mundo listo, calentando " + WARM_S + " s"); }
            float t = (now - t0) / 1e9f;
            if (state == 1) {
                aim(mc, yaw0 + t * 6f, pitch0);   // mientras carga, gira despacio para que se generen los chunks de alrededor
                if (t >= WARM_S) { state = 2; t0 = now; last = now; n = 0; ramMax = 0; ramAllocMax = 0; System.out.println("[NOVA-BENCH] midiendo " + RUN_S + " s"); }
                return;
            }
            long dt = now - last;
            last = now;
            if (n < dts.length) dts[n++] = dt;
            Runtime rt = Runtime.getRuntime();
            ramMax = Math.max(ramMax, rt.totalMemory() - rt.freeMemory());
            ramAllocMax = Math.max(ramAllocMax, rt.totalMemory());
            float k = Math.min(1f, t / RUN_S);
            aim(mc, yaw0 + k * 360f, (float) (pitch0 + 14.0 * Math.sin(k * Math.PI * 4)));
            if (t >= RUN_S) finish(mc, t);
        } catch (Throwable e) { System.out.println("[NOVA-BENCH] error: " + e); if (state != 3) { state = 3; try { NovaMark.say("BENCH", "{\"error\":1}"); } catch (Throwable ignored) { } quit(mc); } }
    }

    private static void aim(Minecraft mc, float yaw, float pitch) {
        mc.player.setYRot(yaw);
        mc.player.setXRot(pitch);
        mc.player.yRotO = yaw; mc.player.xRotO = pitch;
    }

    private static void finish(Minecraft mc, float secs) {
        state = 3;
        long[] d = Arrays.copyOf(dts, n);
        Arrays.sort(d);
        double avg = n / Math.max(0.001, secs);
        int worst = Math.max(1, n / 100);
        double sum = 0;
        for (int i = 0; i < worst; i++) sum += d[n - 1 - i];
        double low1 = 1e9 / Math.max(1.0, sum / worst);
        double min = 1e9 / Math.max(1.0, d.length == 0 ? 1 : d[d.length - 1]);
        int view = 0, sim = 0;
        try { view = mc.options.renderDistance().get(); sim = mc.options.simulationDistance().get(); } catch (Throwable ignored) { }
        String json = "{\"v\":1,\"secs\":" + q(secs) + ",\"frames\":" + n + ",\"avg\":" + q(avg) + ",\"low1\":" + q(low1) + ",\"min\":" + q(min)
                + ",\"ram\":" + (ramMax >> 20) + ",\"alloc\":" + (ramAllocMax >> 20) + ",\"heap\":" + (Runtime.getRuntime().maxMemory() >> 20)
                + ",\"view\":" + view + ",\"sim\":" + sim + ",\"fpsMode\":" + NovaSettings.fpsOn + ",\"cores\":" + Runtime.getRuntime().availableProcessors() + "}";
        System.out.println("[NOVA-BENCH] " + json);
        NovaMark.say("BENCH", json);
        quit(mc);
    }

    private static void quit(Minecraft mc) {
        new Thread(() -> { try { Thread.sleep(6000); } catch (InterruptedException ignored) { } System.exit(0); }, "nova-bench-exit").start();
        try { mc.stop(); } catch (Throwable e) { System.exit(0); }
    }
}
