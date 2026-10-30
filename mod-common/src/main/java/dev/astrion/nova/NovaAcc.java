package dev.astrion.nova;

import com.google.gson.JsonObject;

/**
 * Accesibilidad del menú de Nova: escala de texto (80–150 %), alto contraste (fondos opacos, bordes y texto blanco puro)
 * y reducir movimiento (sin animaciones, fondo como imagen fija del primer fotograma).
 * Se guarda en menu.json («acc»). Con «Usar la accesibilidad del launcher» el launcher copia sus ajustes aquí al lanzar el juego.
 * Esta clase no usa nada de Minecraft, por eso es igual en todas las versiones.
 */
final class NovaAcc {
    private NovaAcc() { }

    static final int TMIN = 80, TMAX = 150;
    /** Usar los ajustes del launcher (los copia él a menu.json al lanzar). */
    static boolean useLauncher;
    /** Escala del texto en %. */
    static int textPct = 100;
    static boolean contrast, motion;

    static float text() { return textPct / 100f; }
    static boolean hc() { return contrast; }
    static boolean still() { return motion; }
    /** Cambia si cambia algo que afecta al aspecto de las texturas (así se recrean). */
    static String key() { return (contrast ? "c" : "n") + textPct; }
    /** Color de texto: blanco puro con alto contraste. */
    static int fg(int argb) { return contrast ? 0xFFFFFFFF : argb; }
    /** Con alto contraste los fondos y bordes semitransparentes pasan a ser opacos. */
    static int solid(int argb) { return contrast && (argb >>> 24) >= 0x30 ? (argb | 0xFF000000) : argb; }
    static int clampPct(int v) { return Math.max(TMIN, Math.min(TMAX, v)); }

    static void read(JsonObject o) {
        if (o == null) return;
        if (o.has("launcher")) useLauncher = o.get("launcher").getAsBoolean();
        if (o.has("text")) textPct = clampPct(o.get("text").getAsInt());
        if (o.has("contrast")) contrast = o.get("contrast").getAsBoolean();
        if (o.has("motion")) motion = o.get("motion").getAsBoolean();
    }

    static JsonObject write() {
        JsonObject o = new JsonObject();
        o.addProperty("launcher", useLauncher);
        o.addProperty("text", textPct);
        o.addProperty("contrast", contrast);
        o.addProperty("motion", motion);
        return o;
    }
}
