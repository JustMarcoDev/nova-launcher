package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaLocalSkin;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.client.util.SkinTextures;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Skin local (cuenta sin conexión) de la 1.20.2 a la 1.21.8: SkinTextures lleva textura, capa, elytra y modelo. */
@Mixin(PlayerListEntry.class)
public class SkinMixin {
    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void nova$skin(CallbackInfoReturnable<SkinTextures> cir) {
        if (!NovaLocalSkin.mine((PlayerListEntry) (Object) this)) return;
        Identifier id = NovaLocalSkin.id();
        if (id == null) return;
        SkinTextures o = cir.getReturnValue();
        cir.setReturnValue(new SkinTextures(id, null, o.capeTexture(), o.elytraTexture(), NovaLocalSkin.slim() ? SkinTextures.Model.SLIM : SkinTextures.Model.WIDE, true));
    }
}
