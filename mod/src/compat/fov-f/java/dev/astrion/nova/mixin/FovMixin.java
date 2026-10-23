package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaHud;
import net.minecraft.client.render.Camera;
import net.minecraft.client.render.GameRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Zoom con tecla: acerca el campo de visión del mundo (no el de la mano). getFov devuelve float (capa «fov-f»). */
@Mixin(GameRenderer.class)
public class FovMixin {
    @Inject(method = "getFov", at = @At("RETURN"), cancellable = true)
    private void nova$zoom(Camera camera, float tickDelta, boolean changingFov, CallbackInfoReturnable<Float> cir) {
        if (changingFov) cir.setReturnValue((float) (cir.getReturnValue() * NovaHud.zoomMul()));
    }
}
