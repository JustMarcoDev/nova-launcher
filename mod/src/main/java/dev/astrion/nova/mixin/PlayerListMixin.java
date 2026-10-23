package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaPresence;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.PlayerListHud;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Lista de jugadores (TAB): deja un hueco delante del nombre de quien usa Nova y dibuja ahí el logo. Las firmas son iguales de la 1.20 a la 1.21.11. */
@Mixin(PlayerListHud.class)
public class PlayerListMixin {
    @Inject(method = "getPlayerName", at = @At("RETURN"), cancellable = true)
    private void nova$gap(PlayerListEntry entry, CallbackInfoReturnable<Text> cir) {
        if (NovaPresence.has(entry)) cir.setReturnValue(Text.literal("  ").append(cir.getReturnValue()));
    }

    // renderLatencyIcon(contexto, ancho de columna, x de la fila (cabeza), y, jugador) se llama una vez por fila
    @Inject(method = "renderLatencyIcon", at = @At("HEAD"))
    private void nova$logo(DrawContext context, int width, int x, int y, PlayerListEntry entry, CallbackInfo ci) {
        NovaPresence.draw(context, x, y, entry);
    }
}
