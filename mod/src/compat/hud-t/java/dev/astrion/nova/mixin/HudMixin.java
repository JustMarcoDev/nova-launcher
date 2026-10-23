package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaHud;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import net.minecraft.client.render.RenderTickCounter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Dibuja el HUD de Nova (FPS, CPS, coordenadas, teclas) encima del HUD del juego. 1.21 en adelante: render(DrawContext, RenderTickCounter) (capa «hud-t»). */
@Mixin(InGameHud.class)
public class HudMixin {
    @Inject(method = "render", at = @At("TAIL"))
    private void nova$hud(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        NovaHud.render(context);
    }
}
