package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaFps;
import net.minecraft.client.texture.SpriteAtlasTexture;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Con el Modo FPS activo, las animaciones de los bloques se actualizan una vez de cada dos. */
@Mixin(SpriteAtlasTexture.class)
public class SpriteAtlasMixin {
    @Inject(method = "tickAnimatedSprites", at = @At("HEAD"), cancellable = true, require = 0)
    private void nova$slowAnim(CallbackInfo ci) {
        if (NovaFps.skipAnimTick()) ci.cancel();
    }
}
