package dev.astrion.nova;

import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.List;

/**
 * Movimiento: freelook (mirar alrededor sin girar al jugador) y sprint / agacharse fijos. Tres opciones separadas, apagadas de fábrica, en «Editar HUD».
 * <ul>
 *   <li><b>Freelook</b>: mientras se mantiene la tecla (Alt izquierdo por defecto) el ratón mueve solo la cámara (LookMixin lo desvía aquí y CameraRotMixin
 *   suma el giro a la cámara); al soltarla, el giro vuelve a cero con una curva suave.</li>
 *   <li><b>Sprint fijo / agacharse fijo</b>: una pulsación activa y otra desactiva. Se usan las opciones de «alternar» de Minecraft (toggleSprint / toggleCrouch);
 *   el valor que tenían se guarda en menu.json y se devuelve al apagar la opción.</li>
 * </ul>
 */
public final class NovaMove {
    private NovaMove() { }

    public static boolean freelook, sprintFixed, crouchFixed;
    public static int freelookKey = 342;   // GLFW_KEY_LEFT_ALT
    /** Valores de «alternar» que tenía el jugador antes de forzarlos (null = no se está forzando). */
    static Boolean sprintOrig, crouchOrig;

    // ---- guardar / leer (dentro de menu.json, lo llama NovaSettings) ----

    static void read(JsonObject o) {
        if (o == null) return;
        if (o.has("freelook") && o.get("freelook").isJsonObject()) {
            JsonObject f = o.getAsJsonObject("freelook");
            freelook = f.has("on") && f.get("on").getAsBoolean();
            if (f.has("key")) { int k = f.get("key").getAsInt(); if (k > 0) freelookKey = k; }
        }
        if (o.has("sprint") && o.get("sprint").isJsonObject()) {
            JsonObject s = o.getAsJsonObject("sprint");
            sprintFixed = s.has("on") && s.get("on").getAsBoolean();
            sprintOrig = s.has("orig") ? s.get("orig").getAsBoolean() : null;
        }
        if (o.has("crouch") && o.get("crouch").isJsonObject()) {
            JsonObject s = o.getAsJsonObject("crouch");
            crouchFixed = s.has("on") && s.get("on").getAsBoolean();
            crouchOrig = s.has("orig") ? s.get("orig").getAsBoolean() : null;
        }
    }

    static JsonObject write() {
        JsonObject o = new JsonObject(), f = new JsonObject(), s = new JsonObject(), c = new JsonObject();
        f.addProperty("on", freelook); f.addProperty("key", freelookKey);
        s.addProperty("on", sprintFixed); if (sprintOrig != null) s.addProperty("orig", sprintOrig);
        c.addProperty("on", crouchFixed); if (crouchOrig != null) c.addProperty("orig", crouchOrig);
        o.add("freelook", f); o.add("sprint", s); o.add("crouch", c);
        return o;
    }

    // ---- freelook ----

    private static float offYaw, offPitch;
    private static boolean held;
    private static long stepT = System.nanoTime();
    // solo para pruebas (-Dnova.testlook=1): simula la tecla pulsada y movimientos del ratón y escribe lo que pasa
    private static final boolean TEST = System.getProperty("nova.testlook") != null;
    private static boolean TEST_HOLD;
    private static int testTick;
    private static final float SENS = 0.15f;      // igual que el giro normal de Minecraft
    private static final float RETURN_RATE = 12f; // cuanto mayor, más rápido vuelve (≈ 0,2 s)

    /** Avanza el estado del freelook (se llama desde el ratón y desde la cámara; da igual cuántas veces por fotograma). */
    static void step() {
        long now = System.nanoTime();
        float dt = Math.min(0.1f, (now - stepT) / 1e9f);
        stepT = now;
        NovaSettings.load();
        held = freelook && NovaMc.playing() && (TEST_HOLD || NovaMc.keyDown(freelookKey));
        if (!held && (offYaw != 0f || offPitch != 0f)) {   // al soltar, vuelve suave a la dirección del jugador
            float k = 1f - (float) Math.exp(-dt * RETURN_RATE);
            offYaw -= offYaw * k; offPitch -= offPitch * k;
            if (Math.abs(offYaw) < 0.05f && Math.abs(offPitch) < 0.05f) { offYaw = 0f; offPitch = 0f; }
        }
    }

    /** Lo llama LookMixin con el movimiento del ratón del jugador: true = es freelook y la cámara se mueve sola (el jugador no gira). */
    public static boolean consumeLook(Object e, double dx, double dy) {
        try {
            if (!NovaMc.isPlayer(e)) return false;
            step();
            if (!held) return false;
            offYaw += (float) dx * SENS;
            float pp = NovaMc.playerPitch();
            offPitch = Math.max(-90f - pp, Math.min(90f - pp, offPitch + (float) dy * SENS));
            return true;
        } catch (Throwable t) { return false; }
    }

    /** Lo llama CameraRotMixin: giro de la cámara = el del jugador + el del freelook. */
    public static float camYaw(float yaw) {
        try { step(); return yaw + offYaw; } catch (Throwable t) { return yaw; }
    }

    public static float camPitch(float pitch) {
        try { return offPitch == 0f ? pitch : Math.max(-90f, Math.min(90f, pitch + offPitch)); } catch (Throwable t) { return pitch; }
    }

    /** ¿El freelook está en marcha (tecla pulsada o cámara volviendo)? */
    public static boolean freelookActive() { return held || offYaw != 0f || offPitch != 0f; }

    // ---- sprint y agacharse fijos ----

    /** Una vez por fotograma desde el HUD: fuerza (o devuelve) las opciones de «alternar» de Minecraft. */
    static void tick() {
        try {
            if (!NovaMc.optionsReady()) return;
            if (TEST && NovaMc.hasPlayer()) testDrive();
            if (sprintFixed) {
                if (sprintOrig == null) { sprintOrig = NovaMc.toggleSprint(); NovaSettings.save(); }
                if (!NovaMc.toggleSprint()) NovaMc.toggleSprint(true);
            } else if (sprintOrig != null) { NovaMc.toggleSprint(sprintOrig); sprintOrig = null; NovaSettings.save(); }
            if (crouchFixed) {
                if (crouchOrig == null) { crouchOrig = NovaMc.toggleCrouch(); NovaSettings.save(); }
                if (!NovaMc.toggleCrouch()) NovaMc.toggleCrouch(true);
            } else if (crouchOrig != null) { NovaMc.toggleCrouch(crouchOrig); crouchOrig = null; NovaSettings.save(); }
        } catch (Throwable ignored) { }
    }

    private static void testDrive() {
        int t = ++testTick;
        if (t == 5) { freelook = true; sprintFixed = true; crouchFixed = true; }
        if (t == 60) { System.out.println("[NOVA-TEST] antes: playerYaw=" + NovaMc.playerYaw() + " offYaw=" + offYaw + " sprintToggle=" + NovaMc.toggleSprint() + " crouchToggle=" + NovaMc.toggleCrouch()); TEST_HOLD = true; }
        if (t == 70 || t == 71 || t == 72) NovaMc.turnPlayer(20, 6);
        if (t == 90) System.out.println("[NOVA-TEST] con tecla: playerYaw=" + NovaMc.playerYaw() + " offYaw=" + offYaw + " offPitch=" + offPitch + " camYaw(0)=" + camYaw(0f) + " active=" + freelookActive());
        if (t == 100) TEST_HOLD = false;
        if (t == 160) System.out.println("[NOVA-TEST] soltada: offYaw=" + offYaw + " offPitch=" + offPitch + " active=" + freelookActive());
        if (t == 170) { freelook = false; sprintFixed = false; crouchFixed = false; }
        if (t == 200) System.out.println("[NOVA-TEST] restaurado: sprintToggle=" + NovaMc.toggleSprint() + " crouchToggle=" + NovaMc.toggleCrouch() + " orig=" + sprintOrig + "/" + crouchOrig);
    }

    // ---- elemento del HUD «Estado» ----

    /** Las líneas del elemento: {texto, "1" si está en marcha}. Solo las opciones activadas; en el editor sin partida salen las tres. */
    static List<String[]> states(boolean sample) {
        List<String[]> r = new ArrayList<>();
        boolean has = NovaMc.hasPlayer() && !sample, all = sample || NovaMc.hudEditorOpen();   // en el editor salen las tres
        if (freelook || all) r.add(new String[] { NovaLang.tr("Freelook"), has && freelookActive() ? "1" : "0" });
        if (sprintFixed || all) r.add(new String[] { NovaLang.tr("Sprint fijo"), has && NovaMc.playerSprinting() ? "1" : "0" });
        if (crouchFixed || all) r.add(new String[] { NovaLang.tr("Agacharse fijo"), has && NovaMc.playerSneaking() ? "1" : "0" });
        return r;
    }
}
