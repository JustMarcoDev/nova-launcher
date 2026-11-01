package dev.astrion.nova;

/**
 * «Modo FPS» (lógica común): niveles, topes de distancias, el vigilante que sube o baja de nivel según los FPS medidos y el detector de
 * «va lento» que ofrece activarlo. Sin clases de Minecraft: cada proyecto (NovaFps) lee y escribe las opciones del juego y dibuja el aviso.
 */
final class NovaFpsCore {
    private NovaFpsCore() { }

    static final int VIEW = 8, SIM = 6;
    /** Niveles del Modo FPS: 0 = lo básico de siempre; cada nivel más recorta distancias, mezcla de biomas y distancia de entidades. */
    static final int MAXLVL = 4;
    private static final int[] VIEW_CAP = { VIEW, 8, 6, 5, 4 }, SIM_CAP = { SIM, 6, 5, 4, 3 };
    static int level;

    // tope de distancias según el nivel: si ya tenías menos, no se sube
    static int viewFor(int saved) { return Math.max(2, Math.min(VIEW_CAP[level], saved)); }
    static int simFor(int saved) { return Math.max(3, Math.min(SIM_CAP[level], saved)); }
    static int biomeFor(int saved) { return level >= 2 ? 0 : saved; }
    static double entityFor(double saved) { return level >= 3 ? Math.min(saved, 0.5) : level >= 2 ? Math.min(saved, 0.75) : saved; }

    /** Las animaciones de bloques (agua, lava, fuego…) se actualizan a la mitad de ritmo; lo llama SpriteAtlasMixin. */
    private static int tick;
    static boolean skipAnimTick() { return (NovaSettings.fpsOn || batActive()) && (++tick & 1) == 1; }

    // ---- FPS en menús, modo batería y distancias del Modo FPS (lo llaman los mixins de cada proyecto) ----

    /** Modo batería: el launcher pasa -Dnova.battery=true cuando el portátil va con batería. */
    static final boolean BAT = Boolean.getBoolean("nova.battery");
    static final double BIG = 3.0;
    static final int BAT_FPS = 30, MENU_FPS = 60, NEAR = 8;
    private static boolean batDone;

    /** El tope de 30 FPS vale mientras el Modo FPS esté activo (o hasta que se decida al empezar). */
    static boolean batActive() { return BAT && (!batDone || NovaSettings.fpsOn); }

    /** Límite de FPS efectivo: con batería 30, con un menú abierto 60; nunca sube el que ya tenía el jugador. */
    static int limit(int vanilla, boolean screenOpen) {
        try {
            NovaSettings.load();
            int r = vanilla;
            if (batActive()) r = Math.min(r, BAT_FPS);
            if (screenOpen && NovaSettings.fpsMenu) r = Math.min(r, MENU_FPS);
            return r;
        } catch (Throwable t) { return vanilla; }
    }

    /** Una vez por sesión: 1 = activar el Modo FPS (batería), -1 = devolverlo (ya no hay batería y lo activó ella), 0 = nada. */
    static int batteryStep() {
        if (batDone) return 0;
        batDone = true;
        if (BAT && !NovaSettings.fpsOn) return 1;
        if (!BAT && NovaSettings.fpsBat) return NovaSettings.fpsOn ? -1 : 0;
        return 0;
    }

    /** Partícula nueva a d2 (bloques al cuadrado) del jugador: con el Modo FPS no se crea si pasa de farPart (mínimo 8). */
    static boolean dropParticle(double d2) {
        if (!NovaSettings.fpsOn || NovaSettings.farPart <= 0) return false;
        double r = Math.max(NovaSettings.farPart, NEAR);
        return d2 > r * r;
    }

    /** Entidad que no es jugador a d2 de la cámara: con el Modo FPS no se dibuja si pasa de farEnt (mínimo 8). Los jugadores y las entidades enormes (dragón, wither, ghast…: ancho de 3 bloques o más) siempre se ven. */
    static boolean hideEntity(boolean player, double width, double d2) {
        if (player || width >= BIG || !NovaSettings.fpsOn || NovaSettings.farEnt <= 0) return false;
        double r = Math.max(NovaSettings.farEnt, NEAR);
        return d2 > r * r;
    }

    private static final int[] FAR_PART = { 0, 8, 16, 32 }, FAR_ENT = { 0, 32, 48, 64 };
    private static int next(int[] o, int cur) { for (int i = 0; i < o.length; i++) if (o[i] == cur) return o[(i + 1) % o.length]; return o[2]; }
    static void cycleFarPart() { NovaSettings.farPart = next(FAR_PART, NovaSettings.farPart); }
    static void cycleFarEnt() { NovaSettings.farEnt = next(FAR_ENT, NovaSettings.farEnt); }
    static String farName(int v) { return v <= 0 ? NovaLang.tr("No") : v + " " + NovaLang.tr("bloques"); }

    // ---- el Modo FPS vigila los FPS y sube o baja de nivel para acercarse al objetivo (30, 60, 90, 120 o 144) ----
    // Cada 3 s de juego (sin menús) mide la media. Si está por debajo del objetivo, baja un nivel más los ajustes (hasta MAXLVL);
    // si va muy sobrado durante 12 s seguidos, devuelve un nivel. No hay garantía física de llegar al objetivo: si con todos los recortes
    // no llega, el panel lo dice. Nunca se sube por encima de lo que tenía el jugador.

    private static long gFrames, gMs, gLast;
    private static int gHigh, gSettle;
    static int lastAvg;
    static boolean maxedLow;

    static void resetWindow() { gFrames = 0; gMs = 0; gLast = 0; gHigh = 0; gSettle = 2; lastAvg = 0; maxedLow = false; }

    /** Texto de estado para el panel. */
    static String status() {
        if (!NovaSettings.fpsOn) return "";
        return NovaLang.tr("Nivel {0}/{1}", level, MAXLVL) + (lastAvg > 0 ? " · " + lastAvg + " FPS" : "") + (maxedLow ? " · " + NovaLang.tr("no se llega al objetivo con este equipo") : "");
    }

    /** Un fotograma con el Modo FPS activo. Devuelve true si cambió el nivel (entonces hay que volver a aplicar las opciones). */
    static boolean govern(boolean inGame) {
        long now = System.nanoTime();
        long dt = gLast == 0 ? 0 : Math.min(500, (now - gLast) / 1_000_000L);
        gLast = now;
        if (!inGame) { gFrames = 0; gMs = 0; return false; }
        gFrames++; gMs += dt;
        if (gMs < 3000) return false;
        int avg = (int) (gFrames * 1000L / Math.max(1, gMs));
        gFrames = 0; gMs = 0;
        lastAvg = avg;
        if (gSettle > 0) { gSettle--; return false; }   // tras cambiar de nivel el juego recarga cosas: esa ventana no cuenta
        int goal = NovaSettings.fpsGoal;
        if (avg < goal * 0.95) {
            gHigh = 0;
            if (level < MAXLVL) { level++; maxedLow = false; gSettle = 2; return true; }
            maxedLow = true;
        } else if (avg > goal * 1.6 && level > 0) {
            if (++gHigh >= 4) { gHigh = 0; level--; maxedLow = false; gSettle = 2; return true; }
        } else { gHigh = 0; if (avg >= goal) maxedLow = false; }
        return false;
    }

    // ---- aviso «Va lento, ¿activar Modo FPS?» ----
    // Con la partida en marcha (sin menús abiertos), si la media de FPS de los últimos 10 s se queda por debajo de 40 durante 2 minutos seguidos,
    // se ofrece el Modo FPS una sola vez por sesión. «No volver a preguntar» se guarda en NovaSettings.

    static final int LOW_FPS = Integer.getInteger("nova.fpsask.fps", 40), WINDOW_S = 10;
    static final long LOW_MS = Long.getLong("nova.fpsask.ms", 120000L), SHOW_MS = 15000;
    private static final int[] ring = new int[WINDOW_S];
    private static int ringN, frames;
    private static long lastNs, secMs, lowMs;
    private static boolean asked;

    /** Un fotograma de vigilancia. Devuelve true cuando toca ofrecer el Modo FPS (una sola vez por sesión). */
    static boolean watch(boolean inGame) {
        if (NovaBenchCore.ON) return false;
        if (asked || NovaSettings.fpsNoAsk || NovaSettings.fpsOn) return false;
        long now = System.nanoTime();
        long dt = lastNs == 0 ? 0 : Math.min(500, (now - lastNs) / 1_000_000L);
        lastNs = now;
        if (!inGame) { frames = 0; secMs = 0; return false; }   // en menús no cuenta (ni suma ni resta)
        frames++;
        secMs += dt;
        if (secMs < 1000) return false;
        ring[ringN++ % WINDOW_S] = (int) (frames * 1000L / Math.max(1, secMs));
        frames = 0; secMs = 0;
        boolean low = false;
        if (ringN >= WINDOW_S) {
            int sum = 0;
            for (int v : ring) sum += v;
            low = sum / WINDOW_S < LOW_FPS;
        }
        lowMs = low ? lowMs + 1000 : 0;
        if (lowMs >= LOW_MS) { asked = true; return true; }
        return false;
    }
}
