package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaMove;
import net.minecraft.client.Camera;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Freelook: suma el giro del freelook al de la cámara (el del jugador no cambia). */
@Mixin(Camera.class)
public class CameraRotMixin {
    @ModifyVariable(method = "setRotation", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private float nova$yaw(float yaw) { return NovaMove.camYaw(yaw); }

    @ModifyVariable(method = "setRotation", at = @At("HEAD"), argsOnly = true, ordinal = 1)
    private float nova$pitch(float pitch) { return NovaMove.camPitch(pitch); }
}
