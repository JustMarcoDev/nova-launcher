package dev.astrion.nova;

/**
 * Marcadores para el launcher: líneas que el mod escribe en la salida del juego ([NOVA:<código>:NOMBRE:argumento]).
 * El código lo inventa el launcher en cada partida (-Dnova.key) y solo lo conoce el mod, así que un mensaje de chat no puede pedirle nada al launcher.
 * Sin código (por ejemplo, fuera del launcher) no se escribe nada.
 */
final class NovaMark {
    private NovaMark() { }

    private static final String KEY = System.getProperty("nova.key", "");

    static void say(String name) { say(name, null); }

    static void say(String name, String arg) {
        if (KEY.isEmpty()) return;
        System.out.println("[NOVA:" + KEY + ":" + name + (arg == null ? "" : ":" + arg) + "]");
    }
}
