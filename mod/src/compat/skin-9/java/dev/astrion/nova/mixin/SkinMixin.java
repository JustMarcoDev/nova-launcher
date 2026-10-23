package dev.astrion.nova.mixin;

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

/** Skin local (cuenta sin conexión) desde la 1.21.9: las texturas son «assets» con id y ruta. */
@Mixin(PlayerListEntry.class)
public class SkinMixin {
    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void nova$skin(CallbackInfoReturnable<SkinTextures> cir) {
        if (!NovaLocalSkin.mine((PlayerListEntry) (Object) this)) return;
        Identifier id = NovaLocalSkin.id();
        if (id == null) return;
        SkinTextures o = cir.getReturnValue();
        cir.setReturnValue(new SkinTextures(new AssetInfo.TextureAssetInfo(id, id), o.cape(), o.elytra(), NovaLocalSkin.slim() ? PlayerSkinType.SLIM : PlayerSkinType.WIDE, true));
    }
}
