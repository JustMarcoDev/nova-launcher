package dev.astrion.nova;

import net.minecraft.client.option.GameOptions;
import net.minecraft.particle.ParticlesMode;

/** Partículas del juego. La clase ParticlesMode cambió de paquete en 1.21.2, por eso esta parte va en una capa. */
final class NovaOpt {
    private NovaOpt() { }

    static String particles(GameOptions o) { return o.getParticles().getValue().name(); }

    static void setParticles(GameOptions o, String name) {
        try { o.getParticles().setValue(ParticlesMode.valueOf(name)); } catch (Throwable ignored) { }
    }
}
