package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;

/** Prueba de rendimiento: los accesos a Minecraft (nombres de Yarn). La lógica está en NovaBenchCore (mod-common). */
final class NovaBench {
    private NovaBench() { }

    static final boolean ON = NovaBenchCore.ON;

    private static final class H implements NovaBenchCore.Host {
        final MinecraftClient mc;
        H(MinecraftClient mc) { this.mc = mc; }
        public boolean ready() { return mc.world != null && mc.player != null && mc.currentScreen == null; }
        public float yaw() { return mc.player.getYaw(); }
        public void aim(float yaw, float pitch) { mc.player.setYaw(yaw); mc.player.setPitch(pitch); mc.player.prevYaw = yaw; mc.player.prevPitch = pitch; }
        public int view() { return mc.options.getViewDistance().getValue(); }
        public int sim() { return mc.options.getSimulationDistance().getValue(); }
        public void quit() { mc.scheduleStop(); }
    }

    private static H h;

    static void frame(MinecraftClient mc) {
        if (!ON) return;
        if (h == null) h = new H(mc);
        NovaBenchCore.frame(h);
    }
}
