package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaShots;
import java.util.function.Consumer;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Al guardar una captura avisa a Nova (hasta 1.21.5). */
@Mixin(ScreenshotRecorder.class)
public class ScreenshotMixin {
    @ModifyVariable(method = "saveScreenshot(Ljava/io/File;Ljava/lang/String;Lnet/minecraft/client/gl/Framebuffer;Ljava/util/function/Consumer;)V", at = @At("HEAD"), argsOnly = true, require = 0)
    private static Consumer<Text> nova$shot(Consumer<Text> receiver) {
        return NovaShots.wrap(receiver);
    }
}
