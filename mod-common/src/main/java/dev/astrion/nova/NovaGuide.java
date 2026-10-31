package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.util.ArrayList;
import java.util.List;

/**
 * Guía de primera vez (lógica común): 5 pasos sobre el menú de Nova (Jugar, Editar HUD, Skins, Servidores, Modo FPS).
 * Aquí está el estado (paso actual, si ya se vio), los textos y el reparto del texto en líneas; el dibujo y los clics están en NovaGuideView de cada proyecto.
 * Se enseña sola una vez (guideDone en menu.json); «Ver guía» en el menú de Nova la repite. Con -Dnova.selftest=true nunca sale.
 */
final class NovaGuide {
    private NovaGuide() { }

    /** Qué botones se resaltan en cada paso: títulos de ayuda de los botones (en español, se pasan por tr()). */
    static final String[][] TARGETS = {
        { "Un jugador", "Multijugador" },
        { "Menú de Nova" },
        { "Skins" },
        { "Servidores" },
        { "Modo FPS", "Modo FPS activo", "Restaurar" },
    };
    static final int STEPS = TARGETS.length;

    private static int step = -1;
    private static boolean shownThisSession;
    private static long stepAt;

    static boolean active() { return step >= 0; }
    static int step() { return step; }
    static boolean last() { return step == STEPS - 1; }

    /** ¿Toca enseñarla sola? Una vez por partida del juego, solo si no se vio ya y no es el robot de pruebas. */
    static boolean due() {
        if (NovaSelfTest.ON || step >= 0 || shownThisSession) return false;
        NovaSettings.load();
        return !NovaSettings.guideDone;
    }

    static void start() { step = 0; shownThisSession = true; stepAt = System.currentTimeMillis(); }

    static void next() {
        if (step < 0) return;
        if (++step >= STEPS) finish(); else stepAt = System.currentTimeMillis();
    }

    static void skip() { finish(); }

    private static void finish() {
        step = -1;
        if (!NovaSettings.guideDone) { NovaSettings.guideDone = true; NovaSettings.save(); }
    }

    /** Opacidad de la guía en este momento (sin fundido con «reducir movimiento»). */
    static float alpha() {
        return NovaAcc.still() ? 1f : Math.max(0f, Math.min(1f, (System.currentTimeMillis() - stepAt) / 220f));
    }

    static String title() {
        switch (step) {
            case 0: return tr("Empieza por aquí");
            case 1: return tr("Tu HUD");
            case 2: return tr("Tus skins");
            case 3: return tr("Tus servidores");
            default: return tr("Modo FPS");
        }
    }

    static String text() {
        switch (step) {
            case 0: return tr("Abre tus mundos o entra a un servidor con estos dos botones.");
            case 1: return tr("En el menú de Nova está «Editar HUD»: coloca FPS, CPS, coordenadas y teclas donde quieras.");
            case 2: return tr("Cambia, guarda y elimina tus skins sin salir del juego.");
            case 3: return tr("Entra a tu último servidor o a tus favoritos con un clic.");
            default: return tr("Más rendimiento con un botón: partículas mínimas, sin nubes ni sombras. Se puede deshacer.");
        }
    }

    static String counter() { return tr("{0} de {1}", step + 1, STEPS); }

    /** Reparte un texto en líneas de como mucho maxChars caracteres, sin partir palabras. */
    static List<String> wrap(String s, int maxChars) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        for (String w : s.split(" ")) {
            if (cur.length() > 0 && cur.length() + 1 + w.length() > maxChars) { out.add(cur.toString()); cur.setLength(0); }
            if (cur.length() > 0) cur.append(' ');
            cur.append(w);
        }
        if (cur.length() > 0) out.add(cur.toString());
        return out;
    }

    /** Dónde poner la tarjeta de texto (cw×ch): debajo del resaltado si cabe, si no encima; sin resaltado, en el centro. target = {x, y, ancho, alto} o null. */
    static int[] card(int[] target, int sw, int sh, int cw, int ch) {
        if (target == null) return new int[] { (sw - cw) / 2, (sh - ch) / 2 };
        int x = Math.max(6, Math.min(sw - cw - 6, target[0] + target[2] / 2 - cw / 2));
        int below = target[1] + target[3] + 10, above = target[1] - ch - 10;
        int y = below + ch <= sh - 6 ? below : above >= 6 ? above : Math.max(6, Math.min(sh - ch - 6, below));
        return new int[] { x, y };
    }
}
