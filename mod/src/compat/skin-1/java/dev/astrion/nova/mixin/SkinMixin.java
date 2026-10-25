package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaCape;
import dev.astrion.nova.NovaLocalSkin;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.client.util.SkinTextures;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Skin local y capa de Nova de la 1.20.2 a la 1.21.8: SkinTextures lleva textura, capa, elytra y modelo. */
@Mixin(PlayerListEntry.class)
public class SkinMixin {
    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void nova$skin(CallbackInfoReturnable<SkinTextures> cir) {
        PlayerListEntry self = (PlayerListEntry) (Object) this;
        SkinTextures o = cir.getReturnValue();
        Identifier id = NovaLocalSkin.mine(self) ? NovaLocalSkin.id() : null;
        Identifier cape = o.capeTexture() == null && NovaCape.wants(self) ? NovaCape.id() : null;   // la capa de Nova solo si no tiene ya una suya
        if (id == null && cape == null) return;
        cir.setReturnValue(new SkinTextures(id != null ? id : o.texture(), id != null ? null : o.textureUrl(),
                cape != null ? cape : o.capeTexture(), cape != null ? cape : o.elytraTexture(),
                id != null ? (NovaLocalSkin.slim() ? SkinTextures.Model.SLIM : SkinTextures.Model.WIDE) : o.model(), id != null || o.secure()));
    }
}
