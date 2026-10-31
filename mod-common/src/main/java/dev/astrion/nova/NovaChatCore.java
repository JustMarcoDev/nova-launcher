package dev.astrion.nova;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * «Chat mejorado» (lógica común): hora delante de cada mensaje, buscador, avisos de mención y copiado con clic derecho.
 * Aquí no hay ninguna clase de Minecraft: las líneas del chat se manejan con funciones que da cada proyecto (¿cierra el mensaje?, texto de la línea).
 * NovaChat de mod/ y mod26/ solo traduce Text/Component, ChatHud/ChatComponent, el campo del buscador y el dibujo.
 */
final class NovaChatCore {
    private NovaChatCore() { }

    private static final Pattern STAMP = Pattern.compile("^\\[\\d{2}:\\d{2}\\] ");
    static volatile String query = "";
    static volatile boolean dirty;
    static boolean wasRight, wasChat;
    static long copiedAt;

    static final long TOAST_MS = 1600;

    /** La hora que va delante del mensaje: «[hh:mm] ». */
    static String stamp() {
        LocalTime t = LocalTime.now();
        return String.format(Locale.ROOT, "[%02d:%02d] ", t.getHour(), t.getMinute());
    }

    /** ¿El mensaje nombra al jugador sin ser suyo? Su nombre tiene que salir después del primer «>», «:» o «»» (lo de antes es quien habla). */
    static boolean mentions(String s, String me) {
        if (me == null || me.isEmpty() || s == null) return false;
        String low = s.toLowerCase(Locale.ROOT), n = me.toLowerCase(Locale.ROOT);
        int sep = -1;
        for (int i = 0; i < low.length(); i++) { char ch = low.charAt(i); if (ch == '>' || ch == ':' || ch == '»') { sep = i; break; } }
        if (sep < 0) return false;   // sin «quién dice qué» (avisos del servidor, «X entró al juego»…) no cuenta
        int at = indexOfWord(low, n, 0);
        return at >= 0 && at >= sep;   // no aparece, o habla el propio jugador
    }

    private static int indexOfWord(String low, String n, int from) {
        int i = from;
        while ((i = low.indexOf(n, i)) >= 0) {
            boolean l = i == 0 || !isNameChar(low.charAt(i - 1)), r = i + n.length() >= low.length() || !isNameChar(low.charAt(i + n.length()));
            if (l && r) return i;
            i++;
        }
        return -1;
    }

    private static boolean isNameChar(char c) { return Character.isLetterOrDigit(c) || c == '_'; }

    /** Texto buscado nuevo; devuelve true si cambió (entonces hay que recargar el chat). */
    static boolean setQuery(String s) {
        String q = s == null ? "" : s.trim();
        if (q.equals(query)) return false;
        query = q;
        return true;
    }

    /** Texto de un mensaje a partir de sus líneas visibles (de la de arriba, top, a la de abajo, bottom). */
    static <T> String entryText(List<T> v, int bottom, int top, Function<T, String> lineText) {
        StringBuilder sb = new StringBuilder();
        for (int k = top; k >= bottom; k--) {
            String t = lineText.apply(v.get(k)).trim();
            if (t.isEmpty()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(t);
        }
        return sb.toString();
    }

    /** Deja solo los mensajes que contienen lo buscado (un mensaje son varias líneas seguidas: la de abajo es la que cierra el mensaje). */
    static <T> void filter(List<T> v, Predicate<T> endOfEntry, Function<T, String> lineText) {
        String q = query;
        if (q.isEmpty() || v == null || v.isEmpty()) return;
        String low = q.toLowerCase(Locale.ROOT);
        List<T> keep = new ArrayList<>();
        int n = v.size(), i = 0;
        while (i < n) {
            int t = i;
            while (t + 1 < n && !endOfEntry.test(v.get(t + 1))) t++;
            if (entryText(v, i, t, lineText).toLowerCase(Locale.ROOT).contains(low)) for (int k = i; k <= t; k++) keep.add(v.get(k));
            i = t + 1;
        }
        v.clear();
        v.addAll(keep);
    }

    /** Qué línea del chat hay bajo el ratón (-1 = ninguna). mx,my en píxeles de la interfaz; sc = escala del chat; lh = alto de línea; maxW = ancho del chat. */
    static int lineAt(double mx, double my, int sh, double sc, double lh, double maxW, int shown, double scrolled, int size) {
        double cx = mx / sc - 4.0, cy = (sh - my - 40.0) / (sc * lh);
        if (cx < -4.0 || cx > Math.floor(maxW / sc)) return -1;
        if (cy < 0.0 || cy >= shown) return -1;
        int i = (int) Math.floor(cy + scrolled);
        return i < 0 || i >= size ? -1 : i;
    }

    /** El texto del mensaje que contiene la línea i, sin la hora (vacío si no hay nada que copiar). */
    static <T> String entryAt(List<T> v, int i, Predicate<T> endOfEntry, Function<T, String> lineText) {
        int b = i;
        while (b > 0 && !endOfEntry.test(v.get(b))) b--;   // hacia abajo hasta la línea que cierra el mensaje
        int t = b;
        while (t + 1 < v.size() && !endOfEntry.test(v.get(t + 1))) t++;
        return STAMP.matcher(entryText(v, b, t, lineText)).replaceFirst("");
    }

    /** Transparencia del aviso «copiado» según su edad (0 = ya no se ve). */
    static float toastAlpha(long age) { return Math.min(1f, age / 120f) * Math.min(1f, (TOAST_MS - age) / 300f); }

    /** Cuánto sube el aviso al aparecer (píxeles que le faltan por subir). */
    static int toastRise(long age) { return (int) ((1f - Math.min(1f, age / 120f)) * 6); }
}
