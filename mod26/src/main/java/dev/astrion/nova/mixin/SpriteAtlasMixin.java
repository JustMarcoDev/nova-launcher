package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.renderer.texture.TextureAtlas;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Con el Modo FPS activo, las animaciones de los bloques se actualizan una vez de cada dos. */
@Mixin(TextureAtlas.class)
public class SpriteAtlasMixin {
    @Inject(method = "cycleAnimationFrames", at = @At("HEAD"), cancellable = true, require = 0)
    private void nova$slowAnim(CallbackInfo ci) {
        if (NovaFps.skipAnimTick()) ci.cancel();
    }
}
