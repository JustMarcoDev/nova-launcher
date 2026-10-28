package dev.astrion.nova;

import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.Entity;

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
    public static int freelookKey = com.mojang.blaze3d.platform.InputConstants.KEY_LALT;
    /** Valores de «alternar» que tenía el jugador antes de forzarlos (null = no se está forzando). */
    static Boolean sprintOrig, crouchOrig;

    // ---- guardar / leer (dentro de menu.json, lo llama NovaSettings) ----

    static void read(JsonObject o) {
        if (o == null) return;
        if (o.has("freelook") && o.get("freelook").isJsonObject()) {
            JsonObject f = o.getAsJsonObject("freelook");
            freelook = f.has("on") && f.get("on").getAsBoolean();
            if (f.has(NovaVer.KEY)) { int k = f.get(NovaVer.KEY).getAsInt(); if (k > 0) freelookKey = k; }
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
        f.addProperty("on", freelook); f.addProperty(NovaVer.KEY, freelookKey);
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

    private static boolean keyDown(Minecraft mc, int key) { return key > 0 && NovaInput.key(key); }

    /** Avanza el estado del freelook (se llama desde el ratón y desde la cámara; da igual cuántas veces por fotograma). */
    static void step(Minecraft mc) {
        long now = System.nanoTime();
        float dt = Math.min(0.1f, (now - stepT) / 1e9f);
        stepT = now;
        NovaSettings.load();
        held = freelook && mc != null && mc.player != null && NovaGui.screen(mc) == null && (TEST_HOLD || keyDown(mc, freelookKey));
        if (!held && (offYaw != 0f || offPitch != 0f)) {   // al soltar, vuelve suave a la dirección del jugador
            float k = 1f - (float) Math.exp(-dt * RETURN_RATE);
            offYaw -= offYaw * k; offPitch -= offPitch * k;
            if (Math.abs(offYaw) < 0.05f && Math.abs(offPitch) < 0.05f) { offYaw = 0f; offPitch = 0f; }
        }
    }

    /** Lo llama LookMixin con el movimiento del ratón del jugador: true = es freelook y la cámara se mueve sola (el jugador no gira). */
    public static boolean consumeLook(Entity e, double dx, double dy) {
        try {
            Minecraft mc = Minecraft.getInstance();
            if (mc == null || e != mc.player) return false;
            step(mc);
            if (!held) return false;
            offYaw += (float) dx * SENS;
            float pp = mc.player.getXRot();
            offPitch = Math.max(-90f - pp, Math.min(90f - pp, offPitch + (float) dy * SENS));
            return true;
        } catch (Throwable t) { return false; }
    }

    /** Lo llama CameraRotMixin: giro de la cámara = el del jugador + el del freelook. */
    public static float camYaw(float yaw) {
        try { step(Minecraft.getInstance()); return yaw + offYaw; } catch (Throwable t) { return yaw; }
    }

    public static float camPitch(float pitch) {
        try { return offPitch == 0f ? pitch : Math.max(-90f, Math.min(90f, pitch + offPitch)); } catch (Throwable t) { return pitch; }
    }

    /** ¿El freelook está en marcha (tecla pulsada o cámara volviendo)? */
    public static boolean freelookActive() { return held || offYaw != 0f || offPitch != 0f; }

    // ---- sprint y agacharse fijos ----

    /** Una vez por fotograma desde el HUD: fuerza (o devuelve) las opciones de «alternar» de Minecraft. */
    static void tick(Minecraft mc) {
        try {
            if (mc == null || mc.options == null) return;
            if (TEST && mc.player != null) testDrive(mc);
            if (sprintFixed) {
                if (sprintOrig == null) { sprintOrig = mc.options.toggleSprint().get(); NovaSettings.save(); }
                if (!mc.options.toggleSprint().get()) mc.options.toggleSprint().set(true);
            } else if (sprintOrig != null) { mc.options.toggleSprint().set(sprintOrig); sprintOrig = null; NovaSettings.save(); }
            if (crouchFixed) {
                if (crouchOrig == null) { crouchOrig = mc.options.toggleCrouch().get(); NovaSettings.save(); }
                if (!mc.options.toggleCrouch().get()) mc.options.toggleCrouch().set(true);
            } else if (crouchOrig != null) { mc.options.toggleCrouch().set(crouchOrig); crouchOrig = null; NovaSettings.save(); }
        } catch (Throwable ignored) { }
    }

    private static void testDrive(Minecraft mc) {
        int t = ++testTick;
        if (t == 5) { freelook = true; sprintFixed = true; crouchFixed = true; }
        if (t == 60) { System.out.println("[NOVA-TEST] antes: playerYaw=" + mc.player.getYRot() + " offYaw=" + offYaw + " sprintToggle=" + mc.options.toggleSprint().get() + " crouchToggle=" + mc.options.toggleCrouch().get()); TEST_HOLD = true; }
        if (t == 70 || t == 71 || t == 72) mc.player.turn(20, 6);
        if (t == 90) System.out.println("[NOVA-TEST] con tecla: playerYaw=" + mc.player.getYRot() + " offYaw=" + offYaw + " offPitch=" + offPitch + " camYaw(0)=" + camYaw(0f) + " active=" + freelookActive());
        if (t == 100) TEST_HOLD = false;
        if (t == 160) System.out.println("[NOVA-TEST] soltada: offYaw=" + offYaw + " offPitch=" + offPitch + " active=" + freelookActive());
        if (t == 170) { freelook = false; sprintFixed = false; crouchFixed = false; }
        if (t == 200) System.out.println("[NOVA-TEST] restaurado: sprintToggle=" + mc.options.toggleSprint().get() + " crouchToggle=" + mc.options.toggleCrouch().get() + " orig=" + sprintOrig + "/" + crouchOrig);
    }

    // ---- elemento del HUD «Estado» ----

    /** Las líneas del elemento: {texto, "1" si está en marcha}. Solo las opciones activadas; en el editor sin partida salen las tres. */
    static List<String[]> states(Minecraft mc, boolean sample) {
        List<String[]> r = new ArrayList<>();
        boolean has = mc != null && mc.player != null && !sample, all = sample || (mc != null && NovaGui.screen(mc) instanceof NovaHudScreen);   // en el editor salen las tres
        if (freelook || all) r.add(new String[] { NovaLang.tr("Freelook"), has && freelookActive() ? "1" : "0" });
        if (sprintFixed || all) r.add(new String[] { NovaLang.tr("Sprint fijo"), has && mc.player.isSprinting() ? "1" : "0" });
        if (crouchFixed || all) r.add(new String[] { NovaLang.tr("Agacharse fijo"), has && mc.player.isShiftKeyDown() ? "1" : "0" });
        return r;
    }

    /** Nombre corto de la tecla elegida para el editor. */
    static String keyName() { return NovaHud.keyName(freelookKey); }
}
