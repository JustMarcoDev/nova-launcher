package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import com.google.gson.JsonObject;
import java.util.ArrayDeque;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import org.lwjgl.glfw.GLFW;

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
        final boolean dOn; final float dfx, dfy;
        El(String id, boolean on, float fx, float fy) { this.id = id; this.on = dOn = on; this.fx = dfx = fx; this.fy = dfy = fy; }
        void reset() { on = dOn; fx = dfx; fy = dfy; }
    }

    public static final El FPS = new El("fps", true, 0.010f, 0.020f);
    public static final El CPS = new El("cps", true, 0.010f, 0.085f);
    public static final El XYZ = new El("xyz", true, 0.010f, 0.150f);
    public static final El KEYS = new El("keys", true, 0.010f, 0.420f);
    public static final El[] ALL = { FPS, CPS, XYZ, KEYS };

    /** Zoom con tecla: activo, tecla (GLFW) y cuánto acerca (el campo de visión se multiplica por este número). */
    public static boolean zoomOn = true;
    public static int zoomKey = GLFW.GLFW_KEY_C;
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
        }
        if (o.has("zoom") && o.get("zoom").isJsonObject()) {
            JsonObject z = o.getAsJsonObject("zoom");
            if (z.has("on")) zoomOn = z.get("on").getAsBoolean();
            if (z.has("key")) { int k = z.get("key").getAsInt(); if (k > 0) zoomKey = k; }
        }
    }

    static JsonObject write() {
        JsonObject o = new JsonObject();
        for (El e : ALL) {
            JsonObject j = new JsonObject();
            j.addProperty("on", e.on); j.addProperty("x", Math.round(e.fx * 10000f) / 10000f); j.addProperty("y", Math.round(e.fy * 10000f) / 10000f);
            o.add(e.id, j);
        }
        JsonObject z = new JsonObject();
        z.addProperty("on", zoomOn); z.addProperty("key", zoomKey);
        o.add("zoom", z);
        return o;
    }

    public static void resetPositions() { for (El e : ALL) { e.fx = e.dfx; e.fy = e.dfy; } }

    static float clamp01(float v) { return v < 0f ? 0f : v > 1f ? 1f : v; }

    // ---- medidas y dibujo ----

    static final int U = 18, G = 2, KW = 3 * U + 2 * G, KH = 3 * (U + G) + 12;   // teclas: lado, hueco, ancho y alto del bloque

    static String fmt(int v) { return Integer.toString(v); }

    static String[] lines(MinecraftClient mc, El e, boolean sample) {
        boolean has = mc.player != null && !sample;
        if (e == FPS) return new String[] { fmt(mc.getCurrentFps()) + " FPS" };
        if (e == CPS) return new String[] { (has || sample ? cpsL() + " | " + cpsR() : "0 | 0") + " CPS" };
        if (e == XYZ) {
            int x = has ? (int) Math.floor(mc.player.getX()) : 0, y = has ? (int) Math.floor(mc.player.getY()) : 64, z = has ? (int) Math.floor(mc.player.getZ()) : 0;
            float yaw = has ? mc.player.getYaw() : 0f;
            return new String[] { "XYZ: " + x + " " + y + " " + z, direction(yaw) };
        }
        return new String[0];
    }

    /** Dirección en la que mira el jugador (yaw 0 = sur, 90 = oeste, 180 = norte, 270 = este). */
    static String direction(float yaw) {
        float a = ((yaw % 360f) + 360f) % 360f;
        int i = Math.round(a / 45f) % 8;
        switch (i) {
            case 0: return tr("Sur") + " (+Z)";
            case 1: return tr("Suroeste") + " (+Z -X)";
            case 2: return tr("Oeste") + " (-X)";
            case 3: return tr("Noroeste") + " (-Z -X)";
            case 4: return tr("Norte") + " (-Z)";
            case 5: return tr("Noreste") + " (-Z +X)";
            case 6: return tr("Este") + " (+X)";
            default: return tr("Sureste") + " (+Z +X)";
        }
    }

    /** Tamaño del elemento tal como se dibuja ahora. */
    public static int[] size(MinecraftClient mc, El e, boolean sample) {
        return e == KEYS ? new int[] { KW, KH } : sizeOf(mc, lines(mc, e, sample));
    }

    /** Tamaño de un panel de texto con esas líneas (así el HUD solo calcula las líneas una vez por fotograma). */
    private static int[] sizeOf(MinecraftClient mc, String[] L) {
        int w = 0;
        for (String s : L) w = Math.max(w, mc.textRenderer.getWidth(s));
        return new int[] { w + 10, L.length * 10 + 2 };
    }

    /** Posición en pantalla (esquina de arriba a la izquierda) de un elemento. */
    public static int[] pos(El e, int sw, int sh, int w, int h) {
        return new int[] { Math.round(e.fx * Math.max(0, sw - w)), Math.round(e.fy * Math.max(0, sh - h)) };
    }

    static int border() { return (NovaSettings.accent & 0xFFFFFF) | 0x66000000; }

    static void box(DrawContext c, int x, int y, int w, int h, boolean lit) {
        NovaButton.panel(c, x, y, w, h, 3, lit ? ((NovaSettings.accent & 0xFFFFFF) | 0xC8000000) : 0x9A0C0C14, border());
    }

    static void label(DrawContext c, MinecraftClient mc, String s, int cx, int y, int color) {
        c.drawText(mc.textRenderer, s, cx - mc.textRenderer.getWidth(s) / 2, y, color, false);
    }

    static String keyLabel(KeyBinding k) {
        String s = k.getBoundKeyLocalizedText().getString().toUpperCase(java.util.Locale.ROOT);
        return s.length() > 3 ? s.substring(0, 3) : s;
    }

    /** Dibuja un elemento en (x, y). sample = true en el editor sin partida (datos de ejemplo). */
    public static void draw(DrawContext c, MinecraftClient mc, El e, int x, int y, boolean sample) {
        if (e == KEYS) {
            boolean f = mc.options.forwardKey.isPressed(), l = mc.options.leftKey.isPressed(), b = mc.options.backKey.isPressed(), r = mc.options.rightKey.isPressed(), j = mc.options.jumpKey.isPressed();
            boolean lm = mouseDown(mc, 0), rm = mouseDown(mc, 1);
            int row = U + G, half = (KW - G) / 2;
            box(c, x + row, y, U, U, f);                  label(c, mc, keyLabel(mc.options.forwardKey), x + row + U / 2, y + 5, f ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x, y + row, U, U, l);                  label(c, mc, keyLabel(mc.options.leftKey), x + U / 2, y + row + 5, l ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x + row, y + row, U, U, b);            label(c, mc, keyLabel(mc.options.backKey), x + row + U / 2, y + row + 5, b ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x + 2 * row, y + row, U, U, r);        label(c, mc, keyLabel(mc.options.rightKey), x + 2 * row + U / 2, y + row + 5, r ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x, y + 2 * row, half, U, lm);          label(c, mc, "LMB", x + half / 2, y + 2 * row + 5, lm ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x + half + G, y + 2 * row, KW - half - G, U, rm); label(c, mc, "RMB", x + half + G + (KW - half - G) / 2, y + 2 * row + 5, rm ? 0xFF101018 : 0xFFFFFFFF);
            box(c, x, y + 3 * row, KW, 12, j);
            c.fill(x + KW / 2 - 12, y + 3 * row + 5, x + KW / 2 + 12, y + 3 * row + 7, j ? 0xFF101018 : 0xFFFFFFFF);
            return;
        }
        String[] L = lines(mc, e, sample);
        drawText(c, mc, L, sizeOf(mc, L), x, y);
    }

    /** Panel de texto con sus líneas ya calculadas. */
    private static void drawText(DrawContext c, MinecraftClient mc, String[] L, int[] sz, int x, int y) {
        NovaButton.panel(c, x, y, sz[0], sz[1], 3, 0x9A0C0C14, border());
        c.fill(x + 3, y + 3, x + 4, y + sz[1] - 3, NovaSettings.accent);   // barrita de acento
        for (int i = 0; i < L.length; i++) c.drawText(mc.textRenderer, L[i], x + 7, y + 2 + i * 10, i == 0 ? 0xFFFFFFFF : 0xFFB8B8D8, true);
    }

    /** Dibuja el HUD en la pantalla de la partida (lo llama HudMixin al final del HUD del juego). */
    public static void render(DrawContext c) {
        try {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc == null || mc.player == null) return;
            NovaSettings.load();
            NovaPresence.frame(mc);
            if (mc.options.hudHidden) return;
            if (mc.currentScreen instanceof NovaHudScreen) return;   // el editor dibuja su propia vista previa
            pollMouse(mc);
            int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
            for (El e : ALL) {
                if (!e.on) continue;
                if (e == KEYS) { int[] p = pos(e, sw, sh, KW, KH); draw(c, mc, e, p[0], p[1], false); continue; }
                String[] L = lines(mc, e, false);
                int[] sz = sizeOf(mc, L), p = pos(e, sw, sh, sz[0], sz[1]);
                drawText(c, mc, L, sz, p[0], p[1]);
            }
        } catch (Throwable t) { /* el HUD nunca debe tirar el juego */ }
    }

    // ---- CPS ----

    private static final ArrayDeque<Long> CL = new ArrayDeque<>(), CR = new ArrayDeque<>();
    private static boolean wasL, wasR;

    static boolean mouseDown(MinecraftClient mc, int button) {
        try { return GLFW.glfwGetMouseButton(mc.getWindow().getHandle(), button) == GLFW.GLFW_PRESS; } catch (Throwable t) { return false; }
    }

    /** Cuenta los clics nuevos (pasar de suelto a pulsado) mirando el ratón en cada fotograma. Los clics dentro de menús no cuentan. */
    static void pollMouse(MinecraftClient mc) {
        boolean l = mouseDown(mc, 0), r = mouseDown(mc, 1);
        long now = System.currentTimeMillis();
        if (mc.currentScreen == null) {
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

    private static float zoomCur = 1f;
    private static long zoomT = System.nanoTime();
    private static boolean zoomHeld, prevSmooth;

    /** Por cuánto se multiplica el campo de visión del mundo (1 = sin zoom). Se suaviza con el tiempo; lo llama FovMixin. */
    public static double zoomMul() {
        try {
            MinecraftClient mc = MinecraftClient.getInstance();
            NovaSettings.load();
            boolean want = zoomOn && mc != null && mc.player != null && mc.currentScreen == null && zoomKey > 0
                    && GLFW.glfwGetKey(mc.getWindow().getHandle(), zoomKey) == GLFW.GLFW_PRESS;
            if (want != zoomHeld) {
                zoomHeld = want;
                if (want) { prevSmooth = mc.options.smoothCameraEnabled; mc.options.smoothCameraEnabled = true; }   // cámara suave mientras se hace zoom
                else mc.options.smoothCameraEnabled = prevSmooth;
            }
            long now = System.nanoTime();
            float dt = Math.min(0.1f, (now - zoomT) / 1e9f);
            zoomT = now;
            float target = want ? ZOOM_MUL : 1f;
            zoomCur += (target - zoomCur) * Math.min(1f, dt * 14f);
            if (Math.abs(zoomCur - target) < 0.002f) zoomCur = target;
            return zoomCur;
        } catch (Throwable t) { return 1.0; }
    }

    /** Nombre corto de una tecla GLFW para enseñarlo en el editor. */
    public static String keyName(int key) {
        switch (key) {
            case GLFW.GLFW_KEY_SPACE: return tr("Espacio");
            case GLFW.GLFW_KEY_LEFT_SHIFT: case GLFW.GLFW_KEY_RIGHT_SHIFT: return "Shift";
            case GLFW.GLFW_KEY_LEFT_CONTROL: case GLFW.GLFW_KEY_RIGHT_CONTROL: return "Ctrl";
            case GLFW.GLFW_KEY_LEFT_ALT: case GLFW.GLFW_KEY_RIGHT_ALT: return "Alt";
            case GLFW.GLFW_KEY_TAB: return "Tab";
            case GLFW.GLFW_KEY_UP: return "↑"; case GLFW.GLFW_KEY_DOWN: return "↓"; case GLFW.GLFW_KEY_LEFT: return "←"; case GLFW.GLFW_KEY_RIGHT: return "→";
            default:
        }
        if (key >= GLFW.GLFW_KEY_F1 && key <= GLFW.GLFW_KEY_F12) return "F" + (key - GLFW.GLFW_KEY_F1 + 1);
        try { String n = GLFW.glfwGetKeyName(key, 0); if (n != null && !n.isEmpty()) return n.toUpperCase(java.util.Locale.ROOT); } catch (Throwable ignored) { }
        return "#" + key;
    }
}
