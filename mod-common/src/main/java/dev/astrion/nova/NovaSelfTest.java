package dev.astrion.nova;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Robot de pruebas (-Dnova.selftest=true). Lo usa el CI en Linux con xvfb para cada versión de Minecraft:
 * 1) espera a la pantalla de título y comprueba que es NovaTitleScreen;
 * 2) prueba el zoom (el campo de visión se encoge al mantenerlo y vuelve a 1 al soltarlo);
 * 3) abre el menú de pausa de Nova y deja que se dibuje;
 * 4) en cada paso escribe «[NOVA-SELFTEST] SHOT <nombre>» (el CI hace la captura de la pantalla en ese momento) y
 *    termina con «[NOVA-SELFTEST] PASS» y código 0, o con «FAIL <motivo>» y código 1.
 * No usa ninguna API de Minecraft: la pantalla de título le pasa lo que necesita.
 */
final class NovaSelfTest {
    private NovaSelfTest() { }

    static final boolean ON = "true".equals(System.getProperty("nova.selftest"));
    private static boolean started;

    private static void log(String s) { System.out.println("[NOVA-SELFTEST] " + s); System.out.flush(); }

    private static void fail(String why) {
        log("FAIL " + why);
        Runtime.getRuntime().halt(1);
    }

    private static <T> T onMain(Executor main, Supplier<T> s) throws Exception {
        CompletableFuture<T> f = new CompletableFuture<>();
        main.execute(() -> { try { f.complete(s.get()); } catch (Throwable t) { f.completeExceptionally(t); } });
        return f.get(20, TimeUnit.SECONDS);
    }

    /** La pantalla de título la llama una vez en init(): main = ejecutor del hilo del juego; cur = nombre de la pantalla abierta; pause = abre el menú de pausa de Nova. */
    static void start(Executor main, Supplier<String> cur, Runnable pause) {
        if (!ON || started) return;
        started = true;
        Thread t = new Thread(() -> {
            try {
                Thread.sleep(3000);
                String s = onMain(main, cur);
                if (s == null || !s.endsWith("NovaTitleScreen")) { fail("la pantalla de título no es NovaTitleScreen sino " + s); return; }
                log("TITLE OK");
                log("SHOT title"); Thread.sleep(2500);

                // zoom
                float min = 9f;
                NovaHud.zoomForce = true;
                for (int i = 0; i < 40; i++) { Thread.sleep(50); min = Math.min(min, (float) (double) onMain(main, NovaHud::zoomMul)); }
                NovaHud.zoomForce = false;
                double end = 9;
                for (int i = 0; i < 40; i++) { Thread.sleep(50); end = onMain(main, NovaHud::zoomMul); }
                log("ZOOM min=" + min + " fin=" + end);
                if (!(min < 0.5f)) { fail("el zoom no acerca (mínimo " + min + ")"); return; }
                if (!(end > 0.98)) { fail("el zoom no vuelve a 1 al soltarlo (" + end + ")"); return; }
                log("ZOOM OK");

                // menú de pausa
                onMain(main, () -> { pause.run(); return 1; });
                Thread.sleep(1800);
                s = onMain(main, cur);
                if (s == null || !s.endsWith("NovaPauseScreen")) { fail("no se abrió NovaPauseScreen sino " + s); return; }
                Thread.sleep(1200);
                log("PAUSE OK");
                log("SHOT pause"); Thread.sleep(2500);
                log("PASS");
                Runtime.getRuntime().halt(0);
            } catch (Throwable e) {
                e.printStackTrace();
                fail("excepción: " + e);
            }
        }, "nova-selftest");
        t.setDaemon(true);
        t.start();
    }
}
