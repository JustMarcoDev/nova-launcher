package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaMove;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Freelook: con la tecla pulsada, el movimiento del ratón mueve la cámara y no el jugador (en 26.x el método se llama turn). */
@Mixin(Entity.class)
public class LookMixin {
    @Inject(method = "turn", at = @At("HEAD"), cancellable = true)
    private void nova$look(double dx, double dy, CallbackInfo ci) {
        if (NovaMove.consumeLook((Entity) (Object) this, dx, dy)) ci.cancel();
    }
}
