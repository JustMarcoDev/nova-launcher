package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaPauseScreen;
import dev.astrion.nova.NovaTitleScreen;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Cada vez que el juego quiere abrir el menú principal o el de pausa de Minecraft se abre el de Nova. */
@Mixin(MinecraftClient.class)
public class MinecraftClientMixin {
    @ModifyVariable(method = "setScreen", at = @At("HEAD"), argsOnly = true)
    private Screen nova$title(Screen screen) {
        if (screen != null && screen.getClass() == TitleScreen.class) return new NovaTitleScreen();
        // menú de pausa del juego (sin LAN) → menú de pausa de Nova; solo con un mundo abierto
        if (screen != null && screen.getClass() == GameMenuScreen.class && ((MinecraftClient) (Object) this).world != null) return new NovaPauseScreen();
        return screen;
    }

    @Shadow public Screen currentScreen;

    // Al salir de un mundo el juego crea su TitleScreen dentro del propio setScreen (setScreen(null) sin mundo),
    // por eso además se revisa el resultado final y se sustituye.
    @Inject(method = "setScreen", at = @At("RETURN"))
    private void nova$after(Screen screen, CallbackInfo ci) {
        if (currentScreen != null && currentScreen.getClass() == TitleScreen.class) ((MinecraftClient) (Object) this).setScreen(new NovaTitleScreen());
    }
}
