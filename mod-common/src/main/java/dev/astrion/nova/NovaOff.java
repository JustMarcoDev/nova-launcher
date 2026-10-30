package dev.astrion.nova;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Interruptores a distancia: el launcher lee nova-config.json (firmado) y pasa las funciones apagadas con -Dnova.off=presence,cape,bench,toasts…
 * El mod las respeta aquí; sin la propiedad, todo está encendido.
 */
final class NovaOff {
    private NovaOff() { }

    private static final Set<String> OFF = new HashSet<>();
    static {
        for (String s : System.getProperty("nova.off", "").split(",")) { s = s.trim().toLowerCase(Locale.ROOT); if (!s.isEmpty()) OFF.add(s); }
    }

    /** ¿Esta función está apagada a distancia? (presence, cape, bench, toasts, selftest nunca se apaga) */
    static boolean has(String feature) { return OFF.contains(feature.toLowerCase(Locale.ROOT)); }

    static String list() { String[] a = OFF.toArray(new String[0]); Arrays.sort(a); return String.join(",", a); }
}
