package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaInput;
import net.minecraft.client.MouseHandler;
import net.minecraft.client.input.MouseButtonInfo;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Estado real de los botones del ratón. Desde la 26.x el juego solo apunta «botón pulsado» cuando ninguna pantalla se queda el clic,
 * así que con el chat o un menú abierto mirar isLeftPressed() no sirve (los botones de la captura y el editor del HUD no respondían).
 * Aquí se anota cada pulsación y cada soltar, antes de que lo vea nadie más.
 */
@Mixin(MouseHandler.class)
public class MouseMixin {
    @Inject(method = "onButton", at = @At("HEAD"))
    private void nova$button(long window, MouseButtonInfo info, int action, CallbackInfo ci) {
        NovaInput.mouseEvent(info.button(), action != 0);
    }
}
