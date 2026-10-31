package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import com.google.gson.JsonObject;
import java.util.ArrayDeque;
import java.util.List;

/**
 * HUD de Nova (lógica común): los elementos (FPS, CPS, coordenadas, teclas, estado, armadura, pociones, reloj, brújula), su posición y escala, los perfiles por servidor,
 * el guardado en menu.json, el recuento de clics por segundo, el estado del zoom y los textos (direcciones, números romanos, tiempos).
 * El dibujo y todo lo que toca Minecraft está en NovaHud de cada proyecto (que hereda de esta clase, así los demás siguen usando NovaHud.FPS, NovaHud.profileNames()…).
 */
abstract class NovaHudCore {
    NovaHudCore() { }

    /** Un elemento del HUD: si está activo y dónde está (fx, fy = fracción 0..1 del espacio libre de la pantalla, así sirve con cualquier tamaño de ventana). */
    public static final class El {
        public final String id;
        public boolean on;
        public float fx, fy;
        /** Tamaño del elemento (1 = normal). Se cambia arrastrando la esquina en «Editar HUD». */
        public float scale = 1f;
        final boolean dOn; final float dfx, dfy;
        El(String id, boolean on, float fx, float fy) { this.id = id; this.on = dOn = on; this.fx = dfx = fx; this.fy = dfy = fy; }
        void reset() { on = dOn; fx = dfx; fy = dfy; scale = 1f; }
    }

    public static final El FPS = new El("fps", true, 0.010f, 0.020f);

    public static final El CPS = new El("cps", true, 0.010f, 0.085f);

    public static final El XYZ = new El("xyz", true, 0.010f, 0.150f);

    public static final El KEYS = new El("keys", true, 0.010f, 0.420f);

    /** «Estado»: enseña si el freelook, el sprint fijo y el agacharse fijo están en marcha (apagado de fábrica). */
    public static final El STATE = new El("state", false, 0.010f, 0.600f);

    /** Elementos nuevos (apagados de fábrica): armadura, pociones, reloj y brújula. */
    public static final El ARMOR = new El("armor", false, 0.010f, 0.700f);

    public static final El POTS = new El("pots", false, 0.880f, 0.300f);

    public static final El CLOCK = new El("clock", false, 0.010f, 0.880f);

    public static final El COMPASS = new El("compass", false, 0.500f, 0.020f);

    public static final El[] ALL = { FPS, CPS, XYZ, KEYS, STATE, ARMOR, POTS, CLOCK, COMPASS };

    /** Zoom con tecla: activo, tecla (GLFW) y cuánto acerca (el campo de visión se multiplica por este número). */
    public static boolean zoomOn = true;

    public static int zoomKey = NovaMc.defaultZoomKey();

    static final float ZOOM_MUL = 0.23f;

    static void read(JsonObject o) {
        if (o == null) return;
        readEls(o);
        if (o.has("zoom") && o.get("zoom").isJsonObject()) {
            JsonObject z = o.getAsJsonObject("zoom");
            if (z.has("on")) zoomOn = z.get("on").getAsBoolean();
            if (z.has(NovaMc.keyProp())) { int k = z.get(NovaMc.keyProp()).getAsInt(); if (k > 0) zoomKey = k; }
        }
    }

    /** Solo la distribución de los elementos (la que cambia con cada perfil). */
    static void readEls(JsonObject o) {
        if (o == null) return;
        for (El e : ALL) {
            if (!o.has(e.id) || !o.get(e.id).isJsonObject()) continue;
            JsonObject j = o.getAsJsonObject(e.id);
            if (j.has("on")) e.on = j.get("on").getAsBoolean();
            if (j.has("x")) e.fx = clamp01(j.get("x").getAsFloat());
            if (j.has("y")) e.fy = clamp01(j.get("y").getAsFloat());
            if (j.has("s")) e.scale = clampS(j.get("s").getAsFloat());
        }
    }

    static JsonObject write() {
        JsonObject o = layout();
        JsonObject z = new JsonObject();
        z.addProperty("on", zoomOn); z.addProperty(NovaMc.keyProp(), zoomKey);
        o.add("zoom", z);
        return o;
    }

    /** La distribución actual de los elementos (lo que guarda cada perfil). */
    static JsonObject layout() {
        JsonObject o = new JsonObject();
        for (El e : ALL) {
            JsonObject j = new JsonObject();
            j.addProperty("on", e.on); j.addProperty("x", Math.round(e.fx * 10000f) / 10000f); j.addProperty("y", Math.round(e.fy * 10000f) / 10000f);
            j.addProperty("s", Math.round(e.scale * 100f) / 100f);
            o.add(e.id, j);
        }
        return o;
    }

    public static final String DEFAULT = "default";

    static final java.util.LinkedHashMap<String, JsonObject> PROFILES = new java.util.LinkedHashMap<>();

    static final java.util.LinkedHashMap<String, String> RULES = new java.util.LinkedHashMap<>();

    /** Perfil en uso ahora. */
    public static String profile = DEFAULT;

    static String lastKey;

    static void readProfiles(JsonObject o) {
        if (o == null) return;
        PROFILES.clear(); RULES.clear();
        if (o.has("hudProfiles") && o.get("hudProfiles").isJsonObject())
            for (var en : o.getAsJsonObject("hudProfiles").entrySet()) if (en.getValue().isJsonObject() && !en.getKey().isEmpty()) PROFILES.put(en.getKey(), en.getValue().getAsJsonObject());
        if (o.has("hudRules") && o.get("hudRules").isJsonObject())
            for (var en : o.getAsJsonObject("hudRules").entrySet()) if (en.getValue().isJsonPrimitive()) RULES.put(en.getKey(), en.getValue().getAsString());
        profile = o.has("hudProfile") ? o.get("hudProfile").getAsString() : DEFAULT;
        if (profile.isEmpty() || (!profile.equals(DEFAULT) && !PROFILES.containsKey(profile))) profile = DEFAULT;
        RULES.values().removeIf(v -> !v.equals(DEFAULT) && !PROFILES.containsKey(v));
    }

    static void writeProfiles(JsonObject o) {
        PROFILES.put(profile, layout());
        if (!PROFILES.containsKey(DEFAULT)) { PROFILES.put(DEFAULT, new JsonObject()); }
        JsonObject ps = new JsonObject(), rs = new JsonObject();
        for (var en : PROFILES.entrySet()) ps.add(en.getKey(), en.getValue());
        for (var en : RULES.entrySet()) rs.addProperty(en.getKey(), en.getValue());
        o.add("hudProfiles", ps); o.add("hudRules", rs); o.addProperty("hudProfile", profile);
    }

    /** Nombre para enseñar: el predeterminado se llama «Predeterminado». */
    public static String profileLabel(String n) { return DEFAULT.equals(n) ? tr("Predeterminado") : n; }

    public static java.util.List<String> profileNames() {
        java.util.List<String> l = new java.util.ArrayList<>();
        l.add(DEFAULT);
        for (String k : PROFILES.keySet()) if (!k.equals(DEFAULT)) l.add(k);
        return l;
    }

    /** Pasa a otro perfil: guarda el actual y aplica la distribución del otro. */
    public static void switchTo(String name) {
        if (name == null || name.equals(profile)) return;
        PROFILES.put(profile, layout());
        for (El e : ALL) e.reset();
        JsonObject o = PROFILES.get(name);
        if (o != null) readEls(o);
        profile = name;
    }

    public static void cycleProfile(int dir) {
        java.util.List<String> l = profileNames();
        int i = Math.max(0, l.indexOf(profile));
        switchTo(l.get(((i + dir) % l.size() + l.size()) % l.size()));
    }

    static String uniqueName(String base) {
        String n = base; int k = 2;
        while (n.equals(DEFAULT) || PROFILES.containsKey(n)) n = base + " " + (k++);
        return n;
    }

    public static void profileNew() {
        String n = uniqueName(tr("Perfil"));
        PROFILES.put(profile, layout());
        PROFILES.put(n, new JsonObject());
        switchTo(n);
    }

    public static void profileDup() {
        String n = uniqueName(profileLabel(profile).replaceAll(" \\d+$", ""));
        PROFILES.put(n, layout());
        PROFILES.put(profile, layout());
        switchTo(n);
    }

    /** Cambia el nombre del perfil en uso (el predeterminado no se renombra). Devuelve false si el nombre no vale. */
    public static boolean profileRename(String name) {
        name = name == null ? "" : name.trim();
        if (profile.equals(DEFAULT) || name.isEmpty() || name.length() > 24 || name.equals(DEFAULT) || PROFILES.containsKey(name)) return false;
        PROFILES.put(profile, layout());
        PROFILES.put(name, PROFILES.remove(profile));
        final String old = profile, nn = name;
        RULES.replaceAll((k, v) -> v.equals(old) ? nn : v);
        profile = name;
        return true;
    }

    public static void profileDelete() {
        if (profile.equals(DEFAULT)) return;
        String old = profile;
        switchTo(DEFAULT);
        PROFILES.remove(old);
        RULES.values().removeIf(v -> v.equals(old));
    }

    /** Perfil asignado a la partida actual, o null. */
    public static String ruleFor(String key) { return key.isEmpty() ? null : RULES.get(key); }

    public static void ruleSet(String key, String name) { if (!key.isEmpty()) RULES.put(key, name); }

    public static void ruleClear(String key) { RULES.remove(key); }

    /** Al entrar en un servidor aplica su perfil y al salir vuelve al predeterminado. Barato: solo hace algo cuando cambia el servidor. */
    static void syncServer(String k) {
        if (k.equals(lastKey)) return;
        lastKey = k;
        String want = DEFAULT, r = ruleFor(k);
        if (r != null && (r.equals(DEFAULT) || PROFILES.containsKey(r))) want = r;
        if (!want.equals(profile)) { switchTo(want); NovaSettings.save(); }
    }

    public static void resetPositions() { for (El e : ALL) { e.fx = e.dfx; e.fy = e.dfy; e.scale = 1f; } }

    static float clamp01(float v) { return v < 0f ? 0f : v > 1f ? 1f : v; }

    public static final float SMIN = 0.5f, SMAX = 3f;

    public static float clampS(float v) { return v < SMIN ? SMIN : v > SMAX ? SMAX : v; }

    static final int U = 18, G = 2, KW = 3 * U + 2 * G, KH = 3 * (U + G) + 12;   // teclas: lado, hueco, ancho y alto del bloque

    static String fmt(int v) { return Integer.toString(v); }

    /** Dirección en la que mira el jugador (yaw 0 = sur, 90 = oeste, 180 = norte, 270 = este). */
    static int dirIdx(float yaw) { return Math.round((((yaw % 360f) + 360f) % 360f) / 45f) % 8; }

    static String dirName(float yaw) {
        switch (dirIdx(yaw)) {
            case 0: return tr("Sur");
            case 1: return tr("Suroeste");
            case 2: return tr("Oeste");
            case 3: return tr("Noroeste");
            case 4: return tr("Norte");
            case 5: return tr("Noreste");
            case 6: return tr("Este");
            default: return tr("Sureste");
        }
    }

    static String dirAxis(float yaw) {
        switch (dirIdx(yaw)) {
            case 0: return "+Z";
            case 1: return "+Z -X";
            case 2: return "-X";
            case 3: return "-Z -X";
            case 4: return "-Z";
            case 5: return "-Z +X";
            case 6: return "+X";
            default: return "+Z +X";
        }
    }

    /** Posición en pantalla (esquina de arriba a la izquierda) de un elemento. */
    public static int[] pos(El e, int sw, int sh, int w, int h) {
        return new int[] { Math.round(e.fx * Math.max(0, sw - w)), Math.round(e.fy * Math.max(0, sh - h)) };
    }

    static final int POTS_MAX = 6;

    static String roman(int n) {
        String[] r = { "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X" };
        return n >= 1 && n < r.length ? r[n] : Integer.toString(n);
    }

    static String effLabel(NovaXCore.Eff f) { return f.name + (f.lvl > 1 ? " " + roman(f.lvl) : ""); }

    static String effTime(NovaXCore.Eff f) {
        if (f.secs < 0) return "\u221e";
        return (f.secs / 60) + ":" + (f.secs % 60 < 10 ? "0" : "") + (f.secs % 60);
    }

    static String two(long v) { return v < 10 ? "0" + v : Long.toString(v); }

    static int durColor(int pct) { return pct > 60 ? 0xFF55FF55 : pct > 30 ? 0xFFFFFF55 : 0xFFFF5555; }

    static final ArrayDeque<Long> CL = new ArrayDeque<>(), CR = new ArrayDeque<>();

    static boolean wasL, wasR;

    static int cpsL() { return CL.size(); }

    static int cpsR() { return CR.size(); }

    static float zoomCur = 1f, zoomP = 0f;

    static long zoomT = System.nanoTime();

    static boolean zoomHeld;

    /** Solo para el robot de pruebas (NovaSelfTest): finge que la tecla de zoom está pulsada. */
    static volatile boolean zoomForce;

    // ---- CPS y zoom: el cálculo (lo que lee el ratón y el teclado lo pone NovaHud) ----

    /** Cuenta los clics nuevos (pasar de suelto a pulsado). Los clics dentro de menús no cuentan. */
    static void poll(boolean l, boolean r, boolean menuOpen) {
        long now = System.currentTimeMillis();
        if (!menuOpen) {
            if (l && !wasL) CL.add(now);
            if (r && !wasR) CR.add(now);
        }
        wasL = l; wasR = r;
        while (!CL.isEmpty() && now - CL.peekFirst() > 1000) CL.pollFirst();
        while (!CR.isEmpty() && now - CR.peekFirst() > 1000) CR.pollFirst();
    }

    /** Un paso del zoom: entra y sale con una curva suave (sin animación con «reducir movimiento»). Devuelve por cuánto se multiplica el campo de visión. */
    static float zoomStep(boolean want, boolean menuOpen) {
        long now = System.nanoTime();
        float dt = Math.min(0.1f, (now - zoomT) / 1e9f);
        zoomT = now;
        if (!want && menuOpen) zoomP = 0f;   // con un menú abierto no hay zoom
        else zoomP = NovaAcc.still() ? (want ? 1f : 0f) : Math.max(0f, Math.min(1f, zoomP + (want ? dt / 0.30f : -dt / 0.24f)));
        float e = zoomP * zoomP * (3f - 2f * zoomP);   // entrada y salida suaves (smoothstep)
        zoomCur = (float) Math.pow(ZOOM_MUL, e);       // interpolación geométrica: el acercamiento se nota parejo
        zoomHeld = zoomP > 0f;
        return zoomCur;
    }

    static boolean zooming() { return zoomHeld; }

    /** Sensibilidad con zoom: el ratón se mueve en proporción al campo de visión, así la cámara no se escapa al girar (la sensibilidad de Minecraft va al cubo). */
    static double sensFor(double orig, float m) {
        double d0 = orig * 0.6 + 0.2, d = d0 * Math.cbrt(Math.max(0.05, Math.min(1.0, m)));
        double v = (d - 0.2) / 0.6;
        return v < 0 ? 0.0 : Math.min(orig, v);
    }
}
