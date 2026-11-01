package dev.astrion.nova.mixin;

import com.mojang.blaze3d.platform.FramerateLimitTracker;
import dev.astrion.nova.NovaFps;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Límite de FPS: con un menú abierto 60, con batería 30; nunca sube el del jugador. */
@Mixin(FramerateLimitTracker.class)
public class FpsLimitMixin {
    @Inject(method = "getFramerateLimit", at = @At("RETURN"), cancellable = true)
    private void nova$limit(CallbackInfoReturnable<Integer> cir) {
        cir.setReturnValue(NovaFps.limit(cir.getReturnValue()));
    }
}
