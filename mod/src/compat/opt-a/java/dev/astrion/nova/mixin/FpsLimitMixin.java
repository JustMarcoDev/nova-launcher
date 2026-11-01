package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.MinecraftClient;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Límite de FPS (1.20 a 1.21.1, capa «opt-a»): con un menú abierto 60, con batería 30; nunca sube el del jugador. */
@Mixin(MinecraftClient.class)
public class FpsLimitMixin {
    @Inject(method = "getFramerateLimit", at = @At("RETURN"), cancellable = true)
    private void nova$limit(CallbackInfoReturnable<Integer> cir) {
        cir.setReturnValue(NovaFps.limit(cir.getReturnValue(), ((MinecraftClient) (Object) this).currentScreen != null));
    }
}
