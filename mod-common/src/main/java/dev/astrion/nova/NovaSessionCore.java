package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

/**
 * Tiempo de sesión y aviso de descanso (lógica común): cuenta desde que entras a un mundo o servidor y se reinicia al salir al menú de título.
 * El elemento «Sesión» del HUD lo dibuja NovaHud; el aviso sale como un NovaToast.
 */
final class NovaSessionCore {
    private NovaSessionCore() { }

    /** Opciones del aviso de descanso, en minutos (0 = nunca). */
    static final int[] REST = { 0, 30, 60, 120 };

    private static long start;
    private static int restCount;

    /** Se llama en cada fotograma de la partida: la sesión empieza la primera vez que se llama tras un reinicio. */
    static void tick(long now) { if (start == 0) start = now; }

    /** Al volver al menú de título. */
    static void reset() { start = 0; restCount = 0; }

    static long elapsedMs(long now) { return start == 0 ? 0 : Math.max(0, now - start); }

    /** «1 h 23 min», «23 min» o «0 min». */
    static String fmt(long ms) {
        long m = ms / 60_000L;
        return m >= 60 ? (m / 60) + " h" + (m % 60 > 0 ? " " + (m % 60) + " min" : "") : m + " min";
    }

    /** Texto del elemento de HUD; con sample se enseña un ejemplo (editor del HUD). */
    static String label(boolean sample, long now) { return tr("Sesión") + " " + (sample ? "1 h 23 min" : fmt(elapsedMs(now))); }

    /** Nombre de una opción de descanso: «Nunca», «30 min», «1 h», «2 h». */
    static String restName(int min) { return min <= 0 ? tr("Nunca") : fmt(min * 60_000L); }

    /** Siguiente opción al pulsar el botón. */
    static int nextRest(int cur) {
        for (int i = 0; i < REST.length; i++) if (REST[i] == cur) return REST[(i + 1) % REST.length];
        return 0;
    }

    /** ¿Toca avisar del descanso ahora? Avisa cada vez que se cumple el intervalo (30 min, 1 h…) y no repite hasta el siguiente. */
    static boolean restDue(long now) {
        int min = NovaSettings.restMin;
        if (min <= 0 || start == 0) return false;
        if (elapsedMs(now) < (long) min * 60_000L * (restCount + 1)) return false;
        restCount++;
        return true;
    }

    static String restText() { return tr("Llevas {0} jugando, ¿un descanso?", fmt(elapsedMs(System.currentTimeMillis()))); }
}
