package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.renderer.culling.Frustum;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Modo FPS: las entidades que no son jugadores y están lejos de la cámara (48 bloques por defecto, configurable) no se dibujan. */
@Mixin(EntityRenderer.class)
public class FarEntityMixin {
    @Inject(method = "shouldRender", at = @At("HEAD"), cancellable = true)
    private void nova$far(Entity entity, Frustum frustum, double x, double y, double z, CallbackInfoReturnable<Boolean> cir) {
        if (NovaFps.farEntity(entity instanceof Player, entity.getBbWidth(), entity.distanceToSqr(x, y, z))) cir.setReturnValue(false);
    }
}
