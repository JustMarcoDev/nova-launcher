package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.InactivityFpsLimiter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Límite de FPS (1.21.2 en adelante, capa «opt-b»): con un menú abierto 60, con batería 30; nunca sube el del jugador. */
@Mixin(InactivityFpsLimiter.class)
public class FpsLimitMixin {
    @Inject(method = "update", at = @At("RETURN"), cancellable = true)
    private void nova$limit(CallbackInfoReturnable<Integer> cir) {
        cir.setReturnValue(NovaFps.limit(cir.getReturnValue(), MinecraftClient.getInstance().currentScreen != null));
    }
}
