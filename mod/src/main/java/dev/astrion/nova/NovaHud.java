package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.util.List;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import org.lwjgl.glfw.GLFW;

/**
 * HUD de Nova (estilo Lunar): FPS, CPS (clic izquierdo y derecho), coordenadas con dirección y teclas (WASD, espacio y clics), más zoom con tecla.
 * Cada elemento se activa por separado y se coloca arrastrándolo desde «Editar HUD» (NovaHudScreen). Todo se guarda en menu.json.
 * Solo usa funciones de Minecraft que son iguales de 1.20 a 1.21.11; lo que cambia entre versiones va en las capas de mod/src/compat.
 */
public final class NovaHud extends NovaHudCore {
    private NovaHud() { }




    // ---- guardar / leer (dentro de menu.json, lo llama NovaSettings) ----





    // ---- perfiles del HUD (uno por servidor) ----
    // menu.json guarda «hudProfiles» (nombre → distribución), «hudRules» (dirección del servidor o «singleplayer» → nombre) y «hudProfile» (el que está en uso).
    // La distribución de «hud» es siempre la del perfil en uso. Al entrar en un servidor se aplica su perfil y al salir, el predeterminado.













    /** Al entrar en un servidor aplica su perfil y al salir vuelve al predeterminado (la lógica está en NovaHudCore). */
    static void syncServer(MinecraftClient mc) { syncServer(currentKey(mc)); }

    /** El servidor (o «singleplayer») en el que está el jugador ahora, o "" si no está en una partida. */
    public static String currentKey(MinecraftClient mc) { return NovaX.serverKey(mc); }







    // ---- medidas y dibujo ----



    static String[] lines(MinecraftClient mc, El e, boolean sample) {
        boolean has = mc.player != null && !sample;
        if (e == FPS) return new String[] { fmt(mc.getCurrentFps()) + " FPS" };
        if (e == CPS) return new String[] { (has || sample ? cpsL() + " | " + cpsR() : "0 | 0") + " CPS" };
        if (e == XYZ) {
            int x = has ? (int) Math.floor(mc.player.getX()) : 0, y = has ? (int) Math.floor(mc.player.getY()) : 64, z = has ? (int) Math.floor(mc.player.getZ()) : 0;
            float yaw = has ? mc.player.getYaw() : 0f;
            return new String[] { "X " + x + "   Y " + y + "   Z " + z, dirName(yaw) + "   " + dirAxis(yaw) };
        }
        return new String[0];
    }




    /** Tamaño del elemento tal como se dibuja ahora. */
    public static int[] size(MinecraftClient mc, El e, boolean sample) {
        if (e == KEYS) return new int[] { KW, KH };
        if (e == ARMOR) return new int[] { 26 + NovaX.width(mc, "100%") + 10, Math.max(1, NovaX.armor(mc, sample).size()) * 18 + 4 };
        if (e == POTS) {
            List<NovaXCore.Eff> L = NovaX.effects(mc, sample);
            int w = 0;
            for (NovaXCore.Eff f : L.subList(0, Math.min(L.size(), POTS_MAX))) w = Math.max(w, NovaX.width(mc, effLabel(f)) + 6 + NovaX.width(mc, effTime(f)));
            return new int[] { 24 + Math.max(w, 60) + 6, Math.max(1, Math.min(L.size(), POTS_MAX)) * 16 + 4 };
        }
        if (e == CLOCK) { String[] c = clockLines(mc, sample); return new int[] { Math.max(NovaX.width(mc, c[0]), NovaX.width(mc, c[1])) + 14, 26 }; }
        if (e == COMPASS) return new int[] { 132, 24 };
        if (e == STATE) { int w = 0; List<String[]> st = NovaMove.states(sample); for (String[] z : st) w = Math.max(w, mc.textRenderer.getWidth(z[0])); return new int[] { w + 20, st.size() * 11 + 3 }; }
        String[] L = lines(mc, e, sample);
        int w = 0;
        for (String s : L) w = Math.max(w, mc.textRenderer.getWidth(s));
        return e == XYZ ? new int[] { w + 14, 28 } : new int[] { w + 10, L.length * 10 + 2 };
    }

    /** Tamaño en pantalla, ya con la escala del elemento. */
    public static int[] sizeS(MinecraftClient mc, El e, boolean sample) {
        int[] s = size(mc, e, sample);
        float k = e.scale * NovaAcc.text();
        return new int[] { Math.max(1, Math.round(s[0] * k)), Math.max(1, Math.round(s[1] * k)) };
    }

    /** Dibuja el elemento con su escala; (x, y) es la esquina de arriba a la izquierda en pantalla. */
    public static void drawS(DrawContext c, MinecraftClient mc, El e, int x, int y, boolean sample) {
        float k = e.scale * NovaAcc.text();
        if (Math.abs(k - 1f) < 0.005f) { draw(c, mc, e, x, y, sample); return; }
        NovaCompat.pushScale(c, k);
        try { draw(c, mc, e, Math.round(x / k), Math.round(y / k), sample); } finally { NovaCompat.popScale(c); }
    }


    static int border() { return (NovaSettings.accent & 0xFFFFFF) | 0x66000000; }

    static void box(DrawContext c, int x, int y, int w, int h, boolean lit) {
        NovaButton.panel(c, x, y, w, h, 3, lit ? ((NovaSettings.accent & 0xFFFFFF) | 0xC8000000) : 0x9A0C0C14, border());
    }

    static void label(DrawContext c, MinecraftClient mc, String s, int cx, int y, int color) {
        NovaX.text(c, mc, s, cx - mc.textRenderer.getWidth(s) / 2, y, color, false);
    }

    static String keyLabel(KeyBinding k) {
        String s = k.getBoundKeyLocalizedText().getString().toUpperCase(java.util.Locale.ROOT);
        return s.length() > 3 ? s.substring(0, 3) : s;
    }


    // ---- elementos nuevos: armadura, pociones, reloj y brújula ----






    /** Reloj: línea 1 = hora real; línea 2 = día y hora del mundo (el día de Minecraft empieza a las 6:00). */
    static String[] clockLines(MinecraftClient mc, boolean sample) {
        java.time.LocalTime now = java.time.LocalTime.now();
        long[] w = NovaX.world(mc, sample);
        long h = (w[0] / 1000 + 6) % 24, m = (w[0] % 1000) * 60 / 1000;
        return new String[] { two(now.getHour()) + ":" + two(now.getMinute()), tr("Día") + " " + w[1] + " \u00b7 " + two(h) + ":" + two(m) };
    }


    static void drawExtra(DrawContext c, MinecraftClient mc, El e, int x, int y, boolean sample) {
        int[] sz = size(mc, e, sample);
        NovaButton.panel(c, x, y, sz[0], sz[1], 3, 0x9A0C0C14, border());
        if (e == ARMOR) {
            List<NovaXCore.Piece> L = NovaX.armor(mc, sample);
            if (L.isEmpty()) { NovaX.text(c, mc, "\u2014", x + 8, y + 7, 0xFF8888A8, true); return; }
            for (int i = 0; i < L.size(); i++) {
                NovaXCore.Piece p = L.get(i);
                NovaX.drawItem(c, p.stack, x + 4, y + 2 + i * 18);
                String t = p.dmg ? p.pct + "%" : "\u221e";
                NovaX.text(c, mc, t, x + 24, y + 2 + i * 18 + 4, p.dmg ? durColor(p.pct) : 0xFFB8B8D8, true);
            }
            return;
        }
        if (e == POTS) {
            List<NovaXCore.Eff> L = NovaX.effects(mc, sample);
            if (L.isEmpty()) { NovaX.text(c, mc, "\u2014", x + 8, y + 5, 0xFF8888A8, true); return; }
            boolean blink = !NovaAcc.still() && ((System.currentTimeMillis() / 300L) & 1L) == 0;
            for (int i = 0; i < Math.min(L.size(), POTS_MAX); i++) {
                NovaXCore.Eff f = L.get(i);
                boolean low = f.secs >= 0 && f.secs < 10;
                int yy = y + 2 + i * 16, a = low && blink ? 0x55000000 : 0xFF000000;
                NovaButton.panel(c, x + 4, yy + 1, 13, 13, 3, a | f.rgb, NovaAcc.hc() ? 0xFFFFFFFF : 0);
                String ini = f.name.isEmpty() ? "?" : f.name.substring(0, 1).toUpperCase(java.util.Locale.ROOT);
                NovaX.text(c, mc, ini, x + 4 + (13 - NovaX.width(mc, ini)) / 2, yy + 3, low && blink ? 0x55101018 : 0xFF101018, false);
                NovaX.text(c, mc, effLabel(f), x + 22, yy + 4, low && blink ? 0x55FFFFFF : 0xFFFFFFFF, true);
                String t = effTime(f);
                NovaX.text(c, mc, t, x + sz[0] - 6 - NovaX.width(mc, t), yy + 4, low ? (blink || NovaAcc.still() ? 0xFFFF5555 : 0x55FF5555) : 0xFFB8B8D8, true);
            }
            return;
        }
        if (e == CLOCK) {
            String[] l = clockLines(mc, sample);
            c.fill(x + 3, y + 3, x + 4, y + sz[1] - 3, NovaSettings.accent);
            NovaX.text(c, mc, l[0], x + 8, y + 4, 0xFFFFFFFF, true);
            NovaX.text(c, mc, l[1], x + 8, y + 15, 0xFFB8B8D8, true);
            return;
        }
        // brújula: una barra con N, E, S, O y marcas cada 15\u00b0; el rumbo en grados abajo, en el centro
        float head = (NovaX.yaw(mc) + 180f) % 360f; if (head < 0) head += 360f;
        int span = 60, cx = x + sz[0] / 2, half = sz[0] / 2 - 4;
        float ppd = half / (float) span;
        String[] names = { tr("N"), tr("E"), tr("S"), tr("O") };
        for (int d = (int) Math.floor(head - span); d <= (int) Math.ceil(head + span); d++) {
            int a = ((d % 360) + 360) % 360;
            if (a % 15 != 0) continue;
            int px = cx + Math.round((d - head) * ppd);
            if (px < x + 4 || px > x + sz[0] - 4) continue;
            if (a % 90 == 0) { String n = names[a / 90]; NovaX.text(c, mc, n, px - NovaX.width(mc, n) / 2, y + 3, a == 0 ? 0xFFFF7B7B : 0xFFFFFFFF, true); }
            else c.fill(px, y + 4, px + 1, y + (a % 45 == 0 ? 10 : 8), 0xFFB8B8D8);
        }
        c.fill(cx - 1, y + 12, cx + 1, y + 14, NovaSettings.accent);
        String g = Math.round(head) % 360 + "\u00b0";
        NovaX.text(c, mc, g, cx - NovaX.width(mc, g) / 2, y + 14, 0xFFFFFFFF, true);
    }

    /** Dibuja un elemento en (x, y). sample = true en el editor sin partida (datos de ejemplo). */
    public static void draw(DrawContext c, MinecraftClient mc, El e, int x, int y, boolean sample) {
        if (e == ARMOR || e == POTS || e == CLOCK || e == COMPASS) { drawExtra(c, mc, e, x, y, sample); return; }
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
        if (e == STATE) {
            List<String[]> st = NovaMove.states(sample); int[] sz0 = size(mc, e, sample);
            NovaButton.panel(c, x, y, sz0[0], sz0[1], 3, 0x9A0C0C14, border());
            for (int i = 0; i < st.size(); i++) {
                boolean on = "1".equals(st.get(i)[1]);
                c.fill(x + 6, y + 5 + i * 11, x + 11, y + 10 + i * 11, on ? NovaSettings.accent : 0xFF555566);
                NovaX.text(c, mc, st.get(i)[0], x + 15, y + 3 + i * 11, on ? 0xFFFFFFFF : 0xFFB8B8D8, true);
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
                NovaX.text(c, mc, ax[i], cx, y + 4, col[i], true);
                cx += mc.textRenderer.getWidth(ax[i]);
                String num = Integer.toString(v[i]);
                NovaX.text(c, mc, num, cx, y + 4, 0xFFFFFFFF, true);
                cx += mc.textRenderer.getWidth(num + "   ");
            }
            float yaw = has ? mc.player.getYaw() : 0f;
            String nm = dirName(yaw);
            NovaX.text(c, mc, nm, x + 8, y + 16, 0xFFFFFFFF, true);
            NovaX.text(c, mc, dirAxis(yaw), x + 8 + mc.textRenderer.getWidth(nm + "   "), y + 16, 0xFFB8B8D8, true);
            return;
        }
        NovaButton.panel(c, x, y, sz[0], sz[1], 3, 0x9A0C0C14, border());
        c.fill(x + 3, y + 3, x + 4, y + sz[1] - 3, NovaSettings.accent);   // barrita de acento
        for (int i = 0; i < L.length; i++) NovaX.text(c, mc, L[i], x + 7, y + 2 + i * 10, i == 0 ? 0xFFFFFFFF : 0xFFB8B8D8, true);
    }

    /** Dibuja el HUD en la pantalla de la partida (lo llama HudMixin al final del HUD del juego). */
    private static final boolean TEST_EDIT = System.getProperty("nova.hudedit") != null;
    private static int testTick;

    public static void render(DrawContext c) {
        try {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc == null || mc.player == null) return;
            NovaSettings.load();
            NovaHud.syncServer(mc);
            NovaBench.frame(mc);
            NovaPresence.frame(mc);
            NovaServers.frame();
            NovaMove.tick();
            if (TEST_EDIT && mc.currentScreen == null && ++testTick == 240) mc.setScreen(new NovaHudScreen(null));   // solo para pruebas (-Dnova.hudedit=1)
            NovaChat.frame(c, mc);
            if (mc.options.hudHidden) return;
            if (mc.currentScreen instanceof NovaHudScreen) return;   // el editor dibuja su propia vista previa
            pollMouse(mc);
            NovaShots.render(c, mc);
            NovaToast.render(c, mc);
            NovaFps.frame(c, mc);
            int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
            for (El e : ALL) {
                if (!e.on || (e == STATE && NovaMove.states(false).isEmpty()) || (e == ARMOR && NovaX.armor(mc, false).isEmpty()) || (e == POTS && NovaX.effects(mc, false).isEmpty())) continue;
                int[] s = sizeS(mc, e, false), p = pos(e, sw, sh, s[0], s[1]);
                drawS(c, mc, e, p[0], p[1], false);
            }
        } catch (Throwable t) { /* el HUD nunca debe tirar el juego */ }
    }

    // ---- CPS ----


    static boolean mouseDown(MinecraftClient mc, int button) {
        try { return GLFW.glfwGetMouseButton(mc.getWindow().getHandle(), button) == GLFW.GLFW_PRESS; } catch (Throwable t) { return false; }
    }

    /** Cuenta los clics nuevos (pasar de suelto a pulsado) mirando el ratón en cada fotograma. Los clics dentro de menús no cuentan. */
    static void pollMouse(MinecraftClient mc) {
        poll(mouseDown(mc, 0), mouseDown(mc, 1), mc.currentScreen != null);
    }


    // ---- zoom ----

    private static Double sensOrig;

    /** Al soltar el zoom (o abrir un menú) devuelve la sensibilidad del ratón a como estaba. */
    private static void sensRestore(MinecraftClient mc) {
        if (sensOrig != null && mc != null) { try { mc.options.getMouseSensitivity().setValue(sensOrig); } catch (Throwable ignored) { } }
        sensOrig = null;
    }

    /** Con zoom el ratón se mueve en proporción al campo de visión (el cálculo está en NovaHudCore). */
    private static void sensScale(MinecraftClient mc, float m) {
        try {
            if (sensOrig == null) sensOrig = mc.options.getMouseSensitivity().getValue();
            mc.options.getMouseSensitivity().setValue(sensFor(sensOrig, m));
        } catch (Throwable ignored) { }
    }

    /** Por cuánto se multiplica el campo de visión del mundo (1 = sin zoom); lo llama FovMixin. */
    public static double zoomMul() {
        MinecraftClient mc = null;
        try {
            mc = MinecraftClient.getInstance();
            NovaSettings.load();
            boolean want = zoomForce || zoomOn && mc != null && mc.player != null && mc.currentScreen == null && zoomKey > 0
                    && GLFW.glfwGetKey(mc.getWindow().getHandle(), zoomKey) == GLFW.GLFW_PRESS;
            float m = zoomStep(want, mc != null && mc.currentScreen != null);
            if (zooming()) sensScale(mc, m); else sensRestore(mc);
            return m;
        } catch (Throwable t) { sensRestore(mc); return 1.0; }
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
