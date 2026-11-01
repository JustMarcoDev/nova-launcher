package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaPhoto;
import net.minecraft.client.renderer.GameRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Modo foto: con la mano oculta (tecla H) no se dibuja la mano ni el objeto. El método se llama renderItemInHand en todas las 26.x. */
@Mixin(GameRenderer.class)
public class HandMixin {
    @Inject(method = "renderItemInHand", at = @At("HEAD"), cancellable = true)
    private void nova$hand(CallbackInfo ci) {
        if (NovaPhoto.handHidden()) ci.cancel();
    }
}
