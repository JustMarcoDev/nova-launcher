package dev.astrion.nova;

import net.minecraft.client.Minecraft;

/** Prueba de rendimiento: los accesos a Minecraft (nombres de Mojang). La lógica está en NovaBenchCore (mod-common). */
final class NovaBench {
    private NovaBench() { }

    static final boolean ON = NovaBenchCore.ON;

    private static final class H implements NovaBenchCore.Host {
        final Minecraft mc;
        H(Minecraft mc) { this.mc = mc; }
        public boolean ready() { return mc.level != null && mc.player != null && NovaGui.screen(mc) == null; }
        public float yaw() { return mc.player.getYRot(); }
        public void aim(float yaw, float pitch) { mc.player.setYRot(yaw); mc.player.setXRot(pitch); mc.player.yRotO = yaw; mc.player.xRotO = pitch; }
        public int view() { return mc.options.renderDistance().get(); }
        public int sim() { return mc.options.simulationDistance().get(); }
        public void quit() { mc.stop(); }
    }

    private static H h;

    static void frame(Minecraft mc) {
        if (!ON) return;
        if (h == null) h = new H(mc);
        NovaBenchCore.frame(h);
    }
}
