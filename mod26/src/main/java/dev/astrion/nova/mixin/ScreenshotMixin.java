package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaShots;
import java.util.function.Consumer;
import net.minecraft.client.Screenshot;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Al guardar una captura avisa a Nova (1.21.6 en adelante: la firma lleva el factor de reducción). */
@Mixin(Screenshot.class)
public class ScreenshotMixin {
    @ModifyVariable(method = "grab(Ljava/io/File;Ljava/lang/String;Lcom/mojang/blaze3d/pipeline/RenderTarget;ILjava/util/function/Consumer;)V", at = @At("HEAD"), argsOnly = true, require = 0)
    private static Consumer<Component> nova$shot(Consumer<Component> receiver) {
        return NovaShots.wrap(receiver);
    }
}
