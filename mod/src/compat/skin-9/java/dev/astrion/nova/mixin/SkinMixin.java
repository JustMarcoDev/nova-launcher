package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaCape;
import dev.astrion.nova.NovaLocalSkin;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.entity.player.PlayerSkinType;
import net.minecraft.entity.player.SkinTextures;
import net.minecraft.util.AssetInfo;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Skin local y capa de Nova desde la 1.21.9: las texturas son «assets» con id y ruta. */
@Mixin(PlayerListEntry.class)
public class SkinMixin {
    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void nova$skin(CallbackInfoReturnable<SkinTextures> cir) {
        PlayerListEntry self = (PlayerListEntry) (Object) this;
        SkinTextures o = cir.getReturnValue();
        Identifier id = NovaLocalSkin.mine(self) ? NovaLocalSkin.id() : null;
        Identifier cape = o.cape() == null && NovaCape.wants(self) ? NovaCape.id() : null;   // la capa de Nova solo si no tiene ya una suya
        if (id == null && cape == null) return;
        AssetInfo.TextureAssetInfo ca = cape == null ? null : new AssetInfo.TextureAssetInfo(cape, cape);
        cir.setReturnValue(new SkinTextures(id != null ? new AssetInfo.TextureAssetInfo(id, id) : o.body(),
                ca != null ? ca : o.cape(), ca != null ? ca : o.elytra(),
                id != null ? (NovaLocalSkin.slim() ? PlayerSkinType.SLIM : PlayerSkinType.WIDE) : o.model(), id != null || o.secure()));
    }
}
