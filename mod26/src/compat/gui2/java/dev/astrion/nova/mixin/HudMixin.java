package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaHud;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.gui.Hud;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Dibuja el HUD de Nova (FPS, CPS, coordenadas, teclas) encima del HUD del juego. 1.21 en adelante: render(DrawContext, RenderTickCounter) (capa «hud-t»). */
@Mixin(Hud.class)
public class HudMixin {
    @Inject(method = "extractRenderState", at = @At("TAIL"))
    private void nova$hud(GuiGraphicsExtractor context, DeltaTracker tickCounter, CallbackInfo ci) {
        NovaHud.render(context);
    }
}
