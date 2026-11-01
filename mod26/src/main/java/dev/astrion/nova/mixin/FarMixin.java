package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.Minecraft;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleEngine;
import net.minecraft.core.particles.ParticleOptions;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Modo FPS: las partículas que nacen lejos del jugador (16 bloques por defecto, configurable) no se crean. */
@Mixin(ParticleEngine.class)
public class FarMixin {
    @Inject(method = "createParticle", at = @At("HEAD"), cancellable = true)
    private void nova$far(ParticleOptions options, double x, double y, double z, double vx, double vy, double vz, CallbackInfoReturnable<Particle> cir) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null && NovaFps.farParticle(mc.player.distanceToSqr(x, y, z))) cir.setReturnValue(null);
    }
}
