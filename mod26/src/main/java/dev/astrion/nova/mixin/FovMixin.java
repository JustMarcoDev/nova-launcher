package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaHud;
import net.minecraft.client.Camera;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Zoom con tecla: acerca el campo de visión del mundo (no el de la mano). Desde la 26.x el campo de visión lo calcula la cámara: Camera.getFov() devuelve float. */
@Mixin(Camera.class)
public class FovMixin {
    @Inject(method = "getFov", at = @At("RETURN"), cancellable = true)
    private void nova$zoom(CallbackInfoReturnable<Float> cir) {
        cir.setReturnValue((float) (cir.getReturnValue() * NovaHud.zoomMul()));
    }
}
