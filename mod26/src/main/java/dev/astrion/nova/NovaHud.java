package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import com.google.gson.JsonObject;
import java.util.ArrayDeque;
import java.util.List;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import com.mojang.blaze3d.platform.InputConstants;

/**
 * HUD de Nova (estilo Lunar): FPS, CPS (clic izquierdo y derecho), coordenadas con dirección y teclas (WASD, espacio y clics), más zoom con tecla.
 * Cada elemento se activa por separado y se coloca arrastrándolo desde «Editar HUD» (NovaHudScreen). Todo se guarda en menu.json.
 * Solo usa funciones de Minecraft que son iguales de 1.20 a 1.21.11; lo que cambia entre versiones va en las capas de mod/src/compat.
 */
public final class NovaHud {
    private NovaHud() { }

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
    public static final El[] ALL = { FPS, CPS, XYZ, KEYS, STATE };

    /** Zoom con tecla: activo, tecla (GLFW) y cuánto acerca (el campo de visión se multiplica por este número). */
    public static boolean zoomOn = true;
    public static int zoomKey = InputConstants.KEY_C;
    static final float ZOOM_MUL = 0.23f;

    // ---- guardar / leer (dentro de menu.json, lo llama NovaSettings) ----

    static void read(JsonObject o) {
        if (o == null) return;
        for (El e : ALL) {
            if (!o.has(e.id) || !o.get(e.id).isJsonObject()) continue;
            JsonObject j = o.getAsJsonObject(e.id);
            if (j.has("on")) e.on = j.get("on").getAsBoolean();
            if (j.has("x")) e.fx = clamp01(j.get("x").getAsFloat());
            if (j.has("y")) e.fy = clamp01(j.get("y").getAsFloat());
            if (j.has("s")) e.scale = clampS(j.get("s").getAsFloat());
        }
        if (o.has("zoom") && o.get("zoom").isJsonObject()) {
            JsonObject z = o.getAsJsonObject("zoom");
            if (z.has("on")) zoomOn = z.get("on").getAsBoolean();
            if (z.has(NovaVer.KEY)) { int k = z.get(NovaVer.KEY).getAsInt(); if (k > 0) zoomKey = k; }
        }
    }

    static JsonObject write() {
        JsonObject o = new JsonObject();
        for (El e : ALL) {
            JsonObject j = new JsonObject();
            j.addProperty("on", e.on); j.addProperty("x", Math.round(e.fx * 10000f) / 10000f); j.addProperty("y", Math.round(e.fy * 10000f) / 10000f);
            j.addProperty("s", Math.round(e.scale * 100f) / 100f);
            o.add(e.id, j);
        }
        JsonObject z = new JsonObject();
        z.addProperty("on", zoomOn); z.addProperty(NovaVer.KEY, zoomKey);
        o.add("zoom", z);
        return o;
    }

    public static void resetPositions() { for (El e : ALL) { e.fx = e.dfx; e.fy = e.dfy; e.scale = 1f; } }

    static float clamp01(float v) { return v < 0f ? 0f : v > 1f ? 1f : v; }

    public static final float SMIN = 0.5f, SMAX = 3f;
    public static float clampS(float v) { return v < SMIN ? SMIN : v > SMAX ? SMAX : v; }

    // ---- medidas y dibujo ----

    static final int U = 18, G = 2, KW = 3 * U + 2 * G, KH = 3 * (U + G) + 12;   // teclas: lado, hueco, ancho y alto del bloque

    static String fmt(int v) { return Integer.toString(v); }

    static String[] lines(Minecraft mc, El e, boolean sample) {
        boolean has = mc.player != null && !sample;
        if (e == FPS) return new String[] { fmt(mc.getFps()) + " FPS" };
        if (e == CPS) return new String[] { (has || sample ? cpsL() + " | " + cpsR() : "0 | 0") + " CPS" };
        if (e == XYZ) {
            int x = has ? (int) Math.floor(mc.player.getX()) : 0, y = has ? (int) Math.floor(mc.player.getY()) : 64, z = has ? (int) Math.floor(mc.player.getZ()) : 0;
            float yaw = has ? mc.player.getYRot() : 0f;
            return new String[] { "X " + x + "   Y " + y + "   Z " + z, dirName(yaw) + "   " + dirAxis(yaw) };
        }
        return new String[0];
    }

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

    /** Tamaño del elemento tal como se dibuja ahora. */
    public static int[] size(Minecraft mc, El e, boolean sample) {
        if (e == KEYS) return new int[] { KW, KH };
        if (e == STATE) { int w = 0; List<String[]> st = NovaMove.states(mc, sample); for (String[] z : st) w = Math.max(w, mc.font.width(z[0])); return new int[] { w + 20, st.size() * 11 + 3 }; }
        String[] L = lines(mc, e, sample);
        int w = 0;
        for (String s : L) w = Math.max(w, mc.font.width(s));
        return e == XYZ ? new int[] { w + 14, 28 } : new int[] { w + 10, L.length * 10 + 2 };
    }

    /** Tamaño en pantalla, ya con la escala del elemento. */
    public static int[] sizeS(Minecraft mc, El e, boolean sample) {
        int[] s = size(mc, e, sample);
        return new int[] { Math.max(1, Math.round(s[0] * e.scale)), Math.max(1, Math.round(s[1] * e.scale)) };
    }

    /** Dibuja el elemento con su escala; (x, y) es la esquina de arriba a la izquierda en pantalla. */
    public static void drawS(GuiGraphicsExtractor c, Minecraft mc, El e, int x, int y, boolean sample) {
        float k = e.scale;
        if (Math.abs(k - 1f) < 0.005f) { draw(c, mc, e, x, y, sample); return; }
        NovaCompat.pushScale(c, k);
        try { draw(c, mc, e, Math.round(x / k), Math.round(y / k), sample); } finally { NovaCompat.popScale(c); }
    }

    /** Posición en pantalla (esquina de arriba a la izquierda) de un elemento. */
    public static int[] pos(El e, int sw, int sh, int w, int h) {
        return new int[] { Math.round(e.fx * Math.max(0, sw - w)), Math.round(e.fy * Math.max(0, sh - h)) };
    }

    static int border() { return (NovaSettings.accent & 0xFFFFFF) | 0x66000000; }

    static void box(GuiGraphicsExtractor c, int x, int y, int w, int h, boolean lit) {
        NovaButton.panel(c, x, y, w, h, 3, lit ? ((NovaSettings.accent & 0xFFFFFF) | 0xC8000000) : 0x9A0C0C14, border());
    }

    static void label(GuiGraphicsExtractor c, Minecraft mc, String s, int cx, int y, int color) {
        c.text(mc.font, s, cx - mc.font.width(s) / 2, y, color, false);
    }

    static String keyLabel(KeyMapping k) {
        String s = k.getTranslatedKeyMessage().getString().toUpperCase(java.util.Locale.ROOT);
        return s.length() > 3 ? s.substring(0, 3) : s;
    }

    /** Dibuja un elemento en (x, y). sample = true en el editor sin partida (datos de ejemplo). */
    public static void draw(GuiGraphicsExtractor c, Minecraft mc, El e, int x, int y, boolean sample) {
        if (e == KEYS) {
            boolean f = mc.options.keyUp.isDown(), l = mc.options.keyLeft.isDown(), b = mc.options.keyDown.isDown(), r = mc.options.keyRight.isDown(), j = mc.options.keyJump.isDown();
            boolean lm = mouseDown(mc, 0), rm = mouseDown(mc, 1);
            int row = U + G, half = (KW - G) / 2;
            box(c, x + row, y, U, U, f);                  label(c, mc, keyLabel(mc.options.keyUp), x + row + U / 2, y + 5, f ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x, y + row, U, U, l);                  label(c, mc, keyLabel(mc.options.keyLeft), x + U / 2, y + row + 5, l ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x + row, y + row, U, U, b);            label(c, mc, keyLabel(mc.options.keyDown), x + row + U / 2, y + row + 5, b ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x + 2 * row, y + row, U, U, r);        label(c, mc, keyLabel(mc.options.keyRight), x + 2 * row + U / 2, y + row + 5, r ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x, y + 2 * row, half, U, lm);          label(c, mc, "LMB", x + half / 2, y + 2 * row + 5, lm ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x + half + G, y + 2 * row, KW - half - G, U, rm); label(c, mc, "RMB", x + half + G + (KW - half - G) / 2, y + 2 * row + 5, rm ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x, y + 3 * row, KW, 12, j);
            c.fill(x + KW / 2 - 12, y + 3 * row + 5, x + KW / 2 + 12, y + 3 * row + 7, j ? 0xFF101018 : 0xFFFFFFFF);
            return;
        }
        if (e == STATE) {
            List<String[]> st = NovaMove.states(mc, sample); int[] sz0 = size(mc, e, sample);
            NovaButton.panel(c, x, y, sz0[0], sz0[1], 3, 0x9A0C0C14, border());
            for (int i = 0; i < st.size(); i++) {
                boolean on = "1".equals(st.get(i)[1]);
                c.fill(x + 6, y + 5 + i * 11, x + 11, y + 10 + i * 11, on ? NovaSettings.accent : 0xFF555566);
                c.text(mc.font, st.get(i)[0], x + 15, y + 3 + i * 11, on ? 0xFFFFFFFF : 0xFFB8B8D8, true);
            }
            return;
        }
        String[] L = lines(mc, e, sample);
        int[] sz = size(mc, e, sample);
        if (e == XYZ) {
            // coordenadas: cada eje con su color y la dirección debajo, sobre un fondo más oscuro para que se lea bien con cualquier fondo
            NovaButton.panel(c, x, y, sz[0], sz[1], 3, 0xC0080810, border());
            c.fill(x + 3, y + 3, x + 4, y + sz[1] - 3, NovaSettings.accent);
            boolean has = mc.player != null && !sample;
            int[] v = { has ? (int) Math.floor(mc.player.getX()) : 0, has ? (int) Math.floor(mc.player.getY()) : 64, has ? (int) Math.floor(mc.player.getZ()) : 0 };
            int[] col = { 0xFFFF7B7B, 0xFF7BFF9A, 0xFF7BB8FF };
            String[] ax = { "X ", "Y ", "Z " };
            int cx = x + 8;
            for (int i = 0; i < 3; i++) {
                c.text(mc.font, ax[i], cx, y + 4, col[i], true);
                cx += mc.font.width(ax[i]);
                String num = Integer.toString(v[i]);
                c.text(mc.font, num, cx, y + 4, 0xFFFFFFFF, true);
                cx += mc.font.width(num + "   ");
            }
            float yaw = has ? mc.player.getYRot() : 0f;
            String nm = dirName(yaw);
            c.text(mc.font, nm, x + 8, y + 16, 0xFFFFFFFF, true);
            c.text(mc.font, dirAxis(yaw), x + 8 + mc.font.width(nm + "   "), y + 16, 0xFFB8B8D8, true);
            return;
        }
        NovaButton.panel(c, x, y, sz[0], sz[1], 3, 0x9A0C0C14, border());
        c.fill(x + 3, y + 3, x + 4, y + sz[1] - 3, NovaSettings.accent);   // barrita de acento
        for (int i = 0; i < L.length; i++) c.text(mc.font, L[i], x + 7, y + 2 + i * 10, i == 0 ? 0xFFFFFFFF : 0xFFB8B8D8, true);
    }

    /** Dibuja el HUD en la pantalla de la partida (lo llama HudMixin al final del HUD del juego). */
    private static final boolean TEST_EDIT = System.getProperty("nova.hudedit") != null;
    private static int testTick;

    public static void render(GuiGraphicsExtractor c) {
        try {
            Minecraft mc = Minecraft.getInstance();
            if (mc == null || mc.player == null) return;
            NovaSettings.load();
            NovaPresence.frame(mc);
            NovaServers.frame(mc);
            NovaMove.tick(mc);
            if (TEST_EDIT && NovaGui.screen(mc) == null && ++testTick == 240) NovaGui.setScreen(mc, new NovaHudScreen(null));   // solo para pruebas (-Dnova.hudedit=1)
            NovaChat.frame(c, mc);
            if (NovaGui.hidden(mc)) return;
            if (NovaGui.screen(mc) instanceof NovaHudScreen) return;   // el editor dibuja su propia vista previa
            pollMouse(mc);
            NovaShots.render(c, mc);
            NovaFps.frame(c, mc);
            int sw = c.guiWidth(), sh = c.guiHeight();
            for (El e : ALL) {
                if (!e.on || (e == STATE && NovaMove.states(mc, false).isEmpty())) continue;
                int[] s = sizeS(mc, e, false), p = pos(e, sw, sh, s[0], s[1]);
                drawS(c, mc, e, p[0], p[1], false);
            }
        } catch (Throwable t) { /* el HUD nunca debe tirar el juego */ }
    }

    // ---- CPS ----

    private static final ArrayDeque<Long> CL = new ArrayDeque<>(), CR = new ArrayDeque<>();
    private static boolean wasL, wasR;

    static boolean mouseDown(Minecraft mc, int button) {
        try { return NovaInput.mouse(mc, button); } catch (Throwable t) { return false; }
    }

    /** Cuenta los clics nuevos (pasar de suelto a pulsado) mirando el ratón en cada fotograma. Los clics dentro de menús no cuentan. */
    static void pollMouse(Minecraft mc) {
        boolean l = mouseDown(mc, 0), r = mouseDown(mc, 1);
        long now = System.currentTimeMillis();
        if (NovaGui.screen(mc) == null) {
            if (l && !wasL) CL.add(now);
            if (r && !wasR) CR.add(now);
        }
        wasL = l; wasR = r;
        while (!CL.isEmpty() && now - CL.peekFirst() > 1000) CL.pollFirst();
        while (!CR.isEmpty() && now - CR.peekFirst() > 1000) CR.pollFirst();
    }

    static int cpsL() { return CL.size(); }
    static int cpsR() { return CR.size(); }

    // ---- zoom ----

    private static float zoomCur = 1f, zoomP = 0f;
    private static long zoomT = System.nanoTime();
    private static boolean zoomHeld;
    private static Double sensOrig;

    /** Al soltar el zoom (o abrir un menú) devuelve la sensibilidad del ratón a como estaba. */
    private static void sensRestore(Minecraft mc) {
        if (sensOrig != null && mc != null) { try { mc.options.sensitivity().set(sensOrig); } catch (Throwable ignored) { } }
        sensOrig = null;
    }

    /** Con zoom el ratón se mueve en proporción al campo de visión: así la cámara no se escapa al girar (la sensibilidad de Minecraft va al cubo). */
    private static void sensScale(Minecraft mc, float m) {
        try {
            if (sensOrig == null) sensOrig = mc.options.sensitivity().get();
            double d0 = sensOrig * 0.6 + 0.2, d = d0 * Math.cbrt(Math.max(0.05, Math.min(1.0, m)));
            double v = (d - 0.2) / 0.6;
            mc.options.sensitivity().set(v < 0 ? 0.0 : Math.min(sensOrig, v));
        } catch (Throwable ignored) { }
    }

    /** Por cuánto se multiplica el campo de visión del mundo (1 = sin zoom). Entra y sale con una curva suave; lo llama FovMixin. */
    public static double zoomMul() {
        Minecraft mc = null;
        try {
            mc = Minecraft.getInstance();
            NovaSettings.load();
            boolean want = zoomOn && mc != null && mc.player != null && NovaGui.screen(mc) == null && zoomKey > 0
                    && NovaInput.key(zoomKey);
            long now = System.nanoTime();
            float dt = Math.min(0.1f, (now - zoomT) / 1e9f);
            zoomT = now;
            if (!want && mc != null && NovaGui.screen(mc) != null) zoomP = 0f;   // con un menú abierto no hay zoom
            else zoomP = Math.max(0f, Math.min(1f, zoomP + (want ? dt / 0.30f : -dt / 0.24f)));
            float e = zoomP * zoomP * (3f - 2f * zoomP);                         // entrada y salida suaves (smoothstep)
            zoomCur = (float) Math.pow(ZOOM_MUL, e);                             // interpolación geométrica: el acercamiento se nota parejo
            zoomHeld = zoomP > 0f;
            if (zoomHeld) sensScale(mc, zoomCur); else sensRestore(mc);
            return zoomCur;
        } catch (Throwable t) { sensRestore(mc); return 1.0; }
    }

    /** Nombre corto de una tecla GLFW para enseñarlo en el editor. */
    public static String keyName(int key) {
        switch (key) {
            case InputConstants.KEY_SPACE: return tr("Espacio");
            case InputConstants.KEY_LSHIFT: case InputConstants.KEY_RSHIFT: return "Shift";
            case InputConstants.KEY_LCONTROL: case InputConstants.KEY_RCONTROL: return "Ctrl";
            case InputConstants.KEY_LALT: case InputConstants.KEY_RALT: return "Alt";
            case InputConstants.KEY_TAB: return "Tab";
            case InputConstants.KEY_UP: return "↑"; case InputConstants.KEY_DOWN: return "↓"; case InputConstants.KEY_LEFT: return "←"; case InputConstants.KEY_RIGHT: return "→";
            default:
        }
        if (key >= InputConstants.KEY_F1 && key <= InputConstants.KEY_F12) return "F" + (key - InputConstants.KEY_F1 + 1);
        { String n = NovaInput.keyName(key); if (!n.isEmpty()) return n.toUpperCase(java.util.Locale.ROOT); }
        return "#" + key;
    }
}
