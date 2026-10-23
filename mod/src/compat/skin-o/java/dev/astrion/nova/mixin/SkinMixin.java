package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaLocalSkin;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Skin local (cuenta sin conexión) en 1.20 y 1.20.1: la textura y el modelo se piden por separado. */
@Mixin(PlayerListEntry.class)
public class SkinMixin {
    @Inject(method = "getSkinTexture", at = @At("RETURN"), cancellable = true)
    private void nova$tex(CallbackInfoReturnable<Identifier> cir) {
        if (!NovaLocalSkin.mine((PlayerListEntry) (Object) this)) return;
        Identifier id = NovaLocalSkin.id();
        if (id != null) cir.setReturnValue(id);
    }

    @Inject(method = "getModel", at = @At("RETURN"), cancellable = true)
    private void nova$model(CallbackInfoReturnable<String> cir) {
        if (!NovaLocalSkin.mine((PlayerListEntry) (Object) this) || NovaLocalSkin.id() == null) return;
        cir.setReturnValue(NovaLocalSkin.slim() ? "slim" : "default");
    }
}
