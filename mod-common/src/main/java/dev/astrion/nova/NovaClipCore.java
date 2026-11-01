package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.io.File;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Clips de los últimos 30 s (lógica común). El launcher graba la ventana del juego (solo si la opción está activa: pasa -Dnova.clips=true);
 * con F8 el mod escribe [NOVA:<código>:CLIP] y el launcher guarda nova-clip-….webm en la carpeta de capturas. Aquí se pide el clip
 * y se espera a que aparezca el archivo para avisar en el juego. Sin la opción del launcher, F8 no hace nada.
 */
final class NovaClipCore {
    private NovaClipCore() { }

    static final boolean ON = Boolean.getBoolean("nova.clips");
    static final long WAIT_MS = 30000, COOLDOWN_MS = 3000, POLL_MS = 500;

    private static boolean wasKey;
    private static long reqAt, lastReq, lastPoll;
    private static Set<String> before = new HashSet<>();

    static boolean edge(boolean down) { boolean r = down && !wasKey; wasKey = down; return r; }

    private static Set<String> names(File dir) {
        Set<String> out = new HashSet<>();
        File[] fl = dir == null ? null : dir.listFiles((d, n) -> n.toLowerCase(Locale.ROOT).endsWith(".webm"));
        if (fl != null) for (File f : fl) out.add(f.getName());
        return out;
    }

    /** F8: pide un clip. Devuelve el aviso a enseñar, o null si no toca (la opción está apagada o se pidió hace menos de 3 s). */
    static String request(File shotsDir, long now) {
        if (!ON || now - lastReq < COOLDOWN_MS) return null;
        lastReq = now; reqAt = now; lastPoll = now;
        before = names(shotsDir);
        NovaMark.say("CLIP", null);
        return tr("Guardando clip…");
    }

    /** Cada fotograma: si hay un clip pedido, mira si ya está el archivo. Devuelve el aviso a enseñar, o null. */
    static String poll(File shotsDir, long now) {
        if (reqAt == 0 || now - lastPoll < POLL_MS) return null;
        lastPoll = now;
        for (String n : names(shotsDir)) if (!before.contains(n)) { reqAt = 0; return tr("Clip guardado en la carpeta de capturas"); }
        if (now - reqAt > WAIT_MS) { reqAt = 0; return tr("No se pudo guardar el clip: aún no hay vídeo grabado"); }
        return null;
    }
}
