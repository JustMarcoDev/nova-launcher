package dev.astrion.nova;

/** Cálculos comunes de los elementos del HUD (armadura, pociones, reloj, servidor). NovaX de cada proyecto lee los datos de Minecraft y los pasa por aquí. */
final class NovaXCore {
    private NovaXCore() { }

    /** Una pieza de armadura: el objeto, el porcentaje de durabilidad que queda (100 = sin usar) y si tiene durabilidad. */
    static final class Piece {
        final Object stack; final int pct; final boolean dmg;
        Piece(Object stack, int pct, boolean dmg) { this.stack = stack; this.pct = pct; this.dmg = dmg; }
    }

    /** Un efecto: nombre, nivel (1, 2…), segundos que quedan (-1 = infinito) y un color estable para su icono. */
    static final class Eff {
        final String name; final int lvl, secs, rgb;
        Eff(String name, int lvl, int secs, int rgb) { this.name = name; this.lvl = lvl; this.secs = secs; this.rgb = rgb; }
    }

    /** Durabilidad que queda en porcentaje (100 = sin usar). */
    static int pct(boolean damageable, int maxDamage, int damage) {
        return damageable ? Math.max(0, Math.min(100, Math.round(100f * (maxDamage - damage) / maxDamage))) : 100;
    }

    /** Segundos que quedan de un efecto en ticks (redondeando hacia arriba), o -1 si es infinito. */
    static int secs(boolean infinite, int durationTicks) { return infinite ? -1 : (durationTicks + 19) / 20; }

    /** Color estable según el nombre del efecto (así cada efecto tiene siempre el mismo). */
    static int hue(String key) {
        int h = 0;
        for (int i = 0; i < key.length(); i++) h = h * 31 + key.charAt(i);
        float hh = ((h & 0x7fffffff) % 360) / 360f;
        return java.awt.Color.HSBtoRGB(hh, 0.55f, 0.9f) & 0xFFFFFF;
    }

    /** Hora del mundo (0..23999 dentro del día) y número de día. Devuelve {tick del día, día}. */
    static long[] day(long t) { return new long[] { ((t % 24000L) + 24000L) % 24000L, t / 24000L + 1 }; }

    /** Datos de ejemplo del editor. */
    static long[] sampleDay() { return new long[] { 6000, 12 }; }

    /** Clave del servidor en el que se está: su dirección, «singleplayer» en un mundo propio, o "" fuera de partida. */
    static String serverKey(boolean inWorld, String address, boolean singleplayer) {
        if (!inWorld) return "";
        if (address != null && !address.isEmpty() && !singleplayer) return address.trim().toLowerCase(java.util.Locale.ROOT);
        return singleplayer ? "singleplayer" : "";
    }
}
