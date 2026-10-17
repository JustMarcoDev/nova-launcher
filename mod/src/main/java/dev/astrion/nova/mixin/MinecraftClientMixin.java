package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaTitleScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Cada vez que el juego quiere abrir el menú principal de Minecraft se abre el de Nova. */
@Mixin(MinecraftClient.class)
public class MinecraftClientMixin {
    @ModifyVariable(method = "setScreen", at = @At("HEAD"), argsOnly = true)
    private Screen nova$title(Screen screen) {
        if (screen != null && screen.getClass() == TitleScreen.class) return new NovaTitleScreen();
        return screen;
    }
}
