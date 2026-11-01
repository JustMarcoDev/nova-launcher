package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaPhoto;
import net.minecraft.client.Mouse;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Rueda del ratón: en modo foto cambia el campo de visión en vez de cambiar de casilla. */
@Mixin(Mouse.class)
public class MouseMixin {
    @Inject(method = "onMouseScroll", at = @At("HEAD"), cancellable = true, require = 0)
    private void nova$scroll(long window, double horizontal, double vertical, CallbackInfo ci) {
        if (NovaPhoto.scroll(vertical)) ci.cancel();
    }
}
