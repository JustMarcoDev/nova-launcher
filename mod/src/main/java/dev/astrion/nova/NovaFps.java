package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.CloudRenderMode;
import net.minecraft.client.option.GameOptions;

/**
 * «Modo FPS»: baja de golpe lo que más pesa (partículas, nubes, sombras de entidades, distancias y animaciones de bloques)
 * y guarda las opciones de antes para devolverlas con «Restaurar». Los valores guardados se quedan en menu.json.
 */
public final class NovaFps {
    private NovaFps() { }

    static final int VIEW = 8, SIM = 6;

    static boolean on() { return NovaSettings.fpsOn; }

    static void enable(MinecraftClient mc) {
        try {
            NovaSettings.load();
            if (NovaSettings.fpsOn || mc == null || mc.options == null) return;
            GameOptions o = mc.options;
            NovaSettings.fpsParticles = NovaOpt.particles(o);
            NovaSettings.fpsClouds = o.getCloudRenderMode().getValue().name();
            NovaSettings.fpsShadows = o.getEntityShadows().getValue();
            NovaSettings.fpsView = o.getViewDistance().getValue();
            NovaSettings.fpsSim = o.getSimulationDistance().getValue();
            NovaSettings.fpsOn = true;
            apply(o);
            NovaSettings.save();
        } catch (Throwable ignored) { }
    }

    private static void apply(GameOptions o) {
        NovaOpt.setParticles(o, "MINIMAL");
        o.getCloudRenderMode().setValue(CloudRenderMode.OFF);
        o.getEntityShadows().setValue(false);
        // «distancia 8 / 6» como tope: si ya tenías menos, no se sube
        o.getViewDistance().setValue(Math.min(VIEW, NovaSettings.fpsView));
        o.getSimulationDistance().setValue(Math.min(SIM, NovaSettings.fpsSim));
        o.write();
    }

    static void restore(MinecraftClient mc) {
        try {
            NovaSettings.load();
            if (!NovaSettings.fpsOn || mc == null || mc.options == null) return;
            GameOptions o = mc.options;
            if (!NovaSettings.fpsParticles.isEmpty()) NovaOpt.setParticles(o, NovaSettings.fpsParticles);
            try { o.getCloudRenderMode().setValue(CloudRenderMode.valueOf(NovaSettings.fpsClouds)); } catch (Throwable ignored) { }
            o.getEntityShadows().setValue(NovaSettings.fpsShadows);
            if (NovaSettings.fpsView > 0) o.getViewDistance().setValue(NovaSettings.fpsView);
            if (NovaSettings.fpsSim > 0) o.getSimulationDistance().setValue(NovaSettings.fpsSim);
            o.write();
            NovaSettings.fpsOn = false;
            NovaSettings.save();
        } catch (Throwable ignored) { }
    }

    /** Las animaciones de bloques (agua, lava, fuego…) se actualizan a la mitad de ritmo; lo llama SpriteAtlasMixin. */
    private static int tick;
    public static boolean skipAnimTick() { return NovaSettings.fpsOn && (++tick & 1) == 1; }
}
