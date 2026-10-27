package dev.astrion.nova;

import net.minecraft.client.Options;
import net.minecraft.server.level.ParticleStatus;

/** Partículas del juego. La clase ParticlesMode cambió de paquete en 1.21.2, por eso esta parte va en una capa. */
final class NovaOpt {
    private NovaOpt() { }

    static String particles(Options o) { return o.particles().get().name(); }

    static void setParticles(Options o, String name) {
        try { o.particles().set(ParticleStatus.valueOf(name)); } catch (Throwable ignored) { }
    }
}
