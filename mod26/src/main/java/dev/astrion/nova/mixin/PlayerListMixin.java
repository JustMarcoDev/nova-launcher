package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaPresence;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.PlayerTabOverlay;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Lista de jugadores (TAB): deja un hueco delante del nombre de quien usa Nova y dibuja ahí el logo. Las firmas son iguales de la 1.20 a la 1.21.11. */
@Mixin(PlayerTabOverlay.class)
public class PlayerListMixin {
    @Inject(method = "getNameForDisplay", at = @At("RETURN"), cancellable = true)
    private void nova$gap(PlayerInfo entry, CallbackInfoReturnable<Component> cir) {
        if (NovaPresence.has(entry)) cir.setReturnValue(Component.literal("  ").append(cir.getReturnValue()));
    }

    // renderLatencyIcon(contexto, ancho de columna, x de la fila (cabeza), y, jugador) se llama una vez por fila
    @Inject(method = "extractPingIcon", at = @At("HEAD"))
    private void nova$logo(GuiGraphicsExtractor context, int width, int x, int y, PlayerInfo entry, CallbackInfo ci) {
        NovaPresence.draw(context, x, y, entry);
    }
}
