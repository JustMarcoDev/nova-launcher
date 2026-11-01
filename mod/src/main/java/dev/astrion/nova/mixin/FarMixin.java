package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleManager;
import net.minecraft.particle.ParticleEffect;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Modo FPS: las partículas que nacen lejos del jugador (16 bloques por defecto, configurable) no se crean. */
@Mixin(ParticleManager.class)
public class FarMixin {
    @Inject(method = "addParticle(Lnet/minecraft/particle/ParticleEffect;DDDDDD)Lnet/minecraft/client/particle/Particle;", at = @At("HEAD"), cancellable = true)
    private void nova$far(ParticleEffect effect, double x, double y, double z, double vx, double vy, double vz, CallbackInfoReturnable<Particle> cir) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player != null && NovaFps.farParticle(mc.player.squaredDistanceTo(x, y, z))) cir.setReturnValue(null);
    }
}
